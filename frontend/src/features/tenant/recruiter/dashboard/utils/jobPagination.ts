import type { JobListItem } from "@/api/types/job";

export const JOB_PAGE_SIZE_OPTIONS = [5, 10, 20] as const;
export const DEFAULT_JOB_PAGE_SIZE = 5;
export const EXPIRING_SOON_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

export function parsePageParam(raw: string | null): number {
  if (!raw || !/^\d+$/.test(raw)) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed - 1 : 0;
}

export function parsePageSizeParam(raw: string | null): number {
  if (!raw || !/^\d+$/.test(raw)) return DEFAULT_JOB_PAGE_SIZE;
  const parsed = Number.parseInt(raw, 10);
  return (JOB_PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
    ? parsed
    : DEFAULT_JOB_PAGE_SIZE;
}

export function computeTotalPages(totalItems: number, pageSize: number): number {
  if (totalItems <= 0) return 0;
  return Math.ceil(totalItems / Math.max(1, pageSize));
}

export function clampPageIndex(page: number, totalPages: number): number {
  if (totalPages <= 0) return 0;
  return Math.max(0, Math.min(page, totalPages - 1));
}

export function getPaginationItems(currentPageOneBased: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 0) return [];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const clamped = Math.max(1, Math.min(currentPageOneBased, totalPages));
  const showStartEllipsis = clamped > 4;
  const showEndEllipsis = clamped < totalPages - 3;

  if (!showStartEllipsis && showEndEllipsis) {
    return [1, 2, 3, 4, 5, "ellipsis-end", totalPages];
  }
  if (showStartEllipsis && !showEndEllipsis) {
    return [1, "ellipsis-start", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "ellipsis-start", clamped - 1, clamped, clamped + 1, "ellipsis-end", totalPages];
}

export function isExpiringWithinWindow(
  job: Pick<JobListItem, "deadline">,
  nowMs = Date.now(),
  windowMs = EXPIRING_SOON_WINDOW_MS,
): boolean {
  if (!job.deadline) return false;
  const deadlineMs = new Date(job.deadline).getTime();
  if (!Number.isFinite(deadlineMs)) return false;
  const remaining = deadlineMs - nowMs;
  return remaining >= 0 && remaining <= windowMs;
}

export function slicePageItems<T>(items: readonly T[], page: number, pageSize: number): T[] {
  const safeSize = Math.max(1, pageSize);
  const totalPages = computeTotalPages(items.length, safeSize);
  const safePage = clampPageIndex(page, totalPages);
  const start = safePage * safeSize;
  return items.slice(start, start + safeSize);
}

