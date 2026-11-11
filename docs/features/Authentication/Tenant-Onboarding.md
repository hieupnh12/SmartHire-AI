# MASTER-01 — Khởi tạo, cấp phát và quản lý vòng đời Doanh nghiệp (Tenant Onboarding & Provisioning)

**Code ID:** `MASTER-01`  
**Epic:** Master Platform — SaaS Multi-Tenant Administration  
**Trạng thái:** `Done`

## Mục đích chức năng

Dùng PostgreSQL (`smarthire_master`) cho dữ liệu nền tảng và một database MySQL riêng (`smarthire_tenant_<code>`) cho mỗi doanh nghiệp. Các database tenant có thể nằm trên cùng MySQL server hoặc trên nhiều server; một tenant không cần một VPS riêng. Hỗ trợ cả luồng cấp phát tức thì (Direct Onboarding / Self-serve) và luồng khởi tạo chờ thanh toán (Deferred Provisioning `PENDING_PAYMENT`) cho giao dịch thương mại B2B Deal Wizard, cũng như quản lý vòng đời Xoá mềm (Soft Delete) và Khôi phục (Restore).

## Actor

- Workspace Admin đăng ký, tạo B2B Deal, retry, khóa/mở và xóa mềm/khôi phục doanh nghiệp.
- Admin doanh nghiệp nhận email lời mời kích hoạt một lần (**Invite & Claim Account**), tự đặt mật khẩu riêng và đăng nhập.
- Worker RabbitMQ và cổng thanh toán (SePay / VNPay / PayPal / Duyệt thủ công) kích hoạt cấp phát ngầm khi thanh toán hoàn tất.

## Luồng hoạt động

### A. Luồng Cấp phát Tức thì (`deferProvisioning = false` hoặc mặc định)
1. Workspace Admin đăng nhập qua `POST /api/v1/master/auth/login`.
2. Gửi mã (`code`), tên (`name`), `subdomain` và thông tin (`adminName`, `adminEmail`) của admin doanh nghiệp (không nhập mật khẩu tĩnh).
3. Backend lưu cấu hình kết nối ở PostgreSQL với trạng thái `PROVISIONING`.
4. Chế độ tự động dùng tài khoản provisioning riêng để tạo database MySQL, tạo user ngẫu nhiên và chỉ cấp quyền trên database đó.
5. Backend chạy Flyway tenant, gán gói `STARTER` mặc định (kèm đầy đủ 11 cột snapshot V27) và sinh bản ghi lời mời `PENDING` (`role = TENANT_ADMIN`, hết hạn sau 72 giờ) trong bảng `member_invitations` của Tenant DB; token thô chỉ dùng để tạo link kích hoạt một lần (`/invite/accept?token=...`), trong DB chỉ lưu SHA-256 `token_hash`.
6. Thành công chuyển sang `ACTIVE` và gửi email chứa link kích hoạt một lần cho Admin doanh nghiệp; lỗi chuyển sang `FAILED` và không làm lộ credential.
7. Admin doanh nghiệp mở link kích hoạt trên subdomain của công ty (`POST /api/v1/tenant/users/invitations/accept`), tự đặt mật khẩu riêng (8–72 byte UTF-8, lưu BCrypt hash) để tạo tài khoản `TENANT_ADMIN` trong `users` và đánh dấu lời mời `ACCEPTED`.

### B. Luồng Khởi tạo Chờ Thanh toán cho B2B Deal Wizard (`deferProvisioning = true`)
1. Khi Workspace Admin hoàn tất B2B Deal Wizard, frontend gửi `POST /api/v1/master/tenants/onboard` với `deferProvisioning = true`.
2. Backend tạo bản ghi `tenants` ở trạng thái `PENDING_PAYMENT`: **chưa** cấp phát MySQL Database riêng, **chưa** gửi email kích hoạt và **không** tự động gán gói `STARTER` mồ côi.
3. Bước tiếp theo của Wizard tạo duy nhất một bản ghi `tenant_subscriptions` ở trạng thái `PENDING` kèm đầy đủ 11 cột snapshot V27 của gói đã thoả thuận, gắn với Hợp đồng (`contracts`) hoặc Hoá đơn (`invoices`).
4. **Cơ chế kích hoạt một điểm (Single Activation Trigger)**: Chỉ khi Hoá đơn được xác nhận thanh toán (`PAID` qua Webhook SePay/VNPay/PayPal hoặc Admin bấm Duyệt), `MasterBillingService.completePaidInvoice()` (hoặc `updateInvoiceStatus(..., "PAID")`) thực hiện:
   - Gọi `applyPaidSubscriptionForInvoice()` chuyển duy nhất bản ghi `tenant_subscriptions` từ `PENDING` sang `ACTIVE` và đóng các bản ghi `ACTIVE`/`TRIAL`/`PAST_DUE`/`PENDING` cũ sang `CANCELED` (`UPGRADED_TO_<CODE>` hoặc `SUPERSEDED_BY_SUBSCRIPTION_<ID>`).
   - Chuyển `tenants.status` từ `PENDING_PAYMENT`/`FAILED` sang `PROVISIONING` và phát sự kiện `TenantPaymentSuccessEvent`.
   - `TenantProvisioningEventListener.onTenantPaymentSuccess()` (`@Async`, `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)`) gọi `MasterTenantService.provisionPendingTenant(tenantId)` (có khoá độc quyền trong `TenantProvisioningService.provisionWithInvitation`) để cấp phát MySQL Database riêng, chạy Flyway migration, tạo lời mời `TENANT_ADMIN` và chuyển `tenants.status = 'ACTIVE'`, sau đó gửi email kích hoạt qua `MasterNotificationService.sendWorkspaceActivated(...)`.

