import { ArrowRight, Bell, CheckCheck, ChevronRight, CircleHelp, Home, LogOut, Search, Sparkles, type LucideIcon } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { workspaceOf } from "@/features/tenant/auth/workspace";
import { Button } from "@/components/ux/Button";
import { HeaderActionsMenu } from "@/components/ux/HeaderActionsMenu";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { Tooltip } from "@/components/ux/Tooltip";
import { authApi } from "@/api/tenant/authApi";
import { companyApi } from "@/api/tenant/companyApi";
import { notificationApi } from "@/api/tenant/notificationApi";
import type { Notification } from "@/api/types/notification";
import { localizeNotification } from "@/features/tenant/candidate/shared/utils/localizeNotification";
import { notificationPath } from "@/features/tenant/candidate/shared/utils/notificationPath";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { hasRecruiterFeature, recruiterHomePath, visibleRecruiterNav } from "@/features/tenant/recruiter/permissions";
import { JobNavigationDrawer } from "@/features/tenant/recruiter/jobs/components/JobNavigationDrawer";
import { AdminGlobalSearch } from "@/features/tenant/admin/components/AdminGlobalSearch";
import { formatDateTime, useLocale, useT } from "@/i18n";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { getTenantTheme, getTenantThemeStyle } from "@/lib/tenantTheme";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";
import { useNotifications } from "@/hooks/useNotifications";
import { Skeleton } from "@/components/ux/Skeleton";

