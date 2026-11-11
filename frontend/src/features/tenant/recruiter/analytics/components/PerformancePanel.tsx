import { CheckCircle2, HelpCircle } from "lucide-react";
import { formatNumber, useLocale, useT } from "@/i18n";
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

  return (
    <div className="space-y-4">
      {/* 1. Grid 4 chỉ số hiệu suất phẳng */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <div
              key={m.code}
              className="rounded-xl border border-[var(--color-border-default)] bg-white p-3.5 transition-colors hover:border-brand-primary/40"
            >
              <div className="flex items-center justify-between text-xs text-[var(--color-on-surface-variant)]">
                <span className="font-semibold text-[var(--color-on-surface)] truncate">{meta.label}</span>
                <span title={meta.tooltip} className="cursor-help text-[var(--color-outline)] hover:text-brand-primary">
                  <HelpCircle className="size-3.5" />
                </span>
              </div>

              <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--color-on-surface)] tabular-nums">
                {display(m)}
              </p>

              <div className="mt-2.5 flex items-center justify-between border-t border-[var(--color-border-default)]/60 pt-2 text-[11px]">
                <span className="text-[var(--color-outline)]">
                  {t("recruiter.ops.analytics.targetLabel", {
                    op: m.comparison === "LTE" ? "≤" : "≥",
                    target: formatNumber(m.target, {}, locale),
                    unit: unitSuffix,
                  })}
                </span>
                {m.value != null && (
                  <span
                    className={
                      isPassed ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"
                    }
                  >
                    {isPassed ? t("recruiter.ops.analytics.statusAchieved") : t("recruiter.ops.analytics.statusMissed")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Banner kết quả tổng kết mục tiêu */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border-default)] bg-white p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-[var(--color-on-surface)]">
              {t("recruiter.ops.analytics.performanceSummary", {
                achieved: data.achievedTargets,
                total: data.totalTargets,
              })}
            </h2>
            {data.recommendation && (
              <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                {data.recommendation}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
