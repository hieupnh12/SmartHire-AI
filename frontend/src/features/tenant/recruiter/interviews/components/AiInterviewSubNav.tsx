import { Link } from "react-router-dom";
import { Bot, Settings2, Users } from "lucide-react";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

export type AiInterviewTab = "sessions" | "tracking" | "config";

type Props = {
  jobId: number;
  activeTab: AiInterviewTab;
  className?: string;
  onTabChange?: (tab: AiInterviewTab) => void;
};

export function AiInterviewSubNav({
  jobId,
  activeTab,
  className,
  onTabChange,
}: Props) {
  const t = useT();
  const basePath = `/recruiter/jobs/${jobId}/ai-interviews`;

  const navItems = [
    {
      id: "sessions" as const,
      label: t("recruiter.interviews.ai.subNav.sessions"),
      to: basePath,
      icon: Bot,
    },
    {
      id: "tracking" as const,
      label: t("recruiter.interviews.ai.subNav.tracking"),
      to: `${basePath}?tab=tracking`,
      icon: Users,
    },
    {
      id: "config" as const,
      label: t("recruiter.interviews.ai.subNav.config"),
      to: `${basePath}?tab=config`,
      icon: Settings2,
    },
  ];

  return (
    <nav
      className={cn(
        "flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 scrollbar-none",
        className,
      )}
      role="tablist"
      aria-label={t("recruiter.interviews.ai.subNav.ariaLabel")}
    >
      <div className="flex min-w-full items-center gap-1 sm:min-w-0">
        {navItems.map((item) => {
          const active = activeTab === item.id;
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.to}
              role="tab"
              aria-selected={active}
              aria-current={active ? "page" : undefined}
              onClick={() => {
                if (onTabChange) {
                  onTabChange(item.id);
                }
              }}
              className={cn(
                "inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm transition-all",
                active
                  ? "border-[var(--color-primary)] font-semibold text-[var(--color-primary)]"
                  : "border-transparent font-medium text-[#475467] hover:border-slate-300 hover:text-[#101828] dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  active ? "text-[var(--color-primary)]" : "text-[#667085] dark:text-slate-400",
                )}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
