import { HelpCircle, Sparkles, TrendingUp } from "lucide-react";
import { formatNumber, useLocale, useT } from "@/i18n";
import type { QualityData } from "../types/recruiterAnalytics";
import { AnalyticsEmptyState } from "./AnalyticsEmptyState";

export function QualityPanel({ data }: { data: QualityData }) {
  const t = useT();
  const locale = useLocale();
  if (!data.sources.length) {
    return <AnalyticsEmptyState>{t("recruiter.ops.analytics.qualityEmpty")}</AnalyticsEmptyState>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      {/* 1. Bảng chất lượng theo nguồn */}
      <div className="rounded-xl border border-[var(--color-border-default)] bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-4 py-3 bg-[var(--color-surface-alt)]/40">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="size-4 text-brand-primary" />
            <h2 className="text-sm font-bold text-[var(--color-on-surface)]">{t("recruiter.ops.analytics.sourceQualityTitle")}</h2>
          </div>
          <span className="text-xs text-[var(--color-outline)]">
            {t("recruiter.ops.analytics.channelCount", { count: data.sources.length })}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)]/60 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              <tr>
                <th scope="col" className="px-4 py-2.5">{t("recruiter.ops.analytics.colSource")}</th>
                <th scope="col" className="px-3 py-2.5">{t("recruiter.ops.analytics.colVolume")}</th>
                <th scope="col" className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1">
                    {t("recruiter.ops.analytics.colQualityScore")}
                    <span title={t("recruiter.ops.analytics.qualityScoreTooltip")} className="cursor-help text-[var(--color-outline)]">
                      <HelpCircle className="size-3" />
                    </span>
                  </span>
                </th>
                <th scope="col" className="px-4 py-2.5 text-right">
                  <span className="inline-flex items-center gap-1 justify-end">
                    {t("recruiter.ops.analytics.colConversion")}
                    <span title={t("recruiter.ops.analytics.conversionTooltipSrc")} className="cursor-help text-[var(--color-outline)]">
                      <HelpCircle className="size-3" />
                    </span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {data.sources.map((s) => (
                <tr key={s.code} className="hover:bg-[var(--color-surface-alt)]/40 transition-colors">
                  <td className="px-4 py-2.5 font-semibold text-[var(--color-on-surface)]">{s.label}</td>
                  <td className="px-3 py-2.5 tabular-nums">{formatNumber(s.candidateCount, {}, locale)}</td>
                  <td className="px-3 py-2.5 tabular-nums font-medium">
                    {s.averageQualityScore != null ? (
                      <span className="rounded bg-sky-50 px-1.5 py-0.5 text-sky-700 font-semibold">
                        {formatNumber(s.averageQualityScore, {}, locale)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-brand-primary tabular-nums">
                    {s.conversionRate == null ? "—" : `${formatNumber(s.conversionRate, {}, locale)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Chỉ số Talent Quality Index (TQI) */}
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-white p-4">
        <div className="flex items-center justify-between border-b border-[var(--color-border-default)] pb-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-4 text-violet-600" />
            <h2 className="text-sm font-bold text-[var(--color-on-surface)]">{t("recruiter.ops.analytics.tqiTitle")}</h2>
            <span
              title={t("recruiter.ops.analytics.tqiTooltip")}
              className="cursor-help text-[var(--color-outline)] hover:text-brand-primary"
            >
              <HelpCircle className="size-3.5" />
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3.5 py-1">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 font-bold">
            <Sparkles className="size-6" />
          </span>
          <div>
            <p className="text-[11px] font-medium text-[var(--color-outline)] uppercase">{t("recruiter.ops.analytics.qualityIndexLabel")}</p>
            <p className="text-2xl font-bold text-[var(--color-on-surface)]">
              {data.talentQualityIndex == null ? "—" : `${formatNumber(data.talentQualityIndex, {}, locale)}`}{" "}
              <span className="text-xs font-normal text-[var(--color-outline)]">/ 100</span>
            </p>
          </div>
        </div>

        {data.insight && (
          <div className="rounded-lg bg-violet-50/60 border border-violet-100 p-2.5 text-xs text-violet-900">
            <strong className="font-semibold">{data.insight.title}: </strong>
            <span>{data.insight.message}</span>
          </div>
        )}

        <div className="mt-auto border-t border-[var(--color-border-default)] pt-2 text-[11px] text-[var(--color-outline)]">
          {data.trend.length
            ? t("recruiter.ops.analytics.trendCount", { count: data.trend.length })
            : t("recruiter.ops.analytics.trendEmpty")}
        </div>
      </div>
    </div>
  );
}
