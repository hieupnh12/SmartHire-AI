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
2. Candidate dùng applicationId của mình để start/resume đề thuộc cùng job, khi đơn ở ASSESSMENT hoặc INTERVIEW.
3. Candidate lưu từng nhóm đáp án, tải lại tiến độ, submit để chấm trắc nghiệm và xem điểm.
4. Staff xem bài làm và kết quả; hệ thống không tự đổi trạng thái đơn ứng tuyển.

## Business Rules

- Đã triển khai backend JobTest, Question, Option, Submission, Answer cho MCQ một đáp án đúng. Frontend, coding, randomize và cấp quyền thi lại chưa triển khai.
- Start được tuần tự hóa bằng khóa hàng đề; trả lượt gần nhất đã có của cặp test/application, kể cả đã hoàn thành. NOT_STARTED được kích hoạt khi đủ điều kiện; không tự tạo lượt thi lại.
- Hiện không có API giao đề riêng: mọi đề PUBLISHED của job có thể được bắt đầu bởi chủ đơn đủ điều kiện. Nếu cần giao riêng từng ứng viên, bổ sung chính sách assignment ở bước sau.
- Staff (`RECRUITER`, `HR`, `ADMIN`, `TENANT_ADMIN`) trong đúng tenant được tạo, xem và sửa đề. Candidate không được gọi các API quản lý đề.
- Tạo đề luôn ở trạng thái `DRAFT`; chỉ sửa/xóa câu hỏi và sửa thông tin đề trong bản nháp, không đổi job. Publish khóa nội dung và thời lượng. Job đã xóa không được dùng để tạo/sửa đề hoặc bắt đầu lượt mới.
- `passingScore` tùy chọn, tính theo điểm thô; publish kiểm tra từ 0 đến tổng điểm. Không có ngưỡng thì response `passed` là null.
- Tối đa 100 câu/đề, mỗi câu 1–10000 điểm, 2–10 options và đúng một option đúng. Option được quản lý cùng Question; PUT thay toàn bộ options và sinh ID mới. Không publish đề có coding ở luồng MCQ này.
- Candidate chỉ đọc/lưu/nộp submission của mình; lấy candidate từ token, không từ request. Trả 404 khi tài nguyên không thuộc ứng viên; không lộ đáp án đúng, kể cả sau khi nộp.
- Save là upsert từng questionId, không xóa câu ngoài payload; selectedOptionId null để bỏ chọn. Question phải thuộc đề, option phải thuộc question. Payload có questionId lặp bị từ chối; lỗi một câu rollback cả nhóm.
- Khóa hàng submission và transaction READ_COMMITTED tuần tự hóa save/submit; nộp lại trả cùng kết quả. Bỏ trống/sai được 0 điểm, đúng được toàn bộ điểm câu. Không tin điểm từ client.
- Deadline = startedAt + durationMinutes, dùng giờ server. Lưu sau hạn trả 409 SUBMISSION_EXPIRED và vẫn commit EXPIRED/điểm của đáp án đã lưu. GET/start/submit/result cũng hoàn tất lượt quá hạn khi được truy cập; chưa có worker quét hết hạn chủ động.
- Start mới và save/submit khi đang làm yêu cầu đơn còn ở ASSESSMENT/INTERVIEW, chưa lưu trữ/rút, job chưa xóa. Điểm tổng được trả candidate sau hoàn tất; thay đổi chính sách công bố cần cập nhật contract.
- Tên đề bắt buộc, tối đa 255 ký tự; thời lượng là số phút nguyên dương; điểm đạt không âm, tối đa 8 chữ số nguyên và 2 chữ số thập phân.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/assessments` |
| GET | `/api/v1/assessments?page=0&size=20` |
| GET | `/api/v1/assessments/{id}` |
| PUT | `/api/v1/assessments/{id}` |
| GET, POST | `/api/v1/assessments/{testId}/questions` |
| PUT, DELETE | `/api/v1/assessments/{testId}/questions/{questionId}` |
| POST | `/api/v1/assessments/{testId}/publish` |
| POST | `/api/v1/assessments/{testId}/submissions` |
| GET | `/api/v1/submissions/{id}` |
| POST | `/api/v1/submissions/{id}/answers` |
| POST | `/api/v1/submissions/{id}/submit` |
| GET | `/api/v1/submissions/{id}/result` (staff) |

Contract chính thức dùng `submissions`, không cung cấp alias `attempts`; FE stub cũ sẽ được cập nhật ở bước frontend. Các API trả `ApiResponse`: tạo đề/câu hỏi HTTP 201; start/resume/save/submit HTTP 200; request không hợp lệ 400; không đủ quyền 403; không tìm thấy/không sở hữu 404; trạng thái không phù hợp hoặc hết hạn 409. Danh sách đề trả `data.items`, `total`, `page`, `size`, sắp xếp ID giảm dần; page âm về 0, size giới hạn 1–50. Danh sách bao gồm metadata đề của job đã xóa để staff tra cứu.

Response submission gồm `id`, `testId`, `applicationId`, `title`, `status`, `startedAt`, `expiresAt`, `submittedAt`, `serverTime`, `remainingSeconds`, `score`, `totalPoints`, `passed`, `questions` và `answers`. Options của candidate chỉ chứa `id`, `optionText`; answers chỉ chứa `questionId`, `selectedOptionId`.

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

Staff POST `/assessments/{testId}/questions` (PUT câu hỏi dùng cùng body):

```json
{
  "questionText": "Which keyword defines a Java class?",
  "points": 5,
  "questionOrder": 0,
  "options": [
    { "optionText": "class", "correct": true },
    { "optionText": "def", "correct": false }
  ]
}
```

Staff POST `/assessments/{testId}/publish` không cần body. Candidate POST `/assessments/{testId}/submissions`:

```json
{ "applicationId": 1 }
```

Candidate POST `/submissions/{id}/answers`, thay ID theo response start:

```json
{ "answers": [{ "questionId": 1, "selectedOptionId": 2 }] }
```

Candidate POST `/submissions/{id}/submit` không cần body, chỉ chấm đáp án đã lưu. Staff GET `/submissions/{id}/result` để xem kết quả. Postman collection có nhóm Technical Assessment và biến `testId`, `questionId`, `optionId`, `submissionId`, `candidateToken`; token staff dùng `accessToken`.

Kiểm chứng: `AssessmentServiceTest` (unit/validation) và `AssessmentFlowTest` (JPA/H2, transaction thật, HTTP validation, phân quyền, rollback nhóm đáp án, hết giờ, start/submit đồng thời). H2 không thay thế kiểm thử Flyway/MySQL và cách ly hai datasource thực tế.

## Database liên quan

- Theo schema V9: `tests`, `questions`, `options`, `submissions`, `answers`. Không thay đổi schema; chống ghi trùng bằng khóa hàng trong service, không tuyên bố có UNIQUE mà SQL chưa định nghĩa.

## UI mockup

- Google Stitch: **FE-05 Online Technical Assessment / Multiple Choice Test** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

JOB-04
