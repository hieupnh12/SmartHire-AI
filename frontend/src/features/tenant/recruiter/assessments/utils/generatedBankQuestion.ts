import type { QuestionRequest } from "@/api/types/assessment";
import { blankQuestion, type BankQuestion } from "../constants/excelTemplateMock";

export function generatedBankQuestion(question: QuestionRequest): BankQuestion {
  const kind = question.questionType === "CODING" ? "TU_LUAN_CODE" : question.questionType === "ESSAY" ? "TINH_HUONG_SYSTEM" : question.questionType === "MULTIPLE_CHOICE" ? "NHIEU_DAP_AN" : "TRAC_NGHIEM_DON";
  const row = blankQuestion(kind);
  const starters = Object.entries(question.coding?.starterCode ?? {});
  const description = question.rubricJson?.criteria.map(item => item.description).join("; ") ?? "";
  const levels = description.match(/Excellent 9-10:\s*([\s\S]*?);\s*Pass 6-8:\s*([\s\S]*?);\s*Fail 0-5:\s*([\s\S]*)/i);
  return { ...row, content: question.questionText, score: String(question.points), skill: question.skill ?? "",
    difficulty: question.difficulty ?? "Medium", difficultyTone: question.difficulty === "Easy" ? "easy" : question.difficulty === "Hard" ? "hard" : "medium",
    optionA: question.options[0]?.optionText ?? "", optionB: question.options[1]?.optionText ?? "",
    optionC: question.options[2]?.optionText ?? "", optionD: question.options[3]?.optionText ?? "",
    answer: question.options.flatMap((option, index) => option.correct ? [String.fromCharCode(65 + index)] : []).join(","),
    sample: question.rubricJson?.referenceAnswer ?? (kind === "TU_LUAN_CODE" ? question.explanation ?? "" : ""),
    explanation: question.explanation ?? "", snippet: starters[0]?.[1] ?? "", language: starters[0]?.[0] ?? row.language,
    rubric: levels ? row.rubric.map((level, index) => ({ ...level, text: levels[index + 1] })) : row.rubric,
    rubricJsonText: question.rubricJson ? JSON.stringify(question.rubricJson) : undefined,
    codingJsonText: question.coding ? JSON.stringify(question.coding) : undefined,
  };
}
