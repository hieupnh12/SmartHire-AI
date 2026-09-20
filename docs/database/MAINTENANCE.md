# Quy trình đồng bộ tài liệu Database & ERD

> Trở về [Database Design & ERD](README.md)

Tài liệu database trong thư mục này **phải luôn khớp với code**. File này định nghĩa khi nào phải cập nhật,
cập nhật cái gì, và cách kiểm chứng.

Quy tắc cũng được nhắc lại ở [`AGENTS.md`](../../AGENTS.md) mục 12 và
[`.cursor/rules/database-docs-sync.mdc`](../../.cursor/rules/database-docs-sync.mdc) để AI tự áp dụng.

---

## 1. Khi nào bắt buộc cập nhật

Cập nhật là **bắt buộc**, không phải tuỳ chọn, khi task chạm vào bất kỳ file nào sau đây:

| Thay đổi | File bị chạm |
|---|---|
| Thêm / sửa migration | `backend/src/main/resources/db/migration/master/**` hoặc `tenant/**` |
| Thêm / sửa / xoá entity | `backend/src/main/java/com/smarthire/domain/**/entity/**` |
| Thêm / sửa enum trạng thái | `backend/src/main/java/com/smarthire/domain/enums/**` |
| Đổi cấu hình persistence | `config/MasterJpaConfig.java`, `config/MultiTenantJpaConfig.java` |
| Đổi cơ chế multi-tenant | `backend/src/main/java/com/smarthire/multitenancy/**` |
| Đổi datasource / Flyway | `backend/src/main/resources/application.yml` |

