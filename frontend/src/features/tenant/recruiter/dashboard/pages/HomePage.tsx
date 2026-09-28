import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertCircle, ArrowRight, BarChart3, Bot, BriefcaseBusiness, Building2, CalendarDays, CheckCircle2, CircleDot, Clock3, FileSearch, Gauge, Layers3, MapPin, MoreVertical, PauseCircle, PencilLine, Plus, RefreshCw, Search, Share2, Sparkles, Target, TrendingUp, UserCheck, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { dashboardApi } from "@/api/tenant/dashboardApi";
import { jobApi } from "@/api/tenant/jobApi";
import type { JobListItem, JobStatus } from "@/api/types/job";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { hasRecruiterFeature } from "@/features/tenant/recruiter/permissions";
import { getApiErrorMessage } from "@/lib/axios";
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

function JobCard({ job }: { job: JobListItem }) {
  const interestTarget = Math.max(job.headcount * 12, 1);
  const progress = Math.min(100, Math.round((job.applicationCount / interestTarget) * 100));
  const interestMilestones = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(interestTarget * ratio));
  const isAutomaticScreening = job.screeningMode === "AUTO";
  const screenedRate = job.funnel && job.applicationCount > 0 ? Math.round((job.funnel.screened / job.applicationCount) * 1000) / 10 : null;
  const recruitmentStart = job.publishedAt ? formatDate(job.publishedAt) : "Chưa bắt đầu";
  const recruitmentEnd = job.deadline ? formatDate(job.deadline) : "Không giới hạn";
  const shareJob = async () => {
    const url = `${window.location.origin}/career?jobId=${job.id}`;
    if (navigator.share) await navigator.share({ title: job.title, url });
    else await navigator.clipboard.writeText(url);
  };
  return (
    <article
      tabIndex={0}
      data-job-card
      data-job-workspace-path={`/recruiter/jobs/${job.id}`}
      aria-label={`${job.title}. Nhấn Enter để vào workspace`}
      className="group relative overflow-hidden rounded-2xl border border-[var(--color-outline)]/45 bg-white p-4 pl-5 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.55)] outline-none transition-[border-color,background-color,box-shadow,transform] duration-200 focus-visible:border-brand-primary focus-visible:bg-[var(--color-primary-subtle)] focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brand-primary/35 focus-visible:shadow-[0_18px_40px_-16px_var(--color-primary-shadow)] motion-reduce:transition-none hover:-translate-y-0.5 hover:border-brand-primary/70 hover:shadow-[0_18px_36px_-20px_var(--color-primary-shadow)] motion-reduce:hover:transform-none"
    >
      <span className={cn("absolute inset-y-0 left-0 w-1 transition-[width] duration-150 group-focus-visible:w-2 group-focus-visible:bg-brand-primary motion-reduce:transition-none", job.status === "PAUSED" ? "bg-amber-500" : job.status === "DRAFT" ? "bg-slate-400" : "bg-brand-primary")} aria-hidden="true" />
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary"><BriefcaseBusiness className="size-5" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-alt)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-on-surface-variant)]"><Building2 className="size-3" aria-hidden="true" />{job.department || "Chưa phân phòng ban"}</span>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold", isAutomaticScreening ? "bg-violet-50 text-violet-700" : "bg-sky-50 text-sky-700")}>{isAutomaticScreening ? <Bot className="size-3" aria-hidden="true" /> : <UserCheck className="size-3" aria-hidden="true" />}{isAutomaticScreening ? "Lọc CV tự động" : "Lọc CV thủ công"}</span>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", statusStyle[job.status])}><span className="size-1.5 rounded-full bg-current" aria-hidden="true" />{statusLabel[job.status]}</span>
            <span className="text-xs text-[var(--color-outline)]">#{String(job.id).padStart(4, "0")}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2"><Link to={`/recruiter/jobs/${job.id}`} className="block w-fit text-lg font-semibold tracking-[-0.01em] text-[var(--color-on-surface)] transition-colors group-hover:text-brand-primary">{job.title}</Link></div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[var(--color-on-surface-variant)]">
            <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden="true" />{job.location || job.workMode || "Linh hoạt"}</span>
            <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" aria-hidden="true" /><span>Bắt đầu:</span><strong className="font-medium text-[var(--color-on-surface)]">{recruitmentStart}</strong></span>
            <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" aria-hidden="true" /><span>Kết thúc:</span><strong className="font-medium text-[var(--color-on-surface)]">{recruitmentEnd}</strong></span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link to={`/recruiter/jobs/${job.id}/edit`} aria-label={`Sửa ${job.title}`} title="Sửa job" className="grid size-9 place-items-center rounded-lg text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-primary-soft)] hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"><PencilLine className="size-4" aria-hidden="true" /></Link>
          <button type="button" onClick={() => void shareJob()} aria-label={`Chia sẻ ${job.title}`} title="Chia sẻ job" className="grid size-9 place-items-center rounded-lg text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-primary-soft)] hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"><Share2 className="size-4" aria-hidden="true" /></button>
          <Link to={`/recruiter/jobs/${job.id}`} aria-label={`Tùy chọn ${job.title}`} title="Xem chi tiết" className="grid size-9 place-items-center rounded-lg text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-primary-soft)] hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"><MoreVertical className="size-4" aria-hidden="true" /></Link>
          <Link to={`/recruiter/jobs/${job.id}`} className="ml-1 inline-flex min-h-9 items-center gap-2 rounded-lg bg-brand-primary px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"><span className="hidden 2xl:inline">Vào workspace</span><span className="2xl:hidden">Mở</span><ArrowRight className="size-3.5" aria-hidden="true" /></Link>
        </div>
      </div>
      <div className={cn("mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs", isAutomaticScreening ? "bg-violet-50/70 text-violet-800" : "bg-sky-50/70 text-sky-800")}>
        {isAutomaticScreening ? <Bot className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <UserCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
        <div><strong className="font-semibold">{isAutomaticScreening ? "Quy trình tự động" : "Quy trình có kiểm soát"}</strong><p className="mt-0.5 leading-5 opacity-80">{isAutomaticScreening ? `Hệ thống bắt đầu lọc CV sau khi hết hạn tuyển${job.deadline ? ` (${formatDate(job.deadline)})` : ""}.` : "Recruiter chủ động cho phép lọc và xác nhận ứng viên trước khi chuyển sang giai đoạn tiếp theo."}</p></div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 2xl:grid-cols-6">
        <div className="rounded-lg bg-[var(--color-surface-alt)] p-2.5"><p className="truncate text-[10px] font-medium uppercase tracking-wide text-[var(--color-outline)]">Tổng hồ sơ</p><p className="mt-1 text-lg font-semibold">{job.applicationCount}<span className="ml-1 text-[10px] font-normal text-[var(--color-on-surface-variant)]">CV</span></p></div>
        <div className="rounded-lg bg-[var(--color-primary-soft)] p-2.5"><p className="truncate text-[10px] font-medium uppercase tracking-wide text-brand-primary">AI đã lọc</p><p className="mt-1 text-lg font-semibold">{job.funnel?.screened ?? "—"}{screenedRate != null && <span className="ml-1 text-[10px] font-medium text-brand-primary">({screenedRate}%)</span>}</p></div>
        <div className="rounded-lg bg-[var(--color-surface-alt)] p-2.5"><p className="truncate text-[10px] font-medium uppercase tracking-wide text-[var(--color-outline)]">Đã chọn</p><p className="mt-1 text-lg font-semibold">{job.funnel?.shortlisted ?? "—"}</p></div>
        <div className="rounded-lg bg-[var(--color-surface-alt)] p-2.5"><p className="truncate text-[10px] font-medium uppercase tracking-wide text-[var(--color-outline)]">Đang kiểm tra</p><p className="mt-1 text-lg font-semibold">{job.funnel?.testing ?? "—"}</p></div>
        <div className="rounded-lg bg-[var(--color-surface-alt)] p-2.5"><p className="truncate text-[10px] font-medium uppercase tracking-wide text-[var(--color-outline)]">Phỏng vấn</p><p className="mt-1 text-lg font-semibold">{job.funnel?.interviewing ?? "—"}</p></div>
        <div className="rounded-lg bg-[var(--color-surface-container)] p-2.5"><p className="truncate text-[10px] font-medium uppercase tracking-wide text-[var(--color-outline)]">Đã tuyển / Chỉ tiêu</p><p className="mt-1 text-lg font-semibold text-brand-primary">{job.funnel?.filled ?? "—"}<span className="ml-1 text-[10px] font-normal text-[var(--color-on-surface-variant)]">/ {job.headcount}</span></p></div>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-[var(--color-on-surface-variant)]"><span>Mức độ quan tâm</span><strong className="text-brand-primary">{job.applicationCount} / {interestTarget} hồ sơ mục tiêu · {progress}%</strong></div>
        <div className="relative mt-2 h-3 text-[9px] font-medium tabular-nums text-[var(--color-outline)]">{interestMilestones.map((milestone, index) => <span key={`${job.id}-${milestone}-${index}`} className={cn("absolute top-0", index === 0 ? "translate-x-0" : index === interestMilestones.length - 1 ? "-translate-x-full" : "-translate-x-1/2")} style={{ left: `${index * 25}%` }}>{index === interestMilestones.length - 1 ? `${milestone}+` : milestone}</span>)}</div>
        <div className="relative mt-1 h-2 rounded-full bg-[var(--color-surface-container)]"><div className="absolute inset-y-0 left-0 rounded-full bg-brand-primary transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${progress}%` }} />{interestMilestones.map((milestone, index) => <span key={`marker-${job.id}-${milestone}-${index}`} className={cn("absolute top-1/2 size-2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-primary", index === 0 ? "translate-x-0" : index === interestMilestones.length - 1 ? "-translate-x-full" : "-translate-x-1/2")} style={{ left: `${index * 25}%` }} />)}</div>
      </div>
    </article>
  );
}

