# JOB-F07 — Configure Recruitment Pipeline

## Mục đích và phạm vi

Khởi tạo hoặc chỉnh thứ tự/tên/type của các recruitment stage theo job, đồng thời bảo vệ stage đang có candidate.

## Nguồn và điều kiện

- Nguồn: `Recruitment-Stages.md` và yêu cầu target 3.3.
- Actor: Recruiter, Admin.
- Tiền điều kiện: job thuộc scope; stage order không trùng; pipeline có điểm đầu/cuối hợp lệ.
- Hậu điều kiện: pipeline mới được lưu atomically; stage đang được dùng chỉ bị archive, không xóa.

## Luồng sequence

1. Controller nhận toàn bộ stage configuration sau tenant authorization.
2. Service tải pipeline thuộc job và đếm application tại những stage dự kiến bị xóa.
3. Service kiểm tra order, initial/final semantics và usage.
4. Pipeline sai trả `422`; job ngoài scope trả `404`.
5. Stage đang dùng được archive; stage còn lại được thay thế/sắp xếp và lưu trong một transaction.

## Class và connector

- `RecruitmentPipelineServiceImpl` **realizes** interface và phụ thuộc pipeline/application repositories.
- `Job` **composes** một pipeline; pipeline **composes** `1..* RecruitmentStage`, biểu thị ownership vòng đời.
- `Application --> RecruitmentStage` là association “currently at”, giải thích vì sao stage đang dùng không được xóa.
- `RecruitmentStage --> StageType` là dependency kiểu enum.
- Repository dependencies tới tenant DB thể hiện persistence isolation.

## Quyết định và giả định

- Stage `REJECTED` có thể là terminal phụ; policy cuối cùng cần được đóng khi đặc tả workflow hoàn thiện.
- Việc di chuyển candidate giữa stages thuộc Workflow Management, không nằm trong use case này.
- Optimistic version cho pipeline nên được bổ sung ở implementation.

## Generated artifacts

- class-diagram.png — PNG 300 DPI.
- sequence-diagram.png — PNG 300 DPI.

**Review status:** Complete

