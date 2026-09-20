import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { applicantApi } from "@/api/tenant/applicantApi";
import { jobApi } from "@/api/tenant/jobApi";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { button, muted, panel } from "@/features/tenant/recruiter/matching/components/rankingUi";

export function BrowseJobsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const jobs = useQuery({ queryKey: ["candidate-public-jobs"], queryFn: () => jobApi.publicList() });
  const mine = useQuery({ queryKey: queryKeys.applicants.mine, queryFn: applicantApi.mine, enabled: !!token });
  const applied = new Set((mine.data?.data ?? []).map((row) => row.jobId));
  const rows = jobs.data?.data ?? [];
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Việc đang tuyển</h1>
        <p className={`mt-2 max-w-2xl ${muted}`}>Danh sách vị trí của công ty. Bấm xem chi tiết để đọc mô tả và yêu cầu trước khi apply.</p>
      </header>
      {jobs.isError && <p role="alert">{getApiErrorMessage(jobs.error)}</p>}
      <div className="grid gap-4">
        {rows.map((job) => (
          <article key={job.id} className={`${panel} flex flex-wrap items-center justify-between gap-3`}>
            <div>
              <h2 className="font-semibold">{job.title}</h2>
              <p className={muted}>{[job.department, job.location, job.workMode].filter(Boolean).join(" · ") || "Chi tiết trong trang công việc"}</p>
              {applied.has(job.id) && <p className="mt-1 text-sm font-semibold text-[var(--color-primary)]">Đã apply</p>}
            </div>
            <Link className={button} to={`/candidate/jobs/${job.id}`}>Xem chi tiết</Link>
          </article>
        ))}
        {jobs.isSuccess && rows.length === 0 && <p className={muted}>Hiện chưa có job đang mở.</p>}
      </div>
    </section>
  );
}
