import { Link } from "react-router-dom";
import { Bot, ClipboardList, FileSearch } from "lucide-react";
import type { GateScoreView, ScreeningRoundsView } from "@/api/types/applicant";
import { button, muted } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { formatDateTime, formatNumber, useLocale, useT } from "@/i18n";

const row = "flex items-start justify-between gap-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-3 py-3";
const chip = "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium";
const passChip = `${chip} bg-[var(--color-primary-container)] text-[var(--color-on-primary)]`;
const waitChip = `${chip} bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)]`;
const failChip = `${chip} bg-[var(--color-tertiary-container)] text-[var(--color-on-primary)]`;

export function ApplicantRounds({
  rounds,
  gate,
}: {
  rounds?: ScreeningRoundsView | null;
  gate?: GateScoreView | null;
}) {
  const t = useT();
  const locale = useLocale();
  const fmtScore = (value: number | null) =>
    value === null ? "—" : formatNumber(value, { maximumFractionDigits: 2 }, locale);
  const invited = rounds?.aiInterviewInvitedAt
    ? formatDateTime(rounds.aiInterviewInvitedAt, { dateStyle: "short", timeStyle: "short" }, locale)
    : null;
  const labelOrRaw = (group: "cvStatus" | "aiStatus" | "testStatus", status?: string) => {
    const code = status ?? "MISSING";
    const key = `recruiter.ops.applicants.rounds.${group}.${code}`;
    const label = t(key);
    return label === key ? (status ?? code) : label;
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold">{t("recruiter.ops.applicants.rounds.title")}</p>
        <p className={muted}>{t("recruiter.ops.applicants.rounds.subtitle")}</p>
      </div>
      <ul className="space-y-2">
        <li className={row}>
          <div className="min-w-0 space-y-1">
            <p className="flex items-center gap-2 font-medium">
              <FileSearch className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
              {t("recruiter.ops.applicants.rounds.cvScreening")}
            </p>
            <p className={muted}>
              {rounds?.cv.score != null
                ? t("recruiter.ops.applicants.rounds.scoreOutOf100", { score: fmtScore(rounds.cv.score) })
                : t("recruiter.ops.applicants.rounds.notAnalyzed")}
              {rounds?.cv.threshold != null
                ? t("recruiter.ops.applicants.rounds.thresholdInline", { score: fmtScore(rounds.cv.threshold) })
                : ""}
            </p>
          </div>
          <span className={tone(rounds?.cv.status, rounds?.cv.passed)}>
            {labelOrRaw("cvStatus", rounds?.cv.status)}
          </span>
        </li>
        <li className={row}>
          <div className="min-w-0 space-y-1">
            <p className="flex items-center gap-2 font-medium">
              <Bot className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
              {t("recruiter.ops.applicants.rounds.aiInterview")}
            </p>
            <p className={muted}>
              {rounds?.aiInterview.score != null
                ? t("recruiter.ops.applicants.rounds.scoreOutOf100", { score: fmtScore(rounds.aiInterview.score) })
                : t("recruiter.ops.applicants.rounds.noScore")}
              {invited
                ? t("recruiter.ops.applicants.rounds.invitedAtInline", { time: invited })
                : rounds?.cv.passed
                  ? t("recruiter.ops.applicants.rounds.pendingSmtpInline")
                  : ""}
            </p>
          </div>
          <span className={tone(rounds?.aiInterview.status, rounds?.aiInterview.passed)}>
            {labelOrRaw("aiStatus", rounds?.aiInterview.status)}
          </span>
        </li>
        <li className={row}>
          <div className="min-w-0 space-y-1">
            <p className="flex items-center gap-2 font-medium">
              <ClipboardList className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
              {t("recruiter.ops.applicants.rounds.assessment")}
            </p>
            <p className={muted}>
              {rounds?.assessment.score != null
                ? t("recruiter.ops.applicants.rounds.scoreOutOf100", { score: fmtScore(rounds.assessment.score) })
                : t("recruiter.ops.applicants.rounds.noScore")}
            </p>
          </div>
          <span className={tone(rounds?.assessment.status, rounds?.assessment.passed)}>
            {labelOrRaw("testStatus", rounds?.assessment.status)}
          </span>
        </li>
      </ul>
      {gate && (
        <div className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-3 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-semibold">{t("recruiter.ops.applicants.rounds.gateTitle")}</p>
            <p className="font-mono text-xl">{fmtScore(gate.score)}</p>
          </div>
          <p className={`mt-1 ${muted}`}>
            {gate.complete
              ? gate.passed
                ? t("recruiter.ops.applicants.rounds.gatePassed")
                : t("recruiter.ops.applicants.rounds.gateFailed")
              : t("recruiter.ops.applicants.rounds.gateIncomplete")}
            {gate.passThreshold != null
              ? t("recruiter.ops.applicants.rounds.thresholdInline", { score: fmtScore(gate.passThreshold) })
              : ""}
          </p>
          <p className={`mt-1 ${muted}`}>
            {t("recruiter.ops.applicants.rounds.gateFormula", {
              cvScore: gate.cvScore ?? "—",
              cvWeight: gate.cvWeight ?? "—",
              aiScore: gate.aiInterviewScore ?? "—",
              aiWeight: gate.aiInterviewWeight ?? "—",
              testScore: gate.assessmentScore ?? "—",
              testWeight: gate.assessmentWeight ?? "—",
            })}
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Link className={button} to="/recruiter/assessments">{t("recruiter.ops.applicants.rounds.manageTestsLink")}</Link>
        <Link className={button} to="/recruiter/interviews">{t("recruiter.ops.applicants.rounds.aiInterviewsLink")}</Link>
        {rounds?.cv.passed && rounds?.aiInterview.passed && rounds?.assessment.passed ? (
          <Link className={button} to="/recruiter/interviews">{t("recruiter.ops.applicants.rounds.scheduleHumanLink")}</Link>
        ) : (
          <span
            className={`${button} cursor-not-allowed opacity-60`}
            title={t("recruiter.ops.applicants.rounds.notEligibleHumanTitle")}
          >
            {t("recruiter.ops.applicants.rounds.notEligibleHumanBtn")}
          </span>
        )}
      </div>
    </div>
  );
}

function tone(status?: string, passed?: boolean | null) {
  if (passed === true || status === "PASSED" || status === "SCORED" || status === "GRADED" || status === "INVITED") {
    return passChip;
  }
  if (passed === false || status === "FAILED" || status === "ERROR" || status === "EXPIRED") return failChip;
  return waitChip;
}
