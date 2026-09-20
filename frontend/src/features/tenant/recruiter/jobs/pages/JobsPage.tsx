import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { jobApi } from "@/api/tenant/jobApi";
import type { JobStatus } from "@/api/types/job";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { button, input, muted, panel } from "@/features/tenant/recruiter/matching/components/rankingUi";

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
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | JobStatus>("");
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
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={muted}>Tuyển dụng / Việc làm</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Quản lý tin tuyển dụng</h1>
          <p className={`mt-2 max-w-2xl ${muted}`}>Tạo nháp, chọn skill theo catalog, publish để nhận CV và chấm matching.</p>
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
        <select className={`${input} max-w-xs`} value={status} onChange={(e) => { setStatus(e.target.value as "" | JobStatus); setPage(0); }}>
          {statuses.map((item) => <option key={item.value || "all"} value={item.value}>{item.label}</option>)}
        </select>
      </div>
      {list.isError && <p role="alert">{getApiErrorMessage(list.error)}</p>}
      <div className={`${panel} overflow-x-auto`}>
        {list.isPending && <p>Đang tải job…</p>}
        {data && data.items.length === 0 && (
          <div className="flex flex-col items-start gap-4 py-6">
            <p className={muted}>Chưa có job. Tạo tin mới rồi chọn skill Backend/Frontend để matching CV.</p>
            <Link
              to="new"
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-brand-primary px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover"
            >
              Tạo job mới
            </Link>
          </div>
        )}
        {data && data.items.length > 0 && (
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
              {data.items.map((job) => (
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
