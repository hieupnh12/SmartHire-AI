# MASTER-08 — Phân tích Tài chính & AI Nền tảng, Nhật ký Kiểm toán, Quản trị Hệ thống & Cảnh báo Tự động (Platform Analytics, Audit, Admin & Lifecycle Alerts)

**Code ID:** `MASTER-08`  
**Epic:** Master Platform — SaaS Multi-Tenant Administration  
**Trạng thái:** `Done`

## Mục đích chức năng

Cung cấp bảng điều khiển chỉ số tài chính và vận hành cấp nền tảng (**SaaS Executive Analytics — MRR, ARR, ARPA, tăng trưởng MoM, AI Cost/Health**), tra cứu **Nhật ký Kiểm toán Nền tảng (`platform_audit_logs`)**, quản lý tham số hệ thống (`system_settings`), xác thực và tài khoản Quản trị viên Nền tảng (`platform_users`), và vận hành **Bộ lập lịch Cảnh báo Tự động (`MasterNotificationScheduler` & `SubscriptionLifecycleNotificationService`)** qua Email + Chuông realtime khi gói thuê bao sắp hết hạn, quá hạn, tạm khóa hoặc doanh nghiệp chạm ngưỡng 80% / 100% hạn mức tài nguyên.

## Actor

- **Workspace Admin (`WORKSPACE_ADMIN`):** Theo dõi bảng điều khiển `/admin/dashboard` và phân tích 7 góc nhìn tại `/admin/analytics`, xuất báo cáo JSON, kiểm tra nhật ký kiểm toán (`platform_audit_logs`), quản lý tham số cấu hình (`system_settings`), đổi mật khẩu và quản trị tài khoản `platform_users`.
- **Hệ thống (`MasterNotificationScheduler` & `MasterSubscriptionService`):** Quét định kỳ theo lịch cấu hình (`app.subscription.expiry-reminder-cron`, mặc định mỗi giờ tại phút thứ 5) và xử lý chuyển trạng thái quá hạn mỗi giờ (`0 0 * * * *`) để gửi email và đẩy thông báo chuông realtime (`/ws/notifications`) tới quản trị viên doanh nghiệp khi gói thuê bao sắp hết hạn (`7D` / `3D` / `1D`), quá hạn ân hạn (`PAST_DUE`), bị tạm khóa (`SUSPENDED`) hoặc khi sử dụng chạm ngưỡng Quota (`80%` / `100%`).

## Luồng hoạt động

### 1. Phân tích Tài chính SaaS & Tình trạng AI (`MasterAnalyticsService`)
1. Workspace Admin truy cập Trang chủ Quản trị (`/admin/dashboard`) và Trang Thống kê (`/admin/analytics`).
2. `MasterAnalyticsService` tổng hợp dữ liệu thời gian thực từ `tenants`, `tenant_subscriptions`, `invoices`, `consultation_requests`, `contracts`, `tenant_usage_daily` và `tenant_ai_usage_daily`:
   - `GET /api/v1/master/analytics/revenue`: Tính **ARR** (tổng `contracted_price_yearly` hoặc giá gói năm từ các hợp đồng `ACTIVE`), **MRR** (`ARR / 12`), **ARPA** (`ARR / activeTenants`), `totalRevenue`, tỷ lệ tăng trưởng MoM (`growthRate`), đếm/tổng tiền hoá đơn `PAID`/`PENDING`/`OVERDUE`, số Lead mở & tỷ lệ chuyển đổi (`openLeadsCount`, `conversionRatePercent`), hợp đồng chờ ký (`pendingContractsCount`), phân bổ gói (`planDistribution`) và chuỗi thời gian doanh thu (`revenueTrend`).
   - `GET /api/v1/master/analytics/ai-quota`: Tính tổng CV đã phân tích, tổng giờ/giây Voice AI, tổng token tiêu thụ, số tenant gần chạm ngưỡng ≥80% (`nearQuotaTenantsCount`), chi phí AI ước tính quy đổi VNĐ (`estimatedAiCostVnd`), `apiSuccessRate`, `averageLatencyMs`, `systemHealth` (`HEALTHY`/`DEGRADED`), `activeModels` và `usageTrend`.
   - Frontend tính thêm `suspendedRate` từ danh sách tenant và hỗ trợ xuất file báo cáo JSON (`smarthire-platform-analytics-YYYY-MM-DD.json`).

