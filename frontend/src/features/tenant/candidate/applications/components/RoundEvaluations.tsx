import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check, CheckCircle2, Cpu, Lightbulb, Minus, Sparkles, X } from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import type { AiInterviewEvaluationView, AssessmentEvaluationView, CandidateEvaluationView, CvEvaluationView } from "@/api/types/applicant";
import { StatusPill } from "@/components/ux/StatusPill";
import { formatDateTime, formatNumber, useLocale, useT, type Locale, type TranslateFn } from "@/i18n";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { localizeAiComment } from "@/features/tenant/candidate/assessments/utils/aiLocalization";

export type RoundKey = "cv" | "aiInterview" | "assessment";

export function RoundEvaluation({ id, round, data }: { id: string; round: RoundKey; data: CandidateEvaluationView }) {
  const t = useT();
  const content = round === "cv"
    ? data.cv && <CvEvaluation cv={data.cv} />
    : round === "aiInterview"
      ? data.aiInterviews.length > 0 && <ol className="space-y-3">{data.aiInterviews.map((row) => <li key={row.id}><InterviewAttempt row={row} total={data.aiInterviews.length} /></li>)}</ol>
      : data.assessments.length > 0 && <ol className="space-y-3">{data.assessments.map((row) => <li key={row.id}><AssessmentAttempt row={row} /></li>)}</ol>;
  return <section id={id} aria-labelledby={`${id}-title`} className="rounded-2xl border border-[var(--color-primary)]/30 bg-white p-5 shadow-[var(--shadow-card)]">
    <h2 id={`${id}-title`} className="text-lg font-semibold">
      {t("candidate.core.applications.evaluation.heading", {
        round: t(`candidate.core.applications.evaluation.rounds.${round}`),
      })}
    </h2>
    <p className="mb-4 mt-1 text-sm text-[var(--color-on-surface-variant)]">{t("candidate.core.applications.evaluation.subtitle")}</p>
    {content || <p className="text-sm text-[var(--color-on-surface-variant)]">{t("candidate.core.applications.evaluation.emptyRound")}</p>}
  </section>;
}

function candidateLearning(cv: CvEvaluationView, t: TranslateFn) {
  const parts: string[] = [];
  if (cv.requiredMissingSkills.length > 0) {
    parts.push(t("candidate.core.applications.evaluation.learning.missingRequired", { skills: cv.requiredMissingSkills.join(", ") }));
  }
  if (cv.partialSkills.length > 0) {
    parts.push(t("candidate.core.applications.evaluation.learning.partialSkills", { skills: cv.partialSkills.join(", ") }));
  }
  if (cv.passed) {
    parts.push(t("candidate.core.applications.evaluation.learning.passed"));
  } else if (cv.requiredMissingSkills.length === 0) {
    parts.push(t("candidate.core.applications.evaluation.learning.failedNoMissing"));
  }
  return parts.join(" ");
}

function CvEvaluation({ cv }: { cv: CvEvaluationView }) {
  const t = useT();
  const optionalMissing = cv.missingSkills.filter((skill) => !cv.requiredMissingSkills.includes(skill));
  const advice = cv.candidateAdvice?.trim() || candidateLearning(cv, t);
  return <div className="space-y-4">
    <ScoreLine score={cv.score} threshold={cv.threshold} passed={cv.passed} />
    {cv.passed === true && cv.threshold != null && cv.score < cv.threshold && <Reason title={t("candidate.core.applications.evaluation.cv.roundOutcomeTitle")}>{t("candidate.core.applications.evaluation.cv.roundOutcomeApproved")}</Reason>}
    {cv.explanation && <Reason title={t("candidate.core.applications.evaluation.cv.commentTitle")}>{cv.explanation}</Reason>}
    {advice && <div className="rounded-xl bg-[var(--color-primary-subtle)] p-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold"><Lightbulb className="size-4 text-[var(--color-primary)]" aria-hidden="true" />{cv.candidateAdvice?.trim() ? t("candidate.core.applications.evaluation.cv.aiAdviceTitle") : t("candidate.core.applications.evaluation.cv.learningAdviceTitle")}</h4>
      <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[var(--color-on-surface-variant)]">{advice}</p>
    </div>}
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{t("candidate.core.applications.evaluation.cv.skillsComparisonTitle")}</h4>
      <div className="flex flex-wrap gap-2">
        {cv.matchedSkills.map((skill) => <SkillChip key={`m-${skill}`} kind="match">{skill}</SkillChip>)}
        {cv.partialSkills.map((skill) => <SkillChip key={`p-${skill}`} kind="partial">{skill}</SkillChip>)}
        {cv.requiredMissingSkills.map((skill) => <SkillChip key={`r-${skill}`} kind="missing">{t("candidate.core.applications.evaluation.cv.requiredSkill", { skill })}</SkillChip>)}
        {optionalMissing.map((skill) => <SkillChip key={`o-${skill}`} kind="missing">{skill}</SkillChip>)}
      </div>
      {cv.matchedSkills.length + cv.partialSkills.length + cv.missingSkills.length === 0 && <p className="text-sm text-[var(--color-on-surface-variant)]">{t("candidate.core.applications.evaluation.cv.noDeclaredSkills")}</p>}
    </div>
    {(cv.requiredYears != null || cv.requiredEducation) && <dl className="grid gap-2 text-sm sm:grid-cols-2">
      {cv.requiredYears != null && <Fact label={t("candidate.core.applications.evaluation.cv.experienceLabel")} value={t("candidate.core.applications.evaluation.cv.experienceYears", { years: cv.candidateYears ?? 0 })} hint={t("candidate.core.applications.evaluation.cv.experienceRequired", { years: cv.requiredYears })} ok={(cv.candidateYears ?? 0) >= cv.requiredYears} />}
      {cv.requiredEducation && <Fact label={t("candidate.core.applications.evaluation.cv.educationLabel")} value={cv.candidateEducation ?? t("candidate.core.applications.evaluation.cv.educationUnknown")} hint={t("candidate.core.applications.evaluation.cv.educationRequired", { education: cv.requiredEducation })} />}
    </dl>}
  </div>;
}

