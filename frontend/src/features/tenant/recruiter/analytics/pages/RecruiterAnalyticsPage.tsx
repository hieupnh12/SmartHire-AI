import { useState, type ComponentType } from "react";
import { AlertCircle, ArrowLeft, RefreshCw, Sparkles, Target, TrendingUp } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { PillNav } from "@/components/ux/PillNav";
import { TableRefreshBar } from "@/components/ux/TableRefresh";
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
} from "../hooks/useRecruiterAnalytics";
import type { AnalyticsRange, PerformanceData, PipelineData, QualityData } from "../types/recruiterAnalytics";

type JobAnalyticsTab = "pipeline" | "quality" | "insights";

const tabs: Array<{ id: JobAnalyticsTab; labelKey: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "pipeline", labelKey: "recruiter.ops.analytics.tabPipeline", icon: TrendingUp },
  { id: "quality", labelKey: "recruiter.ops.analytics.tabQuality", icon: Target },
  { id: "insights", labelKey: "recruiter.ops.analytics.tabInsights", icon: Sparkles },
];

export function RecruiterAnalyticsPage() {
  const t = useT();
  const { id } = useParams();
  const parsedJobId = id && /^\d+$/.test(id) ? Number(id) : NaN;
  const jobId = Number.isFinite(parsedJobId) && parsedJobId > 0 ? parsedJobId : undefined;

  const [activeTab, setActiveTab] = useState<JobAnalyticsTab>("pipeline");
  const [tabDirection, setTabDirection] = useState<"left" | "right">("right");
  const [range, setRange] = useState<AnalyticsRange>("LAST_30_DAYS");

  const overviewQuery = useJobOverview(jobId, range);
  const pipelineQuery = useRecruiterAnalytics(
    "pipeline",
    range,
    jobId,
    jobId != null && activeTab === "pipeline",
  );
  const performanceQuery = useRecruiterAnalytics(
    "performance",
    range,
    jobId,
    jobId != null && activeTab === "pipeline",
  );
  const qualityQuery = useRecruiterAnalytics(
    "quality",
    range,
    jobId,
    jobId != null && activeTab === "quality",
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

  const isRangeRefreshing =
    activeTab === "pipeline"
      ? (overviewQuery.isFetching && overviewQuery.isPlaceholderData) ||
        (pipelineQuery.isFetching && pipelineQuery.isPlaceholderData) ||
        (performanceQuery.isFetching && performanceQuery.isPlaceholderData)
      : activeTab === "quality"
        ? qualityQuery.isFetching && qualityQuery.isPlaceholderData
        : insightsQuery.isFetching && insightsQuery.isPlaceholderData;

  const isPending =
    activeTab === "pipeline"
      ? pipelineQuery.isPending || performanceQuery.isPending
      : activeTab === "quality"
        ? qualityQuery.isPending
        : insightsQuery.isPending;

  const isError =
    activeTab === "pipeline"
      ? pipelineQuery.isError
      : activeTab === "quality"
        ? qualityQuery.isError
        : insightsQuery.isError;

  const activeError =
    activeTab === "pipeline"
      ? pipelineQuery.error
      : activeTab === "quality"
        ? qualityQuery.error
        : insightsQuery.error;

  const retryActive = () => {
    if (activeTab === "pipeline") {
      void pipelineQuery.refetch();
      void performanceQuery.refetch();
    } else if (activeTab === "quality") {
      void qualityQuery.refetch();
    } else {
      void insightsQuery.refetch();
    }
  };

  const panel =
    activeTab === "pipeline" ? (
      pipelineQuery.data && (
        <div className="space-y-4">
          <PipelinePanel data={pipelineQuery.data as PipelineData} />
          {performanceQuery.data && (
            <PerformancePanel data={performanceQuery.data as PerformanceData} />
          )}
        </div>
      )
    ) : activeTab === "quality" ? (
      qualityQuery.data && <QualityPanel data={qualityQuery.data as QualityData} />
    ) : (
      insightsQuery.data && <JobInsightsPanel data={insightsQuery.data} />
    );

  return (
    <section className="flex flex-col gap-3.5 text-[var(--color-on-surface)]">
      {/* 1. Curved Lower Arc Sub-Nav + Range Picker */}
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <PillNav
            items={tabs.map((tab) => ({ id: tab.id, label: t(tab.labelKey), icon: tab.icon }))}
            activeId={activeTab}
            ariaLabel={t("recruiter.ops.analytics.tabsAria")}
            onSelect={setActiveTab}
            onDirectionChange={setTabDirection}
            variant="docked"
            dockGroup="analytics"
          />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 md:pt-0.5">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-[#475467]">
            <span>{t("recruiter.ops.analytics.rangeLabel")}</span>
            <select
              aria-label={t("recruiter.ops.analytics.rangeSelectAria")}
              value={range}
              onChange={(event) => setRange(event.target.value as AnalyticsRange)}
              className="h-9 rounded-full border border-slate-200/90 bg-white px-3 text-xs font-semibold text-[#101828] shadow-2xs outline-none transition-colors hover:border-slate-300 focus:border-[var(--color-primary)] cursor-pointer"
            >
              <option value="LAST_30_DAYS">{t("recruiter.ops.analytics.rangeLast30Days")}</option>
              <option value="CURRENT_QUARTER">{t("recruiter.ops.analytics.rangeCurrentQuarter")}</option>
              <option value="LAST_12_MONTHS">{t("recruiter.ops.analytics.rangeLast12Months")}</option>
            </select>
          </label>
        </div>
      </div>

      {/* 2. Nội dung phân tích theo tab (Header tóm tắt chỉ hiển thị ở tab đầu Pipeline & SLA) */}
      <div
        key={activeTab}
        role="tabpanel"
        className={cn(
          "relative space-y-4 overflow-hidden rounded-2xl transition-opacity duration-200",
          isRangeRefreshing && "opacity-65",
          tabDirection === "left" ? "animate-nav-panel-left" : "animate-nav-panel-right",
        )}
      >
        <TableRefreshBar active={isRangeRefreshing} className="rounded-t-2xl" />
        {activeTab === "pipeline" && (
          <JobAnalyticsHeader data={overviewQuery.data} loading={overviewQuery.isPending} />
        )}

        {isPending ? (
          <AnalyticsLoadingState />
        ) : isError ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white py-10 text-center">
            <p className="text-sm font-medium text-red-700">
              {getApiErrorMessage(activeError, t("recruiter.ops.analytics.loadError"))}
            </p>
            <button
              type="button"
              onClick={retryActive}
              className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-hover)]"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              {t("recruiter.ops.common.retry")}
            </button>
          </div>
        ) : (
          panel
        )}
      </div>
    </section>
  );
}
