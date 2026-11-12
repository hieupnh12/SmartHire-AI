# MASTER-04 — Đăng ký Tự động & Đồng thuận Pháp lý Click-wrap (Self-serve Checkout & Luật BVDLCN 2025)

**Code ID:** `MASTER-04`  
**Epic:** Master Platform — SaaS Multi-Tenant Administration  
**Trạng thái:** `Done`

## Mục đích chức năng

Cung cấp luồng đăng ký và mua gói dịch vụ tự phục vụ (**Self-serve Checkout**) trên cổng thông tin nền tảng cho khách hàng doanh nghiệp vừa và nhỏ (SME), tích hợp cơ chế ghi nhận bằng chứng đồng thuận pháp lý điện tử (**Click-wrap Legal Consent — V25**) tuân thủ **Luật Bảo vệ dữ liệu cá nhân 2025 & Nghị định số 356/2025/NĐ-CP** và Luật Giao dịch điện tử 2023.

## Actor

- **Khách hàng Doanh nghiệp (Buyer / Prospective Tenant Admin):** Chọn gói cước trên trang chủ, điền thông tin doanh nghiệp/mã số thuế, đọc và tích chọn đồng ý Điều khoản dịch vụ & Chính sách Bảo vệ Dữ liệu Cá nhân (Luật 2025 & NĐ 356/2025/NĐ-CP), và thanh toán trực tuyến.
- **Workspace Admin (`WORKSPACE_ADMIN`):** Tra cứu bằng chứng đồng thuận pháp lý (`master_consent_logs`) khi cần kiểm toán hoặc giải quyết tranh chấp.

## Luồng hoạt động

1. Khách hàng truy cập trang Bảng giá (`/pricing`) hoặc Landing Page (`/`) và chọn gói tiêu chuẩn (`STARTER`, `PROFESSIONAL` hoặc `ENTERPRISE`, chu kỳ theo năm, đơn vị VNĐ), hệ thống lấy danh mục công khai từ `GET /api/v1/public/checkout/plans` và điều hướng sang `/checkout` hoặc `/checkout/:planCode`.
2. Trên Bước 1 (**Đặt hàng**), khách hàng nhập tên Không gian làm việc (`workspaceName`), tên miền phụ (`subdomain`), thông tin người quản trị (`adminFullName`, `adminEmail`, `adminPhone`) và tùy chọn xuất hoá đơn doanh nghiệp (`needCompanyInvoice`: `taxCode`, `companyLegalName`, `billingAddress`).
3. Hệ thống kiểm tra tính khả dụng của `subdomain` theo thời gian thực (`GET /api/v1/master/tenants/check-subdomain/{subdomain}`); khi submit, Backend dùng `subdomain` cho cả `code` và `subdomain` ở `MasterTenantService.registerPendingTenant(...)`.
4. Khách hàng bắt buộc mở xem/đọc (`LegalPolicyModal.tsx`, `/terms`, `/privacy`) và tích chọn ô xác nhận đồng thuận pháp lý (**Click-wrap Agreement**, mặc định không tick sẵn) đối với:
   - Điều khoản Dịch vụ SaaS (`TERMS_OF_SERVICE`)
   - Chính sách Bảo vệ & Xử lý Dữ liệu Cá nhân theo Luật Bảo vệ dữ liệu cá nhân 2025 & NĐ 356/2025/NĐ-CP (`PRIVACY_POLICY_2025`)
5. Khi gửi yêu cầu đặt hàng (`POST /api/v1/public/checkout`), `PublicCheckoutController` uỷ quyền `MasterBillingService.checkout(...)` thực hiện:
   - Kiểm tra bắt buộc `termsAccepted == true` (nếu thiếu trả lỗi `400 Bad Request`, mã `TERMS_NOT_ACCEPTED`).
   - Trích xuất địa chỉ IP thực của khách hàng (`VnPayUtil.getIpAddress(httpRequest)`) và chuỗi `User-Agent` từ HTTP Request.
   - Khởi tạo Tenant ở trạng thái `PENDING_PAYMENT`, khởi tạo `tenant_subscriptions` ở trạng thái `PENDING` (kèm 11 cột snapshot V27) và phát hành hoá đơn `invoices` (hạn thanh toán 7 ngày) với snapshot `terms_accepted = true`, `terms_version` (`v2026.10`), `terms_accepted_at`.
   - Ghi nhận 2 bản ghi bằng chứng pháp lý bất biến vào bảng `master_consent_logs` (`TERMS_OF_SERVICE` và `PRIVACY_POLICY_2025`, `consent_context = 'SELF_SERVE_CHECKOUT'`) kèm một bản ghi `platform_audit_logs` (`ACTION = ACCEPT_CHECKOUT_TERMS`).
   - Tạo thông tin chuyển khoản (`smarthire.platform.bank.*` — TPBank) + URL mã **VietQR SePay** và sinh file PDF đơn hàng bất đồng bộ qua `OrderPdfGeneratorService` để gửi email xác nhận (`MasterNotificationService.sendCheckoutOrderCreated`).
