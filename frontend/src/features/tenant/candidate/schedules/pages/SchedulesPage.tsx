import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { EmptyState } from "@/components/ux/EmptyState";
import { LoadingState, SkeletonCard } from "@/components/ux/Skeleton";
import { getApiErrorMessage } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { CalendarMonth, dayKey } from "../components/CalendarMonth";
import { HumanInterviewActions } from "../components/HumanInterviewActions";
import { eventKinds } from "../constants/calendarEvents";
import { useCandidateCalendar } from "../hooks/useCandidateCalendar";
import type { CalendarEvent } from "../types/calendar";

const timeFormat: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };

export function SchedulesPage() {
  const calendar = useCandidateCalendar();
  const [month, setMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const [selected, setSelected] = useState(() => new Date());
  const [jobId, setJobId] = useState<number | "ALL">("ALL");

  const events = calendar.events.filter((event) => jobId === "ALL" || event.jobId === jobId);
  const dayEvents = events.filter((event) => dayKey(event.at) === dayKey(selected));
  const upcoming = events.filter((event) => event.at.getTime() >= Date.now() && event.kind !== "CANCELLED").slice(0, 5);
  const shiftMonth = (offset: number) => setMonth((value) => new Date(value.getFullYear(), value.getMonth() + offset, 1));
  const goToday = () => { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setSelected(now); };

  return <section className="space-y-6 text-[var(--color-on-surface)]" aria-labelledby="schedules-title">
    <header className="rounded-3xl border border-[var(--color-border-default)] bg-[linear-gradient(135deg,var(--color-primary-subtle),white_58%)] px-5 py-6 shadow-[var(--shadow-card)] sm:px-7">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">Lịch của tôi</p>
      <h1 id="schedules-title" className="mt-2 text-3xl font-semibold tracking-tight">Lịch tuyển dụng</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">Toàn bộ mốc của từng công việc: từ lúc nộp CV, các vòng đánh giá, phỏng vấn AI đến lịch phỏng vấn trực tiếp với nhà tuyển dụng.</p>
    </header>

    {calendar.error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--color-error-container)] p-4 text-sm text-[var(--color-on-error-container)]"><p>{getApiErrorMessage(calendar.error)}</p><Button variant="secondary" size="sm" onClick={calendar.refetch}>Thử lại</Button></div>}
    {calendar.isPending && <LoadingState className="space-y-3" label="Đang tải lịch">{[0, 1].map((item) => <SkeletonCard key={item} className="min-h-40" />)}</LoadingState>}
    {!calendar.isPending && !calendar.error && calendar.events.length === 0 && <EmptyState title="Chưa có sự kiện nào" description="Khi bạn nộp CV, các mốc tuyển dụng của từng công việc sẽ hiện trên lịch này." />}

    {!calendar.isPending && calendar.events.length > 0 && <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" aria-label="Tháng trước" onClick={() => shiftMonth(-1)}><ChevronLeft className="size-4" aria-hidden="true" /></Button>
          <h2 className="min-w-36 text-center text-lg font-semibold capitalize">{month.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}</h2>
          <Button variant="secondary" size="sm" aria-label="Tháng sau" onClick={() => shiftMonth(1)}><ChevronRight className="size-4" aria-hidden="true" /></Button>
          <Button variant="ghost" size="sm" onClick={goToday}>Hôm nay</Button>
        </div>
        <label className="flex items-center gap-2 text-sm"><span className="text-[var(--color-on-surface-variant)]">Công việc</span>
          <select value={jobId} onChange={(event) => setJobId(event.target.value === "ALL" ? "ALL" : Number(event.target.value))} className="min-h-10 max-w-64 rounded-xl border border-[var(--color-border-default)] bg-white px-3 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15">
            <option value="ALL">Tất cả công việc</option>
            {calendar.jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
          </select>
        </label>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--color-on-surface-variant)]" aria-label="Chú thích loại sự kiện">
        {Object.entries(eventKinds).map(([kind, meta]) => <li key={kind} className="flex items-center gap-1.5"><span className={cn("size-2.5 rounded-full", meta.dot)} aria-hidden="true" />{meta.label}</li>)}
      </ul>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <CalendarMonth month={month} events={events} selected={selected} onSelect={(day) => { setSelected(day); if (day.getMonth() !== month.getMonth()) setMonth(new Date(day.getFullYear(), day.getMonth(), 1)); }} />
        <aside className="space-y-5">
          <EventList title={selected.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })} events={dayEvents} empty="Không có sự kiện trong ngày này." />
          <EventList title="Sắp tới" events={upcoming} empty="Không có sự kiện sắp tới." showDate />
        </aside>
      </div>
    </>}

    <HumanInterviewActions />
  </section>;
}

function EventList({ title, events, empty, showDate = false }: { title: string; events: CalendarEvent[]; empty: string; showDate?: boolean }) {
  return <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-[var(--shadow-card)]">
    <h3 className="mb-3 text-sm font-semibold capitalize">{title}</h3>
    {events.length === 0 ? <p className="text-sm text-[var(--color-on-surface-variant)]">{empty}</p> : <ol className="space-y-2">
      {events.map((event) => <li key={event.id}>
        <Link to={event.link} className="flex gap-3 rounded-xl p-2 transition-colors hover:bg-[var(--color-surface-alt)]">
          <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", eventKinds[event.kind].dot)} aria-hidden="true" />
          <span className="min-w-0">
            <span className={cn("block text-sm font-semibold", event.kind === "CANCELLED" && "line-through")}>{event.title}</span>
            <span className="block truncate text-xs text-[var(--color-on-surface-variant)]">{event.jobTitle}</span>
            <span className="block text-xs text-[var(--color-on-surface-variant)]">
              {showDate && `${event.at.toLocaleDateString("vi-VN")} · `}{event.at.toLocaleTimeString("vi-VN", timeFormat)}{event.end && ` – ${event.end.toLocaleTimeString("vi-VN", timeFormat)}`}{event.detail && ` · ${event.detail}`}
            </span>
          </span>
        </Link>
      </li>)}
    </ol>}
  </section>;
}
