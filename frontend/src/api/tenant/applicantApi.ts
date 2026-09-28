import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { ApplicationDetail, ApplicationPage, ApplicationSummary, HistoryView } from "../types/applicant";

export type ApplicationListParams = {
  q?: string;
  status?: string;
  source?: string;
  archived?: boolean;
  page?: number;
  size?: number;
};

export const applicantApi = {
  list: (params: ApplicationListParams & { jobId?: number } = {}) =>
    api.get<ApiResponse<ApplicationPage>>("/applications", { params }).then((r) => r.data),
  listByJob: (jobId: number | string, params: ApplicationListParams = {}) =>
    api.get<ApiResponse<ApplicationPage>>(`/jobs/${jobId}/applications`, { params }).then((r) => r.data),
  apply: (jobId: number | string, body?: Record<string, unknown>) =>
    api.post<ApiResponse<ApplicationSummary>>(`/jobs/${jobId}/applications`, body ?? {}).then((r) => r.data),
  mine: () => api.get<ApiResponse<ApplicationSummary[]>>("/applications/me").then((r) => r.data),
  get: (id: number | string) => api.get<ApiResponse<ApplicationDetail>>(`/applications/${id}`).then((r) => r.data),
  update: (id: number | string, body: Record<string, unknown>) =>
    api.patch<ApiResponse<ApplicationDetail>>(`/applications/${id}`, body).then((r) => r.data),
  changeStatus: (id: number | string, status: string, note?: string) =>
    api.post<ApiResponse<ApplicationDetail>>(`/applications/${id}/status`, { status, note }).then((r) => r.data),
  reject: (id: number | string, note?: string) =>
    api.post<ApiResponse<ApplicationDetail>>(`/applications/${id}/reject`, { note }).then((r) => r.data),
  archive: (id: number | string) =>
    api.post<ApiResponse<ApplicationDetail>>(`/applications/${id}/archive`).then((r) => r.data),
  restore: (id: number | string) =>
    api.post<ApiResponse<ApplicationDetail>>(`/applications/${id}/restore`).then((r) => r.data),
  withdraw: (id: number | string) =>
    api.post<ApiResponse<ApplicationDetail>>(`/applications/${id}/withdraw`).then((r) => r.data),
  history: (id: number | string) =>
    api.get<ApiResponse<HistoryView[]>>(`/applications/${id}/history`).then((r) => r.data),
};
