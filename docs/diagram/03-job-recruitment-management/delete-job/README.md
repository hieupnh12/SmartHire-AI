# JOB-F04 — Delete Job

## Mục đích và phạm vi

Xử lý yêu cầu xóa job theo chính sách: job không có application có thể hard-delete; job đã có application bắt buộc archive/soft-delete để bảo toàn lịch sử.

## Nguồn và điều kiện

- Nguồn: `Job-CRUD.md` và yêu cầu target 3.3.
- Actor: Recruiter, Admin.
- Tiền điều kiện: tenant và quyền quản lý job hợp lệ.
- Hậu điều kiện: job bị xóa hoặc chuyển `ARCHIVED`; public/search consumers nhận event thay đổi.

## Luồng sequence

1. Người dùng xác nhận xóa; interceptor xác thực, phân quyền và đặt tenant.
2. Service dùng `findAuthorized`; thiếu hoặc ngoài scope trả `404`.
3. `ApplicationRepository` kiểm tra tham chiếu trong cùng tenant.
4. Có application: archive và đặt `deletedAt`; không có application và policy cho phép: delete vật lý.
5. Transaction hoàn tất rồi phát `JobDeletedEvent` chứa `DeletionMode`; API trả `204`.
6. Tenant context được clear trong mọi nhánh.

## Class và connector

- `JobDeletionServiceImpl` **realizes** service contract và phụ thuộc hai repository.
- Association `Job 1 — 0..* Application` là lý do tồn tại của nhánh soft-delete.
- Repository **manages** entity và **persists/reads** tenant DB.
- Service **creates** `JobDeletedEvent`; publisher là dependency async nhằm cập nhật cache/search mà không đưa hạ tầng vào entity.
- `DeletionMode` và `JobStatus` là enum dependency, không phải entity độc lập.

## Quyết định và giả định

- Endpoint idempotent ở mức API có thể chọn trả `204` cho job đã archive; sơ đồ hiện trả `404` nếu không tìm thấy.
- Hard delete chỉ áp dụng khi không có dữ liệu phụ thuộc; FK và transaction là lớp bảo vệ cuối.
- Audit event không chứa nội dung job hoặc dữ liệu ứng viên.

## Generated artifacts

- class-diagram.png — PNG 300 DPI.
- sequence-diagram.png — PNG 300 DPI.

**Review status:** Complete

