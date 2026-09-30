import { RotateCcw } from "lucide-react";
import type { CandidateQuestion, SavedAnswer } from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { assessmentInput, assessmentMuted } from "@/components/ux/assessmentUi";
import { hasAnswer } from "../utils/hasAnswer";

export function AssessmentAnswerInput({ question, answer, onChange, locked }: {
  question: CandidateQuestion; answer?: SavedAnswer; onChange: (answer: SavedAnswer) => void; locked: boolean;
}) {
  const questionId = question.id;
  if (question.questionType === "ESSAY") return <div className="space-y-2">
    <label htmlFor={`essay-${questionId}`} className="block text-sm font-medium">Câu trả lời tự luận</label>
    <textarea id={`essay-${questionId}`} className={`${assessmentInput} min-h-64 resize-y`} rows={10}
      value={answer?.answerText ?? ""} maxLength={10000} disabled={locked}
      aria-describedby={`essay-limit-${questionId}`}
      onChange={event => onChange({ questionId, answerText: event.target.value })} />
    <p id={`essay-limit-${questionId}`} className={assessmentMuted}>{answer?.answerText?.length ?? 0}/10.000 ký tự · Tự động lưu</p>
  </div>;

  const multiple = question.questionType === "MULTIPLE_CHOICE";
  if (!multiple && question.questionType !== "MCQ") return <p role="alert">Loại câu hỏi này chưa được hỗ trợ.</p>;
  const selected = (optionId: number) => multiple ? !!answer?.selectedOptionIds?.includes(optionId) : answer?.selectedOptionId === optionId;
  return <>
    <p className={assessmentMuted}>{multiple ? "Chọn tất cả đáp án đúng (có thể chọn nhiều đáp án)." : "Chọn một đáp án đúng."}</p>
    {question.options.map((option, i) => <label key={option.id} className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border p-4 ${selected(option.id) ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]" : "border-[var(--color-outline-variant)] bg-[var(--color-surface-card)]"}`}>
      <input className="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)]" type={multiple ? "checkbox" : "radio"}
        name={`question-${questionId}`} value={option.id} checked={selected(option.id)} disabled={locked}
        onChange={event => onChange(multiple
          ? { questionId, selectedOptionIds: event.target.checked ? [...(answer?.selectedOptionIds ?? []), option.id] : (answer?.selectedOptionIds ?? []).filter(id => id !== option.id) }
          : { questionId, selectedOptionId: option.id })} />
      <span className="min-w-0 whitespace-pre-wrap break-words text-sm">{String.fromCharCode(65 + i)}. {option.optionText}</span>
    </label>)}
    <Button variant="ghost" disabled={locked || !hasAnswer(answer)} onClick={() => onChange(multiple ? { questionId, selectedOptionIds: [] } : { questionId, selectedOptionId: null })}>
      <RotateCcw className="size-4" aria-hidden="true" />Bỏ chọn
    </Button>
  </>;
}
