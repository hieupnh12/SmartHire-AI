import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  Database,
  KeyRound,
  FileText,
  Award,
  Server,
  CheckCircle2,
  ArrowRight,
  Check
} from "lucide-react";
import { useLandingModal } from "../context/LandingModalContext";
import { useT } from "@/i18n";

export function SecurityPage() {
  const t = useT();
  const { openDemoModal } = useLandingModal();

  const pillars = useMemo(
    () => [
      {
        icon: Database,
        title: t("master.landing.security.pillars.p1Title"),
        badge: t("master.landing.security.pillars.p1Badge"),
        description: t("master.landing.security.pillars.p1Desc"),
      },
      {
        icon: FileText,
        title: t("master.landing.security.pillars.p2Title"),
        badge: t("master.landing.security.pillars.p2Badge"),
        description: t("master.landing.security.pillars.p2Desc"),
      },
      {
        icon: KeyRound,
        title: t("master.landing.security.pillars.p3Title"),
        badge: t("master.landing.security.pillars.p3Badge"),
        description: t("master.landing.security.pillars.p3Desc"),
      },
      {
        icon: Lock,
        title: t("master.landing.security.pillars.p4Title"),
        badge: t("master.landing.security.pillars.p4Badge"),
        description: t("master.landing.security.pillars.p4Desc"),
      },
      {
        icon: Server,
        title: t("master.landing.security.pillars.p5Title"),
        badge: t("master.landing.security.pillars.p5Badge"),
        description: t("master.landing.security.pillars.p5Desc"),
      },
      {
        icon: Award,
        title: t("master.landing.security.pillars.p6Title"),
        badge: t("master.landing.security.pillars.p6Badge"),
        description: t("master.landing.security.pillars.p6Desc"),
      },
    ],
    [t],
  );

  const securityChecklist = useMemo(
    () => [
      { label: t("master.landing.security.checklist.c1"), checked: true },
      { label: t("master.landing.security.checklist.c2"), checked: true },
      { label: t("master.landing.security.checklist.c3"), checked: true },
      { label: t("master.landing.security.checklist.c4"), checked: true },
      { label: t("master.landing.security.checklist.c5"), checked: true },
      { label: t("master.landing.security.checklist.c6"), checked: true },
    ],
    [t],
  );

  return (
    <div className="py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* HERO INTRO */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>{t("master.landing.security.hero.badge")}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.15] mb-6">
            {t("master.landing.security.hero.titlePrefix")}{" "}
            <span className="text-blue-600 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 bg-clip-text text-transparent">
              {t("master.landing.security.hero.titleHighlight")}
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-8 leading-relaxed">
            {t("master.landing.security.hero.subtitle")}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => openDemoModal(t("master.landing.shared.securityAuditTier"))}
              className="px-8 py-3.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
            >
              <span>{t("master.landing.security.hero.primaryCta")}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/pricing"
              className="px-8 py-3.5 text-sm font-semibold rounded-xl bg-white hover:bg-slate-50 active:scale-98 text-slate-700 border border-slate-300 shadow-2xs transition-all inline-flex items-center gap-2"
            >
              <span>{t("master.landing.security.hero.secondaryCta")}</span>
            </Link>
          </div>
        </div>

        {/* ARCHITECTURE HIGHLIGHT: SEPARATE DATABASE PER TENANT */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-14 shadow-sm mb-24">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-5">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
                {t("master.landing.security.arch.badge")}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {t("master.landing.security.arch.title")}
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {t("master.landing.security.arch.p1Before")}{" "}
                <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">
                  tenant_id
                </code>
                {t("master.landing.security.arch.p1After")}
              </p>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {t("master.landing.security.arch.p2Before")}{" "}
                <strong>{t("master.landing.security.arch.p2Highlight")}</strong>
                {t("master.landing.security.arch.p2After")}
              </p>
              <div className="pt-2 space-y-2.5">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{t("master.landing.security.arch.b1")}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{t("master.landing.security.arch.b2")}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{t("master.landing.security.arch.b3")}</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-slate-900 rounded-2xl p-8 text-white font-mono text-xs shadow-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <span className="text-slate-400">{t("master.landing.security.arch.topologyTitle")}</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {t("master.landing.security.arch.topologyStatus")}
                </span>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-slate-200 font-bold">tenant_viettel_db</div>
                      <div className="text-[10px] text-slate-400">
                        {t("master.landing.security.arch.t1Meta")}
                      </div>
                    </div>
                  </div>
                  <span className="text-emerald-400 text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800">
                    {t("master.landing.security.arch.t1Status")}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-indigo-400" />
                    <div>
                      <div className="text-slate-200 font-bold">tenant_techcombank_db</div>
                      <div className="text-[10px] text-slate-400">
                        {t("master.landing.security.arch.t2Meta")}
                      </div>
                    </div>
                  </div>
                  <span className="text-emerald-400 text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800">
                    {t("master.landing.security.arch.t2Status")}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-sky-400" />
                    <div>
                      <div className="text-slate-200 font-bold">tenant_fpt_db</div>
                      <div className="text-[10px] text-slate-400">
                        {t("master.landing.security.arch.t3Meta")}
                      </div>
                    </div>
                  </div>
                  <span className="text-emerald-400 text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800">
                    {t("master.landing.security.arch.t3Status")}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-700 text-[11px] text-slate-400 text-center">
                {t("master.landing.security.arch.topologyFooter")}
              </div>
            </div>
          </div>
        </div>

        {/* 6 PILLARS */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="rounded-3xl bg-white border border-slate-200/90 p-8 shadow-sm hover:shadow-xl hover:border-blue-400/50 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                    {pillar.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{pillar.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{pillar.description}</p>
              </div>
            );
          })}
        </div>

        {/* ENTERPRISE SECURITY CHECKLIST */}
        <div className="rounded-3xl bg-slate-50 border border-slate-200 p-8 sm:p-12 mb-24">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
              {t("master.landing.security.checklist.badge")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-3 mb-2">
              {t("master.landing.security.checklist.title")}
            </h2>
            <p className="text-slate-600 text-sm">
              {t("master.landing.security.checklist.subtitle")}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {securityChecklist.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-slate-800">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM CTA */}
        <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-14 text-center shadow-xl">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4">
            {t("master.landing.security.bottomCta.title")}
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
            {t("master.landing.security.bottomCta.subtitle")}
          </p>
          <button
            onClick={() => openDemoModal(t("master.landing.shared.securityNdaTier"))}
            className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 transition-all inline-flex items-center gap-2"
          >
            <span>{t("master.landing.security.bottomCta.button")}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
