# TENANT-16 — Tra cứu Danh bạ & Kiểm tra Định danh Doanh nghiệp (Tenant Directory Lookup & Identity Check)

## Mục đích và phạm vi

Chức năng này mô tả nhóm quy trình tra cứu dữ liệu danh bạ doanh nghiệp trên cổng quản trị nền tảng (Master Portal):
1. **Truy vấn danh bạ toàn bộ Tenant:** Phục vụ hiển thị bảng danh sách các công ty đang sử dụng dịch vụ trên `MasterAdminDashboardPage`, hỗ trợ lọc theo trạng thái (`ACTIVE`, `SUSPENDED`, `PROVISIONING`, `FAILED`) và tìm kiếm theo từ khóa.
2. **Xem chi tiết cấu hình Tenant theo ID:** Lấy toàn bộ metadata quản trị của một doanh nghiệp cụ thể phục vụ modal chi tiết.
3. **Kiểm tra sự tồn tại và tính khả dụng của Tenant:** Hỗ trợ kiểm tra realtime khi người dùng nhập mã code hoặc subdomain tại trang Onboarding, hoặc khi ứng viên/recruiter truy cập vào hệ thống qua URL riêng.

Tất cả các truy vấn này đều thực hiện trên **Master Database (PostgreSQL)** và áp dụng cơ chế **lọc sạch dữ liệu nhạy cảm (Data Sanitization)** thông qua `TenantResponse`, tuyệt đối không để lộ mật khẩu kết nối database hoặc thông tin nội bộ hạ tầng.

---

## Nguồn đã đối chiếu

- `AGENTS.md`, `DESIGN.md`
- `backend/src/main/java/com/smarthire/master/tenant/controller/MasterTenantController.java`
- `backend/src/main/java/com/smarthire/master/tenant/service/MasterTenantService.java`
- `backend/src/main/java/com/smarthire/master/tenant/dto/TenantResponse.java`
- `backend/src/main/java/com/smarthire/domain/master/repository/TenantInfoRepository.java`
- `backend/src/main/java/com/smarthire/domain/master/entity/TenantInfo.java`
- `frontend/src/features/master/dashboard/pages/MasterAdminDashboardPage.tsx`
- `frontend/src/api/master/masterAdminApi.ts`
- `frontend/src/api/master/tenantApi.ts`

---

## Actor và thành phần tham gia

| Thành phần | Loại | Trách nhiệm |
|---|---|---|
| `Workspace Admin` | Actor | Người quản trị nền tảng xem danh bạ và chi tiết doanh nghiệp. |
| `Master Admin UI` | Boundary | Giao diện React hiển thị bảng danh sách, thanh tìm kiếm/bộ lọc và popup chi tiết. |
| `Spring Security` | Control | Xác thực quyền `WORKSPACE_ADMIN` đối với các API danh bạ và chi tiết; cho phép truy cập mở đối với API kiểm tra tồn tại subdomain. |
| `MasterTenantController` | Boundary | Controller tiếp nhận các endpoint `GET /tenants`, `GET /tenants/{id}` và `GET /tenants/check/{codeOrSubdomain}`. |
| `TenantResponse` | Boundary / DTO | Lớp trung gian chuyển đổi dữ liệu an toàn, che giấu các trường bảo mật của database. |
| `MasterTenantService` | Control | Thực hiện nghiệp vụ tìm kiếm, chuẩn hóa định dạng chuỗi và lọc trạng thái hoạt động. |
| `TenantInfoRepository` | Repository | Giao tiếp Spring Data JPA với bảng `tenants` trong Master DB PostgreSQL. |
| `Master PostgreSQL` | Database | Cơ sở dữ liệu trung tâm lưu trữ toàn bộ hồ sơ đăng ký của các tenant. |

---

## Tiền điều kiện và hậu điều kiện

### Tiền điều kiện:
- Đối với `getAllTenants()` và `getTenantById(id)`: Caller phải gửi kèm JWT token mang quyền `WORKSPACE_ADMIN`.
- Đối với `checkTenantExists(codeOrSubdomain)`: API mở công khai (permit all) để phục vụ việc định tuyến tên miền phụ hoặc kiểm tra trùng lặp tức thời trên form đăng ký.

### Hậu điều kiện khi thành công:
- `GET /tenants`: Trả về mảng danh sách `TenantResponse` (HTTP 200 OK). Bảng dữ liệu frontend hiển thị đầy đủ tên công ty, mã code, subdomain, tên database vật lý và badge trạng thái.
- `GET /tenants/{id}`: Trả về chi tiết `TenantResponse` của tenant được chọn (HTTP 200 OK).
- `GET /tenants/check/{codeOrSubdomain}`: Trả về boolean `true` nếu tenant tồn tại VÀ đang ở trạng thái `ACTIVE`; trả về `false` nếu không tồn tại hoặc đang bị tạm khóa / lỗi.

### Hậu điều kiện khi thất bại:
- Không có quyền: trả về `401 Unauthorized` hoặc `403 Forbidden`.
- ID không tồn tại khi gọi `getTenantById`: trả về `404 Not Found` (`TENANT_NOT_FOUND`).

