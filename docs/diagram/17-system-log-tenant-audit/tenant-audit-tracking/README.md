# FE17-F02 — Tenant Audit Tracking

- **Feature:** `17 / system-log-tenant-audit`
- **Function:** `tenant-audit-tracking`
- **Góc nhìn:** Application design (thiết kế đích)
- **Trạng thái:** `Complete`

## Mục đích và phạm vi

Lưu lịch sử thao tác của người dùng trong từng company/tenant: người thực hiện, hành động, thời gian và đối tượng bị tác động.

**Trong phạm vi:** append-only `audit_logs` trong Dedicated Tenant MySQL; minh họa bằng luồng cập nhật Job (đại diện cho các use case tenant khác tái sử dụng `TenantAuditService`).

**Ngoài phạm vi:** system/infra log Master (F01), UI search cross-tenant (F03), xuất file SIEM.

## Nguồn đã đối chiếu

- Quyết định người dùng: **A** (audit trong Tenant DB), search chỉ Workspace Admin (**1**).
- `AGENTS.md` — Separate Database per Tenant; `TenantContext` bắt buộc trước mọi truy cập Tenant DB.
- Pattern audit trong diagram khác (ranking override, analytics export) — append-only evidence.
- Chưa có bảng `audit_logs` trong Flyway tenant — thiết kế đích.

## Actor, điều kiện và kết quả

- **Actor nghiệp vụ:** `RECRUITER` / `TENANT_ADMIN` (trigger hành động).
- **Actor kỹ thuật ghi audit:** `TenantAuditService` sau khi business write thành công.
- **Tiền điều kiện:** JWT hợp lệ; tenant active; `TenantContext` đã set; resource thuộc tenant hiện tại.
- **Hậu điều kiện (thành công):** business entity đã cập nhật **và** một dòng `audit_logs` (actor, action, resource, time).
- **Kết quả lỗi:** `401`/`403`; `404` resource; nếu policy “audit bắt buộc” thì lỗi insert audit rollback cả transaction.

## Trách nhiệm trong sequence

1. User lưu thay đổi Job qua UI tenant.
2. Security xác thực; interceptor set `TenantContext`.
3. `JobService` tải và cập nhật Job trong Tenant DB.
4. Sau UPDATE thành công, gọi `TenantAuditService.record` với actor/action/resource/summary/ip.
5. `INSERT audit_logs` cùng tenant DB; trả `200` + `JobResponse`.
6. Interceptor `TenantContext.clear()` trong `finally`.

Nhánh `alt` unauthorized và job-not-found kết thúc trước khi ghi audit.

## Trách nhiệm và quan hệ trong class diagram

- `JobController` **dependency** consumes/returns DTO; **association** `delegates >` `JobService`.
- `JobServiceImpl` **association** tới `JobRepository` và `TenantAuditService`; **association** tới `TenantContext`.
- `TenantAuditService` **realization** bởi `TenantAuditServiceImpl`; Impl **association** `persists through >` `AuditLogRepository`.
- `AuditLogRepository` / `JobRepository` **association** tới entity tương ứng và `persists to >` Tenant MySQL.
- `AuditLog` **dependency** `typed by >` `AuditAction` (catalog hành động chuẩn hóa).
- Job chỉ là **use case đại diện**; không suy diễn mọi controller đều xuất hiện trên một sơ đồ.

## Multi-tenant, bảo mật và vận hành

- Không ghi Master DB trong F02; không có association xuyên tenant.
- Không nhúng `tenantId` trên entity tenant (DB-per-tenant).
- `summary`/`metadataJson` không chứa password, JWT, nội dung CV thô.
- Append-only; không API xóa audit cho end-user.
- Retention theo chính sách tenant/compliance (chưa chốt số ngày).

## Giả định và quyết định đã chốt

| Hạng mục | Quyết định |
|---|---|
| Bảng đích | `audit_logs` trên Tenant MySQL |
| Transaction | Audit cùng transaction với business write (fail-closed khi cần chứng cứ) |
| Use case minh họa | Update Job — tái sử dụng service cho CV/ranking/hiring |
| Search đọc audit | Thuộc F03 (Workspace Admin resolve tenant rồi đọc) |

## Kiểm tra và render

Đã validate + render PNG 300 DPI (PlantUML 1.2026.8). Đã kiểm tra metadata DPI và kiểm tra trực quan (không clipping nội dung chính).

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/17-system-log-tenant-audit/tenant-audit-tracking `
  -Format Png -PngDpi 300 `
  -PlantUmlJar .agents/skills/enterprise-uml-diagram/tools/plantuml.jar
```

**Review status:** `Complete`
