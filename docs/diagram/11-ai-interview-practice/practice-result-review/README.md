# FE11-F05 — Practice Result Review

- **Feature:** `11 / ai-interview-practice` (`PRACT-03`)
- **Function:** `practice-result-review`
- **Trạng thái:** `Complete`

## Phạm vi

Candidate xem lịch sử luyện tập: list, detail (câu hỏi/trả lời), feedback/điểm/section; soft delete session của mình.

**API:** `GET /practice/sessions`, `GET /{id}`, `GET /{id}/feedback`, `DELETE /{id}`

Không gọi AI; không đụng ranking.

## Giả định

- `deletedAt` soft delete là thiết kế đích (PRACT-03)
- `sections` trong feedback response map từ `breakdownJson` (F04)

## Artifact

`class-diagram.puml`, `sequence-diagram.puml`, `README.md`