type NavItem = {
  to: string;
  labelKey: string;
  icon?: LucideIcon;
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
  const askConfirm = useUiStore((s) => s.askConfirm);
  const queryClient = useQueryClient();
  const [isAdminNotificationsOpen, setIsAdminNotificationsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [openAdminGroup, setOpenAdminGroup] = useState<string | null>(null);
  const [failedTenantLogoUrl, setFailedTenantLogoUrl] = useState<string | null>(null);
  const userInitial = user?.fullName.trim().charAt(0).toLocaleUpperCase();
  const isCandidateWorkspace = brandKey === "roles.candidate";
  const isRecruiterWorkspace = basePath === "/recruiter";
  const isTenantAdminWorkspace = basePath === "/internal/admin";
  const inbox = useNotifications(isCandidateWorkspace || isRecruiterWorkspace || isTenantAdminWorkspace);
  const unreadCount = inbox.data?.filter(item => !item.readAt).length ?? 0;
  const markRead = useMutation({
    mutationFn: (id: number | string) => notificationApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAllRead = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const isRecruiterDashboard = isRecruiterWorkspace && /^\/recruiter\/?$/.test(location.pathname);
  const isRecruiterQuestionBank = isRecruiterWorkspace && /^\/recruiter\/question-bank(?:\/|$)/.test(location.pathname);
  const isRecruiterJobCreate = isRecruiterWorkspace && /^\/recruiter\/jobs\/new\/?$/.test(location.pathname);
  const isRecruiterJobEdit = isRecruiterWorkspace && /^\/recruiter\/jobs\/\d+\/edit\/?$/.test(location.pathname);
  const isRecruiterJobForm = isRecruiterJobCreate || isRecruiterJobEdit;
  const isRecruiterBoard = isRecruiterWorkspace && /\/jobs\/\d+\/applicants\/?$/.test(location.pathname) && new URLSearchParams(location.search).get("view") === "board";
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
  const recruiterJobId = isRecruiterWorkspace ? location.pathname.match(/^\/recruiter\/jobs\/(\d+)(?:\/|$)/)?.[1] : undefined;
  // Recruitment modules use the selected job.
  const jobScopedNav = new Set([
    "/applicants",
    "/cvs",
    "/rank",
    "/analytics",
    "/assessments",
    "/ai-interviews",
    "/interviews",
    "/schedules",
    "/notifications",
  ]);
  const displayedLinks = isRecruiterWorkspace
    ? isRecruiterJobForm || (accessToken && !user)
      ? []
      : visibleRecruiterNav(user?.permissions).filter((item) => item.to !== "" && (!!recruiterJobId || !jobScopedNav.has(item.to))).map((item) => {
          let to: string = item.to;
          if (item.to === "/jobs") {
            to = recruiterJobId ? `/jobs/${recruiterJobId}` : "";
          } else if (jobScopedNav.has(item.to)) {
            if (recruiterJobId) to = `/jobs/${recruiterJobId}${item.to}`;
            else to = "";
          }
          return { ...item, to };
        })
    : links;
  const showRecruiterNotifications =
    !isRecruiterWorkspace || hasRecruiterFeature(user?.permissions, "NOTIFICATIONS");
  const showAdminBackBanner =
    isRecruiterWorkspace && !!user && workspaceOf(user.role, user.workspace) === "ADMIN";
  useEffect(() => {
    if (profileQuery.data?.success && profileQuery.data.data) setUser(profileQuery.data.data);
  }, [profileQuery.data, setUser]);
  const handleLogout = () => askConfirm({
    title: t("shell.logoutConfirmTitle"),
    confirmLabel: t("common.logout"),
    danger: true,
    onConfirm: () => {
      logout();
      navigate("/", { replace: true });
    },
  });
  const submitWorkspaceSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("workspace-search")?.toString().trim();
    const target = isCandidateWorkspace
      ? "/jobs"
      : hasRecruiterFeature(user?.permissions, "APPLICANTS")
        ? recruiterJobId ? `/recruiter/jobs/${recruiterJobId}/applicants` : "/recruiter"
        : recruiterHomePath(user?.permissions);
    navigate(query ? `${target}?q=${encodeURIComponent(query)}` : target);
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
              const groupIsActive =
                openAdminGroup === group.id ||
                group.items.some((item) =>
                  item.to === "/recruiter" || item.to.startsWith("/recruiter/")
                    ? location.pathname === "/recruiter" || location.pathname.startsWith("/recruiter/")
                    : location.pathname === `${basePath}${item.to}`,
                );
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
                          const isRecruiterWorkspace = item.to === "/recruiter" || item.to.startsWith("/recruiter/");
                          const targetTo = isRecruiterWorkspace ? item.to : `${basePath}${item.to}`;
                          return (
                            <NavLink key={item.to} to={targetTo} role="menuitem" onClick={() => setOpenAdminGroup(null)} className={({ isActive }) => cn("flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary", isActive ? "border-brand-primary/30 bg-[var(--color-primary-soft)] text-brand-primary" : "border-transparent hover:border-[var(--color-border-default)] hover:bg-[var(--color-surface-alt)]")}>
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
              <AdminGlobalSearch basePath={basePath} />

              <div
                className="relative justify-self-end"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsAdminNotificationsOpen(false);
                }}
              >
                <Tooltip content={t("nav.notifications")} side="bottom" disabled={isAdminNotificationsOpen}>
                  <button
                    type="button"
                    onClick={() => setIsAdminNotificationsOpen((open) => !open)}
                    className={cn(
                      "relative grid size-10 place-items-center rounded-xl border border-[var(--color-border-default)] bg-white text-[var(--color-on-surface-variant)] shadow-sm transition-colors hover:border-brand-primary/40 hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
                      isAdminNotificationsOpen && "border-brand-primary bg-[var(--color-primary-subtle)] text-brand-primary",
                    )}
                    aria-label={unreadCount ? t("shell.notificationsUnreadAria", { label: t("nav.notifications"), count: unreadCount }) : t("nav.notifications")}
                    aria-haspopup="dialog"
                    aria-expanded={isAdminNotificationsOpen}
                  >
                    <Bell className="size-5" aria-hidden="true" />
                    {unreadCount > 0 && (
                      <span
                        className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-[var(--color-error)] px-1 text-[10px] font-bold leading-5 text-white shadow-sm"
                        aria-hidden="true"
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                </Tooltip>

                {isAdminNotificationsOpen && (
                  <NotificationPreviewDialog
                    items={inbox.data ?? []}
                    loading={inbox.isPending}
                    unreadCount={unreadCount}
                    targetPath="/recruiter/notifications"
                    onClose={() => setIsAdminNotificationsOpen(false)}
                    onMarkAllRead={() => markAllRead.mutate()}
                    onOpen={(item) => {
                      if (!item.readAt) markRead.mutate(item.id);
                      setIsAdminNotificationsOpen(false);
                      const target = notificationPath(item.payloadJson) ?? "/recruiter/notifications";
                      navigate(target);
                    }}
                  />
                )}
              </div>
            </div>
          </header>

          <main id="main-content" className="px-4 pt-3 pb-8 sm:px-6 sm:pt-3.5 sm:pb-10 lg:px-10">
            <div className="mx-auto max-w-[1456px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (isCandidateWorkspace && location.pathname === "/interviews/demo") {
    return <div className="tenant-workspace-theme min-h-screen bg-surface-page" style={getTenantThemeStyle(tenantTheme)}>
      <main id="main-content" className="mx-auto max-w-[1600px] p-4 sm:p-6"><Outlet /></main>
    </div>;
  }

  return (
    <div className={cn("tenant-workspace-theme min-h-screen bg-surface-page", isRecruiterBoard && "h-dvh overflow-hidden", isRecruiterJobForm && "xl:h-dvh xl:overflow-hidden")} style={getTenantThemeStyle(tenantTheme)}>
      {!isRecruiterQuestionBank && <header className="sticky top-0 z-40 border-b border-[var(--color-border-default)] bg-white/85 shadow-sm backdrop-blur-md">
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
                data-search-input
                name="workspace-search"
                type="search"
                placeholder={isCandidateWorkspace ? t("shell.workspaceCandidateSearchPlaceholder", { search: t("common.search") }) : t("shell.workspaceRecruiterSearchPlaceholder", { search: t("common.search") })}
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
              <div
                className="relative"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setNotificationsOpen(false);
                }}
              >
                <Tooltip content={t("nav.notifications")} side="bottom" disabled={notificationsOpen}>
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen((v) => !v)}
                    className={cn(
                      "relative grid size-10 place-items-center rounded-xl border border-[var(--color-border-default)] bg-white text-[var(--color-on-surface-variant)] shadow-sm transition-colors hover:border-brand-primary/40 hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
                      notificationsOpen && "border-brand-primary bg-[var(--color-primary-subtle)] text-brand-primary",
                    )}
                    aria-label={unreadCount ? t("shell.notificationsUnreadAria", { label: t("nav.notifications"), count: unreadCount }) : t("nav.notifications")}
                    aria-haspopup="dialog"
                    aria-expanded={notificationsOpen}
                  >
                    <Bell className="size-5" aria-hidden="true" />
                    {unreadCount > 0 && (
                      <span
                        className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-[var(--color-error)] px-1 text-[10px] font-bold leading-5 text-white shadow-sm"
                        aria-hidden="true"
                      >
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                </Tooltip>

                {notificationsOpen && (
                  <NotificationPreviewDialog
                    items={inbox.data ?? []}
                    loading={inbox.isPending}
                    unreadCount={unreadCount}
                    targetPath={isRecruiterWorkspace ? "/recruiter/notifications" : "/notifications"}
                    onClose={() => setNotificationsOpen(false)}
                    onMarkAllRead={() => markAllRead.mutate()}
                    onOpen={(item) => {
                      if (!item.readAt) markRead.mutate(item.id);
                      setNotificationsOpen(false);
                      const target = notificationPath(item.payloadJson) ?? (isRecruiterWorkspace ? "/recruiter/notifications" : "/notifications");
                      navigate(target);
                    }}
                  />
                )}
              </div>
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
              <HeaderActionsMenu
                userInitial={userInitial}
                userName={user?.fullName}
                loadingUser={!!accessToken && !user && profileQuery.isPending}
                notificationsPath={isRecruiterWorkspace ? "/recruiter/notifications?tab=settings" : "/notifications?tab=settings"}
                onLogout={handleLogout}
              />
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

        {!isRecruiterDashboard && displayedLinks.length > 0 && (
          <div className="border-t border-[var(--color-border-default)] bg-white/85">
            <nav
              className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6 lg:px-10"
              aria-label={t("a11y.mainNav")}
            >
              {displayedLinks.map((l) => (
                <NavLink
                  key={`${l.labelKey}:${l.to}`}
                  to={`${basePath}${l.to}`}
                  end={l.to === "" || (isRecruiterWorkspace && !!recruiterJobId && l.to === `/jobs/${recruiterJobId}`)}
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
        )}
      </header>}
      {showAdminBackBanner && !isRecruiterQuestionBank && (
        <div
          className="border-b border-[var(--color-border-default)] bg-[var(--color-primary-soft)]/60 px-4 py-2 text-center text-sm text-[var(--color-on-surface)] sm:px-6 lg:px-10"
          role="status"
        >
          {t("shell.adminBackBanner")}{" "}
          <Link
            to="/internal/admin"
            className="font-semibold text-brand-primary underline underline-offset-2 hover:text-brand-primary-hover"
          >
            {t("shell.adminBackLink")}
          </Link>
        </div>
      )}
      <main id="main-content" className={cn("mx-auto", isRecruiterDashboard ? "w-full max-w-none p-0" : isRecruiterJobForm ? "w-full max-w-[1440px] px-4 py-4 sm:px-5 sm:py-5 lg:px-6 xl:h-[calc(100dvh-4rem)] xl:overflow-hidden" : isRecruiterBoard ? "flex h-[calc(100dvh-7.5rem)] w-full min-w-0 max-w-full flex-col overflow-hidden px-4 sm:px-6 lg:px-10" : "max-w-[1440px] px-4 pt-3 pb-8 sm:px-6 sm:pt-3.5 sm:pb-10 lg:px-10")}>
        <Outlet />
      </main>
    </div>
  );
}

function NotificationPreviewDialog({
  items,
  loading,
  unreadCount,
  targetPath,
  onClose,
  onOpen,
  onMarkAllRead,
}: {
  items: Notification[];
  loading: boolean;
  unreadCount: number;
  targetPath: string;
  onClose: () => void;
  onOpen: (item: Notification) => void;
  onMarkAllRead: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const recent = items.slice(0, 5);
  return (
    <div
      role="dialog"
      aria-label={t("shell.notificationsRecentAria")}
      className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(400px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-semibold text-slate-900">{t("nav.notifications")}</h2>
          <p className="mt-0.5 text-xs">
            {unreadCount > 0 ? (
              <span className="font-bold text-[var(--color-error)]">{t("shell.notificationsUnreadCount", { count: unreadCount })}</span>
            ) : (
              <span className="text-slate-500">{t("shell.notificationsAllRead")}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]"
              title={t("shell.notificationsMarkAllReadTitle")}
            >
              <CheckCheck className="size-3.5" aria-hidden="true" />
              {t("shell.notificationsMarkAllRead")}
            </button>
          )}
          <span className="grid size-9 place-items-center rounded-full bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
            <Bell className="size-4" aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className="max-h-[min(60vh,420px)] overflow-y-auto">
        {loading && (
          <div className="space-y-3 p-4" role="status" aria-busy="true">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="mt-2 size-2 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
            <span className="sr-only">{t("shell.notificationsLoading")}</span>
          </div>
        )}
        {!loading && recent.length === 0 && (
          <div className="px-5 py-10 text-center">
            <Bell className="mx-auto size-7 text-slate-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-700">{t("shell.notificationsEmptyTitle")}</p>
            <p className="mt-1 text-xs text-slate-500">{t("shell.notificationsEmptyDesc")}</p>
          </div>
        )}
        {recent.map((item) => {
          const unread = !item.readAt;
          const { title, body, jobTitle } = localizeNotification(item, t);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item)}
              className={cn(
                "relative block w-full border-b border-slate-100 px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]/30",
                unread ? "bg-red-50/40" : "bg-white",
              )}
            >
              <div className="flex gap-3">
                {unread && <span className="mt-2 size-2 shrink-0 rounded-full bg-[var(--color-error)]" aria-hidden="true" />}
                <div className="min-w-0 flex-1">
                  {jobTitle && (
                    <span className="mb-1 inline-block max-w-full truncate rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                      {jobTitle}
                    </span>
                  )}
                  <h3 className={cn("line-clamp-1 text-sm leading-5", unread ? "font-bold text-[var(--color-error)]" : "font-semibold text-slate-800")}>
                    {unread && <span className="sr-only">{t("shell.notificationsUnreadSr")} </span>}
                    {title}
                  </h3>
                  {body && <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs leading-5 text-slate-600">{body}</p>}
                  <time className="mt-2 block text-[11px] text-slate-400" dateTime={item.createdAt}>
                    {formatDateTime(item.createdAt, { dateStyle: "short", timeStyle: "short" }, locale)}
                  </time>
                </div>
                <ChevronRight className="mt-1 size-4 shrink-0 text-slate-400" aria-hidden="true" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="border-t border-slate-100 p-3">
        <Link
          to={targetPath}
          onClick={onClose}
          className="flex min-h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]"
        >
          {t("shell.notificationsViewAll")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
