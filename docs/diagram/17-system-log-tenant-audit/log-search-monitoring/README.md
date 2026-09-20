# FE17-F03 — Log Search & Monitoring

- **Feature:** `17 / system-log-tenant-audit`
- **Function:** `log-search-monitoring`
- **Góc nhìn:** Application design (thiết kế đích; UI hiện filter level phía client trên mock list)
- **Trạng thái:** `Complete`

## Mục đích và phạm vi

Workspace Admin tìm kiếm, lọc và theo dõi log theo tenant, user, loại hành động, thời gian hoặc loại/mức sự kiện để phát hiện hoạt động bất thường.

**Trong phạm vi:**
- `GET /api/v1/master/logs/system` — search `system_logs` (Master).
- `GET /api/v1/master/logs/audit?tenantCode=...` — resolve tenant rồi search `audit_logs` (Tenant DB).

**Ngoài phạm vi:** ingest (F01/F02), Tenant Admin self-service audit UI, fan-out query mọi tenant cùng lúc, SIEM export.

## Nguồn đã đối chiếu

- Quyết định người dùng: lưu trữ **A**, actor search **1** (chỉ Workspace Admin).
- Mock `GET /api/v1/master/analytics/logs` + filter level trên `MasterAdminDashboardPage.tsx`.
- `SecurityConfig` — `/api/v1/master/**` → `WORKSPACE_ADMIN`.
- `TenantContext` / Separate DB — bắt buộc khi đọc audit tenant.
- Endpoint path đích tách khỏi analytics mock (`/master/logs/...`) để rõ trách nhiệm search.

## Actor, điều kiện và kết quả

- **Actor:** `WORKSPACE_ADMIN`.
- **Tiền điều kiện:** JWT master hợp lệ; với audit search bắt buộc `tenantCode` tồn tại và tenant dùng được.
- **Hậu điều kiện (thành công):** trang kết quả an toàn (`PageResponse`) không chứa secret.
- **Kết quả lỗi:** `401`/`403`; `400` thiếu `tenantCode` (audit); `404`/`409` tenant; không lộ tồn tại account ngoài thông báo tenant.

## Trách nhiệm trong sequence

1. Admin mở tab Logs; gọi search system logs với filter level/tenantCode/time/page.
2. Security chặn nếu không phải Workspace Admin.
3. Service đọc Master `system_logs`, trả page; UI render bảng.
4. Fragment `opt`: admin chọn tenant + filter actor/action/time → gọi audit search.
5. Service tra `tenants` trên Master; nhánh không hợp lệ trả lỗi trước khi đụng Tenant DB.
6. Nhánh hợp lệ: `TenantContext.set` → `SELECT audit_logs` → `clear()` trong `finally` → trả page.
7. UI hiển thị audit rows; có thể đánh dấu bất thường theo rule đơn giản (ví dụ hàng loạt `DELETE`/`EXPORT`).

## Trách nhiệm và quan hệ trong class diagram

- `MasterLogSearchController` **association** `delegates >` `LogSearchService`; **dependency** consumes request / returns response + `PageResponse`.
- `LogSearchService` **realization** bởi `LogSearchServiceImpl`.
- Impl **association** `queries >` `SystemLogRepository`, `AuditLogRepository`, `TenantInfoRepository` và `TenantContext`.
- System path: repository **reads from >** Master PostgreSQL.
- Audit path: `TenantInfoRepository` đọc Master; `AuditLogRepository` **reads from >** Tenant MySQL sau khi context đã set.
- Entity `SystemLog` / `AuditLog` khớp F01/F02; không expose entity ra API.

## Multi-tenant, bảo mật và vận hành

- Chỉ Workspace Admin; không có API Tenant Admin trong function này.
- Audit search **bắt buộc** chọn một `tenantCode` — không quét toàn bộ tenant DB.
- Luôn `TenantContext.clear()` trong `finally` sau audit query.
- Response không chứa password, JWT, connection string, PII thừa.
- Pagination server-side là thiết kế đích (UI hiện filter client trên mock).

## Giả định và quyết định đã chốt

| Hạng mục | Quyết định |
|---|---|
| Actor | Workspace Admin only |
| System vs Audit API | Hai endpoint riêng |
| Tenant audit access | Resolve Master registry → set context → đọc 1 Tenant DB |
| Path đích | `/api/v1/master/logs/system` và `/audit` (thay mock analytics/logs khi implement) |
| Anomaly rules | UI/heuristics nhẹ; không ML trong scope |

## Kiểm tra và render

Đã validate + render PNG 300 DPI (PlantUML 1.2026.8). Đã kiểm tra metadata DPI và kiểm tra trực quan (không clipping nội dung chính).

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/17-system-log-tenant-audit/log-search-monitoring `
  -Format Png -PngDpi 300 `
  -PlantUmlJar .agents/skills/enterprise-uml-diagram/tools/plantuml.jar
```

**Review status:** `Complete`
