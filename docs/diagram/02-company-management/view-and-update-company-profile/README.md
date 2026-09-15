# COMPANY-01 — Xem và cập nhật thông tin công ty

- **Mã Feature:** `COMPANY` / `02-company-management`
- **Mã Function:** `view-and-update-company-profile`
- **Thư mục:** `docs/diagram/02-company-management/view-and-update-company-profile`
- **Trạng thái Review:** `Complete with assumptions`

---

## 1. Mục đích và phạm vi

Mô tả Tenant Admin xem và cập nhật hồ sơ thương hiệu của **một tenant đã tồn tại**: tên, slogan, website, địa chỉ, ngành nghề, mô tả, quy mô và logo. Đây không phải tạo tenant (`TENANT-16`) và không phải xác minh pháp lý (`COMPANY-05`).

Class diagram dùng góc nhìn **thiết kế ứng dụng** (Route → Controller → DTO → Service → Repository → Entity). Logo nằm ở object storage; Tenant DB chỉ lưu khóa đối tượng.

## 2. Nguồn đã đối chiếu

- `AGENTS.md`, `DESIGN.md`
- `docs/features/Authentication/Tenant-Onboarding.md`, `docs/features/Authentication/RBAC.md`
- `frontend/src/features/tenant/admin/workspace/pages/TenantAdminDashboardPage.tsx` (tab Profile & Branding)
- `TenantWebInterceptor`, `TenantContext`, `SecurityConfig`
- Tenant Flyway `V1__init_tenant_schema.sql`, `V2__product_backlog_schema.sql` (chưa có bảng `company_profiles`)
- Master entity `TenantInfo` (chỉ dùng làm ranh giới: use case này **không** ghi `tenants.name`)

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Tenant Admin | Người có `TENANT_ADMIN` hoặc `ADMIN` trong Tenant DB. |
| Company Workspace UI | Form xem/sửa hồ sơ và upload logo. |
| Spring Security | Kiểm JWT và role tại biên tin cậy. |
| TenantWebInterceptor | Đặt/xóa `TenantContext` theo header, subdomain và token. |
| CompanyProfileController | Validate DTO, gọi service, trả `ApiResponse`. |
| CompanyProfileService | Quy tắc cập nhật hồ sơ và thay logo. |
| Tenant DB | Một dòng `CompanyProfile` trong MySQL riêng của tenant. |
| Object Storage | Lưu bytes logo; không lưu trong database. |

## 4. Tiền điều kiện và hậu điều kiện

**Tiền điều kiện:** tenant `ACTIVE`; JWT hợp lệ; role `TENANT_ADMIN` hoặc `ADMIN`; `X-Tenant-ID` / subdomain / token cùng một tenant.

**Thành công:** hồ sơ trong Tenant DB được đọc hoặc cập nhật; logo mới có `logoObjectKey`; `TenantContext` được xóa.

**Thất bại:** `401`/`403` không đổi dữ liệu; `400` không ghi DB; context vẫn được xóa.

## 5. Luồng chính và luồng lỗi

1. GET hồ sơ; nếu chưa có dòng thì tạo mặc định từ tên registry.
2. PUT các trường văn bản sau Bean Validation.
3. POST logo (tùy chọn) sau khi kiểm MIME/size.

Lỗi: thiếu quyền, payload sai, file không phải ảnh hợp lệ.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

| Participant | Lý do có mặt |
|---|---|
| Tenant Admin | Khởi tạo xem/sửa. |
| Company Workspace UI | Gửi HTTP và hiển thị kết quả. |
| Spring Security | Chặn caller không đủ quyền trước controller. |
| TenantWebInterceptor | Bảo đảm mọi truy cập Tenant DB đi qua `TenantContext`. |
| CompanyProfileController | Biên REST. |
| CompanyProfileService | Nghiệp vụ hồ sơ/logo. |
| Tenant DB | Nguồn sự thật branding. |
| Object Storage | Chỉ tham gia nhánh logo. |

### 6.2. Diễn giải bước

**View**

1. Admin mở tab hồ sơ — trigger use case đọc.
2. UI gọi `GET /api/v1/tenant/company` — đọc phải qua API, không tin cache local.
3. Nhánh thiếu xác thực/role: `401`/`403`, không mở Tenant DB.
4. Nhánh được phép: Security chuyển interceptor.
5. Interceptor `setCurrentTenant` trước service.
6. Controller gọi `getProfile()`.
7. Service đọc singleton trong Tenant DB.
8. Nếu chưa có dòng: insert mặc định để GET luôn có representation, career page không 404.
9. Trả `200` + DTO; UI hiển thị; interceptor `clear()`.

**Update**

10. Admin sửa và lưu.
11. `PUT` cùng biên bảo mật.
12. Nhánh 401/403: không ghi.
13. Interceptor đặt context.
14. Controller validate: tên bắt buộc, URL/độ dài.
15. Payload sai: `400`, không `save`.
16. Payload đúng: `save` rồi `200`; UI xác nhận; `clear()`.

