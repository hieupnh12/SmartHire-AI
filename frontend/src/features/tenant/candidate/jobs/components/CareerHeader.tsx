import { useEffect, useLayoutEffect, useRef, useState, type ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Bell, Box, BriefcaseBusiness, Building2, CalendarDays, ChevronDown,
  CircleUserRound, ClipboardCheck, DraftingCompass, Feather, FilePenLine,
  FileText, Gift, LogOut, Menu, MessageCircle, Search, Settings,
  ShieldCheck, Sparkles, Star, Upload, UserRound, X,
} from "lucide-react";
import type { Notification } from "@/api/types/notification";
import { authApi } from "@/api/tenant/authApi";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { useNotifications } from "@/hooks/useNotifications";
import { buildPlatformUrl } from "@/lib/tenant";
import { cvRoleKeys, cvRoles, cvStyleKeys, cvStyles, type CvStyleKey } from "@/features/tenant/candidate/shared/constants/cvTemplates";

const styleIcons: Record<CvStyleKey, ElementType> = { simple: Box, impressive: DraftingCompass, professional: Star };

type MenuKey = "jobs" | "profile" | "tools" | "company";
type MenuItem = { label: string; to?: string; icon?: ElementType };
type MenuGroup = { title: string; to?: string; items: MenuItem[] };
type MenuConfig = { label: string; groups: MenuGroup[]; layout?: "cv" };

const menus: Record<MenuKey, MenuConfig> = {
  jobs: {
    label: "Việc làm",
    groups: [
      { title: "Khám phá việc làm", items: [{ label: "Tìm việc làm", to: "/jobs", icon: Search }, { label: "Việc làm đang tuyển", to: "/jobs", icon: BriefcaseBusiness }, { label: "Đơn đã ứng tuyển", to: "/applications", icon: ClipboardCheck }] },
      { title: "Theo dõi tiến trình", items: [{ label: "Bài đánh giá", to: "/assessments", icon: ClipboardCheck }, { label: "Phỏng vấn", to: "/interviews", icon: MessageCircle }, { label: "Lịch của tôi", to: "/schedules", icon: CalendarDays }] },
    ],
  },
  profile: {
    label: "Tạo CV",
    layout: "cv",
    groups: [
      { title: "Mẫu CV theo style", to: "/cv-templates", items: cvStyleKeys.map((key) => ({ label: `Mẫu CV ${cvStyles[key].label}`, to: `/cv-templates?style=${key}`, icon: styleIcons[key] })) },
      { title: "Mẫu CV theo vị trí IT", to: "/cv-templates", items: cvRoleKeys.map((key) => ({ label: cvRoles[key].label, to: `/cv-templates?position=${key}`, icon: BriefcaseBusiness })) },
      { title: "Công cụ CV", items: [{ label: "Quản lý CV", to: "/cv", icon: FileText }, { label: "Tải CV lên", to: "/cv", icon: Upload }, { label: "Hướng dẫn viết CV", to: "/cv", icon: FilePenLine }, { label: "Quản lý Cover Letter", to: "/cv", icon: Feather }, { label: "Mẫu Cover Letter", to: "/cv", icon: Feather }] },
    ],
  },
  tools: {
    label: "Công cụ",
    groups: [
      { title: "Công cụ ứng viên", items: [{ label: "Quản lý CV", to: "/cv", icon: FileText }, { label: "Phỏng vấn AI", to: "/interviews", icon: Sparkles }, { label: "Lịch phỏng vấn", to: "/schedules", icon: CalendarDays }] },
      { title: "Cập nhật", items: [{ label: "Thông báo", to: "/notifications", icon: Bell }, { label: "Theo dõi hồ sơ", to: "/applications", icon: ClipboardCheck }] },
    ],
  },
  company: {
    label: "Về doanh nghiệp",
    groups: [
      { title: "Tìm hiểu doanh nghiệp", items: [{ label: "Giới thiệu", to: "/career#about", icon: Building2 }, { label: "Đãi ngộ", to: "/career#benefits", icon: Gift }] },
      { title: "Bắt đầu", items: [{ label: "Xem vị trí đang tuyển", to: "/jobs", icon: BriefcaseBusiness }, { label: "Đăng nhập ứng viên", to: "/login", icon: UserRound }] },
    ],
  },
};

type Props = {
  tenantName: string;
  tenantCode: string;
  logoUrl?: string | null;
  slogan?: string | null;
  primaryColor: string;
};

