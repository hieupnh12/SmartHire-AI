import { useQuery } from "@tanstack/react-query";
import { notificationApi } from "@/api/tenant/notificationApi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { getTenantIdFromWindow } from "@/lib/tenant";

export function useNotifications(enabled = true, page = 0) {
  const userId = useAuthStore(s => s.user?.id);
  const key = ["notifications", getTenantIdFromWindow(), userId, page] as const;
  const query = useQuery({ queryKey: key, queryFn: () => notificationApi.list(page), enabled: enabled && !!userId, refetchInterval: 15000 });
  return { ...query, queryKey: key };
}
