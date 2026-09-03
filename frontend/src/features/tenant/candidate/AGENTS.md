# AGENTS.md — Candidate Actor Module

These instructions apply to files under `frontend/src/features/tenant/candidate/`.

## Boundary

`candidate/` is an actor boundary, not a single feature. Organize by candidate feature first, then by technical layer inside each feature only when needed.

## Required Pattern

Prefer this shape:

```text
candidate/
├── dashboard/
├── jobs/
├── applications/
├── cv/
├── assessments/
├── interviews/
├── practice/
├── schedules/
├── notifications/
└── nav.ts
```

Inside each feature folder, add technical subfolders only when they contain real files:

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

Do not create empty `api/components/constants/hooks/pages/services/types/utils` folders at the candidate root. That makes the actor boundary look like one oversized feature and makes review harder.

## Coding Rules

- Route-level pages live in `<feature>/pages/`.
- Keep pages thin: compose components, call hooks, and pass data down.
- Put repeated UI for one feature in `<feature>/components/`.
- Put static UI config, demo data, labels, and stage lists in `<feature>/constants/`.
- Put shared contracts for one feature in `<feature>/types/`.
- Put reusable query/state logic in `<feature>/hooks/`.
- Put response mapping and workflow calculations in `<feature>/services/`.
- Put pure helper functions in `<feature>/utils/`.
- If code is reused by two or more candidate features, move it to `candidate/shared/*` intentionally.
- Candidate features may use global shared UI from `@/components/ux`.
- Candidate features should not import internal components from sibling features.
- `nav.ts` owns actor navigation config only.

## Routing Rules

- Add or update routes in `frontend/src/app/router.tsx` when adding a candidate page.
- Import pages from their feature folder, for example `@/features/tenant/candidate/dashboard/pages/HomePage`.
- Add a `nav.ts` entry only when the target route exists.

## UI Rules

- Use existing shared UI and Tailwind/design-token conventions first.
- Use `lucide-react` icons for controls and statuses.
- Decorative icons must set `aria-hidden="true"`.
- Long Vietnamese labels must fit on mobile without overlapping icons or buttons.
- Do not present fake/demo auth as real OAuth completion. Keep demo behavior clear when relevant.

## Review Checklist

- The path communicates the actor feature clearly.
- No large mock arrays, icon maps, or repeated card markup are left in a page file.
- Feature-local types/constants are colocated with that feature.
- Sibling feature internals are not imported directly.
- Build passes with `npm.cmd run build` from `frontend/` on Windows.