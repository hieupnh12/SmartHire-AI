const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, resolve = require) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, "../src", file), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: resolve });
  return exports;
}
const types = load("api/types/aiInterview.ts");
const { toFormValues, toRequest, configSchema } = load("features/tenant/recruiter/interviews/utils/aiInterviewConfigSchema.ts",
  name => name === "@/api/types/aiInterview" ? types : require(name));
const base = { enabled: true, passingScore: 70, questionCount: 3, availableFrom: null, availableUntil: null,
  policy: { durationMinutes: 15, maxAttempts: 2, miniAssessmentEnabled: false, miniQuestionCount: 3,
    miniWeight: 0, miniAfterStage: 0, weights: types.WEIGHT_PRESETS.default, selectedSkills: [], stages: [], schemaVersion: 2 } };
const form = toFormValues(base);
assert.equal(form.policy.availability.mode, "RELATIVE");
assert.equal(form.policy.availability.startDelayHours, 0);
assert.equal(form.policy.availability.completionWindowHours, 24);
assert.equal(configSchema.safeParse(form).success, true);
form.policy.availability.startDelayHours = 6;
form.policy.availability.completionWindowHours = 48;
form.availableFrom = "invalid hidden date";
const parsed = configSchema.parse(form);
const request = toRequest(parsed);
assert.equal(request.availableFrom, null);
assert.equal(request.availableUntil, null);
assert.equal(request.policy.availability.startDelayHours, 6);
assert.equal(request.policy.availability.completionWindowHours, 48);
for (const [key, value] of [["startDelayHours", -1], ["startDelayHours", 1.5], ["startDelayHours", null],
  ["completionWindowHours", 0], ["completionWindowHours", null], ["completionWindowHours", 8761]]) {
  assert.equal(configSchema.safeParse({ ...form, policy: { ...form.policy,
    availability: { ...form.policy.availability, [key]: value } } }).success, false);
}
const absolute = toFormValues({ ...base, availableFrom: "2030-01-01T00:00:00Z", availableUntil: "2030-01-02T00:00:00Z" });
assert.equal(absolute.policy.availability.mode, "ABSOLUTE");
assert.equal(configSchema.safeParse(absolute).success, true);
assert.equal(toRequest(configSchema.parse(absolute)).availableFrom, "2030-01-01T00:00:00.000Z");
absolute.availableUntil = absolute.availableFrom;
assert.equal(configSchema.safeParse(absolute).success, false);
absolute.availableUntil = "";
assert.equal(configSchema.safeParse(absolute).success, false);
console.log("Interview availability: relative offsets, absolute dates, hidden stale dates and invalid windows passed.");
