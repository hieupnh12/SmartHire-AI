# Interview Scheduling

**Epic:** Interview Scheduling & Real-time Notifications
**Trạng thái:** `Doing`
**Code ID:** `SCHED-01`

## Mục đích chức năng

Quản lý Interview trực tiếp (human) trong workspace của từng job: lên lịch, hội đồng, RSVP, nhắc lịch và Scorecard. AI Interview sử dụng module riêng.

## Actor

- Recruiter có quyền xem/sửa job, thành viên hội đồng, Candidate sở hữu application.

## Luồng hoạt động

1. Trang Interview lấy danh sách, KPI, tùy chọn ứng viên/hội đồng và lịch tuần từ API tenant. Tab recruiter **Lịch hẹn** (`/recruiter/schedules`, `/recruiter/jobs/:id/schedules`) là lịch tháng đồng bộ cùng API `GET /interviews?jobId=` (ẩn nháp); lên lịch / sửa chi tiết chuyển sang trang Phỏng vấn. Dashboard “Lịch phỏng vấn sắp tới” cũng đọc API này, không dùng mock/localStorage.
2. Recruiter chỉ chọn ứng viên thuộc job đã vượt qua AI Interview, vòng/rubric, online/offline, link họp hoặc địa điểm, thời gian và hội đồng có đúng một Lead.
3. Kiểm tra lịch rảnh; lưu nháp hoặc gửi lời mời. Khi gửi/sửa lịch công khai, transaction lưu lịch, notification và email outbox. Worker RabbitMQ gửi email kèm ICS nếu được chọn.
4. Candidate mở `/schedules` (menu tài khoản → "Lịch của tôi"): lịch tháng gom toàn bộ mốc của từng job — nộp CV (`applications.created_at`), mỗi lần đổi trạng thái (`application_status_history`), lời mời/hoàn thành/hạn chót AI Interview, lịch phỏng vấn trực tiếp (kể cả lịch đã hủy, gạch ngang). Lọc theo job, xem chi tiết theo ngày và 5 sự kiện sắp tới. Ô ngày và danh sách theo ngày xếp sự kiện mới nhất lên trước; sự kiện kéo dài nhiều ngày (lời mời AI Interview từ lúc mời đến khi hoàn thành/hạn chót, hoặc lịch qua đêm) được tô thanh màu liên tục trên mọi ngày nó bao phủ. Frontend tổng hợp từ API có sẵn (`/applications/me`, `/applications/{id}`, `/ai-interviews/me`, `/interviews/mine`), không thêm endpoint.
5. Candidate mở `/interview-schedules` (menu "Công cụ" → "Lịch phỏng vấn"; thông báo phỏng vấn trực tiếp cũng dẫn tới đây) — trang riêng, tách khỏi "Lịch của tôi": xác nhận lịch phỏng vấn trực tiếp hoặc đề nghị thời gian mới kèm lý do. Đề nghị không tự đổi slot đang đặt; recruiter duyệt bằng thao tác sửa lịch.
6. Recruiter nhắc lịch, hủy, dời nhiều lịch trong một transaction, xuất ICS hoặc CSV. Thành viên hội đồng (không phải `NOTE_TAKER`) mở **structured scorecard** khi `scheduledStart` đã tới (kể cả trong `/meet/human/{id}`). UI thang Likert **1–5 có anchor** (dưới kỳ vọng → xuất sắc), map lưu DB **0–100** (×20) cho ba năng lực: chuyên môn, giao tiếp, văn hóa/động lực; đề xuất Strong hire / Hire / No hire / Strong no-hire; **bắt buộc evidence**. Điểm tổng = TB ba tiêu chí. Nộp phiếu trong buổi **không** đóng lịch; `DONE`/`EVALUATED` khi hết `scheduledEnd` hoặc Lead `finalizeDecision`. **Quyết định tuyển** chỉ Lead + finalize → Đậu `OFFER` / Trượt `REJECTED`. Khi gửi lời mời (không nháp), đơn `ASSESSMENT`/`INTERVIEW` → `HUMAN_INTERVIEW`.

## Business Rules

- Lời mời / trạng thái `HUMAN_INTERVIEW` chỉ mở sau khi đạt cả ba vòng: CV `PASSED`, AI Interview `PASSED`, Assessment `GRADED` đạt ngưỡng. AI pass hoặc Assessment pass một mình **không** mở Human Interview. Danh sách “Ứng viên tiếp nhận” và API tạo/sửa/lưu nháp dùng cùng quy tắc (`HumanInterviewGate`); 409 `CV_SCREENING_NOT_PASSED` / `AI_INTERVIEW_NOT_PASSED` / `ASSESSMENT_NOT_PASSED`. Recruiter đặt lịch từ trang Phỏng vấn hoặc chi tiết xếp hạng khi đủ điều kiện.

- Chỉ xử lý `interview_type=HUMAN_TECHNICAL/HUMAN_CULTURE/HUMAN_EXECUTIVE`; không đọc/sửa AI Interview.
- Mọi query chạy trong database tenant hiện tại; quyền truy cập kiểm tra job hoặc ownership ứng viên.
- Thời gian API là ISO-8601 UTC; UI hiển thị múi giờ trình duyệt. KPI nhận timezone IANA; email hiện dùng GMT+07.
- Lịch tương lai dài 15–240 phút. Khóa user theo ID trước kiểm tra giao thời gian ứng viên/hội đồng; slot sát nhau không xung đột. Nháp/hủy/hoàn tất không giữ slot.
- Status lịch: `DRAFT`, `PROPOSED`, `CONFIRMED`, `RESCHEDULE_REQUESTED`, `CANCELLED`, `DONE`. Đổi lịch gửi lại lời mời và reset RSVP.
- Hội đồng 1–10 staff active, không trùng người, đúng một `LEAD`; `NOTE_TAKER` không chấm điểm. Không sửa lịch đã đóng hoặc có đánh giá.
- Candidate không thấy nháp hay phiếu đánh giá nội bộ; chỉ xem/xác nhận/đề nghị đổi lịch của mình.
- `NO_HIRE` / `STRONG_NO_HIRE` bắt buộc `comments`. `finalizeDecision` chỉ Lead được dùng; API trả 403 `INTERVIEW_FORBIDDEN` nếu không phải Lead.
- Provider online: `SMARTHIRE` (mặc định) | `GOOGLE_MEET` | `ZOOM` | `TEAMS`. `SMARTHIRE` tự tạo link `/meet/human/{interviewId}`. Engine phòng họp (FE): `VITE_HUMAN_MEETING_ENGINE=peerjs` (mặc định, WebRTC PeerJS, vào được ngay) hoặc `jitsi` (iframe `VITE_JITSI_DOMAIN`). **Không dùng `meet.jit.si` public** cho demo — thiếu moderator. Self-host / Jaas: xem [JITSI_MEETING_SETUP.md](./JITSI_MEETING_SETUP.md). Lead SmartHire ≠ moderator Jitsi. Meet/Zoom/Teams vẫn nhập URL thủ công. Chưa có SMS/Zalo (UI vô hiệu hóa, API trả 501 nếu yêu cầu).
- Scorecard API: từ chối nếu lịch `DRAFT`/`CANCELLED` hoặc chưa tới `scheduledStart`. Cho phép chấm live; lưu giữa buổi giữ nguyên status lịch trừ khi `finalize` hoặc đã qua `scheduledEnd`. Panel cạnh video trong phòng họp (ẩn Candidate). FE dùng Likert 1–5; API vẫn nhận 0–100.
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
