import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export const assessmentApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<unknown>>("/assessments", { params }).then((r) => r.data),
  create: (body: unknown) =>
    api.post<ApiResponse<unknown>>("/assessments", body).then((r) => r.data),
  startAttempt: (assessmentId: number | string) =>
    api.post<ApiResponse<unknown>>(`/assessments/${assessmentId}/attempts`).then((r) => r.data),
  submitAnswers: (attemptId: number | string, body: unknown) =>
    api.post<ApiResponse<unknown>>(`/attempts/${attemptId}/answers`, body).then((r) => r.data),
  codingSubmit: (attemptId: number | string, body: unknown) =>
    api.post<ApiResponse<unknown>>(`/attempts/${attemptId}/coding-submissions`, body).then((r) => r.data),
  grade: (attemptId: number | string) =>
    api.post<ApiResponse<unknown>>(`/attempts/${attemptId}/grade`).then((r) => r.data),
  timer: (attemptId: number | string) =>
    api.get<ApiResponse<unknown>>(`/attempts/${attemptId}/timer`).then((r) => r.data),
  submit: (attemptId: number | string) =>
    api.post<ApiResponse<unknown>>(`/attempts/${attemptId}/submit`).then((r) => r.data),
  proctorEvent: (attemptId: number | string, body: unknown) =>
    api.post<ApiResponse<unknown>>(`/attempts/${attemptId}/proctor-events`, body).then((r) => r.data),
  health: () =>
    api.get<ApiResponse<Record<string, string>>>("/assessments/health").then((r) => r.data),
};
