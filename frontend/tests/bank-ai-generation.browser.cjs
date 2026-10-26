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
    let draftRequests = 0;
    let createRequests = 0;
    let failed = false;
    const draft = {
      question: {
        questionText: 'Which collection preserves insertion order in Java?',
        points: 5,
        questionOrder: 0,
        questionType: 'MCQ',
        difficulty: 'Medium',
        skill: 'Java',
        explanation: 'LinkedHashMap preserves insertion order.',
        options: [
          { optionText: 'LinkedHashMap', correct: true },
          { optionText: 'HashMap', correct: false },
          { optionText: 'TreeMap', correct: false },
          { optionText: 'HashSet', correct: false },
        ],
      },
      authoringMetadata: { aiGenerated: true, source: 'AI' },
    };
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname;
      const ok = data => route.fulfill({ json: { success: true, data } });
      if (path.includes('check-subdomain')) return ok(true);
      if (path.endsWith('/tenant/auth/me')) return ok({ id: 1, role: 'RECRUITER', workspace: 'RECRUITER', fullName: 'Bank Tester', permissions: ['ASSESSMENTS'] });
      if (path.endsWith('/list_questions')) return ok({ items: [], total: 0, page: 0, size: 10, skills: [], counts: { all: 0, favorites: 0, ready: 0, pending: 0, archived: 0 } });
      if (path.endsWith('/question-bank/generate_drafts')) {
        draftRequests++;
        assert.equal(route.request().headers()['x-tenant-id'], 'acme');
        assert.equal(route.request().postDataJSON().skill, 'Java');
        if (failed) {
          return route.fulfill({
            status: 503,
            json: { success: false, message: 'Model temporarily unavailable', code: 'QUESTION_GEN_UNAVAILABLE' },
          });
        }
        return ok([draft]);
      }
      if (path.endsWith('/question-bank/create_questions')) {
        createRequests++;
        return route.fulfill({ status: 201, json: { success: true, data: [{ question: { id: 99, ...draft.question }, archived: false, authoringMetadata: draft.authoringMetadata }] } });
      }
      return ok([]);
    });
    const url = process.env.ASSESSMENT_UI_URL || 'http://acme.localhost:5196';
    await page.goto(url + '/recruiter/question-bank');
    await page.getByRole('button', { name: /Sinh bằng AI/ }).click();
    await page.getByRole('heading', { name: 'Sinh câu hỏi bằng AI' }).waitFor();
    await page.locator('select').first().selectOption({ label: 'Java' });
    await page.getByRole('button', { name: 'Sinh nháp', exact: true }).click();
    await page.getByDisplayValue('Which collection preserves insertion order in Java?').waitFor();
    await fs.mkdir('test-results/bank-ai-generation', { recursive: true });
    await page.screenshot({ path: 'test-results/bank-ai-generation/desktop.png', fullPage: true });
    await page.getByRole('button', { name: /Lưu 1 câu vào ngân hàng/ }).click();
    await page.getByText('Đã lưu 1 câu vào ngân hàng.', { exact: true }).waitFor();
    assert.equal(draftRequests, 1);
    assert.equal(createRequests, 1);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('smarthire:general-bank-draft:acme:1')), 'manual-draft-marker');
    failed = true;
    await page.goto(url + '/recruiter/question-bank');
    await page.getByRole('button', { name: /Sinh bằng AI/ }).click();
    await page.locator('select').first().selectOption({ label: 'Java' });
    await page.getByRole('button', { name: 'Sinh nháp', exact: true }).click();
    await page.getByText(/Model temporarily unavailable|QUESTION_GEN_UNAVAILABLE|AI question generation unavailable/i).waitFor();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: 'test-results/bank-ai-generation/mobile.png', fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log('PASS: Sinh bằng AI draft preview, save, tenant header, manual draft preservation, failure state, mobile layout');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exit(1); });
