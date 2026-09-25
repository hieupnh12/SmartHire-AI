export type ViewId = "all" | "schema";

export type QuestionKind = "TRAC_NGHIEM_DON" | "NHIEU_DAP_AN" | "TU_LUAN_CODE" | "TINH_HUONG_SYSTEM";

export type QuestionTypeOption = {
  value: QuestionKind;
  label: string;
  shortLabel: string;
  group: "single" | "multi" | "subjective";
};

export type DifficultyTone = "easy" | "medium" | "hard";

export type BankQuestion = {
  id: string;
  kind: QuestionKind;
  content: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: string;
  score: string;
  difficulty: string;
  difficultyTone: DifficultyTone;
  skill: string;
  explanation: string;
  policy: "Partial Credit" | "Strict Match" | "";
  policyNote: string;
  snippet: string;
  language: string;
  rubric: { level: "excellent" | "pass" | "fail"; text: string }[];
  sample: string;
  timeLimit: string;
  warning?: string;
};

export type DictionaryRow = {
  excelCol: string;
  field: string;
  status: string;
  statusTone: "optional" | "required" | "partial" | "recommended" | "default";
  dataType: string;
  validValues: string;
  rule: string;
  exampleOk: string;
  exampleBad: string;
};

export const QUESTION_TYPE_OPTIONS: QuestionTypeOption[] = [
  { value: "TRAC_NGHIEM_DON", label: "Trắc nghiệm đơn", shortLabel: "ĐƠN", group: "single" },
  { value: "NHIEU_DAP_AN", label: "Nhiều đáp án", shortLabel: "NHIỀU", group: "multi" },
  { value: "TU_LUAN_CODE", label: "Tự luận code", shortLabel: "CODE", group: "subjective" },
  { value: "TINH_HUONG_SYSTEM", label: "Tình huống hệ thống", shortLabel: "SYSTEM", group: "subjective" },
];

export const DEFAULT_RUBRIC: BankQuestion["rubric"] = [
  { level: "excellent", text: "[Xuất sắc 9-10đ]: " },
  { level: "pass", text: "[Đạt 6-8đ]: " },
  { level: "fail", text: "[Chưa đạt 0-5đ]: " },
];

export function blankQuestion(kind: QuestionKind = "TRAC_NGHIEM_DON"): BankQuestion {
  return {
    id: "",
    kind,
    content: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    answer: "",
    score: kind.startsWith("TU_") || kind.startsWith("TINH_") ? "10.0" : "1.0",
    difficulty: "",
    difficultyTone: "medium",
    skill: "",
    explanation: "",
    policy: kind === "NHIEU_DAP_AN" ? "Partial Credit" : "",
    policyNote: "",
    snippet: kind === "TU_LUAN_CODE" ? "// TODO: starter code\n" : "",
    language: kind === "TU_LUAN_CODE" ? "Java" : kind === "TINH_HUONG_SYSTEM" ? "System Design" : "",
    rubric: DEFAULT_RUBRIC.map((item) => ({ ...item })),
    sample: "",
    timeLimit: kind.startsWith("TU_") || kind.startsWith("TINH_") ? "15 phút" : "",
  };
}

export function isChoiceKind(kind: QuestionKind) {
  return kind === "TRAC_NGHIEM_DON" || kind === "NHIEU_DAP_AN";
}

export function isSubjectiveKind(kind: QuestionKind) {
  return kind === "TU_LUAN_CODE" || kind === "TINH_HUONG_SYSTEM";
}

export function typeMeta(kind: QuestionKind) {
  return QUESTION_TYPE_OPTIONS.find((item) => item.value === kind) ?? QUESTION_TYPE_OPTIONS[0];
}

