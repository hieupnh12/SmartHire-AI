# JOB-F08 — Configure Assessment and Interview Plan

## Mục đích và phạm vi

Gắn assessment và các vòng interview vào stage của job, gồm pass score, loại phỏng vấn, thời lượng và vai trò interviewer.

## Nguồn và điều kiện

- Nguồn: yêu cầu mục tiêu 3.3, `Recruitment-Stages.md`, taxonomy ASSESS/INT trong `docs/features/README.md`.
- Actor: Recruiter, Admin.
- Tiền điều kiện: job/pipeline thuộc tenant; assessment đã publish; stage phù hợp loại kế hoạch.
- Hậu điều kiện: selection plan nhất quán được commit vào tenant DB.

## Luồng sequence

1. Interceptor thiết lập tenant và kiểm tra quyền.
2. Service tải pipeline được phép quản lý và các assessment đã publish.
3. Service kiểm tra stage type, pass score, duration, thứ tự round và interviewer role.
4. Reference thiếu hoặc plan sai trả `404/422` mà không thay đổi dữ liệu.
5. Plan hợp lệ được lưu atomically rồi trả số assessment và interview rounds.

## Class và connector

- Controller có dependencies consumes/returns DTO và delegates service.
- Service implementation **realizes** contract; ba repository dependencies tách kiểm tra pipeline, assessment và persistence plan.
- `Job` **composes** `SelectionPlan`; plan **composes** assessment/interview plan items.
- Các plan item có associations tới `Assessment` và `RecruitmentStage`; đây là reference, không sở hữu vòng đời của assessment/stage.
- Repository **persists to/reads from** tenant DB; tenant context là dependency bắt buộc.

## Quyết định và giả định

- Chỉ tham chiếu assessment đã publish; việc tạo đề thuộc feature ASSESS.
- Việc scheduling interviewer và thực thi phỏng vấn thuộc SCHED/INT, không nằm trong cấu hình này.
- Xóa stage đang được plan tham chiếu phải bị pipeline policy từ chối hoặc yêu cầu cập nhật plan cùng transaction.

## Generated artifacts

- class-diagram.png — PNG 300 DPI.
- sequence-diagram.png — PNG 300 DPI.

**Review status:** Complete

