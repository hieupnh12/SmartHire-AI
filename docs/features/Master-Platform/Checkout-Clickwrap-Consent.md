# MASTER-04 — Đăng ký Tự động & Đồng thuận Pháp lý Click-wrap (Self-serve Checkout & NĐ 13/2023/NĐ-CP)

**Code ID:** `MASTER-04`  
**Epic:** Master Platform — SaaS Multi-Tenant Administration  
**Trạng thái:** `Done`

## Mục đích chức năng

Cung cấp luồng đăng ký và mua gói dịch vụ tự phục vụ (**Self-serve Checkout**) trên cổng thông tin nền tảng cho khách hàng doanh nghiệp vừa và nhỏ (SME), tích hợp cơ chế ghi nhận bằng chứng đồng thuận pháp lý điện tử (**Click-wrap Legal Consent — V25**) tuân thủ **Nghị định 13/2023/NĐ-CP** về Bảo vệ dữ liệu cá nhân và Luật Giao dịch điện tử Việt Nam.

## Actor

- **Khách hàng Doanh nghiệp (Buyer / Prospective Tenant Admin):** Chọn gói cước trên trang chủ, điền thông tin doanh nghiệp/mã số thuế, đọc và tích chọn đồng ý Điều khoản dịch vụ & Chính sách Bảo vệ Dữ liệu Cá nhân (NĐ13), và thanh toán trực tuyến.
- **Workspace Admin (`WORKSPACE_ADMIN`):** Tra cứu bằng chứng đồng thuận pháp lý (`master_consent_logs`) khi cần kiểm toán hoặc giải quyết tranh chấp.

## Luồng hoạt động

1. Khách hàng truy cập trang Bảng giá trên Landing Page (`/`) và chọn gói tiêu chuẩn (`STARTER` hoặc `PRO`, chu kỳ 1 năm, đơn vị VNĐ), hệ thống điều hướng sang `/checkout?plan=<code>`.
2. Khách hàng nhập thông tin định danh Workspace (`companyName`, `code`, `subdomain`), thông tin người đại diện (`adminName`, `adminEmail`, `phone`) và thông tin xuất hoá đơn thuế (`taxCode`, `companyLegalName`, `billingAddress`).
3. Hệ thống kiểm tra tính khả dụng của `code` và `subdomain` theo thời gian thực (`GET /api/v1/master/tenants/check/{codeOrSubdomain}`).
4. Khách hàng bắt buộc đọc và tích chọn ô xác nhận đồng thuận pháp lý (**Click-wrap Agreement**) đối với:
   - Điều khoản Dịch vụ SaaS (`TERMS_OF_SERVICE`)
   - Chính sách Bảo vệ & Xử lý Dữ liệu Cá nhân theo Nghị định 13/2023/NĐ-CP (`PRIVACY_POLICY_ND13`)
5. Khi gửi yêu cầu đặt hàng (`POST /api/v1/master/checkout/submit`), `MasterCheckoutService` thực hiện:
   - Kiểm tra bắt buộc `termsAccepted == true` và `privacyAccepted == true` (nếu thiếu trả lỗi `400 Bad Request`).
   - Trích xuất địa chỉ IP thực của khách hàng (`X-Forwarded-For` / `RemoteAddr`) và chuỗi `User-Agent` từ HTTP Request.
   - Khởi tạo Tenant, khởi tạo `tenant_subscriptions` (kèm 11 cột snapshot V27) và phát hành hoá đơn `invoices` với snapshot `terms_accepted = true`, `terms_version`, `terms_accepted_at`.
   - Ghi nhận 2 bản ghi bằng chứng pháp lý bất biến vào bảng `master_consent_logs` (`TERMS_OF_SERVICE` và `PRIVACY_POLICY_ND13`).
6. Khách hàng quét mã VietQR (SePay) hoặc thanh toán qua VNPay/PayPal ngay trên màn hình Checkout; giao diện tự động kiểm tra trạng thái hoá đơn (`GET /api/v1/master/checkout/invoices/{invoiceId}/status`) và hiển thị hướng dẫn kích hoạt tài khoản ngay khi thanh toán hoàn tất.

## Business Rules

- Không cho phép gửi đơn hàng nếu khách hàng chưa tích chọn đồng ý cả hai văn bản `TERMS_OF_SERVICE` và `PRIVACY_POLICY_ND13`.
- Bảng `master_consent_logs` là nhật ký kiểm toán bất biến (Append-only): chỉ ghi thêm, không sửa, không xoá. Khoá ngoại `fk_mcl_tenant` và `fk_mcl_invoice` sử dụng `ON DELETE SET NULL` để đảm bảo bằng chứng pháp lý vẫn được lưu giữ ngay cả khi Tenant bị xoá sau này.
- Địa chỉ IP và thời điểm đồng thuận (`created_at`, `terms_accepted_at`) luôn do Backend ghi nhận từ môi trường Server, không tin cậy timestamp gửi từ phía Client.

## API liên quan

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/v1/master/checkout/submit` | Public | Khởi tạo đơn hàng Self-serve Checkout & ghi nhận Click-wrap Consent |
| GET | `/api/v1/master/checkout/invoices/{invoiceId}/status` | Public | Kiểm tra trạng thái thanh toán của đơn hàng Checkout |
| GET | `/api/v1/master/tenants/check/{codeOrSubdomain}` | Public | Kiểm tra trùng mã doanh nghiệp / subdomain |

## Database liên quan

- PostgreSQL (`smarthire_master`):
  - `master_consent_logs` (entity `MasterConsentLog`): lưu bằng chứng đồng thuận pháp lý (`tenant_id`, `invoice_id`, `actor_name`, `actor_email`, `policy_type`, `policy_version`, `is_accepted`, `ip_address`, `user_agent`, `consent_context`, `created_at`).
  - `invoices` (entity `Invoice`): lưu 3 cột snapshot `terms_accepted`, `terms_version`, `terms_accepted_at`.
  - `tenants` (`TenantInfo`) & `tenant_subscriptions` (`TenantSubscription`).

## UI mockup

- `/checkout` (`SelfServeCheckoutPage.tsx`): Giao diện thanh toán 2 cột gồm form thông tin doanh nghiệp, hộp điều khoản pháp lý Click-wrap (ToS + Nghị định 13/2023/NĐ-CP), bảng tóm tắt đơn hàng theo năm (VNĐ) và màn hình quét mã QR thanh toán trực tiếp.
