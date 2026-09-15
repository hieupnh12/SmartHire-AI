# Quản lý Gói Dịch vụ SaaS (manage-subscription-plans)

## 1. Mục đích và phạm vi
Chức năng cho phép Quản trị viên Nền tảng (**Workspace Admin / Platform Admin**) định nghĩa và cấu hình các gói dịch vụ SaaS (Subscription Plans) trên toàn hệ thống SmartHire-AI.
- Thiết lập định giá: Theo tháng (`priceMonthly`) và theo năm (`priceYearly`).
- Thiết lập hạn ngạch nghiệp vụ tuyển dụng: Số lượng tin tuyển dụng tối đa (`maxJobs`), số lượng hồ sơ CV phân tích (`maxCvParses`).
- Thiết lập hạn ngạch tài nguyên AI: Tổng thời lượng phỏng vấn AI được cấp (`maxAiInterviewHours`).
- Bật / tắt hoặc lưu trữ gói (`status`: ACTIVE, INACTIVE, ARCHIVED).

## 2. API Endpoints
- `GET /api/v1/master/subscriptions` — Lấy danh sách toàn bộ các gói thuê bao.
- `POST /api/v1/master/subscriptions` — Tạo gói dịch vụ mới.
- `PUT /api/v1/master/subscriptions/{id}` — Cập nhật hạn mức hoặc giá của gói dịch vụ.
- `PATCH /api/v1/master/subscriptions/{id}/status` — Kích hoạt hoặc ngưng áp dụng gói.

## 3. Database & Lưu trữ
- Toàn bộ dữ liệu gói dịch vụ lưu trữ tại bảng `subscription_plans` trong **Master PostgreSQL DB**.
- Khi gói dịch vụ thay đổi định mức, một sự kiện `SubscriptionPlanChangedEvent` được broadcast qua RabbitMQ để các tenant liên quan cập nhật cache hạn mức.

## 4. Danh sách sơ đồ
- `class-diagram.puml` / `class-diagram.png`: Sơ đồ lớp chi tiết phân tầng Controller - DTO - Service - Repository - Entity - Infrastructure (không chứa package Routing).
- `sequence-diagram.puml` / `sequence-diagram.png`: Sơ đồ tuần tự xử lý kiểm tra mã gói duy nhất, tạo mới và cập nhật hạn mức.
