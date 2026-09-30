# Information Extraction

**Epic:** AI-Powered CV Screening & Analysis  
**Trạng thái:** `Done`  
**Code ID:** `CV-03`

## Mục đích chức năng

Trích xuất thông tin có cấu trúc: education, experience, contacts, certifications.

## Actor

- System (AI)
- Recruiter (xem)

## Luồng hoạt động

1. Sau parse → queue `cv.extract`.
2. Lưu JSON structured vào `cv_extractions`.

## Business Rules

- Không overwrite manual edits trừ khi re-run có flag.
- PII chỉ role được phép xem.

## API liên quan

| Method | Path |
|---|---|
| POST | `/api/v1/cvs/{id}/extract` |
| GET | `/api/v1/cvs/{id}/extraction` |

## Database liên quan

- `cv_extractions`

## UI mockup

- Google Stitch: **AI-Powered CV Screening & Analysis / Information Extraction** — _[dán link]_
- Icons: xem `DESIGN.md`

## Phụ thuộc

CV-02

## Contract kinh nghiệm cho RANK-01/RANK-03

Bộ đọc ranking đã hỗ trợ trường `experience` trong `cv_extractions.extraction_json`. Module trích xuất vẫn `To Do`; khi tích hợp phải cung cấp dữ liệu thật theo mẫu:

```json
{
  "experience": [
    {
      "startDate": "2024-01",
      "endDate": "2025-06",
      "current": false,
      "skills": ["Java", "SpringBoot"],
      "evidence": "Phát triển dịch vụ Java/Spring Boot từ 01/2024 đến 06/2025."
    }
  ]
}
```

- `current=true` cho công việc hiện tại, không cần `endDate`. Mốc tháng dùng YYYY-MM, không nhận ngày tương lai hoặc kết thúc trước bắt đầu.
- `skills` là kỹ năng có bằng chứng trong công việc đó; không chép toàn bộ kỹ năng CV vào mọi công việc.
- `evidence` là nội dung trích xuất phục vụ Recruiter kiểm tra; không tự sinh kinh nghiệm không có trong CV.
- Mảng rỗng có nghĩa đã xác định không có kinh nghiệm. Thiếu trường/JSON không hợp lệ/ngày liên quan hoặc bằng chứng thiếu làm điểm kinh nghiệm chưa xác định, cần xác minh.
- Ranking chỉ tính thời gian có ít nhất một kỹ năng chuẩn khớp yêu cầu Job và loại trùng tháng giữa các công việc.
- Gemini (khi có key) đọc text PDF và nhận context skill của job; không tự chấm điểm cuối. heuristic-v1 dùng khi không có key hoặc API lỗi.
- Overall matching = 0 nếu CV không trùng skill nào của job, dù có bằng cấp / năm KN.
