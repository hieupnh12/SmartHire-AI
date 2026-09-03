import { Link } from "react-router-dom";
import { ArrowRight, Bot, ClipboardList, FileText } from "lucide-react";
import { Card } from "@/components/ux/Card";
import type { CandidateTask, CandidateTaskIcon } from "@/features/tenant/candidate/dashboard/types/dashboard";

const TASK_ICONS: Record<CandidateTaskIcon, typeof ClipboardList> = {
  assessment: ClipboardList,
  interview: Bot,
  cv: FileText,
};

type CandidateTaskListProps = {
  tasks: CandidateTask[];
};

export function CandidateTaskList({ tasks }: CandidateTaskListProps) {
  return (
    <Card>
      <h2 className="font-display text-lg font-semibold text-[#0f172a]">Việc cần làm</h2>
      <div className="mt-4 space-y-3">
        {tasks.map((task) => {
          const Icon = TASK_ICONS[task.icon];
          return (
            <Link
              key={task.title}
              to={task.to}
              className="flex items-start gap-3 rounded-[8px] border border-[#e2e8f0] bg-white p-3 transition-colors hover:bg-[#f8fafc]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#f0fdfa] text-[#0f766e]">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#0f172a]">{task.title}</span>
                <span className="mt-1 block text-xs leading-5 text-[#64748b]">{task.meta}</span>
              </span>
              <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-[#94a3b8]" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </Card>
  );
}