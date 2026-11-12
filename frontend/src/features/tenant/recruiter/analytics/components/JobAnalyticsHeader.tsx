import { AlertTriangle, Award, Target, Users } from "lucide-react";
import { Skeleton } from "@/components/ux/Skeleton";
import { formatNumber, useLocale, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import type { JobOverviewData } from "../types/recruiterAnalytics";

type Props = {
  data?: JobOverviewData;
  loading: boolean;
};

export function JobAnalyticsHeader({ data, loading }: Props) {
  const t = useT();
  const locale = useLocale();

  if (loading && !data) {
    return (
      <div className="grid grid-cols-2 divide-y divide-slate-200/80 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2 p-4">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const headcountRatio =
    data.headcount && data.headcount > 0
      ? Math.min(100, Math.round((data.hiredCount / data.headcount) * 100))
      : null;

  return (
    <div className="grid grid-cols-1 divide-y divide-slate-200/80 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
      <div className="p-4">
        <div className="flex items-center justify-between text-xs font-medium text-[#475467]">
          <span>{t("recruiter.ops.analytics.jobHeader.headcountLabel")}</span>
          <Target className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
        </div>
        <p className="mt-1.5 text-xl font-bold text-[#101828] tabular-nums">
          {data.headcount != null && data.headcount > 0
            ? t("recruiter.ops.analytics.jobHeader.headcountValue", {
                hired: formatNumber(data.hiredCount, {}, locale),
                target: formatNumber(data.headcount, {}, locale),
              })
            : t("recruiter.ops.analytics.jobHeader.headcountUnset", {
                hired: formatNumber(data.hiredCount, {}, locale),
              })}
        </p>
        {headcountRatio != null && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${headcountRatio}%` }} />
          </div>
        )}
        <p className="mt-1.5 text-xs text-[#667085]">
          {t("recruiter.ops.analytics.jobHeader.pendingOffers", {
            count: formatNumber(data.pendingOfferCount, {}, locale),
          })}
        </p>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between text-xs font-medium text-[#475467]">
          <span>{t("recruiter.ops.analytics.jobHeader.totalApplicationsLabel")}</span>
          <Users className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
        </div>
        <div className="mt-1.5 flex items-baseline gap-2 tabular-nums">
          <p className="text-xl font-bold text-[#101828]">
            {formatNumber(data.totalApplications, {}, locale)}
          </p>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            {t("recruiter.ops.analytics.jobHeader.conversionRateLabel")}: {formatNumber(data.conversionRate, {}, locale)}%
          </span>
        </div>
        <p className="mt-2 text-xs text-[#667085]">
          {t("recruiter.ops.analytics.jobHeader.allTimeApplications", {
            count: formatNumber(data.allTimeApplications, {}, locale),
          })}
        </p>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between text-xs font-medium text-[#475467]">
          <span>{t("recruiter.ops.analytics.jobHeader.avgScoreLabel")}</span>
          <Award className="size-4 text-violet-600" aria-hidden="true" />
        </div>
        <p className="mt-1.5 text-xl font-bold text-[#101828] tabular-nums">
          {data.averageOverallScore != null ? formatNumber(data.averageOverallScore, {}, locale) : "—"}
          <span className="ml-1 text-xs font-normal text-[#667085]">/ 100</span>
        </p>
        <p className="mt-2 text-xs text-[#667085]">
          {t("recruiter.ops.analytics.jobHeader.avgScoreScale")}
        </p>
      </div>

      <div className={cn("p-4", data.overdueCount > 0 && "bg-amber-50/40")}>
        <div className="flex items-center justify-between text-xs font-medium text-[#475467]">
          <span>{t("recruiter.ops.analytics.jobHeader.slaOverdueLabel")}</span>
          <AlertTriangle
            className={cn("size-4", data.overdueCount > 0 ? "text-amber-600" : "text-emerald-600")}
            aria-hidden="true"
          />
        </div>
        <p
          className={cn(
            "mt-1.5 text-xl font-bold tabular-nums",
            data.overdueCount > 0 ? "text-amber-700" : "text-[#101828]",
          )}
        >
          {formatNumber(data.overdueCount, {}, locale)}
        </p>
        <p className="mt-2 text-xs text-[#667085]">
          {t("recruiter.ops.analytics.jobHeader.operationalBadges", {
            cvs: formatNumber(data.cvsToScreen, {}, locale),
            tests: formatNumber(data.pendingAssessments, {}, locale),
            interviews: formatNumber(data.upcomingInterviews, {}, locale),
          })}
        </p>
      </div>
    </div>
  );
}
