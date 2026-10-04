# Anti-cheating Detection

**Epic:** FE-05 Online Technical Assessment  
**Trạng thái:** `Doing`
**Code ID:** `ASSESS-05`

## Mục đích chức năng

Ghi nhận tín hiệu gian lận (tab blur, paste, multi-focus) và gắn risk score.

## Actor

- System, Recruiter (xem)

## Luồng hoạt động

1. FE gửi events `POST /attempts/{id}/proctor-events`.
2. BE aggregate risk.
3. Recruiter xem báo cáo.

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
- Browser không thể chặn `Alt+Tab` hoặc DevTools một cách tuyệt đối. Hệ thống phát hiện mất focus/ẩn trang và chặn các phím tắt trong phạm vi trang; chưa có nhận diện khuôn mặt, gaze, phân tích âm thanh hoặc snapshot AI vì chưa tích hợp model/dịch vụ lưu trữ tương ứng.
