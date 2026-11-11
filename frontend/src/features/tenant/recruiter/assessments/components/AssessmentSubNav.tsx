import type { ReactNode } from "react";
import { BookOpen, ClipboardList, Settings2, Users } from "lucide-react";
import { PillNav } from "@/components/ux/PillNav";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

export type AssessmentTab = "tests" | "submissions" | "config" | "bank";

type Props = {
  jobId: number;
  jobTitle?: string;
  activeTab: AssessmentTab;
  title?: string;
  subtitle?: ReactNode;
  extraBreadcrumb?: string;
  actions?: ReactNode;
  className?: string;
};

export function AssessmentSubNav({
  jobId,
  activeTab,
  className,
}: Props) {
  const t = useT();
  const basePath = `/recruiter/jobs/${jobId}/assessments`;

  const navItems = [
    {
      id: "tests" as const,
      label: t("recruiter.assessments.subNav.tests"),
      to: basePath,
      icon: ClipboardList,
    },
    {
      id: "submissions" as const,
      label: t("recruiter.assessments.subNav.submissions"),
      to: `${basePath}/submissions`,
      icon: Users,
    },
    {
      id: "bank" as const,
      label: t("recruiter.assessments.subNav.bank"),
      to: `${basePath}/question-bank`,
      icon: BookOpen,
    },
    {
      id: "config" as const,
      label: t("recruiter.assessments.subNav.config"),
      to: `${basePath}/new`,
      icon: Settings2,
    },
  ];

  return (
    <nav className={cn("min-w-0", className)}>
      <PillNav
        items={navItems}
        activeId={activeTab}
        ariaLabel={t("recruiter.assessments.subNav.ariaLabel")}
        variant="docked"
        dockGroup="assessments"
      />
    </nav>
  );
}
