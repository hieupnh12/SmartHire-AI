import { t as globalT, type TranslateFn } from "@/i18n";
import { createRubricSchema, createCodingSchema, contentError } from "./questionContentValidation";
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

function validateChoiceOptions(row: BankQuestion, issues: FieldIssue[], t: TranslateFn) {
  const options = [row.optionA, row.optionB, row.optionC, row.optionD].map((option) => option.trim());
  const filledCount = options.filter(Boolean).length;

  if (filledCount < 2) {
    pushIssue(issues, "options", t("recruiter.assessments.importReview.validation.minTwoOptions"));
  }
  if (!options[0]) pushIssue(issues, "option_a", t("recruiter.assessments.importReview.validation.requiredField"));
  if (!options[1]) pushIssue(issues, "option_b", t("recruiter.assessments.importReview.validation.requiredField"));

  return options;
}

function validateSingleAnswer(row: BankQuestion, options: string[], issues: FieldIssue[], t: TranslateFn) {
  const answer = row.answer.trim().toUpperCase();
  if (!answer) {
    pushIssue(issues, "answer", t("recruiter.assessments.importReview.validation.requiredField"));
    return;
  }
  if (!/^[A-D]$/.test(answer)) {
    pushIssue(
      issues,
      "answer",
      t("recruiter.assessments.importReview.validation.invalidSingleAnswer", { value: row.answer.trim() }),
    );
    return;
  }
  const index = answer.charCodeAt(0) - 65;
  if (!options[index]) {
    pushIssue(
      issues,
      "answer",
      t("recruiter.assessments.importReview.validation.missingOptionForAnswer", {
        answer,
        letter: String.fromCharCode(97 + index),
      }),
    );
  }
}

