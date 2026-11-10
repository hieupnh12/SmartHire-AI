import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check, CheckCircle2, Cpu, Lightbulb, Minus, Sparkles, X } from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import type { AiInterviewEvaluationView, AssessmentEvaluationView, CandidateEvaluationView, CvEvaluationView } from "@/api/types/applicant";
import { StatusPill } from "@/components/ux/StatusPill";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { localizeAiComment } from "@/features/tenant/candidate/assessments/utils/aiLocalization";

const CRITERIA_LABELS: Record<string, string> = {
  TECHNICAL_KNOWLEDGE: "Kiến thức chuyên môn", PROBLEM_SOLVING: "Giải quyết vấn đề", REASONING: "Lập luận",
  COMMUNICATION: "Giao tiếp", PRACTICAL_EXPERIENCE: "Kinh nghiệm thực tế", BEHAVIORAL_SITUATIONAL: "Hành vi & tình huống",
};

const AI_STATUS: Record<string, string> = {
  CREATED: "Đã mời", GENERATING: "Đang chuẩn bị", QUESTIONS_READY: "Sẵn sàng", IN_PROGRESS: "Đang làm",
  SCORING: "Đang chấm", SCORED: "Đã chấm", ERROR: "Đang xử lý lại",
};

const TEST_STATUS: Record<string, string> = {
  NOT_STARTED: "Chưa bắt đầu", IN_PROGRESS: "Đang làm", SUBMITTED: "Đang chờ chấm", PENDING: "Đang chờ chấm",
  GRADING: "Đang chấm", COMPLETED: "Đã chấm", GRADED: "Đã chấm", FAILED: "Chấm thất bại", EXPIRED: "Hết hạn",
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

function candidateLearning(cv: CvEvaluationView) {
  const parts: string[] = [];
  if (cv.requiredMissingSkills.length > 0) {
    parts.push(`CV chưa nêu rõ các kỹ năng bắt buộc: ${cv.requiredMissingSkills.join(", ")}. Lần nộp sau, hãy ghi cụ thể bạn đã dùng từng kỹ năng này ở dự án hoặc công việc nào.`);
  }
  if (cv.partialSkills.length > 0) {
    parts.push(`Một số kỹ năng mới khớp một phần (${cv.partialSkills.join(", ")}). Hãy bổ sung ví dụ, thời gian làm và kết quả để thấy mức độ thành thạo.`);
  }
  if (cv.passed) {
    parts.push("CV đã đáp ứng các yêu cầu chính. Bạn có thể làm rõ hơn kết quả đo được ở các kỹ năng đã khớp để hồ sơ nổi bật hơn.");
  } else if (cv.requiredMissingSkills.length === 0) {
    parts.push("Điểm sàng lọc chưa đạt yêu cầu của tin. Hãy đối chiếu mô tả công việc và bổ sung kinh nghiệm, học vấn hoặc kỹ năng còn thiếu.");
  }
  return parts.join(" ");
}

function CvEvaluation({ cv }: { cv: CvEvaluationView }) {
  const optionalMissing = cv.missingSkills.filter((skill) => !cv.requiredMissingSkills.includes(skill));
  const advice = cv.candidateAdvice?.trim() || candidateLearning(cv);
  return <div className="space-y-4">
    <ScoreLine score={cv.score} threshold={cv.threshold} passed={cv.passed} />
    {cv.passed === true && cv.threshold != null && cv.score < cv.threshold && <Reason title="Kết quả vòng">Điểm chưa đạt ngưỡng nhưng nhà tuyển dụng đã xem xét hồ sơ và duyệt cho bạn qua vòng này.</Reason>}
    {cv.explanation && <Reason title="Nhận xét">{cv.explanation}</Reason>}
    {advice && <div className="rounded-xl bg-[var(--color-primary-subtle)] p-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold"><Lightbulb className="size-4 text-[var(--color-primary)]" aria-hidden="true" />{cv.candidateAdvice?.trim() ? "Lời khuyên của AI" : "Gợi ý để rút kinh nghiệm"}</h4>
      <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[var(--color-on-surface-variant)]">{advice}</p>
    </div>}
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
  const { data: submission } = useQuery({
    queryKey: queryKeys.assessments.submission(row.id),
    queryFn: ({ signal }) => assessmentApi.submission(row.id, signal),
    enabled: Number.isSafeInteger(row.id) && row.id > 0,
    staleTime: 60_000,
  });

  const evaluatedAnswers = (submission?.answers ?? [])
    .map((ans) => {
      const q = (submission?.questions ?? []).find((question) => question.id === ans.questionId);
      return { answer: ans, question: q };
    })
    .filter(
      (item) =>
        item.answer.evaluation || item.answer.score !== undefined || item.answer.suggestedScore !== undefined
    );

  const finished = row.score != null;

  return (
    <article className="space-y-3 rounded-xl bg-[var(--color-surface-alt)] p-4">
      <AttemptHeader title={row.testTitle} date={row.submittedAt} outcome={outcomePill(row.passed, TEST_STATUS[row.status])} />
      {row.score != null ? (
        <ScoreLine score={row.score} threshold={row.passingScore} passed={row.passed} />
      ) : (
        <p className="text-sm text-[var(--color-on-surface-variant)]">
          {row.status === "SUBMITTED" || row.status === "PENDING"
            ? "Bài làm đang trong hàng đợi chấm tự động."
            : row.status === "GRADING"
              ? "Hệ thống đang chạy test case và đánh giá AI..."
              : row.status === "FAILED"
                ? "Chấm bài tự động thất bại. Nhà tuyển dụng sẽ hỗ trợ chấm điểm."
                : row.status === "EXPIRED"
                  ? "Bài làm đã hết thời gian trước khi nộp nên không được tính điểm."
                  : "Chưa có điểm cho bài này."}
        </p>
      )}

      {/* AI Assessment & Code Review Feedback */}
      {evaluatedAnswers.length > 0 && (
        <div className="space-y-2.5 border-t border-[var(--color-border-default)]/60 pt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
              <Sparkles className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" />
              Đánh giá từ Trợ lý AI
            </span>
            <span className="rounded-full bg-[var(--color-primary-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
              Hybrid AI Engine
            </span>
          </div>

          <div className="space-y-2">
            {evaluatedAnswers.map(({ answer, question }) => {
              const evalData = (answer.evaluation ?? {}) as Record<string, any>;
              const codeReview = (evalData.code_review ?? evalData) as Record<string, any>;
              const isCoding = question?.questionType === "CODING";
              const isEssay = question?.questionType === "ESSAY";
              const testsPassed = evalData.passed !== undefined ? `${evalData.passed}/${evalData.total}` : null;
              const generalComment = codeReview.general_comment || evalData.general_comment;
              const timeComp = codeReview.time_complexity;
              const spaceComp = codeReview.space_complexity;
              const cleanCode = codeReview.clean_code;
              const hardcodeFlag = evalData.hardcode_suspected || codeReview.hardcode_suspected;
              const criteria = Array.isArray(evalData.criteria_results) ? evalData.criteria_results : [];

              return (
                <div
                  key={answer.questionId}
                  className="rounded-lg border border-[var(--color-border-default)] bg-white p-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded bg-[var(--color-surface-container)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-on-surface-variant)]">
                      Câu {question?.questionOrder ?? 1} · {isCoding ? "Bài thi lập trình" : isEssay ? "Câu hỏi tự luận" : "Đánh giá trắc nghiệm"}
                    </span>
                    {(answer.score !== undefined || answer.suggestedScore !== undefined) && (
                      <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-800">
                        {answer.score ?? answer.suggestedScore} / {question?.points ?? 0} đ
                      </span>
                    )}
                  </div>

                  {/* Coding Metrics Chips */}
                  {isCoding && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {testsPassed && (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          <CheckCircle2 className="size-3" aria-hidden="true" />
                          Kiểm thử: {testsPassed}
                        </span>
                      )}
                      {timeComp && (
                        <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                          <Cpu className="size-3" aria-hidden="true" />
                          Thời gian: {timeComp}
                        </span>
                      )}
                      {spaceComp && (
                        <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                          Bộ nhớ: {spaceComp}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Hardcode Warning */}
                  {hardcodeFlag && (
                    <div className="mt-2 flex items-center gap-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                      <AlertTriangle className="size-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                      <span>Phát hiện nghi vấn hardcode test case (áp trần 50% số điểm).</span>
                    </div>
                  )}

                  {/* General Comment */}
                  {generalComment && (
                    <div className="mt-2 rounded border-l-2 border-[var(--color-primary)] bg-[var(--color-surface-container-low)] p-2 text-xs text-[var(--color-on-surface-variant)]">
                      <p className="font-semibold text-[var(--color-on-surface)]">Nhận xét của AI:</p>
                      <p className="mt-0.5 leading-relaxed">{localizeAiComment(generalComment)}</p>
                      {cleanCode && <p className="mt-1 text-[11px] text-[var(--color-on-surface-variant)]">• {localizeAiComment(cleanCode)}</p>}
                    </div>
                  )}

                  {/* Essay Rubric Criteria Breakdown */}
                  {isEssay && criteria.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-[var(--color-border-default)]/70 pt-2">
                      <p className="text-[11px] font-semibold text-[var(--color-on-surface-variant)]">
                        Tiêu chí Rubric:
                      </p>
                      {criteria.map((c: any, idx: number) => (
                        <div key={idx} className="rounded bg-[var(--color-surface-container-low)] p-1.5 text-xs">
                          <div className="flex items-center justify-between font-medium">
                            <span>{c.name || `Tiêu chí ${idx + 1}`}</span>
                            <span className="font-semibold text-[var(--color-primary)]">{c.score_percent ?? 0}%</span>
                          </div>
                          {c.feedback && <p className="mt-0.5 text-[11px] text-[var(--color-on-surface-variant)]">{localizeAiComment(c.feedback)}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {finished && (
        <div className="pt-1">
          <Link to={`/assessments/${row.id}/take`} className="inline-flex text-xs font-semibold text-[var(--color-primary)] hover:underline">
            Xem toàn bộ kết quả bài làm →
          </Link>
        </div>
      )}
    </article>
  );
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
    <span>Điểm <strong className={cn("text-xl", gap != null && (gap < 0 ? "text-[var(--color-error)]" : "text-emerald-700"))}>{formatScore(score)}</strong></span>
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
