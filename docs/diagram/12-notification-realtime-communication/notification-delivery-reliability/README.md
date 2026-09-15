# NOTIFY — Notification Delivery and Reliability

- **Mã Feature:** `NOTIFY` / `12-notification-realtime-communication` · `SCHED-03` (vận hành)
- **Mã Function:** `notification-delivery-reliability`
- **Thư mục:** `docs/diagram/12-notification-realtime-communication/notification-delivery-reliability`
- **Trạng thái Review:** `Complete with assumptions`

---

## 1. Mục đích và phạm vi

Đảm bảo email **không gửi trùng**, **retry** khi SMTP lỗi, và **dead-letter** khi hết lượt. Cùng `sourceEventId` cũng chặn **inbox trùng**. Happy-path SMTP 250 lần đầu thuộc `email-notification`. Không vẽ UI, không STOMP reconnect cluster.

## 2. Nguồn đã đối chiếu

- Feature SCHED-03: “Retry + DLQ”, “At-least-once” (SCHED-02 phía client)
- `EmailOutbox.attempts`, `NotificationStatus` PENDING/SENT/FAILED
- `RabbitMqConfig.notifyEmailQueue` durable, **không** DLQ binding
- `TenantJobExecutor`: tenant inactive → `AmqpRejectAndDontRequeueException` + `finally` clear
- Không cột `idempotency_key` trên Flyway hiện tại

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| RabbitMQ notify-email | Deliver / requeue / ack. |
| EmailWorker | Consume. |
| TenantJobExecutor | Tenant + cleanup. |
| Tenant DB | Outbox status/attempts; unique key thiết kế. |
| SMTP | Thành công hoặc lỗi. |
| notify.email.dlq | Conceptual; topology chưa có. |

## 4. Tiền điều kiện và hậu điều kiện

**Tiền:** message có `X-Tenant-ID` và `idempotencyKey`; outbox tồn tại.

**Duplicate SENT:** ack, không SMTP lần 2.

**Retry:** `attempts++`, nack requeue, status còn PENDING (hoặc FAILED tạm rồi PENDING — giả định giữ PENDING đến max).

**DLQ:** `FAILED`, publish DLQ, ack message gốc để không loop vô hạn.

**Tenant inactive:** reject không requeue (code `TenantJobExecutor`).

## 5. Luồng chính và lỗi

Consume → set tenant → unique SENT? skip → SMTP → success SENT **hoặc** +1 attempt → requeue **hoặc** FAILED+DLQ → `clear()`.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

`IdempotencyStore` gói trong lookup outbox theo key (một DB). DLQ là queue conceptual.

### 6.2. Diễn giải bước

1. Deliver payload + header tenant + key.
2–3. Worker → executor, `requireActive`, `setCurrentTenant`.
4. `alt` đã SENT cùng key.
5. Load ra SENT.
6–8. `clear`, skip, ack (idempotent).
9. `else` load PENDING.
10. SMTP.
11. `alt` 250: SENT + `sent_at`.
12–16. remember key, `clear`, Done, ack.
17. `else` SMTP lỗi: không coi là SENT.
18. `attempts + 1`.
19. `alt` `< 3`: `clear`, nack requeue.
20. `else` max: `FAILED`.
21–24. publish DLQ, `clear`, ack gốc.

Ghi chú: inbox trùng dùng cùng `sourceEventId` (unique thiết kế). Tenant chết: reject không requeue.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

### 7.1. Vai trò phần tử

| Phần tử | Loại | Vai trò |
|---|---|---|
| EmailWorker | conceptual | Entry consume. |
| DeliveryPolicy | conceptual | `maxAttempts = 3`. |
| IdempotencyStore | conceptual | Có thể chính unique trên outbox. |
| EmailOutbox + Status + Repo | mix | `attempts` thật; key thiết kế. |
| Notification | entity | Unique `sourceEventId` thiết kế. |
| Queue / DLQ / SMTP | mix | DLQ conceptual. |

### 7.2. Quan hệ

| Nguồn → đích | Ký pháp | Loại và lý do |
|---|---|---|
| Worker → Policy / Store | `-->` | Association. |
| Worker → Repository | `-->` | Persist attempts/status. |
| Outbox → Status | `-->` | Typed-by. |
| Repository → Outbox | `..>` | Manage. |
| Worker → Queue / SMTP / DLQ | `..>` | Consume, send, park. |
| Notification → Outbox | `..>` | Cùng `sourceEventId` (không FK). |

## 8. Quyết định kiến trúc và bảo mật

- **At-least-once queue** + **exactly-once effect** nhờ unique key (không gửi 2 mail).
- **Outbox là nguồn sự thật** delivery; DLQ để người vận hành xử lý, không im lặng `200` hiring.
- **Tenant inactive:** không requeue vô hạn (`AmqpRejectAndDontRequeueException`).
- Không log body email đầy đủ / PII.

## 9. Giả định

- `maxAttempts = 3` (không có trong schema).
- `idempotencyKey` / `sourceEventId` **thiết kế**, chưa cột Flyway.
- DLQ tên `notify.email.dlq` **chưa** bind trong `RabbitMqConfig`.
- Nack requeue dùng retry broker; chưa vẽ exponential backoff chi tiết.
- WS at-least-once client nằm ở `realtime-notification`, không lặp ở đây.

## 10. Render và file được tạo

| File | Metadata |
|---|---|
| [class-diagram.png](class-diagram.png) | PNG, ít nhất 300 DPI |
| [sequence-diagram.png](sequence-diagram.png) | PNG, ít nhất 300 DPI |

Đã kiểm tra trực quan. Không tạo SVG.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File ./.agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/12-notification-realtime-communication/notification-delivery-reliability `
  -PlantUmlJar "$env:LOCALAPPDATA\PlantUML\plantuml-1.2026.7.jar" `
  -Format Png `
  -PngDpi 300
```

## 11. Trạng thái review

`Complete with assumptions` — nguồn và PNG 300 DPI đã xong.
