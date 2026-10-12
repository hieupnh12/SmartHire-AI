import type { HumanInterview } from "@/api/types/humanInterview";

export const ROUND_LABELS: Record<HumanInterview["round"], string> = {
  TECHNICAL: "Vòng kỹ thuật",
  CULTURE: "Vòng văn hóa",
  EXECUTIVE: "Vòng lãnh đạo",
};

export const RESCHEDULABLE_STATUSES: HumanInterview["status"][] = ["PROPOSED", "CONFIRMED", "RESCHEDULE_REQUESTED"];
