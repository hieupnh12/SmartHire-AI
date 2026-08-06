# Redis, RabbitMQ & Worker Pool — SmartHire-AI

## 1. Redis dùng để làm gì?

| Use case | Key pattern (gợi ý) | TTL |
|---|---|---|
| Cache danh sách Job | `cache:jobs:list:{hash}` | 60–300s |
| Cache Dashboard Analytics | `cache:dashboard:summary:{orgId}` | 60s |
| OTP xác thực email | `otp:email:{userId}` | 5–10 phút |
| Blacklist JWT sau logout | `auth:jwt:blacklist:{jti}` | = TTL access token còn lại |
| Session / refresh metadata | `auth:refresh:{userId}:{tokenId}` | theo refresh TTL |
| Rate limiting API | `ratelimit:{route}:{ip\|userId}` | cửa sổ (vd 60s) |
| Match score cache | `match:job:{jobId}:cv:{cvId}` | 10–30 phút |
| Lock chống double AI job | `lock:cv:analyze:{cvId}` | ngắn (30–120s) |

### Flow cache Dashboard

```
Recruiter mở Dashboard
        │
        ▼
Redis có dữ liệu?
        │
   Có ─────────► Trả ngay
        │
       Không
        ▼
     MySQL (aggregate)
        │
        ▼
   Lưu vào Redis (TTL)
        │
        ▼
   Trả response
```

**API đồng bộ (không qua RabbitMQ):** Login, Register, View/Search Job, View Dashboard (đọc cache), Update Profile.

---

## 2. RabbitMQ dùng để làm gì?

Phù hợp tác vụ AI / side-effect mất vài giây → vài chục giây.

```
Upload CV
      │
      ▼
Spring Boot  (nhận file, lưu metadata, HTTP 202)
      │
      ▼
RabbitMQ queue  (vd cv.analysis.q)
      │
      ▼
AI Worker(s)  (OpenAI / internal model)
      │
      ▼
Phân tích CV → lưu MySQL
      │
      ▼
WebSocket / Notification
      │
      ▼
FE nhận "hoàn thành"
```

### Nên dùng RabbitMQ

| Tác vụ | Exchange / Queue | Độ ưu tiên |
|---|---|---|
| AI CV Analysis | `cv.analysis` | ⭐⭐⭐⭐⭐ |
| CV Parse / Extract / Matching | `cv.parse`, `cv.extract`, `cv.matching` | ⭐⭐⭐⭐⭐ |
| AI Interview Scoring (+ STT/NLP) | `interview.stt`, `interview.nlp`, `interview.score` | ⭐⭐⭐⭐⭐ |
| AI sinh câu hỏi | `interview.questions` | ⭐⭐⭐⭐ |
| Coding auto-grade | `assessment.code.grade` | ⭐⭐⭐⭐ |
| Practice feedback | `practice.feedback` | ⭐⭐⭐ |
| Email (OTP, schedule, decision) | `notify.email`, `auth.email.otp` | ⭐⭐⭐⭐ |
| In-app notification fan-out | sau worker → WebSocket | ⭐⭐⭐⭐ |
| Sinh báo cáo / ranking recompute | `job.events` / ranking queues | ⭐⭐⭐ |

### Không nên dùng RabbitMQ

Xử lý **trực tiếp** trong request thread:

- Login / Register / Google OAuth
- View Job / Search Job
- View Dashboard (chỉ đọc Redis/MySQL)
- Update Profile
- CRUD nhẹ không phụ thuộc AI

---

## 3. Request Queue + Worker Pool

SmartHire AI dùng pattern **API nhận việc → Queue → nhiều Worker**.

```
               RabbitMQ
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
   AI Worker1  AI Worker2  AI Worker3
        │          │          │
     OpenAI     OpenAI     OpenAI
        └──────────┬──────────┘
                   ▼
                 MySQL
                   │
                   ▼
           WebSocket Notify
```

- 100 CV upload cùng lúc → messages nằm trong queue.
- 3 workers xử lý song song; tăng concurrency / scale replica **không đổi Frontend**.

### Cấu hình concurrency (Spring AMQP)

Trong `application.yml`:

```yaml
spring.rabbitmq.listener.simple:
  concurrency: 3          # min workers / instance
  max-concurrency: 10     # scale lên khi backlog
  prefetch: 1             # mỗi worker 1 message (AI nặng)
```

Scale thêm:

| Cách | Khi nào |
|---|---|
| Tăng `concurrency` / `max-concurrency` | 1 VM còn CPU/RAM |
| Chạy thêm replica backend/worker | Load lớn / GCP VPS scale |
| Tách worker process riêng | Tách API khỏi AI (khuyến nghị production lớn) |

### Ví dụ luồng chi tiết

**1. AI CV Analysis**

```
Candidate Upload CV → Spring Boot publish → RabbitMQ
  → Worker(s) → OpenAI → MySQL → WebSocket notify
```

**2. AI Interview Scoring**

```
Finish Interview → RabbitMQ → Worker:
  Speech→Text → NLP → Scoring → Save → Notify
```

**3. Email**

```
Create Interview / OTP → RabbitMQ → Email Worker → SMTP
```

**4. Notification**

```
Candidate Approved → RabbitMQ → Notification Worker → WebSocket + optional Email
```

---

## 4. Map với code hiện tại

| Thành phần | File / chỗ cấu hình |
|---|---|
| HikariCP | `application.yml` → `spring.datasource.hikari.*` |
| Redis | Docker `redis`, `RedisConfig`, `RedisKeys` |
| RabbitMQ exchanges/queues | `RabbitMqConfig`, `application.yml` → `app.rabbitmq.*` |
| Worker concurrency | `spring.rabbitmq.listener.simple.*` |
| Nginx | `frontend/nginx.conf`, `deploy/nginx/smarthire.conf` |

Consumers (`@RabbitListener`) implement dần trong `com.smarthire.messaging` khi làm từng feature CV/Interview/Email.
