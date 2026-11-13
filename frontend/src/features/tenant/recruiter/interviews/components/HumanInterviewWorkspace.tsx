import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Download,
  List,
  Loader2,
  Mail,
  MapPin,
  Search,
  Star,
  Video,
  X,
} from "lucide-react";
import type { HumanInterview, InterviewPage, InterviewSummary } from "@/api/types/humanInterview";
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

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

function getPaginationItems(current: number, total: number): (number | "ellipsis-start" | "ellipsis-end")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "ellipsis-end", total];
  if (current >= total - 3) return [1, "ellipsis-start", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "ellipsis-start", current - 1, current, current + 1, "ellipsis-end", total];
}

function StatusBadge({ status }: { status: HumanInterview["status"] }) {
  const t = useT();
  const meta: Record<
    HumanInterview["status"],
    { badge: string; dot: string }
  > = {
    CONFIRMED: {
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
      dot: "bg-emerald-500",
    },
    PROPOSED: {
      badge: "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
      dot: "bg-amber-500",
    },
    RESCHEDULE_REQUESTED: {
      badge: "bg-orange-50 text-orange-700 border-orange-200/60 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60",
      dot: "bg-orange-500",
    },
    DONE: {
      badge: "bg-slate-100 text-slate-700 border-slate-200/60 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
      dot: "bg-slate-400",
    },
    CANCELLED: {
      badge: "bg-rose-50 text-rose-700 border-rose-200/60 line-through dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
      dot: "bg-rose-500",
    },
    DRAFT: {
      badge: "bg-slate-100 text-slate-600 border-slate-200/60 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
      dot: "bg-slate-300",
    },
  };

  const current = meta[status] ?? meta.DRAFT;

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", current.badge)}>
      <span className={cn("size-1.5 rounded-full shrink-0", current.dot)} />
      {getHumanInterviewStatusLabel(status, t)}
    </span>
  );
}

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
  onExport: (format: "ics" | "csv") => void;
  onBulk: (action: "REMIND" | "RESCHEDULE") => void;
  onRemindPending: () => void;
  onAction: (action: InterviewAction, row: HumanInterview) => void;
};

