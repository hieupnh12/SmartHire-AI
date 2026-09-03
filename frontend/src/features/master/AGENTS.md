# AGENTS.md — Master Frontend Boundary

These instructions apply to files under `frontend/src/features/master/`.

## Boundary

`master/` owns landlord/platform UI. It is not a single feature and should be organized by feature first.

## Required Pattern

```text
master/<feature>/<technical-folder>/<file>
```

Current feature folders:

- `auth/`
- `dashboard/`
- `landing/`
- `onboarding/`

Inside a feature, add `pages/`, `components/`, `api/`, `hooks/`, `services/`, `constants/`, `types/`, or `utils/` only when that folder contains real files.

## Rules

- Do not put mixed pages in `master/pages` or `master/admin/pages`.
- Do not import tenant actor internals from master features.
- Route-level pages live in `<feature>/pages/`.
- Shared landlord UI for one feature lives in `<feature>/components/`.
- Static config and demo data live in `<feature>/constants/`.
- Feature contracts live in `<feature>/types/`.
- Update `frontend/src/app/router.tsx` when moving or adding route-level pages.