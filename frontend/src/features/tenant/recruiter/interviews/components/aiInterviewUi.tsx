import { AlertTriangle, CheckCircle2, CircleDashed, ListChecks, RefreshCw } from "lucide-react";
import type { AiInterviewStatus } from "@/api/types/aiInterview";
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

export const aiStatusLabel: Record<AiInterviewStatus, string> = {
  CREATED: "Đang chuẩn bị",
  GENERATING: "Đang sinh câu hỏi",
  PASSED: "Đạt",
  ERROR: "Lỗi xử lý",
  QUESTIONS_READY: "Đã có câu hỏi",
  IN_PROGRESS: "Đang diễn ra",
  SCORING: "Đang chấm điểm",
  SCORED: "Đã chấm xong",
  FAILED: "Không đạt",
};

export const AI_QUESTION_TYPES = ["TECHNICAL", "BEHAVIORAL", "SITUATIONAL", "GENERAL"] as const;

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export const aiStatusTone: Record<AiInterviewStatus, string> = {
  CREATED: "bg-[var(--color-interview-created-bg)] text-[var(--color-interview-created)]",
  GENERATING: "bg-[var(--color-interview-generating-bg)] text-[var(--color-interview-generating)]",
  QUESTIONS_READY: "bg-[var(--color-interview-ready-bg)] text-[var(--color-interview-ready)]",
  IN_PROGRESS: "bg-[var(--color-interview-live-bg)] text-[var(--color-interview-live)]",
  SCORING: "bg-[var(--color-interview-scoring-bg)] text-[var(--color-interview-scoring)]",
  SCORED: "bg-[var(--color-interview-scored-bg)] text-[var(--color-interview-scored)]",
  PASSED: "bg-[var(--color-interview-passed-bg)] text-[var(--color-interview-passed)]",
  FAILED: "bg-[var(--color-interview-failed-bg)] text-[var(--color-interview-failed)]",
  ERROR: "bg-[var(--color-interview-error-bg)] text-[var(--color-interview-error)]",
};

export function AiStatusBadge({ status }: { status: AiInterviewStatus }) {
  const Icon =
    (status === "SCORING" || status === "GENERATING") ? RefreshCw
      : (status === "SCORED" || status === "PASSED") ? CheckCircle2
        : (status === "FAILED" || status === "ERROR") ? AlertTriangle
          : status === "QUESTIONS_READY" ? ListChecks
            : CircleDashed;
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold shadow-sm", aiStatusTone[status])}>
      <Icon className={cn("size-3.5", status === "SCORING" && "animate-spin")} aria-hidden="true" />
      {aiStatusLabel[status]}
    </span>
  );
}
