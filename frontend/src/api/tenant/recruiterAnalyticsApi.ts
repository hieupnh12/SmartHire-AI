import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { AnalyticsFilter, PerformanceData, PipelineData, QualityData, WorkloadData } from "@/features/tenant/recruiter/analytics/types/recruiterAnalytics";

const get = <T>(path: string, params: AnalyticsFilter) =>
  api.get<ApiResponse<T>>(`/analytics/recruiter/${path}`, { params }).then((response) => response.data.data);

export const recruiterAnalyticsApi = {
  workload: (filter: AnalyticsFilter) => get<WorkloadData>("workload", filter),
  pipeline: (filter: AnalyticsFilter) => get<PipelineData>("pipeline", filter),
  quality: (filter: AnalyticsFilter) => get<QualityData>("quality", filter),
  performance: (filter: AnalyticsFilter) => get<PerformanceData>("performance", filter),
};
