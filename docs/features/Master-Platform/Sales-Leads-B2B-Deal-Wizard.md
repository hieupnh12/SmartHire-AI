# MASTER-06 — Quản lý Lead Tư vấn & Trình thuật toán Chốt Deal B2B (Sales Leads & B2B Deal Wizard)

**Code ID:** `MASTER-06`  
**Epic:** Master Platform — SaaS Multi-Tenant Administration  
**Trạng thái:** `Done`

## Mục đích chức năng

Quản lý phễu khách hàng doanh nghiệp tiềm năng (**Sales Leads / Consultation Requests**) đăng ký tư vấn hoặc báo giá từ Landing Page, và cung cấp **Quy trình 2 Chặng trên Trình thuật toán Chốt Deal B2B (B2B Deal Wizard)**:
1. **Chặng 1 — Báo giá Thương mại (Quotation Proposal / Commercial Proposal):** Khi khách hàng mới khảo sát hoặc cần trình ban lãnh đạo phê duyệt ngân sách, hệ thống cấu hình gói qua bộ máy CPQ (3 cấu phần minh bạch) và **tự động gửi Email Báo giá chính thức** (hiệu lực 15 ngày). Không bắt buộc điền thông tin pháp lý rườm rà (MST, địa chỉ, người đại diện) và **tuyệt đối không tạo Tenant / MySQL DB rác**.
2. **Chặng 2 — Chốt Hợp đồng / Hóa đơn & Cấp phát Chờ Thanh toán (Closing Deal / Deferred Provisioning):** Khi khách hàng đồng ý báo giá, Admin/Sales bổ sung đầy đủ thông tin pháp lý, subdomain để phát hành Hóa đơn VAT (`INVOICE`) hoặc Hợp đồng điện tử (`CONTRACT`), kích hoạt quy trình khởi tạo Tenant ở trạng thái Chờ Thanh toán (`PENDING_PAYMENT`, `deferProvisioning = true`).

## Actor

- **Khách hàng Doanh nghiệp Tiềm năng (Enterprise Lead):** Gửi yêu cầu tư vấn / đặt lịch Demo hoặc xin báo giá hợp đồng Enterprise từ Landing Page.
- **Workspace Admin / B2B Sales (`WORKSPACE_ADMIN`):** Tiếp nhận, phân loại trạng thái Lead (`PENDING`, `CONTACTED`, `QUOTED`, `PROVISIONED`, `REJECTED`), gửi email báo giá thương mại, và thực hiện chốt hợp đồng qua B2B Deal Wizard.

## Luồng hoạt động

### 1. Thu thập & Xác nhận Yêu cầu Tư vấn (`consultation_requests`)
1. Khách hàng điền form đăng ký tư vấn / báo giá Enterprise trên trang chủ (`POST /api/v1/master/consultations/submit`).
2. Hệ thống lưu bản ghi `consultation_requests` với trạng thái `PENDING`.
3. Hệ thống tự động đẩy job qua RabbitMQ để gửi **Email Xác nhận tiếp nhận yêu cầu** (`consultation-received.html`) tới hòm thư khách hàng với thông điệp cam kết phản hồi trong vòng 24 giờ.
4. Workspace Admin truy cập `/admin/leads` (hoặc `/admin/consultations`) để xem danh sách Lead, lọc theo trạng thái (`PENDING`, `CONTACTED`, `QUOTED`, `PROVISIONED`, `REJECTED`), cập nhật ghi chú hoặc bấm **"Báo giá / Deal"** để mở B2B Deal Wizard (`/admin/deals?leadId=<id>` hoặc `/admin/tenants/create?leadId=<id>`) với dữ liệu khách hàng được điền sẵn.

### 2. Quy trình 2 Chặng trên B2B Deal Wizard

