import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Building2, ArrowRight, Menu, X, PackageSearch } from "lucide-react";
import { SmartHireLogo } from "@/components/shared/SmartHireLogo";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { useT } from "@/i18n";
import { useLandingModal } from "../context/LandingModalContext";

export function LandingHeader() {
  const t = useT();
  const { openWorkspaceModal, openOrderLookupModal } = useLandingModal();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollYRef = useRef(0);
  const wheelLockUntilRef = useRef(0);
  const lastWheelDirRef = useRef<-1 | 0 | 1>(0);
  const location = useLocation();

  const isPricingPage = location.pathname === "/pricing" || location.pathname === "/packages";
  const demoHref = `/demo?${new URLSearchParams({
    tier: t("master.landingChrome.header.demoConsultTier"),
    type: "DEMO",
  }).toString()}`;

  const navLinks = [
    { label: t("master.landingChrome.nav.solutions"), to: "/solutions" },
    { label: t("master.landingChrome.nav.preview"), to: "/preview" },
    { label: t("master.landingChrome.nav.roi"), to: "/roi" },
    { label: t("master.landingChrome.nav.security"), to: "/security" },
    { label: t("master.landingChrome.nav.pricing"), to: "/pricing" },
  ];

  useEffect(() => {
    setMobileMenuOpen(false);
    setIsVisible(true);
    setIsScrolled(window.scrollY > 12);
    lastScrollYRef.current = Math.max(window.scrollY, 0);
    lastWheelDirRef.current = 0;
    wheelLockUntilRef.current = 0;
  }, [location.pathname]);

  useEffect(() => {
    const syncHeaderByScroll = () => {
      const currentY = Math.max(window.scrollY, 0);
      setIsScrolled(currentY > 12);

      if (mobileMenuOpen) {
        setIsVisible(true);
        lastScrollYRef.current = currentY;
        return;
      }

      const withinWheelLock = performance.now() < wheelLockUntilRef.current;

      if (currentY <= 12) {
        if (!withinWheelLock || lastWheelDirRef.current !== 1) {
          setIsVisible(true);
        }
        lastScrollYRef.current = currentY;
        return;
      }

      if (withinWheelLock) {
        lastScrollYRef.current = currentY;
        return;
      }

      const delta = currentY - lastScrollYRef.current;
      if (delta > 3) {
        setIsVisible(false);
        lastScrollYRef.current = currentY;
      } else if (delta < -3) {
        setIsVisible(true);
        lastScrollYRef.current = currentY;
      }
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || mobileMenuOpen) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("[role='dialog'], [aria-modal='true']")) return;

      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll <= 12) return;

      const currentY = Math.max(window.scrollY, 0);
      if (event.deltaY > 2 && (currentY > 4 || event.deltaY > 8)) {
        lastWheelDirRef.current = 1;
        wheelLockUntilRef.current = performance.now() + 180;
        setIsVisible(false);
      } else if (event.deltaY < -2) {
        lastWheelDirRef.current = -1;
        wheelLockUntilRef.current = performance.now() + 180;
        setIsVisible(true);
      }
    };

    syncHeaderByScroll();
    window.addEventListener("scroll", syncHeaderByScroll, { passive: true });
    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      window.removeEventListener("scroll", syncHeaderByScroll);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [mobileMenuOpen]);

  const handleLogoClick = () => {
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const shown = isVisible || mobileMenuOpen;

  return (
    <header
      onFocusCapture={() => setIsVisible(true)}
      className={`fixed top-0 left-0 right-0 z-50 w-full border-b will-change-transform transition-[transform,opacity,background-color,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
        shown
          ? "translate-y-0 opacity-100"
          : "-translate-y-[108%] opacity-0 pointer-events-none"
      } ${
        isScrolled
          ? "bg-white/90 backdrop-blur-xl border-slate-200/90 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.12)]"
          : "bg-white/95 backdrop-blur-md border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)]"
      }`}
    >
      <div
        className={`mx-auto flex w-full items-center justify-between gap-2.5 pl-4 pr-4 transition-[min-height,padding] duration-300 sm:pl-5 sm:pr-4 min-[1400px]:gap-3 min-[1400px]:pl-12 min-[1500px]:pl-[72px] min-[1500px]:pr-5 min-[1800px]:pl-40 ${
          isScrolled ? "min-h-[64px] py-2 sm:min-h-[68px]" : "min-h-[68px] py-2.5 sm:min-h-[74px]"
        }`}
      >
        {/* Logo & Brand */}
        <Link
          to="/"
          onClick={handleLogoClick}
          className="flex items-center select-none shrink-0 group"
          aria-label={t("master.landingChrome.header.homeAria")}
        >
          <SmartHireLogo className="h-9 sm:h-10" />
        </Link>

        {/* Navigation Links - Desktop */}
        <nav
          className="hidden items-center justify-center gap-0.5 text-[13.5px] font-medium text-slate-600 xl:ml-4 xl:mr-auto xl:flex min-[1400px]:ml-9 min-[1400px]:gap-1 min-[1500px]:ml-12"
          aria-label={t("master.landingChrome.header.mainNavAria")}
        >
          {navLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-2 py-1.5 min-[1400px]:px-2.5 rounded-full transition-all whitespace-nowrap active:scale-95 ${isActive
                  ? "text-blue-600 font-semibold bg-blue-50 shadow-2xs border border-blue-200/60"
                  : "text-slate-600 hover:text-blue-600 hover:bg-slate-100/80"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Action CTAs & Mobile Hamburger */}
        <div className="flex shrink-0 items-center gap-1.5 min-[1400px]:gap-2">
          {/* Order Lookup button - prominently visible when viewing Pricing */}
          {isPricingPage && (
            <button
              type="button"
              onClick={openOrderLookupModal}
              className="group flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border border-blue-200 bg-blue-50/80 px-2.5 min-[1400px]:px-3.5 text-[13.5px] font-semibold text-blue-700 shadow-2xs transition-all hover:bg-blue-100 hover:text-blue-800 hover:border-blue-300 active:scale-95"
              title={t("master.landingChrome.header.lookupOrderTitle")}
              aria-label={t("master.landingChrome.header.lookupOrderAria")}
            >
              <PackageSearch className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">{t("master.landingChrome.header.lookupOrder")}</span>
              <span className="sm:hidden">{t("master.landingChrome.header.lookupShort")}</span>
            </button>
          )}

          <button
            type="button"
            onClick={openWorkspaceModal}
            className="flex min-h-10 min-w-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-[13.5px] font-medium text-slate-700 shadow-2xs transition-all hover:bg-slate-100/80 hover:text-slate-900 active:scale-95 min-[1400px]:px-3.5"
            aria-label={t("master.landingChrome.header.enterWorkspace")}
          >
            <Building2 className="w-4 h-4 text-slate-500" />
            <span className="hidden lg:inline">{t("master.landingChrome.header.enterWorkspace")}</span>
          </button>

          <Link
            to={demoHref}
            onClick={() => setMobileMenuOpen(false)}
            className="group flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg bg-blue-600 px-3 text-[13.5px] font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md active:scale-95 active:bg-blue-800 sm:px-3.5 min-[1400px]:px-4"
          >
            <span className="sm:hidden">{t("master.landingChrome.header.demoShort")}</span>
            <span className="hidden sm:inline">{t("master.landingChrome.header.requestDemo")}</span>
            <ArrowRight className="hidden w-4 h-4 group-hover:translate-x-1 transition-transform min-[360px]:block" />
          </Link>

          <LanguageSwitcher variant="icon" />

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 xl:hidden"
            aria-label={t("master.landingChrome.header.toggleMenuAria")}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 shadow-lg xl:hidden animate-fade-in">
          <div className="flex flex-col gap-1.5">
            {navLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `px-4 py-2.5 rounded-lg text-sm transition-colors ${isActive
                    ? "bg-blue-50 font-semibold text-blue-600 border border-blue-200/60"
                    : "text-slate-700 hover:bg-slate-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
            {isPricingPage && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openOrderLookupModal();
                }}
                className="w-full py-2.5 px-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-100"
              >
                <PackageSearch className="w-4 h-4 text-blue-600" />
                <span>{t("master.landingChrome.header.lookupMobile")}</span>
              </button>
            )}

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                openWorkspaceModal();
              }}
              className="w-full py-2.5 px-4 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-sm font-medium flex items-center justify-center gap-2"
            >
              <Building2 className="w-4 h-4 text-slate-500" />
              <span>{t("master.landingChrome.header.enterRecruitmentWorkspace")}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
