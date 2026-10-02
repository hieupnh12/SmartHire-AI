# Multiple Choice Test

**Epic:** FE-05 Online Technical Assessment  
**Trạng thái:** `Doing`
**Code ID:** `ASSESS-01`

## Mục đích chức năng

Tạo/làm bài trắc nghiệm kỹ thuật gắn job/stage.

## Actor

- Recruiter (tạo), Candidate (làm)

## Luồng hoạt động

1. Staff tạo đề nháp, thêm/sửa/xóa câu hỏi kèm options, publish đề hợp lệ.
2. Staff mở hồ sơ ứng viên (Quản lý ứng viên), chọn đề đã publish của job và bấm "Gửi cho ứng viên": đơn ở INTERVIEW được chuyển sang ASSESSMENT (ghi lịch sử trạng thái, gắn stage "Assessment" nếu job có), ứng viên nhận thông báo `ASSESSMENT_INVITATION` và email kèm link `/assessments?applicationId=...`.
3. Candidate dùng applicationId của mình để start/resume đề thuộc cùng job, khi đơn ở ASSESSMENT hoặc INTERVIEW.
4. Candidate lưu từng nhóm đáp án, tải lại tiến độ, submit để chấm trắc nghiệm và xem điểm.
5. Staff xem bài làm và kết quả; hệ thống không tự đổi trạng thái đơn ứng tuyển.

## Business Rules

