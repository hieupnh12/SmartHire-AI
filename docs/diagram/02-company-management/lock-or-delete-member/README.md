# COMPANY-04 — Khóa hoặc xóa thành viên

- **Mã Feature:** `COMPANY` / `02-company-management`
- **Mã Function:** `lock-or-delete-member`
- **Thư mục:** `docs/diagram/02-company-management/lock-or-delete-member`
- **Trạng thái Review:** `Complete with assumptions`

---

## 1. Mục đích và phạm vi

Tenant Admin khóa (`LOCKED`), mở khóa (`ACTIVE`) hoặc xóa thành viên trong Tenant DB. Khóa đảo ngược được. Xóa ưu tiên soft-delete `DISABLED` khi user còn sở hữu job. Không đổi role và không mời user mới.

`UserStatus` lấy từ code: `ACTIVE`, `LOCKED`, `DISABLED` — không dùng `INACTIVE` của UI mock.

## 2. Nguồn đã đối chiếu

- `User`, `UserStatus`, `UserRole`, `UserRepository`
- `TenantUserService` (chưa có updateStatus/delete)
- `jobs.created_by` → `users.id` trong `V1__init_tenant_schema.sql` (cản hard-delete)
- `SecurityConfig`, AUTH Redis refresh-token convention
- UI `handleToggleMemberStatus` (ACTIVE/INACTIVE)

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Tenant Admin | Chọn khóa, mở khóa hoặc xóa. |
| Member Directory UI | PATCH status hoặc DELETE. |
| Spring Security | `TENANT_ADMIN`/`ADMIN`. |
| TenantWebInterceptor | `TenantContext`. |
| TenantUserController | Hai operation lifecycle. |
| TenantUserService | Chặn self-target và last admin; chọn soft/hard delete. |
| Tenant DB | `users.status` hoặc xóa dòng. |
| Redis | Thu hồi session khi khóa hoặc xóa. |

## 4. Tiền điều kiện và hậu điều kiện

**Tiền:** tenant `ACTIVE`; caller admin; target khác actor.

**Khóa thành công:** status `LOCKED`; refresh token xóa; không đăng nhập được.

**Mở khóa:** status `ACTIVE`; user phải login lại.

**Xóa thành công:** `DISABLED` nếu còn job; hard-delete nếu không còn tham chiếu; session bị revoke; `204`.

**Thất bại:** `401`/`403`; `404`; `409` self-target hoặc last admin.

## 5. Luồng chính và lỗi

Hai nhánh `alt` song song: PATCH status **hoặc** DELETE. Cùng invariant: không tự thao tác, không động vào admin `ACTIVE` cuối.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

Redis bắt buộc khi khóa/xóa để JWT/refresh cũ ngừng gia hạn. `countJobOwnership` quyết định soft vs hard delete.

### 6.2. Diễn giải bước

Nhánh ngoài: admin chọn lock/unlock **hoặc** delete.

**Lock / unlock**

1. UI `PATCH /api/v1/tenant/users/{id}/status`.
2. 401/403: dừng.
3. Interceptor đặt tenant.
4. Controller → `updateStatus`.
5. `findById`.
6. User hoặc empty.
7. Thiếu / tự thao tác / last admin: `404` hoặc `409 MEMBER_LIFECYCLE_BLOCKED`.
8. Được phép: `UPDATE` `ACTIVE` hoặc `LOCKED`.
9. Xác nhận.
10. `opt` sang `LOCKED`: revoke Redis.
11. Redis xác nhận.
12. `UserResponse` → `200`; UI cập nhật trạng thái; `clear()`.

**Delete**

