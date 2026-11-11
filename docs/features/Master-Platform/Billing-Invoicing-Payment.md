# MASTER-03 — Quản lý Hoá đơn, Đối soát & Cổng Thanh toán (Billing, Invoicing & Payment Gateways)

**Code ID:** `MASTER-03`  
**Epic:** Master Platform — SaaS Multi-Tenant Administration  
**Trạng thái:** `Done`

## Mục đích chức năng

Quản lý toàn diện vòng đời hoá đơn tài chính B2B (`invoices`, `invoice_line_items`), đối soát giao dịch (`payment_transactions`), hỗ trợ đa phương thức thanh toán tự động (**VietQR SePay Webhook**, **VNPay**, **PayPal Orders v2**) và **Duyệt chứng từ chuyển khoản thủ công (Manual Approval)**. Đóng vai trò là **Điểm kích hoạt duy nhất (Single Activation Trigger)** để cấp phát hạ tầng MySQL Database cho Tenant mới và kích hoạt nâng cấp/gia hạn gói thuê bao cho các giao dịch B2B Deal, Self-serve Checkout và Tenant Admin Billing Portal.

Hỗ trợ **Tra cứu đơn hàng dịch vụ (Self-serve Order Lookup)** trực tiếp từ thanh Header trên trang Pricing (`/pricing`) và **Thanh toán Hoá đơn Nội bộ (`/internal/admin/billing`)** cho Tenant Admin khi nâng cấp hoặc gia hạn chu kỳ bản quyền.

## Actor

- **Workspace Admin (`WORKSPACE_ADMIN`):** Phát hành hoá đơn, xem danh sách hoá đơn & lịch sử giao dịch toàn sàn, duyệt thanh toán thủ công khi nhận uỷ nhiệm chi (UNC), huỷ hoá đơn hoặc xuất chứng từ PDF.
- **Tenant Admin (`TENANT_ADMIN`) / Khách hàng Checkout:** Xem hoá đơn, quét mã VietQR (SePay), thanh toán qua VNPay/PayPal ngay trong cổng `/internal/admin/billing` (đối với nâng cấp/gia hạn) hoặc trang Checkout (đối với đăng ký mới), huỷ hoá đơn `PENDING` không còn nhu cầu.
- **Khách hàng tiềm năng (Chưa hoàn tất thanh toán):** Tra cứu đơn hàng đang chờ thanh toán (`PENDING`) qua email hoặc mã hoá đơn trên Header trang Bảng giá để tiếp tục thanh toán.
- **Cổng thanh toán (SePay / VNPay / PayPal):** Gửi IPN/Webhook xác nhận giao dịch thành công về Backend.

## Luồng hoạt động

### 1. Phát hành Hoá đơn & Chi tiết Dòng hàng
1. Hoá đơn (`invoices`) được tạo tự động từ luồng Self-serve Checkout, B2B Deal Wizard, Self-serve Nâng cấp gói Proration (`SUBSCRIPTION_UPGRADE` + `PRORATION_CREDIT`), Self-serve Gia hạn (`SUBSCRIPTION_RENEWAL`) hoặc tạo thủ công bởi Workspace Admin (`POST /api/v1/master/invoices`).
2. Hệ thống sinh mã hoá đơn duy nhất (`INV-YYYY-XXXXXX`), tính giá trị gốc (`subtotal`) và tổng thanh toán (`amount`) bằng **VNĐ (`VND`)**, đồng thời lưu chi tiết từng hạng mục vào `invoice_line_items` (`BASE_PLAN`, `SUBSCRIPTION`, `SUBSCRIPTION_UPGRADE`, `SUBSCRIPTION_RENEWAL`, `PRORATION_CREDIT`, `EXTRA_QUOTA`, `ADDON`) và snapshot thông tin pháp nhân xuất hoá đơn (`billing_tax_code`, `billing_legal_name`, `billing_address`).
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

