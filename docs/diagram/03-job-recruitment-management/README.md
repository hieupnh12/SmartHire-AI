# 3.3 Job Recruitment Management — UML Target Design

Các sơ đồ trong thư mục này mô tả kiến trúc mục tiêu của chức năng quản lý job, không phụ thuộc trạng thái code hiện tại.

| ID | Chức năng | Class | Sequence | Trạng thái |
|---|---|---|---|---|
| JOB-F01 | Create and Save Draft Job | [Class](create-save-draft-job/class-diagram.puml) | [Sequence](create-save-draft-job/sequence-diagram.puml) | Complete |
| JOB-F02 | Search and View Jobs | [Class](search-view-jobs/class-diagram.puml) | [Sequence](search-view-jobs/sequence-diagram.puml) | Complete |
| JOB-F03 | Update Job Details | [Class](update-job-details/class-diagram.puml) | [Sequence](update-job-details/sequence-diagram.puml) | Complete |
| JOB-F04 | Delete Job | [Class](delete-job/class-diagram.puml) | [Sequence](delete-job/sequence-diagram.puml) | Complete |
| JOB-F05 | Clone Job or Create from Template | [Class](clone-job-from-template/class-diagram.puml) | [Sequence](clone-job-from-template/sequence-diagram.puml) | Complete |
| JOB-F06 | Configure Job Requirements and Matching | [Class](configure-job-matching/class-diagram.puml) | [Sequence](configure-job-matching/sequence-diagram.puml) | Complete |
| JOB-F07 | Configure Recruitment Pipeline | [Class](configure-recruitment-pipeline/class-diagram.puml) | [Sequence](configure-recruitment-pipeline/sequence-diagram.puml) | Complete |
| JOB-F08 | Configure Assessment and Interview Plan | [Class](configure-selection-plan/class-diagram.puml) | [Sequence](configure-selection-plan/sequence-diagram.puml) | Complete |
| JOB-F09 | Manage Job Publication Lifecycle | [Class](manage-job-lifecycle/class-diagram.puml) | [Sequence](manage-job-lifecycle/sequence-diagram.puml) | Complete |
| JOB-F10 | Browse Public Job Openings | [Class](browse-public-jobs/class-diagram.puml) | [Sequence](browse-public-jobs/sequence-diagram.puml) | Complete |

## Quy ước chung

- Class diagram đi từ `Controller → DTO → Service → Repository → Domain Entity → Infrastructure & Persistence`.
- Connector dùng slate đậm `#334155`, độ dày `1`; public dùng vòng xanh và private dùng ô đỏ.
- Tenant database được resolve trước mọi repository access; `TenantContext` luôn được clear sau request.
- Request/response DTO không expose entity.
- Các event bất đồng bộ phải mang tenant header và consumer phải restore/clear tenant context.
- Đã tạo PNG cho toàn bộ class và sequence diagram ở 300 DPI.
