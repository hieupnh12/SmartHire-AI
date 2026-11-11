import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Bot, CheckCircle2, ClipboardCheck, Info, LogOut, MessageSquareText, RefreshCw, RotateCcw, ServerCrash, ShieldCheck, Sparkles, Timer, Wifi, AlertTriangle, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { formatDateTime, useLocale, useT, type TranslateFn } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { useUiStore } from "@/stores/uiStore";
import type { AiAnswer, AiQuestion } from "@/api/types/aiInterview";
import { candidateInterviewApi, type CandidateInterview } from "../api/candidateInterviewApi";
import { useCandidateInterviewScope } from "../hooks/useCandidateInterviews";
import { formatRemaining, useCountdown } from "../hooks/useCountdown";
import { getAiInterviewStatusLabel } from "../constants/interviewStatus";
import { getInterviewRules } from "../constants/interviewRules";
import { ConversationRoom } from "./ConversationRoom";
import { InterviewQuestionPanel } from "./InterviewQuestionPanel";
import { InterviewRoadmap } from "./InterviewRoadmap";
import { InterviewProcessNavigator } from "./InterviewProcessNavigator";
import { parseChoiceAnswer } from "@/lib/interview-choice-answer";
import { MonitoringRequired, ProctoredInterviewGuard, ProctoringStart, type ProctorSession } from "./ProctoredInterviewSession";
import { stopProctorSession } from "../utils/proctorDevices";

const card = "rounded-2xl border border-[var(--color-border-default)] bg-surface-card p-5 shadow-[var(--shadow-card)]";
const answered = (q: AiQuestion) => !!q.answer?.answerText?.trim();

