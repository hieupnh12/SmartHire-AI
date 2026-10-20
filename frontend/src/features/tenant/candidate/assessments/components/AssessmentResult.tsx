import { ArrowLeft, CheckCircle2, Clock, ClipboardCheck, CircleAlert, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import type { Submission } from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { assessmentStatus } from "@/components/ux/assessmentUi";
import { isDemoAssessmentTitle } from "@/lib/assessmentTitle";

type Props = {
  submission: Submission;
  back: string;
  onRetake?: () => void;
  retaking?: boolean;
};

export function AssessmentResult({ submission, back, onRetake, retaking }: Props) {
  const pending = submission.score === null;
  const expired = submission.status === "EXPIRED";
  const demo = isDemoAssessmentTitle(submission.title);
  const ResultIcon = pending ? Clock : submission.passed === false ? CircleAlert : CheckCircle2;
  const headline = expired ? "Đã hết thời gian làm bài" : "Bài làm đã được ghi nhận";
  const detail = pending
    ? "Bài đang chờ chấm. Điểm sẽ hiển thị khi nhà tuyển dụng hoàn tất."
    : "Bạn đã hoàn tất bài kiểm tra. Dưới đây là kết quả.";

  return (
    <article
      aria-labelledby="assessment-result-title"
      className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-card)]"
    >
      <header className="shrink-0 border-b border-[var(--color-border-default)] bg-[linear-gradient(135deg,var(--color-primary-subtle),white_70%)] px-5 py-5 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--color-primary)] text-white">
              <ClipboardCheck className="size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">Kết quả</p>
              <h1 id="assessment-result-title" className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                {headline}
              </h1>
              <p className="mt-1 truncate text-sm text-[var(--color-on-surface-variant)]">{submission.title}</p>
            </div>
          </div>
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--color-on-surface)] shadow-sm">
            {assessmentStatus[submission.status] ?? submission.status}
          </span>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">{detail}</p>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 p-5 sm:grid-cols-2 sm:gap-5 sm:p-6">
        <div className="flex flex-col justify-center rounded-xl bg-[var(--color-surface-alt)] px-5 py-6 text-center sm:py-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
            Điểm bài kiểm tra
          </p>
          {pending ? (
            <p className="mt-3 text-3xl font-semibold tracking-tight">Đang chấm</p>
          ) : (
            <p className="mt-3 flex flex-wrap items-baseline justify-center gap-2 tabular-nums">
              <span className="text-5xl font-semibold tracking-tight text-[var(--color-primary)]">{submission.score}</span>
              <span className="text-lg text-[var(--color-on-surface-variant)]">/ {submission.totalPoints}</span>
            </p>
          )}
          <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
            {pending ? "Chưa có điểm chính thức" : "Tổng điểm đạt được"}
          </p>
        </div>

        <div className="flex flex-col justify-center gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)]/40 px-5 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
              Đánh giá
            </p>
            <span
              className={`mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                submission.passed === false
                  ? "bg-[var(--color-error-container)] text-[var(--color-on-error-container)]"
                  : "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"
              }`}
            >
              <ResultIcon className="size-4 shrink-0" aria-hidden="true" />
              {pending
                ? "Chờ chấm điểm"
                : submission.passed === null
                  ? "Đã chấm điểm"
                  : submission.passed
                    ? "Đạt yêu cầu"
                    : "Chưa đạt yêu cầu"}
            </span>
            {submission.passed !== null && (
              <p className="mt-2 text-sm leading-6 text-[var(--color-on-surface-variant)]">
                {submission.passed
                  ? "Bạn đã đạt ngưỡng điểm của đề kiểm tra."
                  : "Điểm chưa đạt ngưỡng yêu cầu của đề."}
              </p>
            )}
          </div>
          {submission.submittedAt && (
            <div className="flex items-center gap-2 border-t border-[var(--color-border-default)] pt-4 text-sm">
              <Clock className="size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
              <div>
                <p className="text-xs text-[var(--color-on-surface-variant)]">Thời gian nộp</p>
                <p className="font-medium">{new Date(submission.submittedAt).toLocaleString("vi-VN")}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-5 py-3 sm:px-6">
        <Link
          to={back}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-white px-3.5 text-sm font-semibold text-[var(--color-on-surface)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-primary)]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Quay về danh sách
        </Link>
        {demo && onRetake && (
          <Button disabled={retaking} onClick={onRetake}>
            <RotateCcw className="size-4" aria-hidden="true" />
            {retaking ? "Đang mở…" : "Làm lại từ đầu"}
          </Button>
        )}
      </footer>
    </article>
  );
}
