import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  ArrowRight,
  Bot,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  History,
  Inbox,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Settings,
  StickyNote,
  UserCheck,
  Users,
  Workflow,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { applicantApi } from "@/api/tenant/applicantApi";
import { cvApi } from "@/api/tenant/cvApi";
import { jobApi } from "@/api/tenant/jobApi";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/stores/toastStore";
import { LoadingState, TableSkeleton } from "@/components/ux/Skeleton";
import { applicationStatusLabel, button, input, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { ApplicationPipeline } from "@/features/tenant/recruiter/matching/components/recruitmentFlow";
import { ApplicantRounds } from "@/features/tenant/recruiter/applicants/components/ApplicantRounds";
import { DetailDialog } from "@/components/ux/DetailDialog";
import { CvFilePreview } from "@/components/shared/CvFilePreview";
import { ScreeningBreakdown } from "@/features/tenant/recruiter/cv-screening/components/ScreeningBreakdown";
import { GithubEvidencePanel } from "@/features/tenant/recruiter/cv-screening/components/GithubEvidencePanel";
import { CvScreeningDecision } from "@/features/tenant/recruiter/cv-screening/components/CvScreeningDecision";
import type { ApplicationDetail, ApplicationSummary, CvRef } from "@/api/types/applicant";
import { PipelineBoard } from "@/features/tenant/recruiter/pipeline/pages/PipelinePage";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const STATUS_TABS = ["", "NEW", "IN_REVIEW", "ASSESSMENT", "INTERVIEW", "HUMAN_INTERVIEW", "OFFER", "HIRED", "REJECTED"];
const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-sky-50 text-sky-700",
  IN_REVIEW: "bg-amber-50 text-amber-700",
  ASSESSMENT: "bg-violet-50 text-violet-700",
  INTERVIEW: "bg-[var(--color-primary-soft)] text-brand-primary",
  HUMAN_INTERVIEW: "bg-[var(--color-primary-soft)] text-brand-primary",
  OFFER: "bg-indigo-50 text-indigo-700",
  HIRED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
  FAILED: "bg-rose-50 text-rose-800",
  WITHDRAWN: "bg-slate-100 text-slate-500",
};
const SOURCES = ["CAREER", "PORTAL", "REFERRAL", "MANUAL"];
const SOURCE_LABEL: Record<string, string> = {
  CAREER: "Trang tuyển dụng",
  PORTAL: "Cổng ứng viên",
  REFERRAL: "Giới thiệu",
  MANUAL: "Thêm thủ công",
};
const ACTION_TOAST = { reject: "Đã từ chối ứng viên", archive: "Đã lưu trữ hồ sơ", restore: "Đã khôi phục hồ sơ" } as const;

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

