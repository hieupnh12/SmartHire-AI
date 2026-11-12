# AUTH-05: Hồ sơ & Cài đặt tài khoản người dùng

## Mục đích chức năng
Cho phép người dùng xem và cập nhật thông tin cá nhân (họ tên, SĐT, tiêu đề hồ sơ, giới thiệu, ảnh đại diện tài khoản, liên kết mở rộng GitHub/LinkedIn/Portfolio/Website), đổi mật khẩu khi đã đăng nhập, hoặc xoá dữ liệu cá nhân ứng viên.

## Actor
- **Authenticated User** (Candidate / Recruiter / Admin — màn `/account` ứng viên chỉnh sửa qua `CandidateAccountPage`)

## Luồng hoạt động
1. Người dùng truy cập **Tài khoản** (`/account`).
2. Xem/chỉnh sửa thông tin cá nhân: `fullName`, `phone`, `headline`, `bio`, và nhóm liên kết mở rộng `links` (`github`, `linkedin`, `portfolio`, `website`).
3. Upload ảnh đại diện mới (`JPG`/`PNG`/`WEBP`, tối đa 2MB — resize phía client và lưu lên Cloudinary qua `FileStorageService.storeImage`), hoặc xoá ảnh đại diện hiện tại (`DELETE /api/v1/tenant/auth/profile/avatar`). Thay đổi đồng bộ ngay lên header ứng viên thông qua `useAuthStore`.
4. Hệ thống validate (React Hook Form + Zod ở FE, Bean Validation + chuẩn hoá SĐT & kiểm tra scheme `http://`/`https://` cho links ở BE).
5. Người dùng có thể đổi mật khẩu (nhập mật khẩu hiện tại, mật khẩu mới, xác nhận) nếu tài khoản có `hasPassword = true`.
6. Nếu có thay đổi SĐT, email hoặc quyền — ghi `audit_logs` nếu cần.

## Business Rules
- Email không tự ý đổi (hoặc nếu cho phép, phải xác thực OTP email mới).
- Ảnh avatar: JPG/PNG/WEBP, tối đa 2MB, lưu URL công khai trên Cloudinary.
- Liên kết mở rộng (`github`, `linkedin`, `portfolio`, `website`): tuỳ chọn, tối đa 512 ký tự mỗi liên kết, bắt buộc bắt đầu bằng `http://` hoặc `https://` khi nhập giá trị; lưu dạng JSON trong `candidates.links_json`.
- Mật khẩu mới phải khác mật khẩu cũ và đúng rule bảo mật (≥ 6 ký tự trên form tài khoản / ≥ 8 ký tự tuỳ luồng).
- Số điện thoại được chuẩn hoá (`+84...` → `0...`) và không được trùng với ứng viên khác (`409 PHONE_ALREADY_USED`).
- Ghi nhận `updated_at` trên hồ sơ.

## API liên quan
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/tenant/auth/profile` | Lấy profile đầy đủ (bao gồm `avatarUrl`, `links`, `hasPassword`) |
| PUT | `/api/v1/tenant/auth/profile` | Cập nhật `fullName`, `phone`, `headline`, `bio`, `links` |
| POST | `/api/v1/tenant/auth/profile/avatar` | Upload / thay ảnh đại diện tài khoản (`multipart/form-data`, `file`) |
| DELETE | `/api/v1/tenant/auth/profile/avatar` | Xoá ảnh đại diện tài khoản |
| DELETE | `/api/v1/tenant/auth/profile` | Xoá dữ liệu cá nhân ứng viên |
| POST | `/api/v1/tenant/auth/change-password` | Đổi mật khẩu |

## Database liên quan
- `users`, `candidates` (`avatar_url`, `links_json`, `phone`, `headline`, `bio`, `password_hash`, `full_name`)

## UI Mockup
- Màn `CandidateAccountPage` (`/account`): thẻ hồ sơ gồm khu vực tải/xoá ảnh đại diện, thông tin cá nhân, nhóm trường Liên kết hồ sơ mở rộng (GitHub, LinkedIn, Portfolio, Website), thẻ đổi mật khẩu, thẻ đồng bộ mobile app, và khu vực xoá dữ liệu cá nhân.

## Trạng thái
`Done`
