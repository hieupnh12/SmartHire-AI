import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, Users } from "lucide-react";
import { applicantApi } from "@/api/tenant/applicantApi";
import { jobApi } from "@/api/tenant/jobApi";
import type { ApplicationStatus } from "@/api/types/applicant";
import { Card } from "@/components/ux/Card";
import { Skeleton } from "@/components/ux/Skeleton";
import { getApiErrorMessage } from "@/lib/axios";
import { cn } from "@/lib/utils";

const statusLabel: Record<ApplicationStatus, string> = {
  NEW: "Mới ứng tuyển",
  IN_REVIEW: "Đang sàng lọc",
  ASSESSMENT: "Đánh giá kỹ thuật",
  INTERVIEW: "Phỏng vấn",
  OFFER: "Đề nghị",
  HIRED: "Đã tuyển",
  REJECTED: "Từ chối",
  WITHDRAWN: "Đã rút",
};

const PAGE_SIZE = 20;

export function RecruitmentPage() {
  const [jobId, setJobId] = useState<number | null>(null);
  const [page, setPage] = useState(0);

  const jobs = useQuery({
    queryKey: ["admin", "published-jobs"],
    queryFn: () => jobApi.search({ status: "PUBLISHED", page: 0, size: 50 }),
  });
  const jobItems = jobs.data?.data?.items ?? [];
  const jobTotal = jobs.data?.data?.total ?? jobItems.length;

  const firstJobId = jobItems[0]?.id;

  useEffect(() => {
    if (jobId == null && firstJobId != null) {
      setJobId(firstJobId);
    }
  }, [jobId, firstJobId]);

  const applicants = useQuery({
    queryKey: ["admin", "job-applicants", jobId, page],
    queryFn: () => applicantApi.listByJob(jobId!, { archived: false, page, size: PAGE_SIZE }),
    enabled: jobId != null,
  });

  const selected = jobItems.find((job) => job.id === jobId) ?? null;
  const rows = applicants.data?.data?.items ?? [];
  const total = applicants.data?.data?.total ?? 0;

  return (
    <section className="space-y-5">
      <header>
        <p className="text-sm font-semibold text-brand-primary">Tuyển dụng</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
          Job đã đăng và ứng viên
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-secondary)]">
          Xem các vị trí đang đăng và người đã ứng tuyển vào từng vị trí.
        </p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(16rem,22rem)_1fr]">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-[var(--color-border-default)] px-5 py-4">
            <BriefcaseBusiness className="size-5 text-brand-primary" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">Job đã đăng</h2>
          </div>
          <div className="p-3">
            {jobs.isLoading && <Skeleton className="h-24 w-full" />}
            {jobs.isError && <p className="px-2 py-3 text-sm text-status-danger">{getApiErrorMessage(jobs.error)}</p>}
            {jobs.isSuccess && jobItems.length === 0 && (
              <p className="px-2 py-6 text-sm text-[var(--color-text-secondary)]">Chưa có job đang đăng.</p>
            )}
            {jobTotal > jobItems.length && (
              <p className="px-2 pb-2 text-xs text-[var(--color-text-secondary)]">Hiển thị 50 job đăng mới nhất.</p>
            )}
            <ul className="space-y-1">
              {jobItems.map((job) => {
                const active = job.id === jobId;
                return (
                  <li key={job.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setJobId(job.id);
                        setPage(0);
                      }}
                      className={cn(
                        "w-full rounded-[var(--radius-md)] px-3 py-3 text-left transition-colors",
                        active ? "bg-[var(--color-primary-soft)]" : "hover:bg-surface-muted",
                      )}
                    >
                      <span className="block text-sm font-semibold text-[var(--color-text-primary)]">{job.title}</span>
                      <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">
                        {[job.department, job.location].filter(Boolean).join(" · ") || "Không có địa điểm"}
                        {" · "}
                        {job.applicationCount.toLocaleString("vi-VN")} ứng viên
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-[var(--color-border-default)] px-5 py-4">
            <Users className="size-5 text-brand-primary" aria-hidden="true" />
            <div>
              <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
                {selected ? selected.title : "Ứng viên"}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {selected ? `${total.toLocaleString("vi-VN")} người đã ứng tuyển` : "Chọn một job để xem ứng viên"}
              </p>
            </div>
          </div>
          <div className="p-5">
            {jobId == null && !jobs.isLoading && (
              <p className="text-sm text-[var(--color-text-secondary)]">Chọn một job ở cột bên trái.</p>
            )}
            {applicants.isLoading && <Skeleton className="h-24 w-full" />}
            {applicants.isError && <p className="text-sm text-status-danger">{getApiErrorMessage(applicants.error)}</p>}
            {applicants.isSuccess && rows.length === 0 && (
              <p className="text-sm text-[var(--color-text-secondary)]">Chưa có ai ứng tuyển vào job này.</p>
            )}
            {rows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
                    <tr>
                      <th className="py-2 font-semibold">Ứng viên</th>
                      <th className="px-3 py-2 font-semibold">Trạng thái</th>
                      <th className="px-3 py-2 font-semibold">Nguồn</th>
                      <th className="py-2 text-right font-semibold">Ngày ứng tuyển</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-t border-[var(--color-border-default)]">
                        <td className="py-3">
                          <p className="font-semibold text-[var(--color-text-primary)]">{row.candidateName}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{row.candidateEmail}</p>
                        </td>
                        <td className="px-3 py-3">{statusLabel[row.status] ?? row.status}</td>
                        <td className="px-3 py-3 text-[var(--color-text-secondary)]">{row.source ?? "—"}</td>
                        <td className="py-3 text-right text-[var(--color-text-secondary)]">
                          {new Date(row.createdAt).toLocaleDateString("vi-VN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {total > PAGE_SIZE && (
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((current) => current - 1)}
                  className="min-h-9 rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-3 text-sm font-medium disabled:opacity-50"
                >
                  Trước
                </button>
                <button
                  type="button"
                  disabled={(page + 1) * PAGE_SIZE >= total}
                  onClick={() => setPage((current) => current + 1)}
                  className="min-h-9 rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-3 text-sm font-medium disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}
