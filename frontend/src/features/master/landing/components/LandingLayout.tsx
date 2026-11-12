import React, { useEffect, useRef } from "react";
import { useLocation, Outlet } from "react-router-dom";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { LandingModalProvider } from "../context/LandingModalContext";
import { LandingHeader } from "./LandingHeader";
import { LandingFooter } from "./LandingFooter";
import { WorkspaceModal } from "./modals/WorkspaceModal";
import { OrderLookupModal } from "./modals/OrderLookupModal";

function ScrollToTopOnRoute({ lenisRef }: { lenisRef: React.RefObject<Lenis | null> }) {
  const { pathname } = useLocation();

  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname, lenisRef]);

  return null;
}

export function LandingLayout({ children }: { children?: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (
      !window.matchMedia("(pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const lenis = new Lenis({
      autoRaf: true,
      autoToggle: true,
      anchors: { offset: -74 },
      duration: 1.35,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.72,
      prevent: (node: HTMLElement) =>
        Boolean(node.closest("[role='dialog'], [aria-modal='true'], [data-lenis-prevent]")),
    });

    lenisRef.current = lenis;
    return () => {
      lenisRef.current = null;
      lenis.destroy();
    };
  }, []);

  return (
    <LandingModalProvider>
      <ScrollToTopOnRoute lenisRef={lenisRef} />
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
        <main className="relative z-10 pt-[68px] sm:pt-[74px]">{children ?? <Outlet />}</main>

        {/* FOOTER */}
        <LandingFooter />

        {/* SHARED MODALS */}
        <WorkspaceModal />
        <OrderLookupModal />
      </div>
    </LandingModalProvider>
  );
}
