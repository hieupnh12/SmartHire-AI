import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ux/Card";
import type { CandidateApplicationStage } from "@/features/tenant/candidate/dashboard/types/dashboard";

type ApplicationStatusTimelineProps = {
  roleTitle: string;
  statusLabel: string;
  stages: CandidateApplicationStage[];
};

export function ApplicationStatusTimeline({
  roleTitle,
  statusLabel,
  stages,
}: ApplicationStatusTimelineProps) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#0f172a]">Trạng thái ứng tuyển</h2>
          <p className="mt-1 text-sm text-[#64748b]">{roleTitle}</p>
        </div>
        <span className="rounded-full bg-[#fef9c3] px-3 py-1 text-xs font-semibold text-[#854d0e]">
          {statusLabel}
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-5">
        {stages.map((stage) => (
          <div key={stage.label} className="min-w-0 rounded-[8px] border border-[#e2e8f0] bg-[#f8fafc] p-3">
            <div
              className={`mb-3 flex h-8 w-8 items-center justify-center rounded-full ${
                stage.state === "done"
                  ? "bg-[#dcfce7] text-[#16a34a]"
                  : stage.state === "active"
                    ? "bg-[#dbeafe] text-[#2563eb]"
                    : "bg-white text-[#94a3b8]"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="text-xs font-semibold leading-5 text-[#334155]">{stage.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}