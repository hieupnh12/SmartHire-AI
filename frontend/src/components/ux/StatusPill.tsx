const tones: Record<string, string> = {
  DRAFT: "bg-[var(--color-surface-alt)] text-[var(--color-on-surface-variant)]",
  PUBLISHED: "bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]",
  ARCHIVED: "bg-[var(--color-surface-alt)] text-[var(--color-on-surface-variant)]",
  ASSIGNED: "bg-[var(--color-surface-alt)] text-[var(--color-on-surface)]",
  IN_PROGRESS: "bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]",
  SUBMITTED: "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]",
  GRADED: "bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]",
  PENDING: "bg-[var(--color-surface-alt)] text-[var(--color-on-surface-variant)]",
  CONFIRMED: "bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]",
  CANCELLED: "bg-[var(--color-surface-alt)] text-[var(--color-on-surface-variant)]",
  DONE: "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]",
  NOT_STARTED: "bg-[var(--color-surface-alt)] text-[var(--color-on-surface-variant)]",
  READY: "bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]",
  COMPLETED: "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]",
  NEW: "bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]",
  IN_REVIEW: "bg-amber-50 text-amber-700",
  ASSESSMENT: "bg-violet-50 text-violet-700",
  INTERVIEW: "bg-cyan-50 text-cyan-700",
  OFFER: "bg-emerald-50 text-emerald-700",
  HIRED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-50 text-red-700",
  WITHDRAWN: "bg-[var(--color-surface-alt)] text-[var(--color-on-surface-variant)]",
  PASSED: "bg-emerald-50 text-emerald-700",
  FAILED: "bg-red-50 text-red-700",
};

export function StatusPill({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[status] ?? tones.PENDING}`}
    >
      {label}
    </span>
  );
}
