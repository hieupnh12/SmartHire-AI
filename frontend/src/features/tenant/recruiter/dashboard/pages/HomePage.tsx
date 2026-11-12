import { useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bot,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Library,
  FileSearch,
  Gauge,
  Layers3,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { dashboardApi } from "@/api/tenant/dashboardApi";
import { applicantApi } from "@/api/tenant/applicantApi";
import { cvApi } from "@/api/tenant/cvApi";
import { jobApi } from "@/api/tenant/jobApi";
import type { JobListItem, JobPage, JobStatus } from "@/api/types/job";
import type { ApplicationSummary } from "@/api/types/applicant";
import type { ApiResponse } from "@/types/api";
import { humanInterviewApi } from "@/api/tenant/humanInterviewApi";
import { mapHumanInterview } from "@/features/tenant/recruiter/schedules/utils/mapHumanInterview";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import {
  canViewAllJobs,
  hasRecruiterFeature,
  isCompanyAdminUser,
} from "@/features/tenant/recruiter/permissions";
import { formatDate, formatDateTime, formatNumber, toIntlLocale, useLocale, useT, type Locale, type TranslateFn } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { LoadingState, Skeleton } from "@/components/ux/Skeleton";
import { keepPreviousData, TableRefreshBar } from "@/components/ux/TableRefresh";
import {
  RecruiterFilterDropdown,
  type FilterOption,
} from "../components/RecruiterFilterDropdown";
import {
  DEFAULT_JOB_PAGE_SIZE,
  JOB_PAGE_SIZE_OPTIONS,
  clampPageIndex,
  computeTotalPages,
  getPaginationItems,
  isExpiringWithinWindow,
  parsePageParam,
  parsePageSizeParam,
  slicePageItems,
} from "../utils/jobPagination";

const statusStyle: Record<JobStatus, string> = {
  DRAFT: "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]",
  PUBLISHED: "bg-[var(--color-primary-soft)] text-brand-primary",
  PAUSED: "bg-amber-50 text-amber-700",
  CLOSED: "bg-slate-100 text-slate-600",
  ARCHIVED: "bg-slate-100 text-slate-500",
};

function formatDeadline(value: string | null | undefined, locale: Locale, t: TranslateFn) {
  if (!value) return t("recruiter.ops.common.noDeadline");
  return formatDate(value, { day: "2-digit", month: "short", year: "numeric" }, locale);
}

function JobFeedSkeleton() {
  const t = useT();
  return (
    <LoadingState label={t("recruiter.ops.dashboard.loadingJobs")} className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white">
        <Skeleton className="h-11 w-full rounded-none" />
        {Array.from({ length: 5 }, (_, index) => <div key={index} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-t border-[var(--color-border-default)] px-4 py-4"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-24" /><Skeleton className="ml-auto h-9 w-20" /></div>)}
      </div>
    </LoadingState>
  );
}

function JobTable({ jobs, refreshing = false }: { jobs: JobListItem[]; refreshing?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const employmentLabel = (type?: string | null) => {
    if (!type) return t("recruiter.ops.common.employmentTypeUnset");
    const key = `recruiter.ops.employmentTypes.${type}`;
    const label = t(key);
    return label === key ? type : label;
  };
  const workModeLabel = (mode?: string | null) => {
    if (!mode) return t("recruiter.ops.common.flexibleLocation");
    const key = `recruiter.ops.workModes.${mode}`;
    const label = t(key);
    return label === key ? mode : label;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-[0_12px_30px_-24px_rgba(15,23,42,0.45)]">
      <TableRefreshBar active={refreshing} />
      <div className="overflow-x-auto">
      <table className={cn("w-full min-w-[1040px] border-separate border-spacing-0 text-left text-xs transition-opacity duration-200", refreshing && "opacity-60")}>
        <caption className="sr-only">{t("recruiter.ops.dashboard.tableCaption")}</caption>
        <thead className="text-[var(--color-on-surface-variant)]">
          <tr>
            <th scope="col" className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-5 py-3.5 font-semibold">{t("recruiter.ops.dashboard.colJobTitle")}</th>
            <th scope="col" className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-4 py-3.5 font-semibold">{t("recruiter.ops.dashboard.colStatus")}</th>
            <th scope="col" className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-4 py-3.5 font-semibold">{t("recruiter.ops.dashboard.colDepartment")}</th>
            <th scope="col" className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-4 py-3.5 font-semibold">{t("recruiter.ops.dashboard.colScreening")}</th>
            <th scope="col" className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-4 py-3.5 text-right font-semibold">{t("recruiter.ops.dashboard.colProgress")}</th>
            <th scope="col" className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-5 py-3.5 text-right font-semibold"><span className="sr-only">{t("recruiter.ops.common.actionsSrOnly")}</span></th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="group transition-colors hover:bg-[var(--color-primary-subtle)] focus-within:bg-[var(--color-primary-subtle)]">
              <th scope="row" className="border-b border-[var(--color-border-default)] px-5 py-4 font-normal">
                <Link to={`/recruiter/jobs/${job.id}`} className="font-semibold text-[var(--color-on-surface)] underline-offset-4 hover:text-brand-primary hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30">{job.title}</Link>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] font-normal text-[var(--color-outline)]">
                  <span>#{String(job.id).padStart(4, "0")}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="size-3" aria-hidden="true" />{job.location || workModeLabel(job.workMode)}</span>
                  <span className="inline-flex items-center gap-1"><CalendarDays className="size-3" aria-hidden="true" />{formatDeadline(job.deadline, locale, t)}</span>
                </div>
              </th>
              <td className="border-b border-[var(--color-border-default)] px-4 py-4">
                <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold", statusStyle[job.status])}>
                  <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                  {t(`recruiter.ops.jobStatuses.${job.status}`)}
                </span>
              </td>
              <td className="border-b border-[var(--color-border-default)] px-4 py-4 text-[var(--color-on-surface-variant)]">
                <span className="block max-w-36 truncate" title={job.department || undefined}>{job.department || t("recruiter.ops.common.departmentUnclassified")}</span>
                <span className="mt-1 block text-[11px] text-[var(--color-outline)]">{employmentLabel(job.employmentType)}</span>
              </td>
              <td className="border-b border-[var(--color-border-default)] px-4 py-4">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[var(--color-on-surface-variant)]">
                  {job.screeningMode === "AUTO" ? <Bot className="size-4 text-violet-600" aria-hidden="true" /> : <UserCheck className="size-4 text-sky-600" aria-hidden="true" />}
                  {job.screeningMode === "AUTO" ? t("recruiter.ops.common.screeningAuto") : t("recruiter.ops.common.screeningManual")}
                </span>
              </td>
              <td className="border-b border-[var(--color-border-default)] px-4 py-4">
                <div className="ml-auto w-40">
                  <div className="flex items-center justify-between font-medium tabular-nums">
                    <span>{t("recruiter.ops.dashboard.applicationsCount", { count: job.applicationCount ?? 0 })}</span>
                    <span>{t("recruiter.ops.dashboard.hiredRatio", { filled: job.funnel?.filled ?? 0, headcount: job.headcount ?? 0 })}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-container)]" aria-hidden="true"><div className="h-full rounded-full bg-brand-primary" style={{ width: `${Math.min(100, ((job.funnel?.filled ?? 0) / Math.max(job.headcount ?? 1, 1)) * 100)}%` }} /></div>
                </div>
              </td>
              <td className="border-b border-[var(--color-border-default)] px-5 py-4 text-right">
                <Link to={`/recruiter/jobs/${job.id}`} aria-label={t("recruiter.ops.dashboard.openWorkspaceAria", { title: job.title })} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] bg-white px-3 font-semibold text-[var(--color-on-surface)] transition-colors hover:border-brand-primary/40 hover:bg-[var(--color-primary-soft)] hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30">{t("recruiter.ops.dashboard.openBtn")}<ArrowRight className="size-3.5" aria-hidden="true" /></Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function InlineDataError({ message, onRetry, compact = false }: { message: string; onRetry: () => void; compact?: boolean }) {
  const t = useT();
  return <div role="alert" className={cn("flex gap-2 rounded-xl border border-red-200 bg-red-50 text-red-800", compact ? "m-3 flex-col items-stretch p-2.5" : "items-center p-3")}><div className="flex min-w-0 items-start gap-2"><AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden="true" /><p className="min-w-0 flex-1 text-xs leading-5">{message}</p></div><button type="button" onClick={onRetry} className={cn("inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-white px-2.5 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300", compact && "w-full")}><RefreshCw className="size-3.5" aria-hidden="true" />{t("recruiter.ops.common.retry")}</button></div>;
}