function InterviewAttempt({ row, total }: { row: AiInterviewEvaluationView; total: number }) {
  const t = useT();
  const locale = useLocale();
  const criteria = Object.entries(row.criteria);
  const finished = row.score != null;
  const aiStatusKey = `candidate.core.applications.evaluation.aiStatus.${row.status}`;
  const aiStatusLabel = t(aiStatusKey);
  return <article className="space-y-3 rounded-xl bg-[var(--color-surface-alt)] p-4">
    <AttemptHeader
      title={total > 1 ? t("candidate.core.applications.evaluation.interview.attemptTitle", { count: row.attemptNumber }) : t("candidate.core.applications.evaluation.interview.resultTitle")}
      date={row.completedAt}
      outcome={outcomePill(t, row.passed, aiStatusLabel === aiStatusKey ? row.status : aiStatusLabel)}
    />
    {finished ? <ScoreLine score={row.score!} threshold={row.passingScore} passed={row.passed} /> : <p className="text-sm text-[var(--color-on-surface-variant)]">{t("candidate.core.applications.evaluation.interview.noScore")}</p>}
    {row.summary && <Reason title={t("candidate.core.applications.evaluation.interview.summaryTitle")}>{row.summary}</Reason>}
    {(row.strengths || row.weaknesses) && <div className="grid gap-3 sm:grid-cols-2">
      {row.strengths && <Reason title={t("candidate.core.applications.evaluation.interview.strengthsTitle")}>{row.strengths}</Reason>}
      {row.weaknesses && <Reason title={t("candidate.core.applications.evaluation.interview.weaknessesTitle")}>{row.weaknesses}</Reason>}
    </div>}
    {criteria.length > 0 && <div className="space-y-2">
      <h4 className="text-sm font-semibold">{t("candidate.core.applications.evaluation.interview.criteriaScoreTitle")}</h4>
      <ul className="space-y-2">{criteria.map(([key, value]) => {
        const critKey = `candidate.core.applications.evaluation.criteria.${key}`;
        const critLabel = t(critKey);
        return <li key={key} className="grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-3 text-sm">
          <span className="truncate text-[var(--color-on-surface-variant)]">{critLabel === critKey ? key : critLabel}</span>
          <span className="h-2 overflow-hidden rounded-full bg-white" aria-hidden="true"><span className="block h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></span>
          <span className="text-right font-semibold">{formatScore(value, locale)}</span>
        </li>;
      })}</ul>
    </div>}
    {finished && <Link to={`/interviews/${row.id}`} className="inline-flex text-sm font-semibold text-[var(--color-primary)] hover:underline">{t("candidate.core.applications.evaluation.interview.viewInterview")}</Link>}
  </article>;
}

