import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { RankingBoard, RankingConfig, RankingRow, RankingSources, Selection } from "@/features/tenant/recruiter/matching/types/ranking";

export const matchingApi = {
  jobs: () => api.get<ApiResponse<{ id: number; title: string }[]>>("/rankings/jobs").then((r) => r.data),
  rankings: (jobId: number | string) =>
    api.get<ApiResponse<RankingBoard>>(`/jobs/${jobId}/rankings`).then((r) => r.data),
  recompute: (jobId: number | string) =>
    api.post<ApiResponse<RankingBoard>>(`/jobs/${jobId}/rankings/recompute`).then((r) => r.data),
  configure: (jobId: number, config: RankingConfig) =>
    api.put<ApiResponse<RankingBoard>>(`/jobs/${jobId}/rankings/config`, config).then((r) => r.data),
  sources: (applicationId: number) =>
    api.get<ApiResponse<RankingSources>>(`/applications/${applicationId}/ranking-sources`).then((r) => r.data),
  selectSources: (applicationId: number, selection: Selection) =>
    api.put<ApiResponse<RankingBoard>>(`/applications/${applicationId}/ranking-sources`, selection).then((r) => r.data),
  recommendJobs: () =>
    api.get<ApiResponse<unknown>>("/recommendations/jobs").then((r) => r.data),
  recommendCandidates: (jobId: number | string) =>
    api.get<ApiResponse<unknown>>(`/jobs/${jobId}/recommendations/candidates`).then((r) => r.data),
  overallScore: (applicationId: number | string) =>
    api.get<ApiResponse<RankingRow>>(`/applications/${applicationId}/overall-score`).then((r) => r.data),
  health: () =>
    api.get<ApiResponse<Record<string, string>>>("/rankings/health").then((r) => r.data),
};
