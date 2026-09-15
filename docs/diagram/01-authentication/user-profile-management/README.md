# AUTH-05 — Quản lý Hồ sơ Người dùng & Tải lên Avatar (User Profile Management)

## Mục đích và phạm vi

Chức năng này mô tả quy trình xem, chỉnh sửa thông tin hồ sơ cá nhân và tải lên ảnh đại diện (avatar) của người dùng trong hệ thống SmartHire-AI (áp dụng cho cả ứng viên `CANDIDATE` và nhân sự nội bộ `RECRUITER`, `ADMIN`).
Đặc biệt, do hệ thống định hướng ứng viên đăng nhập 1-click qua Google OAuth:
1. Tài khoản Google không có mật khẩu nội bộ (`password_hash = NULL`), do đó giao diện hồ sơ **ẩn phần đổi mật khẩu** đối với tài khoản liên kết Google (`isGoogleAccount = true`).
2. Thông tin nhạy cảm định danh như `email` và `role` được bảo vệ tuyệt đối: không được phép thay đổi thông qua API cập nhật profile thông thường.

Class diagram sử dụng **góc nhìn thiết kế ứng dụng (application-design view)**, phân định rõ `Route → Controller → Request/Response DTO → Service → Repository → Entity` và tầng lưu trữ dữ liệu. Sequence diagram sử dụng `hide footbox`, phân đoạn rõ ràng hai luồng (Cập nhật Profile & Tải ảnh Avatar) với các thanh kích hoạt `activate/deactivate` chi tiết.

---

## Nguồn đã đối chiếu

- `AGENTS.md`, `DESIGN.md`
- `docs/features/Authentication/User-Profile.md` (`AUTH-05`)
- `docs/features/Authentication/Google-OAuth.md` (`AUTH-03`)
- Entity `User`, `UserProfile`
- Migration `V1__init_tenant_schema.sql`, `V2__product_backlog_schema.sql` (bảng `user_profiles`)

---

## Actor và thành phần tham gia

- **User (Candidate / Recruiter / Admin):** Người dùng đã xác thực trong không gian tenant.
- **User Profile UI (Portal Frontend SPA):** Giao diện quản lý hồ sơ cá nhân và tài khoản.
- **Security & Gateway (`TenantWebInterceptor` / `JwtAuthenticationFilter`):** Phân giải định danh Tenant, xác minh tính hợp lệ của Access Token và trích xuất `userId`.
- **`UserProfileController`:** Tiếp nhận request REST tại `/api/v1/tenant/users/me` và `/api/v1/tenant/users/me/avatar`.
- **`UserProfileService`:** Xử lý nghiệp vụ cập nhật thông tin cá nhân, kiểm tra ràng buộc không đổi email/role, kiểm tra loại tài khoản và ủy thác tải ảnh.
- **`FileStorageService`:** Thành phần lưu trữ tệp (S3 / Google Cloud Storage / MinIO).
- **`Dedicated Tenant MySQL`:** Cơ sở dữ liệu riêng của tenant, cập nhật bảng `users` (`full_name`) và bảng `user_profiles` (`phone`, `bio`, `headline`, `avatar_url`, `links_json`).

---

## Tiền điều kiện và hậu điều kiện

### Tiền điều kiện:
- Người dùng đã đăng nhập và sở hữu Access Token hợp lệ.
- Header request có đầy đủ `X-Tenant-ID` và `Authorization: Bearer <User_JWT>`.

### Hậu điều kiện khi thành công:
- **Cập nhật Profile:** Bảng `users` cập nhật `full_name`; bảng `user_profiles` cập nhật các trường `phone`, `bio`, `headline`, `links_json`. Trả về `UserProfileResponse` kèm cờ `isGoogleAccount` (xác định xem người dùng có cần/được quyền đổi mật khẩu hay không).
- **Upload Avatar:** Tệp ảnh hợp lệ (< 5MB, JPG/PNG) được lưu trữ trên Object Storage; đường dẫn `avatar_url` được cập nhật vào bảng `user_profiles`.

