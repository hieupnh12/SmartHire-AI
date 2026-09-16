# COMPANY-04 — Khóa hoặc xóa thành viên

- **Mã Feature:** `COMPANY` / `02-company-management`
- **Mã Function:** `lock-or-delete-member`
- **Thư mục:** `docs/diagram/02-company-management/lock-or-delete-member`
- **Trạng thái Review:** `Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.

---

## 1. Mục đích và phạm vi

Cho phép Tenant Admin cập nhật trạng thái hoạt động của thành viên trong công ty (`ACTIVE` -> `LOCKED` hoặc `DISABLED`) hoặc vô hiệu hóa tài khoản, đồng thời thu hồi phiên đăng nhập hiện tại trên Redis. Cơ chế bảo đảm không cho phép Admin tự khóa tài khoản của chính mình và không khóa Admin duy nhất còn lại của Tenant.

## 2. Nguồn đã đối chiếu

- Entity: `User`, `UserRole`, `UserStatus`
- Repository: `UserRepository`
- Service & Controller: `TenantUserController`, `TenantUserService`
- Session Cache: `RedisService` (`revokeRefreshToken`)

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Tenant Admin | Người thực hiện hành động khóa/vô hiệu hóa thành viên. |
| Member Directory UI | Giao diện bảng thành viên gửi request PATCH status. |
| Spring Security | Kiểm tra quyền `TENANT_ADMIN`/`ADMIN`. |
| TenantWebInterceptor | Giải mã Tenant ID từ header/subdomain và set `TenantContext`. |
| TenantUserController | Tiếp nhận request `PATCH /api/v1/tenant/users/{id}/status`. |
| TenantUserService | Thực thi kiểm tra invariant (chặn self-lock, chặn lock last-admin), cập nhật CSDL và thu hồi Redis session. |
| DedicatedTenantMySQL | CSDL của Tenant chứa bảng `users`. |
| Redis Cache | Bộ nhớ cache lưu phiên refresh token của người dùng. |

## 4. Tiền điều kiện và hậu điều kiện

- **Tiền điều kiện:** Tenant `ACTIVE`; Caller có quyền Admin; Target user nằm trong CSDL Tenant.
- **Thành công:** Trạng thái `users.status` chuyển sang `LOCKED` hoặc `DISABLED`; Refresh Token trên Redis bị hủy; Trả về HTTP 200 OK kèm `UserResponse`.
- **Thất bại:** `401`/`403` Access Error; `400 Bad Request` (Tự khóa chính mình hoặc trạng thái invalid); `404 Not Found`; `409 Conflict` (Chặn khóa admin duy nhất).

## 5. Luồng chính và lỗi

1. Admin chọn thành viên và hành động Khóa/Vô hiệu hóa.
2. Gửi request `PATCH /api/v1/tenant/users/{id}/status`.
3. Kiểm tra nếu `actorId == targetId` -> Trả về `400 Bad Request (SELF_ACTION_FORBIDDEN)`.
4. Tìm kiếm thông tin user trong Tenant DB. Nếu không thấy -> Trả về `404 Not Found`.
5. Đếm số lượng Admin đang `ACTIVE`. Nếu user là Admin cuối cùng -> Trả về `409 Conflict (LAST_ADMIN_PROTECTED)`.
6. Thực hiện `UPDATE users.status = LOCKED / DISABLED`.
7. Đẩy lệnh xóa Refresh Token trên Redis theo key `tenant:{tenantId}:refresh:{userId}`.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

- `Admin`: Người quản trị khởi tạo thao tác khóa.
- `UI`: Giao diện ứng dụng frontend.
- `Security`: Tầng xác thực Spring Security.
- `Interceptor`: `TenantWebInterceptor` xử lý `TenantContext`.
- `Controller`: `TenantUserController` tiếp nhận request.
- `Service`: `TenantUserService` xử lý logic.
- `TenantDB`: CSDL riêng biệt của Tenant.
- `Redis`: Cache quản lý session.

### 6.2. Diễn giải chi tiết các bước

1. Admin thao tác khóa -> `UI` gửi PATCH request đến `/api/v1/tenant/users/{id}/status`.
2. `Spring Security` xác thực quyền hạn. `Interceptor` cài đặt `TenantContext`.
3. `Service` kiểm tra tự khóa chính mình: Nếu `actorId == targetId` -> Trả về 400 Bad Request.
4. `Service` truy vấn `TenantDB.findById(targetId)`: Nếu không thấy -> Trả về 404 Not Found.
5. `Service` đếm Admin `ACTIVE` qua `TenantDB.countByRoleAndStatus`: Nếu target là Admin cuối -> Trả về 409 Conflict.
6. `Service` cập nhật `users.status` trong `TenantDB`.
7. `Service` thu hồi ngay phiên đăng nhập bằng cách xóa key refresh token trên `Redis`.
8. Trả về `UserResponse` kèm HTTP 200 OK. `Interceptor` xóa `TenantContext`.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **Application-design**. Kiến trúc phân tầng Controller -> DTO -> Service -> Repository -> Entity -> Infrastructure.

### 7.1. Vai trò phần tử

| Phần tử | StereoType | Vai trò |
|---|---|---|
| `TenantUserController` | `<<Controller>>` | Controller tiếp nhận yêu cầu thay đổi trạng thái user. |
| `UpdateUserStatusRequest` | `<<Request>>` | DTO chứa trạng thái mới (LOCKED/DISABLED). |
| `UserResponse` | `<<Response>>` | DTO phản hồi dữ liệu sau khi cập nhật. |
| `TenantUserService` | `<<Service>>` | Interface định nghĩa phương thức thay đổi trạng thái. |
| `TenantUserServiceImpl` | `<<Service>>` | Implementation chứa logic bảo vệ admin và xóa session. |
| `UserRepository` | `<<Repository>>` | Repository thao tác bảng `users`. |
| `User` | `<<Entity>>` | Thực thể người dùng tenant. |
| `UserStatus` | `<<Enum>>` | Enum định nghĩa trạng thái (ACTIVE, LOCKED, DISABLED). |
| `DedicatedTenantMySQL` | `<<Database>>` | CSDL riêng biệt của tenant. |
| `RedisCache` | `<<Cache>>` | Bộ nhớ cache thu hồi token. |

### 7.2. Quan hệ giữa các lớp

- `TenantUserController --> TenantUserService`: Ủy quyền xử lý nghiệp vụ (`delegates >`).
- `TenantUserController ..> UpdateUserStatusRequest`: Nhận dữ liệu đầu vào (`consumes >`).
- `TenantUserServiceImpl ..|> TenantUserService`: Hiện thực hóa interface (`implements`).
- `TenantUserServiceImpl --> UserRepository`: Thao tác dữ liệu (`queries & saves >`).
- `TenantUserServiceImpl --> RedisCache`: Thu hồi token phiên đăng nhập (`revokes session on lock/disable >`).
- `UserRepository --> DedicatedTenantMySQL`: Lưu trữ thực thể (`persists to >`).
- `User ..> UserStatus`: Định kiểu trạng thái (`typed by >`).

## 8. Quyết định kiến trúc và bảo mật

- **Self Protection Invariant:** Không cho phép Admin tự khóa chính mình để phòng ngừa thao tác nhầm vô hiệu hóa toàn bộ quyền truy cập cá nhân.
- **Immediate Session Invalidation:** Việc xóa Refresh Token trên Redis khiến phiên làm việc của user bị khóa kết thúc ngay khi Access Token hiện tại hết hạn (vài phút), không thể sinh Access Token mới.

## 9. Giả định

- Không xóa cứng (HARD DELETE) người dùng đã từng có lịch sử tương tác trong hệ thống để bảo đảm toàn vẹn dữ liệu tuyển dụng (Audit log, CV evaluation, Interview rating).

## 10. Hướng dẫn Render sơ đồ

Khi có yêu cầu xuất ảnh PNG từ người dùng:
```powershell
pwsh .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 -InputPath docs/diagram/02-company-management/lock-or-delete-member -Format Png -PngDpi 300
```

## 11. Trạng thái Review

`Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.
