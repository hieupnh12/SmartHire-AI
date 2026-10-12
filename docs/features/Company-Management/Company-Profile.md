# Xem và cập nhật hồ sơ công ty

**Epic:** Company Management  
**Trạng thái:** `Doing`  
**Code ID:** `COMPANY-01`

## Mục đích chức năng

Cho phép Tenant Admin xem và cập nhật thông tin thương hiệu, đồng thời quản lý danh mục phòng ban và địa điểm công ty dùng khi tạo job. HR/Recruiter được đọc danh mục để chọn trên form job.

## Actor

- Tenant Admin / ADMIN: xem và sửa
- HR / Recruiter: chỉ xem
- Candidate: không truy cập API này

## Luồng hoạt động

1. Admin mở `/tenant/admin/company`.
2. FE gọi `GET /api/v1/tenant/company/profile` (kèm JWT + `X-Tenant-ID`).
3. BE đọc `TenantContext` → `tenants` trên Master DB → trả `CompanyProfileResponse`.
4. Admin chỉnh sửa và lưu → `PUT /api/v1/tenant/company/profile`.
5. BE validate URL/độ dài, cập nhật bảng `tenants` trong `masterTransactionManager`, trả hồ sơ mới.
6. Admin thêm/xóa phòng ban và địa điểm rồi lưu qua `PUT /api/v1/tenant/company/directory`; recruiter đọc qua `GET` để chọn khi tạo/sửa job.

## Business Rules

- Hồ sơ thương hiệu lưu ở **Master DB** bảng `tenants`, không lưu ở Tenant DB.
- Không cho tenant tự đổi `code`, `subdomain`, thông tin DB, hoặc cờ `verified`.
- `GET` cho `TENANT_ADMIN`, `ADMIN`, `HR`, `RECRUITER`.
- `PUT` chỉ cho `TENANT_ADMIN`, `ADMIN`.
- `companyName` bắt buộc; `website`/`logoUrl` trống hoặc phải bắt đầu bằng `http://` / `https://`.
- Logo chỉ nhận URL CDN, không upload file trong sprint này.
- Danh mục nằm trong tenant DB, loại `DEPARTMENT`/`LOCATION`, không cho trùng tên không phân biệt hoa thường ở tầng service.

## API liên quan

| Method | Path | Quyền |
|---|---|---|
| GET | `/api/v1/tenant/company/profile` | `TENANT_ADMIN`, `ADMIN`, `HR`, `RECRUITER` |
| PUT | `/api/v1/tenant/company/profile` | `TENANT_ADMIN`, `ADMIN` |
| GET | `/api/v1/tenant/company/directory` | `TENANT_ADMIN`, `ADMIN`, `HR`, `RECRUITER`, `STAFF` |
| PUT | `/api/v1/tenant/company/directory` | `TENANT_ADMIN`, `ADMIN` |

## Database liên quan

- Master: `tenants` (`name`, `logo_url`, `website`, `address`, `industry`, `company_size`, `description`, `is_verified`)
- Migration: `backend/src/main/resources/db/migration/master/V4__company_profile_fields.sql`
- Tenant: `company_directory_entries`; migration V45 backfill dữ liệu phòng ban/địa điểm đang dùng từ `jobs`.

## UI mockup

- Trang RoleShell: `/tenant/admin/company`
- Nav: `nav.company`
- Icons: `Building2`, `Globe`, `MapPin`, `BadgeCheck` — xem `DESIGN.md`

## Phụ thuộc

AUTH-02, AUTH-04, Tenant Onboarding

## UML

- `docs/diagram/02-company-management/view-and-update-company-profile/`
