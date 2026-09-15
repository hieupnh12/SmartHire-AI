# JOB-F06 — Configure Job Requirements and Matching

## Mục đích và phạm vi

Thiết lập skill bắt buộc/tùy chọn, level, kinh nghiệm, học vấn và trọng số tiêu chí làm đầu vào cho matching.

## Nguồn và điều kiện

- Nguồn: `Skill-Requirements.md` và yêu cầu mục tiêu 3.3.
- Actor: Recruiter.
- Tiền điều kiện: job thuộc scope; skill đang active; trọng số hợp lệ.
- Hậu điều kiện: một version cấu hình matching mới được lưu trong tenant DB.

## Luồng sequence

1. Interceptor xác thực Recruiter và tenant.
2. Service kiểm tra job được phép quản lý và tải danh sách skill chuẩn hóa.
3. Service phát hiện duplicate, level sai, skill không tồn tại hoặc tổng trọng số sai; nhánh này trả `404/422` và không ghi dữ liệu.
4. Với dữ liệu hợp lệ, service tạo version immutable tiếp theo và lưu configuration cùng job skills atomically.
5. Response trả version và tổng trọng số để matching downstream truy vết được cấu hình.

## Class và connector

- Controller **delegates** service, consumes request và returns response.
- Service implementation **realizes** contract, phụ thuộc repository job/skill/configuration.
- `Job` **composes** một `MatchingConfiguration`; configuration **composes** một hoặc nhiều `JobSkillRequirement`.
- Mỗi requirement có association tới đúng một `Skill`; enum dependencies mô tả level và education.
- Repository **persists to/reads from** tenant DB; service dependency tới `TenantContext` chặn cross-tenant access.

## Quyết định và giả định

- Tổng weight mục tiêu là 100; nếu sản phẩm chọn normalize tự động thì response vẫn lưu total/version đã normalize.
- Version immutable giúp kết quả matching cũ có thể audit.
- Không chạy AI/matching trong use case cấu hình này.

## Generated artifacts

- class-diagram.png — PNG 300 DPI.
- sequence-diagram.png — PNG 300 DPI.

**Review status:** Complete

