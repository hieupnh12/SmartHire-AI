import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { Job, JobCreateRequest } from "../types/job";

export const jobApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<Job[]>>("/jobs", { params }).then((r) => r.data),
  get: (id: number | string) =>
    api.get<ApiResponse<Job>>(`/jobs/${id}`).then((r) => r.data),
  create: (body: JobCreateRequest) =>
    api.post<ApiResponse<Job>>("/jobs", body).then((r) => r.data),
  update: (id: number | string, body: Partial<JobCreateRequest>) =>
    api.put<ApiResponse<Job>>(`/jobs/${id}`, body).then((r) => r.data),
  remove: (id: number | string) =>
    api.delete<ApiResponse<null>>(`/jobs/${id}`).then((r) => r.data),
  publish: (id: number | string) =>
    api.post<ApiResponse<Job>>(`/jobs/${id}/publish`).then((r) => r.data),
  close: (id: number | string) =>
    api.post<ApiResponse<Job>>(`/jobs/${id}/close`).then((r) => r.data),
  skills: (id: number | string) =>
    api.get<ApiResponse<unknown>>(`/jobs/${id}/skills`).then((r) => r.data),
  updateSkills: (id: number | string, body: unknown) =>
    api.put<ApiResponse<unknown>>(`/jobs/${id}/skills`, body).then((r) => r.data),
  stages: (id: number | string) =>
    api.get<ApiResponse<unknown>>(`/jobs/${id}/stages`).then((r) => r.data),
  health: () => api.get<ApiResponse<Record<string, string>>>("/jobs/health").then((r) => r.data),
};
