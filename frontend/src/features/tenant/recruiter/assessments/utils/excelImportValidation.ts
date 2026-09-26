import {
  isSubjectiveKind,
  type BankQuestion,
  type QuestionKind,
} from "../constants/excelTemplateMock";

export type ImportStatus = "VALID" | "INVALID" | "WARNING";

export type FieldIssue = {
  field: string;
  message: string;
  level: "error" | "warning";
};

export type ImportRow = {
  row: BankQuestion;
  line: number;
  /** Formatted as `field: message` for display / CSV. */
  errors: string[];
  warnings: string[];
  issues: FieldIssue[];
  status: ImportStatus;
  /** @deprecated Kept for callers; always false — all known types are validated. */
  unsupported: boolean;
  /** Completely empty sheet row — ignored when saving to the database. */
  skipped: boolean;
};

const ALLOWED_KINDS: QuestionKind[] = [
  "TRAC_NGHIEM_DON",
  "NHIEU_DAP_AN",
  "TU_LUAN_CODE",
  "TINH_HUONG_SYSTEM",
];

const DIFFICULTY_VALUES = new Set(["easy", "medium", "hard"]);

/** True when the row has no meaningful authoring input. */
export function isBlankQuestion(row: BankQuestion): boolean {
  return (
    !row.content.trim() &&
    !row.difficulty.trim() &&
    !row.skill.trim() &&
    !row.optionA.trim() &&
    !row.optionB.trim() &&
    !row.optionC.trim() &&
    !row.optionD.trim() &&
    !row.answer.trim() &&
    !row.explanation.trim() &&
    !row.policyNote.trim() &&
    !row.snippet.trim() &&
    !row.sample.trim()
  );
}

/** Rows that may be persisted — content + type-specific answer; difficulty/skill optional. */
export function isPersistableQuestion(row: BankQuestion): boolean {
  if (!row.content.trim()) return false;
  if (row.kind === "TRAC_NGHIEM_DON" || row.kind === "NHIEU_DAP_AN") {
    return Boolean(row.optionA.trim() && row.optionB.trim() && row.answer.trim());
  }
  if (isSubjectiveKind(row.kind)) {
    return true;
  }
  return false;
}

/** Soft check for audit step: content + answer shape; does not require difficulty/skill/all types. */
export function hasMinimalContentAndAnswer(row: BankQuestion): boolean {
  return isPersistableQuestion(row);
}

function pushIssue(issues: FieldIssue[], field: string, message: string, level: "error" | "warning" = "error") {
  issues.push({ field, message, level });
}

function isAllowedDifficulty(raw: string): boolean {
  return DIFFICULTY_VALUES.has(raw.trim().toLowerCase());
}

function parseScore(raw: string, defaultScore: number): { value: number; empty: boolean } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: defaultScore, empty: true };
  return { value: Number(trimmed), empty: false };
}

function validateChoiceOptions(row: BankQuestion, issues: FieldIssue[]) {
  const options = [row.optionA, row.optionB, row.optionC, row.optionD].map((option) => option.trim());
  const filledCount = options.filter(Boolean).length;

  if (filledCount < 2) {
    pushIssue(issues, "options", "Cần ít nhất hai lựa chọn trả lời (option_a, option_b, …).");
  }
  if (!options[0]) pushIssue(issues, "option_a", "Không được để trống.");
  if (!options[1]) pushIssue(issues, "option_b", "Không được để trống.");

  return options;
}

function validateSingleAnswer(row: BankQuestion, options: string[], issues: FieldIssue[]) {
  const answer = row.answer.trim().toUpperCase();
  if (!answer) {
    pushIssue(issues, "answer", "Không được để trống.");
    return;
  }
  if (!/^[A-D]$/.test(answer)) {
    pushIssue(issues, "answer", `"${row.answer.trim()}" không hợp lệ. Chỉ chấp nhận một chữ A, B, C hoặc D.`);
    return;
  }
  const index = answer.charCodeAt(0) - 65;
  if (!options[index]) {
    pushIssue(
      issues,
      "answer",
      `"${answer}" không tồn tại vì option_${String.fromCharCode(97 + index)} đang trống.`,
    );
  }
}

