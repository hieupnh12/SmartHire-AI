# SmartHire Backend

Java 21 · Spring Boot 3 · PostgreSQL master · MySQL per tenant · **HikariCP** · Flyway · **Redis** · **RabbitMQ** (Queue + Worker Pool) · springdoc-openapi · JUnit 5

Infra docs: [`docs/architecture/INFRA_CHECKLIST.md`](../docs/architecture/INFRA_CHECKLIST.md) · [`ASYNC_AND_CACHE.md`](../docs/architecture/ASYNC_AND_CACHE.md)

## Package layout

See root [`AGENTS.md`](../AGENTS.md).

## Run

```bash
docker compose --env-file backend/.env up -d postgres mysql redis rabbitmq
./mvnw spring-boot:run
```

Swagger UI: http://localhost:8080/swagger-ui.html

## Infra knobs

| Component | Config |
|---|---|
| HikariCP | `app.datasource.master.hikari.*`, `MASTER_DB_POOL_SIZE`, `TENANT_DB_POOL_SIZE`, `TENANT_MAX_POOLS` |
| Redis | `RedisConfig`, `RedisKeys`, `RedisService` |
| RabbitMQ workers | `concurrency=3`, `max-concurrency=10`, `prefetch=1` |
| Nginx | FE container + host TLS on VPS |

## Test

```bash
./mvnw test
```
