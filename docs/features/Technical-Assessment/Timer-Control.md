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
2. Response start/get/save/submit trả `serverTime`, `expiresAt`, `remainingSeconds` cho FE sau này.
3. GET/start/save/submit/result phát hiện lượt IN_PROGRESS quá hạn thì chấm đáp án đã lưu, chuyển EXPIRED, submitted_at bằng deadline.
4. Payload save muộn bị từ chối 409 nhưng trạng thái EXPIRED vẫn được commit. Chưa có worker chủ động quét khi không phát sinh request; frontend countdown chưa triển khai.

## Business Rules

- Không tin timer client.
- Giờ máy client không ảnh hưởng deadline. Không cộng thêm thời gian khi refresh hoặc start lại.

## API liên quan

| Method | Path |
|---|---|
| GET | `/api/v1/submissions/{id}` |
| POST | `/api/v1/submissions/{id}/submit` |

## Database liên quan

- `submissions.started_at`, `submissions.submitted_at`, `submissions.status`, `tests.duration_minutes`.

## UI mockup

- Google Stitch: **FE-05 Online Technical Assessment / Timer Control** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

ASSESS-01