#### Chặng 1: Gửi Báo giá Thương mại (Commercial Quotation Proposal)
- **Mục tiêu:** Trao đổi phương án tài chính và cung cấp báo giá chính thức, chuyên nghiệp gửi khách hàng trước khi làm hợp đồng pháp lý.
- **Thông tin yêu cầu tối thiểu:** Chỉ cần Tên công ty, Người liên hệ, Email nhận báo giá, Số điện thoại. Các trường pháp lý (Mã số thuế, Địa chỉ trụ sở, Đại diện pháp luật) là **không bắt buộc** (optional).
- **Cấu hình Gói & Bộ máy CPQ (3 cấu phần chuẩn B2B):**
  $$\mathbf{TotalQuote} = \mathbf{BasePlanPrice} + \mathbf{AddonFees} - \mathbf{Discount}$$
  1. *Phí bản quyền nền tảng (Platform License Fee):* Giá niêm yết của gói mẫu (`STARTER`, `PROFESSIONAL`, `ENTERPRISE`) hoặc phí nền tảng khởi tạo may đo riêng.
  2. *Gói tài nguyên mở rộng (Add-on Quotas):* Tính theo hạn mức phụ trội (Jobs tuyển dụng, Lượt lọc CV AI, Giờ phỏng vấn thoại AI, Lưu trữ GB, Giám sát thi).
  3. *Chiết khấu thương mại (Commercial Discount):* Khuyến mãi thanh toán năm hoặc ưu đãi khách hàng thân thiết.
  - *Chốt chặn an toàn (Floor Price Guard):* Cảnh báo đỏ nếu mức giá chốt thấp hơn chi phí giá vốn ước tính (Dedicated DB + Chi phí API AI tối đa).
- **Hành động & Kết quả Chặng 1:**
  - Sales/Admin chọn phương thức thương mại: **"1. Gửi Báo giá thương mại (Quotation Proposal)"** và bấm **"Gửi Báo Giá Thương Mại"**.
  - Hệ thống gọi API `POST /api/v1/master/consultations/send-quotation`.
  - Cập nhật trạng thái Lead thành `QUOTED` kèm ghi chú cấu hình.
  - Tự động xuất bản RabbitMQ job gửi **Email Báo giá thương mại chuyên nghiệp** (`quotation-proposal.html`) gồm bảng chi tiết 3 cấu phần, định mức tài nguyên cam kết, thời hạn hiệu lực 15 ngày và nút liên hệ xác nhận.
  - **Không** tạo Tenant, **không** tạo DB MySQL, **không** tạo Subscription mồ côi.

#### Chặng 2: Ký hợp đồng / Xuất Hóa đơn & Cấp phát Chờ Thanh toán (Closing Deal)
- **Mục tiêu:** Khi khách hàng xem báo giá và phản hồi đồng ý ký kết, Admin mở lại Lead (trạng thái `QUOTED`) trên B2B Deal Wizard:
  - Cấu hình gói và mức giá đã được bảo lưu.
  - Bổ sung các thông tin pháp lý bắt buộc: Mã số thuế (MST), Địa chỉ trụ sở theo ĐKKD, Người đại diện pháp luật & Chức vụ, Subdomain doanh nghiệp mong muốn.
  - Chọn một trong hai hình thức thanh toán / pháp lý:
    - **Luồng Hợp đồng Điện tử B2B (`CONTRACT`):** Soạn thảo Hợp đồng kinh tế B2B kèm điều khoản pháp lý.
    - **Luồng Hoá đơn Thanh toán Nhanh (`INVOICE`):** Phát hành ngay Hoá đơn VAT kèm mã thanh toán VietQR.
  - Bấm **"Xác Nhận & Cấp Phát Workspace"**:
    1. Frontend gọi `POST /api/v1/master/tenants/onboard` với cờ **`deferProvisioning = true`**.
    2. Backend tạo bản ghi `tenants` ở trạng thái **`PENDING_PAYMENT`**: **chưa** tạo MySQL Database riêng, **chưa** gửi email kích hoạt và **không** tự động gán gói `STARTER` mặc định.
    3. Tạo bản ghi `subscription_plans` (nếu là gói may đo) và duy nhất 01 bản ghi `tenant_subscriptions` ở trạng thái **`PENDING`** kèm 11 cột snapshot V27.
    4. Tạo Hợp đồng (`contracts`) hoặc Hoá đơn (`invoices`), cập nhật Lead sang `PROVISIONED` (`tenant_id = tenant.id`).
    5. Chỉ khi Hoá đơn được thanh toán (`PAID`), hệ thống mới tự động kích hoạt tạo MySQL Database riêng và gửi email thông báo bàn giao Workspace cho khách hàng.

