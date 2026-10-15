const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exported = {};
const storage = new Map();
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/tenant/candidate/assessments/utils/submissionDraft.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  { exports: exported, require, localStorage: { getItem: key => storage.get(key) ?? null } });
const submission = { status: 'IN_PROGRESS', objectiveCompletedAt: 'done', questions: [
  { id: 1, questionType: 'MCQ' }, { id: 2, questionType: 'ESSAY' }, { id: 3, questionType: 'CODING', coding: { starterCode: { java: '' } } },
] };
const rows = [{ questionId: 1, answerText: 'not a choice' }, { questionId: 2, answerText: 'essay' }, { questionId: 3, answerText: 'source', language: 'java' }, { questionId: 999, answerText: 'foreign question' }];
storage.set('scope', JSON.stringify(rows));
assert.equal(JSON.stringify(exported.loadSubmissionDraft('scope', submission)), JSON.stringify(rows.slice(1, 3)));
assert.equal(exported.loadSubmissionDraft('another candidate', submission).length, 0);
assert.equal(exported.loadSubmissionDraft('scope', { ...submission, objectiveCompletedAt: null }).length, 0);
assert.equal(exported.loadSubmissionDraft('scope', { ...submission, status: 'SUBMITTED' }).length, 0);
storage.set('scope', JSON.stringify([{ questionId: 3, answerText: 'source', language: 'unsupported' }]));
assert.equal(exported.loadSubmissionDraft('scope', submission).length, 0);
storage.set('scope', 'corrupt JSON');
assert.equal(exported.loadSubmissionDraft('scope', submission).length, 0);
storage.set('scope', JSON.stringify([{ questionId: 2, answerText: 'x'.repeat(10001) }]));
assert.equal(exported.loadSubmissionDraft('scope', submission).length, 0);
assert.equal(exported.sameAnswer({ questionId: 2, answerText: '', language: null }, { questionId: 2, answerText: '' }), true);
assert.equal(exported.sameAnswer({ questionId: 2, answerText: 'older' }, { questionId: 2, answerText: 'newer' }), false);
console.log('Submission drafts passed: scoped storage, locked sections, completed submissions, invalid language, corrupt/oversized data and newer-answer protection.');
