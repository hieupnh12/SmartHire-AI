import { CalendarDays, ClipboardCheck, Sparkles, type LucideIcon } from "lucide-react";
import type { NotificationCategory } from "@/api/types/notification";

export const notificationCategories: { key: NotificationCategory; label: string; description: string; icon: LucideIcon }[] = [
  { key: "AI_INTERVIEW", label: "Phỏng vấn AI", description: "Lời mời, lượt làm lại và kết quả phỏng vấn AI.", icon: Sparkles },
  { key: "ASSESSMENT", label: "Bài đánh giá", description: "Lời mời làm bài kiểm tra năng lực từ nhà tuyển dụng.", icon: ClipboardCheck },
  { key: "HUMAN_INTERVIEW", label: "Phỏng vấn trực tiếp", description: "Lịch hẹn, nhắc lịch và hủy lịch phỏng vấn với nhà tuyển dụng.", icon: CalendarDays },
];
