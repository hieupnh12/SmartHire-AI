import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { BuilderJobMatch, CvBuilderData, CvDetail, CvSummary, CvWritingRequest, MatchView } from "../types/cv";
import axios from "axios";

/** Blob requests receive JSON errors as a Blob; surface the backend message instead of a generic failure. */
async function rethrowBlobError(error: unknown) {
  if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
    try {
      const payload = JSON.parse(await error.response.data.text()) as ApiResponse<unknown>;
      if (payload.message) throw new Error(payload.message);
    } catch (inner) {
      if (inner instanceof Error && inner.name !== "SyntaxError") throw inner;
    }
  }
}

export const cvApi = {
  upload: (form: FormData) =>
    api.post<ApiResponse<CvDetail>>("/cvs", form).then((r) => r.data),
  createFromBuilder: (data: CvBuilderData) =>
    api.post<ApiResponse<CvDetail>>("/cvs/builder", data).then((r) => r.data),
  updateFromBuilder: (id: number | string, data: CvBuilderData) =>
    api.put<ApiResponse<CvDetail>>(`/cvs/${id}/builder`, data).then((r) => r.data),
  uploadAvatar: (file: Blob) => {
    const form = new FormData();
    form.append("file", file, "avatar.jpg");
    return api.post<ApiResponse<{ url: string }>>("/cvs/builder/avatar", form).then((r) => r.data);
  },
  suggest: (body: CvWritingRequest) =>
    api.post<ApiResponse<{ suggestions: string[] }>>("/cvs/builder/suggestions", body).then((r) => r.data),
  jobMatch: (jobId: number, data: CvBuilderData) =>
    api.post<ApiResponse<BuilderJobMatch>>("/cvs/builder/job-match", data, { params: { jobId } }).then((r) => r.data),
  exportPdf: async (body: { html: string; css: string }) => {
    try {
      const response = await api.post("/cvs/builder/pdf", body, { responseType: "blob", timeout: 60_000 });
      return response.data as Blob;
    } catch (error) {
      await rethrowBlobError(error);
      throw error;
    }
  },
  duplicate: (id: number | string) =>
    api.post<ApiResponse<CvDetail>>(`/cvs/${id}/duplicate`).then((r) => r.data),
  rename: (id: number | string, name: string) =>
    api.patch<ApiResponse<CvDetail>>(`/cvs/${id}/name`, { name }).then((r) => r.data),
  share: (id: number | string) =>
    api.post<ApiResponse<{ token: string }>>(`/cvs/${id}/share`).then((r) => r.data),
  unshare: (id: number | string) =>
    api.delete<ApiResponse<null>>(`/cvs/${id}/share`).then((r) => r.data),
  shared: (token: string) =>
    api.get<ApiResponse<{ builderData: CvBuilderData }>>(`/public/cvs/${encodeURIComponent(token)}`).then((r) => r.data),
  mine: () => api.get<ApiResponse<CvSummary[]>>("/cvs/me").then((r) => r.data),
  get: (id: number | string) =>
    api.get<ApiResponse<CvDetail>>(`/cvs/${id}`).then((r) => r.data),
  file: async (id: number | string) => {
    try {
      const response = await api.get(`/cvs/${id}/file`, { responseType: "blob" });
      return response.data as Blob;
    } catch (error) {
      await rethrowBlobError(error);
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
