import { cn } from "@/lib/utils";
import { applicationStatusLabel } from "@/features/tenant/recruiter/matching/components/rankingUi";

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

export function sourceLabel(source: string | null | undefined) {
  if (!source) return "—";
  return SOURCE_LABEL[source] ?? source;
}

export function splitApplicantTags(value: string | null | undefined) {
  return (value ?? "").split(",").map((tag) => tag.trim()).filter(Boolean);
}

export function formatApplicantDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export function ApplicantStatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
        STATUS_STYLE[status] ?? "bg-slate-100 text-slate-600",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {applicationStatusLabel(status)}
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
