# Coding Challenge

**Epic:** FE-05 Online Technical Assessment  
**Trạng thái:** `Doing`
**Code ID:** `ASSESS-02`

## Mục đích chức năng

Bài coding: đề, nộp code, chạy test cases (sandbox/worker).

## Actor

- Recruiter, Candidate, System grader

## Luồng hoạt động

1. Candidate submit source.
2. Queue `assessment.code.grade`.
3. Chạy test → kết quả.

## Business Rules

- Cập nhật 16/10/2026: AI chấm tự luận và review code sau khi ứng viên nộp bài dùng task riêng `ASSESSMENT_GRADING`, model mặc định `vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M`, dùng chung endpoint/key `AI_ASSESSMENT_*` với sinh câu hỏi. Không còn gọi cấu hình `INTERVIEW_NLP` cho bài Assessment. Temperature chấm là 0.10, timeout mặc định 120 giây; lỗi model giữ trạng thái chờ duyệt/retry, không tự đổi model hoặc cho điểm 0.
- Chạy testcase vẫn qua sandbox; tỷ lệ điểm code giữ 80% testcase + 20% AI review, recruiter duyệt điểm trước khi công bố. Trắc nghiệm vẫn chấm theo đáp án đúng; không gọi AI.
- Kiểm chứng cấu hình chấm Llama: 22 test backend đạt, gồm chấm tự luận/code, tỷ lệ 80/20, lỗi AI không thành điểm 0, HTTP contract gửi đúng model/task và hồi quy AI Interview. Kiểm tra HTTP dùng server localhost giả lập; chưa gửi bài làm ứng viên tới model thật.

