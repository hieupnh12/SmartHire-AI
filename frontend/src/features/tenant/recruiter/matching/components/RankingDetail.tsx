import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Award, BriefcaseBusiness, CalendarDays, Check, CircleAlert, Code2, Download, FileSearch, Lightbulb, MessageSquareText, Sparkles, Target, X } from "lucide-react";
import { matchingApi } from "@/api/tenant/matchingApi";
import { getApiErrorMessage } from "@/lib/axios";
import type { RankingBoard, RankingRow } from "../types/ranking";
import { button, labels, muted, primary, scoreText } from "./rankingUi";

const section = "rounded-xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm";

function OverallGauge({ value }: { value: number | null }) {
  const score = Math.max(0, Math.min(100, value ?? 0));
  const circumference = 2 * Math.PI * 42;
  return <div className="relative grid size-28 shrink-0 place-items-center" aria-label={value === null ? "Chưa có điểm tổng" : `Điểm tổng ${scoreText(value)} trên 100`}>
    <svg viewBox="0 0 100 100" className="size-28 -rotate-90" aria-hidden="true">
      <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-surface-container)" strokeWidth="8" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-primary)" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - score / 100)} />
    </svg>
    <span className="absolute text-center"><strong className="block text-xl tabular-nums">{scoreText(value)}</strong><span className="text-[11px] text-[var(--color-on-surface-variant)]">/ 100</span></span>
  </div>;
}

function ComponentBreakdown({ row }: { row: RankingRow }) {
  return <section className={section} aria-labelledby="breakdown-title">
    <header className="mb-5 flex items-start justify-between gap-4">
      <div><h3 id="breakdown-title" className="flex items-center gap-2 text-lg font-semibold"><Target className="size-5 text-[var(--color-primary)]" aria-hidden="true" />Phân tích điểm đa chiều</h3><p className={muted}>Điểm và mức đóng góp của từng tín hiệu đánh giá.</p></div>
      <span className="text-xs text-[var(--color-on-surface-variant)]">Thang điểm 0–100</span>
    </header>
    <div className="space-y-5">{row.result.components.map((part) => <div key={part.key}>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="font-medium">{labels[part.key]}</span><strong className="tabular-nums">{scoreText(part.score)} <span className="font-normal text-[var(--color-on-surface-variant)]">/ 100</span></strong></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-container)]"><div className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${Math.max(0, Math.min(100, part.score ?? 0))}%` }} /></div>
      <div className="mt-1.5 flex justify-between gap-4 text-xs text-[var(--color-on-surface-variant)]"><span>{labels[part.state] ?? part.state}</span><span className="font-semibold text-[var(--color-primary-hover)]">Trọng số {part.weight}%</span></div>
    </div>)}</div>
  </section>;
}

function FormulaTable({ row }: { row: RankingRow }) {
  return <section className={section} aria-labelledby="formula-title">
    <header className="mb-4"><h3 id="formula-title" className="flex items-center gap-2 text-lg font-semibold"><Code2 className="size-5 text-[var(--color-primary)]" aria-hidden="true" />Công thức trọng số minh bạch</h3><p className={muted}>Điểm tổng được tổng hợp xác định, không cộng lại các giá trị đã làm tròn.</p></header>
    <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-[var(--color-surface-container-low)] text-xs text-[var(--color-on-surface-variant)]"><tr><th className="rounded-l-lg px-3 py-2.5">Thành phần</th><th className="px-3 py-2.5 text-center">Điểm gốc</th><th className="px-3 py-2.5 text-center">Trọng số</th><th className="rounded-r-lg px-3 py-2.5 text-right">Đóng góp</th></tr></thead>
      <tbody>{row.result.components.map((part) => <tr key={part.key} className="hover:bg-[var(--color-primary-subtle)]"><td className="px-3 py-2.5 font-medium">{labels[part.key]}</td><td className="px-3 py-2.5 text-center font-mono">{scoreText(part.score)}</td><td className="px-3 py-2.5 text-center font-mono text-[var(--color-on-surface-variant)]">{part.weight}%</td><td className="px-3 py-2.5 text-right font-mono font-semibold text-[var(--color-primary-hover)]">{scoreText(part.contribution)}</td></tr>)}</tbody>
      <tfoot><tr className="bg-[var(--color-surface-container-low)] font-semibold"><td className="rounded-l-lg px-3 py-3">Chỉ số xếp hạng tổng</td><td className="px-3 py-3 text-center">—</td><td className="px-3 py-3 text-center">100%</td><td className="rounded-r-lg px-3 py-3 text-right text-lg text-[var(--color-primary-hover)]">{scoreText(row.result.score)}</td></tr></tfoot>
    </table></div>
  </section>;
}

