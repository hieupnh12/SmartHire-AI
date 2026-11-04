import type { HumanInterview } from "@/api/types/humanInterview";

export function humanInterviewRoomPath(interviewId: number) {
  return `/meet/human/${interviewId}`;
}

export function isSmartHireMeeting(interview: Pick<HumanInterview, "meetingUrl" | "configuration">) {
  return interview.configuration.provider === "SMARTHIRE"
    || (interview.meetingUrl?.includes("/meet/human/") ?? false);
}

/** Prefer in-app room path; fall back to external meeting URL. */
export function humanInterviewJoinHref(interview: Pick<HumanInterview, "id" | "meetingUrl" | "configuration">) {
  if (isSmartHireMeeting(interview)) return humanInterviewRoomPath(interview.id);
  return interview.meetingUrl;
}
