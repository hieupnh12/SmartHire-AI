import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ElementType } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Bell, Bookmark, Box, BriefcaseBusiness, Building2, CalendarDays, Check, ChevronDown, ChevronRight,
  CircleUserRound, ClipboardCheck, DraftingCompass, Feather, FilePenLine,
  FileText, Gift, Languages, Layers, Lock, LogOut, MapPin, Menu, MessageCircle, Quote, Search, Settings,
  Sparkles, Star, Upload, UserRound, X,
} from "lucide-react";
import type { Notification } from "@/api/types/notification";
import type { PublicJob } from "@/api/types/job";
import { authApi } from "@/api/tenant/authApi";
import { jobApi } from "@/api/tenant/jobApi";
import { landingApi } from "@/api/tenant/landingApi";
import { notificationApi } from "@/api/tenant/notificationApi";
import type { LandingPageConfig } from "@/features/tenant/admin/landing/types/landing";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { formatDateTime, localeLabels, locales, useI18nStore, useLocale, useT, type TranslateFn } from "@/i18n";
import { useNotifications } from "@/hooks/useNotifications";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { workspaceOf } from "@/features/tenant/auth/workspace";
import { localizeNotification } from "@/features/tenant/candidate/shared/utils/localizeNotification";
import { notificationPath } from "@/features/tenant/candidate/shared/utils/notificationPath";
import {
  cvRoleKeys,
  cvStyleKeys,
  getLocalizedCvRole,
  getLocalizedCvStyle,
  type CvStyleKey,
} from "@/features/tenant/candidate/shared/constants/cvTemplates";
import { Skeleton } from "@/components/ux/Skeleton";
import { MobileAppHeaderButton, MobileAppSyncModal } from "@/features/tenant/candidate/shared/components/MobileAppQrModal";
import { useLocalizedLanding } from "@/features/tenant/candidate/jobs/utils/landingLocalization";

const styleIcons: Record<CvStyleKey, ElementType> = { simple: Box, impressive: DraftingCompass, professional: Star };

type MenuKey = "jobs" | "profile" | "tools" | "company";
type MenuItem = { label: string; description?: string; to?: string; icon?: ElementType; requiresAuth?: boolean };
type MenuGroup = { title: string; to?: string; items: MenuItem[] };
type MenuConfig = { label: string; groups: MenuGroup[]; layout?: "cv" };
type Menus = Record<MenuKey, MenuConfig>;

