import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ux/Button";
import type { AiAnswer, AiQuestion } from "@/api/types/aiInterview";
import { getApiErrorMessage } from "@/lib/axios";
import { candidateInterviewApi } from "../api/candidateInterviewApi";

const answerSchema = z.object({ answerText: z.string().trim().min(1, "Vui lòng nhập câu trả lời.").max(50000, "Câu trả lời tối đa 50.000 ký tự.") });

type Props = {
  interviewId: number;
  question: AiQuestion;
  disabled: boolean;
  onSaved: (answer: AiAnswer) => void;
  onDirty: (id: number, dirty: boolean) => void;
};

export function InterviewAnswerForm({ interviewId, question, disabled, onSaved, onDirty }: Props) {
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<z.infer<typeof answerSchema>>({
    resolver: zodResolver(answerSchema), defaultValues: { answerText: question.answer?.answerText ?? "" },
  });
  const save = useMutation({
    mutationFn: ({ answerText }: z.infer<typeof answerSchema>) => candidateInterviewApi.answer(interviewId, question.id, answerText),
    onSuccess: answer => { reset({ answerText: answer.answerText ?? "" }); onSaved(answer); },
  });
  useEffect(() => { onDirty(question.id, isDirty || save.isPending); }, [question.id, isDirty, save.isPending, onDirty]);
  return <form className="space-y-3" onSubmit={handleSubmit(values => save.mutate(values))}>
    <label htmlFor={`answer-${question.id}`} className="block text-sm">Câu trả lời của bạn</label>
    <textarea id={`answer-${question.id}`} {...register("answerText")} maxLength={50000} disabled={disabled || save.isPending}
      aria-invalid={!!errors.answerText} aria-describedby={errors.answerText ? `answer-error-${question.id}` : undefined}
      className="min-h-40 w-full rounded-lg border border-[var(--color-border-default)] bg-surface-muted p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary" />
    {errors.answerText && <p id={`answer-error-${question.id}`} role="alert">{errors.answerText.message}</p>}
    {save.isError && <p role="alert">{getApiErrorMessage(save.error)}</p>}
    <Button type="submit" disabled={disabled || save.isPending}>{save.isPending ? "Đang lưu…" : "Lưu câu trả lời"}</Button>
    <p role="status" className="text-sm text-[var(--color-on-surface-variant)]">{isDirty ? "Có thay đổi chưa lưu" : question.answer ? "Đã lưu câu trả lời trên hệ thống" : ""}</p>
  </form>;
}
