# TENANT-16 — Kích hoạt / Tạm khóa Doanh nghiệp (Activate / Suspend Tenant)

## Mục đích và phạm vi

Chức năng này mô tả quy trình Quản trị viên Nền tảng (Workspace Admin) thay đổi trạng thái hoạt động của một doanh nghiệp (Tenant) giữa `ACTIVE` (đang hoạt động) và `SUSPENDED` (tạm khóa).

Khác với quy trình cấp phát (Provisioning), thao tác này diễn ra trực tiếp trên **Master Database (PostgreSQL)**, đồng thời tác động trực tiếp lên hạ tầng đa khách hàng:
1. **Kiểm soát truy cập cấp nền tảng:** Khi tenant chuyển sang `SUSPENDED`, `TenantWebInterceptor` sẽ lập tức từ chối mọi request từ người dùng thuộc doanh nghiệp đó.
2. **Thu hồi tài nguyên kết nối (Eviction):** Hệ thống lập tức đóng và dọn sạch pool kết nối HikariCP của tenant trong `DynamicMultiTenantConnectionProvider` nhằm ngăn chặn các kết nối treo và giải phóng tài nguyên.

---

## Nguồn đã đối chiếu

- `AGENTS.md`, `DESIGN.md`
- `docs/architecture/OVERVIEW.md`, `docs/architecture/INFRA_CHECKLIST.md`
- `backend/src/main/java/com/smarthire/master/tenant/controller/MasterTenantController.java`
- `backend/src/main/java/com/smarthire/master/tenant/service/MasterTenantService.java`
- `backend/src/main/java/com/smarthire/domain/master/repository/TenantInfoRepository.java`
- `backend/src/main/java/com/smarthire/domain/master/entity/TenantInfo.java`
- `backend/src/main/java/com/smarthire/multitenancy/datasource/DynamicMultiTenantConnectionProvider.java`
- `backend/src/main/java/com/smarthire/multitenancy/interceptor/TenantWebInterceptor.java`
- `frontend/src/features/master/dashboard/pages/MasterAdminDashboardPage.tsx`
- `frontend/src/api/master/masterAdminApi.ts`

---

## Actor và thành phần tham gia

| Thành phần | Loại | Trách nhiệm |
|---|---|---|
| `Workspace Admin` | Actor | Người quản trị nền tảng có thẩm quyền `WORKSPACE_ADMIN`. |
| `Master Admin UI` | Boundary | Giao diện quản trị trung tâm, hiển thị danh sách tenant và nút chuyển trạng thái Tạm khóa / Mở khóa. |
| `Spring Security` | Control | Kiểm tra tính hợp lệ của JWT Bearer token và xác nhận quyền `WORKSPACE_ADMIN`. |
| `MasterTenantController` | Boundary | Tiếp nhận request `PATCH /api/v1/master/tenants/{id}/status`, trích xuất tham số và gọi service. |
| `MasterTenantService` | Control | Kiểm tra tính hợp lệ của trạng thái mục tiêu, thực thi logic đổi trạng thái và điều phối dọn dẹp pool kết nối. |
| `TenantInfoRepository` | Control / Repository | Thực thi câu lệnh atomic update có điều kiện trên bảng `tenants` trong Master DB. |
| `DynamicMultiTenantConnectionProvider` | Infrastructure | Quản lý vòng đời các HikariCP pool độc lập cho từng tenant; đóng và hủy pool khi tenant bị khóa. |
| `Master PostgreSQL` | Database | Cơ sở dữ liệu trung tâm lưu trữ bảng `tenants`. |

---

## Tiền điều kiện và hậu điều kiện

### Tiền điều kiện:
- Người dùng đã đăng nhập và được xác thực với quyền `WORKSPACE_ADMIN`.
- Tenant mục tiêu phải đang ở một trong hai trạng thái hoạt động: `ACTIVE` hoặc `SUSPENDED`.
- Không cho phép cập nhật trạng thái này khi tenant đang ở trạng thái `PROVISIONING` hoặc `FAILED` (các trạng thái này phải thông qua luồng cấp phát / retry).

### Hậu điều kiện khi thành công:
- Bản ghi `tenants` trong Master DB được cập nhật trạng thái mới (`ACTIVE` hoặc `SUSPENDED`) và mốc thời gian `updated_at`.
- Pool kết nối HikariCP của tenant được đóng và xóa khỏi bộ nhớ đệm của backend.
- Trả về mã HTTP `200 OK` kèm thông tin `TenantResponse` cập nhật.
- Trên giao diện UI, nhãn trạng thái và nút hành động chuyển đổi tương ứng (`Mở khóa` hoặc `Tạm khóa`).

### Hậu điều kiện khi thất bại:
- Không có quyền: trả về `401 Unauthorized` hoặc `403 Forbidden`.
- Tham số trạng thái không hợp lệ (khác `ACTIVE` hoặc `SUSPENDED`): trả về `400 Bad Request`.
- Tenant không tồn tại hoặc đang ở trạng thái `PROVISIONING`/`FAILED`: câu lệnh conditional update ảnh hưởng 0 dòng, hệ thống trả về `409 Conflict` (`INVALID_TENANT_STATE`).

---

## Giải thích sơ đồ

### Sequence Diagram

#### Diễn giải từng bước:

