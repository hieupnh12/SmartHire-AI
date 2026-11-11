# MASTER-06 — Quản lý Lead Tư vấn & Trình thuật toán Chốt Deal B2B (Sales Leads & B2B Deal Wizard)

**Code ID:** `MASTER-06`  
**Epic:** Master Platform — SaaS Multi-Tenant Administration  
**Trạng thái:** `Done`

## Mục đích chức năng

Quản lý phễu khách hàng doanh nghiệp tiềm năng (**Sales Leads / Consultation Requests**) đăng ký tư vấn hoặc báo giá từ Landing Page, và cung cấp **Quy trình 2 Chặng trên B2B Deal Wizard (`3-Step B2B Deal Wizard`)**:
1. **Chặng 1 — Báo giá Thương mại (Quotation Proposal / Commercial Proposal):** Khi khách hàng mới khảo sát hoặc cần trình ban lãnh đạo phê duyệt ngân sách, hệ thống cấu hình gói qua bộ máy CPQ (`cpqPricingEngine.ts`) và **tự động gửi Email Báo giá chính thức** (hiệu lực 15 ngày). Không bắt buộc điền thông tin pháp lý rườm rà (MST, địa chỉ pháp lý) và **không tạo Tenant / MySQL DB rác**.
2. **Chặng 2 — Chốt Hợp đồng / Hóa đơn & Cấp phát Chờ Thanh toán (Closing Deal / Deferred Provisioning):** Khi khách hàng đồng ý báo giá, Admin/Sales chọn phát hành Hóa đơn B2B (`INVOICE`) hoặc Hợp đồng điện tử (`CONTRACT`), bổ sung thông tin pháp lý (MST, tên pháp lý, địa chỉ) và kích hoạt quy trình khởi tạo Tenant ở trạng thái Chờ Thanh toán (`PENDING_PAYMENT`, `deferProvisioning = true`).

## Actor

- **Khách hàng Doanh nghiệp Tiềm năng (Enterprise Lead):** Gửi yêu cầu tư vấn / đặt lịch Demo hoặc xin báo giá hợp đồng Enterprise từ Landing Page (`/demo`).
- **Workspace Admin / B2B Sales (`WORKSPACE_ADMIN`):** Tiếp nhận, phân loại trạng thái Lead (`PENDING`, `CONTACTED`, `QUOTED`, `PROVISIONED`, `REJECTED`), gửi email báo giá thương mại, và thực hiện chốt hợp đồng/hoá đơn qua B2B Deal Wizard.

## Luồng hoạt động

### 1. Thu thập & Xác nhận Yêu cầu Tư vấn (`consultation_requests`)
1. Khách hàng điền form đăng ký tư vấn / báo giá Enterprise trên Landing Page (`POST /api/v1/master/consultations`).
2. `ConsultationRequestService.createRequest()` lưu bản ghi `consultation_requests` với trạng thái `PENDING`.
3. Hệ thống tự động gửi **Email Xác nhận tiếp nhận yêu cầu** qua `MasterNotificationService.sendConsultationReceived()` (`consultation-received`) tới email khách hàng.
4. Workspace Admin truy cập `/admin/leads` để xem danh sách Lead, lọc theo trạng thái (`PENDING`, `CONTACTED`, `QUOTED`, `PROVISIONED`, `REJECTED`), mở chi tiết / cập nhật trạng thái (`PATCH /api/v1/master/consultations/{id}/status`), tạo hợp đồng (`/admin/contracts/create?leadId=<id>`) hoặc mở B2B Deal Wizard (`/admin/deals?leadId=<id>` / `/admin/tenants/create?leadId=<id>`) với dữ liệu khách hàng được điền sẵn.

### 2. Quy trình 2 Chặng trên B2B Deal Wizard (`B2bDealWizardPage.tsx`)

