import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bot, CalendarClock, Clock3, FileSearch, RefreshCw, ShieldCheck } from "lucide-react";
import type { AiInterview, AiInterviewStatus } from "@/api/types/aiInterview";
import { Button } from "@/components/ux/Button";
import { LoadingState, SkeletonCard } from "@/components/ux/Skeleton";
import { formatDateTime, formatNumber, useLocale, useT, type TranslateFn } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { useCandidateInterviews } from "../hooks/useCandidateInterviews";
import { getAiInterviewStatusLabel } from "../constants/interviewStatus";
import { getMockInterviewInvitation, MOCK_INTERVIEW_ID } from "../constants/mockInterviewInvitation";

const STATUS_TONE: Record<AiInterviewStatus, string> = {
  CREATED: "bg-slate-100 text-slate-700", GENERATING: "bg-amber-50 text-amber-700",
  QUESTIONS_READY: "bg-blue-50 text-blue-700", IN_PROGRESS: "bg-violet-50 text-violet-700",
  SCORING: "bg-amber-50 text-amber-700", SCORED: "bg-cyan-50 text-cyan-700",
  PASSED: "bg-emerald-50 text-emerald-700", FAILED: "bg-red-50 text-red-700", ERROR: "bg-red-50 text-red-700",
};

export function InterviewsPage() {
  const t = useT();
  const interviews = useCandidateInterviews();
  const mockInvitation = useMemo(() => getMockInterviewInvitation(t), [t]);
  const realRows = interviews.data ?? [];
  const rows = [mockInvitation, ...realRows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const ready = realRows.filter((item) => item.status === "QUESTIONS_READY" || item.status === "IN_PROGRESS").length;
  const completed = realRows.filter((item) => ["SCORED", "PASSED", "FAILED"].includes(item.status)).length;

  return <section className="space-y-6 text-[var(--color-on-surface)]" aria-labelledby="interviews-title">
    <header className="overflow-hidden rounded-3xl border border-[var(--color-border-default)] bg-[linear-gradient(135deg,var(--color-primary-subtle),white_62%)] px-5 py-6 shadow-[var(--shadow-card)] sm:px-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
            {t("candidate.assess.interviews.list.eyebrow")}
          </p>
          <h1 id="interviews-title" className="mt-2 text-3xl font-semibold tracking-tight">
            {t("candidate.assess.interviews.list.title")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--color-on-surface-variant)]">
            {t("candidate.assess.interviews.list.subtitle")}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Metric value={realRows.length} label={t("candidate.assess.interviews.list.metricInvitations")} />
          <Metric value={ready} label={t("candidate.assess.interviews.list.metricReady")} />
          <Metric value={completed} label={t("candidate.assess.interviews.list.metricCompleted")} />
        </div>
      </div>
    </header>

    <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-primary)]/15 bg-[var(--color-primary-subtle)] p-4 text-sm">
      <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
      <p className="leading-6 text-[var(--color-on-surface-variant)]">
        <strong className="text-[var(--color-on-surface)]">{t("candidate.assess.interviews.list.beforeStartStrong")}</strong>{" "}
        {t("candidate.assess.interviews.list.beforeStartBody")}
      </p>
    </div>

    {interviews.isPending && (
      <LoadingState className="grid gap-4 lg:grid-cols-2" label={t("candidate.assess.interviews.list.loadingLabel")}>
        {[0, 1, 2, 3].map((item) => <SkeletonCard key={item} className="min-h-72" />)}
      </LoadingState>
    )}
    {interviews.isError && (
      <div role="alert" className="rounded-2xl border border-[var(--color-error-container)] bg-[var(--color-error-container)] p-5">
        <p className="text-sm text-[var(--color-on-error-container)]">{getApiErrorMessage(interviews.error)}</p>
        <Button className="mt-4" variant="secondary" onClick={() => void interviews.refetch()}>
          <RefreshCw className="size-4" aria-hidden="true" />{t("candidate.assess.common.retry")}
        </Button>
      </div>
    )}

    <div className="grid gap-4 lg:grid-cols-2">
      {rows.map((interview) => <InterviewCard key={interview.id} interview={interview} preview={interview.id === MOCK_INTERVIEW_ID} />)}
    </div>
  </section>;
}

