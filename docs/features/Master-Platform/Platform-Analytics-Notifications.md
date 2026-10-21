# MASTER-08 — Phân tích Doanh thu SaaS, Nhật ký Kiểm toán & Cảnh báo Tự động (Platform Analytics, Audit & Alerts)

**Code ID:** `MASTER-08`  
**Epic:** Master Platform — SaaS Multi-Tenant Administration  
**Trạng thái:** `Done`

## Mục đích chức năng

Cung cấp bảng điều khiển chỉ số tài chính và vận hành cấp nền tảng (**SaaS Executive Analytics — ARR, NRR, Churn Rate, Gross Margin**), quản lý cấu hình toàn sàn (`system_settings`), hỗ trợ kỹ thuật qua cơ chế **Đăng nhập hộ có kiểm toán (Support Impersonation)**, lưu vết **Nhật ký Kiểm toán Nền tảng (`platform_audit_logs`)** và vận hành **Bộ lập lịch Cảnh báo Email Tự động (`MasterNotificationScheduler`)** khi gói thuê bao sắp hết hạn hoặc khi doanh nghiệp chạm ngưỡng 80% / 100% hạn mức tài nguyên.

## Actor

- **Workspace Admin (`WORKSPACE_ADMIN`):** Theo dõi biểu đồ doanh thu ARR/NRR/Churn, kiểm tra nhật ký kiểm toán (`platform_audit_logs`), cấu hình tham số hệ thống (`system_settings`) và thực hiện Impersonation để hỗ trợ khách hàng.
- **Hệ thống (`MasterNotificationScheduler`):** Quét định kỳ mỗi ngày để gửi email cảnh báo gia hạn gói cước và cảnh báo chạm ngưỡng hạn mức (Quota 80% / 100%) tới email quản trị của từng doanh nghiệp.

## Luồng hoạt động

### 1. Phân tích Chỉ số Kinh doanh SaaS B2B (ARR, NRR, Churn & AI Margin)
1. Workspace Admin truy cập Dashboard Tổng quan (`/admin`) và trang Phân tích Nền tảng (`/admin/analytics`).
2. `MasterAnalyticsService` tổng hợp dữ liệu thời gian thực từ `tenants`, `tenant_subscriptions`, `invoices`, `tenant_usage_daily` và `tenant_ai_usage_daily` để tính toán:
   - **ARR (Annual Recurring Revenue — VNĐ):** Tổng doanh thu định kỳ hằng năm từ các hợp đồng thuê bao đang `ACTIVE` (ưu tiên đọc từ `contracted_price_yearly` snapshot V27).
   - **NRR (Net Revenue Retention — %):** Tỷ lệ duy trì doanh thu thuần (bao gồm doanh thu mở rộng từ nâng cấp gói trừ đi doanh thu mất đi do huỷ gói).
   - **Logo Churn Rate (%):** Tỷ lệ doanh nghiệp ngừng sử dụng hoặc huỷ gói thuê bao.
   - **Biểu đồ Doanh thu Thực thu & Dự báo (12 tháng — VNĐ):** Tổng hợp từ các hoá đơn `PAID`.
   - **Hiệu quả Chi phí AI (AI Cost vs Revenue):** Đối chiếu chi phí token AI thực tế (`tenant_ai_usage_daily.estimated_cost_usd`) với doanh thu gói cước của từng doanh nghiệp.

### 2. Đăng nhập Hộ Hỗ trợ Kỹ thuật (Support Impersonation)
1. Khi khách hàng cần hỗ trợ kỹ thuật, Workspace Admin bấm **Impersonate** trên dòng doanh nghiệp tại `/admin/tenants` (`POST /api/v1/master/tenants/{id}/impersonate`).
2. Backend kiểm tra Tenant đang `ACTIVE`, sinh JWT ngắn hạn (hiệu lực 15 phút) với quyền `TENANT_ADMIN` gắn đúng `tenantCode` của doanh nghiệp đó, đồng thời bắt buộc ghi một bản ghi kiểm toán mức `WARN` vào `platform_audit_logs` (`action = IMPERSONATE_TENANT`, kèm địa chỉ IP và email của Workspace Admin).

