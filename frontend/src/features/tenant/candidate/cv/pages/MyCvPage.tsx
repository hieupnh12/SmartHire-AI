import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { cvApi } from "@/api/tenant/cvApi";
import { jobApi } from "@/api/tenant/jobApi";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";

const panel = "rounded-3xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-6";
const input = "w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm";
const button = "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold";
const muted = "text-sm text-[var(--color-on-surface-variant)]";

export function MyCvPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [jobId, setJobId] = useState<number | null>(null);
  const jobs = useQuery({ queryKey: ["published-jobs"], queryFn: jobApi.published, enabled: !!token });
  const mine = useQuery({
    queryKey: queryKeys.cvs.mine,
    queryFn: cvApi.mine,
    enabled: !!token,
    refetchInterval: 5_000,
  });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("jobId", String(jobId));
      return cvApi.upload(form);
    },
    onSuccess: () => void mine.refetch(),
  });
  const remove = useMutation({
    mutationFn: (cvId: number) => cvApi.remove(cvId),
    onSuccess: () => void mine.refetch(),
  });
  const rows = mine.data?.data ?? [];
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">CV của tôi</h1>
        <p className={`mt-2 max-w-2xl ${muted}`}>Chọn job đang tuyển rồi tải PDF hoặc DOCX. Recruiter không nộp CV hộ.</p>
      </header>
      <div className={panel}>
        <label className="block max-w-xl space-y-2">
          <span className="text-sm font-semibold">Job đang tuyển</span>
          <select className={input} value={jobId ?? ""} onChange={(e) => setJobId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Chọn job</option>
            {jobs.data?.data.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
          </select>
        </label>
        <label className={`${button} mt-4 ${!jobId ? "pointer-events-none opacity-50" : ""}`}>
          Tải CV
          <input type="file" className="hidden" disabled={!jobId} accept=".pdf,.docx,application/pdf"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) upload.mutate(file); e.target.value = ""; }} />
        </label>
        {upload.isError && <p role="alert" className="mt-3">{getApiErrorMessage(upload.error)}</p>}
        {remove.isError && <p role="alert" className="mt-3">{getApiErrorMessage(remove.error)}</p>}
        {jobs.isSuccess && jobs.data.data.length === 0 && <p className={`mt-3 ${muted}`}>Hiện chưa có job đang mở.</p>}
      </div>
      <div className={panel}>
        {mine.isPending && <p>Đang tải…</p>}
        {rows.length === 0 && mine.isSuccess && <p className={muted}>Bạn chưa tải CV.</p>}
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-default)] pb-3">
              <div>
                <p className="font-medium">{row.originalFilename}</p>
                <p className={muted}>Job #{row.jobId} · {row.status}{row.errorCode ? ` · ${row.errorCode}` : ""}</p>
              </div>
              <button
                className={button}
                type="button"
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm("Xóa CV này? Không thể hoàn tác.")) remove.mutate(row.id);
                }}
              >
                Xóa
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
