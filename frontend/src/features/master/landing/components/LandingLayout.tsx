import React, { useEffect } from "react";
import { useLocation, Outlet } from "react-router-dom";
import { LandingModalProvider } from "../context/LandingModalContext";
import { LandingHeader } from "./LandingHeader";
import { LandingFooter } from "./LandingFooter";
import { DemoModal } from "./modals/DemoModal";
import { WorkspaceModal } from "./modals/WorkspaceModal";

function ScrollToTopOnRoute() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

export function LandingLayout({ children }: { children?: React.ReactNode }) {
  return (
    <LandingModalProvider>
      <ScrollToTopOnRoute />
      <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] font-sans antialiased selection:bg-[#2563eb] selection:text-white relative overflow-x-hidden">
        {/* Dynamic Luminous Ambient Glow Orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-400/15 rounded-full blur-3xl animate-pulse-glow" />
          <div
            className="absolute top-1/3 -right-32 w-[420px] h-[420px] bg-indigo-400/15 rounded-full blur-3xl animate-pulse-glow"
            style={{ animationDelay: "3s" }}
          />
          <div
            className="absolute bottom-20 left-1/4 w-[500px] h-[500px] bg-sky-300/15 rounded-full blur-3xl animate-pulse-glow"
            style={{ animationDelay: "5s" }}
          />
        </div>

        {/* Subtle Background Grid Pattern */}
        <div className="fixed inset-0 pointer-events-none z-0 opacity-35">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        {/* TOP NAVIGATION BAR */}
        <LandingHeader />

        {/* MAIN CONTENT */}
        <main className="relative z-10">{children ?? <Outlet />}</main>

        {/* FOOTER */}
        <LandingFooter />

        {/* SHARED MODALS */}
        <DemoModal />
        <WorkspaceModal />
      </div>
    </LandingModalProvider>
  );
}
