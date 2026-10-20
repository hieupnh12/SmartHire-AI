import { ArrowRight, CheckCircle2, Circle, LockKeyhole } from "lucide-react";

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
  const FirstIcon = firstDone ? CheckCircle2 : Circle;
  const SecondIcon = inCoding ? Circle : LockKeyhole;
  const quizTime =
    !firstDone && quizRemaining != null
      ? ` · Còn ${Math.floor(quizRemaining / 60)}:${String(quizRemaining % 60).padStart(2, "0")}`
      : "";
  const step = (current: boolean) =>
    `inline-flex min-w-0 max-w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
      current
        ? "bg-[var(--color-primary-subtle)] font-semibold text-[var(--color-primary)]"
        : "text-[var(--color-on-surface-variant)]"
    }`;

  return (
    <nav aria-label="Các phần bài đánh giá" className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
      <div aria-current={!inCoding ? "step" : undefined} className={step(!inCoding)}>
        <FirstIcon className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">
          Bước 1: Trắc nghiệm &amp; tự luận ({quizCount})
          <span className="font-normal">
            {quizCount === 0 ? " · Không có câu" : firstDone ? " · Đã khóa" : " · Đang làm"}
            {quizTime}
          </span>
        </span>
      </div>
      <ArrowRight className="size-4 shrink-0 text-[var(--color-on-surface-variant)]" aria-hidden="true" />
      <div aria-current={inCoding ? "step" : undefined} className={step(inCoding)}>
        <SecondIcon className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">
          Bước 2: Lập trình ({codingCount})
          <span className="font-normal">
            {codingCount === 0 ? " · Không có câu" : inCoding ? " · Đang làm" : " · Chưa mở"}
          </span>
        </span>
      </div>
    </nav>
  );
}
