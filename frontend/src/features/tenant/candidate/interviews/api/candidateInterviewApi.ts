import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { AiAnswer, AiInterview } from "@/api/types/aiInterview";

export type CandidateInterview = AiInterview & { jobTitle: string | null };

export const candidateInterviewApi = {
  mine: () => api.get<ApiResponse<CandidateInterview[]>>("/ai-interviews/me").then(r => r.data.data),
  get: (id: number) => api.get<ApiResponse<CandidateInterview>>(`/ai-interviews/${id}`).then(r => r.data.data),
  start: (id: number) => api.post<ApiResponse<CandidateInterview>>(`/ai-interviews/${id}/start`).then(r => r.data.data),
  complete: (id: number) => api.post<ApiResponse<CandidateInterview>>(`/ai-interviews/${id}/complete`).then(r => r.data.data),
  requestStart: (applicationId: number) => api.post<ApiResponse<CandidateInterview>>(`/ai-interviews/applications/${applicationId}/start`).then(r => r.data.data),
  answer: (id: number, questionId: number, answerText: string, answerDuration: number) =>
    api.put<ApiResponse<AiAnswer>>(`/ai-interviews/${id}/questions/${questionId}/answer`, { answerText, answerDuration }).then(r => r.data.data),
};
