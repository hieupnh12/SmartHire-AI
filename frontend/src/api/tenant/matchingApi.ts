import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export const matchingApi = {
  rankings: (jobId: number | string) =>
    api.get<ApiResponse<unknown>>(`/jobs/${jobId}/rankings`).then((r) => r.data),
  recompute: (jobId: number | string) =>
    api.post<ApiResponse<unknown>>(`/jobs/${jobId}/rankings/recompute`).then((r) => r.data),
  recommendJobs: () =>
    api.get<ApiResponse<unknown>>("/recommendations/jobs").then((r) => r.data),
  recommendCandidates: (jobId: number | string) =>
    api.get<ApiResponse<unknown>>(`/jobs/${jobId}/recommendations/candidates`).then((r) => r.data),
  overallScore: (applicationId: number | string) =>
    api.get<ApiResponse<unknown>>(`/applications/${applicationId}/overall-score`).then((r) => r.data),
  health: () =>
    api.get<ApiResponse<Record<string, string>>>("/rankings/health").then((r) => r.data),
};
