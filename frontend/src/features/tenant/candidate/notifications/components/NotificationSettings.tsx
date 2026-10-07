import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Mail } from "lucide-react";
import type { NotificationPreference } from "@/api/types/notification";
import { notificationApi } from "@/api/tenant/notificationApi";
import { Button } from "@/components/ux/Button";
import { LoadingState, SkeletonCard } from "@/components/ux/Skeleton";
import { getApiErrorMessage } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { notificationCategories } from "../constants/notificationCategories";

const queryKey = ["notifications", "preferences"] as const;
type Channel = "webEnabled" | "emailEnabled";

export function NotificationSettings() {
  const client = useQueryClient();
  const preferences = useQuery({ queryKey, queryFn: notificationApi.preferences });
  const save = useMutation({
    mutationFn: notificationApi.updatePreferences,
    onMutate: async (next) => {
      await client.cancelQueries({ queryKey });
      const previous = client.getQueryData<NotificationPreference[]>(queryKey);
      client.setQueryData(queryKey, next);
      return { previous };
    },
    onError: (_error, _next, context) => client.setQueryData(queryKey, context?.previous),
    onSuccess: (data) => client.setQueryData(queryKey, data),
  });

  const toggle = (row: NotificationPreference, channel: Channel) => {
    const rows = preferences.data ?? [];
    save.mutate(rows.map((item) => item.category === row.category ? { ...item, [channel]: !item[channel] } : item));
  };

  if (preferences.isPending) return <LoadingState className="space-y-3" label="Đang tải cài đặt thông báo">{[0, 1, 2].map((item) => <SkeletonCard key={item} className="min-h-24" />)}</LoadingState>;
  if (preferences.isError) return <div role="alert" className="space-y-3 rounded-xl bg-[var(--color-error-container)] p-4 text-sm text-[var(--color-on-error-container)]"><p>{getApiErrorMessage(preferences.error)}</p><Button variant="secondary" onClick={() => void preferences.refetch()}>Thử lại</Button></div>;

  return <div className="space-y-4">
    {save.isError && <p role="alert" className="rounded-xl bg-[var(--color-error-container)] p-4 text-sm text-[var(--color-on-error-container)]">{getApiErrorMessage(save.error)}</p>}
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-card)]">
      <div className="hidden grid-cols-[1fr_120px_120px] items-center gap-4 border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)] sm:grid">
        <span>Loại thông báo</span>
        <span className="flex items-center justify-center gap-1.5"><Bell className="size-4" aria-hidden="true" />Trên web</span>
        <span className="flex items-center justify-center gap-1.5"><Mail className="size-4" aria-hidden="true" />Qua Gmail</span>
      </div>
      {notificationCategories.map((category) => {
        const row = preferences.data.find((item) => item.category === category.key) ?? { category: category.key, webEnabled: true, emailEnabled: true };
        const Icon = category.icon;
        return <div key={category.key} className="grid gap-4 border-b border-[var(--color-border-default)] px-5 py-4 last:border-b-0 sm:grid-cols-[1fr_120px_120px] sm:items-center">
          <div className="flex gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><Icon className="size-5" aria-hidden="true" /></span>
            <div><h3 className="font-semibold">{category.label}</h3><p className="mt-0.5 text-sm text-[var(--color-on-surface-variant)]">{category.description}</p></div>
          </div>
          <ChannelSwitch label={`${category.label} — thông báo trên web`} shortLabel="Trên web" checked={row.webEnabled} disabled={save.isPending} onChange={() => toggle(row, "webEnabled")} />
          <ChannelSwitch label={`${category.label} — thông báo qua Gmail`} shortLabel="Qua Gmail" checked={row.emailEnabled} disabled={save.isPending} onChange={() => toggle(row, "emailEnabled")} />
        </div>;
      })}
    </div>
    <p className="text-xs text-[var(--color-on-surface-variant)]">Thay đổi được lưu ngay. Tắt cả hai kênh, bạn vẫn xem được tiến trình trong mục Đơn đã ứng tuyển và Lịch của tôi.</p>
  </div>;
}

function ChannelSwitch({ label, shortLabel, checked, disabled, onChange }: { label: string; shortLabel: string; checked: boolean; disabled: boolean; onChange: () => void }) {
  return <div className="flex items-center justify-between gap-3 sm:justify-center">
    <span className="text-sm text-[var(--color-on-surface-variant)] sm:sr-only" aria-hidden="true">{shortLabel}</span>
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={onChange}
      className={cn("relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-border-focus)] disabled:opacity-60", checked ? "bg-[var(--color-primary)]" : "bg-slate-300")}>
      <span className={cn("inline-block size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-6" : "translate-x-1")} />
    </button>
  </div>;
}
