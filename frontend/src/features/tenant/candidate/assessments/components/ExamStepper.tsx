import { ArrowRight, CheckCircle2, Circle, LockKeyhole } from "lucide-react";

export function ExamStepper({ objectiveCount, practicalCount, practical, objectiveCompleted, objectiveRemaining }: {
  objectiveCount: number; practicalCount: number; practical: boolean; objectiveCompleted: boolean; objectiveRemaining: number | null;
}) {
  const firstDone = objectiveCompleted || objectiveCount === 0;
  const FirstIcon = firstDone ? CheckCircle2 : Circle;
  const SecondIcon = practical ? Circle : LockKeyhole;
  const style = (current: boolean) => `flex min-w-0 items-start gap-3 rounded-lg p-3 ${current ? "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]" : "text-[var(--color-on-surface-variant)]"}`;
  return <nav aria-label="Các phần bài đánh giá" className="grid items-center gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 sm:grid-cols-[1fr_auto_1fr]">
    <div aria-current={!practical ? "step" : undefined} className={style(!practical)}><FirstIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><div className="min-w-0"><p className="text-sm font-semibold">Bước 1: Trắc nghiệm ({objectiveCount} câu)</p><p className="mt-1 text-xs">{objectiveCount === 0 ? "Không có câu hỏi" : firstDone ? "Đã hoàn thành · Đáp án đã khóa" : "Đang làm dở"}{!firstDone && objectiveRemaining != null ? ` · Còn ${Math.floor(objectiveRemaining / 60)}:${String(objectiveRemaining % 60).padStart(2, "0")}` : ""}</p></div></div>
    <ArrowRight className="hidden size-5 text-[var(--color-on-surface-variant)] sm:block" aria-hidden="true" />
    <div aria-current={practical ? "step" : undefined} className={style(practical)}><SecondIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><div className="min-w-0"><p className="text-sm font-semibold">Bước 2: Tự luận & Lập trình ({practicalCount} câu)</p><p className="mt-1 text-xs">{practicalCount === 0 ? "Không có câu hỏi" : practical ? "Đang làm dở" : "Chưa mở"}</p></div></div>
  </nav>;
}
