import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { Availability, Evaluation, HumanInterview, InterviewFilters, InterviewOptions, InterviewPage, InterviewSummary, SaveInterview } from "../types/humanInterview";
export const humanInterviewApi = {
  list: (params: InterviewFilters) => api.get<ApiResponse<InterviewPage>>("/interviews", { params }).then(r => r.data.data),
  summary: (jobId: number) => api.get<ApiResponse<InterviewSummary>>("/interviews/summary", { params: { jobId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone } }).then(r => r.data.data),
  options: (jobId: number) => api.get<ApiResponse<InterviewOptions>>("/interviews/options", { params: { jobId } }).then(r => r.data.data),
  get: (id: number) => api.get<ApiResponse<HumanInterview>>(`/interviews/${id}`).then(r => r.data.data),
  save: (body: SaveInterview, id?: number) => (id ? api.patch<ApiResponse<HumanInterview>>(`/interviews/${id}`, body) : api.post<ApiResponse<HumanInterview>>("/interviews", body)).then(r => r.data.data),
  availability: (body: { jobId: number; start: string; end: string; userIds: number[]; excludeId?: number }) => api.post<ApiResponse<Availability>>("/interviews/availability", body).then(r => r.data.data),
  cancel: (id: number) => api.post(`/interviews/${id}/cancel`),
  complete: (id: number) => api.post(`/interviews/${id}/complete`),
  remind: (id: number) => api.post(`/interviews/${id}/remind`),
  bulk: (ids: number[], action: "REMIND" | "CANCEL" | "RESCHEDULE", shiftMinutes?: number) => api.post("/interviews/bulk", { ids, action, shiftMinutes }),
  evaluate: (id: number, body: Pick<Evaluation, "technicalScore" | "communicationScore" | "cultureScore" | "comments" | "recommendation">) => api.post(`/interviews/${id}/evaluations`, body),
  preview: (id: number) => api.get<ApiResponse<{ subject: string; body: string }>>(`/interviews/${id}/email-preview`).then(r => r.data.data),
  export: (jobId: number) => api.get<Blob>("/interviews/export", { params: { jobId }, responseType: "blob" }).then(r => r.data),
  calendar: (id: number) => api.get<Blob>(`/interviews/${id}/calendar`, { responseType: "blob" }).then(r => r.data),
  mine: () => api.get<ApiResponse<HumanInterview[]>>("/interviews/mine").then(r => r.data.data),
  confirm: (id: number) => api.post(`/interviews/${id}/confirm`),
  requestChange: (id: number, body: { start: string; end: string; reason: string }) => api.post(`/interviews/${id}/reschedule-request`, body),
};
