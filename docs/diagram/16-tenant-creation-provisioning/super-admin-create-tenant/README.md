# TENANT-16 — Super Admin tạo Tenant

## Mục đích và phạm vi

Chức năng này mô tả cách Super Admin đăng ký và cấp phát đồng bộ một tenant doanh nghiệp. Phạm vi gồm validation, đăng ký trong master registry, thiết lập MySQL tự động hoặc thủ công, chạy Flyway, tạo `TENANT_ADMIN` đầu tiên, kích hoạt tenant và xử lý lỗi quan trọng.

Class diagram sử dụng **góc nhìn thiết kế ứng dụng**. Sơ đồ chỉ gồm API, application service, persistence boundary, thành phần bảo mật và hai kho dữ liệu vật lý cần thiết cho chức năng; đây không phải sơ đồ đầy đủ của toàn hệ thống.

## Nguồn đã đối chiếu

- `AGENTS.md`, `DESIGN.md`
- `docs/features/Authentication/Tenant-Onboarding.md`
- `docs/api/API_GUIDE.md`, `docs/api/SmartHire.postman_collection.json`
- `SecurityConfig`, `MasterTenantController`, `MasterTenantService` và các tenant DTO
- `TenantProvisioningService`, `TenantCredentialService`, `TenantDataSourceFactory`
- `TenantInfo`, `TenantInfoRepository`
- Master migration `V1__init_master_schema.sql`, `V2__tenant_connection_security.sql`
- Tenant migration bắt đầu từ `V1__init_tenant_schema.sql`
- `TenantOnboardPage.tsx`, `frontend/src/api/master/tenantApi.ts`

## Actor và thành phần tham gia

Actor chính là người dùng nền tảng có role `SUPER_ADMIN`. Trang onboarding validation phía client và gọi master API. Spring Security xác thực JWT và kiểm tra role. `MasterTenantService` chịu trách nhiệm quy tắc đăng ký và master transaction; `TenantProvisioningService` điều phối quy trình cấp phát qua hai database. PostgreSQL là master registry, còn mỗi tenant có một MySQL database tách biệt vật lý.

## Tiền điều kiện và hậu điều kiện

Tiền điều kiện:

- Caller đã đăng nhập và có role `SUPER_ADMIN`.
- Định danh tenant và thông tin admin đầu tiên thỏa mãn DTO validation.
- Provisioning credential và khóa AES-256-GCM được cấu hình bên ngoài database.
- Với chế độ thủ công, database và user giới hạn quyền đã tồn tại; URL trỏ đúng database của tenant.

Hậu điều kiện khi thành công:

- Master database có bản ghi `tenants`, database credential được mã hóa và trạng thái là `ACTIVE`.
- MySQL database riêng đã chạy đầy đủ tenant Flyway migration.
- Có user `TENANT_ADMIN` đang hoạt động; mật khẩu chỉ lưu dưới dạng BCrypt hash.
- HTTP response không chứa URL, username, database password hoặc admin password.

Hậu điều kiện khi thất bại:

- Lỗi validation hoặc xung đột định danh làm rollback master registration transaction.
- Lỗi sau đăng ký để tenant ở trạng thái `FAILED` và giữ tài nguyên đã tạo một phần để retry.
- Hệ thống không tự động xóa tenant database đã cấp phát một phần.

## Luồng chính

Sau khi Spring Security cho phép request, controller thực hiện Bean Validation. Một master transaction ngắn lấy global registration advisory lock, kiểm tra code và subdomain trên cả hai namespace, xác thực cấu hình database, mã hóa database password rồi lưu tenant với trạng thái `PROVISIONING`.

Provisioning tiếp tục bằng session-level advisory lock theo tenant ID. Chế độ tự động tạo database và user theo cách có thể chạy lại an toàn, chỉ cấp quyền trên database của tenant. Chế độ thủ công bỏ qua DDL. Một Hikari pool có giới hạn kết nối tới database riêng, Flyway cập nhật schema với `clean` và automatic baseline bị vô hiệu hóa, sau đó tài khoản quản trị đầu tiên được tạo trong transaction. Trạng thái master chỉ chuyển thành `ACTIVE` khi toàn bộ các bước thành công.

