# JOB-F03 — Update Job Details

## Mục đích và phạm vi

Cập nhật nội dung và thông tin vận hành của job, có ownership check, optimistic version và đồng bộ các read model liên quan.

## Nguồn và điều kiện

- Nguồn: `Job-CRUD.md`, `Job-Publishing.md`, yêu cầu mục tiêu 3.3.
- Actor: Recruiter, Admin.
- Tiền điều kiện: job thuộc tenant, principal có quyền quản lý và `expectedVersion` khớp.
- Hậu điều kiện: job/version được cập nhật; cache bị evict; `JobUpdatedEvent` được phát.

## Luồng sequence

1. Request đi qua interceptor và trusted authorization boundary.
2. Service đọc job bằng `findAuthorized`; không tồn tại/không có quyền trả `404` để tránh lộ dữ liệu.
3. Version cũ trả `409`; rule nội dung hoặc trạng thái không hợp lệ trả domain error.
4. Service cập nhật entity và commit bằng version check.
5. Sau commit, cache tenant bị evict và event mang tenant header được publish; API trả `200`.
6. Tenant context luôn được clear.

## Class và connector

- Controller **delegates** service và chỉ consumes/returns DTO.
- Service implementation **realizes** interface, association tới repository và infrastructure ports.
- Repository **manages** `Job` và **persists to** tenant DB.
- Service **creates** event; publisher dependency biểu diễn tích hợp async, không coupling entity với RabbitMQ.
- `JobCache` là cache port; connector `evicts` cho biết update làm mất hiệu lực read model.

## Quyết định và giả định

- Dùng optimistic locking bằng `version`.
- Event cần outbox hoặc after-commit publisher khi triển khai để tránh DB thành công nhưng event mất; đây là quyết định implementation còn mở.
- Field nhạy cảm và PII không nằm trong event; changed fields chỉ chứa tên thuộc tính.

## Generated artifacts

- class-diagram.png — PNG 300 DPI.
- sequence-diagram.png — PNG 300 DPI.

**Review status:** Complete

