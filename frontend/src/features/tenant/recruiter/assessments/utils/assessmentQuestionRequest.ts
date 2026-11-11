import { t as globalT, type TranslateFn } from "@/i18n";
import { createRubricSchema, createCodingSchema } from "./questionContentValidation";
import type { QuestionRequest } from "@/api/types/assessment";
import { isSubjectiveKind } from "../constants/excelTemplateMock";
import type { ImportRow } from "./excelImportValidation";

function mapDifficulty(raw: string): QuestionRequest["difficulty"] {
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  if (
    value === "easy" ||
    value.includes("dễ") ||
    value.includes("co ban") ||
    value.includes("cơ bản") ||
    value.includes("初級") ||
    value.includes("基礎") ||
    value.includes("易")
  ) {
    return "Easy";
  }
  if (
    value === "hard" ||
    value.includes("khó") ||
    value.includes("nâng cao") ||
    value.includes("nang cao") ||
    value.includes("上級") ||
    value.includes("難")
  ) {
    return "Hard";
  }
  if (
    value === "medium" ||
    value.includes("vận dụng") ||
    value.includes("van dung") ||
    value.includes("trung") ||
    value.includes("中級") ||
    value.includes("応用")
  ) {
    return "Medium";
  }
  return null;
}

function selectedLetters(answer: string): Set<string> {
  return new Set(
    answer
      .trim()
      .toUpperCase()
      .split(/[,;/|\s]+/)
      .map((part) => part.trim())
      .filter((part) => /^[A-D]$/.test(part)),
  );
}

export function toQuestionRequest(
  item: ImportRow,
  index: number,
  defaultScore: number,
  t: TranslateFn = globalT,
): QuestionRequest {
  const row = item.row;
  const base = {
    questionText: row.content.trim(),
    points: row.score.trim() ? Number(row.score) : defaultScore,
    questionOrder: index,
    difficulty: mapDifficulty(row.difficulty),
    skill: row.skill.trim() || null,
  };

  if (isSubjectiveKind(row.kind)) {
    let rubricJson = null;
    if (row.kind !== "TU_LUAN_CODE") {
      let parsed: any = null;
      if (row.rubricJsonText?.trim()) {
        try { parsed = JSON.parse(row.rubricJsonText); } catch { parsed = null; }
      }
      if (!parsed || !Array.isArray(parsed.criteria) || parsed.criteria.length === 0) {
        parsed = {
          category: "ESSAY_CONCEPTUAL",
          referenceAnswer:
            row.sample.trim() || t("recruiter.assessments.coding.request.defaultReferenceAnswer"),
          criteria: [{
            name: t("recruiter.assessments.coding.request.defaultCriterionName"),
            guide:
              row.rubric?.map((item) => item.text).filter(Boolean).join("; ") ||
              t("recruiter.assessments.coding.request.defaultCriterionGuide"),
            description:
              row.rubric?.map((item) => item.text).filter(Boolean).join("; ") ||
              t("recruiter.assessments.coding.request.defaultCriterionDescription"),
            weight: 100,
          }],
        };
      }
      if (row.sample.trim()) {
        parsed.referenceAnswer = row.sample.trim();
      }
      rubricJson = createRubricSchema(t).parse(parsed);
    }

    return {
      ...base,
      questionType: row.kind === "TU_LUAN_CODE" ? "CODING" : "ESSAY",
      rubricJson,
      coding:
        row.kind === "TU_LUAN_CODE"
          ? createCodingSchema(t).parse(JSON.parse(row.codingJsonText || "null"))
          : null,
      explanation: row.sample.trim() || row.explanation.trim() || null,
      options: [],
    };
  }

  const letters =
    row.kind === "NHIEU_DAP_AN" ? selectedLetters(row.answer) : new Set([row.answer.trim().toUpperCase()].filter((l) => /^[A-D]$/.test(l)));
  const options = [row.optionA, row.optionB, row.optionC, row.optionD]
    .map((optionText, optionIndex) => ({
      optionText: optionText.trim(),
      correct: letters.has(String.fromCharCode(65 + optionIndex)),
    }))
    .filter((option) => option.optionText.length > 0);

  return {
    ...base,
    questionType: row.kind === "NHIEU_DAP_AN" ? "MULTIPLE_CHOICE" : "MCQ",
    explanation: row.explanation.trim() || row.policyNote.trim() || null,
    options,
  };
}

