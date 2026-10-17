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
| GET | `/api/v1/submissions/{id}/grading_review` |

## Database liên quan

- `coding_problems`, `test_cases`, `coding_submissions`

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
- Form Code quản lý loại thuật toán/OOP/SQL, giới hạn thời gian/bộ nhớ, starter code, harness theo ngôn ngữ và sample/hidden tests. Khi tạo đề tự động, nội dung được sao chép độc lập từ ngân hàng.
- Candidate làm phần trắc nghiệm trước, bấm chốt rồi chuyển tự luận/code. `POST /api/v1/submissions/{id}/complete_objective` khóa đáp án ở server; reload không mở lại phần đã chốt. Đề không có trắc nghiệm bắt đầu trực tiếp phần thực hành. `objectiveDurationMinutes` tùy chọn nhỏ hơn tổng thời lượng: hết hạn riêng, server tự chốt khi GET/save/submit; tổng hạn vẫn tính từ startedAt.
- Tự luận nhập Markdown và đếm từ; lưu nháp mỗi 10 giây. Code dùng Monaco đóng gói nội bộ, chọn ngôn ngữ và chạy tối đa 5 sample tests qua `POST /api/v1/submissions/{id}/coding/{questionId}/run_samples`; hidden tests/harness/rubric/điểm gợi ý không trả candidate.
- Submit chấm trắc nghiệm đồng bộ, phát RabbitMQ sau commit tới `assessment.essay.grade` và queue code cấu hình `assessment.code.grade.q`; worker concurrency 3–10 chạy trong TenantJobExecutor, header X-Tenant-ID bắt buộc.
- Essay đánh giá ngữ nghĩa theo từng rubric; code dùng 80% tỉ lệ test pass + 20% AI review. Không so chuỗi source và không chấm bằng keyword matching. Mọi điểm AI là đề xuất, recruiter duyệt hoặc điều chỉnh trong màn hình Theo dõi bài làm.
- Staff dùng GET `/api/v1/submissions/{id}/grading_review`, POST `/approve_grade/{questionId}` (body score=null để nhận gợi ý, hoặc điểm thủ công), POST `/retry_grading`. Điểm tổng chỉ công bố sau khi toàn bộ câu được chấm chính thức; giữ EXPIRED cho bài quá hạn.
- Sandbox cần cấu hình `app.assessment.judge-url` / `app.assessment.judge-token` (Spring env: APP_ASSESSMENT_JUDGE_URL / APP_ASSESSMENT_JUDGE_TOKEN). Judge0 phải hỗ trợ wait=true và các language ID Java 62/Python 71/JavaScript 63/SQL 82. Không chạy source trong tiến trình backend. AI chấm tự luận/review code dùng model Llama qua task `ASSESSMENT_GRADING`, giữ rate-limit/metering theo tenant.
- Provider lỗi không tạo điểm 0. Bài giữ chờ duyệt, có thể retry hoặc chấm tay. Broker lỗi sau commit giữ dữ liệu bài làm; staff retry sau khi broker hoạt động lại. Chưa có quét tự động các bài chờ gửi/chấm.
- Schema V53: tests, questions, submissions, answers, coding_problems; không tạo bảng mới. Xem docs/database để đối chiếu FK/UNIQUE và dictionary.
