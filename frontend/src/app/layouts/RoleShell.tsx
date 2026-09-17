import { Bell, CircleHelp, Home, LogOut, Search, Sparkles } from "lucide-react";
import type { FormEvent } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ux/Button";
import { HeaderActionsMenu } from "@/components/ux/HeaderActionsMenu";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { Tooltip } from "@/components/ux/Tooltip";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";

type NavItem = { to: string; labelKey: string };

type RoleShellProps = {
  brandKey: "roles.candidate" | "roles.recruiter" | "roles.admin";
  basePath: string;
  links: readonly NavItem[];
};

export function RoleShell({ brandKey, basePath, links }: RoleShellProps) {
  const t = useT();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const openShortcuts = useUiStore((s) => s.openShortcuts);
  const userInitial = user?.fullName.trim().charAt(0).toLocaleUpperCase();
  const isCandidateWorkspace = basePath === "/candidate";
  const isRecruiterWorkspace = basePath === "/recruiter";
  const useWorkspaceHeader = isCandidateWorkspace || isRecruiterWorkspace;
  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };
  const submitWorkspaceSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("workspace-search")?.toString().trim();
    const target = isCandidateWorkspace ? "/candidate/jobs" : "/recruiter/applicants";
    navigate(query ? `${target}?q=${encodeURIComponent(query)}` : target);
  };

  return (
    <div className={cn("min-h-screen bg-surface-page", useWorkspaceHeader && "tenant-workspace-theme")}>
      <header className="sticky top-0 z-40 border-b border-[var(--color-border-default)] bg-white/85 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-primary text-[var(--color-on-primary)] shadow-[0_10px_20px_-10px_var(--color-primary-shadow)]">
              <Sparkles className="size-[18px]" aria-hidden="true" />
            </span>
            <div className="min-w-0 leading-tight">
              <span className="block truncate font-[var(--font-family)] text-lg font-semibold tracking-[-0.02em] text-[var(--color-on-surface)] sm:text-xl">
                {t("brand.name")}
              </span>
              <span className="block truncate text-xs font-medium tracking-[0.02em] text-[var(--color-on-surface-variant)]">
                {t(brandKey)}
              </span>
            </div>
          </div>

          {useWorkspaceHeader && (
            <form
              className="relative mx-auto hidden min-w-0 max-w-xl flex-1 md:block"
              role="search"
              onSubmit={submitWorkspaceSearch}
            >
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-[var(--color-outline)]" aria-hidden="true" />
              <input
                name="workspace-search"
                type="search"
                placeholder={isCandidateWorkspace ? `${t("common.search")} việc làm, kỹ năng...` : `${t("common.search")} ứng viên, kỹ năng...`}
                aria-label={t("common.search")}
                className="min-h-11 w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-2 pl-10 pr-20 text-sm text-[var(--color-on-surface)] outline-none transition-colors placeholder:text-[var(--color-outline)] focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/15"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 min-h-8 -translate-y-1/2 rounded-lg bg-brand-primary px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-primary"
              >
                {t("common.search")}
              </button>
            </form>
          )}

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Tooltip content={`${t("common.shortcuts")} (?)`} side="bottom">
              <Button
                variant="ghost"
                size="sm"
                aria-label={t("common.shortcuts")}
                onClick={openShortcuts}
                className="size-10 px-0"
              >
                <CircleHelp className="size-[18px]" aria-hidden="true" />
              </Button>
            </Tooltip>
            {useWorkspaceHeader && (
              <Tooltip content={t("nav.notifications")} side="bottom">
                <NavLink
                  to={`${basePath}/notifications`}
                  className="relative grid size-10 place-items-center rounded-[var(--radius-default)] text-[var(--color-on-surface-variant)] transition-colors hover:bg-teal-50 hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                  aria-label={t("nav.notifications")}
                >
                  <Bell className="size-[18px]" aria-hidden="true" />
                  <span className="absolute right-2 top-2 size-2 rounded-full bg-amber-500 ring-2 ring-white" aria-hidden="true" />
                </NavLink>
              </Tooltip>
            )}
            {user && !useWorkspaceHeader && (
              <span
                className="hidden size-9 place-items-center rounded-full bg-[var(--container-blue)] text-sm font-semibold text-brand-primary ring-1 ring-inset ring-brand-primary/15 lg:grid"
                aria-label={user.fullName}
                title={user.fullName}
              >
                {userInitial}
              </span>
            )}
            {useWorkspaceHeader ? (
              <HeaderActionsMenu userInitial={userInitial} userName={user?.fullName} onLogout={handleLogout} />
            ) : (
              <div className="flex items-center gap-1">
                <LanguageSwitcher />
                <NavLink to="/" className="hidden min-h-10 items-center gap-2 rounded-[var(--radius-default)] px-3 text-sm font-medium md:inline-flex">
                  <Home className="size-4" aria-hidden="true" />
                  {t("common.welcome")}
                </NavLink>
                <Button variant="primary" size="sm" onClick={handleLogout}>
                  <LogOut className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{t("common.logout")}</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-[var(--color-border-default)] bg-white/85">
          <nav
            className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6 lg:px-10"
            aria-label={t("a11y.mainNav")}
          >
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={`${basePath}${l.to}`}
                end={l.to === ""}
                className={({ isActive }) =>
                  cn(
                    "relative inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-[var(--radius-md)] px-3 text-sm font-medium transition-colors duration-[var(--motion-fast)]",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
                    isActive
                      ? "bg-[var(--color-primary-soft)] text-brand-primary ring-1 ring-inset ring-brand-primary/20"
                      : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary",
                  )
                }
              >
                {t(l.labelKey)}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <Outlet />
      </main>
    </div>
  );
}
