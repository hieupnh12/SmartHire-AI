# MASTER-02 — Quản lý Gói cước, Thuê bao B2B 2 Tầng & Hạn mức (Subscription Plans & Quotas)

**Code ID:** `MASTER-02`  
**Epic:** Master Platform — SaaS Multi-Tenant Administration  
**Trạng thái:** `Done`

## Mục đích chức năng

Quản lý danh mục gói cước SaaS B2B theo kiến trúc **2 tầng (Two-Tier Subscription Architecture — V27)**:
- **Tầng 1 (`subscription_plans` — Plan Catalog / Templates):** Định nghĩa bảng giá niêm yết theo năm (VNĐ), hạn mức tài nguyên (`max_jobs`, `max_cv_parses`, `max_ai_interview_hours`, `max_storage_gb`, `max_proctoring_hours`, `video_retention_days`, `features_json`), hỗ trợ **Versioning / Grandfathering** (bảo lưu giá cho khách hàng hiện hữu khi tăng giá gói) và **Custom Enterprise Plan** (gói thiết kế riêng cho từng doanh nghiệp).
- **Tầng 2 (`tenant_subscriptions` — Tenant Subscription Instance):** Lưu hợp đồng thuê bao thực tế của từng doanh nghiệp kèm **11 cột Snapshot bất biến** tại thời điểm ký kết, đảm bảo việc chỉnh sửa gói ở Tầng 1 không làm thay đổi cam kết hợp đồng đang chạy của khách hàng. Hỗ trợ nâng cấp khấu trừ theo ngày (**Prorated Upgrade** — chờ thanh toán khi phát sinh số tiền > 0), gia hạn chu kỳ (**Renewal**), bật/tắt tự động gia hạn (**Auto-Renew**), hạ cấp cuối kỳ (**End-of-cycle Downgrade**), kiểm soát hạn mức thời gian thực (**Quota Enforcement**) và ghi đè hạn mức riêng cho từng doanh nghiệp (**Tenant Quota Override**).

## Actor

- **Workspace Admin (`WORKSPACE_ADMIN`):** Tạo/cập nhật gói cước, tạo phiên bản gói mới (Grandfathering), thiết kế gói Custom Enterprise, gán gói thuê bao cho Tenant, cấu hình nâng/hạ cấp và ghi đè hạn mức (Quota Override).
- **Tenant Admin (`TENANT_ADMIN`):** Xem thông tin gói thuê bao hiện tại, tiến độ sử dụng hạn mức (Quota Usage), chủ động gia hạn bản quyền, cấu hình tự động gia hạn, xem dự toán nâng/hạ cấp gói (Proration) và thanh toán hóa đơn trực tuyến ngay trong Workspace (`/internal/admin/billing`).
- **Hệ thống (Quota Guard & Lifecycle Scheduler):** Kiểm tra hạn mức trước khi cho phép mở Job, Parse CV, Phỏng vấn AI, Giám sát thi (Proctoring); tự động quét chuyển trạng thái thuê bao hết hạn (`ACTIVE` → `PAST_DUE` → `SUSPENDED`).

## Luồng hoạt động

### 1. Quản lý Danh mục Gói cước & Versioning (Grandfathering)
1. Workspace Admin truy cập `/admin/subscriptions/plans` (`BillingPage.tsx` & `BillingWorkspace.tsx`) để xem danh sách gói chuẩn (`is_custom = false`) và gói thiết kế riêng (`is_custom = true`), hoặc `/admin/subscriptions/create` (`CreateSubscriptionPlanPage.tsx`) để tạo mới.
2. Khi tạo gói mới (`POST /api/v1/master/subscriptions`), hệ thống lưu giá theo năm (`price_yearly` bằng VNĐ) và các hạn mức tài nguyên (`-1` là không giới hạn).
3. Khi chỉnh sửa giá hoặc hạn mức của gói (`PUT /api/v1/master/subscriptions/{id}`):
   - **Tự động Grandfathering (Immutable Tier 1):** Nếu gói đang có ít nhất một `tenant_subscriptions` tham chiếu (`subscriptionRepository.existsByPlanId(id)`), hệ thống tự động đổi mã gói cũ thành `<CODE>_V<ver>_<id>`, đánh dấu `is_archived = true`, `status = ARCHIVED` và sinh bản ghi gói mới với `version = oldVersion + 1`, `parent_plan_id = oldPlan.id`, `status = ACTIVE`. Các doanh nghiệp đang dùng phiên bản cũ vẫn giữ nguyên mức giá và hạn mức đã cam kết trong 11 cột snapshot của `tenant_subscriptions`. Nếu chưa có thuê bao nào, hệ thống cập nhật tại chỗ và xoá cache Redis (`evictAllTenantPlanCaches`).
