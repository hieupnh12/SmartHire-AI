import type { CodingContent, SampleResult } from "@/api/types/assessment";
import type { BankGenerationRequest, BankGenerationResponse } from "@/api/types/bankGeneration";
import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { BankQuestion, BankQuestionPage, BankQuestionQuery, BankQuestionRequest } from "@/api/types/questionBank";

export type QuestionBankGenerateRequest = {
  skill: string;
  difficulty: "Easy" | "Medium" | "Hard";
  questionType: "MCQ" | "MULTIPLE_CHOICE" | "ESSAY";
  count: number;
  topic?: string;
  language?: "vi" | "en";
  /** Job description / JD snippet for AI context. */
  context?: string;
};

export const questionBankApi = {
  /** Async generation used for CODING drafts (queue + poll). */
  generate: (body: BankGenerationRequest) =>
    api.post<ApiResponse<BankGenerationResponse>>("/question-bank/generation", body).then(response => response.data.data),
  generationStatus: (id: string) =>
    api.get<ApiResponse<BankGenerationResponse>>(`/question-bank/generation/${id}`).then(response => response.data.data),
  verifyCoding: (body: { coding?: CodingContent; language: string; source: string; questionId?: number }) => api.post<ApiResponse<SampleResult[]>>("/question-bank/verify_coding", body).then(response => response.data.data),
  generateDrafts: (body: QuestionBankGenerateRequest) =>
    api.post<ApiResponse<BankQuestionRequest[]>>("/question-bank/generate_drafts", body).then(response => response.data.data),
  list: (params: BankQuestionQuery, signal?: AbortSignal) => api.get<ApiResponse<BankQuestionPage>>("/question-bank/list_questions", {
    params,
    paramsSerializer: { indexes: null },
    signal,
  }).then(response => response.data.data),
  get: (id: number) => api.get<ApiResponse<BankQuestion>>(`/question-bank/get_question/${id}`).then(response => response.data.data),
  listAll: (signal?: AbortSignal) => api.get<ApiResponse<BankQuestionPage>>("/question-bank/list_questions", {
    params: { size: 100 },
    signal,
  }).then(response => response.data.data.items),
  create: (questions: BankQuestionRequest[]) => api.post<ApiResponse<BankQuestion[]>>("/question-bank/create_questions", { questions }).then(response => response.data.data),
  update: (id: number, body: BankQuestionRequest) => api.put<ApiResponse<BankQuestion>>(`/question-bank/update_question/${id}`, body).then(response => response.data.data),
  archive: (questionIds: number[], archived = true) => api.put("/question-bank/archive_questions", { questionIds, archived }),
};
