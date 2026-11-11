import { AlertTriangle, Clock3, HelpCircle, Layers, Timer, TrendingDown } from "lucide-react";
import { Tooltip } from "@/components/ux/Tooltip";
import { formatNumber, useLocale, useT } from "@/i18n";
import type { PipelineData } from "../types/recruiterAnalytics";
import { AnalyticsEmptyState } from "./AnalyticsEmptyState";

export function PipelinePanel({ data }: { data: PipelineData }) {
  const t = useT();
  const locale = useLocale();
  if (!data.totalCandidates) {
    return <AnalyticsEmptyState>{t("recruiter.ops.analytics.pipelineEmpty")}</AnalyticsEmptyState>;
  }

  const maxReached = Math.max(...data.stages.map((s) => Math.max(s.reachedCount ?? s.count, s.count)), 1);
  const dropOffs = data.dropOffs ?? [];
  const totalDropOff = dropOffs.reduce((sum, item) => sum + item.totalDropOff, 0);

  const stageLabel = (code: string, fallback: string) => {
    const key = `recruiter.ops.analytics.stageLabels.${code}`;
    const resolved = t(key);
    return resolved === key ? fallback : resolved;
  };

  const formatDuration = (hours: number | null | undefined) => {
    if (hours == null) return null;
    if (hours >= 24) {
      const days = Number((hours / 24).toFixed(1));
      return t("recruiter.ops.analytics.pipeline.durationDays", {
        value: formatNumber(days, {}, locale),
      });
    }
    return t("recruiter.ops.analytics.pipeline.durationHours", {
      value: formatNumber(hours, {}, locale),
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        {/* 1. Phễu tuyển dụng 7 vòng */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
              <h2 className="text-sm font-bold text-[#101828]">
                {t("recruiter.ops.analytics.funnelTitle")}
              </h2>
              <Tooltip content={t("recruiter.ops.analytics.funnelTooltip")} side="top">
                <button
                  type="button"
                  aria-label={t("recruiter.ops.analytics.funnelTitle")}
                  className="inline-flex cursor-help items-center text-slate-400 transition-colors hover:text-[var(--color-primary)] focus-visible:text-[var(--color-primary)] focus-visible:outline-none"
                >
                  <HelpCircle className="size-4" aria-hidden="true" />
                </button>
              </Tooltip>
            </div>
            <span className="text-xs font-medium text-[#475467]">
              {t("recruiter.ops.analytics.totalCandidatesPrefix")}{" "}
              <strong className="font-semibold text-[#101828]">
                {formatNumber(data.totalCandidates, {}, locale)}
              </strong>{" "}
              {t("recruiter.ops.analytics.totalCandidatesSuffix")}
            </span>
          </div>

          <div className="space-y-3.5">
            {data.stages.map((stage) => {
              const reached = stage.reachedCount ?? stage.count;
              const percent = Math.max(reached > 0 ? 6 : 0, Math.round((reached / maxReached) * 100));
              const durationLabel = formatDuration(stage.avgHoursInStage);

              return (
                <div key={stage.code} className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#101828]">
                        {stageLabel(stage.code, stage.label)}
                      </span>
                      {durationLabel && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-[#475467]">
                          <Clock3 className="size-3" aria-hidden="true" />
                          {t("recruiter.ops.analytics.pipeline.avgTimeInStage", { duration: durationLabel })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 tabular-nums">
                      <span className="text-xs text-[#667085]">
                        {t("recruiter.ops.analytics.pipeline.stageActiveCount", {
                          count: formatNumber(stage.count, {}, locale),
                        })}
                      </span>
                      {stage.conversionRate != null && (
                        <Tooltip content={t("recruiter.ops.analytics.conversionTooltip")} side="top">
                          <button
                            type="button"
                            className="inline-flex cursor-help items-center gap-1 font-semibold text-[var(--color-primary)] focus-visible:outline-none"
                          >
                            <span>{formatNumber(stage.conversionRate, {}, locale)}%</span>
                            <HelpCircle className="size-3.5 text-slate-400" aria-hidden="true" />
                          </button>
                        </Tooltip>
                      )}
                      <strong className="min-w-6 text-right text-sm font-bold text-[#101828]">
                        {formatNumber(reached, {}, locale)}
                      </strong>
                    </div>
                  </div>

                  <div className="h-6 w-full rounded-lg bg-slate-100 p-0.5">
                    {reached > 0 && (
                      <div
                        className="flex h-full min-w-6 items-center rounded-md bg-[var(--color-primary)] px-2 text-xs font-semibold text-white transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      >
                        {formatNumber(reached, {}, locale)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Cảnh báo SLA */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Timer className="size-4 text-amber-600" aria-hidden="true" />
              <h2 className="text-sm font-bold text-[#101828]">
                {t("recruiter.ops.analytics.slaTitle")}
              </h2>
              <Tooltip content={t("recruiter.ops.analytics.slaTooltip")} side="top">
                <button
                  type="button"
                  aria-label={t("recruiter.ops.analytics.slaTitle")}
                  className="inline-flex cursor-help items-center text-slate-400 transition-colors hover:text-amber-600 focus-visible:text-amber-600 focus-visible:outline-none"
                >
                  <HelpCircle className="size-4" aria-hidden="true" />
                </button>
              </Tooltip>
            </div>
            <span className="text-xs font-medium text-[#667085]">
              {t("recruiter.ops.analytics.slaAlertCount", { count: data.slaAlerts.length })}
            </span>
          </div>

          {data.slaAlerts.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#475467]">
              <p className="font-medium text-emerald-700">{t("recruiter.ops.analytics.slaAllClear")}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.slaAlerts.map((alert) => (
                <div
                  key={alert.stageCode}
                  className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-hidden="true" />
                      <strong className="text-sm font-semibold text-[#101828]">
                        {stageLabel(alert.stageCode, alert.stageLabel)}
                      </strong>
                    </div>
                    <p className="mt-1 text-xs text-[#475467]">
                      {t("recruiter.ops.analytics.slaWaitingSummary", {
                        count: alert.candidateCount,
                        hours: Math.round(alert.thresholdMinutes / 60),
                      })}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                      {t("recruiter.ops.analytics.slaWaitingHours", {
                        hours: Math.round(alert.oldestWaitingMinutes / 60),
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Rớt & rút đơn theo vòng */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <TrendingDown className="size-4 text-rose-600" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-bold text-[#101828]">
                {t("recruiter.ops.analytics.pipeline.dropOffTitle")}
              </h2>
              <p className="text-xs text-[#667085]">
                {t("recruiter.ops.analytics.pipeline.dropOffSubtitle")}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 tabular-nums">
            {t("recruiter.ops.analytics.pipeline.dropOffTotal", {
              count: formatNumber(totalDropOff, {}, locale),
            })}
          </span>
        </div>

        {totalDropOff === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[#667085]">
            {t("recruiter.ops.analytics.pipeline.dropOffEmpty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-[#475467]">
                <tr>
                  <th scope="col" className="px-5 py-3">{t("recruiter.ops.analytics.pipeline.colStage")}</th>
                  <th scope="col" className="px-3 py-3 text-right">{t("recruiter.ops.analytics.pipeline.colRejected")}</th>
                  <th scope="col" className="px-3 py-3 text-right">{t("recruiter.ops.analytics.pipeline.colFailed")}</th>
                  <th scope="col" className="px-3 py-3 text-right">{t("recruiter.ops.analytics.pipeline.colWithdrawn")}</th>
                  <th scope="col" className="px-5 py-3 text-right">{t("recruiter.ops.analytics.pipeline.colDropTotal")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {dropOffs.map((row) => (
                  <tr key={row.stageCode} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-5 py-3 text-sm font-semibold text-[#101828]">
                      {stageLabel(row.stageCode, row.stageLabel)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-[#475467]">
                      {formatNumber(row.rejectedCount, {}, locale)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-[#475467]">
                      {formatNumber(row.failedCount, {}, locale)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-[#475467]">
                      {formatNumber(row.withdrawnCount, {}, locale)}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-bold tabular-nums text-rose-700">
                      {formatNumber(row.totalDropOff, {}, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
