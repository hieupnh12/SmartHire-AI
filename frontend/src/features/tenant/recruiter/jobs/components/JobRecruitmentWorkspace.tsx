import { createContext, useContext, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { jobApi } from "@/api/tenant/jobApi";
import type { JobDetail } from "@/api/types/job";

import { LoadingState, Skeleton, TableSkeleton } from "@/components/ux/Skeleton";

const JobContext = createContext<JobDetail | null>(null);

export function useRecruitmentJob() {
  const job = useContext(JobContext);
  if (!job) throw new Error("Recruitment page requires a job workspace");
  return job;
}

export function JobRecruitmentWorkspace({ children }: { children: ReactNode }) {
  const { id, assessmentId } = useParams();
  const location = useLocation();
  // Assessment and Interview module pages use the shared Breadcrumb instead of the job title link.
  const hideJobTitle = /\/jobs\/\d+\/(assessments|interviews)(?:\/|$)/.test(location.pathname);
  const valid = Number.isSafeInteger(Number(id)) && Number(id) > 0;
  const job = useQuery({
    queryKey: ["jobs", "detail", id],
    queryFn: () => jobApi.get(id!),
    enabled: valid,
  });

  if (!valid || job.isError) return (
    <div role="alert" className="space-y-3">
      <p>Không thể mở vị trí tuyển dụng này.</p>
      <Link to="/recruiter" className="text-[var(--color-primary)]">Về danh sách việc làm</Link>
      {valid && <button type="button" onClick={() => void job.refetch()} className="ml-4 text-[var(--color-primary)]">Thử lại</button>}
    </div>
  );
  if (!job.data) {
    return (
      <LoadingState label="Đang tải dữ liệu vị trí tuyển dụng" className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-72 max-w-full" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <TableSkeleton columns={6} rows={6} />
      </LoadingState>
    );
  }

  return (
    <JobContext.Provider value={job.data.data}>
      <div key={`${id}:${assessmentId ?? ""}`} className={hideJobTitle ? "space-y-3" : "space-y-5"}>
        {!hideJobTitle && (
          <Link to={`/recruiter/jobs/${id}`} className="inline-flex text-sm font-semibold text-[var(--color-primary)]">
            {job.data.data.title}
          </Link>
        )}
        {children}
      </div>
    </JobContext.Provider>
  );
}
