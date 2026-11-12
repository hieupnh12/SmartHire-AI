import type { HumanInterview } from "@/api/types/humanInterview";
import { t as globalT, type TranslateFn } from "@/i18n";

export function InterviewIcon({ name, className = "text-[18px]" }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`} aria-hidden="true">{name}</span>;
}

export const ROUND_CODES = ["TECHNICAL", "CULTURE", "EXECUTIVE"] as const;

export const HUMAN_INTERVIEW_STATUSES: HumanInterview["status"][] = [
  "DRAFT",
  "PROPOSED",
  "CONFIRMED",
  "RESCHEDULE_REQUESTED",
  "CANCELLED",
  "DONE",
];

export function getRoundLabel(round: string, translate: TranslateFn = globalT): string {
  const key = `recruiter.interviews.human.rounds.${round}`;
  const label = translate(key);
  return label === key ? round : label;
}

export const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const localTime = (date: Date) => `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
export { statusLabels, getHumanInterviewStatusLabel, downloadInterview } from "@/components/ux/humanInterviewUtilities";