export function AiInterviewRoom({ id }: { id: number }) {
  const t = useT();
  const scope = useCandidateInterviewScope();
  const client = useQueryClient();
  const navigate = useNavigate();
  const askConfirm = useUiStore(s => s.askConfirm);
  const key = [...scope, id];
  const session = useQuery({
    queryKey: key,
    queryFn: () => candidateInterviewApi.get(id),
    enabled: !!scope[2],
    refetchInterval: query => {
      const d = query.state.data;
      if (!d) return false;
      if (d.conversational && !d.startedAt && !d.completedAt) return 2000;
      if (d.status === "SCORING") return 3000;
      return 15000;
    },
  });
  const [conversationBusy, setConversationBusy] = useState(false);
  const [conversationDirty, setConversationDirty] = useState(false);
  const onConversationActivity = useCallback((pending: boolean, draft: boolean) => { setConversationBusy(pending); setConversationDirty(draft); }, []);
  const [selected, setSelected] = useState<number | null>(null);
  const [openedAt, setOpenedAt] = useState(() => Date.now());
  const [dirtyQuestions, setDirtyQuestions] = useState<Record<number, boolean>>({});
  const [proctorSession, setProctorSession] = useState<ProctorSession | null>(null);
  const autoRecoveryAttempted = useRef(false);
  useEffect(() => () => {
    if (!proctorSession) return;
    stopProctorSession(proctorSession);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  }, [proctorSession]);
  const onDirty = useCallback((questionId: number, dirty: boolean) => setDirtyQuestions(previous => previous[questionId] === dirty ? previous : { ...previous, [questionId]: dirty }), []);
  function updated(value: CandidateInterview) {
    client.setQueryData(key, value);
    void client.invalidateQueries({ queryKey: scope });
  }
  function saved(questionId: number, answer: AiAnswer) {
    // Saving can advance to the next question and unmount its form before the clean-state effect runs.
    onDirty(questionId, false);
    setOpenedAt(Date.now());
    client.setQueryData<CandidateInterview>(key, previous => previous && ({ ...previous, questions: previous.questions.map(q => q.id === questionId ? { ...q, answer } : q) }));
    setSelected(null);
    void client.invalidateQueries({ queryKey: key });
  }
  const start = useMutation({ mutationFn: async () => { if (session.data?.voiceEnabled) await candidateInterviewApi.consent(id); return candidateInterviewApi.start(id); }, onSuccess: updated });
  const complete = useMutation({ mutationFn: () => candidateInterviewApi.complete(id), onSuccess: updated });
  const retry = useMutation({
    mutationFn: (applicationId: number) => candidateInterviewApi.requestStart(applicationId),
    onSuccess: next => {
      client.setQueryData([...scope, next.id], next);
      void client.invalidateQueries({ queryKey: scope });
      navigate(`/interviews/${next.id}`);
    },
  });
  const data = session.data;
  useEffect(() => { if (data?.completedAt) setProctorSession(null); }, [data?.completedAt]);
  useEffect(() => {
    if (!proctorSession || data?.startedAt) return;
    const tracks = proctorSession.camera.getTracks();
    const lost = () => setProctorSession(null);
    const fullscreen = () => { if (!document.fullscreenElement) lost(); };
    if (tracks.some(track => track.readyState !== "live")) { lost(); return; }
    tracks.forEach(track => track.addEventListener("ended", lost));
    document.addEventListener("fullscreenchange", fullscreen);
    return () => { tracks.forEach(track => track.removeEventListener("ended", lost)); document.removeEventListener("fullscreenchange", fullscreen); };
  }, [proctorSession, data?.startedAt]);
  const inProgress = data?.status === "IN_PROGRESS";
  const remaining = useCountdown(inProgress ? data.expiresAt : null);
  const timeUp = remaining === 0;
  // The backend submits saved answers once the deadline passes; reload to show the submitted state.
  const refetchSession = session.refetch;
  useEffect(() => { if (timeUp) void refetchSession(); }, [timeUp, refetchSession]);
  const busy = start.isPending || complete.isPending || retry.isPending;
  const error = start.error ?? complete.error ?? retry.error;
  const questions = data?.questions ?? [];
  const done = questions.filter(answered).length;
  const unaskedMain = data?.processBased ? Math.max(0, data.questionCount - questions.filter(question => question.questionRole !== "FOLLOW_UP").length) : 0;
  const unanswered = questions.length - done + unaskedMain;
  const dirty = Object.values(dirtyQuestions).some(Boolean);
  const planned = !!data?.expiresAt || !!data?.roadmap || questions.some(q => q.stageTitle);
  const firstOpen = questions.findIndex(q => !answered(q));
  const index = Math.min(selected ?? (firstOpen >= 0 ? firstOpen : 0), Math.max(0, questions.length - 1));
  const canSubmit = !busy && !dirty && !timeUp && (data?.conversational ? !conversationBusy && !conversationDirty : questions.length > 0 && (planned || done === questions.length));
  const currentId = inProgress ? questions[index]?.id : undefined;
  useEffect(() => { setOpenedAt(Date.now()); }, [currentId]);
  useEffect(() => {
    if (data?.status !== "ERROR" || data.completedAt || proctorSession || autoRecoveryAttempted.current) return;
    autoRecoveryAttempted.current = true;
    retry.mutate(data.applicationId);
  }, [data?.applicationId, data?.completedAt, data?.status, proctorSession, retry.mutate]);
  const answerDuration = () => (questions[index]?.answer?.answerDuration ?? 0) + Math.round((Date.now() - openedAt) / 1000);

  function submit() {
    askConfirm({
      title: t("candidate.assess.interviews.room.submitTitle"),
      description: data?.conversational
        ? t("candidate.assess.interviews.room.submitDescConversational")
        : unanswered > 0
          ? t("candidate.assess.interviews.room.submitDescRemaining", { unanswered })
          : t("candidate.assess.interviews.room.submitDescAllAnswered"),
      confirmLabel: t("candidate.assess.interviews.room.submitConfirm"),
      danger: !data?.conversational && unanswered > 0,
      onConfirm: async () => { await complete.mutateAsync(); },
    });
  }

  if (session.isPending) return <RoomLoading />;
  if (session.isError && !session.data) return <RoomLoadError message={getApiErrorMessage(session.error)} onRetry={() => void session.refetch()} />;
  if (!data) return <RoomLoadError message={t("candidate.assess.interviews.room.noRoomData")} onRetry={() => void refetchSession()} />;
  if (data.conversational && proctorSession && !data.startedAt && !data.completedAt) {
    const openingError = start.error
      ? getApiErrorMessage(start.error)
      : data.status === "ERROR"
        ? t("candidate.assess.interviews.room.openingErrorFallback")
        : null;
    return <main className="grid min-h-[100dvh] place-items-center bg-[var(--color-surface-container-low)] p-4">
      <section className={`${card} w-full max-w-xl space-y-4 text-center`} aria-busy={!openingError}>
        <Bot className={`mx-auto size-12 text-[var(--color-primary)] ${openingError ? "" : "animate-pulse motion-reduce:animate-none"}`} aria-hidden="true" />
        <h1 className="text-xl font-semibold">{t("candidate.assess.interviews.room.waitingTitle")}</h1>
        <p role="status">{t("candidate.assess.interviews.room.waitingStatus")}</p>
        <p className="text-sm text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.room.waitingDesc")}</p>
        {openingError && <><p role="alert" className="text-sm text-[var(--color-error)]">{openingError}</p>
          <Button disabled={start.isPending} onClick={() => start.mutate()}>{t("candidate.assess.interviews.room.retryCreateChat")}</Button></>}
        <Button variant="secondary" disabled={start.isPending} onClick={() => { setProctorSession(null); start.reset(); if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined); }}>{t("candidate.assess.interviews.room.backToDeviceCheck")}</Button>
      </section>
    </main>;
  }
  if (data.status === "ERROR" && !data.completedAt) {
    return <RoomRecovery
      data={data}
      error={retry.error ? getApiErrorMessage(retry.error) : null}
      retrying={retry.isPending}
      onRetry={() => retry.mutate(data.applicationId)}
    />;
  }
  if (inProgress && !proctorSession) {
    return <MonitoringRequired busy={busy} onReady={setProctorSession} preparing={!!data.conversational && !data.startedAt} />;
  }

  const content = <section className="mx-auto max-w-[1600px] space-y-4 pb-10 text-[var(--color-on-surface)]">
    <>
      {/* Header with enhanced Visual Hierarchy */}
      <header className={`${card} ${inProgress ? "sticky top-2 z-20" : ""} flex flex-col gap-4 bg-white/95 backdrop-blur-xl xl:flex-row xl:items-center xl:justify-between`}>
        <div className="flex flex-wrap items-start sm:items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md">
            <ClipboardCheck className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-on-surface)]">
                {data.jobTitle ?? t("candidate.assess.interviews.room.defaultTitle")}
              </h1>
              <span className="rounded-lg bg-[var(--color-surface-container-high)] px-2.5 py-1 font-mono text-xs font-semibold text-[var(--color-on-surface-variant)] border border-[var(--color-border-subtle)]">
                #AI-{data.id}
              </span>
            </div>

            {/* Separated badges & status row (Clear Visual Hierarchy) */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Attempt count badge */}
              {data.attemptNumber && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                  <RotateCcw className="size-3 text-blue-500" aria-hidden="true" />
                  {t("candidate.assess.interviews.room.attemptBadge", {
                    current: data.attemptNumber,
                    max: data.maxAttempts ?? data.attemptNumber,
                  })}
                </span>
              )}

              {/* System status tag */}
              {data.status === "ERROR" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200/80">
                  <AlertTriangle className="size-3.5 text-amber-600" aria-hidden="true" />
                  {t("candidate.assess.interviews.room.statusErrorBadge")}
                </span>
              ) : data.status === "PASSED" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden="true" />
                  {t("candidate.assess.interviews.room.statusPassedBadge")}
                </span>
              ) : data.status === "FAILED" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800 border border-rose-300">
                  <AlertCircle className="size-3.5 text-rose-600" aria-hidden="true" />
                  {t("candidate.assess.interviews.room.statusFailedBadge")}
                </span>
              ) : data.status === "SCORING" || !!data.completedAt ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
                  <Sparkles className="size-3.5 text-indigo-500" aria-hidden="true" />
                  {t("candidate.assess.interviews.room.statusScoringBadge")}
                </span>
              ) : inProgress ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600"></span>
                  </span>
                  {t("candidate.assess.interviews.room.statusInProgressBadge")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 border border-slate-200">
                  {getAiInterviewStatusLabel(data.status, t) || t("candidate.assess.interviews.room.statusReadyFallback")}
                </span>
              )}

              <span className="text-xs text-[var(--color-on-surface-variant)] hidden sm:inline">
                {t("candidate.assess.interviews.room.onlineSubtitle")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          {!inProgress && (
            <Link to="/interviews" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--color-border-default)] px-3 text-sm font-semibold hover:bg-[var(--color-surface-container-low)] transition-colors">
              <ArrowLeft className="size-4" aria-hidden="true" />
              {t("candidate.assess.interviews.room.backToList")}
            </Link>
          )}

          <span className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold ${inProgress ? "bg-emerald-50 text-emerald-700" : data.status === "ERROR" ? "bg-[var(--color-error-container)] text-[var(--color-on-error-container)]" : "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]"}`}>
            <Wifi className="size-4" aria-hidden="true" />
            {inProgress
              ? t("candidate.assess.interviews.room.stateActive")
              : data.status === "ERROR"
                ? (data.completedAt ? t("candidate.assess.interviews.room.stateErrorSubmitted") : t("candidate.assess.interviews.room.stateErrorRecover"))
                : data.completedAt
                  ? t("candidate.assess.interviews.room.stateSubmitted")
                  : t("candidate.assess.interviews.room.stateNotStarted")}
          </span>

          {inProgress && remaining != null ? (
            <div role="timer" aria-label={t("candidate.assess.interviews.room.timerAria", { time: formatRemaining(remaining) })}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 ${remaining <= 300 ? "bg-[var(--color-error-container)] text-[var(--color-on-error-container)]" : "bg-[var(--color-surface-container)]"}`}>
              <Timer className="size-5 text-brand-primary" aria-hidden="true" />
              <div className="text-right">
                <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.room.timeRemainingLabel")}</span>
                <span className="font-mono text-base font-semibold tabular-nums">
                  {timeUp ? t("candidate.assess.interviews.room.timeUpSubmitting") : formatRemaining(remaining)}
                  {data.durationMinutes && !timeUp ? <span className="text-sm font-normal text-[var(--color-on-surface-variant)]"> / {formatRemaining(data.durationMinutes * 60)}</span> : null}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-[var(--color-surface-container)] px-3.5 py-2" aria-label={t("candidate.assess.common.minutes", { count: data.durationMinutes ?? 30 })}>
              <Timer className="size-5 text-brand-primary" aria-hidden="true" />
              <div className="text-right">
                <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.room.durationLabel")}</span>
                <span className="font-mono text-base font-semibold tabular-nums">{formatRemaining((data.durationMinutes ?? 30) * 60)}</span>
              </div>
            </div>
          )}

          {inProgress && (
            <Button className="bg-[color:var(--color-error-container)] text-[color:var(--color-on-error-container)] shadow-none hover:bg-[color:var(--color-error-container)] hover:opacity-90" disabled={!canSubmit} onClick={submit}>
              <LogOut className="size-4" aria-hidden="true" />
              {complete.isPending ? t("candidate.assess.interviews.room.submitting") : t("candidate.assess.interviews.room.endButton")}
            </Button>
          )}
        </div>
      </header>

      {error && <p role="alert">{getApiErrorMessage(error)}</p>}

      {inProgress && !data.conversational && (
        <InterviewProcessNavigator steps={data.roadmap} questions={questions} current={index} onSelect={!dirty && !timeUp ? setSelected : undefined} />
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          {/* RESULT CARD: Rendered FIRST after submission so candidates don't have to scroll past chat (Issue 1) */}
          {data.completedAt && (
            <ResultCard data={data} busy={busy} retrying={retry.isPending} onRetry={() => retry.mutate(data.applicationId)} />
          )}

          {data.conversational && inProgress && (
            <ConversationRoom
              id={id}
              active={!!inProgress}
              disabled={busy || timeUp}
              voiceEnabled={!!data.voiceEnabled}
              recordingEnabled={!!data.recordingEnabled}
              reportJson={data.reportJson}
              status={data.status}
              onActivity={onConversationActivity}
              onComplete={() => {
                if (!complete.isPending && inProgress) {
                  complete.mutate();
                }
              }}
            />
          )}

          {inProgress && !data.conversational && questions.length > 0 && <>
            <InterviewQuestionPanel recordingEnabled={data.recordingEnabled} interviewId={id} questions={questions} index={index} disabled={busy || timeUp} dirty={dirty}
              onSelect={setSelected} onSaved={saved} onDirty={onDirty} answerDuration={answerDuration} />
            <div className={`${card} flex flex-wrap items-center justify-between gap-3`}>
              <p className="text-sm">
                {t("candidate.assess.interviews.room.progressSummary", { done, total: questions.length })}
                {unanswered > 0 && planned ? t("candidate.assess.interviews.room.progressRemainingNote", { unanswered }) : ""}
                {!planned && unanswered > 0 ? t("candidate.assess.interviews.room.progressAllRequiredNote") : ""}
              </p>
              <Button disabled={!canSubmit} onClick={submit}>
                {complete.isPending ? t("candidate.assess.interviews.room.submitting") : t("candidate.assess.interviews.room.submitInterviewButton")}
              </Button>
            </div>
          </>}

          {!inProgress && !data.completedAt && (
            <InvitationCard
              data={data}
              busy={busy}
              onReady={async (proctor) => {
                if (data.conversational) {
                  setProctorSession(proctor);
                  start.mutate();
                  return;
                }
                try {
                  await start.mutateAsync();
                  setProctorSession(proctor);
                } catch (cause) {
                  throw new Error(t("candidate.assess.interviews.room.startFailedError", { message: getApiErrorMessage(cause) }));
                }
              }}
            />
          )}

          {data.completedAt && questions.map((question, i) => (
            <article key={question.id} className={`${card} space-y-3`}>
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                {t("candidate.assess.interviews.room.questionNumber", { num: i + 1 })}{question.stageTitle ? ` · ${question.stageTitle}` : ""}
              </p>
              <h3 className="font-semibold">{question.questionText}</h3>
              <p className="whitespace-pre-wrap rounded-lg bg-[var(--color-surface-container-low)] p-3 text-sm">{submittedAnswer(question, t)}</p>
              {question.correctOptions?.length ? (
                <p className="text-sm">
                  {t("candidate.assess.interviews.room.correctAnswerLabel", {
                    answers: question.correctOptions.map(option => String.fromCharCode(65 + option)).join(", "),
                  })}
                </p>
              ) : question.correctOption != null && (
                <p className="text-sm">
                  {t("candidate.assess.interviews.room.correctAnswerLabel", {
                    answers: String.fromCharCode(65 + question.correctOption),
                  })}
                </p>
              )}
              {question.explanation && (
                <p className="whitespace-pre-wrap text-sm">
                  {t("candidate.assess.interviews.room.explanationLabel", { text: question.explanation })}
                </p>
              )}
            </article>
          ))}
        </div>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-32 lg:col-span-4">
          {inProgress && !data.conversational && <InterviewerCard question={questions[index]} done={done} total={questions.length} />}
          {!data.conversational && <InterviewRoadmap steps={data.roadmap} questions={questions} current={inProgress ? index : null} openedAt={openedAt}
            durationMinutes={data.durationMinutes} onSelect={inProgress && !dirty && !timeUp ? setSelected : undefined} />}
          <section className={`${card} space-y-2`} aria-labelledby="interview-rules">
            <h2 id="interview-rules" className="flex items-center gap-2 font-semibold">
              <Info className="size-5 text-brand-primary" aria-hidden="true" />{t("candidate.assess.interviews.room.rulesHeading")}
            </h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--color-on-surface-variant)]">
              {getInterviewRules(t).map(rule => <li key={rule}>{rule}</li>)}
            </ul>
          </section>
        </aside>
      </div>
    </>
  </section>;
  return inProgress && proctorSession
    ? <ProctoredInterviewGuard interviewId={id} session={proctorSession} onAutoSubmit={() => complete.mutate()}>{content}</ProctoredInterviewGuard>
    : content;
}

