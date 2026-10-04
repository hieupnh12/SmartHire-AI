import type { BankQuestion as ApiBankQuestion } from "@/api/types/questionBank";
import { blankQuestion, type BankQuestion } from "../constants/excelTemplateMock";

export type BankSaveActions = { onSave: (questions: BankQuestion[]) => Promise<void>; busy: boolean; error: unknown };

export function bankQuestionAuthoring(item: ApiBankQuestion): BankQuestion {
  const question = item.question;
  const metadata = item.authoringMetadata as Partial<BankQuestion> | null;
  const kind = question.questionType === "MCQ" ? "TRAC_NGHIEM_DON" : question.questionType === "MULTIPLE_CHOICE" ? "NHIEU_DAP_AN" : metadata?.kind === "TU_LUAN_CODE" ? "TU_LUAN_CODE" : "TINH_HUONG_SYSTEM";
  const answers = question.options.flatMap((option, index) => option.correct ? [String.fromCharCode(65 + index)] : []);
  return {
    ...blankQuestion(kind), ...metadata,
    id: `Q${question.id}`, kind, content: question.questionText, score: String(question.points),
    skill: question.skill ?? "", difficulty: question.difficulty ?? "",
    difficultyTone: question.difficulty === "Easy" ? "easy" : question.difficulty === "Hard" ? "hard" : "medium",
    explanation: question.explanation ?? "", answer: answers.join(","),
    optionA: question.options[0]?.optionText ?? "", optionB: question.options[1]?.optionText ?? "",
    optionC: question.options[2]?.optionText ?? "", optionD: question.options[3]?.optionText ?? "",
  };
}
