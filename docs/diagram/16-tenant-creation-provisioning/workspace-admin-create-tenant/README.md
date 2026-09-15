# TENANT-16 — Workspace Admin tạo Tenant

## Mục đích và phạm vi

Chức năng này mô tả cách Workspace Admin đăng ký và cấp phát đồng bộ một tenant doanh nghiệp. Phạm vi gồm validation, đăng ký trong master registry, thiết lập MySQL tự động hoặc thủ công, chạy Flyway, tạo `TENANT_ADMIN` đầu tiên, kích hoạt tenant và xử lý lỗi quan trọng.

Class diagram sử dụng **góc nhìn thiết kế ứng dụng** ở mức phù hợp cho đồ án tốt nghiệp. Sơ đồ tập trung vào route, DTO, controller, service, repository, entity và ranh giới hai kho dữ liệu; các lớp hạ tầng như mã hóa credential, datasource factory, Flyway và password encoder được lược khỏi class diagram chính.

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

Actor chính là người dùng nền tảng có role `WORKSPACE_ADMIN`. Trang onboarding validation phía client và gọi master API. Spring Security xác thực JWT và kiểm tra role. `MasterTenantService` chịu trách nhiệm quy tắc đăng ký và master transaction; `TenantProvisioningService` điều phối quy trình cấp phát qua hai database. PostgreSQL là master registry, còn mỗi tenant có một MySQL database tách biệt vật lý.

## Tiền điều kiện và hậu điều kiện

Tiền điều kiện:

- Caller đã đăng nhập và có role `WORKSPACE_ADMIN`.
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

### Sequence diagram

#### Vai trò các thành phần

| Thành phần | Trách nhiệm trong luồng |
|---|---|
| `Workspace Admin` | Khởi tạo yêu cầu tạo doanh nghiệp và nhận kết quả cuối cùng. |
| `Tenant Onboarding UI` | Thu thập dữ liệu tenant/admin, gửi HTTP request và hiển thị thành công hoặc lỗi. |
| `Spring Security` | Xác thực JWT và chỉ cho phép người dùng có quyền `WORKSPACE_ADMIN` đi vào API quản trị. |
| `MasterTenantController` | Biên HTTP của backend; nhận DTO, chạy Bean Validation, gọi service và ánh xạ kết quả sang HTTP response. |
| `MasterTenantService` | Thực thi quy tắc đăng ký tenant, kiểm tra định danh, lưu trạng thái vòng đời và điều phối provisioning. |
| `Master PostgreSQL` | Lưu registry của tenant và các trạng thái `PROVISIONING`, `ACTIVE`, `FAILED`. |
| `TenantProvisioningService` | Điều phối việc chuẩn bị database riêng, migration schema và tạo quản trị viên đầu tiên. |
| `MySQL Server` | Tạo database/user riêng ở chế độ managed hoặc cung cấp kết nối tới database đã chuẩn bị trước. |
| `Flyway` | Đưa schema của tenant về đúng phiên bản migration trước khi ghi dữ liệu nghiệp vụ. |
| `Dedicated Tenant DB` | Lưu schema và dữ liệu của đúng một tenant, bao gồm tài khoản `TENANT_ADMIN`. |

#### Diễn giải từng bước

Các hình chữ nhật hẹp trên lifeline là **activation bar**, biểu thị khoảng thời gian participant đang trực tiếp xử lý một lời gọi. Thanh bắt đầu khi participant nhận request và kết thúc khi trả kết quả hoặc khi nhánh lỗi dừng xử lý; chúng không biểu thị thời gian thực theo tỷ lệ.

