import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { Notification } from "@/api/types/notification";

export const notificationApi = {
  list: (page = 0) => api.get<ApiResponse<Notification[]>>("/notifications", { params: { page } }).then(r => r.data.data),
  markRead: (id: number | string) => api.patch<ApiResponse<Notification>>(`/notifications/${id}`, { read: true }).then(r => r.data.data),
  health: () => api.get<ApiResponse<Record<string, string>>>("/notifications/health").then(r => r.data),
};
