import { Link } from "react-router-dom";
import { Mail, ArrowUpRight } from "lucide-react";
import { SmartHireLogo } from "@/components/shared/SmartHireLogo";
import { useT } from "@/i18n";
import { useLandingModal } from "../context/LandingModalContext";

export function LandingFooter() {
  const t = useT();
  const { openWorkspaceModal } = useLandingModal();
  const navLinks = [
    { label: t("master.landingChrome.nav.solutions"), to: "/solutions" },
    { label: t("master.landingChrome.nav.preview"), to: "/preview" },
    { label: t("master.landingChrome.nav.roi"), to: "/roi" },
    { label: t("master.landingChrome.nav.security"), to: "/security" },
    { label: t("master.landingChrome.nav.pricing"), to: "/pricing" },
  ];

  return (
    <footer className="bg-slate-950 text-slate-400 text-sm">
      {/* Top divider accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">

          {/* Brand column */}
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center group">
              <SmartHireLogo tone="dark" className="h-8" />
            </Link>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              {t("master.landingChrome.footer.brandDesc")}
            </p>
            <a
              href="mailto:contact@smarthire.top"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              contact@smarthire.top
            </a>
          </div>

          {/* Solutions links */}
          <div>
            <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">
              {t("master.landingChrome.footer.solutionsTitle")}
            </h5>
            <ul className="space-y-2.5">
              {navLinks.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-xs text-slate-500 hover:text-slate-200 transition-colors flex items-center gap-1 group"
                  >
                    {l.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customers column */}
          <div>
            <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">
              {t("master.landingChrome.footer.forCustomersTitle")}
            </h5>
            <ul className="space-y-2.5">
              <li>
                <button
                  onClick={openWorkspaceModal}
                  className="text-xs text-slate-500 hover:text-slate-200 transition-colors text-left flex items-center gap-1 group"
                >
                  {t("master.landingChrome.footer.enterWorkspace")}
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </li>
              <li>
                <a
                  href="mailto:contact@smarthire.top"
                  className="text-xs text-slate-500 hover:text-slate-200 transition-colors flex items-center gap-1 group"
                >
                  {t("master.landingChrome.footer.techSupport")}
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <Link
                  to="/security"
                  className="text-xs text-slate-500 hover:text-slate-200 transition-colors flex items-center gap-1 group"
                >
                  {t("master.landingChrome.footer.privacyPolicy")}
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <p>{t("master.landingChrome.footer.copyright")}</p>
          <div className="flex items-center gap-5">
            <Link to="/terms" className="hover:text-slate-400 transition-colors">{t("master.landingChrome.footer.terms")}</Link>
            <Link to="/privacy" className="hover:text-slate-400 transition-colors">{t("master.landingChrome.footer.personalDataProtection")}</Link>
            <Link to="/security" className="hover:text-slate-400 transition-colors">{t("master.landingChrome.footer.systemSecurity")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
