# COMPANY-05 — Xác minh doanh nghiệp

- **Mã Feature:** `COMPANY` / `02-company-management`
- **Mã Function:** `verify-company`
- **Thư mục:** `docs/diagram/02-company-management/verify-company`
- **Trạng thái Review:** `Source complete — awaiting rendering decision`

---

## 1. Mục đích và phạm vi

Phương án đã chọn: **công ty nộp hồ sơ pháp lý, Workspace Admin duyệt**, career page hiện badge `VERIFIED`.

Đây là claim tin cậy **cấp nền tảng**, không phải `tenants.status` vận hành (`ACTIVE`/`SUSPENDED`) và không phải Tenant Admin tự gắn badge.

Hai pha: Tenant Admin submit; Workspace Admin approve/reject.

## 2. Nguồn đã đối chiếu

- Người dùng chọn option 1 (nộp hồ sơ + Workspace Admin duyệt)
- `TenantInfo`, `TenantInfoRepository`, master `tenants` (chưa có `verification_status`)
- `MasterTenantController` (lifecycle ACTIVE/SUSPENDED, không KYC)
- `SecurityConfig`: `/api/v1/master/**` = `WORKSPACE_ADMIN`; tenant API = tenant roles
- `CompanyProfile` conceptual từ COMPANY-01 (đủ hồ sơ trước khi nộp)
- `RabbitMqConfig` `notify-email`
- Không có bảng/API verification trong repo

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Tenant Admin | Nộp MST, tên pháp lý, file giấy phép. |
| Workspace Admin | Duyệt trên Master portal. |
| Tenant Workspace UI / Master Review UI | Hai biên HTTP khác domain bảo mật. |
| Spring Security | Tenant submit vs Master review. |
| Verification Controllers | Gộp tenant + master controller trên sequence để giữ số participant. |
| CompanyVerificationService | Submit (đọc Tenant DB, ghi Master) và review (chỉ Master). |
| Object Storage | Bytes tài liệu. |
| Master PostgreSQL | `company_verification_requests` + `TenantInfo.verificationStatus`. |
| Tenant MySQL | Chỉ đọc `CompanyProfile` lúc submit. |
| RabbitMQ | Mail submitted / reviewed. |

## 4. Tiền điều kiện và hậu điều kiện

**Submit:** tenant vận hành `ACTIVE`; caller `TENANT_ADMIN`/`ADMIN`; hồ sơ công ty đủ trường bắt buộc; `verificationStatus` là `UNVERIFIED` hoặc `REJECTED` (không `PENDING`/`VERIFIED`).

**Submit thành công:** request `PENDING`; `TenantInfo.verificationStatus=PENDING`; file trên storage; mail nền tảng.

**Review:** caller `WORKSPACE_ADMIN`; request đang `PENDING`.

**Approve:** `VERIFIED` trên request và `TenantInfo`; career page được phép badge.

**Reject:** `REJECTED` + `reviewNote`; tenant có thể nộp lại.

Hai database **không** chung một distributed transaction.

## 5. Luồng chính và lỗi

Submit: quyền → đủ profile → không PENDING/VERIFIED → lưu file → insert Master PENDING → mail.

Review: quyền master → request PENDING → VERIFIED hoặc REJECTED → mail tenant.

Lỗi: 401/403; 400 file/profile; 409 không được nộp/duyệt.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

Sequence dùng 11 participant vì use case **bắt buộc** hai actor, hai UI, hai database và evidence store. Gộp hai controller thành một boundary.

### 6.1. Vai trò participant

Master PostgreSQL sở hữu trạng thái badge vì Workspace Admin phải liệt kê mọi tenant. Tenant DB không có FK tới verification. Object Storage tách bytes khỏi JSON API. RabbitMQ không quyết định VERIFIED.

### 6.2. Diễn giải bước

**Submit**

