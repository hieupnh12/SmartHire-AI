# PIPE-03 — Tạo và theo dõi Thư mời nhận việc (Job Offer)

- **Mã Feature:** `PIPE` / `10-recruitment-pipeline-management`
- **Mã Function:** `create-and-track-offer`
- **Thư mục:** `docs/diagram/10-recruitment-pipeline-management/create-and-track-offer`
- **Trạng thái Review:** `Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.

---

## 1. Mục đích và phạm vi

Cho phép Recruiter/HR tạo thư mời nhận việc (Job Offer) đính kèm thông tin mức lương, chức danh, ngày bắt đầu và ngày hết hạn phản hồi gửi cho ứng viên. Hệ thống tự động phát email chứa liên kết xem và phản hồi offer. Trạng thái phản hồi của ứng viên (Chấp nhận / Từ chối) được ghi nhận tự động và cập nhật trạng thái tương ứng trên quy trình tuyển dụng.

## 2. Nguồn đã đối chiếu

- Entity: `JobOffer`, `Application`, `OfferStatus`
- Repository: `JobOfferRepository`, `ApplicationRepository`
- Service & Controller: `JobOfferController`, `JobOfferService`
- Messaging: `EmailNotificationProducer`, `RabbitMQ`

## 3. Actor và thành phần

| Thành phần | Trách nhiệm |
|---|---|
| Recruiter / HR | Nhập thông tin offer và phát hành tới ứng viên. |
| Candidate | Xem thông tin thư mời và thực hiện Chấp nhận / Từ chối. |
| Offer Portal UI | Giao diện phát hành offer và cổng phản hồi của ứng viên. |
| Spring Security | Phân quyền truy cập API phát hành offer. |
| TenantWebInterceptor | Thiết lập `TenantContext` định tuyến Tenant DB. |
| JobOfferController | Tiếp nhận request `POST /offers` và `PATCH /offers/{id}/status`. |
| JobOfferService | Tạo offer, bắn email thông báo và cập nhật trạng thái application. |
| JobOfferRepository | Quản lý bảng `job_offers`. |
| ApplicationRepository | Quản lý bảng `applications`. |
| DedicatedTenantMySQL | CSDL riêng biệt của Tenant. |
| RabbitMQ | Broker đẩy email thông báo cho ứng viên. |

## 4. Tiền điều kiện và hậu điều kiện

- **Tiền điều kiện:** Tenant `ACTIVE`; Ứng viên đã đi tới vòng cuối (Offer Stage).
- **Thành công:** Tạo bản ghi `JobOffer` trạng thái `SENT`; Email thư mời gửi qua RabbitMQ; Khi Candidate đồng ý: `JobOffer.status` = `ACCEPTED`, `Application.status` = `OFFER_ACCEPTED`.
- **Thất bại:** `401`/`403` Access Error; `400 Bad Request` (Ứng viên không đúng giai đoạn hoặc offer đã quá hạn).

## 5. Luồng chính và lỗi

1. **Luồng tạo Offer:**
   - Recruiter nhập mức lương, ngày đi làm, ngày hết hạn -> Gửi `POST /api/v1/tenant/offers`.
   - Kiểm tra `Application` tồn tại và hợp lệ.
   - Tạo mới `JobOffer` trong trạng thái `SENT`.
   - Bắn tin nhắn qua `RabbitMQ` đẩy email thư mời cho Candidate.

2. **Luồng phản hồi Offer (Candidate):**
   - Candidate mở email click link -> Xem chi tiết offer và bấm Chấp nhận hoặc Từ chối.
   - Gửi `PATCH /api/v1/tenant/offers/{id}/status`.
   - Kiểm tra nếu offer đã quá hạn -> Trả về `400 Bad Request (OFFER_CLOSED)`.
   - Cập nhật `JobOffer.status` thành `ACCEPTED` hoặc `DECLINED`.
   - Nếu Chấp nhận: Đồng thời cập nhật `Application.status` = `OFFER_ACCEPTED`.

## 6. Sequence diagram

Nguồn: [`sequence-diagram.puml`](sequence-diagram.puml)

### 6.1. Vai trò participant

- `Recruiter`: Người tạo offer.
- `Candidate`: Ứng viên nhận offer.
- `UI`: Giao diện ứng dụng.
- `Security`: Spring Security authorization context.
- `Interceptor`: `TenantWebInterceptor` xử lý `TenantContext`.
- `Controller`: `JobOfferController` tiếp nhận API.
- `Service`: `JobOfferService` xử lý nghiệp vụ offer.
- `TenantDB`: CSDL riêng của Tenant.
- `RabbitMQ`: Message broker gửi email.

### 6.2. Diễn giải chi tiết các bước

1. Recruiter nhập thông tin -> `UI` gửi `POST /api/v1/tenant/offers`.
2. `Controller` gọi `Service.createOffer`.
3. `Service` tìm `Application` trong `TenantDB`.
4. `Service` lưu `JobOffer` mới vào `TenantDB` và gọi `RabbitMQ` gửi email. Trả về HTTP 201 Created.
5. Candidate phản hồi -> `UI` gửi `PATCH /api/v1/tenant/offers/{id}/status`.
6. `Service` kiểm tra `JobOffer` trong `TenantDB`. Nếu quá hạn -> Trả về 400 Bad Request.
7. `Service` cập nhật trạng thái `JobOffer`. Nếu Chấp nhận -> Cập nhật thêm trạng thái `Application` thành `OFFER_ACCEPTED`.
8. Trả về `OfferResponse` kèm HTTP 200 OK.

## 7. Class diagram

Nguồn: [`class-diagram.puml`](class-diagram.puml)

Viewpoint: **Application-design**. Kiến trúc phân tầng Controller -> DTO -> Service -> Repository -> Entity -> Infrastructure.

### 7.1. Vai trò phần tử

| Phần tử | StereoType | Vai trò |
|---|---|---|
| `JobOfferController` | `<<Controller>>` | Controller tiếp nhận request tạo và cập nhật offer. |
| `CreateOfferRequest` | `<<Request>>` | DTO chứa dữ liệu tạo offer (lương, vị trí, ngày đi làm). |
| `UpdateOfferStatusRequest` | `<<Request>>` | DTO chứa phản hồi của ứng viên (ACCEPTED/DECLINED). |
| `OfferResponse` | `<<Response>>` | DTO phản hồi thông tin thư mời. |
| `JobOfferService` | `<<Service>>` | Interface định nghĩa nghiệp vụ quản lý thư mời. |
| `JobOfferServiceImpl` | `<<Service>>` | Implementation thực thi cập nhật offer và application. |
| `JobOfferRepository` | `<<Repository>>` | Repository quản lý bảng `job_offers`. |
| `ApplicationRepository` | `<<Repository>>` | Repository quản lý bảng `applications`. |
| `JobOffer` | `<<Entity>>` | Thực thể thư mời nhận việc. |
| `OfferStatus` | `<<Enum>>` | Hằng số trạng thái thư mời (DRAFT, SENT, ACCEPTED, DECLINED, EXPIRED). |
| `EmailNotificationProducer` | `<<Messaging Port>>` | Port phát thông báo email qua RabbitMQ. |
| `DedicatedTenantMySQL` | `<<Database>>` | CSDL riêng của tenant. |

### 7.2. Quan hệ giữa các lớp

- `JobOfferController --> JobOfferService`: Ủy quyền xử lý nghiệp vụ (`delegates >`).
- `JobOfferController ..> CreateOfferRequest`: Nhận dữ liệu đầu vào (`consumes >`).
- `JobOfferController ..> UpdateOfferStatusRequest`: Nhận dữ liệu phản hồi (`consumes >`).
- `JobOfferServiceImpl ..|> JobOfferService`: Hiện thực hóa interface (`implements`).
- `JobOfferServiceImpl --> JobOfferRepository`: Quản lý thực thể thư mời (`manages offer >`).
- `JobOfferServiceImpl --> ApplicationRepository`: Cập nhật trạng thái ứng tuyển (`updates application >`).
- `JobOfferServiceImpl --> EmailNotificationProducer`: Phát sự kiện email (`sends offer notification >`).
- `JobOfferRepository --> DedicatedTenantMySQL`: Lưu trữ dữ liệu (`persists to >`).
- `JobOffer ..> OfferStatus`: Định kiểu trạng thái (`typed by >`).
- `JobOffer "1" --> "1" Application`: Liên kết với đơn ứng tuyển (`linked to >`).

## 8. Quyết định kiến trúc và bảo mật

- **Secured Offer Token:** Candidate phản hồi thư mời qua Token mã hóa một lần gửi trong Email, không yêu cầu Candidate phải đăng nhập tài khoản nếu chưa kích hoạt.
- **State Synchronization:** Chấp nhận Offer kích hoạt tự động việc cập nhật trạng thái Hồ sơ ứng tuyển lên giai đoạn thành công cao nhất (`OFFER_ACCEPTED`).

## 9. Giả định

- Offer chỉ được phát hành khi Hồ sơ ứng viên đã ở giai đoạn thích hợp trong Pipeline.

## 10. Hướng dẫn Render sơ đồ

Khi có yêu cầu xuất ảnh PNG từ người dùng:
```powershell
pwsh .agents/skills/enterprise-uml-diagram/scripts/render-diagrams.ps1 -InputPath docs/diagram/10-recruitment-pipeline-management/create-and-track-offer -Format Png -PngDpi 300
```

## 11. Trạng thái Review

`Complete` — sơ đồ nguồn và hình ảnh PNG (DPI 300) đã được hoàn tạo.
