import type { ApplicationDetail, ApplicationSummary } from "@/api/types/applicant";
import type { AiInterview } from "@/api/types/aiInterview";
import type { HumanInterview } from "@/api/types/humanInterview";
import { applicationStatusLabels, humanRoundLabels } from "../constants/calendarEvents";
import type { CalendarEvent } from "../types/calendar";

type Sources = {
  applications: ApplicationSummary[];
  details: ApplicationDetail[];
  aiInterviews: (AiInterview & { jobTitle: string | null })[];
  humanInterviews: HumanInterview[];
};

export function buildCalendarEvents({ applications, details, aiInterviews, humanInterviews }: Sources): CalendarEvent[] {
  const byApplication = new Map(applications.map((app) => [app.id, app]));
  const events: CalendarEvent[] = [];

  for (const app of applications) {
    events.push({ id: `app-${app.id}`, kind: "APPLICATION", at: new Date(app.createdAt), title: "Nộp CV", jobId: app.jobId, jobTitle: app.jobTitle, link: `/applications/${app.id}` });
  }

  for (const detail of details) {
    detail.history.forEach((row, index) => {
      if (row.toStatus === "NEW") return;
      events.push({
        id: `status-${detail.id}-${index}`, kind: "STATUS", at: new Date(row.createdAt),
        title: applicationStatusLabels[row.toStatus] ?? row.toStatus, detail: row.note ?? undefined,
        jobId: detail.jobId, jobTitle: detail.jobTitle, link: `/applications/${detail.id}`,
      });
    });
  }

  for (const interview of aiInterviews) {
    const app = byApplication.get(interview.applicationId);
    if (!app) continue;
    const base = { jobId: app.jobId, jobTitle: interview.jobTitle ?? app.jobTitle, link: `/interviews/${interview.id}` };
    const attempt = interview.attemptNumber && interview.attemptNumber > 1 ? ` (lượt ${interview.attemptNumber})` : "";
    events.push({ ...base, id: `ai-${interview.id}`, kind: "AI_INTERVIEW", at: new Date(interview.createdAt), title: `Mời phỏng vấn AI${attempt}` });
    if (interview.completedAt) {
      events.push({ ...base, id: `ai-done-${interview.id}`, kind: "AI_INTERVIEW", at: new Date(interview.completedAt), title: `Hoàn thành phỏng vấn AI${attempt}`, detail: interview.overallScore != null ? `Điểm: ${interview.overallScore}/100` : undefined });
    } else if (interview.availableUntil) {
      events.push({ ...base, id: `ai-due-${interview.id}`, kind: "DEADLINE", at: new Date(interview.availableUntil), title: `Hạn làm phỏng vấn AI${attempt}` });
    }
  }

  for (const interview of humanInterviews) {
    if (interview.status === "DRAFT") continue;
    const cancelled = interview.status === "CANCELLED";
    events.push({
      id: `human-${interview.id}`, kind: cancelled ? "CANCELLED" : "HUMAN_INTERVIEW",
      at: new Date(interview.start), end: new Date(interview.end),
      title: `Phỏng vấn ${humanRoundLabels[interview.round] ?? interview.round}`,
      detail: interview.mode === "ONLINE" ? "Trực tuyến" : interview.location ?? undefined,
      jobId: interview.jobId, jobTitle: interview.jobTitle, link: "/schedules#human-interviews",
    });
  }

  return events.filter((event) => !Number.isNaN(event.at.getTime())).sort((a, b) => a.at.getTime() - b.at.getTime());
}
