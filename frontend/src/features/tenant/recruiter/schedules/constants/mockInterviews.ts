/** Calendar row shaped for recruiter month view; sourced from Human Interview API. */
export type InterviewMode = "ONLINE" | "OFFLINE";
export type InterviewStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "DONE";
export type InterviewRound = "TECHNICAL" | "CULTURE" | "EXECUTIVE" | "AI_INTERVIEW";

export type CalendarInterview = {
  id: number;
  applicationId: number;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  jobId?: number;
  jobTitle: string;
  round: InterviewRound;
  mode: InterviewMode;
  status: InterviewStatus;
  startsAt: string;
  durationMinutes: number;
  interviewerName: string;
  locationOrLink: string;
  note?: string;
};

/** @deprecated Prefer CalendarInterview — kept for existing calendar imports. */
export type MockInterview = CalendarInterview;

export const interviewStatusLabel: Record<InterviewStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  CANCELLED: "Đã hủy",
  DONE: "Hoàn thành",
};

export const interviewModeLabel: Record<InterviewMode, string> = {
  ONLINE: "Trực tuyến (Online)",
  OFFLINE: "Trực tiếp (Offline)",
};

export const interviewRoundLabel: Record<InterviewRound, string> = {
  TECHNICAL: "Phỏng vấn Kỹ thuật",
  CULTURE: "Phỏng vấn Văn hóa & Đội ngũ",
  EXECUTIVE: "Phỏng vấn Lãnh đạo",
  AI_INTERVIEW: "Phỏng vấn AI",
};

export const roundMeta: Record<InterviewRound, { label: string; dot: string; chip: string; tone: string }> = {
  TECHNICAL: {
    label: "Kỹ thuật",
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-800 border-emerald-200",
    tone: "text-emerald-700 bg-emerald-50",
  },
  CULTURE: {
    label: "Văn hóa",
    dot: "bg-sky-500",
    chip: "bg-sky-50 text-sky-800 border-sky-200",
    tone: "text-sky-700 bg-sky-50",
  },
  EXECUTIVE: {
    label: "Lãnh đạo",
    dot: "bg-indigo-500",
    chip: "bg-indigo-50 text-indigo-800 border-indigo-200",
    tone: "text-indigo-700 bg-indigo-50",
  },
  AI_INTERVIEW: {
    label: "Phỏng vấn AI",
    dot: "bg-violet-500",
    chip: "bg-violet-50 text-violet-800 border-violet-200",
    tone: "text-violet-700 bg-violet-50",
  },
};