export const BANK_QUESTIONS: BankQuestion[] = [
  {
    id: "Q001",
    kind: "TRAC_NGHIEM_DON",
    content: "Trong Spring Boot, annotation nào được sử dụng để bắt và xử lý exception toàn cục (Global Exception Handler)?",
    optionA: "@ControllerAdvice",
    optionB: "@Component",
    optionC: "@ExceptionHandler",
    optionD: "@Service",
    answer: "A",
    score: "1.0",
    difficulty: "Trung bình",
    difficultyTone: "medium",
    skill: "Spring Boot",
    explanation: "@ControllerAdvice cho phép tập trung xử lý ngoại lệ cho toàn bộ ứng dụng thông qua các phương thức @ExceptionHandler.",
    policy: "",
    policyNote: "",
    snippet: "",
    language: "",
    rubric: DEFAULT_RUBRIC.map((item) => ({ ...item })),
    sample: "",
    timeLimit: "",
  },
  {
    id: "Q002",
    kind: "TRAC_NGHIEM_DON",
    content: "Độ phức tạp thời gian trung bình (Average Time Complexity) của thuật toán QuickSort là gì?",
    optionA: "O(n)",
    optionB: "O(n log n)",
    optionC: "O(n^2)",
    optionD: "O(log n)",
    answer: "B",
    score: "1.0",
    difficulty: "Dễ",
    difficultyTone: "easy",
    skill: "Algorithms",
    explanation: "QuickSort chia đôi mảng dựa trên pivot, cho thời gian trung bình O(n log n), xấu nhất O(n^2).",
    policy: "",
    policyNote: "",
    snippet: "",
    language: "",
    rubric: DEFAULT_RUBRIC.map((item) => ({ ...item })),
    sample: "",
    timeLimit: "",
  },
  {
    id: "Q003",
    kind: "TRAC_NGHIEM_DON",
    content: "Trong kiến trúc Microservices, Pattern nào sau đây được dùng để điều phối luồng phân tán (Distributed Transactions)?",
    optionA: "Saga Pattern",
    optionB: "Circuit Breaker",
    optionC: "API Gateway",
    optionD: "Service Discovery",
    answer: "A",
    score: "2.0",
    difficulty: "Khó",
    difficultyTone: "hard",
    skill: "Microservices",
    explanation: "Saga Pattern quản lý chuỗi các local transactions liên dịch vụ để duy trì tính nhất quán dữ liệu mà không cần 2PC locking.",
    policy: "",
    policyNote: "",
    snippet: "",
    language: "",
    rubric: DEFAULT_RUBRIC.map((item) => ({ ...item })),
    sample: "",
    timeLimit: "",
  },
  {
    id: "Q004",
    kind: "TRAC_NGHIEM_DON",
    content: "Từ khóa 'volatile' trong Java ngăn chặn hiện tượng nào giữa các Thread?",
    optionA: "Deadlock",
    optionB: "Instruction Reordering & Cache Coherence",
    optionC: "Memory Overflow",
    optionD: "Race Condition hoàn toàn",
    answer: "B",
    score: "1.5",
    difficulty: "Khó",
    difficultyTone: "hard",
    skill: "Concurrency",
    explanation: "",
    policy: "",
    policyNote: "",
    snippet: "",
    language: "",
    rubric: DEFAULT_RUBRIC.map((item) => ({ ...item })),
    sample: "",
    timeLimit: "",
    warning: "Cảnh báo: Thiếu giải thích đáp án (AI Rubric)",
  },
  {
    id: "Q005",
    kind: "TRAC_NGHIEM_DON",
    content: "Isolation Level nào sau đây trong SQL ngăn chặn triệt để hiện tượng Phantom Read?",
    optionA: "Read Committed",
    optionB: "Read Uncommitted",
    optionC: "Repeatable Read",
    optionD: "Serializable",
    answer: "D",
    score: "1.5",
    difficulty: "Khó",
    difficultyTone: "hard",
    skill: "SQL Database",
    explanation: "Serializable khóa toàn bộ dải khóa (Range-locks) đảm bảo giao dịch tuần tự tuyệt đối.",
    policy: "",
    policyNote: "",
    snippet: "",
    language: "",
    rubric: DEFAULT_RUBRIC.map((item) => ({ ...item })),
    sample: "",
    timeLimit: "",
  },
  {
    id: "Q006",
    kind: "TRAC_NGHIEM_DON",
    content: "Mục đích chính của mã phản hồi HTTP Status Code 429 là gì?",
    optionA: "Bad Request",
    optionB: "Too Many Requests",
    optionC: "Unauthorized Token",
    optionD: "Gateway Timeout",
    answer: "B",
    score: "0.5",
    difficulty: "Dễ",
    difficultyTone: "easy",
    skill: "REST API",
    explanation: "429 Too Many Requests chỉ báo người dùng đã gửi quá nhiều yêu cầu trong một khoảng thời gian (Rate Limiting).",
    policy: "",
    policyNote: "",
    snippet: "",
    language: "",
    rubric: DEFAULT_RUBRIC.map((item) => ({ ...item })),
    sample: "",
    timeLimit: "",
  },
  {
    id: "MC001",
    kind: "NHIEU_DAP_AN",
    content: "Những annotation nào sau đây là Spring Stereotype Annotations chính quy?",
    optionA: "@Component",
    optionB: "@Autowired",
    optionC: "@Service",
    optionD: "@Repository",
    answer: "A,C,D",
    score: "2.0",
    difficulty: "Trung bình",
    difficultyTone: "medium",
    skill: "Spring Core",
    explanation: "",
    policy: "Partial Credit",
    policyNote: "Đúng 2/3: 60% điểm, chọn sai trừ 30%",
    snippet: "",
    language: "",
    rubric: DEFAULT_RUBRIC.map((item) => ({ ...item })),
    sample: "",
    timeLimit: "",
  },
  {
    id: "MC002",
    kind: "NHIEU_DAP_AN",
    content: "Những đặc tính bắt buộc theo chuẩn thiết kế Cloud-Native 12-Factor App là gì?",
    optionA: "Stateless Processes",
    optionB: "Config in Environment",
    optionC: "Direct Local Storage",
    optionD: "Hardcoded IP",
    answer: "A,B",
    score: "1.5",
    difficulty: "Khó",
    difficultyTone: "hard",
    skill: "DevOps & Cloud",
    explanation: "",
    policy: "Strict Match",
    policyNote: "Phải đúng cả 2 đáp án A, B",
    snippet: "",
    language: "",
    rubric: DEFAULT_RUBRIC.map((item) => ({ ...item })),
    sample: "",
    timeLimit: "",
  },
  {
    id: "MC003",
    kind: "NHIEU_DAP_AN",
    content: "Những giải pháp nào hỗ trợ giảm tải và tối ưu hóa câu truy vấn SQL đọc chậm?",
    optionA: "Dùng SELECT * thường xuyên",
    optionB: "Tạo B-Tree Composite Index",
    optionC: "Phân vùng bảng (Partitioning)",
    optionD: "Bỏ qua câu lệnh EXPLAIN",
    answer: "B,C",
    score: "2.0",
    difficulty: "Trung bình",
    difficultyTone: "medium",
    skill: "SQL Tuning",
    explanation: "",
    policy: "Partial Credit",
    policyNote: "Đúng 1/2 được 50%, chọn A/D trừ 50%",
    snippet: "",
    language: "",
    rubric: DEFAULT_RUBRIC.map((item) => ({ ...item })),
    sample: "",
    timeLimit: "",
  },
  {
    id: "MC004",
    kind: "NHIEU_DAP_AN",
    content: "Những lỗ hổng bảo mật phổ biến nhất nằm trong OWASP Top 10 Web Application?",
    optionA: "Broken Access Control",
    optionB: "Cryptographic Failures",
    optionC: "Injection (SQLi/XSS)",
    optionD: "CSS Box Model Error",
    answer: "A,B,C",
    score: "2.5",
    difficulty: "Khó",
    difficultyTone: "hard",
    skill: "Web Security",
    explanation: "",
    policy: "Partial Credit",
    policyNote: "Đúng 2/3: 66%, chọn D: 0đ toàn câu",
    snippet: "",
    language: "",
    rubric: DEFAULT_RUBRIC.map((item) => ({ ...item })),
    sample: "",
    timeLimit: "",
  },
  {
    id: "SUB01",
    kind: "TU_LUAN_CODE",
    content: "Refactor đoạn mã Java xử lý NullPointer và tối ưu Stream:",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    answer: "",
    score: "10.0",
    difficulty: "Khó",
    difficultyTone: "hard",
    skill: "Java Core CleanCode",
    explanation: "",
    policy: "",
    policyNote: "",
    language: "Java",
    snippet:
      "public String getCity(User user) {\n  if (user != null) {\n    Address address = user.getAddress();\n    if (address != null) {\n      return address.getCity();\n    }\n  }\n  return \"N/A\";\n}",
    rubric: [
      { level: "excellent", text: "[Xuất sắc 9-10đ]: Dùng Optional chuẩn, xử lý edge case, viết Unit Test" },
      { level: "pass", text: "[Đạt 6-8đ]: Dùng if-null truyền thống, logic chạy đúng" },
      { level: "fail", text: "[Chưa đạt 0-5đ]: Bỏ sót null hoặc cú pháp compile lỗi" },
    ],
    sample: "Sử dụng Optional chaining kết hợp filter predicate, tách private method chuyên biệt cho transform dữ liệu.",
    timeLimit: "15 phút",
  },
  {
    id: "SUB02",
    kind: "TINH_HUONG_SYSTEM",
    content: "Thiết kế hệ thống chịu tải Flash Sale (100.000 QPS tại thời điểm mở bán):",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    answer: "",
    score: "10.0",
    difficulty: "Khó",
    difficultyTone: "hard",
    skill: "System Design",
    explanation: "",
    policy: "",
    policyNote: "",
    language: "System Design",
    snippet: "Yêu cầu:\n- Chống overselling kho hàng\n- Tránh nghẽn DB khi mở bán\n- Đảm bảo thanh toán bất đồng bộ an toàn",
    rubric: [
      { level: "excellent", text: "[Xuất sắc 9-10đ]: Redis Lua script Atomic decr, RabbitMQ queue buffering" },
      { level: "pass", text: "[Đạt 6-8đ]: Có Redis cache nhưng thiếu cơ chế chống Race condition" },
      { level: "fail", text: "[Chưa đạt 0-5đ]: Trực tiếp ghi DB dẫn tới Connection Pool Exhaustion" },
    ],
    sample: "Kiến trúc Hybrid: Redis Cluster lưu tồn kho thực tế, Lua Script để atomic check-and-decrement, đẩy đơn vào Kafka/RabbitMQ async worker xử lý thanh toán.",
    timeLimit: "25 phút",
  },
  {
    id: "SUB03",
    kind: "TU_LUAN_CODE",
    content: "Viết hàm xử lý Retry với Exponential Backoff và Jitter:",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    answer: "",
    score: "10.0",
    difficulty: "Khó",
    difficultyTone: "hard",
    skill: "Fault Tolerance",
    explanation: "",
    policy: "",
    policyNote: "",
    language: "Java",
    snippet:
      "public <T> T executeWithRetry(Supplier<T> task, int maxRetries) {\n  // TODO: implement exponential backoff + jitter\n  throw new UnsupportedOperationException(\"not implemented\");\n}",
    rubric: [
      { level: "excellent", text: "[Xuất sắc 9-10đ]: Có Full Jitter ngẫu nhiên, ngắt Circuit Breaker khi lỗi 5xx" },
      { level: "pass", text: "[Đạt 6-8đ]: Có sleep nhân đôi thời gian nhưng thiếu jitter phân tán tải" },
      { level: "fail", text: "[Chưa đạt 0-5đ]: Retry vòng lặp vô hạn hoặc block thread chính" },
    ],
    sample: "Công thức: Sleep = min(cap, base * 2^attempt) + random_jitter. Xử lý InterruptedException đúng chuẩn.",
    timeLimit: "20 phút",
  },
];