### 2. Nhật ký Kiểm toán, Cấu hình Hệ thống & Tài khoản Nền tảng
1. **Nhật ký kiểm toán (`GET /api/v1/master/analytics/logs`):** Trả về 50 bản ghi mới nhất trong `platform_audit_logs` để hiển thị tại `/admin/system/logs` kèm modal xem chi tiết JSON metadata (`LogDetailModal.tsx`).
2. **Tham số hệ thống (`GET/POST /api/v1/master/system/settings`):** `SystemSettingService` cho phép đọc theo `category` và lưu cặp key-value vào `system_settings`; nếu `isEncrypted = true`, giá trị được mã hoá AES-256-GCM qua `TenantCredentialService` với context `"SYSTEM_SETTING"` và ghi audit log `SYSTEM_SETTING_UPDATED`.
3. **Xác thực & Quản trị Platform Admin (`/api/v1/master/auth/**`, `/api/v1/master/admin/users/**`):** `MasterAuthController` hỗ trợ `login`, `refresh`, `logout` (thu hồi JWT trên Redis blacklist + xoá refresh session), `change-password` và `me`; `MasterAdminUserController` cung cấp CRUD tài khoản `platform_users`.

### 3. Cảnh báo Tự động Hết hạn Gói & Chạm ngưỡng Quota (`MasterNotificationScheduler`)
1. Theo lịch cấu hình `app.subscription.expiry-reminder-cron` (mặc định `0 5 * * * *`), `MasterNotificationScheduler` quét toàn bộ doanh nghiệp đang `ACTIVE`, còn `MasterSubscriptionService` chuyển trạng thái quá hạn mỗi giờ (`0 0 * * * *`) và kích hoạt cảnh báo ngay sau khi commit (`notifyLifecycleAlertsAfterCommit`):
   - **Cảnh báo hết hạn & quá hạn thuê bao (`SUBSCRIPTION_EXPIRY_7D`, `SUBSCRIPTION_EXPIRY_3D`, `SUBSCRIPTION_EXPIRY_1D`, `SUBSCRIPTION_PAST_DUE`, `SUBSCRIPTION_SUSPENDED`):** `SubscriptionLifecycleNotificationService` gửi đồng thời email tới `billing_email` / `contact_email` (qua RabbitMQ `MasterNotificationWorker`, template `subscription-expiry.html`) **và** thông báo chuông realtime (`/ws/notifications`) vào bảng `notifications` của Tenant DB cho tất cả quản trị viên doanh nghiệp (`TENANT_ADMIN` / `ADMIN` đang `ACTIVE`) qua `TenantJobExecutor` + `TenantAdminNotificationService`.
   - **Cảnh báo chạm ngưỡng hạn mức tài nguyên (`QUOTA_WARNING` mốc 80% / 100%):** Khi tiêu thụ trong `TenantQuotaRedisService` đạt từ **80%** hoặc **100%** hạn mức `snapshot_max_*`, `MasterNotificationService` tự động xếp hàng gửi email (`quota-warning.html`), đồng thời `TenantAdminNotificationService` đẩy thông báo `QUOTA_WARNING` lên chuông quản trị trong Tenant DB.
2. Mọi email cảnh báo gửi đi đều được kiểm tra chống gửi trùng lặp bằng Redis + DB (Deduplication) và lưu vết vào `master_notification_logs` (`tenant_code`, `type`, `to_email`, `status`, `sent_at`); đồng thời thông báo trong app được ghi vào bảng `notifications` của Tenant DB kèm realtime WebSocket `/ws/notifications` để hiển thị tại chuông thông báo trên Header Admin doanh nghiệp (`RoleShell`) và banner cảnh báo trên `/internal/admin` & `/internal/admin/billing`.

## Business Rules

- Bảng `platform_audit_logs` chỉ cho phép ghi thêm (Append-only); không có API sửa hoặc xoá nhật ký kiểm toán.
- Cơ chế chống gửi trùng Redis (`email_sent:sub_alert:*`, `web_notif:sub_alert:*`, `web_notif:quota:*`) kết hợp kiểm tra DB (`masterNotificationLogRepository.existsByTenantCodeAndTypeAndStatusAndSentAtAfter` và `notificationRepository.existsByUser_IdAndTypeAndCreatedAtAfter`) đảm bảo mỗi mốc cảnh báo (`7D`/`3D`/`1D`/`PAST_DUE`/`SUSPENDED`/`QUOTA_WARNING`) chỉ gửi tối đa **01** lần trong chu kỳ tương ứng.
- Các tham số nhạy cảm trong `system_settings` khi lưu với cờ `is_encrypted = true` được mã hoá AES-256-GCM với context `"SYSTEM_SETTING"`.
- API quản trị tài khoản Platform Admin (`/api/v1/master/admin/users/**`) và các endpoint phân tích chỉ cho phép `WORKSPACE_ADMIN`.

