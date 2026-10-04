import type { CvStatus } from "@/api/types/cv";

export type CvStatusTone = "neutral" | "processing" | "success" | "danger";

export const cvStatusMeta: Record<CvStatus, { label: string; tone: CvStatusTone }> = {
  UPLOADED: { label: "Chờ phân tích", tone: "neutral" },
  PARSING: { label: "Đang đọc file", tone: "processing" },
  PARSED: { label: "Đã đọc file", tone: "processing" },
  EXTRACTING: { label: "Đang trích xuất", tone: "processing" },
  ANALYZING: { label: "Đang phân tích", tone: "processing" },
  ANALYZED: { label: "Đã phân tích", tone: "success" },
  FAILED: { label: "Phân tích lỗi", tone: "danger" },
};

export const cvStatusToneClass: Record<CvStatusTone, string> = {
  neutral: "bg-slate-100 text-slate-600",
  processing: "bg-amber-50 text-amber-700",
  success: "bg-emerald-50 text-emerald-700",
  danger: "bg-red-50 text-red-700",
};

export const CV_ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
