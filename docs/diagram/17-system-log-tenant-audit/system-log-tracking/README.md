# FE17-F01 — System Log Tracking

- **Feature:** `17 / system-log-tenant-audit`
- **Function:** `system-log-tracking`
- **Góc nhìn:** Application design (thiết kế đích; code hiện mock list logs)
- **Trạng thái:** `Complete`

## Mục đích và phạm vi

Hệ thống ghi nhận sự kiện kỹ thuật cấp nền tảng: authentication events (master), lỗi ứng dụng, cảnh báo hạ tầng (pool, provisioning) để hỗ trợ xử lý sự cố.

**Trong phạm vi:** luồng ingest append-only vào Master PostgreSQL (`system_logs`).

**Ngoài phạm vi:** audit thao tác user trong tenant (F02), UI search/filter (F03), log shipping sang ELK/SIEM.

## Nguồn đã đối chiếu

- Quyết định người dùng: lưu trữ **A**, search actor **1**.
- `MasterAnalyticsController.getSystemAuditLogs()` — mock `GET /api/v1/master/analytics/logs`.
- `masterAdminApi.getAuditLogs()`, tab Logs trên `MasterAdminDashboardPage.tsx`.
- `SecurityConfig` — `/api/v1/master/**` yêu cầu `WORKSPACE_ADMIN`.
- `AGENTS.md` — Master vs Tenant Separate DB; không log PII/token.
- Chưa có entity/migration `system_logs` — UML ghi rõ đây là thiết kế đích.

## Actor, điều kiện và kết quả

- **Actor:** producer nội bộ (auth adapter, provisioning, infra monitor) — không phải end-user UI.
- **Tiền điều kiện:** Master persistence sẵn sàng; command có `action`/`message` hợp lệ sau sanitize.
- **Hậu điều kiện (thành công):** một bản ghi `system_logs` với `level`, `category`, `occurredAt`.
- **Kết quả lỗi:** command invalid → không ghi; lỗi ghi Master → fail-open (không làm fail nghiệp vụ chính) trừ khi policy bảo mật yêu cầu fail-closed.

## Trách nhiệm trong sequence

1. Producer phát sự kiện kỹ thuật/auth/infra.
2. Adapter map sang `SystemLogRecordCommand`, loại bỏ secret/PII thừa.
3. `SystemLogService` validate; nhánh invalid bỏ qua persistence.
4. Nhánh hợp lệ dựng `SystemLog` và `INSERT` vào Master DB.
5. Ack best-effort về producer; lỗi ghi log không rollback nghiệp vụ chính (fail-open mặc định).

## Trách nhiệm và quan hệ trong class diagram

- `AuthEventLogAdapter` / `InfraEventLogAdapter` **association** `delegates >` tới `SystemLogService` — điểm vào từ auth/infra.
- `SystemLogService` **realization** bởi `SystemLogServiceImpl`; Impl **dependency** xử lý command/event và **association** `persists through >` repository.
- `SystemLogRepository` **association** `manages >` entity `SystemLog` và `persists to >` Master PostgreSQL.
- `SystemLog` **dependency** `typed by >` `SystemEventCategory` và `LogLevel`.
- `SystemLogController` giữ mỏng (health/probe); không thay search API của F03.
- Không inheritance/composition cho vòng đời log; append-only, không update/delete nghiệp vụ.

## Multi-tenant, bảo mật và vận hành

- Chỉ ghi **Master DB**; `tenantCode` là metadata tùy chọn (khi sự kiện liên quan một tenant), không phải FK sang Tenant DB.
- Không lưu password, JWT, connection string, stack trace chứa secret.
- Correlation ID khuyến nghị để ghép với request/job.
- Retention/rotation: giả định chính sách vận hành (chưa chốt số ngày) — ghi trong Assumptions.

## Giả định và quyết định đã chốt

| Hạng mục | Quyết định |
|---|---|
| Bảng đích | `system_logs` trên Master PostgreSQL |
| Mức độ | `INFO` / `WARN` / `ERROR` (khớp UI filter hiện tại) |
| Fail policy | Fail-open mặc định với primary business path |
| API list | Không thuộc F01; thuộc F03 |
| Code hiện tại | Mock map; cần Flyway master + service thật khi implement |

## Kiểm tra và render

Đã validate + render PNG 300 DPI (PlantUML 1.2026.8). Đã kiểm tra metadata DPI và kiểm tra trực quan (không clipping nội dung chính).

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/17-system-log-tenant-audit/system-log-tracking `
  -Format Png -PngDpi 300 `
  -PlantUmlJar .agents/skills/enterprise-uml-diagram/tools/plantuml.jar
```

**Review status:** `Complete`
