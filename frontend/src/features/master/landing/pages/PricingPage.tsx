import { Fragment, useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ArrowRight,
  X
} from "lucide-react";
import { useLandingModal } from "../context/LandingModalContext";
import { PlanFeatureList } from "../components/PlanFeatureList";
import { checkoutApi, PublicSubscriptionPlan } from "@/api/master/checkoutApi";
import { SkeletonCard } from "@/components/ux/Skeleton";
import { formatNumber, useLocale, useT } from "@/i18n";
import { formatPlanDisplayName } from "@/features/tenant/admin/billing/utils/billingLabels";

export function PricingPage() {
  const t = useT();
  const locale = useLocale();
  const navigate = useNavigate();
  const { openDemoModal } = useLandingModal();
  const [plans, setPlans] = useState<PublicSubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkoutApi.getPublicPlans()
      .then(data => {
        const standardPlans = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
        let fetchedPlans = data
          .filter(p => p.status === "ACTIVE" && standardPlans.includes(p.code))
          .sort((a, b) => (a.priceYearly || 0) - (b.priceYearly || 0));

        if (fetchedPlans.length === 0) {
          fetchedPlans = data.filter(p => p.status === "ACTIVE" && p.priceYearly > 0)
            .sort((a, b) => (a.priceYearly || 0) - (b.priceYearly || 0))
            .slice(0, 3);
        }
        setPlans(fetchedPlans);
      })
      .catch(err => console.error("Failed to fetch plans", err))
      .finally(() => setLoading(false));
  }, []);

  const featureMatrix = useMemo(() => {
    const getPlanValue = (
      index: number,
      field: keyof PublicSubscriptionPlan,
      defaultValue: string,
      formatSuffix = "",
    ) => {
      const plan = plans[index];
      if (!plan) return defaultValue;
      const value = plan[field];
      if (value === null || value === undefined) {
        return t("master.landing.plans.unlimited");
      }
      if (typeof value === "number") {
        if (value < 0) return t("master.landing.plans.unlimited");
        if (value === 0) return t("master.landing.plans.unsupported");
        return `${formatNumber(value, undefined, locale)}${formatSuffix}`;
      }
      return defaultValue;
    };

    const m = "master.landing.pricing.matrix";

    return [
      {
        category: t(`${m}.cat1`),
        features: [
          {
            name: t(`${m}.c1f1`),
            starter: getPlanValue(
              0,
              "maxCvParses",
              t(`${m}.fallbackCvStarter`, { count: formatNumber(500, undefined, locale) }),
              t(`${m}.cvSuffix`),
            ),
            pro: getPlanValue(
              1,
              "maxCvParses",
              t(`${m}.fallbackCvPro`, { count: formatNumber(1500, undefined, locale) }),
              t(`${m}.cvSuffix`),
            ),
            enterprise: getPlanValue(
              2,
              "maxCvParses",
              t("master.landing.plans.unlimited"),
              t(`${m}.cvSuffix`),
            ),
          },
          { name: t(`${m}.c1f2`), starter: true, pro: true, enterprise: true },
          { name: t(`${m}.c1f3`), starter: true, pro: true, enterprise: true },
          { name: t(`${m}.c1f4`), starter: false, pro: true, enterprise: true },
          { name: t(`${m}.c1f5`), starter: false, pro: true, enterprise: true },
        ],
      },
      {
        category: t(`${m}.cat2`),
        features: [
          {
            name: t(`${m}.c2f1`),
            starter: t(`${m}.c2f1Starter`),
            pro: t(`${m}.c2f1Pro`),
            enterprise: t(`${m}.c2f1Ent`),
          },
          {
            name: t(`${m}.c2f2`),
            starter: t(`${m}.c2f2Starter`),
            pro: t(`${m}.c2f2Pro`),
            enterprise: t(`${m}.c2f2Ent`),
          },
          { name: t(`${m}.c2f3`), starter: false, pro: true, enterprise: true },
          { name: t(`${m}.c2f4`), starter: true, pro: true, enterprise: true },
        ],
      },
      {
        category: t(`${m}.cat3`),
        features: [
          {
            name: t(`${m}.c3f1`),
            starter: getPlanValue(
              0,
              "maxAiInterviewHours",
              t(`${m}.fallbackHoursStarter`),
              t(`${m}.hoursSuffix`),
            ),
            pro: getPlanValue(
              1,
              "maxAiInterviewHours",
              t(`${m}.fallbackHoursPro`),
              t(`${m}.hoursSuffix`),
            ),
            enterprise: getPlanValue(
              2,
              "maxAiInterviewHours",
              t("master.landing.plans.unlimited"),
              t(`${m}.hoursSuffix`),
            ),
          },
          { name: t(`${m}.c3f2`), starter: true, pro: true, enterprise: true },
          { name: t(`${m}.c3f3`), starter: false, pro: true, enterprise: true },
          { name: t(`${m}.c3f4`), starter: true, pro: true, enterprise: true },
        ],
      },
      {
        category: t(`${m}.cat4`),
        features: [
          {
            name: t(`${m}.c4f1`),
            starter: getPlanValue(0, "maxJobs", t(`${m}.fallbackJobsStarter`), ""),
            pro: getPlanValue(1, "maxJobs", t(`${m}.fallbackJobsPro`), ""),
            enterprise: getPlanValue(2, "maxJobs", t("master.landing.plans.unlimited"), ""),
          },
          { name: t(`${m}.c4f2`), starter: true, pro: true, enterprise: true },
          {
            name: t(`${m}.c4f3`),
            starter: t(`${m}.c4f3Starter`),
            pro: t(`${m}.c4f3Pro`),
            enterprise: t(`${m}.c4f3Ent`),
          },
          { name: t(`${m}.c4f4`), starter: true, pro: true, enterprise: true },
        ],
      },
      {
        category: t(`${m}.cat5`),
        features: [
          { name: t(`${m}.c5f1`), starter: true, pro: true, enterprise: true },
          { name: t(`${m}.c5f2`), starter: false, pro: false, enterprise: true },
          { name: t(`${m}.c5f3`), starter: false, pro: false, enterprise: true },
          { name: t(`${m}.c5f4`), starter: false, pro: true, enterprise: true },
          {
            name: t(`${m}.c5f5`),
            starter: "99.0%",
            pro: "99.5%",
            enterprise: t(`${m}.c5f5Ent`),
          },
        ],
      },
    ];
  }, [plans, locale, t]);

  return (
    <div className="py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-6">
        <h1 className="sr-only">{t("master.landing.pricing.srTitle")}</h1>
        {/* SMALL INTRO / CTA */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <span className="italic text-slate-900 font-medium text-lg">
            {t("master.landing.plans.customPrompt")}
          </span>
          <button
            onClick={() => openDemoModal(t("master.landing.shared.customTier"), "CONTRACT_QUOTE")}
            className="px-5 py-2 rounded-full bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-bold text-sm transition-all shadow-sm flex items-center gap-2"
          >
            {t("master.landing.plans.quote1on1Btn")}
          </button>
        </div>

        {/* 3 TIERS CARDS */}
        <div className="grid lg:grid-cols-3 gap-8 items-stretch mb-24">
          {loading ? (
            Array.from({ length: 3 }, (_, i) => (
              <SkeletonCard key={i} className="min-h-[520px] rounded-3xl" />
            ))
          ) : plans.length === 0 ? (
            <div className="col-span-3 py-20 text-center text-slate-500">
              {t("master.landing.plans.empty")}
            </div>
          ) : (
            plans.map((plan, index) => {
              const isHighlighted = index === 1;
              const isEnterprise = plan.code === "ENTERPRISE";
              const cleanName = formatPlanDisplayName(plan.name, t);

              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl bg-white p-8 flex flex-col justify-between shadow-sm transition-all duration-300 ${
                    isHighlighted
                      ? "border-2 border-blue-600 shadow-xl relative hover:-translate-y-2"
                      : "border border-slate-200 hover:shadow-xl hover:-translate-y-1.5"
                  }`}
                >
                  {isHighlighted && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-bold px-4 py-1 rounded-full shadow-sm tracking-wide whitespace-nowrap">
                      {t("master.landing.plans.mostPopular")}
                    </div>
                  )}

                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3 mt-1">
                      <h3 className="text-xl font-bold text-slate-900 leading-tight">{cleanName}</h3>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded shrink-0 whitespace-nowrap ${
                          isHighlighted ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {index === 0
                          ? t("master.landing.plans.tierSmall")
                          : index === 1
                            ? t("master.landing.plans.tierMedium")
                            : t("master.landing.plans.tierLarge")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-6 min-h-[32px]">
                      {plan.description || t("master.landing.plans.defaultDescription")}
                    </p>

                    <div
                      className={`p-4 rounded-xl mb-5 ${
                        isHighlighted ? "bg-blue-50/60 border-blue-200" : "bg-slate-50 border border-slate-200"
                      }`}
                    >
                      <span className={`text-xs block mb-1 ${isHighlighted ? "text-blue-700 font-semibold" : "text-slate-500"}`}>
                        {t("master.landing.plans.suitableScale")}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {index === 0
                          ? t("master.landing.plans.scaleUnder50")
                          : index === 1
                            ? t("master.landing.plans.scale50To200")
                            : t("master.landing.plans.scaleOver200")}
                      </span>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-1.5">
                        {plan.priceYearly > 0 ? (
                          <>
                            <span className={`text-3xl font-extrabold ${isHighlighted ? "text-blue-600" : "text-slate-900"}`}>
                              {formatNumber(plan.priceYearly, undefined, locale)} {t("master.landing.shared.currencyVnd")}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              / {t("master.landing.plans.perYear")}
                            </span>
                          </>
                        ) : (
                          <span className={`text-3xl font-extrabold ${isHighlighted ? "text-blue-600" : "text-slate-900"}`}>
                            {t("master.landing.plans.contactQuote")}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 text-xs text-slate-500 font-medium">
                        {t("master.landing.plans.annualLicenseNote")}
                      </div>
                    </div>

                    <PlanFeatureList plan={plan} isEnterprise={isEnterprise} locale={locale} />
                  </div>

                  <div className="flex gap-2.5 mt-auto">
                    <button
                      onClick={() => openDemoModal(plan.name, "CONTRACT_QUOTE")}
                      className="flex-[1.2] py-3.5 px-2 rounded-full bg-[#00bda5] hover:bg-[#00a893] active:scale-95 text-white font-bold text-[13px] transition-all flex items-center justify-center shadow-md whitespace-nowrap"
                    >
                      {t("master.landing.plans.consultQuoteBtn")}
                    </button>
                    {plan.priceYearly > 0 && (
                      <button
                        onClick={() => navigate(`/checkout/${plan.code}`)}
                        className="flex-1 py-3.5 px-2 rounded-full bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 active:scale-95 text-white font-bold text-[13px] transition-all flex items-center justify-center gap-1.5 shadow-md whitespace-nowrap"
                      >
                        <span>{t("master.landing.plans.buyNowBtn")}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DETAILED FEATURE MATRIX TABLE */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm mb-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
              {t("master.landing.pricing.matrix.badge")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-3 mb-2">
              {t("master.landing.pricing.matrix.title")}
            </h2>
            <p className="text-slate-600 text-sm">
              {t("master.landing.pricing.matrix.subtitle")}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="py-4 px-5 font-semibold text-slate-900 w-2/5">
                    {t("master.landing.pricing.matrix.colFeature")}
                  </th>
                  <th className="py-4 px-5 font-semibold text-slate-700 text-center w-1/5">
                    {formatPlanDisplayName(plans[0]?.name, t) || t("master.landing.pricing.matrix.fallbackStarter")}
                  </th>
                  <th className="py-4 px-5 font-semibold text-blue-700 bg-blue-50/50 text-center w-1/5">
                    {formatPlanDisplayName(plans[1]?.name, t) || t("master.landing.pricing.matrix.fallbackPro")}
                  </th>
                  <th className="py-4 px-5 font-semibold text-slate-700 text-center w-1/5">
                    {formatPlanDisplayName(plans[2]?.name, t) || t("master.landing.pricing.matrix.fallbackEnterprise")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {featureMatrix.map((section, sIdx) => (
                  <Fragment key={sIdx}>
                    <tr className="bg-slate-100/60 font-bold text-slate-900">
                      <td colSpan={4} className="py-3 px-5 text-xs uppercase tracking-wider text-slate-700">
                        {section.category}
                      </td>
                    </tr>
                    {section.features.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-5 text-slate-800 font-medium">{row.name}</td>
                        <td className="py-3.5 px-5 text-center text-slate-600">
                          {typeof row.starter === "boolean" ? (
                            row.starter ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-slate-300 mx-auto" />
                            )
                          ) : (
                            row.starter
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-center font-semibold text-blue-900 bg-blue-50/30">
                          {typeof row.pro === "boolean" ? (
                            row.pro ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-slate-300 mx-auto" />
                            )
                          ) : (
                            row.pro
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-center text-slate-600">
                          {typeof row.enterprise === "boolean" ? (
                            row.enterprise ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-slate-300 mx-auto" />
                            )
                          ) : (
                            row.enterprise
                          )}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PRICING FAQ */}
        <div className="max-w-4xl mx-auto mb-24">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
              {t("master.landing.pricing.faq.badge")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-3 mb-2">
              {t("master.landing.pricing.faq.title")}
            </h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <h4 className="font-bold text-slate-900 mb-2">{t("master.landing.pricing.faq.q1")}</h4>
              <p className="text-slate-600 leading-relaxed">{t("master.landing.pricing.faq.a1")}</p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <h4 className="font-bold text-slate-900 mb-2">{t("master.landing.pricing.faq.q2")}</h4>
              <p className="text-slate-600 leading-relaxed">{t("master.landing.pricing.faq.a2")}</p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <h4 className="font-bold text-slate-900 mb-2">{t("master.landing.pricing.faq.q3")}</h4>
              <p className="text-slate-600 leading-relaxed">{t("master.landing.pricing.faq.a3")}</p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <h4 className="font-bold text-slate-900 mb-2">{t("master.landing.pricing.faq.q4")}</h4>
              <p className="text-slate-600 leading-relaxed">{t("master.landing.pricing.faq.a4")}</p>
            </div>
          </div>
        </div>

        {/* BOTTOM CTA */}
        <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-14 text-center shadow-xl">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4">
            {t("master.landing.pricing.bottomCta.title")}
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
            {t("master.landing.pricing.bottomCta.subtitle")}
          </p>
          <button
            onClick={() => openDemoModal(t("master.landing.shared.enterpriseTier"), "CONTRACT_QUOTE")}
            className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 transition-all inline-flex items-center gap-2"
          >
            <span>{t("master.landing.pricing.bottomCta.button")}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