type TaskDrawerGroup = { jobId: number; title: string; to: string; items: Array<{ id: string | number; title: string; detail: string; to: string }> };

function TaskDrawer({ open, title, description, icon: Icon, groups, loading, error, emptyTitle, emptyDescription, onClose, onRetry }: {
  open: boolean;
  title: string;
  description: string;
  icon: LucideIcon;
  groups: TaskDrawerGroup[];
  loading: boolean;
  error: unknown;
  emptyTitle: string;
  emptyDescription: string;
  onClose: () => void;
  onRetry: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;
  const loweredTitle = title.toLocaleLowerCase(toIntlLocale(locale));
  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/30 backdrop-blur-[2px]" role="presentation" onMouseDown={onClose}>
      <aside role="dialog" aria-modal="true" aria-labelledby="task-drawer-title" onMouseDown={(event) => event.stopPropagation()} className="absolute inset-y-0 right-0 flex w-[min(520px,100vw)] flex-col bg-white shadow-2xl">
        <header className="flex items-start gap-3 border-b border-[var(--color-border-default)] px-5 py-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary"><Icon className="size-5" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1"><h2 id="task-drawer-title" className="text-lg font-semibold">{title}</h2><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{description}</p></div>
          <button type="button" onClick={onClose} aria-label={t("recruiter.ops.dashboard.drawerCloseAria", { title })} className="grid size-10 shrink-0 place-items-center rounded-xl hover:bg-[var(--color-surface-alt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"><X className="size-5" aria-hidden="true" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading && <LoadingState label={t("recruiter.ops.dashboard.drawerLoading", { title: loweredTitle })}><div className="space-y-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-28 w-full" />)}</div></LoadingState>}
          {Boolean(error) && <InlineDataError message={getApiErrorMessage(error, t("recruiter.ops.dashboard.drawerLoadError", { title: loweredTitle }))} onRetry={onRetry} />}
          {!loading && !error && groups.length === 0 && <div className="rounded-2xl border border-dashed border-[var(--color-border-default)] px-6 py-12 text-center"><UserCheck className="mx-auto size-8 text-emerald-600" aria-hidden="true" /><h3 className="mt-3 font-semibold">{emptyTitle}</h3><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{emptyDescription}</p></div>}
          <div className="space-y-3">
            {groups.map((group) => (
              <section key={group.jobId} className="overflow-hidden rounded-2xl border border-[var(--color-border-default)]">
                <Link to={group.to} onClick={onClose} className="flex min-h-14 items-center gap-3 bg-[var(--color-surface-alt)] px-4 transition-colors hover:bg-[var(--color-primary-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/30">
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{group.title}</span><span className="mt-0.5 block text-xs text-[var(--color-on-surface-variant)]">{t("recruiter.ops.dashboard.drawerOpenJobWorkspace")}</span></span>
                  <strong className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs text-brand-primary">{t("recruiter.ops.dashboard.drawerTaskCount", { count: group.items.length })}</strong><ArrowRight className="size-4 text-brand-primary" aria-hidden="true" />
                </Link>
                <div className="divide-y divide-[var(--color-border-default)]">
                  {group.items.map((item) => (
                    <Link key={item.id} to={item.to} onClick={onClose} className="flex min-h-14 items-center gap-3 px-4 transition-colors hover:bg-[var(--color-primary-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/30">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[10px] font-semibold text-brand-primary">{item.title.split(" ").slice(-2).map((part) => part[0]).join("")}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.title}</span><span className="block truncate text-xs text-[var(--color-on-surface-variant)]">{item.detail}</span></span>
                      <ArrowRight className="size-4 text-[var(--color-outline)]" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

async function fetchExpiringJobs(
  filters: { q?: string; department?: string },
  scope: "my" | "all",
): Promise<ApiResponse<JobPage>> {
  const first = await jobApi.search({
    ...filters,
    status: "PUBLISHED",
    page: 0,
    size: 50,
    scope,
  });
  const total = first.data.total;
  const pageCount = Math.ceil(total / 50);
  const allItems =
    pageCount <= 1
      ? first.data.items
      : [
          first,
          ...(await Promise.all(
            Array.from({ length: pageCount - 1 }, (_, index) =>
              jobApi.search({
                ...filters,
                status: "PUBLISHED",
                page: index + 1,
                size: 50,
                scope,
              }),
            ),
          )),
        ].flatMap((response) => response.data.items);
  const nowMs = Date.now();
  const expiring = allItems.filter((job) => isExpiringWithinWindow(job, nowMs));
  return {
    ...first,
    data: {
      items: expiring,
      total: expiring.length,
      page: 0,
      size: 50,
    },
  };
}

export function HomePage() {
  const t = useT();
  const locale = useLocale();
  const [dashboardParams, setDashboardParams] = useSearchParams();
  const requestedTask = dashboardParams.get("task");
  const requestedJobStatus = dashboardParams.get("status")?.toLowerCase();
  const requestedScope = dashboardParams.get("scope")?.toLowerCase();
  const rawPageParam = dashboardParams.get("page");
  const rawSizeParam = dashboardParams.get("size") ?? dashboardParams.get("limit");
  const urlScope = requestedScope === "my" || requestedScope === "all" ? requestedScope : null;
  const urlPage = parsePageParam(rawPageParam);
  const urlSize = rawSizeParam != null ? parsePageSizeParam(rawSizeParam) : null;
  const expiringOnly = requestedJobStatus === "expiring";
  const [taskDrawer, setTaskDrawer] = useState<"applicants" | "cvs" | "schedules" | null>(requestedTask === "applicants" || requestedTask === "cvs" || requestedTask === "schedules" ? requestedTask : null);
  const [jobSearch, setJobSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | JobStatus>(requestedJobStatus === "draft" ? "DRAFT" : expiringOnly ? "PUBLISHED" : "ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [selectedScope, setSelectedScope] = useState<"my" | "all" | null>(urlScope);
  const [pageByScope, setPageByScope] = useState<{ my: number; all: number }>(() => ({
    my: urlScope === "all" ? 0 : urlPage,
    all: urlScope === "my" ? 0 : urlPage,
  }));
  const [pageSize, setPageSize] = useState(() => parsePageSizeParam(rawSizeParam));
  useEffect(() => {
    if (requestedJobStatus !== "draft" && requestedJobStatus !== "expiring") return;
    setStatusFilter(requestedJobStatus === "draft" ? "DRAFT" : "PUBLISHED");
    setPageByScope({ my: 0, all: 0 });
  }, [requestedJobStatus]);
  useEffect(() => {
    if (urlScope) {
      setSelectedScope(urlScope);
    } else if (requestedJobStatus == null) {
      setSelectedScope(null);
    }
  }, [urlScope, requestedJobStatus]);
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const isAdmin = isCompanyAdminUser(user);
  const canViewAll = canViewAllJobs(user);
  const canCreateJob = isAdmin || (user?.permissions?.includes("JOBS_CREATE") ?? false) || (user?.permissions?.includes("JOBS") ?? false);
  const permissions = user?.permissions;
  const isLoadingUser = Boolean(token && !user);
  const activeScope: "my" | "all" = !canViewAll ? "my" : (urlScope ?? selectedScope ?? (isAdmin ? "all" : "my"));
  const page = pageByScope[activeScope];
  useEffect(() => {
    if (urlSize != null && urlSize !== pageSize) {
      setPageSize(urlSize);
    }
  }, [urlSize, pageSize]);
  useEffect(() => {
    setPageByScope((prev) => (prev[activeScope] === urlPage ? prev : { ...prev, [activeScope]: urlPage }));
  }, [activeScope, urlPage]);
  const goToPage = (nextPage: number, nextSize = pageSize) => {
    const safeNextPage = Math.max(0, nextPage);
    if (nextSize !== pageSize) {
      setPageSize(nextSize);
      setPageByScope({ my: 0, all: 0 });
    } else {
      setPageByScope((prev) => ({ ...prev, [activeScope]: safeNextPage }));
    }
    setDashboardParams((params) => {
      const next = new URLSearchParams(params);
      if (safeNextPage > 0 && nextSize === pageSize) {
        next.set("page", String(safeNextPage + 1));
      } else {
        next.delete("page");
      }
      if (nextSize !== DEFAULT_JOB_PAGE_SIZE) {
        next.set("size", String(nextSize));
      } else {
        next.delete("size");
      }
      next.delete("limit");
      return next;
    }, { replace: true });
  };
  const resetPages = (options?: { clearStatus?: boolean }) => {
    setPageByScope({ my: 0, all: 0 });
    setDashboardParams((params) => {
      const next = new URLSearchParams(params);
      next.delete("page");
      if (options?.clearStatus) {
        next.delete("status");
      }
      return next;
    }, { replace: true });
  };
  const selectScope = (nextScope: "my" | "all") => {
    if (!canViewAll && nextScope === "all") return;
    setSelectedScope(nextScope);
    const targetPage = pageByScope[nextScope];
    setDashboardParams((params) => {
      const next = new URLSearchParams(params);
      next.set("scope", nextScope);
      if (targetPage > 0) {
        next.set("page", String(targetPage + 1));
      } else {
        next.delete("page");
      }
      return next;
    }, { replace: true });
  };
  const sharedSearchFilters = {
    q: jobSearch.trim() || undefined,
    status: expiringOnly ? ("PUBLISHED" as const) : statusFilter === "ALL" ? undefined : statusFilter,
    department: departmentFilter === "ALL" ? undefined : departmentFilter,
  };
  const myJobsQuery = useQuery({
    queryKey: [
      "recruiter-dashboard",
      "jobs",
      "my",
      jobSearch,
      expiringOnly ? "EXPIRING" : statusFilter,
      departmentFilter,
      expiringOnly ? "expiring" : pageByScope.my,
      expiringOnly ? "expiring" : pageSize,
    ],
    queryFn: () =>
      expiringOnly
        ? fetchExpiringJobs({ q: sharedSearchFilters.q, department: sharedSearchFilters.department }, "my")
        : jobApi.search({
            ...sharedSearchFilters,
            page: pageByScope.my,
            size: pageSize,
            scope: "my",
          }),
    placeholderData: keepPreviousData,
    enabled: !!token && !!user,
    refetchInterval: 15_000,
  });
  const allJobsQuery = useQuery({
    queryKey: [
      "recruiter-dashboard",
      "jobs",
      "all",
      jobSearch,
      expiringOnly ? "EXPIRING" : statusFilter,
      departmentFilter,
      expiringOnly ? "expiring" : pageByScope.all,
      expiringOnly ? "expiring" : pageSize,
    ],
    queryFn: () =>
      expiringOnly
        ? fetchExpiringJobs({ q: sharedSearchFilters.q, department: sharedSearchFilters.department }, "all")
        : jobApi.search({
            ...sharedSearchFilters,
            page: pageByScope.all,
            size: pageSize,
            scope: "all",
          }),
    placeholderData: keepPreviousData,
    enabled: !!token && !!user && canViewAll,
    refetchInterval: 15_000,
  });
  const jobsQuery = activeScope === "all" ? allJobsQuery : myJobsQuery;
  const summaryQuery = useQuery({ queryKey: ["recruiter-dashboard", "summary"], queryFn: dashboardApi.summary, enabled: !!token, refetchInterval: 15_000 });
  const actionItemsQuery = useQuery({ queryKey: ["recruiter-dashboard", "action-items"], queryFn: dashboardApi.actionItems, enabled: !!token, refetchInterval: 15_000 });
  const newApplicantsQuery = useQuery({
    queryKey: ["recruiter-dashboard", "new-applicants"],
    queryFn: async () => {
      const first = await applicantApi.list({ status: "NEW", page: 0, size: 50 });
      const pageCount = Math.ceil(first.data.total / 50);
      if (pageCount <= 1) return first.data.items;
      const remaining = await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) => applicantApi.list({ status: "NEW", page: index + 1, size: 50 })));
      return [first, ...remaining].flatMap((response) => response.data.items);
    },
    enabled: !!token && taskDrawer === "applicants",
    refetchInterval: 5_000,
  });
  const taskJobsQuery = useQuery({ queryKey: ["recruiter-dashboard", "task-jobs"], queryFn: jobApi.options, enabled: !!token && (taskDrawer === "cvs" || taskDrawer === "schedules") });
  const cvTaskQueries = useQueries({
    queries: (taskJobsQuery.data?.data ?? []).map((job) => ({
      queryKey: [...queryKeys.cvs.byJob(job.id), "dashboard-tasks"],
      queryFn: () => cvApi.listByJob(job.id),
      enabled: taskDrawer === "cvs",
      refetchInterval: 5_000,
    })),
  });
  const scheduleTaskQueries = useQueries({
    queries: (taskJobsQuery.data?.data ?? []).map((job) => ({
      queryKey: ["human-interviews", "dashboard-tasks", job.id],
      queryFn: () => humanInterviewApi.list({ jobId: job.id, size: 100 }),
      enabled: taskDrawer === "schedules",
      refetchInterval: 5_000,
    })),
  });
  const departmentsQuery = useQuery({ queryKey: ["jobs", "departments"], queryFn: jobApi.departments, enabled: !!token });
  const jobs = jobsQuery.data?.data.items ?? [];
  const jobPage = jobsQuery.data?.data;
  const summary = summaryQuery.data?.data;
  const actionItems = actionItemsQuery.data?.data;
  const activeJobs = summary?.activeJobs ?? 0;
  const draftJobs = actionItems?.draftJobs ?? summary?.draftJobs ?? 0;
  const jobsNearDeadline = actionItems?.jobsNearDeadline ?? summary?.jobsNearDeadline ?? 0;
  const totalApplications = summary?.totalApplications ?? 0;
  const applications = actionItems?.newApplicants ?? summary?.newApplicants ?? 0;
  const pendingCvScreening = actionItems?.pendingCvScreening ?? summary?.pendingCvScreening ?? 0;
  const totalJobs = summary?.totalJobs ?? 0;
  const averageApplications = summary?.averageApplicationsPerOpenJob ?? 0;
  const statusFilterOptions: FilterOption<"ALL" | JobStatus>[] = useMemo(() => [
    { value: "ALL", label: t("recruiter.ops.dashboard.statusAll"), dotColor: "bg-slate-400" },
    {
      value: "PUBLISHED",
      label: t("recruiter.ops.jobStatuses.PUBLISHED"),
      dotColor: "bg-emerald-500",
      badge: (
        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
          {t("recruiter.ops.dashboard.statusOpenBadge")}
        </span>
      ),
    },
    { value: "DRAFT", label: t("recruiter.ops.jobStatuses.DRAFT"), dotColor: "bg-slate-400" },
    { value: "PAUSED", label: t("recruiter.ops.jobStatuses.PAUSED"), dotColor: "bg-amber-500" },
    { value: "CLOSED", label: t("recruiter.ops.jobStatuses.CLOSED"), dotColor: "bg-slate-500" },
  ], [t]);
  const departments = departmentsQuery.data?.data ?? [];
  const departmentOptions: FilterOption<string>[] = useMemo(() => [
    { value: "ALL", label: t("recruiter.ops.dashboard.departmentAll"), icon: Building2 },
    ...departments.map((dept) => ({ value: dept, label: dept, icon: Building2 })),
  ], [departments, t]);
  const totalItems = jobPage?.total ?? 0;
  const effectivePageSize = expiringOnly ? pageSize : Math.max(1, jobPage?.size ?? pageSize);
  const totalJobPages = computeTotalPages(totalItems, effectivePageSize);
  const safePage = clampPageIndex(page, totalJobPages);
  const visibleJobs = useMemo(
    () => (expiringOnly ? slicePageItems(jobs, safePage, pageSize) : jobs),
    [expiringOnly, jobs, safePage, pageSize],
  );
  const pageItems = useMemo(
    () => getPaginationItems(safePage + 1, totalJobPages),
    [safePage, totalJobPages],
  );
  const from = totalItems > 0 ? safePage * effectivePageSize + 1 : 0;
  const to = totalItems > 0 ? Math.min((safePage + 1) * effectivePageSize, totalItems) : 0;
  const isOutOfRangePage =
    !expiringOnly &&
    !jobsQuery.isError &&
    !jobsQuery.isPlaceholderData &&
    totalJobPages > 0 &&
    page >= totalJobPages;
  useEffect(() => {
    if (!jobsQuery.isFetching && !jobsQuery.isPlaceholderData && totalJobPages > 0 && page >= totalJobPages) {
      goToPage(totalJobPages - 1);
    }
  }, [jobsQuery.isFetching, jobsQuery.isPlaceholderData, totalJobPages, page]);
  const isPaginating = jobsQuery.isFetching && jobsQuery.isPlaceholderData;
  const hasActiveFilters = Boolean(jobSearch.trim() || statusFilter !== "ALL" || departmentFilter !== "ALL" || expiringOnly);
  const formatScopeCount = (scope: "my" | "all"): string | null => {
    const q = scope === "all" ? allJobsQuery : myJobsQuery;
    if (isLoadingUser || (q.isPending && !q.data)) return "—";
    if (q.isError) return "!";
    return formatNumber(q.data?.data.total ?? 0, {}, locale);
  };
  const summaryUnavailable = summaryQuery.isPending || summaryQuery.isError;
  const actionItemsUnavailable = actionItemsQuery.isPending || actionItemsQuery.isError;
  const metric = (value: number | string) => summaryUnavailable ? "—" : (typeof value === "number" ? formatNumber(value, {}, locale) : value);
  const actionMetric = (value: number) => actionItemsUnavailable ? "—" : formatNumber(value, {}, locale);
  const applicantGroups = useMemo<TaskDrawerGroup[]>(() => {
    const byJob = new Map<number, { title: string; rows: ApplicationSummary[] }>();
    (newApplicantsQuery.data ?? []).forEach((application) => {
      const group = byJob.get(application.jobId) ?? { title: application.jobTitle, rows: [] };
      group.rows.push(application);
      byJob.set(application.jobId, group);
    });
    return [...byJob.entries()].map(([jobId, group]) => ({
      jobId,
      title: group.title,
      to: `/recruiter/jobs/${jobId}/applicants?view=board`,
      items: group.rows.map((application) => ({ id: application.id, title: application.candidateName, detail: application.candidateEmail, to: `/recruiter/jobs/${jobId}/applicants?view=board&applicationId=${application.id}` })),
    })).sort((a, b) => b.items.length - a.items.length);
  }, [newApplicantsQuery.data]);
  const cvGroups = useMemo<TaskDrawerGroup[]>(() => (taskJobsQuery.data?.data ?? []).flatMap((job, index) => {
    const payload = cvTaskQueries[index]?.data?.data;
    const list = Array.isArray(payload) ? payload : payload?.items ?? [];
    const rows = list.filter((cv) => cv.status === "UPLOADED" || cv.status === "PARSED");
    return rows.length === 0 ? [] : [{ jobId: job.id, title: job.title, to: `/recruiter/jobs/${job.id}/cvs`, items: rows.map((cv) => ({ id: cv.id, title: cv.candidateName, detail: cv.originalFilename, to: `/recruiter/jobs/${job.id}/cvs?cvId=${cv.id}` })) }];
  }).sort((a, b) => b.items.length - a.items.length), [cvTaskQueries, taskJobsQuery.data]);
  const scheduleGroups = useMemo<TaskDrawerGroup[]>(() => (taskJobsQuery.data?.data ?? []).flatMap((job, index) => {
    const rows = (scheduleTaskQueries[index]?.data?.items ?? [])
      .map(mapHumanInterview)
      .filter((interview): interview is NonNullable<typeof interview> =>
        !!interview && interview.status !== "CANCELLED" && interview.status !== "DONE" && new Date(interview.startsAt).getTime() >= Date.now());
    return rows.length === 0 ? [] : [{
      jobId: job.id,
      title: job.title,
      to: `/recruiter/jobs/${job.id}/schedules?status=upcoming`,
      items: rows.map((interview) => ({
        id: interview.id,
        title: interview.candidateName,
        detail: formatDateTime(interview.startsAt, undefined, locale),
        to: `/recruiter/jobs/${job.id}/schedules?status=upcoming&scheduleId=${interview.id}`,
      })),
    }];
  }).sort((a, b) => b.items.length - a.items.length), [scheduleTaskQueries, taskJobsQuery.data, locale]);

  return (
    <section className="grid min-h-[calc(100vh-4rem)] items-stretch xl:grid-cols-[220px_minmax(0,1fr)] 2xl:grid-cols-[228px_minmax(0,1fr)]">
      <aside className="h-full border-b border-[var(--color-border-default)] bg-[var(--color-surface-card)] xl:sticky xl:top-16 xl:h-[calc(100dvh-4rem)] xl:self-start xl:border-b-0 xl:border-r" aria-label={t("recruiter.ops.dashboard.sidebarAria")}>
        <div className="grid h-full grid-rows-[auto_minmax(0,1.15fr)_minmax(0,0.85fr)_auto] overflow-hidden">
          <Link to="/recruiter/question-bank" className="block border-b border-[var(--color-border-default)] p-3.5 hover:bg-[var(--color-primary-soft)]"><div className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-brand-primary"><Library className="size-4" aria-hidden="true" /></span><div><h2 className="text-sm font-semibold">{t("recruiter.ops.dashboard.questionBankTitle")}</h2><p className="mt-0.5 text-[11px] text-[var(--color-on-surface-variant)]">{t("recruiter.ops.dashboard.questionBankSubtitle")}</p></div></div></Link>
          <div className="grid min-h-0 auto-rows-fr divide-y divide-[var(--color-border-default)]">
            {actionItemsQuery.isError ? <InlineDataError compact message={t("recruiter.ops.dashboard.actionItemsError")} onRetry={() => void actionItemsQuery.refetch()} /> : <>
            {hasRecruiterFeature(permissions, "APPLICANTS") && <button type="button" onClick={() => setTaskDrawer("applicants")} aria-haspopup="dialog" aria-expanded={taskDrawer === "applicants"} className="flex h-full min-h-11 w-full items-center gap-2.5 px-3 text-left transition-colors hover:bg-[var(--color-primary-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/30"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-brand-primary"><Users className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{t("recruiter.ops.dashboard.newApplicantsTitle")}</span><span className="block truncate text-[11px] text-[var(--color-on-surface-variant)]">{t("recruiter.ops.dashboard.viewByJob")}</span></span><strong className="text-sm text-brand-primary">{actionMetric(applications)}</strong></button>}
            {hasRecruiterFeature(permissions, "CV_SCREENING") && <button type="button" onClick={() => setTaskDrawer("cvs")} aria-haspopup="dialog" aria-expanded={taskDrawer === "cvs"} className="flex h-full min-h-11 w-full items-center gap-2.5 px-3 text-left transition-colors hover:bg-[var(--color-primary-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/30"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-surface-alt)] text-[var(--color-on-surface-variant)]"><FileSearch className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{t("recruiter.ops.dashboard.cvsToScreenTitle")}</span><span className="block truncate text-[11px] text-[var(--color-on-surface-variant)]">{t("recruiter.ops.dashboard.viewByJob")}</span></span><strong className="text-sm">{actionMetric(pendingCvScreening)}</strong></button>}
            {hasRecruiterFeature(permissions, "SCHEDULES") && <button type="button" onClick={() => setTaskDrawer("schedules")} aria-haspopup="dialog" aria-expanded={taskDrawer === "schedules"} className="flex h-full min-h-11 w-full items-center gap-2.5 px-3 text-left transition-colors hover:bg-[var(--color-primary-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/30"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-surface-alt)] text-[var(--color-on-surface-variant)]"><CalendarDays className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{t("recruiter.ops.dashboard.interviewsTitle")}</span><span className="block truncate text-[11px] text-[var(--color-on-surface-variant)]">{t("recruiter.ops.dashboard.viewByJob")}</span></span><strong className="text-sm">{actionMetric(actionItems?.upcomingInterviews ?? 0)}</strong></button>}
            {hasRecruiterFeature(permissions, "JOBS") && <div className="flex h-full min-h-11 items-center gap-2.5 px-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700"><AlertCircle className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{t("recruiter.ops.dashboard.attentionTitle")}</span><span className="flex gap-1 text-[11px] text-[var(--color-on-surface-variant)]"><Link to="/recruiter?status=draft" className="rounded underline-offset-2 hover:text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30">{t("recruiter.ops.dashboard.draftCount", { count: draftJobs })}</Link><span aria-hidden="true">·</span><Link to="/recruiter?status=expiring" className="rounded underline-offset-2 hover:text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30">{t("recruiter.ops.dashboard.expiringCount", { count: jobsNearDeadline })}</Link></span></span><strong className="text-sm">{formatNumber(draftJobs + jobsNearDeadline, {}, locale)}</strong></div>}
            </>}
          </div>
          <div className="grid min-h-0 grid-rows-[auto_1fr] border-t border-[var(--color-border-default)] p-3">
            <div className="flex items-center gap-2"><Target className="size-4 text-brand-primary" aria-hidden="true" /><h3 className="text-sm font-semibold">{t("recruiter.ops.dashboard.todayPriorities")}</h3></div>
            <div className="mt-1 grid min-h-0 grid-rows-3">
              <div className="flex items-center gap-2.5"><span className="size-2 shrink-0 rounded-full bg-brand-primary" /><p className="text-[11px] leading-4 text-[var(--color-on-surface-variant)]">{t("recruiter.ops.dashboard.priorityReviewPrefix")} <strong className="text-[var(--color-on-surface)]">{t("recruiter.ops.dashboard.priorityNewApplicants", { count: actionMetric(applications) })}</strong> {t("recruiter.ops.dashboard.priorityReviewSuffix")}</p></div>
              <div className="flex items-center gap-2.5"><span className="size-2 shrink-0 rounded-full bg-amber-500" /><p className="text-[11px] leading-4 text-[var(--color-on-surface-variant)]"><strong className="text-[var(--color-on-surface)]">{t("recruiter.ops.dashboard.priorityExpiringJobs", { count: actionMetric(jobsNearDeadline) })}</strong> {t("recruiter.ops.dashboard.priorityExpiringSuffix")}</p></div>
              <div className="flex items-center gap-2.5"><span className="size-2 shrink-0 rounded-full bg-slate-300" /><p className="text-[11px] leading-4 text-[var(--color-on-surface-variant)]">{t("recruiter.ops.dashboard.priorityDraftPrefix")} <strong className="text-[var(--color-on-surface)]">{t("recruiter.ops.dashboard.priorityDraftJobs", { count: actionMetric(draftJobs) })}</strong> {t("recruiter.ops.dashboard.priorityDraftSuffix")}</p></div>
            </div>
          </div>
          <div className="border-t border-[var(--color-border-default)] p-3">
            <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-outline)]">{t("recruiter.ops.dashboard.quickActions")}</p>
            <div className="grid grid-cols-2 gap-2">
              {canCreateJob && <Link to="/recruiter/jobs/new" aria-label={t("recruiter.ops.dashboard.createJobAria")} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-2 text-xs font-semibold text-white transition-colors hover:bg-brand-primary-hover"><Plus className="size-3.5" aria-hidden="true" />{t("recruiter.ops.dashboard.createJobBtn")}</Link>}
              {hasRecruiterFeature(permissions, "SCHEDULES") && <Link to="/recruiter/schedules" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border-default)] px-2 text-xs font-semibold transition-colors hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary"><CalendarDays className="size-3.5" aria-hidden="true" />{t("recruiter.ops.dashboard.viewScheduleBtn")}</Link>}
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 px-4 py-4 sm:px-5">
        <div className="mb-3 grid grid-flow-col auto-cols-[minmax(180px,1fr)] gap-2 overflow-x-auto">
          <div className="group relative overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white p-3 shadow-sm transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none hover:border-[var(--color-primary)]/45 hover:shadow-md"><span className="absolute inset-x-0 top-0 h-1 bg-[var(--color-primary)]" aria-hidden="true" /><div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-on-surface-variant)]">{t("recruiter.ops.dashboard.kpiActiveJobs")}</span><span className="grid size-8 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><Layers3 className="size-4" aria-hidden="true" /></span></div><p className="mt-2 text-xl font-semibold">{metric(activeJobs)}</p><p className="mt-0.5 text-[10px] text-[var(--color-on-surface-variant)]">{t("recruiter.ops.dashboard.kpiActiveJobsHint", { count: metric(totalJobs) })}</p></div>
          <div className="group relative overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white p-3 shadow-sm transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none hover:border-[var(--color-secondary)]/45 hover:shadow-md"><span className="absolute inset-x-0 top-0 h-1 bg-[var(--color-secondary)]" aria-hidden="true" /><div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-on-surface-variant)]">{t("recruiter.ops.dashboard.kpiIntakeRate")}</span><span className="grid size-8 place-items-center rounded-lg bg-[var(--color-secondary-container)] text-[var(--color-secondary)]"><Gauge className="size-4" aria-hidden="true" /></span></div><p className="mt-2 text-xl font-semibold">{metric(averageApplications)}<span className="ml-1 text-[10px] font-normal text-[var(--color-on-surface-variant)]">{t("recruiter.ops.dashboard.kpiIntakeUnit")}</span></p><p className="mt-0.5 text-[10px] text-[var(--color-on-surface-variant)]">{t("recruiter.ops.dashboard.kpiIntakeHint")}</p></div>
          <div className="group relative overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white p-3 shadow-sm transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none hover:border-[var(--color-on-surface)]/35 hover:shadow-md"><span className="absolute inset-x-0 top-0 h-1 bg-[var(--color-on-surface)]" aria-hidden="true" /><div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-on-surface-variant)]">{t("recruiter.ops.dashboard.kpiTotalCandidates")}</span><span className="grid size-8 place-items-center rounded-lg bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)]"><Users className="size-4" aria-hidden="true" /></span></div><p className="mt-2 text-xl font-semibold">{metric(totalApplications)}</p><p className="mt-0.5 text-[10px] text-[var(--color-on-surface-variant)]">{t("recruiter.ops.dashboard.kpiTotalCandidatesHint")}</p></div>
          <div className="group relative overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white p-3 shadow-sm transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none hover:border-[var(--color-tertiary)]/45 hover:shadow-md"><span className="absolute inset-x-0 top-0 h-1 bg-[var(--color-tertiary)]" aria-hidden="true" /><div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-on-surface-variant)]">{t("recruiter.ops.dashboard.kpiHireConversion")}</span><span className="grid size-8 place-items-center rounded-lg bg-amber-50 text-[var(--color-tertiary)]"><TrendingUp className="size-4" aria-hidden="true" /></span></div><p className="mt-2 text-xl font-semibold">{summaryUnavailable ? "—" : summary?.hireRate != null ? `${formatNumber(summary.hireRate, {}, locale)}%` : "—"}</p><p className="mt-0.5 text-[10px] text-[var(--color-on-surface-variant)]">{t("recruiter.ops.dashboard.kpiHireConversionHint")}</p></div>
        </div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border-default)] bg-white px-3 py-2">
          {canViewAll ? (
            <div
              role="tablist"
              aria-label={t("recruiter.ops.dashboard.scopeTablistAria")}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                  event.preventDefault();
                  selectScope(activeScope === "my" ? "all" : "my");
                }
              }}
              className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-[var(--color-surface-alt)] p-1"
            >
              {(["my", "all"] as const).map((scope) => {
                const selected = activeScope === scope;
                const count = formatScopeCount(scope);
                const ScopeIcon = scope === "my" ? UserCheck : Layers3;
                return (
                  <button
                    key={scope}
                    type="button"
                    role="tab"
                    id={`recruiter-jobs-tab-${scope}`}
                    aria-selected={selected}
                    aria-controls="recruiter-jobs-panel"
                    onClick={() => selectScope(scope)}
                    className={cn(
                      "inline-flex min-h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30",
                      selected
                        ? "bg-white text-brand-primary shadow-sm"
                        : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]",
                    )}
                  >
                    <ScopeIcon className="size-3.5" aria-hidden="true" />
                    <span>{scope === "my" ? t("recruiter.ops.dashboard.scopeMy") : t("recruiter.ops.dashboard.scopeAll")}</span>
                    {count !== null && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                          selected
                            ? "bg-[var(--color-primary-soft)] text-brand-primary"
                            : "bg-slate-200/70 text-[var(--color-on-surface-variant)]",
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-1">
              <span className="grid size-7 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-brand-primary">
                <UserCheck className="size-3.5" aria-hidden="true" />
              </span>
              <h2 className="text-xs font-semibold text-[var(--color-on-surface)]">
                {t("recruiter.ops.dashboard.scopeMy")}
              </h2>
              {formatScopeCount("my") !== null && (
                <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-bold tabular-nums text-brand-primary">
                  {formatScopeCount("my")}
                </span>
              )}
            </div>
          )}
          <p className="px-1 text-[11px] text-[var(--color-on-surface-variant)]">
            {activeScope === "all"
              ? t("recruiter.ops.dashboard.scopeAllDesc")
              : t("recruiter.ops.dashboard.scopeMyDesc")}
          </p>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-white p-2">
          <label className="relative min-w-[180px] flex-1"><span className="sr-only">{t("recruiter.ops.dashboard.searchJobsSr")}</span><Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-outline)]" aria-hidden="true" /><input data-search-input data-job-list-search value={jobSearch} onChange={(event) => { setJobSearch(event.target.value); resetPages(); }} placeholder={t("recruiter.ops.dashboard.searchJobsPlaceholder")} className="min-h-9 w-full rounded-lg bg-[var(--color-surface-alt)] pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-brand-primary/20" /></label>
          <RecruiterFilterDropdown
            label={t("recruiter.ops.dashboard.statusDropdownLabel")}
            value={statusFilter}
            options={statusFilterOptions}
            onChange={(val) => {
              setStatusFilter(val);
              resetPages({ clearStatus: true });
            }}
            icon={Activity}
          />
          {!departmentsQuery.isError && (
            <RecruiterFilterDropdown
              label={t("recruiter.ops.dashboard.departmentDropdownLabel")}
              value={departmentFilter}
              options={departmentOptions}
              disabled={departmentsQuery.isPending}
              onChange={(val) => {
                setDepartmentFilter(val);
                resetPages();
              }}
              icon={Building2}
              align="right"
            />
          )}
          {departmentsQuery.isError && <button type="button" onClick={() => void departmentsQuery.refetch()} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] bg-white px-2.5 text-xs font-medium text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-alt)]"><RefreshCw className="size-3.5" aria-hidden="true" />{t("recruiter.ops.dashboard.retryDepartmentsBtn")}</button>}
          {expiringOnly && <button type="button" onClick={() => resetPages({ clearStatus: true })} aria-label={t("recruiter.ops.dashboard.clearExpiringAria")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">{t("recruiter.ops.dashboard.expiringChip")}<X className="size-3.5" aria-hidden="true" /></button>}
          <span className="px-2 text-[10px] font-medium text-[var(--color-on-surface-variant)]">{t("recruiter.ops.dashboard.resultsCount", { count: formatNumber(totalItems, {}, locale) })}</span>
        </div>
        {summaryQuery.isError && <div className="mb-3"><InlineDataError message={t("recruiter.ops.dashboard.summaryUnavailable")} onRetry={() => void summaryQuery.refetch()} /></div>}
        <div
          id="recruiter-jobs-panel"
          role={canViewAll ? "tabpanel" : undefined}
          aria-labelledby={canViewAll ? `recruiter-jobs-tab-${activeScope}` : undefined}
        >
          {(isLoadingUser || (jobsQuery.isPending && !jobsQuery.data) || isOutOfRangePage) ? <JobFeedSkeleton /> : jobsQuery.isError ? <InlineDataError message={getApiErrorMessage(jobsQuery.error, t("recruiter.ops.dashboard.jobsLoadError"))} onRetry={() => void jobsQuery.refetch()} /> : visibleJobs.length > 0 ? <><JobTable jobs={visibleJobs} refreshing={isPaginating} /><div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border-default)] bg-white p-2.5"><label className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)]">{t("recruiter.ops.dashboard.showLabel")}<select aria-label={t("recruiter.ops.dashboard.jobsPerPageAria")} value={pageSize} onChange={(event) => goToPage(0, Number(event.target.value))} className="min-h-9 rounded-lg border border-[var(--color-border-default)] bg-white px-2 font-medium text-[var(--color-on-surface)] outline-none focus:ring-2 focus:ring-brand-primary/20">{JOB_PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}</select>{t("recruiter.ops.dashboard.jobsPerPageUnit")}</label><nav className="flex items-center gap-1" aria-label={t("recruiter.ops.dashboard.paginationAria")}><button type="button" aria-label={t("recruiter.ops.dashboard.prevPageAria")} disabled={safePage === 0} onClick={() => goToPage(safePage - 1)} className="grid size-9 place-items-center rounded-lg border border-[var(--color-border-default)] transition-colors hover:bg-[var(--color-surface-alt)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="size-4" aria-hidden="true" /></button>{pageItems.map((item) => typeof item !== "number" ? <span key={item} aria-hidden="true" className="grid size-9 place-items-center text-xs text-[var(--color-outline)]">…</span> : <button key={item} type="button" aria-label={t("recruiter.ops.dashboard.pageNumAria", { page: item })} aria-current={item - 1 === safePage ? "page" : undefined} onClick={() => goToPage(item - 1)} className={cn("size-9 rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30", item - 1 === safePage ? "bg-brand-primary text-white" : "border border-[var(--color-border-default)] hover:bg-[var(--color-surface-alt)]")}>{item}</button>)}<button type="button" aria-label={t("recruiter.ops.dashboard.nextPageAria")} disabled={safePage + 1 >= totalJobPages} onClick={() => goToPage(safePage + 1)} className="grid size-9 place-items-center rounded-lg border border-[var(--color-border-default)] transition-colors hover:bg-[var(--color-surface-alt)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="size-4" aria-hidden="true" /></button></nav><div className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)] tabular-nums">{isPaginating && <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-primary" role="status"><Loader2 className="size-3.5 animate-spin" aria-hidden="true" />{t("recruiter.ops.common.loading")}</span>}<p>{t("recruiter.ops.dashboard.showingRangePrefix")} <strong className="font-semibold text-[var(--color-on-surface)]">{formatNumber(from, {}, locale)}–{formatNumber(to, {}, locale)}</strong> {t("recruiter.ops.dashboard.showingRangeTotal", { total: formatNumber(totalItems, {}, locale) })} · {t("recruiter.ops.dashboard.pageOfTotal", { page: formatNumber(safePage + 1, {}, locale), total: formatNumber(totalJobPages, {}, locale) })}</p></div></div></> : <div className="rounded-2xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-6 py-12 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-brand-primary"><Search className="size-6" aria-hidden="true" /></span><h2 className="mt-4 text-lg font-semibold">{hasActiveFilters ? t("recruiter.ops.dashboard.emptyJobsTitle") : activeScope === "my" ? t("recruiter.ops.dashboard.emptyMyJobsTitle") : t("recruiter.ops.dashboard.emptyAllJobsTitle")}</h2><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{hasActiveFilters ? t("recruiter.ops.dashboard.emptyJobsHint") : activeScope === "my" ? t("recruiter.ops.dashboard.emptyMyJobsHint") : t("recruiter.ops.dashboard.emptyAllJobsHint")}</p>{!hasActiveFilters && ((activeScope === "my" && canViewAll) || canCreateJob) && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{activeScope === "my" && canViewAll && <button type="button" onClick={() => selectScope("all")} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[var(--color-border-default)] bg-white px-3.5 text-xs font-semibold text-[var(--color-on-surface)] transition-colors hover:border-brand-primary/40 hover:bg-[var(--color-primary-soft)] hover:text-brand-primary">{t("recruiter.ops.dashboard.viewAllJobsBtn")}<ArrowRight className="size-3.5" aria-hidden="true" /></button>}{canCreateJob && <Link to="/recruiter/jobs/new" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-brand-primary px-3.5 text-xs font-semibold text-white transition-colors hover:bg-brand-primary-hover"><Plus className="size-3.5" aria-hidden="true" />{t("recruiter.ops.dashboard.createJobFullBtn")}</Link>}</div>}</div>}
        </div>
      </div>
      <TaskDrawer open={taskDrawer === "applicants"} title={t("recruiter.ops.dashboard.drawerApplicantsTitle")} description={t("recruiter.ops.dashboard.drawerApplicantsDesc")} icon={Users} groups={applicantGroups} loading={newApplicantsQuery.isPending} error={newApplicantsQuery.error} emptyTitle={t("recruiter.ops.dashboard.drawerApplicantsEmptyTitle")} emptyDescription={t("recruiter.ops.dashboard.drawerApplicantsEmptyDesc")} onClose={() => setTaskDrawer(null)} onRetry={() => void newApplicantsQuery.refetch()} />
      <TaskDrawer open={taskDrawer === "cvs"} title={t("recruiter.ops.dashboard.drawerCvsTitle")} description={t("recruiter.ops.dashboard.drawerCvsDesc")} icon={FileSearch} groups={cvGroups} loading={taskJobsQuery.isPending || cvTaskQueries.some((query) => query.isPending)} error={taskJobsQuery.error ?? cvTaskQueries.find((query) => query.error)?.error} emptyTitle={t("recruiter.ops.dashboard.drawerCvsEmptyTitle")} emptyDescription={t("recruiter.ops.dashboard.drawerCvsEmptyDesc")} onClose={() => setTaskDrawer(null)} onRetry={() => { void taskJobsQuery.refetch(); cvTaskQueries.forEach((query) => void query.refetch()); }} />
      <TaskDrawer open={taskDrawer === "schedules"} title={t("recruiter.ops.dashboard.drawerSchedulesTitle")} description={t("recruiter.ops.dashboard.drawerSchedulesDesc")} icon={CalendarDays} groups={scheduleGroups} loading={taskJobsQuery.isPending} error={taskJobsQuery.error} emptyTitle={t("recruiter.ops.dashboard.drawerSchedulesEmptyTitle")} emptyDescription={t("recruiter.ops.dashboard.drawerSchedulesEmptyDesc")} onClose={() => setTaskDrawer(null)} onRetry={() => void taskJobsQuery.refetch()} />
    </section>
  );
}
