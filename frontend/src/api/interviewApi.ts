import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export const interviewApi = {
  create: (body: unknown) =>
    api.post<ApiResponse<unknown>>("/interviews", body).then((r) => r.data),
  get: (id: number | string) =>
    api.get<ApiResponse<unknown>>(`/interviews/${id}`).then((r) => r.data),
  generateQuestions: (id: number | string) =>
    api.post<ApiResponse<unknown>>(`/interviews/${id}/questions/generate`).then((r) => r.data),
  voice: (id: number | string, form: FormData) =>
    api.post<ApiResponse<unknown>>(`/interviews/${id}/voice`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),
  score: (id: number | string) =>
    api.post<ApiResponse<unknown>>(`/interviews/${id}/score`).then((r) => r.data),
  feedback: (id: number | string) =>
    api.get<ApiResponse<unknown>>(`/interviews/${id}/feedback`).then((r) => r.data),
  shareFeedback: (id: number | string) =>
    api.post<ApiResponse<unknown>>(`/interviews/${id}/feedback/share`).then((r) => r.data),
  health: () =>
    api.get<ApiResponse<Record<string, string>>>("/interviews/health").then((r) => r.data),
};
