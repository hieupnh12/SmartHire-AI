import { useQuery } from "@tanstack/react-query";
import { recruiterAnalyticsApi } from "@/api/tenant/recruiterAnalyticsApi";
import type { AnalyticsFilter, AnalyticsRange, PerformanceData, PipelineData, QualityData, WorkloadData } from "../types/recruiterAnalytics";

export type RecruiterAnalyticsTab = "workload" | "pipeline" | "quality" | "performance";
export type RecruiterAnalyticsData = WorkloadData | PipelineData | QualityData | PerformanceData;

export function rangeFilter(range: AnalyticsRange, now = new Date()): AnalyticsFilter {
  const to = new Date(now);
  const from = new Date(now);
  if (range === "LAST_30_DAYS") from.setUTCDate(from.getUTCDate() - 30);
  if (range === "LAST_12_MONTHS") from.setUTCFullYear(from.getUTCFullYear() - 1);
  if (range === "CURRENT_QUARTER") {
    from.setUTCMonth(Math.floor(from.getUTCMonth() / 3) * 3, 1);
    from.setUTCHours(0, 0, 0, 0);
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

export function useRecruiterAnalytics(tab: RecruiterAnalyticsTab, range: AnalyticsRange) {
  const filter = rangeFilter(range);
  return useQuery<RecruiterAnalyticsData>({
    queryKey: ["recruiter-analytics", tab, range, filter.from.slice(0, 10)],
    queryFn: () => recruiterAnalyticsApi[tab](filter),
    staleTime: 60_000,
  });
}