Sửa repository, service, controller hay DTO **không** kích hoạt quy trình này, trừ khi chúng làm đổi
ràng buộc nghiệp vụ đã ghi ở [mục 8.4](README.md#84-quy-tắc-nghiệp-vụ-mà-database-không-bảo-vệ-được).

---

## 2. Bảng ánh xạ: thay đổi nào sửa mục nào

| Loại thay đổi | Mục phải sửa trong `README.md` | File dictionary |
|---|---|---|
| **Thêm bảng mới** | §2 số bảng · §3 Entity List · §4 ERD của nhóm tương ứng · §5 Entity Description · §7 Relationships · §10 lịch sử migration | Thêm mục bảng mới |
| **Xoá bảng** | Như trên, xoá khỏi mọi mục | Xoá mục bảng |
| **Thêm / xoá cột** | §5 nếu là thuộc tính then chốt · §8 nếu ảnh hưởng ràng buộc | **Luôn luôn** sửa |
| **Thêm / xoá khoá ngoại** | §4 ERD · §7.2 bảng FK · §7.3 nếu cột trở thành/thôi là `ref*` | Sửa cột `Khoá` |
| **Thêm / xoá UNIQUE** | §8.1 hoặc §8.2 · §4 ERD nếu đổi lực lượng quan hệ | Sửa cột `Khoá` |
| **Thêm / xoá index** | §9.1 | Sửa cột `Khoá` sang `IDX` |
| **Đổi nullable** | §7 nếu là FK (đổi lực lượng) · §4 ERD | **Luôn luôn** sửa cột `Null` |
| **Thêm / sửa enum** | §3.3 bảng enum · §8.3 máy trạng thái nếu là enum trạng thái | Sửa cột mô tả |
| **Đổi kiến trúc multi-tenant** | §1 toàn bộ · §9.3 bảo mật | — |
| **Thêm migration bất kỳ** | §10.2 hoặc §10.3 · header "phiên bản schema" ở đầu README | — |

Ngoài ra, mọi thay đổi đều phải cập nhật **bảng thống kê ở đầu** `README.md`: tổng số bảng, số entity,
số khoá ngoại, số ràng buộc unique, số file migration, phiên bản schema.

---

## 3. Checklist thực thi

Chạy theo đúng thứ tự này sau khi sửa schema hoặc entity:

- [ ] **Đọc SQL trước.** Migration là nguồn sự thật. Một association JPA hoặc một cột kết thúc bằng `_id`
      **không** chứng minh khoá ngoại tồn tại trong database.
- [ ] Cập nhật `DATA_DICTIONARY_MASTER.md` hoặc `DATA_DICTIONARY_TENANT.md` — cột, kiểu, nullable, default,
      ràng buộc, mô tả.
- [ ] Cập nhật các mục tương ứng trong `README.md` theo [bảng ánh xạ ở mục 2](#2-bảng-ánh-xạ-thay-đổi-nào-sửa-mục-nào).
- [ ] Cập nhật sơ đồ Mermaid ERD ở §4 nếu quan hệ hoặc lực lượng thay đổi.
- [ ] Cập nhật bảng thống kê ở đầu `README.md`.
- [ ] Nếu thay đổi ảnh hưởng một feature, cập nhật mục **Database liên quan** trong file
      `docs/features/**` tương ứng và đổi `Trạng thái` nếu cần.
- [ ] Nếu thay đổi làm sai `docs/architecture/DOMAIN_MODEL.md`, sửa luôn file đó.
- [ ] Chạy kiểm chứng ở [mục 4](#4-kiểm-chứng).

---

## 4. Kiểm chứng

```bash
# 1. Master DB — hbm2ddl.auto = validate sẽ chặn khởi động nếu entity lệch schema
cd backend && ./mvnw spring-boot:run

# 2. Trạng thái migration
./mvnw flyway:info

# 3. Đối chiếu số bảng thực tế với con số ghi trong tài liệu
psql -d smarthire_master -c "\dt"
mysql -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '<tenant_db>';"

# 4. Đối chiếu khoá ngoại thực tế
mysql -e "SELECT table_name, column_name, referenced_table_name
          FROM information_schema.key_column_usage
          WHERE table_schema = '<tenant_db>' AND referenced_table_name IS NOT NULL;"
```

Đếm nhanh số entity để so với §3 của `README.md`:

```powershell
(Get-ChildItem backend/src/main/java/com/smarthire/domain/tenant/entity -Filter *.java).Count   # 46 = 45 entity + BaseEntity
(Get-ChildItem backend/src/main/java/com/smarthire/domain/master/entity -Filter *.java).Count   # 8
```

Tenant DB chạy `hbm2ddl.auto = none`, nên lệch pha ở tenant **không** bị Hibernate bắt lúc khởi động — chỉ
lộ ra khi truy vấn thật sự chạy. Đây là lý do tài liệu tenant phải được rà soát thủ công kỹ hơn.

---

## 5. Về ảnh ERD dạng PNG

ERD trong `README.md` viết bằng **Mermaid**, là dạng văn bản nên sửa được cùng lúc với code và không bao
giờ lệch khỏi repo. Đây là nguồn sự thật cho sơ đồ quan hệ.

Khi cần ảnh PNG độ phân giải cao để đưa vào báo cáo hoặc slide, áp dụng skill
[`architecture-diagram-style`](../../.agents/skills/architecture-diagram-style/SKILL.md) và xuất vào
`docs/diagram/00-system-architecture/` với tên `database-design-workspace-postgresql.png` và
`database-design-tenant-mysql.png`. Ảnh PNG là **bản phái sinh** — luôn sinh lại từ Mermaid và data
dictionary hiện hành, không sửa tay.

---

## 6. Nguyên tắc không được vi phạm

1. **SQL thắng entity.** Khi migration và entity mâu thuẫn, tài liệu ghi theo SQL và ghi chú rõ chỗ lệch.
2. **Không ghi giá trị thật.** Không password, không connection string thật, không dữ liệu bản ghi.
3. **Không xoá bảng khỏi tài liệu để cho gọn.** Nếu sơ đồ quá dày thì tách sơ đồ, không bỏ bảng.
4. **Cột `ref*` phải được nêu tên.** Mọi cột trông như khoá ngoại nhưng không có ràng buộc đều phải nằm
   trong [§7.3](README.md#73-cột-tham-chiếu-không-có-khoá-ngoại) kèm rủi ro của nó.
5. **Không sửa migration đã apply.** Luôn tạo version mới và ghi vào §10.2 hoặc §10.3.
