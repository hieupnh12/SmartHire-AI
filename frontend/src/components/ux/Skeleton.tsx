import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "skeleton-shimmer rounded-[var(--radius-md)]",
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return <div className={cn("space-y-2.5", className)} aria-hidden="true">{Array.from({ length: lines }, (_, index) => <Skeleton key={index} className={cn("h-3.5", index === lines - 1 ? "w-2/3" : "w-full")} />)}</div>;
}

export function SkeletonCard({ className }: { className?: string }) {
  return <div className={cn("rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5", className)}><div className="flex items-start gap-3"><Skeleton className="size-11 shrink-0 rounded-full" /><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-2/5" /><Skeleton className="h-3 w-3/5" /></div></div><SkeletonText className="mt-5" /></div>;
}

export function TableSkeleton({ columns = 5, rows = 5 }: { columns?: number; rows?: number }) {
  const gridStyle = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };
  return <div className="min-w-[42rem] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)]" aria-hidden="true"><div className="grid gap-4 bg-[var(--color-surface-alt)] px-5 py-3" style={gridStyle}>{Array.from({ length: columns }, (_, index) => <Skeleton key={index} className="h-3 w-2/3" />)}</div>{Array.from({ length: rows }, (_, row) => <div key={row} className="grid gap-4 border-t border-[var(--color-border-default)] px-5 py-4" style={gridStyle}>{Array.from({ length: columns }, (_, column) => <Skeleton key={column} className={cn("h-4", column === 0 ? "w-4/5" : "w-2/3")} />)}</div>)}</div>;
}

export function LoadingState({ children, label = "Đang tải dữ liệu", className }: { children: ReactNode; label?: string; className?: string }) {
  return <div className={className} role="status" aria-busy="true" aria-label={label}>{children}<span className="sr-only">{label}</span></div>;
}

export function PageSkeleton({ variant = "page", className }: { variant?: "page" | "list" | "detail" | "form"; className?: string }) {
  if (variant === "list") return <LoadingState className={cn("space-y-5", className)}><PageHeading /><div className="flex gap-3"><Skeleton className="h-11 w-full max-w-sm" /><Skeleton className="h-11 w-44" /></div><div className="overflow-x-auto"><TableSkeleton /></div></LoadingState>;
  if (variant === "detail") return <LoadingState className={cn("space-y-6", className)}><PageHeading /><div className="grid gap-6 lg:grid-cols-3"><SkeletonCard className="min-h-64 lg:col-span-2" /><SkeletonCard className="min-h-64" /></div><SkeletonCard /></LoadingState>;
  if (variant === "form") return <LoadingState className={cn("space-y-6", className)}><PageHeading /><div className="grid gap-5 rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-6 sm:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <div key={index} className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-11 w-full" /></div>)}</div></LoadingState>;
  return <LoadingState className={cn("space-y-6", className)}><PageHeading /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <SkeletonCard key={index} />)}</div><SkeletonCard className="min-h-56" /></LoadingState>;
}

function PageHeading() {
  return <div className="space-y-3"><Skeleton className="h-8 w-64 max-w-[66.666%]" /><Skeleton className="h-4 w-full max-w-xl" /></div>;
}
