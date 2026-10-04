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
export type BankQuestionCounts = { all: number; favorites: number; ready: number; pending: number; archived: number };
export type BankQuestionPage = { items: BankQuestion[]; total: number; page: number; size: number; counts: BankQuestionCounts; skills: string[] };
export type BankQuestionQuery = {
  page: number;
  size: number;
  collection?: string;
  query?: string;
  skill?: string;
  difficulty?: string;
  status?: string;
  questionType?: string;
  sort?: string;
  favoriteIds?: number[];
};
