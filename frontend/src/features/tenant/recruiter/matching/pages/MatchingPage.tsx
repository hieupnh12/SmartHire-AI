import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, ChevronLeft, ChevronRight, Eye, FilterX, Gauge, Search, SlidersHorizontal, Sparkles, Users } from "lucide-react";
import { useDeferredValue, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { matchingApi } from "@/api/tenant/matchingApi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { getApiErrorMessage } from "@/lib/axios";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { LoadingState, Skeleton } from "@/components/ux/Skeleton";
import { createRankingSocket } from "@/lib/ws";
import { RankingDetail } from "../components/RankingDetail";
import { RankingSelect } from "../components/RankingSelect";
import { PREVIEW_JOB_ID, rankingPreview } from "../data/rankingPreview";
import { button, detailAction, input, labels, primary, scoreText } from "../components/rankingUi";
import { useRankingStore } from "../stores/useRankingStore";
import type { RankingPage, RankingRow } from "../types/ranking";

const terminal = new Set(["REJECTED", "WITHDRAWN", "HIRED"]);
const componentScore = (row: RankingRow, key: string) => row.result.components.find((part) => part.key === key)?.score ?? null;

function RankingLoadingState() {
  return <LoadingState label="Đang tải và tính điểm ứng viên" className="grid items-start gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
    <aside className="rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm xl:min-h-[calc(100dvh-10rem)]"><div className="flex items-center gap-3 border-b border-[var(--color-border-default)] pb-4"><Skeleton className="size-9 rounded-xl" /><div className="flex-1"><Skeleton className="h-4 w-40" /><Skeleton className="mt-2 h-3 w-52 max-w-full" /></div></div><div className="mt-5 space-y-5">{Array.from({ length: 4 }, (_, index) => <div key={index}><div className="flex justify-between"><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-10" /></div><Skeleton className="mt-2 h-2 w-full rounded-full" /></div>)}<Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div></aside>
    <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="rounded-xl border border-[var(--color-border-default)] bg-white p-3.5"><div className="flex justify-between"><div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-7 w-16" /></div><Skeleton className="size-9 rounded-lg" /></div><Skeleton className="mt-3 h-3 w-3/4" /></div>)}</div><div className="overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white"><div className="grid grid-cols-6 gap-4 bg-[var(--color-surface-alt)] px-4 py-3">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-3 w-3/4" />)}</div>{Array.from({ length: 7 }, (_, row) => <div key={row} className="grid grid-cols-6 gap-4 border-t border-[var(--color-border-default)] px-4 py-4">{Array.from({ length: 6 }, (_, column) => <Skeleton key={column} className={column === 1 ? "h-5 w-full" : "h-5 w-2/3"} />)}</div>)}</div></div>
  </LoadingState>;
}

function ScoreGauge({ score }: { score: number | null }) {
  const value = Math.max(0, Math.min(100, score ?? 0));
  const circumference = 2 * Math.PI * 18;
  return <div className="relative grid size-10 shrink-0 place-items-center" aria-label={score === null ? "Chưa có điểm" : `Điểm ${scoreText(score)} trên 100`}>
    <svg viewBox="0 0 44 44" className="size-10 -rotate-90" aria-hidden="true">
      <circle cx="22" cy="22" r="18" fill="none" stroke="var(--color-surface-container)" strokeWidth="3.5" />
      <circle cx="22" cy="22" r="18" fill="none" stroke="var(--color-primary)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} />
    </svg>
    <span className="absolute text-[11px] font-bold tabular-nums">{score === null ? "—" : scoreText(score)}</span>
  </div>;
}

function StatCard({ icon: Icon, label, value, helper }: { icon: typeof Users; label: string; value: string | number; helper: string }) {
  return <article className="group relative overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-3.5 shadow-sm transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none hover:border-[var(--color-primary)] hover:shadow-md">
    <span className="absolute inset-x-0 top-0 h-1 bg-[var(--color-primary)] opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none" aria-hidden="true" />
    <div className="flex items-start justify-between gap-4">
      <div><p className="text-[11px] font-medium text-[var(--color-on-surface-variant)]">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p></div>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)] transition-colors duration-200 group-hover:bg-[var(--color-primary)] group-hover:text-[var(--color-on-primary)] motion-reduce:transition-none"><Icon className="size-4" aria-hidden="true" /></span>
    </div>
    <p className="mt-2 truncate text-[11px] text-[var(--color-on-surface-variant)]" title={helper}>{helper}</p>
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
  const rankingQuery = { page: state.page, size: pageSize, search: deferredSearch, status: state.status, cohort: state.cohort, minScore: state.minimum === "" ? undefined : Number(state.minimum), sort: state.sort };
  const query = useQuery({ queryKey: ["rankings", tenantKey, jobId, rankingQuery], queryFn: () => matchingApi.rankings(jobId, rankingQuery), enabled: validJobId && jobId !== PREVIEW_JOB_ID && !!token, refetchInterval: 30_000, refetchOnWindowFocus: true });
  const previewRows = rankingPreview.rows.filter((row) => !terminal.has(row.status));
  const previewBoard: RankingPage = { ...rankingPreview, cohorts: [...new Set(rankingPreview.rows.map((row) => row.result.cohort))], summary: { totalCandidates: rankingPreview.rows.length, activeCandidates: previewRows.length, scoredCandidates: rankingPreview.rows.length, averageScore: rankingPreview.rows.reduce((sum, row) => sum + (row.result.score ?? 0), 0) / rankingPreview.rows.length, topCandidateName: rankingPreview.rows[0]?.candidateName ?? null, topScore: rankingPreview.rows[0]?.result.score ?? null, completeCandidates: rankingPreview.rows.filter((row) => row.result.complete).length }, page: { number: 0, size: pageSize, totalElements: rankingPreview.rows.length, totalPages: 1 } };
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
  const cohorts = board?.cohorts ?? [];
  const filtered = board?.rows ?? [];
  const page = board?.page.number ?? 0;
  const selected = board?.rows.find((row) => row.applicationId === state.selectedId);
  const summary = board?.summary;
  return <section className="min-w-0 space-y-4 bg-[var(--color-surface)] py-4 text-[var(--color-on-surface)] sm:py-6 xl:h-full xl:overflow-y-auto xl:overscroll-contain">

    {!token && <p role="status" className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5">Đăng nhập bằng tài khoản Recruiter để xem bảng xếp hạng.</p>}
    {!validJobId && <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700" role="alert">Đường dẫn công việc không hợp lệ. <Link className="font-semibold underline" to="/recruiter/jobs">Quay lại danh sách công việc</Link></div>}
    {jobId && !isPreview && token && query.isPending && <RankingLoadingState />}
    {jobId && !isPreview && query.isError && <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-6" role="alert">{getApiErrorMessage(query.error)} <button className={button} onClick={() => void query.refetch()}>Thử lại</button></div>}

    {board && <>
      <div className="grid items-start gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="order-2 grid gap-3 sm:grid-cols-2 xl:col-start-2 xl:row-start-1 xl:grid-cols-4"><StatCard icon={Users} label="Tổng ứng viên" value={summary?.totalCandidates ?? 0} helper={`${summary?.activeCandidates ?? 0} hồ sơ đang xét tuyển`} /><StatCard icon={Gauge} label="Điểm trung bình" value={summary?.averageScore == null ? "—" : scoreText(summary.averageScore)} helper={`${summary?.scoredCandidates ?? 0}/${summary?.totalCandidates ?? 0} hồ sơ đã có điểm`} /><StatCard icon={Award} label="Ứng viên dẫn đầu" value={summary?.topScore == null ? "—" : scoreText(summary.topScore)} helper={summary?.topCandidateName ?? "Chưa đủ dữ liệu xếp hạng"} /><StatCard icon={Sparkles} label="Đủ kết quả" value={summary?.completeCandidates ?? 0} helper={`${(summary?.totalCandidates ?? 0) - (summary?.completeCandidates ?? 0)} hồ sơ đang chờ bổ sung`} /></div>

      <aside key={board.jobId} className="order-1 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] shadow-sm xl:fixed xl:bottom-0 xl:left-0 xl:top-[7.5rem] xl:z-30 xl:col-start-1 xl:row-start-1 xl:flex xl:w-[360px] xl:flex-col xl:overflow-hidden xl:rounded-none" aria-label="Cấu hình xếp hạng và bộ lọc">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border-default)] bg-white px-4 py-3"><span className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><SlidersHorizontal className="size-4" aria-hidden="true" /></span><span className="min-w-0"><strong className="block truncate text-sm">Cấu hình điểm và trọng số</strong><span className="mt-0.5 block text-[11px] text-[var(--color-on-surface-variant)]">Chỉ hiển thị · áp dụng toàn bộ ứng viên</span></span></span><span className="shrink-0 rounded-full bg-[var(--color-surface-container-low)] px-2 py-1 text-[10px] font-semibold text-[var(--color-on-surface-variant)]">R{board.config.revision}</span></header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 [scrollbar-width:thin]">
          <section><div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-semibold uppercase tracking-[0.04em] text-[var(--color-on-surface-variant)]">Trọng số thành phần</h3><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">100%</span></div><div className="grid grid-cols-2 gap-2">{(["skills", "experience", "assessment", "interview"] as const).map((key) => <div key={key} className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] p-2.5"><div className="flex items-center justify-between gap-2 text-xs"><span className="truncate text-[var(--color-on-surface-variant)]">{labels[key]}</span><strong className="tabular-nums text-[var(--color-primary-hover)]">{board.config.weights[key]}%</strong></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-container)]"><div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${board.config.weights[key]}%` }} /></div></div>)}</div></section>
          {Object.keys(board.config.groups).length > 0 && <section><h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.04em] text-[var(--color-on-surface-variant)]">Nhóm kỹ năng</h3><div className="flex flex-wrap gap-2">{Object.entries(board.config.groups).map(([key, value]) => <span key={key} className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary-hover)]">{labels[key] ?? key} <strong>{value}%</strong></span>)}</div></section>}
          <div className="flex items-center justify-between rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-3 py-2 text-xs"><span className="text-[var(--color-on-surface-variant)]">Kinh nghiệm yêu cầu</span><strong>{board.config.requiredExperienceMonths} tháng</strong></div>
          <section className="space-y-3 border-t border-[var(--color-border-default)] pt-4"><div><h3 className="text-sm font-semibold">Tìm kiếm và bộ lọc</h3><p className="mt-0.5 text-[11px] text-[var(--color-on-surface-variant)]">Lọc kết quả trong công việc này.</p></div>
            <label className="block space-y-1.5 text-xs font-medium"><span>Tìm ứng viên</span><span className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" aria-hidden="true" /><input className={`${input} bg-white pl-9`} value={state.search} onChange={(event) => state.filter({ search: event.target.value })} placeholder="Tên ứng viên…" /></span></label>
            <label className="block space-y-1.5 text-xs font-medium"><span>Nhóm đánh giá</span><RankingSelect ariaLabel="Nhóm đánh giá" value={state.cohort} onChange={(cohort) => state.filter({ cohort })} options={[{ value: "ALL", label: "Tất cả nhóm điểm" }, { value: "COMPLETE", label: "Đủ kết quả" }, ...cohorts.map((cohort) => ({ value: cohort, label: cohort.split("+").map((part) => labels[part]).join(" + ") }))]} /></label>
            <label className="block space-y-1.5 text-xs font-medium"><span>Trạng thái</span><RankingSelect ariaLabel="Trạng thái ứng viên" value={state.status} onChange={(status) => state.filter({ status })} options={[{ value: "ACTIVE", label: "Đang xét tuyển" }, { value: "ALL", label: "Tất cả trạng thái" }, ...["NEW", "IN_REVIEW", "ASSESSMENT", "INTERVIEW", "OFFER", "HIRED", "REJECTED", "WITHDRAWN"].map((status) => ({ value: status, label: labels[status] }))]} /></label>
            <label className="block space-y-1.5 text-xs font-medium"><span>Sắp xếp</span><RankingSelect ariaLabel="Sắp xếp ứng viên" value={state.sort} onChange={(sort) => state.filter({ sort })} options={[{ value: "score", label: "Điểm rank cao nhất" }, ...["skills", "experience", "assessment", "interview"].map((part) => ({ value: part, label: `${labels[part]} cao nhất` }))]} /></label>
            <label className="block space-y-1.5 text-xs font-medium"><span>Điểm tối thiểu</span><input className={`${input} bg-white`} type="number" inputMode="numeric" min={0} max={100} value={state.minimum} onChange={(event) => state.filter({ minimum: event.target.value })} placeholder="0" /></label>
            <button className={`${button} w-full`} onClick={() => state.filter({ search: "", cohort: "ALL", status: "ACTIVE", minimum: "", sort: "score" })}><FilterX className="size-4" aria-hidden="true" />Xóa bộ lọc</button>
          </section>
        </div>
      </aside>

      {board.rows.some((row) => row.notices.includes("JOB_SKILLS_CHANGED")) && <p role="alert" className="order-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 xl:col-start-2">Nhóm kỹ năng của Job đã thay đổi. Hãy kiểm tra và lưu lại cấu hình trọng số trước khi sử dụng điểm.</p>}

      <div className="order-2 overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] shadow-sm xl:col-start-2">
        <div className="grid gap-3 p-4 md:hidden">
          {filtered.map((row) => <CandidateCard key={row.applicationId} row={row} showRank={state.cohort !== "ALL"} onOpen={() => state.select(row.applicationId)} />)}
        </div>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1080px] border-collapse text-left text-sm">
          <caption className="sr-only">Điểm ứng viên cho {board.jobTitle}; thứ hạng chỉ so sánh trong cùng nhóm thành phần.</caption>
          <thead className="bg-[var(--color-surface-alt)] text-[11px] text-[var(--color-on-surface-variant)]"><tr>{["Hạng", "Ứng viên", "Điểm tổng", "CV Match", "Kinh nghiệm", "Assessment", "AI Interview", "Trạng thái", ""].map((title) => <th key={title || "actions"} scope="col" className="whitespace-nowrap border-b border-[var(--color-border-default)] px-3 py-2.5 font-semibold">{title}<span className={title ? "sr-only" : undefined}>{title ? "" : "Hành động"}</span></th>)}</tr></thead>
          <tbody>{filtered.map((row) => <tr key={row.applicationId} className={`border-t border-[var(--color-border-default)]/70 transition-colors hover:bg-[var(--color-primary-subtle)] ${row.rank === 1 ? "bg-[var(--color-primary-subtle)]" : ""}`}>
            <td className="px-3 py-3"><span className={`grid size-7 place-items-center rounded-full text-[11px] font-bold ${row.rank && row.rank <= 3 ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]" : "bg-[var(--color-surface-container-low)]"}`}>{state.cohort === "ALL" ? "—" : row.rank ?? "—"}</span></td>
            <td className="max-w-[240px] px-3 py-3"><div className="flex items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[10px] font-bold text-[var(--color-primary-hover)]">{row.candidateName.split(" ").slice(-2).map((part) => part[0]).join("")}</span><div className="min-w-0"><button onClick={() => state.select(row.applicationId)} className="block max-w-full truncate text-left text-xs font-semibold hover:text-[var(--color-primary)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]">{row.candidateName}</button><p className="mt-0.5 truncate text-[10px] text-[var(--color-on-surface-variant)]">Hồ sơ #{row.applicationId} · {row.experienceMonths === null ? "Chưa rõ kinh nghiệm" : `${(row.experienceMonths / 12).toFixed(1)} năm`}</p></div></div></td>
            <td className="px-3 py-3"><div className="flex items-center gap-2"><ScoreGauge score={row.result.score} /><div><p className="text-[11px] font-semibold text-[var(--color-primary-hover)]">{row.result.complete ? "Hoàn chỉnh" : "Tạm tính"}</p><p className="text-[10px] text-[var(--color-on-surface-variant)]">{row.result.availableWeight}% trọng số</p></div></div></td>
            <td className="px-3 py-3 text-xs"><p className="font-semibold tabular-nums text-[var(--color-primary-hover)]">{scoreText(componentScore(row, "skills"))}<span className="font-normal text-[var(--color-outline)]"> / 100</span></p><div className="mt-1.5 h-1 w-16 overflow-hidden rounded-full bg-[var(--color-surface-container)]"><div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${componentScore(row, "skills") ?? 0}%` }} /></div></td>
            <td className="px-3 py-3 text-xs font-semibold tabular-nums">{scoreText(componentScore(row, "experience"))}<span className="font-normal text-[var(--color-outline)]"> / 100</span></td>
            {(["assessment", "interview"] as const).map((part) => <td key={part} className="px-3 py-3 text-xs font-semibold tabular-nums">{scoreText(componentScore(row, part))}<span className="font-normal text-[var(--color-outline)]"> / 100</span></td>)}
            <td className="px-3 py-3"><span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone(row.status)}`}>{labels[row.status] ?? row.status}</span></td>
            <td className="px-3 py-3 text-right"><button className={detailAction} onClick={() => state.select(row.applicationId)}><Eye className="size-3.5" aria-hidden="true" />Xem chi tiết</button></td>
          </tr>)}</tbody>
        </table></div>
        {filtered.length === 0 && <div className="px-6 py-14 text-center"><FilterX className="mx-auto size-8 text-[var(--color-outline)]" aria-hidden="true" /><p className="mt-3 font-semibold">{board.rows.length === 0 ? "Job chưa có ứng viên" : "Không có ứng viên phù hợp bộ lọc"}</p></div>}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--color-surface-container-low)] px-5 py-4"><div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-on-surface-variant)]"><span>Hiển thị <strong className="text-[var(--color-on-surface)]">{board.page.totalElements === 0 ? 0 : page * pageSize + 1}–{Math.min((page + 1) * pageSize, board.page.totalElements)}</strong> trong <strong className="text-[var(--color-on-surface)]">{board.page.totalElements}</strong> ứng viên</span><span aria-hidden="true">•</span><div className="flex min-w-32 items-center gap-1.5"><span className="shrink-0">Số dòng:</span><RankingSelect compact ariaLabel="Số dòng mỗi trang" value={String(pageSize)} onChange={(value) => state.setPageSize(Number(value))} options={[20, 50, 100].map((size) => ({ value: String(size), label: String(size) }))} /></div><span className="rounded-md bg-[var(--color-surface-container)] px-2 py-1 font-mono">Snapshot: {board.rankingVersion}</span></div><div className="flex items-center gap-2"><button className={button} disabled={page === 0} onClick={() => state.setPage(page - 1)} aria-label="Trang trước"><ChevronLeft className="size-4" aria-hidden="true" /></button><span className="grid size-11 place-items-center rounded-lg bg-[var(--color-primary-container)] text-xs font-semibold text-[var(--color-on-primary)]">{page + 1}</span><span className="min-w-12 text-center text-xs text-[var(--color-on-surface-variant)]">/ {Math.max(1, board.page.totalPages)}</span><button className={button} disabled={page + 1 >= board.page.totalPages} onClick={() => state.setPage(page + 1)} aria-label="Trang sau"><ChevronRight className="size-4" aria-hidden="true" /></button></div></div>
      </div>
      </div>
      {state.selectedId && <RankingDetail key={`${tenantKey}:${state.selectedId}`} applicationId={state.selectedId} previewRow={isPreview ? selected : undefined} fallbackRow={!isPreview ? selected : undefined} jobId={board.jobId} jobTitle={board.jobTitle} tenantKey={tenantKey} onClose={() => state.select(null)} />}
    </>}
  </section>;
}
