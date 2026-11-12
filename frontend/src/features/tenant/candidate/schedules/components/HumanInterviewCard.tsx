import { Link } from "react-router-dom";
import { CalendarClock, CalendarPlus, CheckCircle2, Clock, ExternalLink, FileText, MapPin, Repeat, Users, Video } from "lucide-react";
import type { HumanInterview } from "@/api/types/humanInterview";
import { StatusPill } from "@/components/ux/StatusPill";
import { getHumanInterviewStatusLabel } from "@/components/ux/humanInterviewUtilities";
import { button, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { humanInterviewJoinHref, isSmartHireMeeting } from "@/features/tenant/shared/humanInterview/meetingRoom";
import { formatDate, formatTime, useLocale, useT } from "@/i18n";
import { RESCHEDULABLE_STATUSES } from "../constants/humanInterview";

type Props = {
  row: HumanInterview;
  busy: boolean;
  onConfirm: () => void;
  onReschedule: () => void;
  onDownload: () => void;
};

export function HumanInterviewCard({ row, busy, onConfirm, onReschedule, onDownload }: Props) {
  const t = useT();
  const locale = useLocale();
  const start = new Date(row.start);
  const end = new Date(row.end);
  const upcoming = start.getTime() > Date.now();
  const isActive = end.getTime() > Date.now();
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const inactive = row.status === "CANCELLED" || row.status === "DONE";
  const roundKey = `candidate.core.schedules.humanRound.${row.round}`;
  const roundLabel = t(roundKey);

  return (
    <li className={`flex flex-col gap-4 rounded-3xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-[var(--shadow-card)] ${inactive ? "opacity-75" : ""}`}>
      <div className="flex items-start gap-4">
        <div className="flex w-16 shrink-0 flex-col items-center rounded-2xl bg-[var(--color-primary-subtle)] px-2 py-2.5 text-[var(--color-primary)]">
          <span className="text-[11px] font-semibold uppercase">{formatDate(start, { weekday: "short" }, locale)}</span>
          <strong className="text-2xl leading-7">{start.getDate()}</strong>
          <span className="text-[11px] font-medium">{t("candidate.core.schedules.human.monthYear", { month: start.getMonth() + 1, year: start.getFullYear() })}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={row.status} label={getHumanInterviewStatusLabel(row.status, t)} />
            <span className="rounded-full bg-[var(--color-surface-alt)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-on-surface-variant)]">{roundLabel === roundKey ? row.round : roundLabel}</span>
          </div>
          <h2 className="mt-2 text-lg font-semibold leading-snug text-[var(--color-on-surface)]">{row.jobTitle}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--color-on-surface-variant)]">
            <Clock className="size-4 shrink-0" aria-hidden="true" />
            {formatTime(row.start, undefined, locale)} – {formatTime(row.end, undefined, locale)} · {t("candidate.core.schedules.human.durationMinutes", { minutes: durationMinutes })}
          </p>
        </div>
      </div>

      <dl className="grid gap-2.5 rounded-2xl bg-[var(--color-surface-alt)] p-4 text-sm">
        <div className="flex items-start gap-2.5">
          <dt>{row.mode === "ONLINE" ? <Video className="mt-0.5 size-4 text-[var(--color-primary)]" aria-hidden="true" /> : <MapPin className="mt-0.5 size-4 text-[var(--color-primary)]" aria-hidden="true" />}<span className="sr-only">{row.mode === "ONLINE" ? t("candidate.core.schedules.human.onlineModeSr") : t("candidate.core.schedules.human.locationSr")}</span></dt>
          <dd className="min-w-0 break-words">
            {row.mode === "ONLINE"
              ? (() => {
                const href = humanInterviewJoinHref(row);
                if (!href) return t("candidate.core.schedules.human.onlinePendingLink");
                if (!isActive) return t("candidate.core.schedules.human.onlineEnded");
                if (isSmartHireMeeting(row)) {
                  return <Link className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)] underline-offset-2 hover:underline" to={href}>{t("candidate.core.schedules.human.joinSmartHireMeeting")}<Video className="size-3.5" aria-hidden="true" /></Link>;
                }
                return <a className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)] underline-offset-2 hover:underline" href={href} target="_blank" rel="noreferrer">{t("candidate.core.schedules.human.joinExternalMeeting")}<ExternalLink className="size-3.5" aria-hidden="true" /></a>;
              })()
              : row.location || t("candidate.core.schedules.human.locationPending")}
          </dd>
        </div>
        {row.participants.length > 0 && (
          <div className="flex items-start gap-2.5">
            <dt><Users className="mt-0.5 size-4 text-[var(--color-primary)]" aria-hidden="true" /><span className="sr-only">{t("candidate.core.schedules.human.panelSr")}</span></dt>
            <dd className="min-w-0">{row.participants.map((p) => p.name).join(", ")}</dd>
          </div>
        )}
        {row.configuration.notes && (
          <div className="flex items-start gap-2.5">
            <dt><FileText className="mt-0.5 size-4 text-[var(--color-primary)]" aria-hidden="true" /><span className="sr-only">{t("candidate.core.schedules.human.notesSr")}</span></dt>
            <dd className="min-w-0 whitespace-pre-line text-[var(--color-on-surface-variant)]">{row.configuration.notes}</dd>
          </div>
        )}
      </dl>

      {row.status === "RESCHEDULE_REQUESTED" && (
        <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <Repeat className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {row.configuration.rescheduleReason
              ? t("candidate.core.schedules.human.rescheduleRequestedWithReason", { reason: row.configuration.rescheduleReason })
              : t("candidate.core.schedules.human.rescheduleRequested")}
          </span>
        </p>
      )}

      <div className="mt-auto flex flex-wrap gap-2 border-t border-[var(--color-border-default)] pt-4">
        {row.status === "PROPOSED" && upcoming && (
          <button type="button" className={primary} disabled={busy} onClick={onConfirm}><CheckCircle2 className="size-4" aria-hidden="true" />{t("candidate.core.schedules.human.confirmAttendance")}</button>
        )}
        {RESCHEDULABLE_STATUSES.includes(row.status) && upcoming && (
          <button type="button" className={button} disabled={busy} onClick={onReschedule}><CalendarClock className="size-4" aria-hidden="true" />{t("candidate.core.schedules.human.requestReschedule")}</button>
        )}
        <button type="button" className={button} onClick={onDownload}><CalendarPlus className="size-4" aria-hidden="true" />{t("candidate.core.schedules.human.addToCalendar")}</button>
        <Link className={button} to={`/applications/${row.applicationId}`}>{t("candidate.core.schedules.human.applicationDetail")}</Link>
      </div>
    </li>
  );
}
