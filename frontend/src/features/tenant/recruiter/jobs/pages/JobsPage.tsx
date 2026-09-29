import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { jobApi } from "@/api/tenant/jobApi";
import type { JobStatus } from "@/api/types/job";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { button, input, muted, panel } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { LoadingState, TableSkeleton } from "@/components/ux/Skeleton";

const statuses: { value: "" | JobStatus; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "DRAFT", label: "Nháp" },
  { value: "PUBLISHED", label: "Đang đăng" },
  { value: "PAUSED", label: "Tạm dừng" },
  { value: "CLOSED", label: "Đã đóng" },
];

export function JobsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const navigate = useNavigate();
  const client = useQueryClient();
  const askConfirm = useUiStore((s) => s.askConfirm);
  const [params, setParams] = useSearchParams();
  const requestedStatus = params.get("status")?.toLowerCase();
  const initialStatus: "" | JobStatus = requestedStatus === "draft" ? "DRAFT" : requestedStatus === "expiring" ? "PUBLISHED" : "";
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | JobStatus>(initialStatus);
  const [page, setPage] = useState(0);
  const list = useQuery({
    queryKey: queryKeys.jobs.list({ q, status, page }),
    queryFn: () => jobApi.search({ q: q || undefined, status: status || undefined, page, size: 10 }),
    enabled: !!token,
  });
  const remove = useMutation({
    mutationFn: (id: number) => jobApi.remove(id),
    onSuccess: () => void client.invalidateQueries({ queryKey: queryKeys.jobs.all }),
  });
  const clone = useMutation({
    mutationFn: (id: number) => jobApi.clone(id),
    onSuccess: (response) => navigate(`/recruiter/jobs/${response.data.id}/edit`),
  });
  const data = list.data?.data;
  const expiringOnly = requestedStatus === "expiring";
  const visibleItems = data?.items.filter((job) => {
    if (!expiringOnly || !job.deadline) return !expiringOnly;
    const remaining = new Date(job.deadline).getTime() - Date.now();
    return remaining >= 0 && remaining <= 7 * 24 * 60 * 60 * 1000;
  }) ?? [];
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{expiringOnly ? "Job sắp hết hạn" : status === "DRAFT" ? "Job nháp" : "Việc làm"}</h1>
          {(expiringOnly || status === "DRAFT") && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Bộ lọc: {expiringOnly ? "Hết hạn trong 7 ngày" : "Bản nháp"}</span>}
        </div>
        <Link
          to="new"
          className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-brand-primary px-5 text-base font-semibold text-white shadow-sm hover:bg-brand-primary-hover"
        >
          Tạo job mới
        </Link>
      </header>
      <div className={`${panel} flex flex-wrap gap-3`}>
        <input className={`${input} max-w-sm`} value={q} placeholder="Tìm theo title, location, phòng ban"
          onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        <select className={`${input} max-w-xs`} value={expiringOnly ? "EXPIRING" : status} onChange={(e) => {
          const nextStatus = e.target.value;
          const nextParams = new URLSearchParams(params);
          if (nextStatus === "EXPIRING") nextParams.set("status", "expiring");
          else if (nextStatus) nextParams.set("status", nextStatus.toLowerCase());
          else nextParams.delete("status");
          setParams(nextParams, { replace: true });
          setStatus(nextStatus === "EXPIRING" ? "PUBLISHED" : nextStatus as "" | JobStatus);
          setPage(0);
        }}>
          {statuses.map((item) => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}
          <option value="EXPIRING">Sắp hết hạn</option>
        </select>
      </div>
      {list.isError && <p role="alert">{getApiErrorMessage(list.error)}</p>}
      <div className={`${panel} overflow-x-auto`}>
        {list.isPending && <LoadingState label="Đang tải danh sách việc làm"><TableSkeleton /></LoadingState>}
        {data && visibleItems.length === 0 && (
          <div className="flex flex-col items-start gap-4 py-6">
            <p className={muted}>{expiringOnly ? "Không có job nào sắp hết hạn trong 7 ngày tới." : "Chưa có job phù hợp bộ lọc."}</p>
            <Link
              to="new"
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-brand-primary px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover"
            >
              Tạo job mới
            </Link>
          </div>
        )}
        {data && visibleItems.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className={muted}>
                <th className="py-2">Tin tuyển dụng</th>
                <th>Trạng thái</th>
                <th>Địa điểm</th>
                <th>Ứng viên</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((job) => (
                <tr key={job.id} className="border-t border-[var(--color-border-default)]">
                  <td className="py-3">
                    <Link className="font-semibold hover:underline" to={`/recruiter/jobs/${job.id}`}>{job.title}</Link>
                    <p className={muted}>{job.department || "—"} · {job.employmentType || "—"}</p>
                  </td>
                  <td>{job.status}</td>
                  <td>{job.location || "—"}</td>
                  <td className="font-mono">{job.applicationCount}</td>
                  <td className="space-x-2 whitespace-nowrap">
                    <Link className={button} to={`/recruiter/jobs/${job.id}/edit`}>Sửa</Link>
                    <Link className={button} to={`/recruiter/applicants?jobId=${job.id}`}>Ứng viên</Link>
                    <button className={button} type="button" onClick={() => clone.mutate(job.id)}>Clone</button>
                    <button className={button} type="button" onClick={() => askConfirm({
                      title: "Xóa job?",
                      description: "Job sẽ được lưu trữ (soft delete), không xóa cứng application.",
                      danger: true,
                      confirmLabel: "Xóa",
                      onConfirm: () => remove.mutate(job.id),
                    })}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && data.total > data.size && (
          <div className="mt-4 flex gap-2">
            <button className={button} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Trước</button>
            <button className={button} disabled={(page + 1) * data.size >= data.total} onClick={() => setPage((p) => p + 1)}>Sau</button>
          </div>
        )}
      </div>
    </section>
  );
}
