import { useState, type ComponentType } from "react";
import { Gauge, RefreshCw, Target, TrendingUp } from "lucide-react";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { AnalyticsLoadingState } from "../components/AnalyticsLoadingState";
import { PerformancePanel } from "../components/PerformancePanel";
import { PipelinePanel } from "../components/PipelinePanel";
import { QualityPanel } from "../components/QualityPanel";
import { useRecruiterAnalytics, type RecruiterAnalyticsTab } from "../hooks/useRecruiterAnalytics";
import type { AnalyticsRange, PerformanceData, PipelineData, QualityData } from "../types/recruiterAnalytics";

const tabs: Array<{ id: Exclude<RecruiterAnalyticsTab, "workload">; labelKey: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "pipeline", labelKey: "recruiter.ops.analytics.tabPipeline", icon: TrendingUp },
  { id: "quality", labelKey: "recruiter.ops.analytics.tabQuality", icon: Target },
  { id: "performance", labelKey: "recruiter.ops.analytics.tabPerformance", icon: Gauge },
];

export function RecruiterAnalyticsPage() {
  const t = useT();
  const [activeTab, setActiveTab] = useState<Exclude<RecruiterAnalyticsTab, "workload">>("pipeline");
  const [range, setRange] = useState<AnalyticsRange>("LAST_30_DAYS");
  const query = useRecruiterAnalytics(activeTab, range);

  const panel = query.data && (
    activeTab === "pipeline" ? (
      <PipelinePanel data={query.data as PipelineData} />
    ) : activeTab === "quality" ? (
      <QualityPanel data={query.data as QualityData} />
    ) : (
      <PerformancePanel data={query.data as PerformanceData} />
    )
  );

  return (
    <section className="space-y-4 text-[var(--color-on-surface)]">
      {/* 1. Flat Toolbar: Segmented Tabs & Compact Range Picker */}
      <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border-default)] bg-white p-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label={t("recruiter.ops.analytics.tabsAria")}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors",
                  selected
                    ? "bg-brand-primary text-white shadow-xs"
                    : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-on-surface)]",
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {t(tab.labelKey)}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 px-1.5 py-0.5">
          <label className="flex items-center gap-2 text-xs font-medium text-[var(--color-on-surface-variant)]">
            {t("recruiter.ops.analytics.rangeLabel")}
            <select
              aria-label={t("recruiter.ops.analytics.rangeSelectAria")}
              value={range}
              onChange={(event) => setRange(event.target.value as AnalyticsRange)}
              className="h-8 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-2.5 text-xs font-semibold text-[var(--color-on-surface)] outline-none focus:border-brand-primary"
            >
              <option value="LAST_30_DAYS">{t("recruiter.ops.analytics.rangeLast30Days")}</option>
              <option value="CURRENT_QUARTER">{t("recruiter.ops.analytics.rangeCurrentQuarter")}</option>
              <option value="LAST_12_MONTHS">{t("recruiter.ops.analytics.rangeLast12Months")}</option>
            </select>
          </label>
        </div>
      </div>

      {/* 3. Content Panel */}
      {query.isPending ? (
        <AnalyticsLoadingState />
      ) : query.isError ? (
        <div className="rounded-xl border border-[var(--color-border-default)] bg-white py-10 text-center">
          <p className="text-sm font-medium text-red-700">{t("recruiter.ops.analytics.loadError")}</p>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-primary px-3 text-xs font-semibold text-white hover:bg-brand-primary-hover"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            {t("recruiter.ops.common.retry")}
          </button>
        </div>
      ) : (
        <div role="tabpanel">{panel}</div>
      )}
    </section>
  );
}
