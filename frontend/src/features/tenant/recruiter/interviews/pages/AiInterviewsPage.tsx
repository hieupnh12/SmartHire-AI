import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Ban,
  Bot,
  Building2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Filter,
  Inbox,
  Kanban,
  LayoutList,
  ListFilter,
  MoreVertical,
  PlusCircle,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Type,
  Upload,
  Verified,
  X,
} from "lucide-react";
import { aiInterviewApi } from "@/api/tenant/aiInterviewApi";
import type { AiInterviewStatus } from "@/api/types/aiInterview";
import { AssessmentError } from "@/components/ux/assessmentUi";
import { AiInterviewConfigPanel } from "../components/AiInterviewConfigPanel";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";
import { AiInterviewDetailDrawer } from "../components/AiInterviewDetailDrawer";
import {
  AI_INTERVIEW_STATUSES,
  AiStatusBadge,
  aiStatusLabel,
  formatDateTime,
} from "../components/aiInterviewUi";
import { CreateAiInterviewDialog } from "../components/CreateAiInterviewDialog";
import { useJobAiInterviews, type AiInterviewRow } from "../hooks/useJobAiInterviews";

type QuickTab = "ALL" | "QUESTIONS_READY" | "IN_PROGRESS" | "SCORING" | "SCORED";
type TimeRange = "all" | "7" | "30" | "90";

const DAY_MS = 86_400_000;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function candidateName(row: AiInterviewRow) {
  return row.application?.candidateName ?? `Ứng viên #${row.candidateId ?? "?"}`;
}

function scheduleOf(row: AiInterviewRow) {
  if (row.completedAt) return { label: formatDateTime(row.completedAt), hint: "Hoàn tất phiên" };
  if (row.startedAt) return { label: formatDateTime(row.startedAt), hint: "Đã bắt đầu" };
  return { label: formatDateTime(row.createdAt), hint: "Ngày tạo phiên" };
}

