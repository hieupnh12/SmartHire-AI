import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, Award, ChevronLeft, ChevronRight, Clock3, Eye, FilterX, Gauge, RefreshCw, Search, SlidersHorizontal, Sparkles, Users } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { matchingApi } from "@/api/tenant/matchingApi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { getApiErrorMessage } from "@/lib/axios";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { createRankingSocket } from "@/lib/ws";
import { RankingConfigForm } from "../components/RankingConfigForm";
import { RankingDetail } from "../components/RankingDetail";
import { RankingSelect } from "../components/RankingSelect";
import { PREVIEW_JOB_ID, rankingPreview } from "../data/rankingPreview";
import { button, detailAction, input, labels, muted, primary, scoreText } from "../components/rankingUi";
import { useRankingStore } from "../stores/useRankingStore";
import type { RankingPage, RankingRow } from "../types/ranking";

const terminal = new Set(["REJECTED", "WITHDRAWN", "HIRED"]);
const componentScore = (row: RankingRow, key: string) => row.result.components.find((part) => part.key === key)?.score ?? null;

function ScoreGauge({ score }: { score: number | null }) {
  const value = Math.max(0, Math.min(100, score ?? 0));
  const circumference = 2 * Math.PI * 18;
  return <div className="relative grid size-12 shrink-0 place-items-center" aria-label={score === null ? "Chưa có điểm" : `Điểm ${scoreText(score)} trên 100`}>
    <svg viewBox="0 0 44 44" className="size-12 -rotate-90" aria-hidden="true">
      <circle cx="22" cy="22" r="18" fill="none" stroke="var(--color-surface-container)" strokeWidth="3.5" />
      <circle cx="22" cy="22" r="18" fill="none" stroke="var(--color-primary)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} />
    </svg>
    <span className="absolute text-[11px] font-bold tabular-nums">{score === null ? "—" : scoreText(score)}</span>
  </div>;
}

function StatCard({ icon: Icon, label, value, helper }: { icon: typeof Users; label: string; value: string | number; helper: string }) {
  return <article className="group relative overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-sm transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none hover:border-[var(--color-primary)] hover:shadow-md">
    <span className="absolute inset-x-0 top-0 h-1 bg-[var(--color-primary)] opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none" aria-hidden="true" />
    <div className="flex items-start justify-between gap-4">
      <div><p className={muted}>{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p></div>
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] transition-colors duration-200 group-hover:bg-[var(--color-primary)] group-hover:text-[var(--color-on-primary)] motion-reduce:transition-none"><Icon className="size-5" aria-hidden="true" /></span>
    </div>
    <p className="mt-4 text-xs text-[var(--color-on-surface-variant)]">{helper}</p>
  </article>;
}

function statusTone(status: string) {
  if (status === "HIRED" || status === "OFFER") return "bg-emerald-50 text-emerald-700";
  if (status === "REJECTED" || status === "WITHDRAWN") return "bg-red-50 text-red-700";
  return "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]";
}

