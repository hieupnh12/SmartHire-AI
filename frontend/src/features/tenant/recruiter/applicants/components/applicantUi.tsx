import { formatDateTime, t as globalT, useI18nStore, useT, type Locale, type TranslateFn } from "@/i18n";
import { cn } from "@/lib/utils";

export const STATUS_TABS = [
  "",
  "NEW",
  "IN_REVIEW",
  "ASSESSMENT",
  "INTERVIEW",
  "HUMAN_INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
] as const;

export const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-sky-50 text-sky-700",
  IN_REVIEW: "bg-amber-50 text-amber-700",
  ASSESSMENT: "bg-violet-50 text-violet-700",
  INTERVIEW: "bg-[var(--color-primary-soft)] text-brand-primary",
  HUMAN_INTERVIEW: "bg-[var(--color-primary-soft)] text-brand-primary",
  OFFER: "bg-indigo-50 text-indigo-700",
  HIRED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
  FAILED: "bg-rose-50 text-rose-800",
  WITHDRAWN: "bg-slate-100 text-slate-500",
};

export const SOURCES = ["CAREER", "PORTAL", "REFERRAL", "MANUAL"] as const;

export const SOURCE_LABEL: Record<string, string> = {
  CAREER: "Trang tuyển dụng",
  PORTAL: "Cổng ứng viên",
  REFERRAL: "Giới thiệu",
  MANUAL: "Thêm thủ công",
};

export const ACTION_TOAST = {
  reject: "Đã từ chối ứng viên",
  archive: "Đã lưu trữ hồ sơ",
  restore: "Đã khôi phục hồ sơ",
} as const;

export function getActionToast(action: keyof typeof ACTION_TOAST, translate: TranslateFn = globalT) {
  const key = `recruiter.ops.applicants.actionToasts.${action}`;
  const label = translate(key);
  return label === key ? ACTION_TOAST[action] : label;
}

export function getApplicantStatusLabel(status: string, translate: TranslateFn = globalT) {
  const key = `recruiter.ops.applicationStatuses.${status}`;
  const label = translate(key);
  return label === key ? status : label;
}

export function sourceLabel(source: string | null | undefined, translate: TranslateFn = globalT) {
  if (!source) return "—";
  const key = `recruiter.ops.sources.${source}`;
  const label = translate(key);
  return label === key ? (SOURCE_LABEL[source] ?? source) : label;
}

export function splitApplicantTags(value: string | null | undefined) {
  return (value ?? "").split(",").map((tag) => tag.trim()).filter(Boolean);
}

export function formatApplicantDateTime(
  value: string,
  locale: Locale = useI18nStore.getState().locale,
) {
  return formatDateTime(value, { dateStyle: "short", timeStyle: "short" }, locale);
}

export function ApplicantStatusPill({ status }: { status: string }) {
  const t = useT();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
        STATUS_STYLE[status] ?? "bg-slate-100 text-slate-600",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {getApplicantStatusLabel(status, t)}
    </span>
  );
}

export function ApplicantAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] font-semibold text-brand-primary",
        size === "sm" ? "size-6 text-[10px]" : size === "lg" ? "size-14 text-lg" : "size-10 text-sm",
      )}
    >
      {initials}
    </span>
  );
}
