# Interview Scheduling

**Epic:** Interview Scheduling & Real-time Notifications
**Trạng thái:** `Doing`
**Code ID:** `SCHED-01`

## Mục đích chức năng

Quản lý Interview trực tiếp (human) trong workspace của từng job: lên lịch, hội đồng, RSVP, nhắc lịch và Scorecard. AI Interview sử dụng module riêng.

## Actor

- Recruiter có quyền xem/sửa job, thành viên hội đồng, Candidate sở hữu application.

## Luồng hoạt động

1. Trang Interview lấy danh sách, KPI, tùy chọn ứng viên/hội đồng và lịch tuần từ API tenant.
2. Recruiter chỉ chọn ứng viên thuộc job đã vượt qua AI Interview, vòng/rubric, online/offline, link họp hoặc địa điểm, thời gian và hội đồng có đúng một Lead.
3. Kiểm tra lịch rảnh; lưu nháp hoặc gửi lời mời. Khi gửi/sửa lịch công khai, transaction lưu lịch, notification và email outbox. Worker RabbitMQ gửi email kèm ICS nếu được chọn.
4. Candidate mở `/schedules` (menu tài khoản → "Lịch của tôi"): lịch tháng gom toàn bộ mốc của từng job — nộp CV (`applications.created_at`), mỗi lần đổi trạng thái (`application_status_history`), lời mời/hoàn thành/hạn chót AI Interview, lịch phỏng vấn trực tiếp (kể cả lịch đã hủy, gạch ngang). Lọc theo job, xem chi tiết theo ngày và 5 sự kiện sắp tới. Frontend tổng hợp từ API có sẵn (`/applications/me`, `/applications/{id}`, `/ai-interviews/me`, `/interviews/mine`), không thêm endpoint. Bên dưới lịch, candidate xác nhận hoặc đề nghị thời gian mới kèm lý do. Đề nghị không tự đổi slot đang đặt; recruiter duyệt bằng thao tác sửa lịch.
5. Recruiter nhắc lịch, hủy, dời nhiều lịch trong một transaction, xuất ICS hoặc CSV. Sau khi kết thúc, thành viên hội đồng có quyền xem job chấm ba tiêu chí 0–100 và đề xuất tuyển; điểm tổng là trung bình ba tiêu chí.

## Business Rules

- “Ứng viên tiếp nhận” chỉ trả application có phiên `ai_interviews.status=PASSED` của chính application đó trong tenant hiện tại. Không suy ra đạt AI Interview từ CV Screening hay trạng thái application. API tạo/sửa/lưu nháp cũng kiểm tra điều kiện này, trả 409 `AI_INTERVIEW_NOT_PASSED` khi chưa đạt.

- Chỉ xử lý `interview_type=HUMAN_TECHNICAL/HUMAN_CULTURE/HUMAN_EXECUTIVE`; không đọc/sửa AI Interview.
- Mọi query chạy trong database tenant hiện tại; quyền truy cập kiểm tra job hoặc ownership ứng viên.
- Thời gian API là ISO-8601 UTC; UI hiển thị múi giờ trình duyệt. KPI nhận timezone IANA; email hiện dùng GMT+07.
- Lịch tương lai dài 15–240 phút. Khóa user theo ID trước kiểm tra giao thời gian ứng viên/hội đồng; slot sát nhau không xung đột. Nháp/hủy/hoàn tất không giữ slot.
- Status lịch: `DRAFT`, `PROPOSED`, `CONFIRMED`, `RESCHEDULE_REQUESTED`, `CANCELLED`, `DONE`. Đổi lịch gửi lại lời mời và reset RSVP.
- Hội đồng 1–10 staff active, không trùng người, đúng một `LEAD`; `NOTE_TAKER` không chấm điểm. Không sửa lịch đã đóng hoặc có đánh giá.
- Candidate không thấy nháp hay Scorecard nội bộ; chỉ xem/xác nhận/đề nghị đổi lịch của mình.
- Link họp phải http/https. Chưa tích hợp tạo phòng Google Meet/Zoom/Teams tự động; chưa có SMS/Zalo (UI vô hiệu hóa, API trả 501 nếu yêu cầu).
- Email cần SMTP và RabbitMQ đang chạy. Khi chưa cấu hình SMTP, outbox giữ PENDING; retry lỗi tối đa 5 lần. Worker truyền `X-Tenant-ID` qua TenantJobExecutor. Có notification lưu DB; chưa bổ sung push WebSocket cho module này.
- Danh sách hiện lọc/phân trang sau khi đọc các interview của job; cần tối ưu query khi dữ liệu lớn.

