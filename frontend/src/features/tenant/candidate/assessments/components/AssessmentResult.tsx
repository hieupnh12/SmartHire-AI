import { ArrowLeft, CheckCircle2, Clock, ClipboardCheck, CircleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import type { Submission } from "@/api/types/assessment";
import { assessmentLink } from "@/components/ux/assessmentUi";

export function AssessmentResult({ submission, back }: { submission: Submission; back: string }) {
  const pending = submission.score === null;
  const expired = submission.status === "EXPIRED";
  const ResultIcon = pending ? Clock : submission.passed === false ? CircleAlert : CheckCircle2;
  const statusStyle = submission.passed === false
    ? "bg-[var(--color-error-container)] text-[var(--color-on-error-container)]"
    : "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]";

  return (
    <section aria-labelledby="assessment-result-title" className="mx-auto w-full max-w-3xl overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] shadow-[var(--shadow-ambient)]">
      <div className="space-y-3 border-b border-[var(--color-border-default)] p-6 sm:p-8">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
          <ClipboardCheck className="size-6" aria-hidden="true" />
        </div>
        <h2 id="assessment-result-title" className="text-xl font-semibold sm:text-2xl">{expired ? "Đã hết thời gian làm bài" : "Bài làm đã được ghi nhận"}</h2>
        <p className="text-sm leading-6 text-[var(--color-on-surface-variant)]">{pending ? "Bài làm của bạn đang chờ chấm. Điểm sẽ hiển thị khi có kết quả." : "Bạn đã hoàn tất bài kiểm tra. Dưới đây là kết quả bài làm của bạn."}</p>
      </div>

      <div className="grid gap-6 p-6 sm:grid-cols-[1fr_1fr] sm:gap-8 sm:p-8">
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-[var(--color-primary-subtle)] px-4 py-8 text-center">
          <p className="text-sm font-medium text-[var(--color-on-surface-variant)]">Điểm bài kiểm tra</p>
          {pending ? <p className="text-2xl font-semibold">Đang chấm</p> : <p className="flex flex-wrap items-baseline justify-center gap-2 tabular-nums"><span className="text-5xl font-semibold tracking-tight text-[var(--color-primary)]">{submission.score}</span><span className="text-lg text-[var(--color-on-surface-variant)]">/ {submission.totalPoints}</span></p>}
          <p className="text-sm text-[var(--color-on-surface-variant)]">{pending ? "Chưa có điểm chính thức" : "Tổng điểm đạt được"}</p>
        </div>

        <div className="flex flex-col justify-center gap-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--color-on-surface-variant)]">Kết quả đánh giá</p>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium ${statusStyle}`}>
              <ResultIcon className="size-4 shrink-0" aria-hidden="true" />
              {pending ? "Chờ chấm điểm" : submission.passed === null ? "Đã chấm điểm" : submission.passed ? "Đạt yêu cầu" : "Chưa đạt yêu cầu"}
            </span>
            {submission.passed !== null && <p className="text-sm leading-6 text-[var(--color-on-surface-variant)]">{submission.passed ? "Bạn đã đạt ngưỡng điểm của đề kiểm tra." : "Điểm bài làm chưa đạt ngưỡng yêu cầu của đề kiểm tra."}</p>}
          </div>
          {submission.submittedAt && <div className="flex items-start gap-3 border-t border-[var(--color-border-default)] pt-5">
            <Clock className="mt-0.5 size-4 shrink-0 text-[var(--color-on-surface-variant)]" aria-hidden="true" />
            <div className="space-y-1"><p className="text-sm text-[var(--color-on-surface-variant)]">Thời gian nộp bài</p><p className="text-sm font-medium">{new Date(submission.submittedAt).toLocaleString("vi-VN")}</p></div>
          </div>}
        </div>
      </div>

      <div className="border-t border-[var(--color-border-default)] px-6 py-4 sm:px-8">
        <Link className={`${assessmentLink} w-full justify-center sm:w-auto`} to={back}><ArrowLeft className="size-4" aria-hidden="true" />Quay lại bài kiểm tra</Link>
      </div>
    </section>
  );
}
