import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Bot,
  CalendarClock,
  CalendarDays,
  Clock,
  FileSearch,
  MapPin,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";
import { humanInterviewApi } from "@/api/tenant/humanInterviewApi";
import type { ScreeningRoundsView } from "@/api/types/applicant";
import type { HumanInterview } from "@/api/types/humanInterview";
import { getHumanInterviewStatusLabel } from "@/components/ux/humanInterviewUtilities";
import { Skeleton } from "@/components/ux/Skeleton";
import { formatDate, formatTime, useLocale, useT, type TranslateFn } from "@/i18n";
import { cn } from "@/lib/utils";

type Props = {
  applicationId: number;
  candidateName: string;
  jobId: number;
  rounds?: ScreeningRoundsView | null;
  cvScreeningStatus?: string | null;
  preview?: boolean;
  onOpenScheduleDialog: () => void;
};

function roundPassed(passed: boolean | null | undefined, status?: string) {
  return passed === true || status === "PASSED";
}

function checkEligibility(rounds?: ScreeningRoundsView | null, cvScreeningStatus?: string | null) {
  if (!rounds) {
    return {
      cvOk: cvScreeningStatus === "PASSED",
      aiOk: false,
      assessmentOk: false,
      eligible: false,
    };
  }
  const cvOk = roundPassed(rounds.cv.passed, rounds.cv.status) || cvScreeningStatus === "PASSED";
  const aiOk = roundPassed(rounds.aiInterview.passed, rounds.aiInterview.status);
  const assessmentOk = roundPassed(rounds.assessment.passed, rounds.assessment.status);
  return {
    cvOk,
    aiOk,
    assessmentOk,
    eligible: cvOk && aiOk && assessmentOk,
  };
}

