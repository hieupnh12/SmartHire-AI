import type { Question, QuestionRequest, TestStatus } from "./assessment";

export type BankQuestion = {
  question: Question;
  testId: number | null;
  testTitle: string | null;
  testStatus: TestStatus | null;
  jobId: number | null;
  jobTitle: string | null;
  archived: boolean;
  authoringMetadata: Record<string, unknown> | null;
};
export type BankQuestionRequest = { question: QuestionRequest; authoringMetadata: Record<string, unknown> | null };
export type BankQuestionPage = { items: BankQuestion[]; total: number; page: number; size: number };
