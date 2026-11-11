import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Gauge,
  LockKeyhole,
  Network,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Timer,
  Trash2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { aiInterviewApi } from "@/api/tenant/aiInterviewApi";
import type { ScreeningRoundsView } from "@/api/types/applicant";
import {
  type AiAnswer,
  type AiFeedback,
  type AiInterview,
  type AiInterviewLog,
  type AiQuestion,
  type AiQuestionRequest,
} from "@/api/types/aiInterview";
import { Button } from "@/components/ux/Button";
import { Skeleton } from "@/components/ux/Skeleton";
import { AssessmentError, FieldError, assessmentInput } from "@/components/ux/assessmentUi";
import { formatNumber, t as globalT, useLocale, useT, type TranslateFn } from "@/i18n";
import { parseChoiceAnswer } from "@/lib/interview-choice-answer";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";
import { AVAILABLE_INTERVIEW_PROCESS } from "../utils/interviewProcessSettings";
import { AI_QUESTION_TYPES, formatDateTime, formatInterviewScore, getAiStatusLabel } from "./aiInterviewUi";
import { InterviewRecordingReview } from "./InterviewRecordingReview";

export type StageGroup = {
  title: string;
  kind: "OPEN" | "MCQ" | "MIXED";
  configuredCount: number;
  questions: AiQuestion[];
};

export function groupQuestionsByStage(interview: AiInterview, t: TranslateFn = globalT): StageGroup[] {
  const normalize = (value: string | null | undefined) => value?.trim().toLocaleLowerCase() ?? "";
  const assigned = new Set<number>();
  const groups: StageGroup[] = (interview.roadmap ?? []).map((step) => {
    const questions = interview.questions.filter((question) => normalize(question.stageTitle) === normalize(step.title));
    questions.forEach((question) => assigned.add(question.id));
    return { title: step.title, kind: step.kind, configuredCount: step.questionCount, questions };
  });

  const namedStages = new Map<string, AiQuestion[]>();
  interview.questions
    .filter((question) => !assigned.has(question.id) && question.stageTitle)
    .forEach((question) => {
      const title = question.stageTitle!.trim();
      namedStages.set(title, [...(namedStages.get(title) ?? []), question]);
      assigned.add(question.id);
    });
  namedStages.forEach((questions, title) =>
    groups.push({ title, kind: stageKind(questions), configuredCount: questions.length, questions }),
  );

  const unassigned = interview.questions.filter((question) => !assigned.has(question.id));
  if (unassigned.length > 0) {
    groups.push({
      title: t("recruiter.interviews.ai.detail.unassignedStageTitle"),
      kind: stageKind(unassigned),
      configuredCount: unassigned.length,
      questions: unassigned,
    });
  }
  return groups;
}

function stageKind(questions: AiQuestion[]): StageGroup["kind"] {
  const mcqCount = questions.filter((question) => question.options?.length).length;
  if (mcqCount === 0) return "OPEN";
  if (mcqCount === questions.length) return "MCQ";
  return "MIXED";
}

function roundState(
  passed: boolean | null | undefined,
  status: string | undefined,
): "done" | "failed" | "active" | "locked" {
  if (passed === true || status === "PASSED") return "done";
  if (passed === false || status === "FAILED" || status === "ERROR") return "failed";
  if (status && status !== "MISSING" && status !== "NOT_STARTED") return "active";
  return "locked";
}