### C. Luồng Retry, Vận hành & Xoá mềm (Soft Delete / Restore)
1. Retry qua `POST /api/v1/master/tenants/{id}/retry` (payload `TenantAdminRequest` gồm `adminName`, `adminEmail`); PostgreSQL advisory lock ngăn hai tiến trình provisioning cùng tenant chạy đồng thời. Nếu admin chưa kích hoạt, retry làm mới token lời mời và gửi lại link kích hoạt.
2. Xoá mềm qua `PATCH /api/v1/master/tenants/{id}/soft-delete`: đánh dấu `is_deleted = true`, `deleted_at = now()`, chuyển trạng thái `ACTIVE` sang `SUSPENDED` và đóng Hikari connection pool trong bộ nhớ (`pools.evict`) nhưng **giữ nguyên** MySQL Database vật lý và toàn bộ lịch sử hoá đơn/hợp đồng để bảo toàn đối soát kế toán.
3. Khôi phục qua `POST /api/v1/master/tenants/{id}/restore`: gỡ cờ `is_deleted = false`, `deleted_at = null` và **giữ nguyên trạng thái `SUSPENDED`** để Workspace Admin kiểm tra và chủ động kích hoạt lại qua `PATCH /api/v1/master/tenants/{id}/status?status=ACTIVE`.

Luồng `/onboard` (`deferProvisioning = false`) và `/retry` thực hiện provisioning đồng bộ trong request; luồng kích hoạt sau thanh toán chạy bất đồng bộ `@Async` sau commit qua `TenantProvisioningEventListener` (Webhook trả HTTP 200 ngay). Nếu quá trình bị gián đoạn, Workspace Admin kiểm tra trạng thái tenant trước khi retry. Database đã tạo một phần được giữ lại để retry; hệ thống không tự xóa dữ liệu. Retry giữ nguyên admin đã tồn tại và phải dùng lại email admin ban đầu.

## Business Rules

