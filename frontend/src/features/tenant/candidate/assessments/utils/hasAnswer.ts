import type { SavedAnswer } from "@/api/types/assessment";

export function hasAnswer(answer?: SavedAnswer): boolean {
  return answer?.selectedOptionId != null || !!answer?.selectedOptionIds?.length || !!answer?.answerText?.trim();
}
