const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

// Browser-only contract fixtures; no production or real tenant data is changed.
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const output = path.resolve('test-results/assessment');
  await fs.mkdir(output, { recursive: true });
  const base = process.env.ASSESSMENT_UI_URL || 'http://acme.localhost:5173';
  let paper = null;
  let questions = [];
  let submission = null;
  let failedSaves = 0;
  let failNextSave = false;
  let saveDelay = 0;
  let finalSubmits = 0;
  const pageErrors = [];
  const contexts = [];
  async function session(role) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    contexts.push(context);
    await context.addInitScript(() => localStorage.setItem('accessToken', 'browser-test-fixture'));
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (!url.pathname.startsWith('/api/v1/')) return route.continue();
      const p = url.pathname.replace(/^.*\/api\/v1/, '');
      const method = request.method();
      const body = request.postData() ? request.postDataJSON() : null;
      const ok = data => route.fulfill({ json: { success: true, message: 'OK', data } });
      if (p.includes('check-subdomain')) return ok(true);
      if (p === '/tenant/auth/me') return ok({ id: role === 'RECRUITER' ? 1 : 2, fullName: 'Assessment Tester', email: 'test@example.test', role, workspace: role, permissions: ['ASSESSMENTS'] });
      if (p === '/jobs/options') return ok([{ id: 1, title: 'Java Developer', status: 'PUBLISHED' }]);
      if (p === '/applications/me') return ok([{ id: 11, jobId: 1, jobTitle: 'Java Developer', status: 'ASSESSMENT', archived: false }]);
      if (p === '/applications/11/assessments') return ok(paper?.status === 'PUBLISHED' ? [{ ...paper, submissionId: submission?.id ?? null, submissionStatus: submission?.status ?? null }] : []);
      if (p === '/assessments' && method === 'GET') return ok({ items: paper ? [paper] : [], page: 0, size: 20, total: paper ? 1 : 0 });
      if (p === '/assessments' && method === 'POST') { paper = { ...body, id: 1, status: 'DRAFT', createdAt: new Date().toISOString() }; return ok(paper); }
      if (p === '/assessments/1' && method === 'GET') return ok(paper);
      if (p === '/assessments/1' && method === 'PUT') { paper = { ...paper, ...body }; return ok(paper); }
      if (p === '/assessments/1/questions' && method === 'GET') return ok(questions);
      if (p === '/assessments/1/questions' && method === 'POST') {
        const id = questions.length + 1;
        const q = { ...body, id, questionType: 'MCQ', options: body.options.map((o, i) => ({ ...o, id: id * 10 + i })) };
        questions.push(q); return ok(q);
      }
      if (p === '/assessments/1/publish') { paper.status = 'PUBLISHED'; return ok(paper); }
      if (p === '/assessments/1/submissions') {
        submission ??= { id: 71, testId: 1, applicationId: 11, title: paper.title, status: 'IN_PROGRESS',
          startedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          submittedAt: null, score: null, totalPoints: questions.reduce((sum, q) => sum + q.points, 0), passed: null,
          questions: questions.map(q => ({ ...q, options: q.options.map(({ id, optionText }) => ({ id, optionText })) })), answers: [] };
        return ok(view());
      }
      if (p === '/submissions/71' && method === 'GET') return ok(view());
      if (p === '/submissions/71/answers') {
        if (failNextSave) { failNextSave = false; failedSaves++; return route.fulfill({ status: 503, json: { success: false, message: 'Không lưu được bài. Thử lại.', code: 'UNAVAILABLE' } }); }
        if (saveDelay) await new Promise(resolve => setTimeout(resolve, saveDelay));
        for (const a of body.answers) {
          const previous = submission.answers.findIndex(x => x.questionId === a.questionId);
          if (previous < 0) submission.answers.push(a); else submission.answers[previous] = a;
        }
        return ok(view());
      }
      if (p === '/submissions/71/submit') {
        finalSubmits++;
        submission.status = Date.now() >= Date.parse(submission.expiresAt) ? 'EXPIRED' : 'GRADED';
        submission.score = submission.answers.reduce((score, a) => {
          const q = questions.find(q => q.id === a.questionId);
          return score + (q.options.find(o => o.id === a.selectedOptionId)?.correct ? q.points : 0);
        }, 0);
        submission.passed = submission.score >= paper.passingScore;
        submission.submittedAt = new Date().toISOString(); return ok(view());
      }
      return route.fulfill({ status: 404, json: { success: false, message: `Unhandled fixture: ${method} ${p}` } });
    });
    const page = await context.newPage();
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    return page;
  }
  function view() { return { ...submission, serverTime: new Date().toISOString(), remainingSeconds: Math.max(0, Math.ceil((Date.parse(submission.expiresAt) - Date.now()) / 1000)) }; }
  async function noOverflow(page) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false, 'Page overflows horizontally'); }
  try {
    const recruiter = await session('RECRUITER');
    await recruiter.goto(base + '/recruiter/assessments');
    await recruiter.getByText('Chưa có đề kiểm tra.', { exact: true }).waitFor();
    await recruiter.getByRole('link', { name: 'Tạo đề mới' }).click();
    await recruiter.getByRole('button', { name: 'Tạo đề nháp' }).click();
    await recruiter.getByText('Nhập tên đề.', { exact: true }).waitFor();
    await recruiter.getByLabel('Tên đề', { exact: false }).fill('Java fundamentals');
    await recruiter.getByLabel('Vị trí tuyển dụng').selectOption('1');
    await recruiter.getByLabel('Điểm đạt').fill('5');
    await recruiter.getByRole('button', { name: 'Tạo đề nháp' }).click();
    await recruiter.waitForURL('**/recruiter/assessments/1');
    await recruiter.getByRole('button', { name: 'Thêm câu', exact: true }).click();
    await recruiter.getByLabel('Nội dung câu hỏi').fill('Which keyword defines a Java class?');
    await recruiter.getByLabel('Điểm', { exact: true }).fill('5');
    await recruiter.getByRole('textbox', { name: 'Lựa chọn 1', exact: true }).fill('class');
    await recruiter.getByRole('textbox', { name: 'Lựa chọn 2', exact: true }).fill('def');
    await recruiter.getByRole('button', { name: 'Lưu câu hỏi' }).click();
    await recruiter.getByText('Đã lưu câu hỏi.', { exact: true }).waitFor();
    await noOverflow(recruiter);
    await recruiter.screenshot({ path: path.join(output, 'recruiter-desktop.png'), fullPage: true });
    await recruiter.setViewportSize({ width: 390, height: 844 });
    await noOverflow(recruiter);
    await recruiter.screenshot({ path: path.join(output, 'recruiter-mobile.png'), fullPage: true });
    await recruiter.getByRole('button', { name: 'Xuất bản', exact: true }).click();
    await recruiter.getByText('Đề đã được xuất bản.').waitFor();
    assert.equal(paper.status, 'PUBLISHED');
    assert.equal(paper.passingScore, 5);

    const candidate = await session('CANDIDATE');
    await candidate.goto(base + '/candidate/assessments');
    await candidate.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    await candidate.waitForURL('**/candidate/assessments/71/take');
    failNextSave = true;
    await candidate.getByRole('radio', { name: 'A. class', exact: true }).check();
    await candidate.getByRole('alert').filter({ hasText: 'Không lưu được bài' }).waitFor();
    assert.equal(failedSaves, 1);
    await candidate.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await candidate.getByText('Đã lưu', { exact: true }).waitFor();
    assert.equal(submission.answers[0].selectedOptionId, 10);
    await candidate.reload();
    await candidate.getByRole('radio', { name: 'A. class', exact: true }).waitFor();
    assert.equal(await candidate.getByRole('radio', { name: 'A. class', exact: true }).isChecked(), true);
    await noOverflow(candidate);
    await candidate.screenshot({ path: path.join(output, 'candidate-desktop.png'), fullPage: true });
    await candidate.setViewportSize({ width: 390, height: 844 });
    await noOverflow(candidate);
    await candidate.screenshot({ path: path.join(output, 'candidate-mobile.png'), fullPage: true });
    saveDelay = 1000;
    await candidate.getByRole('radio', { name: 'B. def', exact: true }).check();
    await candidate.getByRole('button', { name: 'Nộp bài', exact: true }).click();
    await candidate.getByRole('heading', { name: 'Bài làm đã được ghi nhận' }).waitFor();
    assert.equal(submission.score, 0, 'Submit must wait for the latest local selection');
    assert.equal(finalSubmits, 1);

    submission.status = 'IN_PROGRESS'; submission.score = null; submission.submittedAt = null;
    submission.expiresAt = new Date(Date.now() + 2000).toISOString();
    await candidate.reload();
    await candidate.getByRole('heading', { name: 'Đã hết thời gian làm bài' }).waitFor();
    assert.equal(finalSubmits, 2, 'Timer auto-submits once');
    assert.deepEqual(pageErrors, []);
    console.log('PASS: recruiter create/validate/question/publish; candidate start/save failure/retry/reload/save-before-submit/expiry; desktop/mobile overflow and screenshots.');
  } catch (error) {
    for (let i = 0; i < contexts.length; i++) {
      const page = contexts[i].pages()[0];
      if (page) await page.screenshot({ path: path.join(output, `failure-${i}.png`), fullPage: true }).catch(() => {});
    }
    throw error;
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
