# Data Dictionary — Master DB (PostgreSQL)

> Trở về [Database Design & ERD](README.md) · Xem thêm [Data Dictionary Tenant](DATA_DICTIONARY_TENANT.md)

**Database:** `smarthire_master` · **RDBMS:** PostgreSQL · **Số bảng:** 17
**Nguồn:** `backend/src/main/resources/db/migration/master/V1…V27`
**Entity:** `com.smarthire.domain.master.entity` · **Hibernate:** `hbm2ddl.auto = validate`

Ký hiệu: `PK` khoá chính · `FK` khoá ngoại đã khai báo · `UQ` thuộc ràng buộc unique · `IDX` có index ·
`?` cho phép NULL · `ref*` trông như khoá ngoại nhưng **không** có ràng buộc.

Mọi entity master đều dùng `LocalDateTime` cho cột thời gian và ánh xạ khoá ngoại bằng `Long` thô
(không có association JPA để tối ưu hiệu năng và kiểm soát giao dịch rõ ràng).

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
| `db_password` | VARCHAR(1024) | | Có | NULL | **Đã mã hoá** bằng `TENANT_CREDENTIALS_KEY`; gắn `@JsonIgnore` |
| `managed_database` | BOOLEAN | | Không | FALSE | `TRUE` nếu database do nền tảng tự cấp phát |
| `status` | VARCHAR(32) | | Không | `'ACTIVE'` | Trạng thái vận hành (`PENDING_PAYMENT`, `PROVISIONING`, `ACTIVE`, `SUSPENDED`, `FAILED`) |
| `logo_url` | VARCHAR(512) | | Có | NULL | Logo công ty |
| `website` | VARCHAR(255) | | Có | NULL | Website công ty |
| `address` | VARCHAR(512) | | Có | NULL | Địa chỉ văn phòng |
| `industry` | VARCHAR(128) | | Có | NULL | Ngành nghề hoạt động |
| `company_size` | VARCHAR(64) | | Có | NULL | Quy mô nhân sự |
| `description` | TEXT | | Có | NULL | Giới thiệu công ty |
| `is_verified` | BOOLEAN | | Không | FALSE | Đã được nền tảng xác minh |
| `contact_name` | VARCHAR(255) | | Có | NULL | Người liên hệ chính |
| `contact_email` | VARCHAR(255) | | Có | NULL | Email liên hệ quản trị |
| `contact_phone` | VARCHAR(32) | | Có | NULL | Điện thoại liên hệ |
| `billing_email` | VARCHAR(255) | | Có | NULL | Email nhận hoá đơn VAT |
| `tax_code` | VARCHAR(50) | | Có | NULL | Mã số thuế doanh nghiệp |
| `company_legal_name` | VARCHAR(255) | | Có | NULL | Tên pháp nhân trên đăng ký kinh doanh |
| `billing_address` | VARCHAR(512) | | Có | NULL | Địa chỉ xuất hoá đơn tài chính |
| `environment_type` | VARCHAR(32) | | Không | `'PRODUCTION'` | Môi trường triển khai (`PRODUCTION`, `STAGING`, `SANDBOX`) |
| `is_deleted` | BOOLEAN | | Không | FALSE | Cờ xoá mềm (Soft delete) |
| `deleted_at` | TIMESTAMP | | Có | NULL | Thời điểm xoá mềm |
| `created_at` | TIMESTAMP | | Không | now | Thời điểm onboarding |
| `updated_at` | TIMESTAMP | | Không | now | Cập nhật qua `@PreUpdate` |

**Ràng buộc:** `uk_tenants_code`, `uk_tenants_subdomain`, `uk_tenants_dbname`

---

## 2. `subscription_plans` — Danh mục Gói dịch vụ (Tier 1 Plan Catalog / Templates)

