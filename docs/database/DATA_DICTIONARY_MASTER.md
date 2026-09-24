# Data Dictionary — Master DB (PostgreSQL)

> Trở về [Database Design & ERD](README.md) · Xem thêm [Data Dictionary Tenant](DATA_DICTIONARY_TENANT.md)

**Database:** `smarthire_master` · **RDBMS:** PostgreSQL · **Số bảng:** 8
**Nguồn:** `backend/src/main/resources/db/migration/master/V1…V8`
**Entity:** `com.smarthire.domain.master.entity` · **Hibernate:** `hbm2ddl.auto = validate`

Ký hiệu: `PK` khoá chính · `FK` khoá ngoại đã khai báo · `UQ` thuộc ràng buộc unique · `IDX` có index ·
`?` cho phép NULL · `ref*` trông như khoá ngoại nhưng **không** có ràng buộc.

Mọi entity master đều dùng `LocalDateTime` cho cột thời gian và ánh xạ khoá ngoại bằng `Long` thô
(không có association JPA).

---

## 1. `tenants` — Doanh nghiệp khách hàng

Entity `TenantInfo`. Gốc của toàn bộ Master DB. Mỗi dòng đại diện một doanh nghiệp cùng thông tin kết nối
tới database MySQL riêng của họ.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT IDENTITY | PK | Không | auto | Định danh tenant |
| `code` | VARCHAR(64) | UQ | Không | — | Mã doanh nghiệp, dùng trong header `X-Tenant-ID` |
| `name` | VARCHAR(255) | | Không | — | Tên hiển thị của doanh nghiệp |
| `subdomain` | VARCHAR(128) | UQ | Không | — | Subdomain truy cập, ghép với `TENANT_BASE_DOMAIN` |
| `db_name` | VARCHAR(128) | UQ | Không | — | Tên database MySQL riêng |
| `db_url` | VARCHAR(512) | | Có | NULL | JDBC URL đầy đủ tới database tenant |
| `db_username` | VARCHAR(128) | | Có | NULL | Tài khoản MySQL của tenant |
| `db_password` | VARCHAR(1024) | | Có | NULL | **Đã mã hoá** bằng `TENANT_CREDENTIALS_KEY`; gắn `@JsonIgnore` (V2 mở rộng từ 255) |
| `managed_database` | BOOLEAN | | Không | FALSE | `TRUE` nếu database do nền tảng tự cấp phát (V2) |
| `status` | VARCHAR(32) | | Không | `'ACTIVE'` | Trạng thái vận hành của tenant |
| `logo_url` | VARCHAR(512) | | Có | NULL | Logo công ty (V4) |
| `website` | VARCHAR(255) | | Có | NULL | Website công ty (V4) |
| `address` | VARCHAR(512) | | Có | NULL | Địa chỉ (V4) |
| `industry` | VARCHAR(128) | | Có | NULL | Ngành nghề (V4) |
| `company_size` | VARCHAR(64) | | Có | NULL | Quy mô nhân sự (V4) |
| `description` | TEXT | | Có | NULL | Giới thiệu công ty (V4) |
| `is_verified` | BOOLEAN | | Không | FALSE | Đã được nền tảng xác minh (V4) |
| `contact_name` | VARCHAR(255) | | Có | NULL | Người liên hệ chính (V5) |
| `contact_email` | VARCHAR(255) | | Có | NULL | Email liên hệ (V5) |
| `contact_phone` | VARCHAR(32) | | Có | NULL | Điện thoại liên hệ (V5) |
| `billing_email` | VARCHAR(255) | | Có | NULL | Email nhận hoá đơn (V5) |
| `created_at` | TIMESTAMP | | Không | now | Thời điểm onboarding |
| `updated_at` | TIMESTAMP | | Không | now | Cập nhật qua `@PreUpdate` |

**Ràng buộc:** `uk_tenants_code`, `uk_tenants_subdomain`, `uk_tenants_dbname`

---

## 2. `subscription_plans` — Gói dịch vụ

