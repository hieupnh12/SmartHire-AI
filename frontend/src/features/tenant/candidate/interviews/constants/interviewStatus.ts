import type { AiInterviewStatus } from "@/api/types/aiInterview";
import { t as globalT, type TranslateFn } from "@/i18n";

export function getAiInterviewStatusLabel(
  status: AiInterviewStatus,
  translate: TranslateFn = globalT,
): string {
  const key = `candidate.assess.interviews.status.${status}`;
  const label = translate(key);
  return label === key ? status : label;
}
