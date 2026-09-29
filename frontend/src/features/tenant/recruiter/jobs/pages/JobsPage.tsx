import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Copy,
  FilePen,
  Layers3,
  MapPin,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { dashboardApi } from "@/api/tenant/dashboardApi";
import { jobApi } from "@/api/tenant/jobApi";
import type { JobListItem, JobStatus } from "@/api/types/job";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/stores/toastStore";
import { LoadingState, TableSkeleton } from "@/components/ux/Skeleton";

const PAGE_SIZE = 10;
const STATUS_TABS: { value: "" | JobStatus; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "PUBLISHED", label: "Đang tuyển" },
  { value: "DRAFT", label: "Bản nháp" },
  { value: "PAUSED", label: "Tạm dừng" },
  { value: "CLOSED", label: "Đã đóng" },
];
const STATUS_LABEL: Record<JobStatus, string> = { DRAFT: "Bản nháp", PUBLISHED: "Đang tuyển", PAUSED: "Tạm dừng", CLOSED: "Đã đóng", ARCHIVED: "Lưu trữ" };
const STATUS_STYLE: Record<JobStatus, string> = {
  DRAFT: "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]",
  PUBLISHED: "bg-[var(--color-primary-soft)] text-brand-primary",
  PAUSED: "bg-amber-50 text-amber-700",
  CLOSED: "bg-slate-100 text-slate-600",
  ARCHIVED: "bg-slate-100 text-slate-500",
};
const EMPLOYMENT_LABEL: Record<string, string> = { FULL_TIME: "Toàn thời gian", PART_TIME: "Bán thời gian", CONTRACT: "Hợp đồng", INTERNSHIP: "Thực tập" };
const WORK_MODE_LABEL: Record<string, string> = { ONSITE: "Tại văn phòng", HYBRID: "Hybrid", REMOTE: "Từ xa" };
const iconButton = "grid size-9 place-items-center rounded-lg text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-primary-soft)] hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary";

