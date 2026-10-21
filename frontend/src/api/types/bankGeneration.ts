import type { QuestionRequest } from "./assessment";
export type BankGenerationRequest = {
  skill: string; questionType: "MCQ" | "MULTIPLE_CHOICE" | "ESSAY" | "CODING";
  difficulty: "Easy" | "Medium" | "Hard"; count: number;
  language: "java" | "python" | "javascript" | "sql"; instructions: string;
};
export type BankGenerationResponse = {
  id: string; status: "PENDING" | "RUNNING" | "READY" | "FAILED";
  questions: QuestionRequest[]; error: string | null;
};