function buildBaseMenus(t: TranslateFn): Omit<Menus, "company"> {
  return {
    jobs: {
      label: t("candidate.core.header.menus.jobs.label"),
      groups: [
        {
          title: t("candidate.core.header.menus.jobs.exploreTitle"),
          items: [
            { label: t("candidate.core.header.menus.jobs.findJobs"), to: "/jobs", icon: Search },
            { label: t("candidate.core.header.menus.jobs.openJobs"), to: "/jobs", icon: BriefcaseBusiness },
            { label: t("candidate.core.header.menus.jobs.savedJobs"), to: "/saved-jobs", icon: Bookmark, requiresAuth: true },
            { label: t("candidate.core.header.menus.jobs.appliedJobs"), to: "/applications", icon: ClipboardCheck, requiresAuth: true },
          ],
        },
        {
          title: t("candidate.core.header.menus.jobs.trackTitle"),
          items: [
            { label: t("candidate.core.header.menus.jobs.assessments"), to: "/assessments", icon: ClipboardCheck, requiresAuth: true },
            { label: t("candidate.core.header.menus.jobs.interviews"), to: "/interviews", icon: MessageCircle, requiresAuth: true },
            { label: t("candidate.core.header.menus.jobs.schedules"), to: "/schedules", icon: CalendarDays, requiresAuth: true },
          ],
        },
      ],
    },
    profile: {
      label: t("candidate.core.header.menus.cv.label"),
      layout: "cv",
      groups: [
        {
          title: t("candidate.core.header.menus.cv.byStyleTitle"),
          to: "/cv-templates",
          items: cvStyleKeys.map((key) => ({
            label: t("candidate.core.header.menus.cv.styleItem", { style: getLocalizedCvStyle(key, t).label }),
            to: `/cv-templates?style=${key}`,
            icon: styleIcons[key],
          })),
        },
        {
          title: t("candidate.core.header.menus.cv.byRoleTitle"),
          to: "/cv-templates",
          items: cvRoleKeys.map((key) => ({
            label: getLocalizedCvRole(key, t).label,
            to: `/cv-templates?position=${key}`,
            icon: BriefcaseBusiness,
          })),
        },
        {
          title: t("candidate.core.header.menus.cv.toolsTitle"),
          items: [
            { label: t("candidate.core.header.menus.cv.manageCv"), to: "/cv", icon: FileText, requiresAuth: true },
            { label: t("candidate.core.header.menus.cv.uploadCv"), to: "/cv", icon: Upload, requiresAuth: true },
            { label: t("candidate.core.header.menus.cv.cvGuide"), to: "/cv-guide", icon: FilePenLine },
            { label: t("candidate.core.header.menus.cv.manageCoverLetter"), to: "/cv", icon: Feather, requiresAuth: true },
            { label: t("candidate.core.header.menus.cv.coverLetterTemplates"), to: "/cv", icon: Feather, requiresAuth: true },
          ],
        },
      ],
    },
    tools: {
      label: t("candidate.core.header.menus.tools.label"),
      groups: [
        {
          title: t("candidate.core.header.menus.tools.candidateToolsTitle"),
          items: [
            { label: t("candidate.core.header.menus.tools.manageCv"), to: "/cv", icon: FileText, requiresAuth: true },
            { label: t("candidate.core.header.menus.tools.aiInterview"), to: "/interviews", icon: Sparkles, requiresAuth: true },
            { label: t("candidate.core.header.menus.tools.interviewSchedules"), to: "/interview-schedules", icon: CalendarDays, requiresAuth: true },
          ],
        },
        {
          title: t("candidate.core.header.menus.tools.updatesTitle"),
          items: [
            { label: t("candidate.core.header.menus.tools.notifications"), to: "/notifications", icon: Bell, requiresAuth: true },
            { label: t("candidate.core.header.menus.tools.trackApplication"), to: "/applications", icon: ClipboardCheck, requiresAuth: true },
          ],
        },
      ],
    },
  };
}

