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
3. Candidate dùng applicationId của mình để start/resume đề thuộc cùng job, khi đơn ở ASSESSMENT và đã có AI Interview PASSED. Trang `/assessments` chỉ liệt kê đơn ở ASSESSMENT.
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
- Start mới và save/submit khi đang làm yêu cầu đơn còn ở ASSESSMENT, đã có AI Interview PASSED (nếu chưa: 409 `AI_INTERVIEW_NOT_PASSED`), chưa lưu trữ/rút, job chưa xóa. Điểm tổng được trả candidate sau hoàn tất; thay đổi chính sách công bố cần cập nhật contract.
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

- Màn hình recruiter **Xem đề**: thẻ tổng quan trạng thái, thời lượng, số câu/tổng điểm và ngưỡng đạt; cột thông tin Job/mô tả gọn bên trái, từng câu hỏi trong thẻ riêng bên phải. Câu hỏi có nhãn loại bài/độ khó/kỹ năng; phương án đánh chữ A–B–C–D, đáp án đúng có nền nhấn và nhãn chữ, giải thích ở vùng riêng. Mobile xếp một cột; thao tác sửa/xóa/xuất bản của bản nháp giữ nguyên.
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

- Trạng thái: `Doing` (API ngân hàng, cấu hình và tạo assessment tự động từ câu theo skill đã triển khai; cần kiểm chứng rollout MySQL/RabbitMQ và E2E).
- Route `/recruiter/question-bank`: đọc câu độc lập và toàn bộ câu của các assessment trong cùng tenant. Không tạo bài assessment để lưu câu độc lập. Câu thêm trong assessment/job hiện có tự xuất hiện trong danh sách chung qua truy vấn, không sao chép.
- Ngân hàng riêng `/recruiter/jobs/:id/assessments/question-bank` dùng cùng nguồn API chung: giữ các câu đã thuộc job và bổ sung câu có nhãn skill khớp ít nhất một skill của job (trim, không phân biệt hoa/thường, khớp nguyên tên; không suy đoán từ nội dung). Câu chung/câu của job khác đã lưu trữ không được bổ sung. Job chưa có skill chỉ hiển thị câu đã thuộc job. Không sao chép câu hoặc tự tạo assessment; liên kết sửa dẫn tới câu chung hoặc assessment gốc đúng job. Cache dùng chung theo tenant/user, được invalidate sau khi lưu câu hỏi; thay đổi skill job lọc lại danh sách theo dữ liệu job mới.
- Nhóm route `/recruiter/question-bank/**` dùng không gian làm việc tập trung, không hiển thị header và thanh điều hướng của recruiter; nội dung trang vẫn kế thừa tenant theme từ `RoleShell`.
- Bảng danh sách dùng mật độ compact: gộp mã/trạng thái vào cột câu hỏi, nội dung dài hiển thị một dòng và mở drawer để xem đầy đủ; kỹ năng dư được thu gọn thành bộ đếm.
- Header ngân hàng chung dùng bố cục compact gồm breadcrumb, tiêu đề/mô tả ngắn và nhóm thao tác; không lặp tổng số câu hỏi ở phần đầu trang. Tổng số chỉ hiển thị trong vùng kết quả/phân trang.
- Phân trang ngân hàng chung hỗ trợ 10/25/50 hàng, giữ `page` và `size` trên URL khi tải lại, hiển thị cửa sổ số trang quanh trang hiện tại và cho phép về trang đầu/cuối. Client chỉ gọi đúng trang đang dùng; tìm kiếm, bộ lọc và sắp xếp được gửi lên API trước khi phân trang. Khi tải trang kế tiếp, bảng bỏ dữ liệu trang cũ và hiện `LoadingState` + `TableSkeleton` với hiệu ứng shimmer dùng chung toàn dự án; các nút phân trang và chọn số hàng bị khóa/ẩn cho đến khi request hoàn tất để không phát sinh chuyển trang chồng nhau. Xuất CSV và chọn tất cả áp dụng cho trang hiện tại, không tải ngầm toàn bộ ngân hàng.
- Trạng thái hiển thị phân biệt dữ liệu và tiến trình: câu không thuộc assessment là `Câu độc lập`, câu thuộc đề `DRAFT` là `Bản nháp`, `PUBLISHED` là `Sẵn sàng`, `ARCHIVED` là `Đã lưu trữ`; `Đang lưu…` chỉ dùng khi request ghi dữ liệu đang chạy. Bộ lọc `Chưa xuất bản` chỉ gồm câu thuộc đề nháp, không gồm câu độc lập.
- Staff cùng tenant được đọc ngân hàng chung; candidate và token sai tenant bị từ chối trước truy vấn. Quyền assessment/job và khóa bài đã xuất bản vẫn giữ nguyên. API chung không sửa hoặc lưu trữ câu có `test_id`; UI dẫn tới assessment gốc để sửa.
- Thêm câu hỏi / Nhập Excel mở `/recruiter/question-bank/new`; `/recruiter/question-bank/:questionId/edit` mở câu độc lập đã lưu trong bảng soạn. Bản nháp chưa gửi lưu tạm trong `sessionStorage` theo tenant/user; câu đã lưu được tải lại từ API.
- Nút Kiểm tra dùng cùng `ExcelImportReview`: phân loại VALID/INVALID/WARNING, bỏ dòng trống, chọn chỉ lưu dòng hợp lệ hoặc yêu cầu tất cả hợp lệ, báo nội dung trùng trong lô là WARNING, xem trước giám khảo/ứng viên bằng cùng `AssessmentPublishReview` và `QuestionAnswerPanel`.
- Kiểm định ngân hàng yêu cầu skill (tối đa 128 ký tự), difficulty Easy/Medium/Hard, điểm nguyên 1–10.000 và đáp án đúng theo loại. Không cần tên bài, thời lượng, điểm đạt hoặc tổng điểm bằng 10. Không kiểm tra trùng với toàn bộ dữ liệu DB; quy tắc cảnh báo trùng trong lô giống luồng riêng hiện có.
- Lưu 1–999 câu trong một transaction; một câu lỗi hoặc lỗi DB làm rollback cả lô, không tạo bài nháp dở dang. Lỗi API hiển thị tại màn xem trước, có thể thử lưu lại. Câu được đồng bộ nhãn `questions.skill` vào `skills`/`questionskills` khi thêm/sửa từ API chung; không backfill câu cũ.
- V41 cho phép `questions.test_id` NULL, thêm `authoring_metadata` JSON để giữ rubric/đáp án mẫu/snippet/ngôn ngữ và `bank_archived`. Không thêm bảng hay bỏ FK; metadata biên soạn không trả candidate.