### 3. Thanh toán Tự động qua Cổng Thanh toán (Checkout & Tenant Admin Billing Portal)
1. **VietQR SePay (`POST /api/v1/master/payments/webhook/sepay`):**
   - Khách hàng hoặc Tenant Admin quét mã VietQR từ Checkout hoặc `InvoicePaymentModal` (`/internal/admin/billing`) chứa nội dung tham chiếu hoá đơn.
   - SePay gọi Webhook về hệ thống kèm chữ ký HMAC-SHA256 (`X-Sepay-Signature`) và `X-Sepay-Timestamp`.
   - Backend xác thực chữ ký HMAC-SHA256 thời gian hằng (`MessageDigest.isEqual`), kiểm tra độ lệch timestamp ≤ 5 phút, đối chiếu số tiền khớp 100% với `invoice.amount`, lưu `payment_transactions` và kích hoạt hoá đơn.
2. **VNPay (`POST /api/v1/public/checkout/vnpay/create-url`, `GET /api/v1/public/checkout/vnpay/verify-return`, IPN) & PayPal (`POST /api/v1/public/checkout/paypal/verify-return`):**
   - Tạo URL thanh toán (hỗ trợ truyền `returnUrl` theo origin hiện tại của Tenant subdomain khi thanh toán nâng cấp/gia hạn) hoặc PayPal Order, xác thực checksum/capture khi callback, trả kèm `paymentPurpose` (`ONBOARDING` | `UPGRADE` | `RENEWAL`) và `planName` để `VnPayReturnPage` điều hướng phù hợp về `/internal/admin/billing` hoặc kích hoạt workspace mới.

### 4. Duyệt Thanh toán Thủ công (Ủy nhiệm chi B2B)
1. Workspace Admin kiểm tra chứng từ và bấm xác nhận thanh toán (`PATCH /api/v1/master/invoices/{id}/pay` hoặc `POST /api/v1/master/invoices/{id}/approve`).

### 5. Cơ chế Kích hoạt Một Điểm (`MasterBillingService.completePaidInvoice`)
Khi một hoá đơn chuyển sang trạng thái `PAID` (dù qua SePay Webhook, VNPay, PayPal hay Admin duyệt thủ công), `MasterBillingService.completePaidInvoice` thực thi nhất quán trong giao dịch:
1. Đánh dấu `invoice.status = PAID`, `paid_at = now()`, lưu phương thức thanh toán và `payment_transactions`.
2. Phân nhánh xử lý `tenant_subscriptions` gắn với `invoice.subscriptionId`:
   - **Gia hạn thuê bao đang chạy (`SUBSCRIPTION_RENEWAL` và subscription không ở trạng thái `PENDING`):** Cộng dồn thêm số năm gia hạn từ `ends_at` (nếu còn hạn `endsAt > now`) hoặc từ `now` (nếu đã hết hạn/ân hạn), giữ nguyên `starts_at` khi còn hạn, đặt lại `status = ACTIVE`, xoá `grace_period_ends_at` và `canceled_at`.
   - **Kích hoạt thuê bao mới / nâng cấp / kích hoạt Starter (`PENDING` hoặc khởi tạo):** Đóng tất cả các bản ghi thuê bao `ACTIVE`/`TRIAL` cũ (và `upgradedFromSubscriptionId` nếu có) sang `CANCELED` (`UPGRADED`), chuyển bản ghi thuê bao của hoá đơn sang `ACTIVE`, cập nhật `starts_at = now()`, `ends_at = now + years`, và xoá cache quota Redis của Tenant.
3. Nếu Tenant đang ở trạng thái `PENDING_PAYMENT`: phát sự kiện bất đồng bộ (`TenantPaymentSuccessEvent`) để cấp phát MySQL Database riêng, chạy Flyway tenant migration, tạo lời mời kích hoạt `TENANT_ADMIN` và gửi email kích hoạt tài khoản.
4. Nếu Tenant đang bị khoá do quá hạn (`SUSPENDED`), hệ thống tự động mở khoá lại `ACTIVE`.

## Business Rules

