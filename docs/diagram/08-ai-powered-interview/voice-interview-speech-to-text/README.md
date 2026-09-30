# FE08-F02 — Voice Interview & Speech-to-Text

- **Feature:** `08 / ai-powered-interview` (`INT-02`)
- **Function:** `voice-interview-speech-to-text`
- **Góc nhìn:** Application design theo kiến trúc mục tiêu
- **Trạng thái:** `Complete`

## Mục đích và phạm vi

Ứng viên nộp câu trả lời bằng giọng nói (một file audio cho một câu hỏi). Hệ thống lưu audio, enqueue STT, ghi `transcript` vào `interview_answers` để các bước NLP/scoring tiếp theo.

**Trong phạm vi (lựa chọn I):** `POST /api/v1/interviews/{id}/voice` → lưu `audio_url` → queue `interview.stt` → cập nhật `transcript`.

**Ngoài phạm vi:** realtime stream; NLP Analysis & Scoring (**FE07-F02**, lựa chọn A); sinh câu hỏi (FE08-F01).

## Nguồn đã đối chiếu

- Yêu cầu FE-08 Voice & STT; đã chốt phạm vi **I**, overlap FE07 **A**.
- `docs/features/AI-Interview/Speech-to-Text.md` (`INT-02`)
- `docs/api/API_GUIDE.md`, `interviewApi.voice`
- `application.yml` — `interview.stt`
- Entity `InterviewAnswer` (`audio_url`, `transcript`, `status`)
- `OVERVIEW.md` — object storage cho CV/audio
- Pattern worker + `X-Tenant-ID`

## Actor, điều kiện và kết quả

- **Actor:** `CANDIDATE`; System STT worker.
- **Tiền điều kiện:** candidate đúng phiên; câu hỏi thuộc interview; audio hợp lệ; ngôn ngữ cấu hình (`vi`/`en`, `ja` khi câu tiếng Nhật).
- **Hậu điều kiện:** answer có `audio_url`; sau worker có `transcript` + status `TRANSCRIBED`; HTTP `202`.
- **Lỗi:** `401`/`403`/`400`/`404`/`409`; STT fail → `STT_FAILED` (không coi thành công im lặng).

## Trách nhiệm sequence

1. Guard xác thực candidate + tenant.
2. Service validate session/question, store audio, tạo/cập nhật answer `TRANSCRIBING`, publish `SttJob`.
3. Trả `202` không kèm transcript đầy đủ.
4. Consumer restore tenant → `SpeechToTextPort` → lưu transcript.
5. Clear `TenantContext` trên cả HTTP và worker.

## Class diagram — quan hệ chính

- Không vẽ *Routing & Boundary*; Controller `delegates >` `InterviewService` / Impl (upload + enqueue).
- `ObjectStoragePort` lưu audio; `InterviewSttPublisher` → RabbitMQ → `InterviewSttConsumer` → `InterviewSttService` / Impl → `SpeechToTextPort`.
- `InterviewQuestion` **composition** tối đa một `InterviewAnswer` (UNIQUE `question_id`).
- Status answer dạng chuỗi nghiệp vụ (`TRANSCRIBING` / `TRANSCRIBED` / `STT_FAILED`) — thiết kế đích trên cột `status` hiện có.

## Multi-tenant & bảo mật

- Audio path partition theo tenant; không lộ raw audio/transcript trong response accept.
- Worker bắt buộc header tenant + clear context.
- Transcript phục vụ chấm điểm advisory ở FE07-F02.

## Giả định

| Hạng mục | Quyết định |
|---|---|
| Upload | Một audio / một câu hỏi (không stream) |
| Ngôn ngữ | Theo request; hỗ trợ ja cho câu JAPANESE |
| Analysis + Scoring | FE07-F02 |
| Object storage | Port đích (chưa chốt vendor trong diagram) |

## Kiểm tra và render

Đã validate + render PNG 300 DPI. Bản sao: `D:\HocKy9\Đồ án\tài liệu\report 4\FE08-F02-*.png`.

```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/08-ai-powered-interview/voice-interview-speech-to-text `
  -Format Png -PngDpi 300 -PlantUmlJar .agents/skills/enterprise-uml-diagram/tools/plantuml.jar
```

## Artifact

| File | Vai trò |
|---|---|
| `class-diagram.puml` | Upload voice + STT |
| `sequence-diagram.puml` | HTTP 202 + worker transcribe |
| `class-diagram.png` / `sequence-diagram.png` | PNG 300 DPI |
| `README.md` | Giải thích |
