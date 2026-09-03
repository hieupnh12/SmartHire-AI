import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { Application } from "../types/applicant";

export const applicantApi = {
  listByJob: (jobId: number | string) =>
    api.get<ApiResponse<Application[]>>(`/jobs/${jobId}/applications`).then((r) => r.data),
  apply: (jobId: number | string, body?: Record<string, unknown>) =>
    api.post<ApiResponse<Application>>(`/jobs/${jobId}/applications`, body ?? {}).then((r) => r.data),
  update: (id: number | string, body: Partial<Application>) =>
    api.patch<ApiResponse<Application>>(`/applications/${id}`, body).then((r) => r.data),
  health: () =>
    api.get<ApiResponse<Record<string, string>>>("/applications/health").then((r) => r.data),
};
