# FE11-F03 — Voice Practice & Speech-to-Text

- **Feature:** `11 / ai-interview-practice` (hỗ trợ `PRACT-01`, pattern `INT-02`)
- **Function:** `voice-practice-speech-to-text`
- **Trạng thái:** `Complete`

## Phạm vi

Candidate upload audio cho một `practice_answers`; lưu `audio_url`; queue đích `practice.stt`; ghi transcript vào `answer_text`. Reuse `SpeechToTextPort`; không đụng `interviews`.

## API (thiết kế đích)

`POST /api/v1/practice/sessions/{id}/voice` → `202`

## Artifact

`class-diagram.puml`, `sequence-diagram.puml`, `README.md`