1. `Workspace Admin → Tenant Onboarding UI`: người quản trị nhập thông tin tenant và admin đầu tiên. Đây là dữ liệu đầu vào của use case.
2. `Tenant Onboarding UI → Spring Security`: UI gửi `POST /api/v1/master/tenants/onboard`. Request đi qua security trước controller để quyền được kiểm tra tại biên tin cậy của backend.
3. Nhánh `Unauthenticated or insufficient permission`: request thiếu/sai xác thực nhận `401`, còn người đã đăng nhập nhưng thiếu quyền nhận `403`; UI dừng luồng và hiển thị lỗi truy cập.
4. Nhánh `Authorized Workspace Admin`: Spring Security chuyển request hợp lệ cho `MasterTenantController`.
5. `MasterTenantController → MasterTenantController`: controller chạy validation cho DTO. Nếu dữ liệu sai định dạng, nhánh `Invalid request` trả `400` và không gọi service hoặc truy cập database.
6. Nhánh `Valid request`: controller gọi `MasterTenantService.onboardTenant(request)` để chuyển xử lý nghiệp vụ ra khỏi tầng HTTP.
7. `MasterTenantService ↔ Master PostgreSQL`: service kiểm tra `code` và `subdomain`. Kết quả quyết định tenant có thể được đăng ký hay không.
8. Nhánh `Tenant identity already exists`: service trả xung đột, controller ánh xạ thành `409`, UI thông báo định danh tenant bị trùng; không tạo database mới.
9. Nhánh `Tenant identity is available`: service lưu tenant với trạng thái `PROVISIONING`. Trạng thái trung gian cho biết registry đã tồn tại nhưng database riêng chưa sẵn sàng; Master DB trả lại `tenantId` để provisioning xử lý đúng bản ghi.
10. `MasterTenantService → TenantProvisioningService`: service yêu cầu cấp phát database và tạo admin đầu tiên cho tenant vừa đăng ký.
11. Nhánh `Managed database`: hệ thống tạo database và database user có phạm vi quyền riêng cho tenant. Nhánh `Pre-provisioned database` dùng database do Workspace Admin chuẩn bị sẵn; cả hai nhánh phải kết thúc bằng một kết nối tenant hợp lệ.
12. `TenantProvisioningService → Flyway → Dedicated Tenant DB`: Flyway áp dụng migration. Bước này phải hoàn tất trước khi tạo admin để bảng `users` và các ràng buộc schema chắc chắn tồn tại.
13. `TenantProvisioningService ↔ Dedicated Tenant DB`: hệ thống tạo `TENANT_ADMIN` đầu tiên và nhận xác nhận. Mật khẩu được lưu dưới dạng hash, nhưng chi tiết bộ mã hóa được lược khỏi sơ đồ chính.
14. `TenantProvisioningService → MasterTenantService`: trả kết quả tổng hợp của quá trình provisioning để service quyết định trạng thái cuối.
15. Nhánh `Provisioning failed`: Master DB được cập nhật thành `FAILED`; API trả `503` và UI thông báo lỗi. Trạng thái này giúp phân biệt lỗi cấp phát với lỗi validation và cho phép xử lý retry ở use case riêng.
16. Nhánh `Provisioning succeeded`: service cập nhật tenant thành `ACTIVE`; controller trả `201 Created` cùng metadata an toàn và UI xác nhận tenant đã sẵn sàng.

Hai database không nằm trong một distributed transaction. Vì vậy, trạng thái trong Master PostgreSQL là điểm theo dõi nhất quán khi một bước provisioning ở Tenant MySQL thất bại.

### Class diagram

#### Vai trò các thành phần

| Thành phần | Loại | Vai trò |
|---|---|---|
| `MasterTenantController` | `<<Controller>>` | Nhận request, validation, gọi service và tạo response HTTP. |
| `OnboardTenantRequest` | `<<Request>>` | Mang dữ liệu nhận diện tenant và cấu hình database tùy chọn. |
| `TenantAdminRequest` | `<<Request>>` | Mang thông tin quản trị viên đầu tiên; là phần dữ liệu chung có thể tái sử dụng cho onboarding và retry. |
| `TenantResponse` | `<<Response>>` | Chỉ trả metadata an toàn; không trả URL, username hoặc password database. |
| `MasterTenantService` | `<<Service>>` | Thực thi quy tắc đăng ký tenant và điều phối provisioning. |
| `TenantInfoRepository` | `<<Repository>>` | Cung cấp persistence boundary cho `TenantInfo`, che giấu chi tiết truy vấn Master DB. |
| `TenantInfo` | `<<Entity>>` | Đại diện tenant trong registry nền tảng và giữ trạng thái vòng đời provisioning. |
| `Master PostgreSQL` | `<<Database>>` | Sở hữu bảng `tenants` và metadata cấp nền tảng. |
| `TenantProvisioningService` | `<<Service>>` | Chuẩn bị database riêng và tạo admin đầu tiên; chi tiết Hikari, encryption và Flyway wrapper được ẩn ở mức sơ đồ này. |
| `TenantAdmin` | `<<Entity>>` | Đại diện tài khoản quản trị đầu tiên thuộc database tenant. |
| `Dedicated Tenant MySQL` | `<<Database>>` | Kho dữ liệu vật lý riêng của một tenant. |

