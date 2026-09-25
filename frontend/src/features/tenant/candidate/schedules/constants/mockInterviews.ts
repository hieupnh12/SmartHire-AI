export type InterviewMode = "ONLINE" | "OFFLINE";
export type InterviewStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "DONE";

export type MockCandidateInterview = {
  id: number;
  applicationId: number;
  jobTitle: string;
  mode: InterviewMode;
  status: InterviewStatus;
  startsAt: string;
  durationMinutes: number;
  interviewerName: string;
  locationOrLink: string;
  note: string;
};

export const mockCandidateInterviews: MockCandidateInterview[] = [
  {
    id: 31,
    applicationId: 501,
    jobTitle: "Backend Engineer",
    mode: "ONLINE",
    status: "PENDING",
    startsAt: "2026-09-23T10:00:00+07:00",
    durationMinutes: 60,
    interviewerName: "Lê Minh (Tech Lead)",
    locationOrLink: "https://meet.google.com/abc-defg-hij",
    note: "Vòng technical deep-dive",
  },
];

export const interviewStatusLabel: Record<InterviewStatus, string> = {
  PENDING: "Chờ bạn xác nhận",
  CONFIRMED: "Đã xác nhận",
  CANCELLED: "Đã hủy",
  DONE: "Hoàn thành",
};

export const interviewModeLabel: Record<InterviewMode, string> = {
  ONLINE: "Online",
  OFFLINE: "Offline",
};
