import type { CalendarEventKind } from "../types/calendar";

export const eventKinds: Record<CalendarEventKind, { label: string; dot: string; chip: string }> = {
  APPLICATION: { label: "Nộp CV", dot: "bg-sky-500", chip: "bg-sky-50 text-sky-800 border-sky-200" },
  STATUS: { label: "Cập nhật hồ sơ", dot: "bg-slate-500", chip: "bg-slate-50 text-slate-700 border-slate-200" },
  AI_INTERVIEW: { label: "Phỏng vấn AI", dot: "bg-violet-500", chip: "bg-violet-50 text-violet-800 border-violet-200" },
  DEADLINE: { label: "Hạn chót", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-800 border-amber-200" },
  HUMAN_INTERVIEW: { label: "Phỏng vấn trực tiếp", dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  CANCELLED: { label: "Đã hủy", dot: "bg-red-400", chip: "bg-red-50 text-red-700 border-red-200 line-through" },
};

export const applicationStatusLabels: Record<string, string> = {
  NEW: "Đã nộp", IN_REVIEW: "Đang xem xét", ASSESSMENT: "Chuyển sang vòng bài đánh giá", INTERVIEW: "Chuyển sang vòng phỏng vấn AI",
  HUMAN_INTERVIEW: "Chuyển sang vòng phỏng vấn trực tiếp", OFFER: "Nhận đề nghị làm việc", HIRED: "Trúng tuyển",
  REJECTED: "Hồ sơ không phù hợp", FAILED: "Kết thúc quy trình", WITHDRAWN: "Đã rút đơn",
};

export const humanRoundLabels: Record<string, string> = { TECHNICAL: "Kỹ thuật", CULTURE: "Văn hóa", EXECUTIVE: "Lãnh đạo" };
