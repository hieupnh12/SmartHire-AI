# API Guide — SmartHire-AI

Base: `/api/v1` · Auth: `Authorization: Bearer <access_token>` · Spec: `/v3/api-docs` · UI: `/swagger-ui.html`

Async AI/grading/email: **RabbitMQ** (ghi chú queue trong OpenAPI description).  
Realtime: WebSocket `/ws` (JWT).

Envelope chuẩn: xem phiên bản trước — `success`, `message`, `data`, `errors`, `timestamp`.

---

## Auth & users

| Method | Path | Feature |
|---|---|---|
| POST | `/auth/register` | AUTH-01 |
| POST | `/auth/login` | AUTH-02 |
| POST | `/auth/refresh` | AUTH-02 |
| POST | `/auth/logout` | AUTH-02 |
| POST | `/auth/google` | AUTH-03 |
| GET/PUT | `/users/me` | AUTH-05 |
| POST | `/users/me/avatar` | AUTH-05 |

## Jobs & applicants

| Method | Path | Feature |
|---|---|---|
| CRUD | `/jobs` | JOB-01 |
| POST | `/jobs/{id}/publish` · `/unpublish` · `/pause` · `/close` · `/reopen` · `/clone` | JOB-02 |
| POST | `/jobs/quick` | JOB-01 (screening) |
| GET/PUT | `/jobs/{id}/skills` | JOB-03 |
| GET/PUT | `/jobs/{id}/stages` | JOB-04 |
| POST/GET | `/jobs/{id}/applications` | JOB-05 |
| GET | `/public/jobs` · `/public/jobs/{id}` | JOB-02 public |

## CV screening

| Method | Path | Feature |
|---|---|---|
| POST | `/cvs` | CV-01 (candidate only) |
| DELETE | `/cvs/{id}` | CV-01 |
| GET | `/cvs/me` | CV-01 |
| GET | `/cvs/{id}` | CV-02 |
| GET | `/cvs/{id}/file` | CV-01 preview |
| GET | `/cvs/{id}/extraction` | CV-03 |
| POST | `/cvs/{id}/parse` | CV-02 (sync pipeline, heuristic if no Gemini) |
| POST | `/cvs/{id}/extract` | CV-03 |
| POST | `/cvs/{id}/analyze` | CV-04 |
| GET | `/jobs/{jobId}/cvs` | CV-05 / UI |
| GET/POST | `/jobs/{jobId}/cvs/{cvId}/match` | CV-05 |
| GET | `/jobs/published` | JOB-02 (thin, for CV upload) |
| GET/PUT | `/jobs/{id}/skills` | JOB-03 |

## Matching & ranking

| Method | Path | Feature |
|---|---|---|
| GET/POST | `/jobs/{id}/rankings` · `/recompute` | RANK-01 |
| GET | `/recommendations/jobs` | RANK-02 |
| GET | `/jobs/{id}/recommendations/candidates` | RANK-02 |
| GET | `/applications/{id}/overall-score` | RANK-03 |

## Technical assessment (FE-05)

| Method | Path | Feature |
|---|---|---|
| POST/GET | `/assessments` | ASSESS-01 |
| POST | `/assessments/{id}/attempts` | ASSESS-01 |
| POST | `/attempts/{id}/answers` | ASSESS-01 |
| POST | `/attempts/{id}/coding-submissions` | ASSESS-02 |
| POST | `/attempts/{id}/grade` | ASSESS-03 |
| GET | `/attempts/{id}/timer` | ASSESS-04 |
| POST | `/attempts/{id}/submit` | ASSESS-04 |
| POST/GET | `/attempts/{id}/proctor-events` · `/proctor-report` | ASSESS-05 |

## AI interview

| Method | Path | Feature |
|---|---|---|
| POST | `/interviews` | INT-* |
| POST | `/interviews/{id}/questions/generate` | INT-01 |
| POST | `/interviews/{id}/voice` | INT-02 |
| POST | `/interviews/{id}/score` | INT-04 |
| GET/POST | `/interviews/{id}/feedback` · `/share` | INT-05 |

## Workflow

| Method | Path | Feature |
|---|---|---|
| GET | `/jobs/{id}/pipeline` | WF-01 |
| POST | `/applications/{id}/move` | WF-01 |
| PATCH | `/applications/{id}/status` | WF-02 |
| GET | `/applications/{id}/status-history` | WF-02 |
| POST/GET | `/applications/{id}/decisions` | WF-03 |

## Dashboard

| Method | Path | Feature |
|---|---|---|
| GET | `/dashboard/summary` | DASH-01 |
| GET | `/dashboard/charts` | DASH-02 |
| GET | `/dashboard/trends` | DASH-03 |

## Scheduling & notifications

| Method | Path | Feature |
|---|---|---|
| CRUD/confirm | `/schedules` | SCHED-01 |
| GET/PATCH | `/notifications` | SCHED-02 |
| WS | `/ws` → `/user/queue/notifications` | SCHED-02 |

