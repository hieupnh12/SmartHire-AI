import { CheckCircle2, Circle, Lock, Route, Sparkles } from "lucide-react";
import type { AiQuestion, RoadmapStep } from "@/api/types/aiInterview";
import { useT, type TranslateFn } from "@/i18n";
import { cn } from "@/lib/utils";

type Props = { steps: RoadmapStep[] | null | undefined; questions: AiQuestion[]; current: number | null; onSelect?: (index: number) => void };
type Process = { title: string; questionCount: number; indices: number[] };

function buildProcesses(steps: RoadmapStep[] | null | undefined, questions: AiQuestion[], t: TranslateFn) {
  const defaultKnowledge = t("candidate.assess.interviews.processNav.defaultKnowledge");
  const defaultInterview = t("candidate.assess.interviews.processNav.defaultInterview");
  if (steps?.length) {
    let offset = 0;
    return steps.map(step => {
      const titled = questions.some(question => question.stageTitle);
      const indices = titled ? questions.flatMap((question, index) => question.stageTitle === step.title ? [index] : [])
        : Array.from({ length: step.questionCount }, (_, index) => offset + index).filter(index => index < questions.length);
      offset += step.questionCount;
      return { title: step.title || (step.kind === "MCQ" ? defaultKnowledge : defaultInterview), questionCount: Math.max(step.questionCount, indices.length), indices };
    });
  }
  const groups: Process[] = [];
  questions.forEach((question, index) => {
    const title = question.stageTitle || (question.options?.length ? defaultKnowledge : defaultInterview);
    const previous = groups.at(-1);
    if (previous?.title === title) previous.indices.push(index);
    else groups.push({ title, questionCount: 1, indices: [index] });
  });
  return groups;
}

const isAnswered = (question: AiQuestion) => Boolean(question.answer?.answerText?.trim());

export function InterviewProcessNavigator({ steps, questions, current, onSelect }: Props) {
  const t = useT();
  const processes = buildProcesses(steps, questions, t);
  if (!processes.length) return null;
  return <section className="overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] shadow-[var(--shadow-card)]" aria-labelledby="process-title">
    <div className="flex flex-col justify-between gap-3 border-b border-[var(--color-border-default)] bg-[var(--color-surface-container-low)]/45 px-4 py-3 lg:flex-row lg:items-center">
      <div className="flex items-center gap-2">
        <Route className="size-5 text-[var(--color-primary)]" aria-hidden="true" />
        <div>
          <h2 id="process-title" className="text-sm font-semibold">{t("candidate.assess.interviews.processNav.title")}</h2>
          <p className="text-xs text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.processNav.subtitle")}</p>
        </div>
      </div>
      <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)] lg:self-auto">
        <Sparkles className="size-3.5" aria-hidden="true" />{t("candidate.assess.interviews.processNav.processCountBadge", { count: processes.length })}
      </span>
    </div>
    <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-6">
      {processes.map((process, index) => {
        const active = process.indices.includes(current ?? -1);
        const done = process.indices.length > 0 && process.indices.every(questionIndex => isAnswered(questions[questionIndex]));
        const locked = !active && !done && process.indices.length > 0 && process.indices[0] > (current ?? 0) && !onSelect;
        const target = process.indices.find(questionIndex => !isAnswered(questions[questionIndex])) ?? process.indices[0];
        return <button key={`${process.title}-${index}`} type="button" disabled={!onSelect || locked} onClick={() => target != null && onSelect?.(target)} aria-current={active ? "step" : undefined}
          className={cn("min-h-24 rounded-xl border p-3 text-left transition-colors disabled:cursor-default", active ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-sm ring-1 ring-brand-primary/20" : done ? "border-emerald-200 bg-emerald-50/50" : "border-[var(--color-border-default)] bg-white enabled:hover:border-[var(--color-primary)]/50 enabled:hover:bg-[var(--color-primary-subtle)]")}>
          <div className="flex items-center justify-between gap-2">
            {done ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="size-3.5" aria-hidden="true" />{t("candidate.assess.interviews.processNav.saved")}</span>
            ) : active ? (
              <span className="rounded bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-on-primary)]">{t("candidate.assess.interviews.processNav.inProgress")}</span>
            ) : locked ? (
              <Lock className="size-3.5 text-[var(--color-outline)]" aria-hidden="true" />
            ) : (
              <span className="text-[10px] text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.processNav.upcoming")}</span>
            )}
            <span className="font-mono text-[10px] text-[var(--color-on-surface-variant)]">{String(index + 1).padStart(2, "0")}</span>
          </div>
          <p className={cn("mt-2 truncate text-xs font-semibold", active && "text-[var(--color-primary)]")}>
            {t("candidate.assess.interviews.processNav.processItemTitle", { index: index + 1, title: process.title })}
          </p>
          <p className="mt-1 text-[11px] text-[var(--color-on-surface-variant)]">
            {t("candidate.assess.interviews.processNav.questionCount", { count: process.questionCount })}
          </p>
        </button>;
      })}
    </div>
    <div className="flex items-center gap-2 border-t border-[var(--color-border-default)] px-4 py-3 text-xs text-[var(--color-on-surface-variant)]">
      <Circle className="size-3 text-[var(--color-primary)]" aria-hidden="true" />{t("candidate.assess.interviews.processNav.footerNote")}
    </div>
  </section>;
}
