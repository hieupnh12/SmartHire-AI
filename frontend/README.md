# SmartHire Frontend

TypeScript · React 19 · Vite · Tailwind · React Router · Zustand · TanStack Query · RHF+Zod · Axios

## Role-based UI

| Area | Path | Actor |
|---|---|---|
| Welcome | `/` | Guest |
| Auth | `/login`, `/register` | Guest |
| Candidate | `/candidate/*` | CANDIDATE |
| Recruiter | `/recruiter/*` | RECRUITER |
| Admin | `/admin/*` | ADMIN |

Domain APIs (shared): `src/api/*` → Spring Boot `/api/v1`.

## Run

```bash
docker compose up -d mysql redis rabbitmq
cd backend && mvn spring-boot:run
cd frontend && npm install && npm run dev
```

- Preview role UI without JWT: `VITE_REQUIRE_AUTH=false` (default) — Welcome has Preview links.
- After AUTH-02: `VITE_REQUIRE_AUTH=true`.

## Structure

```
src/api/           # authApi, jobApi, cvApi, …
src/features/
  welcome/
  auth/
  candidate/
  recruiter/
  admin/
src/app/layouts/RoleShell.tsx
src/app/guards/RoleRoute.tsx
```
