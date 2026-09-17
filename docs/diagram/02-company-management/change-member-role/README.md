# COMPANY-03 — Đổi role thành viên

- **Mã Feature:** `COMPANY` / `02-company-management`
- **Mã Function:** `change-member-role`
- **Thư mục:** `docs/diagram/02-company-management/change-member-role`
- **Trạng thái Review:** `Complete`

---

## 1. Mục đích và phạm vi

Tenant Admin đổi `User.role` của một thành viên trong cùng Tenant DB, kèm cơ chế bảo vệ không cho phép demote Admin cuối cùng. Việc thay đổi role không áp dụng cho CANDIDATE.

## 2. Nguồn đã đối chiếu

- Entity: `User`, `UserRole`, `UserStatus`
- Repository: `UserRepository`
- Service & Controller: `TenantUserController`, `TenantUserService`
- Security: `SecurityConfig`, `TenantWebInterceptor`, `TenantContext`

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Tenant Admin | Chọn thành viên và phân quyền mới. |
| Member Directory UI | Gửi yêu cầu PATCH và cập nhật hiển thị role. |
| Spring Security | Kiểm tra quyền truy cập của `TENANT_ADMIN`/`ADMIN`. |
| TenantWebInterceptor | Giải mã header/subdomain và kích hoạt `TenantContext`. |
| TenantUserController | Tiếp nhận HTTP request, validate payload. |
| TenantUserService | Kiểm tra invariant (admin cuối) và thực thi cập nhật role. |
| Tenant DB | Đã cách ly theo schema/database tenant, lưu trữ bảng `users`. |
| Redis Cache | Xóa/thu hồi Session refresh token khi giảm quyền thành viên. |

## 4. Tiền điều kiện và hậu điều kiện

- **Tiền điều kiện:** Tenant đang ở trạng thái `ACTIVE`; Người gọi có quyền Admin; Target user thuộc cùng Tenant DB và không ở trạng thái `DISABLED`.
- **Thành công:** Cập nhật `users.role` thành công; Thu hồi session trên Redis nếu bị hạ quyền; Trả về `200 OK` kèm `UserResponse`.
- **Thất bại:** `401 Unauthorized` / `403 Forbidden`; `400 Bad Request` (Invalid role); `404 Not Found`; `409 Conflict` (Chặn hạ quyền admin cuối).

## 5. Luồng chính và lỗi

1. Admin chọn thành viên và chọn role mới trên giao diện.
2. Gửi request `PATCH /api/v1/tenant/users/{id}/role`.
3. Server validate role: Chặn gán role `CANDIDATE` cho staff hoặc role không hợp lệ.
4. Đọc cơ sở dữ liệu tenant, đếm số lượng `TENANT_ADMIN` đang `ACTIVE`.
5. Nếu đổi quyền của Admin cuối cùng, trả về lỗi `409 Conflict (LAST_ADMIN_PROTECTED)`.
6. Thực hiện `UPDATE users.role`. Nếu bị giảm quyền, thu hồi Refresh Token trên Redis.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

- `Admin`: Tác nhân thực hiện thay đổi quyền.
- `UI`: Giao diện ứng dụng web.
- `Security`: Tầng bảo vệ phân quyền Spring Security.
- `Interceptor`: `TenantWebInterceptor` quản lý `TenantContext`.
- `Controller`: `TenantUserController` tiếp nhận request.
- `Service`: `TenantUserService` xử lý logic nghiệp vụ.
- `TenantDB`: Cơ sở dữ liệu riêng biệt của Tenant.
- `Redis`: Bộ nhớ cache thu hồi token.

### 6.2. Diễn giải chi tiết các bước