4. Admin cũng có thể đổi trạng thái gói (`PATCH /api/v1/master/subscriptions/{id}/status?status=ACTIVE|INACTIVE|ARCHIVED`) hoặc nhân bản gói template thành Gói Custom Enterprise riêng cho một doanh nghiệp qua `POST /api/v1/master/subscriptions/{id}/clone-custom` (`CloneCustomPlanRequest`; nếu `activateImmediately = true`, tự động gán gói vừa tạo ở trạng thái `ACTIVE`).

### 2. Gán Gói Thuê bao & Snapshot Hợp đồng (11 cột V27)
1. Khi gán gói, tùy biến snapshot hoặc cập nhật trạng thái thuê bao cho Tenant (`PUT /api/v1/master/subscriptions/tenants/{tenantId}` — tab Phân bổ gói `/admin/subscriptions/allocations`) hoặc khởi tạo qua B2B Deal Wizard / Self-serve Checkout:
   - Nếu đổi gói trên `PUT /api/v1/master/subscriptions/tenants/{tenantId}`, hệ thống đóng bản ghi đang chạy (`ACTIVE`/`TRIAL`/`PAST_DUE`) sang `CANCELED` (`cancel_reason = REPLACED_BY_ADMIN_ASSIGNMENT`) và tạo bản ghi `tenant_subscriptions` mới ở trạng thái `ACTIVE` liên kết `upgraded_from_subscription_id` (đảm bảo bất biến **1 Tenant chỉ có tối đa 1 Subscription ACTIVE**).
   - Nếu bản ghi được tạo ở trạng thái `PENDING` (từ B2B Deal Wizard, Hợp đồng, hoặc Self-serve Upgrade trước khi thanh toán), hệ thống chỉ kích hoạt thành `ACTIVE` (đồng thời đóng các bản ghi `ACTIVE`/`TRIAL`/`PAST_DUE`/`PENDING` cũ sang `CANCELED` với lý do `UPGRADED_TO_<CODE>` / `SUPERSEDED_BY_SUBSCRIPTION_<ID>`) khi hoá đơn được thanh toán (`MasterBillingService.completePaidInvoice()`).
2. Mọi bản ghi `tenant_subscriptions` đều được sao chụp đầy đủ 11 cột snapshot từ `SubscriptionPlan`: `plan_code_snapshot`, `plan_name_snapshot`, `plan_version_snapshot`, `contracted_price_yearly`, `snapshot_max_jobs`, `snapshot_max_cv_parses`, `snapshot_max_ai_interview_hours`, `snapshot_max_storage_gb`, `snapshot_max_proctoring_hours`, `snapshot_video_retention_days`, `snapshot_features_json`.

### 3. Tự phục vụ của Tenant Admin: Nâng cấp (Proration), Gia hạn, Hạ cấp cuối kỳ
1. **Nâng cấp giữa kỳ (Self-serve Upgrade — `/internal/admin/billing`):**
   - Tenant Admin xem bảng gói tiêu chuẩn từ `GET /api/v1/public/checkout/plans` và gọi `GET /api/v1/tenant/company/subscription/change-preview?targetPlanCode=...` để tính số ngày dư còn lại và số tiền khấu trừ Proration (`credit = (remainingDays / totalCycleDays) * currentContractedPriceYearly`).
   - Khi xác nhận (`POST /api/v1/tenant/company/subscription/change-plan`):
     - Nếu `netAmountDue > 0`: hệ thống huỷ các hoá đơn self-serve `PENDING` cũ, giữ nguyên thuê bao hiện tại đang chạy để không gián đoạn dịch vụ, tạo thuê bao mới ở trạng thái `PENDING` và phát hành hoá đơn `PENDING` (`SUBSCRIPTION_UPGRADE` + `PRORATION_CREDIT`) kèm mở modal thanh toán (**VietQR SePay / VNPay / PayPal**). Khi hoá đơn chuyển sang `PAID`, hệ thống tự động đóng thuê bao cũ sang `CANCELED` và kích hoạt thuê bao mới + xoá cache quota Redis.
     - Nếu `netAmountDue == 0` (đã đủ tiền khấu trừ Proration): hệ thống kích hoạt gói mới ngay lập tức và xuất hoá đơn `PAID`.
