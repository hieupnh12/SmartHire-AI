import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Award, BriefcaseBusiness, CalendarDays, Check, ChevronDown, CircleAlert, Code2, FileSearch, Lightbulb, MessageSquareText, Sparkles, Target, X } from "lucide-react";
import { matchingApi } from "@/api/tenant/matchingApi";
import { getApiErrorMessage } from "@/lib/axios";
import type { RankingRow, RankingSources, Selection } from "../types/ranking";
import { button, labels, muted, primary, scoreText } from "./rankingUi";
import { RankingSelect } from "./RankingSelect";

const section = "rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-sm";

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
  return <details className={`${section} group`}>
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"><span><span id="formula-title" className="flex items-center gap-2 text-lg font-semibold"><Code2 className="size-5 text-[var(--color-primary)]" aria-hidden="true" />Cách tính điểm tổng</span><span className={muted}>Mở để xem điểm gốc, trọng số và mức đóng góp.</span></span><ChevronDown className="size-5 shrink-0 text-[var(--color-on-surface-variant)] transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
    <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-[var(--color-surface-container-low)] text-xs text-[var(--color-on-surface-variant)]"><tr><th className="rounded-l-lg px-3 py-2.5">Thành phần</th><th className="px-3 py-2.5 text-center">Điểm gốc</th><th className="px-3 py-2.5 text-center">Trọng số</th><th className="rounded-r-lg px-3 py-2.5 text-right">Đóng góp</th></tr></thead>
      <tbody>{row.result.components.map((part) => <tr key={part.key} className="hover:bg-[var(--color-primary-subtle)]"><td className="px-3 py-2.5 font-medium">{labels[part.key]}</td><td className="px-3 py-2.5 text-center font-mono">{scoreText(part.score)}</td><td className="px-3 py-2.5 text-center font-mono text-[var(--color-on-surface-variant)]">{part.weight}%</td><td className="px-3 py-2.5 text-right font-mono font-semibold text-[var(--color-primary-hover)]">{scoreText(part.contribution)}</td></tr>)}</tbody>
      <tfoot><tr className="bg-[var(--color-surface-container-low)] font-semibold"><td className="rounded-l-lg px-3 py-3">Chỉ số xếp hạng tổng</td><td className="px-3 py-3 text-center">—</td><td className="px-3 py-3 text-center">100%</td><td className="rounded-r-lg px-3 py-3 text-right text-lg text-[var(--color-primary-hover)]">{scoreText(row.result.score)}</td></tr></tfoot>
    </table></div>
  </details>;
}

function SkillEvidence({ row }: { row: RankingRow }) {
  return <section className={section} aria-labelledby="skills-title">
    <header className="mb-4"><h3 id="skills-title" className="flex items-center gap-2 text-lg font-semibold"><FileSearch className="size-5 text-[var(--color-primary)]" aria-hidden="true" />Đối chiếu kỹ năng và CV</h3><p className={muted}>Bằng chứng dùng để giải thích điểm kỹ năng.</p></header>
    <div className="space-y-4">{row.groups.map((group) => <div key={group.category} className="rounded-lg bg-[var(--color-surface-alt)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><strong>{labels[group.category] ?? group.category}</strong><span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-primary-hover)]">{scoreText(group.score)}/100 · Bao phủ {scoreText(group.coverage)}%</span></div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">{group.matches.map((match) => <li key={match.requiredSkill} className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-3 text-sm"><p className="flex items-center gap-2 font-semibold"><Check className="size-4 text-emerald-600" aria-hidden="true" />{match.requiredSkill}</p><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{match.evidence ?? "Chưa có đoạn trích bằng chứng"}</p></li>)}</ul>
    </div>)}</div>
    {row.missingRequired.length > 0 && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><strong>Kỹ năng còn thiếu:</strong> {row.missingRequired.join(", ")}</div>}
  </section>;
}