function topValues(values: (string | null | undefined)[], limit: number) {
  const counts = new Map<string, number>();
  for (const value of values) if (value?.trim()) counts.set(value.trim(), (counts.get(value.trim()) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function buildCompanyMenu(t: TranslateFn, landing: LandingPageConfig | undefined, jobs: PublicJob[], loggedIn: boolean): MenuConfig {
  const learn: MenuItem[] = [];
  if (landing?.about?.enabled !== false) {
    learn.push({
      label: t("candidate.core.header.menus.company.aboutLabel"),
      description: landing?.about?.title || t("candidate.core.header.menus.company.aboutDefaultDesc"),
      to: "/career#about",
      icon: Building2,
    });
  }
  if (landing?.benefits?.enabled !== false) {
    learn.push({
      label: t("candidate.core.header.menus.company.benefitsLabel"),
      description: landing?.benefits?.title || t("candidate.core.header.menus.company.benefitsDefaultDesc"),
      to: "/career#benefits",
      icon: Gift,
    });
  }
  if (landing?.testimonials?.enabled !== false) {
    learn.push({
      label: t("candidate.core.header.menus.company.testimonialsLabel"),
      description: landing?.testimonials?.title || t("candidate.core.header.menus.company.testimonialsDefaultDesc"),
      to: "/career#stories",
      icon: Quote,
    });
  }

  const careers: MenuItem[] = [
    ...topValues(jobs.map((job) => job.department), 3).map(([department, count]) => ({
      label: department,
      description: t("candidate.core.header.menus.company.positionsByDept", { count }),
      to: `/jobs?department=${encodeURIComponent(department)}`,
      icon: Layers,
    })),
    ...topValues(jobs.map((job) => job.location), 2).map(([location, count]) => ({
      label: location,
      description: t("candidate.core.header.menus.company.positionsByLocation", { count }),
      to: `/jobs?location=${encodeURIComponent(location)}`,
      icon: MapPin,
    })),
    {
      label: t("candidate.core.header.menus.company.viewAllPositions"),
      description: jobs.length
        ? t("candidate.core.header.menus.company.openPositionsCount", { count: jobs.length })
        : t("candidate.core.header.menus.company.exploreOpenPositions"),
      to: "/jobs",
      icon: BriefcaseBusiness,
    },
  ];
  if (!loggedIn) {
    careers.push({
      label: t("candidate.core.header.menus.company.candidateLogin"),
      description: t("candidate.core.header.menus.company.candidateLoginDesc"),
      to: "/login",
      icon: UserRound,
    });
  }

  return {
    label: t("candidate.core.header.menus.company.label"),
    groups: [
      ...(learn.length ? [{ title: t("candidate.core.header.menus.company.learnTitle"), items: learn }] : []),
      { title: t("candidate.core.header.menus.company.careersTitle"), items: careers },
    ],
  };
}

type Props = {
  tenantName: string;
  tenantCode: string;
  logoUrl?: string | null;
  slogan?: string | null;
  primaryColor: string;
};

export function CareerHeader({ tenantName, tenantCode, logoUrl, slogan, primaryColor }: Props) {
  const t = useT();
  const locale = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const navRef = useRef<HTMLElement>(null);
  const [activeMenu, setActiveMenu] = useState<MenuKey | null>(null);
  const [menuArrowLeft, setMenuArrowLeft] = useState(48);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const showLogo = Boolean(logoUrl && failedLogoUrl !== logoUrl);
  const token = useAuthStore((state) => state.accessToken);
  const storedUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.logout);
  const landingTenant = getTenantIdFromWindow() || "acme";
  const landing = useQuery({ queryKey: ["public-landing", landingTenant], queryFn: landingApi.getPublicLanding, staleTime: 0 });
  const localizedLanding = useLocalizedLanding(landing.data?.data, tenantName);
  const publicJobs = useQuery({ queryKey: ["public-jobs", ""], queryFn: () => jobApi.publicList(), staleTime: 60_000 });
  const menus: Menus = useMemo(
    () => ({ ...buildBaseMenus(t), company: buildCompanyMenu(t, localizedLanding, publicJobs.data?.data ?? [], Boolean(token)) }),
    [t, localizedLanding, publicJobs.data, token],
  );

  const resolvedSlogan = useMemo(() => {
    if (!slogan) return t("candidate.core.header.defaultSlogan");
    if (locale !== "vi") {
      const sNorm = slogan
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[đĐ]/g, "d")
        .toLowerCase()
        .trim();
      if (sNorm.includes("cong tuyen dung nhan tai") || sNorm.includes("cong tuyen dung")) {
        return t("candidate.core.header.defaultSlogan");
      }
    }
    return slogan;
  }, [slogan, locale, t]);
  const profile = useQuery({ queryKey: ["auth", "career-profile"], queryFn: authApi.me, enabled: Boolean(token) && !storedUser, retry: false });
  const user = storedUser ?? profile.data?.data ?? null;
  const notifications = useNotifications(Boolean(token));
  const unreadCount = notifications.data?.filter((item) => !item.readAt).length ?? 0;
  const markRead = useMutation({ mutationFn: notificationApi.markRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: notifications.queryKey.slice(0, 3) }) });
  const isRecruiter = user ? workspaceOf(user.role, user.workspace) === "RECRUITER" : false;
  const recruiterTarget = isRecruiter ? "/recruiter" : "/internal/login";

  useEffect(() => { if (!storedUser && profile.data?.data) setUser(profile.data.data); }, [profile.data, setUser, storedUser]);
  useEffect(() => {
    const close = () => { setActiveMenu(null); setProfileOpen(false); setNotificationsOpen(false); };
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, []);

  const signOut = async () => {
    try { await authApi.logout(); } catch { /* Local logout must still complete. */ }
    const isPublicCareerQuery = (queryKey: readonly unknown[]) => {
      const head = queryKey[0];
      return head === "public-landing" || head === "public-jobs" || head === "public-job";
    };
    void queryClient.cancelQueries({ predicate: (query) => !isPublicCareerQuery(query.queryKey) });
    queryClient.removeQueries({ predicate: (query) => !isPublicCareerQuery(query.queryKey) });
    setProfileOpen(false);
    navigate("/", { replace: true });
    clearAuth({ skipRemote: true });
  };

  const openMenu = (key: MenuKey, trigger: HTMLElement) => {
    const navRect = navRef.current?.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    if (navRect) setMenuArrowLeft(triggerRect.left - navRect.left + triggerRect.width / 2);
    setActiveMenu(key);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border-default)] bg-white shadow-sm">
      <div className="mx-auto flex h-[76px] max-w-[1536px] items-center gap-5 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-3" aria-label={t("seo.career.careersSiteName", { tenantName })}>
          {showLogo ? <img src={logoUrl!} alt="" className="h-11 max-w-36 object-contain" onError={() => setFailedLogoUrl(logoUrl ?? null)} /> : <span className="grid size-11 place-items-center rounded-xl text-lg font-semibold text-white" style={{ backgroundColor: primaryColor }}>{tenantCode.charAt(0).toUpperCase()}</span>}
          <span className="hidden min-w-0 xl:block"><span className="block max-w-44 truncate text-lg font-semibold text-slate-800">{tenantName}</span><span className="block max-w-44 truncate text-[11px] text-slate-500">{resolvedSlogan}</span></span>
        </Link>

        <nav ref={navRef} className="relative hidden h-full flex-1 items-stretch lg:flex" aria-label={t("candidate.core.header.navAria")} onMouseLeave={() => setActiveMenu(null)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActiveMenu(null); }}>
          {(Object.keys(menus) as MenuKey[]).map((key) => {
            const menu = menus[key]; const open = activeMenu === key;
            return <div key={key} className="flex items-stretch" onMouseEnter={(event) => openMenu(key, event.currentTarget)} onFocus={(event) => openMenu(key, event.currentTarget)}>
              <button type="button" aria-expanded={open} aria-controls={`career-menu-${key}`} onClick={() => setActiveMenu(open ? null : key)} className={`flex items-center gap-1.5 border-b-2 px-4 text-sm font-semibold transition-colors ${open ? "border-[var(--color-primary)] text-[var(--color-primary)]" : "border-transparent text-slate-700 hover:text-[var(--color-primary)]"}`}>{menu.label}<ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" /></button>
            </div>;
          })}
          {activeMenu && <MegaMenu menuKey={activeMenu} menus={menus} arrowLeft={menuArrowLeft} loggedIn={Boolean(token)} onNavigate={() => setActiveMenu(null)} />}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher variant="icon" />
          <MobileAppHeaderButton
            tenantName={tenantName}
            tenantCode={tenantCode}
            logoUrl={logoUrl}
            primaryColor={primaryColor}
          />
          {token ? <>
            <div className="relative hidden sm:block" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setNotificationsOpen(false); }}>
              <button type="button" aria-label={unreadCount ? t("candidate.core.header.notifications.unreadAria", { count: unreadCount }) : t("candidate.core.header.notifications.bellAria")} aria-expanded={notificationsOpen} aria-haspopup="dialog" onClick={() => { setNotificationsOpen((value) => !value); setProfileOpen(false); setActiveMenu(null); }} className="relative grid size-11 place-items-center rounded-full bg-slate-50 text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30"><Bell className="size-5" aria-hidden="true" />{Boolean(unreadCount) && <span className="absolute right-0 top-0 grid min-w-5 place-items-center rounded-full bg-[var(--color-error)] px-1 text-[10px] font-semibold leading-5 text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}</button>
              {notificationsOpen && <NotificationPreview items={notifications.data ?? []} loading={notifications.isPending} unreadCount={unreadCount} onClose={() => setNotificationsOpen(false)} onOpen={(item) => {
                if (!item.readAt) markRead.mutate(item.id);
                setNotificationsOpen(false);
                navigate(notificationPath(item.payloadJson) ?? "/notifications");
              }} />}
            </div>
            <div className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setProfileOpen(false); }}>
              <button type="button" aria-expanded={profileOpen} aria-label={t("candidate.core.header.openAccountMenuAria")} onClick={() => { setProfileOpen((value) => !value); setNotificationsOpen(false); setActiveMenu(null); }} className="flex min-h-11 items-center gap-2 rounded-full p-1.5 pr-2 hover:bg-slate-100">
                <Avatar name={user?.fullName} src={user?.avatarUrl} /><ChevronDown className={`size-4 text-slate-500 transition-transform ${profileOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              {profileOpen && <AccountPanel user={user} onClose={() => setProfileOpen(false)} onLogout={() => void signOut()} />}
            </div>
          </> : <button type="button" onClick={() => navigate("/login", { state: { from: { pathname: "/" } } })} className="hidden min-h-10 rounded-lg px-4 text-sm font-semibold text-white shadow-sm sm:inline-flex sm:items-center" style={{ backgroundColor: primaryColor }}>{t("common.login")}</button>}
          <Link to={recruiterTarget} className="hidden min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] lg:inline-flex"><Building2 className="size-4" aria-hidden="true" />{t("roles.recruiter")}</Link>
          <button type="button" aria-expanded={mobileOpen} aria-label={mobileOpen ? t("candidate.core.header.closeMenuAria") : t("candidate.core.header.openMenuAria")} onClick={() => setMobileOpen((value) => !value)} className="grid size-11 place-items-center rounded-full text-slate-700 hover:bg-slate-100 lg:hidden">{mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        </div>
      </div>
      {mobileOpen && <MobileMenu menus={menus} loggedIn={Boolean(token)} tenantName={tenantName} tenantCode={tenantCode} onNavigate={() => setMobileOpen(false)} />}
    </header>
  );
}

const panelWidths: Record<MenuKey, number> = { jobs: 680, profile: 760, tools: 680, company: 720 };

function LoginBadge() {
  const t = useT();
  return <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500"><Lock className="size-3" aria-hidden="true" />{t("candidate.core.header.loginRequired")}</span>;
}

function MegaMenu({ menuKey, menus, arrowLeft, loggedIn, onNavigate }: { menuKey: MenuKey; menus: Menus; arrowLeft: number; loggedIn: boolean; onNavigate: () => void }) {
  const menu = menus[menuKey];
  const contentRef = useRef<HTMLDivElement>(null);
  const previousMenuKey = useRef(menuKey);
  const [panelHeight, setPanelHeight] = useState(0);
  const [leavingMenuKey, setLeavingMenuKey] = useState<MenuKey | null>(null);

  useLayoutEffect(() => {
    if (previousMenuKey.current === menuKey) return;
    setLeavingMenuKey(previousMenuKey.current);
    previousMenuKey.current = menuKey;
    const timer = window.setTimeout(() => setLeavingMenuKey(null), 160);
    return () => window.clearTimeout(timer);
  }, [menuKey]);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const updateHeight = () => setPanelHeight(content.scrollHeight);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(content);
    return () => observer.disconnect();
  }, [menuKey]);

  const menuItem = (item: MenuItem) => {
    const Icon = item.icon;
    const content = <>{Icon && <Icon className="size-5 shrink-0 text-slate-500 transition-colors group-hover:text-[var(--color-primary)]" aria-hidden="true" />}<span className="min-w-0"><span className="block truncate">{item.label}</span>{item.description && <span className="block truncate text-xs font-normal leading-5 text-slate-500">{item.description}</span>}</span>{item.requiresAuth && !loggedIn && <LoginBadge />}</>;
    const className = "group flex min-h-10 w-full items-center gap-3 rounded-md px-2.5 py-1.5 text-left text-[15px] font-medium leading-6 text-slate-700 transition-colors hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-primary)]";
    return item.to
      ? <Link key={`${item.to}-${item.label}`} to={item.to} onClick={onNavigate} className={className}>{content}</Link>
      : <button key={item.label} type="button" onClick={onNavigate} className={className}>{content}</button>;
  };

  const menuContent = (config: MenuConfig) => {
    if (config.layout === "cv") {
      const [styles, positions, tools] = config.groups;
      return <div className="grid grid-cols-[1fr_1.08fr]">
        <div className="space-y-3 p-4 pr-5">{[styles, positions].map((group) => <section key={group.title}><h2 className="mb-1 text-[15px] font-semibold text-[var(--color-primary)]">{group.to ? <Link to={group.to} onClick={onNavigate} className="inline-flex items-center gap-1 hover:underline">{group.title}<ArrowRight className="size-4" aria-hidden="true" /></Link> : <span className="flex items-center gap-1">{group.title}<ArrowRight className="size-4" aria-hidden="true" /></span>}</h2><div>{group.items.map(menuItem)}</div></section>)}</div>
        <section className="border-l border-slate-200 p-4 pl-7"><h2 className="sr-only">{tools.title}</h2><div className="space-y-1">{tools.items.map(menuItem)}</div></section>
      </div>;
    }
    return <div className={`grid ${config.groups.length > 1 ? "grid-cols-2" : ""}`}>{config.groups.map((group, index) => <section key={group.title} className={`p-4 ${index > 0 ? "border-l border-slate-200 pl-7" : "pr-5"}`}><h2 className="mb-1 flex items-center gap-1 text-[15px] font-semibold text-[var(--color-primary)]">{group.title}<ArrowRight className="size-4" aria-hidden="true" /></h2><div>{group.items.map(menuItem)}</div></section>)}</div>;
  };

  return <div id={`career-menu-${menuKey}`} className="career-mega-menu absolute left-0 top-[68px] max-w-[calc(100vw-32px)] rounded-xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.15)]" style={{ width: panelWidths[menuKey], height: panelHeight }}>
    <span className="career-mega-menu-arrow" style={{ left: arrowLeft }} aria-hidden="true" />
    <div className="relative h-full overflow-hidden rounded-xl">
      {leavingMenuKey && <div className="career-mega-menu-content-leaving pointer-events-none absolute inset-x-0 top-0" aria-hidden="true">{menuContent(menus[leavingMenuKey])}</div>}
      <div key={menuKey} ref={contentRef} className="career-mega-menu-content">{menuContent(menu)}</div>
    </div>
  </div>;
}

function NotificationPreview({ items, loading, unreadCount, onClose, onOpen }: { items: Notification[]; loading: boolean; unreadCount: number; onClose: () => void; onOpen: (item: Notification) => void }) {
  const t = useT();
  const locale = useLocale();
  const recent = items.slice(0, 5);
  return <div role="dialog" aria-label={t("candidate.core.header.notifications.recentAria")} className="absolute right-0 top-[calc(100%+10px)] w-[min(390px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]">
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-slate-900">{t("candidate.core.header.notifications.title")}</h2><p className="mt-0.5 text-xs text-slate-500">{unreadCount > 0 ? t("candidate.core.header.notifications.unreadCount", { count: unreadCount }) : t("candidate.core.header.notifications.allRead")}</p></div><span className="grid size-9 place-items-center rounded-full bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><Bell className="size-4" aria-hidden="true" /></span></div>
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
          <span className="sr-only">{t("candidate.core.header.notifications.loading")}</span>
        </div>
      )}
      {!loading && recent.length === 0 && <div className="px-5 py-10 text-center"><Bell className="mx-auto size-7 text-slate-300" aria-hidden="true" /><p className="mt-3 text-sm font-semibold text-slate-700">{t("candidate.core.header.notifications.emptyTitle")}</p><p className="mt-1 text-xs text-slate-500">{t("candidate.core.header.notifications.emptyDesc")}</p></div>}
      {recent.map((item) => {
        const { title, body } = localizeNotification(item, t);
        return <button key={item.id} type="button" onClick={() => onOpen(item)} className={`relative block w-full border-b border-slate-100 px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]/30 ${item.readAt ? "bg-white" : "bg-[var(--color-primary-subtle)]/45"}`}><div className="flex gap-3">{!item.readAt && <span className="mt-2 size-2 shrink-0 rounded-full bg-[var(--color-primary)]" aria-hidden="true" />}<div className="min-w-0 flex-1"><h3 className="line-clamp-1 text-sm font-semibold text-slate-800">{!item.readAt && <span className="sr-only">{t("candidate.core.header.notifications.unreadSr")} </span>}{title}</h3>{body && <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs leading-5 text-slate-600">{body}</p>}<time className="mt-2 block text-[11px] text-slate-400" dateTime={item.createdAt}>{formatDateTime(item.createdAt, { dateStyle: "short", timeStyle: "short" }, locale)}</time></div><ChevronRight className="mt-1 size-4 shrink-0 text-slate-400" aria-hidden="true" /></div></button>;
      })}
    </div>
    <div className="border-t border-slate-100 p-3"><Link to="/notifications" onClick={onClose} className="flex min-h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]">{t("candidate.core.header.notifications.viewAll")}<ArrowRight className="size-4" aria-hidden="true" /></Link></div>
  </div>;
}

function Avatar({ name, src }: { name?: string; src?: string | null }) {
  return src ? <img src={src} alt="" className="size-10 rounded-full border border-slate-200 object-cover" /> : <span className="grid size-10 place-items-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">{name?.split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase() || <CircleUserRound className="size-6" aria-hidden="true" />}</span>;
}

function AccountPanel({ user, onClose, onLogout }: { user: ReturnType<typeof useAuthStore.getState>["user"]; onClose: () => void; onLogout: () => void }) {
  const t = useT();
  return <div className="absolute right-0 top-[calc(100%+10px)] w-[min(390px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]">
    <Link to="/account" onClick={onClose} title={t("candidate.core.header.account.settingsTitle")} className="group flex items-center gap-4 border-b border-slate-100 p-5 transition-colors hover:bg-slate-50"><Avatar name={user?.fullName} src={user?.avatarUrl} /><div className="min-w-0 flex-1"><p className="truncate text-base font-semibold text-slate-800 group-hover:text-[var(--color-primary)]">{user?.fullName || t("roles.candidate")}</p><p className="mt-1 truncate text-sm text-slate-500">{user?.email}</p><p className="mt-1 text-xs text-[var(--color-primary)]">{t("candidate.core.header.account.verified")}</p></div><ChevronRight className="size-5 shrink-0 text-slate-400 group-hover:text-[var(--color-primary)]" aria-hidden="true" /></Link>
    <div className="max-h-[65vh] overflow-y-auto p-3"><AccountSection icon={Settings} title={t("candidate.core.header.account.notificationsAndSchedule")} links={[{ label: t("candidate.core.header.account.notificationsLink"), to: "/notifications?tab=settings" }, { label: t("candidate.core.header.account.schedulesLink"), to: "/schedules" }]} onClose={onClose} /><LanguageSection /></div>
    <div className="border-t border-slate-100 p-3"><button type="button" onClick={onLogout} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-700"><LogOut className="size-5" aria-hidden="true" />{t("common.logout")}</button></div>
  </div>;
}

function AccountSection({ icon: Icon, title, links, onClose }: { icon: ElementType; title: string; links: Array<MenuItem & { to: string }>; onClose: () => void }) {
  return <section className="mb-2"><h2 className="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-slate-800"><Icon className="size-5 text-slate-400" aria-hidden="true" />{title}</h2><div className="ml-8">{links.map((link) => <Link key={link.to + link.label} to={link.to} onClick={onClose} className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-[var(--color-primary)]">{link.label}</Link>)}</div></section>;
}

function LanguageSection() {
  const t = useT();
  const locale = useI18nStore((state) => state.locale);
  const setLocale = useI18nStore((state) => state.setLocale);
  return <section className="mb-2"><h2 className="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-slate-800"><Languages className="size-5 text-slate-400" aria-hidden="true" />{t("common.language")}</h2><div role="radiogroup" aria-label={t("common.language")} className="ml-8 flex flex-wrap gap-2 px-3 py-1">{locales.map((value) => { const selected = value === locale; return <button key={value} type="button" role="radio" aria-checked={selected} onClick={() => setLocale(value)} className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 ${selected ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)] font-semibold text-[var(--color-primary)]" : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[var(--color-primary)]"}`}>{selected && <Check className="size-4" aria-hidden="true" />}{localeLabels[value]}</button>; })}</div></section>;
}

