# RANK-02: Engine gợi ý việc làm, lưu việc làm & thông báo việc làm mới

## Mục đích chức năng
- AI gợi ý việc làm phù hợp cho ứng viên từ hồ sơ CV đã phân tích và gợi ý ứng viên phù hợp cho từng tin tuyển dụng ở phía recruiter.
- Hỗ trợ ứng viên lưu việc làm quan tâm (Bookmark / Saved Jobs) và đăng ký nhận thông báo khi doanh nghiệp đăng tuyển vị trí mới phù hợp tiêu chí.

## Actor
- **Candidate** (xem tab *Phù hợp với bạn*, lưu/bỏ lưu việc làm tại `/saved-jobs`, `/jobs`, `/jobs/:id`, đăng ký nhận thông báo việc làm mới)
- **Recruiter / Admin** (xem ứng viên gợi ý cho tin tuyển dụng, quyền `RANKING`)

## Luồng hoạt động
1. **Gợi ý việc làm cho ứng viên**: Ứng viên đăng nhập mở tab *Phù hợp với bạn* trên trang Career Portal (`/`). Frontend gọi `GET /api/v1/recommendations/jobs`. Backend chọn CV không phải bản sao ứng tuyển mới nhất có kỹ năng/phân tích (`cv_skills`, `cv_analyses`), đối chiếu với các tin tuyển dụng `PUBLISHED` chưa hết hạn bằng `SkillScoringService` và kinh nghiệm tối thiểu, lưu snapshot vào `recommendations`, trả về danh sách kèm điểm `%` phù hợp và kỹ năng khớp.
2. **Gợi ý ứng viên cho Job**: Recruiter gọi `GET /api/v1/jobs/{id}/recommendations/candidates`. Backend đánh giá kho CV ứng viên `ACTIVE` trong tenant theo kỹ năng yêu cầu của job, lưu snapshot vào `recommendations` và đánh dấu ứng viên đã ứng tuyển.
3. **Lưu việc làm (Saved Jobs)**: Ứng viên nhấn nút Bookmark trên thẻ việc làm, trang `/jobs` hoặc trang chi tiết `/jobs/:id` để lưu/bỏ lưu qua `POST/DELETE /api/v1/candidate/saved-jobs/{jobId}` và xem toàn bộ tại `/saved-jobs`.
4. **Đăng ký thông báo việc làm mới (Job Alerts)**: Ứng viên tạo/bật/tắt/xoá bộ lọc theo từ khoá, phòng ban, địa điểm, hình thức làm việc và kênh nhận (Web / Email) qua `/api/v1/candidate/job-alerts`. Khi Recruiter lần đầu publish một tin tuyển dụng (`JobService.publish`), `JobAlertService` tự động đối chiếu các đăng ký đang bật và gửi thông báo in-app (`notifications` với `type = CANDIDATE_JOB_ALERT`, i18n 3 ngôn ngữ) và email (`email_outbox`).

## Business Rules
- Không gợi ý job đã `CLOSED`, `DRAFT`, `PAUSED`, đã xoá mềm hoặc quá hạn `deadline`.
- Không gợi ý ứng viên `DISABLED` / đã xoá dữ liệu.
- Lưu snapshot gợi ý và lý do vào bảng `recommendations` (`subject_type`, `subject_id`, `target_type`, `target_id`, `score`, `reason_json`).
- Lưu việc làm chỉ áp dụng cho tin tuyển dụng đang mở (`PUBLISHED` & còn hạn), đảm bảo duy nhất `(candidate_id, job_id)`.
- Mỗi ứng viên tạo tối đa 20 đăng ký thông báo việc làm; khi bật `active = true` phải chọn ít nhất một kênh (`webEnabled` hoặc `emailEnabled`); xoá dữ liệu ứng viên sẽ dọn sạch `saved_jobs` và `job_alerts`.

## API liên quan
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/recommendations/jobs` | Gợi ý việc làm cho ứng viên hiện tại từ CV đã phân tích |
| GET | `/api/v1/jobs/{id}/recommendations/candidates` | Gợi ý ứng viên trong tenant cho tin tuyển dụng (Recruiter `RANKING`) |
| GET | `/api/v1/candidate/saved-jobs` | Danh sách việc làm đã lưu của ứng viên |
| GET | `/api/v1/candidate/saved-jobs/ids` | Danh sách ID việc làm đã lưu |
| POST | `/api/v1/candidate/saved-jobs/{jobId}` | Lưu (bookmark) tin tuyển dụng |
| DELETE | `/api/v1/candidate/saved-jobs/{jobId}` | Bỏ lưu tin tuyển dụng |
| GET | `/api/v1/candidate/job-alerts` | Danh sách đăng ký thông báo việc làm mới |
| POST | `/api/v1/candidate/job-alerts` | Tạo đăng ký thông báo việc làm mới |
| PUT | `/api/v1/candidate/job-alerts/{id}` | Cập nhật / bật-tắt đăng ký thông báo |
| DELETE | `/api/v1/candidate/job-alerts/{id}` | Xoá đăng ký thông báo việc làm mới |

## Database liên quan
- `recommendations` (index `idx_rec_subject_target` ở V60)
- `saved_jobs` (entity `SavedJob`, V60)
- `job_alerts` (entity `JobAlert`, V60)
- `cv_analyses`, `cv_skills`, `jobs`, `job_skills`, `notifications`, `email_outbox`

## UI Mockup
- Tab *Phù hợp với bạn* trên `TenantCareerPage` hiển thị điểm `%` phù hợp + kỹ năng khớp dựa trên CV từ backend.
- Nút Bookmark trên `FeaturedJobCard`, danh sách `/jobs`, và trang chi tiết `/jobs/:id`; trang quản lý `/saved-jobs` (`SavedJobsPage`) + khung đăng ký `JobAlertsPanel`.

## Trạng thái
`Done`
