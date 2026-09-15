# JOB-F10 — Browse Public Job Openings

## Mục đích và phạm vi

Cho Guest/Candidate tìm kiếm public jobs và xem job detail trên career page của đúng tenant, chỉ lộ dữ liệu được phép công khai.

## Nguồn và điều kiện

- Nguồn: yêu cầu mục tiêu 3.3, `Job-Publishing.md`, multi-tenant rules trong `AGENTS.md`.
- Actor: Guest, Candidate.
- Tiền điều kiện: hostname ánh xạ tới tenant active; career page enabled.
- Hậu điều kiện: trả public-safe DTO hoặc `404`; không thay đổi dữ liệu.

## Luồng sequence

1. `TenantDomainResolver` xác định tenant từ trusted host/subdomain trước mọi DB access; tenant không hợp lệ trả `404`.
2. Controller gọi query service; service dùng cache key có tenant namespace.
3. Cache miss: service đọc career-page configuration rồi query duy nhất job `PUBLISHED` và chưa hết hạn.
4. Service ẩn salary nếu cấu hình không cho hiển thị và tính `acceptingApplications`.
5. Job paused/closed/expired hoặc slug không tồn tại cùng trả `404`; kết quả hợp lệ trả `200` và được cache.
6. Resolver luôn clear tenant context.

## Class và connector

- Controller **delegates** public query service và consumes/returns public DTO riêng.
- Service implementation **realizes** interface, queries repositories và caches response theo tenant.
- `PublicJobRepository --> Job` và `CareerPageRepository --> CareerPageConfiguration` là associations đọc domain state.
- `Job` **composes** `SalaryRange`; service chỉ **creates** `PublicSalaryRange` khi visibility policy cho phép.
- `TenantDomainResolver --> TenantContext` là dependency thiết lập isolation trước repository access.
- Repository dependencies `reads from` chỉ tới dedicated tenant DB; không có cross-tenant association.

## Quyết định và giả định

- Public endpoint không yêu cầu login nhưng vẫn bắt buộc resolve tenant và rate limit ở gateway/runtime.
- Cache không chứa PII; key gồm tenant, filter/slug và publication version.
- Thời điểm hết hạn dùng timezone đã cấu hình cho tenant; comparison được chuẩn hóa sang `Instant` tại service.

## Generated artifacts

- class-diagram.png — PNG 300 DPI.
- sequence-diagram.png — PNG 300 DPI.

**Review status:** Complete
