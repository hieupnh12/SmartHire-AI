# Anti-cheating Detection

**Epic:** FE-05 Online Technical Assessment  
**Trạng thái:** `Doing`
**Code ID:** `ASSESS-05`

## Mục đích chức năng

Ghi nhận tín hiệu gian lận (tab blur, paste, multi-focus) và gắn risk score.

## Actor

- System, Recruiter (xem)

## Luồng hoạt động

1. Mọi bước quy chế + kiểm tra thiết bị chỉ ở `/assessments/:testId/invite` (bắt đầu **và** tiếp tục phiên).
2. Gate pass → `start_submission` (hoặc bind proctor cho submission đang mở) → `/take`. Nếu `/take` thiếu phiên giám sát → redirect lại invite (không hiện form check lần 2).
3. Trong `/take`: bấm Bắt đầu (cùng nút kiểm tra thiết bị) thì camera và chia sẻ **toàn bộ màn hình** vẫn chạy, rồi gọi fullscreen trong cú bấm đó. Chia sẻ đúng tab làm bài thì Chrome không ẩn thanh địa chỉ, nên bài thi không dùng kiểu ghi đó. Đề hiện khi cửa sổ phủ kín `screen.height`. Tắt camera, tắt microphone, dừng chia sẻ màn hình, thoát toàn màn hình, rời tab, mất focus, copy/paste bị tính vi phạm; 3 vi phạm → tự nộp. Camera chạy nhận diện khuôn mặt trên trình duyệt (MediaPipe): đúng 1 mặt trong khung; mất mặt ~0,9 giây hoặc ≥2 mặt ~1 giây → 1 vi phạm (cooldown ~5 giây). Chưa lưu video/snapshot lên server; chưa có gaze / phát hiện điện thoại.
4. Frontend gửi sự kiện giám sát qua `POST /api/v1/submissions/{id}/proctor-events` (mất mặt, nhiều người, thoát fullscreen, rời tab, …).
5. Recruiter xem báo cáo khi BE sẵn sàng.

## Business Rules

- Events append-only.
- Risk không auto-fail trừ khi policy bật.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/attempts/{id}/proctor-events` |
| GET | `/api/v1/attempts/{id}/proctor-report` |

## Database liên quan

- `proctor_events`, `proctor_reports`

## UI mockup

- Google Stitch: **FE-05 Online Technical Assessment / Anti-cheating Detection** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

ASSESS-01

## Ghi chú triển khai 2026-10-02

- Không gian AI Interview đã có bước kiểm tra bắt buộc camera, microphone, chia sẻ toàn bộ màn hình và fullscreen trước khi bắt đầu/tiếp tục.
- Trong phiên, frontend chặn copy/paste/menu chuột phải/các phím tắt phổ biến, gắn watermark theo ứng viên, theo dõi fullscreen, visibility, blur và trạng thái media track. Mỗi 20 giây gửi heartbeat.
- Vi phạm được ghi append-only vào `ai_interview_logs` qua `POST /api/v1/ai-interviews/{id}/proctor-events`; sau 3 vi phạm frontend yêu cầu backend nộp bài. Đồng hồ và hạn nộp vẫn lấy từ backend.
- Browser không thể chặn `Alt+Tab` hoặc DevTools một cách tuyệt đối. Hệ thống phát hiện mất focus/ẩn trang và chặn các phím tắt trong phạm vi trang.
- Nhận diện khuôn mặt trong khung (client-only, MediaPipe Face Detector) đã bật cho assessment khi có camera: mất mặt hoặc nhiều người trong khung → vi phạm. Gaze, phát hiện điện thoại và lưu clip/snapshot lên server chưa có.
