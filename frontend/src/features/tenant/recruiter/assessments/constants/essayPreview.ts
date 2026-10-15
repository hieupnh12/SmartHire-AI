import type { Question } from "@/api/types/assessment";

export const essayPreviewBank: Question[] = [
  { id: 9101, questionText: "Dependency Injection trong Spring giúp giải quyết vấn đề gì?", questionType: "MCQ", points: 10, questionOrder: 0, difficulty: "Easy", skill: "Spring Boot", explanation: null,
    options: [{ id: 1, optionText: "Giảm phụ thuộc trực tiếp và hỗ trợ kiểm thử", correct: true }, { id: 2, optionText: "Thay thế hoàn toàn database", correct: false }] },
  { id: 9102, questionText: "Giải thích sự khác nhau giữa authentication và authorization. Minh họa bằng API xem hồ sơ ứng viên trong hệ thống tuyển dụng multi-tenant.", questionType: "ESSAY", points: 20, questionOrder: 1, difficulty: "Medium", skill: "Spring Security", explanation: null, options: [],
    rubricJson: { category: "ESSAY_CONCEPTUAL", referenceAnswer: "Authentication xác minh danh tính (ví dụ JWT). Authorization kiểm tra quyền thực hiện hành động. API xem hồ sơ phải kiểm tra role/quyền trên job và tenant của request; đăng nhập thành công không đồng nghĩa được xem mọi hồ sơ. Truy vấn phải chạy trong đúng database tenant.", criteria: [{ description: "Phân biệt đúng xác thực và phân quyền", weight: 40 }, { description: "Ví dụ API có kiểm tra quyền trên job", weight: 30 }, { description: "Giải thích cách ly dữ liệu tenant", weight: 30 }] } },
  { id: 9103, questionText: "Thiết kế luồng gửi email mời assessment bất đồng bộ. Làm thế nào tránh gửi trùng khi worker retry?", questionType: "ESSAY", points: 30, questionOrder: 2, difficulty: "Hard", skill: "RabbitMQ", explanation: null, options: [],
    rubricJson: { category: "ESSAY_SCENARIO", referenceAnswer: "Ghi ý định gửi vào outbox trong transaction, worker nhận message có tenant ID, thiết lập và xóa TenantContext. Dùng idempotency key theo lời mời và trạng thái gửi; retry có giới hạn/backoff và xử lý lỗi. Cần cân nhắc trường hợp nhà cung cấp đã gửi nhưng chưa ghi nhận kết quả.", criteria: [{ description: "Luồng transaction, outbox và queue hợp lý", weight: 40 }, { description: "Idempotency và xử lý retry", weight: 40 }, { description: "Truyền và dọn TenantContext", weight: 20 }] } },
];

export const codingPreviewQuestion: Question = {
  id: 9104, questionText: "Viết hàm uniqueEmails(emails) bằng JavaScript: loại khoảng trắng đầu/cuối, chuyển email thành chữ thường, bỏ chuỗi rỗng và loại email trùng. Giữ thứ tự xuất hiện đầu tiên. Input là mảng chuỗi JSON; output là mảng email JSON.",
  questionType: "CODING", points: 40, questionOrder: 3, difficulty: "Medium", skill: "JavaScript", explanation: null, options: [],
  coding: { category: "CODING_ALGORITHM", timeLimitMs: 2000, memoryMb: 128,
    starterCode: { javascript: "function uniqueEmails(emails) {\n  // Normalize and deduplicate emails.\n  return [];\n}" },
    harness: { javascript: "{{SOURCE}}\nconst fs = require('fs');\nconst emails = JSON.parse(fs.readFileSync(0, 'utf8'));\nconsole.log(JSON.stringify(uniqueEmails(emails)));" },
    testCases: [
      { input: '[" A@EXAMPLE.COM ","a@example.com","b@example.com"]', expectedOutput: '["a@example.com","b@example.com"]', sample: true },
      { input: '[" ","B@EXAMPLE.COM"," b@example.com ",""]', expectedOutput: '["b@example.com"]', sample: true },
      { input: '[]', expectedOutput: '[]', sample: false },
      { input: '["x@example.com","Y@example.com"," X@example.com "]', expectedOutput: '["x@example.com","y@example.com"]', sample: false },
      { input: '["","  "," Z@example.com ","z@example.com"]', expectedOutput: '["z@example.com"]', sample: false },
    ] },
};
essayPreviewBank.push(codingPreviewQuestion);

export const codingPreviewAnswer = "function uniqueEmails(emails) {\n  const normalized = emails.map(email => email.trim().toLowerCase());\n  return [...new Set(normalized.filter(email => email.length > 0))];\n}";

export const essayPreviewAnswer = "Authentication là xác minh người dùng là ai, ví dụ kiểm tra JWT khi đăng nhập. Authorization là kiểm tra người đó có được thực hiện hành động hay không.\n\nVới API xem hồ sơ ứng viên, recruiter cần đăng nhập và có quyền xem hồ sơ của job mình phụ trách. Candidate chỉ được xem hồ sơ của mình. Ngoài kiểm tra role, hệ thống cần lấy tenant từ request và truy vấn trong database tương ứng, tránh recruiter công ty A xem hồ sơ công ty B.";

// Fixed illustrative feedback; this preview never calls an AI provider.
export const essayPreviewFeedback = [
  { percent: 95, feedback: "Phân biệt đúng hai khái niệm và có ví dụ JWT." },
  { percent: 85, feedback: "Có kiểm tra quyền trên job; cần mô tả rõ xử lý từ chối truy cập." },
  { percent: 90, feedback: "Đề cập database tenant; có thể bổ sung cách xác minh tenant của người dùng." },
];
