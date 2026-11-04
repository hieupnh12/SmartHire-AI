# Hướng dẫn cấu hình Jitsi cho Human Interview

SmartHire Meeting mặc định dùng **PeerJS (WebRTC trong app)** — vào là họp được, không cần moderator.

Nếu muốn dùng **Jitsi** (chất lượng đa người tốt hơn), **không dùng `meet.jit.si` public** cho demo tuyển dụng: 8x8 đã khóa anonymous moderator → mọi người bị “chờ quản trị viên” dù đã là Lead HR trên SmartHire.

Quyền **Lead** trong SmartHire ≠ quyền **moderator Jitsi**. Lead chỉ dùng cho scorecard / quyết định Đậu–Trượt.

## Bật Jitsi trên frontend

Trong `frontend/.env` (hoặc env Vite):

```env
VITE_HUMAN_MEETING_ENGINE=jitsi
VITE_JITSI_DOMAIN=meet.your-company.com
```

- `peerjs` (mặc định): phòng WebRTC nội bộ  
- `jitsi`: iframe tới `https://{VITE_JITSI_DOMAIN}/SH{tenant}J{jobId}I{interviewId}` (tên phòng có tenant)

Đổi xong: restart `npm run dev`.

## Cách 1 — Self-host Jitsi (khuyến nghị cho DATN / on-prem)

1. Cài [Jitsi Docker](https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker/) trên VPS.
2. Trỏ domain (TLS), ví dụ `meet.se36.smarthire.top`.
3. Cho phép người vào đầu / mọi anonymous làm moderator — trong Prosody (tuỳ bản docker-jitsi):

```cfg
-- Ví dụ ý tưởng cấu hình (tên file/plugin theo handbook phiên bản bạn cài):
-- tắt chờ moderator / cho anonymous mod trên muc
```

Tham chiếu handbook mục *Authentication* / *Moderator*: bật `token` hoặc `anonymous` + `allowners` tùy nhu cầu bảo mật.

4. Set:

```env
VITE_HUMAN_MEETING_ENGINE=jitsi
VITE_JITSI_DOMAIN=meet.se36.smarthire.top
```

5. HR và ứng viên vào `/meet/human/{id}` — không còn nút “Mình là quản trị viên” của meet.jit.si.

## Cách 2 — 8x8 Jaas (Jitsi as a Service)

1. Đăng ký [jaas.8x8.vc](https://jaas.8x8.vc/), tạo App, lấy **AppID** + khóa ký JWT.
2. Backend (bước nâng cao) phát JWT gắn `moderator: true` cho user là **LEAD** trên lịch SmartHire; ứng viên `moderator: false`.
3. FE load Jitsi External API với `jwt` + domain Jaas (`8x8.vc`).

Hiện codebase đã sẵn iframe domain; **JWT moderator theo Lead** là phần tích hợp tiếp theo nếu chọn Jaas.

## Kiểm tra nhanh

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| “Chưa có moderator / Mình là quản trị viên” | Đang dùng `meet.jit.si` | Đổi sang self-host hoặc Jaas |
| Vào được PeerJS nhưng muốn Jitsi | `VITE_HUMAN_MEETING_ENGINE` chưa = `jitsi` | Sửa env + restart FE |
| Lead HR vẫn không phải mod Jitsi | Hai hệ quyền khác nhau | Gán mod trên Jitsi (self-host/JWT), không dựa Lead SmartHire |

## Gợi ý vận hành DATN

- Demo / bảo vệ đồ án: giữ **`peerjs`** + phiếu đánh giá live trong phòng.  
- Demo “giống Meet hơn”: self-host Jitsi một VPS nhỏ + `VITE_JITSI_DOMAIN`.  
- Production: Jaas hoặc Jitsi self-host có JWT theo role.