| Method | API ngân hàng chung | Chức năng |
|---|---|---|
| GET | `/api/v1/question-bank/list_questions?page=0&size=10&collection=all&query=&skill=&difficulty=&status=&questionType=&sort=latest` | Danh sách phân trang phía server; size 1–100, trả thêm tổng số theo bộ sưu tập và danh sách kỹ năng |
| GET | `/api/v1/question-bank/get_question/{id}` | Chi tiết staff, gồm options và metadata biên soạn |
| POST | `/api/v1/question-bank/create_questions` | Body `{ questions: [{ question: QuestionRequest, authoringMetadata: object }] }`, trả 201 |
| PUT | `/api/v1/question-bank/update_question/{id}` | Thay toàn bộ câu độc lập và options, trả 200 |
| PUT | `/api/v1/question-bank/archive_questions` | Body `{ questionIds: [id], archived: true/false }`; chỉ câu độc lập |

Response đều bọc `ApiResponse`; trang danh sách gồm `items`, `total`, `page`, `size`, `counts`, `skills`; mỗi item gồm `question`, `testId/testTitle/testStatus`, `jobId/jobTitle`, `archived`, `authoringMetadata`. Lỗi: 400 dữ liệu không hợp lệ, 403 role/tenant sai, 404 `BANK_QUESTION_NOT_FOUND`, 409 `BANK_QUESTION_IN_TEST`. Không đổi luồng assessment riêng hiện có.

