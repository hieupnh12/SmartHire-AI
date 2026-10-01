import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, Clock3, MapPin, Search } from "lucide-react";
import { applicantApi } from "@/api/tenant/applicantApi";
import { jobApi } from "@/api/tenant/jobApi";
import { EmptyState } from "@/components/ux/EmptyState";
import { LoadingState, SkeletonCard } from "@/components/ux/Skeleton";
import { StatusPill } from "@/components/ux/StatusPill";
import { getDeadlineInfo } from "@/features/tenant/career/utils/jobDeadline";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";

const applicationLabels: Record<string, string> = {
  NEW: "Đã gửi", IN_REVIEW: "Đang xem xét", ASSESSMENT: "Bài đánh giá",
  INTERVIEW: "Phỏng vấn", OFFER: "Đề nghị", HIRED: "Đã tuyển", REJECTED: "Không phù hợp",
};

export function BrowseJobsPage() {
  const token = useAuthStore((state) => state.accessToken);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const jobs = useQuery({ queryKey: ["candidate-public-jobs", query], queryFn: () => jobApi.publicList(query || undefined) });
  const mine = useQuery({ queryKey: queryKeys.applicants.mine, queryFn: applicantApi.mine, enabled: Boolean(token) });
  const applications = new Map((mine.data?.data ?? []).map((application) => [application.jobId, application]));
  const rows = jobs.data?.data ?? [];
  const submitSearch = (event: FormEvent) => { event.preventDefault(); setQuery(searchInput.trim()); };

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]" aria-labelledby="candidate-jobs-title">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">Cơ hội nghề nghiệp</p><h1 id="candidate-jobs-title" className="mt-2 text-3xl font-semibold tracking-tight">Việc đang tuyển</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">So sánh thông tin chính, kiểm tra hạn nộp và theo dõi trạng thái ứng tuyển của bạn.</p></div>
        <form className="flex w-full max-w-lg gap-2" role="search" onSubmit={submitSearch}>
          <label className="relative min-w-0 flex-1"><span className="sr-only">Tìm kiếm việc làm</span><Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-[var(--color-on-surface-variant)]" aria-hidden="true" /><input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Chức danh hoặc kỹ năng" className="min-h-11 w-full rounded-[var(--radius-default)] border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-2 pl-10 pr-3 text-sm" /></label>
          <button type="submit" className="min-h-11 rounded-[var(--radius-default)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]">Tìm</button>
        </form>
      </header>
      {jobs.isError && <p role="alert" className="rounded-[var(--radius-default)] bg-[var(--color-error-container)] p-4 text-sm text-[var(--color-on-error-container)]">{getApiErrorMessage(jobs.error)}</p>}
      {mine.isError && <p role="alert" className="text-sm text-[var(--color-error)]">Không thể tải trạng thái ứng tuyển. Danh sách việc làm vẫn có thể xem bình thường.</p>}
      {jobs.isPending ? <LoadingState className="grid gap-4 md:grid-cols-2" label="Đang tải việc làm">{[0, 1, 2, 3].map((item) => <SkeletonCard key={item} />)}</LoadingState> : rows.length === 0 ? <EmptyState title="Chưa có việc làm phù hợp" description="Thử một từ khóa khác hoặc quay lại sau khi có vị trí mới." /> : (
        <div className="grid gap-4 md:grid-cols-2">{rows.map((job) => {
          const application = applications.get(job.id); const deadline = getDeadlineInfo(job.deadline);
          return <article key={job.id} className="flex min-w-0 flex-col justify-between rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-[var(--shadow-card)]"><div><div className="mb-3 flex flex-wrap items-center gap-2">{job.department && <span className="rounded-full bg-[var(--color-primary-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--color-primary-hover)]">{job.department}</span>}{application && <StatusPill status={application.status} label={applicationLabels[application.status] ?? application.status} />}</div><h2 className="break-words text-lg font-semibold leading-7">{job.title}</h2><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--color-on-surface-variant)]">{(job.location || job.workMode) && <span className="flex items-center gap-1.5"><MapPin className="size-4 shrink-0" aria-hidden="true" />{[job.location, job.workMode].filter(Boolean).join(" · ")}</span>}{job.employmentType && <span className="flex items-center gap-1.5"><BriefcaseBusiness className="size-4 shrink-0" aria-hidden="true" />{job.employmentType}</span>}{deadline && <span className="flex items-center gap-1.5"><Clock3 className="size-4 shrink-0" aria-hidden="true" />Hạn {deadline.dateLabel}{deadline.urgent ? ` · Còn ${deadline.daysRemaining} ngày` : ""}</span>}</div>{job.salary && <p className="mt-3 text-sm font-medium">{job.salary}</p>}{job.skills.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{job.skills.slice(0, 5).map((skill) => <span key={skill} className="rounded-full bg-[var(--color-surface-alt)] px-2 py-1 text-xs text-[var(--color-on-surface-variant)]">{skill}</span>)}{job.skills.length > 5 && <span className="rounded-full bg-[var(--color-surface-alt)] px-2 py-1 text-xs">+{job.skills.length - 5}</span>}</div>}</div><Link className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-default)] bg-[var(--color-primary-subtle)] px-4 text-sm font-medium text-[var(--color-primary-hover)] hover:bg-[var(--color-primary-soft)]" to={`/candidate/jobs/${job.id}`}>Xem chi tiết</Link></article>;
        })}</div>
      )}
    </section>
  );
}