export function PipelineStrip({
  passed,
  failed,
  rounds,
}: {
  passed: boolean;
  failed?: boolean;
  rounds?: ScreeningRoundsView | null;
}) {
  const t = useT();
  const cvState = rounds ? roundState(rounds.cv.passed, rounds.cv.status) : "done";
  const aiState: "done" | "failed" | "active" = passed ? "done" : failed ? "failed" : "active";
  const assessState = rounds
    ? roundState(rounds.assessment.passed, rounds.assessment.status)
    : passed
      ? "done"
      : "locked";
  const offerState = cvState === "done" && aiState === "done" && assessState === "done" ? "done" : "locked";

  const steps = [
    {
      id: "cv",
      label: t("recruiter.interviews.ai.detail.pipeline.cvLabel"),
      meta:
        cvState === "done"
          ? t("recruiter.interviews.ai.detail.pipeline.cvDone")
          : cvState === "failed"
            ? t("recruiter.interviews.ai.detail.pipeline.cvFailed")
            : t("recruiter.interviews.ai.detail.pipeline.cvActive"),
      icon: cvState === "failed" ? XCircle : CheckCircle2,
      state: cvState,
    },
    {
      id: "ai",
      label: t("recruiter.interviews.ai.detail.pipeline.aiLabel"),
      meta:
        aiState === "done"
          ? t("recruiter.interviews.ai.detail.pipeline.aiDone")
          : aiState === "failed"
            ? t("recruiter.interviews.ai.detail.pipeline.aiFailed")
            : t("recruiter.interviews.ai.detail.pipeline.aiActive"),
      icon: Bot,
      state: aiState,
    },
    {
      id: "assess",
      label: t("recruiter.interviews.ai.detail.pipeline.assessLabel"),
      meta:
        assessState === "done"
          ? t("recruiter.interviews.ai.detail.pipeline.assessDone")
          : assessState === "failed"
            ? t("recruiter.interviews.ai.detail.pipeline.assessFailed")
            : assessState === "active"
              ? t("recruiter.interviews.ai.detail.pipeline.assessActive")
              : t("recruiter.interviews.ai.detail.pipeline.assessLocked"),
      icon: assessState === "done" ? CheckCircle2 : assessState === "failed" ? XCircle : LockKeyhole,
      state: assessState,
    },
    {
      id: "offer",
      label: t("recruiter.interviews.ai.detail.pipeline.offerLabel"),
      meta:
        offerState === "done"
          ? t("recruiter.interviews.ai.detail.pipeline.offerDone")
          : t("recruiter.interviews.ai.detail.pipeline.offerLocked"),
      icon: offerState === "done" ? CheckCircle2 : LockKeyhole,
      state: offerState,
    },
  ] as const;

  return (
    <section
      aria-label={t("recruiter.interviews.ai.detail.pipeline.ariaLabel")}
      className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-2xs"
    >
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          <Network className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
          {t("recruiter.interviews.ai.detail.pipeline.title")}
        </h3>
        <p className="text-xs text-slate-400">{t("recruiter.interviews.ai.detail.pipeline.subtitle")}</p>
      </div>
      <ol className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCurrent = step.id === "ai";
          return (
            <li
              key={step.id}
              className={cn(
                "flex min-h-16 items-center gap-3 rounded-xl border p-3 transition-all",
                isCurrent
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)] shadow-2xs"
                  : "border-slate-200/70 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40",
              )}
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-xl text-xs font-bold",
                  step.state === "done"
                    ? "border border-emerald-200/60 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                    : step.state === "failed"
                      ? "border border-rose-200/60 bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
                      : isCurrent
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-slate-200 text-slate-400 dark:bg-slate-700",
                )}
              >
                {isCurrent && step.state === "active" ? index + 1 : <Icon className="size-4" aria-hidden="true" />}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-[10px] font-bold uppercase tracking-wider",
                    isCurrent
                      ? step.state === "failed"
                        ? "text-rose-600"
                        : step.state === "done"
                          ? "text-emerald-600"
                          : "text-[var(--color-primary-hover)]"
                      : "text-slate-400",
                  )}
                >
                  {step.meta}
                </span>
                <span className="mt-0.5 block truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {step.label}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function SessionMetricsSection({
  interview,
  progressLabel,
  progressHint,
}: {
  interview: AiInterview;
  progressLabel: string;
  progressHint: string;
}) {
  const t = useT();
  const locale = useLocale();
  return (
    <section className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-2xs sm:p-6">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)] text-[var(--color-primary)] shadow-2xs">
            <Gauge className="size-4.5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t("recruiter.interviews.ai.detail.metrics.title")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("recruiter.interviews.ai.detail.metrics.subtitle")}
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          {t("recruiter.interviews.ai.detail.metrics.snapshotBadge")}
        </span>
      </div>

      <dl className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
        <Metric
          icon={Network}
          label={
            interview.conversational
              ? t("recruiter.interviews.ai.detail.metrics.conversationProgress")
              : t("recruiter.interviews.ai.detail.metrics.processAndQuestions")
          }
          value={progressLabel}
          hint={progressHint}
        />
        <Metric
          icon={Timer}
          label={t("recruiter.interviews.ai.detail.metrics.durationLabel")}
          value={t("recruiter.interviews.ai.detail.metrics.durationValue", { minutes: interview.durationMinutes ?? "—" })}
          hint={t("recruiter.interviews.ai.detail.metrics.durationHint")}
        />
        <Metric
          icon={Gauge}
          label={t("recruiter.interviews.ai.detail.metrics.passingScoreLabel")}
          value={`${interview.passingScore ?? "—"}/100`}
          hint={t("recruiter.interviews.ai.detail.metrics.passingScoreHint")}
          emphasized
        />
        <Metric
          icon={RefreshCw}
          label={t("recruiter.interviews.ai.detail.metrics.maxAttemptsLabel")}
          value={t("recruiter.interviews.ai.detail.metrics.maxAttemptsValue", {
            count: interview.maxAttempts ?? interview.attemptNumber ?? 1,
          })}
          hint={t("recruiter.interviews.ai.detail.metrics.maxAttemptsHint", {
            attempt: interview.attemptNumber ?? 1,
          })}
        />
        <Metric
          icon={CalendarClock}
          label={t("recruiter.interviews.ai.detail.metrics.availabilityLabel")}
          value={`${formatDateTime(interview.availableFrom, locale)} → ${formatDateTime(interview.availableUntil, locale)}`}
          hint={t("recruiter.interviews.ai.detail.metrics.availabilityHint")}
        />
        <Metric
          icon={Bot}
          label={t("recruiter.interviews.ai.detail.metrics.statusLabel")}
          value={getAiStatusLabel(interview.status, t)}
          hint={t("recruiter.interviews.ai.detail.metrics.createdAtHint", {
            time: formatDateTime(interview.createdAt, locale),
          })}
        />
      </dl>
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  emphasized = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex min-h-26 flex-col justify-between rounded-xl border border-slate-200/70 bg-[var(--color-surface-alt)] p-3.5">
      <div>
        <dt className="flex items-center justify-between gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span>{label}</span>
          <Icon className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" />
        </dt>
        <dd
          className={cn(
            "mt-1.5 break-words text-sm font-extrabold leading-snug",
            emphasized ? "text-[var(--color-primary-hover)]" : "text-slate-900 dark:text-slate-100",
          )}
        >
          {value}
        </dd>
      </div>
      <p className="mt-2 truncate text-[10px] text-slate-400">{hint}</p>
    </div>
  );
}

