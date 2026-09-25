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

export const DICTIONARY_ROWS: DictionaryRow[] = [
  {
    excelCol: "A",
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
    excelCol: "—",
    field: "question_id",
    status: "Tự động",
    statusTone: "default",
    dataType: "String (ID)",
    validValues: "Q001, Q002, …",
    rule: "Không hiển thị trên form tạo đề. Hệ thống tự gán theo thứ tự dòng (Q001…). Khi lưu API dùng id backend.",
    exampleOk: "Q001",
    exampleBad: "Không nhập tay trên UI",
  },
  {
    excelCol: "C - F",
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
    excelCol: "G",
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
    excelCol: "H",
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
    excelCol: "K",
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
