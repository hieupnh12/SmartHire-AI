import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { MasterAdminSidebar, ToggleMenuIcon } from "./MasterAdminSidebar";
import {
  LogOut,
  CircleUserRound,
  ChevronDown,
  ShieldCheck,
  Eye,
  Bell,
} from "lucide-react";
import { masterAuthApi } from "@/api/master/masterAuthApi";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { useT, type TranslateFn } from "@/i18n";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";

function getAdminPageTitle(pathname: string, t: TranslateFn): string {
  if (pathname.startsWith("/admin/dashboard")) return t("master.shell.titles.dashboard");
  if (pathname.startsWith("/admin/analytics")) return t("master.shell.titles.analytics");
  if (pathname.startsWith("/admin/tenants/directory") || pathname.startsWith("/admin/tenants/overview")) return t("master.shell.titles.tenantDirectory");
  if (pathname.startsWith("/admin/tenants/create")) return t("master.shell.titles.tenantCreate");
  if (pathname.startsWith("/admin/tenants/provisioning")) return t("master.shell.titles.tenantProvisioning");
  if (pathname.startsWith("/admin/tenants")) return t("master.shell.titles.tenants");
  if (pathname.startsWith("/admin/subscriptions")) return t("master.shell.titles.subscriptions");
  if (pathname.startsWith("/admin/billing/invoices")) return t("master.shell.titles.invoices");
  if (pathname.startsWith("/admin/billing/vnpay")) return t("master.shell.titles.vnpay");
  if (pathname.startsWith("/admin/billing")) return t("master.shell.titles.billing");
  if (pathname.startsWith("/admin/contracts/create")) return t("master.shell.titles.contractCreate");
  if (pathname.startsWith("/admin/contracts")) return t("master.shell.titles.contracts");
  if (pathname.startsWith("/admin/leads")) return t("master.shell.titles.leads");
  if (pathname.startsWith("/admin/system/ai-config")) return t("master.shell.titles.aiConfig");
  if (pathname.startsWith("/admin/system/audit-logs")) return t("master.shell.titles.auditLogs");
  if (pathname.startsWith("/admin/system")) return t("master.shell.titles.system");
  if (pathname.startsWith("/admin/account/profile")) return t("master.shell.titles.accountProfile");
  if (pathname.startsWith("/admin/account/security")) return t("master.shell.titles.accountSecurity");
  if (pathname.startsWith("/admin/account/accessibility")) return t("master.shell.titles.accountAccessibility");
  if (pathname.startsWith("/admin/account/notifications")) return t("master.shell.titles.accountNotifications");
  if (pathname.startsWith("/admin/account")) return t("master.shell.titles.account");
  return t("master.shell.titles.platformAdmin");
}

