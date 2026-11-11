import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type {
  AnalyticsFilter,
  JobInsightsData,
  JobOverviewData,
  PerformanceData,
  PipelineData,
  QualityData,
  WorkloadData,
} from "@/features/tenant/recruiter/analytics/types/recruiterAnalytics";

const get = <T>(path: string, params: AnalyticsFilter) =>
  api.get<ApiResponse<T>>(`/analytics/recruiter/${path}`, { params }).then((response) => response.data.data);

export const recruiterAnalyticsApi = {
  jobOverview: (filter: AnalyticsFilter & { jobId: number }) =>
    get<JobOverviewData>("job-overview", filter),
  workload: (filter: AnalyticsFilter) => get<WorkloadData>("workload", filter),
  pipeline: (filter: AnalyticsFilter) => get<PipelineData>("pipeline", filter),
  quality: (filter: AnalyticsFilter) => get<QualityData>("quality", filter),
  performance: (filter: AnalyticsFilter) => get<PerformanceData>("performance", filter),
  jobInsights: (filter: AnalyticsFilter & { jobId: number }) =>
    get<JobInsightsData>("job-insights", filter),
};
