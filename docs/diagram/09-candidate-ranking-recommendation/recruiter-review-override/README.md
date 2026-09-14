# FE-09 — Recruiter Review, Shortlist & Override

- **Feature:** `3.9 Candidate Ranking & Recommendation`
- **Function:** Recruiter reviews explainable ranking, records an override, or shortlists with human accountability.
- **Review status:** `Complete with assumptions`

## Mục đích và phạm vi

Mô tả human-in-the-loop của kiến trúc đích. Filter/sort chỉ hỗ trợ tìm kiếm trên board và không thay đổi rank. Use case trọng tâm là xem bằng chứng, override nhãn tư vấn có lý do, và shortlist bằng quyết định con người. Reject vẫn thuộc recruitment workflow, không được kích hoạt tự động bởi AI.

## Nguồn đã đối chiếu

`DESIGN.md`, ba feature docs Matching-Ranking, `API_GUIDE.md`, UI `MatchingPage`/`RankingDetail`, ranking service hiện tại và yêu cầu target do người dùng xác nhận.

## Actor, điều kiện và kết quả

- **Actor:** Recruiter sở hữu Job.
- **Tiền điều kiện:** Ranking version còn hợp lệ; application và nguồn thuộc cùng tenant/Job.
- **Thành công:** Giữ nguyên automated snapshot; lưu override hoặc shortlist, actor, lý do và audit event.
- **Lỗi:** `403/404` cho quyền/phạm vi; `400` khi thiếu lý do; `409` khi ranking/application version cũ; không ghi một phần.

## Diễn giải sequence

1. Recruiter mở detail; backend kiểm tra tenant/quyền rồi trả automated label, effective label, breakdown và evidence.
2. Nhánh override yêu cầu label, reason và expected ranking version. Version cũ buộc refresh. Thành công sẽ append override, không sửa kết quả AI gốc, và ghi audit trong transaction.
3. Nhánh shortlist khóa application, áp dụng optimistic version, cập nhật workflow bằng quyết định người thật và ghi audit.
4. Filter/sort không có lifeline riêng vì là thao tác read-only phía UI. Reject là use case khác; policy chỉ thể hiện guard bắt buộc human review.

## Trách nhiệm class và quan hệ

- Controller tiêu thụ DTO (`dependency`) và ủy quyền service (`directed association`).
- `RankingReviewService` điều phối repository, policy và audit.
- `HumanDecisionPolicy` bảo đảm override có lý do và không cho AI tự reject.
- `RankingReviewRepository` quản lý (`dependency`) `RankingOverride`; `ApplicationRepository` khóa và lưu workflow state.
- `Application 1 — 0..* RankingOverride` là association lịch sử; override không sở hữu/xóa snapshot AI.
- `RankingOverride → AuditEvent` là association chứng cứ: mỗi override thành công phải có audit tương ứng.

Không có inheritance, realization, aggregation hoặc composition cần thiết trong scope này.

## Bảo mật, transaction, audit và privacy

Repository tenant-scoped; role và Job ownership được kiểm tra ở trusted boundary. Reason không được chứa dữ liệu nhạy cảm không cần thiết. Override/shortlist cùng audit ghi nguyên tử. Audit là append-only, có retention và quyền truy cập hạn chế. Không log CV thô hay token.

## Assumptions và quyết định còn mở

Các API, `RankingOverride`, `AuditEvent`, shortlist command và policy là target design chưa có trong code/schema. Cần chốt override chỉ áp dụng cho label hay cho cả score/rank; sơ đồ chọn phương án an toàn là **override nhãn tư vấn**, không sửa điểm thuật toán. Shortlist cần map chính xác sang stage/status của WF trước triển khai.

## Render

Đã tạo và kiểm tra trực quan `class-diagram.png` và `sequence-diagram.png` ở 300 DPI. Dùng script render của skill với `-Format Png -PngDpi 300` để tạo lại khi source thay đổi.
