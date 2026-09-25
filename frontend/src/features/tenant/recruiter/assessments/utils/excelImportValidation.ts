import type { BankQuestion } from "../constants/excelTemplateMock";

export type ImportRow = {
  row: BankQuestion;
  line: number;
  errors: string[];
  unsupported: boolean;
  /** Completely empty sheet row — ignored when saving to the database. */
  skipped: boolean;
};

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

/** Rows that may be persisted: content + difficulty + skill are all filled. */
export function isPersistableQuestion(row: BankQuestion): boolean {
  return Boolean(row.content.trim() && row.difficulty.trim() && row.skill.trim());
}

export function validateExcelQuestions(questions: BankQuestion[], defaultScore = 5): ImportRow[] {
  return questions.map((row, index) => {
    const line = index + 2;
    if (isBlankQuestion(row)) {
      return { row, line, errors: [], unsupported: false, skipped: true };
    }

    const errors: string[] = [];
    const unsupported = row.kind !== "TRAC_NGHIEM_DON";

    if (!row.content.trim()) errors.push("Thiếu nội dung câu hỏi.");
    if (!row.difficulty.trim()) errors.push("Thiếu độ khó.");
    if (!row.skill.trim()) errors.push("Thiếu kỹ năng.");

    const score = row.score.trim() ? Number(row.score) : defaultScore;
    if (!Number.isInteger(score) || score < 1 || score > 10000) {
      errors.push("Điểm phải là số nguyên từ 1 đến 10.000.");
    }

    if (!unsupported) {
      const options = [row.optionA, row.optionB, row.optionC, row.optionD];
      if (options.filter((option) => option.trim()).length < 2) {
        errors.push("Cần ít nhất hai lựa chọn trả lời.");
      }
      const answer = row.answer.trim().toUpperCase();
      if (!/^[A-D]$/.test(answer)) {
        errors.push("Đáp án đúng phải là một chữ cái A, B, C hoặc D.");
      } else if (!options[answer.charCodeAt(0) - 65].trim()) {
        errors.push("Lựa chọn tương ứng với đáp án đúng đang để trống.");
      }
    }

    return { row, line, errors, unsupported, skipped: false };
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
      ["Dòng Excel", "Nội dung", "Lỗi"],
      ...rows
        .filter((item) => !item.skipped && (item.errors.length || item.unsupported))
        .map((item) => [
          item.line,
          item.row.content,
          [...item.errors, ...(item.unsupported ? ["Loại câu hỏi chưa hỗ trợ nhập đề"] : [])].join("; "),
        ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
