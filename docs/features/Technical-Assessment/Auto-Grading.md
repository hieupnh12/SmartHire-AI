# Auto Grading

**Epic:** FE-05 Online Technical Assessment  
**Trạng thái:** `Doing`
**Code ID:** `ASSESS-03`

## Mục đích chức năng

Tự chấm MCQ + coding; tổng điểm assessment.

## Actor

- System

## Luồng hoạt động

1. MCQ và MULTIPLE_CHOICE được chấm khi submit hoặc khi truy cập lượt hết hạn; nhiều đáp án cần chọn chính xác toàn bộ tập đáp án đúng (không điểm một phần).
2. Lưu điểm từng câu vào `answers.score`, đúng/sai vào `answers.is_correct`, tổng vào `submissions.score`.
3. Bài có ESSAY / CODING: lưu nội dung, worker AI / sandbox chấm điểm đề xuất (`suggestedScore`) bất đồng bộ qua RabbitMQ.
4. **Quy tắc công bố & giao kết quả (`auto_grading_enabled`):**
   - **Khi BẬT (`auto_grading_enabled = true`):** Ngay khi tất cả câu hỏi được chấm (MCQ/Essay/Coding), hệ thống tự động chốt điểm chính thức (`score = suggestedScore`), chuyển trạng thái bài thi sang `GRADED`, cập nhật trạng thái tuyển dụng (`settleAfterAssessment`) và tự động gửi email kết quả cho ứng viên mà không cần nhà tuyển dụng xác nhận thủ công.
   - **Khi TẮT (`auto_grading_enabled = false`):** AI & Sandbox chỉ lưu điểm gợi ý, bài làm giữ trạng thái `SUBMITTED`, nhà tuyển dụng truy cập trang chi tiết để xem bằng chứng, điều chỉnh điểm và phê duyệt công bố thủ công.

## Business Rules

- Deterministic grading cho MCQ và test cases của CODING.
- Cấu hình `auto_grading_enabled` được thiết lập tại "Cài đặt chung" của Assessment (`jobs.assessment_config_json.autoGradingEnabled`) và được kế thừa vào từng đề thi sinh ra (`tests.auto_grading_enabled`).
- Khi `auto_grading_enabled = true`, email kết quả (`email_outbox`) được sinh tự động idempotent qua `sendResultEmailSilently`.
- Đề đã publish không được sửa. Submit lặp trả kết quả cũ; không có API regrade trong bước hiện tại.
- Điểm thô: đúng nhận điểm câu, sai/bỏ trống nhận 0; candidate không được truyền điểm hoặc gọi API chấm riêng.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/submissions/{id}/submit_test` (candidate sở hữu) |
| GET | `/api/v1/submissions/{id}/get_submission` (candidate sở hữu) |
| GET | `/api/v1/submissions/{id}/get_result` (staff) |

## Database liên quan

- `answers`, `submissions`, `questions`, `options` theo V12.

## UI mockup

- Google Stitch: **FE-05 Online Technical Assessment / Auto Grading** — _[dán link]_
- Icons: xem `DESIGN.md`
- Candidate xem điểm thô/tổng điểm, kết quả ngưỡng đạt và thời điểm nộp sau hoàn tất; không hiển thị đáp án đúng.
- Màn hình kết quả dùng thẻ căn giữa, khối điểm nổi bật, nhãn đạt/chưa đạt, thời gian nộp và liên kết quay lại bài kiểm tra; các khối xếp dọc trên mobile. Bài chưa có điểm hiển thị “Đang chấm”, bài không có ngưỡng chỉ hiển thị “Đã chấm điểm”.

## Phụ thuộc

ASSESS-01, ASSESS-02

## Mô hình đa phần — cập nhật 2026-10-12

- UI giữ thành phần và token hiện có. Ngân hàng chung có 3 nhóm: trắc nghiệm (`MCQ`/`MULTIPLE_CHOICE`), lý thuyết (`ESSAY`), bài lập trình (`CODING`). Không di chuyển ngân hàng sang master DB; dữ liệu vẫn cách ly theo tenant.
- Essay mới biên soạn rubric gồm đáp án tham khảo và tiêu chí có tổng tỉ trọng 100%. Câu cũ thiếu rubric vẫn có thể chấm tay. Không tự chuyển câu code legacy thành bài thực thi khi chưa có harness/test.
- Form Code quản lý loại thuật toán/OOP/SQL, giới hạn thời gian/bộ nhớ, starter code, harness theo ngôn ngữ và sample/hidden tests. Khi tạo đề tự động, nội dung được sao chép độc lập từ ngân hàng.
- Candidate làm **Quiz** (`MCQ`/`MULTIPLE_CHOICE`/`ESSAY`) rồi chốt sang **Coding**. `complete_objective` khóa phần Quiz; đề không có Quiz bắt đầu trực tiếp Coding.
- Tự luận: Markdown workspace + nháp local; code: studio Monaco + tối đa 5 sample tests. Hidden tests không trả candidate.
- Submit chấm trắc nghiệm đồng bộ, phát RabbitMQ sau commit tới `assessment.essay.grade` và queue code cấu hình `assessment.code.grade.q`; worker concurrency 3–10 chạy trong TenantJobExecutor, header X-Tenant-ID bắt buộc.
- Essay đánh giá ngữ nghĩa theo từng rubric; code dùng 80% tỉ lệ test pass + 20% AI review. Không so chuỗi source và không chấm bằng keyword matching. Mọi điểm AI là đề xuất, recruiter duyệt hoặc điều chỉnh trong màn hình Theo dõi bài làm.
- Staff dùng GET `/api/v1/submissions/{id}/grading_review`, POST `/approve_grade/{questionId}` (body score=null để nhận gợi ý, hoặc điểm thủ công), POST `/retry_grading`. Điểm tổng chỉ công bố sau khi toàn bộ câu được chấm chính thức; giữ EXPIRED cho bài quá hạn.
- Sandbox cần cấu hình `app.assessment.judge-url` / `app.assessment.judge-token` (Spring env: APP_ASSESSMENT_JUDGE_URL / APP_ASSESSMENT_JUDGE_TOKEN). Judge0 phải hỗ trợ wait=true và các language ID Java 62/Python 71/JavaScript 63/SQL 82. Không chạy source trong tiến trình backend. AI chấm tự luận/review code dùng task `ASSESSMENT_GRADING`: ưu tiên cấu hình `CODE_GRADING` trong Master DB khi task này tồn tại; nếu chưa có, giữ model Llama và kết nối `AI_ASSESSMENT_*`. Rate-limit/metering theo task Assessment, không dùng `INTERVIEW_NLP`.
- Provider lỗi không tạo điểm 0. Bài giữ chờ duyệt, có thể retry hoặc chấm tay. Broker lỗi sau commit giữ dữ liệu bài làm; staff retry sau khi broker hoạt động lại. Chưa có quét tự động các bài chờ gửi/chấm.
- Schema V53: tests, questions, submissions, answers, coding_problems; không tạo bảng mới. Xem docs/database để đối chiếu FK/UNIQUE và dictionary.