1. Tenant Admin nhập legal name, MST, upload file — trigger pha 1.
2. `POST /api/v1/tenant/company/verifications` (JWT tenant).
3. Không phải admin tenant: `401`/`403`.
4. Security chuyển controller sau khi `TenantContext` đã set (interceptor ẩn trong bước này để giảm lồng).
5. `submit(tenantId, request)`.
6. Đọc `CompanyProfile` — thiếu tên/địa chỉ thì không nhận KYC.
7. Profile trả về.
8. Đọc `TenantInfo` + request hiện tại trên Master — không tin tenant tự khai VERIFIED.
9. Master trả status.
10. Profile thiếu, file sai, hoặc đã `PENDING`/`VERIFIED`: `400`/`409 VERIFICATION_NOT_ALLOWED`.
11. Được nộp: lưu document, nhận `documentKeys` (không persist bytes).
12. Insert request `PENDING` và `TenantInfo.verificationStatus=PENDING` (cùng Master transaction).
13. Publish mail cho Workspace Admin; header tenant để worker biết ngữ cảnh, nhưng ghi Master không cần Tenant MySQL.
14. `201 PENDING`.
15. UI tenant hiện đang chờ duyệt.

**Review**

16. Workspace Admin mở hàng đợi Master — trigger pha 2.
17. `PATCH /api/v1/master/company-verifications/{id}` (không `X-Tenant-ID` nghiệp vụ).
18. Không phải `WORKSPACE_ADMIN`: `401`/`403`.
19. Forward master controller.
20. `review(reviewerId, id, decision)`.
21. Load request.
22. Master trả record.
23. Không tồn tại / không `PENDING`: `404`/`409 REVIEW_NOT_ALLOWED` (tránh duyệt kép).
24. `alt` Approve: `VERIFIED` trên request + `TenantInfo`.
25. Master lưu VERIFIED — badge career đọc field này.
26. `else` Reject: `REJECTED` + `reviewNote` bắt buộc về mặt nghiệp vụ (UI).
27. Master lưu REJECTED — tenant nộp lại được.
28. Mail kết quả cho Tenant Admin.
29. Queue accept.
30. `200 VerificationResponse`.
31. UI Master hiện trạng thái đã duyệt.

Không có bước Tenant DB trong review: badge không do tenant ghi.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

### 7.1. Vai trò phần tử

| Phần tử | Loại | Vai trò |
|---|---|---|
| `TenantVerificationRoute` / `TenantCompanyVerificationController` | conceptual | Submit phía tenant. |
| `SubmitVerificationRequest` | conceptual DTO | Metadata + files. |
| `MasterVerificationRoute` / `MasterCompanyVerificationController` | conceptual | List + review; `WORKSPACE_ADMIN`. |
| `ReviewVerificationRequest` | conceptual DTO | `APPROVE`/`REJECT` + note. |
| `VerificationResponse` | conceptual DTO | Không chứa file bytes hay taxId đầy đủ nếu không cần. |
| `CompanyVerificationService` | conceptual | Một service monolith, hai persistence unit. |
| `ObjectStoragePort` | conceptual | Evidence. |
| `EmailNotificationProducer` | conceptual | Hai loại mail. |
| `TenantInfo` | entity hiện có + field conceptual `verificationStatus` | Badge nền tảng. |
| `CompanyVerificationRequest` | conceptual Master entity | Hồ sơ KYC; `tenantId` là khóa registry. |
| `VerificationStatus` | conceptual enum | UNVERIFIED/PENDING/VERIFIED/REJECTED. |
| Repositories Master | mix | Verification conceptual; `TenantInfoRepository` hiện có. |
| `CompanyProfile` / Tenant DB | conceptual / hiện có isolation | Điều kiện đủ hồ sơ. |

### 7.2. Quan hệ

