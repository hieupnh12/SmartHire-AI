import { useMutation, useQuery } from "@tanstack/react-query";
import { jobApi } from "@/api/tenant/jobApi";
import { applicantApi } from "@/api/tenant/applicantApi";
import { getApiErrorMessage } from "@/lib/axios";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { button, muted, panel, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";

export function BrowseJobsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const jobs = useQuery({ queryKey: ["candidate-jobs"], queryFn: jobApi.published, enabled: !!token });
  const apply = useMutation({
    mutationFn: (jobId: number) => applicantApi.apply(jobId, { source: "PORTAL" }),
  });
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Việc đang tuyển</h1>
        <p className={`mt-2 ${muted}`}>Apply vào job đã publish, sau đó tải CV tại “CV của tôi”.</p>
      </header>
      {jobs.isError && <p role="alert">{getApiErrorMessage(jobs.error)}</p>}
      {apply.isError && <p role="alert">{getApiErrorMessage(apply.error)}</p>}
      {apply.isSuccess && <p>Đã apply. Hãy tải CV để hệ thống chấm matching.</p>}
      <div className="grid gap-4">
        {(jobs.data?.data ?? []).map((job) => (
          <article key={job.id} className={`${panel} flex flex-wrap items-center justify-between gap-3`}>
            <div>
              <h2 className="font-semibold">{job.title}</h2>
              <p className={muted}>{job.status}</p>
            </div>
            <button className={primary} type="button" disabled={apply.isPending} onClick={() => apply.mutate(job.id)}>
              Apply
            </button>
          </article>
        ))}
        {jobs.isSuccess && jobs.data.data.length === 0 && <p className={muted}>Hiện chưa có job đang mở.</p>}
      </div>
    </section>
  );
}
