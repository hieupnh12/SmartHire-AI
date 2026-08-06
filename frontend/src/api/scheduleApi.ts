import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export const scheduleApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<unknown>>("/schedules", { params }).then((r) => r.data),
  create: (body: unknown) =>
    api.post<ApiResponse<unknown>>("/schedules", body).then((r) => r.data),
  update: (id: number | string, body: unknown) =>
    api.patch<ApiResponse<unknown>>(`/schedules/${id}`, body).then((r) => r.data),
  confirm: (id: number | string) =>
    api.post<ApiResponse<unknown>>(`/schedules/${id}/confirm`).then((r) => r.data),
  health: () =>
    api.get<ApiResponse<Record<string, string>>>("/schedules/health").then((r) => r.data),
};
