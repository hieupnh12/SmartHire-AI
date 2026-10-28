import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  CircleDashed,
  FileText,
  Inbox,
  ListChecks,
  Loader2,
  LoaderCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { cvApi } from "@/api/tenant/cvApi";
import { jobApi } from "@/api/tenant/jobApi";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/stores/toastStore";
import { button, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { DetailDialog } from "@/components/ux/DetailDialog";
import { CvFilePreview } from "@/components/shared/CvFilePreview";
import { ScreeningBreakdown } from "@/features/tenant/recruiter/cv-screening/components/ScreeningBreakdown";
import { GithubEvidencePanel } from "@/features/tenant/recruiter/cv-screening/components/GithubEvidencePanel";
import { CvScreeningDecision } from "@/features/tenant/recruiter/cv-screening/components/CvScreeningDecision";
import { Skeleton, SkeletonCard } from "@/components/ux/Skeleton";
import type { CvDetail, CvStatus } from "@/api/types/cv";

type Tone = "done" | "work" | "idle" | "fail";
type Tab = "ALL" | "SCORED" | "PROCESSING" | "FAILED";
type Sort = "newest" | "score";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

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

function HeaderMetricBarSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs" aria-hidden="true">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        {/* Left: 3 metric items */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {/* Tổng CV */}
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] sm:text-sm font-medium text-slate-700">Tổng CV:</span>
            <Skeleton className="h-6 w-10 rounded-md" />
          </div>

          <div className="hidden h-5 w-px bg-slate-200 sm:block" />

          {/* Đã chấm điểm */}
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] sm:text-sm font-medium text-slate-700">Đã chấm điểm:</span>
            <Skeleton className="h-6 w-10 rounded-md" />
          </div>

          <div className="hidden h-5 w-px bg-slate-200 sm:block" />

          {/* Điểm trung bình */}
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] sm:text-sm font-medium text-slate-700">Điểm trung bình:</span>
            <Skeleton className="h-6 w-14 rounded-md" />
          </div>
        </div>

        {/* Right: Skills skeleton */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-800">
            <ListChecks className="size-4 text-brand-primary/40" />
            <span className="text-[13px] sm:text-sm font-semibold text-slate-800">Bắt buộc:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Skeleton className="h-6 w-14 rounded-md" />
            <Skeleton className="h-6 w-12 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterBarSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white p-2 shadow-2xs sm:flex-row sm:items-center sm:justify-between" aria-hidden="true">
      {/* Left: 4 pill-tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto">
        <Skeleton className="h-8.5 w-20 rounded-lg" />
        <Skeleton className="h-8.5 w-28 rounded-lg" />
        <Skeleton className="h-8.5 w-24 rounded-lg" />
        <Skeleton className="h-8.5 w-16 rounded-lg" />
      </div>

      {/* Right: Sort dropdown */}
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-medium text-slate-400">Sắp xếp:</span>
        <Skeleton className="h-8.5 w-32 rounded-lg" />
      </div>
    </div>
  );
}

function TableRowsSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <tr key={index} className="border-b border-slate-100 last:border-b-0" aria-hidden="true">
          {/* Cột Ứng viên: 1 hình tròn Skeleton (Avatar) + 2 thanh chữ nhật mờ (Tên & Ngày nộp) */}
          <td className="py-3.5 pl-6 pr-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
            </div>
          </td>

          {/* Cột File CV: 1 thanh chữ nhật mờ dài dạng file */}
          <td className="px-4 py-3.5">
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200/60 bg-slate-50/60 px-2.5 py-1.5">
              <Skeleton className="size-4 rounded" />
              <Skeleton className="h-4 w-36 rounded" />
            </div>
          </td>

          {/* Cột Trạng thái: 1 pill badge mờ */}
          <td className="px-4 py-3.5">
            <Skeleton className="h-6 w-24 rounded-full" />
          </td>

          {/* Cột Điểm: 1 con số mờ + 1 thanh tiến trình (progress bar) màu xám mờ */}
          <td className="px-4 py-3.5">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-8 rounded" />
                <Skeleton className="h-4 w-14 rounded-full" />
              </div>
              <Skeleton className="h-1.5 w-28 rounded-full" />
            </div>
          </td>

          {/* Cột Thao tác: 1 chữ mờ đại diện cho nút Chi tiết */}
          <td className="py-3.5 pr-6 text-right">
            <Skeleton className="ml-auto h-8 w-20 rounded-lg" />
          </td>
        </tr>
      ))}
    </>
  );
}

