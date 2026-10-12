const { chromium } = require('playwright');
const assert = require('node:assert/strict');

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => d.accept());
    await page.addInitScript(() => localStorage.setItem('accessToken', 'fixture'));
    const questions = ['MCQ', 'MULTIPLE_CHOICE', 'ESSAY'].map((questionType, i) => ({
      id: i + 1, questionType, questionText: questionType, points: 1, questionOrder: i,
      options: questionType === 'ESSAY' ? [] : [{ id: 10, optionText: 'First' }, { id: 11, optionText: 'Second' }],
    }));
    const submission = { id: 71, testId: 1, applicationId: 11, title: 'Mixed assessment', status: 'IN_PROGRESS',
      expiresAt: new Date(Date.now() + 600000).toISOString(), remainingSeconds: 600, score: null, passed: null,
      totalPoints: 3, questions, answers: [] };
    let fail = false;
    let successfulSaves = 0;
    let observedSaves = 0;
    await page.route('**/api/v1/**', async route => {
      const p = new URL(route.request().url()).pathname;
      const ok = data => route.fulfill({ json: { success: true, data } });
      if (p.includes('check-subdomain')) return ok(true);
      if (p.endsWith('/tenant/auth/me')) return ok({ id: 2, fullName: 'Tester', role: 'CANDIDATE', workspace: 'CANDIDATE', permissions: [] });
      if (p.endsWith('/save_answers')) {
        if (fail) { fail = false; return route.fulfill({ status: 503, json: { message: 'Save failed' } }); }
        for (const a of route.request().postDataJSON().answers) {
          if (a.questionId === 4) { assert.deepEqual(Object.keys(a).sort(), ['answerText', 'language', 'questionId']); submission.answers = [a]; continue; }
          const field = { 1: 'selectedOptionId', 2: 'selectedOptionIds', 3: 'answerText' }[a.questionId];
          assert.deepEqual(Object.keys(a).sort(), ['questionId', field].sort());
          submission.answers = [...submission.answers.filter(x => x.questionId !== a.questionId), a];
        }
        successfulSaves++;
      }
      if (p.endsWith('/run_samples')) return ok([{ status: { id: 3, description: 'Accepted' }, stdout: '2' }]);
      if (p.endsWith('/complete_objective')) submission.objectiveCompletedAt = new Date().toISOString();
      if (p.endsWith('/submit_test')) submission.status = 'SUBMITTED';
      if (p.includes('/submissions/')) return ok({ ...submission, serverTime: new Date().toISOString() });
      return ok([]);
    });
    const saved = async () => {
      const until = Date.now() + 30000;
      while (successfulSaves <= observedSaves && Date.now() < until) await page.waitForTimeout(50);
      assert.ok(successfulSaves > observedSaves, 'Expected a successful autosave');
      observedSaves = successfulSaves;
      await page.getByText('Đã lưu', { exact: true }).waitFor();
    };
    await page.goto((process.env.ASSESSMENT_UI_URL || 'http://acme.localhost:5173') + '/candidate/assessments/71/take');
    await page.getByRole('radio', { name: 'A. First' }).check(); await saved();
    await page.getByRole('button', { name: 'Tiếp', exact: true }).click();
    fail = true;
    await page.getByRole('checkbox', { name: 'A. First' }).check();
    await page.getByRole('button', { name: 'Thử lại', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click(); await saved();
    await page.getByRole('checkbox', { name: 'B. Second' }).check(); await saved();
    assert.deepEqual(submission.answers.find(a => a.questionId === 2).selectedOptionIds, [10, 11]);
    await page.reload();
    await page.getByRole('button', { name: 'Câu 2, đã trả lời', exact: true }).click();
    assert.equal(await page.getByRole('checkbox', { name: 'B. Second' }).isChecked(), true);
    await page.getByRole('button', { name: 'Bỏ chọn', exact: true }).click(); await saved();
    assert.deepEqual(submission.answers.find(a => a.questionId === 2).selectedOptionIds, []);
    await page.getByRole('button', { name: 'Hoàn thành phần 1' }).click();
    await page.getByLabel('Câu trả lời tự luận', { exact: false }).fill('JWT gồm header, payload và signature.'); await saved();
    await page.reload();
    assert.ok(submission.objectiveCompletedAt);
    assert.equal(await page.getByRole('radio').count(), 0);
    await page.getByRole('button', { name: 'Câu 1, đã trả lời', exact: true }).click();
    assert.equal(await page.getByLabel('Câu trả lời tự luận', { exact: false }).inputValue(), 'JWT gồm header, payload và signature.');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.getByLabel('Câu trả lời tự luận', { exact: false }).fill('Latest answer');
    await page.getByRole('button', { name: 'Nộp bài', exact: true }).click();
    await page.getByRole('heading', { name: 'Bài làm đã được ghi nhận' }).waitFor();
    assert.equal(submission.answers.find(a => a.questionId === 3).answerText, 'Latest answer');
    await page.getByText('Đang chấm', { exact: true }).first().waitFor();
    await page.screenshot({ path: require('node:path').join(require('node:os').tmpdir(), 'assessment-sections-mobile.png'), fullPage: true });
    submission.id = 72; submission.status = 'IN_PROGRESS'; submission.objectiveCompletedAt = null; submission.answers = [];
    submission.questions = [{ id: 4, questionType: 'CODING', questionText: 'Double a number', points: 10, questionOrder: 0, options: [],
      coding: { category: 'CODING_ALGORITHM', timeLimitMs: 2000, memoryMb: 256, starterCode: { python: 'print(2)' }, harness: null,
        testCases: [{ input: '1', expectedOutput: '2', sample: true }] } }];
    await page.goto((process.env.ASSESSMENT_UI_URL || 'http://acme.localhost:5173') + '/candidate/assessments/72/take');
    await page.locator('.monaco-editor').waitFor({ timeout: 60000 });
    await page.getByRole('button', { name: 'Chạy test mẫu', exact: true }).click();
    await page.getByText('Test 1: Accepted', { exact: false }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: require('node:path').join(require('node:os').tmpdir(), 'assessment-code-mobile.png'), fullPage: true });
    assert.deepEqual(errors, []);
    console.log('PASS: mixed types, payload validation, retry, clear, reload, essay, mobile, save before submit, local Monaco, sample console.');
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
