import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, Minus, X } from "lucide-react";
import type { AiInterviewEvaluationView, AssessmentEvaluationView, CandidateEvaluationView, CvEvaluationView } from "@/api/types/applicant";
import { StatusPill } from "@/components/ux/StatusPill";
import { cn } from "@/lib/utils";

const CRITERIA_LABELS: Record<string, string> = {
  TECHNICAL_KNOWLEDGE: "Kiến thức chuyên môn", PROBLEM_SOLVING: "Giải quyết vấn đề", REASONING: "Lập luận",
  COMMUNICATION: "Giao tiếp", PRACTICAL_EXPERIENCE: "Kinh nghiệm thực tế", BEHAVIORAL_SITUATIONAL: "Hành vi & tình huống",
};

const AI_STATUS: Record<string, string> = {
  CREATED: "Đã mời", GENERATING: "Đang chuẩn bị", QUESTIONS_READY: "Sẵn sàng", IN_PROGRESS: "Đang làm",
  SCORING: "Đang chấm", SCORED: "Đã chấm", ERROR: "Đang xử lý lại",
};

const TEST_STATUS: Record<string, string> = {
  NOT_STARTED: "Chưa bắt đầu", IN_PROGRESS: "Đang làm", SUBMITTED: "Đang chờ chấm", GRADED: "Đã chấm", EXPIRED: "Hết hạn",
};

export type RoundKey = "cv" | "aiInterview" | "assessment";

export const ROUND_TITLES: Record<RoundKey, string> = { cv: "Sàng lọc CV", aiInterview: "Phỏng vấn AI", assessment: "Bài đánh giá" };

export function RoundEvaluation({ id, round, data }: { id: string; round: RoundKey; data: CandidateEvaluationView }) {
  const content = round === "cv"
    ? data.cv && <CvEvaluation cv={data.cv} />
    : round === "aiInterview"
      ? data.aiInterviews.length > 0 && <ol className="space-y-3">{data.aiInterviews.map((row) => <li key={row.id}><InterviewAttempt row={row} total={data.aiInterviews.length} /></li>)}</ol>
      : data.assessments.length > 0 && <ol className="space-y-3">{data.assessments.map((row) => <li key={row.id}><AssessmentAttempt row={row} /></li>)}</ol>;
  return <section id={id} aria-labelledby={`${id}-title`} className="rounded-2xl border border-[var(--color-primary)]/30 bg-white p-5 shadow-[var(--shadow-card)]">
    <h2 id={`${id}-title`} className="text-lg font-semibold">Chi tiết đánh giá · {ROUND_TITLES[round]}</h2>
    <p className="mb-4 mt-1 text-sm text-[var(--color-on-surface-variant)]">Lý do của kết quả: điểm so với ngưỡng đạt và nhận xét của hệ thống.</p>
    {content || <p className="text-sm text-[var(--color-on-surface-variant)]">Vòng này chưa diễn ra hoặc chưa có kết quả đánh giá.</p>}
  </section>;
}

function CvEvaluation({ cv }: { cv: CvEvaluationView }) {
  const optionalMissing = cv.missingSkills.filter((skill) => !cv.requiredMissingSkills.includes(skill));
  return <div className="space-y-4">
    <ScoreLine score={cv.score} threshold={cv.threshold} passed={cv.passed} />
    {cv.explanation && <Reason title="Nhận xét">{cv.explanation}</Reason>}
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">Kỹ năng so với yêu cầu công việc</h4>
      <div className="flex flex-wrap gap-2">
        {cv.matchedSkills.map((skill) => <SkillChip key={`m-${skill}`} kind="match">{skill}</SkillChip>)}
        {cv.partialSkills.map((skill) => <SkillChip key={`p-${skill}`} kind="partial">{skill}</SkillChip>)}
        {cv.requiredMissingSkills.map((skill) => <SkillChip key={`r-${skill}`} kind="missing">{skill} · bắt buộc</SkillChip>)}
        {optionalMissing.map((skill) => <SkillChip key={`o-${skill}`} kind="missing">{skill}</SkillChip>)}
      </div>
      {cv.matchedSkills.length + cv.partialSkills.length + cv.missingSkills.length === 0 && <p className="text-sm text-[var(--color-on-surface-variant)]">Công việc không khai báo kỹ năng cụ thể.</p>}
    </div>
    {(cv.requiredYears != null || cv.requiredEducation) && <dl className="grid gap-2 text-sm sm:grid-cols-2">
      {cv.requiredYears != null && <Fact label="Kinh nghiệm" value={`${cv.candidateYears ?? 0} năm`} hint={`Yêu cầu ${cv.requiredYears} năm`} ok={(cv.candidateYears ?? 0) >= cv.requiredYears} />}
      {cv.requiredEducation && <Fact label="Học vấn" value={cv.candidateEducation ?? "Không xác định"} hint={`Yêu cầu ${cv.requiredEducation}`} />}
    </dl>}
  </div>;
}