Kiểm chứng ngày 2026-10-02: build frontend đạt; 36 test assessment/ngân hàng đạt, gồm HTTP thêm/đọc/sửa/lưu trữ, không tạo assessment khi thêm câu chung, giữ metadata và skill, rollback lô lỗi, từ chối candidate/sai tenant và bảo vệ câu thuộc assessment. Các integration test lần này dùng H2 + MockMvc; chưa chạy migration V41 trên MySQL thực tế hoặc kiểm thử giao diện qua trình duyệt.

### Tạo assessment thủ công / tự động (2026-10-03)

- Actor: recruiter/staff có quyền trên job; candidate chỉ nhận và làm đề của hồ sơ mình.
- `/recruiter/jobs/:id/assessments/new` chọn **Tạo thủ công** hoặc **Tạo tự động**. Thủ công: soạn câu hỏi bằng bảng hiện có → kiểm tra/xem trước → nhập metadata đề → lưu DRAFT → xuất bản ở trang chi tiết. Không tạo đề rỗng trước bước thêm câu hỏi.
- Tự động: cấu hình từng nhóm `skill`, `questionType` MCQ/MULTIPLE_CHOICE/ESSAY, `difficulty` Easy/Medium/Hard, số câu và điểm/câu; thời lượng 1–480 phút, ngưỡng đạt 0–100%. Skill phải thuộc job; tổng 1–100 câu. ESSAY gồm tự luận lý thuyết/code theo dữ liệu ngân hàng hiện có.
- UI cấu hình gồm hai tab cùng một form như AI Interview: **Cấu hình chung** (tự tạo cho ứng viên, ngưỡng đạt, số câu theo bài tập, thời lượng, trọng số nhóm tính từ điểm, Job Skills) và **Cấu hình bài tập** (skill/type/difficulty/count/points). Chuyển tab giữ dữ liệu; một lần lưu gửi cả hai phần. Chọn/bỏ skill thêm/xóa nhóm tương ứng. Hai luồng tạo đề đều đọc cùng `assessment_config_json`, không có cấu hình riêng cho ứng viên. Lỗi validation mở tab chứa trường sai.
- Job chưa lưu cấu hình: API trả success với dữ liệu null; do `ApiResponse` bỏ trường null, frontend chuẩn hóa `data` bị bỏ thành null để mở form mặc định, không trả undefined cho TanStack Query.
- **Tạo bài assessment tự động** lưu cấu hình rồi chọn ngẫu nhiên câu hợp lệ từ ngân hàng theo skill/type/difficulty, tự đặt tên theo job + thời điểm, copy nội dung/options/metadata sang đề DRAFT. Recruiter kiểm tra và xuất bản. Câu nguồn giữ nguyên. Câu lưu trữ và bản copy của đề riêng ứng viên không được dùng làm nguồn; loại trùng nội dung trong cùng đề. Thiếu câu trả 409 `ASSESSMENT_BANK_INSUFFICIENT`, rollback không để lại đề tạo dở.
- **Tự động tạo đề riêng khi ứng viên vượt AI Interview**: cấu hình `autoAssign=true` áp dụng cả hồ sơ đạt trước khi bật và các hồ sơ đạt sau này. Chỉ hồ sơ ASSESSMENT, có AI Interview PASSED, không rút/lưu trữ, job chưa bị xóa. Bật cấu hình yêu cầu ngân hàng đáp ứng cấu trúc hiện tại.
- Cấu hình Assessment ban đầu mặc định `autoAssign=true`, recruiter không cần tích bật. Cần lưu cấu trúc hợp lệ và ngân hàng đủ câu để tự động chạy; cấu hình đã lưu (kể cả `false`) được giữ nguyên, recruiter có thể bỏ tích và lưu để tắt.
- Dispatcher tenant hiện có quét mỗi 15 giây mặc định, đưa application ID vào RabbitMQ `smarthire.assessment.generate` với header `X-Tenant-ID`; worker concurrency 3–10 dùng `TenantJobExecutor` để set/clear tenant. Khóa hồ sơ và UNIQUE `tests.assigned_application_id` ngăn tạo lặp. Transaction tạo PUBLISHED + notification `ASSESSMENT_INVITATION` + email outbox; email dùng worker/retry hiện có tối đa 3 lần. Không tạo nhiều đề nếu AI Interview được xử lý lại hoặc cấu hình được lưu lại.
- Đề gán riêng chỉ xuất hiện trong danh sách available và start với đúng application; staff không thể gửi đề đó cho application khác. Các đề dùng chung (`assigned_application_id=NULL`) giữ luồng hiện có. Hệ thống không tự sửa đề đã tạo khi cấu hình/ngân hàng thay đổi.
- Nếu ngân hàng/skill thay đổi khiến không đủ câu, hồ sơ vẫn chờ, kết quả AI Interview giữ nguyên. Giao diện cấu hình hiển thị số hồ sơ đủ điều kiện/đã có đề/chưa có đề và lỗi ngân hàng; cập nhật 15 giây. Khi bổ sung câu hoặc sửa cấu hình, dispatcher xử lý lại. Tắt `autoAssign` dừng tạo mới, không xóa đề đã tạo.
- DB V43 mở rộng `Job`, `JobTest`, không tạo bảng mới; xem dictionary và ERD. Bật backend mới cần chạy migration V43 và RabbitMQ.

