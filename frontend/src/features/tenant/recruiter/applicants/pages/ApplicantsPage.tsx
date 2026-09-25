import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { applicantApi } from "@/api/tenant/applicantApi";
import { cvApi } from "@/api/tenant/cvApi";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { button, input, labels, muted, panel, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { ApplicationPipeline } from "@/features/tenant/recruiter/matching/components/recruitmentFlow";
import type { ApplicationDetail } from "@/api/types/applicant";

const statuses = ["NEW", "IN_REVIEW", "ASSESSMENT", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];

export function ApplicantsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);
  const validJobId = Number.isInteger(jobId) && jobId > 0;
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [archived, setArchived] = useState(false);
  const [page, setPage] = useState(0);
  const listKey = [...queryKeys.applicants.byJob(validJobId ? jobId : 0), q, status, source, archived, page];
  const list = useQuery({
    queryKey: listKey,
    queryFn: () => applicantApi.listByJob(jobId, { q: q || undefined, status: status || undefined, source: source || undefined, archived, page, size: 20 }),
    enabled: validJobId && !!token,
  });
  const detail = useQuery({
    queryKey: queryKeys.applicants.detail(selectedId ?? 0),
    queryFn: () => applicantApi.get(selectedId!),
    enabled: selectedId !== null,
  });
  const rows = list.data?.data.items ?? [];
  const total = list.data?.data.total ?? 0;
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header>
        <p className={muted}>Tuyển dụng / Ứng viên</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Quản lý ứng viên</h1>
        <p className={`mt-2 max-w-2xl ${muted}`}>Ứng viên đang apply theo job. Sau sàng lọc CV đạt chuẩn sẽ chuyển phỏng vấn AI, rồi technical test. Hồ sơ đã rút đơn không hiện.</p>
      </header>
      <div className={panel}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span>Tìm kiếm</span>
            <input className={input} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Tên, email, tag, referral" />
          </label>
          <label className="space-y-1 text-sm">
            <span>Trạng thái</span>
            <select className={input} value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
              <option value="">Tất cả</option>
              {statuses.map((item) => <option key={item} value={item}>{labels[item] ?? item}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span>Nguồn</span>
            <input className={input} value={source} onChange={(e) => { setSource(e.target.value); setPage(0); }} placeholder="CAREER / MANUAL / REFERRAL" />
          </label>
          <label className="flex items-end gap-2 text-sm">
            <input type="checkbox" checked={archived} onChange={(e) => { setArchived(e.target.checked); setPage(0); }} />
            <span>Hồ sơ đã lưu trữ</span>
          </label>
        </div>
      </div>
      {validJobId && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,32rem)]">
          <div className={`${panel} overflow-x-auto`}>
            {list.isPending && <p>Đang tải…</p>}
            {list.isError && <p role="alert">{getApiErrorMessage(list.error)}</p>}
            {rows.length === 0 && list.isSuccess && <p className={muted}>Chưa có application.</p>}
            {rows.length > 0 && (
              <table className="w-full text-left text-sm">
                <thead><tr className={muted}><th className="py-2">Ứng viên</th><th>Nguồn</th><th>Trạng thái</th><th>Phụ trách</th></tr></thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className={`cursor-pointer border-t border-[var(--color-border-default)] ${selectedId === row.id ? "bg-[var(--color-surface-container-low)]" : ""}`} onClick={() => setSelectedId(row.id)}>
                      <td className="py-2">
                        <p className="font-medium">{row.candidateName}</p>
                        <p className={muted}>{row.candidateEmail}{row.duplicate ? " · trùng hồ sơ" : ""}</p>
                      </td>
                      <td>{row.source ?? "—"}{row.referralCode ? ` / ${row.referralCode}` : ""}</td>
                      <td>{labels[row.status] ?? row.status}</td>
                      <td>{row.assigneeName ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {total > 20 && (
              <div className="mt-4 flex gap-2">
                <button className={button} type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Trước</button>
                <button className={button} type="button" disabled={(page + 1) * 20 >= total} onClick={() => setPage((p) => p + 1)}>Sau</button>
              </div>
            )}
          </div>
          <aside className={panel}>
            {!detail.data?.data && <p className={muted}>Chọn một application để xem hồ sơ.</p>}
            {detail.data?.data && <ApplicationPanel detail={detail.data.data} jobId={jobId} onChanged={() => { void detail.refetch(); void list.refetch(); }} />}
            {detail.isError && <p role="alert">{getApiErrorMessage(detail.error)}</p>}
          </aside>
        </div>
      )}
    </section>
  );
}

