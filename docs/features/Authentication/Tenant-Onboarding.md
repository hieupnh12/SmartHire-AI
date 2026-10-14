# MASTER-01 — Khởi tạo, cấp phát và quản lý vòng đời Doanh nghiệp (Tenant Onboarding & Provisioning)

**Code ID:** `MASTER-01`  
**Epic:** Master Platform — SaaS Multi-Tenant Administration  
**Trạng thái:** `Done`

## Mục đích chức năng

Dùng PostgreSQL (`smarthire_master`) cho dữ liệu nền tảng và một database MySQL riêng (`smarthire_tenant_<code>`) cho mỗi doanh nghiệp. Các database tenant có thể nằm trên cùng MySQL server hoặc trên nhiều server; một tenant không cần một VPS riêng. Hỗ trợ cả luồng cấp phát tức thì (Direct Onboarding / Self-serve) và luồng khởi tạo chờ thanh toán (Deferred Provisioning `PENDING_PAYMENT`) cho giao dịch thương mại B2B Deal Wizard, cũng như quản lý vòng đời Xoá mềm (Soft Delete), Khôi phục (Restore) và Xoá cứng (Hard Delete / Drop DB).

## Actor

- Workspace Admin đăng ký, tạo B2B Deal, retry, khóa/mở, xóa mềm/khôi phục và xóa cứng doanh nghiệp.
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
4. **Cơ chế kích hoạt một điểm (Single Activation Trigger)**: Chỉ khi Hoá đơn được xác nhận thanh toán (`PAID` qua Webhook SePay/VNPay/PayPal hoặc Admin bấm Duyệt), `MasterInvoiceService.activatePaidInvoice()` mới gọi `MasterTenantService.provisionAndActivateDeferredTenant(tenantId)` để:
   - Chuyển duy nhất bản ghi `tenant_subscriptions` từ `PENDING` sang `ACTIVE` (nếu là nâng cấp thì chuyển gói cũ sang `UPGRADED`).
   - Cấp phát MySQL Database riêng + chạy Flyway migration + tạo lời mời `TENANT_ADMIN`.
   - Chuyển `tenants.status` sang `ACTIVE` và gửi email kích hoạt tài khoản cho khách hàng.

### C. Luồng Retry, Vận hành & Xoá (Soft Delete / Restore / Hard Delete)
1. Retry qua `POST /api/v1/master/tenants/{id}/retry`; PostgreSQL advisory lock ngăn hai tiến trình provisioning cùng tenant chạy đồng thời. Nếu admin chưa kích hoạt, retry làm mới token lời mời và gửi lại link kích hoạt.
2. Xoá mềm qua `PATCH /api/v1/master/tenants/{id}/soft-delete`: đánh dấu `is_deleted = true`, `deleted_at = now()`, chuyển trạng thái sang `SUSPENDED` và đóng Hikari connection pool trong bộ nhớ nhưng **giữ nguyên** MySQL Database vật lý và toàn bộ lịch sử hoá đơn/hợp đồng để bảo toàn đối soát kế toán.
3. Khôi phục qua `PATCH /api/v1/master/tenants/{id}/restore`: gỡ cờ `is_deleted = false` và mở lại trạng thái `ACTIVE`.
4. Xoá cứng (`DELETE /api/v1/master/tenants/{id}?hard=true`): dành cho dọn dẹp tenant test/provisioning lỗi — đóng pool, thực thi `DROP DATABASE IF EXISTS` + `DROP USER IF EXISTS` trên MySQL và xoá sạch dữ liệu liên quan trong Master DB.

Provisioning hiện chạy đồng bộ trong request. Nếu HTTP bị gián đoạn, Workspace Admin kiểm tra trạng thái tenant trước khi retry. Database đã tạo một phần được giữ lại để retry; hệ thống không tự xóa dữ liệu. Retry giữ nguyên admin đã tồn tại và phải dùng lại email admin ban đầu.

