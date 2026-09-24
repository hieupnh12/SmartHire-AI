import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { applicantApi } from "@/api/tenant/applicantApi";
import { cvApi } from "@/api/tenant/cvApi";
import { jobApi } from "@/api/tenant/jobApi";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { button, input, labels, muted, panel, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { ApplicationPipeline } from "@/features/tenant/recruiter/matching/components/recruitmentFlow";
import { CvFilePreview } from "@/components/shared/CvFilePreview";
import { ScreeningBreakdown } from "@/features/tenant/recruiter/cv-screening/components/ScreeningBreakdown";
import type { ApplicationDetail, CvRef } from "@/api/types/applicant";

const statuses = ["NEW", "IN_REVIEW", "ASSESSMENT", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];

export function ApplicantsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const [params, setParams] = useSearchParams();
  const jobIdRaw = params.get("jobId");
  const jobId = jobIdRaw && /^\d+$/.test(jobIdRaw) ? Number(jobIdRaw) : null;
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [archived, setArchived] = useState(false);
  const [page, setPage] = useState(0);
  const jobs = useQuery({ queryKey: ["screening-jobs"], queryFn: jobApi.options, enabled: !!token });
  const listKey = [...queryKeys.applicants.byJob(jobId ?? 0), q, status, source, archived, page];
  const list = useQuery({
    queryKey: listKey,
    queryFn: () => applicantApi.listByJob(jobId!, { q: q || undefined, status: status || undefined, source: source || undefined, archived, page, size: 20 }),
    enabled: jobId !== null && !!token,
  });
  const detail = useQuery({
    queryKey: queryKeys.applicants.detail(selectedId ?? 0),
    queryFn: () => applicantApi.get(selectedId!),
    enabled: selectedId !== null,
  });
  const rows = list.data?.data.items ?? [];
  const total = list.data?.data.total ?? 0;
  const jobList = jobs.data?.data ?? [];
  const selectJob = (next: number | null) => {
    const nextParams = new URLSearchParams(params);
    if (next == null) nextParams.delete("jobId");
    else nextParams.set("jobId", String(next));
    setParams(nextParams, { replace: true });
    setSelectedId(null);
    setPage(0);
  };
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header>
        <p className={muted}>Tuyển dụng / Ứng viên</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Quản lý ứng viên</h1>
        <p className={`mt-2 max-w-2xl ${muted}`}>Chọn job, chọn ứng viên đã apply, xem CV đã nộp rồi phân tích bằng AI so với JD.</p>
      </header>
      <div className={panel}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-1 text-sm">
            <span>Job</span>
            <select className={input} value={jobId ?? ""} onChange={(e) => selectJob(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Chọn job</option>
              {jobList.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
            </select>
          </label>
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
      {jobId && (
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
            {!detail.data?.data && <p className={muted}>Chọn một ứng viên để xem CV đã apply.</p>}
            {detail.data?.data && <ApplicationPanel key={detail.data.data.id} detail={detail.data.data} onChanged={() => { void detail.refetch(); void list.refetch(); }} />}
            {detail.isError && <p role="alert">{getApiErrorMessage(detail.error)}</p>}
          </aside>
        </div>
      )}
    </section>
  );
}

function ApplicationPanel({ detail, onChanged }: { detail: ApplicationDetail; onChanged: () => void }) {
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
          <Link className={button} to="/recruiter/assessments">Quản lý đề</Link>
          <Link className={button} to="/recruiter/schedules">Đặt lịch PV</Link>
        </div>
      </div>
      <AppliedCvReview cvs={detail.cvs} />
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

function AppliedCvReview({ cvs }: { cvs: CvRef[] }) {
  const active = cvs.filter((cv) => !cv.expired);
  const [cvId, setCvId] = useState<number | null>(active[0]?.id ?? null);
  const selected = active.find((cv) => cv.id === cvId) ?? active[0] ?? null;
  const detail = useQuery({
    queryKey: queryKeys.cvs.detail(selected?.id ?? 0),
    queryFn: () => cvApi.get(selected!.id),
    enabled: selected != null,
  });
  const analyze = useMutation({
    mutationFn: (id: number) => cvApi.parse(id),
    onSuccess: () => void detail.refetch(),
  });
  const cv = detail.data?.data;
  const breakdown = cv?.match?.breakdown;
  const skills = useMemo(() => cv?.skills ?? [], [cv?.skills]);
  return (
    <div className="space-y-3">
      <p className="font-semibold">CV đã apply</p>
      {active.length === 0 && <p className={muted}>Ứng viên chưa nộp CV cho job này.</p>}
      {active.length > 1 && (
        <select className={input} value={selected?.id ?? ""} onChange={(e) => setCvId(Number(e.target.value))}>
          {active.map((cv) => <option key={cv.id} value={cv.id}>{cv.originalFilename} · {cv.status}</option>)}
        </select>
      )}
      {selected && (
        <>
          <p className={muted}>{selected.originalFilename} · {cv?.status ?? selected.status}</p>
          <CvFilePreview cvId={selected.id} mimeType={cv?.mimeType ?? null} filename={selected.originalFilename} />
          <button
            className={button}
            type="button"
            disabled={analyze.isPending}
            onClick={() => analyze.mutate(selected.id)}
          >
            {analyze.isPending ? "Đang phân tích…" : cv?.status === "ANALYZED" ? "Phân tích lại bằng AI" : "Phân tích CV bằng AI"}
          </button>
          {analyze.isError && <p role="alert">{getApiErrorMessage(analyze.error)}</p>}
          {detail.isError && <p role="alert">{getApiErrorMessage(detail.error)}</p>}
          {cv?.match && (
            <ScreeningBreakdown score={cv.match.score} modelVersion={cv.match.modelVersion} breakdown={breakdown} />
          )}
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span key={skill.canonicalName} className="rounded-full bg-[var(--color-primary-container)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-on-primary)]">{skill.skillName}</span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