2. **Gia hạn bản quyền (`POST /api/v1/tenant/company/subscription/renew`):**
   - Hỗ trợ gia hạn từ `1` đến `5` năm cho gói hiện tại (hoặc kích hoạt chu kỳ trả phí nếu doanh nghiệp đang dùng gói mặc định `FALLBACK_STARTER`).
   - Gia hạn sớm khi gói còn hạn (`endsAt > now`) sẽ cộng dồn tiếp từ `endsAt` để bảo toàn 100% số ngày còn lại. Nếu đang ở trạng thái `PAST_DUE` hoặc `SUSPENDED`, thanh toán gia hạn xong sẽ tự động khôi phục trạng thái `ACTIVE` cho cả thuê bao và Tenant.
3. **Bật/tắt Tự động gia hạn (`PATCH /api/v1/tenant/company/subscription/auto-renew`):**
   - Cho phép Tenant Admin bật hoặc tắt cờ `autoRenew` trên thuê bao hiện hành (từ chối sạch nếu doanh nghiệp đang ở `FALLBACK_STARTER` chưa có hợp đồng trả phí).
4. **Lên lịch / Huỷ hạ cấp cuối kỳ (`POST .../change-plan`, `DELETE .../scheduled-downgrade`):**
   - Hạ cấp luôn áp dụng vào cuối chu kỳ (`next_plan_id`) để bảo toàn dữ liệu và các tin tuyển dụng đang mở.

### 4. Đối chiếu Hạn mức (Quota Enforcement) & Ghi đè Hạn mức (Quota Override)
1. `TenantQuotaRedisService` (lớp thực thi runtime với Redis keys `sub:tenant:{code}:{features|limits|status}` TTL 24h và `sub:tenant:{code}:usage:{yyyyMM}` TTL 60d) và `TenantSubscriptionQuotaService` (cổng tự phục vụ) luôn ưu tiên đọc hạn mức từ các cột `snapshot_*` trên `tenant_subscriptions` đang vận hành (`ACTIVE`, `TRIAL`, `PAST_DUE`; bỏ qua `PENDING`), chỉ fallback sang gói `STARTER` khi Tenant chưa có thuê bao chính thức (`FALLBACK_STARTER`). Khi `TenantQuotaRedisService.ensureSubscriptionOperational()` phát hiện trạng thái `SUSPENDED`, `CANCELED` hoặc `EXPIRED`, hệ thống chặn thao tác tài nguyên với HTTP **402 Payment Required** (`SUBSCRIPTION_SUSPENDED` / `SUBSCRIPTION_CANCELED`).
2. Khi Workspace Admin cập nhật hạn mức riêng cho một doanh nghiệp (`PUT /api/v1/master/subscriptions/tenants/{tenantId}` hoặc cập nhật hạn mức AI / AI Kill Switch qua `PUT /api/v1/master/ai/quotas/{tenantId}`), hệ thống ghi đè trực tiếp vào các cột `snapshot_*` của `tenant_subscriptions` và gọi `TenantQuotaRedisService.evictCache(tenantCode)` ngay lập tức mà không làm ảnh hưởng các doanh nghiệp khác dùng chung gói gốc.

## Business Rules

