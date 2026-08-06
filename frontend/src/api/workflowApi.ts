import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export const workflowApi = {
  pipeline: (jobId: number | string) =>
    api.get<ApiResponse<unknown>>(`/jobs/${jobId}/pipeline`).then((r) => r.data),
  move: (applicationId: number | string, body: { stageId: number }) =>
    api.post<ApiResponse<unknown>>(`/applications/${applicationId}/move`, body).then((r) => r.data),
  updateStatus: (applicationId: number | string, body: { status: string; note?: string }) =>
    api.patch<ApiResponse<unknown>>(`/applications/${applicationId}/status`, body).then((r) => r.data),
  statusHistory: (applicationId: number | string) =>
    api.get<ApiResponse<unknown>>(`/applications/${applicationId}/status-history`).then((r) => r.data),
  decide: (applicationId: number | string, body: unknown) =>
    api.post<ApiResponse<unknown>>(`/applications/${applicationId}/decisions`, body).then((r) => r.data),
  health: () =>
    api.get<ApiResponse<Record<string, string>>>("/workflow/health").then((r) => r.data),
};
