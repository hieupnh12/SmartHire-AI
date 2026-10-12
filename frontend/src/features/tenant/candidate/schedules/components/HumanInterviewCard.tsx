import { Link } from "react-router-dom";
import { CalendarClock, CalendarPlus, CheckCircle2, Clock, ExternalLink, FileText, MapPin, Repeat, Users, Video } from "lucide-react";
import type { HumanInterview } from "@/api/types/humanInterview";
import { StatusPill } from "@/components/ux/StatusPill";
import { statusLabels } from "@/components/ux/humanInterviewUtilities";
import { button, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { RESCHEDULABLE_STATUSES, ROUND_LABELS } from "../constants/humanInterview";

type Props = {
  row: HumanInterview;
  busy: boolean;
  onConfirm: () => void;
  onReschedule: () => void;
  onDownload: () => void;
};

const fmtTime = (value: string) => new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

export function HumanInterviewCard({ row, busy, onConfirm, onReschedule, onDownload }: Props) {
  const start = new Date(row.start);
  const upcoming = start.getTime() > Date.now();
  const durationMinutes = Math.round((new Date(row.end).getTime() - start.getTime()) / 60000);
  const inactive = row.status === "CANCELLED" || row.status === "DONE";

  return (
    <li className={`flex flex-col gap-4 rounded-3xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-[var(--shadow-card)] ${inactive ? "opacity-75" : ""}`}>
      <div className="flex items-start gap-4">
        <div className="flex w-16 shrink-0 flex-col items-center rounded-2xl bg-[var(--color-primary-subtle)] px-2 py-2.5 text-[var(--color-primary)]">
          <span className="text-[11px] font-semibold uppercase">{start.toLocaleDateString("vi-VN", { weekday: "short" })}</span>
          <strong className="text-2xl leading-7">{start.getDate()}</strong>
          <span className="text-[11px] font-medium">Th{start.getMonth() + 1}/{start.getFullYear()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={row.status} label={statusLabels[row.status]} />
            <span className="rounded-full bg-[var(--color-surface-alt)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-on-surface-variant)]">{ROUND_LABELS[row.round]}</span>
          </div>
          <h2 className="mt-2 text-lg font-semibold leading-snug text-[var(--color-on-surface)]">{row.jobTitle}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--color-on-surface-variant)]">
            <Clock className="size-4 shrink-0" aria-hidden="true" />
            {fmtTime(row.start)} – {fmtTime(row.end)} · {durationMinutes} phút
          </p>
        </div>
      </div>

      <dl className="grid gap-2.5 rounded-2xl bg-[var(--color-surface-alt)] p-4 text-sm">
        <div className="flex items-start gap-2.5">
          <dt>{row.mode === "ONLINE" ? <Video className="mt-0.5 size-4 text-[var(--color-primary)]" aria-hidden="true" /> : <MapPin className="mt-0.5 size-4 text-[var(--color-primary)]" aria-hidden="true" />}<span className="sr-only">{row.mode === "ONLINE" ? "Hình thức trực tuyến" : "Địa điểm"}</span></dt>
          <dd className="min-w-0 break-words">
            {row.mode === "ONLINE"
              ? row.meetingUrl
                ? <a className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)] underline-offset-2 hover:underline" href={row.meetingUrl} target="_blank" rel="noreferrer">Tham gia phỏng vấn trực tuyến<ExternalLink className="size-3.5" aria-hidden="true" /></a>
                : "Trực tuyến — link sẽ được gửi sau"
              : row.location || "Địa điểm sẽ được thông báo sau"}
          </dd>
        </div>
        {row.participants.length > 0 && (
          <div className="flex items-start gap-2.5">
            <dt><Users className="mt-0.5 size-4 text-[var(--color-primary)]" aria-hidden="true" /><span className="sr-only">Hội đồng phỏng vấn</span></dt>
            <dd className="min-w-0">{row.participants.map((p) => p.name).join(", ")}</dd>
          </div>
        )}
        {row.configuration.notes && (
          <div className="flex items-start gap-2.5">
            <dt><FileText className="mt-0.5 size-4 text-[var(--color-primary)]" aria-hidden="true" /><span className="sr-only">Ghi chú</span></dt>
            <dd className="min-w-0 whitespace-pre-line text-[var(--color-on-surface-variant)]">{row.configuration.notes}</dd>
          </div>
        )}
      </dl>

      {row.status === "RESCHEDULE_REQUESTED" && (
        <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <Repeat className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>Bạn đã đề nghị đổi giờ{row.configuration.rescheduleReason ? `: ${row.configuration.rescheduleReason}` : ""}. Lịch hiện tại được giữ cho đến khi nhà tuyển dụng phản hồi.</span>
        </p>
      )}

      <div className="mt-auto flex flex-wrap gap-2 border-t border-[var(--color-border-default)] pt-4">
        {row.status === "PROPOSED" && upcoming && (
          <button type="button" className={primary} disabled={busy} onClick={onConfirm}><CheckCircle2 className="size-4" aria-hidden="true" />Xác nhận tham dự</button>
        )}
        {RESCHEDULABLE_STATUSES.includes(row.status) && upcoming && (
          <button type="button" className={button} disabled={busy} onClick={onReschedule}><CalendarClock className="size-4" aria-hidden="true" />Đề nghị đổi giờ</button>
        )}
        <button type="button" className={button} onClick={onDownload}><CalendarPlus className="size-4" aria-hidden="true" />Thêm vào lịch (.ics)</button>
        <Link className={button} to={`/applications/${row.applicationId}`}>Chi tiết đơn</Link>
      </div>
    </li>
  );
}
