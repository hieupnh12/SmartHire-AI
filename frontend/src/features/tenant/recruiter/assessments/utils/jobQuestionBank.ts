import type { BankQuestion } from "@/api/types/questionBank";
import type { JobDetail } from "@/api/types/job";

export function matchesJobBank(item: BankQuestion, job: Pick<JobDetail, "id" | "skills">): boolean {
  if (item.jobId === job.id) return true;
  if (item.archived || item.testStatus === "ARCHIVED") return false;
  const skill = item.question.skill?.trim().toLocaleLowerCase();
  return !!skill && job.skills.some(value => value.name.trim().toLocaleLowerCase() === skill);
}