export function SessionGovernanceSection({ interview }: { interview: AiInterview }) {
  const t = useT();
  const locale = useLocale();
  const rows = [
    [t("recruiter.interviews.ai.detail.governance.applicationLabel"), `#${interview.applicationId}`],
    [t("recruiter.interviews.ai.detail.governance.candidateLabel"), interview.candidateId ? `#${interview.candidateId}` : "—"],
    [
      t("recruiter.interviews.ai.detail.governance.aiScoreLabel"),
      interview.overallScore == null
        ? t("recruiter.interviews.ai.detail.governance.noScore")
        : `${formatInterviewScore(interview.overallScore, locale)}/100`,
    ],
    [t("recruiter.interviews.ai.detail.governance.startedAtLabel"), formatDateTime(interview.startedAt, locale)],
    [t("recruiter.interviews.ai.detail.governance.completedAtLabel"), formatDateTime(interview.completedAt, locale)],
    [t("recruiter.interviews.ai.detail.governance.expiresAtLabel"), formatDateTime(interview.expiresAt, locale)],
  ];

  return (
    <section className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-2xs">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <span className="grid size-9 place-items-center rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
          <ShieldCheck className="size-4.5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            {t("recruiter.interviews.ai.detail.governance.title")}
          </h3>
          <p className="text-[11px] text-slate-400">{t("recruiter.interviews.ai.detail.governance.subtitle")}</p>
        </div>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200/70 bg-[var(--color-surface-alt)] px-3.5 py-2.5 text-xs">
            <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
            <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function SessionLogsSection({
  logs,
  isPending,
  error,
  onRetry,
}: {
  logs: AiInterviewLog[] | undefined;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  return (
    <section className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-2xs">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <ChevronRight className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {t("recruiter.interviews.ai.detail.logs.title")}
        </h3>
      </div>

      <AssessmentError error={error} retry={onRetry} />

      {isPending && (
        <div className="mt-3 space-y-2" role="status" aria-busy="true">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <span className="sr-only">{t("recruiter.interviews.ai.detail.logs.loadingSr")}</span>
        </div>
      )}

      {!isPending && !error && (!logs || logs.length === 0) && (
        <p className="mt-3 text-xs text-slate-400">{t("recruiter.interviews.ai.detail.logs.empty")}</p>
      )}

      {logs && logs.length > 0 && (
        <ol className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {logs.map((log) => (
            <li key={log.id} className="py-2.5 text-xs first:pt-0 last:pb-0">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {log.event} · <span className="font-normal text-slate-400">{formatDateTime(log.createdAt, locale)}</span>
              </p>
              {log.detail && <p className="mt-0.5 break-words leading-relaxed text-slate-500 dark:text-slate-400">{log.detail}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function StageQuestionsSection({
  interview,
  stageGroups,
  editable,
  planned,
  busy,
  generatePending,
  onGenerate,
  onChanged,
}: {
  interview: AiInterview;
  stageGroups: StageGroup[];
  editable: boolean;
  planned: boolean;
  busy: boolean;
  generatePending: boolean;
  onGenerate: () => void;
  onChanged: () => void;
}) {
  const t = useT();
  const askConfirm = useUiStore((s) => s.askConfirm);

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t("recruiter.interviews.ai.detail.questionsSection.title", { count: interview.questions.length })}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {t("recruiter.interviews.ai.detail.questionsSection.subtitle")}
          </p>
        </div>
        {editable && !interview.conversational && (interview.questions.length === 0 || interview.processBased) && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!interview.questions.length) {
                onGenerate();
                return;
              }
              askConfirm({
                title: t("recruiter.interviews.ai.detail.questionsSection.regenerateTitle"),
                description: t("recruiter.interviews.ai.detail.questionsSection.regenerateDesc"),
                confirmLabel: t("recruiter.interviews.ai.detail.questionsSection.regenerateConfirm"),
                onConfirm: async () => {
                  onGenerate();
                },
              });
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-semibold text-slate-700 transition-all hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary-subtle)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <Sparkles className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" />
            <span>
              {generatePending
                ? t("recruiter.interviews.ai.detail.questionsSection.generatingBtn")
                : interview.questions.length
                  ? t("recruiter.interviews.ai.detail.questionsSection.regenerateBtn")
                  : t("recruiter.interviews.ai.detail.questionsSection.generateBtn")}
            </span>
          </button>
        )}
      </div>

      {!interview.questions.length && !stageGroups.length && interview.status !== "GENERATING" && (
        <p className="p-4 text-xs text-slate-400">{t("recruiter.interviews.ai.detail.questionsSection.empty")}</p>
      )}

      <ol className="space-y-4" aria-label={t("recruiter.interviews.ai.detail.questionsSection.listAria")}>
        {stageGroups.map((stage, stageIndex) => (
          <StageQuestionGroup
            key={`${stage.title}-${stageIndex}`}
            stage={stage}
            stageIndex={stageIndex}
            interviewId={interview.id}
            allQuestions={interview.questions}
            completed={!!interview.completedAt}
            editable={editable && !busy}
            onChanged={onChanged}
          />
        ))}
      </ol>

      {editable && !busy && !planned && (
        <AddQuestionForm
          interviewId={interview.id}
          nextOrder={Math.max(-1, ...interview.questions.map((q) => q.questionOrder)) + 1}
          onAdded={onChanged}
        />
      )}
    </section>
  );
}

function StageQuestionGroup({
  stage,
  stageIndex,
  interviewId,
  allQuestions,
  editable,
  completed,
  onChanged,
}: {
  stage: StageGroup;
  stageIndex: number;
  interviewId: number;
  allQuestions: AiQuestion[];
  completed: boolean;
  editable: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const kindLabel =
    stage.kind === "MCQ"
      ? t("recruiter.interviews.ai.detail.questionsSection.kindMcq")
      : stage.kind === "OPEN"
        ? t("recruiter.interviews.ai.detail.questionsSection.kindOpen")
        : t("recruiter.interviews.ai.detail.questionsSection.kindMixed");
  const complete = stage.questions.length >= stage.configuredCount && stage.configuredCount > 0;
  const stageNum = String(stageIndex + 1).padStart(2, "0");

  return (
    <li className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs transition-all dark:border-slate-800 dark:bg-slate-900">
      <header className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary-hover)]">
            {stageNum}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary-hover)]">
                {t("recruiter.interviews.ai.detail.questionsSection.stageLabel", { num: stageNum })}
              </span>
              <span className="rounded-md bg-slate-200/60 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {kindLabel}
              </span>
            </div>
            <h4 className="mt-1 text-sm font-bold leading-tight text-slate-900 dark:text-slate-100">{stage.title}</h4>
            <p className="mt-0.5 text-xs text-slate-400">
              {t("recruiter.interviews.ai.detail.questionsSection.stageHint")}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
            complete ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
          )}
        >
          <span className="size-1.5 rounded-full bg-current" />
          {t("recruiter.interviews.ai.detail.questionsSection.generatedProgress", {
            created: stage.questions.length,
            total: stage.configuredCount,
          })}
        </span>
      </header>
      <div className="space-y-3 p-4">
        {stage.questions.length > 0 ? (
          <ol className="space-y-3">
            {stage.questions.map((question) => (
              <QuestionItem
                key={question.id}
                index={allQuestions.findIndex((item) => item.id === question.id)}
                interviewId={interviewId}
                question={question}
                completed={completed}
                editable={editable}
                onChanged={onChanged}
              />
            ))}
          </ol>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 px-4 py-8 text-center dark:border-slate-800 dark:bg-slate-900/40">
            <Sparkles className="mx-auto size-5 text-[var(--color-primary)]" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("recruiter.interviews.ai.detail.questionsSection.noQuestionsYet")}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {t("recruiter.interviews.ai.detail.questionsSection.expectedQuestions", {
                count: stage.configuredCount,
                kind: kindLabel,
              })}
            </p>
          </div>
        )}
      </div>
    </li>
  );
}

