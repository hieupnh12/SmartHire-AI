import { Link } from "react-router-dom";
import { BriefcaseBusiness, Check, ChevronRight, Lock, XCircle } from "lucide-react";
import type { ApplicationStatus, ApplicationSummary } from "@/api/types/applicant";
import { StatusPill } from "@/components/ux/StatusPill";
import { getPipelineSteps, pipelineIndex } from "@/features/tenant/recruiter/matching/components/recruitmentFlow";
import { formatDate, useLocale, useT } from "@/i18n";
import { cn } from "@/lib/utils";

type Props = {
  row: ApplicationSummary;
  statusLabel: string;
  withdrawing: boolean;
  onWithdraw: () => void;
};

export function ApplicationCard({ row, statusLabel, withdrawing, onWithdraw }: Props) {
  const t = useT();
  const locale = useLocale();
  const meta = [row.jobDepartment, row.jobLocation, row.jobWorkMode, row.jobEmploymentType].filter(Boolean) as string[];
  const lockedHint = row.withdrawable || ["REJECTED", "FAILED", "HIRED", "WITHDRAWN"].includes(row.status)
    ? null
    : t("candidate.core.applications.card.lockedHint");

  return <li className="flex min-w-0 flex-col rounded-2xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-card)] transition-[border-color,box-shadow] hover:border-[var(--color-primary)]/30 hover:shadow-[var(--shadow-ambient)]">
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><BriefcaseBusiness className="size-5" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 min-h-12 text-base font-semibold leading-6">{row.jobTitle}</h2>
          <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">{t("candidate.core.applications.card.appliedOn", { date: formatDate(row.createdAt, undefined, locale) })}</p>
        </div>
        <span className="shrink-0"><StatusPill status={row.status} label={statusLabel} /></span>
      </div>

      {meta.length > 0 && <ul className="flex flex-wrap gap-2" aria-label={t("candidate.core.applications.card.jobMetaAria")}>
        {meta.map((item) => <li key={item} className="max-w-full truncate rounded-full bg-[var(--color-surface-alt)] px-2.5 py-1 text-xs text-[var(--color-on-surface-variant)]">{item}</li>)}
      </ul>}

      <StageProgress status={row.status} />
    </div>

    <div className="flex items-center justify-between gap-2 border-t border-[var(--color-border-default)] px-6 py-3">
      {row.withdrawable
        ? <button type="button" onClick={onWithdraw} disabled={withdrawing} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-[var(--color-on-surface-variant)] hover:bg-[var(--color-error-container)] hover:text-[var(--color-error)] disabled:opacity-50"><XCircle className="size-4" aria-hidden="true" />{t("candidate.core.applications.card.withdraw")}</button>
        : lockedHint
          ? <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-[var(--color-on-surface-variant)]"><Lock className="size-3.5 shrink-0" aria-hidden="true" /><span className="line-clamp-2">{lockedHint}</span></span>
          : <span />}
      <div className="flex gap-2">
        <Link to={`/jobs/${row.jobId}`} className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-alt)]">{t("candidate.core.applications.card.viewJob")}</Link>
        <Link to={`/applications/${row.id}`} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]">{t("candidate.core.applications.card.viewProgress")}<ChevronRight className="size-4" aria-hidden="true" /></Link>
      </div>
    </div>
  </li>;
}

function StageProgress({ status }: { status: ApplicationStatus }) {
  const t = useT();
  const current = pipelineIndex(status);
  const ended = current < 0;
  const hired = status === "HIRED";

  return <div className="mt-auto rounded-xl bg-[var(--color-surface-alt)] px-2 py-3">
    {ended && <p className="mb-2 text-center text-xs font-semibold text-[var(--color-on-surface-variant)]">{t("candidate.core.applications.card.processEnded")}</p>}
    <ol className="flex items-start" aria-label={t("candidate.core.applications.card.progressAria")}>
      {getPipelineSteps(t).map((step, index) => {
        const done = !ended && (index < current || (hired && index === current));
        const active = !ended && !done && index === current;
        return <li key={step.id} aria-current={active ? "step" : undefined} className="relative flex flex-1 flex-col items-center gap-1.5 text-center">
          {index > 0 && <span aria-hidden="true" className={cn("absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2", !ended && index <= current ? "bg-[var(--color-primary)]" : "bg-[var(--color-border-default)]")} />}
          <span className={cn("relative z-10 grid size-7 place-items-center rounded-full border-2 text-xs font-semibold",
            done && "border-[var(--color-primary)] bg-[var(--color-primary)] text-white",
            active && "border-[var(--color-primary)] bg-white text-[var(--color-primary)] ring-4 ring-[var(--color-primary)]/15",
            !done && !active && "border-[var(--color-border-default)] bg-white text-[var(--color-on-surface-variant)]")}>
            {done ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
          </span>
          <span className={cn("px-0.5 text-[11px] leading-tight", active ? "font-semibold text-[var(--color-primary)]" : done ? "font-medium text-[var(--color-on-surface)]" : "text-[var(--color-on-surface-variant)]")}>
            {t(`candidate.core.applications.pipelineSteps.${step.id}`)}{done && <span className="sr-only"> {t("candidate.core.applications.card.stepDoneSr")}</span>}
          </span>
        </li>;
      })}
    </ol>
  </div>;
}
