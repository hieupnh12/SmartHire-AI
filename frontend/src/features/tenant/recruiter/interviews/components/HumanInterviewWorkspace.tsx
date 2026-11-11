import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bot,
  Calendar,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  List,
  Mail,
  MapPin,
  Search,
  Video,
} from "lucide-react";
import type { HumanInterview, InterviewPage, InterviewSummary } from "@/api/types/humanInterview";
import { Breadcrumb } from "@/components/ux/Breadcrumb";
import { Skeleton } from "@/components/ux/Skeleton";
import { TableRefreshBar } from "@/components/ux/TableRefresh";
import { formatDate, formatTime, useLocale, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  HUMAN_INTERVIEW_STATUSES,
  ROUND_CODES,
  getHumanInterviewStatusLabel,
  getRoundLabel,
  localDate,
} from "./humanInterviewUi";

export type InterviewAction = "edit" | "cancel" | "remind" | "complete" | "scorecard" | "profile" | "preview";

type Props = {
  jobId?: number | string;
  jobTitle: string;
  data?: InterviewPage;
  summary?: InterviewSummary;
  calendarRows: HumanInterview[];
  view: "list" | "calendar";
  week: Date;
  search: string;
  round: string;
  mode: string;
  status: string;
  selected: number[];
  pending: boolean;
  loading: boolean;
  refreshing?: boolean;
  onFilter: (name: "search" | "round" | "mode" | "status", value: string) => void;
  onView: (view: "list" | "calendar") => void;
  onWeek: (offset: number) => void;
  onSelect: (ids: number[]) => void;
  onPage: (page: number) => void;
  onSize: (size: number) => void;
  onNew: () => void;
  onAi: () => void;
  onExport: (format: "ics" | "csv") => void;
  onBulk: (action: "REMIND" | "RESCHEDULE") => void;
  onRemindPending: () => void;
  onAction: (action: InterviewAction, row: HumanInterview) => void;
};