### 3. Cảnh báo Email Tự động Hết hạn Gói & Chạm ngưỡng Quota (`MasterNotificationScheduler`)
1. Mỗi ngày lúc `08:30`, `MasterNotificationScheduler` tự động thực thi hai tác vụ kiểm tra trên toàn bộ các doanh nghiệp đang `ACTIVE`:
   - **Cảnh báo sắp hết hạn thuê bao (`SUBSCRIPTION_EXPIRY_7D`, `SUBSCRIPTION_EXPIRY_3D`, `SUBSCRIPTION_EXPIRY_1D`):** Quét các thuê bao còn đúng 7 ngày, 3 ngày hoặc 1 ngày trước mốc `ends_at` để gửi email nhắc gia hạn tới `billing_email` / `contact_email` của doanh nghiệp.
   - **Cảnh báo chạm ngưỡng hạn mức tài nguyên (`QUOTA_WARNING_<METRIC>_80_<YYYY-MM>`, `QUOTA_EXHAUSTED_<METRIC>_100_<YYYY-MM>`):** Đối chiếu mức tiêu thụ thực tế (số tin tuyển dụng đang mở, lượt Parse CV trong tháng, số giờ phỏng vấn AI Voice, số giờ giám sát thi Proctoring, dung lượng lưu trữ GB) với hạn mức `snapshot_max_*` của doanh nghiệp. Khi đạt từ **80%** hoặc **100%** hạn mức, hệ thống tự động gửi email cảnh báo tới doanh nghiệp.
2. Mọi email cảnh báo gửi đi đều được kiểm tra chống gửi trùng lặp (Deduplication) và lưu vết vào bảng `master_notification_logs` (`tenant_code`, `type`, `to_email`, `status`, `sent_at`).

## Business Rules

- Bảng `platform_audit_logs` chỉ cho phép ghi thêm (Append-only); không có API sửa hoặc xoá nhật ký kiểm toán.
- Cơ chế chống gửi trùng (`masterNotificationLogRepository.existsByTenantCodeAndTypeAndStatusAndSentAtAfter`) đảm bảo mỗi mốc cảnh báo hết hạn (`7D`/`3D`/`1D`) hoặc mỗi mốc cảnh báo Quota (`80%`/`100%`) của từng chỉ số chỉ gửi tối đa **01** email cho doanh nghiệp trong chu kỳ đó.
- Các tham số nhạy cảm trong `system_settings` (`is_encrypted = true`) được che dấu giá trị khi hiển thị và chỉ `WORKSPACE_ADMIN` mới có quyền cập nhật.

## API liên quan

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/v1/master/analytics/overview` | WORKSPACE_ADMIN | Chỉ số tổng quan Dashboard (Tổng Tenant, ARR, Doanh thu, Usage) |
| GET | `/api/v1/master/analytics/charts` | WORKSPACE_ADMIN | Dữ liệu biểu đồ tăng trưởng, phân bổ gói, ARR, NRR, Churn Rate |
| GET | `/api/v1/master/analytics/audit-logs` | WORKSPACE_ADMIN | Tra cứu nhật ký kiểm toán cấp nền tảng (`platform_audit_logs`) |
| POST | `/api/v1/master/tenants/{id}/impersonate` | WORKSPACE_ADMIN | Phát hành token hỗ trợ kỹ thuật 15 phút kèm ghi Audit Log |
| GET | `/api/v1/master/settings` | WORKSPACE_ADMIN | Danh sách cấu hình hệ thống toàn sàn (`system_settings`) |
| PUT | `/api/v1/master/settings` | WORKSPACE_ADMIN | Cập nhật cấu hình hệ thống toàn sàn |
| GET | `/api/v1/master/settings/public/company-info` | Public | Thông tin pháp nhân Bên A hiển thị công khai trên Hợp đồng / Hoá đơn |

## Database liên quan

- PostgreSQL (`smarthire_master`):
  - `tenant_usage_daily` (`TenantUsageDaily`) & `tenant_ai_usage_daily` (`TenantAiUsageDaily`).
  - `platform_audit_logs` (`PlatformAuditLog`): nhật ký kiểm toán nền tảng.
  - `master_notification_logs` (`MasterNotificationLog`): nhật ký gửi email cảnh báo tự động và chống gửi lặp.
  - `system_settings` (`SystemSetting`): tham số cấu hình toàn sàn.

## UI mockup

- `/admin` (`WorkspaceAdminDashboard.tsx`): Bảng điều khiển trung tâm của Landlord hiển thị KPI toàn sàn, danh sách doanh nghiệp, biểu đồ doanh thu và nhật ký kiểm toán thời gian thực.
- `/admin/analytics` (`PlatformAnalyticsPage.tsx`): Báo cáo chuyên sâu ARR, NRR, Churn Rate, phân bổ gói thuê bao và mức tiêu thụ tài nguyên.
- `/admin/settings` (`SystemSettingsPage.tsx`): Quản lý thông tin pháp nhân SmartHire, cấu hình ngân hàng VietQR, bảo mật và giới hạn kết nối Multi-Tenant.