## API liên quan

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/v1/master/analytics/revenue` | WORKSPACE_ADMIN | Doanh thu, MRR, ARR, ARPA, tăng trưởng MoM, breakdown hoá đơn, lead/hợp đồng & `revenueTrend` |
| GET | `/api/v1/master/analytics/ai-quota` | WORKSPACE_ADMIN | Tiêu thụ AI toàn sàn, chi phí AI ước tính VNĐ, tỷ lệ thành công, latency & sức khoẻ AI |
| GET | `/api/v1/master/analytics/logs` | WORKSPACE_ADMIN | 50 bản ghi nhật ký kiểm toán nền tảng mới nhất (`platform_audit_logs`) |
| GET | `/api/v1/master/system/settings` | WORKSPACE_ADMIN | Danh sách tham số hệ thống (`system_settings`, lọc `?category=`) |
| POST | `/api/v1/master/system/settings` | WORKSPACE_ADMIN | Tạo hoặc cập nhật tham số hệ thống (hỗ trợ mã hoá `isEncrypted`) |
| POST | `/api/v1/master/auth/{login\|refresh\|logout\|change-password}` | Public / WORKSPACE_ADMIN | Đăng nhập, làm mới token, đăng xuất (blacklist JWT) và đổi mật khẩu Admin nền tảng |
| GET | `/api/v1/master/auth/me` | WORKSPACE_ADMIN | Thông tin tài khoản Platform Admin đang đăng nhập |
| GET/POST | `/api/v1/master/admin/users` | WORKSPACE_ADMIN | Danh sách & tạo mới tài khoản Quản trị viên nền tảng (`platform_users`) |
| GET/PUT/DELETE | `/api/v1/master/admin/users/{id}` | WORKSPACE_ADMIN | Xem, cập nhật hoặc xoá tài khoản Quản trị viên nền tảng |

## Database liên quan

- PostgreSQL (`smarthire_master`):
  - `tenant_usage_daily` (`TenantUsageDaily`) & `tenant_ai_usage_daily` (`TenantAiUsageDaily`).
  - `platform_audit_logs` (`PlatformAuditLog`): nhật ký kiểm toán nền tảng.
  - `master_notification_logs` (`MasterNotificationLog`): nhật ký gửi email cảnh báo tự động và chống gửi lặp.
  - `system_settings` (`SystemSetting`): tham số cấu hình toàn sàn.
  - `platform_users` (`PlatformUser`): tài khoản Quản trị viên nền tảng.
- MySQL (Tenant DB từng doanh nghiệp):
  - `notifications` (`Notification`): hộp thư chuông realtime (`/ws/notifications`) gửi tới quản trị viên doanh nghiệp (`TENANT_ADMIN` / `ADMIN`).

## UI mockup

- `/admin/dashboard` ([`DashboardPage.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/dashboard/pages/DashboardPage.tsx) + [`PlatformHomeDashboard.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/dashboard/components/PlatformHomeDashboard.tsx)): Bảng điều khiển trung tâm hiển thị KPI tổng quan (tenant, doanh thu, AI usage), biểu đồ xu hướng và danh sách audit log gần đây kèm điều hướng nhanh sang các module quản trị.
- `/admin/analytics` ([`AnalyticsPage.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/analytics/pages/AnalyticsPage.tsx) + [`PlatformAnalyticsDashboard.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/analytics/components/PlatformAnalyticsDashboard.tsx)): Báo cáo chuyên sâu gồm **7 tab** (`Tổng quan`, `Doanh thu`, `Tenant health`, `AI usage`, `Hệ thống`, `Bảo mật`, `Vận hành`) và nút xuất báo cáo JSON.
- `/admin/system/logs` ([`AuditLogsPage.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/system/pages/AuditLogsPage.tsx) + [`LogDetailModal.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/system/components/modals/LogDetailModal.tsx)): Tra cứu và xem chi tiết nhật ký kiểm toán nền tảng.
- `/admin/account/{profile|security|accessibility|notifications}` ([`AccountPage.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/account/pages/AccountPage.tsx) + [`ChangePasswordModal.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/account/components/ChangePasswordModal.tsx)) & `/admin/login` ([`MasterLoginPage.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/auth/pages/MasterLoginPage.tsx)).
