import { LoadingState, Skeleton } from "@/components/ux/Skeleton";

export function AnalyticsLoadingState() {
  return (
    <LoadingState label="Đang tải dữ liệu phân tích" className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-white p-4"><Skeleton className="size-10 rounded-xl" /><Skeleton className="mt-4 h-8 w-16" /><Skeleton className="mt-2 h-4 w-3/4" /></div>)}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-white p-5">
          <Skeleton className="h-5 w-44" /><Skeleton className="mt-2 h-3 w-64 max-w-full" />
          <div className="mt-7 space-y-4">{Array.from({ length: 6 }, (_, index) => <div key={index} className="grid grid-cols-[80px_1fr_32px] items-center gap-3"><Skeleton className="h-3 w-16" /><Skeleton className="h-9 rounded-lg" /><Skeleton className="h-4 w-8" /></div>)}</div>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-white p-5">
          <Skeleton className="h-5 w-36" />
          <div className="mt-5 space-y-3">{Array.from({ length: 4 }, (_, index) => <div key={index} className="rounded-xl border border-[var(--color-border-default)] p-4"><div className="flex justify-between gap-4"><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-14" /></div><Skeleton className="mt-3 h-3 w-40" /></div>)}</div>
        </div>
      </div>
    </LoadingState>
  );
}