| Method | API | Chức năng |
|---|---|---|
| GET | `/api/v1/assessments/jobs/{jobId}/configuration` | Cấu hình đã lưu hoặc null |
| PUT | `/api/v1/assessments/jobs/{jobId}/configuration` | Lưu `{durationMinutes,passingPercent,autoAssign,sections:[{skill,questionType,difficulty,count,points}]}` |
| POST | `/api/v1/assessments/jobs/{jobId}/generate` | Tạo đề DRAFT tự đặt tên từ cấu hình đã lưu |
| GET | `/api/v1/assessments/jobs/{jobId}/automation_status` | `{eligible,generated,pending,bankReady,bankError}` cho job |

Tất cả API trên bọc `ApiResponse`, staff cùng tenant và có quyền job; 400 dữ liệu/skill sai, 403 quyền/tenant sai, 404 job không tồn tại, 409 ngân hàng thiếu câu.

Kiểm chứng ngày 2026-10-03: build frontend đạt; 51 test backend assessment/AI Interview/email đạt. Bao gồm tạo DRAFT từ ngân hàng, backfill hồ sơ đã PASSED, tạo PUBLISHED riêng, thông báo, chặn ứng viên khác, thiếu ngân hàng rollback, skill bị đổi, hồ sơ failed/withdrawn, hai lượt xử lý đồng thời chỉ tạo một đề và email retry tối đa 3 lần. Integration dùng H2 + MockMvc; chưa kiểm chứng migration V43 trên MySQL, RabbitMQ thực hoặc E2E trình duyệt (Playwright chưa có trong môi trường).

Kiểm chứng bản sửa cấu hình cùng ngày: build frontend đạt, test API client cho response bỏ `data`/null/cấu hình đã lưu đạt; 25 test `AssessmentFlowTest` đạt. Regression test so sánh đề DRAFT tạo bằng nút và đề PUBLISHED tạo cho hồ sơ với cùng cấu hình 2 câu MCQ, skill, độ khó, 3 điểm/câu, 17 phút và ngưỡng 60%; cả hai dùng cùng cấu trúc đã lưu. Chưa kiểm chứng giao diện trên trình duyệt thực.

## Mô hình đa phần — cập nhật 2026-10-12