function validateMultiAnswer(row: BankQuestion, options: string[], issues: FieldIssue[]) {
  const raw = row.answer.trim();
  if (!raw) {
    pushIssue(issues, "answer", "Không được để trống. Ví dụ hợp lệ: A,C hoặc A,B,C.");
    return;
  }
  const parts = raw
    .toUpperCase()
    .split(/[,;/|\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    pushIssue(issues, "answer", `"${raw}" không hợp lệ. Ví dụ hợp lệ: A,C.`);
    return;
  }
  const unique = new Set<string>();
  for (const part of parts) {
    if (!/^[A-D]$/.test(part)) {
      pushIssue(issues, "answer", `"${part}" không hợp lệ. Chỉ chấp nhận các chữ A–D, cách nhau bằng dấu phẩy.`);
      continue;
    }
    if (unique.has(part)) {
      pushIssue(issues, "answer", `Đáp án "${part}" bị trùng trong danh sách.`);
      continue;
    }
    unique.add(part);
    const index = part.charCodeAt(0) - 65;
    if (!options[index]) {
      pushIssue(issues, "answer", `"${part}" không tồn tại vì option_${String.fromCharCode(97 + index)} đang trống.`);
    }
  }
  if (unique.size < 2) {
    pushIssue(issues, "answer", "Câu nhiều đáp án cần ít nhất hai đáp án đúng.");
  }
}

function validateSubjective(row: BankQuestion, issues: FieldIssue[]) {
  // Sample answer recommended for grading — not a hard blocker for draft save.
  if (!row.sample.trim()) {
    pushIssue(
      issues,
      "sample",
      "Khuyến nghị có đáp án mẫu để đối chiếu khi chấm (không bắt buộc để lưu nháp).",
      "warning",
    );
  }
}

function validateByType(row: BankQuestion, issues: FieldIssue[]) {
  if (row.kind === "TRAC_NGHIEM_DON") {
    const options = validateChoiceOptions(row, issues);
    validateSingleAnswer(row, options, issues);
    return;
  }
  if (row.kind === "NHIEU_DAP_AN") {
    const options = validateChoiceOptions(row, issues);
    validateMultiAnswer(row, options, issues);
    return;
  }
  if (isSubjectiveKind(row.kind)) {
    validateSubjective(row, issues);
  }
}

function formatIssue(issue: FieldIssue): string {
  return `${issue.field}: ${issue.message}`;
}

export function answerDisplay(row: BankQuestion): string {
  if (isSubjectiveKind(row.kind)) {
    return row.sample.trim() || "—";
  }
  return row.answer.trim() || "—";
}

export function validateExcelQuestions(questions: BankQuestion[], defaultScore = 5): ImportRow[] {
  const contentCounts = new Map<string, number>();
  for (const row of questions) {
    if (isBlankQuestion(row)) continue;
    const key = row.content.trim().toLowerCase();
    if (!key) continue;
    contentCounts.set(key, (contentCounts.get(key) ?? 0) + 1);
  }

  return questions.map((row, index) => {
    const line = index + 2;
    if (isBlankQuestion(row)) {
      return {
        row,
        line,
        errors: [],
        warnings: [],
        issues: [],
        status: "VALID",
        unsupported: false,
        skipped: true,
      };
    }

    const issues: FieldIssue[] = [];

    if (!row.content.trim()) {
      pushIssue(issues, "content", "Không được để trống.");
    }

    if (!ALLOWED_KINDS.includes(row.kind)) {
      pushIssue(issues, "type", `"${row.kind}" không hợp lệ.`);
    }

    const scoreInfo = parseScore(row.score, defaultScore);
    if (!scoreInfo.empty) {
      if (!Number.isFinite(scoreInfo.value) || scoreInfo.value < 1 || scoreInfo.value > 10000) {
        pushIssue(issues, "score", `"${row.score.trim()}" không hợp lệ. Điểm phải từ 1 đến 10.000.`);
      } else if (Math.abs(scoreInfo.value - Math.round(scoreInfo.value)) > 1e-9) {
        pushIssue(issues, "score", `"${row.score.trim()}" không hợp lệ. Điểm phải là số nguyên từ 1 đến 10.000.`);
      }
    }

    if (!row.difficulty.trim()) {
      pushIssue(issues, "difficulty", "Khuyến nghị điền độ khó (Easy / Medium / Hard).", "warning");
    } else if (!isAllowedDifficulty(row.difficulty)) {
      pushIssue(
        issues,
        "difficulty",
        `"${row.difficulty.trim()}" chưa chuẩn — khuyến nghị Easy, Medium, Hard (vẫn có thể lưu).`,
        "warning",
      );
    }

    if (!row.skill.trim()) {
      pushIssue(issues, "skill", "Khuyến nghị điền kỹ năng.", "warning");
    }

    validateByType(row, issues);

    const contentKey = row.content.trim().toLowerCase();
    if (contentKey && (contentCounts.get(contentKey) ?? 0) > 1) {
      pushIssue(issues, "content", "Nội dung câu hỏi bị trùng với dòng khác.", "warning");
    }

    const errorIssues = issues.filter((issue) => issue.level === "error");
    const warningIssues = issues.filter((issue) => issue.level === "warning");
    const errors = errorIssues.map(formatIssue);
    const warnings = warningIssues.map(formatIssue);
    const status: ImportStatus =
      errorIssues.length > 0 ? "INVALID" : warningIssues.length > 0 ? "WARNING" : "VALID";

    return {
      row,
      line,
      errors,
      warnings,
      issues,
      status,
      unsupported: false,
      skipped: false,
    };
  });
}

export function importErrorCsv(rows: ImportRow[]): string {
  const cell = (value: string | number) => {
    const text = String(value);
    const safe = /^[=+@\-\t\r]/.test(text) ? "'" + text : text;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [
      ["Dòng Excel", "Trạng thái", "Nội dung", "Chi tiết"],
      ...rows
        .filter((item) => !item.skipped && item.status !== "VALID")
        .map((item) => [
          item.line,
          item.status,
          item.row.content,
          [...item.errors, ...item.warnings].join(" | "),
        ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
