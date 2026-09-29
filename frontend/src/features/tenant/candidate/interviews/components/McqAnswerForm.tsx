import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import type { AiAnswer, AiQuestion } from "@/api/types/aiInterview";
import { getApiErrorMessage } from "@/lib/axios";
import { candidateInterviewApi } from "../api/candidateInterviewApi";

type Props = {
  interviewId: number;
  question: AiQuestion;
  disabled: boolean;
  onSaved: (answer: AiAnswer) => void;
  onDirty: (id: number, dirty: boolean) => void;
  answerDuration: () => number;
};

export function McqAnswerForm({ interviewId, question, disabled, onSaved, onDirty, answerDuration }: Props) {
  const save = useMutation({
    mutationFn: (option: number) => candidateInterviewApi.answer(interviewId, question.id, String(option), answerDuration()),
    onSuccess: onSaved,
  });
  useEffect(() => { onDirty(question.id, save.isPending); }, [question.id, save.isPending, onDirty]);
  const chosen = save.isPending ? save.variables : question.answer?.answerText ? Number(question.answer.answerText) : null;
  return <fieldset className="space-y-2" disabled={disabled || save.isPending}>
    <legend className="sr-only">Chọn một đáp án</legend>
    {(question.options ?? []).map((option, index) => <label key={index}
      className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-[var(--color-border-default)] p-3 text-sm has-[:checked]:border-brand-primary has-[:checked]:bg-[var(--color-primary-soft)]">
      <input type="radio" name={`mcq-${question.id}`} className="mt-1" checked={chosen === index} onChange={() => save.mutate(index)} />
      <span><strong>{String.fromCharCode(65 + index)}.</strong> {option}</span>
    </label>)}
    {save.isError && <p role="alert">{getApiErrorMessage(save.error)}</p>}
    <p role="status" className="text-sm text-[var(--color-on-surface-variant)]">{save.isPending ? "Đang lưu…" : question.answer?.answerText ? "Đã lưu lựa chọn" : ""}</p>
  </fieldset>;
}
