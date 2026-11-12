import { keepPreviousData } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export { keepPreviousData };

/**
 * Retains cached data while paging, sorting, filtering, or switching ranges
 * within the same entity scope (e.g. same `jobId`), while dropping stale data
 * when switching to a different scope.
 */
export function keepPreviousForScope(
  scopeValue: string | number | null | undefined,
  keyIndex?: number,
) {
  return <TData,>(
    previousData: TData | undefined,
    previousQuery?: { queryKey: readonly unknown[] },
  ): TData | undefined => {
    if (!previousQuery || scopeValue == null) return undefined;
    if (keyIndex != null) {
      return previousQuery.queryKey[keyIndex] === scopeValue ? previousData : undefined;
    }
    return previousQuery.queryKey.includes(scopeValue) ? previousData : undefined;
  };
}

/**
 * Thin indeterminate sweep progress bar rendered along the top edge of a
 * `relative overflow-hidden` table or panel during background refresh.
 */
export function TableRefreshBar({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  if (!active) return null;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-20 h-[2px] overflow-hidden bg-[var(--color-primary)]/15",
        className,
      )}
    >
      <div className="animate-ranking-sweep h-full w-1/3 bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent" />
    </div>
  );
}

