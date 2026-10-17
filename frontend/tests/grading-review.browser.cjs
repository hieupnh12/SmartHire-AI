const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('accessToken', 'grading-fixture'));
    const detail = { id: 71, testTitle: 'Technical paper', candidateName: 'Candidate Tester', candidateEmail: 'candidate@example.test', status: 'SUBMITTED', score: null, passingScore: 30, totalPoints: 60, emailAvailable: true,
      objective: { correctCount: 1, questionCount: 2, score: 5, totalPoints: 10 }, reviews: [
        { questionId: 3, prompt: 'Explain cache trade-offs', type: 'ESSAY', points: 20, answerText: 'Caches reduce latency; invalidation affects correctness.', rubric: { referenceAnswer: 'Discuss TTL and consistency', criteria: [{ name: 'Bản chất cốt lõi', description: 'Core correctness', weight: 40 }, { name: 'Phân tích Trade-offs', description: 'Trade-offs', weight: 30 }, { name: 'Liên hệ thực tế & Logic', description: 'Practical reasoning', weight: 30 }] }, suggestedScore: 17, score: null, reviewedAt: null,
          evaluation: { criteria_results: [{ score_percent: 100, feedback: 'Accurate principles' }, { score_percent: 50, feedback: 'Discuss consistency further' }, { score_percent: 100, feedback: 'Good example' }], general_comment: 'Good overall explanation' } },
        { questionId: 4, prompt: 'Implement a queue', type: 'CODING', points: 30, answerText: 'class Queue {}', language: 'java', rubric: null, suggestedScore: 24, score: null, reviewedAt: null,
          evaluation: { passed: 2, total: 3, tests_percent: 70, tests_weighted: true, tests: [{ passed: true, sample: true, status: 3 }, { passed: true, sample: false, status: 3 }, { passed: false, sample: false, status: 4 }], code_review: { score_percent: 90, time_complexity: 'O(1) enqueue/dequeue', space_complexity: 'O(n)', clean_code: 'Clear separation of responsibilities', naming_conventions: 'Names describe operations', exception_safety: 'Check empty queue before removing', general_comment: 'Clear implementation' } } },
      ] };
    let emails = 0;
    let updates = 0;
    let failApprove = true;
    let failEmail = true;
    const approve = decision => { const row = detail.reviews.find(row => row.questionId === decision.questionId); row.score = decision.score == null ? row.suggestedScore : decision.score; row.reviewedAt = new Date().toISOString(); if (detail.reviews.every(row => row.reviewedAt)) { detail.score = 5 + detail.reviews.reduce((sum, row) => sum + row.score, 0); detail.status = 'GRADED'; } };
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const ok = data => route.fulfill({ json: { success: true, data } });
      if (path.includes('check-subdomain')) return ok(true);
      if (path.endsWith('/tenant/auth/me')) return ok({ id: 1, role: 'RECRUITER', workspace: 'RECRUITER', fullName: 'Grading Tester', permissions: ['ASSESSMENTS'] });
      if (path.endsWith('/jobs/1')) return ok({ id: 1, title: 'Java Developer', status: 'PUBLISHED', skills: [] });
      if (path.endsWith('/list_assessment_submissions')) return ok([{ id: 71, testId: 2, testTitle: detail.testTitle, candidateName: detail.candidateName, candidateEmail: detail.candidateEmail, status: detail.status, score: detail.score, totalPoints: 60, remainingSeconds: 0 }]);
      if (path.endsWith('/grading_detail')) return ok(detail);
      if (path.includes('/approve_grade/')) {
        if (failApprove) { failApprove = false; return route.fulfill({ status: 503, json: { message: 'Review unavailable' } }); }
        approve({ questionId: Number(path.split('/').pop()), ...route.request().postDataJSON() }); return ok(null);
      }
      if (path.endsWith('/update_grading_result')) { updates++; route.request().postDataJSON().decisions.forEach(approve); return ok(detail); }
      if (path.endsWith('/send_result_email')) {
        assert.ok(detail.score != null);
        if (failEmail) { failEmail = false; return route.fulfill({ status: 503, json: { message: 'Queue unavailable' } }); }
        emails++; return ok({ id: 90, status: 'PENDING' });
      }
      if (path.endsWith('/retry_grading')) return ok(null);
      return ok([]);
    });
    await page.goto((process.env.ASSESSMENT_UI_URL || 'http://acme.localhost:5183') + '/recruiter/jobs/1/assessments/submissions');
    await page.getByRole('button', { name: 'Xem & chấm bài' }).click();
    await page.getByRole('heading', { name: 'Xem & Duyệt kết quả · Bài làm #71' }).waitFor();
    await page.getByText('1/2 câu đúng', { exact: false }).waitFor();
    await page.getByText('Bản chất cốt lõi', { exact: true }).waitFor();
    await page.getByRole('cell', { name: '8 / 8', exact: true }).waitFor();
    await page.getByRole('cell', { name: '3 / 6', exact: true }).waitFor();
    await page.getByText('O(1) enqueue/dequeue', { exact: true }).waitFor();
    const send = page.getByRole('button', { name: 'Gửi email thông báo kết quả cho ứng viên' });
    assert.equal(await send.isDisabled(), true);
    const score = page.locator('#override-71-3');
    await score.fill('20.001');
    await page.getByRole('button', { name: 'Cập nhật kết quả bài thi' }).click();
    assert.equal(updates, 0);
    await page.getByText('Nhập điểm từ 0 đến 20', { exact: false }).first().waitFor();
    await score.fill('18.5');
    await page.getByRole('button', { name: 'Xác nhận duyệt điểm' }).first().click();
    await page.getByRole('alert').filter({ hasText: 'Hệ thống đang gặp sự cố' }).waitFor();
    assert.equal(await score.inputValue(), '18.5');
    await page.getByRole('button', { name: 'Xác nhận duyệt điểm' }).first().click();
    await page.getByText('Đã duyệt 18,5/20 điểm', { exact: false }).waitFor();
    await page.getByRole('button', { name: 'Cập nhật kết quả bài thi' }).click();
    await page.getByText('Đã cập nhật kết quả chính thức.', { exact: true }).waitFor();
    assert.equal(detail.score, 47.5);
    await send.click();
    await page.getByRole('button', { name: 'Gửi email', exact: true }).click();
    await page.getByRole('alertdialog').getByRole('alert').waitFor();
    assert.equal(emails, 0);
    await page.getByRole('button', { name: 'Gửi email', exact: true }).click();
    await page.getByText('Đã đưa email kết quả vào hàng đợi gửi.', { exact: false }).waitFor();
    assert.equal(emails, 1);
    await fs.mkdir('test-results/grading-review', { recursive: true });
    await page.screenshot({ path: 'test-results/grading-review/desktop.png', fullPage: true });
    await page.setViewportSize({ width: 375, height: 812 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: 'test-results/grading-review/mobile.png', fullPage: true });
    assert.deepEqual(errors, []);
    console.log('Grading review passed: three score blocks, rubric points, source/test evidence, override validation and retry, batch result, email queue confirmation/retry, desktop/mobile.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
