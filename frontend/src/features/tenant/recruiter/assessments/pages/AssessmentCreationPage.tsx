import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ChevronRight,
  Settings2,
  Sliders,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AssessmentSubNav } from "../components/AssessmentSubNav";
import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { AutomaticAssessmentCandidateAssigner } from "../components/AutomaticAssessmentCandidateAssigner";
import { JobAssessmentConfiguration } from "../components/JobAssessmentConfiguration";

export type ConfigSection = "general" | "exercise" | "assign";

const configNavGroups = [
  {
    groupTitle: "CẤU HÌNH",
    items: [
      {
        id: "general" as const,
        title: "Chung",
        icon: Settings2,
      },
      {
        id: "exercise" as const,
        title: "Bài tập",
        icon: Sliders,
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

export function AssessmentCreationPage() {
  const job = useRecruitmentJob();
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
      { replace: true },
    );
  };

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="space-y-6 text-[#101828] dark:text-slate-100">
      {/* Tầng 1: Sub-nav chính của Job */}
      <AssessmentSubNav jobId={job.id} activeTab="config" />

      {/* Tầng 2: Master-Detail Setting Layout (Chuẩn SaaS Google / Notion) */}
      <div className="flex flex-col md:flex-row items-start gap-6">
        {/* Menu điều hướng dọc bên trái (Left Sidebar) - Di chuyển mượt mà đi theo màn hình khi cuộn */}
        <aside
          className={cn(
            "w-full md:w-48 lg:w-52 shrink-0 transition-all duration-300",
            "md:sticky md:top-[128px] md:self-start md:max-h-[calc(100vh-9.5rem)] md:overflow-y-auto md:scrollbar-thin",
          )}
        >
          <div
            className={cn(
              "space-y-3 rounded-2xl border bg-white p-2.5 transition-all duration-300 dark:bg-slate-900",
              isScrolled
                ? "border-slate-300/90 shadow-md shadow-slate-200/60 dark:border-slate-700 dark:shadow-black/40"
                : "border-slate-200/80 shadow-2xs dark:border-slate-800",
            )}
          >
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
                            ? "bg-blue-50 text-[#0066FF] font-semibold dark:bg-blue-950/40 dark:text-blue-300 shadow-2xs"
                            : "text-[#475467] hover:bg-slate-50 hover:text-[#101828] dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4 shrink-0 transition-colors",
                            isActive
                              ? "text-[#0066FF] dark:text-blue-400"
                              : "text-[#667085] group-hover:text-slate-700 dark:text-slate-500 dark:group-hover:text-slate-300",
                          )}
                        />
                        <span className="flex-1 text-[13px] font-medium leading-tight">{item.title}</span>
                        {isActive && (
                          <ChevronRight className="size-3.5 shrink-0 text-[#0066FF] self-center ml-auto dark:text-blue-400" />
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
          {/* Cấu hình chung & Cấu hình bài tập */}
          <div className={cn(activeSection !== "general" && activeSection !== "exercise" && "hidden")}>
            <JobAssessmentConfiguration
              activeSubTab={activeSection === "exercise" ? "exercise" : "general"}
              onSubTabChange={(tab) => setSection(tab)}
              hideInternalTabs
            />
          </div>

          {/* Giao đề cho ứng viên */}
          {activeSection === "assign" && (
            <div className="space-y-4">
              <AutomaticAssessmentCandidateAssigner />
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
