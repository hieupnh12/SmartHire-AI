# Kiểm soát Hạn ngạch AI & Thực thi Giới hạn (ai-quota-guard-enforcement)

## 1. Mục đích và phạm vi
Chức năng này bảo vệ tài nguyên AI và chi phí vận hành nền tảng (LLM API tokens, STT streaming, CV screening compute) bằng cơ chế chốt chặn phân tán (**Distributed Quota Guard**):
- Đánh chặn request trước khi gọi các dịch vụ AI tốn kém (OpenAI, Gemini, Whisper STT).
- Sử dụng Redis Atomic Script để kiểm tra số lượng đơn vị khả dụng so với giới hạn của gói thuê bao (`maxCvParses`, `maxAiInterviewHours`).
- Trả về mã lỗi `HTTP 429 Too Many Requests` ngay tại Filter layer nếu vượt quá quota, ngăn chặn thất thoát chi phí hạ tầng.
- Ghi nhận và phát sự kiện tiêu thụ AI bất đồng bộ qua RabbitMQ để Master DB lưu trữ báo cáo mà không làm tăng độ trễ (latency) của luồng chính.

## 2. Kiến trúc Chốt chặn
- `AiQuotaGuardFilter`: Bộ lọc kiểm tra quota ngay khi request đến API Gateway của Tenant.
- `RedisDistributedCache`: Lưu trữ Hash `tenant:{code}:quota:limits` và `tenant:{code}:quota:usage` với các thao tác nguyên tử (`HINCRBY`).
- `RabbitMQ`: Đẩy bản tin `AiUsageReportEvent` về hàng đợi để ghi nhận nhật ký tiêu thụ tập trung.

## 3. Danh sách sơ đồ
- `class-diagram.puml` / `class-diagram.png`: Sơ đồ lớp chi tiết phân tầng Filter, Controller, DTO, Service, Entity, Cache, Queue (không có Routing & Boundary).
- `sequence-diagram.puml` / `sequence-diagram.png`: Sơ đồ tuần tự thể hiện luồng chặn quota vi phạm (429) và luồng gọi thành công - commit usage.