### Hậu điều kiện khi thất bại:
- Token không hợp lệ hoặc hết hạn: Trả về HTTP `401 Unauthorized`.
- Tệp ảnh sai định dạng hoặc quá kích thước: Trả về HTTP `400 Bad Request`.
- Cố tình sửa email hoặc role: Bị bỏ qua hoặc từ chối tại tầng validation.

---

## Luồng hoạt động tuần tự (Sequence Walkthrough)

### 1. Luồng Cập nhật Thông tin Hồ sơ (Update Profile)
1. **Bước 1-2:** Người dùng chỉnh sửa các trường họ tên, số điện thoại, bio, headline, liên kết mạng xã hội và nhấn "Lưu thay đổi". UI gửi `PUT /api/v1/tenant/users/me` kèm JWT và `X-Tenant-ID`.
2. **Bước 3-5:** Gateway phân giải `TenantContext`, xác thực JWT. Nếu token không hợp lệ, trả về HTTP `401 Unauthorized`.
3. **Bước 6-7:** Gateway chuyển tiếp request tới `UserProfileController`, controller gọi `UserProfileService.updateProfile(userId, request)`.
4. **Bước 8-12:** Service truy vấn thực thể `User` và `UserProfile` từ `Dedicated Tenant MySQL`. Thực hiện cập nhật các trường được phép (không cho sửa `email`, `role`), sau đó lưu thay đổi vào DB.
5. **Bước 13-16:** Service kiểm tra `user.getPasswordHash() == null` để thiết lập cờ `isGoogleAccount = true`, đóng gói DTO `UserProfileResponse`, trả về HTTP `200 OK` cho Frontend hiển thị.

### 2. Luồng Tải lên Ảnh Đại diện (Upload Avatar)
1. **Bước 17-18:** Người dùng chọn tệp ảnh mới trên máy và nhấn upload. UI gửi request `POST /api/v1/tenant/users/me/avatar` (dạng `multipart/form-data`).
2. **Bước 19-21:** Gateway xác thực và chuyển tiếp request tới `UserProfileController`, gọi `UserProfileService.uploadAvatar()`.
3. **Bước 22-25:** Service kiểm tra MIME type (chỉ nhận JPEG/PNG) và kích thước tệp ($\le$ 5MB). Nếu sai quy định, ném ngoại lệ `InvalidFileException`, trả về HTTP `400 Bad Request`.
4. **Bước 26-29:** Tệp hợp lệ được đưa sang `FileStorageService` lưu vào Object Storage theo đường dẫn cô lập theo tenant: `tenant/{id}/avatars/{userId}_{timestamp}.png`. Service cập nhật URL trả về vào cột `avatar_url` của bảng `user_profiles`.
5. **Bước 30-32:** Trả về `AvatarUploadResponse` với mã HTTP `200 OK`. UI hiển thị ảnh đại diện mới.

---

## Chi tiết Class Diagram

### Vai trò các thành phần

| Thành phần | Loại | Vai trò |
|---|---|---|
| `UserProfileRoute` | `<<REST API>>` conceptual | Khai báo các endpoint xem/cập nhật hồ sơ và upload avatar. |
| `UserProfileController` | `<<Controller>>` | Tiếp nhận và điều phối HTTP request liên quan tới profile người dùng. |
| `UpdateProfileRequest` | `<<Request>>` | DTO chứa thông tin cập nhật (`fullName`, `phone`, `bio`, `headline`, `linksJson`). |
| `UserProfileResponse` | `<<Response>>` | DTO trả về hồ sơ hoàn chỉnh, kèm cờ `isGoogleAccount` thông minh. |
| `AvatarUploadResponse` | `<<Response>>` | DTO thông báo kết quả upload avatar thành công. |
| `UserProfileService` / `Impl` | `<<Service>>` | Quản lý nghiệp vụ đọc/ghi profile, cập nhật thông tin và ủy thác upload. |
| `FileStorageService` | `<<Infrastructure Service>>` | Giao diện trừu tượng hóa việc lưu trữ tệp lên Cloud Storage (S3 / GCS). |
| `UserRepository` | `<<Repository>>` | Thao tác JPA trên bảng `users`. |
| `UserProfileRepository` | `<<Repository>>` | Thao tác JPA trên bảng `user_profiles`. |
| `User` | `<<Entity>>` | Thực thể người dùng tenant. |
| `UserProfile` | `<<Entity>>` | Thực thể thông tin chi tiết hồ sơ người dùng. |
| `DedicatedTenantMySQL` | `<<Database>>` | Cơ sở dữ liệu MySQL riêng biệt của tenant. |
| `ObjectStorageService` | `<<Storage>>` | Dịch vụ lưu trữ media đám mây (S3/GCS). |

