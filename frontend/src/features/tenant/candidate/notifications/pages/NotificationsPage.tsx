import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ux/Button";
import { useNotifications } from "@/hooks/useNotifications";
import { notificationApi } from "@/api/tenant/notificationApi";
import { getApiErrorMessage } from "@/lib/axios";

function invitationPath(payload: string | null): string | null {
  try {
    const value: unknown = JSON.parse(payload ?? "{}");
    if (typeof value === "object" && value !== null && "path" in value
        && typeof value.path === "string" && /^\/(?:candidate\/)?interviews\/\d+$/.test(value.path)) return value.path.replace(/^\/candidate/, "");
  } catch { /* Notifications without a valid link remain readable. */ }
  return null;
}

export function NotificationsPage() {
  const [page, setPage] = useState(0);
  const inbox = useNotifications(true, page);
  const client = useQueryClient();
  const read = useMutation({ mutationFn: notificationApi.markRead, onSuccess: () => client.invalidateQueries({ queryKey: inbox.queryKey.slice(0, 3) }) });
  return <section className="space-y-5 text-[var(--color-on-surface)]">
    <h1 className="text-3xl font-semibold">Thông báo</h1>
    {inbox.isPending && <p role="status">Đang tải thông báo…</p>}
    {inbox.isError && <div role="alert"><p>{getApiErrorMessage(inbox.error)}</p><Button onClick={() => void inbox.refetch()}>Thử lại</Button></div>}
    {read.isError && <p role="alert">{getApiErrorMessage(read.error)}</p>}
    {inbox.isSuccess && inbox.data.length === 0 && <p>Chưa có thông báo.</p>}
    {inbox.data?.map(item => {
      const path = invitationPath(item.payloadJson);
      return <article key={item.id} className="space-y-3 rounded-xl border border-[var(--color-border-default)] bg-surface-card p-5">
        <h2 className="font-semibold">{item.title}{!item.readAt && <span className="ml-3 text-sm text-brand-primary">Chưa đọc</span>}</h2>
        <p>{item.body}</p>
        <p className="text-sm text-[var(--color-on-surface-variant)]">{new Date(item.createdAt).toLocaleString("vi-VN")}</p>
        <div className="flex flex-wrap gap-3">
          {path && <Link className="inline-flex min-h-11 items-center text-brand-primary underline" to={path} onClick={() => { if (!item.readAt) read.mutate(item.id); }}>Xem lời mời AI Interview</Link>}
          {!item.readAt && <Button variant="secondary" disabled={read.isPending} onClick={() => read.mutate(item.id)}>Đánh dấu đã đọc</Button>}
        </div>
      </article>;
    })}
    <div className="flex gap-3"><Button variant="secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Trang trước</Button><Button variant="secondary" disabled={!inbox.data || inbox.data.length < 50} onClick={() => setPage(p => p + 1)}>Trang sau</Button></div>
  </section>;
}
