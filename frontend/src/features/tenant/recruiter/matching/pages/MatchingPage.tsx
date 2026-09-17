import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, Award, BriefcaseBusiness, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, Code2, FilterX, Gauge, Radio, RefreshCw, Search, SlidersHorizontal, Sparkles, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { matchingApi } from "@/api/tenant/matchingApi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { getApiErrorMessage } from "@/lib/axios";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { RankingConfigForm } from "../components/RankingConfigForm";
import { RankingDetail } from "../components/RankingDetail";
import { PREVIEW_JOB_ID, rankingPreview } from "../data/rankingPreview";
import { button, input, labels, muted, primary, scoreText } from "../components/rankingUi";
import { useRankingStore } from "../stores/useRankingStore";
import type { RankingBoard, RankingRow } from "../types/ranking";
import type { ApiResponse } from "@/types/api";

const terminal = new Set(["REJECTED", "WITHDRAWN", "HIRED"]);
const pageSize = 20;
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
  return <article className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div><p className={muted}>{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p></div>
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><Icon className="size-5" aria-hidden="true" /></span>
    </div>
    <p className="mt-4 text-xs text-[var(--color-on-surface-variant)]">{helper}</p>
  </article>;
}

function statusTone(status: string) {
  if (status === "HIRED" || status === "OFFER") return "bg-emerald-50 text-emerald-700";
  if (status === "REJECTED" || status === "WITHDRAWN") return "bg-red-50 text-red-700";
  return "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]";
}

