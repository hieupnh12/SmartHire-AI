import { ArrowRight, CheckCircle2, Code2, FileQuestion, LockKeyhole } from "lucide-react";

export function ExamStepper({
  quizCount,
  codingCount,
  inCoding,
  quizCompleted,
  quizRemaining,
}: {
  quizCount: number;
  codingCount: number;
  inCoding: boolean;
  quizCompleted: boolean;
  quizRemaining: number | null;
}) {
  const firstDone = quizCompleted || quizCount === 0;
  const quizTime =
    !firstDone && quizRemaining != null
      ? ` · Còn ${Math.floor(quizRemaining / 60)}:${String(quizRemaining % 60).padStart(2, "0")}`
      : "";

  return (
    <nav aria-label="Các phần bài đánh giá" className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
      <div
        aria-current={!inCoding ? "step" : undefined}
        className={`inline-flex min-w-0 items-center gap-2 rounded-xl px-3 py-1 text-xs sm:text-sm font-semibold transition-all ${
          !inCoding
            ? "border border-[var(--color-primary)]/30 bg-[var(--color-primary-subtle)] text-[var(--color-primary)] shadow-xs"
            : firstDone
            ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)]"
        }`}
      >
        {firstDone ? (
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
        ) : (
          <FileQuestion className="size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
        )}
        <span className="min-w-0 truncate">
          Phần 1: Trắc nghiệm &amp; Tự luận
          <span className="ml-1 text-xs font-normal opacity-90">
            ({quizCount} câu{firstDone ? " · Đã khóa" : quizTime})
          </span>
        </span>
      </div>

      <ArrowRight className="size-3.5 shrink-0 text-[var(--color-on-surface-variant)]" aria-hidden="true" />

      <div
        aria-current={inCoding ? "step" : undefined}
        className={`inline-flex min-w-0 items-center gap-2 rounded-xl px-3 py-1 text-xs sm:text-sm font-semibold transition-all ${
          inCoding
            ? "border border-[var(--color-primary)]/30 bg-[var(--color-primary-subtle)] text-[var(--color-primary)] shadow-xs"
            : "border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)]"
        }`}
      >
        {inCoding ? (
          <Code2 className="size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
        ) : (
          <LockKeyhole className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        )}
        <span className="min-w-0 truncate">
          Phần 2: Lập trình
          <span className="ml-1 text-xs font-normal opacity-90">
            ({codingCount} bài{codingCount === 0 ? " · Không có" : inCoding ? " · Đang làm" : " · Mở sau P1"})
          </span>
        </span>
      </div>
    </nav>
  );
}