---

## Giải thích sơ đồ

### Sequence Diagram

Sơ đồ trình bày 3 luồng nghiệp vụ riêng biệt:

#### 1. Luồng Lấy danh bạ doanh nghiệp (Directory Listing):
- Quản trị viên chuyển sang tab "Danh bạ Doanh nghiệp".
- UI gửi `GET /api/v1/master/tenants`.
- Spring Security xác thực token `WORKSPACE_ADMIN`.
- `MasterTenantController` gọi `MasterTenantService.getAllTenants()`.
- Service gọi `TenantInfoRepository.findAll()` truy vấn Master DB.
- Controller thực thi mapping sang danh sách DTO an toàn `TenantResponse` qua Stream API.
- UI nhận mảng dữ liệu và hiển thị bảng kèm bộ lọc realtime.

#### 2. Luồng Xem chi tiết doanh nghiệp (View Tenant Details):
- Quản trị viên nhấn nút "Chi tiết" tại một dòng tenant.
- UI gửi `GET /api/v1/master/tenants/{id}`.
- Service gọi `TenantInfoRepository.findById(id)`.
- Nhánh `Tenant not found`: Nếu không tìm thấy, ném `BusinessException(404, "TENANT_NOT_FOUND")`, Controller trả về `404 Not Found`.
- Nhánh `Tenant found`: Service trả về thực thể `TenantInfo`, Controller bọc vào `TenantResponse.from(entity)` và trả về `200 OK`. UI mở modal chi tiết cấu hình.

#### 3. Luồng Kiểm tra định danh khả dụng / tồn tại (Realtime Existence Check):
- Người dùng gõ mã tenant/subdomain trên ô tìm kiếm hoặc form đăng ký.
- UI gọi `GET /api/v1/master/tenants/check/{codeOrSubdomain}`.
- Service chuẩn hóa chuỗi (trim, lowercase) và tìm kiếm theo code hoặc subdomain.
- Nếu tìm thấy và `status == 'ACTIVE'`, trả về `true`. Ngược lại trả về `false`.

---

### Class Diagram

#### Vai trò các thành phần:

- `MasterTenantQueryRoutes`: Khai báo 3 endpoint REST API đọc dữ liệu.
- `MasterTenantController`: Tiếp nhận HTTP GET, gọi Service và trả về `ApiResponse`.
- `TenantResponse`: DTO lớp biên hiển thị. Chứa phương thức tĩnh `from(TenantInfo)` để chuyển đổi an toàn từ Entity sang DTO.
- `MasterTenantService`: Tầng nghiệp vụ xử lý logic truy vấn.
- `TenantInfoRepository`: Cung cấp các hàm tìm kiếm `findByCode`, `findBySubdomain`, `findAll`, `findById`.
- `TenantInfo`: Entity JPA ánh xạ tới bảng `tenants` trong Master DB.

#### Giải thích các đường nối:

| Nguồn -> Đích | Loại quan hệ | Ý nghĩa kỹ thuật |
|---|---|---|
| `MasterTenantQueryRoutes ..> MasterTenantController` | Dependency | Tuyến đường HTTP ánh xạ lời gọi tới Controller. |
| `MasterTenantController --> MasterTenantService` | Directed Association | Controller phụ thuộc và gọi Service xử lý nghiệp vụ. |
| `MasterTenantController ..> TenantResponse` | Dependency | Controller sinh và trả về đối tượng `TenantResponse`. |
| `MasterTenantService --> TenantInfoRepository` | Directed Association | Service phụ thuộc vào Repository để truy vấn dữ liệu. |
| `TenantInfoRepository --> TenantInfo` | Navigable Association | Repository quản lý và trả về đối tượng `TenantInfo`. |
| `TenantInfoRepository --> MasterDB` | Directed Association | Dữ liệu được đọc trực tiếp từ bảng `tenants` trong Master DB. |

---

## Quyết định kiến trúc & Bảo mật dữ liệu

1. **Bảo vệ thông tin kết nối nhạy cảm (Credential Redaction):** Trong bảng `tenants`, các trường `db_password` (lưu mã hóa AES-256) và `db_url` có chứa thông tin kết nối vật lý. Đối tượng `TenantResponse` chỉ trả về `dbName` phục vụ nhận biết hạ tầng, tuyệt đối không bao giờ serialize `dbPassword` ra ngoài API.
2. **Quy tắc kiểm tra tồn tại an toàn:** Phương thức `checkTenantExists` chỉ coi là tồn tại hợp lệ nếu tenant đó ở trạng thái `ACTIVE`. Các tenant đang `PROVISIONING`, `FAILED` hoặc `SUSPENDED` sẽ không được coi là khả dụng đối với người dùng cuối, đảm bảo không rò rỉ trạng thái lỗi ra bên ngoài.

---

## Trạng thái review

**Source complete — awaiting rendering decision** (Mã nguồn PlantUML `.puml` và tài liệu `README.md` đã hoàn tất, không chứa title theo yêu cầu của người dùng).
