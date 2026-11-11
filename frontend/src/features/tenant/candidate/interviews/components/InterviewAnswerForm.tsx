import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ux/Button";
import type { AiAnswer, AiQuestion, SpeechCapture } from "@/api/types/aiInterview";
import { useT, type TranslateFn } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { candidateInterviewApi } from "../api/candidateInterviewApi";
import { SpeechAnswerControl } from "./SpeechAnswerControl";

function createAnswerSchema(t: TranslateFn) {
  return z.object({
    answerText: z
      .string()
      .trim()
      .min(1, t("candidate.assess.interviews.answerForm.validationRequired"))
      .max(50000, t("candidate.assess.interviews.answerForm.validationMax")),
  });
}

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

export function InterviewAnswerForm({ interviewId, question, disabled, onSaved, onDirty, answerDuration, recordingEnabled = false, submitLabel }: Props) {
  const t = useT();
  const answerSchema = useMemo(() => createAnswerSchema(t), [t]);
  const resolvedSubmitLabel = submitLabel ?? t("candidate.assess.interviews.answerForm.defaultSubmit");
  const { register, handleSubmit, reset, getValues, setValue, formState: { errors, isDirty } } = useForm<z.infer<typeof answerSchema>>({
    resolver: zodResolver(answerSchema), defaultValues: { answerText: question.answer?.answerText ?? "" },
  });
  const [capture, setCapture] = useState<SpeechCapture | null>(null);
  const [recording, setRecording] = useState(false);
  const save = useMutation({
    mutationFn: ({ answerText }: z.infer<typeof answerSchema>) => capture && recordingEnabled
      ? candidateInterviewApi.audioAnswer(interviewId, question.id, answerText, answerDuration(), capture)
      : candidateInterviewApi.answer(interviewId, question.id, answerText, answerDuration(), capture?.metrics),
    onSuccess: answer => { setCapture(null); reset({ answerText: answer.answerText ?? "" }); onSaved(answer); },
  });
  useEffect(() => { onDirty(question.id, isDirty || save.isPending || recording); }, [question.id, isDirty, save.isPending, recording, onDirty]);
  return <form className="space-y-3" onSubmit={handleSubmit(values => save.mutate(values))}>
    {question.responseMode === "speech" && <SpeechAnswerControl language={question.language} disabled={disabled || save.isPending || !!question.answer}
      onBusy={setRecording} onCapture={setCapture} onReset={() => { setCapture(null); setValue("answerText", "", { shouldDirty: true }); }}
      onTranscript={text => setValue("answerText", `${getValues("answerText")} ${text}`.trim(), { shouldDirty: true, shouldValidate: true })} />}
    <label htmlFor={`answer-${question.id}`} className="sr-only">{t("candidate.assess.interviews.answerForm.label")}</label>
    <textarea id={`answer-${question.id}`} {...register("answerText")} maxLength={50000} disabled={disabled || recording || save.isPending || !!question.difficulty && !!question.answer}
      aria-invalid={!!errors.answerText} aria-describedby={errors.answerText ? `answer-error-${question.id}` : undefined}
      placeholder={t("candidate.assess.interviews.answerForm.placeholder")}
      className="min-h-52 w-full resize-y rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4 leading-7 placeholder:text-[var(--color-outline)] focus:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary" />
    {capture && (
      <p className="text-xs text-[var(--color-on-surface-variant)]">
        {recordingEnabled
          ? t("candidate.assess.interviews.answerForm.capturedWithRecording", { seconds: (capture.metrics.durationMs / 1000).toFixed(1) })
          : t("candidate.assess.interviews.answerForm.capturedTranscriptOnly", { seconds: (capture.metrics.durationMs / 1000).toFixed(1) })}
      </p>
    )}
    {errors.answerText && <p id={`answer-error-${question.id}`} role="alert">{errors.answerText.message}</p>}
    {save.isError && <p role="alert">{getApiErrorMessage(save.error)}</p>}
    <Button type="submit" disabled={disabled || recording || save.isPending || !!question.difficulty && !!question.answer}>
      {save.isPending ? t("candidate.assess.interviews.answerForm.evaluatingNext") : resolvedSubmitLabel}
    </Button>
    <p role="status" className="text-sm text-[var(--color-on-surface-variant)]">
      {isDirty
        ? t("candidate.assess.interviews.answerForm.dirtyStatus")
        : question.answer
          ? t("candidate.assess.interviews.answerForm.savedStatus")
          : ""}
    </p>
  </form>;
}
