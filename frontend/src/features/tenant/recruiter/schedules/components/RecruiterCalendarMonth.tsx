import { Video, MapPin } from "lucide-react";
import { formatDate, formatTime, useLocale, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  getInterviewRoundShortLabel,
  getInterviewStatusLabel,
  statusMeta,
  type MockInterview,
} from "../constants/mockInterviews";

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export const dayKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export const coversDay = (interview: MockInterview, day: Date) => {
  const interviewDate = new Date(interview.startsAt);
  return dayKey(interviewDate) === dayKey(day);
};

export const sortInterviewsByTime = (a: MockInterview, b: MockInterview) =>
  new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();

type Props = {
  month: Date;
  interviews: MockInterview[];
  selected: Date;
  onSelect: (day: Date) => void;
};

export function RecruiterCalendarMonth({ month, interviews, selected, onSelect }: Props) {
  const t = useT();
  const locale = useLocale();
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const days = Array.from(
    { length: 42 },
    (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index),
  );

  const byDay = new Map<string, MockInterview[]>();
  for (const item of [...interviews].sort(sortInterviewsByTime)) {
    const key = dayKey(new Date(item.startsAt));
    byDay.set(key, [...(byDay.get(key) ?? []), item]);
  }

  const today = dayKey(new Date());

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white shadow-2xs">
      {/* Weekday Header */}
      <div className="grid grid-cols-7 border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)]">
        {WEEKDAY_KEYS.map((day) => (
          <div
            key={day}
            className="py-2.5 text-center text-xs font-semibold text-[var(--color-on-surface-variant)]"
          >
            {t(`recruiter.ops.schedules.calendar.weekdays.${day}`)}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = dayKey(day);
          const items = byDay.get(key) ?? [];
          const outside = day.getMonth() !== month.getMonth();
          const isSelected = key === dayKey(selected);
          const isToday = key === today;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(day)}
              aria-pressed={isSelected}
              aria-label={`${formatDate(day, {
                weekday: "long",
                day: "numeric",
                month: "long",
              }, locale)}${items.length ? t("recruiter.ops.schedules.calendar.dayInterviewCountAria", { count: items.length }) : ""}`}
              className={cn(
                "group relative flex min-h-[76px] flex-col gap-1 border-b border-r border-[var(--color-border-default)] p-2 text-left align-top transition-colors sm:min-h-[100px] lg:min-h-[116px] [&:nth-child(7n)]:border-r-0",
                outside
                  ? "bg-slate-50/60 text-slate-400"
                  : "bg-white hover:bg-[var(--color-primary-subtle)]/50",
                isSelected &&
                  "bg-[var(--color-primary-subtle)]/80 ring-2 ring-inset ring-brand-primary",
              )}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-xs font-semibold transition-transform duration-150 group-hover:scale-105",
                    isToday
                      ? "bg-brand-primary text-white shadow-sm"
                      : isSelected
                        ? "font-bold text-brand-primary"
                        : "text-[var(--color-on-surface)]",
                  )}
                >
                  {day.getDate()}
                </span>
                {items.length > 0 && (
                  <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 sm:inline-block">
                    {items.length}
                  </span>
                )}
              </div>

              {/* Mobile View: Dots based on Status */}
              <div className="flex flex-wrap gap-1 pt-0.5 sm:hidden">
                {items.slice(0, 3).map((item) => {
                  const sm = statusMeta[item.status];
                  return (
                    <span
                      key={item.id}
                      title={`${item.candidateName} (${getInterviewStatusLabel(item.status, t)} · ${getInterviewRoundShortLabel(item.round, t)})`}
                      className={cn(
                        "size-2 rounded-full",
                        sm?.dot || "bg-brand-primary",
                      )}
                    />
                  );
                })}
                {items.length > 3 && (
                  <span className="text-xs font-bold text-[var(--color-outline)]">+</span>
                )}
              </div>

              {/* Desktop / Tablet View: Event Chips based on Status & Mode */}
              <div className="hidden min-w-0 flex-1 flex-col gap-1 sm:flex">
                {items.slice(0, 2).map((item) => {
                  const startTime = formatTime(item.startsAt, {
                    hour: "2-digit",
                    minute: "2-digit",
                  }, locale);
                  const sm = statusMeta[item.status];
                  return (
                    <div
                      key={item.id}
                      title={`${item.candidateName} · ${item.jobTitle} (${startTime} - ${getInterviewStatusLabel(item.status, t)} · ${getInterviewRoundShortLabel(item.round, t)})`}
                      className={cn(
                        "flex items-center gap-1.5 truncate rounded-md border px-2 py-1 text-xs font-medium transition-all hover:scale-[1.01]",
                        sm?.chip || "border-slate-200 bg-slate-50 text-slate-800",
                      )}
                    >
                      <span
                        className={cn("size-2 shrink-0 rounded-full", sm?.dot || "bg-slate-400")}
                        aria-hidden="true"
                      />
                      {item.mode === "ONLINE" ? (
                        <Video className="size-3 shrink-0 text-sky-600" aria-label="Online" />
                      ) : (
                        <MapPin className="size-3 shrink-0 text-emerald-600" aria-label="Offline" />
                      )}
                      <span className="truncate font-semibold">{item.candidateName}</span>
                      <span className="shrink-0 font-mono text-[11px] opacity-75">{startTime}</span>
                    </div>
                  );
                })}
                {items.length > 2 && (
                  <span className="px-1 text-xs font-medium text-[var(--color-on-surface-variant)]">
                    {t("recruiter.ops.schedules.calendar.moreCandidates", { count: items.length - 2 })}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
