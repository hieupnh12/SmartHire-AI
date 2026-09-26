import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { DashboardActionItems, DashboardCharts, DashboardSummary, DashboardTrendPoint } from "../types/dashboard";

export const dashboardApi = {
  summary: () =>
    api.get<ApiResponse<DashboardSummary>>("/dashboard/summary").then((r) => r.data),
  actionItems: () =>
    api.get<ApiResponse<DashboardActionItems>>("/dashboard/action-items").then((r) => r.data),
  charts: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<DashboardCharts>>("/dashboard/charts", { params }).then((r) => r.data),
  trends: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<DashboardTrendPoint[]>>("/dashboard/trends", { params }).then((r) => r.data),
  health: () =>
    api.get<ApiResponse<Record<string, string>>>("/dashboard/health").then((r) => r.data),
};
