# FE-17 — System Log & Tenant Audit

Ghi nhận sự kiện kỹ thuật cấp nền tảng, audit thao tác trong từng tenant, và cho Workspace Admin tìm kiếm/theo dõi để xử lý sự cố.

| ID | Function | Thư mục | Phạm vi chính |
|---|---|---|---|
| FE17-F01 | System Log Tracking | [`system-log-tracking`](system-log-tracking/) | Ghi `system_logs` vào Master DB |
| FE17-F02 | Tenant Audit Tracking | [`tenant-audit-tracking`](tenant-audit-tracking/) | Ghi `audit_logs` vào Tenant DB |
| FE17-F03 | Log Search & Monitoring | [`log-search-monitoring`](log-search-monitoring/) | Workspace Admin search/filter |

## Quyết định đã chốt

| Hạng mục | Quyết định |
|---|---|
| Lưu trữ | **A** — System log ở Master PostgreSQL; Tenant audit ở Dedicated Tenant MySQL |
| Actor search | **1** — Chỉ Workspace Admin (cross-tenant monitoring) |
| Code hiện tại | Mock `GET /api/v1/master/analytics/logs` + tab Logs trên Master Dashboard; UML mô tả thiết kế đích |

## Ranh giới Master / Tenant

- **Master:** lỗi hạ tầng, auth nền tảng, provisioning, cảnh báo pool/connection, sự kiện vận hành.
- **Tenant:** ai làm gì, trên đối tượng nào, lúc nào — append-only trong DB doanh nghiệp.
- Search (F03) đọc Master cho system log; khi lọc audit theo tenant thì resolve registry → set `TenantContext` → đọc đúng Tenant DB → `clear()` trong `finally`.
