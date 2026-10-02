import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ux/Button";
import type { AiAnswer, AiQuestion, SpeechCapture } from "@/api/types/aiInterview";
import { getApiErrorMessage } from "@/lib/axios";
import { candidateInterviewApi } from "../api/candidateInterviewApi";
import { SpeechAnswerControl } from "./SpeechAnswerControl";

const answerSchema = z.object({ answerText: z.string().trim().min(1, "Vui lòng nhập câu trả lời.").max(50000, "Câu trả lời tối đa 50.000 ký tự.") });

type Props = {
  interviewId: number;
  question: AiQuestion;
  disabled: boolean;
  onSaved: (answer: AiAnswer) => void;
  onDirty: (id: number, dirty: boolean) => void;
  answerDuration: () => number;
  submitLabel?: string;
  recordingEnabled?: boolean;
};

export function InterviewAnswerForm({ interviewId, question, disabled, onSaved, onDirty, answerDuration, recordingEnabled = false, submitLabel = "Lưu câu trả lời" }: Props) {
  const { register, handleSubmit, reset, getValues, setValue, formState: { errors, isDirty } } = useForm<z.infer<typeof answerSchema>>({
    resolver: zodResolver(answerSchema), defaultValues: { answerText: question.answer?.answerText ?? "" },
  });
  const [capture, setCapture] = useState<SpeechCapture | null>(null);
  const [recording, setRecording] = useState(false);
  const save = useMutation({
    mutationFn: ({ answerText }: z.infer<typeof answerSchema>) => capture && recordingEnabled
      ? candidateInterviewApi.audioAnswer(interviewId, question.id, answerText, answerDuration(), capture)
      : candidateInterviewApi.answer(interviewId, question.id, answerText, answerDuration(), capture?.metrics),
    onSuccess: answer => { reset({ answerText: answer.answerText ?? "" }); onSaved(answer); },
  });
  useEffect(() => { onDirty(question.id, isDirty || save.isPending || recording); }, [question.id, isDirty, save.isPending, recording, onDirty]);
  return <form className="space-y-3" onSubmit={handleSubmit(values => save.mutate(values))}>
    {question.responseMode === "speech" && <SpeechAnswerControl language={question.language} disabled={disabled || save.isPending || !!question.answer}
      onBusy={setRecording} onCapture={setCapture} onReset={() => { setCapture(null); setValue("answerText", "", { shouldDirty: true }); }}
      onTranscript={text => setValue("answerText", `${getValues("answerText")} ${text}`.trim(), { shouldDirty: true, shouldValidate: true })} />}
    <label htmlFor={`answer-${question.id}`} className="block text-sm">Câu trả lời của bạn</label>
    <textarea id={`answer-${question.id}`} {...register("answerText")} maxLength={50000} disabled={disabled || recording || save.isPending || !!question.difficulty && !!question.answer}
      aria-invalid={!!errors.answerText} aria-describedby={errors.answerText ? `answer-error-${question.id}` : undefined}
      className="min-h-40 w-full rounded-lg border border-[var(--color-border-default)] bg-surface-muted p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary" />
    {capture && <p className="text-xs text-[var(--color-on-surface-variant)]">Đã ghi {(capture.metrics.durationMs / 1000).toFixed(1)} giây. {recordingEnabled ? "Audio và transcript sẽ gửi cùng câu trả lời." : "Chỉ gửi transcript và tín hiệu lời nói; audio không lưu trên server."}</p>}
    {errors.answerText && <p id={`answer-error-${question.id}`} role="alert">{errors.answerText.message}</p>}
    {save.isError && <p role="alert">{getApiErrorMessage(save.error)}</p>}
    <Button type="submit" disabled={disabled || recording || save.isPending || !!question.difficulty && !!question.answer}>{save.isPending ? "Đang lưu…" : submitLabel}</Button>
    <p role="status" className="text-sm text-[var(--color-on-surface-variant)]">{isDirty ? "Có thay đổi chưa lưu" : question.answer ? "Đã lưu câu trả lời trên hệ thống" : ""}</p>
  </form>;
}