export function ApplicantsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const { id: routeJobId } = useParams<{ id?: string }>();
  const [params, setParams] = useSearchParams();
  const jobId = routeJobId && /^\d+$/.test(routeJobId) ? Number(routeJobId) : null;
  const boardView = routeJobId != null && params.get("view") === "board";
  const requestedApplicationId = Number(params.get("applicationId"));
  const [selectedId, setSelectedId] = useState<number | null>(Number.isInteger(requestedApplicationId) && requestedApplicationId > 0 ? requestedApplicationId : null);
  const [q, setQ] = useState(params.get("q") ?? "");
  const requestedStatus = params.get("status")?.toUpperCase() ?? "";
  const [status, setStatus] = useState(STATUS_TABS.includes(requestedStatus) ? requestedStatus : "");
  const requestedSource = params.get("source")?.toUpperCase() ?? "";
  const [source, setSource] = useState(SOURCES.includes(requestedSource) ? requestedSource : "");
  const [archived, setArchived] = useState(params.get("archived") === "true");

  const requestedPage = Math.max(0, (parseInt(params.get("page") || "1", 10) || 1) - 1);
  const rawSize = parseInt(params.get("limit") || params.get("size") || String(DEFAULT_PAGE_SIZE), 10);
  const requestedSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(rawSize) ? rawSize : DEFAULT_PAGE_SIZE;
  const [page, setPage] = useState(requestedPage);
  const [pageSize, setPageSize] = useState(requestedSize);
  const [jumpVal, setJumpVal] = useState("");
  const [configOpen, setConfigOpen] = useState(false);

  // Sync state if browser Back/Forward or direct URL query changes
  useEffect(() => {
    const p = Math.max(0, (parseInt(params.get("page") || "1", 10) || 1) - 1);
    const raw = parseInt(params.get("limit") || params.get("size") || String(DEFAULT_PAGE_SIZE), 10);
    const s = (PAGE_SIZE_OPTIONS as readonly number[]).includes(raw) ? raw : DEFAULT_PAGE_SIZE;
    if (p !== page) setPage(p);
    if (s !== pageSize) setPageSize(s);
    const st = params.get("status")?.toUpperCase() ?? "";
    if (STATUS_TABS.includes(st) && st !== status) setStatus(st);
    const src = params.get("source")?.toUpperCase() ?? "";
    if (SOURCES.includes(src) && src !== source) setSource(src);
    const arc = params.get("archived") === "true";
    if (arc !== archived) setArchived(arc);
    const query = params.get("q") ?? "";
    if (query !== q) setQ(query);
  }, [params]);

  const job = useQuery({
    queryKey: queryKeys.jobs.detail(jobId ?? 0),
    queryFn: () => jobApi.get(jobId!),
    enabled: !!token && jobId != null,
  });

  // Query counts per status across all applicants of this job from backend
  const countQuery = useQuery({
    queryKey: [...queryKeys.applicants.byJob(jobId ?? "all"), "status-counts"],
    queryFn: () => applicantApi.statusCounts(jobId!),
    enabled: !!token && jobId != null && !boardView,
    refetchInterval: 10_000,
  });

  const listKey = [...queryKeys.applicants.byJob(jobId ?? "all"), q, status, source, archived, page, pageSize];
  const list = useQuery({
    queryKey: listKey,
    queryFn: () => applicantApi.list({
      jobId: jobId ?? undefined,
      q: q.trim() || undefined,
      status: status || undefined,
      source: source || undefined,
      archived,
      page,
      size: pageSize,
    }),
    placeholderData: keepPreviousData,
    enabled: !!token && !boardView,
    refetchInterval: 5_000,
  });
  const detail = useQuery({
    queryKey: queryKeys.applicants.detail(selectedId ?? 0),
    queryFn: () => applicantApi.get(selectedId!),
    enabled: selectedId !== null && !boardView,
    refetchInterval: 5_000,
  });
  const data = list.data?.data;
  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const from = total > 0 ? safePage * pageSize + 1 : 0;
  const to = Math.min((safePage + 1) * pageSize, total);
  const pageItems = useMemo(() => getPaginationItems(safePage + 1, totalPages), [safePage, totalPages]);
  const jobInfo = job.data?.data;
  const filtered = Boolean(q.trim() || status || source || archived);

  const goToPage = (nextPage: number, nextSize: number = pageSize) => {
    const calcTotalPages = Math.max(1, Math.ceil(total / nextSize));
    const target = Math.max(0, Math.min(nextPage, calcTotalPages - 1));
    setPage(target);
    if (nextSize !== pageSize) {
      setPageSize(nextSize);
    }
    const nextParams = new URLSearchParams(params);
    nextParams.set("page", String(target + 1));
    nextParams.set("limit", String(nextSize));
    nextParams.delete("size");
    setParams(nextParams, { replace: true });
  };

  const resetPageToFirst = (customParams?: URLSearchParams) => {
    setPage(0);
    const nextParams = customParams ?? new URLSearchParams(params);
    nextParams.set("page", "1");
    nextParams.set("limit", String(pageSize));
    nextParams.delete("size");
    setParams(nextParams, { replace: true });
  };

  useEffect(() => {
    if (!list.isFetching && total > 0 && page >= totalPages) {
      goToPage(totalPages - 1);
    }
  }, [list.isFetching, total, page, totalPages]);

  // Status counts map from backend aggregation
  const statusCounts = useMemo<Record<string, number>>(() => {
    const counts = countQuery.data?.data ?? {};
    return {
      "": counts["ALL"] ?? total,
      ...counts,
    };
  }, [countQuery.data, total]);

  if (!jobId) {
    return <Navigate to="/recruiter" replace />;
  }

  if (boardView) return <PipelineBoard />;

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 text-[var(--color-on-surface)]">
      {/* Filter & Status Tabs Toolbar */}
      <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--color-border-default)] bg-white p-2.5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Tìm ứng viên</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-outline)]" aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const nextParams = new URLSearchParams(params);
                  if (q.trim()) nextParams.set("q", q.trim());
                  else nextParams.delete("q");
                  resetPageToFirst(nextParams);
                }
              }}
              onBlur={() => {
                const nextParams = new URLSearchParams(params);
                if (q.trim()) nextParams.set("q", q.trim());
                else nextParams.delete("q");
                resetPageToFirst(nextParams);
              }}
              placeholder="Tìm theo tên, email, tag hoặc mã giới thiệu..."
              className="h-9 w-full rounded-lg bg-[var(--color-surface-alt)] pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Lọc theo nguồn"
              value={source}
              onChange={(e) => {
                const val = e.target.value;
                setSource(val);
                const nextParams = new URLSearchParams(params);
                if (val) nextParams.set("source", val);
                else nextParams.delete("source");
                resetPageToFirst(nextParams);
              }}
              className="h-9 rounded-lg border border-[var(--color-border-default)] bg-white px-2.5 text-xs outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">Tất cả nguồn</option>
              {SOURCES.map((item) => <option key={item} value={item}>{SOURCE_LABEL[item]}</option>)}
            </select>

            <button
              type="button"
              aria-pressed={archived}
              onClick={() => {
                const nextVal = !archived;
                setArchived(nextVal);
                const nextParams = new URLSearchParams(params);
                if (nextVal) nextParams.set("archived", "true");
                else nextParams.delete("archived");
                resetPageToFirst(nextParams);
              }}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors",
                archived
                  ? "border-brand-primary bg-[var(--color-primary-soft)] text-brand-primary"
                  : "border-[var(--color-border-default)] text-[var(--color-on-surface-variant)] hover:border-brand-primary hover:text-brand-primary",
              )}
            >
              <Archive className="size-3.5" aria-hidden="true" />
              Đã lưu trữ
            </button>

            {jobId != null && (
              <Link
                to={`/recruiter/jobs/${jobId}/applicants?view=board`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] bg-white px-2.5 text-xs font-semibold text-[var(--color-on-surface)] transition-colors hover:border-brand-primary hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary shadow-2xs"
              >
                <Users className="size-3.5" aria-hidden="true" />
                Bảng quy trình
              </Link>
            )}

            {/* Meta info & Setting tooltip/popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setConfigOpen((v) => !v)}
                title="Thông tin cấu hình lọc CV & Hạn nộp"
                className={cn(
                  "grid size-9 place-items-center rounded-lg border transition-colors",
                  configOpen
                    ? "border-brand-primary bg-[var(--color-primary-soft)] text-brand-primary"
                    : "border-[var(--color-border-default)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-on-surface)]",
                )}
              >
                <Settings className="size-4" aria-hidden="true" />
              </button>

              {configOpen && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-72 rounded-xl border border-[var(--color-border-default)] bg-white p-3 shadow-lg text-xs">
                  <div className="flex items-center justify-between border-b border-[var(--color-border-default)] pb-2 mb-2.5">
                    <span className="font-semibold text-[var(--color-on-surface)] flex items-center gap-1.5">
                      <Settings className="size-3.5 text-brand-primary" />
                      Cấu hình & Hạn nộp
                    </span>
                    <button
                      type="button"
                      onClick={() => setConfigOpen(false)}
                      className="text-[var(--color-outline)] hover:text-[var(--color-on-surface)] text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div>
                      <p className="font-semibold text-[var(--color-on-surface)] flex items-center gap-1">
                        {jobInfo?.screeningMode === "AUTO" ? <Bot className="size-3 text-brand-primary" /> : <UserCheck className="size-3 text-slate-600" />}
                        Chế độ lọc CV:
                        <span className="text-brand-primary font-bold">
                          {jobInfo?.screeningMode === "AUTO" ? "Tự động" : "Thủ công"}
                        </span>
                      </p>
                      <p className="text-[var(--color-on-surface-variant)] mt-0.5">
                        {jobInfo?.screeningMode === "AUTO"
                          ? "Hệ thống tự động chấm điểm và quyết định qua vòng CV."
                          : "Recruiter tự xem xét và quyết định chuyển vòng."}
                      </p>
                    </div>
                    <div className="border-t border-[var(--color-border-default)]/60 pt-2">
                      <p className="font-semibold text-[var(--color-on-surface)] flex items-center gap-1">
                        <CalendarClock className="size-3 text-amber-600" />
                        Hạn nộp hồ sơ:
                      </p>
                      <p className="text-[var(--color-on-surface-variant)] mt-0.5">
                        {jobInfo?.deadline ? formatDateTime(jobInfo.deadline) : "Không giới hạn hạn nộp"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab list with status counts */}
        <div role="tablist" aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-1 rounded-lg bg-[var(--color-surface-alt)] p-1">
          {STATUS_TABS.map((value) => {
            const active = status === value;
            const count = statusCounts[value] ?? (value === "" ? (countQuery.data?.data?.total ?? total) : 0);
            return (
              <button
                key={value || "all"}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  const nextParams = new URLSearchParams(params);
                  if (value) nextParams.set("status", value.toLowerCase());
                  else nextParams.delete("status");
                  resetPageToFirst(nextParams);
                  setStatus(value);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 min-h-7.5 shrink-0 rounded-md px-2.5 text-xs font-semibold transition-colors",
                  active
                    ? "bg-white text-brand-primary shadow-xs"
                    : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]",
                )}
              >
                <span>{value ? applicationStatusLabel(value) : "Tất cả"}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums",
                    active
                      ? "bg-[var(--color-primary-soft)] text-brand-primary"
                      : "bg-black/5 text-[var(--color-on-surface-variant)]",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {list.isError && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-800">
          <AlertCircle className="size-4 shrink-0 text-red-600" aria-hidden="true" />
          <p className="flex-1 text-sm">{getApiErrorMessage(list.error, "Chưa tải được danh sách ứng viên.")}</p>
          <button type="button" onClick={() => void list.refetch()} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-100">
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Thử lại
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-sm">
        {list.isPending && !data && (
          <div className="p-6"><LoadingState label="Đang tải danh sách ứng viên"><TableSkeleton /></LoadingState></div>
        )}

        {data && rows.length === 0 && (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-brand-primary">
              {filtered ? <Search className="size-6" aria-hidden="true" /> : <Inbox className="size-6" aria-hidden="true" />}
            </span>
            <h2 className="mt-4 text-lg font-semibold">{filtered ? "Không có hồ sơ phù hợp" : "Chưa có ứng viên nào"}</h2>
            <p className="mt-1 max-w-md text-sm text-[var(--color-on-surface-variant)]">
              {filtered ? "Thử đổi từ khóa, trạng thái, nguồn hoặc bỏ lọc hồ sơ lưu trữ." : "Khi ứng viên nộp CV vào tin tuyển dụng, hồ sơ sẽ xuất hiện tại đây."}
            </p>
          </div>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className={cn("w-full min-w-[900px] text-left text-sm", list.isFetching && "opacity-70 transition-opacity")}>
              <thead>
                <tr className="h-11 bg-[var(--color-surface-container-low)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  <th scope="col" className="px-5">Ứng viên</th>
                  <th scope="col" className="px-4">Trạng thái</th>
                  <th scope="col" className="px-4">Nguồn</th>
                  <th scope="col" className="px-4">Phụ trách</th>
                  <th scope="col" className="px-4">Ngày nộp</th>
                  <th scope="col" className="px-5 text-right"><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-default)]">
                {rows.map((row) => (
                  <ApplicantRow key={row.id} row={row} selected={selectedId === row.id} onOpen={() => setSelectedId(row.id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && total > 0 && (
          <div className="flex flex-col gap-3 border-t border-[var(--color-border-default)] bg-slate-50/50 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
            {/* Nhóm Thông tin Dữ liệu (Left) */}
            <div className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)]">
              <p>
                Hiển thị <strong className="font-semibold text-[var(--color-on-surface)]">{from}–{to}</strong> trên <strong className="font-semibold text-[var(--color-on-surface)]">{total}</strong> hồ sơ
              </p>
              <span className="text-slate-400">·</span>
              <span className="tabular-nums">Trang {safePage + 1} / {totalPages}</span>
              {list.isFetching && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-primary ml-1" role="status">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  <span className="hidden sm:inline">Đang tải…</span>
                </span>
              )}
            </div>

            {/* Nhóm Chọn số bản ghi / trang (Center) */}
            <div className="flex items-center justify-start lg:justify-center">
              <label className="flex items-center gap-1.5 text-xs text-[var(--color-on-surface-variant)]">
                <span>Hiển thị</span>
                <select
                  aria-label="Số hồ sơ mỗi trang"
                  value={pageSize}
                  onChange={(e) => {
                    const nextSize = Number(e.target.value);
                    goToPage(0, nextSize);
                  }}
                  className="h-8 rounded-lg border border-[var(--color-border-default)] bg-white px-2 text-xs font-semibold text-[var(--color-on-surface)] shadow-2xs outline-none transition-colors hover:border-brand-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 cursor-pointer"
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
              <nav className="flex items-center gap-1" aria-label="Phân trang danh sách hồ sơ">
                {/* First Page [|<] */}
                <button
                  type="button"
                  aria-label="Về trang đầu"
                  title="Về trang đầu (Trang 1)"
                  disabled={safePage === 0}
                  onClick={() => goToPage(0)}
                  className="grid size-8 place-items-center rounded-lg border border-[var(--color-border-default)] bg-white text-[var(--color-on-surface-variant)] shadow-2xs transition-colors hover:border-brand-primary hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronsLeft className="size-4" aria-hidden="true" />
                </button>

                {/* Previous [<] */}
                <button
                  type="button"
                  aria-label="Trang trước"
                  title="Trang trước"
                  disabled={safePage === 0}
                  onClick={() => goToPage(safePage - 1)}
                  className="grid size-8 place-items-center rounded-lg border border-[var(--color-border-default)] bg-white text-[var(--color-on-surface-variant)] shadow-2xs transition-colors hover:border-brand-primary hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
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
                          className="grid size-8 place-items-center text-xs text-[var(--color-outline)] select-none"
                          aria-hidden="true"
                        >
                          …
                        </span>
                      );
                    }

                    const isActive = item - 1 === safePage;
                    return (
                      <button
                        key={item}
                        type="button"
                        aria-label={`Trang ${item}`}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => goToPage(item - 1)}
                        className={cn(
                          "grid size-8 place-items-center rounded-lg text-xs font-semibold transition-all shadow-2xs",
                          isActive
                            ? "bg-brand-primary text-white shadow-xs"
                            : "border border-[var(--color-border-default)] bg-white text-[var(--color-on-surface)] hover:border-brand-primary hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary"
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
                  disabled={safePage >= totalPages - 1}
                  onClick={() => goToPage(safePage + 1)}
                  className="grid size-8 place-items-center rounded-lg border border-[var(--color-border-default)] bg-white text-[var(--color-on-surface-variant)] shadow-2xs transition-colors hover:border-brand-primary hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </button>

                {/* Last Page [>|] */}
                <button
                  type="button"
                  aria-label="Đến trang cuối"
                  title={`Đến trang cuối (Trang ${totalPages})`}
                  disabled={safePage >= totalPages - 1}
                  onClick={() => goToPage(totalPages - 1)}
                  className="grid size-8 place-items-center rounded-lg border border-[var(--color-border-default)] bg-white text-[var(--color-on-surface-variant)] shadow-2xs transition-colors hover:border-brand-primary hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronsRight className="size-4" aria-hidden="true" />
                </button>
              </nav>

              {/* Page Jumper */}
              <div className="h-4 w-px bg-[var(--color-border-default)] mx-1 hidden sm:block" aria-hidden="true" />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const p = parseInt(jumpVal, 10);
                  if (!isNaN(p) && p >= 1 && p <= totalPages) {
                    goToPage(p - 1);
                    setJumpVal("");
                  }
                }}
                className="flex items-center gap-1.5 text-xs text-[var(--color-on-surface-variant)]"
              >
                <label htmlFor="jump-page-input" className="whitespace-nowrap">Đi đến:</label>
                <input
                  id="jump-page-input"
                  type="number"
                  min={1}
                  max={totalPages}
                  placeholder={String(safePage + 1)}
                  value={jumpVal}
                  onChange={(e) => setJumpVal(e.target.value)}
                  className="h-8 w-11 rounded-lg border border-[var(--color-border-default)] bg-white px-1 text-center text-xs font-semibold text-[var(--color-on-surface)] shadow-2xs outline-none transition-colors hover:border-brand-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  title={`Nhập trang từ 1 đến ${totalPages}`}
                />
                <span className="text-xs">Trang</span>
                <button
                  type="submit"
                  disabled={!jumpVal || isNaN(Number(jumpVal)) || Number(jumpVal) < 1 || Number(jumpVal) > totalPages}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--color-border-default)] bg-white px-2 text-xs font-semibold text-[var(--color-on-surface-variant)] shadow-2xs transition-colors hover:border-brand-primary hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Đi
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      <DetailDialog
        open={selectedId != null}
        title={detail.data?.data.candidateName ?? "Hồ sơ ứng viên"}
        onClose={() => setSelectedId(null)}
      >
        {detail.isPending && selectedId != null && <LoadingState label="Đang tải hồ sơ"><TableSkeleton /></LoadingState>}
        {detail.isError && <p role="alert" className="text-sm text-red-700">{getApiErrorMessage(detail.error)}</p>}
        {detail.data?.data && (
          <ApplicationPanel
            key={detail.data.data.id}
            detail={detail.data.data}
            onChanged={() => { void detail.refetch(); void list.refetch(); }}
          />
        )}
      </DetailDialog>
    </section>
  );
}

