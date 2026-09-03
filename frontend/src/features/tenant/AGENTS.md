# AGENTS.md — Tenant Frontend Boundary

These instructions apply to files under `frontend/src/features/tenant/`.

## Boundary

`tenant/` is a tenant-side boundary containing multiple actors and public tenant features. Organize by actor/feature first, then by technical layer.

## Required Pattern

For tenant-level features:

```text
tenant/<feature>/<technical-folder>/<file>
```

For tenant actor workspaces:

```text
tenant/<actor>/<actor-feature>/<technical-folder>/<file>
```

Examples:

```text
tenant/candidate/applications/pages/MyApplicationsPage.tsx
tenant/recruiter/jobs/pages/JobsPage.tsx
tenant/admin/users/pages/UsersPage.tsx
```

## Rules

- Do not create mixed root folders like `tenant/pages`, `tenant/components`, or `tenant/types`.
- Avoid actor-level catch-all folders like `recruiter/pages` or `admin/pages` when the actor has multiple features.
- Add technical subfolders inside a feature only when they contain real files.
- Actor-level `nav.ts` owns navigation config only.
- If code is reused across two features of the same actor, move it to `<actor>/shared/*` intentionally.
- If code is reused across tenant actors, consider `src/components/ux`, `src/api/tenant`, or a clearly named shared tenant feature.
- Route-level pages live in `pages/` under their owning feature.
- Update `frontend/src/app/router.tsx` when adding or moving route-level pages.

## Current Actors

- `candidate/`: candidate workspace.
- `recruiter/`: recruiter workspace.
- `admin/`: tenant admin/company workspace.

## Current Tenant-Level Features

- `auth/`: tenant authentication/session state.
- `career/`: public tenant career site.

## Build Check

Run `npm.cmd run build` from `frontend/` on Windows after moving files or changing imports.