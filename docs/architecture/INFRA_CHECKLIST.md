# Infrastructure checklist — SmartHire-AI

| Thành phần | Mục đích | Khuyến nghị | Trạng thái trong repo |
|---|---|---|---|
| **HikariCP** | Pool kết nối Database (1 Master Pool PostgreSQL + Dynamic Pool per Tenant MySQL) | ✅ Bắt buộc (Spring Boot + `DynamicMultiTenantConnectionProvider`) | ✅ Có — cấu hình tường minh trong `application.yml`, `MasterJpaConfig` & `MultiTenantJpaConfig` |
| **Nginx** | Reverse proxy / TLS / (sau này LB) | ✅ Nên có | ✅ Có — `frontend/nginx.conf` + `deploy/nginx/smarthire.conf` |
| **Redis** | Cache, OTP, JWT blacklist, rate limit, session, quota cache | ✅ Nên có | ✅ Có — Docker + `spring-boot-starter-data-redis` + `RedisConfig` |
| **RabbitMQ** | Queue AI / Email / Notification + Worker Pool | ✅ Nên có | ✅ Có — Docker + AMQP + exchanges/queues + concurrency |

> Kiến trúc Database của dự án là **Hybrid Multi-Tenant**: **PostgreSQL** cho Master DB (`smarthire_master` — quản trị nền tảng, tenant registry, gói cước, hóa đơn, hợp đồng, AI metering) và **MySQL riêng biệt** cho từng Tenant DB (`smarthire_tenant_<code>` — toàn bộ dữ liệu nghiệp vụ tuyển dụng của từng doanh nghiệp).

Chi tiết pattern: [ASYNC_AND_CACHE.md](ASYNC_AND_CACHE.md)
