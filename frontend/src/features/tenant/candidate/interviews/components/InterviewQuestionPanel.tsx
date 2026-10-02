import { useEffect } from "react";
import { ArrowLeft, ArrowRight, Bot, CloudUpload, Volume2 } from "lucide-react";
import type { AiAnswer, AiQuestion } from "@/api/types/aiInterview";
import { Button } from "@/components/ux/Button";
import { InterviewAnswerForm } from "./InterviewAnswerForm";
import { McqAnswerForm } from "./McqAnswerForm";

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
  const question = questions[index];
  useEffect(() => () => window.speechSynthesis?.cancel(), [question.id]);
  const mcq = !!question.options?.length;
  const last = index === questions.length - 1;
  return <>
    <div className="flex flex-col justify-between gap-4 rounded-xl bg-surface-card p-6 shadow-sm sm:flex-row sm:items-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Tiến độ câu hỏi</p>
        <h2 className="mt-0.5 text-xl font-semibold">Câu hỏi {pad(index + 1)} <span className="font-normal text-[var(--color-on-surface-variant)]">/ {pad(questions.length)}</span></h2>
      </div>
      <ul className="flex flex-wrap items-center gap-2" aria-label="Chủ đề câu hỏi">
        {question.stageTitle && <li className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-medium text-brand-primary">{question.stageTitle}</li>}
        {mcq && <li className="rounded-full bg-[color-mix(in_srgb,var(--color-tertiary)_10%,transparent)] px-3 py-1 text-xs font-medium text-[var(--color-tertiary)]">Trắc nghiệm</li>}
        {(question.skills ?? []).map(skill => <li key={skill} className="rounded-full bg-[var(--color-surface-container)] px-2.5 py-1 text-xs text-[var(--color-on-surface-variant)]">{skill}</li>)}
      </ul>
    </div>

    <section className="space-y-4 rounded-xl bg-surface-card p-6 shadow-sm sm:p-8" aria-labelledby={`question-${question.id}`}>
      <div className="flex items-center gap-3">
        <span className="grid size-8 place-items-center rounded-full bg-brand-primary text-[var(--color-on-primary)] shadow-sm"><Bot className="size-4" aria-hidden="true" /></span>
        <div>
          <p className="text-sm font-semibold text-brand-primary">AI Interviewer · {mcq ? "Mini Assessment" : "Câu hỏi phỏng vấn"}</p>
          <p className="text-xs text-[var(--color-on-surface-variant)]">{mcq ? question.multipleChoice ? "Chọn tất cả đáp án đúng" : "Chọn một đáp án đúng nhất" : question.questionRole === "FOLLOW_UP" ? "Câu hỏi bồi dựa trên câu trả lời vừa lưu" : "Trả lời theo yêu cầu của bài tập"}</p>
        </div>
      </div>
      <div className="rounded-lg bg-[var(--color-surface-container-low)] p-5">
        <p id={`question-${question.id}`} className="whitespace-pre-wrap text-base font-semibold leading-relaxed">{question.questionText}</p>
        {question.difficulty && <p className="mt-2 text-xs">Độ khó: {question.difficulty}</p>}
        {question.hint && <details className="mt-3 text-sm"><summary className="cursor-pointer">Xem gợi ý</summary><p className="mt-2 whitespace-pre-wrap">{question.hint}</p></details>}
      </div>
    </section>

    {question.responseMode === "speech" && "speechSynthesis" in window && <Button variant="secondary" onClick={() => {
      window.speechSynthesis.cancel(); const speech = new SpeechSynthesisUtterance(question.questionText);
      speech.lang = question.language === "English" ? "en-US" : question.language === "Japanese" ? "ja-JP" : "vi-VN";
      window.speechSynthesis.speak(speech);
    }}><Volume2 className="size-4" aria-hidden="true" />Nghe câu hỏi</Button>}

    <section className="space-y-5 rounded-xl bg-surface-card p-6 shadow-sm sm:p-8">
      {mcq
        ? <McqAnswerForm key={question.id} interviewId={interviewId} question={question} disabled={disabled} onDirty={onDirty} answerDuration={answerDuration} onSaved={answer => onSaved(question.id, answer)} />
        : <InterviewAnswerForm recordingEnabled={recordingEnabled} key={question.id} interviewId={interviewId} question={question} disabled={disabled} onDirty={onDirty} answerDuration={answerDuration}
            submitLabel={last ? "Lưu câu trả lời" : "Lưu & tiếp tục"}
            onSaved={answer => { onSaved(question.id, answer); if (!last) onSelect(index + 1); }} />}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-default)] pt-4">
        <Button variant="secondary" disabled={index === 0 || dirty} onClick={() => onSelect(index - 1)}><ArrowLeft className="size-4" aria-hidden="true" />Câu trước</Button>
        {dirty && <p role="status" className="text-sm text-[var(--color-on-surface-variant)]">Lưu câu trả lời trước khi chuyển câu.</p>}
        <Button variant="secondary" disabled={last || dirty} onClick={() => onSelect(index + 1)}>Câu tiếp theo<ArrowRight className="size-4" aria-hidden="true" /></Button>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-[color-mix(in_srgb,var(--color-secondary-container)_40%,transparent)] p-3 text-sm">
        <CloudUpload className="size-5 shrink-0 text-brand-primary" aria-hidden="true" />
        <p>Câu trả lời được lưu trên hệ thống sau mỗi lần lưu. Nếu mất kết nối, mở lại phiên để tiếp tục các câu đã lưu.</p>
      </div>
    </section>
  </>;
}
