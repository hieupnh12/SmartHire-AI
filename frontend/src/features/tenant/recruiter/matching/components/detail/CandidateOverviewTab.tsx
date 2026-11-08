import { useState } from "react";
import {
  Award,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CircleAlert,
  Code2,
  FileSearch,
  Lightbulb,
  Sparkles,
  Target,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { matchingApi } from "@/api/tenant/matchingApi";
import { getApiErrorMessage } from "@/lib/axios";
import type { RankingRow, RankingSources, Selection } from "../../types/ranking";
import { labels, scoreText } from "../rankingUi";
import { RankingSelect } from "../RankingSelect";

const card = "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900";

function OverallGauge({ value }: { value: number | null }) {
  const score = Math.max(0, Math.min(100, value ?? 0));
  const circumference = 2 * Math.PI * 42;
  return (
    <div
      className="relative grid size-28 shrink-0 place-items-center"
      aria-label={value === null ? "Chưa có điểm tổng" : `Điểm tổng ${scoreText(value)} trên 100`}
    >
      <svg viewBox="0 0 100 100" className="size-28 -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="currentColor"
          className="text-brand-primary"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
        />
      </svg>
      <span className="absolute text-center">
        <strong className="block text-xl font-black text-slate-900 dark:text-white tabular-nums">
          {scoreText(value)}
        </strong>
        <span className="text-[11px] text-slate-400">/ 100</span>
      </span>
    </div>
  );
}

function ComponentBreakdown({ row }: { row: RankingRow }) {
  return (
    <section className={card} aria-labelledby="breakdown-title">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 id="breakdown-title" className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <Target className="size-4.5 text-brand-primary" aria-hidden="true" />
            Phân tích điểm đa chiều
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Điểm số và mức đóng góp của từng tín hiệu đánh giá.
          </p>
        </div>
        <span className="text-xs text-slate-400">Thang điểm 0–100</span>
      </header>
      <div className="space-y-4">
        {row.result.components.map((part) => (
          <div key={part.key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {labels[part.key] ?? part.key}
              </span>
              <strong className="tabular-nums text-slate-900 dark:text-white font-bold">
                {scoreText(part.score)} <span className="font-normal text-slate-400">/ 100</span>
              </strong>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-brand-primary transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(100, part.score ?? 0))}%` }}
              />
            </div>
            <div className="flex justify-between gap-4 text-[11px] text-slate-400">
              <span>{labels[part.state] ?? part.state}</span>
              <span className="font-semibold text-brand-primary">Trọng số {part.weight}%</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FormulaTable({ row }: { row: RankingRow }) {
  return (
    <details className={`${card} group`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 focus:outline-none">
        <div>
          <span className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <Code2 className="size-4.5 text-brand-primary" aria-hidden="true" />
            Cách tính điểm tổng (Formula)
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Mở để xem điểm gốc, trọng số và mức đóng góp thực tế.
          </p>
        </div>
        <ChevronDown className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[500px] text-left text-xs">
          <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <tr>
              <th className="rounded-l-lg px-3 py-2.5">Thành phần</th>
              <th className="px-3 py-2.5 text-center">Điểm gốc</th>
              <th className="px-3 py-2.5 text-center">Trọng số</th>
              <th className="rounded-r-lg px-3 py-2.5 text-right">Đóng góp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {row.result.components.map((part) => (
              <tr key={part.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                  {labels[part.key] ?? part.key}
                </td>
                <td className="px-3 py-2.5 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                  {scoreText(part.score)}
                </td>
                <td className="px-3 py-2.5 text-center font-mono text-slate-500">
                  {part.weight}%
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-bold text-brand-primary">
                  {scoreText(part.contribution)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-bold dark:bg-slate-800/80">
              <td className="rounded-l-lg px-3 py-2.5">Chỉ số xếp hạng tổng</td>
              <td className="px-3 py-2.5 text-center">—</td>
              <td className="px-3 py-2.5 text-center">100%</td>
              <td className="rounded-r-lg px-3 py-2.5 text-right text-sm text-brand-primary">
                {scoreText(row.result.score)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </details>
  );
}

function SkillEvidence({ row }: { row: RankingRow }) {
  return (
    <section className={card} aria-labelledby="skills-title">
      <header className="mb-4">
        <h3 id="skills-title" className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
          <FileSearch className="size-4.5 text-brand-primary" aria-hidden="true" />
          Đối chiếu kỹ năng và CV
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Bằng chứng trích xuất từ CV dùng để tính điểm kỹ năng.
        </p>
      </header>

      <div className="space-y-4">
        {row.groups.map((group) => (
          <div key={group.category} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {labels[group.category] ?? group.category}
              </strong>
              <span className="rounded-full bg-brand-primary/10 border border-brand-primary/20 px-2.5 py-0.5 text-[11px] font-bold text-brand-primary">
                {scoreText(group.score)}/100 · Bao phủ {scoreText(group.coverage)}%
              </span>
            </div>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {group.matches.map((match) => (
                <li
                  key={match.requiredSkill}
                  className="rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-900"
                >
                  <p className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
                    {match.requiredSkill}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {match.evidence ?? "Chưa có đoạn trích bằng chứng trong CV"}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {row.missingRequired.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
          <strong>Kỹ năng còn thiếu:</strong> {row.missingRequired.join(", ")}
        </div>
      )}
    </section>
  );
}

function InsightPanel({ row }: { row: RankingRow }) {
  if (!row.insight) return null;
  const recommendation: Record<string, string> = {
    ADVANCE: "Nên chuyển vòng tiếp theo",
    REVIEW: "Cần recruiter xem xét thêm",
    HOLD: "Nên tạm giữ",
    WAIT_FOR_DATA: "Chờ bổ sung dữ liệu",
  };
  const signal: Record<string, string> = {
    STRONG_SKILLS: "Kỹ năng phù hợp tốt",
    STRONG_EXPERIENCE: "Kinh nghiệm liên quan tốt",
    STRONG_ASSESSMENT: "Kết quả assessment tốt",
    STRONG_INTERVIEW: "Kết quả AI interview tốt",
    MISSING_REQUIRED_SKILLS: "Còn thiếu kỹ năng bắt buộc",
    MISSING_SKILLS: "Chưa có dữ liệu kỹ năng",
    MISSING_EXPERIENCE: "Chưa có dữ liệu kinh nghiệm",
    MISSING_ASSESSMENT: "Chưa có kết quả assessment",
    MISSING_INTERVIEW: "Chưa có kết quả interview",
  };

  return (
    <section className={card} aria-labelledby="insight-title">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 id="insight-title" className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <Sparkles className="size-4.5 text-brand-primary" aria-hidden="true" />
            Trợ lý phân tích Rank & Đề xuất
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Nhận định tự động hỗ trợ recruiter ra quyết định.
          </p>
        </div>
      </header>

      <div className="mt-4 rounded-xl bg-brand-primary/5 border border-brand-primary/15 p-4 dark:bg-brand-primary/10 dark:border-brand-primary/20">
        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-primary">
          Đề xuất · Điểm {scoreText(row.result.score)}/100
        </p>
        <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
          {recommendation[row.insight.recommendation] ?? row.insight.recommendation}
        </p>
      </div>

      {row.insight.strengths.length > 0 && (
        <div className="mt-4">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Award className="size-4 text-brand-primary" />
            Điểm mạnh nổi bật
          </h4>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            {row.insight.strengths.map((item) => (
              <li key={item} className="flex items-start gap-1.5">
                <Check className="mt-0.5 size-3.5 text-emerald-600 shrink-0" />
                <span>{signal[item] ?? item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {row.insight.risks.length > 0 && (
        <div className="mt-4">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
            <CircleAlert className="size-4 text-amber-600" />
            Điểm cần xác minh
          </h4>
          <ul className="mt-2 space-y-1.5 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            {row.insight.risks.map((item) => (
              <li key={item}>• {signal[item] ?? item}</li>
            ))}
          </ul>
        </div>
      )}

      {row.insight.questions.length > 0 && (
        <div className="mt-4">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Lightbulb className="size-4 text-brand-primary" />
            Câu hỏi gợi ý khi phỏng vấn
          </h4>
          <ol className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            {row.insight.questions.map((item, index) => (
              <li key={item}>
                {index + 1}. Hãy mô tả kinh nghiệm thực tế với {item.replace("VERIFY_SKILL:", "")}.
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function Timeline({ row }: { row: RankingRow }) {
  const [expanded, setExpanded] = useState(false);
  const eventLabels: Record<string, string> = {
    APPLICATION_RECEIVED: "Đã tiếp nhận hồ sơ",
    CV_ANALYZED: "CV đã được phân tích",
    ASSESSMENT_GRADED: "Assessment đã chấm",
    INTERVIEW_SCORED: "AI Interview đã đánh giá",
  };
  const visibleEvents = expanded ? row.timeline : row.timeline.slice(-5);

  return (
    <section className={card} aria-labelledby="timeline-title">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 id="timeline-title" className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <BriefcaseBusiness className="size-4.5 text-brand-primary" aria-hidden="true" />
            Tiến trình ứng viên
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Các mốc sự kiện ghi nhận trong hệ thống.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          {row.timeline.length} mốc
        </span>
      </header>

      <ol className="relative ml-2 border-l border-slate-200 dark:border-slate-800">
        {visibleEvents.map((event, index) => (
          <li key={`${event.type}-${event.occurredAt ?? index}`} className="relative pb-3 pl-5 last:pb-0">
            <span className="absolute -left-1.5 top-1 size-3 rounded-full bg-brand-primary ring-4 ring-white dark:ring-slate-900" />
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3 text-xs">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {eventLabels[event.type] ?? event.type}
              </p>
              <time className="shrink-0 text-[11px] text-slate-400">
                {event.occurredAt ? new Date(event.occurredAt).toLocaleString("vi-VN") : "Chưa ghi nhận"}
              </time>
            </div>
          </li>
        ))}
      </ol>
      {row.timeline.length > 5 && (
        <button
          type="button"
          className="mt-3 w-full text-center text-xs font-semibold text-brand-primary hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Thu gọn" : `Xem tất cả ${row.timeline.length} mốc`}
        </button>
      )}
    </section>
  );
}

function SourceSelector({
  applicationId,
  tenantKey,
  data,
}: {
  applicationId: number;
  tenantKey: string;
  data: RankingSources;
}) {
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

  return (
    <section className={card} aria-labelledby="source-title">
      <h3 id="source-title" className="text-base font-bold text-slate-900 dark:text-white">
        Nguồn dữ liệu xếp hạng
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
        Chọn nguồn chính thức khi ứng viên có nhiều lần đánh giá.
      </p>
      <div className="mt-4 space-y-3">
        {fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              {field.label}
            </span>
            <RankingSelect
              ariaLabel={`Nguồn ${field.label}`}
              value={selection[field.key] === null ? "" : String(selection[field.key])}
              placeholder={field.options.length > 1 ? "Chọn nguồn" : "Chưa có nguồn"}
              options={[
                { value: "", label: field.options.length > 1 ? "Chưa chọn nguồn" : "Chưa có nguồn" },
                ...field.options.map((option) => ({
                  value: String(option.id),
                  label: option.label,
                  description: option.status,
                })),
              ]}
              onChange={(value) =>
                setSelection((current) => ({
                  ...current,
                  [field.key]: value ? Number(value) : null,
                }))
              }
            />
          </div>
        ))}
      </div>
      {mutation.isError && (
        <p role="alert" className="mt-2 text-xs text-rose-600">
          {getApiErrorMessage(mutation.error)}
        </p>
      )}
      <button
        type="button"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
        className="mt-4 w-full rounded-xl bg-brand-primary py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50 transition-colors"
      >
        {mutation.isPending ? "Đang lưu…" : "Lưu nguồn và tính lại"}
      </button>
    </section>
  );
}

export function CandidateOverviewTab({
  row,
  sourcesData,
  tenantKey,
}: {
  row: RankingRow;
  sourcesData?: RankingSources;
  tenantKey: string;
  preview?: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* 1. Gauge & Highlights Card */}
      <section className={card}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <OverallGauge value={row.result.score} />
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                XẾP HẠNG TỔNG QUAN
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {row.result.complete ? `Thứ hạng #${row.rank ?? "—"}` : "Chờ xếp hạng chính thức"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {row.result.complete
                  ? "Hồ sơ đã hoàn thành đầy đủ các vòng đánh giá trọng số."
                  : `Đã hoàn thành ${row.result.completedComponents}/${row.result.requiredComponents} thành phần.`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto">
            {row.result.components.map((part) => (
              <div key={part.key} className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/40 min-w-24">
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {labels[part.key] ?? part.key}
                </span>
                <strong className="mt-0.5 block text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {scoreText(part.score)}
                  <span className="text-xs font-normal text-slate-400">/100</span>
                </strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Main Grid: Left breakdown + Right Insights */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <ComponentBreakdown row={row} />
          <SkillEvidence row={row} />

          {/* Work Experience */}
          <section className={card}>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Kinh nghiệm làm việc liên quan
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {row.experienceMonths === null
                ? "Chưa đủ dữ liệu xác minh thời gian làm việc."
                : `${row.experienceMonths} tháng (${(row.experienceMonths / 12).toFixed(1)} năm), đã loại trừ trùng lặp.`}
            </p>
            <div className="mt-3 space-y-2">
              {row.experienceEvidence.map((evidence, index) => (
                <blockquote
                  key={index}
                  className="rounded-xl border-l-3 border-brand-primary bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
                >
                  "{evidence}"
                </blockquote>
              ))}
            </div>
          </section>

          <FormulaTable row={row} />
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <InsightPanel row={row} />
          <Timeline row={row} />
          {sourcesData && (
            <SourceSelector
              applicationId={row.applicationId}
              tenantKey={tenantKey}
              data={sourcesData}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
