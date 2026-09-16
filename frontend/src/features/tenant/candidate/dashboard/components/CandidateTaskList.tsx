import { ArrowUpRight, Bot, ClipboardList, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ux/Card";
import type { CandidateTask, CandidateTaskIcon } from "@/features/tenant/candidate/dashboard/types/dashboard";

const TASK_ICONS: Record<CandidateTaskIcon, typeof ClipboardList> = {
  assessment: ClipboardList,
  interview: Bot,
  cv: FileText,
};

const TASK_ICON_TONES: Record<CandidateTaskIcon, string> = {
  assessment: "bg-amber-50 text-amber-600",
  interview: "bg-teal-50 text-teal-600",
  cv: "bg-emerald-50 text-emerald-600",
};

type CandidateTaskListProps = { tasks: CandidateTask[] };

export function CandidateTaskList({ tasks }: CandidateTaskListProps) {
  return (
    <Card className="min-w-0 rounded-[var(--radius-default)] border-l-4 border-l-brand-primary p-5 shadow-none sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-primary">Ưu tiên</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-on-surface)]">Hành động tiếp theo</h2>
        </div>
        <span className="rounded-full bg-[var(--container-neutral)] px-2.5 py-1 text-xs font-semibold text-[var(--color-on-surface-variant)]">{tasks.length} việc</span>
      </div>
      <div className="mt-5 space-y-2">
        {tasks.map((task, index) => {
          const Icon = TASK_ICONS[task.icon];
          return (
            <Link key={task.title} to={task.to} className="group flex min-h-16 items-center gap-3 rounded-[var(--radius-md)] border border-transparent p-3 transition-[background-color,border-color] duration-[var(--motion-fast)] hover:border-brand-primary/10 hover:bg-[var(--color-primary-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">
              <span className={`grid size-10 shrink-0 place-items-center rounded-[var(--radius-default)] ${TASK_ICON_TONES[task.icon]}`}>
                <Icon className="size-[18px]" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                {index === 0 && <span className="mb-1 block text-xs font-semibold text-[var(--color-primary-hover)]">01 / Ưu tiên hoàn thành</span>}
                <span className="block text-sm font-semibold text-[var(--color-on-surface)]">{task.title}</span>
                <span className="mt-1 block text-xs leading-5 text-[var(--color-on-surface-variant)]">{task.meta}</span>
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-[var(--color-outline)] transition-colors group-hover:text-brand-primary" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
