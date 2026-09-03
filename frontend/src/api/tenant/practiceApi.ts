import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export const practiceApi = {
  list: () => api.get<ApiResponse<unknown>>("/practice/sessions").then((r) => r.data),
  create: (body: unknown) =>
    api.post<ApiResponse<unknown>>("/practice/sessions", body).then((r) => r.data),
  get: (id: number | string) =>
    api.get<ApiResponse<unknown>>(`/practice/sessions/${id}`).then((r) => r.data),
  answer: (id: number | string, body: unknown) =>
    api.post<ApiResponse<unknown>>(`/practice/sessions/${id}/answers`, body).then((r) => r.data),
  requestFeedback: (id: number | string) =>
    api.post<ApiResponse<unknown>>(`/practice/sessions/${id}/feedback`).then((r) => r.data),
  getFeedback: (id: number | string) =>
    api.get<ApiResponse<unknown>>(`/practice/sessions/${id}/feedback`).then((r) => r.data),
  remove: (id: number | string) =>
    api.delete<ApiResponse<null>>(`/practice/sessions/${id}`).then((r) => r.data),
  health: () =>
    api.get<ApiResponse<Record<string, string>>>("/practice/health").then((r) => r.data),
};
