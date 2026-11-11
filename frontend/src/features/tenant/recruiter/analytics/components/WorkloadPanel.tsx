import { ArrowRight, Clock3, ListChecks, UserCheck, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ux/Card";
import { formatNumber, useLocale, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import type { WorkloadData } from "../types/recruiterAnalytics";
import { AnalyticsEmptyState } from "./AnalyticsEmptyState";

export function WorkloadPanel({ data }: { data: WorkloadData }) {
  const navigate = useNavigate();
  const t = useT();
  const locale = useLocale();
  const actions = [
    [t("recruiter.ops.analytics.actionCvsToScreen"), data.actions.cvsToScreen, Users],
    [t("recruiter.ops.analytics.actionOverSla"), data.actions.candidatesOverSla, Clock3],
    [t("recruiter.ops.analytics.actionAssessmentsPending"), data.actions.assessmentsPendingReview, ListChecks],
    [t("recruiter.ops.analytics.actionUpcomingInterviews"), data.actions.upcomingInterviews, UserCheck],
  ] as const;

  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{actions.map(([title, count, Icon]) => <Card key={title} className="p-4"><span className="grid size-10 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary"><Icon className="size-5" aria-hidden="true" /></span><p className="mt-4 text-3xl font-semibold">{formatNumber(count, {}, locale)}</p><h2 className="mt-1 text-sm font-semibold">{title}</h2></Card>)}</div>
    {data.jobs.length === 0 ? <AnalyticsEmptyState>{t("recruiter.ops.analytics.workloadEmptyJobs")}</AnalyticsEmptyState> : <Card className="overflow-hidden p-0">
      <h2 className="px-5 py-4 font-display text-lg font-semibold">{t("recruiter.ops.analytics.attentionJobsTitle")}</h2>
      {data.jobs.map((job) => <div key={job.jobId} className="grid gap-4 border-t border-[var(--color-border-default)] px-5 py-4 md:grid-cols-[1fr_150px_120px_auto] md:items-center">
        <div><h3 className="font-semibold">{job.title}</h3><p className="text-xs text-[var(--color-text-secondary)]">{t("recruiter.ops.analytics.jobCandidateStage", { count: job.candidateCount, stage: job.currentFocusStage ?? t("recruiter.ops.analytics.noStage") })}</p></div>
        <div><div className="flex justify-between text-xs"><span>{t("recruiter.ops.analytics.healthScore")}</span><strong>{job.healthScore}%</strong></div><div className="mt-1 h-2 rounded-full bg-surface-muted"><div className="h-full rounded-full bg-brand-primary" style={{ width: `${job.healthScore}%` }} /></div></div>
        <span className={cn("w-fit rounded-full px-2.5 py-1 text-xs font-semibold", job.overdueCount ? "bg-amber-100 text-amber-800" : "bg-[var(--color-primary-soft)] text-brand-primary")}>{t("recruiter.ops.analytics.overdueCount", { count: job.overdueCount })}</span>
        <button type="button" onClick={() => navigate(`/recruiter/jobs/${job.jobId}/applicants?view=board`)} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-brand-primary hover:bg-[var(--color-primary-soft)]">{t("recruiter.ops.analytics.viewPipelineBtn")} <ArrowRight className="size-4" aria-hidden="true" /></button>
      </div>)}
    </Card>}
  </div>;
}
