export const mockAiInterview = {
  id: "INT-8921",
  title: "Phỏng vấn Kỹ thuật Java Backend — Junior",
  schedule: "09:00, 28/09/2026 (GMT+7) · Lịch mẫu",
  candidate: "Nguyễn Văn Quang",
  candidateId: "CAND-4029",
};

export const interviewQuestions = [
  { topic: "Giới thiệu & Kinh nghiệm", duration: "2 phút", question: "Hãy giới thiệu bản thân và một dự án Java mà bạn đã tham gia.", answer: "Em đã tham gia xây dựng một hệ thống tuyển dụng với Java và Spring Boot." },
  { topic: "Java Core & OOP", duration: "4 phút", question: "Bạn áp dụng tính đóng gói và tính đa hình trong Java như thế nào?", answer: "Em sử dụng interface để định nghĩa hành vi chung và các implementation riêng cho từng trường hợp." },
  { topic: "RESTful API & Exception Handling", duration: "4 phút", question: "Trong Spring Boot, bạn thường xử lý Exception toàn cục bằng cách nào? Hãy giải thích sự khác biệt giữa @ExceptionHandler tại cấp Controller và @ControllerAdvice, kèm ví dụ thực tế khi trả về HTTP Status Code phù hợp cho client.", answer: "Em thường sử dụng @RestControllerAdvice kết hợp với @ExceptionHandler để bắt các exception toàn cục như ResourceNotFoundException hoặc MethodArgumentNotValidException. Khi bắt được, em sẽ map sang một DTO phản hồi chung gồm timestamp, mã HTTP 404 hoặc 400 và thông điệp lỗi rõ ràng cho phía client..." },
  { topic: "Database & Transaction", duration: "5 phút", question: "Hãy giải thích tính chất ACID và cách bạn sử dụng @Transactional để bảo đảm dữ liệu nhất quán khi tạo đơn hàng.", answer: "Em đặt @Transactional ở service để các thao tác tạo đơn và cập nhật tồn kho cùng thuộc một transaction. Khi có lỗi, transaction được rollback để tránh dữ liệu không nhất quán." },
  { topic: "System Architecture & Logging", duration: "2 phút", question: "Bạn tổ chức các tầng Controller, Service, Repository và ghi log thế nào để dễ tìm lỗi trong hệ thống?", answer: "Controller tiếp nhận và kiểm tra request, Service xử lý nghiệp vụ, Repository truy cập dữ liệu. Em ghi log kèm mã request để theo dõi lỗi và tránh ghi dữ liệu nhạy cảm." },
  { topic: "Tình huống giải quyết xung đột", duration: "3 phút", question: "Nếu bạn và một đồng nghiệp có ý kiến khác nhau về giải pháp kỹ thuật, bạn sẽ xử lý thế nào?", answer: "Em sẽ làm rõ yêu cầu, cùng so sánh ưu nhược điểm và thử nghiệm nhỏ để có dữ liệu trước khi thống nhất giải pháp với nhóm." },
];
