import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { CvDetail } from "./types/cv";

export const cvApi = {
  upload: (form: FormData) =>
    api.post<ApiResponse<CvDetail>>("/cvs", form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),
  get: (id: number | string) =>
    api.get<ApiResponse<CvDetail>>(`/cvs/${id}`).then((r) => r.data),
  parse: (id: number | string) =>
    api.post<ApiResponse<CvDetail>>(`/cvs/${id}/parse`).then((r) => r.data),
  extract: (id: number | string) =>
    api.post<ApiResponse<CvDetail>>(`/cvs/${id}/extract`).then((r) => r.data),
  analyze: (id: number | string) =>
    api.post<ApiResponse<CvDetail>>(`/cvs/${id}/analyze`).then((r) => r.data),
  match: (jobId: number | string, cvId: number | string) =>
    api.get<ApiResponse<unknown>>(`/jobs/${jobId}/cvs/${cvId}/match`).then((r) => r.data),
  recomputeMatch: (jobId: number | string, cvId: number | string) =>
    api.post<ApiResponse<unknown>>(`/jobs/${jobId}/cvs/${cvId}/match`).then((r) => r.data),
  health: () => api.get<ApiResponse<Record<string, string>>>("/cvs/health").then((r) => r.data),
};
