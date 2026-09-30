import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, Bot, CalendarDays, ChevronLeft, ChevronRight, Clock3, FileSearch, Gauge, Layers3, MapPin, Plus, RefreshCw, Search, Target, TrendingUp, UserCheck, Users, X, type LucideIcon } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { dashboardApi } from "@/api/tenant/dashboardApi";
import { applicantApi } from "@/api/tenant/applicantApi";
import { cvApi } from "@/api/tenant/cvApi";
import { jobApi } from "@/api/tenant/jobApi";
import type { JobListItem, JobStatus } from "@/api/types/job";
import type { ApplicationSummary } from "@/api/types/applicant";
import { mockInterviews } from "@/features/tenant/recruiter/schedules/constants/mockInterviews";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { hasRecruiterFeature } from "@/features/tenant/recruiter/permissions";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { LoadingState, Skeleton } from "@/components/ux/Skeleton";

const statusLabel: Record<JobStatus, string> = { DRAFT: "Bản nháp", PUBLISHED: "Đang tuyển", PAUSED: "Tạm dừng", CLOSED: "Đã đóng", ARCHIVED: "Lưu trữ" };
const statusStyle: Record<JobStatus, string> = {
  DRAFT: "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]",
  PUBLISHED: "bg-[var(--color-primary-soft)] text-brand-primary",
  PAUSED: "bg-amber-50 text-amber-700",
  CLOSED: "bg-slate-100 text-slate-600",
  ARCHIVED: "bg-slate-100 text-slate-500",
};