export function HumanInterviewWorkspace(p: Props) {
  const t = useT();
  const locale = useLocale();
  type ActiveDropdown = "round" | "mode" | "status" | "export" | null;
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);
  const [jumpVal, setJumpVal] = useState("");
  const rows = p.data?.items ?? [];
  const total = p.data?.total ?? 0;
  const page = p.data?.page ?? 0;
  const size = p.data?.size ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = page + 1;
  const pageItems = useMemo(() => getPaginationItems(safePage, totalPages), [safePage, totalPages]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-dropdown-root]")) {
        setActiveDropdown(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(p.week);
    day.setDate(day.getDate() + i);
    return day;
  });

  const scoreCount = (r: HumanInterview) =>
    r.participants.filter((u) => u.role !== "NOTE_TAKER").length;

  const hasActiveFilters = Boolean(p.search || p.round || p.mode || p.status);

  return (
    <div className="flex flex-col gap-3.5 text-[var(--color-on-surface)]">
      {/* Bulk Selection Banner (Appears above the card when items are selected) */}
      {!!p.selected.length && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-primary/25 bg-slate-900 px-4 py-2.5 text-white shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-[13px]">
            <span className="grid size-6 place-items-center rounded-full bg-brand-primary text-xs font-bold">
              {p.selected.length}
            </span>
            <span className="font-medium">
              {t("recruiter.interviews.human.workspace.selectedCount", { count: p.selected.length })}
            </span>
            <button
              type="button"
              disabled={p.pending}
              onClick={() => p.onBulk("REMIND")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20 transition-colors cursor-pointer"
            >
              <Mail className="size-3.5" />
              {t("recruiter.interviews.human.workspace.remindPanelBtn")}
            </button>
            <button
              type="button"
              disabled={p.pending}
              onClick={() => p.onBulk("RESCHEDULE")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20 transition-colors cursor-pointer"
            >
              <Clock className="size-3.5" />
              {t("recruiter.interviews.human.workspace.rescheduleBtn")}
            </button>
          </div>
          <button
            type="button"
            onClick={() => p.onSelect([])}
            className="inline-flex items-center gap-1 rounded-xl bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="size-3.5" />
            {t("recruiter.interviews.human.workspace.clearSelection")}
          </button>
        </div>
      )}

      {/* Unified Table Card (Connecting Toolbar with Table and Pagination) */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        {/* 1. Filter Bar & Actions Toolbar */}
        <div className="flex flex-col gap-2.5 border-b border-slate-100 p-3 bg-white dark:border-slate-800/80 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Search & Filter Selects */}
          <div className="flex flex-1 items-center gap-2 flex-wrap lg:flex-nowrap min-w-0">
            {/* Search */}
            <div className="relative min-w-[200px] max-w-xs sm:max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="text"
                placeholder={t("recruiter.interviews.human.workspace.searchPlaceholder")}
                value={p.search}
                onChange={(e) => p.onFilter("search", e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-[box-shadow,border-color] focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:bg-slate-900"
              />
              {p.search && (
                <button
                  type="button"
                  aria-label={t("recruiter.assessments.common.actions.clearSearch")}
                  onClick={() => p.onFilter("search", "")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown: Vòng phỏng vấn */}
            <div className="relative" data-dropdown-root>
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === "round" ? null : "round")}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                  p.round
                    ? "border-brand-primary/30 bg-[var(--color-primary-soft)] text-brand-primary font-semibold shadow-2xs"
                    : "border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
                )}
                aria-expanded={activeDropdown === "round"}
              >
                <span>{p.round ? getRoundLabel(p.round, t) : t("recruiter.interviews.human.workspace.allRounds")}</span>
                <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform", activeDropdown === "round" && "rotate-180")} />
              </button>

              {activeDropdown === "round" && (
                <div className="absolute left-0 top-full mt-1.5 z-40 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-50 zoom-in-95">
                  <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {t("recruiter.interviews.human.workspace.roundFilterAria")}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      p.onFilter("round", "");
                      setActiveDropdown(null);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer",
                      !p.round
                        ? "bg-[var(--color-primary-soft)] font-semibold text-brand-primary"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                    )}
                  >
                    <span>{t("recruiter.interviews.human.workspace.allRounds")}</span>
                    {!p.round && <Check className="size-3.5 text-brand-primary" />}
                  </button>
                  {ROUND_CODES.map((code) => {
                    const isSelected = p.round === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          p.onFilter("round", code);
                          setActiveDropdown(null);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer",
                          isSelected
                            ? "bg-[var(--color-primary-soft)] font-semibold text-brand-primary"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                        )}
                      >
                        <span>{getRoundLabel(code, t)}</span>
                        {isSelected && <Check className="size-3.5 text-brand-primary" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dropdown: Hình thức */}
            <div className="relative" data-dropdown-root>
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === "mode" ? null : "mode")}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                  p.mode
                    ? "border-brand-primary/30 bg-[var(--color-primary-soft)] text-brand-primary font-semibold shadow-2xs"
                    : "border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
                )}
                aria-expanded={activeDropdown === "mode"}
              >
                <span>
                  {p.mode === "ONLINE"
                    ? t("recruiter.interviews.human.workspace.modeOnline")
                    : p.mode === "OFFLINE"
                      ? t("recruiter.interviews.human.workspace.modeOffline")
                      : t("recruiter.interviews.human.workspace.allModes")}
                </span>
                <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform", activeDropdown === "mode" && "rotate-180")} />
              </button>

              {activeDropdown === "mode" && (
                <div className="absolute left-0 top-full mt-1.5 z-40 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-50 zoom-in-95">
                  <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {t("recruiter.interviews.human.workspace.modeFilterAria")}
                  </p>
                  {[
                    { value: "", label: t("recruiter.interviews.human.workspace.allModes") },
                    { value: "ONLINE", label: t("recruiter.interviews.human.workspace.modeOnline"), icon: Video },
                    { value: "OFFLINE", label: t("recruiter.interviews.human.workspace.modeOffline"), icon: MapPin },
                  ].map((item) => {
                    const isSelected = p.mode === item.value;
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          p.onFilter("mode", item.value);
                          setActiveDropdown(null);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer",
                          isSelected
                            ? "bg-[var(--color-primary-soft)] font-semibold text-brand-primary"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {IconComp && <IconComp className="size-3.5 text-slate-400" />}
                          <span>{item.label}</span>
                        </div>
                        {isSelected && <Check className="size-3.5 text-brand-primary" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dropdown: Trạng thái */}
            <div className="relative" data-dropdown-root>
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === "status" ? null : "status")}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                  p.status
                    ? "border-brand-primary/30 bg-[var(--color-primary-soft)] text-brand-primary font-semibold shadow-2xs"
                    : "border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
                )}
                aria-expanded={activeDropdown === "status"}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    p.status === "DONE"
                      ? "bg-emerald-500"
                      : p.status === "CONFIRMED"
                        ? "bg-blue-500"
                        : p.status === "PROPOSED"
                          ? "bg-amber-500"
                          : p.status === "RESCHEDULE_REQUESTED"
                            ? "bg-purple-500"
                            : p.status === "CANCELLED"
                              ? "bg-rose-500"
                              : "bg-slate-300",
                  )}
                />
                <span>
                  {p.status
                    ? getHumanInterviewStatusLabel(p.status as HumanInterview["status"], t)
                    : t("recruiter.interviews.human.workspace.allStatuses")}
                </span>
                <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform", activeDropdown === "status" && "rotate-180")} />
              </button>

              {activeDropdown === "status" && (
                <div className="absolute left-0 top-full mt-1.5 z-40 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-50 zoom-in-95">
                  <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {t("recruiter.interviews.human.workspace.statusFilterAria")}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      p.onFilter("status", "");
                      setActiveDropdown(null);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer",
                      !p.status
                        ? "bg-[var(--color-primary-soft)] font-semibold text-brand-primary"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-slate-300" />
                      <span>{t("recruiter.interviews.human.workspace.allStatuses")}</span>
                    </div>
                    {!p.status && <Check className="size-3.5 text-brand-primary" />}
                  </button>
                  {HUMAN_INTERVIEW_STATUSES.map((code) => {
                    const isSelected = p.status === code;
                    const dotColor =
                      code === "DONE"
                        ? "bg-emerald-500"
                        : code === "CONFIRMED"
                          ? "bg-blue-500"
                          : code === "PROPOSED"
                            ? "bg-amber-500"
                            : code === "RESCHEDULE_REQUESTED"
                              ? "bg-purple-500"
                              : code === "CANCELLED"
                                ? "bg-rose-500"
                                : "bg-slate-300";
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          p.onFilter("status", code);
                          setActiveDropdown(null);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer",
                          isSelected
                            ? "bg-[var(--color-primary-soft)] font-semibold text-brand-primary"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn("size-2 rounded-full", dotColor)} />
                          <span>{getHumanInterviewStatusLabel(code, t)}</span>
                        </div>
                        {isSelected && <Check className="size-3.5 text-brand-primary" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: View Switcher, Export, New Schedule */}
          <div className="flex items-center gap-2 shrink-0 justify-end">
            {/* View Switcher (Segmented Control matching Assessment Submissions) */}
            <div className="inline-flex shrink-0 items-center rounded-xl border border-slate-200 bg-slate-100/70 p-0.5 dark:border-slate-700 dark:bg-slate-800/60">
              <button
                type="button"
                aria-pressed={p.view === "list"}
                onClick={() => p.onView("list")}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs transition-all cursor-pointer",
                  p.view === "list"
                    ? "bg-white font-semibold text-brand-primary shadow-2xs dark:bg-slate-900"
                    : "font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                <List className="size-3.5" />
                <span>{t("recruiter.interviews.human.workspace.viewList")}</span>
              </button>
              <button
                type="button"
                aria-pressed={p.view === "calendar"}
                onClick={() => p.onView("calendar")}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs transition-all cursor-pointer",
                  p.view === "calendar"
                    ? "bg-white font-semibold text-brand-primary shadow-2xs dark:bg-slate-900"
                    : "font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                <Calendar className="size-3.5" />
                <span>{t("recruiter.interviews.human.workspace.viewCalendar")}</span>
              </button>
            </div>

            {/* Export Dropdown */}
            <div className="relative" data-dropdown-root>
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === "export" ? null : "export")}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
                aria-expanded={activeDropdown === "export"}
              >
                <Download className="size-3.5 text-slate-500" />
                <span>{t("recruiter.interviews.human.workspace.exportBtn")}</span>
                <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform", activeDropdown === "export" && "rotate-180")} />
              </button>

              {activeDropdown === "export" && (
                <div className="absolute right-0 top-full mt-1.5 z-40 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in-50 zoom-in-95 dark:border-slate-800 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => {
                      p.onExport("ics");
                      setActiveDropdown(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Calendar className="size-4 text-brand-primary" />
                    <div className="text-left">
                      <p className="font-semibold">{t("recruiter.interviews.human.workspace.exportIcs")}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      p.onExport("csv");
                      setActiveDropdown(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer border-t border-slate-100 dark:border-slate-800"
                  >
                    <Download className="size-4 text-emerald-600" />
                    <div className="text-left">
                      <p className="font-semibold">{t("recruiter.interviews.human.workspace.exportCsv")}</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* New Schedule Button */}
            <button
              type="button"
              onClick={p.onNew}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-3.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-brand-primary-hover cursor-pointer"
            >
              <CalendarPlus className="size-3.5" aria-hidden="true" />
              <span>{t("recruiter.interviews.human.workspace.newScheduleBtn")}</span>
            </button>
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/40 px-4 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/20">
            <span className="font-medium text-slate-400">{t("recruiter.assessments.common.actions.activeFilters")}</span>
            {p.search && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] text-brand-primary px-2.5 py-0.5 text-xs font-medium">
                {p.search}
                <button
                  type="button"
                  onClick={() => p.onFilter("search", "")}
                  className="rounded-full p-0.5 hover:bg-brand-primary/15 cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            {p.round && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] text-brand-primary px-2.5 py-0.5 text-xs font-medium">
                {getRoundLabel(p.round, t)}
                <button
                  type="button"
                  onClick={() => p.onFilter("round", "")}
                  className="rounded-full p-0.5 hover:bg-brand-primary/15 cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            {p.mode && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] text-brand-primary px-2.5 py-0.5 text-xs font-medium">
                {p.mode === "ONLINE" ? t("recruiter.interviews.human.workspace.modeOnline") : t("recruiter.interviews.human.workspace.modeOffline")}
                <button
                  type="button"
                  onClick={() => p.onFilter("mode", "")}
                  className="rounded-full p-0.5 hover:bg-brand-primary/15 cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            {p.status && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] text-brand-primary px-2.5 py-0.5 text-xs font-medium">
                {getHumanInterviewStatusLabel(p.status as HumanInterview["status"], t)}
                <button
                  type="button"
                  onClick={() => p.onFilter("status", "")}
                  className="rounded-full p-0.5 hover:bg-brand-primary/15 cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                p.onFilter("search", "");
                p.onFilter("round", "");
                p.onFilter("mode", "");
                p.onFilter("status", "");
              }}
              className="ml-auto text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
            >
              {t("recruiter.assessments.common.actions.clearAllFilters")}
            </button>
          </div>
        )}

        {/* Refresh progress bar */}
        <TableRefreshBar active={Boolean(p.refreshing)} />

        {/* Main View: List or Calendar */}
        {p.view === "list" ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-[13px] min-w-[950px] border-collapse">
              <thead className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <tr className="h-11">
                  <th scope="col" className="w-10 px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      aria-label={t("recruiter.interviews.human.workspace.selectAllAria")}
                      checked={rows.length > 0 && rows.every((r) => p.selected.includes(r.id))}
                      onChange={(e) =>
                        p.onSelect(e.target.checked ? rows.map((r) => r.id) : [])
                      }
                      className="size-4 cursor-pointer accent-brand-primary rounded border-slate-300"
                    />
                  </th>
                  <th scope="col" className="px-3.5 py-2.5">{t("recruiter.interviews.human.workspace.colCandidate")}</th>
                  <th scope="col" className="px-3 py-2.5">{t("recruiter.interviews.human.workspace.colRound")}</th>
                  <th scope="col" className="px-3 py-2.5">{t("recruiter.interviews.human.workspace.colTimePlace")}</th>
                  <th scope="col" className="px-3 py-2.5">{t("recruiter.interviews.human.workspace.colLead")}</th>
                  <th scope="col" className="px-3 py-2.5">{t("recruiter.interviews.human.workspace.colStatus")}</th>
                  <th scope="col" className="px-3.5 py-2.5 text-right">{t("recruiter.interviews.human.workspace.colScorecard")}</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y divide-slate-100 dark:divide-slate-800 transition-opacity duration-200", p.refreshing && "opacity-60")}>
                {p.loading && !rows.length && (
                  Array.from({ length: 5 }, (_, idx) => (
                    <tr key={idx} className="h-14">
                      <td className="px-3 py-3 text-center"><Skeleton className="size-4 rounded mx-auto" /></td>
                      <td className="px-3.5 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-4 w-36" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                      <td className="px-3.5 py-3 text-right"><Skeleton className="ml-auto h-7 w-20 rounded-lg" /></td>
                    </tr>
                  ))
                )}
                {!rows.length && !p.loading && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
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
                    <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-3 text-center">
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
                          className="size-4 cursor-pointer accent-brand-primary rounded border-slate-300"
                        />
                      </td>

                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary">
                            {initials}
                          </span>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => p.onAction("profile", r)}
                              className="font-semibold text-xs sm:text-[13px] text-slate-900 hover:text-brand-primary truncate text-left transition-colors cursor-pointer block dark:text-slate-100"
                            >
                              {r.candidateName}
                            </button>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {r.candidateEmail}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {getRoundLabel(r.round, t)}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-xs sm:text-[13px] text-slate-900 dark:text-slate-100">
                            {startTime} – {endTime}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {startDate}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-brand-primary font-medium">
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
                                <Link to={`/meet/human/${r.id}`} className="ml-1 underline font-semibold text-xs">
                                  {t("recruiter.interviews.human.workspace.joinMeeting")}
                                </Link>
                              ) : (
                                <a href={r.meetingUrl!} target="_blank" rel="noreferrer" className="ml-1 underline font-semibold text-xs">
                                  {t("recruiter.interviews.human.workspace.joinMeeting")}
                                </a>
                              )
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium text-xs sm:text-[13px] text-slate-800 dark:text-slate-200">
                            {leadName}
                          </span>
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {t("recruiter.interviews.human.workspace.leadBadge")}
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <StatusBadge status={r.status} />
                      </td>

                      <td className="px-3.5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => p.onAction("scorecard", r)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer shadow-2xs",
                            r.evaluations.length > 0
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-brand-primary hover:text-brand-primary dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400",
                          )}
                          title={t("recruiter.interviews.human.workspace.scorecardTooltip")}
                        >
                          <Star className={cn("size-3", r.evaluations.length > 0 ? "fill-amber-400 text-amber-500" : "text-slate-400")} />
                          <span>
                            {r.evaluations.length > 0
                              ? `${Math.round(r.evaluations.reduce((a, e) => a + e.overallScore, 0) / r.evaluations.length)}đ (${r.evaluations.length}/${scoreCount(r)})`
                              : `${r.evaluations.length}/${scoreCount(r)} phiếu`}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Pagination (Complete 4-group SaaS Enterprise UX) */}
          <footer className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between text-xs sm:text-[13px] text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
            {/* Nhóm 1: Thông tin Dữ liệu */}
            <div className="flex items-center gap-2">
              <p>
                {t("recruiter.assessments.common.pagination.showing")}{" "}
                <strong className="font-semibold text-slate-900 dark:text-slate-100">
                  {total ? page * size + 1 : 0}–{Math.min((page + 1) * size, total)}
                </strong>{" "}
                {t("recruiter.assessments.common.pagination.of")}{" "}
                <strong className="font-semibold text-slate-900 dark:text-slate-100">{total}</strong>{" "}
                {t("recruiter.interviews.human.workspace.interviewsCountUnit")}
              </p>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">
                {t("recruiter.assessments.common.pagination.pageOf", { current: safePage, total: totalPages })}
              </span>
              {p.refreshing && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-primary ml-1" role="status">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  <span className="hidden sm:inline">{t("recruiter.assessments.common.loadingEllipsis")}</span>
                </span>
              )}
            </div>

            {/* Nhóm 2: Chọn số bản ghi / trang */}
            <div className="flex items-center justify-start lg:justify-center">
              <label className="flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400">
                <span>{t("recruiter.interviews.human.workspace.perPageLabel")}</span>
                <select
                  aria-label={t("recruiter.interviews.human.workspace.perPageAria")}
                  value={size}
                  onChange={(e) => p.onSize(Number(e.target.value))}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs sm:text-[13px] font-semibold text-slate-800 shadow-2xs outline-none transition-colors hover:border-brand-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {PAGE_SIZE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {t("recruiter.assessments.common.pagination.perPage", { size: s })}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Nhóm 3 & 4: Điều hướng phân trang & Nhảy trang nhanh */}
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <nav className="flex items-center gap-1" aria-label={t("recruiter.interviews.human.workspace.paginationAria")}>
                {/* Trang đầu [|<] */}
                <button
                  type="button"
                  aria-label={t("recruiter.assessments.common.pagination.firstPage")}
                  title={t("recruiter.assessments.common.pagination.firstPageTitle")}
                  disabled={safePage === 1 || p.loading}
                  onClick={() => p.onPage(0)}
                  className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <ChevronsLeft className="size-4" aria-hidden="true" />
                </button>

                {/* Trang trước [<] */}
                <button
                  type="button"
                  aria-label={t("recruiter.assessments.common.pagination.prevPage")}
                  title={t("recruiter.assessments.common.pagination.prevPage")}
                  disabled={safePage === 1 || p.loading}
                  onClick={() => p.onPage(page - 1)}
                  className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </button>

                {/* Danh sách số trang */}
                {pageItems.map((item, idx) => {
                  if (typeof item === "string") {
                    return (
                      <span
                        key={`${item}-${idx}`}
                        className="grid size-8 place-items-center text-xs text-slate-400 select-none dark:text-slate-500"
                        aria-hidden="true"
                      >
                        …
                      </span>
                    );
                  }
                  const isActive = item === safePage;
                  return (
                    <button
                      key={item}
                      type="button"
                      aria-label={t("recruiter.assessments.common.pagination.pageNumberAria", { page: item })}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => p.onPage(item - 1)}
                      className={cn(
                        "grid size-8 place-items-center rounded-lg text-xs font-semibold transition-all cursor-pointer",
                        isActive
                          ? "bg-brand-primary text-white shadow-xs font-bold"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-primary",
                      )}
                    >
                      {item}
                    </button>
                  );
                })}

                {/* Trang sau [>] */}
                <button
                  type="button"
                  aria-label={t("recruiter.assessments.common.pagination.nextPage")}
                  title={t("recruiter.assessments.common.pagination.nextPage")}
                  disabled={safePage >= totalPages || p.loading}
                  onClick={() => p.onPage(page + 1)}
                  className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </button>

                {/* Trang cuối [>|] */}
                <button
                  type="button"
                  aria-label={t("recruiter.assessments.common.pagination.lastPage")}
                  title={t("recruiter.assessments.common.pagination.lastPageTitle", { total: totalPages })}
                  disabled={safePage >= totalPages || p.loading}
                  onClick={() => p.onPage(totalPages - 1)}
                  className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <ChevronsRight className="size-4" aria-hidden="true" />
                </button>
              </nav>

              <div className="hidden h-4 w-px bg-slate-300 sm:block dark:bg-slate-700" />

              {/* Nhảy trang nhanh */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = parseInt(jumpVal, 10);
                  if (!Number.isNaN(target) && target >= 1 && target <= totalPages) {
                    p.onPage(target - 1);
                    setJumpVal("");
                  }
                }}
                className="flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400"
              >
                <label htmlFor="interview-jump-page" className="whitespace-nowrap">
                  {t("recruiter.assessments.common.pagination.goTo")}
                </label>
                <input
                  id="interview-jump-page"
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpVal}
                  onChange={(e) => setJumpVal(e.target.value)}
                  placeholder={String(safePage)}
                  aria-label={t("recruiter.assessments.common.pagination.jumpInputAria")}
                  className="h-8 w-13 rounded-lg border border-slate-200 bg-white px-2 text-center text-xs font-semibold text-slate-800 shadow-2xs outline-none transition-colors hover:border-brand-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
                <button
                  type="submit"
                  disabled={!jumpVal || Number(jumpVal) < 1 || Number(jumpVal) > totalPages}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  {t("recruiter.assessments.common.pagination.goBtn")}
                </button>
              </form>
            </div>
          </footer>
        </>
      ) : (
        /* Calendar Week View inside unified card */
        <div className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3 mb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={t("recruiter.interviews.human.workspace.prevWeekAria")}
                onClick={() => p.onWeek(-1)}
                className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-brand-primary transition-colors cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <ChevronLeft className="size-4" />
              </button>
              <h2 className="text-sm font-semibold text-slate-900 min-w-44 text-center dark:text-slate-100">
                {t("recruiter.interviews.human.workspace.weekRange", {
                  from: formatDate(p.week, undefined, locale),
                  to: formatDate(days[6], undefined, locale),
                })}
              </h2>
              <button
                type="button"
                aria-label={t("recruiter.interviews.human.workspace.nextWeekAria")}
                onClick={() => p.onWeek(1)}
                className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-brand-primary transition-colors cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-brand-primary" />
                {t("recruiter.interviews.human.rounds.shortTechnical")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" />
                {t("recruiter.interviews.human.rounds.shortCulture")}
              </span>
              <span className="flex items-center gap-1.5">
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
                        "rounded-xl p-2 text-center text-xs font-semibold transition-colors",
                        isToday
                          ? "bg-brand-primary text-white shadow-xs"
                          : "bg-slate-100/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
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

                    <div className="min-h-[220px] rounded-xl border border-slate-200/80 bg-slate-50/40 p-1.5 space-y-1.5 dark:border-slate-800 dark:bg-slate-900/40">
                      {dayInterviews.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => p.onAction("edit", r)}
                          className="block w-full rounded-xl border border-slate-200 bg-white p-2.5 text-left text-xs transition-all hover:border-brand-primary hover:shadow-xs cursor-pointer dark:border-slate-800 dark:bg-slate-800"
                        >
                          <span className="text-[11px] font-bold text-brand-primary block">
                            {formatTime(
                              r.start,
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                              locale,
                            )}
                          </span>
                          <p className="font-semibold text-xs text-slate-900 truncate mt-0.5 dark:text-slate-100">
                            {r.candidateName}
                          </p>
                          <span className="text-[11px] text-slate-500 block truncate mt-0.5 dark:text-slate-400">
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
    </div>
  );
}