- Hệ thống kinh doanh theo chu kỳ **hằng năm (Yearly, 365 ngày)** và thống nhất sử dụng đơn vị tiền tệ **VNĐ (`VND`)** làm gốc.
- Giá trị hạn mức `-1` (hoặc `null`) đại diện cho **Không giới hạn (Unlimited)**; giá trị `0` đại diện cho **Không hỗ trợ / Khoá tính năng (Unsupported / Locked)**; thống nhất định dạng hiển thị qua `PlanQuotaFormatter` (BE) và `formatQuotaLimit` (FE) kèm đơn vị `/tháng` cho hạn mức chu kỳ tháng.
- Mỗi Tenant chỉ có duy nhất **01** bản ghi `tenant_subscriptions` ở trạng thái `ACTIVE` tại một thời điểm; thuê bao nâng cấp chưa thanh toán nằm ở trạng thái `PENDING` và không làm gián đoạn hoặc hiển thị sai gói hiện hành trước khi thanh toán xong.
- Chỉ `TENANT_ADMIN` / `ADMIN` mới được phép thay đổi gói, gia hạn, bật/tắt tự động gia hạn, xem thông tin thanh toán hoặc huỷ hoá đơn; các role HR/Recruiter/Staff chỉ được đọc thông tin quota ở `GET /api/v1/tenant/company/subscription`.
- Chu trình vòng đời tự động (`MasterSubscriptionService.processSubscriptionLifecycleTransitions()`, `@Scheduled(cron = "0 0 * * * *")` chạy mỗi giờ):
  - Thuê bao `ACTIVE` hoặc `TRIAL` quá hạn `ends_at`: nếu có `next_plan_id` (đã hẹn hạ cấp cuối kỳ), đóng gói cũ sang `EXPIRED` (`DOWNGRADED_AT_CYCLE_END`) và sinh thuê bao gói mới (`PAST_DUE` với 5 ngày ân hạn nếu `autoRenew = true`, ngược lại `SUSPENDED`); nếu không có `next_plan_id`, chuyển thuê bao sang `PAST_DUE` với `DEFAULT_GRACE_PERIOD_DAYS = 5` ngày ân hạn.
  - Thuê bao `PAST_DUE` quá hạn `grace_period_ends_at`: chuyển `tenant_subscriptions.status` sang `SUSPENDED` (kích hoạt `TenantQuotaRedisService.ensureSubscriptionOperational()` chặn thao tác tạo/dùng tài nguyên ở mã HTTP 402; dữ liệu DB Tenant vẫn được giữ nguyên).
  - Thuê bao `SUSPENDED` quá 30 ngày sau `grace_period_ends_at`: tự động chuyển sang `CANCELED` (`NON_PAYMENT_TIMEOUT`).
  - Sau khi commit, kích hoạt `SubscriptionLifecycleNotificationService.notifySubscriptionsByIds(...)` gửi email + thông báo chuông (`notifications`), đồng thời `MasterNotificationScheduler` quét bổ sung lúc phút thứ 5 mỗi giờ (`0 5 * * * *`).

