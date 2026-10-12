import type { ReactNode } from "react";
import { Check, Lightbulb } from "lucide-react";
import type { Question } from "@/api/types/assessment";

const questionTypes: Record<string, string> = {
  MCQ: "Một đáp án", MULTIPLE_CHOICE: "Nhiều đáp án", ESSAY: "Tự luận",
};

export function AssessmentQuestionCard({ question, index, actions }: { question: Question; index: number; actions?: ReactNode }) {
  return <article className="overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] shadow-[var(--shadow-card)]">
    <div className="space-y-4 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
          <span className="rounded-lg bg-[var(--color-primary-subtle)] px-3 py-2 font-semibold text-[var(--color-primary)]">Câu {index + 1}</span>
          <span className="font-medium text-[var(--color-on-surface-variant)]">{question.points} điểm</span>
          {[questionTypes[question.questionType] ?? question.questionType, question.difficulty, question.skill].filter(Boolean).map((label, i) => <span key={i} className="max-w-full break-words rounded-full bg-[var(--color-surface-container-low)] px-3 py-1 text-[var(--color-on-surface-variant)]">{label}</span>)}
        </div>
        {actions}
      </div>
      <h3 className="whitespace-pre-wrap break-words text-base font-semibold leading-7">{question.questionText}</h3>
      {question.options.length > 0 ? <ul className="grid gap-3 sm:grid-cols-2">
        {question.options.map((option, optionIndex) => <li key={option.id} className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${option.correct ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]" : "border-[var(--color-border-default)]"}`}>
          <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${option.correct ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)]"}`}>{String.fromCharCode(65 + optionIndex)}</span>
          <div className="min-w-0 flex-1 space-y-2 pt-0.5"><p className="whitespace-pre-wrap break-words leading-6">{option.optionText}</p>{option.correct && <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)]"><Check className="size-3.5" aria-hidden="true" />Đáp án đúng</span>}</div>
        </li>)}
      </ul> : question.questionType === "ESSAY" && <p className="rounded-xl border border-dashed border-[var(--color-outline-variant)] p-4 text-sm text-[var(--color-on-surface-variant)]">Ứng viên trả lời bằng nội dung tự luận.</p>}
    </div>
    {question.explanation?.trim() && <div className="flex items-start gap-3 border-t border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-5 py-4 sm:px-6">
      <Lightbulb className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
      <div className="min-w-0 space-y-1 text-sm"><p className="font-medium">Giải thích đáp án</p><p className="whitespace-pre-wrap break-words leading-6 text-[var(--color-on-surface-variant)]">{question.explanation}</p></div>
    </div>}
  </article>;
}
