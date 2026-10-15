const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.addInitScript(() => localStorage.setItem('accessToken', 'authoring-fixture'));
    const bank = [];
    let paper = null;
    let questions = [];
    let verified = false;
    const counts = { all: 0, favorites: 0, ready: 0, pending: 0, archived: 0 };
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
      const method = route.request().method();
      const body = route.request().postData() ? route.request().postDataJSON() : null;
      const ok = data => route.fulfill({ json: { success: true, data } });
      if (path.includes('check-subdomain')) return ok(true);
      if (path === '/tenant/auth/me') return ok({ id: 1, fullName: 'Authoring Tester', role: 'RECRUITER', workspace: 'RECRUITER', permissions: ['ASSESSMENTS'] });
      if (path === '/jobs/1') return ok({ id: 1, title: 'Java Developer', status: 'PUBLISHED', skills: [{ skillId: 1, name: 'Java' }] });
      if (path.endsWith('/configuration')) return ok(null);
      if (path.endsWith('/create_questions')) {
        for (const row of body.questions) bank.push({ ...row, question: { ...row.question, id: bank.length + 1 }, archived: false, testId: null });
        return ok(bank);
      }
      if (path.endsWith('/list_questions') && path.startsWith('/question-bank')) {
        const type = new URL(route.request().url()).searchParams.get('questionType');
        const items = bank.filter(row => !type || (type === 'QUIZ' ? ['MCQ', 'MULTIPLE_CHOICE'].includes(row.question.questionType) : row.question.questionType === type));
        return ok({ items, total: items.length, page: 0, size: 10, counts, skills: ['Java'] });
      }
      if (path.startsWith('/question-bank/get_question/')) return ok(bank.find(row => row.question.id === Number(path.split('/').pop())));
      if (path.startsWith('/question-bank/update_question/')) {
        const row = bank.find(row => row.question.id === Number(path.split('/').pop()));
        row.question = { ...body.question, id: row.question.id }; return ok(row);
      }
      if (path.endsWith('/verify_coding')) {
        assert.equal(body.language, 'java');
        assert.deepEqual(body.coding.testCases.map(test => test.weight), [0, 50, 50]);
        verified = true; return ok(body.coding.testCases.map(() => ({ status: { id: 3, description: 'Accepted' } })));
      }
      if (path.endsWith('/create_draft_test')) { paper = { ...body, id: 20, status: 'DRAFT' }; return ok(paper); }
      if (path.endsWith('/get_test_metadata/20')) return ok(paper);
      if (path === '/assessments/20/list_questions') return ok(questions);
      if (path === '/assessments/20/create_question') { const question = { ...body, id: questions.length + 101 }; questions.push(question); return ok(question); }
      if (path.endsWith('/reorder_questions')) { questions = body.map((id, index) => ({ ...questions.find(question => question.id === id), questionOrder: index })); return ok(null); }
      if (path.endsWith('/publish_test')) { paper.status = 'PUBLISHED'; return ok(paper); }
      return ok([]);
    });
    const base = process.env.ASSESSMENT_UI_URL || 'http://acme.localhost:5183';
    await page.goto(`${base}/recruiter/question-bank/new?type=ESSAY`);
    await page.getByLabel('Đề bài / tình huống').fill('Phân tích ưu và nhược điểm của việc dùng cache trong hệ thống.');
    await page.getByLabel('Kỹ năng', { exact: true }).fill('Java');
    await page.getByLabel('Đáp án mẫu tham khảo').fill('Cache giảm latency nhưng cần giải quyết tính nhất quán và invalidation.');
    await page.getByLabel('Số từ tối thiểu gợi ý').fill('50');
    await page.getByLabel('Trọng số (%)', { exact: true }).first().fill('39');
    assert.equal(await page.getByRole('button', { name: 'Lưu câu hỏi tự luận' }).isDisabled(), true);
    await page.getByLabel('Trọng số (%)', { exact: true }).first().fill('40');
    await page.getByRole('button', { name: 'Lưu câu hỏi tự luận' }).click();
    await page.waitForURL('**/recruiter/question-bank*');
    assert.equal(bank[0].question.rubricJson.minWords, 50);
    assert.equal(bank[0].question.rubricJson.criteria.length, 3);
    await page.getByRole('button', { name: 'Tự luận lý thuyết', exact: true }).click();
    await page.getByText('Có Rubric', { exact: true }).first().waitFor();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.getByText('+ Thêm câu hỏi mới', { exact: true }).click();
    const menu = await page.locator('details[open] > div').boundingBox();
    assert.ok(menu.x >= 0 && menu.x + menu.width <= 375, 'New question menu must fit the mobile viewport');
    await page.getByText('+ Thêm câu hỏi mới', { exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${base}/recruiter/question-bank/1/edit`);
    assert.equal(await page.getByLabel('Số từ tối thiểu gợi ý').inputValue(), '50');
    await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    await page.goto(`${base}/recruiter/question-bank/new?type=MCQ`);
    await page.getByLabel('Nội dung câu hỏi').fill('Which keyword defines a Java class?');
    await page.getByLabel('Kỹ năng', { exact: true }).fill('Java');
    await page.getByLabel('Độ khó').selectOption('Easy');
    await page.getByLabel('Lựa chọn 1', { exact: true }).fill('class');
    await page.getByLabel('Lựa chọn 2', { exact: true }).fill('def');
    await page.getByRole('button', { name: 'Lưu câu hỏi', exact: true }).click();
    await page.waitForURL('**/recruiter/question-bank*');
    assert.equal(bank[1].question.questionType, 'MCQ');
    assert.equal(bank[1].question.options.filter(option => option.correct).length, 1);
    await page.goto(`${base}/recruiter/question-bank/new?type=CODING`);
    await page.getByLabel('Tên bài toán').fill('Double input');
    await page.getByLabel('Mô tả Markdown').fill('Read an integer from standard input and output twice its value.');
    await page.getByLabel('Kỹ năng', { exact: true }).fill('Java');
    await page.getByRole('button', { name: 'Code mẫu', exact: true }).click();
    await page.getByLabel('Starter code').fill('class Main {}');
    await page.getByRole('button', { name: 'Test cases', exact: true }).click();
    for (let index = 0; index < 3; index++) {
      await page.getByLabel('Input', { exact: true }).nth(index).fill(String(index + 1));
      await page.getByLabel('Expected output', { exact: true }).nth(index).fill(String((index + 1) * 2));
    }
    await page.getByLabel('Model solution').fill('class Main { public static void main(String[] args) {} }');
    await page.getByRole('button', { name: 'Chạy kiểm tra test cases' }).click();
    await page.getByText('Test 1: Accepted').waitFor();
    assert.equal(verified, true);
    await page.setViewportSize({ width: 375, height: 812 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await fs.mkdir('test-results/assessment-authoring', { recursive: true });
    await page.screenshot({ path: 'test-results/assessment-authoring/coding-mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'Lưu bài tập lập trình' }).click();
    await page.waitForURL('**/recruiter/question-bank*');
    assert.equal(bank[2].question.coding.title, 'Double input');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${base}/recruiter/jobs/1/assessments/draft`);
    await page.getByLabel('Tên đề', { exact: true }).fill('Mixed technical paper');
    await page.getByRole('button', { name: 'Tạo đề nháp' }).click();
    await page.waitForURL('**/assessments/20');
    await page.getByRole('button', { name: 'Thêm từ ngân hàng trắc nghiệm', exact: true }).click();
    await page.getByRole('button', { name: 'Thêm', exact: true }).click();
    await page.getByRole('button', { name: 'Thêm từ ngân hàng tự luận', exact: true }).click();
    await page.getByRole('button', { name: 'Thêm', exact: true }).click();
    await page.getByRole('button', { name: 'Thêm từ ngân hàng Code', exact: true }).click();
    await page.getByRole('button', { name: 'Thêm', exact: true }).click();
    assert.equal(questions.length, 3);
    await page.getByRole('button', { name: 'Đưa câu 2 lên' }).click();
    await page.getByRole('button', { name: 'Xuất bản', exact: true }).waitFor();
    await page.waitForFunction(() => !document.querySelector('button[aria-label="Đưa câu 2 lên"]')?.disabled);
    assert.equal(questions[0].questionType, 'MCQ');
    assert.equal(questions[1].questionType, 'CODING');
    await page.screenshot({ path: 'test-results/assessment-authoring/sections-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 375, height: 812 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: 'test-results/assessment-authoring/sections-mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'Xuất bản', exact: true }).click();
    await page.getByText('Đề đã được xuất bản.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Đưa câu 2 lên' }).count(), 0);
    assert.deepEqual(errors, []);
    console.log('Recruiter authoring passed: rubric validation, edit round trip, coding verification, mobile layout, bank copying, section reorder and publish lock.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
