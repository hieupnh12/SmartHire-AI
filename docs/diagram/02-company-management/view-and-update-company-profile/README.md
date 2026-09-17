# COMPANY-01 — Xem và cập nhật hồ sơ công ty

- **Mã Feature:** `COMPANY` / `02-company-management`
- **Mã Function:** `view-and-update-company-profile`
- **Thư mục:** `docs/diagram/02-company-management/view-and-update-company-profile`
- **Trạng thái Review:** `Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.

---

## 1. Mục đích và phạm vi

Cho phép Tenant Admin xem và chỉnh sửa thông tin thương hiệu của doanh nghiệp (Tên công ty, Logo, Website, Địa chỉ, Lĩnh vực, Quy mô, Mô tả doanh nghiệp); HR và Recruiter chỉ được xem. Thông tin hồ sơ được sử dụng để hiển thị trên các trang tin tuyển dụng công khai dành cho Candidate.

## 2. Nguồn đã đối chiếu

- Entity: `TenantInfo` (bảng `tenants` trên Master Database PostgreSQL)
- Migration: `db/migration/master/V1__init_master_schema.sql`, `V4__company_profile_fields.sql`
- Repository: `TenantInfoRepository`
- Service & Controller: `CompanyProfileController`, `CompanyProfileService`, `CompanyProfileServiceImpl`, `CompanyProfileMapper`
- Phân quyền: `SecurityConfig`; phân giải tenant: `TenantWebInterceptor`, `TenantContext`

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Tenant Admin | Xem và chỉnh sửa thông tin hồ sơ thương hiệu doanh nghiệp. |
| HR / Recruiter | Chỉ xem hồ sơ thương hiệu để phục vụ đăng tin tuyển dụng. |
| Company Profile UI | Trang `/tenant/admin/company` trong workspace quản trị. |
| Spring Security | Kiểm tra vai trò theo HTTP method: GET cho 4 vai trò, PUT chỉ cho `TENANT_ADMIN`/`ADMIN`. |
| TenantWebInterceptor | Đọc `X-Tenant-ID` hoặc subdomain và set `TenantContext` cho request. |
| CompanyProfileController | Tiếp nhận request `GET` và `PUT` `/api/v1/tenant/company/profile`. |
| CompanyProfileService | Interface nghiệp vụ; `CompanyProfileServiceImpl` đọc/ghi bảng `tenants`. |
| CompanyProfileMapper | MapStruct mapper tách DTO khỏi entity; chuỗi trống được chuẩn hoá thành `null`; không map cột hạ tầng. |
| TenantInfoRepository | Truy vấn `findByCode` / `findBySubdomain` và `save` trên Master DB. |
| Master DB (PostgreSQL) | Lưu trữ bảng metadata `tenants`. |

## 4. Tiền điều kiện và hậu điều kiện

- **Tiền điều kiện:** Tenant đang ở trạng thái `ACTIVE`; request có tenant context hợp lệ; người dùng đăng nhập với vai trò được phép.
- **Thành công:** Trả về `CompanyProfileResponse` chứa logo, địa chỉ, website; Cập nhật thông tin thành công trong bảng `tenants`.
- **Thất bại:** `401` chưa xác thực; `403` sai vai trò (ví dụ `CANDIDATE` hoặc `RECRUITER` gọi `PUT`); `400 Bad Request` (website/logo URL không hợp lệ, thiếu tên công ty, thiếu tenant context — mã `TENANT_REQUIRED`); `404` mã `TENANT_NOT_FOUND`.

## 5. Luồng chính và lỗi

1. **Luồng xem hồ sơ:**
   - Người dùng truy cập trang Hồ sơ công ty -> Gửi `GET /api/v1/tenant/company/profile`.
   - Hệ thống đọc thông tin từ `tenants` theo mã tenant trong `TenantContext` và trả về `CompanyProfileResponse`.

2. **Luồng cập nhật hồ sơ:**
   - Người dùng chỉnh sửa logo, mô tả, địa chỉ, website -> Gửi `PUT /api/v1/tenant/company/profile`.
   - Server validate URL website/logo và độ dài dữ liệu đầu vào bằng `jakarta.validation`.
   - Cập nhật bảng `tenants` trên Master DB trong transaction `masterTransactionManager`. Trả về HTTP 200 OK.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

- `User`: Tenant Admin hoặc Recruiter.
- `UI`: Giao diện cài đặt doanh nghiệp.
- `Security`: Spring Security authorization context.
- `Interceptor`: `TenantWebInterceptor` xử lý `TenantContext`.
- `Controller`: `CompanyProfileController` nhận REST API request.
- `Service`: `CompanyProfileService` thực thi logic.
- `MasterDB`: CSDL Master chứa thông tin thương hiệu các tenant.

### 6.2. Diễn giải chi tiết các bước

1. User vào trang hồ sơ -> `UI` gửi `GET /api/v1/tenant/company/profile`.
2. `Controller` gọi `Service.getProfile()` -> `MasterDB.findByCode(tenantCode)` -> Trả về dữ liệu hồ sơ.
3. User chỉnh sửa và lưu thông tin -> `UI` gửi `PUT /api/v1/tenant/company/profile`.
4. `Controller` validate dữ liệu: Nếu invalid -> Trả về 400 Bad Request.
5. `Service` gọi `MasterDB.UPDATE tenants` lưu các thông tin mới (name, logo_url, website, address, industry, company_size, description).
6. Trả về `CompanyProfileResponse` kèm HTTP 200 OK. `Interceptor` xóa `TenantContext`.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **Application-design**. Kiến trúc phân tầng Controller -> DTO -> Service -> Repository -> Entity -> Infrastructure.

### 7.1. Vai trò phần tử

| Phần tử | StereoType | Vai trò |
|---|---|---|
| `CompanyProfileController` | `<<Controller>>` | Controller tiếp nhận request xem và sửa hồ sơ công ty. |
| `UpdateCompanyProfileRequest` | `<<Request>>` | DTO chứa dữ liệu cập nhật hồ sơ. |
| `CompanyProfileResponse` | `<<Response>>` | DTO phản hồi dữ liệu hồ sơ công ty. |
| `CompanyProfileService` | `<<Service>>` | Interface nghiệp vụ quản lý hồ sơ công ty. |
| `CompanyProfileServiceImpl` | `<<Service>>` | Implementation thực thi đọc/ghi Master DB. |
| `CompanyProfileMapper` | `<<Mapper>>` | MapStruct mapper chuyển đổi `TenantInfo` ⇄ DTO; chuỗi trống thành `null`; không map cột hạ tầng. |
| `TenantInfoRepository` | `<<Repository>>` | Repository quản lý entity `TenantInfo`. |
| `TenantInfo` | `<<Entity>>` | Thực thể thông tin thương hiệu công ty trên Master DB. |
| `MasterPostgresDB` | `<<Database>>` | Cơ sở dữ liệu Master (PostgreSQL) lưu bảng `tenants`. |

### 7.2. Quan hệ giữa các lớp

- `CompanyProfileController --> CompanyProfileService`: Ủy quyền xử lý nghiệp vụ (`delegates >`).
- `CompanyProfileController ..> UpdateCompanyProfileRequest`: Nhận dữ liệu cập nhật (`consumes >`).
- `CompanyProfileController ..> CompanyProfileResponse`: Trả về dữ liệu (`returns >`).
- `CompanyProfileServiceImpl ..|> CompanyProfileService`: Hiện thực hóa interface (`implements`).
- `CompanyProfileServiceImpl --> CompanyProfileMapper`: Ủy quyền chuyển đổi dữ liệu (`maps through >`); association vì mapper là collaborator được inject.
- `CompanyProfileMapper ..> UpdateCompanyProfileRequest` / `..> CompanyProfileResponse`: Dependency vì mapper chỉ dùng DTO làm tham số và giá trị trả về.
- `CompanyProfileServiceImpl --> TenantInfoRepository`: Đọc và cập nhật dữ liệu (`queries & updates >`).
- `CompanyProfileServiceImpl ..> TenantContext`: Dependency đọc mã tenant hiện tại của request.
- `TenantInfoRepository --> TenantInfo`: Quản lý vòng đời thực thể (`manages >`).
- `TenantInfoRepository --> MasterPostgresDB`: Lưu trữ thực thể (`persists to >`).

## 8. Quyết định kiến trúc và bảo mật

- **Centralized Branding Metadata:** Dữ liệu hồ sơ thương hiệu (Logo, Tên công ty, Website) được lưu ở Master DB để Candidate Portal và Public API có thể truy cập nhanh chóng mà không cần kết nối tới từng Tenant Database riêng lẻ.
- **Cross-database transaction:** Đây là API đầu tiên trong package `com.smarthire.tenant` ghi vào Master DB, nên hai method service đều khai báo `@Transactional(transactionManager = "masterTransactionManager")`; transaction manager mặc định trỏ vào tenant DB.
- **Phân quyền theo HTTP method:** Dự án không bật method security, nên quyền được khai báo trong `SecurityConfig` bằng matcher riêng cho `GET` và `PUT`. Nếu thiếu matcher này, rule `/api/v1/**` sẽ cho phép cả `CANDIDATE` sửa hồ sơ công ty.
- **Không lộ thông tin hạ tầng:** `CompanyProfileResponse` không chứa `db_url`, `db_username`, `db_password`, `db_name`; `UpdateCompanyProfileRequest` không có field nào map được sang các cột đó.
- **Không cho tenant tự đổi định danh:** `code` và `subdomain` là dữ liệu provisioning, chỉ Workspace Admin thao tác qua API master.

## 9. Giả định

- Ảnh Logo được tải lên qua Service đệm Cloud Storage và API này chỉ nhận link URL dạng CDN.
- Cờ xác minh `verified` chỉ đọc ở use case này; việc bật cờ thuộc function `verify-company`.

## 10. Hiện trạng triển khai

| Method | Path | Quyền |
|---|---|---|
| GET | `/api/v1/tenant/company/profile` | `TENANT_ADMIN`, `ADMIN`, `HR`, `RECRUITER` |
| PUT | `/api/v1/tenant/company/profile` | `TENANT_ADMIN`, `ADMIN` |

- Migration: `db/migration/master/V4__company_profile_fields.sql` bổ sung `logo_url`, `website`, `address`, `industry`, `company_size`, `description`, `is_verified` vào bảng `tenants`.
- Backend: `com.smarthire.tenant.company.{controller,dto,mapper,service}`.
- Frontend: `frontend/src/features/tenant/admin/company/pages/CompanyProfilePage.tsx`, client `src/api/tenant/companyApi.ts`, route `/tenant/admin/company`, nav key `nav.company` (EN/VI/JA).
- Test: `CompanyProfileServiceTest` (4 case) và `CompanyProfileControllerTest` (4 case).

## 11. Hướng dẫn Render sơ đồ

Khi có yêu cầu xuất ảnh PNG từ người dùng:
```powershell
pwsh .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 -InputPath docs/diagram/02-company-management/view-and-update-company-profile -Format Png -PngDpi 300
```

## 12. Trạng thái Review

`Source complete — awaiting rendering decision` — sơ đồ nguồn đã cập nhật theo code đã triển khai; ảnh PNG hiện tại vẫn là bản cũ và cần render lại khi người dùng đồng ý.