Entity `SubscriptionPlan`. Bảng danh mục định nghĩa giá và hạn mức tiêu thụ của từng gói (VNĐ), hỗ trợ bất biến phiên bản (Versioning / Grandfathering) và gói tùy biến riêng cho Enterprise Tenant (V27).

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT IDENTITY | PK | Không | auto | Định danh gói |
| `code` | VARCHAR(64) | UQ | Không | — | Mã gói, ví dụ `STARTER`, `PRO`, `ENTERPRISE` (hoặc `PRO_V1_2` khi lưu trữ) |
| `name` | VARCHAR(128) | | Không | — | Tên hiển thị gói |
| `description` | TEXT | | Có | NULL | Mô tả chi tiết |
| `version` | INT | | Không | 1 | Số phiên bản của gói cước phục vụ bảo lưu giá (Grandfathering) (V27) |
| `parent_plan_id` | BIGINT | FK → `subscription_plans.id` | Có | NULL | Phiên bản gói cha hoặc gói mẫu gốc khi tạo version mới / clone custom (V27, SET NULL) |
| `is_custom` | BOOLEAN | IDX | Không | FALSE | `TRUE` nếu là gói thiết kế riêng theo hợp đồng Enterprise cho 1 Tenant (V27) |
| `target_tenant_id` | BIGINT | FK → `tenants.id`, IDX | Có | NULL | Doanh nghiệp sở hữu gói Custom Enterprise (V27, SET NULL) |
| `is_archived` | BOOLEAN | IDX | Không | FALSE | `TRUE` nếu gói đã ngừng mở bán mới nhưng khách cũ vẫn gia hạn theo giá cũ (V27) |
| `price_yearly` | DECIMAL(15,2) | | Không | 0.00 | Giá gói theo năm (VNĐ) |
| `max_jobs` | INT | | Không | 5 | Hạn mức tin tuyển dụng đang mở (`-1`: không giới hạn) |
| `max_cv_parses` | INT | | Không | 100 | Hạn mức số lần parse CV / tháng (`-1`: không giới hạn) |
| `max_ai_interview_hours` | INT | | Có | NULL | Hạn mức giờ phỏng vấn AI (`0`: khóa, `-1`/NULL: không giới hạn) |
| `max_storage_gb` | INT | | Có | NULL | Hạn mức dung lượng lưu trữ GB (`-1`/NULL: không giới hạn) |
| `max_proctoring_hours` | INT | | Có | NULL | Hạn mức giờ giám sát thi AI (`0`: khóa, `-1`/NULL: không giới hạn) |
| `video_retention_days` | INT | | Có | NULL | Số ngày lưu trữ video phỏng vấn (`0`: khóa, `-1`/NULL: vĩnh viễn) |
| `features_json` | JSONB | | Có | NULL | Danh sách tính năng bật/tắt dạng JSON |
| `is_deleted` | BOOLEAN | | Không | FALSE | Cờ xoá mềm |
| `deleted_at` | TIMESTAMP | | Có | NULL | Thời điểm xoá mềm |
| `status` | VARCHAR(32) | IDX | Không | `'ACTIVE'` | Trạng thái gói (`ACTIVE`, `ARCHIVED`, `INACTIVE`) |
| `created_at` | TIMESTAMP | | Không | now | |
| `updated_at` | TIMESTAMP | | Không | now | |

**Ràng buộc & Index:** `uk_plans_code`, `fk_sp_parent_plan`, `fk_sp_target_tenant`, `idx_sp_status_custom_archived`, `idx_sp_target_tenant_id`

---

## 3. `tenant_subscriptions` — Thuê bao của Tenant (Tier 2 Tenant Subscription Instance)

