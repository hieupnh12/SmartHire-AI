import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { CvDetail, CvSummary, MatchView } from "../types/cv";
import axios from "axios";

export const cvApi = {
  upload: (form: FormData) =>
    api.post<ApiResponse<CvDetail>>("/cvs", form).then((r) => r.data),
  mine: () => api.get<ApiResponse<CvSummary[]>>("/cvs/me").then((r) => r.data),
  get: (id: number | string) =>
    api.get<ApiResponse<CvDetail>>(`/cvs/${id}`).then((r) => r.data),
  file: async (id: number | string) => {
    try {
      const response = await api.get(`/cvs/${id}/file`, { responseType: "blob" });
      return response.data as Blob;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
        try {
          const payload = JSON.parse(await error.response.data.text()) as ApiResponse<unknown>;
          if (payload.message) throw new Error(payload.message);
        } catch (inner) {
          if (inner instanceof Error && inner.name !== "SyntaxError") throw inner;
        }
      }
      throw error;
    }
  },
  remove: (id: number | string) =>
    api.delete<ApiResponse<null>>(`/cvs/${id}`).then((r) => r.data),
  parse: (id: number | string) =>
    api.post<ApiResponse<CvDetail>>(`/cvs/${id}/parse`).then((r) => r.data),
  extract: (id: number | string) =>
    api.post<ApiResponse<null>>(`/cvs/${id}/extract`).then((r) => r.data),
  analyze: (id: number | string) =>
    api.post<ApiResponse<null>>(`/cvs/${id}/analyze`).then((r) => r.data),
  listByJob: (jobId: number | string) =>
    api.get<ApiResponse<CvSummary[]>>(`/jobs/${jobId}/cvs`).then((r) => r.data),
  match: (jobId: number | string, cvId: number | string) =>
    api.get<ApiResponse<MatchView>>(`/jobs/${jobId}/cvs/${cvId}/match`).then((r) => r.data),
  recomputeMatch: (jobId: number | string, cvId: number | string) =>
    api.post<ApiResponse<MatchView>>(`/jobs/${jobId}/cvs/${cvId}/match`).then((r) => r.data),
  health: () => api.get<ApiResponse<Record<string, string>>>("/cvs/health").then((r) => r.data),
};
