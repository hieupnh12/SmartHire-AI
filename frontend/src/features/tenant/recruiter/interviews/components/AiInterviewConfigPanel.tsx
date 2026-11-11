import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Sliders, SlidersHorizontal, Users } from "lucide-react";
import { aiInterviewApi } from "@/api/tenant/aiInterviewApi";
import { jobApi } from "@/api/tenant/jobApi";
import { SkeletonCard } from "@/components/ux/Skeleton";
import { AssessmentError } from "@/components/ux/assessmentUi";
import { cn } from "@/lib/utils";
import { InterviewConfigurationTabs } from "./InterviewConfigurationTabs";
import { AiInterviewCandidateAssigner } from "./AiInterviewCandidateAssigner";

export type ConfigSection = "general" | "exercise" | "assign";

const configNavGroups = [
  {
    groupTitle: "CẤU HÌNH",
    items: [
      {
        id: "general" as const,
        title: "Chung",
        icon: Sliders,
      },
      {
        id: "exercise" as const,
        title: "Bài tập",
        icon: SlidersHorizontal,
      },
    ],
  },
  {
    groupTitle: "ỨNG VIÊN",
    items: [
      {
        id: "assign" as const,
        title: "Giao đề",
        icon: Users,
      },
    ],
  },
];

type Props = {
  jobId: number;
  onOpenDetail?: (interviewId: number) => void;
};

export function AiInterviewConfigPanel({ jobId, onOpenDetail }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionParam = searchParams.get("section") as ConfigSection | null;
  const activeSection: ConfigSection =
    sectionParam && ["general", "exercise", "assign"].includes(sectionParam)
      ? sectionParam
      : "general";

  const setSection = (section: ConfigSection) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("section", section);
        return next;
      },
      { replace: true }
    );
  };

  const config = useQuery({
    queryKey: ["ai-interview-config", jobId],
    queryFn: () => aiInterviewApi.config(jobId),
  });

  const skills = useQuery({
    queryKey: ["job-skills", jobId],
    queryFn: () => jobApi.skills(jobId).then((r) => r.data.map((s) => s.name)),
  });

  return (
    <div className="flex flex-col md:flex-row items-start gap-6 text-[#101828] dark:text-slate-100">
      {/* Menu điều hướng dọc bên trái (Left Sidebar) */}
      <aside
        className={cn(
          "w-full md:w-48 lg:w-52 shrink-0 transition-all duration-300",
          "md:sticky md:top-[128px] md:self-start md:max-h-[calc(100vh-9.5rem)] md:overflow-y-auto md:scrollbar-thin"
        )}
      >
        <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          {configNavGroups.map((group) => (
            <div key={group.groupTitle} className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#667085] dark:text-slate-400">
                {group.groupTitle}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeSection === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSection(item.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all cursor-pointer group",
                        isActive
                          ? "bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)] font-semibold shadow-2xs"
                          : "text-[#475467] hover:bg-slate-50 hover:text-[#101828] dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white"
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-4 shrink-0 transition-colors",
                          isActive
                            ? "text-[var(--color-primary)]"
                            : "text-[#667085] group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-300"
                        )}
                      />
                      <span className="flex-1 text-[13px] font-medium leading-tight">{item.title}</span>
                      {isActive && (
                        <ChevronRight className="size-3.5 shrink-0 text-[var(--color-primary)] self-center ml-auto" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Khung nội dung chi tiết bên phải (Main Detail Panel) */}
      <main className="flex-1 min-w-0 w-full">
        <AssessmentError
          error={config.error ?? skills.error}
          retry={() => {
            void config.refetch();
            void skills.refetch();
          }}
        />

        {(config.isPending || skills.isPending) && (
          <SkeletonCard className="h-64 rounded-2xl border border-slate-200/80" />
        )}

        {/* Cấu hình chung & Cấu hình bài tập */}
        <div className={cn(activeSection !== "general" && activeSection !== "exercise" && "hidden")}>
          {config.data && skills.data && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <InterviewConfigurationTabs
                key={jobId}
                jobId={jobId}
                config={config.data}
                jobSkills={skills.data}
                activeSubTab={activeSection === "exercise" ? "exercise" : "general"}
                onSubTabChange={(tab) => setSection(tab)}
                hideInternalTabs
              />
            </div>
          )}
        </div>

        {/* Giao đề cho ứng viên */}
        {activeSection === "assign" && (
          <AiInterviewCandidateAssigner jobId={jobId} onOpenDetail={onOpenDetail} />
        )}
      </main>
    </div>
  );
}