function RoomLoading() {
  const t = useT();
  return <main className="grid min-h-[100dvh] place-items-center bg-[var(--color-surface-container-low)] p-4" aria-busy="true">
    <section className="w-full max-w-3xl rounded-3xl border border-[var(--color-border-default)] bg-white p-6 shadow-[var(--shadow-ambient)] sm:p-8">
      <div className="flex items-center gap-4">
        <span className="grid size-12 place-items-center rounded-xl bg-[var(--color-primary-soft)]"><RefreshCw className="size-6 animate-spin text-[var(--color-primary)]" aria-hidden="true" /></span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">{t("candidate.assess.interviews.room.loadingEyebrow")}</p>
          <h1 className="mt-1 text-xl font-semibold">{t("candidate.assess.interviews.room.loadingTitle")}</h1>
        </div>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-3" aria-hidden="true">{[0, 1, 2].map(item => <div key={item} className="h-20 animate-pulse rounded-xl bg-[var(--color-surface-container)]" />)}</div>
      <div className="mt-4 h-56 animate-pulse rounded-2xl bg-[var(--color-surface-container-low)]" aria-hidden="true" />
    </section>
  </main>;
}

function RoomLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useT();
  return <main className="grid min-h-[100dvh] place-items-center bg-[var(--color-surface-container-low)] p-4">
    <section className="w-full max-w-xl rounded-3xl border border-[var(--color-border-default)] bg-white p-7 text-center shadow-[var(--shadow-ambient)]" role="alert">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[var(--color-error-container)] text-[var(--color-on-error-container)]"><ServerCrash className="size-8" aria-hidden="true" /></span>
      <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-[var(--color-error)]">{t("candidate.assess.interviews.room.loadErrorEyebrow")}</p>
      <h1 className="mt-2 text-2xl font-semibold">{t("candidate.assess.interviews.room.loadErrorTitle")}</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.room.loadErrorDesc", { message })}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={onRetry}><RefreshCw className="size-4" aria-hidden="true" />{t("candidate.assess.interviews.room.reloadRoom")}</Button>
        <Link to="/interviews" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border-default)] px-4 text-sm font-semibold hover:bg-[var(--color-surface-container-low)]"><ArrowLeft className="size-4" aria-hidden="true" />{t("candidate.assess.interviews.room.backToList")}</Link>
      </div>
    </section>
  </main>;
}