function createQuestionSchema(t: TranslateFn) {
  return z.object({
    questionText: z
      .string()
      .trim()
      .min(1, t("recruiter.interviews.ai.detail.questionsSection.textRequired"))
      .max(20000, t("recruiter.interviews.ai.detail.questionsSection.max20000")),
    questionType: z.string().trim().min(1).max(32),
    questionOrder: z.coerce.number().int().min(0, t("recruiter.interviews.ai.detail.questionsSection.orderMinZero")),
  });
}
type QuestionValues = z.infer<ReturnType<typeof createQuestionSchema>>;

function QuestionFields({
  defaults,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
  lockStructure = false,
}: {
  defaults: QuestionValues;
  pending: boolean;
  submitLabel: string;
  onSubmit: (values: AiQuestionRequest) => Promise<unknown>;
  onCancel?: () => void;
  lockStructure?: boolean;
}) {
  const t = useT();
  const questionSchema = useMemo(() => createQuestionSchema(t), [t]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuestionValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: defaults,
  });

  return (
    <form
      className="space-y-3"
      onSubmit={handleSubmit(async (values) => {
        try {
          await onSubmit(values);
          if (!onCancel) reset({ ...defaults, questionOrder: values.questionOrder + 1 });
        } catch {
          /* Mutation error is shown without clearing draft */
        }
      })}
    >
      <label className="block space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
        <span>{t("recruiter.interviews.ai.detail.questionsSection.questionTextLabel")}</span>
        <textarea className={cn(assessmentInput, "min-h-24")} {...register("questionText")} disabled={pending} />
        <FieldError message={errors.questionText?.message} />
      </label>
      {!lockStructure && (
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>{t("recruiter.interviews.ai.detail.questionsSection.questionTypeLabel")}</span>
            <select className={assessmentInput} {...register("questionType")} disabled={pending}>
              {AI_QUESTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`recruiter.interviews.questionTypes.${type}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>{t("recruiter.interviews.ai.detail.questionsSection.orderLabel")}</span>
            <input type="number" min={0} className={assessmentInput} {...register("questionOrder")} disabled={pending} />
            <FieldError message={errors.questionOrder?.message} />
          </label>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex h-8 items-center rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            {t("recruiter.interviews.ai.detail.questionsSection.cancel")}
          </button>
        )}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[var(--color-primary-hover)] cursor-pointer"
        >
          {pending ? t("recruiter.interviews.ai.detail.questionsSection.saving") : submitLabel}
        </button>
      </div>
    </form>
  );
}

function AddQuestionForm({
  interviewId,
  nextOrder,
  onAdded,
}: {
  interviewId: number;
  nextOrder: number;
  onAdded: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const add = useMutation({
    mutationFn: (body: AiQuestionRequest) => aiInterviewApi.addQuestion(interviewId, body),
    onSuccess: () => {
      toast.success(t("recruiter.interviews.ai.detail.questionsSection.addSuccess"));
      onAdded();
    },
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
      >
        <Plus className="size-3.5" aria-hidden="true" />
        {t("recruiter.interviews.ai.detail.questionsSection.addBtn")}
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/40 p-4 dark:border-slate-700 dark:bg-slate-800/40">
      <AssessmentError error={add.error} />
      <QuestionFields
        key={nextOrder}
        defaults={{ questionText: "", questionType: "TECHNICAL", questionOrder: nextOrder }}
        pending={add.isPending}
        submitLabel={t("recruiter.interviews.ai.detail.questionsSection.submitAdd")}
        onSubmit={(body) => add.mutateAsync(body)}
      />
      <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
        {t("recruiter.interviews.ai.detail.questionsSection.close")}
      </Button>
    </div>
  );
}

function QuestionItem({
  index,
  interviewId,
  question,
  editable,
  completed,
  onChanged,
}: {
  completed: boolean;
  index: number;
  interviewId: number;
  question: AiQuestion;
  editable: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const askConfirm = useUiStore((s) => s.askConfirm);
  const [editing, setEditing] = useState(false);
  const update = useMutation({
    mutationFn: (body: AiQuestionRequest) => aiInterviewApi.updateQuestion(interviewId, question.id, body),
    onSuccess: () => {
      setEditing(false);
      onChanged();
    },
  });
  const answer = question.answer;
  const planned = !!question.stageTitle;
  const mcq = !!question.options?.length;
  const tags = [
    ...(question.competencies ?? [])
      .filter((key) => key === AVAILABLE_INTERVIEW_PROCESS)
      .map((key) => t(`recruiter.interviews.competencies.${key}`)),
    ...(question.skills ?? []),
  ];
  const questionTypeLabel = (AI_QUESTION_TYPES as readonly string[]).includes(question.questionType)
    ? t(`recruiter.interviews.questionTypes.${question.questionType}`)
    : question.questionType;

  return (
    <li className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-2xs dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      {editing && editable ? (
        <>
          <AssessmentError error={update.error} />
          <QuestionFields
            defaults={{ questionText: question.questionText, questionType: question.questionType, questionOrder: question.questionOrder }}
            pending={update.isPending}
            submitLabel={t("recruiter.interviews.ai.detail.questionsSection.saveBtn")}
            onSubmit={(body) => update.mutateAsync(body)}
            onCancel={() => setEditing(false)}
            lockStructure={planned}
          />
        </>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="inline-flex flex-wrap items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-primary-hover)]">
              <span className="grid size-6 place-items-center rounded-lg border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary-hover)]">
                {index + 1}
              </span>
              <span>
                {planned
                  ? question.stageTitle
                  : t("recruiter.interviews.ai.detail.questionsSection.orderMeta", {
                      type: questionTypeLabel,
                      order: question.questionOrder,
                    })}
              </span>
              {mcq && <span>{t("recruiter.interviews.ai.detail.questionsSection.mcqTag")}</span>}
            </p>
            <p className="mt-2.5 whitespace-pre-wrap break-words text-xs font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
              {question.questionText}
            </p>
            {tags.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1" aria-label={t("recruiter.interviews.ai.detail.questionsSection.tagsAria")}>
                {tags.map((tag) => (
                  <li key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {tag}
                  </li>
                ))}
              </ul>
            )}
            {mcq && (
              <ol className="mt-2.5 space-y-1.5 text-xs">
                {question.options!.map((option, i) => (
                  <li
                    key={i}
                    className={cn(
                      "rounded-lg border p-2",
                      question.correctOption === i || question.correctOptions?.includes(i)
                        ? "border-emerald-300 bg-emerald-50/70 font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                        : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                    )}
                  >
                    {String.fromCharCode(65 + i)}. {option}
                    {(question.correctOption === i || question.correctOptions?.includes(i)) &&
                      t("recruiter.interviews.ai.detail.questionsSection.correctOptionTag")}
                    {parseChoiceAnswer(answer?.answerText).selectedOptions.includes(i) &&
                      t("recruiter.interviews.ai.detail.questionsSection.candidateSelectedTag")}
                  </li>
                ))}
              </ol>
            )}
            {mcq && parseChoiceAnswer(answer?.answerText).explanation && (
              <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <strong>{t("recruiter.interviews.ai.detail.questionsSection.candidateExplanation")}</strong>{" "}
                {parseChoiceAnswer(answer?.answerText).explanation}
              </p>
            )}
            {mcq && question.explanation && (
              <p className="mt-1 text-[11px] text-slate-400">
                <strong>{t("recruiter.interviews.ai.detail.questionsSection.explanationLabel")}</strong>{" "}
                {question.explanation}
              </p>
            )}
          </div>
          {editable && !(planned && mcq) && (
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                className="grid size-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label={t("recruiter.interviews.ai.detail.questionsSection.editAria")}
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-3.5" aria-hidden="true" />
              </button>
              {!planned && (
                <button
                  type="button"
                  className="grid size-8 place-items-center rounded-lg text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/50"
                  aria-label={t("recruiter.interviews.ai.detail.questionsSection.deleteAria")}
                  onClick={() =>
                    askConfirm({
                      title: t("recruiter.interviews.ai.detail.questionsSection.deleteTitle"),
                      description: t("recruiter.interviews.ai.detail.questionsSection.deleteDesc"),
                      confirmLabel: t("recruiter.interviews.ai.detail.questionsSection.deleteConfirm"),
                      danger: true,
                      onConfirm: async () => {
                        await aiInterviewApi.deleteQuestion(interviewId, question.id);
                        onChanged();
                      },
                    })
                  }
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {answer ? (
        <div className="space-y-3 rounded-xl border border-slate-200/70 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
          <div>
            <p className="text-[11px] font-semibold text-slate-400">
              {t("recruiter.interviews.ai.detail.questionsSection.answerMeta", { time: formatDateTime(answer.answeredAt, locale) })}
              {answer.answerDuration != null
                ? t("recruiter.interviews.ai.detail.questionsSection.answerDurationSuffix", { seconds: answer.answerDuration })
                : ""}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-xs font-medium leading-relaxed text-slate-800 dark:text-slate-200">
              {!answer.answerText
                ? t("recruiter.interviews.ai.detail.questionsSection.blankAnswer")
                : mcq
                  ? t("recruiter.interviews.ai.detail.questionsSection.selectedChoice", {
                      option: String.fromCharCode(65 + Number(answer.answerText)),
                    })
                  : answer.answerText}
            </p>
          </div>
          <FeedbackView feedback={answer.feedback} answer={answer} />
          {completed && <InterviewRecordingReview interviewId={interviewId} answerId={answer.id} />}
        </div>
      ) : (
        <p className="text-xs italic text-slate-400">{t("recruiter.interviews.ai.detail.questionsSection.unanswered")}</p>
      )}
    </li>
  );
}

function FeedbackView({ feedback, answer }: { feedback: AiFeedback | null; answer: AiAnswer }) {
  const t = useT();
  const locale = useLocale();
  let metrics: { durationMs?: number; voicedMs?: number; silenceMs?: number; pauseCount?: number; responseLatencyMs?: number | null } | undefined;
  let wordsPerMinute: number | undefined;
  try {
    const evaluation = JSON.parse(feedback?.evaluationJson ?? "{}");
    metrics = evaluation.speechMetrics;
    wordsPerMinute = evaluation.wordsPerMinute;
  } catch {
    /* ignore */
  }
  if (answer.speechMetrics) {
    metrics = answer.speechMetrics;
    wordsPerMinute =
      metrics.voicedMs && answer.answerText?.trim()
        ? (answer.answerText.trim().split(/\s+/).length * 60000) / metrics.voicedMs
        : undefined;
  }

  return (
    <div className="space-y-2 text-xs">
      {feedback ? (
        <div className="space-y-1.5 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)]/70 p-3">
          <p className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
            <span>{t("recruiter.interviews.ai.detail.questionsSection.aiFeedbackTitle")}</span>
            <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary-hover)]">
              {feedback.score ?? "—"}/100
            </span>
          </p>
          <p className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300">{feedback.feedbackText}</p>
          {feedback.strengths && (
            <p className="text-emerald-700 dark:text-emerald-400">
              <strong>{t("recruiter.interviews.ai.detail.questionsSection.strengthsLabel")}</strong> {feedback.strengths}
            </p>
          )}
          {feedback.weaknesses && (
            <p className="text-amber-700 dark:text-amber-400">
              <strong>{t("recruiter.interviews.ai.detail.questionsSection.weaknessesLabel")}</strong> {feedback.weaknesses}
            </p>
          )}
        </div>
      ) : (
        <p className="italic text-slate-400">{t("recruiter.interviews.ai.detail.questionsSection.noFeedback")}</p>
      )}
      {metrics && (
        <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-3 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <p className="font-bold text-slate-800 dark:text-slate-200">
            {t("recruiter.interviews.ai.detail.questionsSection.speechTitle")}
          </p>
          <p>
            {t("recruiter.interviews.ai.detail.questionsSection.speechDuration", {
              duration: ((metrics.durationMs ?? 0) / 1000).toFixed(1),
              voiced: ((metrics.voicedMs ?? 0) / 1000).toFixed(1),
              threshold: formatNumber(0.6, { maximumFractionDigits: 1 }, locale),
              pauses: metrics.pauseCount ?? 0,
            })}
          </p>
          <p>
            {t("recruiter.interviews.ai.detail.questionsSection.speechSilence", {
              silence: ((metrics.silenceMs ?? 0) / 1000).toFixed(1),
              ratio: metrics.durationMs
                ? `${Math.round(((metrics.voicedMs ?? 0) * 100) / metrics.durationMs)}%`
                : t("recruiter.interviews.ai.detail.questionsSection.insufficientData"),
            })}
          </p>
          <p>
            {t("recruiter.interviews.ai.detail.questionsSection.speechLatency", {
              latency:
                metrics.responseLatencyMs == null
                  ? t("recruiter.interviews.ai.detail.questionsSection.insufficientData")
                  : `${(metrics.responseLatencyMs / 1000).toFixed(1)}s`,
            })}
            {wordsPerMinute != null &&
              t("recruiter.interviews.ai.detail.questionsSection.speechSpeedSuffix", {
                wpm: Math.round(wordsPerMinute),
              })}
          </p>
          <p className="pt-1 text-[10px] text-slate-400">
            {t("recruiter.interviews.ai.detail.questionsSection.speechDisclaimer")}
          </p>
        </div>
      )}
    </div>
  );
}
