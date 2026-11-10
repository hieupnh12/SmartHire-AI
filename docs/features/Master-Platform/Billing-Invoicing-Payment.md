# MASTER-03 — Quản lý Hoá đơn, Đối soát & Cổng Thanh toán (Billing, Invoicing & Payment Gateways)

**Code ID:** `MASTER-03`  
**Epic:** Master Platform — SaaS Multi-Tenant Administration  
**Trạng thái:** `Done`

## Mục đích chức năng

Quản lý toàn diện vòng đời hoá đơn tài chính B2B (`invoices`, `invoice_line_items`), đối soát giao dịch (`payment_transactions`), hỗ trợ đa phương thức thanh toán tự động (**VietQR SePay Webhook**, **VNPay**, **PayPal Orders v2**) và **Duyệt chứng từ chuyển khoản thủ công (Manual Approval)**. Đóng vai trò là **Điểm kích hoạt duy nhất (Single Activation Trigger)** để cấp phát hạ tầng MySQL Database và kích hoạt gói thuê bao cho các giao dịch B2B Deal và Self-serve Checkout.

Hỗ trợ **Tra cứu đơn hàng dịch vụ (Self-serve Order Lookup)** trực tiếp từ thanh Header trên trang Pricing (`/pricing`): Cho phép khách hàng đã hoàn tất đăng ký ở Bước 1 nhưng chưa hoàn tất thanh toán ở Bước 2 có thể tra cứu đơn hàng bằng email quản trị, xem tóm tắt thông tin đơn hàng và tiếp tục thanh toán ngay lập tức mà không phải khai báo lại thông tin doanh nghiệp.

## Actor

- **Workspace Admin (`WORKSPACE_ADMIN`):** Phát hành hoá đơn, xem danh sách hoá đơn & lịch sử giao dịch toàn sàn, duyệt thanh toán thủ công khi nhận uỷ nhiệm chi (UNC), huỷ hoá đơn hoặc xuất chứng từ PDF.
- **Tenant Admin (`TENANT_ADMIN`) / Khách hàng Checkout:** Xem hoá đơn, quét mã VietQR (SePay), thanh toán qua VNPay/PayPal hoặc tải lên ảnh chứng từ chuyển khoản (UNC).
- **Khách hàng tiềm năng (Chưa hoàn tất thanh toán):** Tra cứu đơn hàng đang chờ thanh toán (`PENDING`) qua email hoặc mã hoá đơn trên Header trang Bảng giá để tiếp tục thanh toán.
- **Cổng thanh toán (SePay / VNPay / PayPal):** Gửi IPN/Webhook xác nhận giao dịch thành công về Backend.

## Luồng hoạt động

### 1. Phát hành Hoá đơn & Chi tiết Dòng hàng
1. Hoá đơn (`invoices`) được tạo tự động từ luồng Self-serve Checkout, B2B Deal Wizard, Nâng cấp gói Proration hoặc tạo thủ công bởi Workspace Admin (`POST /api/v1/master/invoices`).
2. Hệ thống sinh mã hoá đơn duy nhất (`INV-YYYY-XXXXXX`), tính giá trị gốc (`subtotal`) và tổng thanh toán (`amount`) bằng **VNĐ (`VND`)**, đồng thời lưu chi tiết từng hạng mục vào `invoice_line_items` (`BASE_PLAN`, `SUBSCRIPTION`, `EXTRA_QUOTA`, `ADDON`) và snapshot thông tin pháp nhân xuất hoá đơn (`billing_tax_code`, `billing_legal_name`, `billing_address`).
3. Hệ thống gửi email thông báo phát hành hoá đơn kèm ghi nhận vào `master_notification_logs`.

### 2. Tra cứu & Tiếp tục Thanh toán Đơn hàng Chưa thanh toán (Order Lookup Flow)
1. Khách hàng truy cập trang Bảng giá `/pricing`, Header nhận diện route và hiển thị nút **"Tra cứu đơn hàng"**.
2. Bấm vào nút mở modal **Tra cứu đơn hàng dịch vụ** (`OrderLookupModal`).
3. Khách hàng nhập email quản trị viên đã đăng ký mua gói cước (hoặc mã đơn hàng `INV-...`).
4. Hệ thống gọi `GET /api/v1/public/checkout/orders?query={email}` tìm kiếm các đơn hàng khớp.
5. Hiển thị danh sách thẻ thông tin cơ bản:
   - Mã đơn hàng `#INV-...` kèm nút copy nhanh.
   - Trạng thái: Chờ thanh toán (`PENDING` - nhấp nháy), Đã thanh toán (`PAID`), Đã hủy (`CANCELLED`).
   - Tên gói cước & thời hạn bản quyền (1 năm).
   - Tên Không gian làm việc & subdomain (`*.smarthire.top`).
   - Số tiền cần thanh toán (VNĐ).
   - Thời gian tạo đơn & hạn thanh toán.