1. Admin gửi thông tin đổi role -> `UI` gửi PATCH request đến `/api/v1/tenant/users/{id}/role`.
2. `Spring Security` xác thực token: Nếu không có quyền -> Trả về 401/403.
3. `Interceptor` kích hoạt `TenantContext.setCurrentTenant(tenantId)`.
4. `Controller` kiểm tra định dạng role. Nếu không hợp lệ -> Trả về 400 Bad Request.
5. `Service` gọi `TenantDB.findById(targetId)` tìm người dùng. Nếu không tìm thấy -> Trả về 404 Not Found.
6. `Service` kiểm tra `TenantDB.countByRoleAndStatus(TENANT_ADMIN, ACTIVE)`. Nếu là Admin cuối -> Trả về 409 Conflict.
7. `Service` thực hiện `UPDATE users.role` trong `TenantDB`.
8. Nếu có hành vi hạ quyền (Demotion), `Service` gọi `Redis` xóa Refresh Token tương ứng.
9. Trả về `UserResponse` kèm HTTP 200 OK. `Interceptor` xóa `TenantContext`.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **Application-design**. Kiến trúc phân tầng Controller -> DTO -> Service -> Repository -> Entity -> Infrastructure.

### 7.1. Vai trò phần tử

| Phần tử | StereoType | Vai trò |
|---|---|---|
| `TenantUserController` | `<<Controller>>` | Controller xử lý request quản lý user tenant. |
| `ChangeRoleRequest` | `<<Request>>` | DTO chứa thông tin role mới. |
| `UserResponse` | `<<Response>>` | DTO trả về thông tin user sau khi cập nhật. |
| `TenantUserService` | `<<Service>>` | Interface định nghĩa nghiệp vụ quản lý user. |
| `TenantUserServiceImpl` | `<<Service>>` | Implementation thực thi kiểm tra invariant và lưu trữ. |
| `UserRepository` | `<<Repository>>` | JPA Repository thao tác dữ liệu bảng `users`. |
| `User` | `<<Entity>>` | Domain entity đại diện cho người dùng tenant. |
| `UserRole`, `UserStatus` | `<<Enum>>` | Các hằng số định nghĩa vai trò và trạng thái user. |
| `DedicatedTenantMySQL` | `<<Database>>` | Cơ sở dữ liệu riêng biệt của tenant. |
| `RedisCache` | `<<Cache>>` | Cache lưu trữ phiên đăng nhập và refresh token. |
| `TenantContext` | `<<ThreadLocal>>` | Quản lý Tenant ID theo luồng request. |

### 7.2. Quan hệ giữa các lớp

- `TenantUserController --> TenantUserService`: Ủy quyền xử lý nghiệp vụ (`delegates >`).
- `TenantUserController ..> ChangeRoleRequest`: Nhận dữ liệu đầu vào (`consumes >`).
- `TenantUserController ..> UserResponse`: Trả về dữ liệu (`returns >`).
- `TenantUserServiceImpl ..|> TenantUserService`: Hiện thực hóa interface (`implements`).
- `TenantUserServiceImpl --> UserRepository`: Thao tác dữ liệu qua repository (`queries & saves >`).
- `TenantUserServiceImpl --> RedisCache`: Thu hồi token (`revokes session on demotion >`).
- `UserRepository --> DedicatedTenantMySQL`: Lưu trữ dữ liệu (`persists to >`).
- `UserRepository --> User`: Quản lý thực thể (`manages >`).
- `User ..> UserRole`: Định kiểu bởi enum role (`typed by >`).
- `User ..> UserStatus`: Định kiểu bởi enum status (`typed by >`).

## 8. Quyết định kiến trúc và bảo mật

- **Tenant Isolation:** Toàn bộ truy vấn SQL đều thực hiện trên kết nối Database riêng của Tenant được giải mã qua `TenantContext`.
- **Session Revocation:** Khi hạ quyền người dùng, Refresh Token trên Redis bị hủy ngay lập tức để ngăn cản việc refresh lấy Access Token mới với quyền cũ.
- **Invariant Guarantee:** Giữ tối thiểu 1 Admin ở trạng thái ACTIVE để tránh tình trạng Tenant bị mồ côi không có quản trị viên.

## 9. Giả định

- Việc hạ quyền được định nghĩa khi chuyển từ role `TENANT_ADMIN` hoặc `ADMIN` xuống `HR` hoặc `RECRUITER`.
- Role `CANDIDATE` không nằm trong danh sách phân quyền của Workspace Staff.

## 10. Hướng dẫn Render sơ đồ

Khi có yêu cầu xuất ảnh PNG từ người dùng:
```powershell
pwsh .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 -InputPath docs/diagram/02-company-management/change-member-role -Format Png -PngDpi 300
```

## 11. Trạng thái Review

`Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.
