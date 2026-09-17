# COMPANY-05 — Xác thực doanh nghiệp (Company Verification)

- **Mã Feature:** `COMPANY` / `02-company-management`
- **Mã Function:** `verify-company`
- **Thư mục:** `docs/diagram/02-company-management/verify-company`
- **Trạng thái Review:** `Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.

---

## 1. Mục đích và phạm vi

Cho phép Tenant Admin tải lên thông tin pháp lý của doanh nghiệp (Mã số thuế, Giấy phép đăng ký kinh doanh) để gửi yêu cầu xác thực tới Platform Administrator. Platform Admin duyệt hồ sơ trên Master DB và cập nhật trạng thái `isVerified` của Tenant nhằm đảm bảo tính uy tín và hạn chế tình trạng doanh nghiệp giả mạo.

## 2. Nguồn đã đối chiếu

- Master Domain Entity: `CompanyVerification`, `TenantInfo`, `VerificationStatus`
- Master Repository: `CompanyVerificationRepository`, `TenantInfoRepository`
- Master Service & Controller: `MasterTenantAdminController`, `CompanyVerificationService`

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Tenant Admin | Đăng tải hồ sơ doanh nghiệp (Mã số thuế, Giấy phép ĐKKD). |
| Platform Admin | Duyệt/Từ chối hồ sơ xác thực doanh nghiệp. |
| Admin Portal UI | Giao diện nộp hồ sơ và giao diện thẩm định của Platform Admin. |
| Spring Security | Phân quyền truy cập các endpoint quản trị Master Landlord. |
| MasterTenantAdminController | Tiếp nhận request nộp và duyệt xác thực. |
| CompanyVerificationService | Xử lý logic lưu hồ sơ và cập nhật cờ `isVerified` trên Master DB. |
| Master DB (MySQL) | Cơ sở dữ liệu Master chứa `tenant_info` và `company_verifications`. |

## 4. Tiền điều kiện và hậu điều kiện

- **Tiền điều kiện:** Tenant đã được khởi tạo; Tenant Admin đã đăng nhập; Hồ sơ đăng ký kinh doanh hợp lệ.
- **Thành công:** Yêu cầu xác thực chuyển sang `PENDING`; Khi Platform Admin duyệt: `CompanyVerification.status` = `VERIFIED`, `TenantInfo.isVerified` = `true`.
- **Thất bại:** `401`/`403` Access Error; `409 Conflict` (Hồ sơ cũ đang chờ duyệt); `400 Bad Request` (Thiếu tài liệu hoặc mã số thuế không hợp lệ).

## 5. Luồng chính và lỗi

1. **Luồng nộp hồ sơ (Tenant Admin):**
   - Tenant Admin nhập mã số thuế và URL giấy phép kinh doanh -> Gửi `POST /api/v1/master/tenants/{tenantId}/verify`.
   - Kiểm tra nếu đã có hồ sơ `PENDING` -> Trả về `409 Conflict`.
   - Lưu hồ sơ mới vào `company_verifications` với trạng thái `PENDING`. Trả về `202 Accepted`.

2. **Luồng xét duyệt (Platform Admin):**
   - Platform Admin mở danh sách yêu cầu xác thực trên Portal -> Gửi `POST /api/v1/master/verifications/{id}/review`.
   - Nếu Đồng ý: Cập nhật `CompanyVerification.status` = `VERIFIED` và `TenantInfo.isVerified = true`.
   - Nếu Từ chối: Cập nhật `CompanyVerification.status` = `REJECTED` đính kèm lý do từ chối.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

- `TenantAdmin`: Người dùng nộp hồ sơ doanh nghiệp.
- `PlatformAdmin`: Quản trị viên hệ thống SaaS duyệt hồ sơ.
- `UI`: Giao diện Web Portal.
- `Security`: Tầng xác thực Spring Security.
- `Controller`: `MasterTenantAdminController` xử lý Master API.
- `Service`: `CompanyVerificationService` xử lý logic thẩm định.
- `MasterDB`: CSDL Master dùng chung toàn hệ thống.

### 6.2. Diễn giải chi tiết các bước

1. Tenant Admin điền thông tin -> `UI` gửi `POST /api/v1/master/tenants/{tenantId}/verify`.
2. `Controller` ủy quyền cho `Service.submitVerification`.
3. `Service` kiểm tra hồ sơ hiện tại trên `MasterDB`: Nếu đang PENDING -> Trả về 409 Conflict.
4. Nếu chưa có -> Tạo mới bản ghi `CompanyVerification` PENDING trong `MasterDB`. Trả về 202 Accepted.
5. Platform Admin xem xét và gửi đánh giá -> `UI` gửi `POST /api/v1/master/verifications/{id}/review`.
6. Nếu chấp thuận: `Service` cập nhật `CompanyVerification` VERIFIED và gán `TenantInfo.isVerified = true` trong `MasterDB`.
7. Trả về `VerificationResponse` kèm HTTP 200 OK.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **Application-design**. Kiến trúc Master Domain phân tầng Controller -> DTO -> Service -> Repository -> Entity -> Infrastructure.

### 7.1. Vai trò phần tử

| Phần tử | StereoType | Vai trò |
|---|---|---|
| `MasterTenantAdminController` | `<<Controller>>` | Controller tiếp nhận yêu cầu xác thực từ Master API. |
| `SubmitVerificationRequest` | `<<Request>>` | DTO chứa mã số thuế và giấy phép kinh doanh. |
| `ReviewVerificationRequest` | `<<Request>>` | DTO chứa kết quả duyệt (VERIFIED/REJECTED) & lý do. |
| `VerificationResponse` | `<<Response>>` | DTO phản hồi trạng thái xác thực. |
| `CompanyVerificationService` | `<<Service>>` | Interface nghiệp vụ xác thực doanh nghiệp. |
| `CompanyVerificationServiceImpl` | `<<Service>>` | Implementation thực thi cập nhật Master DB. |
| `CompanyVerificationRepository` | `<<Repository>>` | Repository quản lý bảng `company_verifications`. |
| `TenantInfoRepository` | `<<Repository>>` | Repository quản lý bảng `tenant_info`. |
| `CompanyVerification` | `<<Entity>>` | Thực thể lưu hồ sơ nộp xác thực. |
| `TenantInfo` | `<<Entity>>` | Thực thể lưu thông tin tổng quan của Tenant trên Master DB. |
| `MasterMySQLDB` | `<<Database>>` | Cơ sở dữ liệu Master của hệ thống SaaS Multi-Tenant. |

### 7.2. Quan hệ giữa các lớp

- `MasterTenantAdminController --> CompanyVerificationService`: Ủy quyền xử lý nghiệp vụ (`delegates >`).
- `MasterTenantAdminController ..> SubmitVerificationRequest`: Nhận hồ sơ (`consumes >`).
- `MasterTenantAdminController ..> ReviewVerificationRequest`: Nhận đánh giá (`consumes >`).
- `CompanyVerificationServiceImpl ..|> CompanyVerificationService`: Hiện thực hóa interface (`implements`).
- `CompanyVerificationServiceImpl --> CompanyVerificationRepository`: Quản lý hồ sơ xác thực (`manages verification >`).
- `CompanyVerificationServiceImpl --> TenantInfoRepository`: Cập nhật trạng thái tenant (`updates tenant status >`).
- `CompanyVerificationRepository --> MasterMySQLDB`: Lưu trữ dữ liệu (`persists to >`).
- `TenantInfoRepository --> MasterMySQLDB`: Lưu trữ dữ liệu (`persists to >`).
- `CompanyVerification "1" --> "1" TenantInfo`: Xác thực thông tin doanh nghiệp (`verifies tenant >`).

## 8. Quyết định kiến trúc và bảo mật

- **Master Domain Boundary:** Việc xác thực doanh nghiệp là nghiệp vụ mức SaaS Platform Administration, thao tác hoàn toàn trên **Master Database**, độc lập với CSDL riêng của từng Tenant.
- **Trust Badge:** Trạng thái `isVerified = true` làm cơ sở để hiển thị huy hiệu Doanh nghiệp đã xác thực trên cổng tuyển dụng Candidate.

## 9. Giả định

- Tài liệu đăng ký kinh doanh được lưu trữ trên Cloud Storage (S3/GCS) và chỉ gửi URL truy cập bảo mật về Backend.

## 10. Hướng dẫn Render sơ đồ

Khi có yêu cầu xuất ảnh PNG từ người dùng:
```powershell
pwsh .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 -InputPath docs/diagram/02-company-management/verify-company -Format Png -PngDpi 300
```

## 11. Trạng thái Review

`Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.
