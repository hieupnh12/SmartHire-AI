import { cn } from "@/lib/utils";
import { roundMeta, type MockInterview } from "../constants/mockInterviews";

const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

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
    <div className="overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white">
      {/* Weekday Header */}
      <div className="grid grid-cols-7 border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)]">
        {weekdays.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]"
          >
            {day}
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
              aria-label={`${day.toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}${items.length ? `, có ${items.length} lịch phỏng vấn` : ""}`}
              className={cn(
                "group relative flex min-h-[72px] flex-col gap-1 border-b border-r border-[var(--color-border-default)] p-1.5 text-left align-top transition-colors sm:min-h-[96px] lg:min-h-[108px] [&:nth-child(7n)]:border-r-0",
                outside
                  ? "bg-slate-50/50 text-slate-400"
                  : "bg-white hover:bg-[var(--color-primary-subtle)]/40",
                isSelected &&
                  "bg-[var(--color-primary-subtle)]/80 ring-2 ring-inset ring-brand-primary",
              )}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full text-xs font-semibold transition-transform duration-150 group-hover:scale-105",
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
                  <span className="hidden rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 sm:inline-block">
                    {items.length}
                  </span>
                )}
              </div>

              {/* Mobile View: Dots */}
              <div className="flex flex-wrap gap-1 pt-0.5 sm:hidden">
                {items.slice(0, 3).map((item) => (
                  <span
                    key={item.id}
                    title={`${item.candidateName} (${roundMeta[item.round]?.label || item.round})`}
                    className={cn(
                      "size-1.5 rounded-full",
                      roundMeta[item.round]?.dot || "bg-brand-primary",
                    )}
                  />
                ))}
                {items.length > 3 && (
                  <span className="text-[9px] font-bold text-[var(--color-outline)]">+</span>
                )}
              </div>

              {/* Desktop / Tablet View: Event Chips */}
              <div className="hidden min-w-0 flex-1 flex-col gap-1 sm:flex">
                {items.slice(0, 2).map((item) => {
                  const startTime = new Date(item.startsAt).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const meta = roundMeta[item.round];
                  return (
                    <div
                      key={item.id}
                      title={`${item.candidateName} · ${item.jobTitle} (${startTime})`}
                      className={cn(
                        "flex items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-[11px] font-medium transition-transform hover:scale-[1.02]",
                        meta?.chip || "border-slate-200 bg-slate-50 text-slate-800",
                        item.status === "CANCELLED" && "line-through opacity-60",
                      )}
                    >
                      <span
                        className={cn("size-1.5 shrink-0 rounded-full", meta?.dot || "bg-slate-400")}
                        aria-hidden="true"
                      />
                      <span className="truncate font-semibold">{item.candidateName}</span>
                      <span className="shrink-0 text-[10px] opacity-75">{startTime}</span>
                    </div>
                  );
                })}
                {items.length > 2 && (
                  <span className="px-1 text-[10px] font-medium text-[var(--color-on-surface-variant)]">
                    +{items.length - 2} ứng viên khác
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
