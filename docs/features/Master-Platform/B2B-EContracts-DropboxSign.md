# MASTER-05 — Hợp đồng Điện tử B2B & Ký số Dropbox Sign (B2B E-Contracts & Remote E-Signature)

**Code ID:** `MASTER-05`  
**Epic:** Master Platform — SaaS Multi-Tenant Administration  
**Trạng thái:** `Done`

## Mục đích chức năng

Quản lý toàn bộ vòng đời hợp đồng kinh tế B2B (`contracts`, `contract_signatures`) theo chuẩn pháp lý Việt Nam, tích hợp **Dropbox Sign API v3 (HelloSign — V26)** để gửi yêu cầu ký số từ xa qua email cho đại diện có thẩm quyền của khách hàng, tự động đồng bộ trạng thái ký/từ chối/hủy qua Webhook HMAC-SHA256 hoặc đồng bộ thủ công (`sync-esign`), tải về bản PDF hợp đồng đã đóng dấu chữ ký số kèm trang **Audit Trail**, lưu trữ `signed_pdf_bytes` trong Master DB và băm kiểm toàn vẹn **SHA-256 Checksum**.

## Actor

- **Workspace Admin (`WORKSPACE_ADMIN`):** Soạn thảo hợp đồng B2B, chỉnh sửa bản nháp (`DRAFT`), xuất file PDF hợp đồng chuẩn pháp lý Việt Nam, gửi yêu cầu ký số qua Dropbox Sign, đồng bộ trạng thái ký, cập nhật trạng thái/chấm dứt hoặc xoá hợp đồng chưa ký.
- **Đại diện Bên B (Signer):** Nhận email ký số từ Dropbox Sign kèm email thông báo liên kết cổng tra cứu trực tuyến (`/contracts/sign/:token` hoặc `/contracts/view/:token`), xem nội dung hợp đồng, tải PDF và tự kích hoạt đồng bộ trạng thái ký.
- **Dropbox Sign API (HelloSign):** Xử lý quy trình ký số từ xa, đóng dấu Audit Trail và gửi Callback Webhook về hệ thống.

## Luồng hoạt động

### 1. Khởi tạo & Cập nhật Hợp đồng Pháp lý Việt Nam (`DRAFT`)
1. Workspace Admin tạo hợp đồng mới (`POST /api/v1/master/contracts`) từ trang Tạo Hợp đồng (`/admin/contracts/create`) hoặc từ B2B Deal Wizard (`/admin/deals`, `/admin/tenants/create`).
2. `MasterContractService.createContract()` sinh mã hợp đồng (`CTR-YYYYMM-XXXX`) và `signingToken` (hiệu lực ban đầu **30 ngày**), điền thông tin pháp nhân Bên A từ payload hoặc cấu hình tập trung `smarthire.platform.*` (cụm Đà Nẵng & TPBank theo V37), thông tin pháp nhân Bên B, giá trị hợp đồng (`contract_value`), tổng thanh toán (`total_amount`) bằng **VNĐ (`VND`)** và đọc số tiền bằng chữ tiếng Việt (`amount_in_words`).
3. Nếu hợp đồng gắn `tenantId` và `planId`, hệ thống tự động tạo hoặc cập nhật bản ghi `tenant_subscriptions` ở trạng thái **`PENDING`** kèm đầy đủ 11 cột snapshot V27 và `contracted_price_yearly`. Nếu gắn `consultationRequestId`, hệ thống liên kết `tenantId` và chuyển Lead sang `PROVISIONED`.
4. Khi hợp đồng đang ở trạng thái `DRAFT`, Admin có thể chỉnh sửa thông tin qua `PUT /api/v1/master/contracts/{id}`.

### 2. Gửi Yêu cầu Ký số qua Dropbox Sign API v3 (`DROPBOX_SIGN`)
1. Khi Admin bấm **Gửi Ký số Dropbox Sign** (`POST /api/v1/master/contracts/{id}/send`), `ContractPdfGeneratorService` render file PDF hợp đồng kinh tế chuẩn thể thức văn bản Việt Nam (Quốc hiệu, Tiêu ngữ, các điều khoản SaaS, SLA & Luật Bảo vệ dữ liệu cá nhân 2025 / NĐ 356/2025/NĐ-CP) và tính mã băm bản thảo SHA-256 (`draftChecksum`).
2. `DropboxSignClient.sendSignatureRequest()` gửi yêu cầu ký tới Dropbox Sign API v3. Hệ thống lưu `external_signature_request_id`, `esign_details_url`, `esign_provider = 'DROPBOX_SIGN'`, `esign_test_mode`, gia hạn `token_expires_at` sang **+14 ngày** và chuyển trạng thái hợp đồng sang **`PENDING_SIGNATURE`**.
3. Tạo/cập nhật bản ghi người ký Bên B ở trạng thái `PENDING` trong `contract_signatures`, ghi nhận nhật ký kiểm toán `SEND_CONTRACT_DROPBOX_SIGN` vào `platform_audit_logs` và đẩy RabbitMQ job gửi email kèm liên kết cổng `/contracts/sign/{token}` (`contract-invitation`).

