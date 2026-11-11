import { AlertTriangle, CheckCircle2, CircleDashed, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CvStatus } from "@/api/types/cv";

type Tone = "done" | "work" | "idle" | "fail";

const STATUS: Record<CvStatus, { label: string; tone: Tone }> = {
  UPLOADED: { label: "Chờ phân tích", tone: "idle" },
  PARSING: { label: "Đang đọc file", tone: "work" },
  PARSED: { label: "Đã đọc file", tone: "work" },
  EXTRACTING: { label: "Đang trích xuất", tone: "work" },
  ANALYZING: { label: "Đang phân tích", tone: "work" },
  ANALYZED: { label: "Đã phân tích", tone: "done" },
  FAILED: { label: "Lỗi xử lý", tone: "fail" },
};

const TONE_CLASS: Record<Tone, string> = {
  done: "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]",
  work: "bg-[var(--color-surface-container-high)] text-[var(--color-primary)]",
  idle: "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]",
  fail: "bg-[var(--color-error-container)] text-[var(--color-on-error-container)]",
};

export function cvInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase() || "?";
}

export function formatCvDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function CvStatusBadge({ status }: { status: CvStatus }) {
  const meta = STATUS[status] ?? { label: status, tone: "idle" as Tone };
  const Icon = meta.tone === "done"
    ? CheckCircle2
    : meta.tone === "fail"
      ? AlertTriangle
      : meta.tone === "work"
        ? LoaderCircle
        : CircleDashed;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", TONE_CLASS[meta.tone])}>
      <Icon className={cn("size-3.5", meta.tone === "work" && "animate-spin motion-reduce:animate-none")} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