- Webhook thanh toán SePay mặc định bắt buộc xác thực chữ ký HMAC-SHA256 (`X-SePay-Signature` với `{timestamp}.{raw_body}` hoặc `{raw_body}`) hoặc `Authorization: Apikey <secretKey>` (`sepay.require-signature=true`); header `X-Test-Simulation` không được bỏ qua xác thực. Nếu gửi kèm `X-SePay-Timestamp`, giá trị phải là số và nằm trong khoảng lệch cho phép 5 phút (±300 giây). Muốn chạy mô phỏng không chữ ký trên môi trường kiểm thử riêng phải cấu hình biến môi trường `SEPAY_REQUIRE_SIGNATURE=false`.
- Lỗi nội bộ trả thông báo chung; chi tiết exception và tên database chỉ ghi ở log server, không đưa vào response API.
- API master quản trị chỉ nhận `WORKSPACE_ADMIN`; chỉ login và kiểm tra tenant đang ACTIVE được công khai.
- Tạo tài khoản nhân sự nội bộ và quản trị viên doanh nghiệp bắt buộc qua cơ chế lời mời kích hoạt một lần (`member_invitations`); hệ thống không cấp mật khẩu tĩnh và không gửi mật khẩu plaintext qua email.
- Một Tenant chỉ có tối đa **01** bản ghi `tenant_subscriptions` ở trạng thái `ACTIVE` tại một thời điểm. Luồng B2B Deal Wizard bắt buộc dùng `deferProvisioning = true` (`PENDING_PAYMENT`) để tránh xung đột hai gói cùng `ACTIVE` hoặc tạo database mồ côi khi chưa thanh toán.
- JWT, header và subdomain phải quy về cùng mã tenant. Subdomain chỉ được lấy dưới domain cấu hình hoặc `.localhost`.
- Frontend xác định tenant trực tiếp từ subdomain; domain nền tảng không fallback sang tenant đã lưu trong `localStorage`.
- Nhãn hostname chỉ được đối chiếu với cột `tenants.subdomain`; mã tenant (`code`) không được chấp nhận như một subdomain.
- Mọi route tenant trên frontend đều đi qua subdomain guard; route login/admin không render nếu subdomain không tồn tại hoặc không ACTIVE.
- Tenant thiếu, không tồn tại, đã xoá mềm (`is_deleted = true`) hoặc không ACTIVE bị từ chối. Không fallback sang master.
- Master và tenant có `EntityManagerFactory`, repository scan và transaction manager riêng.
- Mật khẩu DB được mã hóa AES-256-GCM và ràng buộc với mã tenant. Khóa Base64 32 byte nằm ngoài DB.
- Response tenant chỉ chứa metadata (và `activationUrl` một lần khi vừa khởi tạo/retry), không chứa URL, username hoặc password DB.
- Mã tenant gồm 2–32 ký tự thường, số hoặc dấu gạch ngang và bắt đầu bằng chữ.
- Subdomain gồm 3–63 ký tự, bắt đầu bằng chữ và kết thúc bằng chữ hoặc số. Mã/subdomain không được trùng định danh tenant khác.
- Tên DB là `smarthire_tenant_<code thay dấu - bằng _>` và không đổi sau đăng ký.
- Khi người dùng nhận lời mời và tự đặt mật khẩu (`POST /api/v1/tenant/users/invitations/accept`), mật khẩu dài từ 8 ký tự và tối đa 72 byte UTF-8; không có mật khẩu mặc định hay mật khẩu tĩnh do Admin nhập hộ.
- Chỉ đổi trạng thái vận hành giữa `ACTIVE` và `SUSPENDED`; `FAILED`/`PROVISIONING`/`PENDING_PAYMENT` phải qua retry hoặc luồng kích hoạt thanh toán.
- Sau khi suspend hoặc xoá mềm, request và lần lấy connection mới bị chặn, pool local bị đóng. Transaction đã bắt đầu trước thời điểm khóa có thể hoàn tất.
- Pool được giới hạn theo số tenant và số connection. Pool nhàn rỗi cũ được đóng khi đạt giới hạn; mỗi backend process có giới hạn riêng.
- Flyway tenant chạy khi provisioning và khi tạo lại pool; không tự baseline hoặc clean database không rõ cấu trúc.
- RabbitMQ publisher gắn `X-Tenant-ID`; worker xác minh tenant ACTIVE, set context trước tác vụ và clear trong `finally`. Job thiếu tenant bị reject.
- CORS chỉ nhận các origin cụ thể từ `CORS_ORIGINS`, không nhận wildcard khi gửi credential.

## API liên quan

| Method | Path | Quyền |
|---|---|---|
| POST | `/api/v1/master/tenants/onboard` | WORKSPACE_ADMIN |
| POST | `/api/v1/master/tenants/{id}/retry` | WORKSPACE_ADMIN |
| GET | `/api/v1/master/tenants` | WORKSPACE_ADMIN |
| GET | `/api/v1/master/tenants/{id}` | WORKSPACE_ADMIN |
| PUT | `/api/v1/master/tenants/{id}` | WORKSPACE_ADMIN (Cập nhật metadata doanh nghiệp) |
| PATCH | `/api/v1/master/tenants/{id}/status?status=ACTIVE\|SUSPENDED` | WORKSPACE_ADMIN |
| PATCH | `/api/v1/master/tenants/{id}/soft-delete` | WORKSPACE_ADMIN |
| POST | `/api/v1/master/tenants/{id}/restore` | WORKSPACE_ADMIN (Gỡ cờ xoá mềm, giữ trạng thái `SUSPENDED`) |
| GET | `/api/v1/master/tenants/check-subdomain/{subdomain}` | Public, trả boolean |
| POST | `/api/v1/tenant/users/invitations/accept` | Public, bắt buộc tenant (One-Time Activation) |
| POST | `/api/v1/tenant/auth/login` | Public, bắt buộc tenant |
| GET | `/api/v1/tenant/auth/me` | Tenant user |

> **Lưu ý:** Điều chỉnh/ghi đè hạn mức của doanh nghiệp được thực hiện thông qua `PUT /api/v1/master/subscriptions/tenants/{tenantId}` (`MASTER-02`) và `PUT /api/v1/master/ai/quotas/{tenantId}` (`MASTER-07`), không đặt tại `/api/v1/master/tenants/{id}`.

Request tự động (`deferProvisioning` tùy chọn, mặc định `false`):