function validateMultiAnswer(row: BankQuestion, options: string[], issues: FieldIssue[], t: TranslateFn) {
  const raw = row.answer.trim();
  if (!raw) {
    pushIssue(issues, "answer", t("recruiter.assessments.importReview.validation.requiredMultiAnswer"));
    return;
  }
  const parts = raw
    .toUpperCase()
    .split(/[,;/|\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    pushIssue(
      issues,
      "answer",
      t("recruiter.assessments.importReview.validation.invalidMultiAnswerEmpty", { value: raw }),
    );
    return;
  }
  const unique = new Set<string>();
  for (const part of parts) {
    if (!/^[A-D]$/.test(part)) {
      pushIssue(
        issues,
        "answer",
        t("recruiter.assessments.importReview.validation.invalidMultiOptionChar", { value: part }),
      );
      continue;
    }
    if (unique.has(part)) {
      pushIssue(
        issues,
        "answer",
        t("recruiter.assessments.importReview.validation.duplicateMultiOption", { value: part }),
      );
      continue;
    }
    unique.add(part);
    const index = part.charCodeAt(0) - 65;
    if (!options[index]) {
      pushIssue(
        issues,
        "answer",
        t("recruiter.assessments.importReview.validation.missingOptionForAnswer", {
          answer: part,
          letter: String.fromCharCode(97 + index),
        }),
      );
    }
  }
  if (unique.size < 2) {
    pushIssue(issues, "answer", t("recruiter.assessments.importReview.validation.minTwoCorrectAnswers"));
  }
}

function validateSubjective(row: BankQuestion, issues: FieldIssue[], t: TranslateFn) {
  // Sample answer recommended for grading — not a hard blocker for draft save.
  if (!row.sample.trim()) {
    pushIssue(
      issues,
      "sample",
      t("recruiter.assessments.importReview.validation.recommendSampleWarning"),
      "warning",
    );
  }
}

function validateByType(row: BankQuestion, issues: FieldIssue[], t: TranslateFn) {
  if (row.kind === "TRAC_NGHIEM_DON") {
    const options = validateChoiceOptions(row, issues, t);
    validateSingleAnswer(row, options, issues, t);
    return;
  }
  if (row.kind === "NHIEU_DAP_AN") {
    const options = validateChoiceOptions(row, issues, t);
    validateMultiAnswer(row, options, issues, t);
    return;
  }
  if (isSubjectiveKind(row.kind)) {
    validateSubjective(row, issues, t);
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

export function validateExcelQuestions(
  questions: BankQuestion[],
  defaultScore = 5,
  t: TranslateFn = globalT,
): ImportRow[] {
  const rubricSchema = createRubricSchema(t);
  const codingSchema = createCodingSchema(t);
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
        skipped: true,
      };
    }

    const issues: FieldIssue[] = [];

    if (!row.content.trim()) {
      pushIssue(issues, "content", t("recruiter.assessments.importReview.validation.requiredField"));
    }

    if (!ALLOWED_KINDS.includes(row.kind)) {
      pushIssue(
        issues,
        "type",
        t("recruiter.assessments.importReview.validation.invalidKind", { kind: row.kind }),
      );
    }

    const scoreInfo = parseScore(row.score, defaultScore);
    if (!scoreInfo.empty) {
      if (!Number.isFinite(scoreInfo.value) || scoreInfo.value < 1 || scoreInfo.value > 10000) {
        pushIssue(
          issues,
          "score",
          t("recruiter.assessments.importReview.validation.scoreRangeError", { value: row.score.trim() }),
        );
      } else if (Math.abs(scoreInfo.value - Math.round(scoreInfo.value)) > 1e-9) {
        pushIssue(
          issues,
          "score",
          t("recruiter.assessments.importReview.validation.scoreIntRangeError", { value: row.score.trim() }),
        );
      }
    }

    if (!row.difficulty.trim()) {
      pushIssue(
        issues,
        "difficulty",
        t("recruiter.assessments.importReview.validation.recommendDifficultyWarning"),
        "warning",
      );
    } else if (!isAllowedDifficulty(row.difficulty)) {
      pushIssue(
        issues,
        "difficulty",
        t("recruiter.assessments.importReview.validation.nonStandardDifficultyWarning", {
          value: row.difficulty.trim(),
        }),
        "warning",
      );
    }

    if (!row.skill.trim()) {
      pushIssue(
        issues,
        "skill",
        t("recruiter.assessments.importReview.validation.recommendSkillWarning"),
        "warning",
      );
    }

    validateByType(row, issues, t);
    try {
      if (row.kind === "TU_LUAN_CODE") {
        if (row.codingJsonText?.trim()) {
          codingSchema.parse(JSON.parse(row.codingJsonText));
        }
      } else if (row.kind === "TINH_HUONG_SYSTEM") {
        if (row.rubricJsonText?.trim()) {
          rubricSchema.parse(JSON.parse(row.rubricJsonText));
        } else if (row.sample.trim()) {
          rubricSchema.parse({
            referenceAnswer: row.sample.trim(),
            criteria: [
              {
                description:
                  row.rubric.map((item) => item.text).filter(Boolean).join("; ") ||
                  t("recruiter.assessments.importReview.validation.defaultRubricCriterion"),
                weight: 100,
              },
            ],
          });
        }
      }
    } catch (error) {
      pushIssue(issues, "rubric", contentError(error, t));
    }

    const contentKey = row.content.trim().toLowerCase();
    if (contentKey && (contentCounts.get(contentKey) ?? 0) > 1) {
      pushIssue(
        issues,
        "content",
        t("recruiter.assessments.importReview.validation.duplicateContentWarning"),
        "warning",
      );
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
      skipped: false,
    };
  });
}

export function importErrorCsv(rows: ImportRow[], t: TranslateFn = globalT): string {
  const cell = (value: string | number) => {
    const text = String(value);
    const safe = /^[=+@\-\t\r]/.test(text) ? "'" + text : text;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [
      [
        t("recruiter.assessments.importReview.validation.csvHeaders.line"),
        t("recruiter.assessments.importReview.validation.csvHeaders.status"),
        t("recruiter.assessments.importReview.validation.csvHeaders.content"),
        t("recruiter.assessments.importReview.validation.csvHeaders.details"),
      ],
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
