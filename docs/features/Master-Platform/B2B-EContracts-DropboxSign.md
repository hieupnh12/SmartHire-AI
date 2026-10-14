# MASTER-05 — Hợp đồng Điện tử B2B & Ký số Dropbox Sign (B2B E-Contracts & Remote E-Signature)

**Code ID:** `MASTER-05`  
**Epic:** Master Platform — SaaS Multi-Tenant Administration  
**Trạng thái:** `Done`

## Mục đích chức năng

Quản lý toàn bộ vòng đời hợp đồng kinh tế B2B (`contracts`, `contract_signatures`) theo chuẩn pháp lý Việt Nam, tích hợp **Dropbox Sign API v3 (HelloSign — V26)** để gửi yêu cầu ký số từ xa qua email cho đại diện pháp luật của hai bên, tự động đồng bộ trạng thái ký qua Webhook HMAC-SHA256, tải về bản PDF hợp đồng đã đóng dấu chữ ký số kèm trang **Audit Trail** và băm kiểm toàn vẹn **SHA-256 Checksum**. Hỗ trợ song song phương thức tải lên file PDF hợp đồng đóng dấu mộc đỏ truyền thống (`UPLOAD_SIGNED_PDF`).

## Actor

- **Workspace Admin (`WORKSPACE_ADMIN`):** Soạn thảo hợp đồng B2B, xuất file PDF hợp đồng chuẩn pháp lý Việt Nam, gửi yêu cầu ký số qua Dropbox Sign, tải lên bản PDF đã ký đóng dấu hoặc chấm dứt hợp đồng.
- **Đại diện Pháp luật Bên A & Bên B (Signers):** Nhận email từ Dropbox Sign (hoặc truy cập cổng ký trực tuyến `/contracts/sign/:token`), xem nội dung hợp đồng và thực hiện ký điện tử.
- **Dropbox Sign API (HelloSign):** Xử lý quy trình ký số nhiều bên, đóng dấu Audit Trail và gọi Callback Webhook về hệ thống.

## Luồng hoạt động

### 1. Khởi tạo & Xuất Bản in PDF Hợp đồng Pháp lý Việt Nam
1. Workspace Admin tạo hợp đồng mới (`POST /api/v1/master/contracts`) từ trang Quản lý Hợp đồng hoặc từ luồng B2B Deal Wizard.
2. Hệ thống tự động lấy thông tin pháp nhân Bên A (SmartHire) từ `system_settings`, điền thông tin pháp nhân Bên B (Khách hàng: Tên công ty, Mã số thuế, Địa chỉ, Người đại diện, Chức vụ), tính giá trị trước thuế (`contract_value`), thuế GTGT (`tax_rate = 10%`), tổng giá trị thanh toán (`total_amount`) bằng **VNĐ (`VND`)** và tự động đọc số tiền bằng chữ tiếng Việt (`amount_in_words`).
3. Hệ thống render file PDF hợp đồng kinh tế chuẩn thể thức văn bản Việt Nam (Quốc hiệu, Tiêu ngữ, các điều khoản dịch vụ SaaS & SLA) qua `ContractPdfGeneratorService`.

### 2. Gửi Yêu cầu Ký số qua Dropbox Sign API v3 (`DROPBOX_SIGN`)
1. Khi Admin bấm **Gửi Ký số Dropbox Sign** (`POST /api/v1/master/contracts/{id}/send`), `DropboxSignClient` tạo file PDF hợp đồng và gọi `POST /v3/signature_request/send` tới Dropbox Sign API với danh sách người ký (`contract_signatures`).
2. Hệ thống lưu `external_signature_request_id`, `esign_details_url`, `esign_provider = 'DROPBOX_SIGN'` và chuyển trạng thái hợp đồng sang `PENDING_SIGNATURE`.
3. Dropbox Sign gửi email mời ký trực tiếp tới từng người ký.