function RoomRecovery({ data, error, retrying, onRetry }: { data: CandidateInterview; error: string | null; retrying: boolean; onRetry: () => void }) {
  const t = useT();
  return <main className="min-h-[100dvh] bg-[var(--color-surface-container-low)] p-4 sm:p-6">
    <section className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-ambient)]">
      <header className="flex flex-col gap-4 border-b border-[var(--color-border-default)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex items-center gap-4">
          <span className="grid size-12 place-items-center rounded-xl bg-[var(--color-primary)] text-white"><ClipboardCheck className="size-6" aria-hidden="true" /></span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">{t("candidate.assess.interviews.room.recoveryEyebrow", { id: data.id })}</p>
            <h1 className="mt-1 text-xl font-semibold">{data.jobTitle ?? t("candidate.assess.interviews.room.defaultTitle")}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-[var(--color-surface-container)] px-4 py-3">
          <Timer className="size-5 text-[var(--color-primary)]" aria-hidden="true" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.room.recoveryDuration")}</p>
            <p className="font-mono text-lg font-semibold">{formatRemaining((data.durationMinutes ?? 30) * 60)}</p>
          </div>
        </div>
      </header>
      <div className="grid gap-8 p-6 lg:grid-cols-[1fr_18rem] lg:p-10">
        <div className="flex min-h-80 flex-col justify-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-[var(--color-error-container)] text-[var(--color-on-error-container)]"><ServerCrash className="size-7" aria-hidden="true" /></span>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-[var(--color-error)]">{t("candidate.assess.interviews.room.recoveryBadge")}</p>
          <h2 className="mt-2 text-2xl font-semibold">{t("candidate.assess.interviews.room.recoveryTitle")}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">
            {t("candidate.assess.interviews.room.recoveryDesc", {
              message: data.errorMessage ?? t("candidate.assess.interviews.room.recoveryDefaultError"),
            })}
          </p>
          {error && <p className="mt-4 rounded-xl bg-[var(--color-error-container)] p-3 text-sm text-[var(--color-on-error-container)]" role="alert">{error}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" disabled={retrying} onClick={onRetry}>
              <RefreshCw className={`size-4 ${retrying ? "animate-spin" : ""}`} aria-hidden="true" />
              {retrying ? t("candidate.assess.interviews.room.recovering") : t("candidate.assess.interviews.room.reloadQuestions")}
            </Button>
            <Link to="/interviews" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border-default)] px-4 text-sm font-semibold hover:bg-[var(--color-surface-container-low)]">
              <ArrowLeft className="size-4" aria-hidden="true" />{t("candidate.assess.interviews.room.exitRoom")}
            </Link>
          </div>
        </div>
        <aside className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-5">
          <h2 className="font-semibold">{t("candidate.assess.interviews.room.sessionStatusHeading")}</h2>
          <ul className="mt-4 space-y-4 text-sm">
            <li className="flex gap-3"><CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-hidden="true" /><span><strong className="block">{t("candidate.assess.interviews.room.sessionStatusAttemptTitle")}</strong><span className="text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.room.sessionStatusAttemptDesc")}</span></span></li>
            <li className="flex gap-3"><Timer className="size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" /><span><strong className="block">{t("candidate.assess.interviews.room.sessionStatusTimerTitle")}</strong><span className="text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.room.sessionStatusTimerDesc")}</span></span></li>
            <li className="flex gap-3"><ShieldCheck className="size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" /><span><strong className="block">{t("candidate.assess.interviews.room.sessionStatusProctorTitle")}</strong><span className="text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.room.sessionStatusProctorDesc")}</span></span></li>
          </ul>
        </aside>
      </div>
    </section>
  </main>;
}