## Business Rules

- **Phân tách 2 Chặng:** Tuyệt đối không bắt buộc MST, Địa chỉ pháp lý và không cấp phát Tenant / MySQL DB trong Chặng Báo giá (`QUOTATION`).
- **Thời hạn Báo giá:** Báo giá thương mại có hiệu lực mặc định trong vòng **15 ngày** kể từ ngày gửi email.
- **Bảo mật Multi-Tenant:** Mọi giao dịch tạo Tenant B2B phải tuân thủ cơ chế `PENDING_PAYMENT` (`deferProvisioning = true`), chỉ cấp phát MySQL Database riêng khi thủ tục tài chính hoàn tất.
- Chu kỳ hợp đồng cố định theo **Năm (365 ngày)** và tính bằng **VNĐ (`VND`)**, thuế GTGT mặc định 10%.
- Khi chuyển đổi từ một `consultation_requests`, cột `consultation_requests.tenant_id` và `contracts.consultation_request_id` được liên kết khoá ngoại để truy vết nguồn doanh thu.

## API liên quan

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/v1/master/consultations/submit` | Public | Khách hàng gửi yêu cầu tư vấn / Demo từ Landing Page (Tự động gửi email xác nhận) |
| GET | `/api/v1/master/consultations` | WORKSPACE_ADMIN | Danh sách yêu cầu tư vấn B2B (hỗ trợ lọc `PENDING`, `CONTACTED`, `QUOTED`, `PROVISIONED`, `REJECTED`) |
| PATCH | `/api/v1/master/consultations/{id}` | WORKSPACE_ADMIN | Cập nhật trạng thái xử lý, ghi chú hoặc gắn `tenantId` cho Lead |
| POST | `/api/v1/master/consultations/send-quotation` | WORKSPACE_ADMIN | Gửi email Báo giá thương mại B2B (CPQ 3 cấu phần) & chuyển Lead sang `QUOTED` |
| DELETE | `/api/v1/master/consultations/{id}` | WORKSPACE_ADMIN | Xoá yêu cầu tư vấn spam/không hợp lệ |
| POST | `/api/v1/master/tenants/onboard` | WORKSPACE_ADMIN | Khởi tạo Tenant với `deferProvisioning = true` (`PENDING_PAYMENT`) |
| POST | `/api/v1/master/subscriptions/assign` | WORKSPACE_ADMIN | Tạo bản ghi `tenant_subscriptions` ở trạng thái `PENDING` kèm 11 cột snapshot |

## Database liên quan

- PostgreSQL (`smarthire_master`):
  - `consultation_requests` (entity `ConsultationRequest`): lưu thông tin Lead B2B, trạng thái (`PENDING`, `CONTACTED`, `QUOTED`, `PROVISIONED`, `REJECTED`), và liên kết `tenant_id` (`fk_cr_tenant`).
  - `tenants` (`TenantInfo`), `subscription_plans` (`SubscriptionPlan`), `tenant_subscriptions` (`TenantSubscription`), `contracts` (`Contract`), `invoices` (`Invoice`).

## UI mockup & Trang hiển thị

- `/admin/leads` (`LeadsPage.tsx`): Bảng quản lý Lead tư vấn B2B, lọc theo trạng thái (có `QUOTED`), modal cập nhật chi tiết, và nút mở Deal Wizard nhanh.
- `/admin/deals` hoặc `/admin/tenants/create` (`B2bDealWizardPage.tsx`): Trình thuật toán B2B Deal Wizard 3 bước:
  - Bước 1: Thông tin khách hàng & Định danh (tự động điền từ Lead).
  - Bước 2: Thiết kế gói & Bộ máy CPQ (Template Add-on hoặc Custom from Scratch) với Floor Price Guard.
  - Bước 3: Lựa chọn 3 phương thức: **Gửi Báo giá thương mại (Chặng 1)** hoặc **Xuất Hóa đơn / Hợp đồng (Chặng 2)** kèm giao diện validation linh hoạt.