## API liên quan

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/v1/public/checkout/plans` | Public | Danh sách gói chuẩn đang mở bán (`ACTIVE`, `is_custom = false`, `is_archived = false`) |
| GET | `/api/v1/master/subscriptions` | WORKSPACE_ADMIN | Danh sách toàn bộ gói cước Tầng 1 (chuẩn + custom + archived) |
| GET | `/api/v1/master/subscriptions/{id}` | WORKSPACE_ADMIN | Chi tiết một gói cước theo ID |
| POST | `/api/v1/master/subscriptions` | WORKSPACE_ADMIN | Tạo gói cước chuẩn hoặc gói Custom Enterprise |
| PUT | `/api/v1/master/subscriptions/{id}` | WORKSPACE_ADMIN | Cập nhật gói (tự động Grandfathering sang `v(n+1)` nếu đang có thuê bao tham chiếu) |
| PATCH | `/api/v1/master/subscriptions/{id}/status?status=...` | WORKSPACE_ADMIN | Đổi trạng thái gói (`ACTIVE` \| `INACTIVE` \| `ARCHIVED`) |
| POST | `/api/v1/master/subscriptions/{id}/clone-custom` | WORKSPACE_ADMIN | Nhân bản từ gói mẫu thành Gói Custom Enterprise riêng cho 1 Tenant |
| GET | `/api/v1/master/subscriptions/tenants` | WORKSPACE_ADMIN | Danh sách thuê bao Tầng 2 (`tenant_subscriptions` + snapshot V27) của mọi Tenant |
| GET | `/api/v1/master/subscriptions/tenants/{tenantId}` | WORKSPACE_ADMIN | Chi tiết thuê bao và snapshot hiện hành của một Tenant |
| PUT | `/api/v1/master/subscriptions/tenants/{tenantId}` | WORKSPACE_ADMIN | Gán gói mới hoặc ghi đè giá / 11 cột snapshot hạn mức / trạng thái thuê bao cho Tenant |
| PUT | `/api/v1/master/ai/quotas/{tenantId}` | WORKSPACE_ADMIN | Ghi đè hạn mức AI (`snapshot_max_cv_parses`, `snapshot_max_ai_interview_hours`) & AI Kill Switch |
| GET | `/api/v1/tenant/company/subscription` | TENANT_ADMIN, HR, RECRUITER | Xem gói cước hiện hành, tiến độ Quota và lịch sử hoá đơn của doanh nghiệp |
| GET | `/api/v1/tenant/company/subscription/change-preview` | TENANT_ADMIN | Dự toán nâng cấp (Proration) hoặc hạ cấp cuối chu kỳ |
| POST | `/api/v1/tenant/company/subscription/change-plan` | TENANT_ADMIN | Tạo yêu cầu/hoá đơn nâng cấp hoặc lên lịch hạ cấp gói |
| POST | `/api/v1/tenant/company/subscription/renew` | TENANT_ADMIN | Tạo hoá đơn gia hạn chu kỳ (1–5 năm) |
| PATCH | `/api/v1/tenant/company/subscription/auto-renew` | TENANT_ADMIN | Bật hoặc tắt tự động gia hạn |
| GET | `/api/v1/tenant/company/subscription/invoices/{invoiceId}/checkout` | TENANT_ADMIN | Lấy thông tin VietQR & cổng thanh toán cho hoá đơn thuộc doanh nghiệp |
| POST | `/api/v1/tenant/company/subscription/invoices/{invoiceId}/cancel` | TENANT_ADMIN | Huỷ hoá đơn `PENDING` và thuê bao `PENDING` đi kèm |
| DELETE | `/api/v1/tenant/company/subscription/scheduled-downgrade` | TENANT_ADMIN | Huỷ lịch hạ cấp cuối kỳ |

## Database liên quan

- PostgreSQL (`smarthire_master`):
  - `subscription_plans` (entity `SubscriptionPlan`): danh mục gói cước Tầng 1.
  - `tenant_subscriptions` (entity `TenantSubscription`): hợp đồng thuê bao Tầng 2 kèm 11 cột snapshot V27.
  - `tenant_usage_daily` (entity `TenantUsageDaily`): số liệu tiêu thụ tài nguyên theo ngày của từng Tenant.
  - `platform_audit_logs` (entity `PlatformAuditLog`): ghi vết thao tác thay đổi gói và hạn mức.

## UI mockup

- `/admin/subscriptions/{overview|plans|allocations}` (`BillingPage.tsx` & `BillingWorkspace.tsx`): Quản trị doanh thu gói, danh mục gói cước (modal chỉnh sửa bảo lưu Grandfathering `v(n+1)` hoặc Clone Custom Enterprise cho 1 Tenant) và bảng phân bổ/chuyển đổi gói Snapshot V27 cho từng doanh nghiệp.
- `/admin/subscriptions/create` (`CreateSubscriptionPlanPage.tsx`): Form tạo gói cước mới theo năm (VNĐ) kèm cấu hình 6 hạn mức & tính năng.
- `/admin/system/ai-quotas` (`AiManagementPage.tsx` & `SystemManagementWorkspace.tsx`): Kiểm soát tiêu thụ hạn mức AI, ghi đè quota AI theo Tenant và bật/tắt AI Kill Switch.
- `/internal/admin/billing` (`SubscriptionBillingPage.tsx` & `InvoicePaymentModal.tsx`): Trang quản trị Gói cước, Gia hạn, Tự động gia hạn, So sánh/Nâng cấp gói động từ DB, Quota Telemetry và Thanh toán hoá đơn cho Tenant Admin.
- `/internal/admin/analytics` (`AnalyticsPage.tsx`): Theo dõi Quota Telemetry của doanh nghiệp và điều hướng sang quản trị gói.
