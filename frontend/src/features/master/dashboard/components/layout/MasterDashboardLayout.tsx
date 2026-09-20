import React, { useState, useEffect } from "react";

import { MasterSidebar } from "./MasterSidebar";
import { MasterHeader } from "./MasterHeader";
import { DashboardTab, SidebarGroupId } from "../../types";
import { useMasterDashboard } from "../../context/MasterDashboardContext";
import { CheckCircle2 } from "lucide-react";

interface MasterDashboardLayoutProps {
  children: React.ReactNode;
  activeTab: DashboardTab;
  setActiveTab: React.Dispatch<React.SetStateAction<DashboardTab>>;
}

export function MasterDashboardLayout({ children, activeTab, setActiveTab }: MasterDashboardLayoutProps) {
  const { actionSuccessMsg } = useMasterDashboard();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [openSidebarGroup, setOpenSidebarGroup] = useState<SidebarGroupId | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);

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
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Toast Notification Banner */}
      {actionSuccessMsg && (
        <div className="fixed top-22 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      <MasterHeader isSidebarCollapsed={isSidebarCollapsed} />

      <div className="relative mx-auto flex w-full max-w-[1536px] flex-grow items-start">
        <MasterSidebar
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
        />
        <main className={`flex-1 min-w-0 transition-all duration-200 ${isSidebarCollapsed ? "pl-20" : "pl-[21rem]"}`}>
          {children}
        </main>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 py-5 text-center text-xs text-slate-500 bg-white">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SmartHire-AI Platform © 2026 · Cổng Quản Trị Trung Tâm (Master DB Controller)</span>
          <span className="text-slate-400">PostgreSQL Master Registry · Separate Database Architecture</span>
        </div>
      </footer>
    </div>
  );
}
