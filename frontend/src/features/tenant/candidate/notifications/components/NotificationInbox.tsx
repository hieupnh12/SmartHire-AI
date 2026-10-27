import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ux/Button";
import { Skeleton } from "@/components/ux/Skeleton";
import { useNotifications } from "@/hooks/useNotifications";
import { notificationApi } from "@/api/tenant/notificationApi";
import { getApiErrorMessage } from "@/lib/axios";
import { NotificationCard } from "./NotificationCard";

export function NotificationInbox() {
  const [page, setPage] = useState(0);
  const inbox = useNotifications(true, page);
  const client = useQueryClient();
  const read = useMutation({ mutationFn: notificationApi.markRead, onSuccess: () => client.invalidateQueries({ queryKey: inbox.queryKey.slice(0, 3) }) });
  return <div className="space-y-5">
    {inbox.isPending && (
      <div className="space-y-3" role="status" aria-busy="true">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          </div>
        ))}
        <span className="sr-only">Đang tải thông báo…</span>
      </div>
    )}
    {inbox.isError && <div role="alert"><p>{getApiErrorMessage(inbox.error)}</p><Button onClick={() => void inbox.refetch()}>Thử lại</Button></div>}
    {read.isError && <p role="alert">{getApiErrorMessage(read.error)}</p>}
    {inbox.isSuccess && inbox.data.length === 0 && <p>Chưa có thông báo.</p>}
    {inbox.data && inbox.data.length > 0 && <ul className="space-y-3">{inbox.data.map(item =>
      <li key={item.id}><NotificationCard item={item} marking={read.isPending} onRead={() => read.mutate(item.id)} /></li>,
    )}</ul>}
    <div className="flex gap-3"><Button variant="secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trang trước</Button><Button variant="secondary" disabled={!inbox.data || inbox.data.length < 50} onClick={() => setPage(p => p + 1)}>Trang sau</Button></div>
  </div>;
}
