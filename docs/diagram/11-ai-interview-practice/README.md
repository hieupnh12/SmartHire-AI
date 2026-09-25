# FE-11 — AI Interview Practice

Sandbox luyện phỏng vấn AI cho Candidate. Data tách `practice_*`; không ảnh hưởng hiring ranking.

| ID | Function | Thư mục | Code |
|---|---|---|---|
| FE11-F01 | Practice Interview Session | [`practice-interview-session`](practice-interview-session/) | PRACT-01 |
| FE11-F02 | Practice Question Generation | [`practice-question-generation`](practice-question-generation/) | PRACT-01 / INT-01 pattern |
| FE11-F03 | Voice Practice & STT | [`voice-practice-speech-to-text`](voice-practice-speech-to-text/) | PRACT-01 / INT-02 pattern |
| FE11-F04 | Performance Analysis & Feedback | [`practice-performance-analysis-feedback`](practice-performance-analysis-feedback/) | PRACT-02 |
| FE11-F05 | Practice Result Review | [`practice-result-review`](practice-result-review/) | PRACT-03 |

## Quyết định đã chốt

- Tách **5** diagram (A)
- Question/STT: pattern async + reuse AI/STT ports, chỉ ghi practice (1)
- Analysis = POST feedback worker; Review = GET/DELETE (I)
- Question types: GENERAL / TECHNICAL / BEHAVIORAL / JAPANESE (X)
