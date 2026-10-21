const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'bank-ai-fixture');
      sessionStorage.setItem('smarthire:general-bank-draft:acme:1', 'manual-draft-marker');
    });
    let requests = 0;
    let failed = false;
    const question = { questionText: 'Which collection preserves insertion order in Java?', points: 5, questionOrder: 0,
      questionType: 'MCQ', difficulty: 'Medium', skill: 'Java', explanation: 'LinkedHashMap preserves insertion order.',
      options: [{ optionText: 'LinkedHashMap', correct: true }, { optionText: 'HashMap', correct: false }, { optionText: 'TreeMap', correct: false }, { optionText: 'HashSet', correct: false }] };
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const ok = data => route.fulfill({ json: { success: true, data } });
      if (path.includes('check-subdomain')) return ok(true);
      if (path.endsWith('/tenant/auth/me')) return ok({ id: 1, role: 'RECRUITER', workspace: 'RECRUITER', fullName: 'Bank Tester', permissions: ['ASSESSMENTS'] });
      if (path.endsWith('/list_questions')) return ok({ items: [], total: 0, page: 0, size: 10, skills: [], counts: { all: 0, favorites: 0, ready: 0, pending: 0, archived: 0 } });
      if (path.endsWith('/question-bank/generation')) {
        requests++;
        assert.equal(route.request().headers()['x-tenant-id'], 'acme');
        assert.equal(route.request().postDataJSON().skill, 'Java');
        return route.fulfill({ status: 202, json: { success: true, data: { id: 'draft-1', status: 'PENDING', questions: [], error: null } } });
      }
      if (path.endsWith('/generation/draft-1')) return ok({ id: 'draft-1', status: failed ? 'FAILED' : 'READY', questions: failed ? [] : [question], error: failed ? 'Model temporarily unavailable' : null });
      return ok([]);
    });
    const url = process.env.ASSESSMENT_UI_URL || 'http://acme.localhost:5196';
    await page.goto(url + '/recruiter/question-bank');
    await page.getByRole('button', { name: /Đề xuất bằng AI/ }).click();
    await page.getByRole('button', { name: 'Tạo bản nháp', exact: true }).click();
    await page.getByText('Nhập kỹ năng hoặc chủ đề.', { exact: true }).waitFor();
    assert.equal(requests, 0);
    await page.getByLabel('Kỹ năng / Chủ đề').fill('Java');
    await page.getByRole('button', { name: 'Tạo bản nháp', exact: true }).click();
    await page.getByRole('button', { name: 'Mở bản nháp để kiểm tra & lưu' }).waitFor();
    await fs.mkdir('test-results/bank-ai-generation', { recursive: true });
    await page.screenshot({ path: 'test-results/bank-ai-generation/desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Mở bản nháp để kiểm tra & lưu' }).click();
    await page.waitForURL('**/question-bank/new?generation=draft-1');
    assert.equal(await page.evaluate(() => sessionStorage.getItem('smarthire:general-bank-draft:acme:1')), 'manual-draft-marker');
    assert.ok(await page.locator('textarea, input').evaluateAll(elements => elements.some(element => element.value.includes('Which collection preserves'))));
    failed = true;
    await page.goto(url + '/recruiter/question-bank');
    await page.getByRole('button', { name: /Đề xuất bằng AI/ }).click();
    await page.getByLabel('Kỹ năng / Chủ đề').fill('Java');
    await page.getByRole('button', { name: 'Tạo bản nháp', exact: true }).click();
    await page.getByText('Model temporarily unavailable', { exact: true }).waitFor();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: 'test-results/bank-ai-generation/mobile.png', fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: form validation, tenant header, AI draft review, manual draft preservation, failure state, mobile layout');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exit(1); });
