import { useEffect } from "react";
import { ArrowLeft, ArrowRight, Bot, CheckCircle2, CloudUpload, Lightbulb, Timer, Volume2 } from "lucide-react";
import type { AiAnswer, AiQuestion } from "@/api/types/aiInterview";
import { Button } from "@/components/ux/Button";
import { useT } from "@/i18n";
import { InterviewAnswerForm } from "./InterviewAnswerForm";
import { McqAnswerForm } from "./McqAnswerForm";
import { getBrowserVoices, resolveBestVoice, prepareCleanSpeechText } from "../utils/speechVoiceUtils";

type Props = {
  interviewId: number;
  questions: AiQuestion[];
  index: number;
  disabled: boolean;
  dirty: boolean;
  onSelect: (index: number) => void;
  onSaved: (questionId: number, answer: AiAnswer) => void;
  onDirty: (id: number, dirty: boolean) => void;
  answerDuration: () => number;
  recordingEnabled?: boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");

export function InterviewQuestionPanel({ interviewId, questions, index, disabled, dirty, onSelect, onSaved, onDirty, answerDuration, recordingEnabled }: Props) {
  const t = useT();
  const question = questions[index];
  useEffect(() => () => window.speechSynthesis?.cancel(), [question.id]);
  const mcq = !!question.options?.length;
  const last = index === questions.length - 1;
  return <section className="overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-surface-card shadow-[var(--shadow-card)]" aria-label={t("candidate.assess.interviews.questionPanel.ariaLabel", { current: index + 1, total: questions.length })}>
    <div className="flex flex-col justify-between gap-4 border-b border-[var(--color-border-default)] bg-[var(--color-surface-container-low)]/45 p-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--color-primary)] text-base font-bold text-[var(--color-on-primary)]">Q{index + 1}</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">{question.stageTitle ?? t("candidate.assess.interviews.questionPanel.defaultStage")}</p>
          <h2 className="mt-0.5 text-base font-semibold">
            {t("candidate.assess.interviews.questionPanel.questionHeadingPrefix", { current: pad(index + 1) })}{" "}
            <span className="font-normal text-[var(--color-on-surface-variant)]">/ {pad(questions.length)}</span>
          </h2>
        </div>
      </div>
      <ul className="flex flex-wrap items-center gap-2" aria-label={t("candidate.assess.interviews.questionPanel.topicsAria")}>
        {question.stageTitle && <li className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-medium text-brand-primary">{question.stageTitle}</li>}
        {mcq && <li className="rounded-full bg-[color-mix(in_srgb,var(--color-tertiary)_10%,transparent)] px-3 py-1 text-xs font-medium text-[var(--color-tertiary)]">{t("candidate.assess.interviews.questionPanel.mcqBadge")}</li>}
        {(question.skills ?? []).map(skill => <li key={skill} className="rounded-full bg-[var(--color-surface-container)] px-2.5 py-1 text-xs text-[var(--color-on-surface-variant)]">{skill}</li>)}
      </ul>
    </div>

    <div className="space-y-4 border-b border-[var(--color-border-default)] p-5 sm:p-6" aria-labelledby={`question-${question.id}`}>
      <div className="flex items-center gap-3">
        <span className="grid size-8 place-items-center rounded-full bg-brand-primary text-[var(--color-on-primary)] shadow-sm"><Bot className="size-4" aria-hidden="true" /></span>
        <div>
          <p className="text-sm font-semibold text-brand-primary">
            {t("candidate.assess.interviews.questionPanel.aiHeaderTitle")} · {mcq ? t("candidate.assess.interviews.questionPanel.aiKindMini") : t("candidate.assess.interviews.questionPanel.aiKindInterview")}
          </p>
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            {mcq
              ? question.multipleChoice
                ? t("candidate.assess.interviews.questionPanel.hintMultiChoice")
                : t("candidate.assess.interviews.questionPanel.hintSingleChoice")
              : question.responseMode === "speech"
                ? t("candidate.assess.interviews.questionPanel.hintSpeechOrText")
                : t("candidate.assess.interviews.questionPanel.hintText")}
          </p>
        </div>
      </div>
      <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-5 sm:p-6">
        <p id={`question-${question.id}`} className="whitespace-pre-wrap text-base font-semibold leading-7 sm:text-lg">{question.questionText}</p>
        {!mcq && (
          <p className="mt-4 flex items-start gap-2 border-t border-[var(--color-border-default)] pt-3 text-xs text-[var(--color-on-surface-variant)]">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-brand-primary" aria-hidden="true" />
            {t("candidate.assess.interviews.questionPanel.openTip")}
          </p>
        )}
        {question.difficulty && <p className="mt-2 text-xs">{t("candidate.assess.interviews.questionPanel.difficultyLabel", { difficulty: question.difficulty })}</p>}
        {question.hint && <details className="mt-3 text-sm"><summary className="cursor-pointer">{t("candidate.assess.interviews.questionPanel.showHint")}</summary><p className="mt-2 whitespace-pre-wrap">{question.hint}</p></details>}
      </div>
    </div>

    {question.responseMode === "speech" && "speechSynthesis" in window && <Button variant="secondary" onClick={async () => {
      window.speechSynthesis.cancel();
      const voices = await getBrowserVoices();
      const resolved = resolveBestVoice(question.language, voices);
      const cleanText = prepareCleanSpeechText(question.questionText);
      const speech = new SpeechSynthesisUtterance(cleanText);
      speech.lang = resolved.lang;
      if (resolved.voice) speech.voice = resolved.voice;
      speech.rate = resolved.rate;
      window.speechSynthesis.speak(speech);
    }}><Volume2 className="size-4" aria-hidden="true" />{t("candidate.assess.interviews.questionPanel.listenQuestion")}</Button>}

    <div className="space-y-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{t("candidate.assess.interviews.questionPanel.yourAnswerTitle")}</p>
          <p className="text-xs text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.questionPanel.yourAnswerDesc")}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-medium text-brand-primary">
          <Timer className="size-3.5" aria-hidden="true" />{t("candidate.assess.interviews.questionPanel.autoTimedBadge")}
        </span>
      </div>
      {mcq
        ? <McqAnswerForm key={question.id} interviewId={interviewId} question={question} disabled={disabled} onDirty={onDirty} answerDuration={answerDuration} onSaved={answer => onSaved(question.id, answer)} />
        : <InterviewAnswerForm recordingEnabled={recordingEnabled} key={question.id} interviewId={interviewId} question={question} disabled={disabled} onDirty={onDirty} answerDuration={answerDuration}
            submitLabel={last ? t("candidate.assess.interviews.questionPanel.submitLast") : t("candidate.assess.interviews.questionPanel.submitNext")}
            onSaved={answer => { onSaved(question.id, answer); if (!last) onSelect(index + 1); }} />}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-default)] pt-4">
        <Button variant="secondary" disabled={index === 0 || dirty} onClick={() => onSelect(index - 1)}>
          <ArrowLeft className="size-4" aria-hidden="true" />{t("candidate.assess.interviews.questionPanel.prevQuestion")}
        </Button>
        {dirty && <p role="status" className="text-sm text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.questionPanel.saveBeforeLeaving")}</p>}
        <Button variant="secondary" disabled={last || dirty} onClick={() => onSelect(index + 1)}>
          {t("candidate.assess.interviews.questionPanel.nextQuestion")}<ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-[color-mix(in_srgb,var(--color-secondary-container)_40%,transparent)] p-3 text-sm">
        {question.answer ? <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-hidden="true" /> : <CloudUpload className="size-5 shrink-0 text-brand-primary" aria-hidden="true" />}
        <p>
          {question.answer
            ? t("candidate.assess.interviews.questionPanel.savedStatus")
            : t("candidate.assess.interviews.questionPanel.unsavedStatus")}{" "}
          {t("candidate.assess.interviews.questionPanel.offlineHint")}
        </p>
      </div>
    </div>
  </section>;
}