## Business Rules

- Webhook thanh toán SePay mặc định bắt buộc chữ ký HMAC; header `X-Test-Simulation` không được bỏ qua xác thực. Timestamp được gửi kèm phải là số và nằm trong khoảng lệch cho phép 5 phút. Muốn chạy mô phỏng không chữ ký trên môi trường kiểm thử riêng phải cấu hình `SEPAY_REQUIRE_SIGNATURE=false`.
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
| PATCH | `/api/v1/master/tenants/{id}/status?status=ACTIVE\|SUSPENDED` | WORKSPACE_ADMIN |
| PATCH | `/api/v1/master/tenants/{id}/soft-delete` | WORKSPACE_ADMIN |
| PATCH | `/api/v1/master/tenants/{id}/restore` | WORKSPACE_ADMIN |
| DELETE | `/api/v1/master/tenants/{id}?hard=true` | WORKSPACE_ADMIN |
| PUT | `/api/v1/master/tenants/{id}/quotas` | WORKSPACE_ADMIN (Override hạn mức trực tiếp vào snapshot gói đang ACTIVE) |
| POST | `/api/v1/master/tenants/{id}/impersonate` | WORKSPACE_ADMIN (Ghi `platform_audit_logs` + phát hành token 15 phút) |
| GET | `/api/v1/master/tenants/check/{codeOrSubdomain}` | Public, trả boolean |
| POST | `/api/v1/tenant/users/invitations/accept` | Public, bắt buộc tenant (One-Time Activation) |
| POST | `/api/v1/tenant/auth/login` | Public, bắt buộc tenant |
| GET | `/api/v1/tenant/auth/me` | Tenant user |

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

- Landing page hiển thị hai không gian mẫu đang có dữ liệu là `se36` và `se37`.
- Trang Tenant Not Found điều hướng về domain nền tảng hiện tại: `smarthire.top` ở production và `localhost` khi phát triển local.

- `/onboard`: form Workspace Admin có validation, trạng thái chờ và lỗi.
- `/onboard?retry=<id>`: form retry với thông tin admin.
- Dashboard master có cụm quản lý vòng đời tenant: tạo mới, danh bạ, bốn trạng thái `PROVISIONING` / `ACTIVE` / `FAILED` / `SUSPENDED`, suspend/reactivate và Retry cho `FAILED`/`PROVISIONING`.
- Màn hình provisioning mô tả sáu checkpoint: kiểm tra định danh, ghi Master DB, tạo database/quyền, Flyway, tenant admin, áp dụng plan/quota/pipeline; kèm guardrail idempotency, recovery và zero-secret logging.
- Trang Theo dõi provisioning gom các khối vận hành liên quan: health check, datasource pool rotation, plan/quota mặc định, recruitment pipeline, backup, restore, retention và quy trình xóa tenant. Các thao tác chưa có API được khóa và ghi rõ là UI mẫu.
- Trang Theo dõi provisioning có `Live Saga Recovery Console` dạng UI mẫu để xem checkpoint, copy log và tải JSON minh họa; chưa kết nối API stream log.
- Cụm Hệ thống có `Traffic Ingress Inspector` để mô phỏng resolve host, trạng thái tenant và quyết định routing từ Master Registry; công cụ không gửi request thật hoặc truy vấn tenant database.
- Không hiển thị mật khẩu DB hoặc mật khẩu admin mặc định.

## Kiểm thử

- Unit test kiểm tra mã hóa, DTO không lộ secret, worker clear context và provider fail closed.
- Integration test Testcontainers dùng PostgreSQL 16 và MySQL 8.4 để kiểm tra hai tenant, quyền DB, HTTP/JWT, suspend/reactivate, manual retry và khóa provisioning.
- Kết quả: 36 test backend đã qua, gồm 6 integration test PostgreSQL/MySQL thật; frontend build và cấu hình Compose local/production hợp lệ.
