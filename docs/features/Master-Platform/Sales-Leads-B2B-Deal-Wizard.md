# MASTER-06 — Quản lý Lead Tư vấn & Trình thuật toán Chốt Deal B2B (Sales Leads & B2B Deal Wizard)

**Code ID:** `MASTER-06`  
**Epic:** Master Platform — SaaS Multi-Tenant Administration  
**Trạng thái:** `Done`

## Mục đích chức năng

Quản lý phễu khách hàng doanh nghiệp tiềm năng (**Sales Leads / Consultation Requests**) đăng ký tư vấn hoặc báo giá từ Landing Page, và cung cấp **Trình thuật toán Chốt Deal B2B 4 bước (B2B Deal Wizard)** giúp đội ngũ Sales / Workspace Admin chuyển đổi Lead thành Giao dịch Thương mại (Commercial Deal) theo cơ chế **Khởi tạo Chờ Thanh toán (`PENDING_PAYMENT` / Deferred Provisioning)** — đảm bảo không cấp phát lãng phí MySQL Database và không kích hoạt gói trước khi hoàn tất thủ tục tài chính.

## Actor

- **Khách hàng Doanh nghiệp Tiềm năng (Enterprise Lead):** Gửi yêu cầu tư vấn / đặt lịch Demo hoặc xin báo giá hợp đồng Enterprise từ trang chủ.
- **Workspace Admin / B2B Sales (`WORKSPACE_ADMIN`):** Tiếp nhận, phân loại trạng thái Lead (`PENDING`, `CONTACTED`, `PROVISIONED`, `REJECTED`), ghi chú tư vấn và thực hiện chốt Deal qua B2B Deal Wizard.

## Luồng hoạt động

### 1. Thu thập & Quản lý Yêu cầu Tư vấn (`consultation_requests`)
1. Khách hàng điền form đăng ký tư vấn / báo giá Enterprise trên trang chủ (`POST /api/v1/master/consultations/submit`).
2. Hệ thống lưu bản ghi `consultation_requests` với trạng thái `PENDING`.
3. Workspace Admin truy cập `/admin/consultations` để xem danh sách Lead, lọc theo trạng thái, cập nhật ghi chú thương thảo (`PATCH /api/v1/master/consultations/{id}`) hoặc bấm **"Chốt Deal & Khởi tạo"** để mở B2B Deal Wizard (`/admin/deals/new?leadId=<id>`) với dữ liệu khách hàng được điền sẵn.

### 2. Quy trình 4 Bước Chốt Deal Thương mại (B2B Deal Wizard)
Khi Admin hoàn tất 4 bước trên `/admin/deals/new`:
- **Bước 1 — Định danh Doanh nghiệp & Tài khoản Admin:** Nhập tên công ty, mã số thuế, địa chỉ pháp lý, `code`, `subdomain` và thông tin Admin khách hàng (`adminName`, `adminEmail`).
- **Bước 2 — Cấu hình Gói cước & Hạn mức (Pricing & Quotas):** Chọn gói tiêu chuẩn (`PRO`, `ENTERPRISE`) hoặc thiết kế **Gói Custom Enterprise** riêng cho khách hàng với đơn giá theo năm (VNĐ) và hạn mức tuỳ chỉnh (`maxJobs`, `maxCvParses`, `maxAiInterviewHours`, `maxStorageGb`).
- **Bước 3 — Phương thức Thủ tục Thương mại:** Chọn một trong hai hình thức:
  - **Luồng Hợp đồng Điện tử B2B (`CONTRACT`):** Tự động soạn thảo Hợp đồng kinh tế B2B kèm điều khoản pháp lý Việt Nam.
  - **Luồng Hoá đơn Thanh toán Nhanh (`INVOICE`):** Phát hành ngay Hoá đơn VAT kèm mã thanh toán VietQR.