#### Giải thích các đường nối

| Nguồn → đích | Ký pháp | Loại quan hệ và lý do sử dụng |
|---|---|---|
| `MasterTenantController → OnboardTenantRequest` | `..>` | **Dependency**: controller nhận DTO làm tham số. DTO chỉ được dùng trong lời gọi, không phải thành phần được controller sở hữu. |
| `MasterTenantController → MasterTenantService` | `-->` | **Directed association**: controller giữ service như một collaborator được inject và gọi lâu dài, vì vậy dùng đường liền có hướng. |
| `MasterTenantController → TenantResponse` | `..>` | **Dependency**: controller tạo/trả response DTO cho API nhưng không quản lý vòng đời domain của DTO. |
| `OnboardTenantRequest → TenantAdminRequest` | `--|>` | **Generalization/inheritance**: code thực tế khai báo `OnboardTenantRequest extends TenantAdminRequest`, nên onboarding kế thừa các trường admin dùng chung. |
| `MasterTenantService → OnboardTenantRequest` | `..>` | **Dependency**: request được dùng làm đầu vào của operation `onboardTenant`, không phải entity được service sở hữu. |
| `MasterTenantService → TenantInfoRepository` | `-->` | **Directed association**: repository là dependency được inject và được service sử dụng để kiểm tra/lưu tenant. |
| `MasterTenantService → TenantProvisioningService` | `-->` | **Directed association**: service chính giữ provisioning service như collaborator để hoàn tất use case sau khi đăng ký tenant. |
| `TenantInfoRepository → TenantInfo` | `-->` | **Navigable association**: repository quản lý và trả về entity `TenantInfo`; hướng nối thể hiện repository biết kiểu entity được persistence. |
| `TenantInfoRepository → Master PostgreSQL` | `-->` | **Directed association tới data store**: mọi thao tác repository của `TenantInfo` được lưu trong Master DB, làm rõ quyền sở hữu dữ liệu. |
| `TenantProvisioningService → TenantInfo` | `..>` | **Dependency**: provisioning đọc metadata tenant để chuẩn bị database nhưng không sở hữu entity master. |
| `TenantProvisioningService → Dedicated Tenant MySQL` | `-->` | **Directed association tới data store**: service chủ động chuẩn bị schema và ghi admin vào database riêng. |
| `Dedicated Tenant MySQL → TenantAdmin` | `*--` | **Composition**: `TenantAdmin` thuộc hoàn toàn về database tenant; không tồn tại trong Master DB và không được dùng chung giữa các tenant. Hình thoi đặc nhấn mạnh quyền sở hữu vòng đời/dữ liệu. |

Sơ đồ không vẽ quan hệ trực tiếp giữa `TenantInfo` và `TenantAdmin` vì chúng nằm ở hai database vật lý, không có foreign key hoặc entity association xuyên database.

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

- `class-diagram.png`, `sequence-diagram.png`: ảnh raster có metadata 300 DPI.

Lệnh render và validate từ thư mục gốc repository:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File ./.agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/16-tenant-creation-provisioning/workspace-admin-create-tenant `
  -PlantUmlJar E:/Tools/PlantUML/plantuml.jar `
  -Format Png `
  -PngDpi 300
```

Lần kiểm tra sử dụng PlantUML 1.2026.8. Cả hai file `.puml` đều vượt qua syntax validation; PNG được render thành công và kiểm tra trực quan. Renderer ghi và xác minh metadata PNG ở 300 DPI cho cả hai chiều.

## Trạng thái review

**Complete** — nguồn PlantUML đã được đối chiếu với contract và vượt qua syntax validation. Hai ảnh PNG đã được render lại, kiểm tra trực quan và xác minh metadata 300 DPI; không tạo artifact SVG.
