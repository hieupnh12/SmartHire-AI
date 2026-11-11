import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  FileText,
  GitBranch,
  Inbox,
  ListChecks,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { CvSummary } from "@/api/types/cv";
import { cvApi } from "@/api/tenant/cvApi";
import { jobApi } from "@/api/tenant/jobApi";
import { formatNumber, useLocale, useT } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { CvStatusBadge, cvInitials, formatCvDate } from "@/features/tenant/recruiter/cv-screening/components/CvStatusBadge";
import { Skeleton } from "@/components/ux/Skeleton";

type Tab = "ALL" | "SCORED" | "PROCESSING" | "FAILED";
type Sort = "newest" | "score";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

function renderHighlightedRange(template: string, range: string, total: string) {
  const parts = template.split(/(__RANGE__|__TOTAL__)/g);
  return parts.map((part, idx) => {
    if (part === "__RANGE__") {
      return <strong key={idx} className="font-semibold text-slate-900">{range}</strong>;
    }
    if (part === "__TOTAL__") {
      return <strong key={idx} className="font-semibold text-slate-900">{total}</strong>;
    }
    return part;
  });
}

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
  const t = useT();
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs" aria-hidden="true">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] sm:text-sm font-medium text-slate-700">{t("recruiter.screening.cvList.metrics.totalCvs")}</span>
            <Skeleton className="h-6 w-10 rounded-md" />
          </div>

          <div className="hidden h-5 w-px bg-slate-200 sm:block" />

          <div className="flex items-baseline gap-2">
            <span className="text-[13px] sm:text-sm font-medium text-slate-700">{t("recruiter.screening.cvList.metrics.scored")}</span>
            <Skeleton className="h-6 w-10 rounded-md" />
          </div>

          <div className="hidden h-5 w-px bg-slate-200 sm:block" />

          <div className="flex items-baseline gap-2">
            <span className="text-[13px] sm:text-sm font-medium text-slate-700">{t("recruiter.screening.cvList.metrics.averageScore")}</span>
            <Skeleton className="h-6 w-14 rounded-md" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-800">
            <ListChecks className="size-4 text-brand-primary/40" />
            <span className="text-[13px] sm:text-sm font-semibold text-slate-800">{t("recruiter.screening.cvList.metrics.requiredLabel")}</span>
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
  const t = useT();
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white p-2 shadow-2xs sm:flex-row sm:items-center sm:justify-between" aria-hidden="true">
      <div className="flex items-center gap-1.5 overflow-x-auto">
        <Skeleton className="h-8.5 w-20 rounded-lg" />
        <Skeleton className="h-8.5 w-28 rounded-lg" />
        <Skeleton className="h-8.5 w-24 rounded-lg" />
        <Skeleton className="h-8.5 w-16 rounded-lg" />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[13px] font-medium text-slate-400">{t("recruiter.screening.cvList.sort.label")}</span>
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
          <td className="py-3.5 pl-6 pr-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
            </div>
          </td>

          <td className="px-4 py-3.5">
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200/60 bg-slate-50/60 px-2.5 py-1.5">
              <Skeleton className="size-4 rounded" />
              <Skeleton className="h-4 w-36 rounded" />
            </div>
          </td>

          <td className="px-4 py-3.5">
            <Skeleton className="h-6 w-24 rounded-full" />
          </td>

          <td className="px-4 py-3.5">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-8 rounded" />
                <Skeleton className="h-4 w-14 rounded-full" />
              </div>
              <Skeleton className="h-1.5 w-28 rounded-full" />
            </div>
          </td>

          <td className="px-4 py-3.5">
            <Skeleton className="h-6 w-20 rounded-full" />
          </td>

          <td className="py-3.5 pr-6 text-right">
            <Skeleton className="ml-auto h-8 w-20 rounded-lg" />
          </td>
        </tr>
      ))}
    </>
  );
}