1. `Workspace Admin -> Master Admin UI`: Quản trị viên nhấn nút "Tạm khóa" (hoặc "Mở khóa") trên dòng của tenant tương ứng.
2. `Master Admin UI -> Spring Security`: UI gửi yêu cầu `PATCH /api/v1/master/tenants/{id}/status?status=SUSPENDED` kèm token JWT.
3. Nhánh `Unauthenticated or insufficient role`: Nếu thiếu token hoặc không có quyền `WORKSPACE_ADMIN`, Spring Security chặn và trả về `401/403`. UI hiển thị thông báo lỗi quyền truy cập.
4. Nhánh `Authorized Workspace Admin`: Spring Security chuyển tiếp request tới `MasterTenantController`.
5. `MasterTenantController -> MasterTenantService`: Gọi phương thức `updateTenantStatus(id, status)`.
6. Nhánh kiểm tra tham số: Nếu giá trị `status` không nằm trong tập hợp `{"ACTIVE", "SUSPENDED"}`, Service ném `BusinessException(400, "INVALID_STATUS")`, Controller trả về `400 Bad Request`.
7. `MasterTenantService -> TenantInfoRepository`: Gọi `changeOperationalStatus(id, status)`.
8. Repository thực thi câu lệnh SQL UPDATE nguyên tử có điều kiện:
   ```sql
   UPDATE tenants SET status = :status, updated_at = CURRENT_TIMESTAMP
   WHERE id = :id AND status IN ('ACTIVE', 'SUSPENDED');
   ```
9. Nhánh `Tenant not found or state not in ('ACTIVE', 'SUSPENDED')`: Nếu số dòng được cập nhật bằng 0 (do ID không tồn tại hoặc tenant đang là `PROVISIONING`/`FAILED`), Service ném ngoại lệ và Controller trả về `409 Conflict` (`INVALID_TENANT_STATE`).
10. Nhánh `Status updated successfully`: Nếu số dòng cập nhật là 1:
    - Service gọi `TenantInfoRepository.findById(id)` để lấy thông tin mới nhất của tenant.
    - Service gọi `DynamicMultiTenantConnectionProvider.evict(tenant.getCode())`.
    - `DynamicMultiTenantConnectionProvider` đóng `HikariDataSource` tương ứng của tenant này và gỡ khỏi map quản lý pool.
    - Service trả về đối tượng `TenantInfo`.
11. `MasterTenantController -> Master Admin UI`: Trả về HTTP `200 OK` bọc trong `ApiResponse<TenantResponse>`.
12. `Master Admin UI`: Cập nhật badge trạng thái trên bảng danh sách và hiển thị thông báo thành công.

---

### Class Diagram

#### Vai trò các thành phần:

- `MasterTenantRoute`: Conceptual REST route thể hiện endpoint HTTP tiếp nhận.
- `MasterTenantController`: REST Controller tiếp nhận request và mapping DTO response.
- `TenantResponse`: DTO an toàn trả về cho client, chỉ chứa các thông tin công khai (mã code, subdomain, dbName, status, thời gian tạo/cập nhật), không để lộ connection URL hay credentials.
- `MasterTenantService`: Chứa toàn bộ nghiệp vụ kiểm tra trạng thái và điều phối thay đổi.
- `TenantInfoRepository`: Cung cấp phương thức `changeOperationalStatus` để cập nhật trạng thái nguyên tử, chống race condition.
- `TenantInfo`: Thực thể quản lý tenant trong Master PostgreSQL.
- `DynamicMultiTenantConnectionProvider`: Cơ chế hạ tầng đa khách hàng, quản lý dynamic pool Hikari cho từng tenant.

#### Giải thích các đường nối:

| Nguồn -> Đích | Loại quan hệ | Ý nghĩa kỹ thuật |
|---|---|---|
| `MasterTenantRoute ..> MasterTenantController` | Dependency | Tuyến đường HTTP ánh xạ lời gọi tới Controller. |
| `MasterTenantController --> MasterTenantService` | Directed Association | Controller phụ thuộc và gọi Service xử lý nghiệp vụ. |
| `MasterTenantController ..> TenantResponse` | Dependency | Controller sinh đối tượng phản hồi DTO trả về cho client. |
| `MasterTenantService --> TenantInfoRepository` | Directed Association | Service gọi repository để thao tác Master DB. |
| `MasterTenantService --> DynamicMultiTenantConnectionProvider` | Directed Association | Service yêu cầu hạ tầng thu hồi (evict) pool kết nối của tenant. |
| `TenantInfoRepository --> TenantInfo` | Navigable Association | Repository thao tác và trả về thực thể `TenantInfo`. |
| `TenantInfoRepository --> MasterDB` | Directed Association | Dữ liệu được lưu trữ và cập nhật tại bảng `tenants` trong Master DB. |

---

## Quyết định kiến trúc & Bảo mật

1. **Bảo vệ ranh giới Tenant (Tenant Isolation Enforcement):** Trạng thái `SUSPENDED` có hiệu lực tức thì ở tầng gateway/interceptor (`TenantWebInterceptor`). Bất kỳ truy cập API nào mang `X-Tenant-ID` hoặc subdomain của tenant bị tạm khóa đều bị từ chối ngay lập tức trước khi chạm vào nghiệp vụ tuyển dụng.
2. **Atomic State Transition:** Sử dụng câu lệnh UPDATE có điều kiện `WHERE status IN ('ACTIVE', 'SUSPENDED')` trực tiếp trong database để đảm bảo không xảy ra race condition khi có nhiều quản trị viên cùng thao tác, hoặc thao tác trong lúc tiến trình cấp phát (Provisioning) chưa hoàn tất.
3. **Eviction của Connection Pool:** Khi một tenant bị khóa, việc ngắt kết nối vật lý ngay lập tức đảm bảo không còn kết nối ngầm nào tới MySQL database của tenant đó.

---

## Trạng thái review

**Source complete — awaiting rendering decision** (Mã nguồn PlantUML `.puml` và tài liệu `README.md` đã hoàn tất, không chứa title theo yêu cầu của người dùng).