```json
{
  "code": "company-a",
  "name": "Công ty A",
  "subdomain": "company-a",
  "adminName": "Admin Công ty A",
  "adminEmail": "admin@company-a.example",
  "deferProvisioning": false
}
```

Ở chế độ thủ công, Workspace Admin chuẩn bị DB và user trước rồi bổ sung `customDbUrl`, `dbUsername`, `dbPassword`. Backend vẫn chạy Flyway và tạo lời mời kích hoạt `TENANT_ADMIN` nhưng không chạy `CREATE DATABASE`, `CREATE USER` hoặc `GRANT`.

## Database liên quan

- PostgreSQL: `tenants`, `platform_users`, `subscription_plans`, `tenant_subscriptions`, `invoices`.
- MySQL từng tenant: schema trong `db/migration/tenant`.
- `tenants.db_password` chứa ciphertext; `managed_database` phân biệt tự động và thủ công.
- Khi mở pool cho tenant managed, backend ghép JDBC URL từ `TENANT_MYSQL_BASE_URL` của môi trường và `tenants.db_name`; `tenants.db_url` chỉ được dùng trực tiếp cho custom database. Vì vậy cùng một master DB có thể dùng hostname Docker trên VPS và địa chỉ public/tunnel khi phát triển local.
- Không có foreign key hoặc transaction ACID chung giữa PostgreSQL master và MySQL tenant.

## UI mockup

- Modal **Vào Workspace** trên Landing Page ([`WorkspaceModal.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/landing/components/modals/WorkspaceModal.tsx)) cho phép nhập `subdomain` doanh nghiệp để điều hướng tới `<subdomain>.smarthire.top/internal/login` (hoặc `<subdomain>.localhost:<port>/internal/login` ở môi trường local), kèm liên kết tới `/admin/login`.
- Trang Tenant Not Found điều hướng về domain nền tảng hiện tại (`smarthire.top` ở production và `localhost` ở local).
- `/onboard` ([`TenantOnboardPage.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/onboarding/pages/TenantOnboardPage.tsx)): form Workspace Admin khởi tạo tenant trực tiếp và `?retry=<id>` cho tenant `FAILED`/`PROVISIONING`.
- Quản lý vòng đời tenant tại `/admin/tenants/{overview|directory|create|provisioning}` ([`TenantManagementPage.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/tenant-management/pages/TenantManagementPage.tsx) & [`TenantManagementHub.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/tenant-management/components/TenantManagementHub.tsx)):
  - `OverviewPanel`: 4 thẻ KPI tổng quan và sơ đồ 4 bước vòng đời tenant (`Đăng ký` -> `Provisioning` -> `Migration` -> `Kích hoạt`).
  - `DirectoryPanel`: tìm kiếm, lọc trạng thái (`ACTIVE`, `PENDING_PAYMENT`, `PROVISIONING`, `FAILED`, `SUSPENDED`, `SOFT_DELETED`), thao tác suspend/reactivate, retry, xoá mềm/khôi phục và panel chi tiết `TenantDetailPanel` tải kèm hợp đồng (`contracts`) & hoá đơn (`invoices`) liên kết.
  - `ProvisioningPanel`: theo dõi tenant `PROVISIONING`/`FAILED` qua **6 checkpoint** chuẩn (`Validate code & subdomain`, `Ghi Master DB`, `Tạo database & quyền`, `Chạy Flyway migrations`, `Tạo tenant admin`, `Áp dụng plan, quota & pipeline`) cùng 3 guardrail (`Idempotency key`, `Rollback có kiểm soát`, `Audit an toàn` zero-secret logging).
  - *Ghi chú route `/admin/tenants/create` & `/admin/deals`:* Trên router chính thức (`router.tsx`), đường dẫn tạo mới trong khu vực Admin trỏ tới [`B2bDealWizardPage.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/onboarding/pages/B2bDealWizardPage.tsx) (`MASTER-06`), còn `CreatePanel` nằm trong `TenantManagementHub.tsx`.
- Không hiển thị mật khẩu DB hoặc mật khẩu admin mặc định trên UI; `activationUrl` chỉ hiển thị một lần ngay sau khi onboard/retry.

## Kiểm thử

- Unit test kiểm tra mã hóa, DTO không lộ secret, worker clear context và provider fail closed.
- Integration test Testcontainers dùng PostgreSQL 16 và MySQL 8.4 để kiểm tra hai tenant, quyền DB, HTTP/JWT, suspend/reactivate, manual retry và khóa provisioning.
- Kết quả: 36 test backend đã qua, gồm 6 integration test PostgreSQL/MySQL thật; frontend build và cấu hình Compose local/production hợp lệ.
