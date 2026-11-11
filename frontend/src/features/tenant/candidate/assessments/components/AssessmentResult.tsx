import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  CircleAlert,
  Code2,
  Cpu,
  FileQuestion,
  Hash,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Submission } from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { getAssessmentStatusLabel } from "@/components/ux/assessmentUi";
import { formatDateTime, useLocale, useT } from "@/i18n";
import { isDemoAssessmentTitle, shortAssessmentTitle } from "@/lib/assessmentTitle";
import { localizeAiComment } from "../utils/aiLocalization";

type Props = {
  submission: Submission;
  back: string;
  onRetake?: () => void;
  retaking?: boolean;
};

export function AssessmentResult({ submission, back, onRetake, retaking }: Props) {
  const t = useT();
  const locale = useLocale();
  const formatWhen = (value: string | null | undefined) => {
    if (!value) return null;
    return formatDateTime(
      value,
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
      locale,
    );
  };
  const isFailed = submission.status === "FAILED";
  const isGrading = submission.status === "GRADING";
  const isSubmittedOrPending = submission.status === "SUBMITTED" || submission.status === "PENDING";
  const pending = submission.score === null || isGrading || isSubmittedOrPending;
  const expired = submission.status === "EXPIRED";
  const demo = isDemoAssessmentTitle(submission.title);
  const isCompleted = submission.status === "COMPLETED" || submission.status === "GRADED";
  const passed = isCompleted && submission.passed === true;
  const failed = isCompleted && submission.passed === false;
  const ResultIcon = isFailed ? CircleAlert : pending ? Clock : failed ? CircleAlert : CheckCircle2;
  const scorePct =
    !pending && submission.totalPoints > 0
      ? Math.round(((submission.score ?? 0) / submission.totalPoints) * 100)
      : null;
  const questionCount = submission.questions?.length ?? 0;
  const quizCount = submission.questions?.filter((q) => q.questionType !== "CODING").length ?? 0;
  const codingCount = Math.max(0, questionCount - quizCount);
  const startedLabel = formatWhen(submission.startedAt);
  const submittedLabel = formatWhen(submission.submittedAt);
  const title = shortAssessmentTitle(null, submission.title);

  const evaluatedAnswers = (submission.answers ?? [])
    .map((ans) => {
      const q = (submission.questions ?? []).find((question) => question.id === ans.questionId);
      return { answer: ans, question: q };
    })
    .filter(
      (item) =>
        item.question &&
        (item.answer.evaluation || item.answer.score !== undefined || item.answer.suggestedScore !== undefined)
    );

  const headline = isFailed
    ? t("candidate.assess.result.headline.failed")
    : expired
      ? t("candidate.assess.result.headline.expired")
      : isGrading
        ? t("candidate.assess.result.headline.grading")
        : isSubmittedOrPending
          ? t("candidate.assess.result.headline.submittedOrPending")
          : isCompleted
            ? t("candidate.assess.result.headline.completed")
            : t("candidate.assess.result.headline.recorded");

  const detail = isFailed
    ? t("candidate.assess.result.detail.failed")
    : isGrading
      ? t("candidate.assess.result.detail.grading")
      : isSubmittedOrPending
        ? t("candidate.assess.result.detail.submittedOrPending")
        : pending
          ? t("candidate.assess.result.detail.pending")
          : passed
            ? t("candidate.assess.result.detail.passed")
            : failed
              ? t("candidate.assess.result.detail.failedThreshold")
              : t("candidate.assess.result.detail.completedDefault");

  const verdictLabel = isFailed
    ? t("candidate.assess.result.verdict.failed")
    : isGrading
      ? t("candidate.assess.result.verdict.grading")
      : isSubmittedOrPending
        ? t("candidate.assess.result.verdict.submittedOrPending")
        : pending
          ? t("candidate.assess.result.verdict.pending")
          : submission.passed === null
            ? t("candidate.assess.result.verdict.graded")
            : passed
              ? t("candidate.assess.result.verdict.passed")
              : t("candidate.assess.result.verdict.failedThreshold");

  /** Score panel color follows % (red → amber → yellow → green). Verdict chip still uses pass/fail. */
  const scoreTone = (() => {
    if (pending) {
      return {
        score: "text-[var(--color-primary)]",
        bar: "bg-[var(--color-primary)]",
        panel: "border-[var(--color-primary)]/20 bg-[linear-gradient(180deg,var(--color-primary-subtle)_0%,white_48%)]",
        icon: "bg-[var(--color-primary)] text-white",
      };
    }
    const pct = scorePct ?? 0;
    if (pct >= 80 || passed) {
      return {
        score: "text-emerald-700",
        bar: "bg-emerald-500",
        panel: "border-emerald-200 bg-[linear-gradient(180deg,#ecfdf5_0%,white_48%)]",
        icon: "bg-emerald-600 text-white",
      };
    }
    if (pct >= 60) {
      return {
        score: "text-lime-700",
        bar: "bg-lime-500",
        panel: "border-lime-200 bg-[linear-gradient(180deg,#f7fee7_0%,white_48%)]",
        icon: "bg-lime-600 text-white",
      };
    }
    if (pct >= 40) {
      return {
        score: "text-amber-700",
        bar: "bg-amber-400",
        panel: "border-amber-200 bg-[linear-gradient(180deg,#fffbeb_0%,white_48%)]",
        icon: "bg-amber-500 text-white",
      };
    }
    if (pct >= 20) {
      return {
        score: "text-orange-700",
        bar: "bg-orange-500",
        panel: "border-orange-200 bg-[linear-gradient(180deg,#fff7ed_0%,white_48%)]",
        icon: "bg-orange-500 text-white",
      };
    }
    return {
      score: "text-[var(--color-error)]",
      bar: "bg-[var(--color-error)]",
      panel: "border-[var(--color-error)]/20 bg-[linear-gradient(180deg,var(--color-error-container)_0%,white_48%)]",
      icon: "bg-[var(--color-error)] text-white",
    };
  })();

  const verdictChip = failed
    ? "bg-[var(--color-error-container)] text-[var(--color-on-error-container)]"
    : passed
      ? "bg-emerald-50 text-emerald-800"
      : "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]";

  const nextStep = pending
    ? t("candidate.assess.result.nextStep.pending")
    : passed
      ? t("candidate.assess.result.nextStep.passed")
      : failed
        ? t("candidate.assess.result.nextStep.failed")
        : t("candidate.assess.result.nextStep.default");

  return (
    <article
      aria-labelledby="assessment-result-title"
      className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-card)]"
    >
      <header className="shrink-0 border-b border-[var(--color-border-default)] bg-[linear-gradient(135deg,var(--color-primary-subtle),white_68%)] px-5 py-3.5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${scoreTone.icon}`}>
              <ResultIcon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
                {t("candidate.assess.result.eyebrow")}
              </p>
              <h1 id="assessment-result-title" className="truncate text-lg font-semibold tracking-tight sm:text-xl">
                {headline}
              </h1>
              <p className="truncate text-sm text-[var(--color-on-surface-variant)]">{title}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {demo && (
              <span className="rounded-full bg-[var(--color-surface-container)] px-3 py-1 text-xs font-semibold text-[var(--color-on-surface-variant)]">
                {t("candidate.assess.result.demoBadge")}
              </span>
            )}
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${verdictChip}`}>
              <ResultIcon className="size-3.5" aria-hidden="true" />
              {verdictLabel}
            </span>
          </div>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-5 text-[var(--color-on-surface-variant)]">{detail}</p>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden p-4 sm:p-5">
        <div className="mx-auto grid h-full min-h-0 w-full max-w-6xl gap-4 lg:grid-cols-[minmax(17rem,0.9fr)_minmax(0,1.1fr)]">
          <section className={`flex min-h-0 flex-col rounded-2xl border ${scoreTone.panel}`}>
            <div className="border-b border-[var(--color-border-default)]/60 px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-on-surface-variant)]">
                {t("candidate.assess.result.summaryEyebrow")}
              </p>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-on-surface-variant)]">
                  {t("candidate.assess.result.scoreHeading")}
                </p>
                {pending ? (
                  <div className="mt-2 flex items-center gap-3">
                      <span className={`grid size-11 place-items-center rounded-xl bg-white text-[var(--color-primary)] ring-1 ring-[var(--color-border-default)] ${isGrading ? "animate-pulse ring-indigo-400" : ""}`}>
                        <Clock className={`size-5 ${isGrading ? "animate-spin text-indigo-600" : ""}`} aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-2xl font-semibold tracking-tight">
                          {isFailed
                            ? t("candidate.assess.result.pendingTitle.failed")
                            : isGrading
                              ? t("candidate.assess.result.pendingTitle.grading")
                              : isSubmittedOrPending
                                ? t("candidate.assess.result.pendingTitle.submittedOrPending")
                                : t("candidate.assess.result.pendingTitle.waiting")}
                        </p>
                        <p className="text-sm text-[var(--color-on-surface-variant)]">
                          {isFailed
                            ? t("candidate.assess.result.pendingSubtitle.failed")
                            : isGrading
                              ? t("candidate.assess.result.pendingSubtitle.grading")
                              : t("candidate.assess.result.pendingSubtitle.waiting")}
                        </p>
                      </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className={`flex items-baseline gap-1.5 tabular-nums ${scoreTone.score}`}>
                      <span className="text-4xl font-semibold tracking-tight">{submission.score}</span>
                      <span className="text-base text-[var(--color-on-surface-variant)]">/ {submission.totalPoints}</span>
                    </p>
                    {scorePct !== null && (
                      <>
                        <p className="mt-1.5 text-sm text-[var(--color-on-surface-variant)]">
                          {t("candidate.assess.result.scorePctLabel", { pct: scorePct })}
                        </p>
                        <div
                          className="mt-2 h-1.5 overflow-hidden rounded-full bg-white ring-1 ring-[var(--color-border-default)]"
                          role="progressbar"
                          aria-valuenow={scorePct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={t("candidate.assess.result.scoreProgressAria")}
                        >
                          <div className={`h-full rounded-full ${scoreTone.bar}`} style={{ width: `${scorePct}%` }} />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-[var(--color-border-default)]/70 bg-white/95 px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-on-surface-variant)]">
                  {t("candidate.assess.result.evaluationHeading")}
                </p>
                <p className={`mt-1.5 inline-flex items-center gap-2 text-sm font-semibold ${scoreTone.score}`}>
                  <ResultIcon className="size-4" aria-hidden="true" />
                  {verdictLabel}
                </p>
                <p className="mt-1 text-sm leading-5 text-[var(--color-on-surface-variant)]">
                  {getAssessmentStatusLabel(submission.status, t)}
                  {submittedLabel ? ` · ${t("candidate.assess.result.submittedAtInline", { when: submittedLabel })}` : ""}
                </p>
              </div>

              <div className="flex gap-2.5 rounded-xl border border-[var(--color-border-default)]/70 bg-white/95 px-3.5 py-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{t("candidate.assess.result.nextStepHeading")}</p>
                  <p className="mt-0.5 text-sm leading-5 text-[var(--color-on-surface-variant)]">{nextStep}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="flex min-h-0 flex-col rounded-2xl border border-[var(--color-border-default)] bg-white">
            <div className="flex items-center gap-2 border-b border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-4 py-2.5">
              <ClipboardCheck className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-on-surface-variant)]">
                {t("candidate.assess.result.sessionDetailsHeading")}
              </p>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
              <dl className="rounded-xl border border-[var(--color-border-default)] divide-y divide-[var(--color-border-default)]">
                {startedLabel && <DetailRow label={t("candidate.assess.result.startedLabel")} value={startedLabel} />}
                {submittedLabel && <DetailRow label={t("candidate.assess.result.submittedLabel")} value={submittedLabel} />}
                <DetailRow label={t("candidate.assess.result.submissionIdLabel")} value={`#${submission.id}`} />
              </dl>

              <div>
                <p className="mb-2 text-sm font-semibold">{t("candidate.assess.result.structureHeading")}</p>
                <ul className="grid grid-cols-3 gap-2">
                  <DetailStat icon={FileQuestion} label={t("candidate.assess.result.totalQuestions")} value={questionCount || "—"} />
                  <DetailStat icon={ClipboardCheck} label={t("candidate.assess.result.quizQuestions")} value={questionCount ? quizCount : "—"} />
                  <DetailStat icon={Code2} label={t("candidate.assess.result.codingQuestions")} value={questionCount ? codingCount : "—"} />
                </ul>
              </div>

              {demo && (
                <p className="rounded-xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-3.5 py-2.5 text-sm leading-5 text-[var(--color-on-surface-variant)]">
                  {t("candidate.assess.result.demoDisclaimer")}
                </p>
              )}

              {/* AI Assessment & Code Review Feedback */}
              {evaluatedAnswers.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border-default)] pt-4">
                    <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                      <Sparkles className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" />
                      {t("candidate.assess.result.aiEvaluationHeading")}
                    </span>
                    <span className="rounded-full bg-[var(--color-primary-subtle)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-primary)]">
                      {t("candidate.assess.result.aiEngineBadge")}
                    </span>
                  </div>

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
                    const order = question?.questionOrder ?? 1;

                    return (
                      <div
                        key={answer.questionId}
                        className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-lowest)] p-3.5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="inline-flex items-center gap-1 rounded bg-[var(--color-surface-container)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-on-surface-variant)]">
                              {isCoding
                                ? t("candidate.assess.result.questionMetaCoding", { order })
                                : isEssay
                                  ? t("candidate.assess.result.questionMetaEssay", { order })
                                  : t("candidate.assess.result.questionMetaQuiz", { order })}
                            </span>
                          </div>
                          {(answer.score !== undefined || answer.suggestedScore !== undefined) && (
                            <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                              {t("candidate.assess.common.pointsShort", {
                                score: answer.score ?? answer.suggestedScore ?? 0,
                                total: question?.points ?? 0,
                              })}
                            </span>
                          )}
                        </div>

                        {/* Coding Metrics Chips */}
                        {isCoding && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {testsPassed && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                <CheckCircle2 className="size-3" aria-hidden="true" />
                                {t("candidate.assess.result.testsPassedChip", { passed: testsPassed })}
                              </span>
                            )}
                            {timeComp && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                                <Cpu className="size-3" aria-hidden="true" />
                                {t("candidate.assess.result.timeComplexityChip", { value: timeComp })}
                              </span>
                            )}
                            {spaceComp && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                                {t("candidate.assess.result.spaceComplexityChip", { value: spaceComp })}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Hardcode Warning */}
                        {hardcodeFlag && (
                          <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                            <AlertTriangle className="size-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                            <span>{t("candidate.assess.result.hardcodeWarning")}</span>
                          </div>
                        )}

                        {/* General Comment */}
                        {generalComment && (
                          <div className="mt-2.5 rounded-lg border-l-2 border-[var(--color-primary)] bg-[var(--color-surface-container-low)] p-2.5 text-xs text-[var(--color-on-surface-variant)]">
                            <p className="font-semibold text-[var(--color-on-surface)]">{t("candidate.assess.result.aiCommentHeading")}</p>
                            <p className="mt-0.5 leading-relaxed">{localizeAiComment(generalComment, t)}</p>
                            {cleanCode && <p className="mt-1 text-[11px] text-[var(--color-on-surface-variant)]">• {localizeAiComment(cleanCode, t)}</p>}
                          </div>
                        )}

                        {/* Essay Rubric Criteria Breakdown */}
                        {isEssay && criteria.length > 0 && (
                          <div className="mt-2.5 space-y-1.5 border-t border-[var(--color-border-default)]/70 pt-2">
                            <p className="text-[11px] font-semibold text-[var(--color-on-surface-variant)]">
                              {t("candidate.assess.result.rubricHeading")}
                            </p>
                            {criteria.map((c: any, idx: number) => (
                              <div key={idx} className="rounded bg-[var(--color-surface-container-low)] p-2 text-xs">
                                <div className="flex items-center justify-between font-medium">
                                  <span>{c.name || t("candidate.assess.result.rubricCriterionFallback", { index: idx + 1 })}</span>
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
              )}
            </div>
          </section>
        </div>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-5 py-3 sm:px-6">
        <Link
          to={back}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-white px-3.5 text-sm font-semibold text-[var(--color-on-surface)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-primary)]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("candidate.assess.result.backToList")}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden items-center gap-1.5 text-xs text-[var(--color-on-surface-variant)] sm:inline-flex">
            <Hash className="size-3.5" aria-hidden="true" />#{submission.id}
          </span>
          {demo && onRetake && (
            <Button disabled={retaking} onClick={onRetake}>
              <RotateCcw className="size-4" aria-hidden="true" />
              {retaking ? t("candidate.assess.result.opening") : t("candidate.assess.result.retakeFromStart")}
            </Button>
          )}
        </div>
      </footer>
    </article>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 px-3.5 py-2.5 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:items-center sm:gap-3">
      <dt className="text-sm text-[var(--color-on-surface-variant)]">{label}</dt>
      <dd className="truncate text-sm font-medium tabular-nums text-[var(--color-on-surface)]">{value}</dd>
    </div>
  );
}

function DetailStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string | number;
}) {
  return (
    <li className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-3 py-2.5 text-center">
      <Icon className="mx-auto size-4 text-[var(--color-primary)]" aria-hidden="true" />
      <p className="mt-1 text-[11px] text-[var(--color-on-surface-variant)]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </li>
  );
}