## API liên quan

Tất cả dưới `/api/v1/interviews`, dùng Bearer token và `X-Tenant-ID`.

| Method | Path | Chức năng |
|---|---|---|
| GET | `?jobId=&q=&round=&mode=&status=&from=&to=&page=0&size=20` | Danh sách, lọc, phân trang |
| GET | `/summary?jobId=&timezone=` | KPI |
| GET | `/options?jobId=` | Ứng viên, staff, vòng, rubric, email template |
| POST | `/availability` | Kiểm tra lịch trùng |
| POST | `/` | Tạo lịch/nháp |
| PATCH | `/{id}` | Sửa/dời lịch |
| GET | `/{id}` | Chi tiết |
| GET | `/mine` | Lịch của candidate |
| POST | `/{id}/confirm` | RSVP |
| POST | `/{id}/reschedule-request` | Đề nghị đổi giờ |
| POST | `/{id}/cancel` | Hủy |
| POST | `/{id}/complete` | Hoàn tất |
| POST | `/{id}/evaluations` | Lưu Scorecard |
| POST | `/{id}/remind` | Nhắc lịch |
| POST | `/bulk` | REMIND/CANCEL/RESCHEDULE; shiftMinutes khác 0 |
| GET | `/{id}/email-preview` | Xem nội dung email |
| GET | `/export?jobId=` hoặc `/{id}/calendar` | Xuất ICS |

CSV được frontend tạo từ danh sách API, không có endpoint riêng. Payload và response xem Swagger `Human Interview` và Postman folder cùng tên.

## Database liên quan

- `interviews`, `interview_schedules`, `interview_participants`, `interview_evaluations` (schema hiện có V12).
- V48 thêm `interviews.configuration_json` nullable: rubric/provider/emailTemplate/notes/attachCalendar/rescheduleReason/requestedStart/requestedEnd. Không thêm bảng hoặc FK.
- `notifications`, `email_outbox` dùng cơ chế hiện có; purpose `HUMAN_INTERVIEW`. Body outbox là JSON text/calendar.

## UI mockup

- Hai mẫu HTML người dùng cung cấp ngày 05/10/2026: trang quản lý lịch và modal lên lịch Interview trực tiếp.
- Dùng navigation/RoleShell, màu và font token tenant. Giữ header hành động, bốn KPI, bộ lọc, danh sách/lịch tuần, chọn nhiều, tám cột bảng, RSVP, Scorecard, phân trang, drawer/modal.
- Dữ liệu minh họa được thay bằng API thật; các trạng thái rảnh, CV Screening và Scorecard lấy từ dữ liệu. Nút CV mở hồ sơ application và tải CV qua API; báo cáo AI chuyển đến module CV Screening thực tế.
- Style giới hạn `.human-interview-reference`, sinh bằng `styles/generate-reference-css.mjs` từ component.

## Kiểm chứng và phần còn lại

- Unit test: ownership, nháp, xác nhận, đề nghị đổi giờ giữ slot, quyền sửa job, lịch trùng và ICS tenant/UTF-8.
- Cần chạy migration V48 trên MySQL tenant và kiểm tra gửi mail với SMTP/RabbitMQ thực tế. Tích hợp nhà cung cấp phòng họp, SMS/Zalo và push WebSocket chưa triển khai nên feature tổng thể giữ Doing.