function JobFeedSkeleton() {
  return (
    <LoadingState label="Đang tải danh sách vị trí" className="space-y-3">
      <div className="space-y-5">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="relative overflow-hidden rounded-2xl border border-[var(--color-outline)]/45 bg-white p-4 pl-5 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.55)]">
            <span className="absolute inset-y-0 left-0 w-1 bg-[var(--color-surface-container-high)]" aria-hidden="true" />
            <div className="flex items-start gap-3">
              <Skeleton className="size-10 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1"><div className="flex gap-2"><Skeleton className="h-6 w-24 rounded-full" /><Skeleton className="h-6 w-32 rounded-full" /><Skeleton className="h-6 w-24 rounded-full" /></div><Skeleton className="mt-3 h-6 w-64 max-w-full" /><Skeleton className="mt-2 h-3 w-48 max-w-full" /></div>
              <Skeleton className="hidden h-9 w-32 rounded-lg sm:block" />
            </div>
            <div className="mt-3 rounded-xl bg-[var(--color-surface-alt)] p-3"><Skeleton className="h-3 w-32" /><Skeleton className="mt-2 h-3 w-3/4" /></div>
            <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 2xl:grid-cols-6">{Array.from({ length: 6 }, (_, item) => <div key={item} className="rounded-lg bg-[var(--color-surface-alt)] p-2.5"><Skeleton className="h-3 w-16" /><Skeleton className="mt-2 h-6 w-10" /></div>)}</div>
            <div className="mt-4 flex justify-between"><Skeleton className="h-3 w-28" /><Skeleton className="h-3 w-40" /></div>
            <Skeleton className="mt-4 h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </LoadingState>
  );
}