function InterviewAttempt({ row, total }: { row: AiInterviewEvaluationView; total: number }) {
  const criteria = Object.entries(row.criteria);
  const finished = row.score != null;
  return <article className="space-y-3 rounded-xl bg-[var(--color-surface-alt)] p-4">
    <AttemptHeader title={total > 1 ? `Lượt ${row.attemptNumber}` : "Kết quả"} date={row.completedAt} outcome={outcomePill(row.passed, AI_STATUS[row.status])} />
    {finished ? <ScoreLine score={row.score!} threshold={row.passingScore} passed={row.passed} /> : <p className="text-sm text-[var(--color-on-surface-variant)]">Chưa có điểm cho lượt này.</p>}
    {row.summary && <Reason title="Tổng quan">{row.summary}</Reason>}
    {(row.strengths || row.weaknesses) && <div className="grid gap-3 sm:grid-cols-2">
      {row.strengths && <Reason title="Điểm mạnh">{row.strengths}</Reason>}
      {row.weaknesses && <Reason title="Cần cải thiện">{row.weaknesses}</Reason>}
    </div>}
    {criteria.length > 0 && <div className="space-y-2">
      <h4 className="text-sm font-semibold">Điểm theo tiêu chí</h4>
      <ul className="space-y-2">{criteria.map(([key, value]) => <li key={key} className="grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-3 text-sm">
        <span className="truncate text-[var(--color-on-surface-variant)]">{CRITERIA_LABELS[key] ?? key}</span>
        <span className="h-2 overflow-hidden rounded-full bg-white" aria-hidden="true"><span className="block h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></span>
        <span className="text-right font-semibold">{formatScore(value)}</span>
      </li>)}</ul>
    </div>}
    {finished && <Link to={`/interviews/${row.id}`} className="inline-flex text-sm font-semibold text-[var(--color-primary)] hover:underline">Xem bài phỏng vấn</Link>}
  </article>;
}

function AssessmentAttempt({ row }: { row: AssessmentEvaluationView }) {
  return <article className="space-y-3 rounded-xl bg-[var(--color-surface-alt)] p-4">
    <AttemptHeader title={row.testTitle} date={row.submittedAt} outcome={outcomePill(row.passed, TEST_STATUS[row.status])} />
    {row.score != null ? <ScoreLine score={row.score} threshold={row.passingScore} passed={row.passed} />
      : <p className="text-sm text-[var(--color-on-surface-variant)]">{row.status === "SUBMITTED" ? "Bài làm có câu tự luận đang chờ nhà tuyển dụng chấm." : row.status === "EXPIRED" ? "Bài làm đã hết thời gian trước khi nộp nên không được tính điểm." : "Chưa có điểm cho bài này."}</p>}
  </article>;
}

function AttemptHeader({ title, date, outcome }: { title: string; date: string | null; outcome: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-2">
    <div className="min-w-0"><h3 className="truncate text-sm font-semibold">{title}</h3>{date && <time className="text-xs text-[var(--color-on-surface-variant)]" dateTime={date}>{new Date(date).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</time>}</div>
    {outcome}
  </div>;
}

function ScoreLine({ score, threshold, passed }: { score: number; threshold: number | null; passed: boolean | null }) {
  const gap = threshold == null ? null : score - threshold;
  return <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
    <span>Điểm <strong className="text-xl">{formatScore(score)}</strong></span>
    {threshold != null && <span className="text-[var(--color-on-surface-variant)]">/ ngưỡng đạt {formatScore(threshold)}</span>}
    {gap != null && passed === false && gap < 0 && <span className="font-medium text-[var(--color-error)]">thiếu {formatScore(-gap)} điểm</span>}
  </p>;
}

function Reason({ title, children }: { title: string; children: ReactNode }) {
  return <div><h4 className="text-sm font-semibold">{title}</h4><p className="mt-1 whitespace-pre-line text-sm leading-6 text-[var(--color-on-surface-variant)]">{children}</p></div>;
}

function Fact({ label, value, hint, ok }: { label: string; value: string; hint: string; ok?: boolean }) {
  return <div className="rounded-xl bg-[var(--color-surface-alt)] p-3">
    <dt className="text-xs text-[var(--color-on-surface-variant)]">{label}</dt>
    <dd className="mt-0.5 font-semibold">{value}{ok === false && <span className="ml-2 text-xs font-medium text-[var(--color-error)]">chưa đủ</span>}</dd>
    <dd className="text-xs text-[var(--color-on-surface-variant)]">{hint}</dd>
  </div>;
}

function SkillChip({ kind, children }: { kind: "match" | "partial" | "missing"; children: ReactNode }) {
  const Icon = kind === "match" ? Check : kind === "partial" ? Minus : X;
  const label = kind === "match" ? "Đáp ứng" : kind === "partial" ? "Đáp ứng một phần" : "Còn thiếu";
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
    kind === "match" && "border-emerald-200 bg-emerald-50 text-emerald-800",
    kind === "partial" && "border-amber-200 bg-amber-50 text-amber-800",
    kind === "missing" && "border-red-200 bg-red-50 text-red-700")}>
    <Icon className="size-3.5" aria-hidden="true" /><span className="sr-only">{label}: </span>{children}
  </span>;
}

function outcomePill(passed: boolean | null, pendingLabel?: string) {
  if (passed === true) return <StatusPill status="PASSED" label="Đạt" />;
  if (passed === false) return <StatusPill status="FAILED" label="Chưa đạt" />;
  return <StatusPill status="PENDING" label={pendingLabel ?? "Đang xử lý"} />;
}

function formatScore(value: number) {
  return value.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
}