**Logo**

17. Admin chọn file.
18. `POST` multipart.
19. 401/403/400 tại cổng nếu không đủ quyền hoặc file bị từ chối sớm.
20. Service kiểm MIME/size (png/jpeg/webp, giới hạn kích thước).
21. File sai: `400 INVALID_LOGO`, không ghi object key.
22. File đúng: lưu storage, nhận key, cập nhật `logo_object_key`.
23. `200` + `logoUrl`; interceptor `clear()`.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **layered application-design** (`Routing & Boundary` → `Controller` → `Service` → `DTO` → `Repository` → `Domain Entity` → `Infrastructure`). Isolation qua `TenantContext` và database, không prefix `Tenant` trên mọi package.

### 7.1. Vai trò phần tử

| Phần tử | Loại | Vai trò |
|---|---|---|
| `CompanyProfileRoute` | `<<REST API>>` conceptual | Công khai ba endpoint của use case. |
| `CompanyProfileController` | conceptual controller | Biên HTTP; chưa có class Java. |
| `UpdateCompanyProfileRequest` | request DTO | Payload ghi; không chứa file. |
| `CompanyProfileResponse` | response DTO | Trả URL logo, không trả object key nội bộ nếu không cần. |
| `TenantWebInterceptor` / `TenantContext` | hiện có | Định tuyến Tenant DB. |
| `CompanyProfileService` | conceptual service | Đọc/ghi hồ sơ, thay logo. |
| `ObjectStoragePort` | conceptual port | Che vendor storage. |
| `CompanyProfile` | conceptual entity | Một hồ sơ / một Tenant DB; không có `tenantId`. |
| `CompanyProfileRepository` | conceptual repository | `findSingleton` / `save`. |
| Tenant MySQL | database | Sở hữu bảng thiết kế `company_profiles`. |

### 7.2. Quan hệ

| Nguồn → đích | Ký pháp | Loại và lý do |
|---|---|---|
| Route → Controller | `..>` | Dependency: route dùng controller, không sở hữu. |
| Controller → UpdateCompanyProfileRequest | `..>` | Dependency: DTO tham số. |
| Controller → CompanyProfileResponse | `..>` | Dependency: DTO kết quả. |
| Controller → Service | `-->` | Association: collaborator inject. |
| Interceptor → TenantContext | `..>` | Dependency: set/clear ThreadLocal. |
| Service → Repository | `-->` | Association: persist hồ sơ. |
| Service → ObjectStoragePort | `..>` | Dependency: chỉ khi đổi logo. |
| Service → UpdateCompanyProfileRequest | `..>` | Dependency: input. |
| Repository → CompanyProfile | `..>` | Dependency: quản lý kiểu entity. |
| Repository → Tenant DB | `-->` | Association tới store tenant. |
| Tenant DB → CompanyProfile | `*--` | Composition: entity chết theo database tenant. |

Không vẽ `TenantInfo`: use case không ghi Master.

## 8. Quyết định kiến trúc và bảo mật

- **Multi-tenant:** chỉ Tenant DB hiện tại; không query tenant khác.
- **Authorization:** `TENANT_ADMIN`/`ADMIN` tại Spring Security, cùng pattern `/api/v1/tenant/users/**`.
- **Transaction:** PUT một transaction tenant; upload logo: storage trước, DB sau — nếu DB lỗi, object mồ côi được dọn sau, không đánh dấu thành công.
- **Async:** không.
- **Privacy:** không log file bytes; không trả secret storage.
- **Audit:** chưa có writer; không suy diễn participant audit.

## 9. Giả định

- Bảng `company_profiles`, controller/service và object storage **chưa có** trong code; gắn `<<conceptual>>`.
- Tạo dòng mặc định khi GET trống để career page luôn đọc được hồ sơ.
- Không đồng bộ `tenants.name` trên Master.
- Role lấy từ `SecurityConfig` (`TENANT_ADMIN`, `ADMIN`), không dùng nhãn UI `HR_RECRUITER`.

## 10. Render và file được tạo

| File | Metadata |
|---|---|
| [class-diagram.png](class-diagram.png) | PNG, ít nhất 300 DPI |
| [sequence-diagram.png](sequence-diagram.png) | PNG, ít nhất 300 DPI |

Đã kiểm tra trực quan: chữ đọc được, không cắt khung chính. Không tạo SVG.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File ./.agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 `
  -InputPath docs/diagram/02-company-management/view-and-update-company-profile `
  -PlantUmlJar "$env:LOCALAPPDATA\PlantUML\plantuml-1.2026.7.jar" `
  -Format Png `
  -PngDpi 300
```

PlantUML 1.2026.7 (JAR ngoài repo). Script đã ghi và xác minh DPI PNG ≥ 300 cho cả hai chiều.

## 11. Trạng thái review

`Complete with assumptions` — nguồn và PNG 300 DPI đã xong; các phần `<<conceptual>>` vẫn ghi ở mục Giả định.
