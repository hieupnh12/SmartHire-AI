import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { RankingBoard, RankingPage, RankingQuery, RankingRow, RankingSources, Selection } from "@/features/tenant/recruiter/matching/types/ranking";

export const matchingApi = {
  rankings: (jobId: number | string, query: RankingQuery) =>
    api.get<ApiResponse<RankingPage>>(`/jobs/${jobId}/rankings`, { params: query }).then((r) => r.data),
  detail: (applicationId: number | string) =>
    api.get<ApiResponse<RankingRow>>(`/applications/${applicationId}/ranking-detail`).then((r) => r.data),
  sources: (applicationId: number) =>
    api.get<ApiResponse<RankingSources>>(`/applications/${applicationId}/ranking-sources`).then((r) => r.data),
  selectSources: (applicationId: number, selection: Selection) =>
    api.put<ApiResponse<RankingBoard>>(`/applications/${applicationId}/ranking-sources`, selection).then((r) => r.data),
};
