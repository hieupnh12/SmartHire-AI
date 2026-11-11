import type { ElementType } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bell, Bot, Briefcase, CalendarCheck, CalendarClock, CalendarDays, CalendarX, Check, CircleCheck, ClipboardCheck, CircleX, UserPlus } from "lucide-react";
import type { Notification } from "@/api/types/notification";
import { localizeNotification } from "@/features/tenant/candidate/shared/utils/localizeNotification";
import { notificationPath } from "@/features/tenant/candidate/shared/utils/notificationPath";
import { formatDate, formatDateTime, useLocale, useT } from "@/i18n";
import { cn } from "@/lib/utils";

type KindStyle = { icon: ElementType; tone: string };

const KIND_STYLES: Record<string, KindStyle> = {
  AI_INTERVIEW_INVITATION: { icon: Bot, tone: "bg-violet-50 text-violet-700" },
  AI_INTERVIEW_READY: { icon: Bot, tone: "bg-violet-50 text-violet-700" },
  AI_INTERVIEW_PASSED: { icon: CircleCheck, tone: "bg-emerald-50 text-emerald-700" },
  AI_INTERVIEW_FAILED: { icon: CircleX, tone: "bg-red-50 text-red-700" },
  APPLICATION_REJECTED: { icon: CircleX, tone: "bg-red-50 text-red-700" },
  ASSESSMENT_INVITATION: { icon: ClipboardCheck, tone: "bg-amber-50 text-amber-700" },
  HUMAN_INTERVIEW_INVITATION: { icon: CalendarDays, tone: "bg-sky-50 text-sky-700" },
  HUMAN_INTERVIEW_REMINDER: { icon: CalendarClock, tone: "bg-sky-50 text-sky-700" },
  HUMAN_INTERVIEW_CANCELLED: { icon: CalendarX, tone: "bg-red-50 text-red-700" },
  HUMAN_INTERVIEW_CONFIRMED: { icon: CalendarCheck, tone: "bg-emerald-50 text-emerald-700" },
  HUMAN_INTERVIEW_RESCHEDULE: { icon: CalendarClock, tone: "bg-amber-50 text-amber-700" },
  CANDIDATE_CV_PASSED: { icon: CircleCheck, tone: "bg-emerald-50 text-emerald-700" },
  CANDIDATE_STAGE_ASSESSMENT: { icon: ClipboardCheck, tone: "bg-amber-50 text-amber-700" },
  CANDIDATE_STAGE_AI_INTERVIEW: { icon: Bot, tone: "bg-violet-50 text-violet-700" },
  CANDIDATE_STAGE_HUMAN_INTERVIEW: { icon: CalendarDays, tone: "bg-sky-50 text-sky-700" },
  CANDIDATE_STAGE_OFFER: { icon: CircleCheck, tone: "bg-emerald-50 text-emerald-700" },
  CANDIDATE_STAGE_HIRED: { icon: CircleCheck, tone: "bg-emerald-50 text-emerald-700" },
  STAFF_NEW_APPLICATION: { icon: UserPlus, tone: "bg-blue-50 text-blue-700" },
  STAFF_APPLICATION_WITHDRAWN: { icon: CircleX, tone: "bg-slate-100 text-slate-700" },
  STAFF_JOB_ASSIGNED: { icon: Briefcase, tone: "bg-amber-50 text-amber-700" },
  STAFF_AI_INTERVIEW_COMPLETED: { icon: Bot, tone: "bg-violet-50 text-violet-700" },
  STAFF_ASSESSMENT_SUBMITTED: { icon: ClipboardCheck, tone: "bg-teal-50 text-teal-700" },
  APPLICATION_OFFER: { icon: CircleCheck, tone: "bg-emerald-50 text-emerald-700" },
  OFFER_ACCEPTED: { icon: CircleCheck, tone: "bg-emerald-50 text-emerald-700" },
  OFFER_DECLINED: { icon: CircleX, tone: "bg-red-50 text-red-700" },
};
const FALLBACK_STYLE: KindStyle = { icon: Bell, tone: "bg-slate-100 text-slate-600" };

type Props = { item: Notification; marking: boolean; onRead: () => void };

export function NotificationCard({ item, marking, onRead }: Props) {
  const t = useT();
  const locale = useLocale();
  const kindKey = item.type in KIND_STYLES ? item.type : "FALLBACK";
  const style = KIND_STYLES[item.type] ?? FALLBACK_STYLE;
  const Icon = style.icon;
  const actionText = t(`candidate.core.notifications.kinds.${kindKey}.action`);
  const tagText = t(`candidate.core.notifications.kinds.${kindKey}.tag`);
  const path = notificationPath(item.payloadJson);
  const unread = !item.readAt;
  const { title, body, jobTitle } = localizeNotification(item, t);

  const relativeTime = (value: string) => {
    const date = new Date(value);
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (Number.isNaN(minutes)) return value;
    if (minutes < 1) return t("candidate.core.notifications.time.justNow");
    if (minutes < 60) return t("candidate.core.notifications.time.minutesAgo", { count: minutes });
    if (minutes < 1440) return t("candidate.core.notifications.time.hoursAgo", { count: Math.floor(minutes / 60) });
    if (minutes < 10080) return t("candidate.core.notifications.time.daysAgo", { count: Math.floor(minutes / 1440) });
    return formatDate(value, undefined, locale);
  };

  return <article className={cn("relative flex gap-4 overflow-hidden rounded-2xl border p-4 shadow-[var(--shadow-card)] transition-colors sm:p-5",
    unread ? "border-red-200 bg-red-50/40" : "border-[var(--color-border-default)] bg-white")}>
    {unread && <span className="absolute inset-y-0 left-0 w-1 bg-[var(--color-error)]" aria-hidden="true" />}
    <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", style.tone)}><Icon className="size-5" aria-hidden="true" /></span>

    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className={cn("text-[11px] font-semibold uppercase tracking-[0.08em]", unread ? "text-[var(--color-error)]" : "text-[var(--color-on-surface-variant)]")}>{tagText}</p>
            {jobTitle && <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700">{jobTitle}</span>}
          </div>
          <h2 className={cn("mt-0.5 text-[15px] leading-6", unread ? "font-bold text-[var(--color-error)]" : "font-medium text-[var(--color-on-surface)]/85")}>
            {unread && <span className="sr-only">{t("candidate.core.notifications.unreadSr")} </span>}{title}
          </h2>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          <time dateTime={item.createdAt} title={formatDateTime(item.createdAt, undefined, locale)} className="text-xs text-[var(--color-on-surface-variant)]">{relativeTime(item.createdAt)}</time>
          {unread && <span className="size-2 rounded-full bg-[var(--color-error)]" aria-hidden="true" />}
        </span>
      </div>

      {body && <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm leading-6 text-[var(--color-on-surface-variant)]">{body}</p>}

      {(path || unread) && <div className="mt-3 flex flex-wrap items-center gap-2">
        {path && <Link to={path} onClick={() => { if (unread) onRead(); }} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]">{actionText}<ArrowRight className="size-4" aria-hidden="true" /></Link>}
        {unread && <button type="button" onClick={onRead} disabled={marking} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-[var(--color-error)] hover:bg-white disabled:opacity-50"><Check className="size-4" aria-hidden="true" />{t("candidate.core.notifications.markAsRead")}</button>}
      </div>}
    </div>
  </article>;
}