- **Bước 4 — Khởi tạo ở trạng thái Chờ Thanh toán (`PENDING_PAYMENT`):**
  1. Frontend gọi `POST /api/v1/master/tenants/onboard` với cờ **`deferProvisioning = true`**.
  2. Backend tạo bản ghi `tenants` ở trạng thái **`PENDING_PAYMENT`**: **chưa** tạo MySQL Database riêng, **chưa** gửi email kích hoạt và **không** tự động gán gói `STARTER` mặc định.
  3. Nếu là gói Custom, hệ thống tạo bản ghi `subscription_plans` (`is_custom = true`, `target_tenant_id = tenant.id`).
  4. Hệ thống tạo **duy nhất 01** bản ghi `tenant_subscriptions` ở trạng thái **`PENDING`** kèm đầy đủ **11 cột snapshot V27** của gói đã chọn.
  5. Hệ thống tạo Hợp đồng (`contracts`) hoặc Hoá đơn (`invoices` gắn `subscription_id = pendingSub.id`) và cập nhật Lead sang `PROVISIONED` (`tenant_id = tenant.id`).
  6. Chỉ khi Hoá đơn được xác nhận thanh toán (`PAID`), hệ thống mới tự động kích hoạt cấp phát MySQL Database, chuyển cả `tenants` và `tenant_subscriptions` sang `ACTIVE`, rồi gửi email kích hoạt tài khoản cho khách hàng.

## Business Rules

- Tuyệt đối không cấp phát MySQL Database vật lý và không tạo gói `STARTER` `ACTIVE` mồ côi khi chạy B2B Deal Wizard; mọi Deal thương mại bắt buộc đi qua trạng thái `PENDING_PAYMENT` (`deferProvisioning = true`).
- Chu kỳ hợp đồng và gói cước trong B2B Deal Wizard cố định theo **Năm (365 ngày)** và tính bằng **VNĐ (`VND`)**, thuế GTGT mặc định 10%.
- Khi chuyển đổi từ một `consultation_requests`, cột `consultation_requests.tenant_id` và `contracts.consultation_request_id` được liên kết khoá ngoại để truy vết doanh thu theo nguồn Lead.

## API liên quan

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/v1/master/consultations/submit` | Public | Khách hàng gửi yêu cầu tư vấn / Demo từ Landing Page |
| GET | `/api/v1/master/consultations` | WORKSPACE_ADMIN | Danh sách yêu cầu tư vấn B2B |
| PATCH | `/api/v1/master/consultations/{id}` | WORKSPACE_ADMIN | Cập nhật trạng thái xử lý, ghi chú hoặc gắn `tenantId` cho Lead |
| DELETE | `/api/v1/master/consultations/{id}` | WORKSPACE_ADMIN | Xoá yêu cầu tư vấn spam/không hợp lệ |
| POST | `/api/v1/master/tenants/onboard` | WORKSPACE_ADMIN | Khởi tạo Tenant với `deferProvisioning = true` (`PENDING_PAYMENT`) |
| POST | `/api/v1/master/subscriptions/assign` | WORKSPACE_ADMIN | Tạo bản ghi `tenant_subscriptions` ở trạng thái `PENDING` kèm 11 cột snapshot |

## Database liên quan

- PostgreSQL (`smarthire_master`):
  - `consultation_requests` (entity `ConsultationRequest`): lưu thông tin Lead B2B và liên kết `tenant_id` (`fk_cr_tenant`).
  - `tenants` (`TenantInfo`), `subscription_plans` (`SubscriptionPlan`), `tenant_subscriptions` (`TenantSubscription`), `contracts` (`Contract`), `invoices` (`Invoice`).

## UI mockup

- `/admin/consultations` (`ConsultationRequestsPage.tsx`): Bảng quản lý Lead tư vấn B2B, lọc theo trạng thái, xem chi tiết nhu cầu và nút chuyển đổi nhanh sang Deal Wizard.
- `/admin/deals/new` (`B2BDealWizardPage.tsx`): Trình thuật toán 4 bước chốt Deal B2B tích hợp khởi tạo chờ thanh toán (`PENDING_PAYMENT`), thiết kế gói Custom Enterprise và phát hành Hợp đồng / Hoá đơn.
