import type { HumanInterview } from "@/api/types/humanInterview";
import { t as globalT, type TranslateFn } from "@/i18n";

export const statusLabels: Record<HumanInterview["status"], string> = {
  DRAFT: "Bản nháp",
  PROPOSED: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  RESCHEDULE_REQUESTED: "Yêu cầu đổi lịch",
  CANCELLED: "Đã hủy",
  DONE: "Đã hoàn thành",
};

export function getHumanInterviewStatusLabel(
  status: HumanInterview["status"],
  translate: TranslateFn = globalT,
) {
  const key = `ux.humanInterviewStatus.${status}`;
  const label = translate(key);
  return label === key ? status : label;
}

export function downloadInterview(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