export function CvScreeningPage() {
  const t = useT();
  const locale = useLocale();
  const token = useAuthStore((s) => s.accessToken);
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeJobId } = useParams<{ id?: string }>();
  const [params, setParams] = useSearchParams();
  const jobId = routeJobId && /^\d+$/.test(routeJobId) ? Number(routeJobId) : null;
  const requestedCvId = Number(params.get("cvId"));

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
  const skills = useQuery({ queryKey: ["job-skills", jobId], queryFn: () => jobApi.skills(jobId!), enabled: jobId !== null });

  const pageResult = list.data?.data;
  const rows = pageResult?.items ?? [];
  const rowsPending = list.isPending;
  const rowsError = list.error;
  const jobSkills = skills.data?.data ?? [];
  const requiredSkills = jobSkills.filter((skill) => skill.required);
  const preferredSkills = jobSkills.filter((skill) => !skill.required);
  const isInitialLoading = (list.isPending && !list.data) || (skills.isPending && !skills.data);

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

  useEffect(() => {
    const p = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
    const raw = parseInt(params.get("limit") || params.get("size") || "10", 10);
    const s = (PAGE_SIZE_OPTIONS as readonly number[]).includes(raw) ? raw : 10;
    if (p !== page) setPage(p);
    if (s !== pageSize) setPageSize(s);
    const nextTab = (params.get("tab")?.toUpperCase() ?? "") as Tab;
    if (["ALL", "SCORED", "PROCESSING", "FAILED"].includes(nextTab) && nextTab !== tab) setTab(nextTab);
    const so = params.get("sort") as Sort;
    if (["newest", "score"].includes(so) && so !== sort) setSort(so);
  }, [params]);

  useEffect(() => {
    if (!list.isFetching && totalItems > 0 && page > totalPages) {
      goToPage(totalPages);
    }
  }, [list.isFetching, totalItems, page, totalPages]);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "ALL", label: t("recruiter.screening.cvList.tabs.all"), count: counts.all },
    { id: "SCORED", label: t("recruiter.screening.cvList.tabs.scored"), count: counts.scored },
    { id: "PROCESSING", label: t("recruiter.screening.cvList.tabs.processing"), count: counts.processing },
    { id: "FAILED", label: t("recruiter.screening.cvList.tabs.failed"), count: counts.failed },
  ];

  if (!jobId) {
    return <Navigate to="/recruiter" replace />;
  }

  if (Number.isInteger(requestedCvId) && requestedCvId > 0) {
    return <Navigate to={`/recruiter/jobs/${jobId}/cvs/${requestedCvId}`} replace />;
  }

  const openCvDetail = (cvId: number) =>
    navigate(`/recruiter/jobs/${jobId}/cvs/${cvId}`, { state: { backSearch: location.search } });

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 text-[var(--color-on-surface)]">
      {/* 1. Compact Metric & Skills Toolbar */}
      {isInitialLoading ? (
        <HeaderMetricBarSkeleton />
      ) : (
        <CompactMetricToolbar
          counts={counts}
          requiredSkills={requiredSkills}
          preferredSkills={preferredSkills}
        />
      )}

      {/* 2. Action Toolbar: Tabs on Left, Sort on Right */}
      {isInitialLoading ? (
        <FilterBarSkeleton />
      ) : (
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white p-2 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label={t("recruiter.screening.cvList.tabs.filterAria")}>
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

          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-slate-500">{t("recruiter.screening.cvList.sort.label")}</span>
            <select
              aria-label={t("recruiter.screening.cvList.sort.aria")}
              className="h-8.5 cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] font-medium text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary shadow-2xs"
              value={sort}
              onChange={(e) => handleSortChange(e.target.value as Sort)}
            >
              <option value="newest">{t("recruiter.screening.cvList.sort.newest")}</option>
              <option value="score">{t("recruiter.screening.cvList.sort.score")}</option>
            </select>
          </div>
        </div>
      )}

      {/* 3. Candidate CV Data Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[940px] border-collapse text-left text-sm">
            <thead>
              <tr className="h-11 select-none border-b border-slate-200/80 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-700">
                <th className="py-3 pl-6 pr-4">{t("recruiter.screening.cvList.table.candidate")}</th>
                <th className="px-4 py-3">{t("recruiter.screening.cvList.table.cvFile")}</th>
                <th className="px-4 py-3">{t("recruiter.screening.cvList.table.status")}</th>
                <th className="px-4 py-3">{t("recruiter.screening.cvList.table.score")}</th>
                <th className="px-4 py-3">{t("recruiter.screening.cvList.table.github")}</th>
                <th className="py-3 pr-6 text-right">{t("recruiter.screening.cvList.table.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isInitialLoading || isTableTransitioning || rowsPending ? (
                <TableRowsSkeleton rows={pageSize} />
              ) : rowsError ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm" role="alert">{getApiErrorMessage(rowsError)}</td></tr>
              ) : paginatedRows.length > 0 ? (
                paginatedRows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer transition-colors hover:bg-slate-50/80"
                    onClick={() => openCvDetail(row.id)}
                  >
                    <td className="py-3.5 pl-6 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary">
                          {cvInitials(row.candidateName)}
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-semibold text-slate-900 leading-tight">{row.candidateName}</span>
                          <span className="text-xs text-slate-500">
                            {t("recruiter.screening.cvList.table.submittedAt", { date: formatCvDate(row.createdAt, locale) })}
                          </span>
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
                    <td className="px-4 py-3.5"><GithubSummaryCell row={row} /></td>
                    <td className="py-3.5 pr-6 text-right">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openCvDetail(row.id); }}
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-primary/10 px-3 text-xs font-semibold text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
                      >
                        {t("recruiter.screening.common.details")}
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-14">
                    <div className="flex flex-col items-center text-center">
                      <Inbox className="size-8 text-slate-400" aria-hidden="true" />
                      <p className="mt-3 text-sm font-semibold text-slate-800">
                        {rows.length === 0
                          ? t("recruiter.screening.cvList.empty.noCvsTitle")
                          : t("recruiter.screening.cvList.empty.noMatchTitle")}
                      </p>
                      <p className="mt-1 max-w-md text-xs text-slate-500">
                        {rows.length === 0
                          ? t("recruiter.screening.cvList.empty.noCvsDesc")
                          : t("recruiter.screening.cvList.empty.noMatchDesc")}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination Controls */}
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
            <div className="flex items-center gap-2 text-xs sm:text-[13px] text-slate-600">
              <p>
                {renderHighlightedRange(
                  t("recruiter.screening.cvList.pagination.summary", { range: "__RANGE__", total: "__TOTAL__" }),
                  `${startIndex + 1}–${Math.min(startIndex + pageSize, totalItems)}`,
                  formatNumber(totalItems, undefined, locale),
                )}
              </p>
              <span className="text-slate-300">·</span>
              <span className="tabular-nums">
                {t("recruiter.screening.cvList.pagination.pageOf", { current: currentPage, total: totalPages })}
              </span>
              {list.isFetching && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-primary ml-1" role="status">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  <span className="hidden sm:inline">{t("recruiter.screening.common.loading")}</span>
                </span>
              )}
            </div>

            <div className="flex items-center justify-start lg:justify-center">
              <label className="flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-600">
                <span>{t("recruiter.screening.cvList.pagination.showLabel")}</span>
                <select
                  aria-label={t("recruiter.screening.cvList.pagination.pageSizeAria")}
                  value={pageSize}
                  onChange={(e) => {
                    const nextSize = Number(e.target.value);
                    goToPage(1, nextSize);
                  }}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs sm:text-[13px] font-semibold text-slate-800 shadow-2xs outline-none transition-colors hover:border-brand-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 cursor-pointer"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {t("recruiter.screening.cvList.pagination.perPage", { size })}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <nav className="flex items-center gap-1" aria-label={t("recruiter.screening.cvList.pagination.navAria")}>
                <button
                  type="button"
                  aria-label={t("recruiter.screening.cvList.pagination.firstPageAria")}
                  title={t("recruiter.screening.cvList.pagination.firstPageTitle")}
                  disabled={currentPage === 1}
                  onClick={() => goToPage(1)}
                  className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronsLeft className="size-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  aria-label={t("recruiter.screening.cvList.pagination.prevPage")}
                  title={t("recruiter.screening.cvList.pagination.prevPage")}
                  disabled={currentPage === 1}
                  onClick={() => goToPage(currentPage - 1)}
                  className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </button>

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
                        aria-label={t("recruiter.screening.cvList.pagination.pageAria", { page: item })}
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

                <button
                  type="button"
                  aria-label={t("recruiter.screening.cvList.pagination.nextPage")}
                  title={t("recruiter.screening.cvList.pagination.nextPage")}
                  disabled={currentPage >= totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                  className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  aria-label={t("recruiter.screening.cvList.pagination.lastPageAria")}
                  title={t("recruiter.screening.cvList.pagination.lastPageTitle", { total: totalPages })}
                  disabled={currentPage >= totalPages}
                  onClick={() => goToPage(totalPages)}
                  className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronsRight className="size-4" aria-hidden="true" />
                </button>
              </nav>

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
                <label htmlFor="jump-page-input-cvs" className="whitespace-nowrap">
                  {t("recruiter.screening.cvList.pagination.goTo")}
                </label>
                <input
                  id="jump-page-input-cvs"
                  type="number"
                  min={1}
                  max={totalPages}
                  placeholder={String(currentPage)}
                  value={jumpVal}
                  onChange={(e) => setJumpVal(e.target.value)}
                  className="h-8 w-11 rounded-lg border border-slate-200 bg-white px-1 text-center text-xs font-semibold text-slate-800 shadow-2xs outline-none transition-colors hover:border-brand-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  title={t("recruiter.screening.cvList.pagination.jumpTitle", { total: totalPages })}
                />
                <span className="text-xs">{t("recruiter.screening.cvList.pagination.pageUnit")}</span>
                <button
                  type="submit"
                  disabled={!jumpVal || isNaN(Number(jumpVal)) || Number(jumpVal) < 1 || Number(jumpVal) > totalPages}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("recruiter.screening.cvList.pagination.goBtn")}
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </div>
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
  const t = useT();
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const totalSkills = requiredSkills.length + preferredSkills.length;
  const maxVisibleSkills = 5;
  const visibleSkills = requiredSkills.slice(0, maxVisibleSkills);
  const remainingCount = requiredSkills.length - maxVisibleSkills;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] sm:text-sm font-medium text-slate-700">{t("recruiter.screening.cvList.metrics.totalCvs")}</span>
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {counts.all}
            </span>
          </div>

          <div className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden="true" />

          <div className="flex items-baseline gap-2">
            <span className="text-[13px] sm:text-sm font-medium text-slate-700">{t("recruiter.screening.cvList.metrics.scored")}</span>
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {counts.scored}
            </span>
          </div>

          {counts.processing > 0 && (
            <>
              <div className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden="true" />
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] sm:text-sm font-medium text-slate-700">{t("recruiter.screening.cvList.metrics.processing")}</span>
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-amber-600 tabular-nums">
                  {counts.processing}
                </span>
              </div>
            </>
          )}

          <div className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden="true" />

          <div className="flex items-baseline gap-2">
            <span className="text-[13px] sm:text-sm font-medium text-slate-700">{t("recruiter.screening.cvList.metrics.averageScore")}</span>
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-brand-primary tabular-nums">
              {counts.average == null ? "—" : formatNumber(counts.average, { maximumFractionDigits: 1 }, locale)}
            </span>
            <span className="text-xs font-normal text-slate-400">/100</span>
          </div>
        </div>

        {totalSkills > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-800">
              <ListChecks className="size-4 text-brand-primary" aria-hidden="true" />
              <span className="text-[13px] sm:text-sm font-semibold text-slate-800">
                {t("recruiter.screening.cvList.metrics.requiredCount", { count: requiredSkills.length })}
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
                  {t("recruiter.screening.cvList.metrics.moreSkills", { count: remainingCount })} <ChevronDown className="size-3.5" />
                </button>
              )}
              {expanded && (
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-200/70 px-2.5 py-0.5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                >
                  {t("recruiter.screening.common.collapse")} <ChevronUp className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {expanded && (
        <div className="mt-1 flex flex-col gap-2.5 rounded-lg border border-slate-200/80 bg-slate-50/70 p-3">
          {requiredSkills.length > 0 && (
            <div className="flex flex-wrap items-start gap-2">
              <span className="min-w-28 text-[13px] font-semibold text-slate-700 pt-0.5">
                {t("recruiter.screening.cvList.metrics.requiredCount", { count: requiredSkills.length })}
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
                {t("recruiter.screening.cvList.metrics.preferredCount", { count: preferredSkills.length })}
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

function GithubSummaryCell({ row }: { row: CvSummary }) {
  const t = useT();
  const locale = useLocale();
  const status = row.githubStatus;
  if (!status || status === "NOT_PROVIDED") {
    return <span className="text-xs text-slate-400">{t("recruiter.screening.cvList.githubCell.none")}</span>;
  }
  if (status === "PENDING" || status === "PROCESSING") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
        {t("recruiter.screening.cvList.githubCell.scanning")}
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
        <GitBranch className="size-3" aria-hidden="true" />
        {t("recruiter.screening.cvList.githubCell.unreadable")}
      </span>
    );
  }

  const trust = row.githubTrustLevel;
  const isWarning = trust === "WARNING";
  const isHighTrust = trust === "HIGH";
  const num = row.githubScore != null ? Number(row.githubScore) : null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        {num != null ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[var(--color-primary-hover)]">
            <GitBranch className="size-3" aria-hidden="true" />
            {t("recruiter.screening.common.pointsCompact", { score: formatNumber(num, { maximumFractionDigits: 0 }, locale) })}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            <GitBranch className="size-3" aria-hidden="true" />
            {t("recruiter.screening.cvList.githubCell.partial")}
          </span>
        )}
        {isWarning && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700" title={t("recruiter.screening.cvList.githubCell.warningTitle")}>
            <ShieldAlert className="size-3" aria-hidden="true" />
            {t("recruiter.screening.cvList.githubCell.warning")}
          </span>
        )}
        {isHighTrust && !isWarning && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700" title={t("recruiter.screening.cvList.githubCell.trustedTitle")}>
            <ShieldCheck className="size-3" aria-hidden="true" />
            {t("recruiter.screening.cvList.githubCell.trusted")}
          </span>
        )}
      </div>
    </div>
  );
}

