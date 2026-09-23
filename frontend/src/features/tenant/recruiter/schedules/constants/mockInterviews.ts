export type InterviewMode = "ONLINE" | "OFFLINE";
export type InterviewStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "DONE";

export type MockInterview = {
  id: number;
  applicationId: number;
  candidateName: string;
  jobTitle: string;
  mode: InterviewMode;
  status: InterviewStatus;
  startsAt: string;
  durationMinutes: number;
  interviewerName: string;
  locationOrLink: string;
  note: string;
};

export const mockInterviews: MockInterview[] = [
  {
    id: 31,
    applicationId: 501,
    candidateName: "Nguyễn An",
    jobTitle: "Backend Engineer",
    mode: "ONLINE",
    status: "PENDING",
    startsAt: "2026-09-23T10:00:00+07:00",
    durationMinutes: 60,
    interviewerName: "Lê Minh (Tech Lead)",
    locationOrLink: "https://meet.google.com/abc-defg-hij",
    note: "Vòng technical deep-dive",
  },
  {
    id: 32,
    applicationId: 503,
    candidateName: "Phạm Châu",
    jobTitle: "Frontend Engineer",
    mode: "OFFLINE",
    status: "CONFIRMED",
    startsAt: "2026-09-24T14:30:00+07:00",
    durationMinutes: 45,
    interviewerName: "Hoàng My (Hiring Manager)",
    locationOrLink: "Tầng 5, phòng họp A2 — Quận 1",
    note: "Mang CV + portfolio",
  },
];

export const interviewStatusLabel: Record<InterviewStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  CANCELLED: "Đã hủy",
  DONE: "Hoàn thành",
};

export const interviewModeLabel: Record<InterviewMode, string> = {
  ONLINE: "Online",
  OFFLINE: "Offline",
};