- **Bước 1 (Thông tin khách hàng & Định danh Workspace):** Nhập `name`, `code`, `subdomain`, `environmentType` (`PRODUCTION` | `POC_SANDBOX`), `adminName`, `adminEmail` và thông tin liên hệ.
- **Bước 2 (Thiết kế Gói & Bộ máy CPQ):**
  $$\mathbf{TotalQuote} = \mathbf{BasePlanPrice} + \mathbf{AddonFees} - \mathbf{Discount}$$
  1. Chọn từ gói mẫu hoặc tạo gói tùy biến (`TEMPLATE_ADDON` / `FROM_SCRATCH`) với `CreatePlanInlineForm` (`POST /api/v1/master/subscriptions`).
  2. *Gói tài nguyên mở rộng (Add-on Quotas):* Tính theo hạn mức phụ trội (Jobs tuyển dụng, Lượt lọc CV AI, Giờ phỏng vấn thoại AI, Lưu trữ GB, Giám sát thi).
  3. *Chiết khấu thương mại (Commercial Discount)* & *Chốt chặn an toàn (Floor Price Guard):* Cảnh báo nếu mức giá chốt thấp hơn chi phí ước tính.

#### Chặng 1: Gửi Báo giá Thương mại (`closingMethod = "QUOTATION"`)
- Các trường pháp lý doanh nghiệp (`companyLegalName`, `taxCode`, `address`) là **tùy chọn** trên schema khi chọn `QUOTATION`.
- Hệ thống gọi API `POST /api/v1/master/consultations/send-quotation`.
- Backend cập nhật (hoặc tạo mới nếu chốt deal trực tiếp) bản ghi Lead sang trạng thái `QUOTED` kèm ghi chú cấu hình và đẩy job gửi **Email Báo giá thương mại** (hiệu lực **15 ngày**) qua `MasterNotificationService.sendQuotationProposal()`.
- **Không** tạo Tenant, **không** tạo DB MySQL, **không** tạo Subscription mồ côi.

#### Chặng 2: Xuất Hóa đơn / Hợp đồng & Cấp phát Chờ Thanh toán (`closingMethod = "INVOICE" | "CONTRACT"`)
- Khi chọn `INVOICE` hoặc `CONTRACT`, `wizardSchema` bắt buộc bổ sung thông tin pháp lý (`companyLegalName`, `taxCode`, `address`):
  1. Frontend gọi `POST /api/v1/master/tenants/onboard` với cờ **`deferProvisioning = true`**. Backend tạo bản ghi `tenants` ở trạng thái **`PENDING_PAYMENT`** (chưa tạo MySQL DB và chưa tạo gói `STARTER` mặc định).
  2. Tiếp theo, Frontend gọi:
     - **`INVOICE` (`POST /api/v1/master/invoices`):** Phát hành Hoá đơn B2B (kèm VietQR nếu chọn `BANK_TRANSFER`). Backend đồng thời tạo/cập nhật bản ghi `tenant_subscriptions` ở trạng thái `PENDING` kèm 11 cột snapshot V27 và liên kết Lead `PROVISIONED`.
     - **`CONTRACT` (`POST /api/v1/master/contracts`):** Khởi tạo Hợp đồng điện tử B2B ở trạng thái `DRAFT`, đồng thời backend tự động tạo/cập nhật bản ghi `tenant_subscriptions` ở trạng thái `PENDING` kèm 11 cột snapshot V27 và cập nhật Lead sang `PROVISIONED`.
  3. Chỉ khi Hoá đơn được thanh toán (`PAID`), hệ thống mới tự động chuyển `tenant_subscriptions` sang `ACTIVE`, tạo MySQL Database riêng và gửi email kích hoạt Workspace.

## Business Rules

- **Chấp nhận mọi định dạng Email hợp lệ:** Form đăng ký tư vấn / Demo (`POST /api/v1/master/consultations`) chấp nhận cả email tên miền công ty lẫn email cá nhân.
- **Phân tách 2 Chặng:** Chặng Báo giá (`QUOTATION`) chỉ gửi email thương mại (hiệu lực **15 ngày**), không bắt buộc MST/địa chỉ pháp lý và không cấp phát Tenant / MySQL DB.
- **Bảo mật Multi-Tenant:** Giao dịch tạo Tenant B2B từ Wizard dùng `deferProvisioning = true` (`PENDING_PAYMENT`), chỉ cấp phát MySQL Database riêng khi hoá đơn được thanh toán (`PAID`).
- Chu kỳ hợp đồng B2B mặc định theo **Năm (365 ngày)** và đơn vị tiền tệ chính là **VNĐ (`VND`)**.
- Khi chuyển đổi từ một `consultation_requests`, cột `consultation_requests.tenant_id` và `contracts.consultation_request_id` được liên kết khoá ngoại để truy vết nguồn doanh thu.

