import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { AvailableAssessment, JobTest, Question, QuestionRequest, SavedAnswer, Submission, TestPage, TestRequest } from "@/api/types/assessment";

export const assessmentApi = {
  list: (page = 0, size = 20) => api.get<ApiResponse<TestPage>>("/assessments/list_tenant_tests", { params: { page, size } }).then(r => r.data.data),
  listForJob: async (jobId: number) => {
    const items: JobTest[] = [];
    let page = 0;
    let result: TestPage;
    do {
      result = await assessmentApi.list(page, 50);
      items.push(...result.items.filter(test => test.jobId === jobId));
      page += 1;
    } while (result.items.length > 0 && page * result.size < result.total);
    return { items, total: items.length, page: 0, size: items.length };
  },
  get: (id: number) => api.get<ApiResponse<JobTest>>(`/assessments/get_test_metadata/${id}`).then(r => r.data.data),
  create: (body: TestRequest) => api.post<ApiResponse<JobTest>>("/assessments/create_draft_test", body).then(r => r.data.data),
  update: (id: number, body: TestRequest) => api.put<ApiResponse<JobTest>>(`/assessments/update_draft_test/${id}`, body).then(r => r.data.data),
  questions: (id: number) => api.get<ApiResponse<Question[]>>(`/assessments/${id}/list_questions`).then(r => r.data.data),
  createQuestion: (id: number, body: QuestionRequest) => api.post<ApiResponse<Question>>(`/assessments/${id}/create_question`, body).then(r => r.data.data),
  updateQuestion: (id: number, questionId: number, body: QuestionRequest) => api.put<ApiResponse<Question>>(`/assessments/${id}/update_question/${questionId}`, body).then(r => r.data.data),
  deleteQuestion: (id: number, questionId: number) => api.delete(`/assessments/${id}/delete_question/${questionId}`),
  publish: (id: number) => api.post<ApiResponse<JobTest>>(`/assessments/${id}/publish_test`).then(r => r.data.data),
  available: (applicationId: number) => api.get<ApiResponse<AvailableAssessment[]>>(`/applications/${applicationId}/list_available_assessments`).then(r => r.data.data),
  start: (id: number, applicationId: number) => api.post<ApiResponse<Submission>>(`/assessments/${id}/start_submission`, { applicationId }).then(r => r.data.data),
  submission: (id: number, signal?: AbortSignal) => api.get<ApiResponse<Submission>>(`/submissions/${id}/get_submission`, { signal }).then(r => r.data.data),
  saveAnswers: (id: number, answers: SavedAnswer[]) => api.post<ApiResponse<Submission>>(`/submissions/${id}/save_answers`, { answers }).then(r => r.data.data),
  submit: (id: number) => api.post<ApiResponse<Submission>>(`/submissions/${id}/submit_test`).then(r => r.data.data),
  result: (id: number) => api.get<ApiResponse<Submission>>(`/submissions/${id}/get_result`).then(r => r.data.data),
};
