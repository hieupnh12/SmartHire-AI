# Frontend Features By Actor

UI is organized by actor boundary first, then by feature inside each actor.

| Feature folder | Who | Routes |
|---|---|---|
| `master/landing/` | Guest / Tenant prospect | `/`, `/career`, `/jobs`, `/onboard` |
| `master/admin/` | Platform admin | `/admin/*` |
| `tenant/auth/` | Tenant users / candidate auth | `/login`, `/internal/login` |
| `tenant/candidate/jobs/` | Guest / Candidate — public tenant career site, candidate header/layout | `/career`, `/jobs`, `/jobs/:jobId` |
| `tenant/candidate/cv/` | Guest / Candidate — CV management, CV template library | `/cv`, `/cv-templates` |
| `tenant/candidate/` | Candidate | `/workspace`, `/applications`, `/cv`, `/assessments`, `/interviews`, ... |
| `tenant/recruiter/` | Recruiter | `/recruiter/*` |
| `tenant/admin/`, `tenant/dashboard/` | Tenant admin / workspace | `/internal/admin`, `/company/workspace` |

Shared HTTP clients live in `src/api/`. Feature folders may add local `api/`, `hooks/`, `services/`, `types/`, or `utils/` only when that feature needs ownership of that logic.

```text
src/
  api/                       # shared Axios clients and contracts
  features/
    master/
      landing/
      admin/
    tenant/
      auth/
      candidate/             # actor boundary
        jobs/                # public career site, job detail, candidate header/layout
          pages/
          components/
          utils/
        dashboard/
          pages/
          components/
          constants/
          types/
        applications/pages/
        cv/pages/            # MyCvPage, CvTemplatesPage
        shared/constants/    # cvTemplates (used by cv page and header menu)
        assessments/pages/
        interviews/pages/
        schedules/pages/
        notifications/pages/
        nav.ts
      recruiter/
      admin/
      dashboard/
  app/
    layouts/RoleShell.tsx
    guards/RoleRoute.tsx
```

Login redirects: `CANDIDATE` -> `/workspace`, `RECRUITER` -> `/recruiter`, `ADMIN` -> `/internal/admin`.
