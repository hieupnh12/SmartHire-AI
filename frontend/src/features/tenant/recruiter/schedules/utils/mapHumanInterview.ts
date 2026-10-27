import type { HumanInterview } from "@/api/types/humanInterview";
import type { CalendarInterview, InterviewStatus } from "../constants/mockInterviews";

/** Calendar hides unpublished drafts; RSVP states collapse to PENDING for filters. */
export function calendarStatus(status: HumanInterview["status"]): InterviewStatus | null {
  if (status === "DRAFT") return null;
  if (status === "PROPOSED" || status === "RESCHEDULE_REQUESTED") return "PENDING";
  if (status === "CONFIRMED" || status === "DONE" || status === "CANCELLED") return status;
  return null;
}

export function mapHumanInterview(row: HumanInterview): CalendarInterview | null {
  const status = calendarStatus(row.status);
  if (!status) return null;
  const durationMinutes = Math.max(
    15,
    Math.round((new Date(row.end).getTime() - new Date(row.start).getTime()) / 60_000),
  );
  return {
    id: row.id,
    applicationId: row.applicationId,
    candidateName: row.candidateName,
    candidateEmail: row.candidateEmail,
    jobId: row.jobId,
    jobTitle: row.jobTitle,
    round: row.round,
    mode: row.mode,
    status,
    startsAt: row.start,
    durationMinutes,
    interviewerName: row.participants.map((p) => p.name).join(" · ") || "—",
    locationOrLink: row.mode === "ONLINE" ? (row.meetingUrl ?? "") : (row.location ?? ""),
    note: row.configuration.notes ?? undefined,
  };
}
