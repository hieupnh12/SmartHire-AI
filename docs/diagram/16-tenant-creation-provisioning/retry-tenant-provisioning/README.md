# TENANT-16 — Thử lại Cấp phát Doanh nghiệp (Retry Tenant Provisioning)

## Mục đích và phạm vi

Chức năng này mô tả quy trình Quản trị viên Nền tảng (Workspace Admin) kích hoạt thử lại việc cấp phát cơ sở dữ liệu và tài khoản quản trị ban đầu cho các tenant ở trạng thái lỗi (`FAILED`) hoặc bị gián đoạn trong quá trình khởi tạo (`PROVISIONING`).

Trong kiến trúc **Separate Database per Tenant**, quá trình cấp phát database bao gồm nhiều bước vật lý (tạo DB, cấp user MySQL, chạy Flyway migration, tạo tài khoản quản trị). Khi xảy ra sự cố mạng hoặc gián đoạn giữa chừng, hệ thống **không xóa bỏ** tài nguyên đã tạo dở dang mà giữ nguyên để phục vụ cơ chế **thử lại mang tính lũy thừa (Idempotent Retry)**, bảo vệ toàn vẹn dữ liệu khách hàng.

---

## Nguồn đã đối chiếu

- `AGENTS.md`, `DESIGN.md`
- `docs/architecture/INFRA_CHECKLIST.md`
- `backend/src/main/java/com/smarthire/master/tenant/controller/MasterTenantController.java`
- `backend/src/main/java/com/smarthire/master/tenant/service/MasterTenantService.java`
- `backend/src/main/java/com/smarthire/multitenancy/service/TenantProvisioningService.java`
- `backend/src/main/java/com/smarthire/multitenancy/datasource/TenantDataSourceFactory.java`
- `backend/src/main/java/com/smarthire/domain/master/repository/TenantInfoRepository.java`
- `backend/src/main/java/com/smarthire/domain/master/entity/TenantInfo.java`
- `frontend/src/features/master/dashboard/pages/MasterAdminDashboardPage.tsx`
- `frontend/src/features/master/onboarding/pages/TenantOnboardPage.tsx`

---

## Actor và thành phần tham gia

| Thành phần | Loại | Trách nhiệm |
|---|---|---|
| `Workspace Admin` | Actor | Người quản trị nền tảng có quyền `WORKSPACE_ADMIN`. |
| `Master Admin UI` | Boundary | Giao diện quản trị, hiển thị nút "Cấp phát lại" cho các tenant có trạng thái `FAILED` hoặc `PROVISIONING`. |
| `Spring Security` | Control | Kiểm tra JWT token và vai trò `WORKSPACE_ADMIN`. |
| `MasterTenantController` | Boundary | Endpoint `POST /api/v1/master/tenants/{id}/retry`, tiếp nhận `TenantAdminRequest`. |
| `MasterTenantService` | Control | Kiểm tra sự tồn tại của tenant và chuyển tiếp tới engine cấp phát. |
| `TenantProvisioningService` | Control | Thực thi quy trình cấp phát có tính lũy thừa, quản lý PostgreSQL advisory lock. |
| `Master PostgreSQL` | Database | Quản lý registry tenant, trạng thái `FAILED/PROVISIONING/ACTIVE` và lock độc quyền. |
| `Dedicated Tenant MySQL` | Database | Cơ sở dữ liệu riêng của tenant được migration và gieo tài khoản quản trị. |
| `Flyway` | Control / Tool | Thực thi các bản script migration schema còn thiếu trên Tenant DB. |

---

## Tiền điều kiện và hậu điều kiện

### Tiền điều kiện:
- Caller đã đăng nhập với vai trò `WORKSPACE_ADMIN`.
- Tenant ID mục tiêu phải tồn tại trong Master DB và đang ở trạng thái `FAILED` hoặc `PROVISIONING`.
- Mật khẩu của `TenantAdminRequest` không vượt quá 72 UTF-8 bytes (chuẩn BCrypt).
- Không có tiến trình cấp phát nào khác đang giữ lock trên cùng tenant ID.