- Timeout/memory limit.
- Không tin tưởng client-side grade.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/submissions/{id}/coding/{questionId}/run_samples` |
| POST | `/api/v1/submissions/{id}/coding/{questionId}/run_custom` |
| POST | `/api/v1/submissions/{id}/proctor-events` |
| POST | `/api/v1/question-bank/verify_coding` |
| GET | `/api/v1/submissions/{id}/grading_review` |
| GET | `/api/v1/submissions/{id}/grading_detail` |
| POST | `/api/v1/submissions/{id}/send_result_email` |
| GET | `/api/v1/jobs/{jobId}/assessment_report` |

## Database liên quan

- `coding_problems` (+ `verified_at`, `verified_language`), `test_cases`, `coding_submissions`, `tests.coding_test_weight_percent`, `answers.custom_run_count`, `email_outbox.reference_key`, `proctor_events`

## UI mockup

- Cập nhật 16/10/2026: khu soạn tự luận/lý thuyết riêng trong tab “Tự luận code & lý thuyết”, có danh sách câu, nút thêm riêng từng loại và chuyển loại câu đang soạn. Giữ bố cục mẫu HTML: nội dung/rubric 3 mức bên trái, khung gợi ý và đáp án mẫu bên phải, cấu hình chấm/code ở dưới; màu kế thừa token tenant. Câu trắc nghiệm tiếp tục dùng bảng Excel hiện có. Phần giao diện này đã hoàn thành; trạng thái feature tổng thể giữ `Doing`.

- Google Stitch: **FE-05 Online Technical Assessment / Coding Challenge** — _[dán link]_
- Icons: xem `DESIGN.md`
- Form biên soạn (16/10/2026): phần 1 chứa đề bài, kỹ năng, độ khó, điểm, rubric 3 mức, mã khởi đầu theo từng ngôn ngữ và đáp án mẫu bảo mật. Mã khởi đầu dùng chung dữ liệu với cấu hình code khi lưu, không có ô nhập lặp lại bên dưới. Màn hình nhỏ xếp thành một cột.
- Phần 2 chỉ xuất hiện với câu code: input/output của testcase, nhãn công khai/ẩn và thống kê. Harness, phân loại bài và giới hạn thời gian/bộ nhớ nằm trong mục “Cấu hình chạy nâng cao” có thể mở/thu gọn. Giới hạn áp dụng cho từng lần chạy, không phải thời gian làm bài. Câu lý thuyết dùng rubric và đáp án mẫu trong phần 1, không có phần thực thi.
- Mỗi khung ngôn ngữ ở phần 1 có nút Xóa: bỏ đồng thời mã khởi đầu và harness của ngôn ngữ đó, giữ testcase và các ngôn ngữ còn lại. Có thể thêm lại từ danh sách; khi xóa hết, hiển thị hướng dẫn thêm ít nhất một ngôn ngữ trước khi lưu.
- Nút kiểm tra bộ test dùng đáp án mẫu ở phần 1 và ngôn ngữ được chọn để gọi API `POST /api/v1/question-bank/verify_coding`; không yêu cầu nhập lại lời giải. Kết quả cũ không hiển thị sau khi cấu hình, đáp án mẫu hoặc ngôn ngữ thay đổi. Cần sandbox chấm code hoạt động để chạy kiểm tra.

## Phụ thuộc

ASSESS-01

## Mô hình đa phần — cập nhật 2026-10-12

- UI giữ thành phần và token hiện có. Ngân hàng chung có 3 nhóm: trắc nghiệm (`MCQ`/`MULTIPLE_CHOICE`), lý thuyết (`ESSAY`), bài lập trình (`CODING`). Không di chuyển ngân hàng sang master DB; dữ liệu vẫn cách ly theo tenant.
- Essay mới biên soạn rubric gồm đáp án tham khảo và tiêu chí có tổng tỉ trọng 100%. Câu cũ thiếu rubric vẫn có thể chấm tay. Không tự chuyển câu code legacy thành bài thực thi khi chưa có harness/test.
- Form Code quản lý tên bài, **Constraints**, loại thuật toán/OOP/SQL, giới hạn thời gian/bộ nhớ, starter/harness theo ngôn ngữ (`java`/`python`/`javascript`/`cpp`/`sql`) và sample/hidden tests (sample có **Explanation**). Có **mẫu I/O** (hai số, một dòng, JSON stdin, chương trình đầy đủ, SQL) để sinh starter+harness. Test ẩn có thể gắn trọng số chấm (tổng 100%, ≥2 test ẩn); để trống thì chia đều. Recruiter **kiểm chứng lời giải mẫu** qua `POST /api/v1/question-bank/verify_coding` (kèm `questionId` khi đã lưu để ghi `coding_problems.verified_at`). **Publish gate cứng:** `publish_test` từ chối nếu bất kỳ câu CODING nào thiếu `verified_at` (lời giải mẫu phải pass 100% test kể cả hidden). Sửa nội dung code → xóa `verified_at`. Khi tạo đề tự động, nội dung được sao chép độc lập từ ngân hàng.
- Candidate studio: Constraints + Explanation ví dụ; chạy sample với tóm tắt `x/y passed`; tab **Custom input** qua `run_custom` (chỉ stdout/stderr, không lộ test ẩn); mỗi custom-run tăng `answers.custom_run_count` (anti-cheat nhẹ).
- Candidate làm **Quiz** trước, chốt rồi vào **Coding** (HackerRank-style studio). `complete_objective` khóa Quiz; coding chỉ sau khi chốt (hoặc đề không có Quiz). Proctor client gửi `POST /api/v1/submissions/{id}/proctor-events` (blur/copy/fullscreen/…) gắn submission; staff xem cạnh điểm trong `grading_detail.integrity`.
- Code: Monaco đóng gói nội bộ, chạy tối đa 5 sample tests qua `POST /api/v1/submissions/{id}/coding/{questionId}/run_samples`; hidden tests/harness không trả candidate.
- Submit chấm trắc nghiệm đồng bộ, phát RabbitMQ sau commit tới `assessment.essay.grade` và queue code cấu hình `assessment.code.grade.q`; worker concurrency 3–10 chạy trong TenantJobExecutor, header X-Tenant-ID bắt buộc.
- Essay đánh giá ngữ nghĩa theo từng rubric (`ASSESSMENT_GRADING`). Code chấm theo **hidden tests only** (sample không tính điểm); trọng số ẩn tự chia đều 100% nếu recruiter không nhập. Tỉ lệ test/AI lấy từ `tests.coding_test_weight_percent` (mặc định 90 → `90% × tests_hidden% + 10% × AI%`; screening có thể đặt 100/0). Nếu `tests_hidden% = 0` → điểm gợi ý 0 và bỏ qua AI. `hardcode_suspected` → trần 50% điểm câu + cờ duyệt tay. Trạng thái chạy: PASSED / PARTIAL / FAILED theo hidden. Không so chuỗi source; mọi điểm AI là đề xuất, recruiter duyệt hoặc điều chỉnh trong Theo dõi bài làm.
- Staff dùng GET `/api/v1/submissions/{id}/grading_review` / `grading_detail` (kèm integrity), POST `/approve_grade/{questionId}` (body score=null để nhận gợi ý, hoặc điểm thủ công), POST `/retry_grading`, POST `/send_result_email` (idempotent theo `email_outbox.reference_key = assessment-result:{submissionId}`; FAILED/PENDING được tái xếp hàng). Báo cáo job: GET `/api/v1/jobs/{jobId}/assessment_report` (pass-rate theo câu, thời gian, custom-run, proctor count). Điểm tổng chỉ công bố sau khi toàn bộ câu được chấm chính thức; giữ EXPIRED cho bài quá hạn.
- Sandbox cấu hình `app.assessment.judge-url` / `app.assessment.judge-token` (Spring env: APP_ASSESSMENT_JUDGE_URL / APP_ASSESSMENT_JUDGE_TOKEN). Hỗ trợ cả Judge0 Cloud SaaS (RapidAPI: https://judge0-ce.p.rapidapi.com với header `x-rapidapi-key`) lẫn Judge0 self-hosted (`X-Auth-Token`). Yêu cầu hỗ trợ wait=true và các language ID Java 62/Python 71/JavaScript 63/C++ 54/SQL 82. Không chạy source trong tiến trình backend. Tự luận dùng task `ASSESSMENT_GRADING` (ưu tiên cấu hình `CODE_GRADING` trong Master DB khi task này tồn tại; nếu chưa có, giữ model và kết nối `AI_ASSESSMENT_*`). Review code dùng task `CODE_GRADING`. Rate-limit/metering theo task Assessment, không dùng `INTERVIEW_NLP`.
- Provider lỗi không tạo điểm 0. Bài giữ chờ duyệt, có thể retry hoặc chấm tay. Broker lỗi sau commit giữ dữ liệu bài làm; staff retry sau khi broker hoạt động lại. Chưa có quét tự động các bài chờ gửi/chấm.
- Schema V53–V56: tests, questions, submissions, answers, coding_problems, email_outbox, proctor_events; V55 và V56 không tạo bảng mới. Xem docs/database để đối chiếu FK/UNIQUE và dictionary.