export function MasterAdminLayout() {
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const askConfirm = useUiStore((state) => state.askConfirm);
  const pageTitle = getAdminPageTitle(location.pathname, t);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("master_refresh_token");
      await masterAuthApi.logout(refreshToken);
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem("master_access_token");
      localStorage.removeItem("master_refresh_token");
      navigate("/admin/login", { replace: true });
    }
  };

  // Desktop sidebar state: default true, saved in localStorage
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("master_sidebar_open");
      if (saved !== null) return saved === "true";
      return window.innerWidth >= 1024;
    }
    return true;
  });

  // Mobile drawer state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("master_sidebar_open", String(isSidebarOpen));
  }, [isSidebarOpen]);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Close on Escape key
  useEffect(() => {
    if (!isMobileOpen) return;
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  const handleToggle = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsSidebarOpen((prev) => !prev);
    }
  };

  // Account dropdown state & outside click / escape handling
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAccountOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setIsAccountOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountOpen]);

  // Close account dropdown on route change
  useEffect(() => {
    setIsAccountOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-dvh min-w-0 bg-[#f8fafc] font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Full-Height Sidebar (inset-y-0) */}
      <MasterAdminSidebar
        isOpen={isSidebarOpen}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />

      {/* Mobile Overlay Backdrop */}
      {isMobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px] md:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-label={t("master.shell.closeAdminNav")}
        />
      )}

      {/* Main Content Column (shifts right when sidebar is open) */}
      <div
        className={cn(
          "flex min-h-dvh flex-col transition-[padding] duration-200 ease-in-out",
          isSidebarOpen ? "md:pl-[260px]" : "md:pl-0"
        )}
      >
        {/* Top Header of Main Area (scrolls with page, soft elevated with blurred drop shadow) */}
        <header className="relative z-20 flex h-16 w-full items-center justify-between bg-white pl-1.5 sm:pl-2 pr-4 sm:pr-6 lg:pr-8 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),0_2px_4px_-1px_rgba(0,0,0,0.03)] border-b border-slate-100/80 transition-shadow">
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* 3-bar Menu Toggle Button (sits close to edge, larger size-7) */}
            <button
              type="button"
              onClick={handleToggle}
              className="flex size-10 items-center justify-center text-slate-700 hover:text-blue-600 transition-colors focus-visible:outline-none"
              aria-label={isSidebarOpen ? t("master.shell.collapseSidebar") : t("master.shell.expandSidebar")}
              title={isSidebarOpen ? t("master.shell.collapseSidebar") : t("master.shell.expandSidebar")}
            >
              <ToggleMenuIcon className="size-7" />
            </button>

            {/* Page Title & Context */}
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight sm:text-lg">
                {pageTitle}
              </h2>
            </div>
          </div>

          {/* Top Header Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dynamic Page Action Portal Slot */}
            <div id="master-header-actions-portal" className="flex items-center gap-2" />

            <LanguageSwitcher variant="icon" />

            {/* Account Dropdown */}
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => setIsAccountOpen((prev) => !prev)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-2xs transition-all hover:bg-slate-50 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  isAccountOpen && "border-blue-500 bg-blue-50/40 ring-2 ring-blue-100"
                )}
                aria-expanded={isAccountOpen}
                aria-haspopup="true"
              >
                <CircleUserRound className="size-5 text-blue-600 shrink-0" />
                <span className="font-semibold text-slate-800 text-sm">{t("master.shell.accountBtn")}</span>
                <ChevronDown
                  className={cn(
                    "size-4 text-slate-400 transition-transform duration-200",
                    isAccountOpen && "rotate-180 text-blue-600"
                  )}
                />
              </button>

              {/* Floating Dropdown Menu */}
              {isAccountOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/60 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* User Profile Header */}
                  <div className="flex items-center gap-2.5 border-b border-slate-100 px-2.5 py-2.5 mb-1">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-xs">
                      W
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold text-slate-900">{t("master.shell.roleName")}</div>
                      <div className="truncate text-[11px] font-medium text-slate-500">{t("master.shell.roleSubtitle")}</div>
                    </div>
                  </div>

                  {/* Account Navigation Links */}
                  <div className="space-y-0.5">
                    <Link
                      to="/admin/account/profile"
                      onClick={() => setIsAccountOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors",
                        location.pathname === "/admin/account/profile"
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      <CircleUserRound className="size-4 text-blue-600 shrink-0" />
                      <span>{t("master.shell.profileLink")}</span>
                    </Link>

                    <Link
                      to="/admin/account/security"
                      onClick={() => setIsAccountOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors",
                        location.pathname === "/admin/account/security"
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                      <span>{t("master.shell.securityLink")}</span>
                    </Link>

                    <Link
                      to="/admin/account/accessibility"
                      onClick={() => setIsAccountOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors",
                        location.pathname === "/admin/account/accessibility"
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      <Eye className="size-4 text-amber-600 shrink-0" />
                      <span>{t("master.shell.accessibilityLink")}</span>
                    </Link>

                    <Link
                      to="/admin/account/notifications"
                      onClick={() => setIsAccountOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors",
                        location.pathname === "/admin/account/notifications"
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      <Bell className="size-4 text-purple-600 shrink-0" />
                      <span>{t("master.shell.notificationsLink")}</span>
                    </Link>
                  </div>

                  {/* Divider */}
                  <div className="my-1.5 border-t border-slate-100" />

                  {/* Logout Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountOpen(false);
                      askConfirm({
                        title: t("master.shell.logoutConfirmTitle"),
                        description: t("master.shell.logoutConfirmDesc"),
                        confirmLabel: t("master.shell.logoutBtn"),
                        danger: true,
                        onConfirm: handleLogout,
                      });
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                  >
                    <LogOut className="size-4 shrink-0" />
                    <span>{t("master.shell.logoutBtn")}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="w-full min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
          <div className="flex w-full items-center justify-center px-4 sm:px-6 lg:px-8">
            <span>{t("master.shell.footer")}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
