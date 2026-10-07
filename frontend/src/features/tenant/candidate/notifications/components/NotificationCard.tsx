import type { ElementType } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bell, Bot, CalendarClock, CalendarDays, CalendarX, Check, CircleCheck, ClipboardCheck, CircleX } from "lucide-react";
import type { Notification } from "@/api/types/notification";
import { cn } from "@/lib/utils";

type Kind = { icon: ElementType; tone: string; action: string; tag: string };

const KINDS: Record<string, Kind> = {
  AI_INTERVIEW_INVITATION: { icon: Bot, tone: "bg-violet-50 text-violet-700", action: "Xem lời mời", tag: "Phỏng vấn AI" },
  AI_INTERVIEW_READY: { icon: Bot, tone: "bg-violet-50 text-violet-700", action: "Bắt đầu phỏng vấn", tag: "Phỏng vấn AI" },
  AI_INTERVIEW_PASSED: { icon: CircleCheck, tone: "bg-emerald-50 text-emerald-700", action: "Làm bài đánh giá", tag: "Kết quả" },
  AI_INTERVIEW_FAILED: { icon: CircleX, tone: "bg-red-50 text-red-700", action: "Xem kết quả", tag: "Kết quả" },
  ASSESSMENT_INVITATION: { icon: ClipboardCheck, tone: "bg-amber-50 text-amber-700", action: "Làm bài đánh giá", tag: "Bài đánh giá" },
  HUMAN_INTERVIEW_INVITATION: { icon: CalendarDays, tone: "bg-sky-50 text-sky-700", action: "Xác nhận lịch", tag: "Phỏng vấn trực tiếp" },
  HUMAN_INTERVIEW_REMINDER: { icon: CalendarClock, tone: "bg-sky-50 text-sky-700", action: "Xem lịch", tag: "Phỏng vấn trực tiếp" },
  HUMAN_INTERVIEW_CANCELLED: { icon: CalendarX, tone: "bg-red-50 text-red-700", action: "Xem lịch", tag: "Phỏng vấn trực tiếp" },
};
const FALLBACK: Kind = { icon: Bell, tone: "bg-slate-100 text-slate-600", action: "Xem chi tiết", tag: "Thông báo" };

const SAFE_PATH = /^\/(?:interviews\/\d+|assessments(?:\/\d+\/take)?|interview-schedules|schedules|applications(?:\/\d+)?)(?:\?[\w=&%-]*)?$/;

export function notificationPath(payload: string | null): string | null {
  try {
    const value: unknown = JSON.parse(payload ?? "{}");
    if (typeof value === "object" && value !== null && "path" in value && typeof value.path === "string") {
      const path = value.path.replace(/^\/candidate(?=\/)/, "");
      return SAFE_PATH.test(path) ? path : null;
    }
  } catch { /* Notifications without a valid link remain readable. */ }
  return null;
}

type Props = { item: Notification; marking: boolean; onRead: () => void };

export function NotificationCard({ item, marking, onRead }: Props) {
  const kind = KINDS[item.type] ?? FALLBACK;
  const Icon = kind.icon;
  const path = notificationPath(item.payloadJson);
  const unread = !item.readAt;

  return <article className={cn("relative flex gap-4 overflow-hidden rounded-2xl border p-4 shadow-[var(--shadow-card)] transition-colors sm:p-5",
    unread ? "border-[var(--color-border-default)] bg-[var(--color-primary-subtle)]" : "border-[var(--color-border-default)] bg-white")}>
    {unread && <span className="absolute inset-y-0 left-0 w-1 bg-[var(--color-primary)]" aria-hidden="true" />}
    <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", kind.tone)}><Icon className="size-5" aria-hidden="true" /></span>

    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">{kind.tag}</p>
          <h2 className={cn("mt-0.5 text-[15px] leading-6", unread ? "font-semibold text-[var(--color-on-surface)]" : "font-medium text-[var(--color-on-surface)]/85")}>
            {unread && <span className="sr-only">Chưa đọc: </span>}{item.title}
          </h2>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          <time dateTime={item.createdAt} title={new Date(item.createdAt).toLocaleString("vi-VN")} className="text-xs text-[var(--color-on-surface-variant)]">{relativeTime(item.createdAt)}</time>
          {unread && <span className="size-2 rounded-full bg-[var(--color-primary)]" aria-hidden="true" />}
        </span>
      </div>

      {item.body && <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm leading-6 text-[var(--color-on-surface-variant)]">{item.body}</p>}

      {(path || unread) && <div className="mt-3 flex flex-wrap items-center gap-2">
        {path && <Link to={path} onClick={() => { if (unread) onRead(); }} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]">{kind.action}<ArrowRight className="size-4" aria-hidden="true" /></Link>}
        {unread && <button type="button" onClick={onRead} disabled={marking} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-[var(--color-on-surface-variant)] hover:bg-white disabled:opacity-50"><Check className="size-4" aria-hidden="true" />Đánh dấu đã đọc</button>}
      </div>}
    </div>
  </article>;
}

function relativeTime(value: string) {
  const date = new Date(value);
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (Number.isNaN(minutes)) return value;
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ trước`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)} ngày trước`;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