function AssessmentAttempt({ row }: { row: AssessmentEvaluationView }) {
  const t = useT();
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
  const testStatusKey = `candidate.core.applications.evaluation.testStatus.${row.status}`;
  const testStatusLabel = t(testStatusKey);

  return (
    <article className="space-y-3 rounded-xl bg-[var(--color-surface-alt)] p-4">
      <AttemptHeader title={row.testTitle} date={row.submittedAt} outcome={outcomePill(t, row.passed, testStatusLabel === testStatusKey ? row.status : testStatusLabel)} />
      {row.score != null ? (
        <ScoreLine score={row.score} threshold={row.passingScore} passed={row.passed} />
      ) : (
        <p className="text-sm text-[var(--color-on-surface-variant)]">
          {row.status === "SUBMITTED" || row.status === "PENDING"
            ? t("candidate.core.applications.evaluation.assessment.queued")
            : row.status === "GRADING"
              ? t("candidate.core.applications.evaluation.assessment.grading")
              : row.status === "FAILED"
                ? t("candidate.core.applications.evaluation.assessment.failed")
                : row.status === "EXPIRED"
                  ? t("candidate.core.applications.evaluation.assessment.expired")
                  : t("candidate.core.applications.evaluation.assessment.noScore")}
        </p>
      )}

      {/* AI Assessment & Code Review Feedback */}
      {evaluatedAnswers.length > 0 && (
        <div className="space-y-2.5 border-t border-[var(--color-border-default)]/60 pt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
              <Sparkles className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" />
              {t("candidate.core.applications.evaluation.assessment.aiHeader")}
            </span>
            <span className="rounded-full bg-[var(--color-primary-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
              {t("candidate.core.applications.evaluation.assessment.engineBadge")}
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
              const typeLabel = isCoding
                ? t("candidate.core.applications.evaluation.assessment.typeCoding")
                : isEssay
                  ? t("candidate.core.applications.evaluation.assessment.typeEssay")
                  : t("candidate.core.applications.evaluation.assessment.typeQuiz");

              return (
                <div
                  key={answer.questionId}
                  className="rounded-lg border border-[var(--color-border-default)] bg-white p-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded bg-[var(--color-surface-container)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-on-surface-variant)]">
                      {t("candidate.core.applications.evaluation.assessment.questionLabel", {
                        order: question?.questionOrder ?? 1,
                        type: typeLabel,
                      })}
                    </span>
                    {(answer.score !== undefined || answer.suggestedScore !== undefined) && (
                      <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-800">
                        {t("candidate.core.applications.evaluation.assessment.pointsShort", {
                          score: answer.score ?? answer.suggestedScore ?? 0,
                          max: question?.points ?? 0,
                        })}
                      </span>
                    )}
                  </div>

                  {/* Coding Metrics Chips */}
                  {isCoding && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {testsPassed && (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          <CheckCircle2 className="size-3" aria-hidden="true" />
                          {t("candidate.core.applications.evaluation.assessment.testsPassed", { ratio: testsPassed })}
                        </span>
                      )}
                      {timeComp && (
                        <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                          <Cpu className="size-3" aria-hidden="true" />
                          {t("candidate.core.applications.evaluation.assessment.timeComplexity", { value: String(timeComp) })}
                        </span>
                      )}
                      {spaceComp && (
                        <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                          {t("candidate.core.applications.evaluation.assessment.spaceComplexity", { value: String(spaceComp) })}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Hardcode Warning */}
                  {hardcodeFlag && (
                    <div className="mt-2 flex items-center gap-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                      <AlertTriangle className="size-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                      <span>{t("candidate.core.applications.evaluation.assessment.hardcodeWarning")}</span>
                    </div>
                  )}

                  {/* General Comment */}
                  {generalComment && (
                    <div className="mt-2 rounded border-l-2 border-[var(--color-primary)] bg-[var(--color-surface-container-low)] p-2 text-xs text-[var(--color-on-surface-variant)]">
                      <p className="font-semibold text-[var(--color-on-surface)]">{t("candidate.core.applications.evaluation.assessment.aiCommentLabel")}</p>
                      <p className="mt-0.5 leading-relaxed">{localizeAiComment(generalComment, t)}</p>
                      {cleanCode && <p className="mt-1 text-[11px] text-[var(--color-on-surface-variant)]">• {localizeAiComment(cleanCode, t)}</p>}
                    </div>
                  )}

                  {/* Essay Rubric Criteria Breakdown */}
                  {isEssay && criteria.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-[var(--color-border-default)]/70 pt-2">
                      <p className="text-[11px] font-semibold text-[var(--color-on-surface-variant)]">
                        {t("candidate.core.applications.evaluation.assessment.rubricCriteriaLabel")}
                      </p>
                      {criteria.map((c: any, idx: number) => (
                        <div key={idx} className="rounded bg-[var(--color-surface-container-low)] p-1.5 text-xs">
                          <div className="flex items-center justify-between font-medium">
                            <span>{c.name || t("candidate.core.applications.evaluation.assessment.criterionFallback", { index: idx + 1 })}</span>
                            <span className="font-semibold text-[var(--color-primary)]">{c.score_percent ?? 0}%</span>
                          </div>
                          {c.feedback && <p className="mt-0.5 text-[11px] text-[var(--color-on-surface-variant)]">{localizeAiComment(c.feedback, t)}</p>}
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
            {t("candidate.core.applications.evaluation.assessment.viewFullResults")}
          </Link>
        </div>
      )}
    </article>
  );
}

function AttemptHeader({ title, date, outcome }: { title: string; date: string | null; outcome: ReactNode }) {
  const locale = useLocale();
  return <div className="flex flex-wrap items-center justify-between gap-2">
    <div className="min-w-0"><h3 className="truncate text-sm font-semibold">{title}</h3>{date && <time className="text-xs text-[var(--color-on-surface-variant)]" dateTime={date}>{formatDateTime(date, undefined, locale)}</time>}</div>
    {outcome}
  </div>;
}

function ScoreLine({ score, threshold, passed }: { score: number; threshold: number | null; passed: boolean | null }) {
  const t = useT();
  const locale = useLocale();
  const gap = threshold == null ? null : score - threshold;
  const formattedScore = formatScore(score, locale);
  const [scoreBefore, scoreAfter] = t("candidate.core.applications.evaluation.scoreLine.scoreLabel", { score: "\0" }).split("\0");
  return <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
    <span>{scoreBefore}<strong className={cn("text-xl", gap != null && (gap < 0 ? "text-[var(--color-error)]" : "text-emerald-700"))}>{formattedScore}</strong>{scoreAfter}</span>
    {threshold != null && <span className="text-[var(--color-on-surface-variant)]">{t("candidate.core.applications.evaluation.scoreLine.thresholdLabel", { threshold: formatScore(threshold, locale) })}</span>}
    {gap != null && passed === false && gap < 0 && <span className="font-medium text-[var(--color-error)]">{t("candidate.core.applications.evaluation.scoreLine.shortBy", { gap: formatScore(-gap, locale) })}</span>}
  </p>;
}

function Reason({ title, children }: { title: string; children: ReactNode }) {
  return <div><h4 className="text-sm font-semibold">{title}</h4><p className="mt-1 whitespace-pre-line text-sm leading-6 text-[var(--color-on-surface-variant)]">{children}</p></div>;
}

function Fact({ label, value, hint, ok }: { label: string; value: string; hint: string; ok?: boolean }) {
  const t = useT();
  return <div className="rounded-xl bg-[var(--color-surface-alt)] p-3">
    <dt className="text-xs text-[var(--color-on-surface-variant)]">{label}</dt>
    <dd className="mt-0.5 font-semibold">{value}{ok === false && <span className="ml-2 text-xs font-medium text-[var(--color-error)]">{t("candidate.core.applications.evaluation.fact.insufficient")}</span>}</dd>
    <dd className="text-xs text-[var(--color-on-surface-variant)]">{hint}</dd>
  </div>;
}

function SkillChip({ kind, children }: { kind: "match" | "partial" | "missing"; children: ReactNode }) {
  const t = useT();
  const Icon = kind === "match" ? Check : kind === "partial" ? Minus : X;
  const label = kind === "match"
    ? t("candidate.core.applications.evaluation.skillChip.match")
    : kind === "partial"
      ? t("candidate.core.applications.evaluation.skillChip.partial")
      : t("candidate.core.applications.evaluation.skillChip.missing");
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
    kind === "match" && "border-emerald-200 bg-emerald-50 text-emerald-800",
    kind === "partial" && "border-amber-200 bg-amber-50 text-amber-800",
    kind === "missing" && "border-red-200 bg-red-50 text-red-700")}>
    <Icon className="size-3.5" aria-hidden="true" /><span className="sr-only">{label}: </span>{children}
  </span>;
}

function outcomePill(t: TranslateFn, passed: boolean | null, pendingLabel?: string) {
  if (passed === true) return <StatusPill status="PASSED" label={t("candidate.core.applications.evaluation.outcome.passed")} />;
  if (passed === false) return <StatusPill status="FAILED" label={t("candidate.core.applications.evaluation.outcome.failed")} />;
  return <StatusPill status="PENDING" label={pendingLabel ?? t("candidate.core.applications.evaluation.outcome.pending")} />;
}

function formatScore(value: number, locale: Locale) {
  return formatNumber(value, { maximumFractionDigits: 1 }, locale);
}
