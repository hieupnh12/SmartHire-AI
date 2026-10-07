# Recruitment Pipeline

**Epic:** Recruitment Workflow Management  
**Trạng thái:** `Done`
**Code ID:** `WF-01`

## Mục đích chức năng

Luồng tuyển dụng theo từng job được quản lý bằng Kanban trạng thái: `NEW` → `IN_REVIEW` → `ASSESSMENT` → `INTERVIEW` → `OFFER` → `HIRED`; `REJECTED` và `WITHDRAWN` là hai nhánh kết thúc. Recruiter xem nhanh hồ sơ và chuyển trạng thái ngay trên bảng.

## Actor

- Recruiter, Candidate, System (auto-advance khi CV đạt)

## Luồng hoạt động

1. Candidate apply; hồ sơ xuất hiện ở cột `NEW`.
2. Recruiter mở hồ sơ nhanh hoặc chuyển hồ sơ qua các trạng thái nghiệp vụ trên Kanban.
3. Mỗi thay đổi gọi API trạng thái và cập nhật lại dữ liệu của job.
4. Candidate tự rút hồ sơ; Pipeline vẫn hiển thị hồ sơ đó tại cột `WITHDRAWN` để recruiter theo dõi.
5. Recruiter có thể mở danh sách hoặc hồ sơ đầy đủ từ Kanban khi cần xử lý sâu.

## Business Rules

- Không auto-reject khi CV chưa đạt.
- Danh sách recruiter mặc định không gồm `WITHDRAWN`; Pipeline gọi `includeWithdrawn=true` để hiển thị đủ lịch sử của job.
- Recruiter không được chuyển hồ sơ sang `WITHDRAWN`; chỉ candidate được tự rút.
- Hồ sơ ở trạng thái kết thúc chỉ có thể được khôi phục về `IN_REVIEW` theo quy tắc hiện hành.
- Điều khiển chuyển trạng thái bằng select để hỗ trợ chuột và bàn phím; chưa dùng kéo-thả làm cách thao tác duy nhất.

## API liên quan

| Method | Path |
|---|---|
| GET | `/api/v1/jobs/{id}/applications?includeWithdrawn=true` |
| GET | `/api/v1/applications/me` |
| POST | `/api/v1/applications/{id}/status` |

## Database liên quan

- `applications.status`, `match_scores`

## UI mockup

- Frontend `/recruiter/jobs/{jobId}/applicants?view=board`: chế độ **Bảng quy trình** nằm chung trong trang quản lý ứng viên của job, không còn là một workspace độc lập. Kanban dữ liệu thật gồm 8 cột `NEW`, `IN_REVIEW`, `ASSESSMENT`, `INTERVIEW`, `OFFER`, `HIRED`, `REJECTED`, `WITHDRAWN`. Có tìm kiếm, xem nhanh, deep-link `applicationId` và chuyển trạng thái qua API. URL `/recruiter/jobs/{jobId}/pipeline` cũ chỉ redirect để tương thích.
- Từ Dashboard, bấm **Ứng viên mới** mở panel nhóm hồ sơ `NEW` theo từng job. Bấm job mở Bảng quy trình; bấm ứng viên mở đúng hồ sơ bằng `applicationId`.
- Google Stitch: **Recruitment Workflow Management / Recruitment Pipeline** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

JOB-04, JOB-05, CV-05

## Trạng thái phỏng vấn trực tiếp (2026-10-07)

- Bổ sung `HUMAN_INTERVIEW` cho phỏng vấn người–người, tách khỏi `INTERVIEW` (phỏng vấn AI).
- Recruiter chuyển vòng qua API status hiện có hoặc bảng quy trình; UI hỗ trợ lọc và hiển thị trạng thái mới. Mỗi lần chuyển ghi `application_status_history`, không tạo lời mời AI khi chuyển sang `HUMAN_INTERVIEW`.
- DB lưu chuỗi `HUMAN_INTERVIEW` tại `applications.status` (VARCHAR(32)); không cần migration và không đổi dữ liệu cũ.