function InterviewCard({ interview, preview = false }: { interview: AiInterview; preview?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const boundaries = [interview.availableFrom, interview.availableUntil].filter(Boolean)
      .map(value => new Date(value!).getTime()).filter(value => value > now);
    if (!boundaries.length) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(Math.min(...boundaries) - now + 25, 2_147_483_647));
    return () => clearTimeout(timer);
  }, [interview.availableFrom, interview.availableUntil, now]);
  const action = actionLabel(interview.status, !!interview.completedAt, t);
  const expired = interview.availableUntil ? new Date(interview.availableUntil).getTime() <= now : false;
  const notYetAvailable = interview.availableFrom ? new Date(interview.availableFrom).getTime() > now : false;
  const formatWhen = (value: string | null | undefined, fallback: string) => {
    if (!value) return fallback;
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? fallback
      : formatDateTime(date, { dateStyle: "short", timeStyle: "short" }, locale);
  };

  return <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-card)] transition-[border-color,box-shadow] hover:border-[var(--color-primary)]/30 hover:shadow-[var(--shadow-ambient)]">
    <div className="flex-1 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
          <Bot className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                  {preview
                    ? t("candidate.assess.interviews.list.cardEyebrowPreview")
                    : t("candidate.assess.interviews.list.cardEyebrowId", { id: interview.id })}
                </p>
                {preview && (
                  <span className="rounded-full bg-[var(--color-primary-subtle)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                    {t("candidate.assess.interviews.list.previewBadge")}
                  </span>
                )}
              </div>
              <h2 className="mt-1 break-words text-lg font-semibold leading-6">
                {interview.jobTitle ?? t("candidate.assess.interviews.list.applicationFallback", { id: interview.applicationId })}
              </h2>
              {preview && (
                <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                  {t("candidate.assess.interviews.list.previewCompanyRole")}
                </p>
              )}
            </div>
            <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[interview.status]}`}>
              {getAiInterviewStatusLabel(interview.status, t)}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-3 rounded-xl bg-[var(--color-surface-alt)] p-4 text-sm sm:grid-cols-2">
        <Fact
          icon={CalendarClock}
          label={t("candidate.assess.interviews.list.canStartLabel")}
          value={formatWhen(interview.availableFrom, t("candidate.assess.interviews.list.canStartFallback"))}
        />
        <Fact
          icon={Clock3}
          label={t("candidate.assess.interviews.list.deadlineLabel")}
          value={formatWhen(interview.availableUntil, t("candidate.assess.interviews.list.deadlineFallback"))}
        />
        <Fact
          icon={Clock3}
          label={t("candidate.assess.interviews.list.durationLabel")}
          value={t("candidate.assess.common.minutes", { count: interview.durationMinutes ?? 30 })}
        />
        <Fact
          icon={FileSearch}
          label={t("candidate.assess.interviews.list.questionCountLabel")}
          value={
            interview.maxQuestionCount != null && interview.maxQuestionCount > interview.questionCount
              ? t("candidate.assess.interviews.list.questionCountMax", {
                  max: interview.maxQuestionCount,
                  followUp: interview.maxQuestionCount - interview.questionCount,
                })
              : t("candidate.assess.interviews.list.questionCountFixed", { count: interview.questionCount || "—" })
          }
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--color-on-surface-variant)]">
        <span>{t("candidate.assess.interviews.list.invitedAt", { date: formatWhen(interview.createdAt, interview.createdAt) })}</span>
        {(interview.attemptNumber ?? 1) > 1 && (
          <span>{t("candidate.assess.interviews.list.attemptNumber", { num: interview.attemptNumber ?? 1 })}</span>
        )}
        {interview.overallScore != null && (
          <span className="font-semibold text-[var(--color-on-surface)]">
            {t("candidate.assess.interviews.list.scoreResult", {
              score: formatNumber(interview.overallScore, { maximumFractionDigits: 2 }, locale),
            })}
          </span>
        )}
      </div>
    </div>
    <div className="flex flex-col gap-3 border-t border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <span className="text-xs text-[var(--color-on-surface-variant)]">
        {t("candidate.assess.interviews.list.maxAttempts", { max: interview.maxAttempts ?? 1 })}
      </span>
      {preview ? (
        <Link to="/interviews/demo" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]">
          {t("candidate.assess.interviews.list.startInterview")}<ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      ) : notYetAvailable && !interview.completedAt ? (
        <span role="status" className="text-sm font-semibold text-[var(--color-on-surface-variant)]">
          {t("candidate.assess.interviews.list.notYetAvailable")}
        </span>
      ) : expired && !["SCORED", "PASSED", "FAILED"].includes(interview.status) ? (
        <span className="text-sm font-semibold text-[var(--color-error)]">
          {t("candidate.assess.interviews.list.expired")}
        </span>
      ) : (
        <Link to={`/interviews/${interview.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]">
          {action}<ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  </article>;
}

function Metric({ value, label }: { value: number; label: string }) {
  return <div className="min-w-20 rounded-2xl border border-[var(--color-primary)]/15 bg-white/80 px-3 py-3 text-center"><strong className="block text-xl text-[var(--color-primary)]">{value}</strong><span className="mt-0.5 block text-[10px] font-medium text-[var(--color-on-surface-variant)] sm:text-xs">{label}</span></div>;
}

function Fact({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return <div className="flex gap-2"><Icon className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" /><div><p className="text-xs text-[var(--color-on-surface-variant)]">{label}</p><p className="mt-0.5 font-medium">{value}</p></div></div>;
}

function actionLabel(status: AiInterviewStatus, submitted: boolean, t: TranslateFn) {
  if (status === "QUESTIONS_READY") return t("candidate.assess.interviews.list.actions.start");
  if (status === "IN_PROGRESS") return t("candidate.assess.interviews.list.actions.continue");
  if (status === "ERROR") {
    return submitted
      ? t("candidate.assess.interviews.list.actions.viewSubmitted")
      : t("candidate.assess.interviews.list.actions.recoverRoom");
  }
  if (["SCORED", "PASSED", "FAILED"].includes(status)) return t("candidate.assess.interviews.list.actions.viewResult");
  return t("candidate.assess.interviews.list.actions.start");
}
