import { Bot, BriefcaseBusiness, FileText } from "lucide-react";
import { Card } from "@/components/ux/Card";
import type { CandidateStat, CandidateStatIcon } from "@/features/tenant/candidate/dashboard/types/dashboard";

const STAT_ICONS: Record<CandidateStatIcon, typeof BriefcaseBusiness> = {
  applications: BriefcaseBusiness,
  cv: FileText,
  practice: Bot,
};

type CandidateStatsGridProps = {
  stats: CandidateStat[];
};

export function CandidateStatsGrid({ stats }: CandidateStatsGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((item) => {
        const Icon = STAT_ICONS[item.icon];
        return (
          <Card key={item.label} className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-[8px] bg-[#eff6ff] text-[#2563eb]">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-[#64748b]">{item.label}</p>
              <p className="font-display text-2xl font-bold text-[#0f172a]">{item.value}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}