function CandidateCard({ row, showRank, onOpen }: { row: RankingRow; showRank: boolean; onOpen: () => void }) {
  return <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 shadow-sm">
    <div className="flex items-start gap-3">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold ${row.rank && row.rank <= 3 ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]" : "bg-[var(--color-surface-container-low)]"}`}>
        {showRank ? `#${row.rank ?? "—"}` : "—"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0"><h3 className="truncate font-semibold">{row.candidateName}</h3><p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">Hồ sơ #{row.applicationId} · {row.experienceMonths === null ? "Chưa rõ kinh nghiệm" : `${(row.experienceMonths / 12).toFixed(1)} năm kinh nghiệm`}</p></div>
          <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(row.status)}`}>{labels[row.status] ?? row.status}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
          {[{ key: "score", label: "Tổng", value: row.result.score }, { key: "skills", label: "CV", value: componentScore(row, "skills") }, { key: "experience", label: "Kinh nghiệm", value: componentScore(row, "experience") }, { key: "assessment", label: "Bài test", value: componentScore(row, "assessment") }, { key: "interview", label: "PV AI", value: componentScore(row, "interview") }].map((item, index) => <div key={item.key} className={`rounded-lg bg-[var(--color-surface-container-low)] px-2 py-2 ${index === 0 ? "col-span-2 sm:col-span-1" : ""}`}><strong className="block text-sm tabular-nums">{scoreText(item.value)}</strong><span className="text-[10px] text-[var(--color-on-surface-variant)]">{item.label}</span></div>)}
        </div>
        <button type="button" className={`${primary} mt-4 w-full`} onClick={onOpen}><Eye className="size-4" aria-hidden="true" />Xem hồ sơ và điểm chi tiết</button>
      </div>
    </div>
  </article>;
}

export function RankingPage() {
  const state = useRankingStore();
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((store) => store.accessToken);
  const sessionKey = useMemo(() => crypto.randomUUID(), [token]);
  const tenantKey = `${getTenantIdFromWindow() ?? ""}:${sessionKey}`;
  const client = useQueryClient();
  const jobId = Number(id);
  const validJobId = Number.isInteger(jobId) && jobId > 0;
  const pageSize = state.pageSize;
  const deferredSearch = useDeferredValue(state.search);
  const isPreview = jobId === PREVIEW_JOB_ID;
  const [previewUpdatedAt, setPreviewUpdatedAt] = useState(rankingPreview.calculatedAt);
  const [previewRefreshing, setPreviewRefreshing] = useState(false);
  const rankingQuery = { page: state.page, size: pageSize, search: deferredSearch, status: state.status, cohort: state.cohort, minScore: state.minimum === "" ? undefined : Number(state.minimum), sort: state.sort };
  const query = useQuery({ queryKey: ["rankings", tenantKey, jobId, rankingQuery], queryFn: () => matchingApi.rankings(jobId, rankingQuery), enabled: validJobId && jobId !== PREVIEW_JOB_ID && !!token, refetchInterval: 30_000, refetchOnWindowFocus: true });
  const previewRows = rankingPreview.rows.filter((row) => !terminal.has(row.status));
  const previewBoard: RankingPage = { ...rankingPreview, calculatedAt: previewUpdatedAt, cohorts: [...new Set(rankingPreview.rows.map((row) => row.result.cohort))], summary: { totalCandidates: rankingPreview.rows.length, activeCandidates: previewRows.length, scoredCandidates: rankingPreview.rows.length, averageScore: rankingPreview.rows.reduce((sum, row) => sum + (row.result.score ?? 0), 0) / rankingPreview.rows.length, topCandidateName: rankingPreview.rows[0]?.candidateName ?? null, topScore: rankingPreview.rows[0]?.result.score ?? null, completeCandidates: rankingPreview.rows.filter((row) => row.result.complete).length }, page: { number: 0, size: pageSize, totalElements: rankingPreview.rows.length, totalPages: 1 } };
  const board = isPreview ? previewBoard : query.data?.data;
  useEffect(() => {
    if (validJobId && state.jobId !== jobId) state.setJob(jobId);
  }, [jobId, state, validJobId]);
  useEffect(() => {
    if (!token || isPreview) return;
    const socket = createRankingSocket(token, (event) => {
      if (event.jobId === jobId) void client.invalidateQueries({ queryKey: ["rankings", tenantKey, jobId] });
    });
    return () => socket?.close();
  }, [client, isPreview, jobId, tenantKey, token]);
  const categories = board?.skillCategories ?? [];
  const groupMismatch = board && categories.length > 0 && [...Object.keys(board.config.groups)].sort().join("|") !== [...categories].sort().join("|");
  const formConfig = board && groupMismatch ? { ...board.config, groups: Object.fromEntries(categories.map((category, index) => [category, Math.floor(100 / categories.length) + (index < 100 % categories.length ? 1 : 0)])) } : board?.config;
  const saved = async () => client.invalidateQueries({ queryKey: ["rankings", tenantKey, jobId] });
  const recompute = useMutation({ mutationFn: (id: number) => matchingApi.recompute(id), onSuccess: saved });
  const refreshing = recompute.isPending || previewRefreshing;
  const refreshRanking = () => {
    if (!validJobId) return;
    if (!isPreview) { recompute.mutate(jobId); return; }
    setPreviewRefreshing(true);
    window.setTimeout(() => { setPreviewUpdatedAt(new Date().toISOString()); setPreviewRefreshing(false); }, 650);
  };
  const cohorts = board?.cohorts ?? [];
  const filtered = board?.rows ?? [];
  const page = board?.page.number ?? 0;
  const selected = board?.rows.find((row) => row.applicationId === state.selectedId);
  const summary = board?.summary;
  const exportCsv = () => {
    if (!board) return;
    const rows = [["Rank", "Candidate", "Skills", "Experience", "Assessment", "AI Interview", "Overall", "Status"], ...filtered.map((row) => [row.rank ?? "", row.candidateName, componentScore(row, "skills") ?? "", componentScore(row, "experience") ?? "", componentScore(row, "assessment") ?? "", componentScore(row, "interview") ?? "", row.result.score ?? "", row.status])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `ranking-${board.jobId}.csv`; anchor.click(); URL.revokeObjectURL(url);
  };

  return <section className="min-w-0 space-y-6 rounded-3xl bg-[var(--color-surface)] pb-8 text-[var(--color-on-surface)]">
    <header className="relative z-30 rounded-3xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] shadow-sm focus-within:z-40">
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden="true"><div className="absolute -right-20 -top-28 size-80 rounded-full bg-[var(--color-primary-soft)] blur-3xl" /><div className="absolute bottom-0 right-1/4 size-40 rounded-full bg-[var(--color-primary-subtle)] blur-3xl" /></div>
      <div className="relative grid gap-6 p-5 sm:p-7 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.58fr)] xl:items-center xl:p-8">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary-hover)]"><Sparkles className="size-3.5" aria-hidden="true" />Xếp hạng đa nguồn</span>
            {board && <span className="rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-3 py-1.5 text-xs font-medium text-[var(--color-on-surface-variant)]">Snapshot {board.rankingVersion}</span>}
          </div>
          <h1 className="max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Bảng xếp hạng ứng viên</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)] sm:text-base">Đưa ra quyết định tuyển dụng từ điểm kỹ năng, kinh nghiệm, assessment và AI interview — luôn kèm bằng chứng để kiểm tra.</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--color-on-surface-variant)]">
            <span className="inline-flex items-center gap-2"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-50 motion-reduce:animate-none" /><span className="relative inline-flex size-2 rounded-full bg-emerald-500" /></span>Tự động cập nhật mỗi 30 giây</span>
            <span className="inline-flex items-center gap-2"><Clock3 className="size-4 text-[var(--color-primary)]" aria-hidden="true" />{board ? `Cập nhật ${new Date(board.calculatedAt).toLocaleString("vi-VN")}` : "Chưa có snapshot"}</span>
            {(query.isFetching || previewRefreshing) && <span role="status" className="inline-flex items-center gap-2 font-semibold text-[var(--color-primary)]"><RefreshCw className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />Đang đồng bộ</span>}
          </div>
        </div>

        <div className="relative z-40 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)]/90 p-4 shadow-[0_16px_40px_-28px_var(--color-primary-shadow)] backdrop-blur sm:p-5">
          <div><p className="text-xs font-medium text-[var(--color-on-surface-variant)]">Đang xếp hạng cho</p><p className="mt-1 truncate text-lg font-semibold">{board?.jobTitle ?? `Job #${id}`}</p><Link to={`/recruiter/jobs/${id}`} className="mt-2 inline-flex text-xs font-semibold text-[var(--color-primary)] hover:underline">Quay lại chi tiết công việc</Link></div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2"><button className={button} disabled={!board?.rows.length} onClick={exportCsv}><ArrowDownToLine className="size-4" aria-hidden="true" />Xuất CSV</button><button className={primary} disabled={!jobId || refreshing} onClick={refreshRanking}><RefreshCw className={`size-4 ${refreshing ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />{refreshing ? "Đang tính lại…" : "Tính lại điểm"}</button></div>
        </div>
      </div>
    </header>

    {!token && <p role="status" className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5">Đăng nhập bằng tài khoản Recruiter để xem bảng xếp hạng.</p>}
    {!validJobId && <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700" role="alert">Đường dẫn công việc không hợp lệ. <Link className="font-semibold underline" to="/recruiter/jobs">Quay lại danh sách công việc</Link></div>}
    {jobId && !isPreview && token && query.isPending && <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-8 text-center" role="status">Đang tải và tính điểm ứng viên…</div>}
    {jobId && !isPreview && query.isError && <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-6" role="alert">{getApiErrorMessage(query.error)} <button className={button} onClick={() => void query.refetch()}>Thử lại</button></div>}
    {recompute.isError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{getApiErrorMessage(recompute.error)}</p>}

    {board && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard icon={Users} label="Tổng ứng viên" value={summary?.totalCandidates ?? 0} helper={`${summary?.activeCandidates ?? 0} hồ sơ đang xét tuyển`} /><StatCard icon={Gauge} label="Điểm trung bình" value={summary?.averageScore == null ? "—" : scoreText(summary.averageScore)} helper={`${summary?.scoredCandidates ?? 0}/${summary?.totalCandidates ?? 0} hồ sơ đã có điểm`} /><StatCard icon={Award} label="Ứng viên dẫn đầu" value={summary?.topScore == null ? "—" : scoreText(summary.topScore)} helper={summary?.topCandidateName ?? "Chưa đủ dữ liệu xếp hạng"} /><StatCard icon={Sparkles} label="Đủ kết quả" value={summary?.completeCandidates ?? 0} helper={`${(summary?.totalCandidates ?? 0) - (summary?.completeCandidates ?? 0)} hồ sơ đang chờ bổ sung`} /></div>

      <details key={board.jobId} className="group rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] shadow-sm" open={board.config.revision === 0 ? true : undefined}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 transition-colors hover:bg-[var(--color-surface-alt)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"><span className="flex items-center gap-3 font-semibold"><span className="grid size-9 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><SlidersHorizontal className="size-4" aria-hidden="true" /></span>Cấu hình điểm và trọng số</span><span className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)]"><span>Revision {board.config.revision}</span><ChevronRight className="size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" /></span></summary>
        <div className="border-t border-[var(--color-border-default)] p-5">{isPreview ? <><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{(["skills", "experience", "assessment", "interview"] as const).map((key) => <label key={key} className="space-y-2 text-sm"><span className="flex items-center justify-between"><span>{labels[key]}</span><strong className="text-[var(--color-primary-hover)]">{board.config.weights[key]}%</strong></span><input className="w-full accent-[var(--color-primary)]" type="range" min="0" max="100" value={board.config.weights[key]} readOnly /></label>)}</div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[var(--color-primary-subtle)] p-4 text-sm"><span className="text-[var(--color-on-surface-variant)]">Cấu hình giao diện mẫu · Tổng trọng số <strong className="text-[var(--color-on-surface)]">100%</strong></span><span className="rounded-full bg-[var(--color-surface-card)] px-3 py-1 text-xs font-semibold text-[var(--color-primary-hover)]">Chỉ đọc</span></div></> : formConfig && <RankingConfigForm key={`${board.jobId}:${board.config.revision}:${categories.join("|")}`} jobId={board.jobId} config={formConfig} onSaved={saved} />}</div>
      </details>

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-primary-soft)] bg-[var(--color-primary-subtle)] px-5 py-4 shadow-sm xl:flex-row xl:items-center xl:justify-between"><div className="flex flex-wrap items-center gap-2"><span className="mr-1 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary-hover)]"><SlidersHorizontal className="size-4" aria-hidden="true" />Trọng số đang dùng</span>{(["skills", "experience", "assessment", "interview"] as const).map((key) => <span key={key} className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-2.5 py-1 text-xs shadow-sm">{labels[key]} <strong className="text-[var(--color-primary-hover)]">{board.config.weights[key]}%</strong></span>)}</div><span className="rounded-lg bg-[var(--color-surface-card)] px-3 py-1.5 text-xs font-medium text-[var(--color-on-surface-variant)] shadow-sm">Kinh nghiệm yêu cầu: {board.config.requiredExperienceMonths} tháng</span></div>
      {board.rows.some((row) => row.notices.includes("JOB_SKILLS_CHANGED")) && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Nhóm kỹ năng của Job đã thay đổi. Hãy kiểm tra và lưu lại cấu hình trọng số trước khi sử dụng điểm.</p>}

      <div className="overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] shadow-sm">
        <div className="space-y-4 border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)] p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="relative xl:col-span-2"><span className="sr-only">Tìm ứng viên</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" aria-hidden="true" /><input className={`${input} pl-9`} value={state.search} onChange={(event) => state.filter({ search: event.target.value })} placeholder="Tìm theo tên ứng viên…" /></label>
            <RankingSelect ariaLabel="Nhóm đánh giá" value={state.cohort} onChange={(cohort) => state.filter({ cohort })} options={[{ value: "ALL", label: "Tất cả nhóm điểm" }, { value: "COMPLETE", label: "Đủ kết quả" }, ...cohorts.map((cohort) => ({ value: cohort, label: cohort.split("+").map((part) => labels[part]).join(" + ") }))]} />
            <RankingSelect ariaLabel="Trạng thái ứng viên" value={state.status} onChange={(status) => state.filter({ status })} options={[{ value: "ACTIVE", label: "Đang xét tuyển" }, { value: "ALL", label: "Tất cả trạng thái" }, ...["NEW", "IN_REVIEW", "ASSESSMENT", "INTERVIEW", "OFFER", "HIRED", "REJECTED", "WITHDRAWN"].map((status) => ({ value: status, label: labels[status] }))]} />
            <RankingSelect ariaLabel="Sắp xếp ứng viên" value={state.sort} onChange={(sort) => state.filter({ sort })} options={[{ value: "score", label: "Điểm rank cao nhất" }, ...["skills", "experience", "assessment", "interview"].map((part) => ({ value: part, label: `${labels[part]} cao nhất` }))]} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm text-[var(--color-on-surface-variant)]"><span>Điểm tối thiểu</span><input className="min-h-11 w-24 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm" type="number" inputMode="numeric" min={0} max={100} value={state.minimum} onChange={(event) => state.filter({ minimum: event.target.value })} placeholder="0" /></label><button className={button} onClick={() => state.filter({ search: "", cohort: "ALL", status: "ACTIVE", minimum: "", sort: "score" })}><FilterX className="size-4" aria-hidden="true" />Xóa bộ lọc</button></div>
        </div>

        <div className="grid gap-3 p-4 md:hidden">
          {filtered.map((row) => <CandidateCard key={row.applicationId} row={row} showRank={state.cohort !== "ALL"} onOpen={() => state.select(row.applicationId)} />)}
        </div>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1080px] border-collapse text-left text-sm">
          <caption className="sr-only">Điểm ứng viên cho {board.jobTitle}; thứ hạng chỉ so sánh trong cùng nhóm thành phần.</caption>
          <thead className="bg-[var(--color-surface-alt)] text-xs text-[var(--color-on-surface-variant)]"><tr>{["Hạng", "Ứng viên", "Điểm tổng", "CV Match", "Kinh nghiệm", "Assessment", "AI Interview", "Trạng thái", ""].map((title) => <th key={title || "actions"} scope="col" className="whitespace-nowrap border-b border-[var(--color-border-default)] px-4 py-3 font-semibold">{title}<span className={title ? "sr-only" : undefined}>{title ? "" : "Hành động"}</span></th>)}</tr></thead>
          <tbody>{filtered.map((row) => <tr key={row.applicationId} className={`border-t border-[var(--color-border-default)]/70 transition-colors hover:bg-[var(--color-primary-subtle)] ${row.rank === 1 ? "bg-[var(--color-primary-subtle)]" : ""}`}>
            <td className="px-4 py-4"><span className={`grid size-8 place-items-center rounded-full text-xs font-bold ${row.rank && row.rank <= 3 ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]" : "bg-[var(--color-surface-container-low)]"}`}>{state.cohort === "ALL" ? "—" : row.rank ?? "—"}</span></td>
            <td className="max-w-[280px] px-4 py-4"><div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary-hover)]">{row.candidateName.split(" ").slice(-2).map((part) => part[0]).join("")}</span><div className="min-w-0"><button onClick={() => state.select(row.applicationId)} className="block max-w-full truncate text-left font-semibold hover:text-[var(--color-primary)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]">{row.candidateName}</button><p className="mt-1 truncate text-xs text-[var(--color-on-surface-variant)]">Hồ sơ #{row.applicationId} · {row.experienceMonths === null ? "Chưa rõ kinh nghiệm" : `${(row.experienceMonths / 12).toFixed(1)} năm`}</p></div></div></td>
            <td className="px-4 py-4"><div className="flex items-center gap-2"><ScoreGauge score={row.result.score} /><div><p className="text-xs font-semibold text-[var(--color-primary-hover)]">{row.result.complete ? "Hoàn chỉnh" : "Tạm tính"}</p><p className="text-xs text-[var(--color-on-surface-variant)]">{row.result.availableWeight}% trọng số</p></div></div></td>
            <td className="px-4 py-4"><p className="font-semibold tabular-nums text-[var(--color-primary-hover)]">{scoreText(componentScore(row, "skills"))}<span className="font-normal text-[var(--color-outline)]"> / 100</span></p><div className="mt-2 h-1.5 w-20 overflow-hidden rounded-full bg-[var(--color-surface-container)]"><div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${componentScore(row, "skills") ?? 0}%` }} /></div></td>
            <td className="px-4 py-4 font-semibold tabular-nums">{scoreText(componentScore(row, "experience"))}<span className="font-normal text-[var(--color-outline)]"> / 100</span></td>
            {(["assessment", "interview"] as const).map((part) => <td key={part} className="px-4 py-4 font-semibold tabular-nums">{scoreText(componentScore(row, part))}<span className="font-normal text-[var(--color-outline)]"> / 100</span></td>)}
            <td className="px-4 py-4"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(row.status)}`}>{labels[row.status] ?? row.status}</span></td>
            <td className="px-4 py-4 text-right"><button className={detailAction} onClick={() => state.select(row.applicationId)}><Eye className="size-4" aria-hidden="true" />Xem chi tiết</button></td>
          </tr>)}</tbody>
        </table></div>
        {filtered.length === 0 && <div className="px-6 py-14 text-center"><FilterX className="mx-auto size-8 text-[var(--color-outline)]" aria-hidden="true" /><p className="mt-3 font-semibold">{board.rows.length === 0 ? "Job chưa có ứng viên" : "Không có ứng viên phù hợp bộ lọc"}</p></div>}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--color-surface-container-low)] px-5 py-4"><div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-on-surface-variant)]"><span>Hiển thị <strong className="text-[var(--color-on-surface)]">{board.page.totalElements === 0 ? 0 : page * pageSize + 1}–{Math.min((page + 1) * pageSize, board.page.totalElements)}</strong> trong <strong className="text-[var(--color-on-surface)]">{board.page.totalElements}</strong> ứng viên</span><span aria-hidden="true">•</span><div className="flex min-w-32 items-center gap-1.5"><span className="shrink-0">Số dòng:</span><RankingSelect compact ariaLabel="Số dòng mỗi trang" value={String(pageSize)} onChange={(value) => state.setPageSize(Number(value))} options={[20, 50, 100].map((size) => ({ value: String(size), label: String(size) }))} /></div><span className="rounded-md bg-[var(--color-surface-container)] px-2 py-1 font-mono">Snapshot: {board.rankingVersion}</span></div><div className="flex items-center gap-2"><button className={button} disabled={page === 0} onClick={() => state.setPage(page - 1)} aria-label="Trang trước"><ChevronLeft className="size-4" aria-hidden="true" /></button><span className="grid size-11 place-items-center rounded-lg bg-[var(--color-primary-container)] text-xs font-semibold text-[var(--color-on-primary)]">{page + 1}</span><span className="min-w-12 text-center text-xs text-[var(--color-on-surface-variant)]">/ {Math.max(1, board.page.totalPages)}</span><button className={button} disabled={page + 1 >= board.page.totalPages} onClick={() => state.setPage(page + 1)} aria-label="Trang sau"><ChevronRight className="size-4" aria-hidden="true" /></button></div></div>
      </div>
      {state.selectedId && <RankingDetail key={`${tenantKey}:${state.selectedId}`} applicationId={state.selectedId} previewRow={isPreview ? selected : undefined} jobTitle={board.jobTitle} tenantKey={tenantKey} onClose={() => state.select(null)} />}
    </>}
  </section>;
}
