# COMPANY-03 — Đổi role thành viên

- **Mã Feature:** `COMPANY` / `02-company-management`
- **Mã Function:** `change-member-role`
- **Thư mục:** `docs/diagram/02-company-management/change-member-role`
- **Trạng thái Review:** `Complete with assumptions`

---

## 1. Mục đích và phạm vi

Tenant Admin đổi `User.role` của một thành viên trong cùng Tenant DB, kèm chặn hạ quyền admin cuối cùng. Không mời thành viên mới và không khóa/xóa. Không thiết kế ma trận permission (`AUTH-04`); JWT vẫn mang một `role`.

## 2. Nguồn đã đối chiếu

- `User`, `UserRole`, `UserStatus`, `UserRepository`, `UserResponse`
- `TenantUserController` / `TenantUserService` (chưa có `changeRole`)
- `SecurityConfig`, `docs/features/Authentication/RBAC.md`
- UI workspace member directory (hiển thị role, chưa có API đổi role)

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Tenant Admin | Chọn member và role mới. |
| Member Directory UI | Gửi PATCH và hiển thị role. |
| Spring Security | Chỉ `TENANT_ADMIN`/`ADMIN`. |
| TenantWebInterceptor | `TenantContext`. |
| TenantUserController | Validate role token. |
| TenantUserService | Invariant last-admin và persist. |
| Tenant DB | Cột `users.role`. |
| Redis | Thu hồi refresh token khi giảm quyền. |

## 4. Tiền điều kiện và hậu điều kiện

**Tiền:** tenant `ACTIVE`; caller admin; target tồn tại, không `DISABLED`.

**Thành công:** `users.role` đổi; nếu giảm quyền thì refresh token bị xóa; `200 UserResponse`.

**Thất bại:** `401`/`403`; `400 INVALID_ROLE`; `404`; `409 LAST_ADMIN_PROTECTED`.

## 5. Luồng chính và lỗi

PATCH role → validate → load user → đếm `TENANT_ADMIN` `ACTIVE` → save → optional revoke session.

Cấm gán `CANDIDATE` cho staff. Cấm demote admin cuối (kể cả tự demote).

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

Redis chỉ cần khi giảm quyền: access token cũ còn role cao đến khi hết TTL, refresh token phải bị thu hồi ngay.

### 6.2. Diễn giải bước

1. Admin chọn member + role — trigger.
2. `PATCH /api/v1/tenant/users/{id}/role`.
3. 401/403: dừng.
4. Interceptor đặt tenant.
5. Controller nhận request.
6. Validate enum role.
7. Role lạ hoặc `CANDIDATE`: `400`, chưa đọc DB nghiệp vụ (hoặc đọc sau; sơ đồ chặn sớm).
8. `changeRole(actorId, targetId, role)`.
9. `findById`.
10. Kết quả từ DB.
11. Không thấy hoặc `DISABLED`: `404` — không lộ chi tiết.
12. User hợp lệ: đếm admin đang `ACTIVE`.
13. Số đếm.
14. Demote admin cuối: `409 LAST_ADMIN_PROTECTED` — tenant không mất người quản trị.
15. Được phép: `UPDATE users.role`.
16. Xác nhận save.
17. `opt` giảm quyền: xóa refresh token Redis theo `tenant:{tenantId}:refresh:{userId}` (cùng quy ước AUTH).
18. Redis xác nhận.
19. `UserResponse`.
20. `200`.
21. UI cập nhật badge role; `clear()`.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **layered application-design** (`Routing & Boundary` → `Controller` → `Service` → `DTO` → `Repository` → `Domain Entity` → `Infrastructure`). Isolation qua `TenantContext` và database, không prefix `Tenant` trên mọi package.

### 7.1. Vai trò phần tử

| Phần tử | Loại | Vai trò |
|---|---|---|
| `ChangeMemberRoleRoute` | conceptual API | Một endpoint. |
| `TenantUserController` | controller hiện có | Thêm method thiết kế. |
| `ChangeRoleRequest` | conceptual DTO | Chỉ field `role`. |
| `UserResponse` | DTO hiện có | Trả role mới. |
| Interceptor / TenantContext | hiện có | Cách ly DB. |
| `TenantUserService` | service hiện có | Thêm `changeRole`; hiện chỉ create/list. |
| `RedisSessionService` | conceptual (AUTH) | Revoke session. |
| `User` / enums | hiện có | `UserStatus` theo code: ACTIVE, LOCKED, DISABLED. |
| `UserRepository` | hiện có + method conceptual `countByRoleAndStatus` | Đếm admin cuối. |

### 7.2. Quan hệ

| Nguồn → đích | Ký pháp | Loại và lý do |
|---|---|---|
| Route → Controller | `..>` | Dependency định tuyến. |
| Controller → ChangeRoleRequest | `..>` | Dependency input. |
| Controller → UserResponse | `..>` | Dependency output. |
| Controller → TenantUserService | `-->` | Association inject. |
| Interceptor → TenantContext | `..>` | Dependency set/clear. |
| Service → UserRepository | `-->` | Association persist. |
| Service → RedisSessionService | `..>` | Dependency chỉ khi demote. |
| Service → ChangeRoleRequest | `..>` | Dependency input. |
| User → UserRole / UserStatus | `-->` | Typed-by. |
| Repository → User | `..>` | Manage entity. |

Không inheritance: một cột `role`, không bảng `permissions`.

## 8. Quyết định kiến trúc và bảo mật

- **RBAC:** role trên `users` + JWT; đổi role không tự sửa JWT đang chạy — vì vậy revoke refresh khi giảm quyền.
- **Last admin:** đếm `TENANT_ADMIN` + `ACTIVE` trong cùng Tenant DB.
- **Transaction:** một transaction tenant cho đọc đếm + update; Redis sau commit.
- **Candidate:** không đổi thành staff qua API này (ngược lại cũng không biến recruiter thành candidate ở function này).

## 9. Giả định

- Endpoint PATCH role chưa implement.
- `countByRoleAndStatus` chưa có trên repository.
- Giảm quyền = bất kỳ chuyển từ `TENANT_ADMIN`/`ADMIN` sang `HR`/`RECRUITER`.
- UI mock `HIRING_MANAGER`/`INTERVIEWER` không đưa vào enum backend.

## 10. Render và file được tạo

| File | Metadata |
|---|---|
| [class-diagram.png](class-diagram.png) | PNG, ít nhất 300 DPI |
| [sequence-diagram.png](sequence-diagram.png) | PNG, ít nhất 300 DPI |

Đã kiểm tra trực quan. Không tạo SVG.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File ./.agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/02-company-management/change-member-role `
  -PlantUmlJar "$env:LOCALAPPDATA\PlantUML\plantuml-1.2026.7.jar" `
  -Format Png `
  -PngDpi 300
```

PlantUML 1.2026.7. Script xác minh DPI PNG ≥ 300 cho cả hai chiều.

## 11. Trạng thái review

`Complete with assumptions` — nguồn và PNG 300 DPI đã xong.