function InterviewerCard({ question, done, total }: { question?: AiQuestion; done: number; total: number }) {
  const t = useT();
  const focusAreas = [...(question?.competencies ?? []), ...(question?.skills ?? [])].slice(0, 4);
  return <section className={`${card} overflow-hidden p-0`} aria-labelledby="ai-interviewer-title">
    <div className="bg-gradient-to-br from-[var(--color-primary-soft)] via-white to-white p-5 text-center">
      <div className="relative mx-auto mb-3 grid size-20 place-items-center rounded-full border-2 border-[var(--color-primary)] bg-white shadow-sm">
        <Bot className="size-9 text-[var(--color-primary)]" aria-hidden="true" />
        <span className="absolute bottom-0 right-0 size-4 rounded-full border-2 border-white bg-emerald-500" aria-hidden="true" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">{t("candidate.assess.interviews.room.interviewerInProgress")}</p>
      <h2 id="ai-interviewer-title" className="mt-1 text-lg font-semibold">{t("candidate.assess.interviews.room.interviewerName")}</h2>
      <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.room.interviewerSubtitle")}</p>
      <div className="mt-4 rounded-xl border border-[var(--color-border-default)] bg-white/80 p-3 text-left">
        <div className="flex items-center justify-between text-xs"><span className="font-medium">{t("candidate.assess.interviews.room.answerProgress")}</span><strong>{done}/{total}</strong></div>
        <progress className="mt-2 h-1.5 w-full accent-[var(--color-primary)]" max={Math.max(total, 1)} value={done} aria-label={t("candidate.assess.interviews.room.answerProgressAria", { done, total })} />
      </div>
    </div>
    <div className="space-y-3 border-t border-[var(--color-border-default)] p-5">
      <div className="flex items-start gap-3"><MessageSquareText className="mt-0.5 size-5 shrink-0 text-brand-primary" aria-hidden="true" /><div><p className="text-sm font-semibold">{t("candidate.assess.interviews.room.textFormatTitle")}</p><p className="text-xs text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.room.textFormatDesc")}</p></div></div>
      <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-primary" aria-hidden="true" /><div><p className="text-sm font-semibold">{t("candidate.assess.interviews.room.preservedTitle")}</p><p className="text-xs text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.room.preservedDesc")}</p></div></div>
      {focusAreas.length > 0 && <div className="border-t border-[var(--color-border-default)] pt-3"><p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]"><Sparkles className="size-4" aria-hidden="true" />{t("candidate.assess.interviews.room.currentFocusLabel")}</p><div className="flex flex-wrap gap-2">{focusAreas.map(area => <span key={area} className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-medium text-brand-primary">{area}</span>)}</div></div>}
    </div>
  </section>;
}

