export type Participant = { userId: number; name: string; email: string; role: "LEAD" | "CO_INTERVIEWER" | "NOTE_TAKER" };
export type Evaluation = { id: number; evaluatorId: number; evaluatorName: string; technicalScore: number; communicationScore: number; cultureScore: number; overallScore: number; comments: string | null; recommendation: string; createdAt: string };
export type HumanInterview = {
  id: number; applicationId: number; jobId: number; jobTitle: string; candidateId: number; candidateName: string; candidateEmail: string;
  round: "TECHNICAL" | "CULTURE" | "EXECUTIVE"; mode: "ONLINE" | "OFFLINE";
  status: "DRAFT" | "PROPOSED" | "CONFIRMED" | "RESCHEDULE_REQUESTED" | "CANCELLED" | "DONE";
  start: string; end: string; meetingUrl: string | null; location: string | null;
  configuration: { rubric: string; provider: string; emailTemplate: string; notes: string | null; attachCalendar: boolean; rescheduleReason: string | null; requestedStart: string | null; requestedEnd: string | null };
  participants: Participant[]; evaluations: Evaluation[];
};
export type Choice = { code: string; label: string };
export type InterviewOptions = { candidates: { applicationId: number; candidateId: number; name: string; email: string; jobTitle: string }[]; interviewers: Participant[]; rounds: Choice[]; rubrics: Choice[]; emailTemplates: Choice[]; automaticMeetings: boolean; smsReminders: boolean };
export type InterviewSummary = { monthTotal: number; previousMonthTotal: number; todayTotal: number; todayOnline: number; todayOffline: number; pendingConfirmation: number; pendingScorecards: number };
export type InterviewPage = { items: HumanInterview[]; total: number; page: number; size: number };
export type SaveInterview = { jobId: number; applicationId: number; round: string; mode: string; start: string; end: string; meetingUrl: string; location: string; provider: string; rubric: string; emailTemplate: string; notes: string; attachCalendar: boolean; smsReminder: boolean; draft: boolean; participants: { userId: number; role: string }[] };
export type InterviewFilters = { jobId: number; q?: string; round?: string; mode?: string; status?: string; from?: string; to?: string; page?: number; size?: number };
export type Availability = { available: boolean; conflicts: { interviewId: number; start: string; end: string; userIds: number[] }[] };