### Hậu điều kiện khi thành công:
- Toàn bộ schema tenant MySQL đã được Flyway đưa về phiên bản mới nhất.
- Tài khoản `TENANT_ADMIN` đã tồn tại trong bảng `users` của tenant (nếu đã có từ lần trước thì giữ nguyên, nếu chưa có thì được tạo mới).
- Trạng thái tenant trong Master DB được cập nhật thành `ACTIVE`.
- PostgreSQL session advisory lock được giải phóng hoàn toàn.
- HTTP `200 OK` kèm `TenantResponse` cập nhật; trên giao diện badge chuyển sang màu xanh `ACTIVE`.

### Hậu điều kiện khi thất bại:
- Nếu tenant đang ở trạng thái `ACTIVE`: trả về `409 Conflict` (`INVALID_TENANT_STATE`).
- Nếu đang có tiến trình khác giữ lock: trả về `409 Conflict` (`PROVISIONING_IN_PROGRESS`).
- Nếu gặp lỗi trong quá trình chạy (ví dụ lỗi kết nối MySQL, lỗi script Flyway): trạng thái trong Master DB được cập nhật về `FAILED`, giữ nguyên tài nguyên hiện có và trả về `503 Service Unavailable` (`TENANT_PROVISIONING_FAILED`).

---

## Giải thích sơ đồ

### Sequence Diagram

#### Diễn giải từng bước:

1. `Workspace Admin -> Master Admin UI`: Quản trị viên nhấn nút "Cấp phát lại" tại dòng tenant lỗi trên bảng điều khiển.
2. `Master Admin UI -> Spring Security`: Gửi request `POST /api/v1/master/tenants/{id}/retry` kèm thông tin tài khoản admin và token xác thực.
3. Nhánh `Unauthenticated or insufficient permission`: Trả về `401/403` nếu không hợp lệ.
4. Nhánh `Authorized Workspace Admin`: Spring Security chuyển giao request tới `MasterTenantController`.
5. `MasterTenantController -> MasterTenantService`: Gọi `retryProvisioning(id, request)`.
6. `MasterTenantService -> TenantProvisioningService`: Chuyển xử lý tới `provision(id, request)`.
7. `TenantProvisioningService -> Master PostgreSQL`: Chiếm khóa độc quyền session:
   ```sql
   SELECT pg_try_advisory_lock(:id);
   ```
8. Nhánh `Lock cannot be acquired`: Nếu trả về `false` (có tiến trình khác đang chạy trên tenant này), ném `BusinessException(409, "PROVISIONING_IN_PROGRESS")`, UI cảnh báo tiến trình đang diễn ra.
9. Nhánh `Lock acquired`:
   - Truy vấn `findById(id)`. Nếu tenant có trạng thái khác `FAILED` và `PROVISIONING` (ví dụ đã `ACTIVE`), giải phóng lock và trả về `409 Conflict` (`INVALID_TENANT_STATE`).
   - Cập nhật trạng thái sang `PROVISIONING` để ghi nhận tiến trình đang chạy.
   - Nếu là managed database, thực thi `CREATE DATABASE IF NOT EXISTS` và `CREATE USER IF NOT EXISTS`.
   - Tạo kết nối tạm thời và gọi `Flyway.migrate()` để bổ sung các bảng/trigger/index còn thiếu.
   - Kiểm tra tài khoản admin: thực thi `SELECT role FROM users WHERE email = ?`.
     - Nếu đã tồn tại: giữ nguyên tài khoản cũ, không ghi đè mật khẩu.
     - Nếu chưa tồn tại: thực thi câu lệnh INSERT tài khoản `TENANT_ADMIN` mới với mật khẩu mã hóa BCrypt.