Entity `SubscriptionPlan`. Bảng tra cứu định nghĩa giá và hạn mức tiêu thụ của từng gói.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT IDENTITY | PK | Không | auto | Định danh gói |
| `code` | VARCHAR(64) | UQ | Không | — | Mã gói, ví dụ `STARTER`, `PRO` |
| `name` | VARCHAR(128) | | Không | — | Tên hiển thị |
| `description` | TEXT | | Có | NULL | Mô tả gói |
| `price_monthly` | DECIMAL(10,2) | | Không | 0.00 | Giá theo tháng |
| `price_yearly` | DECIMAL(10,2) | | Không | 0.00 | Giá theo năm |
| `max_jobs` | INT | | Không | 5 | Hạn mức tin tuyển dụng đang mở |
| `max_cv_parses` | INT | | Không | 100 | Hạn mức số lần parse CV |
| `max_ai_interview_hours` | INT | | Không | 10 | Hạn mức giờ phỏng vấn AI |
| `max_storage_gb` | INT | | Không | 5 | Hạn mức dung lượng lưu trữ (V7) |
| `max_proctoring_hours` | INT | | Không | 0 | Hạn mức giờ giám sát thi (V7) |
| `video_retention_days` | INT | | Không | 30 | Số ngày giữ video (V7) |
| `features_json` | TEXT | | Có | NULL | Danh sách tính năng bật/tắt dạng JSON (V7) |
| `status` | VARCHAR(32) | | Không | `'ACTIVE'` | Gói còn bán hay đã ngừng |
| `created_at` | TIMESTAMP | | Không | now | |
| `updated_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `uk_plans_code`

---

## 3. `tenant_subscriptions` — Đăng ký gói của tenant

Entity `TenantSubscription`. Ghi nhận gói mà một tenant đang dùng trong một khoảng thời gian.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT IDENTITY | PK | Không | auto | |
| `tenant_id` | BIGINT | FK → `tenants.id` | Không | — | Doanh nghiệp đăng ký |
| `plan_id` | BIGINT | FK → `subscription_plans.id` | Không | — | Gói được áp dụng |
| `status` | VARCHAR(32) | | Không | `'ACTIVE'` | Trạng thái đăng ký |
| `starts_at` | TIMESTAMP | | Không | now | Thời điểm bắt đầu hiệu lực |
| `ends_at` | TIMESTAMP | | Có | NULL | Thời điểm hết hạn; NULL nghĩa là vô thời hạn |
| `auto_renew` | BOOLEAN | | Không | TRUE | Tự động gia hạn |
| `created_at` | TIMESTAMP | | Không | now | |
| `updated_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `fk_ts_tenant`, `fk_ts_plan`

---

## 4. `invoices` — Hoá đơn

Entity `Invoice`. Bảng chỉ có `created_at`, không có `updated_at`.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT IDENTITY | PK | Không | auto | |
| `tenant_id` | BIGINT | FK → `tenants.id` | Không | — | Doanh nghiệp bị tính phí |
| `subscription_id` | BIGINT | ref* | Có | NULL | Đăng ký liên quan — **không có khoá ngoại** |
| `amount` | DECIMAL(10,2) | | Không | — | Số tiền |
| `currency` | VARCHAR(8) | | Không | `'USD'` | Đơn vị tiền tệ |
| `status` | VARCHAR(32) | | Không | `'PENDING'` | Trạng thái thanh toán |
| `payment_gateway` | VARCHAR(64) | | Có | NULL | Cổng thanh toán đã dùng |
| `transaction_id` | VARCHAR(255) | | Có | NULL | Mã giao dịch từ cổng thanh toán |
| `paid_at` | TIMESTAMP | | Có | NULL | Thời điểm thanh toán thành công |
| `created_at` | TIMESTAMP | | Không | now | Thời điểm phát hành |

**Ràng buộc:** `fk_inv_tenant`

---

## 5. `tenant_usage_daily` — Usage tổng hợp theo ngày

