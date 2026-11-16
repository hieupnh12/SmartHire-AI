import { t as globalT, type TranslateFn } from "@/i18n";

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
  TECHNICAL: "Vòng 1: Kỹ thuật & Chuyên môn",
  CULTURE: "Vòng 2: Văn hóa & Đội ngũ (Culture Fit)",
  EXECUTIVE: "Vòng 3: Phỏng vấn Ban Giám Đốc",
  AI_INTERVIEW: "Phỏng vấn AI",
};

export const interviewRoundShortLabel: Record<InterviewRound, string> = {
  TECHNICAL: "Chuyên môn / Kỹ thuật",
  CULTURE: "Văn hóa & Đội ngũ",
  EXECUTIVE: "Ban Giám đốc",
  AI_INTERVIEW: "Phỏng vấn AI",
};

/** Visual metadata based on Interview Status — primary distinction on recruitment calendar */
export const statusMeta: Record<
  InterviewStatus,
  { label: string; dot: string; chip: string; badge: string; text: string }
> = {
  CONFIRMED: {
    label: "Đã xác nhận",
    dot: "bg-emerald-500",
    chip: "bg-emerald-50/80 border-emerald-200 text-emerald-950 hover:bg-emerald-100/80 shadow-2xs",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    text: "text-emerald-700",
  },
  PENDING: {
    label: "Chờ xác nhận",
    dot: "bg-amber-500",
    chip: "bg-amber-50/80 border-amber-200 text-amber-950 hover:bg-amber-100/80 shadow-2xs",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    text: "text-amber-700",
  },
  DONE: {
    label: "Hoàn thành",
    dot: "bg-slate-400",
    chip: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    text: "text-slate-600",
  },
  CANCELLED: {
    label: "Đã hủy",
    dot: "bg-rose-400",
    chip: "bg-rose-50/40 border-rose-200/60 text-rose-500 line-through opacity-60",
    badge: "bg-rose-50 text-rose-600 border-rose-200",
    text: "text-rose-600",
  },
};

/** Visual metadata based on Interview Round — for secondary chips and details */
export const roundMeta: Record<
  InterviewRound,
  { label: string; dot: string; chip: string; tone: string }
> = {
  TECHNICAL: {
    label: "Chuyên môn / Kỹ thuật",
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-800 border-emerald-200",
    tone: "text-emerald-700 bg-emerald-50",
  },
  CULTURE: {
    label: "Văn hóa & Đội ngũ",
    dot: "bg-sky-500",
    chip: "bg-sky-50 text-sky-800 border-sky-200",
    tone: "text-sky-700 bg-sky-50",
  },
  EXECUTIVE: {
    label: "Ban Giám đốc",
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

export function getInterviewStatusLabel(status: InterviewStatus, translate: TranslateFn = globalT) {
  const key = `recruiter.ops.schedules.statusLabels.${status}`;
  const label = translate(key);
  return label === key ? interviewStatusLabel[status] : label;
}

export function getInterviewModeLabel(mode: InterviewMode, translate: TranslateFn = globalT) {
  const key = `recruiter.ops.schedules.modeLabels.${mode}`;
  const label = translate(key);
  return label === key ? interviewModeLabel[mode] : label;
}

export function getInterviewRoundLabel(round: InterviewRound, translate: TranslateFn = globalT) {
  const key = `recruiter.ops.schedules.roundLabels.${round}`;
  const label = translate(key);
  return label === key ? interviewRoundLabel[round] : label;
}

export function getInterviewRoundShortLabel(round: InterviewRound, translate: TranslateFn = globalT) {
  const key = `recruiter.ops.schedules.roundShort.${round}`;
  const label = translate(key);
  return label === key ? (roundMeta[round]?.label ?? round) : label;
}
