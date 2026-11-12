import type { TranslateFn } from "@/i18n";

export function getAssessmentGuidelines(t: TranslateFn, durationMinutes: number) {
  return [
    {
      id: "timer" as const,
      title: t("candidate.assess.invitation.guidelines.timerTitle"),
      body: t("candidate.assess.invitation.guidelines.timerBody", {
        minutes: durationMinutes,
      }),
    },
    {
      id: "sync" as const,
      title: t("candidate.assess.invitation.guidelines.syncTitle"),
      body: t("candidate.assess.invitation.guidelines.syncBody"),
    },
    {
      id: "resilience" as const,
      title: t("candidate.assess.invitation.guidelines.resilienceTitle"),
      body: t("candidate.assess.invitation.guidelines.resilienceBody"),
    },
  ] as const;
}

export function getAssessmentRegulations(t: TranslateFn) {
  return [
    {
      icon: "tab" as const,
      title: t("candidate.assess.invitation.regulations.fullscreenTitle"),
      body: t("candidate.assess.invitation.regulations.fullscreenBody"),
    },
    {
      icon: "terminal" as const,
      title: t("candidate.assess.invitation.regulations.noDevtoolsTitle"),
      body: t("candidate.assess.invitation.regulations.noDevtoolsBody"),
    },
    {
      icon: "devices" as const,
      title: t("candidate.assess.invitation.regulations.deviceReqTitle"),
      body: t("candidate.assess.invitation.regulations.deviceReqBody"),
    },
  ] as const;
}
