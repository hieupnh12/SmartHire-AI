import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Bot, BriefcaseBusiness, CalendarClock, CalendarDays, ChevronDown, ClipboardList, MapPin, XCircle } from "lucide-react";
import type { RoundItemView } from "@/api/types/applicant";
import { applicantApi } from "@/api/tenant/applicantApi";
import { PageSkeleton, SkeletonCard } from "@/components/ux/Skeleton";
import { StatusPill } from "@/components/ux/StatusPill";
import { ApplicationPipeline } from "@/features/tenant/recruiter/matching/components/recruitmentFlow";
import { formatDate, formatDateTime, formatNumber, useLocale, useT } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/stores/toastStore";
import { cn } from "@/lib/utils";
import { OfferResponsePanel } from "../components/OfferResponsePanel";
import { RoundEvaluation, type RoundKey } from "../components/RoundEvaluations";
import { WithdrawDialog } from "../components/WithdrawDialog";

export function ApplicationDetailPage() {
  const t = useT();
  const locale = useLocale();
  const { id } = useParams();
  const applicationId = id && /^\d+$/.test(id) ? id : undefined;
  const detail = useQuery({
    queryKey: queryKeys.applicants.detail(applicationId ?? 0),
    queryFn: () => applicantApi.get(applicationId!),
    enabled: Boolean(applicationId),
  });
  const application = detail.data?.data;
  const evaluation = useQuery({
    queryKey: ["applications", "evaluation", applicationId],
    queryFn: () => applicantApi.evaluation(applicationId!).then((r) => r.data),
    enabled: Boolean(applicationId),
  });
  const [openRound, setOpenRound] = useState<RoundKey | null>(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const queryClient = useQueryClient();
  const withdraw = useMutation({
    mutationFn: (reason?: string) => applicantApi.withdraw(applicationId!, reason),
    onSuccess: () => {
      toast.success(t("candidate.core.applications.withdrawSuccessToast"));
      setShowWithdraw(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.applicants.detail(applicationId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.applicants.mine });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  if (!applicationId) return <ErrorMessage>{t("candidate.core.applications.detail.invalidUrl")}</ErrorMessage>;
  if (detail.isPending) return <PageSkeleton variant="detail" />;
  if (detail.isError) return <ErrorMessage>{getApiErrorMessage(detail.error)}</ErrorMessage>;
  if (!application) return null;

  const meta = [application.jobDepartment, application.jobLocation, application.jobWorkMode, application.jobEmploymentType].filter(Boolean);
  const rounds = application.rounds;
  const statusLabel = (status: string) => {
    const key = `candidate.core.applications.statuses.${status}`;
    const value = t(key);
    return value === key ? status : value;
  };

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <Link to="/applications" className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-alt)]"><ArrowLeft className="size-4" aria-hidden="true" />{t("candidate.core.applications.detail.backToList")}</Link>

      <header className="overflow-hidden rounded-3xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-card)]">
        <div className="bg-[linear-gradient(135deg,var(--color-primary-subtle),white_60%)] p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">{t("candidate.core.applications.detail.eyebrow", { id: application.id })}</p><h1 className="mt-2 break-words text-3xl font-semibold tracking-tight">{application.jobTitle}</h1><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--color-on-surface-variant)]">{meta.length > 0 && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden="true" />{meta.join(" · ")}</span>}<span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden="true" />{t("candidate.core.applications.detail.appliedDate", { date: formatDate(application.createdAt, undefined, locale) })}</span></div></div>
            <StatusPill status={application.status} label={statusLabel(application.status)} />
          </div>
          <div className="mt-6"><ApplicationPipeline status={application.status} /></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border-default)] px-5 py-4 sm:px-7">
          <Link to={`/jobs/${application.jobId}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--color-border-default)] px-4 text-sm font-semibold hover:bg-[var(--color-surface-alt)]"><BriefcaseBusiness className="size-4" aria-hidden="true" />{t("candidate.core.applications.detail.viewJob")}</Link>
          {application.status === "ASSESSMENT" && <Link to={`/assessments?applicationId=${application.id}`} className="inline-flex min-h-10 items-center rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-white">{t("candidate.core.applications.detail.takeAssessment")}</Link>}
          {application.status === "INTERVIEW" && <Link to="/interviews" className="inline-flex min-h-10 items-center rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-white">{t("candidate.core.applications.detail.viewAiInterview")}</Link>}
          {application.status === "HUMAN_INTERVIEW" && <Link to="/interview-schedules" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-white"><CalendarClock className="size-4" aria-hidden="true" />{t("candidate.core.applications.detail.humanInterviewSchedules")}</Link>}
          {application.withdrawable && (
            <button type="button" onClick={() => setShowWithdraw(true)} disabled={withdraw.isPending} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
              <XCircle className="size-4" aria-hidden="true" />{t("candidate.core.applications.detail.withdraw")}
            </button>
          )}
        </div>
      </header>

      {application.status === "OFFER" && <OfferResponsePanel applicationId={application.id} jobTitle={application.jobTitle} />}

      <div className="space-y-2">
        <p className="text-sm text-[var(--color-on-surface-variant)]">{t("candidate.core.applications.detail.roundsHint")}</p>
        <div className="grid gap-4 md:grid-cols-3">
          {(["cv", "aiInterview", "assessment"] as const).map((key) => <RoundCard key={key} icon={key === "aiInterview" ? Bot : ClipboardList} title={t(`candidate.core.applications.evaluation.rounds.${key}`)} round={rounds?.[key]}
            open={openRound === key} onToggle={() => setOpenRound((value) => value === key ? null : key)} />)}
        </div>
      </div>

      {openRound && evaluation.isError && <ErrorMessage>{getApiErrorMessage(evaluation.error)}</ErrorMessage>}
      {openRound && evaluation.isPending && <SkeletonCard className="h-56" />}
      {openRound && evaluation.data && <RoundEvaluation id="round-evaluation" round={openRound} data={evaluation.data} />}

      <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <h2 className="text-lg font-semibold">{t("candidate.core.applications.detail.historyTitle")}</h2>
        {application.history.length === 0 ? <p className="mt-4 text-sm text-[var(--color-on-surface-variant)]">{t("candidate.core.applications.detail.historyEmpty")}</p> : <ol className="mt-5 space-y-0">{application.history.map((item, index) => <li key={`${item.toStatus}-${item.createdAt}-${index}`} className="relative flex gap-4 pb-6 last:pb-0"><span className="relative z-10 mt-1.5 size-3 shrink-0 rounded-full bg-[var(--color-primary)] ring-4 ring-[var(--color-primary-subtle)]" aria-hidden="true" />{index < application.history.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-[var(--color-border-default)]" aria-hidden="true" />}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm font-semibold">{statusLabel(item.toStatus)}</p><time className="text-xs text-[var(--color-on-surface-variant)]" dateTime={item.createdAt}>{formatDateTime(item.createdAt, undefined, locale)}</time></div>{item.note && <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{item.note}</p>}</div></li>)}</ol>}
      </section>

      <WithdrawDialog
        jobTitle={showWithdraw ? application.jobTitle : null}
        onClose={() => setShowWithdraw(false)}
        onConfirm={(reason) => withdraw.mutateAsync(reason)}
      />
    </section>
  );
}

function RoundCard({ icon: Icon, title, round, open, onToggle }: { icon: typeof Bot; title: string; round?: RoundItemView; open: boolean; onToggle: () => void }) {
  const t = useT();
  const locale = useLocale();
  const roundStatusLabel = (status: string) => {
    const key = `candidate.core.applications.detail.roundStatus.${status}`;
    const value = t(key);
    return value === key ? status : value;
  };
  const label = round ? roundStatusLabel(round.status) : t("candidate.core.applications.detail.roundStatus.NOT_STARTED");
  const formattedScore = round?.score != null ? formatNumber(round.score, { maximumFractionDigits: 2 }, locale) : "";
  const [scoreBefore, scoreAfter] = round?.score != null ? t("candidate.core.applications.detail.scoreLine", { score: "\0" }).split("\0") : ["", ""];
  return <button type="button" onClick={onToggle} aria-expanded={open} aria-controls="round-evaluation"
    className={cn("flex flex-col rounded-2xl border bg-white p-5 text-left shadow-[var(--shadow-card)] transition-[border-color,box-shadow] hover:border-[var(--color-primary)]/40 hover:shadow-[var(--shadow-ambient)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30",
      open ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/15" : "border-[var(--color-border-default)]")}>
    <span className="flex w-full items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><Icon className="size-5" aria-hidden="true" /></span><StatusPill status={round?.status ?? "NOT_STARTED"} label={label} /></span>
    <span className="mt-4 font-semibold">{title}</span>
    {round?.score != null ? <span className="mt-2 text-sm text-[var(--color-on-surface-variant)]">{scoreBefore}<strong className={round.threshold == null ? "text-[var(--color-on-surface)]" : round.score < round.threshold ? "text-[var(--color-error)]" : "text-emerald-700"}>{formattedScore}</strong>{scoreAfter}{round.threshold != null && t("candidate.core.applications.detail.thresholdPart", { threshold: round.threshold })}</span> : <span className="mt-2 text-sm text-[var(--color-on-surface-variant)]">{t("candidate.core.applications.detail.emptyScoreHint")}</span>}
    {round?.passed === true && round.score != null && round.threshold != null && round.score < round.threshold && <span className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{t("candidate.core.applications.detail.recruiterApprovedHint")}</span>}
    <span className="mt-auto flex items-center gap-1 pt-3 text-sm font-semibold text-[var(--color-primary)]">{open ? t("candidate.core.applications.detail.hideDetails") : t("candidate.core.applications.detail.showDetails")}<ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" /></span>
  </button>;
}

function ErrorMessage({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="rounded-xl bg-[var(--color-error-container)] p-4 text-sm text-[var(--color-on-error-container)]">{children}</p>;
}
