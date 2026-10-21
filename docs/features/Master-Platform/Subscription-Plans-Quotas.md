# MASTER-02 — Quản lý Gói cước, Thuê bao B2B 2 Tầng & Hạn mức (Subscription Plans & Quotas)

**Code ID:** `MASTER-02`  
**Epic:** Master Platform — SaaS Multi-Tenant Administration  
**Trạng thái:** `Done`

## Mục đích chức năng

Quản lý danh mục gói cước SaaS B2B theo kiến trúc **2 tầng (Two-Tier Subscription Architecture — V27)**:
- **Tầng 1 (`subscription_plans` — Plan Catalog / Templates):** Định nghĩa bảng giá niêm yết theo năm (VNĐ), hạn mức tài nguyên (`max_jobs`, `max_cv_parses`, `max_ai_interview_hours`, `max_storage_gb`, `max_proctoring_hours`, `video_retention_days`, `features_json`), hỗ trợ **Versioning / Grandfathering** (bảo lưu giá cho khách hàng hiện hữu khi tăng giá gói) và **Custom Enterprise Plan** (gói thiết kế riêng cho từng doanh nghiệp).
- **Tầng 2 (`tenant_subscriptions` — Tenant Subscription Instance):** Lưu hợp đồng thuê bao thực tế của từng doanh nghiệp kèm **11 cột Snapshot bất biến** tại thời điểm ký kết, đảm bảo việc chỉnh sửa gói ở Tầng 1 không làm thay đổi cam kết hợp đồng đang chạy của khách hàng. Hỗ trợ nâng cấp khấu trừ theo ngày (**Prorated Upgrade**), hạ cấp cuối kỳ (**End-of-cycle Downgrade**), kiểm soát hạn mức thời gian thực (**Quota Enforcement**) và ghi đè hạn mức riêng cho từng doanh nghiệp (**Tenant Quota Override**).

## Actor

- **Workspace Admin (`WORKSPACE_ADMIN`):** Tạo/cập nhật gói cước, tạo phiên bản gói mới (Grandfathering), thiết kế gói Custom Enterprise, gán gói thuê bao cho Tenant, cấu hình nâng/hạ cấp và ghi đè hạn mức (Quota Override).
- **Tenant Admin (`TENANT_ADMIN`):** Xem thông tin gói thuê bao hiện tại, tiến độ sử dụng hạn mức (Quota Usage) và yêu cầu nâng cấp/gia hạn gói trên cổng Billing của doanh nghiệp.
- **Hệ thống (Quota Guard & Lifecycle Scheduler):** Kiểm tra hạn mức trước khi cho phép mở Job, Parse CV, Phỏng vấn AI, Giám sát thi (Proctoring); tự động quét chuyển trạng thái thuê bao hết hạn (`ACTIVE` → `PAST_DUE` → `SUSPENDED`).

## Luồng hoạt động

### 1. Quản lý Danh mục Gói cước & Versioning (Grandfathering)
1. Workspace Admin truy cập `/admin/plans` để xem danh sách gói chuẩn (`is_custom = false`) và gói thiết kế riêng (`is_custom = true`).
2. Khi tạo gói mới (`POST /api/v1/master/subscriptions/plans`), hệ thống lưu giá theo năm (`price_yearly` bằng VNĐ) và các hạn mức tài nguyên (`-1` là không giới hạn).
3. Khi chỉnh sửa giá hoặc hạn mức của gói đang có khách hàng sử dụng (`PUT /api/v1/master/subscriptions/plans/{id}`):
   - Nếu bật chế độ tạo phiên bản mới (`createNewVersion = true`), hệ thống đánh dấu bản ghi gói cũ là `is_archived = true`, `status = ARCHIVED` và sinh bản ghi gói mới với `version = oldVersion + 1`, `parent_plan_id = oldPlan.id`.
   - Các doanh nghiệp đang dùng phiên bản cũ vẫn giữ nguyên mức giá và hạn mức đã cam kết trong 11 cột snapshot của `tenant_subscriptions`.