function SkillEvidence({ row }: { row: RankingRow }) {
  return <section className={section} aria-labelledby="skills-title">
    <header className="mb-4"><h3 id="skills-title" className="flex items-center gap-2 text-lg font-semibold"><FileSearch className="size-5 text-[var(--color-primary)]" aria-hidden="true" />Đối chiếu kỹ năng và CV</h3><p className={muted}>Bằng chứng dùng để giải thích điểm kỹ năng.</p></header>
    <div className="space-y-4">{row.groups.map((group) => <div key={group.category} className="rounded-lg bg-[var(--color-surface-alt)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><strong>{labels[group.category] ?? group.category}</strong><span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-primary-hover)]">{scoreText(group.score)}/100 · Bao phủ {scoreText(group.coverage)}%</span></div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">{group.matches.map((match) => <li key={match.requiredSkill} className="rounded-lg border border-[var(--color-border-default)] bg-white p-3 text-sm"><p className="flex items-center gap-2 font-semibold"><Check className="size-4 text-emerald-600" aria-hidden="true" />{match.requiredSkill}</p><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{match.evidence ?? "Chưa có đoạn trích bằng chứng"}</p></li>)}</ul>
    </div>)}</div>
    {row.missingRequired.length > 0 && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><strong>Kỹ năng còn thiếu:</strong> {row.missingRequired.join(", ")}</div>}
  </section>;
}

function InsightPanel({ row, preview }: { row: RankingRow; preview: boolean }) {
  return <section className={`${section} relative overflow-hidden`} aria-labelledby="insight-title">
    <div className="absolute -right-12 -top-12 size-40 rounded-full bg-[var(--color-primary-soft)] blur-3xl" aria-hidden="true" />
    <header className="relative flex items-start justify-between gap-3"><div><h3 id="insight-title" className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="size-5 text-[var(--color-primary)]" aria-hidden="true" />Trợ lý phân tích Rank</h3><p className={muted}>Tóm tắt hỗ trợ recruiter ra quyết định.</p></div>{preview && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Dữ liệu mẫu</span>}</header>
    <div className="relative mt-4 rounded-xl bg-[var(--color-primary-subtle)] p-4"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-primary-hover)]">Đề xuất · {scoreText(row.result.score)}/100</p><p className="mt-1 text-lg font-semibold">Phù hợp tốt · Nên chuyển vòng kỹ thuật</p><p className="mt-2 text-sm leading-6 text-[var(--color-on-surface-variant)]">Ứng viên có nền tảng kỹ thuật đồng đều, mức bao phủ kỹ năng tốt và kết quả phỏng vấn tích cực.</p></div>
    <div className="mt-5"><h4 className="flex items-center gap-2 text-sm font-semibold"><Award className="size-4 text-[var(--color-primary)]" aria-hidden="true" />Điểm mạnh nổi bật</h4><ul className="mt-3 space-y-2 text-sm text-[var(--color-on-surface-variant)]"><li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />Kỹ năng cốt lõi phù hợp trực tiếp với yêu cầu Job.</li><li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />Kết quả assessment và interview ổn định.</li></ul></div>
    <div className="mt-5"><h4 className="flex items-center gap-2 text-sm font-semibold"><CircleAlert className="size-4 text-amber-600" aria-hidden="true" />Điểm cần xác minh</h4><p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-800">Xác minh thêm mức độ trực tiếp tham gia thiết kế hạ tầng và xử lý sự cố production.</p></div>
    <div className="mt-5"><h4 className="flex items-center gap-2 text-sm font-semibold"><Lightbulb className="size-4 text-[var(--color-primary)]" aria-hidden="true" />Câu hỏi gợi ý</h4><ol className="mt-3 space-y-2 text-sm text-[var(--color-on-surface-variant)]"><li>1. Bạn xử lý idempotency trong hệ thống thanh toán như thế nào?</li><li>2. Hãy mô tả một quyết định kiến trúc bạn từng phải đánh đổi.</li></ol></div>
  </section>;
}

