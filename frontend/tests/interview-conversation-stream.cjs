const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const exported = {};
const source = fs.readFileSync(path.join(__dirname, "../src/api/tenant/interviewConversationApi.ts"), "utf8");
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
  exports: exported, TextDecoder, require: name => name === "@/lib/axios" ? { api: {} } : { getTenantIdFromWindow: () => "tenant" },
});
async function parse(payload, boundaries) {
  const bytes = new TextEncoder().encode(payload); const chunks = []; let start = 0;
  for (const end of boundaries) { chunks.push(bytes.slice(start, end)); start = end; }
  chunks.push(bytes.slice(start)); const events = [];
  const stream = new ReadableStream({ start(controller) { chunks.forEach(chunk => controller.enqueue(chunk)); controller.close(); } });
  await exported.readConversationStream(stream.getReader(), event => events.push(event)); return events;
}
(async () => {
  const payload = ': heartbeat\r\n\r\nevent: delta\r\ndata: {"text":"Xin chào ứng viên"}\r\n\r\nevent: done\r\ndata: {"messages":[]}\r\n\r\n';
  const length = new TextEncoder().encode(payload).length;
  for (let split = 1; split < length; split++) {
    const events = await parse(payload, [split]);
    assert.equal(events.length, 2); assert.equal(events[0].event, "delta");
    assert.equal(JSON.parse(events[0].data).text, "Xin chào ứng viên"); assert.equal(events[1].event, "done");
  }
  const events = await parse('event: delta\ndata: first\ndata: second\n\n', [5, 13, 25]);
  assert.equal(events[0].data, "first\nsecond");
  console.log("Conversation SSE: every byte boundary, Unicode, CRLF, heartbeat and multiline data passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
