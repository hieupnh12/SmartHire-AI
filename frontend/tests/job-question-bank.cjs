const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../src/features/tenant/recruiter/assessments/utils/jobQuestionBank.ts"), "utf8");
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsObject });
const { matchesJobBank } = exportsObject;
const job = { id: 10, skills: [{ name: "Java" }, { name: "React" }] };
const question = (skill, changes = {}) => ({ jobId: null, testStatus: null, archived: false, question: { skill }, ...changes });

assert.equal(matchesJobBank(question(" java "), job), true);
assert.equal(matchesJobBank(question("React", { jobId: 20, testStatus: "PUBLISHED" }), job), true);
assert.equal(matchesJobBank(question("JavaScript"), job), false);
assert.equal(matchesJobBank(question(null), job), false);
assert.equal(matchesJobBank(question("Java", { archived: true }), job), false);
assert.equal(matchesJobBank(question("Java", { testStatus: "ARCHIVED" }), job), false);
assert.equal(matchesJobBank(question(null, { jobId: 10 }), job), true);
assert.equal(matchesJobBank(question("Python", { jobId: 10, testStatus: "ARCHIVED" }), job), true);
assert.equal(matchesJobBank(question("Java"), { id: 10, skills: [] }), false);
assert.equal(matchesJobBank(question("Java"), { id: 10, skills: [{ name: "Python" }] }), false);
console.log("Job question bank: 10 skill/source/archive checks passed.");