- UI giữ thành phần và token hiện có. Ngân hàng chung có 3 nhóm: trắc nghiệm (`MCQ`/`MULTIPLE_CHOICE`), lý thuyết (`ESSAY`), bài lập trình (`CODING`). Không di chuyển ngân hàng sang master DB; dữ liệu vẫn cách ly theo tenant.
- Essay mới biên soạn rubric gồm đáp án tham khảo và tiêu chí có tổng tỉ trọng 100%. Câu cũ thiếu rubric vẫn có thể chấm tay. Không tự chuyển câu code legacy thành bài thực thi khi chưa có harness/test.
- Form Code quản lý loại thuật toán/OOP/SQL, giới hạn thời gian/bộ nhớ, starter code, harness theo ngôn ngữ và sample/hidden tests. Khi tạo đề tự động, nội dung được sao chép độc lập từ ngân hàng.
- Candidate làm phần trắc nghiệm trước, bấm chốt rồi chuyển tự luận/code. `POST /api/v1/submissions/{id}/complete_objective` khóa đáp án ở server; reload không mở lại phần đã chốt. Đề không có trắc nghiệm bắt đầu trực tiếp phần thực hành. `objectiveDurationMinutes` tùy chọn nhỏ hơn tổng thời lượng: hết hạn riêng, server tự chốt khi GET/save/submit; tổng hạn vẫn tính từ startedAt.
- Tự luận nhập Markdown và đếm từ; lưu nháp mỗi 10 giây. Code dùng Monaco đóng gói nội bộ, chọn ngôn ngữ và chạy tối đa 5 sample tests qua `POST /api/v1/submissions/{id}/coding/{questionId}/run_samples`; hidden tests/harness/rubric/điểm gợi ý không trả candidate.
- Submit chấm trắc nghiệm đồng bộ, phát RabbitMQ sau commit tới `assessment.essay.grade` và queue code cấu hình `assessment.code.grade.q`; worker concurrency 3–10 chạy trong TenantJobExecutor, header X-Tenant-ID bắt buộc.
- Essay đánh giá ngữ nghĩa theo từng rubric; code dùng 80% tỉ lệ test pass + 20% AI review. Không so chuỗi source và không chấm bằng keyword matching. Mọi điểm AI là đề xuất, recruiter duyệt hoặc điều chỉnh trong màn hình Theo dõi bài làm.
- Staff dùng GET `/api/v1/submissions/{id}/grading_review`, POST `/approve_grade/{questionId}` (body score=null để nhận gợi ý, hoặc điểm thủ công), POST `/retry_grading`. Điểm tổng chỉ công bố sau khi toàn bộ câu được chấm chính thức; giữ EXPIRED cho bài quá hạn.
- Sandbox cần cấu hình `app.assessment.judge-url` / `app.assessment.judge-token` (Spring env: APP_ASSESSMENT_JUDGE_URL / APP_ASSESSMENT_JUDGE_TOKEN). Judge0 phải hỗ trợ wait=true và các language ID Java 62/Python 71/JavaScript 63/SQL 82. Không chạy source trong tiến trình backend. AI chấm tự luận/review code dùng task `CODE_GRADING` (provider/model/key cấu hình tại `/admin/system/ai-config`, không fallback env), kèm rate-limit/metering theo task.
- Provider lỗi không tạo điểm 0. Bài giữ chờ duyệt, có thể retry hoặc chấm tay. Broker lỗi sau commit giữ dữ liệu bài làm; staff retry sau khi broker hoạt động lại. Chưa có quét tự động các bài chờ gửi/chấm.
- Schema V53: tests, questions, submissions, answers, coding_problems; không tạo bảng mới. Xem docs/database để đối chiếu FK/UNIQUE và dictionary.

## Xem & Duyệt kết quả Recruiter — Prompt 8, 2026-10-14

