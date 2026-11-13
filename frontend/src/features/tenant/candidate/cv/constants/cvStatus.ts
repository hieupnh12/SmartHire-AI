import type { CvStatus } from "@/api/types/cv";
import { t as globalT, type TranslateFn } from "@/i18n";

export type CvStatusTone = "neutral" | "processing" | "success" | "danger";

const cvStatusKeys: Record<CvStatus, string> = {
  UPLOADED: "candidate.cv.status.uploaded",
  PARSING: "candidate.cv.status.parsing",
  PARSED: "candidate.cv.status.parsed",
  EXTRACTING: "candidate.cv.status.extracting",
  ANALYZING: "candidate.cv.status.analyzing",
  ANALYZED: "candidate.cv.status.analyzed",
  FAILED: "candidate.cv.status.failed",
};

export const cvStatusMeta: Record<CvStatus, { tone: CvStatusTone }> = {
  UPLOADED: { tone: "neutral" },
  PARSING: { tone: "processing" },
  PARSED: { tone: "processing" },
  EXTRACTING: { tone: "processing" },
  ANALYZING: { tone: "processing" },
  ANALYZED: { tone: "success" },
  FAILED: { tone: "danger" },
};

export function getCvStatusLabel(status: CvStatus, t: TranslateFn = globalT): string {
  return t(cvStatusKeys[status]);
}

export const cvStatusToneClass: Record<CvStatusTone, string> = {
  neutral: "bg-slate-100 text-slate-600",
  processing: "bg-amber-50 text-amber-700",
  success: "bg-emerald-50 text-emerald-700",
  danger: "bg-red-50 text-red-700",
};

export const CV_ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
