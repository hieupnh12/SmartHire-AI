import { cn } from "@/lib/utils";
import { eventKinds } from "../constants/calendarEvents";
import type { CalendarEvent } from "../types/calendar";

const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

type Props = { month: Date; events: CalendarEvent[]; selected: Date; onSelect: (day: Date) => void };

export function CalendarMonth({ month, events, selected, onSelect }: Props) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
  const byDay = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = dayKey(event.at);
    byDay.set(key, [...(byDay.get(key) ?? []), event]);
  }
  const today = dayKey(new Date());

  return <div className="overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-card)]">
    <div className="grid grid-cols-7 border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)]">
      {weekdays.map((day) => <div key={day} className="py-2 text-center text-xs font-semibold text-[var(--color-on-surface-variant)]">{day}</div>)}
    </div>
    <div className="grid grid-cols-7">
      {days.map((day) => {
        const key = dayKey(day);
        const items = byDay.get(key) ?? [];
        const outside = day.getMonth() !== month.getMonth();
        const isSelected = key === dayKey(selected);
        return <button key={key} type="button" onClick={() => onSelect(day)} aria-pressed={isSelected}
          aria-label={`${day.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })}${items.length ? `, ${items.length} sự kiện` : ""}`}
          className={cn("flex min-h-20 flex-col gap-1 border-b border-r border-[var(--color-border-default)] p-1.5 text-left align-top transition-colors hover:bg-[var(--color-primary-subtle)]/50 sm:min-h-28 [&:nth-child(7n)]:border-r-0",
            outside && "bg-slate-50/60 text-slate-400", isSelected && "bg-[var(--color-primary-subtle)] ring-2 ring-inset ring-[var(--color-primary)]")}>
          <span className={cn("grid size-6 place-items-center rounded-full text-xs font-semibold", key === today && "bg-[var(--color-primary)] text-white")}>{day.getDate()}</span>
          <span className="flex gap-1 sm:hidden">{items.slice(0, 4).map((event) => <span key={event.id} className={cn("size-1.5 rounded-full", eventKinds[event.kind].dot)} />)}</span>
          <span className="hidden min-w-0 flex-col gap-1 sm:flex">
            {items.slice(0, 2).map((event) => <span key={event.id} className={cn("truncate rounded border px-1.5 py-0.5 text-[11px] font-medium", eventKinds[event.kind].chip)}>{event.title}</span>)}
            {items.length > 2 && <span className="px-1 text-[11px] font-medium text-[var(--color-on-surface-variant)]">+{items.length - 2} sự kiện</span>}
          </span>
        </button>;
      })}
    </div>
  </div>;
}