6. **Hành động:**
   - Với đơn hàng `PENDING`: Có nút **"Thanh toán ngay"** (chuyển thẳng sang Bước 2 của `/checkout?invoiceId={id}` với đầy đủ VietQR, VNPay, PayPal) và nút **"Xem mã VietQR"** (mở xem nhanh mã QR và thông tin chuyển khoản ngay trong modal).
   - Với đơn hàng `PAID`: Nút **"Đến Không gian tuyển dụng"** dẫn đến subdomain của doanh nghiệp.

### 3. Thanh toán Tự động qua Cổng Thanh toán
1. **VietQR SePay (`POST /api/v1/master/payments/webhook/sepay`):**
   - Khách hàng chuyển khoản ngân hàng theo mã QR chứa nội dung tham chiếu hoá đơn.
   - SePay gọi Webhook về hệ thống kèm chữ ký HMAC-SHA256 (`X-Sepay-Signature`) và `X-Sepay-Timestamp`.
   - Backend xác thực chữ ký HMAC-SHA256 thời gian hằng (`MessageDigest.isEqual`), kiểm tra độ lệch timestamp ≤ 5 phút, đối chiếu số tiền khớp 100% với `invoice.amount`, lưu `payment_transactions` và kích hoạt hoá đơn.
2. **VNPay (`GET/POST /api/v1/master/payments/vnpay/*`) & PayPal (`POST /api/v1/master/payments/paypal/*`):**
   - Tạo URL thanh toán hoặc PayPal Order (tự động quy đổi tỷ giá tham chiếu từ VNĐ sang USD khi gọi PayPal API), xác thực chữ ký checksum khi callback và cập nhật `payment_transactions`.

### 4. Duyệt Thanh toán Thủ công (Ủy nhiệm chi B2B)
1. Khách hàng tải lên chứng từ chuyển khoản (`POST /api/v1/tenant/billing/invoices/{id}/proof`).
2. Workspace Admin kiểm tra chứng từ và bấm xác nhận thanh toán (`PATCH /api/v1/master/invoices/{id}/pay` hoặc `POST /api/v1/master/invoices/{id}/approve`).

### 5. Cơ chế Kích hoạt Một Điểm (`MasterInvoiceService.activatePaidInvoice`)
Khi một hoá đơn chuyển sang trạng thái `PAID` (dù qua Webhook tự động hay Admin duyệt thủ công), `MasterInvoiceService.activatePaidInvoice(Invoice)` thực thi nhất quán trong giao dịch:
1. Đánh dấu `invoice.status = PAID`, `paid_at = now()`.
2. Nếu hoá đơn gắn với một `tenant_subscriptions` cụ thể (`invoice.subscription_id != null`):
   - Đóng tất cả các bản ghi thuê bao `ACTIVE`/`TRIAL` cũ của Tenant sang `UPGRADED`.
   - Chuyển bản ghi thuê bao của hoá đơn từ `PENDING` sang `ACTIVE`, cập nhật `starts_at = now()`, `ends_at = now() + 1 year` và đảm bảo đầy đủ 11 cột snapshot V27.
3. Nếu Tenant đang ở trạng thái `PENDING_PAYMENT` (khởi tạo từ B2B Deal Wizard với `deferProvisioning = true`):
   - Gọi `MasterTenantService.provisionAndActivateDeferredTenant(tenantId)` để cấp phát MySQL Database riêng, chạy Flyway tenant migration, tạo lời mời kích hoạt `TENANT_ADMIN`, chuyển `tenants.status` sang `ACTIVE` và gửi email kích hoạt tài khoản cho khách hàng.
4. Nếu Tenant đang bị khoá do quá hạn (`SUSPENDED`), hệ thống tự động mở khoá lại `ACTIVE`.

## Business Rules

- Toàn bộ giá trị hoá đơn và dòng hàng trong hệ thống chuẩn hoá theo đơn vị tiền tệ **VNĐ (`VND`)**, kiểu `DECIMAL(15,2)`.
- Webhook SePay bắt buộc kiểm tra chữ ký HMAC-SHA256 (`sepay.webhook.require-signature=true` mặc định); header `X-Test-Simulation` không được phép bypass xác thực.
- Giao dịch thanh toán có số tiền nhỏ hơn `invoice.amount` bị từ chối kích hoạt hoá đơn và ghi log cảnh báo gian lận.
- Không cho phép xoá cứng hoá đơn đã thanh toán (`PAID`) để đảm bảo tính toàn vẹn kế toán và kiểm toán.
- **Tự động hủy đơn hàng quá hạn 7 ngày & Giải phóng Subdomain:** Đơn hàng Self-serve Checkout ở trạng thái `PENDING` nếu không thanh toán trong vòng 7 ngày (`due_date < now()`) sẽ được hệ thống quét định kỳ hàng giờ (`@Scheduled`), tự động hủy hóa đơn (`CANCELLED`), hủy thuê bao tạm (`CANCELED`), đánh dấu tenant `CANCELLED` và giải phóng mã/tên miền phụ (`released_<id>_<subdomain>`) để cho phép doanh nghiệp khác đăng ký ngay lập tức mà vẫn giữ trọn vẹn dữ liệu kế toán và kiểm toán.

