import { lazy, Suspense } from "react";
const CandidateCodingStudio = lazy(() => import("./CandidateCodingStudio").then(module => ({ default: module.CandidateCodingStudio })));
import { RotateCcw } from "lucide-react";
import type { CandidateQuestion, SavedAnswer } from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { Skeleton } from "@/components/ux/Skeleton";
import { assessmentMuted } from "@/components/ux/assessmentUi";
import { hasAnswer } from "../utils/hasAnswer";
import { CandidateEssayWorkspace } from "./CandidateEssayWorkspace";

export function AssessmentAnswerInput({ submissionId, question, answer, onChange, locked, number, draftSavedAt, draftError, onSave, saving }: {
  submissionId: number; question: CandidateQuestion; answer?: SavedAnswer; onChange: (answer: SavedAnswer) => void; locked: boolean;
  number?: number; draftSavedAt?: number; draftError?: boolean; onSave?: () => Promise<void>; saving?: boolean;
}) {
  const questionId = question.id;
  if (question.questionType === "CODING") {
    return (
      <div className="h-full min-h-0">
        <Suspense
          fallback={
            <div className="flex h-full w-full flex-col gap-3 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4" role="status" aria-busy="true">
              <div className="flex items-center justify-between border-b border-[var(--color-border-default)] pb-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
              <Skeleton className="h-full min-h-[320px] w-full flex-1 rounded-xl" />
              <span className="sr-only">Đang tải trình soạn thảo code…</span>
            </div>
          }
        >
          <CandidateCodingStudio
            key={questionId}
            submissionId={submissionId}
            question={question}
            answer={answer}
            onChange={onChange}
            locked={locked}
            onSave={onSave}
            saving={saving}
          />
        </Suspense>
      </div>
    );
  }
  if (question.questionType === "ESSAY") {
    return (
      <CandidateEssayWorkspace
        question={question}
        answer={answer}
        onChange={onChange}
        locked={locked}
        number={number}
        draftSavedAt={draftSavedAt}
        draftError={draftError}
      />
    );
  }

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
