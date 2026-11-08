import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "@/api/tenant/notificationApi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { subscribeNotifications } from "@/lib/ws";

/** WebSocket pushes refresh the inbox; slow polling stays as a fallback when the socket is down. */
const FALLBACK_POLL_MS = 60_000;

export function useNotifications(enabled = true, page = 0, jobId?: number) {
  const client = useQueryClient();
  const userId = useAuthStore(s => s.user?.id);
  const token = useAuthStore(s => s.accessToken);
  const tenant = getTenantIdFromWindow();
  const key = ["notifications", tenant, userId, page, jobId] as const;
  const active = enabled && !!userId;
  const query = useQuery({
    queryKey: key,
    queryFn: () => notificationApi.list(page, jobId),
    enabled: active,
    refetchInterval: FALLBACK_POLL_MS,
  });

  useEffect(() => {
    if (!active || !token) return;
    return subscribeNotifications(token, () => void client.invalidateQueries({ queryKey: ["notifications", tenant, userId] }));
  }, [active, client, tenant, token, userId]);

  return { ...query, queryKey: key };
}
