# PIPE — Tạo và theo dõi offer

- **Mã Feature:** `PIPE` / `10-recruitment-pipeline` · `WF-03`
- **Mã Function:** `create-and-track-offer`
- **Thư mục:** `docs/diagram/10-recruitment-pipeline/create-and-track-offer`
- **Trạng thái Review:** `Complete with assumptions`

---

## 1. Mục đích và phạm vi

Tạo **offer** (đưa application sang `OFFER`), **theo dõi** offer hiện tại, rồi **Hire hoặc Reject** (kèm lý do reject). Audit bằng `hiring_decisions` + `application_status_history`.

Không có file hợp đồng, lương, chữ ký. Không kéo Kanban thường (function transition).

## 2. Nguồn đã đối chiếu

- `HiringDecision`, `HiringDecisionType` (`HIRE`, `REJECT`, `HOLD`)
- `ApplicationStatus.OFFER`
- `docs/features/Recruitment-Workflow/Hiring-Decision.md`
- API `POST/GET /applications/{id}/decisions`
- Người dùng gộp Offer + Audit

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Recruiter / Admin | Tạo offer, xem, chốt hire/reject. |
| Offer UI | POST offer / GET / POST decision. |
| Security / Interceptor | JWT + tenant. |
| HiringDecisionController / Service | Terminal lock. |
| Tenant DB | decisions + application + history. |
| RabbitMQ | Mail offer/kết quả. |

## 4. Tiền điều kiện và hậu điều kiện

**Tiền tạo offer:** chưa `HIRED`/`REJECTED`; thường đang Interview.

**Thành công offer:** `HiringDecision` `OFFER`; `status=OFFER`; stage Offer; history; `201`.

**Thành công decide:** decision `HIRE`/`REJECT`; status terminal; không reopen.

**Thất bại:** `401`/`403`; `404`/`409`/`422`; reject thiếu `reason`.

## 5. Luồng chính và lỗi

Create offer → track GET → decide hire/reject.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

Mail không được phép biến quyết định đã commit thành thất bại nghiệp vụ.

### 6.2. Diễn giải bước

**Create**

1. Recruiter phát offer.
2. `POST /applications/{id}/offers`.
3. 401/403.
4–6. Load application + stage Offer.
7. Thiếu / stale / đã terminal: lỗi.
8. Insert decision `OFFER` (giá trị thiết kế).
9. Update status/stage.
10. History audit.
11. Publish mail.
12. `201`; thẻ cột Offer; `clear()`.

**Track / resolve**

13. Mở offer hoặc chọn Hire/Reject.
14. GET hoặc POST decisions.
15–17. Tenant + controller.
18. `alt Track`: `getLatest` — chỉ đọc.
19–21. Trả snapshot; UI hiện trạng thái.
22. `else Hire or reject`.
23–24. Load; phải đang `OFFER`.
25. Không OFFER hoặc reject không lý do: `422`.
26. Insert `HIRE`/`REJECT`.
27. Terminal status/stage + history (audit).
28. Mail kết quả.
29. `200`; cột Hired/Rejected; `clear()`.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

### 7.1. Vai trò phần tử

| Phần tử | Loại | Vai trò |
|---|---|---|
| OfferRoute | conceptual | POST offer, GET, POST decisions. |
| Controller | conceptual | Biên HTTP. |
| DTOs | conceptual | Note/reason; không lương. |
| HiringDecisionService | conceptual | Offer rồi terminal. |
| Producer | conceptual | Notify. |
| Application / HiringDecision / History | hiện có | Decision type thêm `OFFER` conceptual. |
| Enums | mix | Status có `OFFER` thật; type `OFFER` thiết kế. |

### 7.2. Quan hệ

| Nguồn → đích | Ký pháp | Loại và lý do |
|---|---|---|
| Route → Controller | `..>` | Dependency định tuyến. |
| Controller → DTOs | `..>` | Dependency. |
| Controller → Service | `-->` | Association inject. |
| Service → ApplicationRepository | `-->` | Association đổi status/stage. |
| Service → HiringDecisionRepository | `-->` | Association quyết định. |
| Service → Producer | `-->` | Association mail. |
| Application → HiringDecision | `*--` | Composition: decision thuộc application. |
| Application → History | `*--` | Composition audit. |
| Application → Status | `-->` | Typed-by. |
| HiringDecision → Type | `-->` | Typed-by. |
| Repository → entity | `..>` | Manage. |

Không association sang bảng offer letter — không tồn tại.

## 8. Quyết định kiến trúc và bảo mật

- **Một nguồn sự thật:** offer = `status` + `hiring_decisions`, không tự gắn badge.
- **Reject:** `reason` bắt buộc.
- **Terminal:** không reopen trong function này (`WF-03`).
- **Transaction:** decision + status + history một transaction tenant; mail sau commit.
- **HOLD** giữ trong enum code; sequence không dùng (ngoài phạm vi).

## 9. Giả định

- Endpoint `/offers` chưa có; có thể map xuống `POST /decisions` với `decision=OFFER`.
- `HiringDecisionType.OFFER` chưa có trong Java.
- Không e-sign; theo dõi = GET latest decision.

## 10. Render và file được tạo

| File | Metadata |
|---|---|
| [class-diagram.png](class-diagram.png) | PNG, ít nhất 300 DPI |
| [sequence-diagram.png](sequence-diagram.png) | PNG, ít nhất 300 DPI |

Đã kiểm tra trực quan. Không tạo SVG.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File ./.agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/10-recruitment-pipeline/create-and-track-offer `
  -PlantUmlJar "$env:LOCALAPPDATA\PlantUML\plantuml-1.2026.7.jar" `
  -Format Png `
  -PngDpi 300
```

PlantUML 1.2026.7. Script xác minh DPI PNG ≥ 300 cho cả hai chiều.

## 11. Trạng thái review

`Complete with assumptions` — nguồn và PNG 300 DPI đã xong.
