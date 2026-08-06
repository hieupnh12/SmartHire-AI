import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export const notificationApi = {
  list: () => api.get<ApiResponse<unknown>>("/notifications").then((r) => r.data),
  markRead: (id: number | string) =>
    api.patch<ApiResponse<unknown>>(`/notifications/${id}`, { read: true }).then((r) => r.data),
  health: () =>
    api.get<ApiResponse<Record<string, string>>>("/notifications/health").then((r) => r.data),
};
