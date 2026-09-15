# FE11-F04 — Practice Performance Analysis & Feedback

- **Feature:** `11 / ai-interview-practice` (`PRACT-02`)
- **Function:** `practice-performance-analysis-feedback`
- **Trạng thái:** `Source complete — awaiting rendering decision`

## Phạm vi

`POST /practice/sessions/{id}/feedback` → queue `practice.feedback` → phân tích câu trả lời → lưu `practice_feedbacks` (content + score; breakdown theo section là thiết kế đích) → `COMPLETED`.

Tone constructive; không lộ đáp án ideal nguyên văn; không ảnh hưởng ranking.

## Artifact

`class-diagram.puml`, `sequence-diagram.puml`, `README.md`