Entity `TenantSubscription`. Ghi nhận hợp đồng thuê bao của từng Tenant kèm bản chụp (Snapshot) toàn bộ giá và hạn mức tài nguyên tại thời điểm mua, vòng đời trạng thái (`TRIAL` → `ACTIVE` → `PAST_DUE` → `SUSPENDED` → `CANCELED`) và khấu trừ nâng/hạ cấp (V27).

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT IDENTITY | PK | Không | auto | |
| `tenant_id` | BIGINT | FK → `tenants.id`, IDX | Không | — | Doanh nghiệp đăng ký |
| `plan_id` | BIGINT | FK → `subscription_plans.id` | Không | — | Gói gốc tham chiếu |
| `plan_code_snapshot` | VARCHAR(64) | | Có | NULL | Snapshot mã gói tại thời điểm mua (V27) |
| `plan_name_snapshot` | VARCHAR(128) | | Có | NULL | Snapshot tên gói tại thời điểm mua (V27) |
| `plan_version_snapshot` | INT | | Có | 1 | Snapshot phiên bản gói tại thời điểm mua (V27) |
| `contracted_price_yearly`| DECIMAL(15,2) | | Có | NULL | Giá hợp đồng cam kết theo năm (VNĐ) tại thời điểm mua (V27) |
| `snapshot_max_jobs` | INT | | Có | NULL | Snapshot hạn mức tin tuyển dụng đang mở (V27) |
| `snapshot_max_cv_parses`| INT | | Có | NULL | Snapshot hạn mức lượt AI CV Parse / tháng (V27) |
| `snapshot_max_ai_interview_hours` | INT | | Có | NULL | Snapshot hạn mức giờ phỏng vấn AI Voice (V27) |
| `snapshot_max_storage_gb`| INT | | Có | NULL | Snapshot hạn mức dung lượng lưu trữ GB (V27) |
| `snapshot_max_proctoring_hours` | INT | | Có | NULL | Snapshot hạn mức giờ giám sát thi AI Proctoring (V27) |
| `snapshot_video_retention_days` | INT | | Có | NULL | Snapshot số ngày lưu trữ video phỏng vấn (V27) |
| `snapshot_features_json`| JSONB | | Có | NULL | Snapshot JSON danh sách tính năng cam kết trong hợp đồng (V27) |
| `status` | VARCHAR(32) | IDX | Không | `'ACTIVE'` | Trạng thái vòng đời (`TRIAL`, `PENDING`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCELED`, `EXPIRED`) |
| `starts_at` | TIMESTAMP | | Không | now | Thời điểm bắt đầu chu kỳ |
| `ends_at` | TIMESTAMP | IDX | Có | NULL | Thời điểm kết thúc chu kỳ; NULL nghĩa là vô thời hạn |
| `grace_period_ends_at` | TIMESTAMP | | Có | NULL | Thời hạn ân hạn thanh toán (3-7 ngày) khi ở trạng thái `PAST_DUE` (V27) |
| `auto_renew` | BOOLEAN | | Không | TRUE | Tự động gia hạn cuối kỳ |
| `next_plan_id` | BIGINT | FK → `subscription_plans.id` | Có | NULL | Gói dự kiến áp dụng vào cuối chu kỳ khi khách hàng Downgrade (V27, SET NULL) |
| `prorated_credit_amount`| DECIMAL(15,2) | | Không | 0.00 | Số tiền khấu trừ những ngày chưa dùng khi Upgrade giữa kỳ (V27) |
| `upgraded_from_subscription_id` | BIGINT | FK → `tenant_subscriptions.id` | Có | NULL | Thuê bao cũ trước khi nâng cấp (V27, SET NULL) |
| `canceled_at` | TIMESTAMP | | Có | NULL | Thời điểm hủy thuê bao (V27) |
| `cancel_reason` | VARCHAR(512) | | Có | NULL | Lý do hủy thuê bao hoặc chuyển đổi gói (V27) |
| `created_at` | TIMESTAMP | | Không | now | |
| `updated_at` | TIMESTAMP | | Không | now | |

**Ràng buộc & Index:** `fk_ts_tenant`, `fk_ts_plan`, `fk_ts_next_plan`, `fk_ts_upgraded_from`, `idx_ts_tenant_status`, `idx_ts_ends_at_status`


---

## 4. `invoices` — Hoá đơn tài chính

Entity `Invoice`. Quản lý hóa đơn dịch vụ, snapshot thông tin pháp lý phục vụ xuất hóa đơn VAT và đối soát thanh toán.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT IDENTITY | PK | Không | auto | |
| `invoice_number` | VARCHAR(64) | UQ | Có | NULL | Mã hóa đơn duy nhất (vd: `INV-2026-XXXXXX`) |
| `tenant_id` | BIGINT | FK → `tenants.id` | Không | — | Doanh nghiệp thanh toán |
| `subscription_id` | BIGINT | FK → `tenant_subscriptions.id` | Có | NULL | Gói thuê bao liên quan (SET NULL khi xoá) |
| `contract_id` | BIGINT | FK → `contracts.id` | Có | NULL | Hợp đồng B2B liên quan (V23, SET NULL khi xoá) |
| `amount` | DECIMAL(15,2) | | Không | — | Tổng số tiền thanh toán (VNĐ) |
| `subtotal` | DECIMAL(15,2) | | Có | NULL | Số tiền trước thuế (VNĐ) |
| `tax_rate` | DECIMAL(5,2) | | Có | 0.00 | Tỷ lệ thuế VAT (%) |
| `currency` | VARCHAR(8) | | Không | `'VND'` | Đơn vị tiền tệ (mặc định VNĐ từ V23) |
| `status` | VARCHAR(32) | IDX | Không | `'PENDING'` | Trạng thái (`PENDING`, `PAID`, `OVERDUE`, `CANCELLED`) |
| `due_date` | TIMESTAMP | | Có | NULL | Hạn thanh toán |
| `billing_period_start`| TIMESTAMP | | Có | NULL | Ngày bắt đầu chu kỳ tính phí |
| `billing_period_end` | TIMESTAMP | | Có | NULL | Ngày kết thúc chu kỳ tính phí |
| `payment_gateway` | VARCHAR(64) | | Có | NULL | Cổng thanh toán (`BANK_TRANSFER`, `VNPAY`, `PAYPAL`, `SEPAY`) |
| `transaction_id` | VARCHAR(255) | | Có | NULL | Mã giao dịch tham chiếu từ cổng thanh toán |
| `paid_at` | TIMESTAMP | | Có | NULL | Thời điểm thanh toán thành công |
| `payment_proof_url` | VARCHAR(512) | | Có | NULL | Link ảnh chứng từ thanh toán / UNC |
| `billing_tax_code` | VARCHAR(50) | | Có | NULL | Snapshot Mã số thuế tại thời điểm xuất HĐ |
| `billing_legal_name` | VARCHAR(255) | | Có | NULL | Snapshot Tên pháp nhân tại thời điểm xuất HĐ |
| `billing_address` | VARCHAR(512) | | Có | NULL | Snapshot Địa chỉ tại thời điểm xuất HĐ |
| `notes` | TEXT | | Có | NULL | Ghi chú hóa đơn |
| `terms_accepted` | BOOLEAN | | Không | FALSE | Cờ xác nhận đồng ý Điều khoản dịch vụ & BVDLCN (V25) |
| `terms_version` | VARCHAR(32) | | Có | NULL | Phiên bản văn bản pháp lý tại thời điểm đặt hàng (V25) |
| `terms_accepted_at` | TIMESTAMP | | Có | NULL | Thời điểm khách hàng tích chọn đồng ý (V25) |
| `created_at` | TIMESTAMP | | Không | now | Thời điểm phát hành |
| `updated_at` | TIMESTAMP | | Không | now | Thời điểm cập nhật trạng thái gần nhất (V23) |

**Ràng buộc & Index:** `uk_invoices_number`, `fk_inv_tenant`, `fk_inv_subscription`, `fk_inv_contract`, `idx_invoices_contract_id`, `idx_invoices_subscription_id`

---

## 5. `invoice_line_items` — Chi tiết dòng hàng hóa đơn

Entity `InvoiceLineItem`. Danh sách các hạng mục chi tiết của hóa đơn.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT IDENTITY | PK | Không | auto | |
| `invoice_id` | BIGINT | FK → `invoices.id` | Không | — | Thuộc hóa đơn nào (CASCADE khi xóa hóa đơn) |
| `description` | VARCHAR(255) | | Không | — | Tên sản phẩm/dịch vụ (vd: Bản quyền Starter 1 năm) |
| `quantity` | INT | | Không | 1 | Số lượng |
| `unit_price` | DECIMAL(15,2) | | Không | — | Đơn giá (VNĐ, V23 mở rộng từ DECIMAL(10,2)) |
| `total_price` | DECIMAL(15,2) | | Không | — | Thành tiền (VNĐ, V23 mở rộng từ DECIMAL(10,2)) |
| `item_type` | VARCHAR(64) | | Không | `'BASE_PLAN'` | Phân loại (`BASE_PLAN`, `SUBSCRIPTION`, `EXTRA_QUOTA`, `ADDON`) |

**Ràng buộc & Index:** `fk_ili_invoice (ON DELETE CASCADE)`, `idx_invoice_line_items_invoice_id`

---

## 6. `payment_transactions` — Lịch sử giao dịch thanh toán

Entity `PaymentTransaction`. Lưu trữ đối soát toàn bộ giao dịch từ các cổng thanh toán (VNPay, VietQR SePay, PayPal).

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT IDENTITY | PK | Không | auto | |
| `invoice_id` | BIGINT | FK → `invoices.id` | Không | — | Hóa đơn liên quan (CASCADE khi xóa) |
| `tenant_id` | BIGINT | FK → `tenants.id` | Có | NULL | Doanh nghiệp giao dịch (V23 FK SET NULL) |
| `transaction_no` | VARCHAR(128) | IDX | Có | NULL | Mã giao dịch ngân hàng / cổng |
| `txn_ref` | VARCHAR(128) | IDX | Không | — | Mã tham chiếu đơn hàng nội bộ |
| `payment_gateway` | VARCHAR(32) | | Không | `'VNPAY'` | Cổng thanh toán (`VNPAY`, `PAYPAL`, `VIETQR_SEPAY`) |
| `bank_code` | VARCHAR(64) | | Có | NULL | Mã ngân hàng thực hiện |
| `bank_tran_no` | VARCHAR(128) | | Có | NULL | Mã giao dịch phía ngân hàng |
| `card_type` | VARCHAR(32) | | Có | NULL | Loại thẻ (`ATM`, `QRCODE`, `CREDIT`) |
| `amount` | DECIMAL(15,2) | | Không | — | Số tiền giao dịch thực tế (VNĐ) |
| `currency` | VARCHAR(8) | | Không | `'VND'` | Đơn vị tiền tệ |
| `response_code` | VARCHAR(32) | | Có | NULL | Mã phản hồi từ Gateway (`00` là thành công) |
| `transaction_status` | VARCHAR(32) | IDX | Không | `'PENDING'` | Trạng thái (`PENDING`, `SUCCESS`, `FAILED`) |
| `order_info` | VARCHAR(512) | | Có | NULL | Nội dung chuyển khoản / giao dịch |
| `pay_date` | VARCHAR(32) | | Có | NULL | Timestamp định dạng từ cổng thanh toán |
| `ip_address` | VARCHAR(64) | | Có | NULL | IP thực hiện thanh toán |
| `raw_response` | TEXT | | Có | NULL | Dữ liệu phản hồi gốc (JSON/Params) phục vụ kiểm toán |
| `created_at` | TIMESTAMP | | Không | now | |

**Ràng buộc & Index:** `fk_pt_invoice`, `fk_pt_tenant`, `idx_pt_invoice_id`, `idx_pt_txn_ref`, `idx_pt_transaction_no`, `idx_pt_status`, `idx_pt_tenant_id`

---

## 7. `contracts` — Hợp đồng B2B điện tử

Entity `Contract`. Quản lý hợp đồng thương mại điện tử, tuân thủ pháp lý Việt Nam, phục vụ ký số qua Dropbox Sign API (HelloSign) kèm Audit Trail & SHA-256 checksum.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT IDENTITY | PK | Không | auto | |
| `contract_number` | VARCHAR(64) | UQ | Không | — | Số hợp đồng duy nhất (vd: `CT-2026-XXXX`) |
| `tenant_id` | BIGINT | FK → `tenants.id` | Có | NULL | Doanh nghiệp (cho phép NULL khi ký từ Lead) |
| `plan_id` | BIGINT | FK → `subscription_plans.id` | Có | NULL | Gói áp dụng trong hợp đồng |
| `consultation_request_id` | BIGINT | FK → `consultation_requests.id` | Có | NULL | Lead nguồn nếu ký từ yêu cầu tư vấn |
| `title` | VARCHAR(255) | | Không | — | Tiêu đề hợp đồng |
| `contract_value` | DECIMAL(15,2) | | Không | 0.00 | Giá trị trước thuế (VNĐ) |
| `currency` | VARCHAR(10) | | Không | `'VND'` | Đơn vị tiền tệ (mặc định VNĐ từ V23) |
| `start_date` | DATE | | Không | — | Ngày bắt đầu hiệu lực |
| `end_date` | DATE | | Không | — | Ngày kết thúc hiệu lực |
| `party_a_name` | VARCHAR(255) | | Không | — | Snapshot Tên Bên A (SmartHire) |
| `party_a_tax_code` | VARCHAR(50) | | Không | — | Snapshot MST Bên A |
| `party_a_address` | VARCHAR(512) | | Không | — | Snapshot Địa chỉ Bên A |
| `party_a_representative` | VARCHAR(255) | | Không | — | Người đại diện Bên A |
| `party_a_position` | VARCHAR(255) | | Không | — | Chức vụ người đại diện Bên A |
| `party_a_phone` | VARCHAR(50) | | Không | — | Số điện thoại Bên A |
| `party_a_email` | VARCHAR(255) | | Không | — | Email Bên A |
| `party_a_bank_name` | VARCHAR(255) | | Không | — | Ngân hàng Bên A |
| `party_a_bank_account`| VARCHAR(100) | | Không | — | Số tài khoản Bên A |
| `party_a_bank_branch` | VARCHAR(255) | | Không | — | Chi nhánh ngân hàng Bên A |
| `party_b_name` | VARCHAR(255) | | Có | NULL | Tên pháp nhân Bên B (Khách hàng) |
| `party_b_tax_code` | VARCHAR(50) | | Có | NULL | Mã số thuế Bên B |
| `party_b_address` | VARCHAR(512) | | Có | NULL | Địa chỉ trụ sở Bên B |
| `party_b_representative` | VARCHAR(255) | | Có | NULL | Người đại diện pháp luật Bên B |
| `party_b_position` | VARCHAR(255) | | Có | NULL | Chức vụ người đại diện Bên B |
| `party_b_phone` | VARCHAR(50) | | Có | NULL | Điện thoại liên hệ Bên B |
| `party_b_email` | VARCHAR(255) | | Có | NULL | Email Bên B |
| `party_b_bank_account`| VARCHAR(100) | | Có | NULL | Tài khoản ngân hàng Bên B |
| `tax_rate` | DECIMAL(5,2) | | Không | 10.00 | Thuế suất VAT (%) |
| `tax_amount` | DECIMAL(15,2) | | Không | 0.00 | Tiền thuế VAT (VNĐ) |
| `total_amount` | DECIMAL(15,2) | | Không | 0.00 | Tổng tiền thanh toán sau thuế (VNĐ) |
| `amount_in_words` | VARCHAR(512) | | Có | NULL | Số tiền bằng chữ tiếng Việt |
| `signing_token` | VARCHAR(128) | UQ | Có | NULL | Token bảo mật ký hợp đồng online |
| `token_expires_at` | TIMESTAMP | | Có | NULL | Thời hạn của token ký |
| `sent_at` | TIMESTAMP | | Có | NULL | Thời điểm gửi hợp đồng cho đối tác |
| `client_ip` | VARCHAR(64) | | Có | NULL | IP người ký hợp đồng |
| `esign_provider` | VARCHAR(32) | | Có | `'DROPBOX_SIGN'` | Nhà cung cấp chữ ký số (`DROPBOX_SIGN`, V26) |
| `external_signature_request_id` | VARCHAR(128) | IDX | Có | NULL | Mã yêu cầu ký `signature_request_id` từ Dropbox Sign (V26) |
| `esign_details_url` | VARCHAR(512) | | Có | NULL | URL chi tiết hợp đồng trên Dropbox Sign (V26) |
| `esign_test_mode` | BOOLEAN | | Không | TRUE | Cờ chế độ thử nghiệm Sandbox Dropbox Sign (V26) |
| `signed_pdf_bytes` | BYTEA | | Có | NULL | Nội dung file PDF hợp đồng đã ký kèm trang Audit Trail (V26) |
| `status` | VARCHAR(32) | IDX | Không | `'DRAFT'` | Trạng thái (`DRAFT`, `PENDING_SIGNATURE`, `SIGNED`, `EXPIRED`, `TERMINATED`) |
| `sign_method` | VARCHAR(32) | | Có | NULL | Phương thức ký (`DROPBOX_SIGN`, `UPLOAD_SIGNED_PDF`) |
| `signed_at` | TIMESTAMP | | Có | NULL | Thời điểm hoàn tất ký |
| `signed_document_url` | VARCHAR(512) | | Có | NULL | Đường dẫn file PDF hợp đồng đã ký |
| `document_checksum` | VARCHAR(128) | | Có | NULL | SHA-256 Checksum đảm bảo tính toàn vẹn của hợp đồng |
| `terms_and_conditions`| TEXT | | Có | NULL | Điều khoản hợp đồng |
| `notes` | TEXT | | Có | NULL | Ghi chú nội bộ |
| `created_at` | TIMESTAMP | | Không | now | |
| `updated_at` | TIMESTAMP | | Không | now | |

**Ràng buộc & Index:** `fk_contract_tenant`, `fk_contract_plan`, `fk_contract_lead`, `idx_contracts_tenant`, `idx_contracts_status`, `idx_contracts_number`, `idx_contracts_signing_token`, `idx_contracts_external_sig_req_id`

---

## 8. `contract_signatures` — Chữ ký số trên hợp đồng

Entity `ContractSignature`. Chi tiết từng bên ký số trên hợp đồng (hỗ trợ mô hình đa chữ ký số).

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT IDENTITY | PK | Không | auto | |
| `contract_id` | BIGINT | FK → `contracts.id` | Không | — | Hợp đồng ký (CASCADE khi xóa HĐ) |
| `signer_name` | VARCHAR(255) | | Không | — | Họ tên người ký |
| `signer_email` | VARCHAR(255) | | Không | — | Email người ký nhận yêu cầu ký |
| `signer_title` | VARCHAR(128) | | Không | — | Chức danh người ký |
| `status` | VARCHAR(32) | | Không | `'PENDING'` | Trạng thái (`PENDING`, `SIGNED`, `REJECTED`, `DECLINED`) |
| `signed_at` | TIMESTAMP | | Có | NULL | Thời điểm ký thành công |
| `otp_code` | VARCHAR(10) | | Có | NULL | Mã OTP (legacy) |
| `otp_expires_at` | TIMESTAMP | | Có | NULL | Hạn OTP (legacy) |
| `client_ip` | VARCHAR(64) | | Có | NULL | IP thực hiện ký |
| `external_signature_id` | VARCHAR(128) | | Có | NULL | Mã chữ ký `signature_id` của từng người ký trên Dropbox Sign (V26) |
| `created_at` | TIMESTAMP | | Không | now | Thời điểm phát hành lượt ký (V23) |
| `updated_at` | TIMESTAMP | | Không | now | Thời điểm cập nhật lượt ký (V23) |

**Ràng buộc & Index:** `fk_cs_contract (ON DELETE CASCADE)`, `idx_contract_signatures_contract_id`

---

## 9. `tenant_usage_daily` — Usage tổng hợp theo ngày

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

## 10. `platform_users` — Quản trị viên nền tảng

Entity `PlatformUser`. Tách hoàn toàn khỏi bảng `users` của tenant — hai tập tài khoản không giao nhau.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT IDENTITY | PK | Không | auto | |
| `email` | VARCHAR(255) | UQ | Không | — | Email đăng nhập |
| `password_hash` | VARCHAR(255) | | Không | — | Hash mật khẩu BCrypt, không bao giờ lưu plaintext |
| `full_name` | VARCHAR(255) | | Không | — | Họ tên quản trị viên |
| `role` | VARCHAR(32) | | Không | `'WORKSPACE_ADMIN'` | Vai trò (`WORKSPACE_ADMIN`, `SUPPORT_ADMIN`) |
| `status` | VARCHAR(32) | | Không | `'ACTIVE'` | Trạng thái tài khoản |
| `created_at` | TIMESTAMP | | Không | now | |
| `updated_at` | TIMESTAMP | | Không | now | |

**Ràng buộc:** `uk_platform_users_email`

---

## 11. `platform_audit_logs` — Nhật ký cấp nền tảng

Entity `PlatformAuditLog`. Bảng chỉ ghi thêm, không sửa, không xoá. Cố ý **không** có khoá ngoại cứng để log
sống lâu hơn tenant và tài khoản mà nó ghi nhận.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT IDENTITY | PK | Không | auto | |
| `tenant_code` | VARCHAR(64) | IDX | Có | NULL | Tham chiếu mềm tới `tenants.code` |
| `platform_user_id` | BIGINT | ref* | Có | NULL | Người thực hiện — **không có khoá ngoại** |
| `action` | VARCHAR(64) | | Không | — | Mã hành động (vd: `PROVISION_TENANT`, `APPROVE_INVOICE`) |
| `level` | VARCHAR(16) | | Không | `'INFO'` | Mức độ log (`INFO`, `WARN`, `ERROR`) |
| `description` | TEXT | | Không | — | Mô tả chi tiết hành động |
| `ip_address` | VARCHAR(64) | | Có | NULL | IP nguồn thực hiện |
| `metadata_json` | JSONB | | Có | NULL | Dữ liệu bổ sung dạng JSON — **không ghi PII hoặc token** |
| `created_at` | TIMESTAMP | IDX | Không | now | Thời điểm ghi log (có Index DESC từ V23) |

**Index:** `idx_pal_tenant_code`, `idx_pal_created_at`

---

## 12. `consultation_requests` — Yêu cầu demo / tư vấn (Sales Leads)

Entity `ConsultationRequest`. Lead từ landing page, có liên kết ngược sang `Tenant` khi chuyển đổi thành công.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT IDENTITY | PK | Không | auto | |
| `company_name` | VARCHAR(255) | | Không | — | Tên công ty quan tâm |
| `contact_name` | VARCHAR(255) | | Không | — | Người liên hệ |
| `job_title` | VARCHAR(255) | | Có | NULL | Chức danh người liên hệ |
| `work_email` | VARCHAR(255) | IDX | Không | — | Email công việc |
| `phone_number` | VARCHAR(64) | | Có | NULL | Điện thoại |
| `company_size` | VARCHAR(64) | | Có | NULL | Quy mô công ty |
| `tenant_id` | BIGINT | FK → `tenants.id`, IDX | Có | NULL | ID Tenant được tạo sau khi chốt deal (V23) |
| `request_type` | VARCHAR(64) | | Không | `'DEMO'` | Loại yêu cầu (`DEMO` hoặc `CONTRACT_QUOTE`) |
| `plan_tier` | VARCHAR(128) | | Có | NULL | Gói đang quan tâm |
| `primary_need` | TEXT | | Có | NULL | Nhu cầu chính |
| `notes` | TEXT | | Có | NULL | Ghi chú nội bộ |
| `status` | VARCHAR(32) | IDX | Không | `'PENDING'` | Trạng thái (`PENDING`, `CONTACTED`, `PROVISIONED`, `REJECTED`) |
| `created_at` | TIMESTAMP | IDX | Không | now | Index theo `created_at DESC` |
| `updated_at` | TIMESTAMP | | Không | now | |

**Ràng buộc & Index:** `fk_cr_tenant`, `idx_consultation_requests_tenant_id`, `idx_consultation_requests_status`, `idx_consultation_requests_email`, `idx_consultation_requests_created_at`

---

## 13. `system_settings` — Cấu hình hệ thống toàn sàn

Entity `SystemSetting`. Lưu trữ tham số cấu hình chung của toàn bộ nền tảng SaaS.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `setting_key` | VARCHAR(100) | PK | Không | — | Khóa cấu hình (vd: `COMPANY_NAME`, `VNPAY_TMN_CODE`) |
| `setting_value` | TEXT | | Không | — | Giá trị cấu hình |
| `category` | VARCHAR(50) | | Không | `'GENERAL'` | Nhóm cấu hình (`GENERAL`, `BILLING`, `SECURITY`, `EMAIL`) |
| `description` | VARCHAR(255) | | Có | NULL | Mô tả ý nghĩa cấu hình |
| `is_encrypted` | BOOLEAN | | Không | FALSE | Giá trị có được mã hóa an toàn không |
| `updated_by` | VARCHAR(100) | | Có | NULL | Email người cập nhật gần nhất |
| `updated_at` | TIMESTAMP | | Không | now | |

---

## 14. `ai_provider_keys` — Quản lý API Key các nhà cung cấp AI

Entity `AiProviderKey`. Quản lý kho khóa API tích hợp (Gemini, OpenAI, Anthropic, DeepSeek).

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT IDENTITY | PK | Không | auto | |
| `provider` | VARCHAR(50) | IDX | Không | — | Nhà cung cấp (`GEMINI`, `OPENAI`, `ANTHROPIC`, `DEEPSEEK`) |
| `key_alias` | VARCHAR(100) | | Không | — | Tên đại diện cho key |
| `api_key_encrypted` | TEXT | | Không | — | API key **đã mã hóa an toàn**, không lưu plaintext |
| `endpoint_url` | VARCHAR(255) | | Có | NULL | Endpoint tùy biến (nếu dùng Proxy hoặc Self-host) |
| `status` | VARCHAR(30) | | Không | `'ACTIVE'` | Trạng thái (`ACTIVE`, `EXPIRED`, `RATE_LIMITED`, `INACTIVE`) |
| `is_default` | BOOLEAN | | Không | FALSE | Key mặc định của nhà cung cấp |
| `last_tested_at` | TIMESTAMP | | Có | NULL | Thời điểm kiểm tra hoạt động gần nhất |
| `created_at` | TIMESTAMP | | Không | now | |
| `updated_at` | TIMESTAMP | | Không | now | |

**Index:** `idx_ai_provider_keys_provider`

---

## 15. `ai_model_configs` — Định tuyến Model AI theo tác vụ

Entity `AiModelConfig`. Cấu hình model, nhiệt độ (temperature), token và failover model cho từng nghiệp vụ tuyển dụng thông minh.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT IDENTITY | PK | Không | auto | |
| `task_type` | VARCHAR(60) | UQ, IDX | Không | — | Tác vụ AI (`CV_PARSING`, `INTERVIEW_GEN`, `INTERVIEW_NLP`, `CODE_GRADING`, `MATCHING`) |
| `task_name` | VARCHAR(100) | | Không | — | Tên hiển thị nghiệp vụ |
| `provider` | VARCHAR(50) | | Không | `'GEMINI'` | Nhà cung cấp chính |
| `model_name` | VARCHAR(100) | | Không | — | Tên model chính; V24 thay model Interview Gemini 1.5/2.0 mặc định bằng `gemini-2.5-flash`, giữ model admin đã chọn khác |
| `temperature` | DECIMAL(3,2) | | Không | 0.20 | Độ sáng tạo |
| `max_tokens` | INT | | Không | 2048 | Số token tối đa phản hồi; V24 tăng các cấu hình Interview được chuyển model lên tối thiểu 8192, không đổi default của cột |
| `timeout_seconds` | INT | | Không | 30 | Thời gian chờ tối đa (giây) |
| `failover_provider` | VARCHAR(50) | | Có | NULL | Nhà cung cấp dự phòng khi model chính lỗi |
| `failover_model` | VARCHAR(100) | | Có | NULL | Model dự phòng |
| `is_active` | BOOLEAN | | Không | TRUE | Trạng thái kích hoạt |
| `created_at` | TIMESTAMP | | Không | now | |
| `updated_at` | TIMESTAMP | | Không | now | |

**Ràng buộc & Index:** `uk_ai_model_configs_task_type`, `idx_ai_model_configs_task_type`

---

## 16. `master_notification_logs` — Nhật ký thông báo nền tảng

Entity `MasterNotificationLog`. Ghi vết việc gửi email/thông báo cấp sàn tới người dùng và khách hàng.

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT IDENTITY | PK | Không | auto | |
| `tenant_code` | VARCHAR(64) | IDX | Không | — | Mã doanh nghiệp nhận thông báo (có Index từ V23) |
| `type` | VARCHAR(64) | | Không | — | Loại thông báo (`INVOICE_CREATED`, `QUOTA_WARNING`, `SUBSCRIPTION_EXPIRY`) |
| `to_email` | VARCHAR(128) | | Không | — | Email người nhận |
| `status` | VARCHAR(32) | IDX | Không | — | Trạng thái gửi (`SUCCESS`, `FAILED`, có Index từ V23) |
| `error_message` | TEXT | | Có | NULL | Chi tiết lỗi nếu gửi thất bại |
| `sent_at` | TIMESTAMP | IDX | Không | now | Thời điểm gửi (có Index DESC từ V23) |

**Index:** `idx_mnl_tenant_code`, `idx_mnl_status`, `idx_mnl_sent_at`

---

## 17. `master_consent_logs` — Nhật ký đồng thuận pháp lý Click-wrap (ToS & NĐ 13/2023/NĐ-CP)

Entity `MasterConsentLog`. Bảng kiểm toán bằng chứng pháp lý bất biến khi khách hàng tự tay tích chọn đồng ý với Điều khoản Dịch vụ (`TERMS_OF_SERVICE`) và Chính sách Bảo vệ Dữ liệu Cá nhân (`PRIVACY_POLICY_ND13`) tại luồng Self-serve Checkout (V25).

| Cột | Kiểu | Khoá | Null | Default | Mô tả |
|---|---|---|---|---|---|
| `id` | BIGINT IDENTITY | PK | Không | auto | Định danh bản ghi consent |
| `tenant_id` | BIGINT | FK → `tenants.id`, IDX | Có | NULL | Doanh nghiệp đặt mua (`ON DELETE SET NULL` để giữ bằng chứng kiểm toán) |
| `invoice_id` | BIGINT | FK → `invoices.id`, IDX | Có | NULL | Đơn hàng / hóa đơn phát sinh (`ON DELETE SET NULL`) |
| `actor_name` | VARCHAR(255) | | Không | — | Họ tên người đại diện thực hiện thao tác |
| `actor_email` | VARCHAR(255) | IDX | Không | — | Email người đại diện thực hiện thao tác |
| `policy_type` | VARCHAR(64) | | Không | — | Loại văn bản (`TERMS_OF_SERVICE`, `PRIVACY_POLICY_ND13`) |
| `policy_version` | VARCHAR(32) | | Không | — | Phiên bản điều khoản tại thời điểm tích chọn (vd: `v2026.10`) |
| `is_accepted` | BOOLEAN | | Không | TRUE | Trạng thái đồng thuận (`TRUE`) |
| `ip_address` | VARCHAR(64) | | Không | — | Địa chỉ IP thực của khách hàng do Backend trích xuất |
| `user_agent` | TEXT | | Có | NULL | Thông tin trình duyệt và thiết bị (`User-Agent` header) |
| `consent_context` | VARCHAR(64) | | Không | `'SELF_SERVE_CHECKOUT'` | Ngữ cảnh phát sinh đồng thuận |
| `created_at` | TIMESTAMP | IDX | Không | now | Thời điểm chính xác ghi nhận tại Server |

**Ràng buộc & Index:** `fk_mcl_tenant (ON DELETE SET NULL)`, `fk_mcl_invoice (ON DELETE SET NULL)`, `idx_mcl_tenant_id`, `idx_mcl_invoice_id`, `idx_mcl_actor_email`, `idx_mcl_created_at`

