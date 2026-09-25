import { BriefcaseBusiness, CalendarClock, ClipboardCheck, FileSearch } from "lucide-react";
import { Card } from "@/components/ux/Card";
import type { CandidateStat, CandidateStatIcon } from "@/features/tenant/candidate/dashboard/types/dashboard";

const STAT_ICONS: Record<CandidateStatIcon, typeof BriefcaseBusiness> = {
  applications: BriefcaseBusiness,
  reviewing: FileSearch,
  assessments: ClipboardCheck,
  interviews: CalendarClock,
};

const STAT_ICON_TONES: Record<CandidateStatIcon, string> = {
  applications: "bg-teal-50 text-teal-600",
  reviewing: "bg-blue-50 text-blue-600",
  assessments: "bg-amber-50 text-amber-600",
  interviews: "bg-violet-50 text-violet-600",
};

type CandidateStatsGridProps = { stats: CandidateStat[] };

export function CandidateStatsGrid({ stats }: CandidateStatsGridProps) {
  return (
    <section className="min-w-0 rounded-xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm sm:p-6" aria-label="Tổng quan hành trình ứng tuyển">
      <h2 className="mb-4 text-lg font-semibold">Tổng quan hành trình</h2>
      {stats.map((item) => {
        const Icon = STAT_ICONS[item.icon];
        return (
          <Card key={item.label} className="mb-3 flex items-center gap-4 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] p-4 shadow-none last:mb-0">
            <div className={`grid size-12 shrink-0 place-items-center rounded-[var(--radius-md)] ${STAT_ICON_TONES[item.icon]}`}>
              <Icon className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-[var(--color-on-surface-variant)]">{item.label}</p>
              <p className="mt-0.5 text-2xl font-semibold tracking-[-0.02em] text-[var(--color-on-surface)]">{item.value}</p>
            </div>
          </Card>
        );
      })}
    </section>
  );
}
