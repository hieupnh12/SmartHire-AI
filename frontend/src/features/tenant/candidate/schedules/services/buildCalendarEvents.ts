import type { ApplicationDetail, ApplicationSummary } from "@/api/types/applicant";
import type { AiInterview } from "@/api/types/aiInterview";
import type { HumanInterview } from "@/api/types/humanInterview";
import { t as globalT, type TranslateFn } from "@/i18n";
import type { CalendarEvent } from "../types/calendar";

type Sources = {
  applications: ApplicationSummary[];
  details: ApplicationDetail[];
  aiInterviews: (AiInterview & { jobTitle: string | null })[];
  humanInterviews: HumanInterview[];
  t?: TranslateFn;
};

export function buildCalendarEvents({ applications, details, aiInterviews, humanInterviews, t = globalT }: Sources): CalendarEvent[] {
  const byApplication = new Map(applications.map((app) => [app.id, app]));
  const events: CalendarEvent[] = [];

  for (const app of applications) {
    events.push({ id: `app-${app.id}`, kind: "APPLICATION", at: new Date(app.createdAt), title: t("candidate.core.schedules.events.cvSubmitted"), jobId: app.jobId, jobTitle: app.jobTitle, link: `/applications/${app.id}` });
  }

  for (const detail of details) {
    detail.history.forEach((row, index) => {
      if (row.toStatus === "NEW") return;
      const statusKey = `candidate.core.schedules.applicationStatuses.${row.toStatus}`;
      const statusTitle = t(statusKey);
      events.push({
        id: `status-${detail.id}-${index}`, kind: "STATUS", at: new Date(row.createdAt),
        title: statusTitle === statusKey ? row.toStatus : statusTitle, detail: row.note ?? undefined,
        jobId: detail.jobId, jobTitle: detail.jobTitle, link: `/applications/${detail.id}`,
      });
    });
  }

  for (const interview of aiInterviews) {
    const app = byApplication.get(interview.applicationId);
    if (!app) continue;
    const base = { jobId: app.jobId, jobTitle: interview.jobTitle ?? app.jobTitle, link: `/interviews/${interview.id}` };
    const hasAttempt = Boolean(interview.attemptNumber && interview.attemptNumber > 1);
    const invitedAt = new Date(interview.createdAt);
    const closedAt = new Date(interview.completedAt ?? interview.availableUntil ?? "");
    events.push({
      ...base,
      id: `ai-${interview.id}`,
      kind: "AI_INTERVIEW",
      at: invitedAt,
      end: closedAt > invitedAt ? closedAt : undefined,
      title: hasAttempt
        ? t("candidate.core.schedules.events.invitedAiAttempt", { count: interview.attemptNumber! })
        : t("candidate.core.schedules.events.invitedAi"),
    });
    if (interview.completedAt) {
      events.push({
        ...base,
        id: `ai-done-${interview.id}`,
        kind: "AI_INTERVIEW",
        at: new Date(interview.completedAt),
        title: hasAttempt
          ? t("candidate.core.schedules.events.completedAiAttempt", { count: interview.attemptNumber! })
          : t("candidate.core.schedules.events.completedAi"),
        detail: interview.overallScore != null ? t("candidate.core.schedules.events.scoreDetail", { score: interview.overallScore }) : undefined,
      });
    } else if (interview.availableUntil) {
      events.push({
        ...base,
        id: `ai-due-${interview.id}`,
        kind: "DEADLINE",
        at: new Date(interview.availableUntil),
        title: hasAttempt
          ? t("candidate.core.schedules.events.deadlineAiAttempt", { count: interview.attemptNumber! })
          : t("candidate.core.schedules.events.deadlineAi"),
      });
    }
  }

  for (const interview of humanInterviews) {
    if (interview.status === "DRAFT") continue;
    const cancelled = interview.status === "CANCELLED";
    const roundKey = `candidate.core.schedules.humanRoundShort.${interview.round}`;
    const roundText = t(roundKey);
    events.push({
      id: `human-${interview.id}`, kind: cancelled ? "CANCELLED" : "HUMAN_INTERVIEW",
      at: new Date(interview.start), end: new Date(interview.end),
      title: t("candidate.core.schedules.events.humanInterviewTitle", { round: roundText === roundKey ? interview.round : roundText }),
      detail: interview.mode === "ONLINE" ? t("candidate.core.schedules.events.onlineMode") : interview.location ?? undefined,
      jobId: interview.jobId, jobTitle: interview.jobTitle, link: "/interview-schedules",
    });
  }

  return events.filter((event) => !Number.isNaN(event.at.getTime())).sort((a, b) => a.at.getTime() - b.at.getTime());
}
