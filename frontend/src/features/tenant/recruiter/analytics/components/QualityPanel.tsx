import { useState } from "react";
import { BarChart3, HelpCircle, Sparkles, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Tooltip } from "@/components/ux/Tooltip";
import { formatNumber, useLocale, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import type { QualityData, ScoreDistributionType } from "../types/recruiterAnalytics";
import { AnalyticsEmptyState } from "./AnalyticsEmptyState";

const SCORE_TABS: ScoreDistributionType[] = ["OVERALL", "CV_MATCH", "ASSESSMENT", "AI_INTERVIEW"];

export function QualityPanel({ data }: { data: QualityData }) {
  const t = useT();
  const locale = useLocale();
  const [selectedScoreType, setSelectedScoreType] = useState<ScoreDistributionType>("OVERALL");

  const distributions = data.scoreDistributions ?? [];
  const activeDist =
    distributions.find((item) => item.type === selectedScoreType) ?? distributions[0];
  const hasAnyContent =
    data.sources.length > 0 ||
    data.trend.length > 0 ||
    distributions.some((item) => item.count > 0);

  if (!hasAnyContent) {
    return <AnalyticsEmptyState>{t("recruiter.ops.analytics.qualityEmpty")}</AnalyticsEmptyState>;
  }

  return (
    <div className="space-y-4">
      {/* 1. Xu hướng hồ sơ & Chỉ số TQI (gộp gọn trong 1 card) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#101828]">
              {t("recruiter.ops.analytics.quality.trendTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-[#667085]">
              {t("recruiter.ops.analytics.quality.trendSubtitle")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-xl border border-violet-200/70 bg-violet-50/60 px-3 py-1.5 text-xs">
              <Sparkles className="size-3.5 text-violet-600" aria-hidden="true" />
              <span className="font-semibold text-violet-900">
                {t("recruiter.ops.analytics.qualityIndexLabel")}:
              </span>
              <strong className="text-sm font-bold text-violet-700 tabular-nums">
                {data.talentQualityIndex == null ? "—" : formatNumber(data.talentQualityIndex, {}, locale)}
                <span className="ml-0.5 text-xs font-normal text-violet-600">/100</span>
              </strong>
              <Tooltip content={t("recruiter.ops.analytics.tqiTooltip")} side="top">
                <button
                  type="button"
                  aria-label={t("recruiter.ops.analytics.tqiTitle")}
                  className="inline-flex cursor-help items-center text-violet-500 transition-colors hover:text-violet-700 focus-visible:outline-none"
                >
                  <HelpCircle className="size-3.5" aria-hidden="true" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {data.trend.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#667085]">
            {t("recruiter.ops.analytics.trendEmpty")}
          </div>
        ) : (
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.trend} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="period" tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="count"
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="score"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: "#7c3aed" }}
                  tickLine={false}
                  axisLine={false}
                />
                <RechartsTooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar
                  yAxisId="count"
                  dataKey="applications"
                  name={t("recruiter.ops.analytics.quality.trendSeriesApps")}
                  fill="#93c5fd"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  yAxisId="count"
                  dataKey="hired"
                  name={t("recruiter.ops.analytics.quality.trendSeriesHired")}
                  fill="#0058be"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Line
                  yAxisId="score"
                  type="monotone"
                  dataKey="score"
                  name={t("recruiter.ops.analytics.quality.trendSeriesScore")}
                  stroke="#7c3aed"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: "#fff", strokeWidth: 2 }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {data.insight && (
          <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/50 px-3.5 py-2.5 text-xs text-violet-900">
            <strong className="font-semibold">{data.insight.title}: </strong>
            <span>{data.insight.message}</span>
          </div>
        )}
      </div>

      {/* 2. Histogram phân phối điểm + Bảng chất lượng theo nguồn */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
          <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3">
            <BarChart3 className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-bold text-[#101828]">
                {t("recruiter.ops.analytics.quality.histogramTitle")}
              </h2>
              <p className="text-xs text-[#667085]">
                {t("recruiter.ops.analytics.quality.histogramSubtitle")}
              </p>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5" role="tablist">
            {SCORE_TABS.map((type) => {
              const selected = (activeDist?.type ?? selectedScoreType) === type;
              const dist = distributions.find((item) => item.type === type);
              return (
                <button
                  key={type}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setSelectedScoreType(type)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                    selected
                      ? "border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] font-semibold text-[var(--color-primary-hover)]"
                      : "border-slate-200 bg-slate-50/60 text-[#475467] hover:bg-slate-100",
                  )}
                >
                  <span>{t(`recruiter.ops.analytics.quality.scoreTypes.${type}`)}</span>
                  <span className="rounded-full bg-white px-1.5 py-0.5 text-xs tabular-nums text-[#475467]">
                    {formatNumber(dist?.count ?? 0, {}, locale)}
                  </span>
                </button>
              );
            })}
          </div>

          {!activeDist || activeDist.count === 0 ? (
            <div className="py-12 text-center text-sm text-[#667085]">
              {t("recruiter.ops.analytics.quality.histogramEmpty")}
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-2 text-xs text-[#475467] tabular-nums">
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium">
                  {t("recruiter.ops.analytics.quality.statCount", {
                    count: formatNumber(activeDist.count, {}, locale),
                  })}
                </span>
                {activeDist.average != null && (
                  <span className="rounded-lg bg-[var(--color-primary-soft)] px-2.5 py-1 font-semibold text-[var(--color-primary)]">
                    {t("recruiter.ops.analytics.quality.statAvg", {
                      value: formatNumber(activeDist.average, {}, locale),
                    })}
                  </span>
                )}
                {activeDist.min != null && activeDist.max != null && (
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1">
                    {t("recruiter.ops.analytics.quality.statRange", {
                      min: formatNumber(activeDist.min, {}, locale),
                      max: formatNumber(activeDist.max, {}, locale),
                    })}
                  </span>
                )}
                {activeDist.passRate != null && (
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                    {t("recruiter.ops.analytics.quality.statPassRate", {
                      rate: formatNumber(activeDist.passRate, {}, locale),
                    })}
                  </span>
                )}
              </div>

              <div className="h-[210px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activeDist.buckets} margin={{ top: 6, right: 8, bottom: 4, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      name={t("recruiter.ops.analytics.quality.candidatesAxis")}
                      fill="#0058be"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={42}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>

        {/* Bảng chất lượng theo nguồn */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
              <h2 className="text-sm font-bold text-[#101828]">
                {t("recruiter.ops.analytics.sourceQualityTitle")}
              </h2>
            </div>
            <span className="text-xs font-medium text-[#667085]">
              {t("recruiter.ops.analytics.channelCount", { count: data.sources.length })}
            </span>
          </div>

          {data.sources.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-[#667085]">
              {t("recruiter.ops.analytics.qualityEmpty")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-[#475467]">
                  <tr>
                    <th scope="col" className="px-5 py-3">{t("recruiter.ops.analytics.colSource")}</th>
                    <th scope="col" className="px-3 py-3">{t("recruiter.ops.analytics.colVolume")}</th>
                    <th scope="col" className="px-3 py-3">
                      <span className="inline-flex items-center gap-1">
                        {t("recruiter.ops.analytics.colQualityScore")}
                        <Tooltip content={t("recruiter.ops.analytics.qualityScoreTooltip")} side="top">
                          <button
                            type="button"
                            aria-label={t("recruiter.ops.analytics.colQualityScore")}
                            className="inline-flex cursor-help items-center text-slate-400 transition-colors hover:text-[var(--color-primary)] focus-visible:outline-none"
                          >
                            <HelpCircle className="size-3.5" aria-hidden="true" />
                          </button>
                        </Tooltip>
                      </span>
                    </th>
                    <th scope="col" className="px-5 py-3 text-right">
                      <span className="inline-flex items-center justify-end gap-1">
                        {t("recruiter.ops.analytics.colConversion")}
                        <Tooltip content={t("recruiter.ops.analytics.conversionTooltipSrc")} side="top">
                          <button
                            type="button"
                            aria-label={t("recruiter.ops.analytics.colConversion")}
                            className="inline-flex cursor-help items-center text-slate-400 transition-colors hover:text-[var(--color-primary)] focus-visible:outline-none"
                          >
                            <HelpCircle className="size-3.5" aria-hidden="true" />
                          </button>
                        </Tooltip>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {data.sources.map((s) => (
                    <tr key={s.code} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-5 py-3 text-sm font-semibold text-[#101828]">{s.label}</td>
                      <td className="px-3 py-3 tabular-nums text-[#475467]">{formatNumber(s.candidateCount, {}, locale)}</td>
                      <td className="px-3 py-3 font-medium tabular-nums">
                        {s.averageQualityScore != null ? (
                          <span className="rounded-md bg-sky-50 px-2 py-0.5 font-semibold text-sky-700">
                            {formatNumber(s.averageQualityScore, {}, locale)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-bold tabular-nums text-[var(--color-primary)]">
                        {s.conversionRate == null ? "—" : `${formatNumber(s.conversionRate, {}, locale)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
