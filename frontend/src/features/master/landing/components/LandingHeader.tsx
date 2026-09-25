import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { BrainCircuit, Building2, ArrowRight, Menu, X } from "lucide-react";
import { useLandingModal } from "../context/LandingModalContext";

export function LandingHeader() {
  const { openWorkspaceModal, openDemoModal } = useLandingModal();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: "Giải pháp AI", to: "/solutions" },
    { label: "Trải nghiệm thực tế", to: "/preview" },
    { label: "Hiệu quả & ROI", to: "/roi" },
    { label: "Bảo mật dữ liệu", to: "/security" },
    { label: "Gói giải pháp", to: "/pricing" },
  ];

  const handleLogoClick = () => {
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] transition-all">
      <div className="mx-auto flex min-h-20 w-full max-w-[1536px] items-center justify-between gap-4 px-4 py-3 sm:min-h-[84px] sm:px-6 lg:px-8">
        {/* Logo & Brand */}
        <Link
          to="/"
          onClick={handleLogoClick}
          className="flex items-center gap-3.5 select-none shrink-0 group"
          aria-label="Về trang chủ SmartHire.AI"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-blue-600/25 ring-1 ring-white/20 group-hover:scale-105 transition-transform duration-200">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="text-xl font-semibold tracking-tight text-slate-900 font-display min-[420px]:inline sm:text-2xl">
              SmartHire<span className="text-blue-600">.AI</span>
            </span>
            <span className="hidden text-[11px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 lg:inline-flex">
              Enterprise
            </span>
          </div>
        </Link>

        {/* Navigation Links - Desktop */}
        <nav
          className="hidden items-center justify-center gap-1.5 text-sm font-medium text-slate-600 xl:flex"
          aria-label="Điều hướng chính"
        >
          {navLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-full transition-all whitespace-nowrap active:scale-95 ${
                  isActive
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
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            onClick={openWorkspaceModal}
            className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-2xs transition-all hover:bg-slate-100/80 hover:text-slate-900 active:scale-95 sm:px-4"
            aria-label="Vào Workspace"
          >
            <Building2 className="w-4 h-4 text-slate-500" />
            <span className="hidden lg:inline">Vào Workspace</span>
          </button>

          <button
            onClick={() => openDemoModal("Tư Vấn Giải Pháp Doanh Nghiệp")}
            className="group flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md active:scale-95 active:bg-blue-800 sm:px-5"
          >
            <span className="sm:hidden">Demo</span>
            <span className="hidden sm:inline">Yêu cầu Demo</span>
            <ArrowRight className="hidden w-4 h-4 group-hover:translate-x-1 transition-transform min-[360px]:block" />
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 xl:hidden"
            aria-label="Toggle menu"
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
                  `px-4 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
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
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                openWorkspaceModal();
              }}
              className="w-full py-2.5 px-4 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-sm font-medium flex items-center justify-center gap-2"
            >
              <Building2 className="w-4 h-4 text-slate-500" />
              <span>Vào Workspace Tuyển Dụng</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