## Luồng thay thế và lỗi

- Dữ liệu không hợp lệ trả `400`; định danh không khả dụng trả `409 TENANT_EXISTS`.
- Thiếu xác thực trả `401`; không đủ role trả `403`.
- Provisioning khác đang giữ lock trả `409 PROVISIONING_IN_PROGRESS`.
- Provisioning thất bại trả `503 TENANT_PROVISIONING_FAILED` sau khi lưu `FAILED`.
- Retry là API riêng. Tài liệu này chỉ thể hiện tính idempotent cần thiết để giải thích việc giữ tài nguyên và không ghi đè `TENANT_ADMIN` đã tồn tại.

## Giải thích sơ đồ

`class-diagram.puml` thể hiện trách nhiệm ứng dụng và ranh giới sở hữu master/tenant. `TenantInfo` chỉ thuộc master database. Tài khoản quản trị đầu tiên chỉ thuộc tenant database riêng; không có entity association hoặc foreign key xuyên database.

`sequence-diagram.puml` theo dõi request từ Super Admin tới `201 Created`, gồm các nhánh security, validation, uniqueness, provisioning lock, hai chế độ database, ranh giới transaction, ghi nhận thất bại và kết quả `503`.

## Quyết định kiến trúc, bảo mật và vận hành

- **Multi-tenancy:** database-per-tenant dùng MySQL database và credential riêng. Master provisioning endpoint không lấy tenant từ `X-Tenant-ID` và không thiết lập `TenantContext`; endpoint thuộc master security domain và kết nối trực tiếp tới database tenant mới.
- **Transaction:** đăng ký master, cập nhật trạng thái và tạo tenant admin không nằm trong một distributed transaction. Trạng thái `FAILED` là điểm phục hồi rõ ràng.
- **Concurrency và retry:** PostgreSQL advisory lock ngăn đăng ký chạy đua và provisioning đồng thời. DDL có tính idempotent, Flyway quản lý lịch sử migration và `TENANT_ADMIN` đã tồn tại được giữ nguyên khi retry.
- **Secret và quyền riêng tư:** database credential dùng AES-256-GCM với tenant code làm additional authenticated data. Admin password là trường write-only và được BCrypt hash. Sơ đồ không chứa secret hoặc PII không cần thiết.
- **Bất đồng bộ:** không áp dụng; provisioning chạy đồng bộ trong HTTP request và không publish RabbitMQ message.
- **Audit:** implementation hiện chưa có durable audit writer. Sơ đồ không tự suy diễn audit participant chưa có trong contract.

## Giả định và quyết định chưa hoàn tất

- Dùng `TENANT-16` vì capability nằm tại `docs/diagram/16-tenant-creation-provisioning`; feature document chưa định nghĩa short ID khác.
- Tự động gửi thông báo hoặc credential cho tenant admin nằm ngoài contract hiện tại.
- Yêu cầu durable provisioning audit event vẫn chưa được xác định.

## Render và file được tạo

- `class-diagram.svg`, `sequence-diagram.svg`: ảnh vector chuẩn cho tài liệu.
- `class-diagram.png`, `sequence-diagram.png`: ảnh raster có metadata 300 DPI.

Lệnh render và validate từ thư mục gốc repository:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File ./.agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/16-tenant-creation-provisioning/super-admin-create-tenant `
  -PlantUmlJar E:/Tools/PlantUML/plantuml.jar `
  -Format Both `
  -PngDpi 300
```

Lần kiểm tra ngày 2026-09-11 sử dụng PlantUML 1.2026.8. Cả hai file `.puml` đều vượt qua syntax validation; SVG và PNG được render thành công và kiểm tra trực quan. Renderer ghi và xác minh metadata PNG ở 300 DPI cho cả hai chiều. SVG vẫn là định dạng chuẩn vì không phụ thuộc độ phân giải.

## Trạng thái review

**Complete with assumptions** — sơ đồ đã được đối chiếu với contract và implementation, syntax validation thành công, SVG/PNG đã được kiểm tra. Các giả định còn lại được ghi rõ ở trên.
