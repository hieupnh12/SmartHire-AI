import type { HumanInterview } from "@/api/types/humanInterview";
export const statusLabels: Record<HumanInterview["status"], string> = { DRAFT: "Bản nháp", PROPOSED: "Chờ ứng viên xác nhận", CONFIRMED: "Đã xác nhận (RSVP Yes)", RESCHEDULE_REQUESTED: "Yêu cầu đổi lịch", CANCELLED: "Đã hủy", DONE: "Đã hoàn thành" };
export function downloadInterview(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }
