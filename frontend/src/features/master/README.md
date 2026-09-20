# Master Frontend Boundary

`master/` contains landlord/platform features. It is a boundary, not one feature. Organize by feature first, then add technical folders inside the feature only when needed.

## Structure

```text
master/
├── shell/                 # Layout, sidebar, provider dùng chung cho /admin
├── auth/
│   └── pages/
├── dashboard/
│   └── pages/
├── analytics/
│   └── pages/
├── leads/
│   └── pages/
├── tenant-management/
│   ├── pages/
│   └── components/
├── billing/
│   ├── pages/
│   └── components/
├── contract/
│   ├── pages/
│   └── components/
├── system/
│   ├── pages/
│   └── components/
├── account/
│   ├── pages/
│   └── components/
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
- `shell/`: layout, navigation và shared state của khu vực Platform Admin.
- `analytics/`, `leads/`, `tenant-management/`, `billing/`, `contract/`, `system/`, `account/`: các chức năng quản trị nền tảng độc lập.
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

## Platform Admin Routes

Các chức năng quản trị nền tảng dùng URL riêng để hỗ trợ tải lại trang, bookmark và điều hướng Back/Forward:

- `/admin/dashboard`, `/admin/analytics`, `/admin/leads`
- `/admin/tenants/{overview|directory|create|verification|provisioning}`
- `/admin/contracts`, `/admin/invoices`
- `/admin/subscriptions/{overview|plans|allocations|invoices}`
- `/admin/system/{logs|ai-usage|ai-quotas}`
- `/admin/account/{profile|security|accessibility|notifications}`

`/admin` chuyển hướng về `/admin/dashboard`. Sidebar phải điều hướng bằng React Router; không dùng state cục bộ làm nguồn sự thật cho trang hiện tại.