### 3. Nhận Webhook / Đồng bộ Trạng thái Ký số, Từ chối & Hủy
1. Khi có sự kiện ký số, Dropbox Sign gửi multipart/JSON callback tới `POST /api/v1/public/contracts/webhook/dropbox-sign` (hoặc Admin/Đối tác bấm đồng bộ `POST /api/v1/master/contracts/{id}/sync-esign` / `POST /api/v1/public/contracts/{token}/sync-esign`).
2. `MasterContractService.handleDropboxSignWebhook()` xác thực HMAC-SHA256 `event_hash` bằng `DROPBOX_SIGN_API_KEY` (khớp với `event_time` và `event_type`) và luôn trả về `"Hello API Event Received"` khi hợp lệ.
3. Khi hoàn tất ký (`signature_request_all_signed` / `signature_request_signed` hoặc `isComplete = true`), `finalizeDropboxSignedContract()` thực hiện:
   - Tải mảng byte PDF đã ký kèm trang **Audit Trail** từ Dropbox Sign (`dropboxSignClient.downloadSignedPdf`), tính SHA-256 `document_checksum`, lưu `signed_pdf_bytes` (`BYTEA`), gắn `signed_document_url = "/api/v1/public/contracts/{signingToken}/pdf"` và chuyển `contracts.status = 'SIGNED'`.
   - Cập nhật `contract_signatures` sang `SIGNED` kèm `signed_at` và `client_ip`.
   - Ghi nhận nhật ký kiểm toán `CONTRACT_SIGNED_DROPBOX_SIGN` vào `platform_audit_logs`.
   - Nếu trước đó hợp đồng chưa `SIGNED`, tự động gọi `billingService.createInvoice()` (cổng mặc định `BANK_TRANSFER`, hạn thanh toán +14 ngày) để phát hành hoá đơn B2B.
4. Với sự kiện từ chối ký (`signature_request_declined` / `isDeclined = true`):
   - Chuyển `contracts.status = 'REJECTED'`, `contract_signatures` đang `PENDING` → `REJECTED`, `tenant_subscriptions` đang `PENDING` → `CANCELED`, `consultation_requests` (nếu có) → `REJECTED`.
   - Nếu tenant chưa cấp phát DB (`PENDING_PAYMENT` / `FAILED`), chuyển `tenants.status = 'CANCELLED'`, đánh dấu `is_deleted = true`, đồng thời đổi tên giải phóng `subdomain`, `code` (`released_<id>_...`) và `db_name` (`smarthire_tenant_released_<id>_...`) và ghi `PlatformAuditLog` (`CONTRACT_DECLINED_DROPBOX_SIGN`).
5. Với sự kiện hủy yêu cầu ký (`signature_request_canceled` / `isCanceled = true`):
   - Chuyển `contracts.status = 'TERMINATED'`, đóng `contract_signatures` (`PENDING` → `REJECTED`) và `tenant_subscriptions` (`PENDING` → `CANCELED`), giải phóng subdomain/code/dbName cho tenant chưa cấp phát (`CANCELLED` + `is_deleted = true`), hoàn trả trạng thái lead `PROVISIONED` → `CONTACTED` (nếu có) và ghi `PlatformAuditLog` (`CONTRACT_CANCELED_DROPBOX_SIGN`).

## Business Rules

- Mọi hợp đồng B2B lưu giá trị theo **VNĐ (`VND`)** hoặc tiền tệ chỉ định, với điều kiện `endDate` không được trước `startDate`.
- Chỉ cho phép chỉnh sửa nội dung hợp đồng (`PUT /api/v1/master/contracts/{id}`) khi đang ở trạng thái `DRAFT`.
- Hợp đồng đã ở trạng thái `SIGNED`, `REJECTED` hoặc `TERMINATED` bị khoá gửi ký lại trên Dropbox Sign; hợp đồng `SIGNED` bị chặn không cho xoá (`DELETE /api/v1/master/contracts/{id}`).
- Tải PDF (`GET /api/v1/master/contracts/{id}/pdf` hoặc `GET /api/v1/public/contracts/{token}/pdf`) ưu tiên trả về `signed_pdf_bytes` (hoặc tự tải lại từ Dropbox Sign nếu `SIGNED`), nếu chưa ký thì render động bản thảo PDF qua `ContractPdfGeneratorService`.
- Việc ký xong hợp đồng (`SIGNED`) phát hành hoá đơn tự động; việc cấp phát MySQL Database và kích hoạt gói thuê bao (`ACTIVE`) chỉ diễn ra khi hoá đơn được xác nhận thanh toán (`PAID`).

