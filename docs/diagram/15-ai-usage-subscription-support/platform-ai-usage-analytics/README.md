# Báo cáo & Thống kê Tiêu thụ AI Toàn Hệ thống (platform-ai-usage-analytics)

## 1. Mục đích và phạm vi
Chức năng cung cấp trung tâm báo cáo (**AI Analytics Center**) cho Quản trị viên Nền tảng (**Workspace Admin**):
- Tổng hợp tài nguyên AI đã tiêu thụ trên toàn hệ thống trong 30 ngày qua (Tổng giờ phỏng vấn AI, tổng hồ sơ CV được bóc tách phân tích, chi phí ước tính $USD).
- Xem chi tiết mức độ tiêu thụ của từng Tenant và tỷ lệ phần trăm đã dùng so với hạn mức gói thuê bao.
- Cảnh báo các Tenant sắp hoặc đã chạm ngưỡng trần quota ($\ge 80\%$ và $100\%$).

## 2. API Endpoints
- `GET /api/v1/master/analytics/ai-usage` — Lấy báo cáo KPI tổng thể toàn nền tảng.
- `GET /api/v1/master/analytics/tenants/{id}/ai-consumption` — Lấy thống kê chi tiết tiêu thụ AI theo Tenant.
- `GET /api/v1/master/analytics/tenants/top-consumers` — Top các doanh nghiệp sử dụng AI nhiều nhất.

## 3. Database & Bất đồng bộ
- **Master PostgreSQL**: Bảng `ai_usage_records` lưu trữ chi tiết từng lượt sử dụng AI được ingest từ RabbitMQ (`smarthire.ai.usage.recorded`) mà không làm ảnh hưởng hiệu năng của Tenant.
- `AiUsageEventConsumer`: Lắng nghe sự kiện ghi nhận tài nguyên và lưu trữ thống kê phục vụ tổng hợp dữ liệu.

## 4. Danh sách sơ đồ
- `class-diagram.puml` / `class-diagram.png`: Sơ đồ lớp chi tiết thể hiện tầng Controller, DTO, Service, Ingestion Consumer, Repository, Entity (không có Routing & Boundary).
- `sequence-diagram.puml` / `sequence-diagram.png`: Sơ đồ tuần tự thể hiện luồng lấy KPI tổng thể và drill-down phân tích mức độ tiêu thụ theo từng Tenant.
