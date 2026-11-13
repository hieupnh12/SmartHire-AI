import { AlertTriangle, CheckCircle2, Database, FileCheck2, Sparkles, XCircle } from "lucide-react";
import { AVAILABLE_INTERVIEW_PROCESS } from "../utils/interviewProcessSettings";
import { type AiInterviewReport, type AiQuestion, type CompetencyKey } from "@/api/types/aiInterview";
import { useLocale, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { formatInterviewScore } from "./aiInterviewUi";

const KNOWN_CRITERIA = new Set(["TECHNICAL_KNOWLEDGE", "PROBLEM_SOLVING", "REASONING", "COMMUNICATION"]);

export function parseAiInterviewReport(json: string | null | undefined): AiInterviewReport | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as AiInterviewReport;
  } catch {
    return null;
  }
}

export function AiInterviewReportView({
  reportJson,
  questions,
  section = "all",
  bare = false,
  passingScore,
}: {
  reportJson: string | null | undefined;
  questions: AiQuestion[];
  section?: "all" | "summary" | "metrics";
  bare?: boolean;
  passingScore?: number | null;
}) {
  const t = useT();
  const locale = useLocale();
  const report = parseAiInterviewReport(reportJson);
  if (!report) return null;

  const criterionLabel = (key: string) =>
    KNOWN_CRITERIA.has(key) ? t(`recruiter.interviews.ai.report.criteria.${key}`) : key;

  const competencyLabel = (key: CompetencyKey) => {
    const k = `recruiter.interviews.competencies.${key}`;
    const res = t(k);
    return res === k ? key : res;
  };

  const visibleSkills = Object.entries(report.skills ?? {}).filter(([, entry]) =>
    entry.questionIds?.some((id) => questions.some((question) => question.id === id))
  );
  const questionNumber = new Map(questions.map((q, index) => [q.id, index + 1]));
  const visibleCompetencies = (Object.entries(report.competencies ?? {}) as [CompetencyKey, number][])
    .filter(([key]) => key === AVAILABLE_INTERVIEW_PROCESS);
  const criteriaEntries = Object.entries(report.communicationCriteria ?? {});
  const showSummary = section === "all" || section === "summary";
  const showMetrics = section === "all" || section === "metrics";

  const pct = Math.min(Math.max(Number(report.overallScore ?? 0), 0), 100);
  const passed = passingScore != null ? report.overallScore >= passingScore : report.overallScore >= 50;

  const content = (
    <div className="space-y-5">
      {!bare && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)] text-[var(--color-primary)] shadow-2xs">
              <FileCheck2 className="size-4.5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="ai-report-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t("recruiter.interviews.ai.report.title")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("recruiter.interviews.ai.report.subtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {report.ragSemanticEvaluation && (
              <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                RAG Match: <strong className="text-sm font-extrabold">{report.ragSemanticEvaluation.semanticMatchPercentage}%</strong>
              </span>
            )}
            <span className="rounded-full border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-primary-hover)]">
              {t("recruiter.interviews.ai.report.overallScoreLabel")}{" "}
              <strong className="text-sm font-extrabold">{formatInterviewScore(report.overallScore, locale)}/100</strong>
            </span>
          </div>
        </div>
      )}

      {/* RAG & Vector DB Semantic Evaluation Section */}
      {showSummary && report.ragSemanticEvaluation && (
        <div className="space-y-3 rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 p-4 dark:border-indigo-900/60 dark:from-indigo-950/20 dark:via-slate-900 dark:to-blue-950/20">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 dark:border-indigo-900/50 pb-3">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-indigo-600 text-white shadow-2xs">
                <Database className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                  Đối soát Ngữ nghĩa RAG & Vector DB
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  So khớp vector embedding câu trả lời ứng viên với Key Points mẫu (Ngưỡng tương đồng: {report.ragSemanticEvaluation.threshold})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-md bg-white border border-indigo-200 px-2 py-0.5 font-medium text-indigo-700 dark:bg-slate-800 dark:border-indigo-800 dark:text-indigo-300">
                <Sparkles className="size-3 text-indigo-500" />
                Hybrid Score: 40% Vector + 60% LLM
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 pt-1">
            <div className="rounded-lg border border-slate-200/70 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">Tỷ lệ khớp ngữ nghĩa</span>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {report.ragSemanticEvaluation.semanticMatchPercentage}%
                </span>
                <span className="text-xs text-slate-400">
                  {report.ragSemanticEvaluation.matchedKeyPoints}/{report.ragSemanticEvaluation.totalKeyPoints} keypoints
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, report.ragSemanticEvaluation.semanticMatchPercentage))}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200/70 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">Điểm Vector / RAG (40%)</span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {report.ragScore ?? report.ragSemanticEvaluation.semanticMatchPercentage}
                <span className="text-xs font-normal text-slate-400"> /100</span>
              </span>
              <p className="mt-1 text-[10px] text-slate-400">Dựa trên cosine similarity vector embedding</p>
            </div>

            <div className="rounded-lg border border-slate-200/70 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">Điểm Đánh giá LLM (60%)</span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {report.llmScore ?? report.overallScore}
                <span className="text-xs font-normal text-slate-400"> /100</span>
              </span>
              <p className="mt-1 text-[10px] text-slate-400">Đánh giá đa chiều theo rubric & ngữ cảnh</p>
            </div>
          </div>

          {/* Details per question if available */}
          {report.ragSemanticEvaluation.details && report.ragSemanticEvaluation.details.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Chi tiết so khớp Key Points từng câu:
              </span>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {report.ragSemanticEvaluation.details.map((detail, dIdx) => (
                  <div key={dIdx} className="rounded-lg border border-slate-200/60 bg-white/80 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/80">
                    <div className="flex items-center justify-between font-medium text-slate-800 dark:text-slate-200 mb-1">
                      <span className="truncate pr-2">Câu {dIdx + 1}: {detail.questionText}</span>
                      <span className="shrink-0 font-bold text-indigo-600">{detail.matchPercentage}% đạt</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {detail.matchedKeyPoints.map((kp, kpIdx) => (
                        <span key={kpIdx} className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200">
                          <CheckCircle2 className="size-3 text-emerald-600" />
                          {kp}
                        </span>
                      ))}
                      {detail.missingKeyPoints.map((kp, kpIdx) => (
                        <span key={kpIdx} className="inline-flex items-center gap-1 rounded bg-slate-50 border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                          <XCircle className="size-3 text-slate-400" />
                          {kp}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      {/* Summary & Qualitative Insights (matches CV Screening AI Card) */}
      {showSummary && (
        <div className="space-y-4">
          {report.evaluationMode === "POST_SESSION" && (report.summary || report.strengths || report.weaknesses) && (
            <div className="space-y-3 rounded-2xl bg-[var(--color-primary-subtle)] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-on-surface)]">
                  <Sparkles className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
                  {t("recruiter.interviews.ai.report.aiInsightsTitle")}
                </div>
                <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-primary)]">
                  {t("recruiter.interviews.ai.report.deepEvaluationBadge")}
                </span>
              </div>

              {report.summary && (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-on-surface)]">
                  {report.summary}
                </p>
              )}

              {(report.strengths || report.weaknesses) && (
                <div className="grid gap-3 border-t border-[var(--color-primary)]/15 pt-3 sm:grid-cols-2">
                  {report.strengths && (
                    <div className="space-y-1.5">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                        {t("recruiter.interviews.ai.report.strengthsTitle")}
                      </p>
                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-[var(--color-on-surface)]">
                        {report.strengths}
                      </p>
                    </div>
                  )}
                  {report.weaknesses && (
                    <div className="space-y-1.5">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                        <AlertTriangle className="size-3.5 shrink-0 text-amber-600" aria-hidden="true" />
                        {t("recruiter.interviews.ai.report.weaknessesTitle")}
                      </p>
                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-[var(--color-on-surface)]">
                        {report.weaknesses}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Evidence Citations per Criterion */}
          {report.evaluationMode === "POST_SESSION" && criteriaEntries.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                {t("recruiter.interviews.ai.report.criteriaEvidenceTitle")}
              </h4>
              <dl className="grid gap-3 sm:grid-cols-2">
                {criteriaEntries.map(([criterion, score]) => {
                  const evidenceList = report.criteriaEvidence?.[criterion] ?? [];
                  return (
                    <div key={criterion} className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-3.5 shadow-2xs">
                      <dt className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        <span>
                          {criterionLabel(criterion)}
                          {report.criterionWeights?.[criterion] != null && (
                            <span className="font-normal text-slate-400"> ({report.criterionWeights[criterion]}%)</span>
                          )}
                        </span>
                        <span className="rounded-md bg-[var(--color-primary-soft)] px-2 py-0.5 font-bold tabular-nums text-[var(--color-primary-hover)]">
                          {score}/100
                        </span>
                      </dt>
                      {evidenceList.length > 0 ? (
                        evidenceList.map((evidence, index) => (
                          <dd
                            key={index}
                            className="mt-2 border-t border-slate-100 pt-2 text-[11px] italic leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-400 whitespace-pre-wrap"
                          >
                            <span className="not-italic font-semibold text-[var(--color-primary-hover)]">
                              {t("recruiter.interviews.ai.report.messageRef", { id: evidence.messageId })}
                            </span>{" "}
                            “{evidence.quote}”
                          </dd>
                        ))
                      ) : (
                        <dd className="mt-2 border-t border-slate-100 pt-2 text-[11px] italic text-slate-400 dark:border-slate-800">
                          {t("recruiter.interviews.ai.report.noEvidenceQuote")}
                        </dd>
                      )}
                    </div>
                  );
                })}
              </dl>
            </div>
          )}

          {/* Non-POST_SESSION Criteria Summary */}
          {report.evaluationMode !== "POST_SESSION" && criteriaEntries.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                {t("recruiter.interviews.ai.report.communicationCriteriaTitle")}
              </h4>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {criteriaEntries.map(([key, score]) => (
                  <li
                    key={key}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-[var(--color-surface-alt)] p-3 text-xs"
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {criterionLabel(key)}
                    </span>
                    <span className="rounded-md border border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)] px-2 py-0.5 font-bold tabular-nums text-[var(--color-primary-hover)]">
                      {score}/100
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Quantitative Metrics & Breakdown (matches CV Thành phần điểm tab) */}
      {showMetrics && (
        <div className="space-y-5">
          {bare && (
            <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    {t("recruiter.interviews.ai.report.overallScoreTitle")}
                  </p>
                  <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">
                    {formatInterviewScore(report.overallScore, locale)}
                    <span className="text-base font-normal text-[var(--color-on-surface-variant)]"> /100</span>
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-xs font-semibold",
                    passed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                  )}
                >
                  {passed ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <XCircle className="size-4" aria-hidden="true" />}
                  {passed ? t("recruiter.interviews.ai.report.passed") : t("recruiter.interviews.ai.report.failed")}
                </span>
              </div>

              <div className="relative mt-4 h-2.5 w-full overflow-visible rounded-full bg-[var(--color-surface-container-high)]">
                <div className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500" style={{ width: `${pct}%` }} />
                {passingScore != null && (
                  <div
                    className="absolute -top-1 h-[18px] w-0.5 -translate-x-1/2 rounded-full bg-[var(--color-on-surface)]"
                    style={{ left: `${Math.min(Math.max(passingScore, 0), 100)}%` }}
                    title={t("recruiter.interviews.ai.report.thresholdTooltip", { score: formatInterviewScore(passingScore, locale) })}
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-on-surface-variant)]">
                <span>
                  {passed
                    ? t("recruiter.interviews.ai.report.passedDesc")
                    : passingScore != null
                      ? t("recruiter.interviews.ai.report.failedWithThresholdDesc", {
                          score: formatInterviewScore(report.overallScore, locale),
                          threshold: formatInterviewScore(passingScore, locale),
                        })
                      : t("recruiter.interviews.ai.report.failedNoThresholdDesc")}
                </span>
                {passingScore != null && (
                  <span className="tabular-nums">
                    {t("recruiter.interviews.ai.report.thresholdLabel", { score: formatInterviewScore(passingScore, locale) })}
                  </span>
                )}
              </div>
            </div>
          )}

          {criteriaEntries.length > 0 && (
            <div className="space-y-3 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {t("recruiter.interviews.ai.report.criteriaBreakdownTitle")}
              </h4>
              <div className="space-y-3.5">
                {criteriaEntries.map(([key, score]) => {
                  const val = Math.min(100, Math.max(0, Number(score) || 0));
                  const weight = report.criterionWeights?.[key];
                  return (
                    <div key={key} className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {criterionLabel(key)}
                          {weight != null && (
                            <span className="ml-1 font-normal text-slate-400">
                              {t("recruiter.interviews.ai.report.weightLabel", { weight })}
                            </span>
                          )}
                        </span>
                        <span className="font-bold tabular-nums text-[var(--color-primary-hover)]">{score}/100</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-container-high)]" aria-hidden="true">
                        <div className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500" style={{ width: `${val}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {visibleCompetencies.length > 0 && (
            <div className="space-y-3 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {t("recruiter.interviews.ai.report.competenciesTitle")}
              </h4>
              <ul className="space-y-2.5">
                {visibleCompetencies.map(([key, score]) => (
                  <li key={key} className="space-y-1.5 rounded-xl border border-slate-200/70 bg-[var(--color-surface-alt)] p-3 text-xs">
                    <div className="flex justify-between gap-3 font-semibold text-slate-800 dark:text-slate-200">
                      <span>
                        {competencyLabel(key)}
                        {report.weights?.[key] != null && <span className="font-normal text-slate-400"> ({report.weights[key]}%)</span>}
                      </span>
                      <span className="tabular-nums font-bold text-[var(--color-primary-hover)]">{score}/100</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden="true">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {visibleSkills.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {t("recruiter.interviews.ai.report.skillsTitle")}{" "}
                <span className="font-normal normal-case text-slate-400">{t("recruiter.interviews.ai.report.skillsNote")}</span>
              </h4>
              <ul className="overflow-hidden divide-y divide-slate-100 rounded-xl border border-slate-200/70 bg-white text-xs shadow-2xs dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                {visibleSkills.map(([skill, entry]) => {
                  const evidence = (entry.questionIds ?? []).map((id) => questionNumber.get(id)).filter((n): n is number => n != null);
                  return (
                    <li key={skill} className="flex flex-wrap items-center justify-between gap-2 p-3 transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{skill}</p>
                        <p className="text-[11px] text-slate-400">
                          {evidence.length
                            ? t("recruiter.interviews.ai.report.evidenceQuestions", { questions: evidence.join(", ") })
                            : t("recruiter.interviews.ai.report.noCheckQuestions")}
                        </p>
                      </div>
                      <span className="shrink-0 font-bold tabular-nums text-slate-700 dark:text-slate-300">
                        {entry.score == null ? t("recruiter.interviews.ai.report.insufficientData") : `${entry.score}/100`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (bare) return content;

  return (
    <section
      className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 sm:p-6"
      aria-labelledby="ai-report-title"
    >
      {content}
    </section>
  );
}
