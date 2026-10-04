const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../src/api/tenant/assessmentGenerationApi.ts"), "utf8");
let payload;
const exported = {};
const requests = [];
const api = { get: async url => { requests.push(url); return { data: payload }; } };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  { exports: exported, require: name => { assert.equal(name, "@/lib/axios"); return { api }; } });

(async () => {
  payload = { success: true, message: "OK" };
  assert.equal(await exported.assessmentGenerationApi.configuration(26), null);
  payload = { success: true, data: null };
  assert.equal(await exported.assessmentGenerationApi.configuration(26), null);
  const config = { durationMinutes: 17, passingPercent: 60, autoAssign: true,
    sections: [{ skill: "Java", questionType: "MCQ", difficulty: "Easy", count: 2, points: 3 }] };
  payload = { success: true, data: config };
  assert.equal(await exported.assessmentGenerationApi.configuration(26), config);
  assert.equal(requests.every(url => url === "/assessments/jobs/26/configuration"), true);
  console.log("Assessment configuration: omitted/null data and saved exercise structure passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
