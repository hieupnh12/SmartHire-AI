# NOTIFY — Recruitment Event Notifications

- **Mã Feature:** `NOTIFY` / `12-notification-realtime-communication` · `SCHED-02` / `SCHED-03` (phát sự kiện)
- **Mã Function:** `recruitment-event-notifications`
- **Thư mục:** `docs/diagram/12-notification-realtime-communication/recruitment-event-notifications`
- **Trạng thái Review:** `Complete with assumptions`

---

## 1. Mục đích và phạm vi

Sau khi nghiệp vụ tuyển dụng **đã commit**, dispatcher **chọn người nhận**, **chặn kết quả nếu chưa được phép**, ghi **inbox** (`notifications`) kèm **deep link tenant**, và **fan-out lệnh email**. Không vẽ STOMP, không SMTP, không mark-read. Các loại sự kiện là `alt`/`enum`, không phải function riêng.

## 2. Nguồn đã đối chiếu

- Feature SCHED-02: “stage change, schedule, score ready”
- Feature SCHED-03: schedule, decision, feedback
- Pipeline diagrams: `EmailNotificationProducer` sau move/offer
- Bảng `notifications.type` VARCHAR(64), `payload_json`
- Module Job/Workflow/Assessment/Interview: trigger thật nằm ở controller tương ứng (nhiều cái còn scaffold)

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Hiring Actor | Apply, chuyển stage, reject/offer, mời, nhắc lịch (tùy use case). |
| Hiring Domain | Commit nghiệp vụ rồi `dispatch`. |
| RecruitmentNotificationDispatcher | Recipients, policy, inbox, email command. |
| ResultReleasePolicy | Ẩn `RESULT_AVAILABLE` với candidate khi chưa release. |
| Tenant DB | INSERT inbox. |
| RabbitMQ | Lệnh email (kênh xử lý ở email-notification). |

## 4. Tiền điều kiện và hậu điều kiện

**Tiền:** tenant `ACTIVE`; bản ghi nghiệp vụ đã persist; `sourceEventId` ổn định.

**Skip:** `RESULT_AVAILABLE` + candidate + chưa release → không inbox, không email.

**Thành công:** một (hoặc vài) dòng inbox; lệnh email published; **không rollback** hiring nếu mail/WS sau đó lỗi.

**Thất bại dispatcher:** hiring vẫn committed (best-effort notify).

## 5. Luồng chính và lỗi

Domain commit → `dispatch(type)` → policy kết quả → deep link → INSERT inbox → publish email.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

Một sequence cho mọi type; nhánh chỉ khác policy kết quả. STOMP không có lifeline (sau INSERT, function realtime).

### 6.2. Diễn giải bước

1. Actor hoàn tất hành động hiring.
2. Domain `dispatch` (type, recipient, application/job ids, `sourceEventId`).
3. `alt` kết quả chưa được phép: `canNotifyResult` = false.
4. Skip candidate.
5. `else`: policy true (các type khác luôn true).
6. Deep link: `tenantCode` + resource + path **cùng tenant**.
7. INSERT `notifications` (`read_at` null).
8–9. Publish email + Accepted.
10. Dispatched.
11. Hiring action **không** bị undo.

Loại `NotificationType`: apply thành công, chuyển stage, reject, offer, mời assessment/interview, nhắc lịch/deadline, kết quả khi được phép.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **layered application-design**. `ResultReleasePolicy` và `DeepLinkBuilder` gói trong dispatcher (ghi chú + operation `canNotifyResult`) để Service Layer không kéo ngang.

### 7.1. Vai trò phần tử

| Phần tử | Lớp | Vai trò |
|---|---|---|
| HiringDomainServices | Routing | Trigger sau commit nghiệp vụ. |
| RecruitmentNotificationDispatcher | Service | Recipients, policy kết quả, inbox, fan-out email. |
| RecruitmentNotificationEvent | DTO | Hợp đồng sự kiện. |
| NotificationRepository | Repository | INSERT inbox. |
| Notification, NotificationType | Domain | Inbox; enum conceptual (`type` đang String). |
| EmailNotificationProducer, RabbitMQ, TenantDB, TenantContext | Infrastructure | Lệnh email + isolation. |

### 7.2. Quan hệ

| Nguồn → đích | Ký pháp | Loại và lý do |
|---|---|---|
| Domain → Dispatcher | `-->` `emits` | Association sau commit. |
| Domain → Event | `..>` `creates` | Dependency. |
| Dispatcher → Event | `..>` `processes` | Dependency. |
| Dispatcher → Repository | `-->` `persists inbox` | Association. |
| Dispatcher → Producer | `-->` `fans out email` | Association. |
| Dispatcher → TenantContext | `-->` | Association tenant. |
| Repository → Notification | `-->` `manages` | Association. |
| Notification → Type | `-->` `typed by` | Dependency enum. |
| Notification → TenantDB | `-->` `persists to` | Association. |
| Producer → Broker | `-->` `publishes X-Tenant-ID` | Association. |

## 8. Quyết định kiến trúc và bảo mật

- **Notify sau commit:** mất mail không hủy apply/move.
- **Deep link** không chứa JWT; chỉ path + id; API resource vẫn authorize.
- **Không cross-tenant:** `tenantCode` phải khớp host/header hiện tại.
- **Kết quả:** candidate không nhận điểm khi policy cấm.

## 9. Giả định

- Reminder là **cùng dispatcher**, trigger scheduler (SCHED-01) không vẽ đặt lịch.
- Nhiều recipient = lặp `dispatch` từng user, không vẽ `loop`.
- In-app luôn ghi khi policy cho phép; email có thể skip ở email-notification (preference).
- `sourceEventId` uniqueness = reliability.
- ResultReleasePolicy / DeepLinkBuilder không tách class trên sơ đồ chính; logic nằm ở dispatcher.

## 10. Render và file được tạo

| File | Metadata |
|---|---|
| [class-diagram.png](class-diagram.png) | PNG, ít nhất 300 DPI |
| [sequence-diagram.png](sequence-diagram.png) | PNG, ít nhất 300 DPI |

Đã kiểm tra trực quan. Không tạo SVG.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File ./.agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/12-notification-realtime-communication/recruitment-event-notifications `
  -PlantUmlJar "$env:LOCALAPPDATA\PlantUML\plantuml-1.2026.7.jar" `
  -Format Png `
  -PngDpi 300
```

## 11. Trạng thái review

`Complete with assumptions` — nguồn và PNG 300 DPI đã xong.
