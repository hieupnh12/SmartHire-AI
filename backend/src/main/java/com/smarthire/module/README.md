# Backend modules

Implement theo Code ID trong `docs/features/README.md` và domain `docs/architecture/DOMAIN_MODEL.md`.

## Package layout

```
com.smarthire
├── domain
│   ├── entity/          # JPA entities — @Table(name) lowercase
│   ├── enums/
│   └── repository/
├── module
│   ├── auth|job|applicant|cv|matching|assessment|
│   │   interview|practice|workflow|schedule|notification|dashboard
│   │   ├── controller/
│   │   ├── dto/request|response/
│   │   ├── service/
│   │   └── mapper/
├── messaging/
└── security/
```

## Entity rule (bắt buộc)

```java
@Entity
@Table(name = "users")              // chữ thường, snake_case
public class User extends BaseEntity { ... }

@Entity
@Table(name = "interview_answers")  // đúng
// @Table(name = "InterviewAnswers") // SAI
```

Tên bảng phải khớp Flyway (`db/migration`).

## Modules

| Package | Codes |
|---|---|
| `auth` | AUTH-01..05 |
| `job` | JOB-01..04 |
| `applicant` | JOB-05 |
| `cv` | CV-01..05 |
| `matching` | RANK-01..03 |
| `assessment` | ASSESS-01..05 |
| `interview` | INT-01..05 |
| `practice` | PRACT-01..03 |
| `workflow` | WF-01..03 |
| `schedule` | SCHED-01 |
| `notification` | SCHED-02..03 |
| `dashboard` | DASH-01..03 |

Mỗi module hiện có scaffold: `*Controller` (`GET .../health`) · `*Service` · `*Mapper` · `dto/request|response`.
