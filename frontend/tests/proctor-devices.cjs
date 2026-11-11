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
  // Test 1: AI interview default (capture = "none") with camera
  const success = setup();
  const session = await success.api.prepareProctorDevices(true, "none");
  assert.deepEqual(success.calls, ["microphone", "camera"]);
  assert.equal(session.camera.getVideoTracks().length, 1);
  assert.equal(session.camera.getAudioTracks().length, 1);
  assert.equal(session.screen, undefined);
  success.api.stopProctorSession(session);
  assert.ok(success.acquired.every(s => s.getTracks().every(t => t.readyState === "ended")));

  // Test 2: AI interview audio-only (capture = "none", enableCamera = false)
  const withoutCamera = setup();
  const audioOnly = await withoutCamera.api.prepareProctorDevices(false, "none");
  assert.deepEqual(withoutCamera.calls, ["microphone"]);
  assert.equal(audioOnly.camera.getVideoTracks().length, 0);
  assert.equal(audioOnly.camera.getAudioTracks().length, 1);
  assert.equal(audioOnly.screen, undefined);
  withoutCamera.api.stopProctorSession(audioOnly);

  // Test 3: Camera failure fallback when camera optional
  const cameraFailure = setup("camera");
  const fallback = await cameraFailure.api.prepareProctorDevices(true, "none");
  assert.equal(fallback.camera.getVideoTracks().length, 0);
  assert.equal(fallback.camera.getAudioTracks().length, 1);
  assert.equal(fallback.screen, undefined);
  cameraFailure.api.stopProctorSession(fallback);

  // Test 4: Assessment mode with monitor screen capture
  const assessmentSetup = setup(null, "monitor");
  const assessmentSession = await assessmentSetup.api.prepareProctorDevices(false, "monitor");
  assert.deepEqual(assessmentSetup.calls, ["screen", "microphone"]);
  assert.ok(assessmentSession.screen.getTracks().every(t => t.readyState === "live"));
  assessmentSetup.api.stopProctorSession(assessmentSession);

  // Test 5: Failed microphone rejected
  const micFailure = setup("microphone");
  await assert.rejects(micFailure.api.prepareProctorDevices(false, "none"), error => error.message.includes("microphone"));
  assert.ok(micFailure.acquired.every(s => s.getTracks().every(t => t.readyState === "ended")));

  // Test 6: Insecure context rejected
  const insecure = setup(null, "monitor", false);
  await assert.rejects(insecure.api.prepareProctorDevices(false, "none"), /HTTPS/);
  assert.equal(insecure.calls.length, 0);

  console.log("Proctor devices: optional camera, camera failure fallback, capture none (AI interview), capture monitor (assessment), cleanup and HTTPS checks passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