function ApplicantRow({ row, selected, onOpen }: { row: ApplicationSummary; selected: boolean; onOpen: () => void }) {
  const tags = splitTags(row.tags).slice(0, 3);
  return (
    <tr
      onClick={onOpen}
      className={cn("cursor-pointer transition-colors hover:bg-[var(--color-primary-subtle)]/60", selected && "bg-[var(--color-primary-subtle)]")}
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar name={row.candidateName} />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5 font-semibold leading-5">
              {row.candidateName}
              {row.duplicate && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Trùng hồ sơ</span>}
              {row.archived && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Đã lưu trữ</span>}
            </p>
            <p className="truncate text-xs text-[var(--color-on-surface-variant)]">{row.candidateEmail}</p>
            {tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <span key={tag} className="rounded-md bg-[var(--color-surface-container)] px-1.5 py-0.5 text-[11px] text-[var(--color-on-surface-variant)]">#{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5"><StatusPill status={row.status} /></td>
      <td className="px-4 py-3.5">
        <p>{sourceLabel(row.source)}</p>
        {row.referralCode && <p className="text-xs text-[var(--color-on-surface-variant)]">Mã {row.referralCode}</p>}
      </td>
      <td className="px-4 py-3.5">
        {row.assigneeName ? (
          <span className="flex items-center gap-2">
            <Avatar name={row.assigneeName} size="sm" />
            <span className="truncate">{row.assigneeName}</span>
          </span>
        ) : (
          <span className="text-xs text-[var(--color-outline)]">Chưa phân công</span>
        )}
      </td>
      <td className="px-4 py-3.5">
        <p className="whitespace-nowrap">{new Date(row.createdAt).toLocaleDateString("vi-VN")}</p>
        <p className="text-xs text-[var(--color-on-surface-variant)]">{relativeTime(row.createdAt)}</p>
      </td>
      <td className="px-5 py-3.5 text-right">
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onOpen(); }}
          aria-label={`Xem hồ sơ ${row.candidateName}`}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] px-3 text-xs font-semibold transition-colors hover:border-brand-primary hover:bg-brand-primary hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          Xem hồ sơ
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

