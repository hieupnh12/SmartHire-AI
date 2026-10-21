# Timer Control

**Epic:** FE-05 Online Technical Assessment  
**Trạng thái:** `Doing`
**Code ID:** `ASSESS-04`

## Mục đích chức năng

Giới hạn thời gian làm bài; server là nguồn sự thật.

## Actor

- Candidate, System

## Luồng hoạt động

1. Start lưu `submissions.started_at`; deadline tính từ thời lượng đề đã publish và không được sửa.
2. Response start/get/save/submit trả `serverTime`, `expiresAt`, `remainingSeconds`; FE đếm ngược bằng mốc server và `performance.now()`.
3. GET/start/save/submit/result phát hiện lượt IN_PROGRESS quá hạn thì chấm đáp án đã lưu, chuyển EXPIRED, submitted_at bằng deadline.
   Với đề có ESSAY, chỉ chấm phần trắc nghiệm; điểm tổng/passed NULL chờ chấm tự luận, kể cả khi tự luận chưa được trả lời.
4. Payload save muộn bị từ chối 409 nhưng trạng thái EXPIRED vẫn được commit. Frontend tự gọi submit khi hết giờ, có nút thử hoàn tất khi lỗi mạng; chưa có worker chủ động quét khi không phát sinh request.

## Business Rules

- Không tin timer client.
- Giờ máy client không ảnh hưởng deadline. Không cộng thêm thời gian khi refresh hoặc start lại.

## API liên quan

| Method | Path |
|---|---|
| GET | `/api/v1/submissions/{id}/get_submission` |
| POST | `/api/v1/submissions/{id}/submit_test` |

## Database liên quan

- `submissions.started_at`, `submissions.submitted_at`, `submissions.status`, `tests.duration_minutes`.

## UI mockup

- Google Stitch: **FE-05 Online Technical Assessment / Timer Control** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

ASSESS-01

## Mô hình đa phần — cập nhật 2026-10-12

- UI giữ thành phần và token hiện có. Ngân hàng chung có 3 nhóm: trắc nghiệm (`MCQ`/`MULTIPLE_CHOICE`), lý thuyết (`ESSAY`), bài lập trình (`CODING`). Không di chuyển ngân hàng sang master DB; dữ liệu vẫn cách ly theo tenant.
- Essay mới biên soạn rubric gồm đáp án tham khảo và tiêu chí có tổng tỉ trọng 100%. Câu cũ thiếu rubric vẫn có thể chấm tay. Không tự chuyển câu code legacy thành bài thực thi khi chưa có harness/test.
- Form Code quản lý loại thuật toán/OOP/SQL, giới hạn thời gian/bộ nhớ, starter code, harness theo ngôn ngữ và sample/hidden tests. Khi tạo đề tự động, nội dung được sao chép độc lập từ ngân hàng.
- Candidate làm phần trắc nghiệm trước, bấm chốt rồi chuyển tự luận/code. `POST /api/v1/submissions/{id}/complete_objective` khóa đáp án ở server; reload không mở lại phần đã chốt. Đề không có trắc nghiệm bắt đầu trực tiếp phần thực hành. `objectiveDurationMinutes` tùy chọn nhỏ hơn tổng thời lượng: hết hạn riêng, server tự chốt khi GET/save/submit; tổng hạn vẫn tính từ startedAt.
- Phần Quiz (MCQ/essay) và Coding dùng cùng đồng hồ tổng; `objectiveDurationMinutes` (nếu có) tự chốt phần Quiz khi hết hạn riêng.
- Submit chấm trắc nghiệm đồng bộ, phát RabbitMQ sau commit tới `assessment.essay.grade` và queue code cấu hình `assessment.code.grade.q`; worker concurrency 3–10 chạy trong TenantJobExecutor, header X-Tenant-ID bắt buộc.
- Essay đánh giá ngữ nghĩa theo từng rubric; code dùng 80% tỉ lệ test pass + 20% AI review. Không so chuỗi source và không chấm bằng keyword matching. Mọi điểm AI là đề xuất, recruiter duyệt hoặc điều chỉnh trong màn hình Theo dõi bài làm.
- Staff dùng GET `/api/v1/submissions/{id}/grading_review`, POST `/approve_grade/{questionId}` (body score=null để nhận gợi ý, hoặc điểm thủ công), POST `/retry_grading`. Điểm tổng chỉ công bố sau khi toàn bộ câu được chấm chính thức; giữ EXPIRED cho bài quá hạn.
- Sandbox cần cấu hình `app.assessment.judge-url` / `app.assessment.judge-token` (Spring env: APP_ASSESSMENT_JUDGE_URL / APP_ASSESSMENT_JUDGE_TOKEN). Judge0 phải hỗ trợ wait=true và các language ID Java 62/Python 71/JavaScript 63/SQL 82. Không chạy source trong tiến trình backend. AI chấm tự luận/review code dùng task `ASSESSMENT_GRADING`: ưu tiên cấu hình `CODE_GRADING` trong Master DB khi task này tồn tại; nếu chưa có, giữ model Llama và kết nối `AI_ASSESSMENT_*`. Rate-limit/metering theo task Assessment, không dùng `INTERVIEW_NLP`.
- Provider lỗi không tạo điểm 0. Bài giữ chờ duyệt, có thể retry hoặc chấm tay. Broker lỗi sau commit giữ dữ liệu bài làm; staff retry sau khi broker hoạt động lại. Chưa có quét tự động các bài chờ gửi/chấm.
- Schema V53: tests, questions, submissions, answers, coding_problems; không tạo bảng mới. Xem docs/database để đối chiếu FK/UNIQUE và dictionary.
