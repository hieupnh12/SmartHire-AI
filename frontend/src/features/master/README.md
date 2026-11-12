# Master Frontend Boundary

`master/` contains landlord/platform features. It is a boundary, not one feature. Organize by feature first, then add technical folders inside the feature only when needed.

## Structure

```text
master/
├── shell/                 # Layout, sidebar, header actions dùng chung cho /admin
├── auth/
│   └── pages/
├── dashboard/
│   ├── pages/
│   └── components/
├── analytics/
│   ├── pages/
│   └── components/
├── leads/
│   ├── pages/
│   └── components/
├── tenant-management/
│   ├── pages/
│   └── components/
├── billing/
│   ├── pages/
│   └── components/        # Workspace, Checkout, LegalPolicyModal, Invoice modals
├── contract/
│   ├── pages/
│   └── components/
├── system/
│   ├── pages/
│   └── components/        # AI Engine config, usage/quota workspace, log modals
├── account/
│   ├── pages/
│   └── components/
├── landing/
│   ├── pages/
│   ├── components/
│   └── context/
├── onboarding/
│   ├── pages/             # TenantOnboardPage, B2bDealWizardPage
│   └── utils/             # cpqPricingEngine
├── README.md
└── AGENTS.md
```

## Feature Meaning

- `auth/`: platform admin authentication pages (`MasterLoginPage`).
- `dashboard/`: platform admin dashboard (`DashboardPage`, `PlatformHomeDashboard`).
- `analytics/`: platform financial, tenant health & AI analytics (`AnalyticsPage`, `PlatformAnalyticsDashboard`).
- `shell/`: layout (`MasterAdminLayout`), navigation (`MasterAdminSidebar`) và header actions của khu vực Platform Admin.
- `leads/`, `tenant-management/`, `billing/`, `contract/`, `system/`, `account/`: các chức năng quản trị nền tảng độc lập.
- `landing/`: SaaS public/marketing landing pages, modals (`WorkspaceModal`, `OrderLookupModal`) và trang pháp lý (`/terms`, `/privacy`).
- `onboarding/`: direct tenant onboarding (`TenantOnboardPage`) và B2B Deal Wizard 3 bước (`B2bDealWizardPage`).

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

## Routes

### Public, Self-Serve Checkout & Onboarding Routes

- Marketing & Legal: `/`, `/solutions`, `/preview`, `/roi` (`/value` redirect), `/security`, `/pricing` (`/packages` redirect), `/demo`, `/terms`, `/privacy`.
- Checkout & Payment Return: `/checkout`, `/checkout/:planCode`, `/checkout/success`, `/checkout/vnpay-return`.
- E-Contract Signing Portal: `/contracts/sign/:token`, `/contracts/view/:token`.
- Auth & Direct Onboarding: `/admin/login`, `/onboard` (protected by `MasterRoute`).

### Platform Admin Routes (`/admin`, protected by `MasterRoute`)

Các chức năng quản trị nền tảng dùng URL riêng để hỗ trợ tải lại trang, bookmark và điều hướng Back/Forward:

- `/admin/dashboard`, `/admin/analytics`, `/admin/leads`, `/admin/deals`
- `/admin/tenants/{overview|directory|create|provisioning}` (`/admin/tenants` chuyển về `directory`; `/admin/tenants/create` trỏ tới `B2bDealWizardPage`)
- `/admin/contracts`, `/admin/contracts/create`, `/admin/invoices`
- `/admin/subscriptions/{overview|plans|allocations|create}` (`/admin/subscriptions` chuyển về `plans`)
- `/admin/system/{logs|ai-usage|ai-quotas|ai-config}`
- `/admin/account/{profile|security|accessibility|notifications}`

`/admin` chuyển hướng về `/admin/dashboard`. Sidebar (`MasterAdminSidebar.tsx`) điều hướng bằng React Router; không dùng state cục bộ làm nguồn sự thật cho trang hiện tại.