## Practice interview

| Method | Path | Feature |
|---|---|---|
| POST/GET/DELETE | `/practice/sessions` | PRACT-01, PRACT-03 |
| POST | `/practice/sessions/{id}/answers` | PRACT-01 |
| POST/GET | `/practice/sessions/{id}/feedback` | PRACT-02 |

---

Chi tiết request/response: Swagger + từng file trong `docs/features/**`.  
Postman skeleton: `docs/api/SmartHire.postman_collection.json` (regenerate từ OpenAPI khi BE sẵn sàng).

## Contract Ranking đã triển khai

Các path dưới đây có prefix `/api/v1`. Header `Authorization: Bearer <JWT>` và `X-Tenant-ID` phải thuộc cùng tenant. Chỉ Recruiter sở hữu Job được truy cập.

| Method | Path | Kết quả |
|---|---|---|
| GET | `/rankings/jobs` | Danh sách `{id,title}` các Job sở hữu |
| GET | `/jobs/{id}/rankings` | Board tính từ dữ liệu hiện tại, không ghi snapshot |
| POST | `/jobs/{id}/rankings/recompute` | Tính lại toàn bộ và lưu snapshot; trả Board |
| PUT | `/jobs/{id}/rankings/config` | Lưu cấu hình theo revision và tính lại; trả Board |
| GET | `/applications/{id}/overall-score` | Một row cùng breakdown/nguồn/bằng chứng |
| GET | `/applications/{id}/ranking-sources` | `{cvs,attempts,interviews,selected}`; mỗi option `{id,label,status}` |
| PUT | `/applications/{id}/ranking-sources` | Chọn nguồn thuộc hồ sơ và tính lại Job |

Mẫu cấu hình (groups phải khớp nhóm thực tế trong Job; lấy từ `skillCategories` của Board):

```json
{
  "weights": {"skills": 35, "experience": 15, "assessment": 30, "interview": 20},
  "groups": {"backend": 50, "database": 25, "devops": 20, "frontend": 5},
  "requiredExperienceMonths": 24,
  "revision": 0
}
```

`revision=0` khi tạo lần đầu; lần sau gửi revision hiện tại. Tổng mỗi tầng phải bằng 100, trọng số nguyên từ 0–100; kinh nghiệm từ 0–1200 tháng, phải >0 nếu bật trọng số E.

Chọn nguồn: `{"cvId":1,"attemptId":2,"interviewId":3}`. Giá trị null dùng chế độ tự chọn duy nhất, nhiều nguồn thì chờ Recruiter chọn, không tự chọn điểm cao nhất.

Board: `{jobId,jobTitle,config,rankingVersion,calculatedAt,skillCategories,rows}`. Row gồm `applicationId,candidateName,status,rank,result,groups,missingRequired,experienceMonths,experienceEvidence,notices,sources,interviewFeedback`.

`result` gồm `score,availableWeight,completedComponents,requiredComponents,cohort,complete,components`; mỗi component gồm `key,score,weight,contribution,state`. Điểm null khác 0. Chỉ so hạng cùng cohort; trong chế độ tất cả FE ẩn hạng. Snapshot trong DB không được dùng như kết quả hiện tại nếu nguồn đã đổi.

HTTP: 400 dữ liệu/trọng số/nguồn sai; 403 sai tenant hoặc role; 404 Job/application không truy cập được; 409 revision cũ. Tất cả bọc `ApiResponse`.

Kiểm tra: `mvn.cmd test` với Java 21; máy dùng Java 24 có thể chạy `mvn.cmd test "-Dnet.bytebuddy.experimental=true"` cho Byte Buddy hiện tại. FE: `npm.cmd run build` trong `frontend/`. H2 integration test không thay thế việc chạy migration MySQL trên tenant thực.

## PostgreSQL master / MySQL tenant

API quản trị master yêu cầu `Authorization: Bearer <master-token>` với role `WORKSPACE_ADMIN`.
`POST /master/tenants/onboard` yêu cầu `code`, `name`, `subdomain`, `adminName`, `adminEmail`, `adminPassword`.
Không gọi API user tenant để bootstrap admin. Response chỉ chứa metadata và không chứa credential kết nối.
`POST /master/tenants/{id}/retry` gửi lại `adminName`, `adminEmail`, `adminPassword` cho tenant `FAILED` hoặc `PROVISIONING` bị gián đoạn.
Chế độ thủ công bổ sung `customDbUrl`, `dbUsername`, `dbPassword`; backend chạy migration trên DB đã chuẩn bị.
Trạng thái provisioning là `PROVISIONING` → `ACTIVE` hoặc `FAILED`; trạng thái vận hành là `ACTIVE` ↔ `SUSPENDED`. Không kích hoạt trực tiếp tenant `FAILED`.
Xem [contract và business rules](../features/Authentication/Tenant-Onboarding.md).