### 2. Gán Gói Thuê bao & Snapshot Hợp đồng (11 cột V27)
1. Khi gán gói cho Tenant (`POST /api/v1/master/subscriptions/assign`) hoặc khởi tạo qua B2B Deal Wizard / Self-serve Checkout:
   - Nếu `status = ACTIVE`, hệ thống tự động đóng các bản ghi `ACTIVE`/`TRIAL` cũ của Tenant sang `UPGRADED` (đảm bảo bất biến **1 Tenant chỉ có tối đa 1 Subscription ACTIVE**).
   - Nếu `status = PENDING` (từ B2B Deal Wizard trước khi thanh toán), hệ thống giữ nguyên trạng thái `PENDING` và chỉ kích hoạt thành `ACTIVE` khi hoá đơn được thanh toán (`MasterInvoiceService.activatePaidInvoice()`).
2. Mọi bản ghi `tenant_subscriptions` đều được sao chụp đầy đủ 11 cột snapshot từ `SubscriptionPlan`: `plan_code_snapshot`, `plan_name_snapshot`, `plan_version_snapshot`, `contracted_price_yearly`, `snapshot_max_jobs`, `snapshot_max_cv_parses`, `snapshot_max_ai_interview_hours`, `snapshot_max_storage_gb`, `snapshot_max_proctoring_hours`, `snapshot_video_retention_days`, `snapshot_features_json`.

### 3. Nâng cấp Giữa kỳ (Prorated Upgrade) & Hạ cấp Cuối kỳ (Downgrade)
1. **Prorated Upgrade (`POST /api/v1/master/subscriptions/tenants/{tenantId}/upgrade`):**
   - Hệ thống tính số ngày còn lại trong chu kỳ 365 ngày hiện tại và tính tiền dư chưa sử dụng: `credit = (remainingDays / 365) * currentContractedPriceYearly`.
   - Chuyển thuê bao cũ sang `CANCELED` (`cancel_reason = UPGRADED_TO_<NEW_PLAN>`), tạo thuê bao mới với `prorated_credit_amount = credit`, `upgraded_from_subscription_id = oldSub.id` và phát hành hoá đơn phần chênh lệch `max(0, newPlanPrice - credit)`.
2. **Schedule Downgrade (`POST /api/v1/master/subscriptions/tenants/{tenantId}/downgrade`):**
   - Không cắt giảm hạn mức ngay lập tức để tránh làm gián đoạn dữ liệu đang vận hành của khách hàng; hệ thống gán `next_plan_id = targetPlan.id` để áp dụng vào kỳ gia hạn tiếp theo.

### 4. Đối chiếu Hạn mức (Quota Enforcement) & Ghi đè Hạn mức (Quota Override)
1. `MasterSubscriptionService` luôn ưu tiên đọc hạn mức từ các cột `snapshot_max_*` trên `tenant_subscriptions` đang `ACTIVE`; chỉ fallback sang `subscription_plans` đối với dữ liệu lịch sử trước V27.
2. Khi Workspace Admin cập nhật hạn mức riêng cho một doanh nghiệp (`PUT /api/v1/master/tenants/{id}/quotas`), hệ thống ghi đè trực tiếp vào các cột `snapshot_max_*` của thuê bao đang `ACTIVE` mà không làm ảnh hưởng các doanh nghiệp khác dùng chung gói gốc.

## Business Rules

