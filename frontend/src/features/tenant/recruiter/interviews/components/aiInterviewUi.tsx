import { AlertTriangle, CheckCircle2, CircleDashed, ListChecks, RefreshCw } from "lucide-react";
import type { AiInterviewStatus } from "@/api/types/aiInterview";
import { cn } from "@/lib/utils";

export const AI_INTERVIEW_STATUSES: AiInterviewStatus[] = [
  "CREATED",
  "QUESTIONS_READY",
  "IN_PROGRESS",
  "SCORING",
  "SCORED",
  "FAILED",
];

export const aiStatusLabel: Record<AiInterviewStatus, string> = {
  CREATED: "Mới tạo",
  QUESTIONS_READY: "Đã có câu hỏi",
  IN_PROGRESS: "Đang diễn ra",
  SCORING: "Đang chấm điểm",
  SCORED: "Đã chấm xong",
  FAILED: "Lỗi",
};

export const AI_QUESTION_TYPES = ["TECHNICAL", "BEHAVIORAL", "SITUATIONAL", "GENERAL"] as const;

/** Values shown for fields the backend does not store yet. */
export const AI_INTERVIEW_MOCK = {
  mode: "Speech-to-Text",
  rubric: "Rubric mặc định",
} as const;

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

export function MockTag({ title = "Chưa có dữ liệu từ API — đang hiển thị giá trị mẫu" }: { title?: string }) {
  return (
    <span
      title={title}
      className="ml-1 inline-flex items-center rounded border border-dashed border-[var(--color-outline-variant)] px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]"
    >
      mock
    </span>
  );
}

export function AiStatusBadge({ status }: { status: AiInterviewStatus }) {
  const tone: Record<AiInterviewStatus, string> = {
    CREATED: "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]",
    QUESTIONS_READY: "bg-[var(--color-surface-container-high)] text-[var(--color-primary)]",
    IN_PROGRESS: "bg-[#c9e6ff] text-[#001e2f]",
    SCORING: "bg-[var(--color-surface-container-high)] text-[var(--color-primary)]",
    SCORED: "bg-[var(--color-surface-container-low)] text-[var(--color-primary)]",
    FAILED: "bg-[#ffdad6] text-[#93000a]",
  };
  const Icon =
    status === "SCORING" ? RefreshCw
      : status === "SCORED" ? CheckCircle2
        : status === "FAILED" ? AlertTriangle
          : status === "QUESTIONS_READY" ? ListChecks
            : CircleDashed;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm", tone[status])}>
      <Icon className={cn("size-3.5", status === "SCORING" && "animate-spin")} aria-hidden="true" />
      {aiStatusLabel[status]}
    </span>
  );
}