export const DICTIONARY_ROWS: DictionaryRow[] = [
  {
    excelCol: "A",
    field: "question_id",
    status: "Tùy chọn",
    statusTone: "optional",
    dataType: "String (ID)",
    validValues: "^[A-Z0-9_-]{3,20}$",
    rule: "Mã định danh câu hỏi duy nhất. Nếu để trống hệ thống tự sinh UUID.",
    exampleOk: "Q001",
    exampleBad: "Q 001 (chứa dấu cách)",
  },
  {
    excelCol: "B",
    field: "question_type",
    status: "Bắt buộc (*)",
    statusTone: "required",
    dataType: "Enum (Type)",
    validValues: "TRAC_NGHIEM_DON | NHIEU_DAP_AN | TU_LUAN_CODE | TINH_HUONG_SYSTEM",
    rule: "Chọn loại câu hỏi — form Excel của dòng đó đổi theo loại đã chọn.",
    exampleOk: "TRAC_NGHIEM_DON",
    exampleBad: "TracNghiem (Sai enum)",
  },
  {
    excelCol: "C",
    field: "question_content",
    status: "Bắt buộc (*)",
    statusTone: "required",
    dataType: "Text / Markdown",
    validValues: "Độ dài: 10 - 5.000 ký tự",
    rule: "Nội dung câu hỏi, hỗ trợ cú pháp Markdown, code blocks và chèn ảnh ![Alt](url).",
    exampleOk: "Cú pháp chuẩn",
    exampleBad: "Quá ngắn (<10 ký tự)",
  },
  {
    excelCol: "D - G",
    field: "option_a ... option_d",
    status: "A,B Bắt buộc",
    statusTone: "partial",
    dataType: "String",
    validValues: "Tối đa 1.000 ký tự / phương án",
    rule: "Chỉ dùng cho trắc nghiệm đơn & nhiều đáp án. Tự luận dùng starter code / yêu cầu kỹ thuật.",
    exampleOk: "Điền đủ A,B",
    exampleBad: "Bỏ trống option_a",
  },
  {
    excelCol: "H",
    field: "correct_answer / rubric",
    status: "Bắt buộc (*)",
    statusTone: "required",
    dataType: "Key / Rubric",
    validValues: "^[A-D](,[A-D])*$ hoặc Rubric 3 mức",
    rule: "Đơn: 'A'. Nhiều: 'A,C'. Tự luận: tiêu chí Rubric 3 mức cho AI chấm.",
    exampleOk: "A,C",
    exampleBad: "A, C (có khoảng trắng)",
  },
  {
    excelCol: "I",
    field: "score_weight",
    status: "Mặc định 1.0",
    statusTone: "default",
    dataType: "Float > 0",
    validValues: "0.1 <= score <= 100.0",
    rule: "Trọng số điểm của câu hỏi trong bài test. Mặc định là 1.0 điểm nếu để trống.",
    exampleOk: "1.5",
    exampleBad: "-1 (điểm âm)",
  },
  {
    excelCol: "L",
    field: "explanation_rubric",
    status: "Khuyến nghị",
    statusTone: "recommended",
    dataType: "Text / Rubric",
    validValues: "Tối đa 3.000 ký tự",
    rule: "Giải thích chi tiết đáp án hoặc tiêu chí chấm Rubric cho AI Auditor tự động phân loại.",
    exampleOk: "Tiêu chí 3 mức",
    exampleBad: "Để trống: Cảnh báo",
  },
];
