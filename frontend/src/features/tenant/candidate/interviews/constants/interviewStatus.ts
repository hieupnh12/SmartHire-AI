import type { AiInterviewStatus } from "@/api/types/aiInterview";

export const interviewStatus: Record<AiInterviewStatus, string> = {
  GENERATING: "Đang sinh câu hỏi",
  PASSED: "Đạt · Assessment đã mở",
  ERROR: "Lỗi xử lý · Chờ nhà tuyển dụng thử lại",
  CREATED: "Đang chuẩn bị câu hỏi",
  QUESTIONS_READY: "Sẵn sàng phỏng vấn",
  IN_PROGRESS: "Đang phỏng vấn",
  SCORING: "Đã nộp · Chờ đánh giá",
  SCORED: "Đã có kết quả",
  FAILED: "Chưa đạt",
};