6. Sang Bước 2 (**Thanh toán**), khách hàng quét mã VietQR (SePay) hoặc thanh toán qua VNPay/PayPal; giao diện tự động polling trạng thái hoá đơn mỗi 2 giây (`GET /api/v1/public/checkout/status/{invoiceId}`) và tự chuyển sang Bước 3 (**Kích hoạt**) khi hoá đơn chuyển sang `PAID`.

## Business Rules

- Không cho phép gửi đơn hàng nếu khách hàng chưa tích chọn đồng ý cả hai văn bản `TERMS_OF_SERVICE` và `PRIVACY_POLICY_2025` (các bản ghi lịch sử trước 2026-11-11 có thể mang `PRIVACY_POLICY_ND13`).
- Bảng `master_consent_logs` là nhật ký kiểm toán bất biến (Append-only): chỉ ghi thêm, không sửa, không xoá. Khoá ngoại `fk_mcl_tenant` và `fk_mcl_invoice` sử dụng `ON DELETE SET NULL` để đảm bảo bằng chứng pháp lý vẫn được lưu giữ ngay cả khi Tenant bị xoá sau này.
- Địa chỉ IP và thời điểm đồng thuận (`created_at`, `terms_accepted_at`) luôn do Backend ghi nhận từ môi trường Server, không tin cậy timestamp gửi từ phía Client.

## API liên quan

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/v1/public/checkout/plans` | Public | Danh sách gói chuẩn công khai cho trang Pricing và Checkout |
| POST | `/api/v1/public/checkout` | Public | Khởi tạo đơn hàng Self-serve Checkout, ghi nhận Click-wrap Consent & trả mã VietQR |
| GET | `/api/v1/public/checkout/status/{invoiceId}` | Public | Kiểm tra trạng thái thanh toán & kích hoạt tenant của đơn hàng Checkout |
| GET | `/api/v1/master/tenants/check-subdomain/{subdomain}` | Public | Kiểm tra `subdomain` có bị trùng hoặc nằm trong danh sách giữ chỗ |

## Database liên quan

- PostgreSQL (`smarthire_master`):
  - `master_consent_logs` (entity `MasterConsentLog`): lưu bằng chứng đồng thuận pháp lý (`tenant_id`, `invoice_id`, `actor_name`, `actor_email`, `policy_type`, `policy_version`, `is_accepted`, `ip_address`, `user_agent`, `consent_context`, `created_at`).
  - `invoices` (entity `Invoice`): lưu 3 cột snapshot `terms_accepted`, `terms_version`, `terms_accepted_at`.
  - `platform_audit_logs` (`PlatformAuditLog`), `tenants` (`TenantInfo`) & `tenant_subscriptions` (`TenantSubscription`).

## UI mockup

- `/checkout` và `/checkout/:planCode` (`CheckoutPage.tsx`): Trình tự 3 bước (**1. Đặt hàng → 2. Thanh toán → 3. Kích hoạt**), form thông tin Workspace + tùy chọn hoá đơn doanh nghiệp, ô tích Click-wrap ToS & Luật BVDLCN 2025 mở `LegalPolicyModal.tsx`, tóm tắt đơn hàng theo năm (VNĐ) và màn hình thanh toán VietQR/VNPay/PayPal.
- `/terms` và `/privacy` (`LegalDocumentsPage.tsx`): Trang đọc đầy đủ Điều khoản dịch vụ và Chính sách bảo vệ dữ liệu cá nhân.
- `/checkout/success` (`CheckoutSuccessPage.tsx`) & `/checkout/vnpay-return` (`VnPayReturnPage.tsx`): Trang kết quả thanh toán & điều hướng kích hoạt Workspace.