function InsightPanel({ row, preview }: { row: RankingRow; preview: boolean }) {
  if (!row.insight) return null;
  const recommendation: Record<string, string> = { ADVANCE: "Nên chuyển vòng tiếp theo", REVIEW: "Cần recruiter xem xét thêm", HOLD: "Nên tạm giữ", WAIT_FOR_DATA: "Chờ bổ sung dữ liệu" };
  const signal: Record<string, string> = { STRONG_SKILLS: "Kỹ năng phù hợp tốt", STRONG_EXPERIENCE: "Kinh nghiệm liên quan tốt", STRONG_ASSESSMENT: "Kết quả assessment tốt", STRONG_INTERVIEW: "Kết quả AI interview tốt", MISSING_REQUIRED_SKILLS: "Còn thiếu kỹ năng bắt buộc", MISSING_SKILLS: "Chưa có dữ liệu kỹ năng", MISSING_EXPERIENCE: "Chưa có dữ liệu kinh nghiệm", MISSING_ASSESSMENT: "Chưa có kết quả assessment", MISSING_INTERVIEW: "Chưa có kết quả interview" };
  return <section className={`${section} relative overflow-hidden`} aria-labelledby="insight-title">
    <div className="absolute -right-12 -top-12 size-40 rounded-full bg-[var(--color-primary-soft)] blur-3xl" aria-hidden="true" />
    <header className="relative flex items-start justify-between gap-3"><div><h3 id="insight-title" className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="size-5 text-[var(--color-primary)]" aria-hidden="true" />Trợ lý phân tích Rank</h3><p className={muted}>Tóm tắt hỗ trợ recruiter ra quyết định.</p></div>{preview && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Dữ liệu mẫu</span>}</header>
    <div className="relative mt-4 rounded-xl bg-[var(--color-primary-subtle)] p-4"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-primary-hover)]">Đề xuất · {scoreText(row.result.score)}/100</p><p className="mt-1 text-lg font-semibold">{recommendation[row.insight.recommendation] ?? row.insight.recommendation}</p><p className="mt-2 text-sm leading-6 text-[var(--color-on-surface-variant)]">Nhận định được tạo theo quy tắc từ các thành phần điểm và dữ liệu còn thiếu.</p></div>
    {row.insight.strengths.length > 0 && <div className="mt-5"><h4 className="flex items-center gap-2 text-sm font-semibold"><Award className="size-4 text-[var(--color-primary)]" aria-hidden="true" />Điểm mạnh nổi bật</h4><ul className="mt-3 space-y-2 text-sm text-[var(--color-on-surface-variant)]">{row.insight.strengths.map((item) => <li key={item} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />{signal[item] ?? item}</li>)}</ul></div>}
    {row.insight.risks.length > 0 && <div className="mt-5"><h4 className="flex items-center gap-2 text-sm font-semibold"><CircleAlert className="size-4 text-amber-600" aria-hidden="true" />Điểm cần xác minh</h4><ul className="mt-2 space-y-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{row.insight.risks.map((item) => <li key={item}>{signal[item] ?? item}</li>)}</ul></div>}
    {row.insight.questions.length > 0 && <div className="mt-5"><h4 className="flex items-center gap-2 text-sm font-semibold"><Lightbulb className="size-4 text-[var(--color-primary)]" aria-hidden="true" />Câu hỏi gợi ý</h4><ol className="mt-3 space-y-2 text-sm text-[var(--color-on-surface-variant)]">{row.insight.questions.map((item, index) => <li key={item}>{index + 1}. Hãy mô tả kinh nghiệm thực tế với {item.replace("VERIFY_SKILL:", "")}.</li>)}</ol></div>}
  </section>;
}

