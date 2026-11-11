import { useState } from "react";
import { Link } from "react-router-dom";
import { BriefcaseBusiness, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { EmptyState } from "@/components/ux/EmptyState";
import { LoadingState, SkeletonCard } from "@/components/ux/Skeleton";
import { FilterValueDropdown } from "@/features/tenant/candidate/jobs/pages/TenantCareerPage";
import { formatDate, formatTime, useLocale, useT } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { CalendarMonth, coversDay, isMultiDay, newestFirst } from "../components/CalendarMonth";
import { eventKinds } from "../constants/calendarEvents";
import { useCandidateCalendar } from "../hooks/useCandidateCalendar";
import type { CalendarEvent } from "../types/calendar";

const EVENT_KIND_KEYS = Object.keys(eventKinds) as (keyof typeof eventKinds)[];

export function SchedulesPage() {
  const t = useT();
  const locale = useLocale();
  const calendar = useCandidateCalendar();
  const [month, setMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const [selected, setSelected] = useState(() => new Date());
  const [jobId, setJobId] = useState<number | "ALL">("ALL");

  const events = calendar.events.filter((event) => jobId === "ALL" || event.jobId === jobId);
  const dayEvents = events.filter((event) => coversDay(event, selected)).sort(newestFirst);
  const upcoming = events.filter((event) => event.at.getTime() >= Date.now() && event.kind !== "CANCELLED").slice(0, 5);
  const shiftMonth = (offset: number) => setMonth((value) => new Date(value.getFullYear(), value.getMonth() + offset, 1));
  const goToday = () => { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setSelected(now); };

  return <section className="space-y-6 text-[var(--color-on-surface)]" aria-labelledby="schedules-title">
    <header className="rounded-3xl border border-[var(--color-border-default)] bg-[linear-gradient(135deg,var(--color-primary-subtle),white_58%)] px-5 py-6 shadow-[var(--shadow-card)] sm:px-7">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">{t("candidate.core.schedules.eyebrow")}</p>
      <h1 id="schedules-title" className="mt-2 text-3xl font-semibold tracking-tight">{t("candidate.core.schedules.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">{t("candidate.core.schedules.subtitle")}</p>
    </header>

    {calendar.error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--color-error-container)] p-4 text-sm text-[var(--color-on-error-container)]"><p>{getApiErrorMessage(calendar.error)}</p><Button variant="secondary" size="sm" onClick={calendar.refetch}>{t("common.retry")}</Button></div>}
    {calendar.isPending && <LoadingState className="space-y-3" label={t("candidate.core.schedules.loading")}>{[0, 1].map((item) => <SkeletonCard key={item} className="min-h-40" />)}</LoadingState>}
    {!calendar.isPending && !calendar.error && calendar.events.length === 0 && <EmptyState title={t("candidate.core.schedules.emptyTitle")} description={t("candidate.core.schedules.emptyDesc")} />}

    {!calendar.isPending && calendar.events.length > 0 && <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" aria-label={t("candidate.core.schedules.prevMonthAria")} onClick={() => shiftMonth(-1)}><ChevronLeft className="size-4" aria-hidden="true" /></Button>
          <h2 className="min-w-36 text-center text-lg font-semibold capitalize">{formatDate(month, { month: "long", year: "numeric" }, locale)}</h2>
          <Button variant="secondary" size="sm" aria-label={t("candidate.core.schedules.nextMonthAria")} onClick={() => shiftMonth(1)}><ChevronRight className="size-4" aria-hidden="true" /></Button>
          <Button variant="ghost" size="sm" onClick={goToday}>{t("candidate.core.schedules.today")}</Button>
        </div>
        <div className="w-72 max-w-full">
          <FilterValueDropdown label={t("candidate.core.schedules.filterByJob")} icon={BriefcaseBusiness} value={String(jobId)}
            onChange={(value) => setJobId(value === "ALL" ? "ALL" : Number(value))}
            options={[{ value: "ALL", label: t("candidate.core.schedules.allJobs") }, ...calendar.jobs.map((job) => ({ value: String(job.id), label: job.title }))]} />
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--color-on-surface-variant)]" aria-label={t("candidate.core.schedules.legendAria")}>
        {EVENT_KIND_KEYS.map((kind) => <li key={kind} className="flex items-center gap-1.5"><span className={cn("size-2.5 rounded-full", eventKinds[kind].dot)} aria-hidden="true" />{t(`candidate.core.schedules.eventKinds.${kind}`)}</li>)}
      </ul>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <CalendarMonth month={month} events={events} selected={selected} onSelect={(day) => { setSelected(day); if (day.getMonth() !== month.getMonth()) setMonth(new Date(day.getFullYear(), day.getMonth(), 1)); }} />
        <aside className="space-y-5">
          <EventList title={formatDate(selected, { weekday: "long", day: "numeric", month: "long" }, locale)} events={dayEvents} empty={t("candidate.core.schedules.dayEmpty")} />
          <EventList title={t("candidate.core.schedules.upcomingTitle")} events={upcoming} empty={t("candidate.core.schedules.upcomingEmpty")} showDate />
        </aside>
      </div>
    </>}
  </section>;
}

function EventList({ title, events, empty, showDate = false }: { title: string; events: CalendarEvent[]; empty: string; showDate?: boolean }) {
  const locale = useLocale();
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
              {isMultiDay(event)
                ? `${formatDate(event.at, undefined, locale)} – ${formatDate(event.end!, undefined, locale)}`
                : <>{showDate && `${formatDate(event.at, undefined, locale)} · `}{formatTime(event.at, undefined, locale)}{event.end && ` – ${formatTime(event.end, undefined, locale)}`}</>}
              {event.detail && ` · ${event.detail}`}
            </span>
          </span>
        </Link>
      </li>)}
    </ol>}
  </section>;
}
