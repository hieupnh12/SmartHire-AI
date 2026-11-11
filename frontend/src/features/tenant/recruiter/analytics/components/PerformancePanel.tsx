import { CheckCircle2, Gauge, HelpCircle } from "lucide-react";
import { Tooltip } from "@/components/ux/Tooltip";
import { formatNumber, useLocale, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import type { PerformanceData } from "../types/recruiterAnalytics";

const KNOWN_METRIC_CODES = new Set([
  "TIME_TO_SHORTLIST",
  "RESPONSE_TIME",
  "OFFER_ACCEPTANCE",
  "HIRE_RATE",
]);

export function PerformancePanel({ data }: { data: PerformanceData }) {
  const t = useT();
  const locale = useLocale();
  const display = (m: PerformanceData["metrics"][number]) => {
    if (m.value == null) return "—";
    const formatted = formatNumber(m.value, {}, locale);
    if (m.unit === "PERCENT") return `${formatted}%`;
    if (m.unit === "DAYS") return t("recruiter.ops.analytics.unitDays", { value: formatted });
    return t("recruiter.ops.analytics.unitHours", { value: formatted });
  };

  const allAchieved = data.totalTargets > 0 && data.achievedTargets === data.totalTargets;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
      {/* Header tổng hợp mục tiêu & khuyến nghị */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <Gauge className="size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-bold text-[#101828]">
              {t("recruiter.ops.analytics.tabPerformance")}
            </h2>
            {data.recommendation && (
              <p className="mt-0.5 text-xs text-[#667085]">{data.recommendation}</p>
            )}
          </div>
        </div>

        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tabular-nums",
            allAchieved
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-[#475467]",
          )}
        >
          <CheckCircle2
            className={cn("size-3.5", allAchieved ? "text-emerald-600" : "text-slate-400")}
            aria-hidden="true"
          />
          {t("recruiter.ops.analytics.performanceSummary", {
            achieved: formatNumber(data.achievedTargets, {}, locale),
            total: formatNumber(data.totalTargets, {}, locale),
          })}
        </span>
      </div>

      {/* 4 cột chỉ số phẳng nằm trong cùng 1 container */}
      <div className="grid grid-cols-1 divide-y divide-slate-200/80 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        {data.metrics.map((m) => {
          const hasMeta = KNOWN_METRIC_CODES.has(m.code);
          const meta = hasMeta
            ? {
                label: t(`recruiter.ops.analytics.metrics.${m.code}.label`),
                tooltip: t(`recruiter.ops.analytics.metrics.${m.code}.tooltip`),
              }
            : { label: m.code, tooltip: m.code };
          const isPassed =
            m.value != null &&
            (m.comparison === "LTE" ? m.value <= m.target : m.value >= m.target);
          const unitSuffix =
            m.unit === "PERCENT"
              ? "%"
              : m.unit === "DAYS"
                ? t("recruiter.ops.analytics.targetUnitDays")
                : t("recruiter.ops.analytics.targetUnitHours");

          return (
            <div key={m.code} className="p-5 transition-colors hover:bg-slate-50/50">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-semibold text-[#475467]">{meta.label}</span>
                <Tooltip content={meta.tooltip} side="top">
                  <button
                    type="button"
                    aria-label={meta.label}
                    className="inline-flex shrink-0 cursor-help items-center text-slate-400 transition-colors hover:text-[var(--color-primary)] focus-visible:text-[var(--color-primary)] focus-visible:outline-none"
                  >
                    <HelpCircle className="size-4" aria-hidden="true" />
                  </button>
                </Tooltip>
              </div>

              <p className="mt-2 text-2xl font-bold tracking-tight text-[#101828] tabular-nums">
                {display(m)}
              </p>

              <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                <span className="text-[#667085]">
                  {t("recruiter.ops.analytics.targetLabel", {
                    op: m.comparison === "LTE" ? "≤" : "≥",
                    target: formatNumber(m.target, {}, locale),
                    unit: unitSuffix,
                  })}
                </span>
                {m.value != null && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      isPassed
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700",
                    )}
                  >
                    {isPassed
                      ? t("recruiter.ops.analytics.statusAchieved")
                      : t("recruiter.ops.analytics.statusMissed")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
