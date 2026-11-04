import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ClipboardCheck,
  CircleAlert,
  Code2,
  FileQuestion,
  Hash,
  RotateCcw,
  ShieldCheck,
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
  const codingCount = Math.max(0, questionCount - quizCount);
  const startedLabel = formatWhen(submission.startedAt);
  const submittedLabel = formatWhen(submission.submittedAt);
  const title = shortAssessmentTitle(null, submission.title);

  const headline = expired ? "Đã hết thời gian làm bài" : "Bài làm đã được ghi nhận";
  const detail = pending
    ? "Câu trả lời đã được lưu. Điểm chính thức sẽ cập nhật sau khi nhà tuyển dụng hoàn tất chấm."
    : passed
      ? "Bạn đã hoàn tất bài kiểm tra và đạt ngưỡng yêu cầu của đề."
      : failed
        ? "Bạn đã hoàn tất bài kiểm tra. Điểm hiện chưa đạt ngưỡng yêu cầu của đề."
        : "Bạn đã hoàn tất bài kiểm tra. Dưới đây là tóm tắt kết quả.";

  const verdictLabel = pending
    ? "Chờ chấm điểm"
    : submission.passed === null
      ? "Đã chấm điểm"
      : passed
        ? "Đạt yêu cầu"
        : "Chưa đạt yêu cầu";

  /** Score panel color follows % (red → amber → yellow → green). Verdict chip still uses pass/fail. */
  const scoreTone = (() => {
    if (pending) {
      return {
        score: "text-[var(--color-primary)]",
        bar: "bg-[var(--color-primary)]",
        panel: "border-[var(--color-primary)]/20 bg-[linear-gradient(180deg,var(--color-primary-subtle)_0%,white_48%)]",
        icon: "bg-[var(--color-primary)] text-white",
      };
    }
    const pct = scorePct ?? 0;
    if (pct >= 80 || passed) {
      return {
        score: "text-emerald-700",
        bar: "bg-emerald-500",
        panel: "border-emerald-200 bg-[linear-gradient(180deg,#ecfdf5_0%,white_48%)]",
        icon: "bg-emerald-600 text-white",
      };
    }
    if (pct >= 60) {
      return {
        score: "text-lime-700",
        bar: "bg-lime-500",
        panel: "border-lime-200 bg-[linear-gradient(180deg,#f7fee7_0%,white_48%)]",
        icon: "bg-lime-600 text-white",
      };
    }
    if (pct >= 40) {
      return {
        score: "text-amber-700",
        bar: "bg-amber-400",
        panel: "border-amber-200 bg-[linear-gradient(180deg,#fffbeb_0%,white_48%)]",
        icon: "bg-amber-500 text-white",
      };
    }
    if (pct >= 20) {
      return {
        score: "text-orange-700",
        bar: "bg-orange-500",
        panel: "border-orange-200 bg-[linear-gradient(180deg,#fff7ed_0%,white_48%)]",
        icon: "bg-orange-500 text-white",
      };
    }
    return {
      score: "text-[var(--color-error)]",
      bar: "bg-[var(--color-error)]",
      panel: "border-[var(--color-error)]/20 bg-[linear-gradient(180deg,var(--color-error-container)_0%,white_48%)]",
      icon: "bg-[var(--color-error)] text-white",
    };
  })();

  const verdictChip = failed
    ? "bg-[var(--color-error-container)] text-[var(--color-on-error-container)]"
    : passed
      ? "bg-emerald-50 text-emerald-800"
      : "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]";

  const nextStep = pending
    ? "Theo dõi điểm trong danh sách bài đánh giá khi nhà tuyển dụng hoàn tất chấm."
    : passed
      ? "Kết quả đạt yêu cầu đã được ghi nhận trên hồ sơ ứng tuyển."
      : failed
        ? "Theo dõi bước tiếp theo trên trang đơn ứng tuyển."
        : "Kết quả đã được lưu cho nhà tuyển dụng xem lại.";

  return (
    <article
      aria-labelledby="assessment-result-title"
      className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-card)]"
    >
      <header className="shrink-0 border-b border-[var(--color-border-default)] bg-[linear-gradient(135deg,var(--color-primary-subtle),white_68%)] px-5 py-3.5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${scoreTone.icon}`}>
              <ResultIcon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
                Kết quả bài kiểm tra
              </p>
              <h1 id="assessment-result-title" className="truncate text-lg font-semibold tracking-tight sm:text-xl">
                {headline}
              </h1>
              <p className="truncate text-sm text-[var(--color-on-surface-variant)]">{title}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {demo && (
              <span className="rounded-full bg-[var(--color-surface-container)] px-3 py-1 text-xs font-semibold text-[var(--color-on-surface-variant)]">
                Demo UI
              </span>
            )}
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${verdictChip}`}>
              <ResultIcon className="size-3.5" aria-hidden="true" />
              {verdictLabel}
            </span>
          </div>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-5 text-[var(--color-on-surface-variant)]">{detail}</p>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden p-4 sm:p-5">
        <div className="mx-auto grid h-full min-h-0 w-full max-w-6xl gap-4 lg:grid-cols-[minmax(17rem,0.9fr)_minmax(0,1.1fr)]">
          <section className={`flex min-h-0 flex-col rounded-2xl border ${scoreTone.panel}`}>
            <div className="border-b border-[var(--color-border-default)]/60 px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-on-surface-variant)]">
                Tổng hợp
              </p>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-on-surface-variant)]">
                  Điểm số
                </p>
                {pending ? (
                  <div className="mt-2 flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-white text-[var(--color-primary)] ring-1 ring-[var(--color-border-default)]">
                      <Clock className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-2xl font-semibold tracking-tight">Đang chấm</p>
                      <p className="text-sm text-[var(--color-on-surface-variant)]">Chưa có điểm chính thức</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className={`flex items-baseline gap-1.5 tabular-nums ${scoreTone.score}`}>
                      <span className="text-4xl font-semibold tracking-tight">{submission.score}</span>
                      <span className="text-base text-[var(--color-on-surface-variant)]">/ {submission.totalPoints}</span>
                    </p>
                    {scorePct !== null && (
                      <>
                        <p className="mt-1.5 text-sm text-[var(--color-on-surface-variant)]">{scorePct}% tổng điểm</p>
                        <div
                          className="mt-2 h-1.5 overflow-hidden rounded-full bg-white ring-1 ring-[var(--color-border-default)]"
                          role="progressbar"
                          aria-valuenow={scorePct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label="Tỷ lệ điểm đạt được"
                        >
                          <div className={`h-full rounded-full ${scoreTone.bar}`} style={{ width: `${scorePct}%` }} />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-[var(--color-border-default)]/70 bg-white/95 px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-on-surface-variant)]">
                  Đánh giá
                </p>
                <p className={`mt-1.5 inline-flex items-center gap-2 text-sm font-semibold ${scoreTone.score}`}>
                  <ResultIcon className="size-4" aria-hidden="true" />
                  {verdictLabel}
                </p>
                <p className="mt-1 text-sm leading-5 text-[var(--color-on-surface-variant)]">
                  {assessmentStatus[submission.status] ?? submission.status}
                  {submittedLabel ? ` · Nộp ${submittedLabel}` : ""}
                </p>
              </div>

              <div className="flex gap-2.5 rounded-xl border border-[var(--color-border-default)]/70 bg-white/95 px-3.5 py-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Bước tiếp theo</p>
                  <p className="mt-0.5 text-sm leading-5 text-[var(--color-on-surface-variant)]">{nextStep}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="flex min-h-0 flex-col rounded-2xl border border-[var(--color-border-default)] bg-white">
            <div className="flex items-center gap-2 border-b border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-4 py-2.5">
              <ClipboardCheck className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-on-surface-variant)]">
                Chi tiết phiên
              </p>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
              <dl className="rounded-xl border border-[var(--color-border-default)] divide-y divide-[var(--color-border-default)]">
                {startedLabel && <DetailRow label="Bắt đầu" value={startedLabel} />}
                {submittedLabel && <DetailRow label="Nộp bài" value={submittedLabel} />}
                <DetailRow label="Mã bài nộp" value={`#${submission.id}`} />
              </dl>

              <div>
                <p className="mb-2 text-sm font-semibold">Cấu trúc đề</p>
                <ul className="grid grid-cols-3 gap-2">
                  <DetailStat icon={FileQuestion} label="Tổng câu" value={questionCount || "—"} />
                  <DetailStat icon={ClipboardCheck} label="Trắc nghiệm" value={questionCount ? quizCount : "—"} />
                  <DetailStat icon={Code2} label="Lập trình" value={questionCount ? codingCount : "—"} />
                </ul>
              </div>

              {demo && (
                <p className="rounded-xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-3.5 py-2.5 text-sm leading-5 text-[var(--color-on-surface-variant)]">
                  Bài demo giao diện — điểm không ảnh hưởng vòng tuyển dụng.
                </p>
              )}
            </div>
          </section>
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden items-center gap-1.5 text-xs text-[var(--color-on-surface-variant)] sm:inline-flex">
            <Hash className="size-3.5" aria-hidden="true" />#{submission.id}
          </span>
          {demo && onRetake && (
            <Button disabled={retaking} onClick={onRetake}>
              <RotateCcw className="size-4" aria-hidden="true" />
              {retaking ? "Đang mở…" : "Làm lại từ đầu"}
            </Button>
          )}
        </div>
      </footer>
    </article>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 px-3.5 py-2.5 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:items-center sm:gap-3">
      <dt className="text-sm text-[var(--color-on-surface-variant)]">{label}</dt>
      <dd className="truncate text-sm font-medium tabular-nums text-[var(--color-on-surface)]">{value}</dd>
    </div>
  );
}

function DetailStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string | number;
}) {
  return (
    <li className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-3 py-2.5 text-center">
      <Icon className="mx-auto size-4 text-[var(--color-primary)]" aria-hidden="true" />
      <p className="mt-1 text-[11px] text-[var(--color-on-surface-variant)]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </li>
  );
}