function ScoreCell({ score }: { score: number | null }) {
  const t = useT();
  const locale = useLocale();
  if (score == null) return <span className="text-xs italic text-slate-400">{t("recruiter.screening.cvList.table.noScore")}</span>;
  const num = Number(score);
  const pct = Math.min(Math.max(num, 0), 100);

  let levelColor = {
    text: "text-rose-600",
    bar: "bg-rose-500",
    track: "bg-rose-100/70",
    badge: "bg-rose-50 text-rose-700 border-rose-200/60",
    label: t("recruiter.screening.cvList.table.tierFail"),
  };

  if (num >= 70) {
    levelColor = {
      text: "text-emerald-600",
      bar: "bg-emerald-500",
      track: "bg-emerald-100/70",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
      label: t("recruiter.screening.cvList.table.tierPass"),
    };
  } else if (num >= 50) {
    levelColor = {
      text: "text-amber-600",
      bar: "bg-amber-500",
      track: "bg-amber-100/70",
      badge: "bg-amber-50 text-amber-700 border-amber-200/60",
      label: t("recruiter.screening.cvList.table.tierConsider"),
    };
  }

  return (
    <div className="flex w-36 flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className={cn("text-sm font-bold tabular-nums", levelColor.text)}>
          {formatNumber(num, { maximumFractionDigits: 1 }, locale)}
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