function formatDate(value?: string | null) {
  if (!value) return "Chưa đặt hạn";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function JobFeedSkeleton() {
  return (
    <LoadingState label="Đang tải danh sách vị trí" className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white">
        <Skeleton className="h-11 w-full rounded-none" />
        {Array.from({ length: 5 }, (_, index) => <div key={index} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-t border-[var(--color-border-default)] px-4 py-4"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-24" /><Skeleton className="ml-auto h-9 w-20" /></div>)}
      </div>
    </LoadingState>
  );
}

function JobTable({ jobs }: { jobs: JobListItem[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--color-border-default)] bg-white shadow-[0_12px_30px_-24px_rgba(15,23,42,0.45)]">
      <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-left text-xs">
        <caption className="sr-only">Danh sách vị trí tuyển dụng, trạng thái và tiến độ xử lý ứng viên</caption>
        <thead className="text-[var(--color-on-surface-variant)]">
          <tr>
            <th scope="col" className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-5 py-3.5 font-semibold">Vị trí tuyển dụng</th>
            <th scope="col" className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-4 py-3.5 font-semibold">Trạng thái</th>
            <th scope="col" className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-4 py-3.5 font-semibold">Phòng ban</th>
            <th scope="col" className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-4 py-3.5 font-semibold">Sàng lọc</th>
            <th scope="col" className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-4 py-3.5 text-right font-semibold">Tiến độ ứng viên</th>
            <th scope="col" className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-5 py-3.5 text-right font-semibold"><span className="sr-only">Thao tác</span></th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="group transition-colors hover:bg-[var(--color-primary-subtle)] focus-within:bg-[var(--color-primary-subtle)]">
              <th scope="row" className="border-b border-[var(--color-border-default)] px-5 py-4 font-normal">
                <Link to={`/recruiter/jobs/${job.id}`} className="font-semibold text-[var(--color-on-surface)] underline-offset-4 hover:text-brand-primary hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30">{job.title}</Link>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] font-normal text-[var(--color-outline)]">
                  <span>#{String(job.id).padStart(4, "0")}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="size-3" aria-hidden="true" />{job.location || job.workMode || "Linh hoạt"}</span>
                  <span className="inline-flex items-center gap-1"><CalendarDays className="size-3" aria-hidden="true" />{formatDate(job.deadline)}</span>
                </div>
              </th>
              <td className="border-b border-[var(--color-border-default)] px-4 py-4"><span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold", statusStyle[job.status])}><span className="size-1.5 rounded-full bg-current" aria-hidden="true" />{statusLabel[job.status]}</span></td>
              <td className="border-b border-[var(--color-border-default)] px-4 py-4 text-[var(--color-on-surface-variant)]">
                <span className="block max-w-36 truncate" title={job.department || undefined}>{job.department || "Chưa phân loại"}</span>
                <span className="mt-1 block text-[11px] text-[var(--color-outline)]">{job.employmentType || "Loại hình chưa đặt"}</span>
              </td>
              <td className="border-b border-[var(--color-border-default)] px-4 py-4">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[var(--color-on-surface-variant)]">{job.screeningMode === "AUTO" ? <Bot className="size-4 text-violet-600" aria-hidden="true" /> : <UserCheck className="size-4 text-sky-600" aria-hidden="true" />}{job.screeningMode === "AUTO" ? "Tự động" : "Thủ công"}</span>
              </td>
              <td className="border-b border-[var(--color-border-default)] px-4 py-4">
                <div className="ml-auto w-40">
                  <div className="flex items-center justify-between font-medium tabular-nums"><span>{job.applicationCount} hồ sơ</span><span>{job.funnel?.filled ?? 0}/{job.headcount} tuyển</span></div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-container)]" aria-hidden="true"><div className="h-full rounded-full bg-brand-primary" style={{ width: `${Math.min(100, ((job.funnel?.filled ?? 0) / Math.max(job.headcount ?? 1, 1)) * 100)}%` }} /></div>
                </div>
              </td>
              <td className="border-b border-[var(--color-border-default)] px-5 py-4 text-right">
                <Link to={`/recruiter/jobs/${job.id}`} aria-label={`Mở workspace ${job.title}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] bg-white px-3 font-semibold text-[var(--color-on-surface)] transition-colors hover:border-brand-primary/40 hover:bg-[var(--color-primary-soft)] hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30">Mở<ArrowRight className="size-3.5" aria-hidden="true" /></Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InlineDataError({ message, onRetry, compact = false }: { message: string; onRetry: () => void; compact?: boolean }) {
  return <div role="alert" className={cn("flex gap-2 rounded-xl border border-red-200 bg-red-50 text-red-800", compact ? "m-3 flex-col items-stretch p-2.5" : "items-center p-3")}><div className="flex min-w-0 items-start gap-2"><AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden="true" /><p className="min-w-0 flex-1 text-xs leading-5">{message}</p></div><button type="button" onClick={onRetry} className={cn("inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-white px-2.5 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300", compact && "w-full")}><RefreshCw className="size-3.5" aria-hidden="true" />Thử lại</button></div>;
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
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/30 backdrop-blur-[2px]" role="presentation" onMouseDown={onClose}>
      <aside role="dialog" aria-modal="true" aria-labelledby="task-drawer-title" onMouseDown={(event) => event.stopPropagation()} className="absolute inset-y-0 right-0 flex w-[min(520px,100vw)] flex-col bg-white shadow-2xl">
        <header className="flex items-start gap-3 border-b border-[var(--color-border-default)] px-5 py-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary"><Icon className="size-5" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1"><h2 id="task-drawer-title" className="text-lg font-semibold">{title}</h2><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{description}</p></div>
          <button type="button" onClick={onClose} aria-label={`Đóng ${title}`} className="grid size-10 shrink-0 place-items-center rounded-xl hover:bg-[var(--color-surface-alt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"><X className="size-5" aria-hidden="true" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading && <LoadingState label={`Đang tải ${title.toLocaleLowerCase()}`}><div className="space-y-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-28 w-full" />)}</div></LoadingState>}
          {Boolean(error) && <InlineDataError message={getApiErrorMessage(error, `Chưa tải được ${title.toLocaleLowerCase()}.`)} onRetry={onRetry} />}
          {!loading && !error && groups.length === 0 && <div className="rounded-2xl border border-dashed border-[var(--color-border-default)] px-6 py-12 text-center"><UserCheck className="mx-auto size-8 text-emerald-600" aria-hidden="true" /><h3 className="mt-3 font-semibold">{emptyTitle}</h3><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{emptyDescription}</p></div>}
          <div className="space-y-3">
            {groups.map((group) => (
              <section key={group.jobId} className="overflow-hidden rounded-2xl border border-[var(--color-border-default)]">
                <Link to={group.to} onClick={onClose} className="flex min-h-14 items-center gap-3 bg-[var(--color-surface-alt)] px-4 transition-colors hover:bg-[var(--color-primary-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/30">
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{group.title}</span><span className="mt-0.5 block text-xs text-[var(--color-on-surface-variant)]">Mở workspace của vị trí</span></span>
                  <strong className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs text-brand-primary">{group.items.length} việc</strong><ArrowRight className="size-4 text-brand-primary" aria-hidden="true" />
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

export function HomePage() {
  const [dashboardParams] = useSearchParams();
  const requestedTask = dashboardParams.get("task");
  const [taskDrawer, setTaskDrawer] = useState<"applicants" | "cvs" | "schedules" | null>(requestedTask === "applicants" || requestedTask === "cvs" || requestedTask === "schedules" ? requestedTask : null);
  const [jobSearch, setJobSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | JobStatus>("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const token = useAuthStore((state) => state.accessToken);
  const permissions = useAuthStore((state) => state.user?.permissions);
  const jobsQuery = useQuery({
    queryKey: ["recruiter-dashboard", "jobs", jobSearch, statusFilter, departmentFilter, page, pageSize],
    queryFn: () => jobApi.search({
      q: jobSearch.trim() || undefined,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      department: departmentFilter === "ALL" ? undefined : departmentFilter,
      page,
      size: pageSize,
    }),
    placeholderData: keepPreviousData,
    enabled: !!token,
  });
  const summaryQuery = useQuery({ queryKey: ["recruiter-dashboard", "summary"], queryFn: dashboardApi.summary, enabled: !!token });
  const actionItemsQuery = useQuery({ queryKey: ["recruiter-dashboard", "action-items"], queryFn: dashboardApi.actionItems, enabled: !!token });
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
  });
  const taskJobsQuery = useQuery({ queryKey: ["recruiter-dashboard", "task-jobs"], queryFn: jobApi.options, enabled: !!token && (taskDrawer === "cvs" || taskDrawer === "schedules") });
  const cvTaskQueries = useQueries({
    queries: (taskJobsQuery.data?.data ?? []).map((job) => ({
      queryKey: [...queryKeys.cvs.byJob(job.id), "dashboard-tasks"],
      queryFn: () => cvApi.listByJob(job.id),
      enabled: taskDrawer === "cvs",
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
  const departments = departmentsQuery.data?.data ?? [];
  const visibleJobs = jobs;
  const totalJobPages = jobPage ? Math.ceil(jobPage.total / jobPage.size) : 0;
  const pageNumbers = Array.from({ length: totalJobPages }, (_, index) => index).filter((index) => index === 0 || index === totalJobPages - 1 || Math.abs(index - page) <= 1);
  const summaryUnavailable = summaryQuery.isPending || summaryQuery.isError;
  const actionItemsUnavailable = actionItemsQuery.isPending || actionItemsQuery.isError;
  const metric = (value: number | string) => summaryUnavailable ? "—" : value;
  const actionMetric = (value: number) => actionItemsUnavailable ? "—" : value;
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
    const rows = (cvTaskQueries[index]?.data?.data ?? []).filter((cv) => cv.status === "UPLOADED" || cv.status === "PARSED");
    return rows.length === 0 ? [] : [{ jobId: job.id, title: job.title, to: `/recruiter/jobs/${job.id}/cvs`, items: rows.map((cv) => ({ id: cv.id, title: cv.candidateName, detail: cv.originalFilename, to: `/recruiter/jobs/${job.id}/cvs?cvId=${cv.id}` })) }];
  }).sort((a, b) => b.items.length - a.items.length), [cvTaskQueries, taskJobsQuery.data]);
  const scheduleGroups = useMemo<TaskDrawerGroup[]>(() => (taskJobsQuery.data?.data ?? []).flatMap((job) => {
    const rows = mockInterviews.filter((interview) => interview.jobTitle === job.title && interview.status !== "CANCELLED" && interview.status !== "DONE" && new Date(interview.startsAt).getTime() >= Date.now());
    return rows.length === 0 ? [] : [{ jobId: job.id, title: job.title, to: `/recruiter/jobs/${job.id}/schedules?status=upcoming`, items: rows.map((interview) => ({ id: interview.id, title: interview.candidateName, detail: new Date(interview.startsAt).toLocaleString("vi-VN"), to: `/recruiter/jobs/${job.id}/schedules?status=upcoming&scheduleId=${interview.id}` })) }];
  }).sort((a, b) => b.items.length - a.items.length), [taskJobsQuery.data]);

  return (
    <section className="grid min-h-[calc(100vh-4rem)] items-stretch xl:grid-cols-[220px_minmax(0,1fr)] 2xl:grid-cols-[228px_minmax(0,1fr)]">
      <aside className="h-full border-b border-[var(--color-border-default)] bg-[var(--color-surface-card)] xl:sticky xl:top-16 xl:h-[calc(100dvh-4rem)] xl:self-start xl:border-b-0 xl:border-r" aria-label="Việc cần xử lý">
        <div className="grid h-full grid-rows-[auto_minmax(0,1.15fr)_minmax(0,0.85fr)_auto] overflow-hidden">
          <div className="border-b border-[var(--color-border-default)] p-3.5"><div className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-brand-primary"><Clock3 className="size-4" aria-hidden="true" /></span><div><h2 className="text-sm font-semibold">Việc cần xử lý</h2><p className="mt-0.5 text-[11px] text-[var(--color-on-surface-variant)]">Tổng hợp mọi vị trí</p></div></div></div>
          <div className="grid min-h-0 auto-rows-fr divide-y divide-[var(--color-border-default)]">
            {actionItemsQuery.isError ? <InlineDataError compact message="Chưa tải được danh sách việc cần xử lý." onRetry={() => void actionItemsQuery.refetch()} /> : <>
            {hasRecruiterFeature(permissions, "APPLICANTS") && <button type="button" onClick={() => setTaskDrawer("applicants")} aria-haspopup="dialog" aria-expanded={taskDrawer === "applicants"} className="flex h-full min-h-11 w-full items-center gap-2.5 px-3 text-left transition-colors hover:bg-[var(--color-primary-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/30"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-brand-primary"><Users className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">Ứng viên mới</span><span className="block truncate text-[11px] text-[var(--color-on-surface-variant)]">Xem theo từng vị trí</span></span><strong className="text-sm text-brand-primary">{actionMetric(applications)}</strong></button>}
            {hasRecruiterFeature(permissions, "CV_SCREENING") && <button type="button" onClick={() => setTaskDrawer("cvs")} aria-haspopup="dialog" aria-expanded={taskDrawer === "cvs"} className="flex h-full min-h-11 w-full items-center gap-2.5 px-3 text-left transition-colors hover:bg-[var(--color-primary-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/30"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-surface-alt)] text-[var(--color-on-surface-variant)]"><FileSearch className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">CV cần sàng lọc</span><span className="block truncate text-[11px] text-[var(--color-on-surface-variant)]">Xem theo từng vị trí</span></span><strong className="text-sm">{actionMetric(pendingCvScreening)}</strong></button>}
            {hasRecruiterFeature(permissions, "SCHEDULES") && <button type="button" onClick={() => setTaskDrawer("schedules")} aria-haspopup="dialog" aria-expanded={taskDrawer === "schedules"} className="flex h-full min-h-11 w-full items-center gap-2.5 px-3 text-left transition-colors hover:bg-[var(--color-primary-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/30"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-surface-alt)] text-[var(--color-on-surface-variant)]"><CalendarDays className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">Lịch phỏng vấn</span><span className="block truncate text-[11px] text-[var(--color-on-surface-variant)]">Xem theo từng vị trí</span></span><strong className="text-sm">{actionMetric(actionItems?.upcomingInterviews ?? 0)}</strong></button>}
            {hasRecruiterFeature(permissions, "JOBS") && <div className="flex h-full min-h-11 items-center gap-2.5 px-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700"><AlertCircle className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">Cần chú ý</span><span className="flex gap-1 text-[11px] text-[var(--color-on-surface-variant)]"><Link to="/recruiter/jobs?status=draft" className="rounded underline-offset-2 hover:text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30">{draftJobs} nháp</Link><span aria-hidden="true">·</span><Link to="/recruiter/jobs?status=expiring" className="rounded underline-offset-2 hover:text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30">{jobsNearDeadline} sắp hết hạn</Link></span></span><strong className="text-sm">{draftJobs + jobsNearDeadline}</strong></div>}
            </>}
          </div>
          <div className="grid min-h-0 grid-rows-[auto_1fr] border-t border-[var(--color-border-default)] p-3">
            <div className="flex items-center gap-2"><Target className="size-4 text-brand-primary" aria-hidden="true" /><h3 className="text-sm font-semibold">Ưu tiên hôm nay</h3></div>
            <div className="mt-1 grid min-h-0 grid-rows-3">
              <div className="flex items-center gap-2.5"><span className="size-2 shrink-0 rounded-full bg-brand-primary" /><p className="text-[11px] leading-4 text-[var(--color-on-surface-variant)]">Xem lại <strong className="text-[var(--color-on-surface)]">{actionMetric(applications)} hồ sơ mới</strong> trước khi chuyển vòng.</p></div>
              <div className="flex items-center gap-2.5"><span className="size-2 shrink-0 rounded-full bg-amber-500" /><p className="text-[11px] leading-4 text-[var(--color-on-surface-variant)]"><strong className="text-[var(--color-on-surface)]">{actionMetric(jobsNearDeadline)} vị trí</strong> sẽ hết hạn trong 7 ngày tới.</p></div>
              <div className="flex items-center gap-2.5"><span className="size-2 shrink-0 rounded-full bg-slate-300" /><p className="text-[11px] leading-4 text-[var(--color-on-surface-variant)]">Có <strong className="text-[var(--color-on-surface)]">{actionMetric(draftJobs)} bản nháp</strong> đang chờ hoàn thiện.</p></div>
            </div>
          </div>
          <div className="border-t border-[var(--color-border-default)] p-3">
            <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-outline)]">Thao tác nhanh</p>
            <div className="grid grid-cols-2 gap-2">
              {hasRecruiterFeature(permissions, "JOBS") && <Link to="/recruiter/jobs/new" aria-label="Tạo việc làm — Mở một vị trí mới" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-2 text-xs font-semibold text-white transition-colors hover:bg-brand-primary-hover"><Plus className="size-3.5" aria-hidden="true" />Tạo tin</Link>}
              {hasRecruiterFeature(permissions, "SCHEDULES") && <Link to="/recruiter/schedules" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border-default)] px-2 text-xs font-semibold transition-colors hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary"><CalendarDays className="size-3.5" aria-hidden="true" />Xem lịch</Link>}
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 px-4 py-4 sm:px-5">
        <div className="mb-3 grid grid-cols-2 gap-2 2xl:grid-cols-4">
          <div className="group relative overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white p-3 shadow-sm transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none hover:border-[var(--color-primary)]/45 hover:shadow-md"><span className="absolute inset-x-0 top-0 h-1 bg-[var(--color-primary)]" aria-hidden="true" /><div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-on-surface-variant)]">Vị trí hoạt động</span><span className="grid size-8 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><Layers3 className="size-4" aria-hidden="true" /></span></div><p className="mt-2 text-xl font-semibold">{metric(activeJobs)}</p><p className="mt-0.5 text-[10px] text-[var(--color-on-surface-variant)]">{metric(totalJobs)} vị trí trong danh mục</p></div>
          <div className="group relative overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white p-3 shadow-sm transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none hover:border-[var(--color-secondary)]/45 hover:shadow-md"><span className="absolute inset-x-0 top-0 h-1 bg-[var(--color-secondary)]" aria-hidden="true" /><div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-on-surface-variant)]">Tốc độ tiếp nhận</span><span className="grid size-8 place-items-center rounded-lg bg-[var(--color-secondary-container)] text-[var(--color-secondary)]"><Gauge className="size-4" aria-hidden="true" /></span></div><p className="mt-2 text-xl font-semibold">{metric(averageApplications)}<span className="ml-1 text-[10px] font-normal text-[var(--color-on-surface-variant)]">CV / job</span></p><p className="mt-0.5 text-[10px] text-[var(--color-on-surface-variant)]">Trung bình job đang tuyển</p></div>
          <div className="group relative overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white p-3 shadow-sm transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none hover:border-[var(--color-on-surface)]/35 hover:shadow-md"><span className="absolute inset-x-0 top-0 h-1 bg-[var(--color-on-surface)]" aria-hidden="true" /><div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-on-surface-variant)]">Tổng ứng viên</span><span className="grid size-8 place-items-center rounded-lg bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)]"><Users className="size-4" aria-hidden="true" /></span></div><p className="mt-2 text-xl font-semibold">{metric(totalApplications)}</p><p className="mt-0.5 text-[10px] text-[var(--color-on-surface-variant)]">Trên tất cả vị trí thật</p></div>
          <div className="group relative overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white p-3 shadow-sm transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none hover:border-[var(--color-tertiary)]/45 hover:shadow-md"><span className="absolute inset-x-0 top-0 h-1 bg-[var(--color-tertiary)]" aria-hidden="true" /><div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-on-surface-variant)]">Chuyển đổi tuyển dụng</span><span className="grid size-8 place-items-center rounded-lg bg-amber-50 text-[var(--color-tertiary)]"><TrendingUp className="size-4" aria-hidden="true" /></span></div><p className="mt-2 text-xl font-semibold">{summaryUnavailable ? "—" : summary?.hireRate != null ? `${summary.hireRate}%` : "—"}</p><p className="mt-0.5 text-[10px] text-[var(--color-on-surface-variant)]">Từ ứng tuyển đến tuyển dụng</p></div>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-white p-2">
          <label className="relative min-w-[180px] flex-1"><span className="sr-only">Tìm kiếm job</span><Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-outline)]" aria-hidden="true" /><input data-search-input data-job-list-search value={jobSearch} onChange={(event) => { setJobSearch(event.target.value); setPage(0); }} placeholder="Tìm theo tên hoặc phòng ban" className="min-h-9 w-full rounded-lg bg-[var(--color-surface-alt)] pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-brand-primary/20" /></label>
          <select aria-label="Lọc trạng thái" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as "ALL" | JobStatus); setPage(0); }} className="min-h-9 rounded-lg border border-[var(--color-border-default)] bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-brand-primary/20"><option value="ALL">Tất cả trạng thái</option><option value="PUBLISHED">Đang tuyển</option><option value="DRAFT">Bản nháp</option><option value="PAUSED">Tạm dừng</option><option value="CLOSED">Đã đóng</option></select>
          {!departmentsQuery.isError && <select aria-label="Lọc phòng ban" value={departmentFilter} onChange={(event) => { setDepartmentFilter(event.target.value); setPage(0); }} disabled={departmentsQuery.isPending} className="min-h-9 rounded-lg border border-[var(--color-border-default)] bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-brand-primary/20 disabled:opacity-50"><option value="ALL">{departmentsQuery.isPending ? "Đang tải phòng ban…" : "Tất cả phòng ban"}</option>{departments.map((department) => <option key={department} value={department}>{department}</option>)}</select>}
          {departmentsQuery.isError && <button type="button" onClick={() => void departmentsQuery.refetch()} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] bg-white px-2.5 text-xs font-medium text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-alt)]"><RefreshCw className="size-3.5" aria-hidden="true" />Tải bộ lọc phòng ban</button>}
          <span className="px-2 text-[10px] font-medium text-[var(--color-on-surface-variant)]">{jobPage?.total ?? 0} kết quả</span>
        </div>
        {summaryQuery.isError && <div className="mb-3"><InlineDataError message="Các chỉ số tổng quan đang tạm thời chưa khả dụng." onRetry={() => void summaryQuery.refetch()} /></div>}
        {jobsQuery.isPending && !jobsQuery.data ? <JobFeedSkeleton /> : jobsQuery.isError ? <InlineDataError message={getApiErrorMessage(jobsQuery.error, "Chưa tải được danh sách vị trí.")} onRetry={() => void jobsQuery.refetch()} /> : visibleJobs.length > 0 ? <><JobTable jobs={visibleJobs} /><div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border-default)] bg-white p-2.5"><label className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)]">Hiển thị<select aria-label="Số job mỗi trang" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }} className="min-h-9 rounded-lg border border-[var(--color-border-default)] bg-white px-2 font-medium text-[var(--color-on-surface)] outline-none focus:ring-2 focus:ring-brand-primary/20"><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option></select>job / trang</label><nav className="flex items-center gap-1" aria-label="Phân trang danh sách job"><button type="button" aria-label="Trang trước" disabled={page === 0} onClick={() => setPage((current) => current - 1)} className="grid size-9 place-items-center rounded-lg border border-[var(--color-border-default)] transition-colors hover:bg-[var(--color-surface-alt)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="size-4" aria-hidden="true" /></button>{pageNumbers.map((pageNumber, index) => <span key={pageNumber} className="contents">{index > 0 && pageNumber - pageNumbers[index - 1] > 1 && <span className="grid size-9 place-items-center text-xs text-[var(--color-outline)]">…</span>}<button type="button" aria-label={`Trang ${pageNumber + 1}`} aria-current={pageNumber === page ? "page" : undefined} onClick={() => setPage(pageNumber)} className={cn("size-9 rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30", pageNumber === page ? "bg-brand-primary text-white" : "border border-[var(--color-border-default)] hover:bg-[var(--color-surface-alt)]")}>{pageNumber + 1}</button></span>)}<button type="button" aria-label="Trang sau" disabled={page + 1 >= totalJobPages} onClick={() => setPage((current) => current + 1)} className="grid size-9 place-items-center rounded-lg border border-[var(--color-border-default)] transition-colors hover:bg-[var(--color-surface-alt)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="size-4" aria-hidden="true" /></button></nav><p className="text-xs text-[var(--color-on-surface-variant)]">Trang {page + 1} / {totalJobPages}</p></div></> : <div className="rounded-2xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-6 py-12 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-brand-primary"><Search className="size-6" aria-hidden="true" /></span><h2 className="mt-4 text-lg font-semibold">Không tìm thấy vị trí phù hợp</h2><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Thử thay đổi từ khóa hoặc bộ lọc.</p></div>}
      </div>
      <TaskDrawer open={taskDrawer === "applicants"} title="Ứng viên mới cần xử lý" description="Chọn vị trí để mở bảng quy trình, hoặc chọn ứng viên để mở đúng hồ sơ." icon={Users} groups={applicantGroups} loading={newApplicantsQuery.isPending} error={newApplicantsQuery.error} emptyTitle="Đã xử lý hết hồ sơ mới" emptyDescription="Hiện không có ứng viên nào đang ở trạng thái Mới." onClose={() => setTaskDrawer(null)} onRetry={() => void newApplicantsQuery.refetch()} />
      <TaskDrawer open={taskDrawer === "cvs"} title="CV cần sàng lọc" description="Chọn vị trí để mở hàng chờ CV, hoặc chọn ứng viên để mở đúng CV." icon={FileSearch} groups={cvGroups} loading={taskJobsQuery.isPending || cvTaskQueries.some((query) => query.isPending)} error={taskJobsQuery.error ?? cvTaskQueries.find((query) => query.error)?.error} emptyTitle="Không còn CV chờ sàng lọc" emptyDescription="Hiện không có CV mới cần recruiter xử lý." onClose={() => setTaskDrawer(null)} onRetry={() => { void taskJobsQuery.refetch(); cvTaskQueries.forEach((query) => void query.refetch()); }} />
      <TaskDrawer open={taskDrawer === "schedules"} title="Lịch phỏng vấn sắp tới" description="Chọn vị trí để mở lịch của job, hoặc chọn ứng viên để mở đúng lịch hẹn." icon={CalendarDays} groups={scheduleGroups} loading={taskJobsQuery.isPending} error={taskJobsQuery.error} emptyTitle="Không có lịch phỏng vấn sắp tới" emptyDescription="Các lịch mới sẽ được tổng hợp tại đây theo từng vị trí." onClose={() => setTaskDrawer(null)} onRetry={() => void taskJobsQuery.refetch()} />
    </section>
  );
}