function ApplicationPanel({ detail, jobId, onChanged }: { detail: ApplicationDetail; jobId: number; onChanged: () => void }) {
  const [notes, setNotes] = useState(detail.notes ?? "");
  const [tags, setTags] = useState(detail.tags ?? "");
  const [assigneeEmail, setAssigneeEmail] = useState("");
  const [reason, setReason] = useState("");
  const save = useMutation({
    mutationFn: () => applicantApi.update(detail.id, { notes, tags, assigneeEmail: assigneeEmail || undefined }),
    onSuccess: onChanged,
  });
  const act = useMutation({
    mutationFn: (action: "reject" | "archive" | "restore") => {
      if (action === "reject") return applicantApi.reject(detail.id, reason || undefined);
      if (action === "archive") return applicantApi.archive(detail.id);
      return applicantApi.restore(detail.id);
    },
    onSuccess: onChanged,
  });
  return (
    <div className="space-y-4 text-sm">
      <div>
        <h2 className="text-lg font-semibold">{detail.candidateName}</h2>
        <p className={muted}>{detail.candidateEmail} · {detail.jobTitle}</p>
        <p className={muted}>{labels[detail.status] ?? detail.status}{detail.archived ? " · đã lưu trữ" : ""}{detail.duplicate || detail.candidateApplicationCount > 1 ? ` · ${detail.candidateApplicationCount} hồ sơ` : ""}</p>
        <p className={muted}>Nguồn {detail.source ?? "—"}{detail.referralCode ? ` · referral ${detail.referralCode}` : ""}</p>
      </div>
      <ApplicationPipeline status={detail.status} />
      <div className="space-y-3 rounded-2xl border border-dashed border-[var(--color-outline-variant)] p-3">
        <p className="font-semibold">Kết quả vòng (UI sơ khai)</p>
        <p className={muted}>Đánh giá AI · Bài test · Nhận xét PV — tách khỏi status đơn.</p>
        <ul className="space-y-2 text-sm">
          <li className="flex flex-wrap items-center justify-between gap-2">
            <span>Đánh giá AI</span>
            <span className={muted}>Chưa có phiên</span>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2">
            <span>Bài kiểm tra</span>
            <span>86.7% · đã chấm (mock)</span>
          </li>
          <li className="flex flex-wrap items-center justify-between gap-2">
            <span>Interview chính thức</span>
            <span className={muted}>Chờ xác nhận lịch</span>
          </li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <Link className={button} to={`/recruiter/jobs/${jobId}/assessments`}>Quản lý đề</Link>
          <Link className={button} to={`/recruiter/jobs/${jobId}/schedules`}>Đặt lịch PV</Link>
        </div>
      </div>
      <div className="space-y-2">
        <p className="font-semibold">Phiên bản CV</p>
        {detail.cvs.length === 0 && <p className={muted}>Chưa có CV. Ứng viên tải file ở “CV của tôi”.</p>}
        {detail.cvs.map((cv) => (
          <div key={cv.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-default)] pb-2">
            <span>{cv.originalFilename} · {cv.status}{cv.expired ? " · hết hạn lưu" : ""}</span>
            {!cv.expired && (
              <button className={button} type="button" onClick={() => { void cvApi.file(cv.id).then((blob) => { const url = URL.createObjectURL(blob); window.open(url, "_blank"); }); }}>Xem / tải</button>
            )}
          </div>
        ))}
      </div>
      <label className="block space-y-1"><span>Ghi chú</span><textarea className={input} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></label>
      <label className="block space-y-1"><span>Tag</span><input className={input} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="java, referral" /></label>
      <label className="block space-y-1"><span>Người phụ trách (email)</span><input className={input} value={assigneeEmail} onChange={(e) => setAssigneeEmail(e.target.value)} placeholder="recruiter@company.com" /></label>
      <button className={primary} type="button" disabled={save.isPending} onClick={() => save.mutate()}>Lưu ghi chú / tag</button>
      <label className="block space-y-1"><span>Lý do từ chối</span><input className={input} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
      <div className="flex flex-wrap gap-2">
        <button className={button} type="button" onClick={() => act.mutate("reject")}>Từ chối</button>
        <button className={button} type="button" onClick={() => act.mutate("archive")}>Lưu trữ</button>
        <button className={button} type="button" onClick={() => act.mutate("restore")}>Khôi phục</button>
      </div>
      {save.isError && <p role="alert">{getApiErrorMessage(save.error)}</p>}
      {act.isError && <p role="alert">{getApiErrorMessage(act.error)}</p>}
      <div>
        <p className="font-semibold">Lịch sử</p>
        <ul className="mt-2 space-y-1">
          {detail.history.map((row, index) => (
            <li key={`${row.createdAt}-${index}`} className={muted}>{row.fromStatus ?? "—"} → {row.toStatus}{row.note ? ` · ${row.note}` : ""}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