export function RankingPage() {
  const state = useRankingStore();
  const token = useAuthStore((store) => store.accessToken);
  const sessionKey = useMemo(() => crypto.randomUUID(), [token]);
  const tenantKey = `${getTenantIdFromWindow() ?? ""}:${sessionKey}`;
  const client = useQueryClient();
  const jobId = state.jobId;
  const isPreview = jobId === PREVIEW_JOB_ID;
  const jobs = useQuery({ queryKey: ["ranking-jobs", tenantKey], queryFn: matchingApi.jobs, enabled: !!token && !isPreview });
  const [previewUpdatedAt, setPreviewUpdatedAt] = useState(rankingPreview.calculatedAt);
  const [previewRefreshing, setPreviewRefreshing] = useState(false);
  const query = useQuery({ queryKey: ["rankings", tenantKey, jobId], queryFn: () => matchingApi.rankings(jobId!), enabled: jobId !== null && jobId !== PREVIEW_JOB_ID && !!token, refetchInterval: 30_000, refetchOnWindowFocus: true });
  const board = isPreview ? { ...rankingPreview, calculatedAt: previewUpdatedAt } : query.data?.data;
  const categories = board?.skillCategories ?? [];
  const groupMismatch = board && categories.length > 0 && [...Object.keys(board.config.groups)].sort().join("|") !== [...categories].sort().join("|");
  const formConfig = board && groupMismatch ? { ...board.config, groups: Object.fromEntries(categories.map((category, index) => [category, Math.floor(100 / categories.length) + (index < 100 % categories.length ? 1 : 0)])) } : board?.config;
  const saved = (value: RankingBoard) => client.setQueryData<ApiResponse<RankingBoard>>(["rankings", tenantKey, value.jobId], { success: true, message: "OK", data: value });
  const recompute = useMutation({ mutationFn: (id: number) => matchingApi.recompute(id), onSuccess: (response) => saved(response.data) });
  const refreshing = recompute.isPending || previewRefreshing;
  const refreshRanking = () => {
    if (!jobId) return;
    if (!isPreview) { recompute.mutate(jobId); return; }
    setPreviewRefreshing(true);
    window.setTimeout(() => { setPreviewUpdatedAt(new Date().toISOString()); setPreviewRefreshing(false); }, 650);
  };
  const cohorts = [...new Set(board?.rows.map((row) => row.result.cohort).filter(Boolean) ?? [])];
  const filtered = (board?.rows ?? []).filter((row) =>
    (state.cohort === "ALL" || (state.cohort === "COMPLETE" ? row.result.complete : row.result.cohort === state.cohort)) &&
    (state.status === "ALL" || (state.status === "ACTIVE" ? !terminal.has(row.status) : row.status === state.status)) &&
    row.candidateName.toLocaleLowerCase().includes(state.search.toLocaleLowerCase()) &&
    (state.minimum === "" || (row.result.score !== null && row.result.score >= Number(state.minimum))))
    .sort((a, b) => {
      const left = state.sort === "score" ? a.result.score : componentScore(a, state.sort);
      const right = state.sort === "score" ? b.result.score : componentScore(b, state.sort);
      return (right ?? -1) - (left ?? -1) || a.applicationId - b.applicationId;
    });
  const page = Math.min(state.page, Math.max(0, Math.ceil(filtered.length / pageSize) - 1));
  const selected = board?.rows.find((row) => row.applicationId === state.selectedId);
  const scored = board?.rows.filter((row) => row.result.score !== null) ?? [];
  const average = scored.length ? scored.reduce((sum, row) => sum + (row.result.score ?? 0), 0) / scored.length : null;
  const top = [...scored].sort((a, b) => (b.result.score ?? 0) - (a.result.score ?? 0))[0];

  const exportCsv = () => {
    if (!board) return;
    const rows = [["Rank", "Candidate", "Skills", "Experience", "Assessment", "AI Interview", "Overall", "Status"], ...filtered.map((row) => [row.rank ?? "", row.candidateName, componentScore(row, "skills") ?? "", componentScore(row, "experience") ?? "", componentScore(row, "assessment") ?? "", componentScore(row, "interview") ?? "", row.result.score ?? "", row.status])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `ranking-${board.jobId}.csv`; anchor.click(); URL.revokeObjectURL(url);
  };

  return <section className="rank-blue-theme min-w-0 space-y-6 rounded-3xl bg-[var(--color-surface)] pb-8 text-[var(--color-on-surface)]">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--color-on-surface-variant)]"><span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[var(--color-primary-hover)]">RANK-01</span><span>Candidate ranking</span><span aria-hidden="true">•</span><span>Snapshot {board?.rankingVersion ?? "chưa có"}</span></div>
        <h1 className="text-balance text-3xl font-semibold tracking-tight">{board?.jobTitle ?? "Bảng xếp hạng ứng viên"}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-on-surface-variant)]">So sánh ứng viên theo kỹ năng, kinh nghiệm, assessment và AI interview với bằng chứng có thể kiểm tra.</p>
      </div>
      <div className="flex flex-wrap gap-2"><button className={button} disabled={!board?.rows.length} onClick={exportCsv}><ArrowDownToLine className="size-4" aria-hidden="true" />Xuất CSV</button><button className={primary} disabled={!jobId || refreshing} onClick={refreshRanking}><RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />{refreshing ? "Đang tính lại…" : "Tính lại snapshot"}</button></div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--color-on-surface-variant)]"><span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-500" />Tự động làm mới mỗi 30 giây</span><span className="inline-flex items-center gap-2"><Clock3 className="size-4 text-[var(--color-primary)]" aria-hidden="true" />Snapshot: {board ? new Date(board.calculatedAt).toLocaleString("vi-VN") : "—"}</span></div>
      {(query.isFetching || previewRefreshing) && <span role="status" className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-primary)]"><RefreshCw className="size-3.5 animate-spin" aria-hidden="true" />Đang đồng bộ dữ liệu</span>}
    </div>

    {!token && <p role="status" className="rounded-xl border border-[var(--color-border-default)] bg-white p-5">Đăng nhập bằng tài khoản Recruiter để xem bảng xếp hạng.</p>}
    <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 shadow-sm">
      <label className="block max-w-2xl space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--color-on-surface-variant)]">Vị trí tuyển dụng</span><select className={input} value={jobId ?? ""} onChange={(event) => state.setJob(event.target.value ? Number(event.target.value) : null)} disabled={!isPreview && jobs.isPending}><option value="">Chọn Job để xem xếp hạng</option><option value={PREVIEW_JOB_ID}>{rankingPreview.jobTitle} · Dữ liệu mẫu</option>{jobs.data?.data.filter((job) => job.id !== PREVIEW_JOB_ID).map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></label>
      {!isPreview && jobs.isPending && token && <p role="status" className="mt-3 text-sm">Đang tải Job…</p>}
      {!isPreview && jobs.isError && <p role="alert" className="mt-3 text-sm">{getApiErrorMessage(jobs.error)} <button className={button} onClick={() => void jobs.refetch()}>Thử lại</button></p>}
      {!isPreview && jobs.isSuccess && jobs.data.data.length === 0 && <p className={`mt-3 ${muted}`}>Bạn chưa có Job được giao quyền quản lý.</p>}
    </div>

    {!jobId && <div className="rounded-xl border border-dashed border-[var(--color-outline-variant)] bg-white py-16 text-center"><BriefcaseBusiness className="mx-auto size-10 text-[var(--color-outline)]" aria-hidden="true" /><p className="mt-4 font-semibold">Chọn một Job để bắt đầu</p><p className={`mt-1 ${muted}`}>Điểm số, cấu hình và danh sách ứng viên sẽ xuất hiện tại đây.</p></div>}
    {jobId && !isPreview && token && query.isPending && <div className="rounded-xl border border-[var(--color-border-default)] bg-white p-8 text-center" role="status">Đang tải và tính điểm ứng viên…</div>}
    {jobId && !isPreview && query.isError && <div className="rounded-xl border border-[var(--color-border-default)] bg-white p-6" role="alert">{getApiErrorMessage(query.error)} <button className={button} onClick={() => void query.refetch()}>Thử lại</button></div>}
    {recompute.isError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{getApiErrorMessage(recompute.error)}</p>}

    {board && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard icon={Users} label="Tổng ứng viên" value={board.rows.length} helper={`${board.rows.filter((row) => !terminal.has(row.status)).length} hồ sơ đang xét tuyển`} /><StatCard icon={Gauge} label="Điểm trung bình" value={average === null ? "—" : scoreText(average)} helper={`${scored.length}/${board.rows.length} hồ sơ đã có điểm`} /><StatCard icon={Award} label="Ứng viên dẫn đầu" value={top ? scoreText(top.result.score) : "—"} helper={top?.candidateName ?? "Chưa đủ dữ liệu xếp hạng"} /><StatCard icon={Sparkles} label="Đủ kết quả" value={board.rows.filter((row) => row.result.complete).length} helper={`${board.rows.filter((row) => !row.result.complete).length} hồ sơ đang chờ bổ sung`} /></div>

      <details key={board.jobId} className="group rounded-xl border border-[var(--color-border-default)] bg-white shadow-sm" open={board.config.revision === 0 ? true : undefined}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"><span className="flex items-center gap-3 font-semibold"><span className="grid size-9 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><SlidersHorizontal className="size-4" aria-hidden="true" /></span>Cấu hình điểm và trọng số</span><span className="text-xs text-[var(--color-on-surface-variant)]">Revision {board.config.revision}</span></summary>
        <div className="border-t border-[var(--color-border-default)] p-5">{isPreview ? <><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{(["skills", "experience", "assessment", "interview"] as const).map((key) => <label key={key} className="space-y-2 text-sm"><span className="flex items-center justify-between"><span>{labels[key]}</span><strong className="text-[var(--color-primary-hover)]">{board.config.weights[key]}%</strong></span><input className="w-full accent-blue-600" type="range" min="0" max="100" value={board.config.weights[key]} readOnly /></label>)}</div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[var(--color-primary-subtle)] p-4 text-sm"><span className="text-[var(--color-on-surface-variant)]">Cấu hình giao diện mẫu · Tổng trọng số <strong className="text-[var(--color-on-surface)]">100%</strong></span><button type="button" className={primary}>Lưu cấu hình mẫu</button></div></> : formConfig && <RankingConfigForm key={`${board.jobId}:${board.config.revision}:${categories.join("|")}`} jobId={board.jobId} config={formConfig} onSaved={saved} />}</div>
      </details>

      <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-white px-5 py-4 shadow-sm xl:flex-row xl:items-center xl:justify-between"><div className="flex flex-wrap items-center gap-2"><span className="mr-1 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]"><SlidersHorizontal className="size-4" aria-hidden="true" />Trọng số đang dùng</span>{(["skills", "experience", "assessment", "interview"] as const).map((key) => <span key={key} className="rounded-md bg-[var(--color-surface-container-low)] px-2.5 py-1 text-xs">{labels[key]} <strong className="text-[var(--color-primary-hover)]">{board.config.weights[key]}%</strong></span>)}</div><span className="text-xs text-[var(--color-on-surface-variant)]">Kinh nghiệm yêu cầu: {board.config.requiredExperienceMonths} tháng</span></div>
      {board.rows.some((row) => row.notices.includes("JOB_SKILLS_CHANGED")) && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Nhóm kỹ năng của Job đã thay đổi. Hãy kiểm tra và lưu lại cấu hình trọng số trước khi sử dụng điểm.</p>}

      <div className="overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white shadow-sm">
        <div className="space-y-4 border-b border-[var(--color-border-default)] p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="relative xl:col-span-2"><span className="sr-only">Tìm ứng viên</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" aria-hidden="true" /><input className={`${input} pl-9`} value={state.search} onChange={(event) => state.filter({ search: event.target.value })} placeholder="Tìm theo tên ứng viên…" /></label>
            <label><span className="sr-only">Nhóm đánh giá</span><select className={input} value={state.cohort} onChange={(event) => state.filter({ cohort: event.target.value })}><option value="ALL">Tất cả nhóm điểm</option><option value="COMPLETE">Đủ kết quả</option>{cohorts.map((cohort) => <option key={cohort} value={cohort}>{cohort.split("+").map((part) => labels[part]).join(" + ")}</option>)}</select></label>
            <label><span className="sr-only">Trạng thái</span><select className={input} value={state.status} onChange={(event) => state.filter({ status: event.target.value })}><option value="ACTIVE">Đang xét tuyển</option><option value="ALL">Tất cả trạng thái</option>{["NEW", "IN_REVIEW", "ASSESSMENT", "INTERVIEW", "OFFER", "HIRED", "REJECTED", "WITHDRAWN"].map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select></label>
            <label><span className="sr-only">Sắp xếp</span><select className={input} value={state.sort} onChange={(event) => state.filter({ sort: event.target.value })}><option value="score">Điểm rank cao nhất</option>{["skills", "experience", "assessment", "interview"].map((part) => <option key={part} value={part}>{labels[part]} cao nhất</option>)}</select></label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm text-[var(--color-on-surface-variant)]"><span>Điểm tối thiểu</span><input className="w-24 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm" type="number" min={0} max={100} value={state.minimum} onChange={(event) => state.filter({ minimum: event.target.value })} placeholder="0" /></label><button className={button} onClick={() => state.filter({ search: "", cohort: "ALL", status: "ACTIVE", minimum: "", sort: "score" })}><FilterX className="size-4" aria-hidden="true" />Xóa bộ lọc</button></div>
        </div>

        <div className="overflow-x-auto"><table className="w-full min-w-[1320px] border-collapse text-left text-sm">
          <caption className="sr-only">Điểm ứng viên cho {board.jobTitle}; thứ hạng chỉ so sánh trong cùng nhóm thành phần.</caption>
          <thead className="bg-[var(--color-surface-container-low)] text-xs text-[var(--color-on-surface-variant)]"><tr><th className="w-12 px-4 py-3 text-center"><input type="checkbox" aria-label="Chọn tất cả ứng viên" className="size-4 accent-[var(--color-primary)]" /></th>{["Hạng", "Hồ sơ ứng viên", "Điểm tổng", "CV Match", "Assessment", "AI Interview", "Kinh nghiệm & ngôn ngữ", "Trạng thái", "Hành động"].map((title) => <th key={title} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">{title}</th>)}</tr></thead>
          <tbody>{filtered.slice(page * pageSize, (page + 1) * pageSize).map((row) => <tr key={row.applicationId} className={`border-t border-[var(--color-border-default)]/70 transition-colors hover:bg-[var(--color-primary-subtle)] ${row.rank === 1 ? "bg-[var(--color-primary-subtle)]" : ""}`}>
            <td className="px-4 py-4 text-center"><input type="checkbox" aria-label={`Chọn ${row.candidateName}`} defaultChecked={row.rank === 1} className="size-4 accent-[var(--color-primary)]" /></td>
            <td className="px-4 py-4"><span className={`grid size-8 place-items-center rounded-full text-xs font-bold ${row.rank && row.rank <= 3 ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]" : "bg-[var(--color-surface-container-low)]"}`}>{state.cohort === "ALL" ? "—" : row.rank ?? "—"}</span></td>
            <td className="max-w-[270px] px-4 py-4"><div className="flex items-center gap-3"><span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary-hover)]">{row.candidateName.split(" ").slice(-2).map((part) => part[0]).join("")}<span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-[var(--color-primary)]" /></span><div className="min-w-0"><button onClick={() => state.select(row.applicationId)} className="block max-w-full truncate text-left font-semibold hover:text-[var(--color-primary)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]">{row.candidateName}</button><p className="mt-1 truncate text-xs text-[var(--color-on-surface-variant)]">Java Backend Developer · Inbound #{row.applicationId}</p></div></div></td>
            <td className="px-4 py-4"><div className="flex items-center gap-2"><ScoreGauge score={row.result.score} /><div><p className="text-xs font-semibold text-[var(--color-primary-hover)]">{row.result.complete ? "Hoàn chỉnh" : "Tạm tính"}</p><p className="text-xs text-[var(--color-on-surface-variant)]">{row.result.availableWeight}% trọng số</p></div></div></td>
            <td className="px-4 py-4"><p className="font-semibold tabular-nums text-[var(--color-primary-hover)]">{scoreText(componentScore(row, "skills"))}%</p><div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-[var(--color-surface-container)]"><div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${componentScore(row, "skills") ?? 0}%` }} /></div><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">Java, Spring Boot, Kafka</p></td>
            {(["assessment", "interview"] as const).map((part) => <td key={part} className="px-4 py-4"><p className="font-semibold tabular-nums">{scoreText(componentScore(row, part))}<span className="font-normal text-[var(--color-outline)]"> / 100</span></p><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{part === "assessment" ? "Concurrency & Algorithm" : "System Architecture"}</p></td>)}
            <td className="px-4 py-4"><p className="font-medium">{row.experienceMonths === null ? "—" : `${(row.experienceMonths / 12).toFixed(1)} năm`}</p><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">Tiếng Anh chuyên nghiệp</p></td>
            <td className="px-4 py-4"><span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(row.status)}`}>{labels[row.status] ?? row.status}</span></td>
            <td className="px-4 py-4 text-right"><div className="flex items-center justify-end gap-1"><button className={row.rank === 1 ? primary : button} onClick={() => state.select(row.applicationId)}>Xem chi tiết</button><button className="grid size-9 place-items-center rounded-lg text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)]" title="Mời làm assessment" aria-label={`Mời ${row.candidateName} làm assessment`}><Code2 className="size-4" aria-hidden="true" /></button><button className="grid size-9 place-items-center rounded-lg text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)]" title="Đặt lịch phỏng vấn" aria-label={`Đặt lịch phỏng vấn ${row.candidateName}`}><CalendarDays className="size-4" aria-hidden="true" /></button></div></td>
          </tr>)}</tbody>
        </table></div>
        {filtered.length === 0 && <div className="px-6 py-14 text-center"><FilterX className="mx-auto size-8 text-[var(--color-outline)]" aria-hidden="true" /><p className="mt-3 font-semibold">{board.rows.length === 0 ? "Job chưa có ứng viên" : "Không có ứng viên phù hợp bộ lọc"}</p></div>}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--color-surface-container-low)] px-5 py-4"><div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-on-surface-variant)]"><span>Hiển thị <strong className="text-[var(--color-on-surface)]">{filtered.length === 0 ? 0 : page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)}</strong> trong <strong className="text-[var(--color-on-surface)]">{filtered.length}</strong> ứng viên</span><span aria-hidden="true">•</span><label className="flex items-center gap-1.5">Số dòng:<select className="rounded-md border-0 bg-white px-2 py-1 text-xs"><option>20</option><option>50</option><option>100</option></select></label><span className="rounded-md bg-[var(--color-surface-container)] px-2 py-1 font-mono">Snapshot: {board.rankingVersion}</span></div><div className="flex items-center gap-2"><button className={button} disabled={page === 0} onClick={() => state.setPage(page - 1)} aria-label="Trang trước"><ChevronLeft className="size-4" aria-hidden="true" /></button><span className="grid size-9 place-items-center rounded-lg bg-[var(--color-primary-container)] text-xs font-semibold text-white">{page + 1}</span><span className="min-w-12 text-center text-xs text-[var(--color-on-surface-variant)]">/ {Math.max(1, Math.ceil(filtered.length / pageSize))}</span><button className={button} disabled={(page + 1) * pageSize >= filtered.length} onClick={() => state.setPage(page + 1)} aria-label="Trang sau"><ChevronRight className="size-4" aria-hidden="true" /></button></div></div>
      </div>
      <details className="group overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white shadow-sm" open>
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 bg-[var(--color-surface-container-low)] px-5 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"><span className="flex items-center gap-2 text-sm font-semibold"><span className="relative grid size-7 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]"><Radio className="size-4" aria-hidden="true" /><span className="absolute right-0 top-0 size-2 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none" /></span>Event-driven Architecture Monitor <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[var(--color-primary-hover)]">Mock live feed</span></span><span className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)]">Channel: <strong className="font-mono text-[var(--color-on-surface)]">candidate.ranking.preview</strong><ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" /></span></summary>
        <div className="space-y-2 overflow-x-auto bg-[#2e3038] p-4 font-mono text-xs leading-5 text-[#eff0fa]">
          <p className="flex min-w-[720px] gap-3"><span className="text-slate-400">09:41:22.104</span><strong className="text-[#adc6ff]">[CV Parser]</strong><span>Đã hoàn tất phân tích hồ sơ ứng viên #105.</span></p>
          <p className="flex min-w-[720px] gap-3"><span className="text-slate-400">09:41:22.112</span><strong className="text-[#d3e4fe]">[Ranking Cache]</strong><span>Đã làm mới dữ liệu preview cho Java Backend Developer.</span></p>
          <p className="flex min-w-[720px] gap-3"><span className="text-slate-400">09:41:22.146</span><strong className="text-[#adc6ff]">[Rank Engine]</strong><span>Đã tính lại ma trận điểm của 5 ứng viên trong 42ms.</span></p>
          <p className="flex min-w-[720px] gap-3"><span className="text-slate-400">09:41:22.158</span><strong className="text-[#d3e4fe]">[UI Preview]</strong><span>Snapshot mới đã được phản ánh trên bảng xếp hạng.</span></p>
        </div>
      </details>
      {selected && <RankingDetail key={`${tenantKey}:${selected.applicationId}`} row={selected} tenantKey={tenantKey} preview={isPreview} onClose={() => state.select(null)} onSaved={saved} />}
    </>}
  </section>;
}