function InvitationCard({ data, busy, onReady }: {
  data: CandidateInterview;
  busy: boolean;
  onReady: (session: ProctorSession) => void | Promise<void>;
}) {
  const t = useT();
  const [accepted, setAccepted] = useState(false);
  const count = (kind: "OPEN" | "MCQ") => data.roadmap?.filter(s => s.kind === kind).reduce((sum, s) => sum + s.questionCount, 0) ?? 0;
  const target = data.jobTitle ?? t("candidate.assess.interviews.list.applicationFallback", { id: data.applicationId });
  const facts = [
    data.conversational
      ? [t("candidate.assess.interviews.room.factTopics"), t("candidate.assess.interviews.room.factTopicsValue", { count: data.questionCount })]
      : data.roadmap
        ? [t("candidate.assess.interviews.room.factOpenQuestions"), t("candidate.assess.interviews.room.factQuestionsCount", { count: count("OPEN") })]
        : [t("candidate.assess.interviews.room.factQuestions"), t("candidate.assess.interviews.room.factQuestionsCount", { count: data.questionCount })],
    ...(data.roadmap && count("MCQ") > 0
      ? [[t("candidate.assess.interviews.room.factMiniAssessment"), t("candidate.assess.interviews.room.factMiniAssessmentCount", { count: count("MCQ") })]]
      : []),
    ...(data.durationMinutes
      ? [[t("candidate.assess.interviews.room.factTotalDuration"), t("candidate.assess.common.minutes", { count: data.durationMinutes })]]
      : []),
    [t("candidate.assess.interviews.room.factPassingScore"), t("candidate.assess.interviews.room.factPassingScoreValue", { score: data.passingScore ?? "—" })],
  ];
  return <section className={`${card} space-y-5`} aria-labelledby="invitation-title">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">{t("candidate.assess.interviews.room.invitationEyebrow")}</p>
      <h2 id="invitation-title" className="mt-1 text-xl font-semibold">{t("candidate.assess.interviews.room.invitationTitle", { target })}</h2>
      <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
        {data.conversational
          ? t("candidate.assess.interviews.room.invitationDescConversational")
          : t("candidate.assess.interviews.room.invitationDescStandard")}
      </p>
    </div>
    <dl className="grid gap-3 sm:grid-cols-2">{facts.map(([label, value]) => <div key={label} className="rounded-lg bg-[var(--color-surface-container-low)] p-3">
      <dt className="text-xs text-[var(--color-on-surface-variant)]">{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl>
    {data.status === "GENERATING" && <p role="status">{t("candidate.assess.interviews.room.statusGenerating")}</p>}
    {data.status === "CREATED" && <p role="status">{t("candidate.assess.interviews.room.statusCreated")}</p>}
    {data.status === "QUESTIONS_READY" && <div className="space-y-3">
      <p className="text-sm">
        {data.conversational
          ? t("candidate.assess.interviews.room.readyDescConversational")
          : t("candidate.assess.interviews.room.readyDescStandard")}
      </p>
      {data.voiceEnabled && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} />
          {data.recordingEnabled
            ? t("candidate.assess.interviews.room.voiceConsentWithRecording")
            : t("candidate.assess.interviews.room.voiceConsentOnly")}
        </label>
      )}
      <ProctoringStart busy={busy || !!data.voiceEnabled && !accepted} onReady={onReady} />
    </div>}
  </section>;
}

function ResultCard({ data, busy, retrying, onRetry }: { data: CandidateInterview; busy: boolean; retrying: boolean; onRetry: () => void }) {
  const t = useT();
  const locale = useLocale();
  const finished = ["SCORED", "PASSED", "FAILED"].includes(data.status);
  const failedScoring = data.status === "ERROR";
  const isPassed = data.status === "PASSED";
  const isFailed = data.status === "FAILED";
  const isScoring = data.status === "SCORING" || (!finished && !failedScoring);

  return (
    <section
      className={`${card} space-y-5 border ${
        failedScoring
          ? "border-amber-200/70 bg-[#fffdfa]"
          : isPassed
          ? "border-emerald-200/70 bg-[#fafffd]"
          : isFailed
          ? "border-rose-200/70 bg-[#fffbfb]"
          : "border-blue-200/70 bg-[#fbfdff]"
      }`}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`flex size-8 items-center justify-center rounded-lg ${
                failedScoring
                  ? "bg-amber-100 text-amber-700"
                  : isPassed
                  ? "bg-emerald-100 text-emerald-700"
                  : isFailed
                  ? "bg-rose-100 text-rose-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {failedScoring ? (
                <AlertTriangle className="size-4" aria-hidden="true" />
              ) : isPassed ? (
                <CheckCircle2 className="size-4" aria-hidden="true" />
              ) : isFailed ? (
                <AlertCircle className="size-4" aria-hidden="true" />
              ) : (
                <Clock className="size-4" aria-hidden="true" />
              )}
            </span>
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
              {finished
                ? t("candidate.assess.interviews.room.resultTitleFinished")
                : failedScoring
                  ? t("candidate.assess.interviews.room.resultTitleFailedScoring")
                  : t("candidate.assess.interviews.room.resultTitleSubmitted")}
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {t("candidate.assess.interviews.room.submittedAtLabel")}{" "}
            <strong>{formatDateTime(data.completedAt!, undefined, locale)}</strong>
          </p>
        </div>

        <div>
          {failedScoring && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200/70">
              <AlertTriangle className="size-3 text-amber-600" />
              {t("candidate.assess.interviews.room.badgeFailedScoring")}
            </span>
          )}
          {isScoring && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200 animate-pulse">
              <RefreshCw className="size-3 text-blue-600 animate-spin" />
              {t("candidate.assess.interviews.room.badgeScoring")}
            </span>
          )}
          {isPassed && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="size-3 text-emerald-600" />
              {t("candidate.assess.interviews.room.badgePassed")}
            </span>
          )}
          {isFailed && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 border border-rose-200">
              <AlertCircle className="size-3 text-rose-600" />
              {t("candidate.assess.interviews.room.badgeFailed")}
            </span>
          )}
        </div>
      </div>

      {failedScoring && (
        <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-4 text-sm text-slate-700 leading-relaxed shadow-xs">
          <p className="font-semibold flex items-center gap-2 text-amber-900 mb-1.5 text-sm">
            <ShieldCheck className="size-4 text-amber-600" />
            {t("candidate.assess.interviews.room.failedScoringBoxTitle")}
          </p>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {t("candidate.assess.interviews.room.failedScoringBoxDescPrefix")}{" "}
            <strong className="text-slate-800 font-semibold">{t("candidate.assess.interviews.room.failedScoringBoxDescHighlight")}</strong>
          </p>
        </div>
      )}

      {isScoring && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-sm text-blue-950 leading-relaxed">
          <p className="text-xs sm:text-sm text-blue-900/90">
            {t("candidate.assess.interviews.room.scoringBoxDesc")}
          </p>
        </div>
      )}

      {data.overallScore != null && (
        <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.room.overallScoreLabel")}</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-[var(--color-primary)]">{data.overallScore}</span>
                <span className="text-sm font-semibold text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.room.pointsDenominator")}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-[var(--color-on-surface-variant)] block">{t("candidate.assess.interviews.room.passingThresholdLabel")}</span>
              <span className="text-base font-bold text-[var(--color-on-surface)]">{data.passingScore ?? 70}/100</span>
            </div>
          </div>
        </div>
      )}

      {data.status === "PASSED" && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-sm text-emerald-800 font-medium">
            {t("candidate.assess.interviews.room.passedCongrats")}
          </p>
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 transition-colors"
            to="/assessments"
          >
            <span>{t("candidate.assess.interviews.room.goToAssessments")}</span>
            <ArrowLeft className="size-4 rotate-180" aria-hidden="true" />
          </Link>
        </div>
      )}

      {data.status === "FAILED" && (
        <div className="pt-2">
          {data.canRetry ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-on-surface-variant)]">
                {t("candidate.assess.interviews.room.failedCanRetry")}
              </p>
              <Button disabled={busy} onClick={onRetry} className="gap-2">
                <RotateCcw className={`size-4 ${retrying ? "animate-spin" : ""}`} aria-hidden="true" />
                {retrying ? t("candidate.assess.interviews.room.creatingRetry") : t("candidate.assess.interviews.room.retryInterview")}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              {t("candidate.assess.interviews.room.failedNoRetry")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function submittedAnswer(question: AiQuestion, t: TranslateFn) {
  const text = question.answer?.answerText?.trim();
  if (!text) return t("candidate.assess.interviews.room.unansweredZeroPoints");
  if (question.options?.length) {
    const answer = parseChoiceAnswer(text);
    return answer.selectedOptions.map(i => `${String.fromCharCode(65 + i)}. ${question.options![i]}`).join("\n")
      + (answer.explanation ? `\n${t("candidate.assess.interviews.room.submittedExplanation", { text: answer.explanation })}` : "");
  }
  return text;
}