function InlineDataError({ message, onRetry, compact = false }: { message: string; onRetry: () => void; compact?: boolean }) {
  return <div role="alert" className={cn("flex gap-2 rounded-xl border border-red-200 bg-red-50 text-red-800", compact ? "m-3 flex-col items-stretch p-2.5" : "items-center p-3")}><div className="flex min-w-0 items-start gap-2"><AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden="true" /><p className="min-w-0 flex-1 text-xs leading-5">{message}</p></div><button type="button" onClick={onRetry} className={cn("inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-white px-2.5 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300", compact && "w-full")}><RefreshCw className="size-3.5" aria-hidden="true" />Thử lại</button></div>;
}

export function HomePage() {
  const [jobSearch, setJobSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | JobStatus>("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const token = useAuthStore((state) => state.accessToken);
  const permissions = useAuthStore((state) => state.user?.permissions);
  const jobsQuery = useQuery({
    queryKey: ["recruiter-dashboard", "jobs", jobSearch, statusFilter, departmentFilter],
    queryFn: () => jobApi.search({
      q: jobSearch.trim() || undefined,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      department: departmentFilter === "ALL" ? undefined : departmentFilter,
      page: 0,
      size: 50,
    }),
    placeholderData: keepPreviousData,
    enabled: !!token,
  });
  const summaryQuery = useQuery({ queryKey: ["recruiter-dashboard", "summary"], queryFn: dashboardApi.summary, enabled: !!token });
  const actionItemsQuery = useQuery({ queryKey: ["recruiter-dashboard", "action-items"], queryFn: dashboardApi.actionItems, enabled: !!token });
  const departmentsQuery = useQuery({ queryKey: ["jobs", "departments"], queryFn: jobApi.departments, enabled: !!token });
  const jobs = jobsQuery.data?.data.items ?? [];
  const summary = summaryQuery.data?.data;
  const actionItems = actionItemsQuery.data?.data;
  const activeJobs = summary?.activeJobs ?? 0;
  const pausedJobs = summary?.pausedJobs ?? 0;
  const draftJobs = actionItems?.draftJobs ?? summary?.draftJobs ?? 0;
  const jobsNearDeadline = actionItems?.jobsNearDeadline ?? summary?.jobsNearDeadline ?? 0;
  const totalApplications = summary?.totalApplications ?? 0;
  const applications = actionItems?.newApplicants ?? summary?.newApplicants ?? 0;
  const pendingCvScreening = actionItems?.pendingCvScreening ?? summary?.pendingCvScreening ?? 0;
  const totalJobs = summary?.totalJobs ?? 0;
  const activeRate = totalJobs > 0 ? Math.round((activeJobs / totalJobs) * 100) : 0;
  const averageApplications = summary?.averageApplicationsPerOpenJob ?? 0;
  const departments = departmentsQuery.data?.data ?? [];
  const visibleJobs = jobs;
  const summaryUnavailable = summaryQuery.isPending || summaryQuery.isError;
  const actionItemsUnavailable = actionItemsQuery.isPending || actionItemsQuery.isError;
  const metric = (value: number | string) => summaryUnavailable ? "—" : value;
  const actionMetric = (value: number) => actionItemsUnavailable ? "—" : value;

  return (
    <section className="grid min-h-[calc(100vh-4rem)] items-stretch xl:grid-cols-[220px_minmax(0,1fr)_292px] 2xl:grid-cols-[228px_minmax(0,1fr)_308px]">
      <aside className="h-full border-b border-[var(--color-border-default)] bg-[var(--color-surface-card)] xl:sticky xl:top-16 xl:h-[calc(100dvh-4rem)] xl:self-start xl:border-b-0 xl:border-r" aria-label="Việc cần xử lý">
        <div className="grid h-full grid-rows-[auto_minmax(0,1.15fr)_minmax(0,0.85fr)_auto] overflow-hidden">
          <div className="border-b border-[var(--color-border-default)] p-3.5"><div className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-brand-primary"><Clock3 className="size-4" aria-hidden="true" /></span><div><h2 className="text-sm font-semibold">Việc cần xử lý</h2><p className="mt-0.5 text-[11px] text-[var(--color-on-surface-variant)]">Tổng hợp mọi vị trí</p></div></div></div>
          <div className="grid min-h-0 auto-rows-fr divide-y divide-[var(--color-border-default)]">
            {actionItemsQuery.isError ? <InlineDataError compact message="Chưa tải được danh sách việc cần xử lý." onRetry={() => void actionItemsQuery.refetch()} /> : <>
            {hasRecruiterFeature(permissions, "APPLICANTS") && <Link to="/recruiter/applicants" className="flex h-full min-h-11 items-center gap-2.5 px-3 transition-colors hover:bg-[var(--color-primary-subtle)]"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-brand-primary"><Users className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">Ứng viên mới</span><span className="block truncate text-[11px] text-[var(--color-on-surface-variant)]">Chờ xem xét hồ sơ</span></span><strong className="text-sm text-brand-primary">{actionMetric(applications)}</strong></Link>}
            {hasRecruiterFeature(permissions, "CV_SCREENING") && <Link to="/recruiter/cvs" className="flex h-full min-h-11 items-center gap-2.5 px-3 transition-colors hover:bg-[var(--color-primary-subtle)]"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-surface-alt)] text-[var(--color-on-surface-variant)]"><FileSearch className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">CV cần sàng lọc</span><span className="block truncate text-[11px] text-[var(--color-on-surface-variant)]">Trong hàng chờ mới</span></span><strong className="text-sm">{actionMetric(pendingCvScreening)}</strong></Link>}
            {hasRecruiterFeature(permissions, "SCHEDULES") && <Link to="/recruiter/schedules" className="flex h-full min-h-11 items-center gap-2.5 px-3 transition-colors hover:bg-[var(--color-primary-subtle)]"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-surface-alt)] text-[var(--color-on-surface-variant)]"><CalendarDays className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">Lịch phỏng vấn</span><span className="block truncate text-[11px] text-[var(--color-on-surface-variant)]">Đã lên lịch</span></span><strong className="text-sm">{actionMetric(actionItems?.upcomingInterviews ?? 0)}</strong></Link>}
            {hasRecruiterFeature(permissions, "JOBS") && <Link to="/recruiter/jobs" className="flex h-full min-h-11 items-center gap-2.5 px-3 transition-colors hover:bg-[var(--color-primary-subtle)]"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700"><AlertCircle className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold">Cần chú ý</span><span className="block truncate text-[11px] text-[var(--color-on-surface-variant)]">{draftJobs} nháp · {jobsNearDeadline} sắp hết hạn</span></span><strong className="text-sm">{draftJobs + jobsNearDeadline}</strong></Link>}
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
              {hasRecruiterFeature(permissions, "JOBS") && <Link to="/recruiter/jobs/new" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-2 text-xs font-semibold text-white transition-colors hover:bg-brand-primary-hover"><Plus className="size-3.5" aria-hidden="true" />Tạo tin</Link>}
              {hasRecruiterFeature(permissions, "SCHEDULES") && <Link to="/recruiter/schedules" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border-default)] px-2 text-xs font-semibold transition-colors hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary"><CalendarDays className="size-3.5" aria-hidden="true" />Xem lịch</Link>}
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 px-4 py-4 sm:px-5">
        <div className="mb-3 grid grid-cols-2 gap-2 2xl:grid-cols-4">
          <div className="group relative overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white p-3 shadow-sm transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none hover:border-brand-primary hover:shadow-md"><span className="absolute inset-x-0 top-0 h-0.5 bg-brand-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none" aria-hidden="true" /><div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-on-surface-variant)]">Vị trí hoạt động</span><span className="grid size-7 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-brand-primary transition-colors duration-200 group-hover:bg-brand-primary group-hover:text-white motion-reduce:transition-none"><Layers3 className="size-3.5" aria-hidden="true" /></span></div><p className="mt-2 text-xl font-semibold transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none">{metric(activeJobs)}</p><p className="mt-0.5 text-[10px] text-[var(--color-on-surface-variant)]">{metric(totalJobs)} vị trí trong danh mục</p></div>
          <div className="group relative overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white p-3 shadow-sm transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none hover:border-brand-primary hover:shadow-md"><span className="absolute inset-x-0 top-0 h-0.5 bg-brand-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none" aria-hidden="true" /><div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-on-surface-variant)]">Tốc độ tiếp nhận</span><span className="grid size-7 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-brand-primary transition-colors duration-200 group-hover:bg-brand-primary group-hover:text-white motion-reduce:transition-none"><Gauge className="size-3.5" aria-hidden="true" /></span></div><p className="mt-2 text-xl font-semibold transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none">{metric(averageApplications)}<span className="ml-1 text-[10px] font-normal text-[var(--color-on-surface-variant)]">CV / job</span></p><p className="mt-0.5 text-[10px] text-[var(--color-on-surface-variant)]">Trung bình job đang tuyển</p></div>
          <div className="group relative overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white p-3 shadow-sm transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none hover:border-brand-primary hover:shadow-md"><span className="absolute inset-x-0 top-0 h-0.5 bg-brand-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none" aria-hidden="true" /><div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-on-surface-variant)]">Tổng ứng viên</span><span className="grid size-7 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-brand-primary transition-colors duration-200 group-hover:bg-brand-primary group-hover:text-white motion-reduce:transition-none"><Users className="size-3.5" aria-hidden="true" /></span></div><p className="mt-2 text-xl font-semibold transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none">{metric(totalApplications)}</p><p className="mt-0.5 text-[10px] text-[var(--color-on-surface-variant)]">Trên tất cả vị trí thật</p></div>
          <div className="group relative overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white p-3 shadow-sm transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none hover:border-brand-primary hover:shadow-md"><span className="absolute inset-x-0 top-0 h-0.5 bg-brand-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none" aria-hidden="true" /><div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-on-surface-variant)]">Chuyển đổi tuyển dụng</span><span className="grid size-7 place-items-center rounded-lg bg-amber-50 text-amber-700 transition-colors duration-200 group-hover:bg-brand-primary group-hover:text-white motion-reduce:transition-none"><TrendingUp className="size-3.5" aria-hidden="true" /></span></div><p className="mt-2 text-xl font-semibold transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none">{summaryUnavailable ? "—" : summary?.hireRate != null ? `${summary.hireRate}%` : "—"}</p><p className="mt-0.5 text-[10px] text-[var(--color-on-surface-variant)]">Từ ứng tuyển đến tuyển dụng</p></div>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-white p-2">
          <label className="relative min-w-[180px] flex-1"><span className="sr-only">Tìm kiếm job</span><Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-outline)]" aria-hidden="true" /><input data-search-input data-job-list-search value={jobSearch} onChange={(event) => setJobSearch(event.target.value)} placeholder="Tìm theo tên hoặc phòng ban" className="min-h-9 w-full rounded-lg bg-[var(--color-surface-alt)] pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-brand-primary/20" /></label>
          <select aria-label="Lọc trạng thái" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "ALL" | JobStatus)} className="min-h-9 rounded-lg border border-[var(--color-border-default)] bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-brand-primary/20"><option value="ALL">Tất cả trạng thái</option><option value="PUBLISHED">Đang tuyển</option><option value="DRAFT">Bản nháp</option><option value="PAUSED">Tạm dừng</option><option value="CLOSED">Đã đóng</option></select>
          {!departmentsQuery.isError && <select aria-label="Lọc phòng ban" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} disabled={departmentsQuery.isPending} className="min-h-9 rounded-lg border border-[var(--color-border-default)] bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-brand-primary/20 disabled:opacity-50"><option value="ALL">{departmentsQuery.isPending ? "Đang tải phòng ban…" : "Tất cả phòng ban"}</option>{departments.map((department) => <option key={department} value={department}>{department}</option>)}</select>}
          {departmentsQuery.isError && <button type="button" onClick={() => void departmentsQuery.refetch()} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] bg-white px-2.5 text-xs font-medium text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-alt)]"><RefreshCw className="size-3.5" aria-hidden="true" />Tải bộ lọc phòng ban</button>}
          <span className="px-2 text-[10px] font-medium text-[var(--color-on-surface-variant)]">{visibleJobs.length} kết quả</span>
        </div>
        {summaryQuery.isError && <div className="mb-3"><InlineDataError message="Các chỉ số tổng quan đang tạm thời chưa khả dụng." onRetry={() => void summaryQuery.refetch()} /></div>}
        {jobsQuery.isPending && !jobsQuery.data ? <JobFeedSkeleton /> : jobsQuery.isError ? <InlineDataError message={getApiErrorMessage(jobsQuery.error, "Chưa tải được danh sách vị trí.")} onRetry={() => void jobsQuery.refetch()} /> : visibleJobs.length > 0 ? <div className="space-y-5">{visibleJobs.map((job) => <JobCard key={job.id} job={job} />)}</div> : <div className="rounded-2xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-6 py-12 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-brand-primary"><Search className="size-6" aria-hidden="true" /></span><h2 className="mt-4 text-lg font-semibold">Không tìm thấy vị trí phù hợp</h2><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Thử thay đổi từ khóa hoặc bộ lọc.</p></div>}
      </div>

      <aside className="h-full border-t border-[var(--color-border-default)] bg-[var(--color-surface-card)] xl:sticky xl:top-16 xl:h-[calc(100dvh-4rem)] xl:self-start xl:border-l xl:border-t-0" aria-label="Phân tích tuyển dụng của tôi">
        <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.15fr)_auto] overflow-hidden">
          <div className="border-b border-[var(--color-border-default)] p-3.5"><div className="flex items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-brand-primary"><Sparkles className="size-4" aria-hidden="true" /></span><div className="min-w-0"><h2 className="truncate text-sm font-semibold">Phân tích tuyển dụng của tôi</h2><p className="mt-0.5 truncate text-[11px] text-[var(--color-on-surface-variant)]">Tổng hợp toàn bộ vị trí</p></div></div></div>
          {summaryQuery.isError ? <InlineDataError compact message="Chưa tải được phần phân tích." onRetry={() => void summaryQuery.refetch()} /> : <div className="grid min-h-0 grid-cols-2 grid-rows-2 gap-px bg-[var(--color-border-default)]">
            <div className="flex min-h-0 flex-col justify-center bg-white px-3.5"><p className="text-[11px] text-[var(--color-on-surface-variant)]">Đang tuyển</p><p className="mt-0.5 text-xl font-semibold text-brand-primary">{summary?.openJobs ?? activeJobs}</p></div>
            <div className="flex min-h-0 flex-col justify-center bg-white px-3.5"><p className="text-[11px] text-[var(--color-on-surface-variant)]">Ứng viên mới</p><p className="mt-0.5 text-xl font-semibold">{actionMetric(applications)}</p></div>
            <div className="flex min-h-0 flex-col justify-center bg-white px-3.5"><p className="text-[11px] text-[var(--color-on-surface-variant)]">Lịch phỏng vấn</p><p className="mt-0.5 text-xl font-semibold">{metric(summary?.interviewsScheduled ?? 0)}</p></div>
            <div className="flex min-h-0 flex-col justify-center bg-white px-3.5"><p className="text-[11px] text-[var(--color-on-surface-variant)]">Tỷ lệ tuyển</p><p className="mt-0.5 text-xl font-semibold">{summary?.hireRate != null ? `${summary.hireRate}%` : "—"}</p></div>
          </div>}
          <div className="grid min-h-0 grid-rows-[auto_1fr_auto] border-b border-[var(--color-border-default)] p-3"><h3 className="text-xs font-semibold">Tình trạng danh mục</h3><div className="grid min-h-0 grid-rows-3 text-xs"><div className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-[var(--color-on-surface-variant)]"><CircleDot className="size-3.5 text-brand-primary" aria-hidden="true" />Đang hoạt động</span><strong>{metric(activeJobs)}</strong></div><div className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-[var(--color-on-surface-variant)]"><PauseCircle className="size-3.5 text-amber-600" aria-hidden="true" />Tạm dừng</span><strong>{metric(pausedJobs)}</strong></div><div className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-[var(--color-on-surface-variant)]"><CheckCircle2 className="size-3.5 text-slate-500" aria-hidden="true" />Tổng vị trí</span><strong>{metric(totalJobs)}</strong></div></div><div><div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-container)]"><div className="h-full rounded-full bg-brand-primary" style={{ width: `${summaryUnavailable ? 0 : activeRate}%` }} /></div><div className="mt-1 flex justify-between text-[10px] text-[var(--color-on-surface-variant)]"><span>Job đang hoạt động</span><strong>{summaryUnavailable ? "—" : `${activeRate}%`}</strong></div></div></div>
          <div className="grid min-h-0 grid-rows-[auto_1fr_auto] border-b border-[var(--color-border-default)] p-3">
            <div className="flex items-center gap-2"><BarChart3 className="size-3.5 text-brand-primary" aria-hidden="true" /><h3 className="text-xs font-semibold">Hiệu suất tổng quan</h3></div>
            <div className="mt-2 grid min-h-0 grid-cols-2 gap-2"><div className="flex min-h-0 flex-col justify-center rounded-lg bg-[var(--color-surface-alt)] px-2.5"><p className="text-[10px] leading-4 text-[var(--color-on-surface-variant)]">TB ứng viên / job</p><p className="mt-0.5 text-lg font-semibold">{metric(averageApplications)}</p></div><div className="flex min-h-0 flex-col justify-center rounded-lg bg-[var(--color-surface-alt)] px-2.5"><p className="text-[10px] leading-4 text-[var(--color-on-surface-variant)]">Matching trung bình</p><p className="mt-0.5 text-lg font-semibold">{summaryUnavailable ? "—" : summary?.avgMatchScore != null ? `${summary.avgMatchScore}%` : "—"}</p></div></div>
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-[var(--color-border-default)] px-2.5 py-2"><Zap className="mt-0.5 size-3.5 shrink-0 text-brand-primary" aria-hidden="true" /><p className="text-[10px] leading-4 text-[var(--color-on-surface-variant)]">{actionItemsUnavailable ? "Chưa tải được cảnh báo hạn tuyển." : jobsNearDeadline > 0 ? `${jobsNearDeadline} vị trí sắp hết hạn cần ưu tiên.` : "Không có vị trí nào sắp hết hạn."}</p></div>
          </div>
          <div className="p-3">{hasRecruiterFeature(permissions, "ANALYTICS") && <Link to="/recruiter/analytics" className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border-default)] text-xs font-semibold text-brand-primary transition-colors hover:border-brand-primary/30 hover:bg-[var(--color-primary-soft)]">Xem báo cáo chi tiết <ArrowRight className="size-3.5" aria-hidden="true" /></Link>}</div>
        </div>
      </aside>
    </section>
  );
}
