import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { AiAnswer, AiQuestion } from "@/api/types/aiInterview";
import { getApiErrorMessage } from "@/lib/axios";
import { candidateInterviewApi } from "../api/candidateInterviewApi";
import { parseChoiceAnswer } from "@/lib/interview-choice-answer";
import { Button } from "@/components/ux/Button";

type Props = {
  interviewId: number;
  question: AiQuestion;
  disabled: boolean;
  onSaved: (answer: AiAnswer) => void;
  onDirty: (id: number, dirty: boolean) => void;
  answerDuration: () => number;
};

export function McqAnswerForm({ interviewId, question, disabled, onSaved, onDirty, answerDuration }: Props) {
  const structured = question.questionType === "SINGLE_CHOICE" || question.questionType === "MULTIPLE_CHOICE";
  const saved = parseChoiceAnswer(question.answer?.answerText);
  const [selected, setSelected] = useState<number[]>(saved.selectedOptions);
  const [explanation, setExplanation] = useState(saved.explanation);
  const payload = JSON.stringify({ selectedOptions: [...selected].sort((a, b) => a - b), explanation: explanation.trim() });
  const dirty = structured && (JSON.stringify([...selected].sort((a, b) => a - b)) !== JSON.stringify([...saved.selectedOptions].sort((a, b) => a - b)) || explanation !== saved.explanation);
  const save = useMutation({
    mutationFn: (answer: string) => candidateInterviewApi.answer(interviewId, question.id, answer, answerDuration()),
    onSuccess: answer => { onDirty(question.id, false); onSaved(answer); },
  });
  useEffect(() => { onDirty(question.id, dirty || save.isPending); }, [question.id, dirty, save.isPending, onDirty]);
  const chosen = structured ? selected : save.isPending ? [Number(save.variables)] : saved.selectedOptions;
  return <fieldset className="space-y-2" disabled={disabled || save.isPending || structured && !!question.answer}>
    <legend className="text-sm">{question.multipleChoice ? "Chọn tất cả đáp án đúng" : "Chọn một đáp án đúng"}</legend>
    {(question.options ?? []).map((option, index) => <label key={index}
      className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-border-default)] bg-white p-4 text-sm transition-colors hover:bg-[var(--color-primary-subtle)] has-[:checked]:border-brand-primary has-[:checked]:bg-[var(--color-primary-soft)] has-[:checked]:ring-1 has-[:checked]:ring-brand-primary/20">
      <input type={question.multipleChoice ? "checkbox" : "radio"} name={`mcq-${question.id}`} className="mt-1" checked={chosen.includes(index)} onChange={() => {
        if (!structured) save.mutate(String(index));
        else setSelected(current => question.multipleChoice ? current.includes(index) ? current.filter(item => item !== index) : [...current, index] : [index]);
      }} />
      <span><strong>{String.fromCharCode(65 + index)}.</strong> {option}</span>
    </label>)}
    {structured && question.explanationRequired && <label className="block space-y-2 text-sm"><span>Giải thích lựa chọn của bạn (bắt buộc)</span>
      <textarea value={explanation} onChange={event => setExplanation(event.target.value)} maxLength={10000} className="min-h-28 w-full rounded-lg border border-[var(--color-border-default)] bg-surface-muted p-3" />
    </label>}
    {structured && <Button type="button" disabled={!selected.length || !!question.explanationRequired && !explanation.trim()} onClick={() => save.mutate(payload)}>
      {save.isPending ? "Đang lưu…" : "Lưu lựa chọn và tiếp tục"}
    </Button>}
    {save.isError && <p role="alert">{getApiErrorMessage(save.error)}</p>}
    <p role="status" className="text-sm text-[var(--color-on-surface-variant)]">{save.isPending ? "Đang lưu…" : question.answer?.answerText ? "Đã lưu lựa chọn" : ""}</p>
  </fieldset>;
}