- Trạng thái phần duyệt điểm: `Done`. Từ **Theo dõi bài làm → Xem & chấm bài**, `SubmissionGradingDetail` mở ba khối: trắc nghiệm tự động, tự luận theo rubric, code theo sandbox/AI review. `AssessmentGradingPanel` giữ export tương thích và dùng cùng component mới.
- Trắc nghiệm lấy số câu từ toàn bộ đề (kể cả câu không trả lời), số câu đúng và điểm từ `answers.is_correct/score`, không suy ra từ tổng điểm hoặc đáp án mẫu. Hiển thị số đúng/tổng, điểm và tỉ lệ đúng. Tổng điểm chính thức giữ trống khi còn câu tự luận/code chưa duyệt.
- Tự luận hiển thị bài viết và đáp án tham khảo; bảng tiêu chí bám tên/thứ tự/trọng số rubric đã lưu, không ép rubric tùy chỉnh thành đúng ba dòng. Mẫu chuẩn gồm bản chất cốt lõi, trade-offs, thực tế & logic. Điểm tối đa tiêu chí = điểm câu × trọng số; điểm đạt = điểm tối đa × `criteria_results.score_percent`. Thiếu phân tích/điểm AI hiển thị chưa có; không tạo nhận xét giả.
- Code hiển thị source, ngôn ngữ, X/Y tests pass, tỉ lệ pass và bảng trạng thái sample/hidden. Điểm test theo trọng số hidden tổng 100 nếu bài được biên soạn theo trọng số; bài legacy giữ tỉ lệ pass. Thành phần điểm code là 80% tests + 20% AI review. AI được yêu cầu trả `time_complexity`, `space_complexity`, `clean_code`, `naming_conventions`, `exception_safety`; kết quả cũ thiếu trường hiển thị chưa có phân tích, không đoán độ phức tạp. Lỗi provider không đổi thành điểm 0.
- Mỗi câu có điểm ghi đè 0–điểm tối đa, tối đa hai số thập phân. Để trống để nhận điểm AI; thiếu gợi ý cần nhập điểm thủ công. **Xác nhận duyệt điểm** lưu từng câu. **Cập nhật kết quả bài thi** duyệt các câu còn chờ và các điểm ghi đè đang nhập trong một transaction; một câu lỗi rollback cả lô. Dữ liệu nhập giữ khi request lỗi; polling 10 giây không ghi đè điểm đang nhập. Nút **Thử chấm AI lại** chỉ retry các câu chưa có điểm gợi ý/chưa được duyệt.
- **Gửi email thông báo kết quả cho ứng viên** chỉ bật khi không còn thay đổi chưa lưu, mọi câu tự luận/code đã duyệt, có điểm chính thức và ứng viên có email/bật kênh assessment. Dialog nêu người nhận. API tạo `email_outbox.purpose=ASSESSMENT_RESULT`, không gửi đồng bộ; UI báo xếp hàng, không báo đã giao email. Email chỉ chứa tên bài, lượt làm, điểm chính thức/tổng và đạt/chưa đạt; không chứa rubric, hidden tests hay mã nguồn.
- Lặp yêu cầu với cùng người nhận/subject/nội dung dùng lại outbox đã có. Khóa submission tuần tự hóa tạo email; khóa outbox phối hợp với worker. Bản SENT không gửi lại, bản FAILED được reset PENDING/attempts=0 khi recruiter yêu cầu thử lại. Nếu điểm chính thức đổi, snapshot nội dung mới được xếp hàng riêng. Worker hiện có quét tenant, RabbitMQ có `X-Tenant-ID`, `TenantJobExecutor` set/clear context, retry tối đa ba lần.
- Staff phải có quyền job; Candidate bị 403. Bài đang làm/chưa bắt đầu bị 409. Truy cập staff hoàn tất bài đã hết giờ theo cơ chế sẵn có trước khi mở màn hình. Không tự chuyển trạng thái application. EXPIRED giữ trạng thái sau duyệt nhưng có thể có điểm chính thức.

| Method | API | Nội dung |
|---|---|---|
| GET | `/api/v1/submissions/{id}/grading_detail` | Metadata ứng viên/bài, điểm chính thức/ngưỡng, `objective` và `reviews`; chỉ staff được gán job |
| POST | `/api/v1/submissions/{id}/update_grading_result` | `{decisions:[{questionId,score}]}`; score=null nhận gợi ý AI; trả chi tiết đã cập nhật |
| POST | `/api/v1/submissions/{id}/send_result_email` | Trả `{id,status}` outbox; 409 `GRADING_INCOMPLETE`, `EMAIL_UNAVAILABLE`, `EMAIL_DISABLED` khi chưa đủ điều kiện |

Database không đổi schema/migration/entity. Dùng `answers`, `questions.rubric_json`, `test_cases.weight`, `email_outbox` và notification preferences hiện có. Contract coding tương thích form có sẵn (`title`, trọng số test), đồng thời nhận DTO legacy không gửi hai trường này.