## API liên quan

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/v1/master/contracts` | WORKSPACE_ADMIN | Danh sách hợp đồng B2B (lọc `status`, `tenantId`) |
| GET | `/api/v1/master/contracts/{id}` | WORKSPACE_ADMIN | Chi tiết hợp đồng B2B |
| POST | `/api/v1/master/contracts` | WORKSPACE_ADMIN | Tạo hợp đồng B2B mới (`DRAFT`) |
| PUT | `/api/v1/master/contracts/{id}` | WORKSPACE_ADMIN | Cập nhật hợp đồng khi đang ở trạng thái `DRAFT` |
| POST | `/api/v1/master/contracts/{id}/send` | WORKSPACE_ADMIN | Tạo PDF bản thảo & gửi yêu cầu ký số qua Dropbox Sign API v3 |
| POST | `/api/v1/master/contracts/{id}/sync-esign` | WORKSPACE_ADMIN | Đồng bộ thủ công trạng thái ký & file PDF từ Dropbox Sign |
| GET | `/api/v1/master/contracts/{id}/pdf` | WORKSPACE_ADMIN | Tải file PDF hợp đồng (bản đã ký kèm Audit Trail hoặc bản thảo) |
| PATCH | `/api/v1/master/contracts/{id}/status` | WORKSPACE_ADMIN | Cập nhật trạng thái hợp đồng (`EXPIRED`, `TERMINATED`, v.v.) |
| DELETE | `/api/v1/master/contracts/{id}` | WORKSPACE_ADMIN | Xoá hợp đồng chưa ký (chặn nếu `SIGNED`) |
| POST | `/api/v1/public/contracts/webhook/dropbox-sign` | Public (HMAC) | Webhook nhận sự kiện ký số / từ chối / hủy từ Dropbox Sign |
| GET | `/api/v1/public/contracts/{token}` | Public (Token) | Xem thông tin hợp đồng qua `signingToken` bảo mật |
| POST | `/api/v1/public/contracts/{token}/sync-esign` | Public (Token) | Đối tác tự đồng bộ trạng thái ký từ Dropbox Sign |
| GET | `/api/v1/public/contracts/{token}/pdf` | Public (Token) | Tải file PDF hợp đồng công khai qua `signingToken` |

## Database liên quan

- PostgreSQL (`smarthire_master`):
  - `contracts` (entity `Contract`): thông tin pháp lý Bên A/B, giá trị hợp đồng VNĐ, metadata Dropbox Sign (`esign_provider`, `external_signature_request_id`, `esign_details_url`, `esign_test_mode`, `signed_pdf_bytes`, `document_checksum`).
  - `contract_signatures` (entity `ContractSignature`): danh sách người ký, email, chức danh, `external_signature_id` và thời điểm ký.
  - `tenant_subscriptions`, `invoices`, `consultation_requests`, `platform_audit_logs`.

## UI mockup

- `/admin/contracts` ([`ContractsPage.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/contract/pages/ContractsPage.tsx) & [`ContractDetailModal.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/contract/components/ContractDetailModal.tsx)): Thẻ KPI hợp đồng, bộ lọc/tìm kiếm theo trạng thái, gửi yêu cầu ký số Dropbox Sign, đồng bộ trạng thái ký, sao chép liên kết cổng ký, xem/tải PDF + Audit Trail (`documentChecksum`) và xoá bản nháp/chưa ký.
- `/admin/contracts/create` ([`CreateContractPage.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/contract/pages/CreateContractPage.tsx)): Form soạn thảo hợp đồng kinh tế B2B pháp lý Việt Nam (hỗ trợ `?leadId=...` để điền sẵn từ Lead).
- `/contracts/sign/:token` & `/contracts/view/:token` ([`PublicContractSigningPage.tsx`](file:///d:/9-CT-PROJECT/CODE/SmartHire-AI/frontend/src/features/master/contract/pages/PublicContractSigningPage.tsx)): Cổng tra cứu trạng thái ký hợp đồng trực tuyến, tải bản thảo/PDF đã ký kèm Audit Trail và tự đồng bộ trạng thái từ Dropbox Sign cho đối tác.
