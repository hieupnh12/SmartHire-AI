# FE13-F03 — Export Recruitment Analytics

- **Feature:** `FE13`
- **Function:** `export-recruitment-analytics`
- **Góc nhìn:** Application design theo kiến trúc mục tiêu
- **Trạng thái:** `Complete`

## Mục đích và phạm vi

Recruiter hoặc Tenant Admin có quyền tạo CSV/PDF từ đúng filter, timezone, report sections và `metricVersion` trên dashboard. Thiết kế dùng job bất đồng bộ để hỗ trợ PDF và tập dữ liệu lớn; kết quả nằm trong object storage riêng tư với URL tải ngắn hạn.

## Nguồn đã đối chiếu

`DESIGN.md`, `DASH-01..03`, yêu cầu FE13 và hai function F01/F02. Đây là thiết kế đích của dự án. Việc chọn RabbitMQ phù hợp quy ước job bất đồng bộ trong `AGENTS.md`.

## Điều kiện và kết quả

- Tiền điều kiện: user đã xác thực, tenant active, có `EXPORT_ANALYTICS`, request dùng metric version hợp lệ.
- Thành công ban đầu: HTTP 202 và job `QUEUED`.
- Thành công cuối: job `READY`, file riêng tư có expiry và audit trail.
- Lỗi: 401/403; 400; `FAILED` với error code an toàn; `EXPIRED` khi quá retention.

## Giải thích sequence

1. UI gửi format, sections và snapshot ngữ cảnh dashboard.
2. Guard kiểm tra quyền export và set tenant. Nhánh từ chối kết thúc trước mọi ghi dữ liệu.
3. Service validate, tạo job `QUEUED`, audit và publish message mang `X-Tenant-ID` cùng correlation ID; HTTP trả 202, không chờ render.
4. Worker kiểm tra tenant trong header/message, restore context và claim job nguyên tử. Nhánh duplicate không tạo file lần hai.
5. Worker tải snapshot theo exact metric version, tạo CSV/PDF, lưu object mã hóa rồi chuyển job sang `READY`. Context luôn clear trong `finally`.
6. UI poll trạng thái. Nhánh `FAILED` chỉ trả safe error code; nhánh `READY` tạo signed URL ngắn hạn; nhánh còn lại tiếp tục poll. Mỗi lần truy cập đều authorize lại và audit việc cấp link.

## Giải thích class và connector

- `AnalyticsExportRoute` là REST boundary khái niệm và có **dependency** `defines routes` tới controller.
- Controller **association** tới `AnalyticsExportService`; request/response DTO là dependencies tại API boundary.
- `AnalyticsExportServiceImpl` **realization** (`implements`) service contract và có **association** tới repository, publisher, queue và audit vì quản lý vòng đời request.
- `ExportJobRepository` **dependency** tới `AnalyticsExportJob` (quản lý persistence) và **association** tới tenant DB.
- Queue **association** tới worker thể hiện delivery bất đồng bộ; message là dependency/payload, không phải domain ownership.
- Worker **association** tới snapshot repository và report builder; builder **association** tới private storage.
- Không dùng inheritance, aggregation hoặc composition. Realization được dùng cho service contract; repository interfaces vẫn là persistence ports.

## Multi-tenant, security, transaction, async và audit

- Producer truyền `X-Tenant-ID`; consumer đối chiếu header với payload, set context trước DB và clear trong `finally`.
- Job, snapshot và authorization nằm trong dedicated tenant DB. Object key phải partition theo tenant và không công khai.
- Tạo job + outbox/publish cần transactional-outbox hoặc cơ chế tương đương để không mất message; claim job phải idempotent trước retry.
- Không ghi PII/filter payload đầy đủ vào log. Audit tối thiểu gồm requester, tenant, job ID, format, timestamp, trạng thái và correlation ID.
- File mã hóa at rest, signed URL TTL ngắn, retention tự động và quyền được kiểm tra lại khi poll/download.

## Giả định

- CSV và PDF đều đi qua cùng async pipeline để hành vi nhất quán.
- API mục tiêu: `POST /api/v1/dashboard/exports`, `GET /api/v1/dashboard/exports/{id}`.
- Worker có retry hữu hạn và dead-letter queue; sau ngưỡng retry job chuyển `FAILED`.
- Notification khi hoàn tất có thể bổ sung sau, nhưng không thuộc observable outcome bắt buộc của function này.

## Kiểm tra và render

```powershell
pwsh -File .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 -InputPath docs/diagram/13-recruitment-dashboard-analytics/export-recruitment-analytics -ValidateOnly
```

Đã tạo `class-diagram.png` và `sequence-diagram.png` bằng PlantUML 1.2026.8. Cả hai file đã được gắn và kiểm tra metadata 300 DPI, đồng thời kiểm tra trực quan để bảo đảm không clipping.
