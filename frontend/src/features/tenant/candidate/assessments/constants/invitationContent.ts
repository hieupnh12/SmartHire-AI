export const ASSESSMENT_GUIDELINES = [
  {
    title: "Đồng hồ đếm ngược liên tục:",
    body: "Khi bạn nhấn bắt đầu, thời gian làm bài sẽ chạy liên tục và không thể tạm dừng vì bất kỳ lý do nào.",
  },
  {
    title: "Đồng bộ tự động tức thì (Real-time Cloud Sync):",
    body: "Mỗi khi chọn một phương án, hệ thống sẽ lưu ngay lập tức lên máy chủ.",
  },
  {
    title: "Cơ chế phục hồi ngắt kết nối (Network Resilience):",
    body: "Nếu mạng bị ngắt quãng, bài thi vẫn giữ nguyên tiến độ đã làm và tự đồng bộ trở lại khi có tín hiệu.",
  },
] as const;

export const ASSESSMENT_REGULATIONS = [
  {
    icon: "tab" as const,
    title: "1 Tab trình duyệt duy nhất",
    body: "Rời khỏi màn hình hoặc chuyển tab quá 3 lần sẽ tự động khóa bài thi.",
  },
  {
    icon: "terminal" as const,
    title: "Không sử dụng DevTools & AI ngoài",
    body: "Mọi hành vi mở F12, sao chép câu hỏi hoặc dùng extension hỗ trợ sẽ bị ghi lại.",
  },
  {
    icon: "devices" as const,
    title: "Yêu cầu thiết bị khuyến nghị",
    body: "Trình duyệt Google Chrome, Edge hoặc Safari phiên bản mới nhất trên máy tính (PC/Laptop).",
  },
] as const;