export function JobsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const navigate = useNavigate();
  const client = useQueryClient();
  const askConfirm = useUiStore((s) => s.askConfirm);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | JobStatus>("");
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(0);
  const list = useQuery({
    queryKey: queryKeys.jobs.list({ q, status, department, page }),
    queryFn: () => jobApi.search({ q: q.trim() || undefined, status: status || undefined, department: department || undefined, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    enabled: !!token,
  });
  const summary = useQuery({ queryKey: ["recruiter-dashboard", "summary"], queryFn: dashboardApi.summary, enabled: !!token });
  const departments = useQuery({ queryKey: ["jobs", "departments"], queryFn: jobApi.departments, enabled: !!token });
  const remove = useMutation({
    mutationFn: (id: number) => jobApi.remove(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.jobs.all });
      void client.invalidateQueries({ queryKey: ["recruiter-dashboard"] });
      toast.success("Đã lưu trữ tin tuyển dụng");
    },
  });
  const clone = useMutation({
    mutationFn: (id: number) => jobApi.clone(id),
    onSuccess: (response) => navigate(`/recruiter/jobs/${response.data.id}/edit`),
  });

  const data = list.data?.data;
  const rows = data?.items ?? [];
  const stats = summary.data?.data;
  const metric = (value?: number | null) => (summary.isPending || summary.isError || value == null ? "—" : value);
  const from = data && data.total > 0 ? data.page * data.size + 1 : 0;
  const to = data ? Math.min((data.page + 1) * data.size, data.total) : 0;
  const filtered = Boolean(q.trim() || status || department);
  const resetPage = () => setPage(0);

  const confirmRemove = (job: JobListItem) =>
    askConfirm({
      title: "Lưu trữ tin tuyển dụng?",
      description: `“${job.title}” sẽ bị ẩn khỏi danh sách (soft delete). Hồ sơ ứng viên vẫn được giữ lại.`,
      danger: true,
      confirmLabel: "Lưu trữ",
      onConfirm: async () => {
        await remove.mutateAsync(job.id);
      },
    });

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 text-[var(--color-on-surface)]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-[var(--color-on-surface-variant)]">Tuyển dụng / Việc làm</p>
          <div className="flex items-center gap-2">
            <div className="h-7 w-2.5 rounded-full bg-[var(--color-primary)]" />
            <h1 className="text-[30px] font-semibold leading-[38px] tracking-tight">Quản lý tin tuyển dụng</h1>
          </div>
          <p className="max-w-2xl pl-4 text-sm leading-[22px] text-[var(--color-on-surface-variant)]">
            Tạo, đăng và theo dõi các vị trí đang tuyển. Mở từng tin để xem ứng viên, sàng lọc CV và pipeline.
          </p>
        </div>
        <Link
          to="new"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          <Plus className="size-4" aria-hidden="true" />
          Tạo tin tuyển dụng
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label="Tổng tin tuyển dụng" value={metric(stats?.totalJobs)} hint="Không tính tin đã lưu trữ" icon={Layers3} />
        <KpiCard label="Đang tuyển" value={metric(stats?.openJobs ?? stats?.activeJobs)} hint={`${metric(stats?.pausedJobs)} tin tạm dừng`} icon={BriefcaseBusiness} />
        <KpiCard label="Bản nháp" value={metric(stats?.draftJobs)} hint="Chờ hoàn thiện để đăng" icon={FilePen} tone="amber" />
        <KpiCard label="Tổng ứng viên" value={metric(stats?.totalApplications)} hint="Trên tất cả vị trí" icon={Users} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-3 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Tìm tin tuyển dụng</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); resetPage(); }}
            placeholder="Tìm theo tên vị trí, địa điểm, phòng ban"
            className="min-h-10 w-full rounded-xl bg-[var(--color-surface-alt)] pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-1 rounded-xl bg-[var(--color-surface-alt)] p-1">
            {STATUS_TABS.map((tab) => {
              const active = status === tab.value;
              return (
                <button
                  key={tab.value || "all"}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => { setStatus(tab.value); resetPage(); }}
                  className={cn(
                    "min-h-8 rounded-lg px-3 text-xs font-semibold transition-colors",
                    active ? "bg-white text-brand-primary shadow-sm" : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          {!departments.isError && (
            <select
              aria-label="Lọc phòng ban"
              value={department}
              disabled={departments.isPending}
              onChange={(e) => { setDepartment(e.target.value); resetPage(); }}
              className="min-h-10 rounded-xl border border-[var(--color-border-default)] bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-brand-primary/20 disabled:opacity-50"
            >
              <option value="">{departments.isPending ? "Đang tải phòng ban…" : "Tất cả phòng ban"}</option>
              {(departments.data?.data ?? []).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          )}
        </div>
      </div>

      {list.isError && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-800">
          <AlertCircle className="size-4 shrink-0 text-red-600" aria-hidden="true" />
          <p className="flex-1 text-sm">{getApiErrorMessage(list.error, "Chưa tải được danh sách tin tuyển dụng.")}</p>
          <button type="button" onClick={() => void list.refetch()} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-100">
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Thử lại
          </button>
        </div>
      )}
      {(remove.isError || clone.isError) && (
        <p role="alert" className="rounded-xl bg-[var(--color-error-container)] p-3 text-sm text-[var(--color-on-error-container)]">
          {getApiErrorMessage(remove.error ?? clone.error)}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-sm">
        {list.isPending && !data && (
          <div className="p-6"><LoadingState label="Đang tải danh sách việc làm"><TableSkeleton /></LoadingState></div>
        )}

        {data && rows.length === 0 && (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-brand-primary">
              {filtered ? <Search className="size-6" aria-hidden="true" /> : <BriefcaseBusiness className="size-6" aria-hidden="true" />}
            </span>
            <h2 className="mt-4 text-lg font-semibold">{filtered ? "Không tìm thấy tin phù hợp" : "Chưa có tin tuyển dụng nào"}</h2>
            <p className="mt-1 max-w-md text-sm text-[var(--color-on-surface-variant)]">
              {filtered ? "Thử đổi từ khóa, trạng thái hoặc phòng ban." : "Tạo tin đầu tiên, chọn kỹ năng yêu cầu rồi đăng tuyển để bắt đầu nhận CV."}
            </p>
            {!filtered && (
              <Link to="new" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover">
                <Plus className="size-4" aria-hidden="true" />
                Tạo tin tuyển dụng
              </Link>
            )}
          </div>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className={cn("w-full min-w-[980px] text-left text-sm", list.isFetching && "opacity-70 transition-opacity")}>
              <thead>
                <tr className="h-11 bg-[var(--color-surface-container-low)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  <th scope="col" className="px-5">Tin tuyển dụng</th>
                  <th scope="col" className="px-4">Trạng thái</th>
                  <th scope="col" className="px-4">Địa điểm</th>
                  <th scope="col" className="px-4">Ứng viên</th>
                  <th scope="col" className="px-4">Hạn nhận hồ sơ</th>
                  <th scope="col" className="px-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-default)]">
                {rows.map((job) => (
                  <JobRow key={job.id} job={job} onClone={() => clone.mutate(job.id)} onRemove={() => confirmRemove(job)} cloning={clone.isPending} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-default)] px-5 py-3">
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              Hiển thị <strong className="font-semibold text-[var(--color-on-surface)]">{from}–{to}</strong> trên <strong className="font-semibold text-[var(--color-on-surface)]">{data.total}</strong> tin
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[var(--color-border-default)] px-3 text-xs font-semibold transition-colors hover:bg-[var(--color-primary-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                Trước
              </button>
              <span className="text-xs tabular-nums text-[var(--color-on-surface-variant)]">
                Trang {page + 1}/{Math.max(1, Math.ceil(data.total / data.size))}
              </span>
              <button
                type="button"
                disabled={(page + 1) * data.size >= data.total}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[var(--color-border-default)] px-3 text-xs font-semibold transition-colors hover:bg-[var(--color-primary-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sau
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function JobRow({ job, onClone, onRemove, cloning }: { job: JobListItem; onClone: () => void; onRemove: () => void; cloning: boolean }) {
  const auto = job.screeningMode === "AUTO";
  const applications = job.applicationCount ?? 0;
  const headcount = job.headcount ?? 1;
  return (
    <tr className="group transition-colors hover:bg-[var(--color-primary-subtle)]/60">
      <td className="px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary">
            <BriefcaseBusiness className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <Link to={`/recruiter/jobs/${job.id}`} className="block font-semibold leading-5 text-[var(--color-on-surface)] transition-colors hover:text-brand-primary">
              {job.title}
            </Link>
            <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">
              <span className="text-[var(--color-outline)]">#{String(job.id).padStart(4, "0")}</span>
              {" · "}{job.department || "Chưa phân phòng ban"}
              {" · "}{EMPLOYMENT_LABEL[job.employmentType ?? ""] ?? job.employmentType ?? "—"}
            </p>
            <span className={cn("mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", auto ? "bg-violet-50 text-violet-700" : "bg-sky-50 text-sky-700")}>
              {auto ? <Bot className="size-3" aria-hidden="true" /> : <UserCheck className="size-3" aria-hidden="true" />}
              {auto ? "Lọc CV tự động" : "Lọc CV thủ công"}
            </span>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLE[job.status])}>
          <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
          {STATUS_LABEL[job.status] ?? job.status}
        </span>
      </td>
      <td className="max-w-[240px] px-4 py-4">
        <p className="flex items-start gap-1.5 text-sm">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-[var(--color-outline)]" aria-hidden="true" />
          <span className="line-clamp-2">{job.location || "Chưa có địa điểm"}</span>
        </p>
        {job.workMode && <p className="mt-0.5 pl-5 text-xs text-[var(--color-on-surface-variant)]">{WORK_MODE_LABEL[job.workMode] ?? job.workMode}</p>}
      </td>
      <td className="px-4 py-4">
        <p className="text-base font-semibold tabular-nums">{applications}<span className="ml-1 text-xs font-normal text-[var(--color-on-surface-variant)]">CV</span></p>
        <p className="text-xs text-[var(--color-on-surface-variant)]">Cần tuyển {headcount}</p>
      </td>
      <td className="px-4 py-4">
        <Deadline value={job.deadline} status={job.status} />
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-1">
          <Link to={`/recruiter/jobs/${job.id}/edit`} aria-label={`Sửa ${job.title}`} title="Sửa tin" className={iconButton}>
            <PencilLine className="size-4" aria-hidden="true" />
          </Link>
          <Link to={`/recruiter/jobs/${job.id}/applicants`} aria-label={`Ứng viên của ${job.title}`} title="Ứng viên" className={iconButton}>
            <Users className="size-4" aria-hidden="true" />
          </Link>
          <button type="button" onClick={onClone} disabled={cloning} aria-label={`Nhân bản ${job.title}`} title="Nhân bản" className={cn(iconButton, "disabled:opacity-50")}>
            <Copy className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Lưu trữ ${job.title}`}
            title="Lưu trữ"
            className={cn(iconButton, "hover:bg-red-50 hover:text-red-600")}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
          <Link
            to={`/recruiter/jobs/${job.id}`}
            className="ml-1 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-brand-primary px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            Mở
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </td>
    </tr>
  );
}

function Deadline({ value, status }: { value?: string | null; status: JobStatus }) {
  if (!value) return <span className="text-xs text-[var(--color-on-surface-variant)]">Không giới hạn</span>;
  const date = new Date(value);
  const remaining = date.getTime() - Date.now();
  const days = Math.ceil(remaining / 86_400_000);
  const open = status === "PUBLISHED" || status === "PAUSED";
  const note = !open
    ? null
    : remaining <= 0
      ? "Đã hết hạn, đang đóng tin"
      : remaining < 86_400_000
        ? `Còn ${Math.ceil(remaining / 3_600_000)} giờ`
        : `Còn ${days} ngày`;
  const urgent = open && days <= 7;
  return (
    <div>
      <p className="flex items-center gap-1.5 whitespace-nowrap text-sm">
        <CalendarClock className="size-3.5 shrink-0 text-[var(--color-outline)]" aria-hidden="true" />
        {date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
      </p>
      {note && <p className={cn("mt-0.5 pl-5 text-xs font-medium", urgent ? "text-amber-700" : "text-[var(--color-on-surface-variant)]")}>{note}</p>}
    </div>
  );
}

function KpiCard({ label, value, hint, icon: Icon, tone = "primary" }: {
  label: string;
  value: number | string;
  hint: string;
  icon: LucideIcon;
  tone?: "primary" | "amber";
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-brand-primary hover:shadow-md motion-reduce:transition-none">
      <span className="absolute inset-x-0 top-0 h-0.5 bg-brand-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none" aria-hidden="true" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-on-surface-variant)]">{label}</span>
        <span className={cn(
          "grid size-8 place-items-center rounded-lg transition-colors duration-200 group-hover:bg-brand-primary group-hover:text-white motion-reduce:transition-none",
          tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-[var(--color-primary-soft)] text-brand-primary",
        )}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">{hint}</p>
    </div>
  );
}
