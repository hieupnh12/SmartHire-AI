import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { BankQuestion, BankQuestionPage, BankQuestionRequest } from "@/api/types/questionBank";

export const questionBankApi = {
  list: (page = 0, size = 100, signal?: AbortSignal) => api.get<ApiResponse<BankQuestionPage>>("/question-bank/list_questions", { params: { page, size }, signal }).then(response => response.data.data),
  listAll: async (signal?: AbortSignal) => {
    const items: BankQuestion[] = [];
    let page = 0;
    let result: BankQuestionPage;
    do {
      result = await questionBankApi.list(page++, 100, signal);
      items.push(...result.items);
    } while (result.items.length && page * result.size < result.total);
    return items;
  },
  get: (id: number) => api.get<ApiResponse<BankQuestion>>(`/question-bank/get_question/${id}`).then(response => response.data.data),
  create: (questions: BankQuestionRequest[]) => api.post<ApiResponse<BankQuestion[]>>("/question-bank/create_questions", { questions }).then(response => response.data.data),
  update: (id: number, body: BankQuestionRequest) => api.put<ApiResponse<BankQuestion>>(`/question-bank/update_question/${id}`, body).then(response => response.data.data),
  archive: (questionIds: number[], archived = true) => api.put("/question-bank/archive_questions", { questionIds, archived }),
};
