import { useState, type ComponentType } from "react";
import { AlertCircle, ArrowLeft, Gauge, RefreshCw, Sparkles, Target, TrendingUp } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useT } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { AnalyticsLoadingState } from "../components/AnalyticsLoadingState";
import { JobAnalyticsHeader } from "../components/JobAnalyticsHeader";
import { JobInsightsPanel } from "../components/JobInsightsPanel";
import { PerformancePanel } from "../components/PerformancePanel";
import { PipelinePanel } from "../components/PipelinePanel";
import { QualityPanel } from "../components/QualityPanel";
import {
  useJobInsights,
  useJobOverview,
  useRecruiterAnalytics,
  type RecruiterAnalyticsTab,
} from "../hooks/useRecruiterAnalytics";
import type { AnalyticsRange, PerformanceData, PipelineData, QualityData } from "../types/recruiterAnalytics";

type JobAnalyticsTab = Exclude<RecruiterAnalyticsTab, "workload">;

const tabs: Array<{ id: JobAnalyticsTab; labelKey: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "pipeline", labelKey: "recruiter.ops.analytics.tabPipeline", icon: TrendingUp },
  { id: "quality", labelKey: "recruiter.ops.analytics.tabQuality", icon: Target },
  { id: "performance", labelKey: "recruiter.ops.analytics.tabPerformance", icon: Gauge },
  { id: "insights", labelKey: "recruiter.ops.analytics.tabInsights", icon: Sparkles },
];

export function RecruiterAnalyticsPage() {
  const t = useT();
  const { id } = useParams();
  const parsedJobId = id && /^\d+$/.test(id) ? Number(id) : NaN;
  const jobId = Number.isFinite(parsedJobId) && parsedJobId > 0 ? parsedJobId : undefined;

  const [activeTab, setActiveTab] = useState<JobAnalyticsTab>("pipeline");
  const [range, setRange] = useState<AnalyticsRange>("LAST_30_DAYS");

  const overviewQuery = useJobOverview(jobId, range);
  const analyticsTab = activeTab === "insights" ? "pipeline" : activeTab;
  const tabQuery = useRecruiterAnalytics(
    analyticsTab,
    range,
    jobId,
    jobId != null && activeTab !== "insights",
  );
  const insightsQuery = useJobInsights(jobId, range, jobId != null && activeTab === "insights");

  if (jobId == null) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center">
        <AlertCircle className="mx-auto size-8 text-amber-600" aria-hidden="true" />
        <h1 className="mt-3 text-base font-bold text-[#101828]">
          {t("recruiter.ops.analytics.invalidJobTitle")}
        </h1>
        <p className="mt-1 text-sm text-[#667085]">
          {t("recruiter.ops.analytics.invalidJobDesc")}
        </p>
        <Link
          to="/recruiter"
          className="mt-4 inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 text-xs font-semibold text-white hover:bg-[var(--color-primary-hover)]"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          {t("recruiter.ops.analytics.backToRecruiterBtn")}
        </Link>
      </section>
    );
  }

  if (overviewQuery.isError) {
    return (
      <section className="rounded-2xl border border-red-200 bg-white p-8 text-center">
        <AlertCircle className="mx-auto size-8 text-red-600" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-red-700">
          {getApiErrorMessage(overviewQuery.error, t("recruiter.ops.analytics.loadError"))}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Link
            to="/recruiter"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-[#101828] hover:bg-slate-50"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {t("recruiter.ops.analytics.backToRecruiterBtn")}
          </Link>
          <button
            type="button"
            onClick={() => void overviewQuery.refetch()}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-hover)]"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            {t("recruiter.ops.common.retry")}
          </button>
        </div>
      </section>
    );
  }

  const activeQuery = activeTab === "insights" ? insightsQuery : tabQuery;

  const panel =
    activeTab === "insights"
      ? insightsQuery.data && <JobInsightsPanel data={insightsQuery.data} />
      : tabQuery.data &&
        (activeTab === "pipeline" ? (
          <PipelinePanel data={tabQuery.data as PipelineData} />
        ) : activeTab === "quality" ? (
          <QualityPanel data={tabQuery.data as QualityData} />
        ) : (
          <PerformancePanel data={tabQuery.data as PerformanceData} />
        ));

  return (
    <section className="flex flex-col gap-3.5 text-[var(--color-on-surface)]">
      {/* 1. Underline SubNav (đồng nhất AssessmentSubNav) + Range Picker */}
      <div className="flex flex-col justify-between gap-2 border-b border-slate-200 sm:flex-row sm:items-center">
        <div
          className="flex items-center gap-1 overflow-x-auto scrollbar-none"
          role="tablist"
          aria-label={t("recruiter.ops.analytics.tabsAria")}
        >
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
                  "inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm transition-all cursor-pointer",
                  selected
                    ? "border-[var(--color-primary)] font-semibold text-[var(--color-primary)]"
                    : "border-transparent font-medium text-[#475467] hover:border-slate-300 hover:text-[#101828]",
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    selected ? "text-[var(--color-primary)]" : "text-[#667085]",
                  )}
                  aria-hidden="true"
                />
                <span>{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pb-2 sm:pb-0">
          <label className="flex items-center gap-2 text-xs font-medium text-[#475467]">
            <span>{t("recruiter.ops.analytics.rangeLabel")}</span>
            <select
              aria-label={t("recruiter.ops.analytics.rangeSelectAria")}
              value={range}
              onChange={(event) => setRange(event.target.value as AnalyticsRange)}
              className="h-9 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-semibold text-[#101828] outline-none transition-colors focus:border-[var(--color-primary)] focus:bg-white"
            >
              <option value="LAST_30_DAYS">{t("recruiter.ops.analytics.rangeLast30Days")}</option>
              <option value="CURRENT_QUARTER">{t("recruiter.ops.analytics.rangeCurrentQuarter")}</option>
              <option value="LAST_12_MONTHS">{t("recruiter.ops.analytics.rangeLast12Months")}</option>
            </select>
          </label>
        </div>
      </div>

      {/* 2. Dải chỉ số tóm tắt Job gọn nhẹ */}
      <JobAnalyticsHeader data={overviewQuery.data} loading={overviewQuery.isPending} />

      {/* 3. Nội dung phân tích theo tab */}
      {activeQuery.isPending ? (
        <AnalyticsLoadingState />
      ) : activeQuery.isError ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white py-10 text-center">
          <p className="text-sm font-medium text-red-700">
            {getApiErrorMessage(activeQuery.error, t("recruiter.ops.analytics.loadError"))}
          </p>
          <button
            type="button"
            onClick={() => void activeQuery.refetch()}
            className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-hover)]"
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
