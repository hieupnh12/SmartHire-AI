# Frontend features — by role

UI is split by **actor**, not by domain CRUD.

| Feature folder | Who | Routes |
|---|---|---|
| `welcome/` | Guest | `/` |
| `auth/` | Guest | `/login`, `/register` |
| `candidate/` | Candidate | `/candidate/*` |
| `recruiter/` | Recruiter | `/recruiter/*` |
| `admin/` | Admin | `/admin/*` |

Shared HTTP clients live in **`src/api/`** (job, cv, interview, …) — used by any role.

```
src/
  api/                 # Axios ↔ Spring Boot modules
  features/
    welcome/
    auth/              # pages + zustand store + types
    candidate/pages|nav
    recruiter/pages|nav
    admin/pages|nav
  app/
    layouts/RoleShell.tsx
    guards/RoleRoute.tsx
```

Login redirects: `CANDIDATE` → `/candidate`, `RECRUITER` → `/recruiter`, `ADMIN` → `/admin`.
