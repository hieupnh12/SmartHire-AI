import { lazy, Suspense } from "react";
const CandidateCodingStudio = lazy(() => import("./CandidateCodingStudio").then(module => ({ default: module.CandidateCodingStudio })));
import { RotateCcw } from "lucide-react";
import type { CandidateQuestion, SavedAnswer } from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { Skeleton } from "@/components/ux/Skeleton";
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[var(--color-on-surface-variant)]">
          {multiple ? "Chọn tất cả các đáp án đúng (có thể chọn nhiều phương án):" : "Chọn một phương án trả lời đúng nhất:"}
        </p>
        {hasAnswer(answer) && !locked && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-danger)]"
            onClick={() => onChange(multiple ? { questionId, selectedOptionIds: [] } : { questionId, selectedOptionId: null })}
          >
            <RotateCcw className="size-3.5" aria-hidden="true" /> Bỏ chọn
          </Button>
        )}
      </div>

      <div className="space-y-3" role={multiple ? "group" : "radiogroup"} aria-label="Các phương án trả lời">
        {question.options.map((option, i) => {
          const isSelected = selected(option.id);
          const letter = String.fromCharCode(65 + i);
          return (
            <label
              key={option.id}
              className={`group flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4.5 transition-all ${
                locked ? "cursor-not-allowed opacity-75" : ""
              } ${
                isSelected
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]/60 shadow-xs ring-1 ring-[var(--color-primary)]"
                  : "border-[var(--color-border-default)] bg-white hover:border-slate-400 hover:bg-slate-50/70"
              }`}
            >
              <input
                className="sr-only"
                type={multiple ? "checkbox" : "radio"}
                name={`question-${questionId}`}
                value={option.id}
                checked={isSelected}
                disabled={locked}
                onChange={(event) =>
                  onChange(
                    multiple
                      ? {
                          questionId,
                          selectedOptionIds: event.target.checked
                            ? [...(answer?.selectedOptionIds ?? []), option.id]
                            : (answer?.selectedOptionIds ?? []).filter((id) => id !== option.id),
                        }
                      : { questionId, selectedOptionId: option.id }
                  )
                }
              />
              <span
                className={`flex size-7.5 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-colors ${
                  isSelected
                    ? "bg-[var(--color-primary)] text-white shadow-xs"
                    : "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] group-hover:bg-slate-200"
                }`}
              >
                {letter}
              </span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--color-on-surface)]">
                {option.optionText}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
