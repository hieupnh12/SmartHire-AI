# NOTIFY — Email Notification

- **Mã Feature:** `NOTIFY` / `12-notification-realtime-communication` · `SCHED-03`
- **Mã Function:** `email-notification`
- **Thư mục:** `docs/diagram/12-notification-realtime-communication/email-notification`
- **Trạng thái Review:** `Complete with assumptions`

---

## 1. Mục đích và phạm vi

Gửi **một email tuyển dụng thành công lần đầu**: kiểm tra preference, render **template đa ngôn ngữ** (en/vi/ja), ghi `email_outbox` `PENDING`, publish `notify.email`, worker SMTP, cập nhật `SENT`. Không vẽ retry/DLQ (function reliability). Không OTP (`auth.email.otp`). Không ghi bảng `notifications`.

## 2. Nguồn đã đối chiếu

- `docs/features/Scheduling-Notifications/Email-Notifications.md` — `notify.email`, retry+DLQ (để chương khác), preference optional, `mail_templates`
- `EmailOutbox`, `NotificationStatus` (`PENDING`/`SENT`/`FAILED`), `EmailOutboxRepository`
- `RabbitMqConfig` exchange `notify.email`, queue `notify.email.q` — **chưa** DLQ, **chưa** EmailWorker
- `TenantJobExecutor` — set/clear tenant trên worker
- i18n sản phẩm: `en` / `vi` / `ja` (`docs/architecture/UX_I18N.md`)
- `User` **không** có cột locale

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Hiring Domain | Gọi `enqueue` sau khi dispatcher đồng ý kênh email. |
| EmailNotificationService | Preference + template + outbox + publish. |
| Tenant DB | Preference, template, `email_outbox`. |
| RabbitMQ `notify-email` | Hàng đợi có sẵn topology. |
| EmailWorker + TenantJobExecutor | Consume, SMTP, `SENT`. |
| SMTP provider | Cổng gửi ngoài. |

## 4. Tiền điều kiện và hậu điều kiện

**Tiền:** tenant `ACTIVE`; command có `toEmail`, `type`, `locale`, `idempotencyKey` (key chỉ truyền; chống trùng = reliability).

**Bỏ qua:** preference `emailEnabled=false` → không outbox, không mail.

**Thành công:** outbox `SENT`, `sent_at` có giá trị, message ack.

**Thất bại SMTP:** không mô tả ở đây.

## 5. Luồng chính và lỗi

enqueue → preference → template locale → INSERT PENDING → publish `X-Tenant-ID` → worker `requireActive` → SMTP 250 → `SENT` → `clear()`.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

`MailTemplateRenderer` gói trong `Service.render` để giữ số lifeline.

### 6.2. Diễn giải bước

**Enqueue**

1. Domain `enqueue`.
2–3. Load preference.
4. Tắt email: skip.
5–6. Load template theo `type` + locale.
7. Render subject/body (không log PII).
8. INSERT `PENDING`, `attempts=0`.
9–10. Publish queue + Accepted.
11. Trả Enqueued.

**Deliver**

12. Worker nhận header `X-Tenant-ID`.
13–14. `TenantJobExecutor`: tenant ACTIVE, `setCurrentTenant`.
15. Load outbox PENDING.
16. SMTP.
17. 250 OK.
18. `SENT` + `sent_at`.
19–21. `clear()`, Done, Ack.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

### 7.1. Vai trò phần tử

| Phần tử | Loại | Vai trò |
|---|---|---|
| EmailNotificationService | conceptual | Orchestrate happy path. |
| SendEmailCommand | conceptual | Input từ dispatcher. |
| MailTemplateRenderer / MailTemplate / RenderedMail | conceptual | i18n; **không** có bảng Flyway. |
| NotificationPreference | conceptual | Opt-out theo `type`. |
| EmailOutbox / Status / Repository | entity thật | Outbox + enum code. |
| EmailWorker | conceptual | `@RabbitListener` tương lai. |
| Queue / SMTP | topology + external | Kênh gửi. |

### 7.2. Quan hệ

| Nguồn → đích | Ký pháp | Loại và lý do |
|---|---|---|
| Service → Command | `..>` | Dependency. |
| Service → Renderer | `-->` | Association. |
| Service → OutboxRepository | `-->` | Association persist. |
| Service → Preference | `..>` | Dependency consult. |
| Renderer → Template / RenderedMail | `..>` | Đọc / tạo value. |
| Repository → Outbox | `..>` | Manage. |
| Outbox → Status | `-->` | Typed-by. |
| Service → Queue | `..>` | Publish. |
| Worker → Queue / SMTP / Repository | `..>` / `-->` | Consume, send, mark SENT. |

## 8. Quyết định kiến trúc và bảo mật

- **Outbox + queue:** request HTTP không SMTP trực tiếp.
- **Tenant trên worker:** bắt buộc `X-Tenant-ID` + `finally clear` (`TenantJobExecutor`).
- **i18n:** template server-side, không phụ thuộc locale FE lúc gửi.
- **OTP** tách queue `auth.email.otp`.

## 9. Giả định

- Locale trên command (dispatcher chọn); `User` chưa có `preferredLocale`.
- Default preference = email bật nếu chưa có dòng.
- Template conceptual; body lưu snapshot trên outbox lúc enqueue (đúng cột `body` hiện có).
- SMTP 250 = thành công nghiệp vụ gửi; bounce sau đó không vẽ.
- Retry/DLQ/idempotency **không** vẽ ở đây dù feature doc nêu.

## 10. Render và file được tạo

| File | Metadata |
|---|---|
| [class-diagram.png](class-diagram.png) | PNG, ít nhất 300 DPI |
| [sequence-diagram.png](sequence-diagram.png) | PNG, ít nhất 300 DPI |

Đã kiểm tra trực quan. Không tạo SVG.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File ./.agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/12-notification-realtime-communication/email-notification `
  -PlantUmlJar "$env:LOCALAPPDATA\PlantUML\plantuml-1.2026.7.jar" `
  -Format Png `
  -PngDpi 300
```

## 11. Trạng thái review

`Complete with assumptions` — nguồn và PNG 300 DPI đã xong.
