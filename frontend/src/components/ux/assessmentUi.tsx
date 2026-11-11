import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { t as globalT, useT, type TranslateFn } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";

export const assessmentInput = "min-h-11 w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-card)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-70";
export const assessmentMuted = "text-sm text-[var(--color-on-surface-variant)]";
export const assessmentLink = "inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] focus-visible:outline focus-visible:outline-2";
export const assessmentStatus: Record<string, string> = {
  DRAFT: "Bản nháp", PUBLISHED: "Đã xuất bản", ARCHIVED: "Lưu trữ", NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang làm bài", SUBMITTED: "Đã nộp bài", PENDING: "Đang chờ chấm", GRADING: "Đang chấm điểm",
  COMPLETED: "Đã chấm xong", GRADED: "Đã chấm xong", FAILED: "Chấm thất bại", EXPIRED: "Hết thời gian",
};
export function getAssessmentStatusLabel(status: string, translate: TranslateFn = globalT) {
  const key = `ux.assessmentStatus.${status}`;
  const label = translate(key);
  return label === key ? status : label;
}
export function AssessmentError({ error, retry }: { error: unknown; retry?: () => void }) {
  const t = useT();
  if (!error) return null;
  return <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-status-danger)] p-3 text-sm">
    <AlertCircle className="size-5 shrink-0 text-[var(--color-status-danger)]" aria-hidden="true" />
    <span className="min-w-0 flex-1 break-words">{getApiErrorMessage(error)}</span>
    {retry && <Button variant="secondary" onClick={retry}><RotateCcw className="size-4" aria-hidden="true" />{t("common.retry")}</Button>}
  </div>;
}
export function FieldError({ message }: { message?: string }) {
  return message ? <span role="alert" className="block text-sm text-[var(--color-status-danger)]">{message}</span> : null;
}
