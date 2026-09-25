# FE-18 — Direct Interview Management

Phỏng vấn trực tiếp (con người): thiết lập phiên, đặt lịch + phân công interviewer, đánh giá theo tiêu chí và lưu kết quả phục vụ quyết định tuyển dụng. Tách biệt luồng AI Interview (FE-07/08).

| ID | Function | Thư mục |
|---|---|---|
| FE18-F01 | Direct Interview Setup | [`direct-interview-setup`](direct-interview-setup/) |
| FE18-F02 | Interview Scheduling & Participant Assignment | [`interview-scheduling-participant-assignment`](interview-scheduling-participant-assignment/) |
| FE18-F03 | Interview Evaluation & Result Handling | [`interview-evaluation-result-handling`](interview-evaluation-result-handling/) |

## Quyết định đã chốt

| Hạng mục | Quyết định |
|---|---|
| Mô hình | **A** — Tái sử dụng `interviews` với `mode = DIRECT` |
| Setup / Schedule | **1** — Hai bước: F01 tạo phiên → F02 lịch + participants |
| Đánh giá | **I** — Bảng human evaluation riêng, không ghi vào AI `interview_scores` |
| Persistence | Dedicated Tenant MySQL; `TenantContext` bắt buộc |

## Ranh giới với feature khác

- FE-07/08: AI interview (`AI_VOICE` / `AI_TEXT`), AI scoring.
- SCHED-01 reminder email/WebSocket: ngoài phạm vi F02 (có thể mở rộng sau).
- WF-03 Hiring Decision: tiêu thụ kết quả F03, không nằm trong FE-18.
