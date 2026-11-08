import { CalendarDays, ClipboardCheck, FileText, Sparkles, type LucideIcon } from "lucide-react";
import type { NotificationCategory } from "@/api/types/notification";

export const notificationCategories: { key: NotificationCategory; label: string; description: string; icon: LucideIcon }[] = [
  { key: "APPLICATION", label: "Kết quả hồ sơ", description: "Thông báo khi hồ sơ ứng tuyển kết thúc, kèm lý do.", icon: FileText },
  { key: "AI_INTERVIEW", label: "Phỏng vấn AI", description: "Lời mời, lượt làm lại và kết quả phỏng vấn AI.", icon: Sparkles },
  { key: "ASSESSMENT", label: "Bài đánh giá", description: "Lời mời làm bài kiểm tra năng lực từ nhà tuyển dụng.", icon: ClipboardCheck },
  { key: "HUMAN_INTERVIEW", label: "Phỏng vấn trực tiếp", description: "Lịch hẹn, nhắc lịch và hủy lịch phỏng vấn với nhà tuyển dụng.", icon: CalendarDays },
];

export const recruiterNotificationCategories: { key: NotificationCategory; label: string; description: string; icon: LucideIcon }[] = [
  { key: "APPLICATION", label: "Hồ sơ & Phân công", description: "Ứng viên nộp đơn mới, rút hồ sơ hoặc bạn được phân công vào tin tuyển dụng.", icon: FileText },
  { key: "AI_INTERVIEW", label: "Phỏng vấn AI", description: "Ứng viên hoàn thành phỏng vấn AI và hệ thống đã chấm điểm.", icon: Sparkles },
  { key: "ASSESSMENT", label: "Bài đánh giá năng lực", description: "Ứng viên nộp bài kiểm tra năng lực cần theo dõi hoặc chấm tự luận.", icon: ClipboardCheck },
  { key: "HUMAN_INTERVIEW", label: "Phỏng vấn trực tiếp", description: "Lịch phỏng vấn hội đồng, ứng viên xác nhận tham gia hoặc yêu cầu đổi lịch.", icon: CalendarDays },
];
