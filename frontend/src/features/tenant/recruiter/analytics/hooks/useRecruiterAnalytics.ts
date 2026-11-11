import { useQuery } from "@tanstack/react-query";
import { recruiterAnalyticsApi } from "@/api/tenant/recruiterAnalyticsApi";
import { keepPreviousForScope } from "@/components/ux/TableRefresh";
import type {
  AnalyticsFilter,
  AnalyticsRange,
  JobInsightsData,
  JobOverviewData,
  PerformanceData,
  PipelineData,
  QualityData,
  WorkloadData,
} from "../types/recruiterAnalytics";

export type RecruiterAnalyticsTab = "workload" | "pipeline" | "quality" | "performance" | "insights";
export type RecruiterAnalyticsData =
  | WorkloadData
  | PipelineData
  | QualityData
  | PerformanceData
  | JobInsightsData;

export function rangeFilter(range: AnalyticsRange, now = new Date(), jobId?: number): AnalyticsFilter {
  const to = new Date(now);
  const from = new Date(now);
  if (range === "LAST_30_DAYS") from.setUTCDate(from.getUTCDate() - 30);
  if (range === "LAST_12_MONTHS") from.setUTCFullYear(from.getUTCFullYear() - 1);
  if (range === "CURRENT_QUARTER") {
    from.setUTCMonth(Math.floor(from.getUTCMonth() / 3) * 3, 1);
    from.setUTCHours(0, 0, 0, 0);
  }
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    ...(jobId != null ? { jobId } : {}),
  };
}

export function useJobOverview(jobId: number | undefined, range: AnalyticsRange) {
  const filter = rangeFilter(range, new Date(), jobId);
  return useQuery<JobOverviewData>({
    queryKey: ["recruiter-analytics", "job-overview", jobId ?? null, range, filter.from.slice(0, 10)],
    queryFn: () => recruiterAnalyticsApi.jobOverview({ ...filter, jobId: jobId! }),
    enabled: jobId != null,
    placeholderData: keepPreviousForScope(jobId ?? null, 2),
    staleTime: 60_000,
    retry: false,
  });
}

export function useRecruiterAnalytics(
  tab: Exclude<RecruiterAnalyticsTab, "insights">,
  range: AnalyticsRange,
  jobId?: number,
  enabled = true,
) {
  const filter = rangeFilter(range, new Date(), jobId);
  const scopeJobId = jobId ?? null;
  return useQuery<RecruiterAnalyticsData>({
    queryKey: ["recruiter-analytics", tab, scopeJobId, range, filter.from.slice(0, 10)],
    queryFn: () => recruiterAnalyticsApi[tab](filter),
    enabled,
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey?.[1] === tab && previousQuery?.queryKey?.[2] === scopeJobId
        ? previousData
        : undefined,
    staleTime: 60_000,
    retry: false,
  });
}

export function useJobInsights(
  jobId: number | undefined,
  range: AnalyticsRange,
  enabled = true,
) {
  const filter = rangeFilter(range, new Date(), jobId);
  return useQuery<JobInsightsData>({
    queryKey: ["recruiter-analytics", "job-insights", jobId ?? null, range, filter.from.slice(0, 10)],
    queryFn: () => recruiterAnalyticsApi.jobInsights({ ...filter, jobId: jobId! }),
    enabled: jobId != null && enabled,
    placeholderData: keepPreviousForScope(jobId ?? null, 2),
    staleTime: 60_000,
    retry: false,
  });
}
