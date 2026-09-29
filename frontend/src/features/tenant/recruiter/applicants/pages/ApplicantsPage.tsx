import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Clock3, Search, Users } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { applicantApi } from "@/api/tenant/applicantApi";
import { cvApi } from "@/api/tenant/cvApi";
import { jobApi } from "@/api/tenant/jobApi";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { button, input, labels, muted, panel, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { ApplicationPipeline } from "@/features/tenant/recruiter/matching/components/recruitmentFlow";
import { ApplicantRounds } from "@/features/tenant/recruiter/applicants/components/ApplicantRounds";
import { SendAssessmentPanel } from "@/features/tenant/recruiter/applicants/components/SendAssessmentPanel";
import { DetailDialog } from "@/components/ux/DetailDialog";
import { CvFilePreview } from "@/components/shared/CvFilePreview";
import { ScreeningBreakdown } from "@/features/tenant/recruiter/cv-screening/components/ScreeningBreakdown";
import type { ApplicationDetail, ApplicationSummary, CvRef } from "@/api/types/applicant";

const statuses = ["NEW", "IN_REVIEW", "ASSESSMENT", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];

function waitingTime(createdAt: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 3_600_000));
  if (hours < 1) return "Vừa nộp";
  if (hours < 24) return `Chờ ${hours} giờ`;
  return `Chờ ${Math.floor(hours / 24)} ngày`;
}

function isWaitingOver24Hours(row: ApplicationSummary) {
  return Date.now() - new Date(row.createdAt).getTime() >= 24 * 3_600_000;
}

