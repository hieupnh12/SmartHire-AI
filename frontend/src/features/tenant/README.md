# Tenant Frontend Boundary

`tenant/` contains tenant-side product surfaces. It is a boundary containing multiple actors and public tenant features, not one feature.

## Structure

```text
tenant/
├── auth/
├── career/
├── candidate/
├── recruiter/
├── admin/
├── README.md
└── AGENTS.md
```

## Actor / Feature Boundaries

- `auth/`: tenant authentication shared by internal users and candidate login entry points.
- `career/`: public tenant career site and tenant-not-found page.
- `candidate/`: candidate actor workspace.
- `recruiter/`: recruiter actor workspace.
- `admin/`: tenant admin/company workspace.

Actor folders such as `candidate/`, `recruiter/`, and `admin/` should be organized by actor feature first:

```text
actor/
├── dashboard/ or overview/
├── jobs/
├── applications/ or applicants/
├── ...
└── nav.ts
```

Each actor feature may then add technical subfolders only when needed:

```text
feature-name/
├── pages/
├── components/
├── api/
├── hooks/
├── services/
├── constants/
├── types/
└── utils/
```

## Current Actor Feature Maps

Candidate:

```text
candidate/dashboard
candidate/jobs
candidate/applications
candidate/cv
candidate/assessments
candidate/interviews
candidate/practice
candidate/schedules
candidate/notifications
```

Recruiter:

```text
recruiter/dashboard
recruiter/jobs
recruiter/applicants
recruiter/cv-screening
recruiter/matching
recruiter/pipeline
recruiter/assessments
recruiter/interviews
recruiter/schedules
recruiter/notifications
```

Tenant admin:

```text
admin/overview
admin/users
admin/system
admin/workspace
```

## Review Checklist

- A file path should reveal actor and feature immediately.
- Do not create root-level `tenant/pages`, `tenant/components`, or `tenant/services` for mixed concerns.
- Do not place all actor pages under `actor/pages` once an actor owns many features.
- Keep `nav.ts` at the actor root for actor-level navigation only.
- Shared tenant auth remains in `tenant/auth` unless logic belongs to one actor.
- Update `frontend/src/app/router.tsx` when route-level pages move.