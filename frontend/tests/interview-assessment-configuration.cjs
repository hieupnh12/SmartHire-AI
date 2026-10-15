const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const exported = {};
const source = fs.readFileSync(path.join(__dirname, "../src/features/tenant/recruiter/interviews/utils/interviewProcessSettings.ts"), "utf8");
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  { exports: exported, require });
const { defaultProcesses, normalizeProcesses, conversationAssessmentSchema } = exported;
for (const count of [1, 3, 10]) {
  const processes = normalizeProcesses(defaultProcesses());
  const communication = processes.find(item => item.key === "COMMUNICATION");
  communication.config.questionCount = count;
  communication.config.maxFollowUp = 10;
  assert.equal(exported.interviewDurationMinutes(processes), count * 5);
  communication.config.followUpEnabled = false;
  assert.equal(exported.interviewDurationMinutes(processes), count * 5);
}
const process = defaultProcesses().find(item => item.key === "COMMUNICATION");
const legacy = [{ ...process, config: { questionCount: 3, language: "Vietnamese" } }];
const defaults = normalizeProcesses(legacy).find(item => item.key === "COMMUNICATION").config;
assert.equal(defaults.technicalKnowledgeWeight, 25);
assert.equal(defaults.maxFollowUp, 2);
assert.equal(normalizeProcesses([{ ...process, config: { ...process.config, maxFollowUp: 1 } }])
  .find(item => item.key === "COMMUNICATION").config.maxFollowUp, 2);
assert.equal(conversationAssessmentSchema.safeParse(defaults).success, true);

const configured = { ...defaults, technicalKnowledgeWeight: 40, problemSolvingWeight: 30,
  reasoningWeight: 20, communicationWeight: 10, assessmentFocus: "REST API debugging" };
const reload = normalizeProcesses([{ ...process, config: configured }]).find(item => item.key === "COMMUNICATION").config;
assert.equal(JSON.stringify(reload), JSON.stringify(normalizeProcesses([{ ...process, config: reload }]).find(item => item.key === "COMMUNICATION").config));
assert.equal(reload.assessmentFocus, configured.assessmentFocus);
assert.equal(reload.technicalKnowledgeWeight, 40);
assert.equal(conversationAssessmentSchema.safeParse(reload).success, true);
for (const maxFollowUp of [2, 10]) assert.equal(conversationAssessmentSchema.safeParse({ ...reload, maxFollowUp }).success, true);
for (const maxFollowUp of [0, 1, 11, 2.5]) assert.equal(conversationAssessmentSchema.safeParse({ ...reload, maxFollowUp }).success, false);
for (const value of [-1, 101, 2.5, 39, NaN]) {
  assert.equal(conversationAssessmentSchema.safeParse({ ...configured, technicalKnowledgeWeight: value }).success, false);
}
assert.equal(conversationAssessmentSchema.safeParse({ ...configured, assessmentFocus: "x".repeat(2001) }).success, false);
assert.equal(conversationAssessmentSchema.safeParse({ ...configured, technicalKnowledgeWeight: 0,
  problemSolvingWeight: 0, reasoningWeight: 0, communicationWeight: 100 }).success, true);
console.log("Interview configuration: derived duration, follow-up bounds, legacy defaults, save/reload and assessment validation passed.");