export function ApplicantsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const { id: routeJobId } = useParams<{ id?: string }>();
  const [params, setParams] = useSearchParams();
  const jobIdRaw = params.get("jobId");
  const jobId = routeJobId && /^\d+$/.test(routeJobId) ? Number(routeJobId) : jobIdRaw && /^\d+$/.test(jobIdRaw) ? Number(jobIdRaw) : null;
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const requestedStatus = params.get("status")?.toUpperCase() ?? "";
  const [status, setStatus] = useState(statuses.includes(requestedStatus) ? requestedStatus : "");
  const isNewApplicantQueue = requestedStatus === "NEW";
  const [source, setSource] = useState("");
  const [archived, setArchived] = useState(false);
  const [sort, setSort] = useState<"oldest" | "newest">("oldest");
  const [waitingFilter, setWaitingFilter] = useState<"all" | "24" | "72" | "168">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<"all" | "unassigned">("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [page, setPage] = useState(0);
  const jobs = useQuery({ queryKey: ["screening-jobs"], queryFn: jobApi.options, enabled: !!token && !routeJobId && !isNewApplicantQueue });
  const listKey = [...queryKeys.applicants.byJob(jobId ?? "all"), q, status, source, archived, page];
  const list = useQuery({
    queryKey: listKey,
    queryFn: () => applicantApi.list({
      jobId: jobId ?? undefined,
      q: q || undefined,
      status: status || undefined,
      source: source || undefined,
      archived,
      page,
      size: 20,
    }),
    enabled: !!token,
  });
  const detail = useQuery({
    queryKey: queryKeys.applicants.detail(selectedId ?? 0),
    queryFn: () => applicantApi.get(selectedId!),
    enabled: selectedId !== null,
  });
  const rows = list.data?.data.items ?? [];
  const visibleRows = useMemo(() => rows
    .filter((row) => waitingFilter === "all" || Date.now() - new Date(row.createdAt).getTime() >= Number(waitingFilter) * 3_600_000)
    .filter((row) => assigneeFilter === "all" || !row.assigneeName)
    .sort((left, right) => {
      const difference = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      return sort === "oldest" ? difference : -difference;
    }), [assigneeFilter, rows, sort, waitingFilter]);
  const total = list.data?.data.total ?? 0;
  const overdueCount = rows.filter(isWaitingOver24Hours).length;
  const jobList = jobs.data?.data ?? [];
  const selectJob = (next: number | null) => {
    const nextParams = new URLSearchParams(params);
    if (next == null) nextParams.delete("jobId");
    else nextParams.set("jobId", String(next));
    setParams(nextParams, { replace: true });
    setSelectedId(null);
    setPage(0);
  };
  const review = useMutation({
    mutationFn: (ids: number[]) => Promise.all(ids.map((id) => applicantApi.changeStatus(id, "IN_REVIEW"))),
    onSuccess: (_responses, ids) => {
      setReviewedCount(ids.length);
      setSelectedIds([]);
      void list.refetch();
    },
  });
  const toggleSelected = (id: number) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => selectedIds.includes(row.id));
  return (
    <section className="space-y-4 text-[var(--color-on-surface)]">
      {isNewApplicantQueue ? <div className={`${panel} space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {selectedIds.length > 0 ? <><p className="text-sm font-semibold text-brand-primary">Đã chọn {selectedIds.length} hồ sơ</p><div className="flex gap-2"><button type="button" className={button} onClick={() => setSelectedIds([])}>Bỏ chọn</button><button type="button" className={primary} disabled={review.isPending} onClick={() => review.mutate(selectedIds)}>{review.isPending ? "Đang chuyển…" : "Chuyển sang xem xét"}</button></div></> : <><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold tracking-tight">Ứng viên mới</h1><span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-semibold text-brand-primary" role="status" aria-atomic="true">{list.isPending ? "Đang tải" : `${total} hồ sơ`}</span>{overdueCount > 0 && <button type="button" onClick={() => setWaitingFilter("24")} aria-pressed={waitingFilter === "24"} className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-amber-50 px-3 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"><AlertTriangle className="size-3.5" aria-hidden="true" />{overdueCount} quá 24 giờ</button>}</div><p className="text-xs text-[var(--color-on-surface-variant)]">Tổng hợp mọi vị trí</p></>}
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_11rem_11rem_11rem]">
          <label className="relative"><span className="sr-only">Tìm kiếm ứng viên</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" aria-hidden="true" /><input className={`${input} pl-9`} value={q} onChange={(event) => { setQ(event.target.value); setPage(0); }} placeholder="Tìm tên hoặc email" /></label>
          <label><span className="sr-only">Thời gian chờ</span><select className={input} value={waitingFilter} onChange={(event) => setWaitingFilter(event.target.value as "all" | "24" | "72" | "168")}><option value="all">Mọi thời gian</option><option value="24">Quá 24 giờ</option><option value="72">Quá 3 ngày</option><option value="168">Quá 7 ngày</option></select></label>
          <label><span className="sr-only">Người phụ trách</span><select className={input} value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value as "all" | "unassigned")}><option value="all">Mọi phụ trách</option><option value="unassigned">Chưa phân công</option></select></label>
          <label><span className="sr-only">Sắp xếp</span><select className={input} value={sort} onChange={(event) => setSort(event.target.value as "oldest" | "newest")}><option value="oldest">Cũ nhất trước</option><option value="newest">Mới nhất trước</option></select></label>
        </div>
      </div> : <><header><h1 className="text-2xl font-semibold tracking-tight">Ứng viên</h1></header><div className={panel}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {!routeJobId && <label className="space-y-1 text-sm">
            <span>Job</span>
            <select className={input} value={jobId ?? ""} onChange={(e) => selectJob(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Tất cả job</option>
              {jobList.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
            </select>
          </label>}
          <label className="space-y-1 text-sm">
            <span>Tìm kiếm</span>
            <span className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" aria-hidden="true" /><input className={`${input} pl-9`} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Tên, email, tag, referral" /></span>
          </label>
          <label className="space-y-1 text-sm">
            <span>Trạng thái</span>
            <select className={input} value={status} onChange={(e) => {
              const nextStatus = e.target.value;
              const nextParams = new URLSearchParams(params);
              if (nextStatus) nextParams.set("status", nextStatus.toLowerCase());
              else nextParams.delete("status");
              setParams(nextParams, { replace: true });
              setStatus(nextStatus);
              setPage(0);
            }}>
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
      </div></>}
      {review.isSuccess && reviewedCount > 0 && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">Đã chuyển {reviewedCount} hồ sơ sang trạng thái đang xem xét.</p>}
      {review.isError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{getApiErrorMessage(review.error)}</p>}
      <div className={`${panel} overflow-x-auto`}>
        {list.isPending && <p>Đang tải…</p>}
        {list.isError && <p role="alert">{getApiErrorMessage(list.error)}</p>}
        {visibleRows.length === 0 && list.isSuccess && (isNewApplicantQueue ? <div className="flex flex-col items-center py-10 text-center"><span className="grid size-12 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-brand-primary"><Users className="size-6" aria-hidden="true" /></span><h2 className="mt-4 text-lg font-semibold">Đã xử lý hết ứng viên mới</h2><p className={`mt-1 ${muted}`}>Hiện không còn hồ sơ nào đang chờ xem xét.</p><Link to="/recruiter" className={`${button} mt-4`}>Quay lại Dashboard</Link></div> : <p className={muted}>Chưa có ứng viên.</p>)}
        {visibleRows.length > 0 && (
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead><tr className={muted}>{isNewApplicantQueue && <th className="w-10 py-2"><input type="checkbox" aria-label="Chọn tất cả hồ sơ trên trang" checked={allVisibleSelected} onChange={() => setSelectedIds(allVisibleSelected ? [] : visibleRows.map((row) => row.id))} /></th>}<th className="py-2">Ứng viên</th><th>Vị trí ứng tuyển</th>{isNewApplicantQueue && <th>Thời gian chờ</th>}{!isNewApplicantQueue && <th>Nguồn</th>}<th>Phụ trách</th>{!isNewApplicantQueue && <th>Trạng thái</th>}{isNewApplicantQueue && <th><span className="sr-only">Thao tác</span></th>}</tr></thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id} className={`cursor-pointer border-t border-[var(--color-border-default)] transition-colors hover:bg-[var(--color-primary-subtle)] ${selectedId === row.id ? "bg-[var(--color-surface-container-low)]" : ""}`} onClick={() => setSelectedId(row.id)}>
                  {isNewApplicantQueue && <td className="py-3" onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`Chọn hồ sơ ${row.candidateName}`} checked={selectedIds.includes(row.id)} onChange={() => toggleSelected(row.id)} /></td>}
                  <td className="py-3">
                    <p className="font-medium">{row.candidateName}</p>
                    <p className={muted}>{row.candidateEmail}{row.duplicate ? " · trùng hồ sơ" : ""}</p>
                  </td>
                  <td><p className="font-medium">{row.jobTitle}</p><p className={muted}>{[row.jobDepartment, row.jobLocation].filter(Boolean).join(" · ") || "—"}</p></td>
                  {isNewApplicantQueue && <td><span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${isWaitingOver24Hours(row) ? "bg-amber-50 text-amber-700" : "bg-[var(--color-surface-alt)] text-[var(--color-on-surface-variant)]"}`}><Clock3 className="size-3.5" aria-hidden="true" />{waitingTime(row.createdAt)}</span></td>}
                  {!isNewApplicantQueue && <td>{row.source ?? "—"}{row.referralCode ? ` / ${row.referralCode}` : ""}</td>}
                  <td>{row.assigneeName ?? "Chưa phân công"}</td>
                  {!isNewApplicantQueue && <td>{labels[row.status] ?? row.status}</td>}
                  {isNewApplicantQueue && <td onClick={(event) => event.stopPropagation()}><div className="flex justify-end gap-2"><button type="button" className={button} onClick={() => setSelectedId(row.id)}>Xem hồ sơ</button><button type="button" className={primary} disabled={review.isPending} onClick={() => review.mutate([row.id])}>Xem xét<ArrowRight className="size-3.5" aria-hidden="true" /></button></div></td>}
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
      <DetailDialog
        open={selectedId != null}
        title={detail.data?.data.candidateName ?? "Hồ sơ ứng viên"}
        onClose={() => setSelectedId(null)}
      >
        {detail.isPending && selectedId != null && <p>Đang tải…</p>}
        {detail.isError && <p role="alert">{getApiErrorMessage(detail.error)}</p>}
        {detail.data?.data && (
          <ApplicationPanel
            key={detail.data.data.id}
            detail={detail.data.data}
            onChanged={() => { void detail.refetch(); void list.refetch(); }}
          />
        )}
      </DetailDialog>
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
      <ApplicantRounds rounds={detail.rounds} gate={detail.gateScore} />
      <AppliedCvReview cvs={detail.cvs} />
      {!detail.archived && ["INTERVIEW", "ASSESSMENT"].includes(detail.status) && <SendAssessmentPanel detail={detail} onSent={onChanged} />}
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
