# JOB-F05 — Clone Job or Create from Template

## Mục đích và phạm vi

Tạo job draft mới từ một job hoặc template trong cùng tenant, tái sử dụng nội dung và cấu hình được phép nhưng không sao chép application/lịch sử/runtime results.

## Nguồn và điều kiện

- Nguồn: yêu cầu mục tiêu 3.3 và convention multi-tenant của dự án.
- Actor: Recruiter, Admin.
- Tiền điều kiện: source/template thuộc tenant và principal được phép đọc; override hợp lệ.
- Hậu điều kiện: aggregate mới có ID mới, trạng thái `DRAFT` và cấu hình độc lập.

## Luồng sequence

1. Người dùng chọn nguồn và nhập override; interceptor thiết lập tenant.
2. Service chọn đúng repository theo nguồn job hoặc template.
3. Source không tồn tại/không được phép trả `404`.
4. Service copy content, skill và pipeline cho phép; loại bỏ application, status history và kết quả đánh giá.
5. Service áp dụng override, ép identity mới cùng trạng thái `DRAFT`, rồi lưu aggregate atomically và trả `201`.

## Class và connector

- Controller có **dependency** tới `CloneJobRequest`, `JobResponse` và service.
- Service implementation **realizes** interface, queries template hoặc job repository.
- `JobTemplate ..> Job` là dependency tạo mới, không phải inheritance.
- `Job` **composes** skill requirements và stages vì bản copy sở hữu vòng đời riêng của chúng.
- Repository associations tới entity và dependencies tới tenant DB bảo đảm nguồn và đích cùng tenant.

## Quyết định và giả định

- Template được giả định nằm trong tenant DB; template hệ thống dùng chung sẽ cần master-domain port riêng.
- Không clone selection runtime, ứng viên hoặc audit history.
- Pipeline stage IDs phải được sinh lại và các reference nội bộ được remap trong transaction.

## Generated artifacts

- class-diagram.png — PNG 300 DPI.
- sequence-diagram.png — PNG 300 DPI.

**Review status:** Complete