## API liên quan

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/v1/public/checkout/orders` | Public | Tra cứu danh sách đơn hàng theo email hoặc mã hóa đơn |
| GET | `/api/v1/public/checkout/order/{invoiceId}` | Public | Lấy thông tin chi tiết đơn hàng (VietQR, thông tin chuyển khoản) cho Checkout Step 2 |
| GET | `/api/v1/public/checkout/order-by-number/{invoiceNumber}` | Public | Lấy chi tiết đơn hàng theo mã hóa đơn |
| GET | `/api/v1/public/checkout/status/{invoiceId}` | Public | Kiểm tra trạng thái thanh toán hóa đơn realtime |
| GET | `/api/v1/master/invoices` | WORKSPACE_ADMIN | Danh sách toàn bộ hoá đơn trên nền tảng |
| POST | `/api/v1/master/invoices` | WORKSPACE_ADMIN | Tạo hoá đơn mới kèm dòng hàng chi tiết |
| PATCH | `/api/v1/master/invoices/{id}/pay` | WORKSPACE_ADMIN | Xác nhận thanh toán hoá đơn & kích hoạt dịch vụ |
| POST | `/api/v1/master/invoices/{id}/approve` | WORKSPACE_ADMIN | Duyệt chứng từ chuyển khoản UNC & kích hoạt dịch vụ |
| POST | `/api/v1/master/invoices/cleanup-expired` | WORKSPACE_ADMIN | Kích hoạt quét dọn dẹp đơn hàng quá hạn 7 ngày & giải phóng subdomain |
| PATCH | `/api/v1/master/invoices/{id}/cancel` | WORKSPACE_ADMIN | Huỷ hoá đơn chưa thanh toán |
| POST | `/api/v1/master/payments/webhook/sepay` | Public (HMAC) | Webhook nhận biến động số dư VietQR từ SePay |
| POST | `/api/v1/master/payments/vnpay/create-url` | Public / Tenant | Khởi tạo URL thanh toán VNPay |
| POST | `/api/v1/master/payments/paypal/create-order` | Public / Tenant | Khởi tạo đơn hàng PayPal Orders v2 |
| POST | `/api/v1/master/payments/paypal/capture-order` | Public / Tenant | Xác nhận thu tiền PayPal & kích hoạt hoá đơn |
| GET | `/api/v1/tenant/billing/invoices` | TENANT_ADMIN | Danh sách hoá đơn của doanh nghiệp |

## Database liên quan

- PostgreSQL (`smarthire_master`):
  - `invoices` (entity `Invoice`): thông tin hoá đơn, cổng thanh toán và snapshot đồng thuận pháp lý.
  - `invoice_line_items` (entity `InvoiceLineItem`): chi tiết các dòng dịch vụ trong hoá đơn.
  - `payment_transactions` (entity `PaymentTransaction`): nhật ký giao dịch đối soát từ cổng thanh toán.
  - `tenant_subscriptions` (entity `TenantSubscription`) & `tenants` (entity `TenantInfo`): đối tượng được kích hoạt khi hoá đơn hoàn tất thanh toán.

## UI mockup

- `/pricing` Header: Nút "Tra cứu đơn hàng" (`LandingHeader.tsx`) hiển thị tự động khi xem Bảng giá gói giải pháp.
- `OrderLookupModal.tsx`: Hộp thoại tra cứu đơn hàng theo email quản trị hoặc mã hóa đơn, hiển thị thẻ thông tin đơn hàng, mã VietQR và nút "Thanh toán ngay".
- `/checkout?invoiceId={id}` (`CheckoutPage.tsx`): Tự động nạp dữ liệu đơn hàng chưa thanh toán vào thẳng Bước 2 (Thanh toán) kèm VietQR, cổng VNPay, PayPal để hoàn tất thanh toán thuận tiện.
- `/admin/billing` (`BillingInvoicingPage.tsx`): Bảng quản lý hoá đơn toàn sàn, bộ lọc theo trạng thái (`PENDING`, `PAID`, `OVERDUE`, `CANCELLED`), xem chứng từ UNC và nút duyệt thanh toán.
- `/admin/settings` (`SystemSettingsPage.tsx`): Cấu hình thông tin tài khoản ngân hàng thụ hưởng VietQR (Ngân hàng, Số tài khoản, Chủ tài khoản) và cổng thanh toán.
