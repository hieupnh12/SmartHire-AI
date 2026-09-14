# TENANT-16 — Public check active tenant

## Mục đích và phạm vi

Mô tả API công khai kiểm tra một code hoặc subdomain có đại diện cho tenant đang `ACTIVE` hay không. Đây là phép kiểm tra boolean phục vụ tenant discovery/login, không phải API đọc chi tiết tenant và không thay thế kiểm tra `requireActive` trước khi truy cập tenant database. Class diagram dùng góc nhìn thiết kế ứng dụng.

## Nguồn đối chiếu

- `docs/features/Authentication/Tenant-Onboarding.md`
- `SecurityConfig`, `MasterTenantController.checkTenantExists`
- `MasterTenantService.checkTenantExists`, `TenantInfoRepository`, `TenantInfo`
- `frontend/src/api/master/masterAdminApi.ts`

## Actor, điều kiện và kết quả

Actor là khách hoặc client chưa cần JWT. Input lấy từ path, được trim và lowercase. API trả `true` chỉ khi tìm được tenant theo code hoặc subdomain và trạng thái là `ACTIVE`; mọi trường hợp blank, không tồn tại, `SUSPENDED`, `FAILED`, `PROVISIONING` trả `false` trong envelope chuẩn.

## Luồng sequence

1. Client lấy code/subdomain và gọi endpoint public; Spring Security permit request.
2. Service kiểm tra blank, chuẩn hóa trim/lowercase.
3. Với input hợp lệ, repository tìm theo code; nếu không có mới tìm theo subdomain.
4. Nhánh tìm thấy `ACTIVE` trả `true`; nhánh thiếu hoặc không active trả `false`.
5. Controller luôn trả `200 ApiResponse<Boolean>` cho kết quả nghiệp vụ. UI dùng boolean để tiếp tục tenant login hoặc báo tenant không khả dụng.

Không có transaction ghi, async, retry hay `TenantContext`. Đây là master registry lookup; việc mở connection tenant sau đó vẫn phải gọi `TenantRegistryService.requireActive`.

## Thành phần class và quan hệ

- `TenantAvailabilityRoute ..> MasterTenantController`: dependency route conceptual tới controller.
- Controller association tới service và dependency tới `ApiResponse<Boolean>`.
- Service association tới repository để thực hiện lookup có thứ tự.
- Repository association tới entity và Master PostgreSQL để ánh xạ/read bảng `tenants`.

Không có inheritance, realization, aggregation hoặc composition. Không đưa UI thành class vì UI chỉ là boundary runtime và nhiều client khác nhau có thể gọi API.

## Bảo mật và riêng tư

- Endpoint public chỉ trả boolean, không trả tenant ID, DB URL, username, password hoặc metadata chi tiết.
- Cùng một kết quả `false` được dùng cho tenant thiếu và tenant không active, hạn chế lộ trạng thái vòng đời.
- Code hiện chưa có rate limit/audit riêng cho lookup; sơ đồ không tự giả định chúng tồn tại.

## Giả định và trạng thái

Tên “active tenant check” phản ánh chính xác implementation dù method hiện tên `checkTenantExists`.

**Review status:** `Complete`

## Kết quả render

- `class-diagram.png` và `sequence-diagram.png` đã được render, kiểm tra trực quan và không bị cắt nội dung.
- Script đã xác minh cả hai ảnh có metadata 300 DPI.
