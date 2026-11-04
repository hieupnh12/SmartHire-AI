import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Briefcase } from "lucide-react";
import { jobApi } from "@/api/tenant/jobApi";
import type { AssessmentTab } from "./AssessmentSubNav";
import { cn } from "@/lib/utils";

type Props = {
  currentJobId: number;
  activeTab?: AssessmentTab;
  className?: string;
};

function getTargetUrl(newJobId: number, activeTab?: AssessmentTab) {
  const base = `/recruiter/jobs/${newJobId}/assessments`;
  switch (activeTab) {
    case "submissions":
      return `${base}/submissions`;
    case "config":
      return `${base}/new`;
    case "bank":
      return `${base}/question-bank`;
    case "tests":
    default:
      return base;
  }
}

export function JobSwitcherSelect({ currentJobId, activeTab = "tests", className }: Props) {
  const navigate = useNavigate();

  const { data: jobOptionsRes } = useQuery({
    queryKey: ["jobs", "options"],
    queryFn: () => jobApi.options(),
    staleTime: 60_000,
  });
  const jobList = jobOptionsRes?.data ?? [];

  if (jobList.length <= 1) return null;

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <Briefcase className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
      <select
        value={currentJobId}
        onChange={(e) => {
          const newId = Number(e.target.value);
          if (newId && newId !== currentJobId) {
            navigate(getTargetUrl(newId, activeTab));
          }
        }}
        className="h-8 max-w-[170px] truncate rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-2xs outline-none transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] cursor-pointer dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 sm:max-w-[210px]"
        title="Chuyển nhanh sang vị trí tuyển dụng khác"
        aria-label="Chọn vị trí tuyển dụng khác"
      >
        {jobList.map((j) => (
          <option key={j.id} value={j.id}>
            {j.title}
          </option>
        ))}
      </select>
    </div>
  );
}
