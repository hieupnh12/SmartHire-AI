# AUTH-03 — Đăng nhập Ứng viên qua Google OAuth & JIT Provisioning (Candidate Google Authentication)

## Mục đích và phạm vi

Chức năng này mô tả quy trình xác thực 1-click dành riêng cho ứng viên (`CANDIDATE`) thông qua Google OAuth ID Token kết hợp cơ chế **Just-In-Time (JIT) Provisioning** trong kiến trúc SaaS Multi-Tenant.
Ứng viên không cần phải trải qua biểu mẫu đăng ký phức tạp. Khi đăng nhập vào cổng tuyển dụng của một doanh nghiệp bất kỳ, hệ thống sẽ tự động khởi tạo dữ liệu ứng viên trực tiếp trong **cơ sở dữ liệu MySQL riêng biệt của Tenant** đó, đảm bảo dữ liệu ứng viên hoàn toàn thuộc quyền sở hữu của doanh nghiệp mà không làm rò rỉ sang doanh nghiệp khác.

Sơ đồ tuân thủ quy chuẩn tài liệu Software Design Document (SDD), tập trung vào chuỗi ứng dụng và luồng xác thực chữ ký token.

---

## Nguồn đã đối chiếu

- `AGENTS.md`, `DESIGN.md`
- `docs/features/Authentication/Google-OAuth.md` (`AUTH-03`)
- Entity `User`, `OauthAccount`, `UserProfile`
- Migration `V1__init_tenant_schema.sql` (`users`, `oauth_accounts`), `V2__product_backlog_schema.sql` (`user_profiles`)
- Google Identity Services JWKS verification specification

---

## Actor và thành phần tham gia

- **Candidate (Ứng viên):** Người tìm việc tham gia nộp hồ sơ hoặc phỏng vấn AI.
- **Candidate Portal UI (Frontend SPA):** Tích hợp Google Sign-In SDK, gửi token kèm header `X-Tenant-ID`.
- **Security & Gateway (`TenantWebInterceptor`):** Phân giải định danh doanh nghiệp và nạp `TenantContext`.
- **`CandidateAuthController`:** Endpoint `/api/v1/tenant/auth/google`.
- **`CandidateAuthService`:** Quản lý logic điều phối: gọi verifier, kích hoạt JIT Provisioning, sinh JWT và lưu session.
- **`GoogleTokenVerifierService`:** Giao tiếp với Google OAuth Servers để xác thực chữ ký số bằng Google Public Keys (JWKS).
- **`Dedicated Tenant MySQL`:** Lưu trữ bảng `users`, `oauth_accounts` và `user_profiles` của tenant.
- **`Redis Cache`:** Quản lý phiên đăng nhập Refresh Token của ứng viên.

---

## Tiền điều kiện và hậu điều kiện

### Tiền điều kiện:
- Tenant đã tồn tại và ở trạng thái `ACTIVE`.
- Ứng viên đã đăng nhập thành công với Google trên trình duyệt và nhận được `idToken`.
- Request đính kèm header `X-Tenant-ID`.

### Hậu điều kiện khi thành công:
- Nếu là ứng viên mới: Tạo bản ghi `User` (`role: CANDIDATE`, `password_hash = NULL`), liên kết `OauthAccount` và khởi tạo `UserProfile` với avatar từ Google.
- Cấp cặp JWT Access Token (30 phút) và Refresh Token (7 ngày).
- Refresh Token lưu vào Redis theo key `tenant:{tenantId}:refresh:{userId}`.
- Ứng viên được điều hướng vào cổng làm bài test / phỏng vấn AI.

### Hậu điều kiện khi thất bại:
- Token giả mạo, hết hạn hoặc email chưa được verify: Trả về HTTP `401 Unauthorized`.

---

## Luồng hoạt động tuần tự (Sequence Walkthrough)

1. **Bước 1-3:** Ứng viên nhấn nút "Đăng nhập bằng Google". UI nhận `idToken` và gửi `POST /api/v1/tenant/auth/google` kèm header `X-Tenant-ID`.
2. **Bước 4-5:** Gateway phân giải Tenant ID, thiết lập `TenantContext` và chuyển tiếp request tới `CandidateAuthController`.
3. **Bước 6-9:** Controller gọi `CandidateAuthService`, service ủy quyền cho `GoogleTokenVerifierService` kiểm tra tính hợp lệ của token với Google JWKS. Nhận về payload chứa `email`, `name`, `sub`, `pictureUrl`.
4. **Bước 10-12:** Nếu token không hợp lệ hoặc email chưa verify, từ chối với HTTP `401 Unauthorized`.
5. **Bước 13-23 (JIT Provisioning):** Nếu token hợp lệ, truy vấn email trong Tenant DB. Nếu chưa tồn tại, tự động tạo mới `User`, `OauthAccount` và `UserProfile` trong cơ sở dữ liệu riêng của Tenant.
6. **Bước 24-27:** Sinh cặp token JWT, lưu Refresh Token vào Redis Cache.
7. **Bước 28-31:** Trả về HTTP `200 OK` kèm token và profile, UI lưu token và điều hướng ứng viên vào quy trình phỏng vấn.

