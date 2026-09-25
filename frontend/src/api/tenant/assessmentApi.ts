import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { AvailableAssessment, JobTest, Question, QuestionRequest, SavedAnswer, Submission, TestPage, TestRequest } from "@/api/types/assessment";

export const assessmentApi = {
  list: (page = 0, size = 20) => api.get<ApiResponse<TestPage>>("/assessments", { params: { page, size } }).then(r => r.data.data),
  get: (id: number) => api.get<ApiResponse<JobTest>>(`/assessments/${id}`).then(r => r.data.data),
  create: (body: TestRequest) => api.post<ApiResponse<JobTest>>("/assessments", body).then(r => r.data.data),
  update: (id: number, body: TestRequest) => api.put<ApiResponse<JobTest>>(`/assessments/${id}`, body).then(r => r.data.data),
  questions: (id: number) => api.get<ApiResponse<Question[]>>(`/assessments/${id}/questions`).then(r => r.data.data),
  createQuestion: (id: number, body: QuestionRequest) => api.post<ApiResponse<Question>>(`/assessments/${id}/questions`, body).then(r => r.data.data),
  updateQuestion: (id: number, questionId: number, body: QuestionRequest) => api.put<ApiResponse<Question>>(`/assessments/${id}/questions/${questionId}`, body).then(r => r.data.data),
  deleteQuestion: (id: number, questionId: number) => api.delete(`/assessments/${id}/questions/${questionId}`),
  publish: (id: number) => api.post<ApiResponse<JobTest>>(`/assessments/${id}/publish`).then(r => r.data.data),
  available: (applicationId: number) => api.get<ApiResponse<AvailableAssessment[]>>(`/applications/${applicationId}/assessments`).then(r => r.data.data),
  start: (id: number, applicationId: number) => api.post<ApiResponse<Submission>>(`/assessments/${id}/submissions`, { applicationId }).then(r => r.data.data),
  submission: (id: number, signal?: AbortSignal) => api.get<ApiResponse<Submission>>(`/submissions/${id}`, { signal }).then(r => r.data.data),
  saveAnswers: (id: number, answers: SavedAnswer[]) => api.post<ApiResponse<Submission>>(`/submissions/${id}/answers`, { answers }).then(r => r.data.data),
  submit: (id: number) => api.post<ApiResponse<Submission>>(`/submissions/${id}/submit`).then(r => r.data.data),
  result: (id: number) => api.get<ApiResponse<Submission>>(`/submissions/${id}/result`).then(r => r.data.data),
};
