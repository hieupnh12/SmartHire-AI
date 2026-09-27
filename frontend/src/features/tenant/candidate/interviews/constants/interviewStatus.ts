import type { AiInterviewStatus } from "@/api/types/aiInterview";

export const interviewStatus: Record<AiInterviewStatus, string> = {
  CREATED: "Đang chuẩn bị câu hỏi",
  QUESTIONS_READY: "Sẵn sàng phỏng vấn",
  IN_PROGRESS: "Đang phỏng vấn",
  SCORING: "Đã nộp · Chờ đánh giá",
  SCORED: "Đã có kết quả",
  FAILED: "Phiên gặp lỗi · Liên hệ nhà tuyển dụng",
};
