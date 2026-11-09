import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Ban,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Download,
  Eye,
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
import { companyApi } from "@/api/tenant/companyApi";
import type { AiInterviewStatus } from "@/api/types/aiInterview";
import { AssessmentError } from "@/components/ux/assessmentUi";
import { TableSkeleton } from "@/components/ux/Skeleton";
import { AiInterviewConfigPanel } from "../components/AiInterviewConfigPanel";
import { AiInterviewSubNav, type AiInterviewTab } from "../components/AiInterviewSubNav";
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

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const DAY_MS = 86_400_000;

function getPaginationItems(current: number, total: number): (number | "ellipsis-start" | "ellipsis-end")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const showStartEllipsis = current > 4;
  const showEndEllipsis = current < total - 3;

  if (!showStartEllipsis && showEndEllipsis) {
    return [1, 2, 3, 4, 5, "ellipsis-end", total];
  }

  if (showStartEllipsis && !showEndEllipsis) {
    return [1, "ellipsis-start", total - 4, total - 3, total - 2, total - 1, total];
  }

  return [1, "ellipsis-start", current - 1, current, current + 1, "ellipsis-end", total];
}

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

function exportCsv(rows: AiInterviewRow[], jobTitle: string) {
  if (rows.length === 0) {
    toast.warning("Không có dữ liệu phiên phỏng vấn để xuất");
    return;
  }
  const headers = ["Mã phiên", "Ứng viên", "Email", "Mã đơn", "Trạng thái", "Điểm AI", "Ngày tạo", "Bắt đầu", "Hoàn tất"];
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) => [
    `AI-${r.id}`,
    candidateName(r),
    r.application?.candidateEmail ?? "",
    r.applicationId,
    aiStatusLabel[r.status] ?? r.status,
    r.overallScore != null ? r.overallScore : "",
    r.createdAt ? new Date(r.createdAt).toLocaleDateString("vi-VN") : "",
    r.startedAt ? new Date(r.startedAt).toLocaleDateString("vi-VN") : "",
    r.completedAt ? new Date(r.completedAt).toLocaleDateString("vi-VN") : "",
  ].map(escape).join(","));

  const csvContent = "\uFEFF" + [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Danh_sach_phong_van_AI_${jobTitle.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success("Xuất file CSV thành công", `Đã xuất ${rows.length} phiên phỏng vấn`);
}

function ScoreCell({ row }: { row: AiInterviewRow }) {
  if (row.status === "SCORING") {
    return <span className="text-xs italic text-blue-600 dark:text-blue-400">Đang tổng hợp điểm...</span>;
  }
  if (row.overallScore == null) {
    return <span className="text-xs italic text-slate-400 dark:text-slate-500">Chưa có điểm</span>;
  }
  const pct = Math.min(Math.max(row.overallScore, 0), 100);
  const isPassed = row.passingScore != null ? row.overallScore >= row.passingScore : row.overallScore >= 50;

  return (
    <div className="flex w-36 flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {row.overallScore.toFixed(1)} <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">/100</span>
        </span>
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            isPassed
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
              : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
          )}
        >
          {isPassed ? "Đạt" : "Chưa đạt"}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isPassed ? "bg-emerald-500" : "bg-rose-500"
          )}
          style={{ width: `${pct}%` }}
        />
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
  items: { label: string; icon: typeof Copy; danger?: boolean; disabled?: boolean; title?: string; onClick: () => void }[];
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
    <div
      ref={ref}
      className="absolute right-0 top-10 z-40 flex w-52 flex-col rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-50 zoom-in-95"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            type="button"
            disabled={item.disabled}
            title={item.title}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-left transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
              item.danger
                ? "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            )}
            onClick={() => {
              item.onClick();
              onClose();
            }}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
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
  const [params, setParams] = useSearchParams();
  const { interviews, applicants, rows } = useJobAiInterviews(job.id);

  const activeSubNavTab = (params.get("tab") as AiInterviewTab) || "sessions";

  const [tab, setTab] = useState<QuickTab>("ALL");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AiInterviewStatus | "all">("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [menuId, setMenuId] = useState<number | null>(null);
  const [pageSize, setPageSize] = useState<number>(20);
  const [page, setPage] = useState<number>(1);
  const [jumpVal, setJumpVal] = useState("");
  const [isTableTransitioning, setIsTableTransitioning] = useState(false);
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<"status" | "time" | "export" | null>(null);

  const subQuery = useQuery({
    queryKey: ["tenant-subscription-quota"],
    queryFn: companyApi.getSubscription,
  });
  const sub = subQuery.data?.data;

  // Sync direct URL parameters (e.g. from RankingDetail)
  useEffect(() => {
    const appId = params.get("applicationId");
    const intId = params.get("interviewId");
    if (appId && rows.length > 0) {
      const match = rows.find((r) => String(r.applicationId) === appId);
      if (match) setDetailId(match.id);
    } else if (intId && rows.length > 0) {
      const match = rows.find((r) => String(r.id) === intId);
      if (match) setDetailId(match.id);
    }
  }, [params, rows]);

  // Click outside listener for dropdowns
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

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = useMemo(
    () => filtered.slice(startIndex, startIndex + pageSize),
    [filtered, startIndex, pageSize],
  );
  const pageItems = useMemo(() => getPaginationItems(currentPage, totalPages), [currentPage, totalPages]);

  const detailRow = rows.find((r) => r.id === detailId);

  const triggerTableTransition = (action: () => void) => {
    setIsTableTransitioning(true);
    action();
    setTimeout(() => {
      setIsTableTransitioning(false);
    }, 200);
  };

  const goToPage = (nextPage: number, nextSize: number = pageSize) => {
    const calcTotalPages = Math.max(1, Math.ceil(totalItems / nextSize));
    const target = Math.max(1, Math.min(nextPage, calcTotalPages));
    triggerTableTransition(() => {
      setPage(target);
      if (nextSize !== pageSize) {
        setPageSize(nextSize);
      }
    });
  };

  const resetFilters = () => {
    setTab("ALL");
    setQuery("");
    setStatusFilter("all");
    setTimeRange("all");
    setPage(1);
  };

  const pageIds = pageRows.map((row) => row.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const toggleAllPage = () => {
    setSelected((prev) => (allPageSelected ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]));
  };
  const toggleOne = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
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

  const tabsConfig: { id: QuickTab; label: string; count: number; live?: boolean }[] = [
    { id: "ALL", label: "Tất cả", count: counts.all },
    { id: "QUESTIONS_READY", label: "Đã có câu hỏi", count: counts.ready },
    { id: "IN_PROGRESS", label: "Đang diễn ra", count: counts.live, live: true },
    { id: "SCORING", label: "Đang chấm", count: counts.scoring },
    { id: "SCORED", label: "Đã chấm xong", count: counts.scored },
  ];

  const handleSubNavChange = (nextTab: AiInterviewTab) => {
    const nextParams = new URLSearchParams(params);
    if (nextTab === "sessions") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", nextTab);
    }
    setParams(nextParams);
  };

  return (
    <section className="flex flex-col gap-3.5 text-[var(--color-on-surface)]">
      {/* 1. Assessment-Style Sub Navigation Bar */}
      <AiInterviewSubNav
        jobId={job.id}
        activeTab={activeSubNavTab}
        onTabChange={handleSubNavChange}
      />

      {/* Subscription Alert Warning */}
      {sub && !sub.aiInterviewAllowed && (
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/80 p-4 text-amber-900 shadow-2xs dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <Ban className="size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <p className="text-xs sm:text-sm">
            {!sub.aiInterviewEnabled ? (
              <>
                Gói dịch vụ hiện tại (<strong>{sub.planName}</strong>) không bao gồm tính năng{" "}
                <strong>Phỏng vấn AI Voice (0 giờ/tháng)</strong>. Vui lòng nâng cấp lên gói{" "}
                <strong>Professional</strong> hoặc <strong>Enterprise</strong> để mở khóa.
              </>
            ) : (
              <>
                Workspace đã sử dụng hết 100% hạn mức thời lượng Phỏng vấn AI Voice trong tháng (
                <strong>
                  {(sub.usedAiInterviewSeconds / 3600).toFixed(1)}/{sub.maxAiInterviewHours} giờ
                </strong>
                ). Vui lòng nâng cấp gói dịch vụ để tiếp tục tạo phiên phỏng vấn mới.
              </>
            )}
          </p>
        </div>
      )}

      <AssessmentError error={interviews.error} retry={() => void interviews.refetch()} />
      <AssessmentError error={applicants.error} retry={() => void applicants.refetch()} />

      {/* TAB CONTENT: CẤU HÌNH (CONFIG) */}
      {activeSubNavTab === "config" && (
        <div className="animate-in fade-in-50 duration-200">
          <AiInterviewConfigPanel jobId={job.id} onOpenDetail={(id) => setDetailId(id)} />
        </div>
      )}

      {/* TAB CONTENT: THEO DÕI KẾT QUẢ / NỘP BÀI (TRACKING) */}
      {activeSubNavTab === "tracking" && (
        <div className="flex flex-col gap-4 animate-in fade-in-50 duration-200">
          {/* 4 Metric KPI Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {/* Card 1: Tổng số phiên */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng số phiên</span>
                <div className="grid size-8 place-items-center rounded-xl bg-blue-50 text-[#0066FF] dark:bg-blue-950/40 dark:text-blue-400">
                  <LayoutList className="size-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    {counts.all}
                  </p>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#0066FF] dark:bg-blue-950/50 dark:text-blue-300">
                    Đang mở
                  </span>
                </div>
                <p className="mt-2 truncate text-xs text-slate-500 dark:text-slate-400">
                  Vị trí: <strong className="text-slate-700 dark:text-slate-300">{job.title}</strong>
                </p>
              </div>
            </div>

            {/* Card 2: Đang diễn ra */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đang diễn ra</span>
                  {counts.live > 0 && (
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-400 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-sky-500" />
                    </span>
                  )}
                </div>
                <div className="grid size-8 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
                  <AudioLines className="size-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    {counts.live}
                  </p>
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                    {counts.live > 0 ? "Trực tiếp" : "Không có"}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className={cn("size-1.5 rounded-full", counts.live > 0 ? "bg-sky-500 animate-pulse" : "bg-slate-300 dark:bg-slate-600")} />
                  <p className="truncate">
                    {counts.live > 0 ? `${counts.live} ứng viên đang trong phòng phỏng vấn` : "Chờ ứng viên truy cập phòng thi"}
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3: Đã chấm điểm */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đã chấm điểm</span>
                <div className="grid size-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    {counts.scored}
                  </p>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    Sẵn sàng xem
                  </span>
                </div>
                <p className="mt-2 truncate text-xs text-slate-500 dark:text-slate-400">
                  Đã tổng hợp điểm và feedback AI đầy đủ
                </p>
              </div>
            </div>

            {/* Card 4: Tỷ lệ hoàn tất */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tỷ lệ hoàn tất phiên</span>
                <div className="grid size-8 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
                  <Sparkles className="size-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                    {completionRate}%
                  </p>
                  <span className="inline-flex items-center text-[11px] font-semibold text-[#0066FF]">
                    <ArrowUpRight className="size-3.5" aria-hidden="true" /> {counts.scored}/{counts.all} phiên
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-[#0066FF] transition-all duration-500"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
                <p className="mt-2 truncate text-xs text-slate-500 dark:text-slate-400">
                  Số phiên đã chấm trên tổng số phiên được tạo
                </p>
              </div>
            </div>
          </div>

          {/* Subscription Usage Card if available */}
          {sub && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-[#0066FF] dark:bg-blue-950/60 dark:text-blue-400">
                  <Bot className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Hạn mức thời lượng AI Voice · Gói {sub.planName}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {!sub.aiInterviewEnabled
                      ? "Gói dịch vụ không bao gồm AI Voice"
                      : sub.maxAiInterviewHours < 0
                      ? "Hạn mức phỏng vấn AI không giới hạn"
                      : `Đã sử dụng ${(sub.usedAiInterviewSeconds / 3600).toFixed(1)} / ${sub.maxAiInterviewHours} giờ`}
                  </p>
                </div>
              </div>
              {sub.aiInterviewEnabled && sub.maxAiInterviewHours > 0 && (
                <div className="w-full sm:w-60">
                  <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    <span>Thời lượng đã dùng</span>
                    <span>{Math.round(((sub.usedAiInterviewSeconds / 3600) / sub.maxAiInterviewHours) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-[#0066FF] transition-all"
                      style={{
                        width: `${Math.min(100, Math.round(((sub.usedAiInterviewSeconds / 3600) / sub.maxAiInterviewHours) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scored / Completed Interviews Overview */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 p-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Kết quả phỏng vấn ứng viên đã hoàn tất
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Danh sách ứng viên đã hoàn thành phiên phỏng vấn và nhận phân tích năng lực từ AI
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSubNavChange("sessions")}
                className="text-xs font-semibold text-[#0066FF] hover:underline cursor-pointer"
              >
                Xem toàn bộ phiên →
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {rows.filter((r) => r.status === "SCORED" || r.status === "PASSED" || r.status === "FAILED").length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  Chưa có phiên phỏng vấn nào hoàn tất và được chấm điểm.
                </div>
              ) : (
                rows
                  .filter((r) => r.status === "SCORED" || r.status === "PASSED" || r.status === "FAILED")
                  .slice(0, 10)
                  .map((row) => {
                    const name = candidateName(row);
                    return (
                      <div
                        key={row.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-3.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-[#0066FF] border border-blue-200/60 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900">
                            {initials(name)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {name}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">
                              {row.application?.candidateEmail ?? "—"} • Đơn #{row.applicationId}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <ScoreCell row={row} />
                          <button
                            type="button"
                            onClick={() => setDetailId(row.id)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            <Eye className="size-3.5 text-slate-400" />
                            <span>Xem báo cáo</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PHIÊN PHỎNG VẤN (SESSIONS) */}
      {activeSubNavTab === "sessions" && (
        <>
          {/* Multi-Select Floating / Top Batch Action Bar */}
          {selected.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#213145] px-4 py-2.5 text-white shadow-xl animate-in fade-in slide-in-from-top-2">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="grid size-6 place-items-center rounded-full bg-[var(--color-primary)] text-xs font-bold">
                  {selected.length}
                </span>
                <span className="font-medium">Đã chọn {selected.length} phiên phỏng vấn</span>
                <button
                  type="button"
                  className="text-xs text-sky-200 hover:underline cursor-pointer"
                  onClick={() => setSelected(pageRows.map((row) => row.id))}
                >
                  Chọn toàn bộ {pageRows.length} phiên trên trang
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const selectedRows = filtered.filter((r) => selected.includes(r.id));
                    exportCsv(selectedRows, job.title);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <Download className="size-3.5" /> Xuất file CSV ({selected.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="inline-flex items-center gap-1 rounded-xl bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="size-3.5" /> Bỏ chọn
                </button>
              </div>
            </div>
          )}

          {/* Main Data Card with Toolbar, Tabs, Table & Pagination */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            {/* Sub-status Quick Tabs (Segmented Control matching Assessment) */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 p-3 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none rounded-xl bg-slate-100/70 p-1 dark:bg-slate-800/60 shrink-0">
                {tabsConfig.map((item) => {
                  const active = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setTab(item.id);
                        setPage(1);
                      }}
                      className={cn(
                        "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                        active
                          ? "bg-white font-semibold text-[#0066FF] shadow-xs dark:bg-slate-900 dark:text-blue-400"
                          : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                      )}
                    >
                      {item.live && (
                        <span className="size-1.5 rounded-full bg-sky-500 animate-pulse" />
                      )}
                      <span>{item.label}</span>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.2 text-[10px] font-mono",
                          active
                            ? "bg-blue-50 text-[#0066FF] dark:bg-blue-950/80 dark:text-blue-300"
                            : "bg-slate-200/70 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400"
                        )}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5">
                {/* View Mode Toggle */}
                <div className="flex items-center rounded-xl bg-slate-100/70 p-0.5 dark:bg-slate-800/60">
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={cn(
                      "inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-medium transition-colors cursor-pointer",
                      viewMode === "table"
                        ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-slate-100"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                    )}
                    aria-label="Xem dạng bảng"
                  >
                    <LayoutList className="size-3.5 text-[#0066FF]" aria-hidden="true" />
                    <span>Bảng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("kanban")}
                    className={cn(
                      "inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-medium transition-colors cursor-pointer",
                      viewMode === "kanban"
                        ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-slate-100"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                    )}
                    aria-label="Xem dạng Kanban"
                  >
                    <Kanban className="size-3.5 text-slate-500" aria-hidden="true" />
                    <span>Kanban</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Toolbar: Search, Filters & Primary Create Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 p-3 bg-white dark:bg-slate-900">
              <div className="flex min-w-[280px] flex-1 flex-wrap items-center gap-2">
                {/* Search Input */}
                <div className="relative min-w-[220px] max-w-sm flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-8 text-xs outline-none transition-[box-shadow,border-color] placeholder:text-slate-400 focus:border-[#0066FF] focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/60 dark:focus:bg-slate-900"
                    placeholder="Tìm theo ứng viên, email, mã #AI-..."
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setPage(1);
                    }}
                  />
                  {query && (
                    <button
                      type="button"
                      aria-label="Xóa tìm kiếm"
                      onClick={() => {
                        setQuery("");
                        setPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown Panel: Trạng thái chi tiết */}
                <div className="relative" data-dropdown-root>
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === "status" ? null : "status")}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                      statusFilter !== "all"
                        ? "border-blue-300 bg-blue-50 text-[#0066FF] font-semibold dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300 shadow-2xs"
                        : "border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
                    )}
                    aria-expanded={activeDropdown === "status"}
                  >
                    <Filter className="size-3.5 text-slate-400" />
                    <span>
                      {statusFilter === "all" ? "Tất cả trạng thái" : aiStatusLabel[statusFilter]}
                    </span>
                    <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform", activeDropdown === "status" && "rotate-180")} />
                  </button>

                  {activeDropdown === "status" && (
                    <div className="absolute left-0 top-full mt-1.5 z-40 w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-50 zoom-in-95">
                      <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Lọc theo trạng thái
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter("all");
                          setPage(1);
                          setActiveDropdown(null);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer",
                          statusFilter === "all"
                            ? "bg-blue-50 font-semibold text-[#0066FF] dark:bg-blue-950/60 dark:text-blue-300"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        <span>Tất cả trạng thái</span>
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                          {counts.all}
                        </span>
                      </button>
                      {AI_INTERVIEW_STATUSES.map((s) => {
                        const rowCount = rows.filter((r) => r.status === s).length;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setStatusFilter(s);
                              setPage(1);
                              setActiveDropdown(null);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer",
                              statusFilter === s
                                ? "bg-blue-50 font-semibold text-[#0066FF] dark:bg-blue-950/60 dark:text-blue-300"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className={cn("size-2 rounded-full", s === "SCORED" || s === "PASSED" ? "bg-emerald-500" : s === "IN_PROGRESS" ? "bg-sky-500" : s === "QUESTIONS_READY" ? "bg-amber-500" : s === "FAILED" || s === "ERROR" ? "bg-rose-500" : "bg-slate-400")} />
                              <span>{aiStatusLabel[s]}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                                {rowCount}
                              </span>
                              {statusFilter === s && <Check className="size-3.5 text-[#0066FF]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Dropdown Panel: Khung thời gian */}
                <div className="relative" data-dropdown-root>
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === "time" ? null : "time")}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                      timeRange !== "all"
                        ? "border-blue-300 bg-blue-50 text-[#0066FF] font-semibold dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300 shadow-2xs"
                        : "border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
                    )}
                    aria-expanded={activeDropdown === "time"}
                  >
                    <span>
                      {timeRange === "all" ? "Tất cả thời gian" : timeRange === "7" ? "7 ngày qua" : timeRange === "30" ? "30 ngày qua" : "90 ngày qua"}
                    </span>
                    <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform", activeDropdown === "time" && "rotate-180")} />
                  </button>

                  {activeDropdown === "time" && (
                    <div className="absolute left-0 top-full mt-1.5 z-40 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-50 zoom-in-95">
                      <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Thời gian tạo phiên
                      </p>
                      {[
                        { value: "all", label: "Tất cả thời gian" },
                        { value: "7", label: "7 ngày qua" },
                        { value: "30", label: "30 ngày qua" },
                        { value: "90", label: "90 ngày qua" },
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            setTimeRange(item.value as TimeRange);
                            setPage(1);
                            setActiveDropdown(null);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer",
                            timeRange === item.value
                              ? "bg-blue-50 font-semibold text-[#0066FF] dark:bg-blue-950/60 dark:text-blue-300"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                        >
                          <span>{item.label}</span>
                          {timeRange === item.value && <Check className="size-3.5 text-[#0066FF]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {/* Dropdown Panel: Xuất file */}
                <div className="relative" data-dropdown-root>
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === "export" ? null : "export")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
                    aria-expanded={activeDropdown === "export"}
                  >
                    <Download className="size-3.5 text-slate-500" />
                    <span>Xuất file</span>
                    <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform", activeDropdown === "export" && "rotate-180")} />
                  </button>

                  {activeDropdown === "export" && (
                    <div className="absolute right-0 top-full mt-1.5 z-40 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-50 zoom-in-95">
                      <button
                        type="button"
                        onClick={() => {
                          exportCsv(filtered, job.title);
                          setActiveDropdown(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Download className="size-4 text-emerald-600" />
                        <div className="text-left">
                          <p className="font-semibold">Xuất toàn bộ bộ lọc</p>
                          <p className="text-[10px] text-slate-400">{filtered.length} phiên</p>
                        </div>
                      </button>
                      {selected.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const selectedRows = filtered.filter((r) => selected.includes(r.id));
                            exportCsv(selectedRows, job.title);
                            setActiveDropdown(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-t border-slate-100 dark:border-slate-800"
                        >
                          <Download className="size-4 text-blue-600" />
                          <div className="text-left">
                            <p className="font-semibold">Xuất phiên đã chọn</p>
                            <p className="text-[10px] text-slate-400">{selected.length} phiên đã chọn</p>
                          </div>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Primary Action Button: Tạo phỏng vấn mới (matching Assessment) */}
                <button
                  type="button"
                  disabled={Boolean(sub && !sub.aiInterviewAllowed)}
                  title={
                    sub && !sub.aiInterviewEnabled
                      ? `Gói ${sub.planName} không bao gồm tính năng Phỏng vấn AI Voice`
                      : sub && !sub.aiInterviewAllowed
                      ? "Đã hết hạn mức thời lượng Phỏng vấn AI Voice trong tháng"
                      : undefined
                  }
                  onClick={() => setCreating(true)}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold shadow-xs transition-colors cursor-pointer",
                    sub && !sub.aiInterviewAllowed
                      ? "cursor-not-allowed bg-slate-200 text-slate-500 shadow-none dark:bg-slate-800 dark:text-slate-400"
                      : "bg-[#0066FF] text-white hover:bg-blue-700"
                  )}
                >
                  {sub && !sub.aiInterviewAllowed ? (
                    <>
                      <Ban className="size-3.5" aria-hidden="true" />
                      <span>{!sub.aiInterviewEnabled ? "Khóa theo gói" : "Hết hạn mức"}</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="size-3.5" aria-hidden="true" />
                      <span>Tạo phỏng vấn mới</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Active Filter Chips Bar */}
            {(query || statusFilter !== "all" || timeRange !== "all" || tab !== "ALL") && (
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800 px-4 py-2 text-xs bg-slate-50/40 dark:bg-slate-800/20">
                <span className="font-medium text-slate-400">Bộ lọc đang bật:</span>
                {query && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-[#0066FF] dark:bg-blue-950/60 dark:text-blue-300 px-2.5 py-0.5 text-xs font-medium">
                    Từ khóa: "{query}"
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="rounded-full p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer"
                      aria-label="Xóa từ khóa tìm kiếm"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                )}
                {statusFilter !== "all" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-[#0066FF] dark:bg-blue-950/60 dark:text-blue-300 px-2.5 py-0.5 text-xs font-medium">
                    Trạng thái: {aiStatusLabel[statusFilter]}
                    <button
                      type="button"
                      onClick={() => setStatusFilter("all")}
                      className="rounded-full p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer"
                      aria-label="Xóa lọc trạng thái"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                )}
                {timeRange !== "all" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-[#0066FF] dark:bg-blue-950/60 dark:text-blue-300 px-2.5 py-0.5 text-xs font-medium">
                    Thời gian: {timeRange} ngày qua
                    <button
                      type="button"
                      onClick={() => setTimeRange("all")}
                      className="rounded-full p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer"
                      aria-label="Xóa lọc thời gian"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                )}
                {tab !== "ALL" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-[#0066FF] dark:bg-blue-950/60 dark:text-blue-300 px-2.5 py-0.5 text-xs font-medium">
                    Tab: {tabsConfig.find((t) => t.id === tab)?.label}
                    <button
                      type="button"
                      onClick={() => setTab("ALL")}
                      className="rounded-full p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer"
                      aria-label="Về tab tất cả"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={resetFilters}
                  className="ml-auto text-xs font-semibold text-[#0066FF] hover:underline dark:text-blue-400 cursor-pointer"
                >
                  Xóa tất cả bộ lọc
                </button>
              </div>
            )}

            {/* Loading skeleton */}
            {interviews.isPending && (
              <div className="p-4">
                <TableSkeleton columns={9} rows={5} className="min-w-0 w-full border-0" />
              </div>
            )}

            {/* Empty state */}
            {interviews.isSuccess && !pageRows.length && (
              <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                <div className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-[#0066FF] dark:bg-blue-950/60 dark:text-blue-400 shadow-2xs">
                  <Bot className="size-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {rows.length === 0 ? "Chưa có phiên phỏng vấn AI nào" : "Không có phiên phù hợp bộ lọc"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                    {rows.length === 0
                      ? "Tạo phiên phỏng vấn tự động cho ứng viên đã qua vòng lọc CV."
                      : "Thử thay đổi từ khóa tìm kiếm hoặc đặt lại các bộ lọc."}
                  </p>
                </div>
                {rows.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0066FF] px-4 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    <PlusCircle className="size-4" aria-hidden="true" />
                    Tạo phỏng vấn mới
                  </button>
                )}
              </div>
            )}

            {/* Data View */}
            {viewMode === "table" ? (
              pageRows.length > 0 && (
                <>
                  <div
                    className={cn(
                      "overflow-x-auto transition-opacity duration-200",
                      isTableTransitioning && "opacity-50 pointer-events-none"
                    )}
                  >
                    <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="h-11 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/70 dark:border-slate-800">
                          <th className="w-10 px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              className="size-4 cursor-pointer accent-[#0066FF] rounded"
                              checked={allPageSelected}
                              onChange={toggleAllPage}
                              aria-label="Chọn tất cả phiên trên trang"
                            />
                          </th>
                          <th className="px-4 py-2">Phiên &amp; Mã</th>
                          <th className="px-4 py-2">Ứng viên</th>
                          <th className="px-4 py-2">Vị trí</th>
                          <th className="px-4 py-2">Hình thức AI</th>
                          <th className="px-4 py-2">Thời gian</th>
                          <th className="px-4 py-2">Trạng thái</th>
                          <th className="px-4 py-2">Đánh giá AI</th>
                          <th className="px-4 py-2 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {pageRows.map((row) => {
                          const schedule = scheduleOf(row);
                          const name = candidateName(row);
                          const isRowSelected = selected.includes(row.id);

                          return (
                            <tr
                              key={row.id}
                              className={cn(
                                "group transition-colors",
                                isRowSelected
                                  ? "bg-blue-50/50 dark:bg-blue-950/30"
                                  : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                              )}
                            >
                              <td className="w-10 px-3 py-3 text-center">
                                <input
                                  type="checkbox"
                                  className="size-4 cursor-pointer accent-[#0066FF] rounded"
                                  checked={isRowSelected}
                                  onChange={() => toggleOne(row.id)}
                                  aria-label={`Chọn phiên ${row.id}`}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => setDetailId(row.id)}
                                    className="text-left text-sm font-semibold tracking-tight text-slate-900 hover:text-[#0066FF] dark:text-slate-100 dark:hover:text-blue-400 transition-colors cursor-pointer"
                                  >
                                    AI Interview · {job.title}
                                  </button>
                                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400 dark:text-slate-500">
                                    <Tag className="size-3" aria-hidden="true" />
                                    <span>#AI-{row.id}</span>
                                    <span>•</span>
                                    <span>Đạt {row.passingScore ?? "—"}/100</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-[#0066FF] border border-blue-200/60 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900 shadow-2xs">
                                    {initials(name)}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-semibold text-slate-900 dark:text-slate-100 truncate text-xs">
                                      {name}
                                    </span>
                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                                      {row.application?.candidateEmail ?? "—"}
                                    </span>
                                    <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-[#0066FF] dark:text-blue-400">
                                      <FileText className="size-2.5" aria-hidden="true" />
                                      Đơn #{row.applicationId}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col">
                                  <span className="font-medium text-xs text-slate-800 dark:text-slate-200">
                                    {row.application?.jobTitle ?? job.title}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                                    <Building2 className="size-3" aria-hidden="true" />
                                    {[row.application?.jobDepartment, row.application?.jobLocation].filter(Boolean).join(" · ") || "—"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                  <Type className="size-3 text-slate-400" aria-hidden="true" />
                                  Văn bản
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{schedule.label}</span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{schedule.hint}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <AiStatusBadge status={row.status} />
                              </td>
                              <td className="px-4 py-3">
                                <ScoreCell row={row} />
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="relative flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setDetailId(row.id)}
                                    className="inline-flex h-8 items-center gap-1 rounded-xl bg-blue-50 px-2.5 text-xs font-semibold text-[#0066FF] hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                                  >
                                    <span>{row.status === "SCORED" || row.status === "PASSED" || row.status === "FAILED" ? "Xem feedback" : "Chi tiết"}</span>
                                    <ArrowRight className="size-3.5" aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    className="flex size-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                    aria-label="Thêm thao tác"
                                    onClick={() => setMenuId(menuId === row.id ? null : row.id)}
                                  >
                                    <MoreVertical className="size-4" aria-hidden="true" />
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
                                      {
                                        label: "Xoá phiên này",
                                        icon: Ban,
                                        danger: true,
                                        disabled: !!row.startedAt || !["CREATED", "QUESTIONS_READY", "ERROR"].includes(row.status),
                                        title: "Chỉ được xóa phiên chưa bắt đầu ở trạng thái mới tạo, sẵn sàng hoặc lỗi.",
                                        onClick: () => confirmDelete(row),
                                      },
                                    ]}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination matching AssessmentsPage */}
                  <div className="flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>
                        Hiển thị{" "}
                        <strong className="text-slate-900 dark:text-slate-100 font-semibold">
                          {totalItems === 0 ? 0 : startIndex + 1} - {Math.min(startIndex + pageSize, totalItems)}
                        </strong>{" "}
                        trên{" "}
                        <strong className="text-slate-900 dark:text-slate-100 font-semibold">{totalItems}</strong> phiên
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <div className="flex items-center gap-1.5">
                        <span>Dòng mỗi trang:</span>
                        <select
                          className="h-8 rounded-lg border border-slate-200 bg-slate-50/60 px-2 text-xs font-medium text-slate-700 outline-none hover:border-slate-300 focus:border-[#0066FF] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                          value={pageSize}
                          onChange={(e) => {
                            const newSize = Number(e.target.value);
                            goToPage(1, newSize);
                          }}
                        >
                          {PAGE_SIZE_OPTIONS.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        aria-label="Về trang đầu"
                        onClick={() => goToPage(1)}
                        disabled={currentPage <= 1}
                        className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <ChevronsLeft className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Trang trước"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="size-4" />
                      </button>

                      <div className="flex items-center gap-1">
                        {pageItems.map((item, index) => {
                          if (item === "ellipsis-start" || item === "ellipsis-end") {
                            return (
                              <span key={`${item}-${index}`} className="px-1 text-slate-400">
                                …
                              </span>
                            );
                          }
                          const isCurrent = item === currentPage;
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => goToPage(item)}
                              className={cn(
                                "flex size-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                                isCurrent
                                  ? "bg-[#0066FF] text-white shadow-2xs"
                                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                              )}
                            >
                              {item}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        aria-label="Trang sau"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Đến trang cuối"
                        onClick={() => goToPage(totalPages)}
                        disabled={currentPage >= totalPages}
                        className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <ChevronsRight className="size-4" />
                      </button>

                      <div className="ml-2 flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
                        <span className="text-[11px] text-slate-400">Nhảy tới:</span>
                        <input
                          type="number"
                          min={1}
                          max={totalPages}
                          value={jumpVal}
                          onChange={(e) => setJumpVal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const p = parseInt(jumpVal, 10);
                              if (!isNaN(p)) {
                                goToPage(p);
                                setJumpVal("");
                              }
                            }
                          }}
                          placeholder={String(currentPage)}
                          className="h-8 w-12 rounded-lg border border-slate-200 bg-slate-50/60 px-1.5 text-center text-xs outline-none focus:border-[#0066FF] dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )
            ) : (
              <div className="p-12 text-center">
                <ListFilter className="mx-auto size-8 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Chế độ Kanban</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Chế độ Kanban đang được phát triển — hãy chuyển sang dạng Bảng để quản lý phiên.</p>
              </div>
            )}
          </div>

          {/* Workflow Explanation Box */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex flex-col items-start justify-between gap-5 lg:flex-row lg:items-center">
              <div className="flex max-w-md flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-[#0066FF] dark:bg-blue-950 dark:text-blue-300">
                    <Sparkles className="size-4" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Quy trình thiết lập phỏng vấn AI
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tạo phiên cho hồ sơ đạt vòng CV, sinh câu hỏi chuyên biệt và tự cập nhật trạng thái. AI phỏng vấn giọng nói/văn bản, tự chấm điểm và chuyển vòng.
                </p>
              </div>

              <div className="grid w-full flex-1 grid-cols-2 gap-2.5 sm:grid-cols-4 lg:w-auto">
                {[
                  { n: 1, icon: Upload, title: "Chọn hồ sơ ứng tuyển", desc: job.title },
                  { n: 2, icon: SlidersHorizontal, title: "Sinh câu hỏi AI", desc: "Tự động hoặc tùy chỉnh" },
                  { n: 3, icon: Inbox, title: "Ứng viên trả lời", desc: "Lưu bản ghi & transcript" },
                  { n: 4, icon: Verified, title: "Feedback & chuyển vòng", desc: "AI đánh giá & phân loại" },
                ].map((step) => {
                  const StepIcon = step.icon;
                  return (
                    <div
                      key={step.n}
                      className="flex flex-col gap-1 rounded-xl border border-slate-200/70 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex size-5 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-[#0066FF] border border-blue-200/60 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900">
                          {step.n}
                        </span>
                        <StepIcon className="size-3.5 text-[#0066FF] dark:text-blue-400" aria-hidden="true" />
                      </div>
                      <span className="mt-1 text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {step.title}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate leading-tight">
                        {step.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Dialogs & Drawers */}
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