function Timeline({ row }: { row: RankingRow }) {
  const steps = ["Đã tiếp nhận hồ sơ", "CV đã được phân tích", "Assessment đã chấm", "AI Interview đã đánh giá", labels[row.status] ?? row.status];
  return <section className={section} aria-labelledby="timeline-title"><header className="mb-4"><h3 id="timeline-title" className="flex items-center gap-2 text-lg font-semibold"><BriefcaseBusiness className="size-5 text-[var(--color-primary)]" aria-hidden="true" />Hành trình ứng tuyển</h3><p className={muted}>Các mốc dữ liệu tạo nên kết quả xếp hạng hiện tại.</p></header>
    <ol className="relative ml-2 border-l border-[var(--color-outline-variant)]">{steps.map((step, index) => <li key={`${step}-${index}`} className="relative pb-5 pl-6 last:pb-0"><span className="absolute -left-2 top-0 grid size-4 place-items-center rounded-full bg-[var(--color-primary)] ring-4 ring-white"><Check className="size-2.5 text-white" aria-hidden="true" /></span><p className="text-sm font-semibold">{step}</p><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">Dữ liệu đã được đưa vào snapshot xếp hạng.</p></li>)}</ol>
  </section>;
}

export function RankingDetail({ row, tenantKey, preview = false, onClose }: {
  row: RankingRow; tenantKey: string; preview?: boolean; onClose: () => void; onSaved: (board: RankingBoard) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  const sources = useQuery({ queryKey: ["ranking-sources", tenantKey, row.applicationId], queryFn: () => matchingApi.sources(row.applicationId), enabled: !preview });
  return <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); onClose(); }} aria-labelledby="ranking-detail-title" className="rank-blue-theme fixed inset-0 m-auto h-[calc(100dvh-24px)] w-[calc(100%-24px)] max-w-7xl overflow-y-auto rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface)] p-0 text-[var(--color-on-surface)] shadow-2xl backdrop:bg-slate-900/45 backdrop:backdrop-blur-sm">
    <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[var(--color-border-default)] bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6">
      <button className={button} onClick={onClose} autoFocus><ArrowLeft className="size-4" aria-hidden="true" />Quay lại bảng Rank</button>
      <div className="flex items-center gap-2"><span className="hidden rounded-full bg-[var(--color-surface-container-low)] px-3 py-1 text-xs text-[var(--color-on-surface-variant)] sm:inline">Hồ sơ #{row.applicationId}</span><button className="grid size-10 place-items-center rounded-lg text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" onClick={onClose} aria-label="Đóng chi tiết ứng viên"><X className="size-5" aria-hidden="true" /></button></div>
    </div>

    <div className="space-y-6 p-4 sm:p-6">
      <section className="relative overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm">
        <div className="absolute -right-20 -top-20 size-64 rounded-full bg-[var(--color-primary-soft)] blur-3xl" aria-hidden="true" />
        <div className="relative grid gap-6 xl:grid-cols-12 xl:items-center">
          <div className="flex min-w-0 items-center gap-4 xl:col-span-5"><div className="relative grid size-20 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-2xl font-semibold text-[var(--color-primary-hover)]">{row.candidateName.split(" ").slice(-2).map((part) => part[0]).join("")}<span className="absolute -bottom-2 -right-2 rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-xs font-bold text-white">#{row.rank ?? "—"}</span></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 id="ranking-detail-title" className="truncate text-2xl font-semibold">{row.candidateName}</h2><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Đã sàng lọc</span></div><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Java Backend Developer · {row.experienceMonths ?? "—"} tháng kinh nghiệm liên quan</p><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-md bg-[var(--color-surface-container-low)] px-2.5 py-1 text-xs">Application #{row.applicationId}</span><span className="rounded-md bg-[var(--color-surface-container-low)] px-2.5 py-1 text-xs">{labels[row.status] ?? row.status}</span></div></div></div>
          <div className="flex items-center justify-center gap-4 rounded-xl bg-[var(--color-surface-container-low)] p-4 xl:col-span-3"><OverallGauge value={row.result.score} /><div><p className="flex items-center gap-1 text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-primary-hover)]"><Sparkles className="size-4" aria-hidden="true" />Điểm tổng</p><p className="mt-2 text-sm font-semibold">Hạng #{row.rank ?? "—"}</p><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{row.result.complete ? "Đủ thành phần" : "Điểm tạm tính"}</p></div></div>
          <div className="xl:col-span-4"><div className="flex flex-wrap gap-2"><button className={primary}><Award className="size-4" aria-hidden="true" />Đưa vào shortlist</button><button className={button}><Download className="size-4" aria-hidden="true" />Xuất báo cáo</button></div><div className="mt-3 grid grid-cols-3 gap-2"><Link className="rounded-lg bg-[var(--color-surface-container-low)] p-3 text-xs font-semibold hover:bg-[var(--color-primary-soft)]" to={`/recruiter/assessments?applicationId=${row.applicationId}`}><Code2 className="mb-2 size-4 text-[var(--color-primary)]" aria-hidden="true" />Assessment</Link><Link className="rounded-lg bg-[var(--color-surface-container-low)] p-3 text-xs font-semibold hover:bg-[var(--color-primary-soft)]" to={`/recruiter/interviews?applicationId=${row.applicationId}`}><MessageSquareText className="mb-2 size-4 text-[var(--color-primary)]" aria-hidden="true" />AI Interview</Link><Link className="rounded-lg bg-[var(--color-surface-container-low)] p-3 text-xs font-semibold hover:bg-[var(--color-primary-soft)]" to={`/recruiter/schedules?applicationId=${row.applicationId}`}><CalendarDays className="mb-2 size-4 text-[var(--color-primary)]" aria-hidden="true" />Đặt lịch</Link></div></div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12"><div className="space-y-6 lg:col-span-7"><ComponentBreakdown row={row} /><FormulaTable row={row} /><SkillEvidence row={row} /><section className={section}><h3 className="text-lg font-semibold">Kinh nghiệm liên quan</h3><p className="mt-1 text-sm">{row.experienceMonths === null ? "Chưa đủ dữ liệu xác minh" : `${row.experienceMonths} tháng, đã loại trừ thời gian trùng lặp`}</p>{row.experienceEvidence.map((evidence, index) => <blockquote key={index} className="mt-3 rounded-r-lg border-l-2 border-[var(--color-primary)] bg-[var(--color-surface-alt)] p-3 text-sm">{evidence}</blockquote>)}</section></div>
        <aside className="space-y-6 lg:col-span-5"><InsightPanel row={row} preview={preview} />{row.interviewFeedback && <section className={section}><h3 className="flex items-center gap-2 text-lg font-semibold"><MessageSquareText className="size-5 text-[var(--color-primary)]" aria-hidden="true" />Nhận xét AI Interview</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--color-on-surface-variant)]">{row.interviewFeedback}</p></section>}<Timeline row={row} />
          {!preview && sources.isPending && <p role="status" className={section}>Đang tải nguồn đánh giá…</p>}{!preview && sources.isError && <div role="alert" className={section}>{getApiErrorMessage(sources.error)}</div>}
        </aside></div>
    </div>
    <div className="sticky bottom-0 z-20 flex flex-col gap-3 border-t border-[var(--color-border-default)] bg-white/90 px-4 py-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><p className="text-sm font-semibold">Ứng viên đã sẵn sàng cho bước đánh giá tiếp theo</p><p className="text-xs text-[var(--color-on-surface-variant)]">Các thao tác thay đổi pipeline sẽ được nối backend ở giai đoạn sau.</p></div><div className="flex gap-2"><button className={button} onClick={onClose}>Đóng</button><Link className={primary} to={`/recruiter/interviews?applicationId=${row.applicationId}`}>Chuyển sang phỏng vấn</Link></div></div>
  </dialog>;
}
