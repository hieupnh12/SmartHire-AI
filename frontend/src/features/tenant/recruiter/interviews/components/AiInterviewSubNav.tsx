import { Bot, Settings2, Users } from "lucide-react";
import { PillNav } from "@/components/ux/PillNav";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

export type AiInterviewTab = "sessions" | "tracking" | "config";

type Props = {
  jobId: number;
  activeTab: AiInterviewTab;
  className?: string;
  onTabChange?: (tab: AiInterviewTab) => void;
  onDirectionChange?: (direction: "left" | "right") => void;
};

export function AiInterviewSubNav({
  jobId,
  activeTab,
  className,
  onTabChange,
  onDirectionChange,
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
    <nav className={cn("min-w-0", className)}>
      <PillNav
        items={navItems}
        activeId={activeTab}
        ariaLabel={t("recruiter.interviews.ai.subNav.ariaLabel")}
        onSelect={onTabChange}
        onDirectionChange={onDirectionChange}
        variant="docked"
        dockGroup="ai-interviews"
      />
    </nav>
  );
}