- Backend và màn hình làm bài Candidate hỗ trợ `MCQ` (một đáp án, mặc định khi bỏ questionType), `MULTIPLE_CHOICE` (nhiều đáp án), `ESSAY` (tự luận). Candidate dùng radio/checkbox/textarea theo loại câu hỏi; lưu, khôi phục và tính tiến độ theo dữ liệu tương ứng. Form biên soạn thủ công của recruiter vẫn là MCQ. Coding, randomize và cấp quyền thi lại chưa triển khai.
- Start được tuần tự hóa bằng khóa hàng đề; trả lượt gần nhất đã có của cặp test/application, kể cả đã hoàn thành. NOT_STARTED được kích hoạt khi đủ điều kiện; không tự tạo lượt thi lại.
- Gửi assessment (`send_assessment`) là lời mời + chuyển trạng thái, không phải assignment: mọi đề PUBLISHED của job vẫn có thể được bắt đầu bởi chủ đơn đủ điều kiện. Nếu cần giao riêng từng ứng viên, bổ sung chính sách assignment ở bước sau.
- Điều kiện gửi: staff được gán job; đề PUBLISHED, job chưa xóa; đơn cùng job, chưa lưu trữ/rút, trạng thái INTERVIEW hoặc ASSESSMENT; AI Interview của đơn đã PASSED. Lỗi: 403 `ASSESSMENT_FORBIDDEN`, 404 `ASSESSMENT_NOT_FOUND`, 409 `TEST_UNAVAILABLE` / `APPLICATION_JOB_MISMATCH` / `APPLICATION_NOT_ELIGIBLE` / `AI_INTERVIEW_NOT_PASSED` / `ASSESSMENT_ALREADY_COMPLETED`.
- Được gửi lại (nhắc) khi ứng viên chưa hoàn thành đề; lượt gần nhất đã SUBMITTED/GRADED/EXPIRED thì từ chối. Đơn đã ở ASSESSMENT không ghi thêm lịch sử trạng thái.
- Email gửi trực tiếp qua SMTP và ghi `email_outbox` (`purpose = ASSESSMENT_INVITATION`, SENT/FAILED, không retry). Email lỗi không làm hỏng request; thông báo trong hệ thống vẫn được tạo, response trả `emailSent = false`.
- Staff (`RECRUITER`, `HR`, `ADMIN`, `TENANT_ADMIN`) trong đúng tenant được tạo, xem và sửa đề. Candidate không được gọi các API quản lý đề.
- Tạo đề luôn ở trạng thái `DRAFT`; chỉ sửa/xóa câu hỏi và sửa thông tin đề trong bản nháp, không đổi job. Publish khóa nội dung và thời lượng. Job đã xóa không được dùng để tạo/sửa đề hoặc bắt đầu lượt mới.
- `passingScore` tùy chọn, tính theo điểm thô; publish kiểm tra từ 0 đến tổng điểm. Không có ngưỡng thì response `passed` là null.
- Tối đa 100 câu/đề, mỗi câu 1–10000 điểm, 2–10 options và đúng một option đúng. Option được quản lý cùng Question; PUT thay toàn bộ options và sinh ID mới. Không publish đề có coding ở luồng MCQ này.
- Metadata biên soạn tùy chọn trên câu hỏi: `difficulty` (`Easy`/`Medium`/`Hard`), `skill`, `explanation`. Excel import bắt buộc difficulty+skill trước khi lưu; API chấp nhận null. `explanation` chỉ trả cho staff, không lộ cho candidate.
- `tests.created_by` ghi user staff tạo đề; `updated_at` cập nhật khi sửa metadata đề. Danh sách recruiter hiển thị tên người tạo và thời điểm cập nhật.
- Candidate chỉ đọc/lưu/nộp submission của mình; lấy candidate từ token, không từ request. Trả 404 khi tài nguyên không thuộc ứng viên; không lộ đáp án đúng, kể cả sau khi nộp.
- Save là upsert từng questionId, không xóa câu ngoài payload; MCQ gửi `selectedOptionId`, nhiều đáp án gửi `selectedOptionIds`, tự luận gửi `answerText` (tối đa 10.000 ký tự), không trộn trường giữa các loại. null/[]/chuỗi rỗng dùng để xóa đáp án tương ứng. Question phải thuộc đề, option phải thuộc question. Payload có questionId lặp bị từ chối; lỗi một câu rollback cả nhóm.
- Khóa hàng submission và transaction READ_COMMITTED tuần tự hóa save/submit; nộp lại trả cùng kết quả. Bỏ trống/sai được 0 điểm, đúng được toàn bộ điểm câu. Không tin điểm từ client.
- Deadline = startedAt + durationMinutes, dùng giờ server. Lưu sau hạn trả 409 SUBMISSION_EXPIRED và vẫn commit EXPIRED/điểm của đáp án đã lưu. GET/start/submit/result cũng hoàn tất lượt quá hạn khi được truy cập; chưa có worker quét hết hạn chủ động.
- Start mới và save/submit khi đang làm yêu cầu đơn còn ở ASSESSMENT/INTERVIEW, chưa lưu trữ/rút, job chưa xóa. Điểm tổng được trả candidate sau hoàn tất; thay đổi chính sách công bố cần cập nhật contract.
- Tên đề bắt buộc, tối đa 255 ký tự; thời lượng là số phút nguyên dương; điểm đạt không âm, tối đa 8 chữ số nguyên và 2 chữ số thập phân.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/assessments/create_draft_test` |
| GET | `/api/v1/assessments/list_tenant_tests?page=0&size=20` |
| GET | `/api/v1/assessments/get_test_metadata/{id}` |
| PUT | `/api/v1/assessments/update_draft_test/{id}` |
| GET | `/api/v1/assessments/{testId}/list_questions` |
| POST | `/api/v1/assessments/{testId}/create_question` |
| PUT | `/api/v1/assessments/{testId}/update_question/{questionId}` |
| DELETE | `/api/v1/assessments/{testId}/delete_question/{questionId}` |
| POST | `/api/v1/assessments/{testId}/publish_test` |
| POST | `/api/v1/assessments/{testId}/send_assessment` (staff, body `{ "applicationId": 7 }` → `testId`, `applicationId`, `applicationStatus`, `emailSent`) |
| POST | `/api/v1/assessments/{testId}/start_submission` |
| GET | `/api/v1/applications/{applicationId}/list_available_assessments` (candidate sở hữu, đơn đủ điều kiện) |
| GET | `/api/v1/submissions/{id}/get_submission` |
| POST | `/api/v1/submissions/{id}/save_answers` |
| POST | `/api/v1/submissions/{id}/submit_test` |
| GET | `/api/v1/submissions/{id}/get_result` (staff) |
| GET | `/api/v1/jobs/{jobId}/list_assessment_submissions` (staff được phân công job hoặc company admin) |

Danh sách bài làm theo job trả mảng gồm `id`, `testId`, `testTitle`, `applicationId`, `candidateId`, `candidateName`, `candidateEmail`, `status`, `startedAt`, `expiresAt`, `submittedAt`, `remainingSeconds`, `score`, `totalPoints`, `passingScore`, `passed`, sắp xếp ID giảm dần. API chỉ đọc: lượt IN_PROGRESS đã quá hạn được trả về EXPIRED với `score`/`submittedAt` NULL, và chỉ được chốt khi candidate/staff truy cập lượt đó lần sau.

Contract chính thức và frontend dùng `submissions`, không cung cấp alias `attempts`. Các API trả `ApiResponse`: tạo đề/câu hỏi HTTP 201; start/resume/save/submit HTTP 200; request không hợp lệ 400; không đủ quyền 403; không tìm thấy/không sở hữu 404; trạng thái không phù hợp hoặc hết hạn 409. Danh sách đề trả `data.items`, `total`, `page`, `size`, sắp xếp ID giảm dần; page âm về 0, size giới hạn 1–50. Danh sách bao gồm metadata đề của job đã xóa để staff tra cứu.

Response submission gồm `id`, `testId`, `applicationId`, `title`, `status`, `startedAt`, `expiresAt`, `submittedAt`, `serverTime`, `remainingSeconds`, `score`, `totalPoints`, `passed`, `questions` và `answers`. Options của candidate chỉ chứa `id`, `optionText`; answers chứa `questionId`, `selectedOptionId`, `selectedOptionIds` và `answerText` khi có.

### JSON kiểm tra bước 1

Dùng token staff và `X-Tenant-ID` khớp tenant của token. Thay `jobId` bằng job đang tồn tại trong tenant. POST và PUT dùng cùng body; PUT phải giữ nguyên jobId:

```json
{
  "jobId": 1,
  "title": "Java basics",
  "description": "Java assessment",
  "durationMinutes": 30,
  "passingScore": 5
}
```

### JSON câu hỏi và bài làm

Staff POST `/assessments/{testId}/create_question` (PUT `/update_question/{questionId}` dùng cùng body):

```json
{
  "questionText": "Which keyword defines a Java class?",
  "points": 5,
  "questionOrder": 0,
  "difficulty": "Easy",
  "skill": "Java",
  "explanation": "class declares a type.",
  "options": [
    { "optionText": "class", "correct": true },
    { "optionText": "def", "correct": false }
  ]
}
```

Staff POST `/assessments/{testId}/publish_test` không cần body. Candidate POST `/assessments/{testId}/start_submission`:

```json
{ "applicationId": 1 }
```

Candidate POST `/submissions/{id}/save_answers`, thay ID theo response start:

```json
{ "answers": [{ "questionId": 1, "selectedOptionId": 2 }] }
```

Candidate POST `/submissions/{id}/submit_test` không cần body, chỉ chấm đáp án đã lưu. Staff GET `/submissions/{id}/get_result` để xem kết quả. Postman collection có nhóm Technical Assessment và biến `testId`, `questionId`, `optionId`, `submissionId`, `candidateToken`; token staff dùng `accessToken`.

Kiểm chứng ngày 2026-09-24: 33 test assessment/multitenancy đạt, trong đó `AssessmentFlowTest` chạy trên MySQL với schema Flyway, không dùng Hibernate tạo bảng. Đã chạy browser test `frontend/tests/assessment.browser.cjs` cho tạo/publish đề, start, lỗi lưu/retry, reload, lưu trước submit và hết giờ; ảnh desktop/mobile không tràn ngang. Browser test dùng API fixture, chưa thay thế E2E đăng nhập qua backend thật hoặc kiểm thử cách ly hai datasource.

## Database liên quan

- V23 thêm `answer_selected_options(answer_id, option_id)` với PK kép và FK. MCQ vẫn lưu `answers.selected_option_id`, tự luận lưu `answers.answer_text`. Không chuyển dữ liệu MCQ cũ sang bảng nối.

## Mở rộng loại câu hỏi V23

- POST/PUT question nhận `questionType`: MCQ có 2–10 lựa chọn và đúng 1 đáp án đúng; MULTIPLE_CHOICE có 2–10 lựa chọn và ít nhất 2 đáp án đúng; ESSAY không có options (bỏ trường hoặc gửi []). Type không hợp lệ trả 400.
- Save MCQ dùng `selectedOptionId`; nhiều đáp án dùng `selectedOptionIds`; tự luận dùng `answerText` tối đa 10.000 ký tự. Không trộn payload giữa các loại. Danh sách ID trùng hoặc option thuộc câu khác bị từ chối, rollback cả nhóm.
- null ở lựa chọn đơn, []/null ở danh sách, null/chuỗi rỗng ở tự luận dùng để xóa câu trả lời tương ứng. Câu không có trong payload giữ nguyên. GET trả lại các trường tương ứng; không trả rubric/đáp án đúng.
- Nhiều đáp án chấm theo tập chính xác: chọn thiếu/thừa/sai nhận 0, đúng toàn bộ nhận điểm câu. Không có điểm một phần.
- Bài có tự luận nộp thành SUBMITTED, score/passed NULL để chờ chấm; hết giờ thành EXPIRED nhưng điểm tổng vẫn NULL. Điểm trắc nghiệm được lưu riêng; chưa có endpoint chấm tự luận. Submit lặp trả kết quả cũ, không sửa bài đã đóng.

- V22 thêm `questionskills(question_id, skill_id)` liên kết N–N `questions`/`skills`, PK kép chống trùng và 2 FK DELETE CASCADE. Entity `QuestionSkill`; chưa đổi API/UI hoặc đồng bộ cột văn bản `questions.skill` sang bảng nối. Trạng thái tính năng vẫn `Doing`.

- Theo schema V12 + V13: `tests` (+ `created_by`, `updated_at`), `questions` (+ `difficulty`, `skill`, `explanation`), `options`, `submissions`, `answers`. Chống ghi trùng bằng khóa hàng trong service, không tuyên bố có UNIQUE mà SQL chưa định nghĩa.
- V12 tách mô hình mới và lưu bảng cũ trong `legacy_v12_*`; V21 xóa toàn bộ bảng/dữ liệu legacy và hai cột ID legacy trong `ranking_sources` theo yêu cầu bỏ lịch sử cũ. FK của mô hình hiện hành giữ nguyên, không chuyển ID cũ sang submission mới. Xem `docs/database/README.md` §10.7–10.8. Chỉ tạo entity/repository không tự tạo bảng tenant (`hbm2ddl=none`).

## UI mockup

Kiểm chứng bản sửa Candidate ngày 2026-09-29: `frontend/tests/assessment-types.browser.cjs` đạt với API fixture cho đề trộn MCQ/MULTIPLE_CHOICE/ESSAY: đúng trường payload, lỗi lưu và retry, bỏ chọn, khôi phục sau reload, tự luận, mobile không tràn ngang và lưu đáp án mới nhất trước nộp. Chưa kiểm thử E2E backend thật. Build toàn frontend còn bị chặn bởi lỗi TypeScript ngoài phần sửa.

- Google Stitch: **FE-05 Online Technical Assessment / Multiple Choice Test** — _[dán link]_
- Icons: xem `DESIGN.md`
- Recruiter: `/recruiter/assessments`, `/new`, `/:id`; danh sách phân trang, thông tin đề, CRUD câu hỏi/options, chọn đáp án đúng, publish khóa sửa.
- Theo dõi bài làm: `/recruiter/jobs/:id/assessments/submissions` (nút "Theo dõi bài làm" trên trang bài đánh giá) liệt kê lượt làm của mọi đề trong job với tab Đang làm bài / Đã nộp / Hết thời gian, tìm theo ứng viên, lọc theo đề, thời gian còn lại và điểm; tự làm mới mỗi 15 giây.
- Ngân hàng câu hỏi: `/recruiter/assessments/question-bank` tổng hợp câu MCQ theo bộ sưu tập, vị trí và bộ lọc; mở đề gốc để sửa. Độ khó/kỹ năng/giải thích lưu trên `questions` (V13). Yêu thích lưu trên trình duyệt. Coding / nhiều đáp án / tự luận vẫn ngoài phạm vi ASSESS-01.
- Candidate: `/assessments` chọn đơn hợp lệ; `/assessments/:submissionId/take` có radio cho MCQ, checkbox cho nhiều đáp án, ô tự luận với bộ đếm ký tự, điều hướng, tiến độ, tự lưu/retry, timer, xác nhận nộp và điểm tổng (bài tự luận hiển thị đang chấm). Tự luận chỉ có khoảng trắng không được tính là đã trả lời.
- Query key assessment phân biệt tenant/user; Axios hiện có gắn token và tenant header. Server state dùng TanStack Query, form dùng React Hook Form + Zod.

## Phụ thuộc

JOB-04

### Ngân hàng câu hỏi chung recruiter

- Trạng thái: `Doing` (API thêm/sửa/đọc/lưu trữ đã triển khai; tự tạo assessment theo skill và chọn câu chung vào assessment chưa triển khai).
- Route `/recruiter/question-bank`: đọc câu độc lập và toàn bộ câu của các assessment trong cùng tenant. Không tạo bài assessment để lưu câu độc lập. Câu thêm trong assessment/job hiện có tự xuất hiện trong danh sách chung qua truy vấn, không sao chép.
- Staff cùng tenant được đọc ngân hàng chung; candidate và token sai tenant bị từ chối trước truy vấn. Quyền assessment/job và khóa bài đã xuất bản vẫn giữ nguyên. API chung không sửa hoặc lưu trữ câu có `test_id`; UI dẫn tới assessment gốc để sửa.
- Thêm câu hỏi / Nhập Excel mở `/recruiter/question-bank/new`; `/recruiter/question-bank/:questionId/edit` mở câu độc lập đã lưu trong bảng soạn. Bản nháp chưa gửi lưu tạm trong `sessionStorage` theo tenant/user; câu đã lưu được tải lại từ API.
- Nút Kiểm tra dùng cùng `ExcelImportReview`: phân loại VALID/INVALID/WARNING, bỏ dòng trống, chọn chỉ lưu dòng hợp lệ hoặc yêu cầu tất cả hợp lệ, báo nội dung trùng trong lô là WARNING, xem trước giám khảo/ứng viên bằng cùng `AssessmentPublishReview` và `QuestionAnswerPanel`.
- Kiểm định ngân hàng yêu cầu skill (tối đa 128 ký tự), difficulty Easy/Medium/Hard, điểm nguyên 1–10.000 và đáp án đúng theo loại. Không cần tên bài, thời lượng, điểm đạt hoặc tổng điểm bằng 10. Không kiểm tra trùng với toàn bộ dữ liệu DB; quy tắc cảnh báo trùng trong lô giống luồng riêng hiện có.
- Lưu 1–999 câu trong một transaction; một câu lỗi hoặc lỗi DB làm rollback cả lô, không tạo bài nháp dở dang. Lỗi API hiển thị tại màn xem trước, có thể thử lưu lại. Câu được đồng bộ nhãn `questions.skill` vào `skills`/`questionskills` khi thêm/sửa từ API chung; không backfill câu cũ.
- V41 cho phép `questions.test_id` NULL, thêm `authoring_metadata` JSON để giữ rubric/đáp án mẫu/snippet/ngôn ngữ và `bank_archived`. Không thêm bảng hay bỏ FK; metadata biên soạn không trả candidate.

| Method | API ngân hàng chung | Chức năng |
|---|---|---|
| GET | `/api/v1/question-bank/list_questions?page=0&size=100` | Danh sách phân trang; size 1–100 |
| GET | `/api/v1/question-bank/get_question/{id}` | Chi tiết staff, gồm options và metadata biên soạn |
| POST | `/api/v1/question-bank/create_questions` | Body `{ questions: [{ question: QuestionRequest, authoringMetadata: object }] }`, trả 201 |
| PUT | `/api/v1/question-bank/update_question/{id}` | Thay toàn bộ câu độc lập và options, trả 200 |
| PUT | `/api/v1/question-bank/archive_questions` | Body `{ questionIds: [id], archived: true/false }`; chỉ câu độc lập |

Response đều bọc `ApiResponse`; item gồm `question`, `testId/testTitle/testStatus`, `jobId/jobTitle`, `archived`, `authoringMetadata`. Lỗi: 400 dữ liệu không hợp lệ, 403 role/tenant sai, 404 `BANK_QUESTION_NOT_FOUND`, 409 `BANK_QUESTION_IN_TEST`. Không đổi API hoặc luồng assessment riêng hiện có.

Kiểm chứng ngày 2026-10-02: build frontend đạt; 36 test assessment/ngân hàng đạt, gồm HTTP thêm/đọc/sửa/lưu trữ, không tạo assessment khi thêm câu chung, giữ metadata và skill, rollback lô lỗi, từ chối candidate/sai tenant và bảo vệ câu thuộc assessment. Các integration test lần này dùng H2 + MockMvc; chưa chạy migration V41 trên MySQL thực tế hoặc kiểm thử giao diện qua trình duyệt.
