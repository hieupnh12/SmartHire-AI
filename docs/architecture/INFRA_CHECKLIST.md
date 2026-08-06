# Infrastructure checklist — SmartHire-AI

| Thành phần | Mục đích | Khuyến nghị | Trạng thái trong repo |
|---|---|---|---|
| **HikariCP** | Pool kết nối Database | ✅ Bắt buộc (Spring Boot mặc định với JPA) | ✅ Có — cấu hình tường minh trong `application.yml` |
| **Nginx** | Reverse proxy / TLS / (sau này LB) | ✅ Nên có | ✅ Có — `frontend/nginx.conf` + `deploy/nginx/smarthire.conf` |
| **Redis** | Cache, OTP, JWT blacklist, rate limit, session | ✅ Nên có | ✅ Có — Docker + `spring-boot-starter-data-redis` + `RedisConfig` |
| **RabbitMQ** | Queue AI / Email / Notification + Worker Pool | ✅ Nên có | ✅ Có — Docker + AMQP + exchanges/queues + concurrency |

> DB của dự án là **MySQL** (không phải PostgreSQL). Sơ đồ dưới dùng MySQL.

Chi tiết pattern: [ASYNC_AND_CACHE.md](ASYNC_AND_CACHE.md)