const STATUS: Record<CvStatus, { label: string; tone: Tone }> = {
  UPLOADED: { label: "Chờ phân tích", tone: "idle" },
  PARSING: { label: "Đang đọc file", tone: "work" },
  PARSED: { label: "Đã đọc file", tone: "work" },
  EXTRACTING: { label: "Đang trích xuất", tone: "work" },
  ANALYZING: { label: "Đang phân tích", tone: "work" },
  ANALYZED: { label: "Đã phân tích", tone: "done" },
  FAILED: { label: "Lỗi xử lý", tone: "fail" },
};

const TONE_CLASS: Record<Tone, string> = {
  done: "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]",
  work: "bg-[var(--color-surface-container-high)] text-[var(--color-primary)]",
  idle: "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]",
  fail: "bg-[var(--color-error-container)] text-[var(--color-on-error-container)]",
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase() || "?";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}

export function CvScreeningPage() {
  const token = useAuthStore((s) => s.accessToken);
  const client = useQueryClient();
  const askConfirm = useUiStore((s) => s.askConfirm);
  const { id: routeJobId } = useParams<{ id?: string }>();
  const [params, setParams] = useSearchParams();
  const jobId = routeJobId && /^\d+$/.test(routeJobId) ? Number(routeJobId) : null;
  const requestedCvId = Number(params.get("cvId"));
  const [selectedId, setSelectedId] = useState<number | null>(Number.isInteger(requestedCvId) && requestedCvId > 0 ? requestedCvId : null);

  const requestedPage = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
  const rawSize = parseInt(params.get("limit") || params.get("size") || "10", 10);
  const requestedSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(rawSize) ? rawSize : 10;
  const requestedTab = (params.get("tab")?.toUpperCase() ?? "") as Tab;
  const initialTab: Tab = ["ALL", "SCORED", "PROCESSING", "FAILED"].includes(requestedTab) ? requestedTab : "ALL";
  const requestedSort = params.get("sort") as Sort;
  const initialSort: Sort = ["newest", "score"].includes(requestedSort) ? requestedSort : "newest";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [sort, setSort] = useState<Sort>(initialSort);
  const [page, setPage] = useState(requestedPage);
  const [pageSize, setPageSize] = useState(requestedSize);
  const [jumpVal, setJumpVal] = useState("");
  const [isTableTransitioning, setIsTableTransitioning] = useState(false);

  const list = useQuery({
    queryKey: [...queryKeys.cvs.byJob(jobId ?? 0), tab, sort, page, pageSize],
    queryFn: () =>
      cvApi.listByJob(jobId!, {
        tab: tab !== "ALL" ? tab : undefined,
        sort,
        page: page - 1,
        size: pageSize,
      }),
    placeholderData: keepPreviousData,
    enabled: jobId !== null && !!token,
    refetchInterval: 5_000,
  });
  const detail = useQuery({
    queryKey: queryKeys.cvs.detail(selectedId ?? 0),
    queryFn: () => cvApi.get(selectedId!),
    enabled: selectedId !== null,
    refetchInterval: 4_000,
  });
  const skills = useQuery({ queryKey: ["job-skills", jobId], queryFn: () => jobApi.skills(jobId!), enabled: jobId !== null });
  const retryParse = useMutation({
    mutationFn: (cvId: number) => cvApi.parse(cvId),
    onSuccess: (response, cvId) => {
      client.setQueryData(queryKeys.cvs.detail(cvId), response);
      void list.refetch();
      void detail.refetch();
      toast.success("Đã phân tích CV");
    },
  });
  const remove = useMutation({
    mutationFn: (cvId: number) => cvApi.remove(cvId),
    onSuccess: (_response, cvId) => {
      setSelectedId(null);
      client.removeQueries({ queryKey: queryKeys.cvs.detail(cvId) });
      void list.refetch();
      toast.success("Đã xóa CV");
    },
  });

  const pageResult = list.data?.data;
  const rows = pageResult?.items ?? [];
  const rowsPending = list.isPending;
  const rowsError = list.error;
  const cv = detail.data?.data;
  const jobSkills = skills.data?.data ?? [];
  const requiredSkills = jobSkills.filter((skill) => skill.required);
  const preferredSkills = jobSkills.filter((skill) => !skill.required);
  const isInitialLoading = (list.isPending && !list.data) || (skills.isPending && !skills.data);

  // Backend provides job-wide metrics regardless of the active tab/page
  const backendStats = pageResult?.stats;
  const counts = useMemo(() => {
    return {
      all: backendStats?.total ?? 0,
      scored: backendStats?.scored ?? 0,
      processing: backendStats?.processing ?? 0,
      failed: backendStats?.failed ?? 0,
      average: backendStats?.averageScore ?? null,
    };
  }, [backendStats]);

  const totalItems = pageResult?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = rows;
  const pageItems = useMemo(() => getPaginationItems(currentPage, totalPages), [currentPage, totalPages]);

  const triggerTableTransition = (action: () => void) => {
    setIsTableTransitioning(true);
    action();
    setTimeout(() => {
      setIsTableTransitioning(false);
    }, 220);
  };

  const goToPage = (nextPage: number, nextSize: number = pageSize) => {
    const calcTotalPages = Math.max(1, Math.ceil(totalItems / nextSize));
    const target = Math.max(1, Math.min(nextPage, calcTotalPages));
    triggerTableTransition(() => {
      setPage(target);
      if (nextSize !== pageSize) {
        setPageSize(nextSize);
      }
      const nextParams = new URLSearchParams(params);
      nextParams.set("page", String(target));
      nextParams.set("limit", String(nextSize));
      nextParams.delete("size");
      setParams(nextParams, { replace: true });
    });
  };

  const handleTabChange = (newTab: Tab) => {
    triggerTableTransition(() => {
      setTab(newTab);
      setPage(1);
      const nextParams = new URLSearchParams(params);
      if (newTab !== "ALL") nextParams.set("tab", newTab.toLowerCase());
      else nextParams.delete("tab");
      nextParams.set("page", "1");
      nextParams.set("limit", String(pageSize));
      nextParams.delete("size");
      setParams(nextParams, { replace: true });
    });
  };

  const handleSortChange = (newSort: Sort) => {
    triggerTableTransition(() => {
      setSort(newSort);
      setPage(1);
      const nextParams = new URLSearchParams(params);
      if (newSort !== "newest") nextParams.set("sort", newSort);
      else nextParams.delete("sort");
      nextParams.set("page", "1");
      nextParams.set("limit", String(pageSize));
      nextParams.delete("size");
      setParams(nextParams, { replace: true });
    });
  };

  // Sync state if browser Back/Forward or direct URL query changes
  useEffect(() => {
    const p = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
    const raw = parseInt(params.get("limit") || params.get("size") || "10", 10);
    const s = (PAGE_SIZE_OPTIONS as readonly number[]).includes(raw) ? raw : 10;
    if (p !== page) setPage(p);
    if (s !== pageSize) setPageSize(s);
    const t = (params.get("tab")?.toUpperCase() ?? "") as Tab;
    if (["ALL", "SCORED", "PROCESSING", "FAILED"].includes(t) && t !== tab) setTab(t);
    const so = params.get("sort") as Sort;
    if (["newest", "score"].includes(so) && so !== sort) setSort(so);
  }, [params]);

  useEffect(() => {
    if (!list.isFetching && totalItems > 0 && page > totalPages) {
      goToPage(totalPages);
    }
  }, [list.isFetching, totalItems, page, totalPages]);

  const confirmDelete = (target: CvDetail) =>
    askConfirm({
      title: "Xóa CV này khỏi job?",
      description: `CV của ${target.candidateName} và kết quả phân tích sẽ bị xóa. Không thể hoàn tác.`,
      confirmLabel: "Xóa CV",
      danger: true,
      onConfirm: async () => {
        await remove.mutateAsync(target.id);
      },
    });

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "ALL", label: "Tất cả", count: counts.all },
    { id: "SCORED", label: "Đã chấm điểm", count: counts.scored },
    { id: "PROCESSING", label: "Đang xử lý", count: counts.processing },
    { id: "FAILED", label: "Lỗi", count: counts.failed },
  ];

  if (!jobId) {
    return <Navigate to="/recruiter" replace />;
  }

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 text-[var(--color-on-surface)]">
      {/* 1. Compact Metric & Skills Toolbar (Khối 1) */}
      {isInitialLoading ? (
        <HeaderMetricBarSkeleton />
      ) : (
        <CompactMetricToolbar
          counts={counts}
          requiredSkills={requiredSkills}
          preferredSkills={preferredSkills}
        />
      )}

      {/* 2. Action Toolbar: Tabs on Left, Sort on Right (Khối 2) */}
      {isInitialLoading ? (
        <FilterBarSkeleton />
      ) : (
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white p-2 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
          {/* Left: Pill Tabs with Counts */}
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Lọc theo trạng thái">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => handleTabChange(item.id)}
                className={cn(
                  "inline-flex h-8.5 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-all",
                  tab === item.id
                    ? "bg-brand-primary font-semibold text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200/70 hover:text-slate-900",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[11px] font-bold tabular-nums",
                    tab === item.id
                      ? "bg-white/25 text-white"
                      : "bg-white text-slate-600 shadow-2xs",
                  )}
                >
                  {item.count}
                </span>
              </button>
            ))}
          </div>

          {/* Right: Sort dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-slate-500">Sắp xếp:</span>
            <select
              aria-label="Sắp xếp"
              className="h-8.5 cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] font-medium text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary shadow-2xs"
              value={sort}
              onChange={(e) => handleSortChange(e.target.value as Sort)}
            >
              <option value="newest">Mới nộp nhất</option>
              <option value="score">Điểm cao nhất</option>
            </select>
          </div>
        </div>
      )}

      {/* 3. Candidate CV Data Table (Khối 3) */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead>
              <tr className="h-11 select-none border-b border-slate-200/80 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-700">
                <th className="py-3 pl-6 pr-4">Ứng viên</th>
                <th className="px-4 py-3">File CV</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Điểm sàng lọc</th>
                <th className="py-3 pr-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isInitialLoading || isTableTransitioning || rowsPending ? (
                <TableRowsSkeleton rows={pageSize} />
              ) : rowsError ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm" role="alert">{getApiErrorMessage(rowsError)}</td></tr>
              ) : paginatedRows.length > 0 ? (
                paginatedRows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer transition-colors hover:bg-slate-50/80"
                    onClick={() => setSelectedId(row.id)}
                  >
                    <td className="py-3.5 pl-6 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary">
                          {initials(row.candidateName)}
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-semibold text-slate-900 leading-tight">{row.candidateName}</span>
                          <span className="text-xs text-slate-500">Nộp {formatDate(row.createdAt)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div
                        className="group inline-flex max-w-[260px] items-center gap-2 rounded-lg border border-slate-200/90 bg-slate-50 px-2.5 py-1.5 transition-all hover:border-brand-primary/40 hover:bg-white hover:shadow-2xs"
                        title={row.originalFilename}
                      >
                        <div className="flex size-6 shrink-0 items-center justify-center rounded bg-rose-500/10 text-rose-600">
                          <FileText className="size-3.5" aria-hidden="true" />
                        </div>
                        <span className="truncate text-[13px] font-medium text-slate-700 group-hover:text-brand-primary">
                          {row.originalFilename}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><CvStatusBadge status={row.status} /></td>
                    <td className="px-4 py-3.5"><ScoreCell score={row.matchScore} /></td>
                    <td className="py-3.5 pr-6 text-right">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedId(row.id); }}
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-primary/10 px-3 text-xs font-semibold text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
                      >
                        Chi tiết
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-14">
                    <div className="flex flex-col items-center text-center">
                      <Inbox className="size-8 text-slate-400" aria-hidden="true" />
                      <p className="mt-3 text-sm font-semibold text-slate-800">{rows.length === 0 ? "Chưa có CV cho job này" : "Không có CV phù hợp bộ lọc"}</p>
                      <p className="mt-1 max-w-md text-xs text-slate-500">
                        {rows.length === 0
                          ? "CV chỉ xuất hiện khi ứng viên apply vào job. Recruiter không tải CV hộ ứng viên."
                          : "Thử chọn tab trạng thái khác."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination Controls (Khối 4) */}
        {isInitialLoading ? (
          <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between" aria-hidden="true">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-48 rounded" />
            </div>
            <div className="flex items-center justify-start lg:justify-center">
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <div className="flex items-center gap-1 opacity-40 pointer-events-none">
              <Skeleton className="h-8 w-64 rounded-lg" />
            </div>
          </div>
        ) : totalItems > 0 ? (
          <div
            className={cn(
              "flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between transition-opacity",
              isTableTransitioning && "opacity-50 pointer-events-none"
            )}
          >
            {/* Nhóm Thông tin Dữ liệu (Left) */}
            <div className="flex items-center gap-2 text-xs sm:text-[13px] text-slate-600">
              <p>
                Hiển thị <strong className="font-semibold text-slate-900">{startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)}</strong> trên <strong className="font-semibold text-slate-900">{totalItems}</strong> CV
              </p>
              <span className="text-slate-300">·</span>
              <span className="tabular-nums">Trang {currentPage} / {totalPages}</span>
              {list.isFetching && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-primary ml-1" role="status">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  <span className="hidden sm:inline">Đang tải…</span>
                </span>
              )}
            </div>

            {/* Nhóm Chọn số bản ghi / trang (Center) */}
            <div className="flex items-center justify-start lg:justify-center">
              <label className="flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-600">
                <span>Hiển thị</span>
                <select
                  aria-label="Số CV mỗi trang"
                  value={pageSize}
                  onChange={(e) => {
                    const nextSize = Number(e.target.value);
                    goToPage(1, nextSize);
                  }}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs sm:text-[13px] font-semibold text-slate-800 shadow-2xs outline-none transition-colors hover:border-brand-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 cursor-pointer"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size} / trang
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Nhóm Điều hướng & Nhảy trang (Right) */}
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <nav className="flex items-center gap-1" aria-label="Phân trang danh sách CV">
                {/* First Page [|<] */}
                <button
                  type="button"
                  aria-label="Về trang đầu"
                  title="Về trang đầu (Trang 1)"
                  disabled={currentPage === 1}
                  onClick={() => goToPage(1)}
                  className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronsLeft className="size-4" aria-hidden="true" />
                </button>

                {/* Previous [<] */}
                <button
                  type="button"
                  aria-label="Trang trước"
                  title="Trang trước"
                  disabled={currentPage === 1}
                  onClick={() => goToPage(currentPage - 1)}
                  className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </button>

                {/* Page Number Buttons */}
                <div className="flex items-center gap-1">
                  {pageItems.map((item, idx) => {
                    if (typeof item !== "number") {
                      return (
                        <span
                          key={`${item}-${idx}`}
                          className="grid size-8 place-items-center text-xs text-slate-400 select-none"
                          aria-hidden="true"
                        >
                          …
                        </span>
                      );
                    }

                    const isActive = item === currentPage;
                    return (
                      <button
                        key={item}
                        type="button"
                        aria-label={`Trang ${item}`}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => goToPage(item)}
                        className={cn(
                          "grid size-8 place-items-center rounded-lg text-xs font-semibold transition-all shadow-2xs",
                          isActive
                            ? "bg-brand-primary text-white shadow-xs"
                            : "border border-slate-200 bg-white text-slate-700 hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary"
                        )}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>

                {/* Next [>] */}
                <button
                  type="button"
                  aria-label="Trang sau"
                  title="Trang sau"
                  disabled={currentPage >= totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                  className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </button>

                {/* Last Page [>|] */}
                <button
                  type="button"
                  aria-label="Đến trang cuối"
                  title={`Đến trang cuối (Trang ${totalPages})`}
                  disabled={currentPage >= totalPages}
                  onClick={() => goToPage(totalPages)}
                  className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronsRight className="size-4" aria-hidden="true" />
                </button>
              </nav>

              {/* Page Jumper */}
              <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" aria-hidden="true" />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const p = parseInt(jumpVal, 10);
                  if (!isNaN(p) && p >= 1 && p <= totalPages) {
                    goToPage(p);
                    setJumpVal("");
                  }
                }}
                className="flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-600"
              >
                <label htmlFor="jump-page-input-cvs" className="whitespace-nowrap">Đi đến:</label>
                <input
                  id="jump-page-input-cvs"
                  type="number"
                  min={1}
                  max={totalPages}
                  placeholder={String(currentPage)}
                  value={jumpVal}
                  onChange={(e) => setJumpVal(e.target.value)}
                  className="h-8 w-11 rounded-lg border border-slate-200 bg-white px-1 text-center text-xs font-semibold text-slate-800 shadow-2xs outline-none transition-colors hover:border-brand-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  title={`Nhập trang từ 1 đến ${totalPages}`}
                />
                <span className="text-xs">Trang</span>
                <button
                  type="submit"
                  disabled={!jumpVal || isNaN(Number(jumpVal)) || Number(jumpVal) < 1 || Number(jumpVal) > totalPages}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Đi
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </div>

          <DetailDialog open={selectedId != null} size="wide" title={cv?.candidateName ?? "Chi tiết CV"} onClose={() => setSelectedId(null)}>
        {detail.isPending && selectedId != null && (
          <div className="space-y-4" role="status" aria-busy="true">
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            </div>
            <SkeletonCard className="h-56" />
            <SkeletonCard className="h-44" />
            <span className="sr-only">Đang tải chi tiết CV…</span>
          </div>
        )}
        {cv && (
          <CvDetailPanel
            cv={cv}
            onRetry={() => retryParse.mutate(cv.id)}
            retryPending={retryParse.isPending}
            onDelete={() => confirmDelete(cv)}
            deletePending={remove.isPending}
          />
        )}
        {retryParse.isError && <p role="alert" className="mt-3 rounded-xl bg-[var(--color-error-container)] p-3 text-sm text-[var(--color-on-error-container)]">{getApiErrorMessage(retryParse.error)}</p>}
      </DetailDialog>
    </section>
  );
}

