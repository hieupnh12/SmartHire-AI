# Frontend Features By Actor

UI is organized by actor boundary first, then by feature inside each actor.

| Feature folder | Who | Routes |
|---|---|---|
| `master/landing/` | Guest / Tenant prospect | `/`, `/career`, `/jobs`, `/onboard` |
| `master/admin/` | Platform admin | `/admin/*` |
| `tenant/auth/` | Tenant users / candidate auth | `/login`, `/internal/login`, `/candidate/login` |
| `tenant/career/` | Public tenant career page | `/career`, `/jobs` |
| `tenant/candidate/` | Candidate | `/candidate/*` |
| `tenant/recruiter/` | Recruiter | `/recruiter/*` |
| `tenant/admin/`, `tenant/dashboard/` | Tenant admin / workspace | `/tenant/admin`, `/company/workspace` |

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
      career/
      candidate/             # actor boundary
        dashboard/
          pages/
          components/
          constants/
          types/
        jobs/pages/
        applications/pages/
        cv/pages/
        assessments/pages/
        interviews/pages/
        practice/pages/
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

Login redirects: `CANDIDATE` -> `/candidate`, `RECRUITER` -> `/recruiter`, `ADMIN` -> `/admin`.