13. UI `DELETE /api/v1/tenant/users/{id}`.
14. 401/403: dừng.
15. Interceptor đặt tenant.
16. `deleteMember`.
17. `findById`.
18. Cùng chặn self/last admin.
19. `countJobOwnership` (jobs `created_by` và tham chiếu khác nếu có).
20. Số job.
21. Revoke Redis **trước** khi mất tài khoản, kể cả soft-delete.
22. Redis xác nhận.
23. Còn lịch sử: `DISABLED` — giữ FK job.
24. Không lịch sử: `DELETE` row.
25. Success → `204`; UI gỡ khỏi directory; `clear()`.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **layered application-design** (`Routing & Boundary` → `Controller` → `Service` → `DTO` → `Repository` → `Domain Entity` → `Infrastructure`). Isolation qua `TenantContext` và database, không prefix `Tenant` trên mọi package.

### 7.1. Vai trò phần tử

| Phần tử | Loại | Vai trò |
|---|---|---|
| `MemberLifecycleRoute` | conceptual API | PATCH status + DELETE. |
| `TenantUserController` | hiện có | Thêm method thiết kế. |
| `UpdateMemberStatusRequest` | conceptual DTO | `ACTIVE` hoặc `LOCKED`. |
| `UserResponse` | hiện có | Kết quả lock/unlock. Delete không body. |
| Interceptor / TenantContext | hiện có | Cách ly. |
| `TenantUserService` | hiện có | Thêm lifecycle methods. |
| `RedisSessionService` | conceptual | Revoke. |
| `User` / enums | hiện có | Status máy trạng thái. |
| `UserRepository` | hiện có + `countJobOwnership` conceptual | Quyết định soft/hard. |

### 7.2. Quan hệ

| Nguồn → đích | Ký pháp | Loại và lý do |
|---|---|---|
| Route → Controller | `..>` | Dependency định tuyến. |
| Controller → UpdateMemberStatusRequest | `..>` | Dependency input lock. |
| Controller → UserResponse | `..>` | Dependency output lock. |
| Controller → TenantUserService | `-->` | Association inject. |
| Interceptor → TenantContext | `..>` | Dependency set/clear. |
| Service → UserRepository | `-->` | Association persist/delete. |
| Service → RedisSessionService | `-->` | Association revoke (luôn khi lock/delete). |
| Service → UpdateMemberStatusRequest | `..>` | Dependency input. |
| User → UserRole / UserStatus | `-->` | Typed-by. |
| Repository → User | `..>` | Manage. |

Không composition User–Job trên sơ đồ này: ownership chỉ là điều kiện đếm.

## 8. Quyết định kiến trúc và bảo mật

- **Lock vs delete:** lock giữ row và đảo ngược; delete bỏ khỏi directory, ưu tiên `DISABLED`.
- **Last admin / self:** tránh tenant orphan và tránh admin tự khóa mình.
- **Transaction:** đổi status/delete một transaction tenant; Redis sau khi quyết định được phép.
- **Privacy:** `404` cho user không tồn tại, không phân biệt ID người khác tenant (ID vốn không xuyên DB).

## 9. Giả định

- Endpoint status/delete chưa implement.
- UI `INACTIVE` = `LOCKED`.
- Hard-delete chỉ khi không còn job `created_by`; application history nếu có cũng buộc soft-delete (cùng `countJobOwnership`).
- Không vẽ audit log vì chưa có contract.

## 10. Render và file được tạo

| File | Metadata |
|---|---|
| [class-diagram.png](class-diagram.png) | PNG, ít nhất 300 DPI |
| [sequence-diagram.png](sequence-diagram.png) | PNG, ít nhất 300 DPI |

Đã kiểm tra trực quan; nhãn `alt` dài được rút thành `Lifecycle blocked` (user thiếu, tự thao tác, hoặc admin cuối). Không tạo SVG.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File ./.agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/02-company-management/lock-or-delete-member `
  -PlantUmlJar "$env:LOCALAPPDATA\PlantUML\plantuml-1.2026.7.jar" `
  -Format Png `
  -PngDpi 300
```

PlantUML 1.2026.7. Script xác minh DPI PNG ≥ 300 cho cả hai chiều.

## 11. Trạng thái review

`Complete with assumptions` — nguồn và PNG 300 DPI đã xong.
