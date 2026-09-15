# JOB-F09 — Manage Job Publication Lifecycle

## Mục đích và phạm vi

Thực hiện các transition `publish`, `unpublish`, `pause`, `close`, `reopen`; kiểm tra publication readiness và đồng bộ public/search consumers.

## Nguồn và điều kiện

- Nguồn: `Job-Publishing.md` và yêu cầu target 3.3.
- Actor: Recruiter, Admin.
- Tiền điều kiện: job thuộc tenant/scope; version và transition hợp lệ; publish phải đủ content, requirements và pipeline.
- Hậu điều kiện: trạng thái, timestamp và history được commit; cache evict; event được phát.

## Luồng sequence

1. Request lifecycle đi qua authentication, authorization và tenant resolution.
2. Service tải job với version, sau đó gọi `JobPublicationPolicy` kiểm tra transition/readiness.
3. Job thiếu, version conflict, transition sai hoặc cấu hình thiếu trả `404/409/422`.
4. Job hợp lệ tự áp dụng transition; repository lưu job và status history trong cùng transaction.
5. Sau commit, service evict cache và phát event mang tenant header; API trả trạng thái hiện tại.
6. Tenant context được clear trong `finally`.

## Class và connector

- Controller **delegates** service và chỉ tiếp xúc DTO.
- Service implementation **realizes** contract, phụ thuộc `JobPublicationPolicy`, repositories và infrastructure ports.
- `Job` **composes** status history vì lịch sử thuộc vòng đời job; enum dependencies mô tả state/action.
- Publisher và cache là directed dependencies để giữ entity độc lập hạ tầng.
- Repository connectors `persists to` tenant DB; publisher connector `publishes to` queue thể hiện async integration.

## Quyết định và giả định

- Target transitions: `DRAFT→PUBLISHED`, `PUBLISHED→DRAFT/PAUSED/CLOSED`, `PAUSED→PUBLISHED/CLOSED`, `CLOSED→PUBLISHED` khi reopen.
- Chỉ `PUBLISHED` và chưa quá deadline nhận application.
- Event delivery cần outbox/idempotent consumers; RabbitMQ worker phải restore/clear tenant context.

## Generated artifacts

- class-diagram.png — PNG 300 DPI.
- sequence-diagram.png — PNG 300 DPI.

**Review status:** Complete