Entity `TenantUsageDaily`. Một dòng cho mỗi cặp (tenant, ngày), dùng để đối chiếu với hạn mức của gói.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT IDENTITY | PK | Không | auto | |
| `tenant_id` | BIGINT | FK → `tenants.id`, UQ | Không | — | Doanh nghiệp |
| `usage_date` | DATE | UQ | Không | — | Ngày thống kê |
| `cv_parses_count` | INT | | Không | 0 | Số lần parse CV trong ngày |
| `ai_voice_seconds` | INT | | Không | 0 | Số giây xử lý giọng nói AI |
| `proctoring_seconds` | INT | | Không | 0 | Số giây giám sát thi |
| `storage_bytes` | BIGINT | | Không | 0 | Dung lượng lưu trữ đang chiếm |
| `active_jobs_count` | INT | | Không | 0 | Số tin tuyển dụng đang mở |
| `ai_tokens_consumed` | BIGINT | | Không | 0 | Số token AI đã tiêu thụ |
| `created_at` | TIMESTAMP | | Không | now | |
| `updated_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `uk_tenant_usage_daily (tenant_id, usage_date)`, `fk_tud_tenant`

---

## 6. `platform_users` — Quản trị viên nền tảng

Entity `PlatformUser`. Tách hoàn toàn khỏi bảng `users` của tenant — hai tập tài khoản không giao nhau.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT IDENTITY | PK | Không | auto | |
| `email` | VARCHAR(255) | UQ | Không | — | Email đăng nhập |
| `password_hash` | VARCHAR(255) | | Không | — | Hash mật khẩu, không bao giờ lưu plaintext |
| `full_name` | VARCHAR(255) | | Không | — | Họ tên |
| `role` | VARCHAR(32) | | Không | `'WORKSPACE_ADMIN'` | Mặc định đổi từ `SUPER_ADMIN` ở V3 |
| `status` | VARCHAR(32) | | Không | `'ACTIVE'` | Trạng thái tài khoản |
| `created_at` | TIMESTAMP | | Không | now | |
| `updated_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `uk_platform_users_email`

---

## 7. `platform_audit_logs` — Nhật ký cấp nền tảng

Entity `PlatformAuditLog`. Bảng chỉ ghi thêm, không sửa, không xoá. Cố ý **không** có khoá ngoại để log
sống lâu hơn tenant và tài khoản mà nó ghi nhận.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT IDENTITY | PK | Không | auto | |
| `tenant_code` | VARCHAR(64) | ref* | Có | NULL | Tham chiếu mềm tới `tenants.code` |
| `platform_user_id` | BIGINT | ref* | Có | NULL | Người thực hiện — **không có khoá ngoại** |
| `action` | VARCHAR(64) | | Không | — | Mã hành động |
| `level` | VARCHAR(16) | | Không | `'INFO'` | Mức độ log |
| `description` | TEXT | | Không | — | Mô tả hành động |
| `ip_address` | VARCHAR(64) | | Có | NULL | IP nguồn |
| `metadata_json` | TEXT | | Có | NULL | Dữ liệu bổ sung dạng JSON — **không ghi PII hoặc token** |
| `created_at` | TIMESTAMP | | Không | now | |

---

## 8. `consultation_requests` — Yêu cầu demo / tư vấn

Entity `ConsultationRequest`. Lead từ landing page, chưa gắn với tenant nào.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT IDENTITY | PK | Không | auto | |
| `company_name` | VARCHAR(255) | | Không | — | Tên công ty quan tâm |
| `contact_name` | VARCHAR(255) | | Không | — | Người liên hệ |
| `job_title` | VARCHAR(255) | | Có | NULL | Chức danh người liên hệ |
| `work_email` | VARCHAR(255) | IDX | Không | — | Email công việc |
| `phone_number` | VARCHAR(64) | | Có | NULL | Điện thoại |
| `company_size` | VARCHAR(64) | | Có | NULL | Quy mô công ty |
| `request_type` | VARCHAR(64) | | Không | `'DEMO'` | Loại yêu cầu |
| `plan_tier` | VARCHAR(128) | | Có | NULL | Gói đang quan tâm |
| `primary_need` | TEXT | | Có | NULL | Nhu cầu chính |
| `notes` | TEXT | | Có | NULL | Ghi chú nội bộ |
| `status` | VARCHAR(32) | IDX | Không | `'PENDING'` | Trạng thái xử lý lead |
| `created_at` | TIMESTAMP | IDX | Không | now | Index theo `created_at DESC` |
| `updated_at` | TIMESTAMP | | Không | now | |

**Index:** `idx_consultation_requests_status`, `idx_consultation_requests_email`,
`idx_consultation_requests_created_at (created_at DESC)`
