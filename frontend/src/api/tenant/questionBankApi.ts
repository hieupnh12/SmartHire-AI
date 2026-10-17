import type { CodingContent, SampleResult } from "@/api/types/assessment";
import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { BankQuestion, BankQuestionPage, BankQuestionQuery, BankQuestionRequest } from "@/api/types/questionBank";
import type { BankGenerationRequest, BankGenerationResponse } from "@/api/types/bankGeneration";

export const questionBankApi = {
  generate: (body: BankGenerationRequest) => api.post<ApiResponse<BankGenerationResponse>>("/question-bank/generation", body).then(response => response.data.data),
  generationStatus: (id: string) => api.get<ApiResponse<BankGenerationResponse>>(`/question-bank/generation/${id}`).then(response => response.data.data),
  verifyCoding: (body: { coding: CodingContent; language: string; source: string }) => api.post<ApiResponse<SampleResult[]>>("/question-bank/verify_coding", body).then(response => response.data.data),
  list: (params: BankQuestionQuery, signal?: AbortSignal) => api.get<ApiResponse<BankQuestionPage>>("/question-bank/list_questions", {
    params,
    paramsSerializer: { indexes: null },
    signal,
  }).then(response => response.data.data),
  get: (id: number) => api.get<ApiResponse<BankQuestion>>(`/question-bank/get_question/${id}`).then(response => response.data.data),
  create: (questions: BankQuestionRequest[]) => api.post<ApiResponse<BankQuestion[]>>("/question-bank/create_questions", { questions }).then(response => response.data.data),
  update: (id: number, body: BankQuestionRequest) => api.put<ApiResponse<BankQuestion>>(`/question-bank/update_question/${id}`, body).then(response => response.data.data),
  archive: (questionIds: number[], archived = true) => api.put("/question-bank/archive_questions", { questionIds, archived }),
};
