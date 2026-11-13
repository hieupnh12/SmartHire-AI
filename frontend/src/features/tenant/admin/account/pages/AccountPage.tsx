import { useMemo, useState } from "react";
import { Bell, Eye, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { useT } from "@/i18n";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { getTenantTheme } from "@/lib/tenantTheme";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";

type AccountSection = "profile" | "security" | "accessibility" | "notifications";

export function AccountPage() {
  const t = useT();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const askConfirm = useUiStore((state) => state.askConfirm);
  const tenantTheme = getTenantTheme(getTenantIdFromWindow() ?? "acme");
  const [activeSection, setActiveSection] = useState<AccountSection>("profile");
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem("tenant_admin_reduced_motion") === "true");
  const [emailNotifications, setEmailNotifications] = useState(() => localStorage.getItem("tenant_admin_email_notifications") !== "false");
  const displayName = user?.fullName ?? t("tenantAdmin.account.defaultDisplayName");
  const initial = displayName.trim().charAt(0).toLocaleUpperCase() || "A";

  const sections = useMemo(
    () => [
      { id: "profile" as const, label: t("tenantAdmin.account.sections.profile"), icon: UserRound },
      { id: "security" as const, label: t("tenantAdmin.account.sections.security"), icon: ShieldCheck },
      { id: "accessibility" as const, label: t("tenantAdmin.account.sections.accessibility"), icon: Eye },
      { id: "notifications" as const, label: t("tenantAdmin.account.sections.notifications"), icon: Bell },
    ],
    [t],
  );

  const handleLogout = () =>
    askConfirm({
      title: t("tenantAdmin.account.logoutConfirmTitle"),
      confirmLabel: t("tenantAdmin.account.logoutConfirmLabel"),
      danger: true,
      onConfirm: () => {
        logout();
        navigate("/", { replace: true });
      },
    });

  return (
    <div className="grid min-h-[calc(100vh-3rem)] gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="border-b border-[var(--color-border-default)] pb-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4" aria-label={t("tenantAdmin.account.navAriaLabel")}>
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-outline)]">{t("tenantAdmin.account.sidebarLabel")}</p>
        <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {sections.map((section) => {
            const Icon = section.icon;
            const selected = activeSection === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "flex min-h-14 items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
                  selected
                    ? "bg-[var(--color-primary-soft)] text-brand-primary"
                    : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                {section.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="mb-6 rounded-3xl border border-[var(--color-border-default)] bg-gradient-to-br from-[var(--color-primary-subtle)] via-white to-white px-6 py-6 sm:px-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-on-surface)]">{t("tenantAdmin.account.title")}</h1>
        </header>

        {activeSection === "profile" && (
          <section aria-labelledby="tenant-account-profile-title">
            <h2 id="tenant-account-profile-title" className="mb-5 text-2xl font-bold text-[var(--color-on-surface)]">{t("tenantAdmin.account.sections.profile")}</h2>
            <div className="overflow-hidden rounded-3xl border border-[var(--color-border-default)] bg-white shadow-sm">
              <div className="flex items-center gap-5 border-b border-[var(--color-border-default)] p-6">
                <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-brand-primary text-2xl font-bold text-[var(--color-on-primary)]">{initial}</span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-[var(--color-on-surface)]">{displayName}</p>
                  <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{t("tenantAdmin.account.workspaceAdminRole", { workspace: tenantTheme.name })}</p>
                </div>
              </div>
              {[
                [t("tenantAdmin.account.fields.email"), user?.email ?? t("tenantAdmin.account.fields.notUpdated")],
                [t("tenantAdmin.account.fields.role"), user?.role ?? "TENANT_ADMIN"],
                [t("tenantAdmin.account.fields.scope"), t("tenantAdmin.account.fields.scopeValue", { workspace: tenantTheme.name })],
                [t("tenantAdmin.account.fields.status"), t("tenantAdmin.account.fields.activeStatus")],
              ].map(([label, value]) => (
                <div key={label} className="grid gap-1 border-b border-[var(--color-border-default)] px-6 py-5 last:border-b-0 sm:grid-cols-[12rem_1fr]">
                  <span className="text-sm font-semibold text-[var(--color-on-surface)]">{label}</span>
                  <span className="break-words text-sm text-[var(--color-on-surface-variant)]">{value}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeSection === "security" && (
          <section aria-labelledby="tenant-account-security-title">
            <h2 id="tenant-account-security-title" className="mb-5 text-2xl font-bold text-[var(--color-on-surface)]">{t("tenantAdmin.account.sections.security")}</h2>
            <div className="space-y-4 rounded-3xl border border-[var(--color-border-default)] bg-white p-6 shadow-sm">
              <div className="rounded-2xl bg-emerald-50 p-5">
                <p className="font-semibold text-emerald-900">{t("tenantAdmin.account.security.activeSessionTitle")}</p>
                <p className="mt-1 text-sm text-emerald-700">{t("tenantAdmin.account.security.activeSessionDesc", { workspace: tenantTheme.name })}</p>
              </div>
              <button type="button" onClick={handleLogout} className="flex min-h-12 items-center gap-3 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500">
                <LogOut className="size-5" aria-hidden="true" />
                {t("tenantAdmin.account.security.logoutButton")}
              </button>
            </div>
          </section>
        )}

        {activeSection === "accessibility" && (
          <section aria-labelledby="tenant-account-accessibility-title">
            <h2 id="tenant-account-accessibility-title" className="mb-5 text-2xl font-bold text-[var(--color-on-surface)]">{t("tenantAdmin.account.sections.accessibility")}</h2>
            <div className="rounded-3xl border border-[var(--color-border-default)] bg-white p-6 shadow-sm">
              <label className="flex cursor-pointer items-center justify-between gap-6 rounded-2xl p-4 hover:bg-[var(--color-surface-alt)]">
                <span><span className="block font-semibold">{t("tenantAdmin.account.accessibility.reducedMotionTitle")}</span><span className="mt-1 block text-sm text-[var(--color-on-surface-variant)]">{t("tenantAdmin.account.accessibility.reducedMotionDesc")}</span></span>
                <input type="checkbox" checked={reducedMotion} onChange={(event) => { setReducedMotion(event.target.checked); localStorage.setItem("tenant_admin_reduced_motion", String(event.target.checked)); }} className="size-5 accent-[var(--color-primary)]" />
              </label>
            </div>
          </section>
        )}

        {activeSection === "notifications" && (
          <section aria-labelledby="tenant-account-notifications-title">
            <h2 id="tenant-account-notifications-title" className="mb-5 text-2xl font-bold text-[var(--color-on-surface)]">{t("tenantAdmin.account.sections.notifications")}</h2>
            <div className="rounded-3xl border border-[var(--color-border-default)] bg-white p-6 shadow-sm">
              <label className="flex cursor-pointer items-center justify-between gap-6 rounded-2xl p-4 hover:bg-[var(--color-surface-alt)]">
                <span><span className="block font-semibold">{t("tenantAdmin.account.notifications.emailTitle")}</span><span className="mt-1 block text-sm text-[var(--color-on-surface-variant)]">{t("tenantAdmin.account.notifications.emailDesc")}</span></span>
                <input type="checkbox" checked={emailNotifications} onChange={(event) => { setEmailNotifications(event.target.checked); localStorage.setItem("tenant_admin_email_notifications", String(event.target.checked)); }} className="size-5 accent-[var(--color-primary)]" />
              </label>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
