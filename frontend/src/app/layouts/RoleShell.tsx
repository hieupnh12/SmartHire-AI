import { Bell, CircleHelp, Home, LogOut, Search, Sparkles, type LucideIcon } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ux/Button";
import { HeaderActionsMenu } from "@/components/ux/HeaderActionsMenu";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { Tooltip } from "@/components/ux/Tooltip";
import { authApi } from "@/api/tenant/authApi";
import { companyApi } from "@/api/tenant/companyApi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { hasRecruiterFeature, recruiterHomePath, visibleRecruiterNav } from "@/features/tenant/recruiter/permissions";
import { JobNavigationDrawer } from "@/features/tenant/recruiter/jobs/components/JobNavigationDrawer";
import { useT } from "@/i18n";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { getTenantTheme, getTenantThemeStyle } from "@/lib/tenantTheme";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";

type NavItem = {
  to: string;
  labelKey: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  descriptionKey?: string;
  groupId?: string;
  groupLabelKey?: string;
  groupDescriptionKey?: string;
  groupIcon?: LucideIcon;
};

type RoleShellProps = {
  brandKey: "roles.candidate" | "roles.recruiter" | "roles.admin";
  basePath: string;
  links: readonly NavItem[];
};

export function RoleShell({ brandKey, basePath, links }: RoleShellProps) {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const openShortcuts = useUiStore((s) => s.openShortcuts);
  const [isAdminNotificationsOpen, setIsAdminNotificationsOpen] = useState(false);
  const [openAdminGroup, setOpenAdminGroup] = useState<string | null>(null);
  const [failedTenantLogoUrl, setFailedTenantLogoUrl] = useState<string | null>(null);
  const userInitial = user?.fullName.trim().charAt(0).toLocaleUpperCase();
  const isCandidateWorkspace = basePath === "/candidate";
  const isRecruiterWorkspace = basePath === "/recruiter";
  const isRecruiterDashboard = isRecruiterWorkspace && location.pathname === "/recruiter";
  const isRecruiterPipeline = isRecruiterWorkspace && location.pathname === "/recruiter/pipeline";
  const isTenantAdminWorkspace = basePath === "/internal/admin";
  const useWorkspaceHeader = isCandidateWorkspace || isRecruiterWorkspace;
  const tenantTheme = getTenantTheme(getTenantIdFromWindow() ?? "acme");
  const profileQuery = useQuery({
    queryKey: ["tenant-auth-profile", accessToken],
    queryFn: authApi.me,
    enabled: !!accessToken,
    retry: false,
    staleTime: 60_000,
  });
  const companyProfileQuery = useQuery({
    queryKey: ["tenant", "company", "profile"],
    queryFn: companyApi.getProfile,
    enabled: isTenantAdminWorkspace && !!accessToken,
    retry: false,
  });
  const companyProfile = companyProfileQuery.data?.data;
  const tenantLogoUrl = companyProfile?.logoUrl?.trim() || null;
  const tenantDisplayName = companyProfile?.companyName?.trim() || tenantTheme.name;
  const showTenantLogo = !!tenantLogoUrl && failedTenantLogoUrl !== tenantLogoUrl;
  const displayedLinks = isRecruiterWorkspace
    ? accessToken && !user
      ? []
      : visibleRecruiterNav(user?.permissions).filter((item) => item.to !== "")
    : links;
  const showRecruiterNotifications =
    !isRecruiterWorkspace || hasRecruiterFeature(user?.permissions, "NOTIFICATIONS");
  useEffect(() => {
    if (profileQuery.data?.success && profileQuery.data.data) setUser(profileQuery.data.data);
  }, [profileQuery.data, setUser]);
  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };
  const submitWorkspaceSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("workspace-search")?.toString().trim();
    const target = isCandidateWorkspace
      ? "/candidate/jobs"
      : hasRecruiterFeature(user?.permissions, "APPLICANTS")
        ? "/recruiter/applicants"
        : recruiterHomePath(user?.permissions);
    navigate(query ? `${target}?q=${encodeURIComponent(query)}` : target);
  };
  const submitAdminSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("admin-search")?.toString().trim().toLocaleLowerCase() ?? "";
    if (/doanh nghiệp|company|hồ sơ/.test(query)) navigate(`${basePath}/company`);
    else if (/người dùng|thành viên|user|member/.test(query)) navigate(`${basePath}/users`);
    else if (/phân quyền|roles|permission/.test(query)) navigate(`${basePath}/roles`);
    else if (/hệ thống|system|health/.test(query)) navigate(`${basePath}/system`);
    else if (/tài khoản|account|bảo mật|security/.test(query)) navigate(`${basePath}/account`);
    else navigate(basePath);
  };

  if (isTenantAdminWorkspace) {
    const overviewItem = links.find((item) => item.to === "");
    const OverviewIcon = overviewItem?.icon;
    const adminGroups = links.reduce<Array<{ id: string; labelKey: string; descriptionKey?: string; icon: LucideIcon; items: NavItem[] }>>((groups, item) => {
      if (!item.groupId || !item.groupLabelKey || !item.groupIcon) return groups;
      const existingGroup = groups.find((group) => group.id === item.groupId);
      if (existingGroup) existingGroup.items.push(item);
      else groups.push({ id: item.groupId, labelKey: item.groupLabelKey, descriptionKey: item.groupDescriptionKey, icon: item.groupIcon, items: [item] });
      return groups;
    }, []);

    return (
      <div className="tenant-workspace-theme min-h-screen bg-surface-page" style={getTenantThemeStyle(tenantTheme)}>
        <aside
          className="fixed inset-y-0 left-0 z-40 flex w-20 flex-col border-r border-[var(--color-border-default)] bg-white/95 p-3 shadow-sm backdrop-blur-md"
          aria-label={t("a11y.mainNav")}
        >
          <Tooltip content={tenantDisplayName} side="right" className="w-full">
            <button
              type="button"
              onClick={() => navigate(basePath)}
              className={cn(
                "mb-5 grid min-h-12 w-full place-items-center overflow-hidden rounded-xl text-lg font-semibold shadow-[0_10px_20px_-10px_var(--color-primary-shadow)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
                showTenantLogo ? "border border-[var(--color-border-default)] bg-white p-1 hover:bg-[var(--color-surface-alt)]" : "bg-brand-primary text-[var(--color-on-primary)] hover:bg-brand-primary-hover",
              )}
              aria-label={`${tenantDisplayName} · ${t(brandKey)}`}
            >
              {showTenantLogo ? (
                <img
                  src={tenantLogoUrl}
                  alt=""
                  className="size-10 object-contain"
                  onError={() => setFailedTenantLogoUrl(tenantLogoUrl)}
                />
              ) : tenantTheme.code.charAt(0).toLocaleUpperCase()}
            </button>
          </Tooltip>

          <nav className="flex min-h-0 flex-1 flex-col justify-center gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label={t("a11y.mainNav")}>
            {overviewItem && OverviewIcon && (
              <Tooltip content={`${t(overviewItem.labelKey)} · ${t(overviewItem.descriptionKey ?? overviewItem.labelKey)}`} side="right" className="order-3 w-full">
                <NavLink
                  to={basePath}
                  end
                  onClick={() => setOpenAdminGroup(null)}
                  className={({ isActive }) => cn(
                    "flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
                    isActive ? "bg-[var(--color-primary-soft)] text-brand-primary ring-1 ring-inset ring-brand-primary/15" : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary",
                  )}
                >
                  <OverviewIcon className="size-6" aria-hidden="true" />
                  <span className="max-w-full truncate">{t(overviewItem.labelKey)}</span>
                </NavLink>
              </Tooltip>
            )}

            {adminGroups.map((group, index) => {
              const GroupIcon = group.icon;
              const groupIsActive = openAdminGroup === group.id || group.items.some((item) => location.pathname === `${basePath}${item.to}`);
              return (
                <div key={group.id} className="relative" style={{ order: index < 2 ? index + 1 : index + 2 }}>
                  <Tooltip content={`${t(group.labelKey)} · ${t(group.descriptionKey ?? group.labelKey)}`} side="right" disabled={openAdminGroup === group.id} className="w-full">
                    <button
                      type="button"
                      onClick={() => setOpenAdminGroup((current) => current === group.id ? null : group.id)}
                      className={cn(
                        "flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
                        groupIsActive ? "bg-[var(--color-primary-soft)] text-brand-primary ring-1 ring-inset ring-brand-primary/15" : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary",
                      )}
                      aria-label={t(group.labelKey)}
                      aria-haspopup="menu"
                      aria-expanded={openAdminGroup === group.id}
                    >
                      <GroupIcon className="size-6" aria-hidden="true" />
                      <span className="max-w-full truncate">{t(group.labelKey)}</span>
                    </button>
                  </Tooltip>

                  {openAdminGroup === group.id && (
                    <div role="menu" aria-label={t(group.labelKey)} className="fixed left-[5.5rem] top-1/2 z-50 w-[min(22rem,calc(100vw-6.5rem))] -translate-y-1/2 rounded-3xl border border-[var(--color-border-default)] bg-white p-3 shadow-[0_20px_50px_-16px_rgba(15,23,42,0.28)]">
                      <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-outline)]">{t(group.labelKey)}</p>
                      <div className="space-y-1.5">
                        {group.items.map((item) => {
                          const ItemIcon = item.icon;
                          const label = t(item.labelKey);
                          if (item.comingSoon) {
                            return (
                              <button key={item.to} type="button" role="menuitem" disabled className="flex w-full cursor-not-allowed items-center gap-3 rounded-2xl bg-[var(--color-surface-alt)] p-3 text-left opacity-60">
                                {ItemIcon && <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--color-border-default)] bg-white"><ItemIcon className="size-5" aria-hidden="true" /></span>}
                                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{label}</span><span className="mt-0.5 block text-xs text-[var(--color-on-surface-variant)]">Sắp phát triển</span></span>
                              </button>
                            );
                          }
                          return (
                            <NavLink key={item.to} to={`${basePath}${item.to}`} role="menuitem" onClick={() => setOpenAdminGroup(null)} className={({ isActive }) => cn("flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary", isActive ? "border-brand-primary/30 bg-[var(--color-primary-soft)] text-brand-primary" : "border-transparent hover:border-[var(--color-border-default)] hover:bg-[var(--color-surface-alt)]")}>
                              {ItemIcon && <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--color-border-default)] bg-white"><ItemIcon className="size-5" aria-hidden="true" /></span>}
                              <span className="truncate text-sm font-semibold">{label}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="space-y-2 border-t border-[var(--color-border-default)] pt-3">
            <Tooltip content={`${t("common.shortcuts")} (?)`} side="right" className="w-full">
              <button
                type="button"
                onClick={openShortcuts}
                className="grid min-h-11 w-full place-items-center rounded-xl text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
                aria-label={t("common.shortcuts")}
              >
                <CircleHelp className="size-5" aria-hidden="true" />
              </button>
            </Tooltip>
            <div className="flex justify-center">
              <HeaderActionsMenu
                userInitial={userInitial}
                userName={user?.fullName}
                loadingUser={!!accessToken && !user && profileQuery.isPending}
                variant="icon"
                menuSide="right"
                accountPath="/internal/admin/account"
                showHomeLink={false}
                onLogout={handleLogout}
              />
            </div>
          </div>
        </aside>

        <div className="ml-20 min-h-screen">
          <header className="sticky top-0 z-30 border-b border-[var(--color-border-default)] bg-white/90 shadow-sm backdrop-blur-md">
            <div className="grid min-h-14 w-full grid-cols-[2.5rem_minmax(0,40rem)_2.5rem] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
              <span aria-hidden="true" />
              <form className="relative min-w-0 w-full" role="search" onSubmit={submitAdminSearch}>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" aria-hidden="true" />
                <input
                  name="admin-search"
                  type="search"
                  placeholder="Tìm doanh nghiệp, người dùng, hệ thống, tài khoản..."
                  aria-label="Tìm kiếm chức năng quản trị"
                  className="min-h-10 w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-1.5 pl-10 pr-20 text-sm text-[var(--color-on-surface)] outline-none transition-colors placeholder:text-[var(--color-outline)] focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/15"
                />
                <button type="submit" className="absolute right-1.5 top-1/2 min-h-7 -translate-y-1/2 rounded-lg bg-brand-primary px-3 text-xs font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-brand-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-primary">
                  Tìm kiếm
                </button>
              </form>

              <div className="relative justify-self-end">
                <Tooltip content="Thông báo" side="bottom">
                  <button
                    type="button"
                    onClick={() => setIsAdminNotificationsOpen((open) => !open)}
                    className="grid size-10 place-items-center rounded-xl border border-[var(--color-border-default)] bg-white text-[var(--color-on-surface-variant)] shadow-sm transition-colors hover:border-brand-primary/40 hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                    aria-label="Thông báo"
                    aria-haspopup="dialog"
                    aria-expanded={isAdminNotificationsOpen}
                  >
                    <Bell className="size-5" aria-hidden="true" />
                  </button>
                </Tooltip>

                {isAdminNotificationsOpen && (
                  <div role="dialog" aria-label="Thông báo quản trị" className="absolute right-0 top-[calc(100%+10px)] w-[min(22rem,calc(100vw-7rem))] overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-xl">
                    <div className="border-b border-[var(--color-border-default)] px-5 py-4">
                      <h2 className="text-base font-semibold text-[var(--color-on-surface)]">Thông báo</h2>
                      <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">Cập nhật dành cho quản trị viên workspace</p>
                    </div>
                    <div className="px-5 py-8 text-center">
                      <span className="mx-auto grid size-11 place-items-center rounded-full bg-[var(--color-primary-subtle)] text-brand-primary"><Bell className="size-5" aria-hidden="true" /></span>
                      <p className="mt-3 text-sm font-semibold text-[var(--color-on-surface)]">Không có thông báo mới</p>
                      <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">Các cập nhật quản trị sẽ xuất hiện tại đây.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main id="main-content" className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
            <div className="mx-auto max-w-[1456px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("tenant-workspace-theme min-h-screen bg-surface-page", isRecruiterPipeline && "xl:h-dvh xl:overflow-hidden")} style={getTenantThemeStyle(tenantTheme)}>
      <header className="sticky top-0 z-40 border-b border-[var(--color-border-default)] bg-white/85 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            {isRecruiterWorkspace && <JobNavigationDrawer />}
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
            {useWorkspaceHeader && showRecruiterNotifications && (
              <Tooltip content={t("nav.notifications")} side="bottom">
                <NavLink
                  to={`${basePath}/notifications`}
                  className="relative grid size-10 place-items-center rounded-[var(--radius-default)] text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
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
              <HeaderActionsMenu userInitial={userInitial} userName={user?.fullName} loadingUser={!!accessToken && !user && profileQuery.isPending} onLogout={handleLogout} />
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

        {!isRecruiterDashboard && <div className="border-t border-[var(--color-border-default)] bg-white/85">
          <nav
            className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6 lg:px-10"
            aria-label={t("a11y.mainNav")}
          >
            {displayedLinks.map((l) => (
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
        </div>}
      </header>
      <main id="main-content" className={cn("mx-auto", isRecruiterDashboard ? "w-full max-w-none p-0" : isRecruiterPipeline ? "w-full max-w-none px-4 sm:px-6 lg:px-10 xl:h-[calc(100dvh-7.5rem)] xl:overflow-hidden" : "max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10")}>
        <Outlet />
      </main>
    </div>
  );
}
