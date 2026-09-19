# Khởi tạo và cách ly doanh nghiệp

**Epic:** SaaS Multi-Tenant  
**Trạng thái:** `Done`

## Mục đích chức năng

Dùng PostgreSQL cho dữ liệu nền tảng và một database MySQL riêng cho mỗi doanh nghiệp. Các database tenant có thể nằm trên cùng MySQL server hoặc trên nhiều server; một tenant không cần một VPS riêng.

## Actor

- Workspace Admin đăng ký, retry, khóa và mở doanh nghiệp.
- Admin doanh nghiệp đăng nhập bằng tài khoản được cung cấp khi khởi tạo.
- Worker RabbitMQ xử lý tác vụ trong đúng tenant.

## Luồng hoạt động

1. Workspace Admin đăng nhập qua `POST /api/v1/master/auth/login`.
2. Gửi mã, tên, subdomain và thông tin admin doanh nghiệp.
3. Backend lưu cấu hình kết nối ở PostgreSQL với trạng thái `PROVISIONING`.
4. Chế độ tự động dùng tài khoản provisioning riêng để tạo database MySQL, tạo user ngẫu nhiên và chỉ cấp quyền trên database đó.
5. Backend chạy Flyway tenant và tạo admin; mật khẩu admin chỉ được lưu dưới dạng BCrypt hash.
6. Thành công chuyển sang `ACTIVE`; lỗi chuyển sang `FAILED` và không làm lộ credential.
7. Retry qua `POST /api/v1/master/tenants/{id}/retry`; PostgreSQL advisory lock ngăn hai tiến trình provisioning cùng tenant chạy đồng thời.
8. Sau khi backend khởi động lại, connection pool được tạo khi có request dựa trên registry PostgreSQL; không cần thêm biến `.env` cho từng tenant.

Provisioning hiện chạy đồng bộ trong request. Nếu HTTP bị gián đoạn, Workspace Admin kiểm tra trạng thái tenant trước khi retry. Database đã tạo một phần được giữ lại để retry; hệ thống không tự xóa dữ liệu. Retry giữ nguyên admin đã tồn tại và phải dùng lại email admin ban đầu.

## Business Rules

- API master quản trị chỉ nhận `WORKSPACE_ADMIN`; chỉ login và kiểm tra tenant đang ACTIVE được công khai.
- API tạo user tenant yêu cầu `TENANT_ADMIN` hoặc `ADMIN`.
- JWT, header và subdomain phải quy về cùng mã tenant. Subdomain chỉ được lấy dưới domain cấu hình hoặc `.localhost`.
- Frontend xác định tenant trực tiếp từ subdomain; domain nền tảng không fallback sang tenant đã lưu trong `localStorage`.
- Nhãn hostname chỉ được đối chiếu với cột `tenants.subdomain`; mã tenant (`code`) không được chấp nhận như một subdomain.
- Mọi route tenant trên frontend đều đi qua subdomain guard; route login/admin không render nếu subdomain không tồn tại hoặc không ACTIVE.
- Tenant thiếu, không tồn tại hoặc không ACTIVE bị từ chối. Không fallback sang master.
- Master và tenant có `EntityManagerFactory`, repository scan và transaction manager riêng.
- Mật khẩu DB được mã hóa AES-256-GCM và ràng buộc với mã tenant. Khóa Base64 32 byte nằm ngoài DB.
- Response tenant chỉ chứa metadata, không chứa URL, username hoặc password DB.
- Mã tenant gồm 2–32 ký tự thường, số hoặc dấu gạch ngang và bắt đầu bằng chữ.
- Subdomain gồm 3–63 ký tự, bắt đầu bằng chữ và kết thúc bằng chữ hoặc số. Mã/subdomain không được trùng định danh tenant khác.
- Tên DB là `smarthire_tenant_<code thay dấu - bằng _>` và không đổi sau đăng ký.
- Mật khẩu admin dài ít nhất 12 ký tự và tối đa 72 byte UTF-8; không có mật khẩu mặc định.
- Chỉ đổi trạng thái vận hành giữa `ACTIVE` và `SUSPENDED`; `FAILED`/`PROVISIONING` phải qua retry.
- Sau khi suspend, request và lần lấy connection mới bị chặn, pool local bị đóng. Transaction đã bắt đầu trước thời điểm khóa có thể hoàn tất.
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
| GET | `/api/v1/master/tenants/check/{codeOrSubdomain}` | Public, trả boolean |
| POST | `/api/v1/tenant/auth/login` | Public, bắt buộc tenant |
| GET | `/api/v1/tenant/auth/me` | Tenant user |

Request tự động:

```json
{
  "code": "company-a",
  "name": "Công ty A",
  "subdomain": "company-a",
  "adminName": "Admin Công ty A",
  "adminEmail": "admin@company-a.example",
  "adminPassword": "<mat-khau-rieng-it-nhat-12-ky-tu>"
}
```

Ở chế độ thủ công, Workspace Admin chuẩn bị DB và user trước rồi bổ sung `customDbUrl`, `dbUsername`, `dbPassword`. Backend vẫn chạy Flyway và tạo admin nhưng không chạy `CREATE DATABASE`, `CREATE USER` hoặc `GRANT`.

## Database liên quan

- PostgreSQL: `tenants`, `platform_users`, `subscription_plans`, `tenant_subscriptions`, `invoices`.
- MySQL từng tenant: schema trong `db/migration/tenant`.
- `tenants.db_password` chứa ciphertext; `managed_database` phân biệt tự động và thủ công.
- Không có foreign key hoặc transaction ACID chung giữa PostgreSQL master và MySQL tenant.

## UI mockup

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
