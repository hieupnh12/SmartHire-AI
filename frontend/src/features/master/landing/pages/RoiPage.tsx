import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Calculator,
  Briefcase,
  Users2,
  DollarSign
} from "lucide-react";
import { useLandingModal } from "../context/LandingModalContext";
import { formatNumber, useLocale, useT } from "@/i18n";

export function RoiPage() {
  const t = useT();
  const locale = useLocale();
  const { openDemoModal } = useLandingModal();

  const metrics = useMemo(
    () => [
      {
        stat: "-70%",
        label: t("master.landing.roi.metrics.m1Label"),
        description: t("master.landing.roi.metrics.m1Desc"),
        icon: Clock,
        color: "text-blue-600 bg-blue-50 border-blue-200",
      },
      {
        stat: "3.5x",
        label: t("master.landing.roi.metrics.m2Label"),
        description: t("master.landing.roi.metrics.m2Desc"),
        icon: TrendingUp,
        color: "text-indigo-600 bg-indigo-50 border-indigo-200",
      },
      {
        stat: "99.2%",
        label: t("master.landing.roi.metrics.m3Label"),
        description: t("master.landing.roi.metrics.m3Desc"),
        icon: UserCheck,
        color: "text-emerald-600 bg-emerald-50 border-emerald-200",
      },
      {
        stat: "45%",
        label: t("master.landing.roi.metrics.m4Label"),
        description: t("master.landing.roi.metrics.m4Desc"),
        icon: DollarSign,
        color: "text-amber-600 bg-amber-50 border-amber-200",
      },
    ],
    [t],
  );

  const roleBenefits = useMemo(
    () => [
      {
        role: t("master.landing.roi.roles.chroTitle"),
        icon: Users2,
        points: [
          t("master.landing.roi.roles.chroP1"),
          t("master.landing.roi.roles.chroP2"),
          t("master.landing.roi.roles.chroP3"),
          t("master.landing.roi.roles.chroP4"),
        ],
      },
      {
        role: t("master.landing.roi.roles.recruiterTitle"),
        icon: Briefcase,
        points: [
          t("master.landing.roi.roles.recruiterP1"),
          t("master.landing.roi.roles.recruiterP2"),
          t("master.landing.roi.roles.recruiterP3"),
          t("master.landing.roi.roles.recruiterP4"),
        ],
      },
      {
        role: t("master.landing.roi.roles.techLeadTitle"),
        icon: Calculator,
        points: [
          t("master.landing.roi.roles.techLeadP1"),
          t("master.landing.roi.roles.techLeadP2"),
          t("master.landing.roi.roles.techLeadP3"),
          t("master.landing.roi.roles.techLeadP4"),
        ],
      },
    ],
    [t],
  );

  const cvCountFormatted = formatNumber(2500, undefined, locale);
  const tradCostFormatted = formatNumber(350000000, undefined, locale);
  const smartSavingsFormatted = formatNumber(230000000, undefined, locale);

  return (
    <div className="py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* HERO INTRO */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6 shadow-2xs">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>{t("master.landing.roi.hero.badge")}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.15] mb-6">
            {t("master.landing.roi.hero.titlePrefix")}{" "}
            <span className="text-blue-600 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 bg-clip-text text-transparent">
              {t("master.landing.roi.hero.titleHighlight")}
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-8 leading-relaxed">
            {t("master.landing.roi.hero.subtitle")}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => openDemoModal(t("master.landing.shared.roiQuoteTier"))}
              className="px-8 py-3.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
            >
              <span>{t("master.landing.roi.hero.primaryCta")}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/pricing"
              className="px-8 py-3.5 text-sm font-semibold rounded-xl bg-white hover:bg-slate-50 active:scale-98 text-slate-700 border border-slate-300 shadow-2xs transition-all inline-flex items-center gap-2"
            >
              <span>{t("master.landing.roi.hero.secondaryCta")}</span>
            </Link>
          </div>
        </div>

        {/* 4 KEY METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {metrics.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-8 rounded-3xl bg-white border border-slate-200/90 text-center hover:-translate-y-2 hover:shadow-xl hover:border-blue-400/50 transition-all duration-300 group"
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 border ${item.color} group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-7 h-7" />
                </div>
                <div className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-2 tracking-tight">
                  {item.stat}
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{item.label}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>

        {/* ROI BREAKDOWN COMPARISON TABLE */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm mb-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
              {t("master.landing.roi.model.badge")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-3 mb-2">
              {t("master.landing.roi.model.title")}
            </h2>
            <p className="text-slate-600 text-sm">
              {t("master.landing.roi.model.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-6 sm:p-8 rounded-2xl bg-rose-50/40 border border-rose-200/70 space-y-4">
              <h3 className="text-lg font-bold text-rose-950 flex items-center gap-2">
                <span>{t("master.landing.roi.model.tradTitle")}</span>
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                <li className="flex justify-between border-b border-rose-100 pb-2">
                  <span>{t("master.landing.roi.model.tradRow1Label", { count: cvCountFormatted })}</span>
                  <strong>{t("master.landing.roi.model.tradRow1Value")}</strong>
                </li>
                <li className="flex justify-between border-b border-rose-100 pb-2">
                  <span>{t("master.landing.roi.model.tradRow2Label")}</span>
                  <strong>{t("master.landing.roi.model.tradRow2Value")}</strong>
                </li>
                <li className="flex justify-between border-b border-rose-100 pb-2">
                  <span>{t("master.landing.roi.model.tradRow3Label")}</span>
                  <strong>{t("master.landing.roi.model.tradRow3Value")}</strong>
                </li>
                <li className="flex justify-between border-b border-rose-100 pb-2">
                  <span>{t("master.landing.roi.model.tradRow4Label")}</span>
                  <strong className="text-rose-700">{t("master.landing.roi.model.tradRow4Value")}</strong>
                </li>
                <li className="flex justify-between pt-2 text-rose-900 font-bold text-sm sm:text-base">
                  <span>{t("master.landing.roi.model.tradTotalLabel")}</span>
                  <span>{t("master.landing.roi.model.tradTotalValue", { amount: tradCostFormatted })}</span>
                </li>
              </ul>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl bg-blue-50/40 border border-blue-200/70 space-y-4">
              <h3 className="text-lg font-bold text-blue-950 flex items-center gap-2">
                <span>{t("master.landing.roi.model.smartTitle")}</span>
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                <li className="flex justify-between border-b border-blue-100 pb-2">
                  <span>{t("master.landing.roi.model.smartRow1Label", { count: cvCountFormatted })}</span>
                  <strong className="text-emerald-700">{t("master.landing.roi.model.smartRow1Value")}</strong>
                </li>
                <li className="flex justify-between border-b border-blue-100 pb-2">
                  <span>{t("master.landing.roi.model.smartRow2Label")}</span>
                  <strong className="text-emerald-700">{t("master.landing.roi.model.smartRow2Value")}</strong>
                </li>
                <li className="flex justify-between border-b border-blue-100 pb-2">
                  <span>{t("master.landing.roi.model.smartRow3Label")}</span>
                  <strong className="text-emerald-700">{t("master.landing.roi.model.smartRow3Value")}</strong>
                </li>
                <li className="flex justify-between border-b border-blue-100 pb-2">
                  <span>{t("master.landing.roi.model.smartRow4Label")}</span>
                  <strong className="text-blue-700">{t("master.landing.roi.model.smartRow4Value")}</strong>
                </li>
                <li className="flex justify-between pt-2 text-blue-900 font-bold text-sm sm:text-base">
                  <span>{t("master.landing.roi.model.smartTotalLabel")}</span>
                  <span className="text-emerald-600">
                    {t("master.landing.roi.model.smartTotalValue", { amount: smartSavingsFormatted })}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ROLE BENEFITS */}
        <div className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
              {t("master.landing.roi.roles.badge")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-3 mb-2">
              {t("master.landing.roi.roles.title")}
            </h2>
            <p className="text-slate-600 text-sm">
              {t("master.landing.roi.roles.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {roleBenefits.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="rounded-3xl bg-white border border-slate-200 p-8 shadow-sm hover:shadow-lg transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-4">{item.role}</h3>
                  <ul className="space-y-3">
                    {item.points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM CTA */}
        <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-8 sm:p-14 text-white text-center shadow-xl">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4">
            {t("master.landing.roi.bottomCta.title")}
          </h2>
          <p className="text-blue-100 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
            {t("master.landing.roi.bottomCta.subtitle")}
          </p>
          <button
            onClick={() => openDemoModal(t("master.landing.shared.roiReportTier"))}
            className="px-8 py-3.5 rounded-xl bg-white text-blue-700 font-semibold text-sm hover:bg-blue-50 shadow-md active:scale-95 transition-all inline-flex items-center gap-2"
          >
            <span>{t("master.landing.roi.bottomCta.button")}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