Kiểm chứng Prompt 8 ngày 2026-10-14: frontend TypeScript + Vite build đạt; 49 test backend đạt (`SubmissionGradingDetailServiceTest`, `AssessmentGradingServiceTest`, `AssessmentFlowTest`, `AiInterviewWorkServiceTest`, `CodingVerificationServiceTest`). Bao gồm số liệu trắc nghiệm/câu chưa trả lời, candidate bị 403, điểm ngoài miền và rollback lô, tổng chính thức sau duyệt, không gửi khi còn câu thiếu/chưa duyệt, preferences, trùng email và retry tối đa ba lần, giữ grading legacy và code theo trọng số hidden. Chrome headless `frontend/tests/grading-review.browser.cjs` đạt: ba khối điểm, điểm rubric, bằng chứng code/test, validation/giữ input khi lỗi, retry, cập nhật tổng, dialog xếp hàng email và mobile 375px. Ảnh QA ở `frontend/test-results/grading-review/`. Integration persistence dùng H2, email sender và API trình duyệt giả lập; chưa chạy SMTP, RabbitMQ và Judge0/AI provider thật.


## Xem giao diện assessment mẫu — 2026-10-14

- Trạng thái: Done. Nút chính trên header Quản lý bài đánh giá đổi từ **Tạo bài đánh giá** sang **Xem mẫu bài thi**.
- Mở /recruiter/jobs/:id/assessments/preview trong workspace và quyền ASSESSMENTS hiện có, mặc định tab **Ứng viên làm bài**. Cho phép thử trắc nghiệm, tự luận, code và chuyển tab xem ngân hàng, cấu trúc đề, duyệt điểm. Có nút quay về đúng vị trí tuyển dụng và đặt lại mẫu.
- Dữ liệu mẫu chỉ giữ trong bộ nhớ; không tạo assessment, không lưu bài thi thực, không gọi AI/sandbox thật. Điểm/nhận xét là minh họa có nhãn rõ ràng.


### Cập nhật giao diện mẫu theo HTML tham chiếu — 2026-10-15

- Trạng thái: Done. Trang preview có header/badge, thông báo minh họa, thanh 4 bước có số thứ tự. Tab ngân hàng chia hai cột danh sách/biên soạn, chuyển nhanh tự luận/code; tab cấu trúc dùng hai card phần thi.
- Tab ứng viên có thanh thông tin và đồng hồ minh họa, sau khi chốt trắc nghiệm mở hai cột bài tự luận/code. Code có khung nguồn, sample test và output mẫu. Tab duyệt điểm ghi rõ góc nhìn Recruiter, rubric theo card và sidebar duyệt/tổng điểm. Mobile xếp dọc.
- Giữ dữ liệu trong bộ nhớ và kiểm tra điểm hiện có; không chạy mã/AI thật. Không sao chép thông tin chứng nhận, xếp hạng top 5%, trạng thái autosave hay model version giả từ HTML tham chiếu. Tổng chỉ chính thức khi đã duyệt tự luận và code.
- Kiểm chứng: TypeScript/Vite build và Chrome headless `assessment-preview.browser.cjs`; bốn tab, soạn/lưu câu hỏi, nhập/nộp bài mẫu, duyệt điểm, đặt lại mẫu, độ đọc mã nguồn và mobile 375px không tràn ngang. Ảnh QA trong `frontend/test-results/assessment-preview/`. API auth/job giả lập; không kiểm tra AI/sandbox thật trong trang minh họa.


### Bám sát mẫu HTML — 2026-10-15

- Preview dùng palette xanh dương theo HTML tham chiếu trong phạm vi trang, không đổi màu workspace. Mở ngay tự luận/code với bài trắc nghiệm mẫu đã chọn; nút Xem mẫu trắc nghiệm cho phép xem lại phần này. Reset trở về tự luận/code. Các form và card dùng nền xanh nhạt, editor tối và chữ tương phản.

- Rubric Builder dạng thẻ cho tiêu chí, trọng số và từ khóa. Form code mẫu có ba tab cấu hình, starter/harness và sample/hidden test cases; không gọi sandbox thật. Kiểm chứng Chrome headless bao gồm palette xanh dương, các tab code và lưu cấu hình.
