# Master Frontend Boundary

`master/` contains landlord/platform features. It is a boundary, not one feature. Organize by feature first, then add technical folders inside the feature only when needed.

## Structure

```text
master/
├── auth/
│   └── pages/
├── dashboard/
│   └── pages/
├── landing/
│   └── pages/
├── onboarding/
│   └── pages/
├── README.md
└── AGENTS.md
```

## Feature Meaning

- `auth/`: platform admin authentication pages.
- `dashboard/`: platform admin dashboard and landlord analytics entry points.
- `landing/`: SaaS public/marketing landing pages.
- `onboarding/`: tenant onboarding and registration flow.

## Rule

Use `master/<feature>/<technical-folder>/...`. Do not put mixed feature pages under `master/pages` or `master/admin/pages`.

If a master feature grows, add only the folders it needs:

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

## Review Checklist

- The path communicates the master feature clearly.
- Route imports point to the feature folder, for example `master/onboarding/pages/TenantOnboardPage`.
- Page files stay thin; repeated UI moves to that feature's `components/`.
- Master/landlord UI does not import tenant actor internals.