function Timeline({ row }: { row: RankingRow }) {
  const [expanded, setExpanded] = useState(false);
  const eventLabels: Record<string, string> = { APPLICATION_RECEIVED: "Đã tiếp nhận hồ sơ", CV_ANALYZED: "CV đã được phân tích", ASSESSMENT_GRADED: "Assessment đã chấm", INTERVIEW_SCORED: "AI Interview đã đánh giá" };
  const visibleEvents = expanded ? row.timeline : row.timeline.slice(-5);
  const timelineId = `candidate-timeline-${row.applicationId}`;
  return <section className={section} aria-labelledby="timeline-title"><header className="mb-4 flex items-start justify-between gap-3"><div><h3 id="timeline-title" className="flex items-center gap-2 text-lg font-semibold"><BriefcaseBusiness className="size-5 text-[var(--color-primary)]" aria-hidden="true" />Tiến trình ứng viên</h3><p className={muted}>Các mốc tạo nên điểm hiện tại.</p></div><span className="shrink-0 rounded-full bg-[var(--color-surface-container-low)] px-2.5 py-1 text-xs font-semibold">{row.timeline.length} mốc</span></header>
    <ol id={timelineId} className="relative ml-2 border-l border-[var(--color-outline-variant)]">{visibleEvents.map((event, index) => <li key={`${event.type}-${event.occurredAt ?? index}`} className="relative pb-3 pl-5 last:pb-0"><span className="absolute -left-1.5 top-1 size-3 rounded-full bg-[var(--color-primary)] ring-[3px] ring-[var(--color-surface-card)]" aria-hidden="true" /><div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"><p className="text-sm font-semibold">{eventLabels[event.type] ?? (event.type.startsWith("STATUS_") ? labels[event.type.slice(7)] ?? event.type.slice(7) : event.type)}</p><time className="shrink-0 text-xs tabular-nums text-[var(--color-on-surface-variant)]" dateTime={event.occurredAt ?? undefined}>{event.occurredAt ? new Date(event.occurredAt).toLocaleString("vi-VN") : "Chưa ghi nhận"}</time></div></li>)}</ol>
    {row.timeline.length > 5 && <button type="button" className={`${button} mt-4 w-full`} aria-expanded={expanded} aria-controls={timelineId} onClick={() => setExpanded((value) => !value)}>{expanded ? "Thu gọn" : `Xem tất cả ${row.timeline.length} mốc`}<ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" /></button>}
  </section>;
}

function SourceSelector({ applicationId, tenantKey, data }: { applicationId: number; tenantKey: string; data: RankingSources }) {
  const client = useQueryClient();
  const [selection, setSelection] = useState<Selection>(data.selected);
  const mutation = useMutation({
    mutationFn: () => matchingApi.selectSources(applicationId, selection),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["rankings"] });
      await client.invalidateQueries({ queryKey: ["ranking-sources", tenantKey, applicationId] });
    },
  });
  const fields = [
    { key: "cvId" as const, label: "CV", options: data.cvs ?? [] },
    { key: "submissionId" as const, label: "Assessment", options: data.submissions ?? [] },
    { key: "aiInterviewId" as const, label: "AI Interview", options: data.aiInterviews ?? [] },
  ];
  return <section className={section} aria-labelledby="source-title"><h3 id="source-title" className="text-lg font-semibold">Nguồn dữ liệu xếp hạng</h3><p className={muted}>Chọn nguồn chính thức khi ứng viên có nhiều lần đánh giá.</p><div className="mt-4 space-y-3">{fields.map((field) => <div key={field.key} className="space-y-1.5"><span className="block text-sm font-medium">{field.label}</span><RankingSelect ariaLabel={`Nguồn ${field.label}`} value={selection[field.key] === null ? "" : String(selection[field.key])} placeholder={field.options.length > 1 ? "Chọn nguồn" : "Chưa có nguồn"} options={[{ value: "", label: field.options.length > 1 ? "Chưa chọn nguồn" : "Chưa có nguồn" }, ...field.options.map((option) => ({ value: String(option.id), label: option.label, description: option.status }))]} onChange={(value) => setSelection((current) => ({ ...current, [field.key]: value ? Number(value) : null }))} /></div>)}</div>{mutation.isError && <p role="alert" className="mt-3 text-sm text-red-700">{getApiErrorMessage(mutation.error)}</p>}<button type="button" className={`${primary} mt-4 w-full`} disabled={mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Đang lưu…" : "Lưu nguồn và tính lại"}</button></section>;
}

function RankingDetailContent({ row, jobId, jobTitle, tenantKey, preview = false, fallback = false, onClose }: {
  row: RankingRow; jobId: number; jobTitle: string; tenantKey: string; preview?: boolean; fallback?: boolean; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  const sources = useQuery({ queryKey: ["ranking-sources", tenantKey, row.applicationId], queryFn: () => matchingApi.sources(row.applicationId), enabled: !preview && !fallback });
  return <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); onClose(); }} aria-labelledby="ranking-detail-title" aria-modal="true" className="fixed inset-0 m-auto h-dvh w-full max-w-6xl overflow-y-auto border-0 bg-[var(--color-surface)] p-0 text-[var(--color-on-surface)] shadow-2xl backdrop:bg-slate-900/45 backdrop:backdrop-blur-sm sm:h-[calc(100dvh-32px)] sm:w-[calc(100%-32px)] sm:rounded-2xl sm:border sm:border-[var(--color-border-default)]">
    <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[var(--color-border-default)] bg-[var(--color-surface-card)]/90 px-4 py-3 backdrop-blur-xl sm:px-6">
      <button className={button} onClick={onClose} autoFocus><ArrowLeft className="size-4" aria-hidden="true" /><span className="hidden sm:inline">Quay lại bảng xếp hạng</span><span className="sm:hidden">Quay lại</span></button>
      <div className="flex items-center gap-2"><span className="hidden rounded-full bg-[var(--color-surface-container-low)] px-3 py-1 text-xs text-[var(--color-on-surface-variant)] sm:inline">Hồ sơ #{row.applicationId}</span><button className="grid size-11 place-items-center rounded-lg text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]" onClick={onClose} aria-label="Đóng chi tiết ứng viên"><X className="size-5" aria-hidden="true" /></button></div>
    </div>

    <div className="space-y-6 p-4 sm:p-6">
      <section className="relative overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-sm sm:p-6">
        <div className="absolute -right-20 -top-20 size-64 rounded-full bg-[var(--color-primary-soft)] blur-3xl" aria-hidden="true" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 items-center gap-4"><div className="relative grid size-16 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-xl font-semibold text-[var(--color-primary-hover)] sm:size-20 sm:text-2xl">{row.candidateName.split(" ").slice(-2).map((part) => part[0]).join("")}<span className="absolute -bottom-2 -right-2 rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-xs font-bold text-[var(--color-on-primary)]">#{row.rank ?? "—"}</span></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 id="ranking-detail-title" className="truncate text-xl font-semibold sm:text-2xl">{row.candidateName}</h2><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Đã sàng lọc</span></div><p className="mt-1 truncate text-sm text-[var(--color-on-surface-variant)]">{jobTitle}</p><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-md bg-[var(--color-surface-container-low)] px-2.5 py-1 text-xs">Hồ sơ #{row.applicationId}</span><span className="rounded-md bg-[var(--color-surface-container-low)] px-2.5 py-1 text-xs">{labels[row.status] ?? row.status}</span><span className="rounded-md bg-[var(--color-surface-container-low)] px-2.5 py-1 text-xs">{row.experienceMonths ?? "—"} tháng kinh nghiệm</span></div></div></div>
          <div className="flex items-center justify-center gap-4 rounded-xl bg-[var(--color-surface-container-low)] p-4"><OverallGauge value={row.result.score} /><div><p className="flex items-center gap-1 text-xs font-bold uppercase tracking-[0.08em] text-[var(--color-primary-hover)]"><Sparkles className="size-4" aria-hidden="true" />Điểm tổng</p><p className="mt-2 text-sm font-semibold">Hạng #{row.rank ?? "—"}</p><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{row.result.complete ? "Đã đủ dữ liệu" : `${row.result.completedComponents}/${row.result.requiredComponents} thành phần`}</p></div></div>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-2 border-t border-[var(--color-border-default)] pt-5 sm:grid-cols-4">{row.result.components.map((part) => <div key={part.key} className="rounded-lg bg-[var(--color-surface-container-low)] px-3 py-3"><p className="text-xs text-[var(--color-on-surface-variant)]">{labels[part.key]}</p><p className="mt-1 text-lg font-semibold tabular-nums">{scoreText(part.score)}<span className="text-xs font-normal text-[var(--color-outline)]"> / 100</span></p></div>)}</div>
        {fallback && <p role="status" className="relative mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Chi tiết bằng chứng chưa tải được. Đang hiển thị dữ liệu tóm tắt từ bảng xếp hạng.</p>}
        <nav className="relative mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="Thao tác với ứng viên"><Link className={`${button} bg-[var(--color-surface-card)]`} to={`/recruiter/jobs/${jobId}/assessments?applicationId=${row.applicationId}`}><Code2 className="size-4 text-[var(--color-primary)]" aria-hidden="true" />Xem Assessment</Link><Link className={`${button} bg-[var(--color-surface-card)]`} to={`/recruiter/jobs/${jobId}/interviews?applicationId=${row.applicationId}`}><MessageSquareText className="size-4 text-[var(--color-primary)]" aria-hidden="true" />Xem AI Interview</Link><Link className={primary} to={`/recruiter/jobs/${jobId}/schedules?applicationId=${row.applicationId}`}><CalendarDays className="size-4" aria-hidden="true" />Đặt lịch tiếp theo</Link></nav>
      </section>

      <div className="grid gap-6 lg:grid-cols-12"><div className="space-y-6 lg:col-span-8"><ComponentBreakdown row={row} /><SkillEvidence row={row} /><section className={section}><h3 className="text-lg font-semibold">Kinh nghiệm liên quan</h3><p className="mt-1 text-sm">{row.experienceMonths === null ? "Chưa đủ dữ liệu xác minh" : `${row.experienceMonths} tháng, đã loại trừ thời gian trùng lặp`}</p>{row.experienceEvidence.map((evidence, index) => <blockquote key={index} className="mt-3 rounded-r-lg border-l-2 border-[var(--color-primary)] bg-[var(--color-surface-alt)] p-3 text-sm">{evidence}</blockquote>)}</section><FormulaTable row={row} /></div>
        <aside className="space-y-6 lg:col-span-4"><InsightPanel row={row} preview={preview} />{row.interviewFeedback && <section className={section}><h3 className="flex items-center gap-2 text-lg font-semibold"><MessageSquareText className="size-5 text-[var(--color-primary)]" aria-hidden="true" />Nhận xét AI Interview</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--color-on-surface-variant)]">{row.interviewFeedback}</p></section>}<Timeline row={row} />
          {!preview && !fallback && sources.isPending && <p role="status" className={section}>Đang tải nguồn đánh giá…</p>}{!preview && !fallback && sources.isError && <div role="alert" className={section}>{getApiErrorMessage(sources.error)}</div>}{!preview && !fallback && sources.data && <SourceSelector applicationId={row.applicationId} tenantKey={tenantKey} data={sources.data.data} />}
        </aside></div>
    </div>
    <div className="sticky bottom-0 z-20 flex flex-col gap-3 border-t border-[var(--color-border-default)] bg-[var(--color-surface-card)]/90 px-4 py-3 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><p className="text-sm font-semibold">Điểm chỉ hỗ trợ ra quyết định</p><p className="text-xs text-[var(--color-on-surface-variant)]">Hãy kiểm tra bằng chứng và phỏng vấn trước khi thay đổi trạng thái ứng viên.</p></div><div className="flex gap-2"><button className={`${button} flex-1 sm:flex-none`} onClick={onClose}>Đóng</button><Link className={`${primary} flex-1 sm:flex-none`} to={`/recruiter/jobs/${jobId}/interviews?applicationId=${row.applicationId}`}>Xem phỏng vấn</Link></div></div>
  </dialog>;
}