function ApplicationPanel({ detail, onChanged }: { detail: ApplicationDetail; onChanged: () => void }) {
  const askConfirm = useUiStore((s) => s.askConfirm);
  const [notes, setNotes] = useState(detail.notes ?? "");
  const [tags, setTags] = useState(detail.tags ?? "");
  const [assigneeEmail, setAssigneeEmail] = useState("");
  const [reason, setReason] = useState("");
  const save = useMutation({
    mutationFn: () => applicantApi.update(detail.id, { notes, tags, assigneeEmail: assigneeEmail || undefined }),
    onSuccess: () => {
      toast.success("Đã lưu ghi chú và phân công");
      setAssigneeEmail("");
      onChanged();
    },
  });
  const act = useMutation({
    mutationFn: (action: "reject" | "archive" | "restore") => {
      if (action === "reject") return applicantApi.reject(detail.id, reason || undefined);
      if (action === "archive") return applicantApi.archive(detail.id);
      return applicantApi.restore(detail.id);
    },
    onSuccess: (_response, action) => {
      toast.success(ACTION_TOAST[action]);
      onChanged();
    },
  });
  const canReject = detail.status !== "REJECTED" && detail.status !== "WITHDRAWN";
  const confirmReject = () =>
    askConfirm({
      title: "Từ chối ứng viên?",
      description: `${detail.candidateName} sẽ chuyển sang trạng thái Đã từ chối.${reason.trim() ? "" : " Bạn chưa nhập lý do từ chối."}`,
      danger: true,
      confirmLabel: "Từ chối",
      onConfirm: async () => {
        await act.mutateAsync("reject");
      },
    });

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-start gap-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4">
        <Avatar name={detail.candidateName} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{detail.candidateName}</h3>
            <StatusPill status={detail.status} />
            {detail.archived && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Đã lưu trữ</span>}
          </div>
          <p className="text-[var(--color-on-surface-variant)]">{detail.candidateEmail}</p>
          <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <Meta label="Vị trí" value={detail.jobTitle} />
            <Meta label="Ngày nộp" value={formatDateTime(detail.createdAt)} />
            <Meta label="Nguồn" value={`${sourceLabel(detail.source)}${detail.referralCode ? ` · mã ${detail.referralCode}` : ""}`} />
            <Meta label="Phụ trách" value={detail.assigneeName ?? "Chưa phân công"} />
          </dl>
          {detail.candidateApplicationCount > 1 && (
            <p className="mt-3 text-xs font-medium text-amber-700">Ứng viên đang có {detail.candidateApplicationCount} hồ sơ trong hệ thống.</p>
          )}
          {detail.rejectReason && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">Lý do từ chối: {detail.rejectReason}</p>
          )}
        </div>
      </div>

      <Section icon={Workflow} title="Tiến trình tuyển dụng">
        <ApplicationPipeline status={detail.status} />
      </Section>

      <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4">
        <ApplicantRounds rounds={detail.rounds} gate={detail.gateScore} />
      </div>

      <CvScreeningDecision applicationId={detail.id} onDecided={onChanged} />

      <Section icon={FileText} title="CV đã nộp">
        <AppliedCvReview cvs={detail.cvs} />
      </Section>

      <Section icon={StickyNote} title="Ghi chú & phân công" description="Chỉ nội bộ đội tuyển dụng nhìn thấy.">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--color-on-surface-variant)]">Tag</span>
            <input className={input} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="java, referral" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--color-on-surface-variant)]">Giao cho (email recruiter)</span>
            <input className={input} value={assigneeEmail} onChange={(e) => setAssigneeEmail(e.target.value)} placeholder={detail.assigneeName ? `Hiện tại: ${detail.assigneeName}` : "recruiter@company.com"} />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-[var(--color-on-surface-variant)]">Ghi chú</span>
          <textarea className={input} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Nhận xét về ứng viên, lưu ý cho vòng sau…" />
        </label>
        {save.isError && <p role="alert" className="text-xs text-red-700">{getApiErrorMessage(save.error)}</p>}
        <div className="flex justify-end">
          <button className={primary} type="button" disabled={save.isPending} onClick={() => save.mutate()}>
            <Save className="size-4" aria-hidden="true" />
            {save.isPending ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </div>
      </Section>

      <Section icon={XCircle} title="Xử lý hồ sơ" description="Từ chối ứng viên hoặc lưu trữ hồ sơ khỏi danh sách đang xử lý.">
        {canReject && (
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--color-on-surface-variant)]">Lý do từ chối</span>
            <input className={input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ví dụ: chưa đủ kinh nghiệm Spring Boot" />
          </label>
        )}
        {act.isError && <p role="alert" className="text-xs text-red-700">{getApiErrorMessage(act.error)}</p>}
        <div className="flex flex-wrap gap-2">
          {canReject && (
            <button
              className={cn(button, "hover:border-[var(--color-error)] hover:bg-[var(--color-error-container)] hover:text-[var(--color-on-error-container)]")}
              type="button"
              disabled={act.isPending}
              onClick={confirmReject}
            >
              <XCircle className="size-4" aria-hidden="true" />
              Từ chối
            </button>
          )}
          {detail.archived ? (
            <button className={button} type="button" disabled={act.isPending} onClick={() => act.mutate("restore")}>
              <ArchiveRestore className="size-4" aria-hidden="true" />
              Khôi phục
            </button>
          ) : (
            <button className={button} type="button" disabled={act.isPending} onClick={() => act.mutate("archive")}>
              <Archive className="size-4" aria-hidden="true" />
              Lưu trữ
            </button>
          )}
        </div>
      </Section>

      <Section icon={History} title="Lịch sử trạng thái">
        {detail.history.length === 0 ? (
          <p className="text-xs text-[var(--color-on-surface-variant)]">Chưa có thay đổi trạng thái.</p>
        ) : (
          <ol className="space-y-4 border-l border-[var(--color-border-default)] pl-5">
            {detail.history.map((row, index) => (
              <li key={`${row.createdAt}-${index}`} className="relative">
                <span className="absolute -left-[26px] top-1 size-3 rounded-full border-2 border-white bg-brand-primary" aria-hidden="true" />
                <p className="font-medium">
                  {row.fromStatus ? `${applicationStatusLabel(row.fromStatus)} → ` : ""}{applicationStatusLabel(row.toStatus)}
                </p>
                {row.note && <p className="text-xs text-[var(--color-on-surface-variant)]">{row.note}</p>}
                <p className="text-[11px] text-[var(--color-outline)]">{formatDateTime(row.createdAt)}</p>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}

function AppliedCvReview({ cvs }: { cvs: CvRef[] }) {
  const active = cvs.filter((cv) => !cv.expired);
  const [cvId, setCvId] = useState<number | null>(active[0]?.id ?? null);
  const selected = active.find((cv) => cv.id === cvId) ?? active[0] ?? null;
  const detail = useQuery({
    queryKey: queryKeys.cvs.detail(selected?.id ?? 0),
    queryFn: () => cvApi.get(selected!.id),
    enabled: selected != null,
    refetchInterval: 5_000,
  });
  const analyze = useMutation({
    mutationFn: (id: number) => cvApi.parse(id),
    onSuccess: () => void detail.refetch(),
  });
  const cv = detail.data?.data;
  const breakdown = cv?.match?.breakdown;
  const skills = useMemo(() => cv?.skills ?? [], [cv?.skills]);
  if (active.length === 0) {
    return <p className="text-xs text-[var(--color-on-surface-variant)]">Ứng viên chưa nộp CV cho job này.</p>;
  }
  return (
    <div className="space-y-3">
      {active.length > 1 && (
        <select className={input} aria-label="Chọn CV" value={selected?.id ?? ""} onChange={(e) => setCvId(Number(e.target.value))}>
          {active.map((item) => <option key={item.id} value={item.id}>{item.originalFilename} · {item.status}</option>)}
        </select>
      )}
      {selected && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--color-surface-alt)] px-3 py-2">
            <p className="flex min-w-0 items-center gap-2">
              <FileText className="size-4 shrink-0 text-[var(--color-outline)]" aria-hidden="true" />
              <span className="truncate font-medium">{selected.originalFilename}</span>
              <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[var(--color-on-surface-variant)]">{cv?.status ?? selected.status}</span>
            </p>
            <button className={button} type="button" disabled={analyze.isPending} onClick={() => analyze.mutate(selected.id)}>
              <Bot className="size-4" aria-hidden="true" />
              {analyze.isPending ? "Đang phân tích…" : cv?.status === "ANALYZED" ? "Phân tích lại bằng AI" : "Phân tích CV bằng AI"}
            </button>
          </div>
          <CvFilePreview cvId={selected.id} mimeType={cv?.mimeType ?? null} filename={selected.originalFilename} />
          {analyze.isError && <p role="alert" className="text-xs text-red-700">{getApiErrorMessage(analyze.error)}</p>}
          {detail.isError && <p role="alert" className="text-xs text-red-700">{getApiErrorMessage(detail.error)}</p>}
          {cv?.match && (
            <ScreeningBreakdown score={cv.match.score} modelVersion={cv.match.modelVersion} breakdown={breakdown} />
          )}
          <GithubEvidencePanel analysis={cv?.githubAnalysis} />
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span key={skill.canonicalName} className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-xs font-medium text-brand-primary">{skill.skillName}</span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="text-xs text-[var(--color-on-surface-variant)]">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-outline)]">{label}</dt>
      <dd className="truncate text-sm">{value}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLE[status] ?? "bg-slate-100 text-slate-600")}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {applicationStatusLabel(status)}
    </span>
  );
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.trim().split(/\s+/).slice(-2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] font-semibold text-brand-primary",
        size === "sm" ? "size-6 text-[10px]" : size === "lg" ? "size-14 text-lg" : "size-10 text-sm",
      )}
    >
      {initials}
    </span>
  );
}


function splitTags(value: string | null) {
  return (value ?? "").split(",").map((tag) => tag.trim()).filter(Boolean);
}

function sourceLabel(source: string | null) {
  if (!source) return "—";
  return SOURCE_LABEL[source] ?? source;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

function relativeTime(value: string) {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60_000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return `${Math.floor(days / 30)} tháng trước`;
}