export function CareerHeader({ tenantName, tenantCode, logoUrl, slogan, primaryColor }: Props) {
  const navigate = useNavigate();
  const navRef = useRef<HTMLElement>(null);
  const [activeMenu, setActiveMenu] = useState<MenuKey | null>(null);
  const [menuArrowLeft, setMenuArrowLeft] = useState(48);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const token = useAuthStore((state) => state.accessToken);
  const storedUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearAuth = useAuthStore((state) => state.logout);
  const profile = useQuery({ queryKey: ["auth", "career-profile"], queryFn: authApi.me, enabled: Boolean(token) && !storedUser, retry: false });
  const user = storedUser ?? profile.data?.data ?? null;
  const notifications = useNotifications(Boolean(token));
  const unreadCount = notifications.data?.filter((item) => !item.readAt).length ?? 0;
  const recruiterUrl = buildPlatformUrl("/");

  useEffect(() => { if (!storedUser && profile.data?.data) setUser(profile.data.data); }, [profile.data, setUser, storedUser]);
  useEffect(() => {
    const close = () => { setActiveMenu(null); setProfileOpen(false); setNotificationsOpen(false); };
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, []);

  const signOut = async () => {
    try { await authApi.logout(); } catch { /* Local logout must still complete. */ }
    clearAuth();
    setProfileOpen(false);
    navigate("/career", { replace: true });
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
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-3" aria-label={`${tenantName} Careers`}>
          {logoUrl ? <img src={logoUrl} alt="" className="h-11 max-w-36 object-contain" /> : <span className="grid size-11 place-items-center rounded-xl text-lg font-semibold text-white" style={{ backgroundColor: primaryColor }}>{tenantCode.charAt(0).toUpperCase()}</span>}
          <span className="hidden min-w-0 xl:block"><span className="block max-w-44 truncate text-lg font-semibold text-slate-800">{tenantName}</span><span className="block max-w-44 truncate text-[11px] text-slate-500">{slogan || "Cổng tuyển dụng nhân tài"}</span></span>
        </Link>

        <nav ref={navRef} className="relative hidden h-full flex-1 items-stretch lg:flex" aria-label="Điều hướng tuyển dụng" onMouseLeave={() => setActiveMenu(null)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActiveMenu(null); }}>
          {(Object.keys(menus) as MenuKey[]).map((key) => {
            const menu = menus[key]; const open = activeMenu === key;
            return <div key={key} className="flex items-stretch" onMouseEnter={(event) => openMenu(key, event.currentTarget)} onFocus={(event) => openMenu(key, event.currentTarget)}>
              <button type="button" aria-expanded={open} aria-controls={`career-menu-${key}`} onClick={() => setActiveMenu(open ? null : key)} className={`flex items-center gap-1.5 border-b-2 px-4 text-sm font-semibold transition-colors ${open ? "border-[var(--color-primary)] text-[var(--color-primary)]" : "border-transparent text-slate-700 hover:text-[var(--color-primary)]"}`}>{menu.label}<ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" /></button>
            </div>;
          })}
          {activeMenu && <MegaMenu menuKey={activeMenu} menu={menus[activeMenu]} arrowLeft={menuArrowLeft} onNavigate={() => setActiveMenu(null)} />}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher variant="icon" />
          {token ? <>
            <div className="relative hidden sm:block" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setNotificationsOpen(false); }}>
              <button type="button" aria-label={unreadCount ? `Thông báo, ${unreadCount} chưa đọc` : "Thông báo"} aria-expanded={notificationsOpen} aria-haspopup="dialog" onClick={() => { setNotificationsOpen((value) => !value); setProfileOpen(false); setActiveMenu(null); }} className="relative grid size-11 place-items-center rounded-full bg-slate-50 text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30"><Bell className="size-5" aria-hidden="true" />{Boolean(unreadCount) && <span className="absolute right-0 top-0 grid min-w-5 place-items-center rounded-full bg-[var(--color-error)] px-1 text-[10px] font-semibold leading-5 text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}</button>
              {notificationsOpen && <NotificationPreview items={notifications.data ?? []} loading={notifications.isPending} unreadCount={unreadCount} onClose={() => setNotificationsOpen(false)} />}
            </div>
            <HeaderIcon to="/applications" label="Hồ sơ ứng tuyển" icon={MessageCircle} />
            <div className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setProfileOpen(false); }}>
              <button type="button" aria-expanded={profileOpen} aria-label="Mở menu tài khoản" onClick={() => { setProfileOpen((value) => !value); setNotificationsOpen(false); setActiveMenu(null); }} className="flex min-h-11 items-center gap-2 rounded-full p-1.5 pr-2 hover:bg-slate-100">
                <Avatar name={user?.fullName} src={user?.avatarUrl} /><ChevronDown className={`size-4 text-slate-500 transition-transform ${profileOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              {profileOpen && <AccountPanel user={user} onClose={() => setProfileOpen(false)} onLogout={() => void signOut()} />}
            </div>
          </> : <button type="button" onClick={() => navigate("/login", { state: { from: { pathname: "/" } } })} className="hidden min-h-10 rounded-lg px-4 text-sm font-semibold text-white shadow-sm sm:inline-flex sm:items-center" style={{ backgroundColor: primaryColor }}>Đăng nhập</button>}
          <a href={recruiterUrl} className="hidden min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] lg:inline-flex"><Building2 className="size-4" aria-hidden="true" />Nhà tuyển dụng</a>
          <button type="button" aria-expanded={mobileOpen} aria-label={mobileOpen ? "Đóng menu" : "Mở menu"} onClick={() => setMobileOpen((value) => !value)} className="grid size-11 place-items-center rounded-full text-slate-700 hover:bg-slate-100 lg:hidden">{mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        </div>
      </div>
      {mobileOpen && <MobileMenu loggedIn={Boolean(token)} onNavigate={() => setMobileOpen(false)} />}
    </header>
  );
}

const panelWidths: Record<MenuKey, number> = { jobs: 680, profile: 760, tools: 680, company: 640 };

function MegaMenu({ menuKey, menu, arrowLeft, onNavigate }: { menuKey: MenuKey; menu: MenuConfig; arrowLeft: number; onNavigate: () => void }) {
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
    const content = <>{Icon && <Icon className="size-5 shrink-0 text-slate-500 transition-colors group-hover:text-[var(--color-primary)]" aria-hidden="true" />}<span>{item.label}</span></>;
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

function HeaderIcon({ to, label, icon: Icon, count }: { to: string; label: string; icon: ElementType; count?: number }) {
  return <Link to={to} aria-label={count ? `${label}, ${count} chưa đọc` : label} className="relative hidden size-11 place-items-center rounded-full bg-slate-50 text-slate-700 hover:bg-slate-100 sm:grid"><Icon className="size-5" aria-hidden="true" />{Boolean(count) && <span className="absolute right-0 top-0 grid min-w-5 place-items-center rounded-full bg-[var(--color-error)] px-1 text-[10px] font-semibold leading-5 text-white">{count! > 9 ? "9+" : count}</span>}</Link>;
}

function NotificationPreview({ items, loading, unreadCount, onClose }: { items: Notification[]; loading: boolean; unreadCount: number; onClose: () => void }) {
  const recent = items.slice(0, 5);
  return <div role="dialog" aria-label="Thông báo gần đây" className="absolute right-0 top-[calc(100%+10px)] w-[min(390px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]">
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-slate-900">Thông báo</h2><p className="mt-0.5 text-xs text-slate-500">{unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Bạn đã xem hết thông báo mới"}</p></div><span className="grid size-9 place-items-center rounded-full bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><Bell className="size-4" aria-hidden="true" /></span></div>
    <div className="max-h-[min(60vh,420px)] overflow-y-auto">
      {loading && <p className="p-5 text-sm text-slate-500" role="status">Đang tải thông báo…</p>}
      {!loading && recent.length === 0 && <div className="px-5 py-10 text-center"><Bell className="mx-auto size-7 text-slate-300" aria-hidden="true" /><p className="mt-3 text-sm font-semibold text-slate-700">Chưa có thông báo</p><p className="mt-1 text-xs text-slate-500">Cập nhật về hồ sơ và phỏng vấn sẽ xuất hiện tại đây.</p></div>}
      {recent.map((item) => <article key={item.id} className={`relative border-b border-slate-100 px-5 py-4 last:border-b-0 ${item.readAt ? "bg-white" : "bg-[var(--color-primary-subtle)]/45"}`}><div className="flex gap-3">{!item.readAt && <span className="mt-2 size-2 shrink-0 rounded-full bg-[var(--color-primary)]" aria-label="Chưa đọc" />}<div className="min-w-0 flex-1"><h3 className="line-clamp-1 text-sm font-semibold text-slate-800">{item.title}</h3>{item.body && <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs leading-5 text-slate-600">{item.body}</p>}<time className="mt-2 block text-[11px] text-slate-400" dateTime={item.createdAt}>{formatNotificationTime(item.createdAt)}</time></div></div></article>)}
    </div>
    <div className="border-t border-slate-100 p-3"><Link to="/notifications" onClick={onClose} className="flex min-h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]">Xem tất cả thông báo<ArrowRight className="size-4" aria-hidden="true" /></Link></div>
  </div>;
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

function Avatar({ name, src }: { name?: string; src?: string | null }) {
  return src ? <img src={src} alt="" className="size-10 rounded-full border border-slate-200 object-cover" /> : <span className="grid size-10 place-items-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">{name?.split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase() || <CircleUserRound className="size-6" aria-hidden="true" />}</span>;
}

function AccountPanel({ user, onClose, onLogout }: { user: ReturnType<typeof useAuthStore.getState>["user"]; onClose: () => void; onLogout: () => void }) {
  return <div className="absolute right-0 top-[calc(100%+10px)] w-[min(390px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]">
    <div className="flex gap-4 border-b border-slate-100 p-5"><Avatar name={user?.fullName} src={user?.avatarUrl} /><div className="min-w-0"><p className="truncate text-base font-semibold text-slate-800">{user?.fullName || "Ứng viên"}</p><p className="mt-1 truncate text-sm text-slate-500">{user?.email}</p><p className="mt-1 text-xs text-[var(--color-primary)]">Tài khoản đã xác thực</p></div></div>
    <div className="max-h-[65vh] overflow-y-auto p-3"><AccountSection icon={BriefcaseBusiness} title="Quản lý tìm việc" links={[{ label: "Tìm việc làm", to: "/jobs" }, { label: "Việc làm đã ứng tuyển", to: "/applications" }, { label: "Theo dõi tiến trình", to: "/workspace" }]} onClose={onClose} /><AccountSection icon={FileText} title="Quản lý CV" links={[{ label: "CV của tôi", to: "/cv" }, { label: "Bài đánh giá", to: "/assessments" }, { label: "Phỏng vấn", to: "/interviews" }]} onClose={onClose} /><AccountSection icon={Settings} title="Thông báo & lịch" links={[{ label: "Thông báo", to: "/notifications" }, { label: "Lịch của tôi", to: "/schedules" }]} onClose={onClose} /><Link to="/workspace" onClick={onClose} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ShieldCheck className="size-5 text-slate-400" aria-hidden="true" />Không gian ứng viên</Link></div>
    <div className="border-t border-slate-100 p-3"><button type="button" onClick={onLogout} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-700"><LogOut className="size-5" aria-hidden="true" />Đăng xuất</button></div>
  </div>;
}

function AccountSection({ icon: Icon, title, links, onClose }: { icon: ElementType; title: string; links: Array<MenuItem & { to: string }>; onClose: () => void }) {
  return <section className="mb-2"><h2 className="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-slate-800"><Icon className="size-5 text-slate-400" aria-hidden="true" />{title}</h2><div className="ml-8">{links.map((link) => <Link key={link.to + link.label} to={link.to} onClick={onClose} className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-[var(--color-primary)]">{link.label}</Link>)}</div></section>;
}

function MobileMenu({ loggedIn, onNavigate }: { loggedIn: boolean; onNavigate: () => void }) {
  return <nav aria-label="Điều hướng di động" className="max-h-[calc(100vh-76px)] overflow-y-auto border-t border-slate-100 bg-white p-4 lg:hidden">{(Object.keys(menus) as MenuKey[]).map((key) => <section key={key} className="border-b border-slate-100 py-3"><h2 className="px-2 text-sm font-semibold text-slate-800">{menus[key].label}</h2><div className="mt-2 grid gap-1">{menus[key].groups.flatMap((group) => group.items).map((item) => item.to ? <Link key={`${key}-${item.to}-${item.label}`} to={item.to} onClick={onNavigate} className="min-h-11 rounded-lg px-4 py-3 text-sm text-slate-600 hover:bg-slate-50">{item.label}</Link> : <button key={`${key}-${item.label}`} type="button" onClick={onNavigate} className="min-h-11 rounded-lg px-4 py-3 text-left text-sm text-slate-600 hover:bg-slate-50">{item.label}</button>)}</div></section>)}{!loggedIn && <Link to="/login" onClick={onNavigate} className="mt-4 flex min-h-11 items-center justify-center rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-white">Đăng nhập</Link>}</nav>;
}
