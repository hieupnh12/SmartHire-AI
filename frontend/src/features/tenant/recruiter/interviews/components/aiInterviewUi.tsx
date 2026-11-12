import { RefreshCw } from "lucide-react";
import type { AiInterviewStatus } from "@/api/types/aiInterview";
import {
  formatDateTime as i18nFormatDateTime,
  formatNumber,
  t as globalT,
  useI18nStore,
  useT,
  type Locale,
  type TranslateFn,
} from "@/i18n";
import { cn } from "@/lib/utils";

export const AI_INTERVIEW_STATUSES: AiInterviewStatus[] = [
  "CREATED",
  "GENERATING",
  "PASSED",
  "ERROR",
  "QUESTIONS_READY",
  "IN_PROGRESS",
  "SCORING",
  "SCORED",
  "FAILED",
];

export function getAiStatusLabel(status: AiInterviewStatus, translate: TranslateFn = globalT): string {
  const key = `recruiter.interviews.status.${status}`;
  const label = translate(key);
  return label === key ? status : label;
}

export const AI_QUESTION_TYPES = ["TECHNICAL", "BEHAVIORAL", "SITUATIONAL", "GENERAL"] as const;

export function formatDateTime(
  value: string | null | undefined,
  locale: Locale = useI18nStore.getState().locale,
) {
  if (!value) return "—";
  return i18nFormatDateTime(
    value,
    {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
    locale,
  );
}

export function formatInterviewScore(
  value: number | null | undefined,
  locale: Locale = useI18nStore.getState().locale,
) {
  if (value == null) return "—";
  return formatNumber(Number(value), { maximumFractionDigits: 1 }, locale);
}

export const aiStatusTone: Record<AiInterviewStatus, string> = {
  CREATED: "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  GENERATING: "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)] border border-[var(--color-primary)]/25",
  QUESTIONS_READY: "bg-amber-50 text-amber-700 border border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
  IN_PROGRESS: "bg-sky-50 text-sky-700 border border-sky-200/70 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40",
  SCORING: "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)] border border-[var(--color-primary)]/25",
  SCORED: "bg-emerald-50 text-emerald-700 border border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
  PASSED: "bg-emerald-50 text-emerald-700 border border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
  FAILED: "bg-rose-50 text-rose-700 border border-rose-200/70 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40",
  ERROR: "bg-red-50 text-red-700 border border-red-200/70 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40",
};

export const aiStatusDot: Record<AiInterviewStatus, string> = {
  CREATED: "bg-slate-400",
  GENERATING: "bg-[var(--color-primary)] animate-pulse",
  QUESTIONS_READY: "bg-amber-500",
  IN_PROGRESS: "bg-sky-500 animate-pulse",
  SCORING: "bg-[var(--color-primary)] animate-spin",
  SCORED: "bg-emerald-500",
  PASSED: "bg-emerald-500",
  FAILED: "bg-rose-500",
  ERROR: "bg-red-500",
};

export function AiStatusBadge({ status }: { status: AiInterviewStatus }) {
  const t = useT();
  const isSpinning = status === "SCORING" || status === "GENERATING";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-2xs transition-colors",
        aiStatusTone[status],
      )}
    >
      {isSpinning ? (
        <RefreshCw className="size-3 animate-spin" aria-hidden="true" />
      ) : (
        <span className={cn("size-1.5 rounded-full shrink-0", aiStatusDot[status])} />
      )}
      <span>{getAiStatusLabel(status, t)}</span>
    </span>
  );
}
