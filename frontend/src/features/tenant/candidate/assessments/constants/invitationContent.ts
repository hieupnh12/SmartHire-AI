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