- Toàn bộ giá trị hoá đơn và dòng hàng trong hệ thống chuẩn hoá theo đơn vị tiền tệ **VNĐ (`VND`)**, kiểu `DECIMAL(15,2)`.
- Webhook SePay bắt buộc kiểm tra chữ ký HMAC-SHA256 (`sepay.webhook.require-signature=true` mặc định); header `X-Test-Simulation` không được phép bypass xác thực.
- Giao dịch thanh toán có số tiền nhỏ hơn `invoice.amount` bị từ chối kích hoạt hoá đơn và ghi log cảnh báo gian lận.
- Không cho phép xoá cứng hoá đơn đã thanh toán (`PAID`) để đảm bảo tính toàn vẹn kế toán và kiểm toán.
- Cô lập dữ liệu Multi-Tenant: Tenant Admin chỉ được lấy thông tin checkout hoặc huỷ hoá đơn có `invoice.tenantId` khớp với Tenant đang truy cập (`FORBIDDEN` nếu truy cập hoá đơn của Tenant khác).
- **Tự động hủy đơn hàng quá hạn 7 ngày & Giải phóng Subdomain:** Đơn hàng Self-serve Checkout ở trạng thái `PENDING` nếu không thanh toán trong vòng 7 ngày (`due_date < now()`) sẽ được hệ thống quét định kỳ hàng giờ (`@Scheduled`), tự động hủy hóa đơn (`CANCELLED`), hủy thuê bao tạm (`CANCELED`), đánh dấu tenant `CANCELLED` (chỉ áp dụng với tenant chưa kích hoạt `PENDING_PAYMENT`) và giải phóng subdomain mà vẫn giữ trọn vẹn dữ liệu kế toán và kiểm toán.

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
| POST | `/api/v1/public/checkout/vnpay/create-url` | Public / Tenant | Khởi tạo URL thanh toán VNPay |
| GET | `/api/v1/public/checkout/vnpay/verify-return` | Public / Tenant | Xác thực chữ ký VNPay return & hoàn tất thanh toán |
| POST | `/api/v1/public/checkout/paypal/verify-return` | Public / Tenant | Xác thực đơn hàng PayPal đã capture & hoàn tất thanh toán |
| GET | `/api/v1/tenant/company/subscription/invoices/{invoiceId}/checkout` | TENANT_ADMIN | Lấy chi tiết VietQR / số tiền / mã chuyển khoản để thanh toán trong Workspace |
| POST | `/api/v1/tenant/company/subscription/invoices/{invoiceId}/cancel` | TENANT_ADMIN | Huỷ hoá đơn `PENDING` và thuê bao `PENDING` gắn kèm |

## Database liên quan

- PostgreSQL (`smarthire_master`):
  - `invoices` (entity `Invoice`): thông tin hoá đơn, cổng thanh toán và snapshot đồng thuận pháp lý.
  - `invoice_line_items` (entity `InvoiceLineItem`): chi tiết các dòng dịch vụ trong hoá đơn.
  - `payment_transactions` (entity `PaymentTransaction`): nhật ký giao dịch đối soát từ cổng thanh toán.
  - `tenant_subscriptions` (entity `TenantSubscription`) & `tenants` (entity `TenantInfo`): đối tượng được kích hoạt/gia hạn khi hoá đơn hoàn tất thanh toán.

## UI mockup

- `/pricing` Header: Nút "Tra cứu đơn hàng" (`LandingHeader.tsx`) hiển thị tự động khi xem Bảng giá gói giải pháp.
- `OrderLookupModal.tsx`: Hộp thoại tra cứu đơn hàng theo email quản trị hoặc mã hóa đơn, hiển thị thẻ thông tin đơn hàng, mã VietQR và nút "Thanh toán ngay".
- `/checkout?invoiceId={id}` (`CheckoutPage.tsx`) & `/checkout/vnpay-return` (`VnPayReturnPage.tsx`): Thanh toán đơn hàng đăng ký mới hoặc điều hướng quay lại `/internal/admin/billing` sau khi nâng cấp/gia hạn qua VNPay.
- `/internal/admin/billing` (`SubscriptionBillingPage.tsx` & `InvoicePaymentModal.tsx`): Danh sách hoá đơn của doanh nghiệp, thanh toán tại chỗ qua VietQR SePay (polling realtime), VNPay, PayPal và huỷ hoá đơn `PENDING`.
- `/admin/invoices` (`InvoicesPage.tsx`): Bảng quản lý hoá đơn toàn sàn cho Workspace Admin, bộ lọc theo trạng thái (`PENDING`, `PAID`, `OVERDUE`, `CANCELLED`) và duyệt thanh toán.
