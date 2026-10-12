import { AlertCircle, CheckCircle2, Clock3, Loader2 } from "lucide-react";
import type { CvStatus } from "@/api/types/cv";
import { cvStatusMeta, cvStatusToneClass } from "../constants/cvStatus";

const icons = { neutral: Clock3, processing: Loader2, success: CheckCircle2, danger: AlertCircle };

export function CvStatusBadge({ status }: { status: CvStatus }) {
  const { label, tone } = cvStatusMeta[status];
  const Icon = icons[tone];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${cvStatusToneClass[tone]}`}>
      <Icon className={`size-3.5 ${tone === "processing" ? "animate-spin" : ""}`} aria-hidden="true" />{label}
    </span>
  );
}
