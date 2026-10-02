import type { ReactNode } from "react";
import { CheckCircle2, Circle, FileQuestion, Loader2 } from "lucide-react";
import type { AiQuestion, RoadmapStep } from "@/api/types/aiInterview";
import { cn } from "@/lib/utils";
import { formatRemaining } from "../hooks/useCountdown";
import { useElapsed } from "../hooks/useElapsed";

type Props = {
  steps: RoadmapStep[] | null | undefined;
  questions: AiQuestion[];
  current: number | null;
  openedAt?: number;
  durationMinutes?: number | null;
  onSelect?: (index: number) => void;
};

type Group = { title: string | null; mcq: boolean; items: { question: AiQuestion; index: number }[] };

function groupQuestions(questions: AiQuestion[], steps?: RoadmapStep[] | null): Group[] {
  if (steps?.length && steps.reduce((sum, step) => sum + step.questionCount, 0) === questions.length) {
    let offset = 0;
    return steps.map(step => {
      const items = questions.slice(offset, offset + step.questionCount).map((question, i) => ({ question, index: offset + i }));
      offset += step.questionCount;
      return { title: step.title, mcq: step.kind === "MCQ", items };
    });
  }
  const groups: Group[] = [];
  questions.forEach((question, index) => {
    const mcq = !!question.options?.length;
    const last = groups.at(-1);
    if (last && last.title === (question.stageTitle ?? null) && last.mcq === mcq) last.items.push({ question, index });
    else groups.push({ title: question.stageTitle ?? null, mcq, items: [{ question, index }] });
  });
  return groups;
}

const answered = (q: AiQuestion) => !!q.answer?.answerText?.trim();
const pad = (n: number) => String(n).padStart(2, "0");
const muted = "text-[var(--color-on-surface-variant)]";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  return m > 0 ? `${m}m ${seconds % 60}s` : `${seconds}s`;
}

export function InterviewRoadmap({ steps, questions, current, openedAt, durationMinutes, onSelect }: Props) {
  const done = questions.filter(answered).length;
  const percent = questions.length ? Math.round((done / questions.length) * 100) : 0;
  const estimate = durationMinutes && questions.length ? Math.max(1, Math.round(durationMinutes / questions.length)) : null;
  let openNumber = 0;
  return <section className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-surface-card p-5 shadow-[var(--shadow-card)]" aria-labelledby="roadmap-title">
    <div className="flex items-center justify-between gap-2">
      <h2 id="roadmap-title" className="text-lg font-semibold">Lộ trình phỏng vấn</h2>
      {questions.length > 0 && <span className="rounded bg-[var(--color-primary-soft)] px-2 py-0.5 text-xs font-semibold text-brand-primary">{percent}% Hoàn thành</span>}
    </div>
    {questions.length > 0 ? <ol className="space-y-3">
      {groupQuestions(questions, steps).map((group, g) => {
        if (group.mcq) return <li key={`mcq-${g}`}><MiniBlock count={group.items.length} after={openNumber}
          done={group.items.filter(i => answered(i.question)).length} active={group.items.some(i => i.index === current)}
          onClick={onSelect && (() => onSelect(group.items[0].index))} /></li>;
        openNumber += 1;
        const active = group.items.find(item => item.index === current);
        const completed = group.items.filter(item => answered(item.question)).length;
        const target = active ?? group.items.find(item => !answered(item.question)) ?? group.items[0];
        const state = active ? "current" : completed === group.items.length ? "done" : "todo";
        const duration = group.items.reduce((sum, item) => sum + (item.question.answer?.answerDuration ?? 0), 0);
        return <li key={`stage-${g}`}>
            <QuestionItem number={openNumber} title={group.title} state={state} onClick={onSelect && (() => onSelect(target.index))}>
              {group.items.length > 1 && <span>{completed}/{group.items.length} câu đã lưu · </span>}
              {state === "current" && openedAt != null
                ? <Answering since={openedAt} base={duration} />
                : state === "done"
                  ? duration ? `Thời lượng: ${formatDuration(duration)}` : "Đã lưu câu trả lời"
                  : estimate ? `Ước tính: ~${estimate * group.items.length} phút` : null}
            </QuestionItem>
          </li>;
      })}
    </ol> : steps?.length ? <ol className="space-y-3">
      {steps.map((step, i) => {
        if (step.kind === "MCQ") return <li key={i}><MiniBlock count={step.questionCount} after={openNumber} /></li>;
        openNumber += 1;
        return <li key={i}><QuestionItem number={openNumber} title={step.title} state="todo">{step.questionCount} câu hỏi</QuestionItem></li>;
      })}
    </ol> : <p className={cn("text-sm", muted)}>Lộ trình hiển thị khi bộ câu hỏi sẵn sàng.</p>}
  </section>;
}