### 3. Nhận Webhook Ký số & Lưu trữ PDF + SHA-256 Checksum
1. Khi từng bên ký hoặc khi tất cả các bên hoàn tất ký, Dropbox Sign gửi multipart/JSON callback tới `POST /api/v1/master/contracts/webhooks/dropbox-sign`.
2. Hệ thống xác thực chữ ký HMAC-SHA256 của sự kiện bằng `DROPBOX_SIGN_API_KEY`, luôn trả chuỗi `"Hello API Event Received"` theo đúng đặc tả Dropbox Sign.
3. Với sự kiện `signature_request_signed`: cập nhật trạng thái từng người ký trong `contract_signatures` sang `SIGNED` kèm `signed_at`.
4. Với sự kiện `signature_request_all_signed`:
   - Tải mảng byte của file PDF hợp đồng đã ký kèm trang **Audit Trail** từ Dropbox Sign (`GET /v3/signature_request/files/{signature_request_id}?file_type=pdf`).
   - Lưu trực tiếp vào cột `contracts.signed_pdf_bytes` (`BYTEA`), tính mã băm **SHA-256** lưu vào `contracts.document_checksum` và chuyển `contracts.status = 'SIGNED'`.
   - Nếu hợp đồng chưa có hoá đơn đi kèm, hệ thống tự động phát hành hoá đơn tài chính (`invoices`) để khách hàng thanh toán và kích hoạt dịch vụ.

### 4. Tải lên Hợp đồng Đóng dấu Mộc đỏ (`UPLOAD_SIGNED_PDF`)
- Đối với doanh nghiệp nhà nước hoặc tập đoàn yêu cầu ký giấy đóng dấu mộc đỏ, Admin có thể tải bản scan PDF đã ký lên hệ thống (`POST /api/v1/master/contracts/{id}/upload-signed-pdf`). Hệ thống lưu `signed_pdf_bytes`, tính `document_checksum` SHA-256 và chuyển trạng thái sang `SIGNED`.

## Business Rules

- Mọi hợp đồng B2B đều lưu giá trị theo đơn vị **VNĐ (`VND`)**, chu kỳ 1 năm (`start_date` → `end_date`).
- Hợp đồng đã ở trạng thái `SIGNED` bị khoá chỉnh sửa; mọi bản tải về (`GET /api/v1/master/contracts/{id}/pdf`) đều trả về đúng bản PDF đã ký (`signed_pdf_bytes`) khớp với mã băm `document_checksum` SHA-256.
- Việc ký xong hợp đồng (`SIGNED`) đảm bảo cơ sở pháp lý và phát hành hoá đơn; việc cấp phát MySQL Database và kích hoạt gói thuê bao (`ACTIVE`) chỉ diễn ra khi hoá đơn được xác nhận thanh toán (`PAID`) theo đúng quy tắc quản trị rủi ro B2B.

## API liên quan

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/v1/master/contracts` | WORKSPACE_ADMIN | Danh sách toàn bộ hợp đồng B2B |
| POST | `/api/v1/master/contracts` | WORKSPACE_ADMIN | Tạo hợp đồng B2B mới (Draft) |
| POST | `/api/v1/master/contracts/{id}/send` | WORKSPACE_ADMIN | Gửi yêu cầu ký số qua Dropbox Sign API v3 |
| POST | `/api/v1/master/contracts/{id}/sync-esign` | WORKSPACE_ADMIN | Đồng bộ thủ công trạng thái ký & file PDF từ Dropbox Sign |
| POST | `/api/v1/master/contracts/{id}/upload-signed-pdf` | WORKSPACE_ADMIN | Tải lên file PDF hợp đồng đã ký đóng dấu mộc đỏ |
| GET | `/api/v1/master/contracts/{id}/pdf` | WORKSPACE_ADMIN | Tải file PDF hợp đồng (bản nháp hoặc bản đã ký kèm Audit Trail) |
| POST | `/api/v1/master/contracts/webhooks/dropbox-sign` | Public (HMAC) | Webhook nhận sự kiện ký số từ Dropbox Sign |
| GET | `/api/v1/master/contracts/public/{token}` | Public (Token) | Xem thông tin hợp đồng qua liên kết bảo mật |

## Database liên quan

- PostgreSQL (`smarthire_master`):
  - `contracts` (entity `Contract`): thông tin pháp lý Bên A/B, giá trị hợp đồng VNĐ, metadata Dropbox Sign (`esign_provider`, `external_signature_request_id`, `esign_details_url`, `esign_test_mode`, `signed_pdf_bytes`, `document_checksum`).
  - `contract_signatures` (entity `ContractSignature`): danh sách người ký, email, chức danh, `external_signature_id` và thời điểm ký.

## UI mockup

- `/admin/contracts` (`ContractManagementPage.tsx`): Quản lý danh sách hợp đồng, xem trước bản in hợp đồng kinh tế Việt Nam, gửi yêu cầu ký số Dropbox Sign, đồng bộ trạng thái ký, kiểm tra mã băm SHA-256 và tải file PDF hoàn chỉnh.
- `/contracts/sign/:token` (`ContractSigningPortalPage.tsx`): Cổng tra cứu trạng thái hợp đồng trực tuyến cho khách hàng.
