import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { Skeleton } from "@/components/ux/Skeleton";
import { useNotifications } from "@/hooks/useNotifications";
import { notificationApi } from "@/api/tenant/notificationApi";
import { getApiErrorMessage } from "@/lib/axios";
import { toast } from "@/stores/toastStore";
import { NotificationCard } from "./NotificationCard";

export function NotificationInbox({ jobId }: { jobId?: number } = {}) {
  const [page, setPage] = useState(0);
  const inbox = useNotifications(true, page, jobId);
  const client = useQueryClient();
  const read = useMutation({
    mutationFn: notificationApi.markRead,
    onSuccess: () => client.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAllRead = useMutation({
    mutationFn: () => notificationApi.markAllRead(jobId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(jobId ? "Đã đánh dấu tất cả thông báo của tin tuyển dụng này là đã đọc" : "Đã đánh dấu tất cả thông báo là đã đọc");
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const hasUnread = inbox.data?.some((item) => !item.readAt) ?? false;

  return <div className="space-y-5">
    {jobId && (
      <div className="flex items-center justify-between rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)]/40 px-4 py-2.5 text-xs text-[var(--color-primary)]">
        <span className="font-semibold">Đang lọc thông báo cho tin tuyển dụng #{jobId}</span>
        <span className="text-[11px] text-[var(--color-on-surface-variant)]">Chỉ hiển thị các hoạt động thuộc công việc này</span>
      </div>
    )}
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
    {inbox.isSuccess && inbox.data.length === 0 && <p className="py-8 text-center text-sm text-[var(--color-on-surface-variant)]">Chưa có thông báo nào.</p>}
    {inbox.data && inbox.data.length > 0 && (
      <>
        {hasUnread && (
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 border border-slate-200">
            <span className="text-xs font-medium text-slate-600">Bạn có thông báo chưa đọc</span>
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:underline disabled:opacity-50"
            >
              <CheckCheck className="size-3.5" aria-hidden="true" />
              Đánh dấu tất cả đã đọc
            </button>
          </div>
        )}
        <ul className="space-y-3">
          {inbox.data.map(item =>
            <li key={item.id}><NotificationCard item={item} marking={read.isPending} onRead={() => read.mutate(item.id)} /></li>,
          )}
        </ul>
      </>
    )}
    <div className="flex gap-3"><Button variant="secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trang trước</Button><Button variant="secondary" disabled={!inbox.data || inbox.data.length < 50} onClick={() => setPage(p => p + 1)}>Trang sau</Button></div>
  </div>;
}
