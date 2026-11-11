import { AlertTriangle, CheckCircle2, CircleDashed, LoaderCircle } from "lucide-react";
import { formatDateTime, useI18nStore, useT, type Locale } from "@/i18n";
import { cn } from "@/lib/utils";
import type { CvStatus } from "@/api/types/cv";

type Tone = "done" | "work" | "idle" | "fail";

const STATUS_TONE: Record<CvStatus, Tone> = {
  UPLOADED: "idle",
  PARSING: "work",
  PARSED: "work",
  EXTRACTING: "work",
  ANALYZING: "work",
  ANALYZED: "done",
  FAILED: "fail",
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

export function formatCvDate(
  value: string | null | undefined,
  locale: Locale = useI18nStore.getState().locale,
) {
  if (!value) return "—";
  return formatDateTime(
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

export function CvStatusBadge({ status }: { status: CvStatus }) {
  const t = useT();
  const tone = STATUS_TONE[status] ?? "idle";
  const key = `recruiter.screening.cvStatus.${status}`;
  const translated = t(key);
  const label = translated === key ? status : translated;
  const Icon = tone === "done"
    ? CheckCircle2
    : tone === "fail"
      ? AlertTriangle
      : tone === "work"
        ? LoaderCircle
        : CircleDashed;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", TONE_CLASS[tone])}>
      <Icon className={cn("size-3.5", tone === "work" && "animate-spin motion-reduce:animate-none")} aria-hidden="true" />
      {label}
    </span>
  );
}