function MobileMenu({ menus, loggedIn, tenantName, tenantCode, onNavigate }: { menus: Menus; loggedIn: boolean; tenantName: string; tenantCode: string; onNavigate: () => void }) {
  const t = useT();
  const [appModalOpen, setAppModalOpen] = useState(false);
  return (
    <>
      <nav aria-label={t("candidate.core.header.mobileMenuAria")} className="max-h-[calc(100vh-76px)] overflow-y-auto border-t border-slate-100 bg-white p-4 lg:hidden">
        <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50/70 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl" aria-hidden="true">📱</span>
            <div>
              <p className="text-xs font-bold text-slate-800">{t("candidate.core.header.mobileAppBannerTitle", { tenantName })}</p>
              <p className="text-[11px] text-slate-500">{t("candidate.core.header.mobileAppBannerSubtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAppModalOpen(true)}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700"
          >
            {t("candidate.core.header.mobileAppBannerAction")}
          </button>
        </div>
        {(Object.keys(menus) as MenuKey[]).map((key) => <section key={key} className="border-b border-slate-100 py-3"><h2 className="px-2 text-sm font-semibold text-slate-800">{menus[key].label}</h2><div className="mt-2 grid gap-1">{menus[key].groups.flatMap((group) => group.items).map((item) => item.to ? <Link key={`${key}-${item.to}-${item.label}`} to={item.to} onClick={onNavigate} className="flex min-h-11 items-center gap-2 rounded-lg px-4 py-3 text-sm text-slate-600 hover:bg-slate-50">{item.label}{item.requiresAuth && !loggedIn && <LoginBadge />}</Link> : <button key={`${key}-${item.label}`} type="button" onClick={onNavigate} className="min-h-11 rounded-lg px-4 py-3 text-left text-sm text-slate-600 hover:bg-slate-50">{item.label}</button>)}</div></section>)}{!loggedIn && <Link to="/login" onClick={onNavigate} className="mt-4 flex min-h-11 items-center justify-center rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-white">{t("common.login")}</Link>}
      </nav>
      <MobileAppSyncModal
        isOpen={appModalOpen}
        onClose={() => setAppModalOpen(false)}
        tenantCode={tenantCode}
        tenantName={tenantName}
      />
    </>
  );
}
