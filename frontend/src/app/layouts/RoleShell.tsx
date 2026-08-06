import { NavLink, Outlet } from "react-router-dom";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { useT } from "@/i18n";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { Tooltip } from "@/components/ux/Tooltip";
import { Button } from "@/components/ux/Button";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";

type NavItem = { to: string; labelKey: string };

type RoleShellProps = {
  brandKey: "roles.candidate" | "roles.recruiter" | "roles.admin";
  basePath: string;
  links: NavItem[];
};

export function RoleShell({ brandKey, basePath, links }: RoleShellProps) {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const openShortcuts = useUiStore((s) => s.openShortcuts);

  return (
    <div className="min-h-screen bg-surface-page">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border-default)] bg-surface-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <span className="font-display text-lg font-bold text-brand-primary sm:text-xl">
              {t("brand.name")}
            </span>
            <span className="ml-2 text-sm text-[var(--color-text-secondary)]">
              · {t(brandKey)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <Tooltip content={`${t("common.shortcuts")} (?)`}>
              <Button
                variant="ghost"
                size="sm"
                aria-label={t("common.shortcuts")}
                onClick={openShortcuts}
              >
                ?
              </Button>
            </Tooltip>
            {user && (
              <span className="hidden text-sm text-[var(--color-text-secondary)] md:inline">
                {user.fullName}
              </span>
            )}
            <NavLink
              to="/"
              className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] px-3 text-sm text-[var(--color-text-secondary)] hover:bg-surface-muted"
            >
              {t("common.welcome")}
            </NavLink>
            <Button variant="secondary" size="sm" onClick={() => logout()}>
              {t("common.logout")}
            </Button>
          </div>
        </div>
        <nav
          className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-3 sm:px-4"
          aria-label={t("a11y.mainNav")}
        >
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={`${basePath}${l.to}`}
              end={l.to === ""}
              className={({ isActive }) =>
                cn(
                  "whitespace-nowrap rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors duration-[var(--motion-fast)]",
                  "min-h-11 inline-flex items-center",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-border-focus)]",
                  isActive
                    ? "bg-brand-primary text-[var(--color-text-inverse)] shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:bg-surface-muted",
                )
              }
            >
              {t(l.labelKey)}
            </NavLink>
          ))}
        </nav>
      </header>
      <main id="main-content" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