### Giải thích các đường nối UML

| Nguồn → đích | Ký pháp | Loại quan hệ và lý do sử dụng |
|---|---|---|
| `UserProfileRoute → UserProfileController` | `..>` | **Dependency**: Route ánh xạ tới Controller tiếp nhận. |
| `UserProfileController → UpdateProfileRequest` | `..>` | **Dependency**: Controller nhận DTO request cập nhật. |
| `UserProfileController → UserProfileService` | `-->` | **Directed association**: Controller gọi Service xử lý. |
| `UserProfileController → UserProfileResponse` | `..>` | **Dependency**: Controller trả về DTO hồ sơ người dùng. |
| `UserProfileController → AvatarUploadResponse` | `..>` | **Dependency**: Controller trả về DTO kết quả upload avatar. |
| `UserProfileServiceImpl ..|> UserProfileService` | `<\|..` | **Realization**: Lớp triển khai hiện thực hóa Interface service. |
| `UserProfileServiceImpl → UserRepository` | `-->` | **Directed association**: Service tiêm và truy vấn UserRepository. |
| `UserProfileServiceImpl → UserProfileRepository` | `-->` | **Directed association**: Service tiêm và thao tác UserProfileRepository. |
| `UserProfileServiceImpl → FileStorageService` | `-->` | **Directed association**: Service ủy thác việc lưu trữ file cho FileStorageService. |
| `UserProfile → User` | `*--` | **Composition**: UserProfile phụ thuộc vòng đời và gắn chặt với User. |
| `UserRepository → User` | `-->` | **Navigable association**: Quản lý thực thể User. |
| `UserProfileRepository → UserProfile` | `-->` | **Navigable association**: Quản lý thực thể UserProfile. |
| `FileStorageService → ObjectStorageService` | `-->` | **Directed association**: Giao tiếp lưu trữ media vào Cloud Object Storage. |

---

## Quyết định kiến trúc & Bảo mật

1. **Phù hợp với Candidate dùng Google OAuth:** Do Candidate đăng nhập bằng Google không có mật khẩu, DTO phản hồi trả về cờ `isGoogleAccount = (password_hash == null)`. Frontend dựa vào cờ này để ẩn form "Đổi mật khẩu", tránh gây hiểu lầm cho người dùng.
2. **Bảo vệ toàn vẹn danh tính:** Tuyệt đối không cho phép đổi `email` hoặc `role` qua endpoint này để tránh leo thang đặc quyền (Privilege Escalation) hoặc sai lệch định danh.
3. **Cô lập lưu trữ Avatar:** Đường dẫn lưu trữ trên Cloud Storage được phân tách theo `tenant/{id}/avatars/` để đảm bảo tuân thủ kiến trúc cách ly dữ liệu giữa các doanh nghiệp.

---

## Render và file được tạo

- `class-diagram.puml`: Mã nguồn PlantUML Class Diagram
- `sequence-diagram.puml`: Mã nguồn PlantUML Sequence Diagram
- `class-diagram.png`: Ảnh PNG độ phân giải cao 300 DPI (đạt chuẩn in ấn/báo cáo đồ án tốt nghiệp)
- `sequence-diagram.png`: Ảnh PNG độ phân giải cao 300 DPI (đạt chuẩn in ấn/báo cáo đồ án tốt nghiệp)

---

## Trạng thái review

**Complete** — Mã nguồn PlantUML, tài liệu giải thích chi tiết và toàn bộ ảnh PNG (300 DPI verified, không xuất SVG) đã được biên dịch thành công, kiểm tra trực quan đạt chuẩn đồ án tốt nghiệp.
