import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  CircleAlert,
  FileQuestion,
  RotateCcw,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Submission } from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { assessmentStatus } from "@/components/ux/assessmentUi";
import { isDemoAssessmentTitle, shortAssessmentTitle } from "@/lib/assessmentTitle";

type Props = {
  submission: Submission;
  back: string;
  onRetake?: () => void;
  retaking?: boolean;
};

function formatWhen(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AssessmentResult({ submission, back, onRetake, retaking }: Props) {
  const pending = submission.score === null;
  const expired = submission.status === "EXPIRED";
  const demo = isDemoAssessmentTitle(submission.title);
  const passed = submission.passed === true;
  const failed = submission.passed === false;
  const ResultIcon = pending ? Clock : failed ? CircleAlert : CheckCircle2;
  const scorePct =
    !pending && submission.totalPoints > 0
      ? Math.round(((submission.score ?? 0) / submission.totalPoints) * 100)
      : null;
  const questionCount = submission.questions?.length ?? 0;
  const quizCount = submission.questions?.filter((q) => q.questionType !== "CODING").length ?? 0;
  const codingCount = questionCount - quizCount;
  const startedLabel = formatWhen(submission.startedAt);
  const submittedLabel = formatWhen(submission.submittedAt);

  const headline = expired ? "Đã hết thời gian làm bài" : "Bài làm đã được ghi nhận";
  const detail = pending
    ? "Bài đang chờ chấm. Điểm sẽ hiển thị khi nhà tuyển dụng hoàn tất."
    : passed
      ? "Bạn đã hoàn tất bài kiểm tra và đạt ngưỡng yêu cầu."
      : failed
        ? "Bạn đã hoàn tất bài kiểm tra. Điểm chưa đạt ngưỡng yêu cầu của đề."
        : "Bạn đã hoàn tất bài kiểm tra. Dưới đây là kết quả.";

  const verdictLabel = pending
    ? "Chờ chấm điểm"
    : submission.passed === null
      ? "Đã chấm điểm"
      : passed
        ? "Đạt yêu cầu"
        : "Chưa đạt yêu cầu";

  const verdictClass = failed
    ? "bg-[var(--color-error-container)] text-[var(--color-on-error-container)]"
    : passed
      ? "bg-emerald-50 text-emerald-800"
      : "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]";

  const iconWrapClass = failed
    ? "bg-[var(--color-error)] text-white"
    : passed
      ? "bg-emerald-600 text-white"
      : "bg-[var(--color-primary)] text-white";

  const scoreColor = failed
    ? "text-[var(--color-error)]"
    : passed
      ? "text-emerald-700"
      : "text-[var(--color-primary)]";

  const barColor = failed ? "bg-[var(--color-error)]" : passed ? "bg-emerald-500" : "bg-[var(--color-primary)]";

  return (
    <article
      aria-labelledby="assessment-result-title"
      className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-card)]"
    >
      <header className="shrink-0 border-b border-[var(--color-border-default)] bg-[linear-gradient(135deg,var(--color-primary-subtle),white_70%)] px-5 py-5 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${iconWrapClass}`}>
              <ClipboardCheck className="size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">Kết quả</p>
              <h1 id="assessment-result-title" className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                {headline}
              </h1>
              <p className="mt-1 truncate text-sm text-[var(--color-on-surface-variant)]">
                {shortAssessmentTitle(null, submission.title)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {demo && (
              <span className="rounded-full bg-[var(--color-surface-container)] px-3 py-1 text-xs font-semibold text-[var(--color-on-surface-variant)]">
                Demo UI
              </span>
            )}
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--color-on-surface)] shadow-sm ring-1 ring-[var(--color-border-default)]">
              {assessmentStatus[submission.status] ?? submission.status}
            </span>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">{detail}</p>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2 sm:gap-5 sm:p-6">
        <div className="flex flex-col justify-center rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-5 py-6 sm:py-8">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
            Điểm bài kiểm tra
          </p>
          {pending ? (
            <div className="mt-4 text-center">
              <p className="text-3xl font-semibold tracking-tight">Đang chấm</p>
              <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">Chưa có điểm chính thức</p>
            </div>
          ) : (
            <div className="mt-4 text-center">
              <p className="flex flex-wrap items-baseline justify-center gap-2 tabular-nums">
                <span className={`text-5xl font-semibold tracking-tight ${scoreColor}`}>{submission.score}</span>
                <span className="text-lg text-[var(--color-on-surface-variant)]">/ {submission.totalPoints}</span>
              </p>
              {scorePct !== null && (
                <>
                  <p className="mt-2 text-sm font-medium text-[var(--color-on-surface-variant)]">
                    Đạt {scorePct}% tổng điểm
                  </p>
                  <div
                    className="mx-auto mt-3 h-2 w-full max-w-[14rem] overflow-hidden rounded-full bg-white ring-1 ring-[var(--color-border-default)]"
                    role="progressbar"
                    aria-valuenow={scorePct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Tỷ lệ điểm đạt được"
                  >
                    <div className={`h-full rounded-full transition-[width] duration-500 ${barColor}`} style={{ width: `${scorePct}%` }} />
                  </div>
                </>
              )}
            </div>
          )}

          {questionCount > 0 && (
            <ul className="mt-6 grid gap-2 border-t border-[var(--color-border-default)] pt-4 text-sm sm:grid-cols-2">
              <li className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2">
                <FileQuestion className="size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
                <span>
                  <span className="block text-xs text-[var(--color-on-surface-variant)]">Tổng câu hỏi</span>
                  <span className="font-semibold tabular-nums">{questionCount}</span>
                </span>
              </li>
              <li className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2">
                <ClipboardCheck className="size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
                <span>
                  <span className="block text-xs text-[var(--color-on-surface-variant)]">Trắc nghiệm / Code</span>
                  <span className="font-semibold tabular-nums">
                    {quizCount} / {codingCount}
                  </span>
                </span>
              </li>
            </ul>
          )}
        </div>

        <div className="flex flex-col justify-center gap-4 rounded-xl border border-[var(--color-border-default)] bg-white px-5 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
              Đánh giá
            </p>
            <span className={`mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${verdictClass}`}>
              <ResultIcon className="size-4 shrink-0" aria-hidden="true" />
              {verdictLabel}
            </span>
            <p className="mt-2 text-sm leading-6 text-[var(--color-on-surface-variant)]">
              {pending
                ? "Kết quả chính thức sẽ cập nhật sau khi nhà tuyển dụng duyệt điểm."
                : passed
                  ? "Bạn đã đạt ngưỡng điểm của đề kiểm tra."
                  : failed
                    ? "Điểm chưa đạt ngưỡng yêu cầu của đề."
                    : "Điểm đã được ghi nhận trên hệ thống."}
            </p>
          </div>

          <dl className="space-y-3 border-t border-[var(--color-border-default)] pt-4 text-sm">
            {startedLabel && (
              <div className="flex items-start gap-2.5">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
                <div>
                  <dt className="text-xs text-[var(--color-on-surface-variant)]">Bắt đầu làm bài</dt>
                  <dd className="font-medium tabular-nums">{startedLabel}</dd>
                </div>
              </div>
            )}
            {submittedLabel && (
              <div className="flex items-start gap-2.5">
                <Clock className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
                <div>
                  <dt className="text-xs text-[var(--color-on-surface-variant)]">Thời gian nộp</dt>
                  <dd className="font-medium tabular-nums">{submittedLabel}</dd>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2.5">
              <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
              <div>
                <dt className="text-xs text-[var(--color-on-surface-variant)]">Mã bài nộp</dt>
                <dd className="font-medium tabular-nums">#{submission.id}</dd>
              </div>
            </div>
          </dl>
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
