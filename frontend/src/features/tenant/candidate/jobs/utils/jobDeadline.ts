const BUSINESS_TIME_ZONE = "Asia/Ho_Chi_Minh";
const URGENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1_000;

export type DeadlineInfo = {
  dateLabel: string;
  daysRemaining: number;
  urgent: boolean;
};

export function getDeadlineInfo(deadline?: string | null, now = new Date()): DeadlineInfo | null {
  if (!deadline) return null;

  const dueAt = new Date(deadline);
  if (Number.isNaN(dueAt.getTime()) || dueAt.getTime() <= now.getTime()) return null;

  const remainingMs = dueAt.getTime() - now.getTime();
  return {
    dateLabel: new Intl.DateTimeFormat("vi-VN", {
      timeZone: BUSINESS_TIME_ZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(dueAt),
    daysRemaining: Math.ceil(remainingMs / (24 * 60 * 60 * 1_000)),
    urgent: remainingMs <= URGENT_WINDOW_MS,
  };
}
