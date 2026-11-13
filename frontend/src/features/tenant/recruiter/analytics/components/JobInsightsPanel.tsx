import { AlertTriangle, Bot, CheckCircle2, FileWarning, ShieldAlert, Sparkles, UserCheck } from "lucide-react";
import { formatNumber, useLocale, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import type { JobInsightsData } from "../types/recruiterAnalytics";

export function JobInsightsPanel({ data }: { data: JobInsightsData }) {
  const t = useT();
  const locale = useLocale();

  const totalLoss =
    data.lossAnalysis.totalRejected +
    data.lossAnalysis.totalFailed +
    data.lossAnalysis.totalWithdrawn;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 1. Skill Gap Analysis */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sparkles className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-bold text-[#101828]">
                {t("recruiter.ops.analytics.insights.skillGapTitle")}
              </h2>
              <p className="text-xs text-[#667085]">
                {t("recruiter.ops.analytics.insights.skillGapSubtitle", {
                  count: formatNumber(data.evaluatedCvCount, {}, locale),
                })}
              </p>
            </div>
          </div>

          {data.skillGaps.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#667085]">
              {t("recruiter.ops.analytics.insights.skillGapEmpty")}
            </div>
          ) : (
            <div className="space-y-3.5">
              {data.skillGaps.map((skill) => {
                const isCriticalGap = skill.required && skill.coveragePercent < 50;
                return (
                  <div key={`${skill.skillName}-${skill.required}`} className="space-y-1.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#101828]">{skill.skillName}</span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-semibold",
                            skill.required
                              ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                              : "bg-slate-100 text-[#475467]",
                          )}
                        >
                          {skill.required
                            ? t("recruiter.ops.analytics.insights.skillRequiredBadge")
                            : t("recruiter.ops.analytics.insights.skillOptionalBadge")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 tabular-nums">
                        <span className="text-[#475467]">
                          {t("recruiter.ops.analytics.insights.skillMatchedMeta", {
                            matched: formatNumber(skill.matchedCandidates, {}, locale),
                            total: formatNumber(skill.totalCandidates, {}, locale),
                            pct: formatNumber(skill.coveragePercent, {}, locale),
                          })}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-bold",
                            isCriticalGap
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-[#475467]",
                          )}
                        >
                          {t("recruiter.ops.analytics.insights.skillGapBadge", {
                            pct: formatNumber(skill.gapPercent, {}, locale),
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          isCriticalGap ? "bg-amber-500" : "bg-[var(--color-primary)]",
                        )}
                        style={{ width: `${Math.max(2, Math.min(100, skill.coveragePercent))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Lý do từ chối & rút hồ sơ */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileWarning className="size-4 text-rose-600" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-bold text-[#101828]">
                {t("recruiter.ops.analytics.insights.lossTitle")}
              </h2>
              <p className="text-xs text-[#667085]">
                {t("recruiter.ops.analytics.insights.lossSubtitle")}
              </p>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-2 text-xs tabular-nums">
            <span className="rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-700">
              {t("recruiter.ops.analytics.insights.lossRejected", {
                count: formatNumber(data.lossAnalysis.totalRejected, {}, locale),
              })}
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-800">
              {t("recruiter.ops.analytics.insights.lossFailed", {
                count: formatNumber(data.lossAnalysis.totalFailed, {}, locale),
              })}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
              {t("recruiter.ops.analytics.insights.lossWithdrawn", {
                count: formatNumber(data.lossAnalysis.totalWithdrawn, {}, locale),
              })}
            </span>
          </div>

          {totalLoss === 0 ? (
            <div className="py-8 text-center text-sm text-[#667085]">
              {t("recruiter.ops.analytics.insights.noReasonsRecorded")}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
                <h3 className="text-xs font-bold text-[#101828]">
                  {t("recruiter.ops.analytics.insights.rejectReasonsTitle")}
                </h3>
                {data.lossAnalysis.rejectReasons.length === 0 ? (
                  <p className="mt-2 text-xs text-[#667085]">
                    {t("recruiter.ops.analytics.insights.noReasonsRecorded")}
                  </p>
                ) : (
                  <ul className="mt-2.5 space-y-2 text-xs">
                    {data.lossAnalysis.rejectReasons.map((item) => (
                      <li key={item.reason} className="flex items-start justify-between gap-2">
                        <span className="line-clamp-2 text-[#475467]">{item.reason}</span>
                        <span className="shrink-0 font-semibold tabular-nums text-[#101828]">
                          {formatNumber(item.count, {}, locale)} ({formatNumber(item.sharePercent, {}, locale)}%)
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
                <h3 className="text-xs font-bold text-[#101828]">
                  {t("recruiter.ops.analytics.insights.withdrawReasonsTitle")}
                </h3>
                {data.lossAnalysis.withdrawReasons.length === 0 ? (
                  <p className="mt-2 text-xs text-[#667085]">
                    {t("recruiter.ops.analytics.insights.noReasonsRecorded")}
                  </p>
                ) : (
                  <ul className="mt-2.5 space-y-2 text-xs">
                    {data.lossAnalysis.withdrawReasons.map((item) => (
                      <li key={item.reason} className="flex items-start justify-between gap-2">
                        <span className="line-clamp-2 text-[#475467]">{item.reason}</span>
                        <span className="shrink-0 font-semibold tabular-nums text-[#101828]">
                          {formatNumber(item.count, {}, locale)} ({formatNumber(item.sharePercent, {}, locale)}%)
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 3. Proctoring Assessment Summary */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-amber-600" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-bold text-[#101828]">
                  {t("recruiter.ops.analytics.insights.proctoringTitle")}
                </h2>
                <p className="text-xs text-[#667085]">
                  {t("recruiter.ops.analytics.insights.proctoringSubtitle", {
                    reports: formatNumber(data.proctoring.reportsCount, {}, locale),
                    submissions: formatNumber(data.proctoring.totalSubmissions, {}, locale),
                  })}
                </p>
              </div>
            </div>
            {data.proctoring.averageRiskScore != null && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 tabular-nums">
                {t("recruiter.ops.analytics.insights.avgRiskScore", {
                  score: formatNumber(data.proctoring.averageRiskScore, {}, locale),
                })}
              </span>
            )}
          </div>

          {data.proctoring.reportsCount === 0 && data.proctoring.topEvents.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#667085]">
              {t("recruiter.ops.analytics.insights.proctoringEmpty")}
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="grid grid-cols-3 gap-2.5 text-center text-xs tabular-nums">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                  <p className="font-medium text-emerald-700">
                    {t("recruiter.ops.analytics.insights.riskLow")}
                  </p>
                  <p className="mt-1 text-xl font-bold text-emerald-800">
                    {formatNumber(data.proctoring.lowRiskCount, {}, locale)}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                  <p className="font-medium text-amber-700">
                    {t("recruiter.ops.analytics.insights.riskMedium")}
                  </p>
                  <p className="mt-1 text-xl font-bold text-amber-800">
                    {formatNumber(data.proctoring.mediumRiskCount, {}, locale)}
                  </p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3">
                  <p className="font-medium text-rose-700">
                    {t("recruiter.ops.analytics.insights.riskHigh")}
                  </p>
                  <p className="mt-1 text-xl font-bold text-rose-800">
                    {formatNumber(data.proctoring.highRiskCount, {}, locale)}
                  </p>
                </div>
              </div>

              {data.proctoring.topEvents.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-bold text-[#101828]">
                    {t("recruiter.ops.analytics.insights.topEventsTitle")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {data.proctoring.topEvents.map((ev) => (
                      <span
                        key={ev.eventType}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1 text-xs font-medium text-[#475467]"
                      >
                        <AlertTriangle className="size-3.5 text-amber-600" aria-hidden="true" />
                        <span>{ev.eventType}</span>
                        <strong className="tabular-nums text-[#101828]">
                          {formatNumber(ev.count, {}, locale)}
                        </strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. Đánh giá Phỏng vấn (AI & Chuyên môn) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserCheck className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
            <h2 className="text-sm font-bold text-[#101828]">
              {t("recruiter.ops.analytics.insights.interviewSummaryTitle")}
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#101828]">
                <Bot className="size-4 text-violet-600" aria-hidden="true" />
                <span>{t("recruiter.ops.analytics.insights.aiInterviewTitle")}</span>
              </div>
              <p className="mt-2.5 text-xs text-[#475467] tabular-nums">
                {t("recruiter.ops.analytics.insights.aiSessions", {
                  total: formatNumber(data.aiInterviews.totalSessions, {}, locale),
                  completed: formatNumber(data.aiInterviews.completedSessions, {}, locale),
                })}
              </p>
              <p className="mt-1.5 text-sm font-bold text-[var(--color-primary)] tabular-nums">
                {t("recruiter.ops.analytics.insights.aiAvgScore", {
                  score:
                    data.aiInterviews.averageScore != null
                      ? formatNumber(data.aiInterviews.averageScore, {}, locale)
                      : "—",
                })}
              </p>
              {data.aiInterviews.passingScore != null && (
                <p className="mt-1.5 text-xs font-medium text-emerald-700 tabular-nums">
                  {t("recruiter.ops.analytics.insights.aiPassRate", {
                    threshold: formatNumber(data.aiInterviews.passingScore, {}, locale),
                    passed: formatNumber(data.aiInterviews.passedCount, {}, locale),
                    completed: formatNumber(data.aiInterviews.completedSessions, {}, locale),
                  })}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#101828]">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
                  {t("recruiter.ops.analytics.insights.humanInterviewTitle")}
                </span>
                <span className="text-xs font-medium text-[#667085]">
                  {t("recruiter.ops.analytics.insights.humanEvaluationsCount", {
                    count: formatNumber(data.humanInterviews.evaluationCount, {}, locale),
                  })}
                </span>
              </div>

              {data.humanInterviews.evaluationCount === 0 ? (
                <p className="mt-3 text-xs text-[#667085]">
                  {t("recruiter.ops.analytics.insights.humanEmpty")}
                </p>
              ) : (
                <div className="mt-2.5 space-y-2.5 text-xs">
                  <div className="grid grid-cols-2 gap-2 tabular-nums">
                    <div>
                      <span className="text-[#667085]">
                        {t("recruiter.ops.analytics.insights.humanTechnical")}
                      </span>
                      <p className="text-sm font-bold text-[#101828]">
                        {data.humanInterviews.avgTechnicalScore != null
                          ? formatNumber(data.humanInterviews.avgTechnicalScore, {}, locale)
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#667085]">
                        {t("recruiter.ops.analytics.insights.humanCommunication")}
                      </span>
                      <p className="text-sm font-bold text-[#101828]">
                        {data.humanInterviews.avgCommunicationScore != null
                          ? formatNumber(data.humanInterviews.avgCommunicationScore, {}, locale)
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#667085]">
                        {t("recruiter.ops.analytics.insights.humanCulture")}
                      </span>
                      <p className="text-sm font-bold text-[#101828]">
                        {data.humanInterviews.avgCultureScore != null
                          ? formatNumber(data.humanInterviews.avgCultureScore, {}, locale)
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#667085]">
                        {t("recruiter.ops.analytics.insights.humanOverall")}
                      </span>
                      <p className="text-sm font-bold text-[var(--color-primary)]">
                        {data.humanInterviews.avgOverallScore != null
                          ? formatNumber(data.humanInterviews.avgOverallScore, {}, locale)
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {Object.keys(data.humanInterviews.recommendations).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 border-t border-slate-200 pt-2">
                      {Object.entries(data.humanInterviews.recommendations).map(([key, count]) => {
                        const recKey = `recruiter.ops.analytics.insights.recommendations.${key}`;
                        const label = t(recKey) === recKey ? key : t(recKey);
                        return (
                          <span
                            key={key}
                            className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-[#101828]"
                          >
                            {label}: {formatNumber(count, {}, locale)}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