function Answering({ since, base }: { since: number; base: number }) {
  const elapsed = useElapsed(since);
  return <>Đang trả lời ({formatRemaining(base + elapsed)})...</>;
}

const STATE_LABEL = { done: "Đã nộp", current: "Hiện tại", todo: "Chưa làm" } as const;

function QuestionItem({ number, title, state, onClick, children }: {
  number: number; title: string | null | undefined; state: keyof typeof STATE_LABEL; onClick?: () => void; children?: ReactNode;
}) {
  const icon = state === "done"
    ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 fill-emerald-600 text-white" aria-hidden="true" />
    : state === "current"
      ? <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-brand-primary" aria-hidden="true" />
      : <Circle className={cn("mt-0.5 size-5 shrink-0", muted)} aria-hidden="true" />;
  return <button type="button" onClick={onClick} disabled={!onClick} aria-current={state === "current" ? "step" : undefined}
    className={cn("flex min-h-11 w-full items-start justify-between gap-2 rounded-xl border p-3 text-left transition-colors disabled:cursor-default",
      state === "current"
        ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] ring-1 ring-brand-primary/20"
        : "border-transparent bg-[var(--color-surface-container-low)] enabled:hover:border-[var(--color-border-default)] enabled:hover:bg-[var(--color-surface-container)]")}>
    <span className="flex min-w-0 items-start gap-3">
      {icon}
      <span className="min-w-0">
        <span className={cn("block text-sm font-semibold", state === "current" ? "text-brand-primary" : state === "todo" && muted)}>
          {pad(number)}. {title ?? "Câu hỏi phỏng vấn"}
        </span>
        {children && <span className={cn("block text-xs", state === "current" ? "text-brand-primary" : muted)}>{children}</span>}
      </span>
    </span>
    <span className={cn("shrink-0 rounded px-2 py-0.5 text-xs font-medium",
      state === "done" ? "bg-emerald-50 text-emerald-700"
        : state === "current" ? "bg-[var(--color-primary-soft)] font-semibold text-brand-primary"
          : cn("bg-[var(--color-surface-container)]", muted))}>{STATE_LABEL[state]}</span>
  </button>;
}

function MiniBlock({ count, after, done, active, onClick }: { count: number; after: number; done?: number; active?: boolean; onClick?: () => void }) {
  return <button type="button" onClick={onClick} disabled={!onClick} aria-current={active ? "step" : undefined}
    className={cn("flex min-h-11 w-full items-start gap-3 rounded-xl border border-transparent bg-[var(--color-primary-soft)] p-3 text-left disabled:cursor-default",
      active && "ring-2 ring-brand-primary")}>
    <FileQuestion className="mt-0.5 size-5 shrink-0 text-brand-primary" aria-hidden="true" />
    <span className="min-w-0">
      <span className="block text-sm font-semibold text-brand-primary">Mini Assessment (Trắc nghiệm)</span>
      <span className={cn("block text-xs", muted)}>
        {count} câu hỏi nhanh{after > 0 ? ` ngay sau chặng ${after}` : ""}{done ? ` · đã làm ${done}/${count}` : ""}
      </span>
    </span>
  </button>;
}
