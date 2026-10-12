const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const source = fs.readFileSync(`${__dirname}/../src/features/tenant/candidate/interviews/utils/proctorDevices.ts`, "utf8");
function stream(kind, surface = "monitor") {
  const track = { kind, readyState: "live", getSettings: () => ({ displaySurface: surface }), stop() { this.readyState = "ended"; } };
  const tracks = [track];
  return { getTracks: () => tracks, getVideoTracks: () => tracks.filter(t => t.kind === "video"), getAudioTracks: () => tracks.filter(t => t.kind === "audio"), addTrack: t => tracks.push(t) };
}
function setup(failure, surface = "monitor", secure = true) {
  const calls = [], acquired = [], exported = {};
  const mediaDevices = {
    async getDisplayMedia() { calls.push("screen"); if (failure === "screen") throw new DOMException("denied", "NotAllowedError"); const s = stream("video", surface); acquired.push(s); return s; },
    async getUserMedia(options) { const step = options.video ? "camera" : "microphone"; calls.push(step); if (failure === step) throw new DOMException("Could not start video source", "NotReadableError"); const s = stream(options.video ? "video" : "audio"); acquired.push(s); return s; },
  };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exported, window: { isSecureContext: secure }, navigator: { mediaDevices }, Error, DOMException });
  return { api: exported, calls, acquired };
}
(async () => {
  const success = setup();
  const session = await success.api.prepareProctorDevices(true);
  assert.deepEqual(success.calls, ["screen", "microphone", "camera"]);
  assert.equal(session.camera.getVideoTracks().length, 1);
  assert.equal(session.camera.getAudioTracks().length, 1);
  success.api.stopProctorSession(session);
  assert.ok(success.acquired.every(s => s.getTracks().every(t => t.readyState === "ended")));
  const withoutCamera = setup();
  const audioOnly = await withoutCamera.api.prepareProctorDevices();
  assert.deepEqual(withoutCamera.calls, ["screen", "microphone"]);
  assert.equal(audioOnly.camera.getVideoTracks().length, 0);
  assert.equal(audioOnly.camera.getAudioTracks().length, 1);
  withoutCamera.api.stopProctorSession(audioOnly);
  const cameraFailure = setup("camera");
  const fallback = await cameraFailure.api.prepareProctorDevices(true);
  assert.equal(fallback.camera.getVideoTracks().length, 0);
  assert.equal(fallback.camera.getAudioTracks().length, 1);
  assert.ok(fallback.screen.getTracks().every(t => t.readyState === "live"));
  cameraFailure.api.stopProctorSession(fallback);
  for (const step of ["screen", "microphone"]) {
    const failed = setup(step);
    await assert.rejects(failed.api.prepareProctorDevices(), error => error.message.includes(step === "screen" ? "chia sẻ màn hình" : step) && !error.message.includes("Could not start video source"));
    assert.ok(failed.acquired.every(s => s.getTracks().every(t => t.readyState === "ended")));
  }
  const tab = setup(null, "browser");
  await assert.rejects(tab.api.prepareProctorDevices(), /toàn bộ màn hình/);
  assert.deepEqual(tab.calls, ["screen"]);
  assert.equal(tab.acquired[0].getTracks()[0].readyState, "ended");
  const insecure = setup(null, "monitor", false);
  await assert.rejects(insecure.api.prepareProctorDevices(), /HTTPS/);
  assert.equal(insecure.calls.length, 0);
  console.log("Proctor devices: optional camera, camera failure fallback, required mic/screen, cleanup and HTTPS checks passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