function getPreviewHumanInterview(t: TranslateFn): HumanInterview {
  return {
    id: 88,
    applicationId: 101,
    jobId: 9001,
    jobTitle: t("recruiter.screening.preview.ranking.jobTitle"),
    candidateId: 501,
    candidateName: "Nguyễn Văn An",
    candidateEmail: "an.nguyen@example.com",
    round: "TECHNICAL",
    mode: "ONLINE",
    status: "CONFIRMED",
    start: new Date(Date.now() + 86400000).toISOString(),
    end: new Date(Date.now() + 90000000).toISOString(),
    meetingUrl: "https://meet.google.com/smh-tech-interview",
    location: null,
    configuration: {
      rubric: "TECHNICAL_SENIOR",
      provider: "GOOGLE_MEET",
      emailTemplate: "INVITATION_TECH_ROUND",
      notes: t("recruiter.screening.preview.scheduling.notes"),
      attachCalendar: true,
      rescheduleReason: null,
      requestedStart: null,
      requestedEnd: null,
    },
    participants: [
      {
        userId: 10,
        name: "Trần Minh Quân (Lead Architect)",
        email: "quan.tran@company.com",
        role: "LEAD",
      },
      {
        userId: 12,
        name: "Lê Thị Mai (Senior Tech Lead)",
        email: "mai.le@company.com",
        role: "CO_INTERVIEWER",
      },
    ],
    evaluations: [
      {
        id: 501,
        evaluatorId: 10,
        evaluatorName: "Trần Minh Quân",
        technicalScore: 92,
        communicationScore: 90,
        cultureScore: 95,
        overallScore: 92,
        comments: t("recruiter.screening.preview.scheduling.evalComments"),
        recommendation: "HIRE",
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

export function CandidateSchedulingTab({
  applicationId,
  candidateName,
  jobId,
  rounds,
  cvScreeningStatus,
  preview = false,
  onOpenScheduleDialog,
}: Props) {
  const t = useT();
  const locale = useLocale();
  const previewInterview = useMemo(() => (preview ? getPreviewHumanInterview(t) : null), [preview, t]);
  const { cvOk, aiOk, assessmentOk, eligible: liveEligible } = checkEligibility(rounds, cvScreeningStatus);
  const eligible = preview ? true : liveEligible;

  const interviewsQuery = useQuery({
    queryKey: ["human-interviews", jobId, applicationId],
    queryFn: () => humanInterviewApi.list({ jobId, size: 50 }),
    enabled: !preview,
  });

  const scheduledInterview: HumanInterview | null = preview
    ? previewInterview
    : interviewsQuery.data?.items?.find((item) => item.applicationId === applicationId) ?? null;

  const isLoading = !preview && interviewsQuery.isLoading;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950 dark:text-emerald-300">
              <CalendarDays className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {t("recruiter.screening.scheduling.headerTitle")}
                </h2>
                {scheduledInterview && (
                  <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {getHumanInterviewStatusLabel(scheduledInterview.status, t)}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t("recruiter.screening.scheduling.candidateMeta", { name: candidateName, id: applicationId })}
              </p>
            </div>
          </div>

          <div>
            {eligible ? (
              <button
                type="button"
                onClick={onOpenScheduleDialog}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-primary-hover transition-all cursor-pointer"
              >
                <CalendarDays className="size-4" />
                {scheduledInterview
                  ? t("recruiter.screening.scheduling.updateScheduleBtn")
                  : t("recruiter.screening.scheduling.scheduleNowBtn")}
              </button>
            ) : (
              <button
                type="button"
                disabled
                title={t("recruiter.screening.scheduling.ineligibleTitle")}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400 cursor-not-allowed border border-slate-200 dark:bg-slate-800 dark:border-slate-700"
              >
                <CalendarDays className="size-4" />
                {t("recruiter.screening.scheduling.ineligibleBtn")}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {t("recruiter.screening.scheduling.prereqHeading")}
          </span>
          <div className="grid gap-3 sm:grid-cols-3">
            <div
              className={cn(
                "flex items-center justify-between rounded-xl border p-3 text-xs",
                cvOk
                  ? "border-emerald-200 bg-emerald-50/50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
                  : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400"
              )}
            >
              <div className="flex items-center gap-2">
                <FileSearch className="size-4 text-emerald-600" />
                <span className="font-semibold">{t("recruiter.screening.scheduling.roundCv")}</span>
              </div>
              <span className="font-bold">
                {cvOk ? t("recruiter.screening.scheduling.passedCheck") : t("recruiter.screening.scheduling.failedStatus")}
              </span>
            </div>

            <div
              className={cn(
                "flex items-center justify-between rounded-xl border p-3 text-xs",
                aiOk
                  ? "border-emerald-200 bg-emerald-50/50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
                  : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400"
              )}
            >
              <div className="flex items-center gap-2">
                <Bot className="size-4 text-brand-primary" />
                <span className="font-semibold">{t("recruiter.screening.scheduling.roundAi")}</span>
              </div>
              <span className="font-bold">
                {aiOk
                  ? t("recruiter.screening.scheduling.passedCheck")
                  : rounds?.aiInterview?.score != null
                    ? t("recruiter.screening.scheduling.scoreFailed", { score: rounds.aiInterview.score })
                    : t("recruiter.screening.scheduling.notDoneStatus")}
              </span>
            </div>

            <div
              className={cn(
                "flex items-center justify-between rounded-xl border p-3 text-xs",
                assessmentOk
                  ? "border-emerald-200 bg-emerald-50/50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
                  : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400"
              )}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-purple-600" />
                <span className="font-semibold">{t("recruiter.screening.scheduling.roundAssessment")}</span>
              </div>
              <span className="font-bold">
                {assessmentOk
                  ? t("recruiter.screening.scheduling.passedCheck")
                  : rounds?.assessment?.score != null
                    ? t("recruiter.screening.scheduling.scoreFailed", { score: rounds.assessment.score })
                    : t("recruiter.screening.scheduling.notDoneStatus")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : scheduledInterview ? (
        <section className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t("recruiter.screening.scheduling.sessionTitle")}
            </h3>
            <span className="font-mono text-xs text-slate-400">#{scheduledInterview.id}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50 space-y-1 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {t("recruiter.screening.scheduling.roundLabel")}
              </span>
              <strong className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                {scheduledInterview.round === "TECHNICAL"
                  ? t("recruiter.screening.scheduling.rounds.TECHNICAL")
                  : scheduledInterview.round === "CULTURE"
                    ? t("recruiter.screening.scheduling.rounds.CULTURE")
                    : t("recruiter.screening.scheduling.rounds.EXECUTIVE")}
              </strong>
              <span className="inline-flex items-center gap-1 text-[11px] text-brand-primary font-semibold">
                {scheduledInterview.mode === "ONLINE" ? <Video className="size-3.5" /> : <MapPin className="size-3.5" />}
                {t("recruiter.screening.scheduling.modeLabel", {
                  mode: scheduledInterview.mode === "ONLINE"
                    ? t("recruiter.screening.scheduling.modeOnline")
                    : t("recruiter.screening.scheduling.modeOnsite"),
                })}
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50 space-y-1 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {t("recruiter.screening.scheduling.timeLabel")}
              </span>
              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-200">
                <Clock className="size-4 text-emerald-600" />
                <span>
                  {scheduledInterview.start
                    ? formatTime(scheduledInterview.start, { hour: "2-digit", minute: "2-digit" }, locale)
                    : "—"}
                  {" - "}
                  {scheduledInterview.end
                    ? formatTime(scheduledInterview.end, { hour: "2-digit", minute: "2-digit" }, locale)
                    : "—"}
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                {t("recruiter.screening.scheduling.dateLabel", {
                  date: scheduledInterview.start
                    ? formatDate(
                        scheduledInterview.start,
                        { weekday: "long", year: "numeric", month: "long", day: "numeric" },
                        locale,
                      )
                    : t("recruiter.screening.scheduling.dateTbd"),
                })}
              </span>
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/50 space-y-1.5 text-xs sm:col-span-2 lg:col-span-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {t("recruiter.screening.scheduling.locationLabel")}
              </span>
              {scheduledInterview.meetingUrl ? (
                <div>
                  <a
                    href={scheduledInterview.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-primary-hover transition-colors"
                  >
                    <Video className="size-3.5" />
                    {t("recruiter.screening.scheduling.joinOnlineBtn")}
                  </a>
                  <p className="mt-1 font-mono text-[10px] text-slate-400 truncate">
                    {scheduledInterview.meetingUrl}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                  <MapPin className="size-4 text-rose-500" />
                  <span>{scheduledInterview.location || t("recruiter.screening.scheduling.officeDefault")}</span>
                </div>
              )}
            </div>
          </div>

          {scheduledInterview.participants && scheduledInterview.participants.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Users className="size-4 text-slate-400" />
                {t("recruiter.screening.scheduling.panelHeading")}
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {scheduledInterview.participants.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                        {p.name.slice(0, 1)}
                      </div>
                      <div>
                        <strong className="block text-slate-800 dark:text-slate-200">{p.name}</strong>
                        <span className="text-[11px] text-slate-400">{p.email}</span>
                      </div>
                    </div>
                    <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      {p.role === "LEAD"
                        ? t("recruiter.screening.scheduling.roles.LEAD")
                        : p.role === "CO_INTERVIEWER"
                          ? t("recruiter.screening.scheduling.roles.CO_INTERVIEWER")
                          : t("recruiter.screening.scheduling.roles.NOTE_TAKER")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {scheduledInterview.evaluations && scheduledInterview.evaluations.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <Award className="size-4 text-amber-500" />
                {t("recruiter.screening.scheduling.evaluationsHeading")}
              </h4>
              <div className="space-y-3">
                {scheduledInterview.evaluations.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 text-xs dark:border-slate-800 dark:bg-slate-950/60 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-sm font-bold text-slate-900 dark:text-white">
                        {ev.evaluatorName}
                      </strong>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase",
                          ev.recommendation === "HIRE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : ev.recommendation === "REJECT"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                        )}
                      >
                        {ev.recommendation === "HIRE"
                          ? t("recruiter.screening.scheduling.recommendations.HIRE")
                          : ev.recommendation === "REJECT"
                            ? t("recruiter.screening.scheduling.recommendations.REJECT")
                            : t("recruiter.screening.scheduling.recommendations.HOLD")}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="rounded-lg bg-white border border-slate-200 p-2 dark:bg-slate-900 dark:border-slate-800">
                        <span className="block text-[10px] text-slate-400">
                          {t("recruiter.screening.scheduling.evalTechnical")}
                        </span>
                        <strong className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {ev.technicalScore}/100
                        </strong>
                      </div>
                      <div className="rounded-lg bg-white border border-slate-200 p-2 dark:bg-slate-900 dark:border-slate-800">
                        <span className="block text-[10px] text-slate-400">
                          {t("recruiter.screening.scheduling.evalCommunication")}
                        </span>
                        <strong className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {ev.communicationScore}/100
                        </strong>
                      </div>
                      <div className="rounded-lg bg-white border border-slate-200 p-2 dark:bg-slate-900 dark:border-slate-800">
                        <span className="block text-[10px] text-slate-400">
                          {t("recruiter.screening.scheduling.evalCulture")}
                        </span>
                        <strong className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {ev.cultureScore}/100
                        </strong>
                      </div>
                      <div className="rounded-lg bg-brand-primary/10 border border-brand-primary/20 p-2 dark:bg-brand-primary/20 dark:border-brand-primary/30">
                        <span className="block text-[10px] text-brand-primary font-semibold">
                          {t("recruiter.screening.scheduling.evalOverall")}
                        </span>
                        <strong className="text-sm font-extrabold text-brand-primary">
                          {ev.overallScore}/100
                        </strong>
                      </div>
                    </div>

                    {ev.comments && (
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed italic bg-white p-2.5 rounded-lg border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                        "{ev.comments}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20 dark:bg-brand-primary/20 dark:text-brand-primary">
            <CalendarClock className="size-6" />
          </div>
          <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
            {t("recruiter.screening.scheduling.emptyTitle")}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
            {eligible
              ? t("recruiter.screening.scheduling.emptyEligibleDesc")
              : t("recruiter.screening.scheduling.emptyIneligibleDesc")}
          </p>

          <div className="mt-5 flex justify-center">
            {eligible ? (
              <button
                type="button"
                onClick={onOpenScheduleDialog}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-brand-primary-hover transition-all cursor-pointer"
              >
                <CalendarDays className="size-4" />
                {t("recruiter.screening.scheduling.emptyScheduleBtn")}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-400 border border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700"
              >
                {t("recruiter.screening.scheduling.emptyWaitBtn")}
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
