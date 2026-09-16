import { Check, Circle, ArrowRight } from "lucide-react";
import { Card } from "@/components/ux/Card";
import type { CandidateApplicationStage } from "@/features/tenant/candidate/dashboard/types/dashboard";
import { cn } from "@/lib/utils";

type ApplicationStatusTimelineProps = {
  roleTitle: string;
  statusLabel: string;
  stages: CandidateApplicationStage[];
};

export function ApplicationStatusTimeline({ roleTitle, statusLabel, stages }: ApplicationStatusTimelineProps) {
  return (
    <Card className="min-w-0 rounded-xl border-[var(--color-border-default)] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-primary">Hồ sơ nổi bật</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--color-on-surface)]">Trạng thái ứng tuyển</h2>
          <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{roleTitle}</p>
        </div>
        <span className="rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-brand-primary">{statusLabel}</span>
      </div>

      <ol className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Tiến trình ứng tuyển">
        {stages.map((stage, index) => {
          const done = stage.state === "done";
          const active = stage.state === "active";
          const StageIcon = done ? Check : active ? ArrowRight : Circle;
          return (
            <li key={stage.label} className={cn("relative min-w-0 rounded-lg border p-3", active ? "border-[var(--color-primary)] bg-[var(--color-surface-container-low)] ring-1 ring-[var(--color-primary)]" : "border-[var(--color-border-default)] bg-[var(--color-surface-alt)]")} aria-current={active ? "step" : undefined}>
              <div className="relative z-10 flex items-center gap-3 sm:block">
                <span className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-full border-2 bg-white",
                  done
                    ? "border-emerald-500 text-emerald-600"
                    : active
                      ? "border-brand-primary text-brand-primary"
                      : "border-[var(--color-outline-variant)] text-[var(--color-outline)]",
                )}>
                  <StageIcon className="size-4" aria-hidden="true" />
                </span>
                <div className="sm:mt-3">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-outline)]">Bước {index + 1}</span>
                  <span className={cn("mt-0.5 block text-sm font-semibold leading-5", active ? "text-brand-primary" : "text-[var(--color-on-surface)]")}>{stage.label}</span>
                  <span className="mt-1 block text-xs text-[var(--color-on-surface-variant)]">{done ? "Hoàn thành" : active ? "Đang đánh giá" : "Chưa bắt đầu"}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
