import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { applicantApi } from "@/api/tenant/applicantApi";
import { jobApi } from "@/api/tenant/jobApi";
import { Button } from "@/components/ux/Button";
import { EmptyState } from "@/components/ux/EmptyState";
import { SkeletonCard } from "@/components/ux/Skeleton";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { button, muted, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";

export function BrowseJobsPage() {
  const [params, setParams] = useSearchParams();
  const keyword = params.get("q") ?? "";
  const [search, setSearch] = useState(keyword);
  const token = useAuthStore((state) => state.accessToken);
  const jobs = useQuery({
    queryKey: ["candidate-public-jobs", keyword],
    queryFn: () => jobApi.publicList(keyword || undefined),
  });
  const mine = useQuery({
    queryKey: queryKeys.applicants.mine,
    queryFn: applicantApi.mine,
    enabled: Boolean(token),
  });
  const applied = new Set((mine.data?.data ?? []).map((row) => row.jobId));
  const rows = jobs.data?.data ?? [];

  useEffect(() => setSearch(keyword), [keyword]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = search.trim();
    setParams(value ? { q: value } : {});
  };

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tìm việc</h1>
        <p className={`mt-2 max-w-2xl ${muted}`}>Tìm vị trí theo chức danh, kỹ năng hoặc từ khóa.</p>
      </header>

      <form className="flex flex-col gap-2 sm:flex-row" role="search" onSubmit={submitSearch}>
        <label className="sr-only" htmlFor="candidate-job-search">Tìm vị trí hoặc kỹ năng</label>
        <input
          id="candidate-job-search"
          name="q"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Vị trí, kỹ năng, từ khóa..."
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-[var(--color-border-default)] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        />
        <Button type="submit">Tìm việc</Button>
      </form>

      {jobs.isError && (
        <div className="flex flex-wrap items-center justify-between gap-3" role="alert">
          <p>{getApiErrorMessage(jobs.error)}</p>
          <Button variant="secondary" onClick={() => void jobs.refetch()}>Thử lại</Button>
        </div>
      )}
      {mine.isError && <p className="text-sm text-[var(--color-on-surface-variant)]" role="status">Không tải được trạng thái ứng tuyển của bạn.</p>}
      {jobs.isPending && <div className="grid gap-3" role="status"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>}

      {jobs.isSuccess && (
        <>
          <p className={muted}>{rows.length} việc làm{keyword ? ` phù hợp với “${keyword}”` : " đang mở"}</p>
          {rows.length === 0 ? (
            <EmptyState
              title="Không tìm thấy việc làm phù hợp"
              description="Thử một từ khóa khác hoặc xóa nội dung tìm kiếm."
              actionLabel="Xóa tìm kiếm"
              onAction={() => {
                setSearch("");
                setParams({});
              }}
            />
          ) : (
            <ul className="space-y-3">
              {rows.map((job) => (
                <li key={job.id}>
                  <article className="flex min-w-0 flex-col justify-between gap-4 rounded-xl border border-[var(--color-border-default)] bg-white p-4 sm:flex-row sm:items-start sm:p-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="min-w-0 break-words text-lg font-semibold">{job.title}</h2>
                        {applied.has(job.id) && <span className="rounded-md bg-[var(--color-primary-subtle)] px-2 py-1 text-xs font-semibold text-brand-primary">Đã ứng tuyển</span>}
                      </div>
                      <p className={`mt-1 ${muted}`}>{[job.department, job.location, job.workMode, job.employmentType].filter(Boolean).join(" · ")}</p>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                        {job.salary && <p><span className={muted}>Mức lương: </span>{job.salary}</p>}
                        {job.deadline && <p><span className={muted}>Hạn nộp: </span>{formatDate(job.deadline)}</p>}
                      </div>
                      {job.skills.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Kỹ năng yêu cầu">
                          {job.skills.slice(0, 5).map((skill) => <li key={skill} className="max-w-full break-words rounded-md bg-[var(--color-surface-alt)] px-2 py-1 text-xs text-[var(--color-on-surface-variant)]">{skill}</li>)}
                          {job.skills.length > 5 && <li className="px-1 py-1 text-xs text-[var(--color-on-surface-variant)]">+{job.skills.length - 5}</li>}
                        </ul>
                      )}
                    </div>
                    <Link className={`${job.acceptingApplications ? primary : button} shrink-0`} to={`/candidate/jobs/${job.id}`}>
                      {job.acceptingApplications ? "Xem việc" : "Xem chi tiết"}
                    </Link>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("vi-VN");
}