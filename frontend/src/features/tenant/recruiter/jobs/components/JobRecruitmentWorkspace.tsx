import { createContext, useContext, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { jobApi } from "@/api/tenant/jobApi";
import type { JobDetail } from "@/api/types/job";

const JobContext = createContext<JobDetail | null>(null);

export function useRecruitmentJob() {
  const job = useContext(JobContext);
  if (!job) throw new Error("Recruitment page requires a job workspace");
  return job;
}

export function JobRecruitmentWorkspace({ children }: { children: ReactNode }) {
  const { id, assessmentId } = useParams();
  const valid = Number.isSafeInteger(Number(id)) && Number(id) > 0;
  const job = useQuery({
    queryKey: ["jobs", "detail", id],
    queryFn: () => jobApi.get(id!),
    enabled: valid,
  });

  if (!valid || job.isError) return (
    <div role="alert" className="space-y-3">
      <p>Không thể mở vị trí tuyển dụng này.</p>
      <Link to="/recruiter/jobs" className="text-[var(--color-primary)]">Về danh sách việc làm</Link>
      {valid && <button type="button" onClick={() => void job.refetch()} className="ml-4 text-[var(--color-primary)]">Thử lại</button>}
    </div>
  );
  if (!job.data) return <p role="status">Đang tải vị trí tuyển dụng…</p>;

  return (
    <JobContext.Provider value={job.data.data}>
      <div key={`${id}:${assessmentId ?? ""}`} className="space-y-5">
        <Link to={`/recruiter/jobs/${id}`} className="inline-flex text-sm font-semibold text-[var(--color-primary)]">
          {job.data.data.title}
        </Link>
        {children}
      </div>
    </JobContext.Provider>
  );
}
