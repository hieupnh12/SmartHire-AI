const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('accessToken', 'preview-fixture'));
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let data = [];
      if (path.includes('check-subdomain')) data = true;
      if (path.endsWith('/tenant/auth/me')) data = { id: 1, role: 'RECRUITER', workspace: 'RECRUITER', fullName: 'Preview Tester', permissions: ['ASSESSMENTS'] };
      if (/\/jobs\/\d+$/.test(path)) data = { id: Number(path.split('/').pop()), title: 'Java Developer', status: 'PUBLISHED', skills: [] };
      await route.fulfill({ json: { success: true, data } });
    });
    await page.goto((process.env.ASSESSMENT_UI_URL || 'http://acme.localhost:5183') + `/recruiter/jobs/${process.env.ASSESSMENT_JOB_ID || 1}/assessments/preview`);
    await page.getByRole('heading', { name: 'Xem trước trải nghiệm làm bài của ứng viên' }).waitFor();
    assert.equal(await page.locator('.assessment-preview').evaluate(el => getComputedStyle(el).getPropertyValue('--color-primary').trim()), '#004ac6');
    await page.getByRole('button', { name: 'Xem mẫu trắc nghiệm', exact: true }).click();
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: 'Chốt trắc nghiệm & chuyển tự luận' }).click();
    await page.getByLabel('Bài làm của ứng viên', { exact: false }).fill('Bài mẫu kiểm tra lưu trạng thái khi chuyển tab.');
    await page.getByRole('button', { name: 'Xem kết quả chạy mẫu minh họa' }).click();
    await page.getByText('Passed · minh họa', { exact: true }).first().waitFor();
    const colors = await page.locator('textarea').last().evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, fg: getComputedStyle(el).color }));
    assert.notEqual(colors.bg, colors.fg, 'Code must remain readable');
    await fs.mkdir('test-results/assessment-preview', { recursive: true });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: 'test-results/assessment-preview/candidate-desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Nộp bài mẫu & Chấm điểm' }).click();
    await page.getByRole('heading', { name: 'Chấm & duyệt điểm · Góc nhìn Recruiter' }).waitFor();
    await page.getByRole('button', { name: 'Chấp thuận điểm mẫu', exact: true }).click();
    await page.getByRole('button', { name: 'Duyệt điểm code mẫu', exact: true }).click();
    await page.getByText('90.9', { exact: false }).waitFor();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: 'test-results/assessment-preview/grading-desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Ngân hàng câu hỏi', exact: false }).click();
    await page.getByRole('button', { name: 'Soạn Lập trình (Coding Problem)', exact: true }).click();
    await page.getByRole('heading', { name: 'Biên soạn bài toán Lập trình' }).waitFor();
    await page.getByRole('button', { name: 'Code mẫu & Harness', exact: false }).click();
    await page.getByLabel('Starter Code', { exact: false }).waitFor();
    await page.getByRole('button', { name: 'Test cases (5)', exact: false }).click();
    assert.equal(await page.getByLabel('Expected Output', { exact: false }).count(), 5);
    await page.getByRole('button', { name: 'Soạn Tự luận (Essay Rubric)', exact: true }).click();
    await page.getByRole('button', { name: 'Lưu câu hỏi mẫu', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Đã lưu câu hỏi' }).waitFor();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: 'test-results/assessment-preview/authoring-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 375, height: 812 });
    for (const name of ['Ngân hàng câu hỏi', 'Cấu trúc đề', 'Ứng viên làm bài', 'Chấm & duyệt điểm']) {
      await page.getByRole('button', { name, exact: false }).first().click();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow: ${name}`);
    }
    await page.screenshot({ path: 'test-results/assessment-preview/grading-mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'Đặt lại mẫu' }).click();
    await page.getByRole('button', { name: 'Xem mẫu trắc nghiệm', exact: true }).click();
    assert.equal(await page.getByRole('radio').first().isChecked(), true);
    assert.deepEqual(errors, []);
    console.log('Assessment preview: four tabs, authoring, submission, approval, reset and mobile passed.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