10. Nhánh lỗi: Nếu phát sinh ngoại lệ trong quá trình thao tác database, bắt lỗi, cập nhật trạng thái Master DB thành `FAILED`, giải phóng lock và trả về `503 Service Unavailable`.
11. Nhánh thành công: Cập nhật Master DB thành `ACTIVE`, giải phóng advisory lock và trả về HTTP `200 OK`.

---

### Class Diagram

#### Vai trò các thành phần:

- `TenantRetryRoute`: Tuyến HTTP REST API tiếp nhận yêu cầu retry.
- `MasterTenantController`: Điều phối request và mapping kết quả trả về.
- `TenantAdminRequest`: DTO mang thông tin tên, email và mật khẩu của quản trị viên tenant ban đầu.
- `TenantResponse`: DTO an toàn không để lộ password hay database URL nội bộ.
- `MasterTenantService`: Service trung gian thực hiện kiểm tra nghiệp vụ cấp nền tảng.
- `TenantProvisioningService`: Trọng tâm logic cấp phát và retry; thực thi các bước idempotent.
- `TenantDataSourceFactory`: Tạo datasource HikariCP kết nối tới database riêng và cấu hình Flyway.
- `TenantUser`: Thực thể user thuộc database riêng của doanh nghiệp.
- `Master PostgreSQL`: Quản lý registry và cung cấp cơ chế PostgreSQL Advisory Lock.

#### Giải thích các đường nối:

| Nguồn -> Đích | Loại quan hệ | Ý nghĩa kỹ thuật |
|---|---|---|
| `TenantRetryRoute ..> MasterTenantController` | Dependency | Route định tuyến tới Controller. |
| `MasterTenantController ..> TenantAdminRequest` | Dependency | Controller nhận DTO làm tham số đầu vào. |
| `MasterTenantController --> MasterTenantService` | Directed Association | Controller phụ thuộc vào Service. |
| `MasterTenantService --> TenantProvisioningService` | Directed Association | Service giao việc cấp phát lại cho provisioning engine. |
| `TenantProvisioningService --> MasterDB` | Directed Association | Thao tác advisory lock và cập nhật trạng thái trên Master DB. |
| `TenantProvisioningService --> TenantDataSourceFactory` | Directed Association | Sử dụng factory để kết nối tới database riêng và chạy Flyway. |
| `TenantProvisioningService --> TenantDB` | Directed Association | Gieo dữ liệu tài khoản quản trị đầu tiên vào database tenant. |
| `TenantDataSourceFactory --> TenantDB` | Directed Association | Thực thi Flyway schema migrations. |
| `TenantDB *-- TenantUser` | Composition | Bảng `users` hoàn toàn thuộc sở hữu vật lý của Tenant DB. |

---

## Quyết định kiến trúc, Khóa & An toàn dữ liệu

1. **PostgreSQL Session Advisory Lock (`pg_try_advisory_lock`):** Khóa ở mức phiên kết nối đảm bảo dù có nhiều admin nhấn nút "Retry" cùng lúc hoặc request lặp, chỉ có duy nhất một tiến trình được phép can thiệp vào database của tenant đó.
2. **Tính lũy thừa (Idempotency):** Tất cả các câu lệnh DDL và DML đều được thiết kế an toàn khi chạy lại nhiều lần:
   - DDL dùng `IF NOT EXISTS`.
   - Flyway tự động bỏ qua các migration đã chạy thành công trước đó.
   - Tài khoản `TENANT_ADMIN` được kiểm tra trước khi insert, không làm thay đổi mật khẩu của admin nếu tài khoản đã tồn tại.
3. **Giữ nguyên tài nguyên khi lỗi (No Cascading Drop):** Khi bước provisioning thất bại, hệ thống bảo lưu toàn bộ database và bảng đã tạo một phần, chỉ chuyển trạng thái sang `FAILED` để admin có thể sửa lỗi cấu hình và tiếp tục retry mà không làm mất dữ liệu.

---

## Trạng thái review

**Source complete — awaiting rendering decision** (Mã nguồn PlantUML `.puml` và tài liệu `README.md` đã hoàn tất, không chứa title theo yêu cầu của người dùng).
