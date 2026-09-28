import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type {
  JobDetail,
  JobListItem,
  JobPage,
  JobSkillView,
  JobStatus,
  JobUpsertRequest,
  PublicJob,
  StageView,
} from "../types/job";

export const jobApi = {
  search: (params?: { q?: string; status?: JobStatus | ""; department?: string; page?: number; size?: number }) =>
    api.get<ApiResponse<JobPage>>("/jobs", { params }).then((r) => r.data),
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<JobPage>>("/jobs", { params }).then((r) => r.data),
  get: (id: number | string) =>
    api.get<ApiResponse<JobDetail>>(`/jobs/${id}`).then((r) => r.data),
  create: (body: JobUpsertRequest) =>
    api.post<ApiResponse<JobDetail>>("/jobs", body).then((r) => r.data),
  createQuick: (body: { title: string; description?: string }) =>
    api.post<ApiResponse<JobListItem>>("/jobs/quick", body).then((r) => r.data),
  update: (id: number | string, body: JobUpsertRequest) =>
    api.put<ApiResponse<JobDetail>>(`/jobs/${id}`, body).then((r) => r.data),
  remove: (id: number | string) =>
    api.delete<ApiResponse<null>>(`/jobs/${id}`).then((r) => r.data),
  clone: (id: number | string) =>
    api.post<ApiResponse<JobDetail>>(`/jobs/${id}/clone`).then((r) => r.data),
  publish: (id: number | string) =>
    api.post<ApiResponse<JobDetail>>(`/jobs/${id}/publish`).then((r) => r.data),
  unpublish: (id: number | string) =>
    api.post<ApiResponse<JobDetail>>(`/jobs/${id}/unpublish`).then((r) => r.data),
  pause: (id: number | string) =>
    api.post<ApiResponse<JobDetail>>(`/jobs/${id}/pause`).then((r) => r.data),
  close: (id: number | string) =>
    api.post<ApiResponse<JobDetail>>(`/jobs/${id}/close`).then((r) => r.data),
  reopen: (id: number | string) =>
    api.post<ApiResponse<JobDetail>>(`/jobs/${id}/reopen`).then((r) => r.data),
  skills: (id: number | string) =>
    api.get<ApiResponse<JobSkillView[]>>(`/jobs/${id}/skills`).then((r) => r.data),
  updateSkills: (id: number | string, body: { skills: { name: string; category?: string; required: boolean; weight: number; minLevel?: string }[] }) =>
    api.put<ApiResponse<JobSkillView[]>>(`/jobs/${id}/skills`, body).then((r) => r.data),
  published: () =>
    api.get<ApiResponse<{ id: number; title: string; status: string }[]>>("/jobs/published").then((r) => r.data),
  options: () =>
    api.get<ApiResponse<{ id: number; title: string; status: string }[]>>("/jobs/options").then((r) => r.data),
  departments: () =>
    api.get<ApiResponse<string[]>>("/jobs/departments").then((r) => r.data),
  stages: (id: number | string) =>
    api.get<ApiResponse<StageView[]>>(`/jobs/${id}/stages`).then((r) => r.data),
  publicList: (q?: string) =>
    api.get<ApiResponse<PublicJob[]>>("/public/jobs", { params: q ? { q } : undefined }).then((r) => r.data),
  publicGet: (id: number | string) =>
    api.get<ApiResponse<PublicJob>>(`/public/jobs/${id}`).then((r) => r.data),
  health: () => api.get<ApiResponse<Record<string, string>>>("/jobs/health").then((r) => r.data),
};