export function HumanInterviewWorkspace(p: Props) {
  const t = useT();
  const locale = useLocale();
  const [exportOpen, setExportOpen] = useState(false);
  const rows = p.data?.items ?? [];
  const total = p.data?.total ?? 0;
  const page = p.data?.page ?? 0;
  const size = p.data?.size ?? 20;

  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(p.week);
    day.setDate(day.getDate() + i);
    return day;
  });

  const scoreCount = (r: HumanInterview) =>
    r.participants.filter((u) => u.role !== "NOTE_TAKER").length;

  return (
    <div className="space-y-4 text-[var(--color-on-surface)]">
      {/* 1. Header: Breadcrumb with actions */}
      <header>
        <Breadcrumb
          items={[
            { label: t("recruiter.interviews.human.workspace.breadcrumbJobs"), to: "/recruiter" },
            ...(p.jobId != null
              ? [{ label: p.jobTitle ?? `#${p.jobId}`, to: `/recruiter/jobs/${p.jobId}` }]
              : []),
            { label: t("recruiter.interviews.human.workspace.breadcrumbHuman") },
          ]}
          actions={
            <>
              <button
                type="button"
                onClick={p.onAi}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-2.5 text-xs font-semibold text-[var(--color-on-surface)] transition-colors hover:border-brand-primary hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary"
              >
                <Bot className="size-3.5" aria-hidden="true" />
                {t("recruiter.interviews.human.workspace.aiInterviewBtn")}
              </button>

              {/* Export Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportOpen((v) => !v)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-2.5 text-xs font-semibold text-[var(--color-on-surface)] transition-colors hover:border-brand-primary hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary"
                >
                  <Download className="size-3.5" aria-hidden="true" />
                  {t("recruiter.interviews.human.workspace.exportBtn")}
                </button>

                {exportOpen && (
                  <div className="absolute right-0 top-[calc(100%+4px)] z-30 w-36 rounded-lg border border-[var(--color-border-default)] bg-white p-1 shadow-lg text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        p.onExport("ics");
                        setExportOpen(false);
                      }}
                      className="block w-full rounded px-2.5 py-1.5 text-left text-xs font-medium hover:bg-[var(--color-surface-alt)]"
                    >
                      {t("recruiter.interviews.human.workspace.exportIcs")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        p.onExport("csv");
                        setExportOpen(false);
                      }}
                      className="block w-full rounded px-2.5 py-1.5 text-left text-xs font-medium hover:bg-[var(--color-surface-alt)]"
                    >
                      {t("recruiter.interviews.human.workspace.exportCsv")}
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={p.onNew}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-primary px-3 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-brand-primary-hover"
              >
                <CalendarPlus className="size-3.5" aria-hidden="true" />
                {t("recruiter.interviews.human.workspace.newScheduleBtn")}
              </button>
            </>
          }
        />
      </header>

      {/* 2. Filter Bar & View Switcher (Flat Toolbar) */}
      <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--color-border-default)] bg-white p-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 sm:w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-outline)]" />
            <input
              type="search"
              placeholder={t("recruiter.interviews.human.workspace.searchPlaceholder")}
              value={p.search}
              onChange={(e) => p.onFilter("search", e.target.value)}
              className="h-8 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] pl-8 pr-2.5 text-xs outline-none focus:border-brand-primary focus:bg-white"
            />
          </div>

          {/* Round Filter */}
          <select
            aria-label={t("recruiter.interviews.human.workspace.roundFilterAria")}
            value={p.round}
            onChange={(e) => p.onFilter("round", e.target.value)}
            className="h-8 rounded-lg border border-[var(--color-border-default)] bg-white px-2 text-xs font-medium text-[var(--color-on-surface)] outline-none focus:border-brand-primary"
          >
            <option value="">{t("recruiter.interviews.human.workspace.allRounds")}</option>
            {ROUND_CODES.map((code) => (
              <option key={code} value={code}>
                {getRoundLabel(code, t)}
              </option>
            ))}
          </select>

          {/* Mode Filter */}
          <select
            aria-label={t("recruiter.interviews.human.workspace.modeFilterAria")}
            value={p.mode}
            onChange={(e) => p.onFilter("mode", e.target.value)}
            className="h-8 rounded-lg border border-[var(--color-border-default)] bg-white px-2 text-xs font-medium text-[var(--color-on-surface)] outline-none focus:border-brand-primary"
          >
            <option value="">{t("recruiter.interviews.human.workspace.allModes")}</option>
            <option value="ONLINE">{t("recruiter.interviews.human.workspace.modeOnline")}</option>
            <option value="OFFLINE">{t("recruiter.interviews.human.workspace.modeOffline")}</option>
          </select>

          {/* Status Filter */}
          <select
            aria-label={t("recruiter.interviews.human.workspace.statusFilterAria")}
            value={p.status}
            onChange={(e) => p.onFilter("status", e.target.value)}
            className="h-8 rounded-lg border border-[var(--color-border-default)] bg-white px-2 text-xs font-medium text-[var(--color-on-surface)] outline-none focus:border-brand-primary"
          >
            <option value="">{t("recruiter.interviews.human.workspace.allStatuses")}</option>
            {HUMAN_INTERVIEW_STATUSES.map((code) => (
              <option key={code} value={code}>
                {getHumanInterviewStatusLabel(code, t)}
              </option>
            ))}
          </select>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 rounded-lg bg-[var(--color-surface-alt)] p-1">
          <button
            type="button"
            aria-pressed={p.view === "list"}
            onClick={() => p.onView("list")}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors",
              p.view === "list"
                ? "bg-white font-semibold text-brand-primary shadow-xs"
                : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]",
            )}
          >
            <List className="size-3.5" />
            {t("recruiter.interviews.human.workspace.viewList")}
          </button>
          <button
            type="button"
            aria-pressed={p.view === "calendar"}
            onClick={() => p.onView("calendar")}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors",
              p.view === "calendar"
                ? "bg-white font-semibold text-brand-primary shadow-xs"
                : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]",
            )}
          >
            <Calendar className="size-3.5" />
            {t("recruiter.interviews.human.workspace.viewCalendar")}
          </button>
        </div>
      </div>

      {/* 3. Bulk Selection Banner */}
      {!!p.selected.length && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-primary/20 bg-[var(--color-primary-soft)] px-3 py-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-brand-primary">
              {t("recruiter.interviews.human.workspace.selectedCount", { count: p.selected.length })}
            </span>
            <button
              type="button"
              disabled={p.pending}
              onClick={() => p.onBulk("REMIND")}
              className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 font-semibold text-brand-primary shadow-xs hover:bg-slate-50"
            >
              <Mail className="size-3" />
              {t("recruiter.interviews.human.workspace.remindPanelBtn")}
            </button>
            <button
              type="button"
              disabled={p.pending}
              onClick={() => p.onBulk("RESCHEDULE")}
              className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 font-semibold text-[var(--color-on-surface)] shadow-xs hover:bg-slate-50"
            >
              <Clock className="size-3" />
              {t("recruiter.interviews.human.workspace.rescheduleBtn")}
            </button>
          </div>
          <button
            type="button"
            onClick={() => p.onSelect([])}
            className="font-medium text-[var(--color-on-surface-variant)] hover:underline"
          >
            {t("recruiter.interviews.human.workspace.clearSelection")}
          </button>
        </div>
      )}



      {/* 4. Main View: List or Calendar */}
      {p.view === "list" ? (
        <div className="relative overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white shadow-xs">
          <TableRefreshBar active={Boolean(p.refreshing)} />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[950px]">
              <thead className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)]/60 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                <tr>
                  <th scope="col" className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label={t("recruiter.interviews.human.workspace.selectAllAria")}
                      checked={rows.length > 0 && rows.every((r) => p.selected.includes(r.id))}
                      onChange={(e) =>
                        p.onSelect(e.target.checked ? rows.map((r) => r.id) : [])
                      }
                      className="rounded border-[var(--color-border-default)]"
                    />
                  </th>
                  <th scope="col" className="px-3 py-2.5">{t("recruiter.interviews.human.workspace.colCandidate")}</th>
                  <th scope="col" className="px-3 py-2.5">{t("recruiter.interviews.human.workspace.colRound")}</th>
                  <th scope="col" className="px-3 py-2.5">{t("recruiter.interviews.human.workspace.colTimePlace")}</th>
                  <th scope="col" className="px-3 py-2.5">{t("recruiter.interviews.human.workspace.colLead")}</th>
                  <th scope="col" className="px-3 py-2.5">{t("recruiter.interviews.human.workspace.colStatus")}</th>
                  <th scope="col" className="px-3 py-2.5">{t("recruiter.interviews.human.workspace.colScorecard")}</th>
                  <th scope="col" className="px-3 py-2.5 text-right">{t("recruiter.interviews.human.workspace.colActions")}</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y divide-[var(--color-border-default)] transition-opacity duration-200", p.refreshing && "opacity-60")}>
                {p.loading && !rows.length && (
                  Array.from({ length: 5 }, (_, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-3"><Skeleton className="size-4 rounded" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-4 w-36" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-3 py-3 text-right"><Skeleton className="ml-auto h-7 w-16 rounded" /></td>
                    </tr>
                  ))
                )}
                {!rows.length && !p.loading && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-[var(--color-on-surface-variant)]">
                      {t("recruiter.interviews.human.workspace.emptyList")}
                    </td>
                  </tr>
                )}
                {rows.map((r) => {
                  const startTime = formatTime(r.start, { hour: "2-digit", minute: "2-digit" }, locale);
                  const endTime = formatTime(r.end, { hour: "2-digit", minute: "2-digit" }, locale);
                  const startDate = formatDate(r.start, undefined, locale);
                  const leadName = r.participants.find((u) => u.role === "LEAD")?.name ?? "—";
                  const initials = r.candidateName
                    .split(" ")
                    .filter(Boolean)
                    .slice(-2)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase();

                  return (
                    <tr key={r.id} className="hover:bg-[var(--color-surface-alt)]/40 transition-colors">
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          aria-label={t("recruiter.interviews.human.workspace.selectRowAria", { name: r.candidateName })}
                          checked={p.selected.includes(r.id)}
                          onChange={(e) =>
                            p.onSelect(
                              e.target.checked
                                ? [...p.selected, r.id]
                                : p.selected.filter((id) => id !== r.id),
                            )
                          }
                          className="rounded border-[var(--color-border-default)]"
                        />
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[10px] font-bold text-brand-primary">
                            {initials}
                          </span>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => p.onAction("profile", r)}
                              className="font-bold text-xs text-[var(--color-on-surface)] hover:text-brand-primary truncate text-left"
                            >
                              {r.candidateName}
                            </button>
                            <p className="truncate text-[11px] text-[var(--color-on-surface-variant)]">
                              {r.candidateEmail}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-2.5">
                        <span className="inline-flex rounded-md bg-[var(--color-surface-alt)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-on-surface)]">
                          {getRoundLabel(r.round, t)}
                        </span>
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-xs text-[var(--color-on-surface)]">
                            {startTime} – {endTime}
                          </p>
                          <p className="text-[11px] text-[var(--color-on-surface-variant)]">
                            {startDate}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] text-brand-primary">
                            {r.mode === "ONLINE" ? (
                              <Video className="size-3 text-sky-600" />
                            ) : (
                              <MapPin className="size-3 text-emerald-600" />
                            )}
                            <span className="truncate max-w-[140px]">
                              {r.mode === "ONLINE" ? r.configuration.provider : r.location}
                            </span>
                            {r.mode === "ONLINE" && (r.meetingUrl || r.configuration.provider === "SMARTHIRE") && new Date(r.end).getTime() > Date.now() && (
                              r.configuration.provider === "SMARTHIRE" || (r.meetingUrl?.includes("/meet/human/") ?? false) ? (
                                <Link to={`/meet/human/${r.id}`} className="ml-1 underline font-semibold text-[10px]">
                                  {t("recruiter.interviews.human.workspace.joinMeeting")}
                                </Link>
                              ) : (
                                <a href={r.meetingUrl!} target="_blank" rel="noreferrer" className="ml-1 underline font-semibold text-[10px]">
                                  {t("recruiter.interviews.human.workspace.joinMeeting")}
                                </a>
                              )
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium text-[11px] text-[var(--color-on-surface)]">
                            {leadName}
                          </span>
                          <span className="rounded bg-slate-100 px-1 py-0.2 text-[9px] font-semibold text-slate-600">
                            {t("recruiter.interviews.human.workspace.leadBadge")}
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            r.status === "CONFIRMED"
                              ? "bg-emerald-50 text-emerald-700"
                              : r.status === "PROPOSED"
                                ? "bg-amber-50 text-amber-700"
                                : r.status === "RESCHEDULE_REQUESTED"
                                  ? "bg-orange-50 text-orange-700"
                                  : r.status === "DONE"
                                    ? "bg-slate-100 text-slate-700"
                                    : "bg-red-50 text-red-700 line-through",
                          )}
                        >
                          {getHumanInterviewStatusLabel(r.status, t)}
                        </span>
                      </td>

                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => p.onAction("scorecard", r)}
                          className="font-semibold text-brand-primary hover:underline text-[11px]"
                        >
                          {t("recruiter.interviews.human.workspace.scorecardsCount", {
                            submitted: r.evaluations.length,
                            total: scoreCount(r),
                          })}
                        </button>
                      </td>

                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {r.status !== "DONE" && r.status !== "CANCELLED" && new Date(r.end).getTime() <= Date.now() && (
                            <button
                              type="button"
                              disabled={p.pending}
                              onClick={() => p.onAction("complete", r)}
                              className="rounded px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50"
                            >
                              {t("recruiter.interviews.human.workspace.completeSession")}
                            </button>
                          )}
                          {r.status !== "DONE" && r.status !== "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() => p.onAction("edit", r)}
                              className="rounded px-2 py-1 text-[11px] font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface-alt)]"
                            >
                              {t("recruiter.interviews.human.workspace.edit")}
                            </button>
                          )}
                          {r.status !== "DONE" && r.status !== "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() => p.onAction("cancel", r)}
                              className="rounded px-1.5 py-1 text-[11px] text-red-600 hover:bg-red-50"
                            >
                              {t("recruiter.interviews.human.workspace.cancel")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Pagination */}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-default)] px-4 py-2.5 text-xs text-[var(--color-on-surface-variant)]">
            <span>
              {t("recruiter.interviews.human.workspace.showingRange", {
                from: total ? page * size + 1 : 0,
                to: Math.min((page + 1) * size, total),
                total,
              })}
            </span>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5">
                {t("recruiter.interviews.human.workspace.perPageLabel")}
                <select
                  aria-label={t("recruiter.interviews.human.workspace.perPageAria")}
                  value={size}
                  onChange={(e) => p.onSize(Number(e.target.value))}
                  className="rounded border border-[var(--color-border-default)] bg-white px-2 py-0.5 text-xs font-medium"
                >
                  {[10, 20, 50].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={t("recruiter.interviews.human.workspace.prevPageAria")}
                  disabled={page === 0 || p.loading}
                  onClick={() => p.onPage(page - 1)}
                  className="grid size-7 place-items-center rounded border border-[var(--color-border-default)] disabled:opacity-40"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <span className="px-1 text-xs tabular-nums">
                  {page + 1} / {Math.max(1, Math.ceil(total / size))}
                </span>
                <button
                  type="button"
                  aria-label={t("recruiter.interviews.human.workspace.nextPageAria")}
                  disabled={(page + 1) * size >= total || p.loading}
                  onClick={() => p.onPage(page + 1)}
                  className="grid size-7 place-items-center rounded border border-[var(--color-border-default)] disabled:opacity-40"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          </footer>
        </div>
      ) : (
        /* Calendar Week View */
        <div className="relative overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white p-3.5">
          <TableRefreshBar active={Boolean(p.refreshing)} />
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-default)] pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={t("recruiter.interviews.human.workspace.prevWeekAria")}
                onClick={() => p.onWeek(-1)}
                className="grid size-7 place-items-center rounded border border-[var(--color-border-default)] hover:bg-[var(--color-surface-alt)]"
              >
                <ChevronLeft className="size-4" />
              </button>
              <h2 className="text-sm font-bold text-[var(--color-on-surface)] min-w-44 text-center">
                {t("recruiter.interviews.human.workspace.weekRange", {
                  from: formatDate(p.week, undefined, locale),
                  to: formatDate(days[6], undefined, locale),
                })}
              </h2>
              <button
                type="button"
                aria-label={t("recruiter.interviews.human.workspace.nextWeekAria")}
                onClick={() => p.onWeek(1)}
                className="grid size-7 place-items-center rounded border border-[var(--color-border-default)] hover:bg-[var(--color-surface-alt)]"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-[var(--color-on-surface-variant)]">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-brand-primary" />
                {t("recruiter.interviews.human.rounds.shortTechnical")}
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-500" />
                {t("recruiter.interviews.human.rounds.shortCulture")}
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-amber-500" />
                {t("recruiter.interviews.human.rounds.shortExecutive")}
              </span>
            </div>
          </div>

          <div className={cn("overflow-x-auto transition-opacity duration-200", p.refreshing && "opacity-60")}>
            <div className="grid grid-cols-7 gap-2 min-w-[850px]">
              {days.map((day) => {
                const dayStr = localDate(day);
                const isToday = dayStr === localDate(new Date());
                const dayInterviews = p.calendarRows.filter(
                  (r) => localDate(new Date(r.start)) === dayStr,
                );

                return (
                  <div key={dayStr} className="space-y-1.5">
                    <div
                      className={cn(
                        "rounded-lg p-1.5 text-center text-xs font-semibold",
                        isToday
                          ? "bg-brand-primary text-white"
                          : "bg-[var(--color-surface-alt)] text-[var(--color-on-surface)]",
                      )}
                    >
                      {formatDate(
                        day,
                        {
                          weekday: "short",
                          day: "2-digit",
                          month: "2-digit",
                        },
                        locale,
                      )}
                    </div>

                    <div className="min-h-[200px] rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-alt)]/30 p-1 space-y-1.5">
                      {dayInterviews.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => p.onAction("edit", r)}
                          className="block w-full rounded-md border border-[var(--color-border-default)] bg-white p-2 text-left text-xs transition-colors hover:border-brand-primary hover:bg-[var(--color-primary-subtle)]/40 shadow-xs"
                        >
                          <span className="text-[10px] font-bold text-brand-primary block">
                            {formatTime(
                              r.start,
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                              locale,
                            )}
                          </span>
                          <p className="font-bold text-[11px] text-[var(--color-on-surface)] truncate">
                            {r.candidateName}
                          </p>
                          <span className="text-[10px] text-[var(--color-outline)] block truncate">
                            {getRoundLabel(r.round, t)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
