# Email Notification

**Epic:** Interview Scheduling & Real-time Notifications  
**Trạng thái:** `Doing`  
**Code ID:** `SCHED-03`

## Mục đích chức năng

Gửi email (OTP, schedule, decision, feedback) qua RabbitMQ mail worker.

## Actor

- System

## Luồng hoạt động

1. Publish `notify.email` (OTP, schedule — chưa đủ worker).
2. Khi `AiInterviewInvitationService` tạo phiên mới (CV screening đạt hoặc tạo bù sau khi bật cấu hình), hệ thống tạo notification trong app, gửi mail qua `InviteMailSender`, ghi `email_outbox` + `applications.ai_interview_invited_at`. Nội dung gồm thời gian có thể bắt đầu, hạn hoàn thành, thời lượng, số lần thực hiện và liên kết đến danh sách phiên của candidate.
3. Worker template + SMTP/provider cho các loại mail còn lại.

## Business Rules

- Retry + DLQ (hàng đợi SCHED-03).
- **Zero-Config Tenant White-label & Dynamic `Reply-To`:** Mọi email gửi từ không gian Tenant (Mời AI Interview, Mời Assessment, Mời/Nhắc/Hủy Human Interview, Mời nhân sự nội bộ, OTP quên mật khẩu) sử dụng hạ tầng SMTP của nền tảng (`${spring.mail.username}`) để đảm bảo SPF/DKIM/DMARC không bị vào Spam, nhưng tự động chuẩn hóa:
  - **Tên hiển thị người gửi (`From` Personal Name):** `"<Tên Công Ty> (via SmartHire)"` (lấy từ `TenantInfo.name` theo `TenantContext`), tiêu đề và chữ ký cuối thư mang tên thương hiệu của doanh nghiệp.
  - **Địa chỉ nhận phản hồi (`Reply-To`):** Tự động gán theo thứ tự ưu tiên: (1) Email của HR/Recruiter phụ trách Job hoặc Lead Interviewer của buổi phỏng vấn (`"<Tên HR> - <Tên Công Ty>" <hr@company.com>`), (2) `TenantInfo.contactEmail` của doanh nghiệp, (3) `TenantInfo.billingEmail`. Khi ứng viên bấm "Reply", thư trả lời được gửi thẳng về hộp thư của HR/Doanh nghiệp mà không cần cấu hình SMTP.
- Lời mời AI interview: một lần / application; SMTP lỗi thì chưa set `ai_interview_invited_at`.
- Thời gian trong lời mời hiển thị theo múi giờ `Asia/Bangkok` (`HH:mm dd/MM/yyyy`), đồng nhất với múi giờ vận hành hiện tại của hệ thống.
- Người nhận tắt kênh Gmail cho một loại (`notification_preferences.email_enabled=false`) thì không gửi và không ghi `email_outbox` cho loại đó. Riêng lời mời AI Interview vẫn set `ai_interview_invited_at` (lựa chọn của người dùng, không phải lỗi SMTP) để không gửi lại. Cài đặt tại `/notifications?tab=settings`, xem SCHED-02.
- **Thông báo qua Gmail cho Nhân viên (`STAFF_NOTIFICATION`):** Đồng thời gửi email cho các nhân viên phụ trách tin tuyển dụng (Job Owner, thành viên được phân quyền qua `job_assignments`, người phụ trách hồ sơ, hội đồng phỏng vấn) khi có sự kiện nộp/rút đơn, kết quả phỏng vấn AI, bài nộp đánh giá năng lực, hoặc ứng viên xác nhận/đổi lịch phỏng vấn. Email hiển thị tiêu đề, tên vị trí tuyển dụng, liên kết trực tiếp mở trang xử lý và thông tin thương hiệu công ty (`via SmartHire`). Worker quét hàng đợi `email_outbox` với purpose `STAFF_NOTIFICATION` để gửi qua SMTP nền tảng.
- **Thông báo qua Gmail cho Ứng viên khi duyệt hồ sơ & chuyển vòng (`CANDIDATE_STAGE_NOTIFICATION`):** Khi ứng viên vượt qua vòng lọc CV (`decideCvScreening` khi duyệt đạt hoặc tự động) và các vòng sau (`ASSESSMENT`, `INTERVIEW`, `HUMAN_INTERVIEW`, `OFFER`, `HIRED`), hệ thống tự động gửi thông báo về địa chỉ Gmail của tài khoản ứng viên đăng nhập hệ thống (`candidate.getEmail()`). Thư chứa lời chúc mừng, tên vị trí tuyển dụng, giai đoạn tiếp theo cần chuẩn bị, cùng liên kết trực tiếp để ứng viên theo dõi hồ sơ. Worker quét hàng đợi `email_outbox` với purpose `CANDIDATE_STAGE_NOTIFICATION` để gửi qua SMTP nền tảng.

## API liên quan

Internal queue `notify.email`; templates trong `mail_templates`.

## Database liên quan

- `email_outbox` / `notification_logs`
- `notification_preferences` (V49) — kênh email theo loại thông báo

## UI mockup

- Google Stitch: **Interview Scheduling & Real-time Notifications / Email Notification** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

SCHED-01, SCHED-02
