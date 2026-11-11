import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Archive,
  ArrowRight,
  Bot,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Inbox,
  Loader2,
  RefreshCw,
  Search,
  Settings,
  UserCheck,
  Users,
} from "lucide-react";
import { applicantApi } from "@/api/tenant/applicantApi";
import { jobApi } from "@/api/tenant/jobApi";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { keepPreviousForScope, TableRefreshBar } from "@/components/ux/TableRefresh";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { LoadingState, TableSkeleton } from "@/components/ux/Skeleton";
import { formatDate, formatNumber, useLocale, useT, type TranslateFn } from "@/i18n";
import {
  ApplicantAvatar,
  ApplicantStatusPill,
  SOURCES,
  STATUS_TABS,
  formatApplicantDateTime,
  getApplicantStatusLabel,
  sourceLabel,
  splitApplicantTags,
} from "@/features/tenant/recruiter/applicants/components/applicantUi";
import type { ApplicationSummary } from "@/api/types/applicant";
import { PipelineBoard } from "@/features/tenant/recruiter/pipeline/pages/PipelinePage";

const DEFAULT_PAGE_SIZE = 10;
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

export function ApplicantsPage() {
  const t = useT();
  const locale = useLocale();
  const token = useAuthStore((s) => s.accessToken);
  const { id: routeJobId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const jobId = routeJobId && /^\d+$/.test(routeJobId) ? Number(routeJobId) : null;
  const boardView = routeJobId != null && params.get("view") === "board";
  const requestedApplicationId = Number(params.get("applicationId"));
  const [q, setQ] = useState(params.get("q") ?? "");
  const requestedStatus = params.get("status")?.toUpperCase() ?? "";
  const [status, setStatus] = useState((STATUS_TABS as readonly string[]).includes(requestedStatus) ? requestedStatus : "");
  const requestedSource = params.get("source")?.toUpperCase() ?? "";
  const [source, setSource] = useState((SOURCES as readonly string[]).includes(requestedSource) ? requestedSource : "");
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
    if ((STATUS_TABS as readonly string[]).includes(st) && st !== status) setStatus(st);
    const src = params.get("source")?.toUpperCase() ?? "";
    if ((SOURCES as readonly string[]).includes(src) && src !== source) setSource(src);
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
    placeholderData: keepPreviousForScope(jobId ?? "all", 2),
    enabled: !!token && !boardView,
    refetchInterval: 5_000,
  });
  const isTableRefreshing = list.isFetching && list.isPlaceholderData;
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

  if (!boardView && Number.isInteger(requestedApplicationId) && requestedApplicationId > 0) {
    return <Navigate to={`/recruiter/jobs/${jobId}/applicants/${requestedApplicationId}`} replace />;
  }

  if (boardView) return <PipelineBoard />;

  const openApplicantDetail = (applicationId: number) => {
    navigate(`/recruiter/jobs/${jobId}/applicants/${applicationId}`, {
      state: { backSearch: location.search },
    });
  };

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 text-[var(--color-on-surface)]">
      {/* Filter & Status Tabs Toolbar */}
      <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--color-border-default)] bg-white p-2.5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">{t("recruiter.ops.applicants.list.searchSr")}</span>
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
              placeholder={t("recruiter.ops.applicants.list.searchPlaceholder")}
              className="h-9 w-full rounded-lg bg-[var(--color-surface-alt)] pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label={t("recruiter.ops.applicants.list.sourceFilterAria")}
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
              <option value="">{t("recruiter.ops.applicants.list.allSources")}</option>
              {SOURCES.map((item) => <option key={item} value={item}>{sourceLabel(item, t)}</option>)}
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
              {t("recruiter.ops.applicants.list.archivedBtn")}
            </button>

            {jobId != null && (
              <Link
                to={`/recruiter/jobs/${jobId}/applicants?view=board`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] bg-white px-2.5 text-xs font-semibold text-[var(--color-on-surface)] transition-colors hover:border-brand-primary hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary shadow-2xs"
              >
                <Users className="size-3.5" aria-hidden="true" />
                {t("recruiter.ops.applicants.list.pipelineBoardBtn")}
              </Link>
            )}

            {/* Meta info & Setting tooltip/popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setConfigOpen((v) => !v)}
                title={t("recruiter.ops.applicants.list.configTooltip")}
                aria-label={t("recruiter.ops.applicants.list.configTooltip")}
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
                      {t("recruiter.ops.applicants.list.configTitle")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setConfigOpen(false)}
                      aria-label={t("recruiter.ops.common.close")}
                      className="text-[var(--color-outline)] hover:text-[var(--color-on-surface)] text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div>
                      <p className="font-semibold text-[var(--color-on-surface)] flex items-center gap-1">
                        {jobInfo?.screeningMode === "AUTO" ? <Bot className="size-3 text-brand-primary" /> : <UserCheck className="size-3 text-slate-600" />}
                        {t("recruiter.ops.applicants.list.screeningModeLabel")}
                        <span className="text-brand-primary font-bold">
                          {jobInfo?.screeningMode === "AUTO"
                            ? t("recruiter.ops.common.screeningAuto")
                            : t("recruiter.ops.common.screeningManual")}
                        </span>
                      </p>
                      <p className="text-[var(--color-on-surface-variant)] mt-0.5">
                        {jobInfo?.screeningMode === "AUTO"
                          ? t("recruiter.ops.applicants.list.screeningAutoDesc")
                          : t("recruiter.ops.applicants.list.screeningManualDesc")}
                      </p>
                    </div>
                    <div className="border-t border-[var(--color-border-default)]/60 pt-2">
                      <p className="font-semibold text-[var(--color-on-surface)] flex items-center gap-1">
                        <CalendarClock className="size-3 text-amber-600" />
                        {t("recruiter.ops.applicants.list.deadlineLabel")}
                      </p>
                      <p className="text-[var(--color-on-surface-variant)] mt-0.5">
                        {jobInfo?.deadline
                          ? formatApplicantDateTime(jobInfo.deadline, locale)
                          : t("recruiter.ops.applicants.list.noDeadlineLimit")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab list with status counts */}
        <div role="tablist" aria-label={t("recruiter.ops.applicants.list.statusTabsAria")} className="flex flex-wrap gap-1 rounded-lg bg-[var(--color-surface-alt)] p-1">
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
                <span>{value ? getApplicantStatusLabel(value, t) : t("recruiter.ops.applicants.list.allStatuses")}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-bold tabular-nums",
                    active
                      ? "bg-[var(--color-primary-soft)] text-brand-primary"
                      : "bg-black/5 text-[var(--color-on-surface-variant)]",
                  )}
                >
                  {formatNumber(count, {}, locale)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {list.isError && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-800">
          <AlertCircle className="size-4 shrink-0 text-red-600" aria-hidden="true" />
          <p className="flex-1 text-sm">{getApiErrorMessage(list.error, t("recruiter.ops.applicants.list.loadError"))}</p>
          <button type="button" onClick={() => void list.refetch()} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-100">
            <RefreshCw className="size-3.5" aria-hidden="true" />
            {t("recruiter.ops.common.retry")}
          </button>
        </div>
      )}

      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-sm">
        <TableRefreshBar active={isTableRefreshing} />
        {list.isPending && !data && (
          <div className="p-6"><LoadingState label={t("recruiter.ops.applicants.list.loadingList")}><TableSkeleton /></LoadingState></div>
        )}

        {data && rows.length === 0 && (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-brand-primary">
              {filtered ? <Search className="size-6" aria-hidden="true" /> : <Inbox className="size-6" aria-hidden="true" />}
            </span>
            <h2 className="mt-4 text-lg font-semibold">
              {filtered ? t("recruiter.ops.applicants.list.emptyFilteredTitle") : t("recruiter.ops.applicants.list.emptyAllTitle")}
            </h2>
            <p className="mt-1 max-w-md text-sm text-[var(--color-on-surface-variant)]">
              {filtered ? t("recruiter.ops.applicants.list.emptyFilteredDesc") : t("recruiter.ops.applicants.list.emptyAllDesc")}
            </p>
          </div>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className={cn("w-full min-w-[900px] text-left text-sm transition-opacity duration-200", isTableRefreshing && "opacity-60")}>
              <thead>
                <tr className="h-11 bg-[var(--color-surface-container-low)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  <th scope="col" className="px-5">{t("recruiter.ops.applicants.list.colApplicant")}</th>
                  <th scope="col" className="px-4">{t("recruiter.ops.applicants.list.colStatus")}</th>
                  <th scope="col" className="px-4">{t("recruiter.ops.applicants.list.colSource")}</th>
                  <th scope="col" className="px-4">{t("recruiter.ops.applicants.list.colAssignee")}</th>
                  <th scope="col" className="px-4">{t("recruiter.ops.applicants.list.colAppliedAt")}</th>
                  <th scope="col" className="px-5 text-right"><span className="sr-only">{t("recruiter.ops.common.actionsSrOnly")}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-default)]">
                {rows.map((row) => (
                  <ApplicantRow key={row.id} row={row} onOpen={() => openApplicantDetail(row.id)} />
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
                {t("recruiter.ops.applicants.list.paginationPrefix")}{" "}
                <strong className="font-semibold text-[var(--color-on-surface)]">{from}–{to}</strong>{" "}
                {t("recruiter.ops.applicants.list.paginationMiddle")}{" "}
                <strong className="font-semibold text-[var(--color-on-surface)]">{formatNumber(total, {}, locale)}</strong>{" "}
                {t("recruiter.ops.applicants.list.paginationSuffix")}
              </p>
              <span className="text-slate-400">·</span>
              <span className="tabular-nums">{t("recruiter.ops.applicants.list.paginationPage", { page: safePage + 1, total: totalPages })}</span>
              {list.isFetching && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-primary ml-1" role="status">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  <span className="hidden sm:inline">{t("recruiter.ops.common.loading")}</span>
                </span>
              )}
            </div>

            {/* Nhóm Chọn số bản ghi / trang (Center) */}
            <div className="flex items-center justify-start lg:justify-center">
              <label className="flex items-center gap-1.5 text-xs text-[var(--color-on-surface-variant)]">
                <span>{t("recruiter.ops.applicants.list.showLabel")}</span>
                <select
                  aria-label={t("recruiter.ops.applicants.list.pageSizeAria")}
                  value={pageSize}
                  onChange={(e) => {
                    const nextSize = Number(e.target.value);
                    goToPage(0, nextSize);
                  }}
                  className="h-8 rounded-lg border border-[var(--color-border-default)] bg-white px-2 text-xs font-semibold text-[var(--color-on-surface)] shadow-2xs outline-none transition-colors hover:border-brand-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 cursor-pointer"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {t("recruiter.ops.applicants.list.perPageOption", { size })}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Nhóm Điều hướng & Nhảy trang (Right) */}
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <nav className="flex items-center gap-1" aria-label={t("recruiter.ops.applicants.list.paginationAria")}>
                {/* First Page [|<] */}
                <button
                  type="button"
                  aria-label={t("recruiter.ops.applicants.list.firstPageAria")}
                  title={t("recruiter.ops.applicants.list.firstPageTitle")}
                  disabled={safePage === 0}
                  onClick={() => goToPage(0)}
                  className="grid size-8 place-items-center rounded-lg border border-[var(--color-border-default)] bg-white text-[var(--color-on-surface-variant)] shadow-2xs transition-colors hover:border-brand-primary hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronsLeft className="size-4" aria-hidden="true" />
                </button>

                {/* Previous [<] */}
                <button
                  type="button"
                  aria-label={t("recruiter.ops.applicants.list.prevPageAria")}
                  title={t("recruiter.ops.applicants.list.prevPageAria")}
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
                        aria-label={t("recruiter.ops.applicants.list.pageItemAria", { page: item })}
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
                  aria-label={t("recruiter.ops.applicants.list.nextPageAria")}
                  title={t("recruiter.ops.applicants.list.nextPageAria")}
                  disabled={safePage >= totalPages - 1}
                  onClick={() => goToPage(safePage + 1)}
                  className="grid size-8 place-items-center rounded-lg border border-[var(--color-border-default)] bg-white text-[var(--color-on-surface-variant)] shadow-2xs transition-colors hover:border-brand-primary hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </button>

                {/* Last Page [>|] */}
                <button
                  type="button"
                  aria-label={t("recruiter.ops.applicants.list.lastPageAria")}
                  title={t("recruiter.ops.applicants.list.lastPageTitle", { total: totalPages })}
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
                <label htmlFor="jump-page-input" className="whitespace-nowrap">{t("recruiter.ops.applicants.list.jumpToLabel")}</label>
                <input
                  id="jump-page-input"
                  type="number"
                  min={1}
                  max={totalPages}
                  placeholder={String(safePage + 1)}
                  value={jumpVal}
                  onChange={(e) => setJumpVal(e.target.value)}
                  className="h-8 w-11 rounded-lg border border-[var(--color-border-default)] bg-white px-1 text-center text-xs font-semibold text-[var(--color-on-surface)] shadow-2xs outline-none transition-colors hover:border-brand-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  title={t("recruiter.ops.applicants.list.jumpPageTitle", { total: totalPages })}
                />
                <span className="text-xs">{t("recruiter.ops.applicants.list.jumpUnit")}</span>
                <button
                  type="submit"
                  disabled={!jumpVal || isNaN(Number(jumpVal)) || Number(jumpVal) < 1 || Number(jumpVal) > totalPages}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--color-border-default)] bg-white px-2 text-xs font-semibold text-[var(--color-on-surface-variant)] shadow-2xs transition-colors hover:border-brand-primary hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("recruiter.ops.applicants.list.jumpBtn")}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ApplicantRow({ row, onOpen }: { row: ApplicationSummary; onOpen: () => void }) {
  const t = useT();
  const locale = useLocale();
  const tags = splitApplicantTags(row.tags).slice(0, 3);
  return (
    <tr
      onClick={onOpen}
      className="cursor-pointer transition-colors hover:bg-[var(--color-primary-subtle)]/60"
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <ApplicantAvatar name={row.candidateName} />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5 font-semibold leading-5">
              {row.candidateName}
              {row.duplicate && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  {t("recruiter.ops.applicants.list.duplicateBadge")}
                </span>
              )}
              {row.archived && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {t("recruiter.ops.applicants.list.archivedBadge")}
                </span>
              )}
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
      <td className="px-4 py-3.5"><ApplicantStatusPill status={row.status} /></td>
      <td className="px-4 py-3.5">
        <p>{sourceLabel(row.source, t)}</p>
        {row.referralCode && (
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            {t("recruiter.ops.applicants.list.referralCode", { code: row.referralCode })}
          </p>
        )}
      </td>
      <td className="px-4 py-3.5">
        {row.assigneeName ? (
          <span className="flex items-center gap-2">
            <ApplicantAvatar name={row.assigneeName} size="sm" />
            <span className="truncate">{row.assigneeName}</span>
          </span>
        ) : (
          <span className="text-xs text-[var(--color-outline)]">{t("recruiter.ops.common.unassigned")}</span>
        )}
      </td>
      <td className="px-4 py-3.5">
        <p className="whitespace-nowrap">{formatDate(row.createdAt, undefined, locale)}</p>
        <p className="text-xs text-[var(--color-on-surface-variant)]">{relativeTime(row.createdAt, t)}</p>
      </td>
      <td className="px-5 py-3.5 text-right">
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onOpen(); }}
          aria-label={t("recruiter.ops.applicants.list.viewProfileAria", { name: row.candidateName })}
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-primary/10 px-3 text-xs font-semibold text-brand-primary transition-colors hover:bg-brand-primary hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          {t("recruiter.ops.applicants.list.viewProfileBtn")}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

function relativeTime(value: string, t: TranslateFn) {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60_000);
  if (minutes < 1) return t("recruiter.ops.applicants.list.relativeJustNow");
  if (minutes < 60) return t("recruiter.ops.applicants.list.relativeMinutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("recruiter.ops.applicants.list.relativeHours", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t("recruiter.ops.applicants.list.relativeDays", { count: days });
  return t("recruiter.ops.applicants.list.relativeMonths", { count: Math.floor(days / 30) });
}
