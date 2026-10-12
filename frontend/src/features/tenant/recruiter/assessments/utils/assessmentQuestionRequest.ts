import type { QuestionRequest } from "@/api/types/assessment";
import { isSubjectiveKind } from "../constants/excelTemplateMock";
import type { ImportRow } from "./excelImportValidation";

function mapDifficulty(raw: string): QuestionRequest["difficulty"] {
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  if (value === "easy" || value.includes("dễ") || value.includes("co ban") || value.includes("cơ bản")) return "Easy";
  if (value === "hard" || value.includes("khó") || value.includes("nâng cao") || value.includes("nang cao")) return "Hard";
  if (value === "medium" || value.includes("vận dụng") || value.includes("van dung") || value.includes("trung")) return "Medium";
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

export function toQuestionRequest(item: ImportRow, index: number, defaultScore: number): QuestionRequest {
  const row = item.row;
  const base = {
    questionText: row.content.trim(),
    points: row.score.trim() ? Number(row.score) : defaultScore,
    questionOrder: index,
    difficulty: mapDifficulty(row.difficulty),
    skill: row.skill.trim() || null,
  };

  if (isSubjectiveKind(row.kind)) {
    return {
      ...base,
      questionType: "ESSAY",
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

