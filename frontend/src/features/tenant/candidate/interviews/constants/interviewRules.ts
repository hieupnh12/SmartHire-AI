import type { TranslateFn } from "@/i18n";

export function getInterviewRules(t: TranslateFn): string[] {
  return [
    t("candidate.assess.interviews.rules.r1"),
    t("candidate.assess.interviews.rules.r2"),
    t("candidate.assess.interviews.rules.r3"),
    t("candidate.assess.interviews.rules.r4"),
  ];
}
