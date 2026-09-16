import { CalendarClock, Clock3, Video } from "lucide-react";
import { Card } from "@/components/ux/Card";
import { Link } from "react-router-dom";
import { NEXT_INTERVIEW_DATE } from "@/features/tenant/candidate/dashboard/constants/candidateDashboard";

export function UpcomingInterviewCard() {
  return (
    <Card className="flex h-full min-w-0 flex-col justify-between gap-6 rounded-[var(--radius-default)] border-[var(--color-border-default)] bg-[var(--color-surface-alt)] p-6 shadow-none">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid size-11 place-items-center rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] text-brand-primary">
            <CalendarClock className="size-5" aria-hidden="true" />
          </div>
          <span className="text-xs font-medium text-[var(--color-on-surface-variant)]">Lịch minh họa</span>
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-on-surface-variant)]">Lịch phỏng vấn</p>
        <h2 className="mt-2 text-xl font-semibold text-[var(--color-on-surface)]">AI Interview</h2>
        <div className="mt-4 space-y-2 text-sm text-[var(--color-on-surface-variant)]">
          <p className="flex min-w-0 items-center gap-2"><Clock3 className="size-4 shrink-0 text-brand-primary" aria-hidden="true" /><span className="break-words">{NEXT_INTERVIEW_DATE} · 30 phút</span></p>
          <p className="flex min-w-0 items-center gap-2"><Video className="size-4 shrink-0 text-brand-primary" aria-hidden="true" /><span className="break-words">Phòng mở trước 10 phút</span></p>
        </div>
      </div>
      <Link to="/candidate/schedules" className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-default)] bg-brand-primary px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-primary-hover">Xem lịch phỏng vấn</Link>
    </Card>
  );
}
