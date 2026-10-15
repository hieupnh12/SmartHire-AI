const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(() => {
      localStorage.setItem('accessToken', 'candidate-exam-fixture');
      localStorage.setItem('smarthire.assessment-draft:acme:99:71', JSON.stringify([{ questionId: 3, answerText: 'Other candidate secret' }]));
    });
    const errors = [];
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    const questions = [
      { id: 1, questionType: 'MCQ', questionText: 'Choose one', points: 5, questionOrder: 0, options: [{ id: 10, optionText: 'First' }, { id: 11, optionText: 'Second' }] },
      { id: 2, questionType: 'MULTIPLE_CHOICE', questionText: 'Choose multiple', points: 5, questionOrder: 1, options: [{ id: 20, optionText: 'First' }, { id: 21, optionText: 'Second' }] },
      { id: 3, questionType: 'ESSAY', questionText: '# Explain caching\n\n**Discuss trade-offs** and `TTL`.\n\n| Policy | Purpose |\n| --- | --- |\n| LRU | Eviction |\n\n```java\ncache.get(key);\n```\n\n<img src=x onerror=alert(1)>', points: 20, questionOrder: 2, options: [] },
      { id: 4, questionType: 'CODING', questionText: '# Double input\n\nRead an integer and print twice its value.', points: 30, questionOrder: 3, options: [], coding: { title: 'Double input', category: 'CODING_ALGORITHM', timeLimitMs: 2000, memoryMb: 256, starterCode: { python: 'print(int(input()) * 2)', javascript: '// starter' }, harness: null, testCases: [{ input: '1', expectedOutput: '2', sample: true }, { input: '2', expectedOutput: '4', sample: true }, { input: '3', expectedOutput: '6', sample: true }] } },
    ];
    let submission = { id: 71, testId: 1, applicationId: 11, title: 'Multi-section candidate exam', status: 'IN_PROGRESS', expiresAt: new Date(Date.now() + 600000).toISOString(), remainingSeconds: 600, totalPoints: 60, score: null, passed: null, questions, answers: [] };
    let failSave = false;
    let failComplete = false;
    let runs = 0;
    let submitted = false;
    await context.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const ok = data => route.fulfill({ json: { success: true, data } });
      if (path.includes('check-subdomain')) return ok(true);
      if (path.endsWith('/tenant/auth/me')) return ok({ id: 2, fullName: 'Exam Candidate', role: 'CANDIDATE', workspace: 'CANDIDATE', permissions: [] });
      if (path.endsWith('/save_answers')) {
        if (failSave) { failSave = false; return route.fulfill({ status: 503, json: { message: 'Save failed' } }); }
        const body = route.request().postDataJSON();
        for (const answer of body.answers) submission.answers = [...submission.answers.filter(saved => saved.questionId !== answer.questionId), answer];
      }
      if (path.endsWith('/complete_objective')) {
        if (failComplete) { failComplete = false; return route.fulfill({ status: 503, json: { message: 'Section transition failed' } }); }
        submission.objectiveCompletedAt = new Date().toISOString();
      }
      if (path.endsWith('/run_samples')) {
        const body = route.request().postDataJSON(); assert.ok(body.source); assert.equal(body.language, 'javascript'); runs++;
        return ok([{ status: { id: 3, description: 'Accepted' }, stdout: '2\n' }, { status: { id: 4, description: 'Wrong Answer' }, stdout: 'wrong\n' }, { status: { id: 5, description: 'Time Limit Exceeded' }, stderr: 'Execution timed out' }]);
      }
      if (path.endsWith('/submit_test')) { submission.status = Date.now() >= Date.parse(submission.expiresAt) ? 'EXPIRED' : 'SUBMITTED'; submission.submittedAt = new Date().toISOString(); submitted = true; }
      if (path.includes('/submissions/')) return ok({ ...submission, serverTime: new Date().toISOString() });
      return ok([]);
    });
    const base = process.env.ASSESSMENT_UI_URL || 'http://acme.localhost:5183';
    const roomUrl = `${base}/assessments/71/take`;
    await page.goto(roomUrl);
    await page.getByText('Bước 1: Trắc nghiệm (2 câu)').waitFor();
    await page.getByText('Bước 2: Tự luận & Lập trình (2 câu)').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Nộp bài', exact: true }).isDisabled(), true);
    await page.getByRole('radio', { name: 'A. First' }).check();
    await page.getByRole('button', { name: 'Tiếp', exact: true }).click();
    await page.getByRole('checkbox', { name: 'A. First' }).check();
    await page.getByRole('checkbox', { name: 'B. Second' }).check();
    const complete = page.getByRole('button', { name: 'Hoàn thành Phần 1 & Chuyển sang Phần Tự luận' });
    await complete.click();
    await page.getByRole('alertdialog').getByRole('button', { name: /^(Hủy|Cancel)$/ }).click();
    assert.equal(submission.objectiveCompletedAt, undefined);
    failComplete = true;
    await complete.click();
    await page.getByRole('button', { name: 'Chốt & Chuyển phần', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('alert').waitFor();
    assert.equal(submission.objectiveCompletedAt, undefined);
    await page.getByRole('button', { name: 'Chốt & Chuyển phần', exact: true }).click();
    const essay = page.getByLabel('Câu trả lời tự luận', { exact: false });
    await essay.waitFor();
    assert.equal(await essay.inputValue(), '');
    assert.equal(await page.getByRole('radio').count(), 0);
    assert.deepEqual(submission.answers.find(answer => answer.questionId === 2).selectedOptionIds, [20, 21]);
    await page.getByRole('table').waitFor();
    assert.equal(await page.locator('img[src="x"]').count(), 0);
    await essay.fill('Cache reduces latency and needs invalidation.');
    await page.getByRole('button', { name: 'In đậm', exact: true }).click();
    assert.ok((await essay.inputValue()).includes('**'));
    const text = await essay.inputValue();
    const key = 'smarthire.assessment-draft:acme:2:71';
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || '[]').some(row => row.questionId === 3 && row.answerText.includes('Cache')), key);
    assert.equal(submission.answers.some(answer => answer.questionId === 3), false, 'Local draft must be saved before the 10-second server autosave');
    await page.getByRole('button', { name: 'Xem trước', exact: true }).click();
    await page.getByRole('button', { name: 'Soạn thảo', exact: true }).click();
    await page.reload();
    await essay.waitFor();
    assert.equal(await essay.inputValue(), text);
    await fs.mkdir('test-results/candidate-exam', { recursive: true });
    await page.screenshot({ path: 'test-results/candidate-exam/essay-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 375, height: 812 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: 'test-results/candidate-exam/essay-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: 'Lập trình', exact: true }).click();
    try { await page.locator('.monaco-editor').waitFor({ timeout: 60000 }); }
    catch (error) { console.error('Editor diagnostics:', errors, (await page.locator('body').innerText()).slice(-2500)); throw error; }
    await page.getByLabel('Ngôn ngữ', { exact: false }).selectOption('javascript');
    failSave = true;
    await page.getByRole('button', { name: 'Lưu bài làm', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Hệ thống đang gặp sự cố tạm thời.' }).first().waitFor();
    await page.getByRole('button', { name: 'Lưu bài làm', exact: true }).click();
    await page.getByText('Đã lưu mã nguồn lên máy chủ.', { exact: false }).waitFor();
    assert.equal(submission.answers.find(answer => answer.questionId === 4).language, 'javascript');
    const codeEditor = page.locator('.monaco-editor textarea').first();
    await page.locator('.monaco-editor .view-lines').click({ position: { x: 80, y: 10 } });
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText('x'.repeat(10001));
    try { await page.getByText('Mã nguồn tối đa 10.000 ký tự. Phần nhập vượt giới hạn chưa được áp dụng.', { exact: true }).waitFor({ timeout: 5000 }); }
    catch (error) { console.error('Source limit diagnostics:', (await page.locator('body').innerText()).slice(-1800), 'textarea value length:', (await codeEditor.inputValue()).length); throw error; }
    await page.keyboard.press('Control+Enter');
    await page.getByText('Passed · Accepted').waitFor();
    assert.equal(runs, 1);
    await page.getByRole('button', { name: 'Test Case 2', exact: true }).click();
    await page.getByText('Failed · Wrong Answer').waitFor();
    await page.getByRole('button', { name: 'Test Case 3', exact: true }).click();
    await page.getByText('Time Limit / Runtime / Compile Error', { exact: false }).waitFor();
    await page.getByText('Execution timed out', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Khôi phục code ban đầu', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: /^(Hủy|Cancel)$/ }).click();
    await page.getByRole('button', { name: 'Khôi phục code ban đầu', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Khôi phục', exact: true }).click();
    assert.equal(await page.getByText('Passed · Accepted').count(), 0);
    await page.screenshot({ path: 'test-results/candidate-exam/code-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 375, height: 812 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: 'test-results/candidate-exam/code-mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'Nộp bài', exact: true }).click();
    await page.getByRole('heading', { name: 'Bài làm đã được ghi nhận' }).waitFor();
    assert.equal(submitted, true);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null);
    assert.ok(await page.getByText('Đang chấm', { exact: true }).count() >= 1);
    await page.reload();
    await page.getByRole('heading', { name: 'Bài làm đã được ghi nhận' }).waitFor();
    assert.equal(await page.getByLabel('Câu trả lời tự luận', { exact: false }).count(), 0);
    submission = { ...submission, id: 72, status: 'IN_PROGRESS', objectiveCompletedAt: null, answers: [], questions: [questions[2]], expiresAt: new Date(Date.now() + 2500).toISOString() };
    await page.goto(`${base}/assessments/72/take`);
    await page.getByLabel('Câu trả lời tự luận', { exact: false }).waitFor();
    await page.getByRole('heading', { name: 'Đã hết thời gian làm bài' }).waitFor();
    assert.equal(await page.getByRole('alertdialog').count(), 0);
    assert.deepEqual(errors, []);
    console.log('Candidate exam passed: section confirmation/retry/lock, safe Markdown, draft reload/isolation, Monaco shortcut, language/reset, sample console statuses, save/submit, expiration and mobile layout.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