---

## Chi tiết Class Diagram

### Vai trò các thành phần

| Thành phần | Loại | Vai trò |
|---|---|---|
| `CandidateAuthRoute` | `<<REST API>>` conceptual | Định tuyến API đăng nhập ứng viên qua Google. |
| `CandidateAuthController` | `<<Controller>>` | Tiếp nhận request và điều phối xác thực. |
| `GoogleLoginRequest` | `<<Request>>` | DTO chứa Google ID Token. |
| `CandidateLoginResponse` | `<<Response>>` | DTO trả về cặp token và hồ sơ ứng viên. |
| `CandidateProfileResponse` | `<<Response>>` | DTO tóm tắt thông tin ứng viên (`id`, `email`, `fullName`, `avatarUrl`). |
| `GooglePayload` | `<<Value Object>>` | Đối tượng mang dữ liệu đã xác thực từ Google JWKS. |
| `CandidateAuthService` / `Impl` | `<<Service>>` | Quản lý quy trình xác thực và cơ chế JIT Provisioning. |
| `GoogleTokenVerifierService` | `<<External Port>>` | Giao tiếp kiểm tra tính hợp lệ của token với Google. |
| `UserRepository` | `<<Repository>>` | Thao tác trên bảng `users` của Tenant DB. |
| `OauthAccountRepository` | `<<Repository>>` | Thao tác trên bảng `oauth_accounts` của Tenant DB. |
| `UserProfileRepository` | `<<Repository>>` | Thao tác trên bảng `user_profiles` của Tenant DB. |
| `DedicatedTenantMySQL` | `<<Database>>` | Cơ sở dữ liệu riêng biệt của doanh nghiệp. |

### Giải thích các đường nối UML

| Nguồn → đích | Ký pháp | Loại quan hệ và lý do sử dụng |
|---|---|---|
| `CandidateAuthRoute → CandidateAuthController` | `..>` | **Dependency**: Route ánh xạ tới Controller. |
| `CandidateAuthController → GoogleLoginRequest` | `..>` | **Dependency**: Controller nhận DTO request. |
| `CandidateAuthController → CandidateAuthService` | `-->` | **Directed association**: Controller gọi Service xử lý. |
| `CandidateAuthController → CandidateLoginResponse` | `..>` | **Dependency**: Controller trả về DTO response. |
| `CandidateAuthService <\|.. CandidateAuthServiceImpl` | `<\|..` | **Realization**: Lớp triển khai thực hiện Interface Service. |
| `CandidateLoginResponse → CandidateProfileResponse` | `*--` | **Composition**: `CandidateProfileResponse` cấu thành trong `CandidateLoginResponse`. |
| `CandidateAuthServiceImpl → GoogleTokenVerifierService` | `-->` | **Directed association**: Service gọi bộ kiểm tra token Google. |
| `CandidateAuthServiceImpl → UserRepository` | `-->` | **Directed association**: Tạo hoặc truy vấn User. |
| `CandidateAuthServiceImpl → OauthAccountRepository` | `-->` | **Directed association**: Tạo liên kết OAuth Account. |
| `CandidateAuthServiceImpl → UserProfileRepository` | `-->` | **Directed association**: Tạo hồ sơ Profile ứng viên. |
| `OauthAccount → User` | `*--` | **Composition**: OauthAccount thuộc quyền sở hữu của 1 User. |
| `UserProfile → User` | `*--` | **Composition**: UserProfile thuộc quyền sở hữu của 1 User. |

---

## Quyết định kiến trúc & Bảo mật

1. **Bảo mật Multi-Tenant cho ứng viên:** Dữ liệu ứng viên khi ứng tuyển vào Công ty A sẽ được lưu vào Database của Công ty A; ứng tuyển vào Công ty B sẽ được lưu vào Database của Công ty B. Hoàn toàn không chia sẻ bảng người dùng chung.
2. **Loại bỏ mật khẩu cho Candidate:** Trường `password_hash` được để `NULL`, đảm bảo tài khoản ứng viên không bị tấn công dò mật khẩu (Brute-Force).
3. **Xác thực mã nguồn gốc:** Không dùng Client ID bí mật ở backend cho flow này, chỉ dùng Public JWKS từ Google để xác thực chữ ký số, tuân thủ kiến trúc OAuth 2.0 / OIDC chuẩn mực.

---

## Render và file được tạo

- `class-diagram.puml`: Mã nguồn PlantUML Class Diagram
- `sequence-diagram.puml`: Mã nguồn PlantUML Sequence Diagram
- `class-diagram.png`: Ảnh PNG độ phân giải cao 300 DPI (chuẩn SDD đồ án tốt nghiệp)
- `sequence-diagram.png`: Ảnh PNG độ phân giải cao 300 DPI (chuẩn SDD đồ án tốt nghiệp)

---

## Trạng thái review

**Complete** — Đã hoàn tất mã nguồn, tài liệu SDD chi tiết và render toàn bộ ảnh PNG 300 DPI verified.
