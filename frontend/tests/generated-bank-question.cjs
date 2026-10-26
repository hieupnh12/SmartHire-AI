const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, require: name => load(path.resolve(path.dirname(file), name + '.ts')) });
  return exports;
}
const { generatedBankQuestion } = load(path.resolve(__dirname, '../src/features/tenant/recruiter/assessments/utils/generatedBankQuestion.ts'));
const base = { questionText: 'Question', points: 5, difficulty: 'Medium', skill: 'Java', questionOrder: 0, explanation: 'Explanation' };
const choice = generatedBankQuestion({ ...base, questionType: 'MULTIPLE_CHOICE', options: [{ optionText: 'A1', correct: true }, { optionText: 'B1', correct: false }, { optionText: 'C1', correct: true }, { optionText: 'D1', correct: false }] });
assert.equal(choice.kind, 'NHIEU_DAP_AN');
assert.equal(choice.answer, 'A,C');
assert.equal(choice.optionC, 'C1');
const rubric = { referenceAnswer: 'Reference', criteria: [{ description: 'Excellent 9-10: Strong; Pass 6-8: Adequate; Fail 0-5: Incorrect', weight: 100 }] };
const essay = generatedBankQuestion({ ...base, questionType: 'ESSAY', options: [], rubricJson: rubric });
assert.equal(essay.sample, 'Reference');
assert.equal(essay.rubric[0].text, 'Strong');
assert.equal(essay.rubric[2].text, 'Incorrect');
assert.deepEqual(JSON.parse(essay.rubricJsonText), rubric);
const coding = { category: 'CODING_ALGORITHM', timeLimitMs: 2000, memoryMb: 256, starterCode: { python: 'def solve(): pass' }, harness: { python: '{{SOURCE}}' }, testCases: [{ input: '1', expectedOutput: '2', sample: false }] };
const code = generatedBankQuestion({ ...base, questionType: 'CODING', options: [], explanation: 'reference-solution', coding });
assert.equal(code.sample, 'reference-solution');
assert.equal(code.snippet, 'def solve(): pass');
assert.equal(code.language, 'python');
assert.deepEqual(JSON.parse(code.codingJsonText), coding);
console.log('PASS: AI choice answers, essay rubric/reference answer, coding starter/harness/tests and model solution round-trip');
