import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ClipboardList, Settings2, Users } from "lucide-react";
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
    <nav
      className={cn(
        "flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 scrollbar-none",
        className,
      )}
      role="tablist"
      aria-label={t("recruiter.assessments.subNav.ariaLabel")}
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