function CompactMetricToolbar({
  counts,
  requiredSkills,
  preferredSkills,
}: {
  counts: { all: number; scored: number; processing: number; failed: number; average: number | null };
  requiredSkills: { name: string }[];
  preferredSkills: { name: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const totalSkills = requiredSkills.length + preferredSkills.length;
  const maxVisibleSkills = 5;
  const visibleSkills = requiredSkills.slice(0, maxVisibleSkills);
  const remainingCount = requiredSkills.length - maxVisibleSkills;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
      {/* 1-Line / Responsive Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        {/* Left: Key Metrics with 20px-24px bold numbers & 13px-14px sentence case labels */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {/* Tổng CV */}
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] sm:text-sm font-medium text-slate-700">Tổng CV:</span>
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {counts.all}
            </span>
          </div>

          <div className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden="true" />

          {/* Đã chấm điểm */}
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] sm:text-sm font-medium text-slate-700">Đã chấm điểm:</span>
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {counts.scored}
            </span>
          </div>

          {counts.processing > 0 && (
            <>
              <div className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden="true" />
              {/* Đang xử lý */}
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] sm:text-sm font-medium text-slate-700">Đang xử lý:</span>
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-amber-600 tabular-nums">
                  {counts.processing}
                </span>
              </div>
            </>
          )}

          <div className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden="true" />

          {/* Điểm trung bình */}
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] sm:text-sm font-medium text-slate-700">Điểm trung bình:</span>
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-brand-primary tabular-nums">
              {counts.average == null ? "—" : counts.average.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-normal text-slate-400">/100</span>
          </div>
        </div>

        {/* Right: Job Required Skills summary (13px chips & semi-bold label) */}
        {totalSkills > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-800">
              <ListChecks className="size-4 text-brand-primary" aria-hidden="true" />
              <span className="text-[13px] sm:text-sm font-semibold text-slate-800">
                Bắt buộc ({requiredSkills.length}):
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {visibleSkills.map((s) => (
                <span
                  key={s.name}
                  className="rounded-md border border-slate-200/90 bg-slate-50 px-2.5 py-0.5 text-[13px] font-medium text-slate-700 shadow-2xs"
                >
                  {s.name}
                </span>
              ))}
              {remainingCount > 0 && !expanded && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="inline-flex items-center gap-1 rounded-md bg-brand-primary/10 px-2.5 py-0.5 text-[13px] font-semibold text-brand-primary transition-colors hover:bg-brand-primary/20"
                >
                  +{remainingCount} khác <ChevronDown className="size-3.5" />
                </button>
              )}
              {expanded && (
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-200/70 px-2.5 py-0.5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                >
                  Thu gọn <ChevronUp className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Collapsible Dropdown Panel for All Skills (Only when expanded) */}
      {expanded && (
        <div className="mt-1 flex flex-col gap-2.5 rounded-lg border border-slate-200/80 bg-slate-50/70 p-3">
          {requiredSkills.length > 0 && (
            <div className="flex flex-wrap items-start gap-2">
              <span className="min-w-28 text-[13px] font-semibold text-slate-700 pt-0.5">
                Bắt buộc ({requiredSkills.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {requiredSkills.map((s) => (
                  <span
                    key={s.name}
                    className="rounded-md border border-brand-primary/20 bg-brand-primary/10 px-2.5 py-0.5 text-[13px] font-medium text-brand-primary"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {preferredSkills.length > 0 && (
            <div className="flex flex-wrap items-start gap-2">
              <span className="min-w-28 text-[13px] font-semibold text-slate-700 pt-0.5">
                Tùy chọn ({preferredSkills.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {preferredSkills.map((s) => (
                  <span
                    key={s.name}
                    className="rounded-md border border-slate-200 bg-white px-2.5 py-0.5 text-[13px] font-medium text-slate-700"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CvStatusBadge({ status }: { status: CvStatus }) {
  const meta = STATUS[status] ?? { label: status, tone: "idle" as Tone };
  const Icon = meta.tone === "done" ? CheckCircle2 : meta.tone === "fail" ? AlertTriangle : meta.tone === "work" ? LoaderCircle : CircleDashed;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", TONE_CLASS[meta.tone])}>
      <Icon className={cn("size-3.5", meta.tone === "work" && "animate-spin motion-reduce:animate-none")} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function ScoreCell({ score }: { score: number | null }) {
  if (score == null) return <span className="text-xs italic text-slate-400">Chưa có điểm</span>;
  const num = Number(score);
  const pct = Math.min(Math.max(num, 0), 100);

  let levelColor = {
    text: "text-rose-600",
    bar: "bg-rose-500",
    track: "bg-rose-100/70",
    badge: "bg-rose-50 text-rose-700 border-rose-200/60",
    label: "Chưa đạt",
  };

  if (num >= 70) {
    levelColor = {
      text: "text-emerald-600",
      bar: "bg-emerald-500",
      track: "bg-emerald-100/70",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
      label: "Phù hợp",
    };
  } else if (num >= 50) {
    levelColor = {
      text: "text-amber-600",
      bar: "bg-amber-500",
      track: "bg-amber-100/70",
      badge: "bg-amber-50 text-amber-700 border-amber-200/60",
      label: "Cân nhắc",
    };
  }

  return (
    <div className="flex w-36 flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className={cn("text-sm font-bold tabular-nums", levelColor.text)}>
          {num.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}
          <span className="text-[10px] font-normal text-slate-400"> /100</span>
        </span>
        <span className={cn("rounded border px-1 py-0.2 text-[10px] font-semibold leading-tight", levelColor.badge)}>
          {levelColor.label}
        </span>
      </div>
      <div className={cn("h-2 w-full overflow-hidden rounded-full", levelColor.track)}>
        <div
          className={cn("h-full rounded-full transition-all duration-300", levelColor.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CvDetailPanel({ cv, onRetry, retryPending, onDelete, deletePending }: {
  cv: CvDetail;
  onRetry: () => void;
  retryPending: boolean;
  onDelete: () => void;
  deletePending: boolean;
}) {
  const canAnalyze = cv.status === "UPLOADED" || cv.status === "FAILED" || cv.status === "ANALYZED";
  const analyzed = cv.status === "ANALYZED";
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-surface-container-low)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-sm font-bold text-[var(--color-primary-hover)]">
            {initials(cv.candidateName)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{cv.candidateName}</p>
            <p className="truncate text-xs text-[var(--color-on-surface-variant)]">{cv.originalFilename} · Nộp {formatDate(cv.createdAt)}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <CvStatusBadge status={cv.status} />
              <span className="rounded-full bg-[var(--color-surface-card)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-on-surface-variant)]">
                {cv.extractionModel ?? "Chưa phân tích"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canAnalyze && (
            <button type="button" className={primary} disabled={retryPending || deletePending} onClick={onRetry}>
              {retryPending
                ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                : <RefreshCw className="size-4" aria-hidden="true" />}
              {retryPending ? "Đang phân tích…" : analyzed ? "Phân tích lại" : "Phân tích CV"}
            </button>
          )}
          <button
            type="button"
            className={cn(button, "hover:border-[var(--color-error)] hover:bg-[var(--color-error-container)] hover:text-[var(--color-on-error-container)]")}
            disabled={deletePending}
            onClick={onDelete}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {deletePending ? "Đang xóa…" : "Xóa CV"}
          </button>
        </div>
      </div>

      {cv.errorMessage && (
        <div role="alert" className="flex items-start gap-2 rounded-xl bg-[var(--color-error-container)] p-3 text-sm text-[var(--color-on-error-container)]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{cv.errorMessage}</span>
        </div>
      )}

      {cv.match
        ? <ScreeningBreakdown wide score={cv.match.score} modelVersion={cv.match.modelVersion} breakdown={cv.match.breakdown} />
        : (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[var(--color-border-default)] p-4 text-sm text-[var(--color-on-surface-variant)]">
            <CircleDashed className="size-5 shrink-0" aria-hidden="true" />
            Chưa có điểm sàng lọc. Bấm “Phân tích CV” để chấm theo yêu cầu của job.
          </div>
        )}

      <GithubEvidencePanel analysis={cv.githubAnalysis} />

      {cv.applicationId != null && <CvScreeningDecision applicationId={cv.applicationId} />}

      {(cv.skills.length > 0 || cv.analysis?.yearsExperience != null) && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Kỹ năng trích từ CV</h3>
            {cv.analysis?.yearsExperience != null && (
              <span className="text-xs text-[var(--color-on-surface-variant)]">{cv.analysis.yearsExperience} năm kinh nghiệm</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {cv.skills.map((skill) => (
              <span key={skill.canonicalName} className="rounded-full bg-[var(--color-surface-container-low)] px-3 py-1 text-xs font-medium">
                {skill.skillName}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">File CV</h3>
        <CvFilePreview cvId={cv.id} mimeType={cv.mimeType} filename={cv.originalFilename} />
      </div>
    </div>
  );
}
