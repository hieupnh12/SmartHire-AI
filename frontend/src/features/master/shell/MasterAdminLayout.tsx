import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { MasterAdminSidebar } from "./MasterAdminSidebar";
import { MasterAdminHeader } from "./MasterAdminHeader";
import { DashboardTab, SidebarGroupId } from "./types";
import { MasterDashboardProvider, useMasterDashboard } from "./MasterAdminContext";
import { CheckCircle2 } from "lucide-react";
import { BrainCircuit, Menu, X } from "lucide-react";

const paths: Record<DashboardTab, string> = {
  home: "/admin/dashboard", analytics: "/admin/analytics", leads: "/admin/leads",
  tenants: "/admin/tenants/directory", subscriptions: "/admin/subscriptions/plans",
  invoices: "/admin/invoices", contracts: "/admin/contracts", logs: "/admin/system/logs",
  "ai-usage": "/admin/system/ai-usage", "ai-quotas": "/admin/system/ai-quotas",
  "account-profile": "/admin/account/profile", "account-security": "/admin/account/security",
  "account-accessibility": "/admin/account/accessibility", "account-notifications": "/admin/account/notifications",
};

function activeTabFromPath(pathname: string): DashboardTab {
  if (pathname.startsWith("/admin/tenants")) return "tenants";
  if (pathname.startsWith("/admin/subscriptions")) return "subscriptions";
  return (Object.entries(paths).find(([, path]) => path === pathname)?.[0] as DashboardTab | undefined) ?? "home";
}

function MasterAdminLayoutContent() {
  const { actionSuccessMsg } = useMasterDashboard();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = activeTabFromPath(location.pathname);
  const setActiveTab = (tab: DashboardTab) => navigate(paths[tab]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [openSidebarGroup, setOpenSidebarGroup] = useState<SidebarGroupId | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);

  useEffect(() => {
    setIsMobileNavigationOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileNavigationOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileNavigationOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [isMobileNavigationOpen]);

  useEffect(() => {
    if (!isAccountMenuOpen && !isNotificationPanelOpen) return;

    const closeUtilityPanels = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-dashboard-utility]")) return;
      setIsAccountMenuOpen(false);
      setIsNotificationPanelOpen(false);
    };

    document.addEventListener("pointerdown", closeUtilityPanels);
    return () => document.removeEventListener("pointerdown", closeUtilityPanels);
  }, [isAccountMenuOpen, isNotificationPanelOpen]);

  return (
    <div className="flex min-h-dvh min-w-0 flex-col bg-[#f8fafc] font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Toast Notification Banner */}
      {actionSuccessMsg && (
        <div className="fixed top-22 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      <MasterAdminHeader isSidebarCollapsed={isSidebarCollapsed} />

      <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md md:hidden">
        <button
          type="button"
          onClick={() => setIsMobileNavigationOpen(true)}
          className="grid size-11 place-items-center rounded-xl text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Mở điều hướng quản trị"
          aria-expanded={isMobileNavigationOpen}
        >
          <Menu className="size-6" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => navigate("/admin/dashboard")} className="flex min-h-11 items-center gap-2 rounded-xl px-2" aria-label="Về dashboard">
          <BrainCircuit className="size-6 text-blue-600" aria-hidden="true" />
          <span className="text-base font-semibold text-slate-950">SmartHire<span className="text-blue-600">.AI</span></span>
        </button>
        <button
          type="button"
          onClick={() => setIsMobileNavigationOpen(false)}
          className={`grid size-11 place-items-center rounded-xl text-slate-700 hover:bg-slate-100 ${isMobileNavigationOpen ? "visible" : "invisible"}`}
          aria-label="Đóng điều hướng quản trị"
        >
          <X className="size-6" aria-hidden="true" />
        </button>
      </header>

      {isMobileNavigationOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[2px] md:hidden"
          onClick={() => setIsMobileNavigationOpen(false)}
          aria-label="Đóng điều hướng quản trị"
        />
      )}

      <div className="relative flex w-full min-w-0 flex-1 items-start">
        <MasterAdminSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          openSidebarGroup={openSidebarGroup}
          setOpenSidebarGroup={setOpenSidebarGroup}
          isAccountMenuOpen={isAccountMenuOpen}
          setIsAccountMenuOpen={setIsAccountMenuOpen}
          isNotificationPanelOpen={isNotificationPanelOpen}
          setIsNotificationPanelOpen={setIsNotificationPanelOpen}
          isMobileOpen={isMobileNavigationOpen}
          onMobileClose={() => setIsMobileNavigationOpen(false)}
        />
        <main className={`w-full min-w-0 flex-1 transition-[padding] duration-200 ${isSidebarCollapsed ? "md:pl-20" : "md:pl-[21rem]"}`}>
          <div className="w-full min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8"><Outlet /></div>
        </main>
      </div>

      {/* FOOTER */}
      <footer className={`border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500 transition-[padding] ${isSidebarCollapsed ? "md:pl-20" : "md:pl-[21rem]"}`}>
        <div className="flex w-full flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6 lg:px-8">
          <span>SmartHire-AI Platform © 2026 · Cổng Quản Trị Trung Tâm (Master DB Controller)</span>
          <span className="text-slate-400">PostgreSQL Master Registry · Separate Database Architecture</span>
        </div>
      </footer>
    </div>
  );
}

export function MasterAdminLayout() {
  return <MasterDashboardProvider><MasterAdminLayoutContent /></MasterDashboardProvider>;
}