| Nguồn → đích | Ký pháp | Loại và lý do |
|---|---|---|
| Tenant route → Tenant controller | `..>` | Dependency định tuyến tenant. |
| Tenant controller → Submit DTO | `..>` | Dependency input. |
| Tenant controller → Service | `-->` | Association inject. |
| Master route → Master controller | `..>` | Dependency định tuyến platform. |
| Master controller → Review DTO | `..>` | Dependency input. |
| Master controller → VerificationResponse | `..>` | Dependency output. |
| Master controller → Service | `-->` | Cùng service, khác API boundary. |
| Service → CompanyVerificationRequestRepository | `-->` | Association ghi Master request. |
| Service → TenantInfoRepository | `-->` | Association cập nhật badge. |
| Service → ObjectStoragePort | `..>` | Dependency lúc submit. |
| Service → EmailNotificationProducer | `..>` | Dependency notify. |
| Service → CompanyProfile | `..>` | Dependency đọc completeness; không association JPA xuyên DB. |
| Request → VerificationStatus | `-->` | Typed-by vòng đời KYC. |
| TenantInfo → VerificationStatus | `-->` | Typed-by badge hiện tại. |
| TenantInfo → Request | `o--` `1`–`0..*` | Aggregation: lịch sử nộp thuộc tenant registry; request không chết theo mọi thao tác tên tenant, và **không** composition xuyên vì không có FK vật lý sang Tenant MySQL. |
| Repositories → entities | `..>` | Manage. |
| Repositories → Master DB | `-->` | Cả badge và request ở PostgreSQL. |
| Tenant DB → CompanyProfile | `*--` | Composition branding tenant, độc lập KYC. |

Không vẽ association `CompanyVerificationRequest` → `User` tenant: chỉ lưu `submitterEmail` string, tránh FK giả xuyên database.

## 8. Quyết định kiến trúc và bảo mật

- **Master vs tenant:** badge và evidence metadata thuộc Master; branding thuộc Tenant. Workspace Admin không đọc Tenant MySQL để duyệt.
- **TenantContext:** bắt buộc lúc submit; **không** set lúc review Master.
- **Transaction:** submit: Tenant read riêng, Master write riêng. Storage trước Master write; nếu Master fail, document mồ côi được dọn, không trả `201`. Review: một transaction Master.
- **Async:** mail không đổi `verificationStatus`.
- **Privacy:** không log MST đầy đủ hay file; response review không cần trả document bytes.
- **Tách vận hành:** `SUSPENDED` vẫn khác `UNVERIFIED`. Tenant bị khóa vận hành không submit.

## 9. Giả định (đã được người dùng chọn option 1)

- Toàn bộ API/bảng verification chưa tồn tại.
- `verificationStatus` thêm trên `tenants`, không tái sử dụng `status`.
- Hồ sơ đủ = `CompanyProfile.name` bắt buộc; địa chỉ/website khuyến nghị (sơ đồ đọc completeness).
- Nộp lại chỉ từ `REJECTED` hoặc `UNVERIFIED`.
- Badge career đọc Master, có thể cache; không nằm trong scope sequence này.
- `taxId` lưu Master để reviewer thấy; không vẽ giá trị mẫu trên sơ đồ.

## 10. Render và file được tạo

| File | Metadata |
|---|---|
| [class-diagram.png](class-diagram.png) | PNG, ít nhất 300 DPI |
| [sequence-diagram.png](sequence-diagram.png) | PNG, ít nhất 300 DPI |

Đã kiểm tra trực quan; nhãn `alt Submit not allowed` gồm hồ sơ thiếu, file không hợp lệ, hoặc đã `PENDING`/`VERIFIED`. Không tạo SVG.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File ./.agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/02-company-management/verify-company `
  -PlantUmlJar "$env:LOCALAPPDATA\PlantUML\plantuml-1.2026.7.jar" `
  -Format Png `
  -PngDpi 300
```

PlantUML 1.2026.7. Script xác minh DPI PNG ≥ 300 cho cả hai chiều.

## 11. Trạng thái review

`Complete with assumptions` — nguồn và PNG 300 DPI đã xong (option 1).