export function RankingDetail({ applicationId, previewRow, fallbackRow, jobId, jobTitle, tenantKey, onClose }: {
  applicationId: number; previewRow?: RankingRow; fallbackRow?: RankingRow; jobId: number; jobTitle: string; tenantKey: string; onClose: () => void;
}) {
  const detail = useQuery({ queryKey: ["ranking-detail", tenantKey, applicationId], queryFn: () => matchingApi.detail(applicationId), enabled: !previewRow });
  if (previewRow) return <RankingDetailContent row={previewRow} jobId={jobId} jobTitle={jobTitle} tenantKey={tenantKey} preview onClose={onClose} />;
  if (detail.isPending) return <RankingDetailStateDialog status="loading" onClose={onClose} />;
  if (detail.isError && fallbackRow) return <RankingDetailContent row={fallbackRow} jobId={jobId} jobTitle={jobTitle} tenantKey={tenantKey} fallback onClose={onClose} />;
  if (detail.isError) return <RankingDetailStateDialog status="error" message={getApiErrorMessage(detail.error)} onClose={onClose} />;
  return <RankingDetailContent row={detail.data.data} jobId={jobId} jobTitle={jobTitle} tenantKey={tenantKey} onClose={onClose} />;
}

function RankingDetailStateDialog({ status, message, onClose }: { status: "loading" | "error"; message?: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); onClose(); }} aria-labelledby="ranking-state-title" aria-describedby="ranking-state-description" className="m-auto w-[min(28rem,calc(100%-2rem))] border-0 bg-transparent p-0 text-[var(--color-on-surface)] backdrop:bg-slate-900/45 backdrop:backdrop-blur-sm">
    <div className={section}>
      <h2 id="ranking-state-title" className="font-semibold">{status === "loading" ? "Đang tải chi tiết" : "Không thể tải chi tiết"}</h2>
      <p id="ranking-state-description" role={status === "loading" ? "status" : "alert"} className="mt-2 text-sm text-[var(--color-on-surface-variant)]">{status === "loading" ? "Đang tải chi tiết xếp hạng ứng viên…" : message}</p>
      {status === "error" && <button autoFocus className={`${button} mt-4`} onClick={onClose}>Đóng</button>}
    </div>
  </dialog>;
}
