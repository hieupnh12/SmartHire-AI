import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ClipboardList, Settings2, Users } from "lucide-react";
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
  const basePath = `/recruiter/jobs/${jobId}/assessments`;

  const navItems = [
    {
      id: "tests" as const,
      label: "Đề thi",
      to: basePath,
      icon: ClipboardList,
    },
    {
      id: "submissions" as const,
      label: "Theo dõi nộp bài",
      to: `${basePath}/submissions`,
      icon: Users,
    },
    {
      id: "bank" as const,
      label: "Ngân hàng câu hỏi",
      to: `${basePath}/question-bank`,
      icon: BookOpen,
    },
    {
      id: "config" as const,
      label: "Cấu hình",
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
      aria-label="Phân hệ bài đánh giá năng lực"
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
                  ? "border-[#0066FF] font-semibold text-[#0066FF] dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent font-medium text-[#475467] hover:border-slate-300 hover:text-[#101828] dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  active ? "text-[#0066FF] dark:text-blue-400" : "text-[#667085] dark:text-slate-400",
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