function downloadCsv(rows: AiInterviewRow[], jobTitle: string) {
  const header = ["Ma phien", "Ung vien", "Email", "Don", "Trang thai", "Diem", "Tao luc", "Bat dau", "Hoan tat"];
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) => [
    `AI-${r.id}`,
    candidateName(r),
    r.application?.candidateEmail ?? "",
    r.applicationId,
    aiStatusLabel[r.status],
    r.overallScore ?? "",
    r.createdAt,
    r.startedAt ?? "",
    r.completedAt ?? "",
  ].map(escape).join(","));
  const blob = new Blob(["\uFEFF" + [header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ai-interviews-${jobTitle.replace(/\s+/g, "-").toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function ScoreCell({ row }: { row: AiInterviewRow }) {
  if (row.status === "SCORING") {
    return <span className="text-xs italic text-[var(--color-on-surface-variant)]">Đang tổng hợp điểm...</span>;
  }
  if (row.overallScore == null) {
    return <span className="text-xs italic text-[var(--color-outline)]">Chưa có điểm</span>;
  }
  const pct = Math.min(Math.max(row.overallScore, 0), 100);
  return (
    <div className="flex w-36 flex-col gap-1.5">
      <span className="text-base font-bold text-[var(--color-on-surface)]">
        {row.overallScore.toFixed(1)} <span className="text-xs font-normal text-[var(--color-on-surface-variant)]">/100</span>
      </span>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-container-high)]">
        <div className="h-full rounded-full bg-[var(--color-primary-container)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ActionMenu({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: { label: string; icon: typeof Copy; danger?: boolean; onClick: () => void }[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div ref={ref} className="absolute right-0 top-10 z-30 flex w-52 flex-col rounded-xl bg-[var(--color-surface-card)] py-1.5 shadow-xl">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            type="button"
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 text-left text-sm font-medium hover:bg-[var(--color-surface-container)]",
              item.danger ? "text-[#ba1a1a] hover:bg-[#ffdad6]" : "text-[var(--color-on-surface)]",
            )}
            onClick={() => {
              item.onClick();
              onClose();
            }}
          >
            <Icon className="size-[18px]" aria-hidden="true" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function AiInterviewsPage() {
  const job = useRecruitmentJob();
  const client = useQueryClient();
  const askConfirm = useUiStore((s) => s.askConfirm);
  const { interviews, applicants, rows } = useJobAiInterviews(job.id);
  const [tab, setTab] = useState<QuickTab>("ALL");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AiInterviewStatus | "all">("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [menuId, setMenuId] = useState<number | null>(null);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const counts = useMemo(() => {
    const by = (s: AiInterviewStatus) => rows.filter((r) => r.status === s).length;
    return {
      all: rows.length,
      ready: by("QUESTIONS_READY"),
      live: by("IN_PROGRESS"),
      scoring: by("SCORING"),
      scored: by("SCORED") + by("PASSED") + by("FAILED"),
    };
  }, [rows]);
  const completionRate = counts.all ? Math.round((counts.scored / counts.all) * 100) : 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const since = timeRange === "all" ? 0 : Date.now() - Number(timeRange) * DAY_MS;
    return rows.filter((row) => {
      if (tab !== "ALL" && (tab === "SCORED" ? !["SCORED", "PASSED", "FAILED"].includes(row.status) : row.status !== tab)) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (since && new Date(row.createdAt).getTime() < since) return false;
      if (!q) return true;
      return (
        candidateName(row).toLowerCase().includes(q) ||
        (row.application?.candidateEmail ?? "").toLowerCase().includes(q) ||
        `ai-${row.id}`.includes(q.replace("#", "")) ||
        String(row.applicationId) === q
      );
    });
  }, [rows, tab, statusFilter, timeRange, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const detailRow = rows.find((r) => r.id === detailId);

  const resetFilters = () => {
    setTab("ALL");
    setQuery("");
    setStatusFilter("all");
    setTimeRange("all");
    setPage(0);
  };

  const confirmDelete = (row: AiInterviewRow) =>
    askConfirm({
      title: `Xoá phiên #AI-${row.id}?`,
      description: "Toàn bộ câu hỏi, câu trả lời và feedback của phiên sẽ bị xoá vĩnh viễn.",
      confirmLabel: "Xoá phiên",
      danger: true,
      onConfirm: async () => {
        await aiInterviewApi.remove(row.id);
        await client.invalidateQueries({ queryKey: queryKeys.aiInterviews.byJob(job.id) });
        toast.success("Đã xoá phiên phỏng vấn AI");
      },
    });


  const pills: { id: QuickTab; label: string; dot?: "live" }[] = [
    { id: "ALL", label: `Tất cả (${counts.all})` },
    { id: "QUESTIONS_READY", label: `Đã có câu hỏi (${counts.ready})` },
    { id: "IN_PROGRESS", label: `Đang diễn ra (${counts.live})`, dot: "live" },
    { id: "SCORING", label: `Đang chấm (${counts.scoring})` },
    { id: "SCORED", label: `Đã chấm xong (${counts.scored})` },
  ];

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 text-[var(--color-on-surface)]">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-7 w-2.5 rounded-full bg-[var(--color-primary-container)]" />
            <h1 className="text-[30px] font-semibold leading-[38px] tracking-tight">Phỏng vấn AI</h1>
          </div>
          <p className="max-w-2xl pl-4 text-sm leading-[22px] text-[var(--color-on-surface-variant)]">
            Quản lý phiên phỏng vấn AI của vị trí, câu hỏi, câu trả lời và feedback của ứng viên.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setConfigOpen(open => !open)} aria-expanded={configOpen} aria-controls="ai-interview-config"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--color-surface-container-low)] px-4 text-sm font-medium text-[var(--color-on-surface)] shadow-sm transition-colors hover:bg-[var(--color-surface-container)]"
          >
            <SlidersHorizontal className="size-[19px] text-[var(--color-on-surface-variant)]" aria-hidden="true" />
            Cấu hình AI Interview
          </button>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--color-primary-container)] px-5 text-sm font-semibold text-[var(--color-on-primary)] shadow-md transition-all hover:bg-[var(--color-primary-hover)] active:scale-95"
          >
            <PlusCircle className="size-5" aria-hidden="true" />
            Tạo phỏng vấn mới
          </button>
        </div>
      </div>

      {configOpen && <AiInterviewConfigPanel jobId={job.id} />}

      <AssessmentError error={interviews.error} retry={() => void interviews.refetch()} />
      <AssessmentError error={applicants.error} retry={() => void applicants.refetch()} />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Tổng số phiên" value={String(counts.all)} trend="Trong vị trí đang mở" hint={job.title} icon={LayoutList} blob="primary" />
        <KpiCard
          label="Đang diễn ra"
          value={String(counts.live)}
          trend="Trạng thái IN_PROGRESS"
          trendTone="tertiary"
          hint="Phiên của vị trí đang mở"
          icon={AudioLines}
          blob="secondary"
          live={counts.live > 0}
        />
        <KpiCard
          label="Đã chấm điểm"
          value={String(counts.scored)}
          trend="Chờ recruiter xem"
          trendTone="error"
          hint="Chưa có cờ đã duyệt trong API"
          icon={FileText}
          blob="error"
        />
        <div className="group relative flex items-center justify-between overflow-hidden rounded-2xl bg-[var(--color-surface-card)] p-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="z-10 flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">Tỷ lệ hoàn tất phiên</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight">{completionRate}%</span>
              <span className="inline-flex items-center text-[11px] font-semibold text-[var(--color-primary)]">
                <ArrowUpRight className="size-3.5" aria-hidden="true" /> {counts.scored} phiên
              </span>
            </div>
            <span className="text-xs text-[var(--color-on-surface-variant)]">Đã chấm / tổng số phiên</span>
          </div>
          <div className="relative z-10 flex size-12 items-center justify-center">
            <svg className="size-12 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
              <path className="text-[var(--color-surface-container-high)]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
              <path className="text-[var(--color-primary-container)]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${completionRate}, 100`} strokeLinecap="round" strokeWidth="3.5" />
            </svg>
            <span className="absolute text-[11px] font-bold">{completionRate}%</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-surface-card)] p-4 shadow-sm">
        <div className="flex flex-col items-stretch justify-between gap-4 lg:flex-row lg:items-center">
          <label className="relative flex max-w-2xl flex-1 items-center">
            <span className="sr-only">Tìm phiên phỏng vấn AI</span>
            <Search className="pointer-events-none absolute left-3.5 size-5 text-[var(--color-outline)]" aria-hidden="true" />
            <input
              className="h-11 w-full rounded-xl bg-[var(--color-surface)] pl-11 pr-4 text-sm text-[var(--color-on-surface)] shadow-[0_0_0_1px_var(--color-outline-variant)] outline-none transition-all placeholder:text-[var(--color-outline)] focus:shadow-[0_0_0_2px_var(--color-primary-hover)]"
              placeholder="Tìm theo ứng viên, email, mã phiên (#AI-...) hoặc mã đơn"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <div className="flex flex-wrap items-center justify-end gap-1">
            <div className="flex items-center rounded-xl bg-[var(--color-surface-container-low)] p-1 shadow-sm">
              {(["table", "kanban"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors",
                    viewMode === mode
                      ? "bg-[var(--color-surface-card)] text-[var(--color-on-surface)] shadow-sm"
                      : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]",
                  )}
                >
                  {mode === "table" ? <LayoutList className="size-4 text-[var(--color-primary)]" aria-hidden="true" /> : <Kanban className="size-4" aria-hidden="true" />}
                  {mode === "table" ? "Bảng" : "Kanban"}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={filtered.length === 0}
              onClick={() => downloadCsv(filtered, job.title)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-surface-container-low)] px-3.5 text-xs font-medium text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container)] disabled:opacity-50"
            >
              <Download className="size-[18px] text-[var(--color-on-surface-variant)]" aria-hidden="true" />
              Xuất CSV
            </button>
            <button
              type="button"
              onClick={() => setConfigOpen(open => !open)} aria-expanded={configOpen} aria-controls="ai-interview-config"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-surface-container-low)] px-3.5 text-xs font-medium text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container)]"
            >
              <Bot className="size-[18px] text-[var(--color-primary)]" aria-hidden="true" />
              Cài đặt tự động hóa
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="flex items-center gap-1 pr-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            <Filter className="size-4" aria-hidden="true" />
            Bộ lọc:
          </div>
          <select
            aria-label="Lọc theo trạng thái"
            className="h-9 cursor-pointer rounded-lg bg-[var(--color-surface-container-low)] pl-3.5 pr-8 text-xs font-medium text-[var(--color-on-surface)] outline-none focus:shadow-[0_0_0_2px_var(--color-primary-hover)]"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as AiInterviewStatus | "all");
              setPage(0);
            }}
          >
            <option value="all">Trạng thái: Tất cả ({counts.all})</option>
            {AI_INTERVIEW_STATUSES.map((s) => (
              <option key={s} value={s}>{aiStatusLabel[s]}</option>
            ))}
          </select>
          <select
            aria-label="Khung thời gian"
            className="h-9 cursor-pointer rounded-lg bg-[var(--color-surface-container-low)] pl-3.5 pr-8 text-xs font-medium text-[var(--color-on-surface)] outline-none focus:shadow-[0_0_0_2px_var(--color-primary-hover)]"
            value={timeRange}
            onChange={(e) => {
              setTimeRange(e.target.value as TimeRange);
              setPage(0);
            }}
          >
            <option value="all">Thời gian tạo: Tất cả</option>
            <option value="7">7 ngày qua</option>
            <option value="30">30 ngày qua</option>
            <option value="90">90 ngày qua</option>
          </select>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-xs font-medium text-[var(--color-on-surface-variant)] transition-colors hover:bg-[#ffdad6]/30 hover:text-[#ba1a1a]"
          >
            <X className="size-4" aria-hidden="true" />
            Đặt lại
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {pills.map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => {
                setTab(pill.id);
                setPage(0);
              }}
              className={cn(
                "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all",
                tab === pill.id
                  ? "bg-[var(--color-primary-container)] font-semibold text-[var(--color-on-primary)]"
                  : "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]",
              )}
            >
              {pill.dot === "live" && <span className="size-1.5 rounded-full bg-[var(--color-tertiary-container)]" />}
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "table" ? (
        <div className="flex flex-col overflow-hidden rounded-3xl bg-[var(--color-surface-card)] shadow-sm">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
              <thead>
                <tr className="h-12 select-none bg-[var(--color-surface-container-low)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  <th className="py-3 pl-6 pr-4">Phiên &amp; Mã</th>
                  <th className="px-4 py-3">Ứng viên</th>
                  <th className="px-4 py-3">Vị trí</th>
                  <th className="px-4 py-3">Hình thức AI</th>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Đánh giá AI</th>
                  <th className="py-3 pr-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-surface-container-low)]">
                {interviews.isPending && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-[var(--color-on-surface-variant)]" role="status">
                      Đang tải phiên phỏng vấn AI…
                    </td>
                  </tr>
                )}
                {pageRows.map((row) => {
                  const schedule = scheduleOf(row);
                  const name = candidateName(row);
                  return (
                    <tr key={row.id} className="group transition-colors hover:bg-[var(--color-surface-container-low)]/60">
                      <td className="py-4 pl-6 pr-4">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => setDetailId(row.id)}
                            className="text-left text-base font-semibold tracking-tight transition-colors hover:text-[var(--color-primary)]"
                          >
                            AI Interview · {job.title}
                          </button>
                          <div className="flex items-center gap-2 font-mono text-[13px] text-[var(--color-on-surface-variant)]">
                            <Tag className="size-3.5" aria-hidden="true" />
                            <span>#AI-{row.id}</span>
                            <span>•</span>
                            <span>Ngưỡng đạt {row.passingScore ?? "—"}/100</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex size-10 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary-hover)] shadow-sm">
                            {initials(name)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold leading-tight">{name}</span>
                            <span className="text-xs leading-tight text-[var(--color-on-surface-variant)]">{row.application?.candidateEmail ?? "—"}</span>
                            <span className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
                              <FileText className="size-3" aria-hidden="true" />
                              Đơn #{row.applicationId}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold">{row.application?.jobTitle ?? job.title}</span>
                          <span className="inline-flex items-center gap-1 text-xs text-[var(--color-on-surface-variant)]">
                            <Building2 className="size-3.5" aria-hidden="true" />
                            {[row.application?.jobDepartment, row.application?.jobLocation].filter(Boolean).join(" · ") || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-container)] px-2.5 py-1 text-xs font-semibold text-[var(--color-on-surface-variant)]">
                          <Type className="size-3.5" aria-hidden="true" />
                          Văn bản
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">{schedule.label}</span>
                          <span className="text-xs text-[var(--color-on-surface-variant)]">{schedule.hint}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <AiStatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-4">
                        <ScoreCell row={row} />
                      </td>
                      <td className="py-4 pr-4 text-right">
                        <div className="relative flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailId(row.id)}
                            className="inline-flex h-9 items-center gap-1 rounded-lg bg-[var(--color-primary-container)] px-3 text-xs font-semibold text-[var(--color-on-primary)] shadow-sm transition-colors hover:bg-[var(--color-primary-hover)]"
                          >
                            {row.status === "SCORED" ? "Xem feedback" : "Chi tiết"}
                            <ArrowRight className="size-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="flex size-9 items-center justify-center rounded-lg text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-surface-container)]"
                            aria-label="Thêm thao tác"
                            onClick={() => setMenuId(menuId === row.id ? null : row.id)}
                          >
                            <MoreVertical className="size-5" aria-hidden="true" />
                          </button>
                          <ActionMenu
                            open={menuId === row.id}
                            onClose={() => setMenuId(null)}
                            items={[
                              {
                                label: "Sao chép mã phiên",
                                icon: Copy,
                                onClick: () => {
                                  void navigator.clipboard.writeText(`AI-${row.id}`);
                                  toast.success("Đã sao chép mã phiên");
                                },
                              },
                              { label: "Xoá phiên này", icon: Ban, danger: true, onClick: () => confirmDelete(row) },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {interviews.isSuccess && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-[var(--color-on-surface-variant)]">
                      {rows.length === 0 ? "Vị trí này chưa có phiên phỏng vấn AI. Bấm “Tạo phỏng vấn mới” để bắt đầu." : "Không có phiên phù hợp bộ lọc."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-center justify-between gap-2 px-4 py-3.5 sm:flex-row">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-on-surface-variant)]">
              <span>
                Hiển thị{" "}
                <span className="font-semibold text-[var(--color-on-surface)]">
                  {filtered.length === 0 ? 0 : safePage * pageSize + 1} - {safePage * pageSize + pageRows.length}
                </span>{" "}
                trên <span className="font-semibold text-[var(--color-on-surface)]">{filtered.length}</span> phiên
              </span>
              <span className="text-[var(--color-outline-variant)]">•</span>
              <label className="flex items-center gap-1.5">
                <span>Dòng mỗi trang:</span>
                <select
                  className="h-8 rounded-md bg-[var(--color-surface-container-low)] px-2 text-[11px] font-medium text-[var(--color-on-surface)] outline-none"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(0);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
                className="flex size-8 items-center justify-center rounded-lg bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)] disabled:opacity-50"
                aria-label="Trang trước"
              >
                <ChevronLeft className="size-[18px]" aria-hidden="true" />
              </button>
              <span className="px-2 text-sm font-medium">{safePage + 1} / {pageCount}</span>
              <button
                type="button"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage(safePage + 1)}
                className="flex size-8 items-center justify-center rounded-lg bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)] disabled:opacity-50"
                aria-label="Trang sau"
              >
                <ChevronRight className="size-[18px]" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl bg-[var(--color-surface-card)] p-8 text-center shadow-sm">
          <ListFilter className="mx-auto size-8 text-[var(--color-outline)]" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold">Kanban view</p>
          <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Chế độ Kanban đang được chuẩn bị — hãy dùng Bảng để quản lý phiên.</p>
        </div>
      )}

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--color-surface-container-low)] via-[var(--color-surface-card)] to-[var(--color-surface-container-low)] p-6 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex max-w-xl flex-col gap-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-[22px] text-[var(--color-primary)]" aria-hidden="true" />
              <h3 className="text-xl font-bold tracking-tight">Quy trình thiết lập phỏng vấn AI</h3>
            </div>
            <p className="text-sm leading-[22px] text-[var(--color-on-surface-variant)]">
              Tạo phiên cho hồ sơ đạt CV, sinh câu hỏi và tự cập nhật trạng thái. AI chấm bài, trả feedback và chuyển vòng theo ngưỡng của Job.
            </p>
          </div>
          <div className="grid w-full flex-1 grid-cols-2 gap-3 md:grid-cols-4 lg:w-auto lg:max-w-3xl">
            {[
              { n: 1, icon: Upload, title: "Chọn đơn ứng tuyển", desc: job.title },
              { n: 2, icon: SlidersHorizontal, title: "Thêm câu hỏi", desc: "Sinh bằng AI hoặc bổ sung thủ công" },
              { n: 3, icon: Inbox, title: "Ứng viên trả lời", desc: "Câu trả lời lưu theo từng câu" },
              { n: 4, icon: Verified, title: "Feedback & điểm", desc: "AI đánh giá, tự chuyển vòng" },
            ].map((step) => {
              const StepIcon = step.icon;
              return (
                <div key={step.n} className="flex flex-col gap-1 rounded-xl bg-[var(--color-surface-card)]/80 p-3 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex size-6 items-center justify-center rounded-full bg-[var(--color-primary-container)] text-[11px] font-bold text-[var(--color-on-primary)]">{step.n}</span>
                    <StepIcon className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
                  </div>
                  <span className="mt-1 text-xs font-semibold text-[var(--color-on-surface)]">{step.title}</span>
                  <span className="text-xs leading-tight text-[var(--color-on-surface-variant)]">{step.desc}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {creating && (
        <CreateAiInterviewDialog
          jobId={job.id}
          applicants={applicants.data ?? []}
          existingApplicationIds={new Set(rows.map((r) => r.applicationId))}
          onClose={() => setCreating(false)}
          onCreated={(created) => {
            setCreating(false);
            setDetailId(created.id);
          }}
        />
      )}
      {detailId != null && (
        <AiInterviewDetailDrawer
          interviewId={detailId}
          jobId={job.id}
          candidateName={detailRow ? candidateName(detailRow) : `Phiên #AI-${detailId}`}
          onClose={() => setDetailId(null)}
        />
      )}
    </section>
  );
}

function KpiCard({
  label,
  value,
  trend,
  trendTone = "primary",
  hint,
  icon: Icon,
  blob,
  live,
}: {
  label: string;
  value: string;
  trend: string;
  trendTone?: "primary" | "tertiary" | "error";
  hint: string;
  icon: typeof LayoutList;
  blob: "primary" | "secondary" | "error";
  live?: boolean;
}) {
  const trendClass =
    trendTone === "error" ? "text-[#ba1a1a]" : trendTone === "tertiary" ? "text-[var(--color-tertiary)]" : "text-[var(--color-primary)]";
  const iconClass =
    blob === "error" ? "text-[#ba1a1a]" : blob === "secondary" ? "text-[var(--color-tertiary-container)]" : "text-[var(--color-primary)]";
  const blobClass =
    blob === "error" ? "bg-[#ffdad6]/20" : blob === "secondary" ? "bg-[var(--color-secondary-container)]/30" : "bg-[var(--color-surface-container-low)]";

  return (
    <div className="group relative flex items-center justify-between overflow-hidden rounded-2xl bg-[var(--color-surface-card)] p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className={cn("absolute -bottom-4 -right-4 size-24 rounded-full opacity-40 transition-transform group-hover:scale-110", blobClass)} />
      <div className="z-10 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">{label}</span>
          {live && (
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--color-tertiary-container)] opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-[var(--color-tertiary-container)]" />
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold tracking-tight">{value}</span>
          <span className={cn("inline-flex items-center text-[11px] font-semibold", trendClass)}>
            {trendTone === "primary" && <ArrowUpRight className="size-3.5" aria-hidden="true" />}
            {trend}
          </span>
        </div>
        <span className="text-xs text-[var(--color-on-surface-variant)]">{hint}</span>
      </div>
      <div className={cn("z-10 flex size-12 items-center justify-center rounded-xl bg-[var(--color-surface-container-low)]", iconClass)}>
        <Icon className="size-6" aria-hidden="true" />
      </div>
    </div>
  );
}