## API liên quan

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/v1/master/consultations` | Public | Khách hàng gửi yêu cầu tư vấn / Demo từ Landing Page |
| GET | `/api/v1/master/consultations` | WORKSPACE_ADMIN | Danh sách yêu cầu tư vấn B2B (lọc `ALL`, `PENDING`, `CONTACTED`, `QUOTED`, `PROVISIONED`, `REJECTED`) |
| GET | `/api/v1/master/consultations/{id}` | WORKSPACE_ADMIN | Xem chi tiết một yêu cầu tư vấn / Lead |
| PATCH | `/api/v1/master/consultations/{id}/status` | WORKSPACE_ADMIN | Cập nhật trạng thái xử lý, ghi chú hoặc gắn `tenantId` cho Lead |
| POST | `/api/v1/master/consultations/send-quotation` | WORKSPACE_ADMIN | Gửi email Báo giá thương mại B2B (CPQ) & chuyển Lead sang `QUOTED` |
| POST | `/api/v1/master/subscriptions` | WORKSPACE_ADMIN | Tạo gói cước custom từ CPQ bước 2 (`CreatePlanInlineForm`) |
| POST | `/api/v1/master/tenants/onboard` | WORKSPACE_ADMIN | Khởi tạo Tenant với `deferProvisioning = true` (`PENDING_PAYMENT`) |
| POST | `/api/v1/master/invoices` | WORKSPACE_ADMIN | Phát hành Hoá đơn B2B & tự tạo `tenant_subscriptions` ở trạng thái `PENDING` |
| POST | `/api/v1/master/contracts` | WORKSPACE_ADMIN | Tạo Hợp đồng B2B & tự tạo `tenant_subscriptions` ở trạng thái `PENDING` |

## Database liên quan

- PostgreSQL (`smarthire_master`):
  - `consultation_requests` (entity `ConsultationRequest`): lưu thông tin Lead B2B, trạng thái (`PENDING`, `CONTACTED`, `QUOTED`, `PROVISIONED`, `REJECTED`), và liên kết `tenant_id` (`fk_cr_tenant`).
  - `tenants` (`TenantInfo`), `subscription_plans` (`SubscriptionPlan`), `tenant_subscriptions` (`TenantSubscription`), `contracts` (`Contract`), `invoices` (`Invoice`).

## UI mockup & Trang hiển thị

- `/admin/leads` ([`LeadsPage.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/leads/pages/LeadsPage.tsx) & [`LeadDetailModal.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/leads/components/LeadDetailModal.tsx)): Bảng quản lý Lead tư vấn B2B, lọc theo trạng thái (`PENDING`, `CONTACTED`, `QUOTED`, `PROVISIONED`, `REJECTED`), modal cập nhật trạng thái/ghi chú và mở nhanh `/admin/contracts/create?leadId=...` hoặc `/admin/tenants/create?leadId=...`.
- `/admin/deals` & `/admin/tenants/create` ([`B2bDealWizardPage.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/onboarding/pages/B2bDealWizardPage.tsx) + [`cpqPricingEngine.ts`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/onboarding/utils/cpqPricingEngine.ts)): Trình thuật toán B2B Deal Wizard 3 bước:
  - Bước 1: Thông tin khách hàng & Định danh Workspace (tự động điền từ Lead nếu có `leadId`).
  - Bước 2: Thiết kế gói & Bộ máy CPQ (Template Add-on hoặc Custom from Scratch) kèm Floor Price Guard.
  - Bước 3: Lựa chọn phương thức chốt (`QUOTATION`, `INVOICE`, `CONTRACT`) với validation điều kiện theo phương thức.