- Hệ thống chỉ kinh doanh theo chu kỳ **hằng năm (Yearly, 365 ngày)** và thống nhất sử dụng đơn vị tiền tệ **VNĐ (`VND`)** làm gốc.
- Giá trị hạn mức `-1` đại diện cho **Không giới hạn (Unlimited)**; giá trị `0` đại diện cho **Khoá tính năng (Locked)**.
- Mỗi Tenant chỉ có duy nhất **01** bản ghi `tenant_subscriptions` ở trạng thái `ACTIVE` tại một thời điểm.
- Chu trình vòng đời tự động (`SubscriptionLifecycleScheduler` chạy mỗi giờ):
  - Thuê bao `ACTIVE` hoặc `TRIAL` quá hạn `ends_at`: chuyển sang `PAST_DUE` và cấp thời gian ân hạn 5 ngày (`grace_period_ends_at = now + 5 days`), đồng thời gửi email cảnh báo gia hạn.
  - Thuê bao `PAST_DUE` quá hạn `grace_period_ends_at`: chuyển sang `SUSPENDED`, đồng thời khoá tạm thời Tenant (`tenants.status = SUSPENDED`) và đóng kết nối DB pool cho tới khi thanh toán gia hạn.

## API liên quan

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/v1/master/subscriptions/plans/public` | Public | Danh sách gói chuẩn đang mở bán (`ACTIVE`, `is_custom = false`, `is_archived = false`) |
| GET | `/api/v1/master/subscriptions/plans` | WORKSPACE_ADMIN | Danh sách toàn bộ gói cước (chuẩn + custom + archived) |
| POST | `/api/v1/master/subscriptions/plans` | WORKSPACE_ADMIN | Tạo gói cước chuẩn hoặc gói Custom Enterprise |
| PUT | `/api/v1/master/subscriptions/plans/{id}` | WORKSPACE_ADMIN | Cập nhật gói hoặc phát hành version mới (Grandfathering) |
| DELETE | `/api/v1/master/subscriptions/plans/{id}` | WORKSPACE_ADMIN | Xoá mềm gói cước |
| POST | `/api/v1/master/subscriptions/assign` | WORKSPACE_ADMIN | Gán gói thuê bao cho Tenant (kèm 11 cột snapshot V27) |
| POST | `/api/v1/master/subscriptions/tenants/{tenantId}/upgrade` | WORKSPACE_ADMIN | Nâng cấp gói giữa kỳ có khấu trừ Proration |
| POST | `/api/v1/master/subscriptions/tenants/{tenantId}/downgrade` | WORKSPACE_ADMIN | Đặt lịch hạ cấp gói vào cuối chu kỳ |
| PUT | `/api/v1/master/tenants/{id}/quotas` | WORKSPACE_ADMIN | Ghi đè hạn mức trực tiếp vào snapshot thuê bao của Tenant |
| GET | `/api/v1/tenant/billing/subscription` | TENANT_ADMIN | Xem gói cước và hạn mức sử dụng hiện tại của doanh nghiệp |

## Database liên quan

- PostgreSQL (`smarthire_master`):
  - `subscription_plans` (entity `SubscriptionPlan`): danh mục gói cước Tầng 1.
  - `tenant_subscriptions` (entity `TenantSubscription`): hợp đồng thuê bao Tầng 2 kèm 11 cột snapshot V27.
  - `tenant_usage_daily` (entity `TenantUsageDaily`): số liệu tiêu thụ tài nguyên theo ngày của từng Tenant.
  - `platform_audit_logs` (entity `PlatformAuditLog`): ghi vết thao tác thay đổi gói và hạn mức.

## UI mockup

- `/admin/plans` (`PlanManagementPage.tsx`): Quản lý gói cước 2 tab (**Gói Tiêu Chuẩn** và **Gói Thiết Kế Riêng B2B**), hỗ trợ tạo phiên bản mới bảo lưu giá (Grandfathering) và cấu hình hạn mức.
- `/admin/tenants` (`TenantDirectoryPage.tsx`): Drawer cấu hình **Ghi đè hạn mức (Quota Override)** và modal gán/nâng cấp gói cho từng doanh nghiệp.
- `/admin/billing` (Tenant Workspace): Hiển thị thông tin gói đang áp dụng và thanh tiến độ tiêu thụ Quota.
