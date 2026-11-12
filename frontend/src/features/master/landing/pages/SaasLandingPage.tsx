import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import {
  CheckCircle2,
  ArrowRight,
  Sparkles,
  FileCheck2,
  Code2,
  Mic,
  ChevronDown,
  TrendingUp,
  Clock,
  UserCheck,
  Award,
  Activity,
  Check,
  DollarSign,
  ChevronRight
} from "lucide-react";
import { useLandingModal } from "../context/LandingModalContext";
import { PlanFeatureList } from "../components/PlanFeatureList";
import { checkoutApi, PublicSubscriptionPlan } from "@/api/master/checkoutApi";
import { SkeletonCard } from "@/components/ux/Skeleton";
import { LEGAL_POLICY_META } from "@/config/legalConfig";
import { formatNumber, useLocale, useT } from "@/i18n";

export function SaasLandingPage() {
  const t = useT();
  const locale = useLocale();
  const navigate = useNavigate();
  const { openDemoModal, openWorkspaceModal } = useLandingModal();
  const [plans, setPlans] = useState<PublicSubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Smooth scroll-reveal animations
  useScrollReveal();

  useEffect(() => {
    checkoutApi.getPublicPlans()
      .then(data => {
        const standardPlans = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
        let fetchedPlans = data
          .filter(p => p.status === "ACTIVE" && standardPlans.includes(p.code))
          .sort((a, b) => (a.priceYearly || 0) - (b.priceYearly || 0));

        if (fetchedPlans.length === 0) {
          fetchedPlans = data
            .filter(p => p.status === "ACTIVE" && p.priceYearly > 0)
            .sort((a, b) => (a.priceYearly || 0) - (b.priceYearly || 0))
            .slice(0, 3);
        }
        setPlans(fetchedPlans);
      })
      .catch(err => console.error("Failed to fetch plans", err))
      .finally(() => setLoadingPlans(false));
  }, []);

  // Interactive FAQ State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const faqs = useMemo(
    () => [
      {
        q: t("master.landing.saas.faq.q1"),
        a: t("master.landing.saas.faq.a1"),
      },
      {
        q: t("master.landing.saas.faq.q2"),
        a: t("master.landing.saas.faq.a2"),
      },
      {
        q: t("master.landing.saas.faq.q3"),
        a: t("master.landing.saas.faq.a3"),
      },
      {
        q: t("master.landing.saas.faq.q4"),
        a: t("master.landing.saas.faq.a4"),
      },
    ],
    [t],
  );

  return (
    <>
      {/* HERO SECTION */}
      <section className="pt-16 pb-12 md:pt-24 md:pb-20 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-4xl mx-auto">
          <h1 data-reveal="fade-up" className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.15] mb-6">
            {t("master.landing.saas.hero.titlePrefix")}{" "}
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow-sm">
              {t("master.landing.saas.hero.titleHighlight")}
            </span>
          </h1>

          <p data-reveal="fade-up" style={{ transitionDelay: "80ms" }} className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            {t("master.landing.saas.hero.subtitle")}
          </p>

          <div data-reveal="fade-up" style={{ transitionDelay: "160ms" }} className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-16">
            <button
              onClick={() => openDemoModal(t("master.landing.shared.consultTier"))}
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2.5 group"
            >
              <span>{t("master.landing.saas.hero.primaryCta")}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <Link
              to="/preview"
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold rounded-xl bg-white hover:bg-slate-50 active:scale-98 text-slate-700 border border-slate-300 shadow-2xs transition-all inline-flex items-center justify-center"
            >
              {t("master.landing.saas.hero.secondaryCta")}
            </Link>
          </div>

          {/* LIVE PRODUCT PREVIEW MOCKUP WITH FLOATING CHIPS */}
          <div data-reveal="scale-up" style={{ transitionDelay: "240ms" }} className="relative max-w-5xl mx-auto mt-4 mb-16">
            {/* Floating Chip Left */}
            <div className="hidden lg:flex items-center gap-3 absolute -top-6 -left-6 z-20 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-900/5 animate-float">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-semibold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-left text-xs">
                <div className="font-semibold text-slate-900">
                  {t("master.landing.saas.hero.chipLeftTitle", {
                    count: formatNumber(1840, undefined, locale),
                  })}
                </div>
                <div className="text-slate-500 font-medium">{t("master.landing.saas.hero.chipLeftSub")}</div>
              </div>
            </div>

            {/* Floating Chip Right */}
            <div className="hidden lg:flex items-center gap-3 absolute -bottom-6 -right-6 z-20 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-900/5 animate-float-delayed">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold">
                <Activity className="w-5 h-5" />
              </div>
              <div className="text-left text-xs">
                <div className="font-semibold text-slate-900">{t("master.landing.saas.hero.chipRightTitle")}</div>
                <div className="text-slate-500 font-medium">{t("master.landing.saas.hero.chipRightSub")}</div>
              </div>
            </div>

            {/* Central Mockup Shell */}
            <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xl shadow-blue-900/5 overflow-hidden text-left transition-all hover:shadow-blue-900/10">
              {/* Mockup Header Bar */}
              <div className="bg-slate-50/90 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-400" />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-3 text-xs font-mono text-slate-500 font-medium">
                    smarthire.top/workspace/pipeline/senior-fullstack
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                    {t("master.landing.pipelineMockup.liveBadge")}
                  </span>
                </div>
              </div>

              {/* Mockup Content: Pipeline Columns */}
              <div className="p-6 bg-slate-50/50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Column 1: CV Screening */}
                  <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                      <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>{t("master.landing.pipelineMockup.col1Title")}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        48
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200/70 mb-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-900">
                          {t("master.landing.pipelineMockup.col1Cand1Name")}
                        </span>
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                          {t("master.landing.pipelineMockup.col1Cand1Match")}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {t("master.landing.pipelineMockup.col1Cand1Role")}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-[10px] bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                          Spring Boot
                        </span>
                        <span className="text-[10px] bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                          PostgreSQL
                        </span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-white border border-slate-200 opacity-70">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-800">
                          {t("master.landing.pipelineMockup.col1Cand2Name")}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {t("master.landing.pipelineMockup.col1Cand2Match")}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {t("master.landing.pipelineMockup.col1Cand2Role")}
                      </p>
                    </div>
                  </div>

                  {/* Column 2: Code Assessment */}
                  <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                      <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{t("master.landing.pipelineMockup.col2Title")}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        14
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-200/70 mb-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-900">
                          {t("master.landing.pipelineMockup.col2Cand1Name")}
                        </span>
                        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                          100/100
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {t("master.landing.pipelineMockup.col2Cand1Meta")}
                      </p>
                      <div className="mt-2 text-[10px] text-emerald-700 flex items-center gap-1 font-semibold">
                        <Check className="w-3 h-3" /> {t("master.landing.pipelineMockup.col2Cand1Note")}
                      </div>
                    </div>
                  </div>

                  {/* Column 3: AI Interview */}
                  <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                      <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <Mic className="w-3.5 h-3.5 text-amber-600" />
                        <span>{t("master.landing.pipelineMockup.col3Title")}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        8
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200/70 mb-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-900">
                          {t("master.landing.pipelineMockup.col3Cand1Name")}
                        </span>
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          9.2 / 10
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {t("master.landing.pipelineMockup.col3Cand1Meta")}
                      </p>
                      <div className="mt-2 text-[10px] text-amber-800 bg-white px-2 py-1 rounded border border-amber-200">
                        {t("master.landing.pipelineMockup.col3Cand1Note")}
                      </div>
                    </div>
                  </div>

                  {/* Column 4: Offer */}
                  <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                      <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{t("master.landing.pipelineMockup.col4Title")}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        5
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/70">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-900">
                          {t("master.landing.pipelineMockup.col4Cand1Name")}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          {t("master.landing.pipelineMockup.col4Cand1Status")}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {t("master.landing.pipelineMockup.col4Cand1Role")}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {t("master.landing.pipelineMockup.col4Cand1Note")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TRUST BANNER */}
          <div data-reveal="fade-in" className="pt-8 border-t border-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-6">
              {t("master.landing.saas.trust.heading")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-75 hover:opacity-100 transition-opacity">
              <span className="text-sm sm:text-base font-semibold text-slate-700 tracking-wider">VIETTEL SOLUTIONS</span>
              <span className="text-sm sm:text-base font-semibold text-slate-700 tracking-wider">VNG CORPORATION</span>
              <span className="text-sm sm:text-base font-semibold text-slate-700 tracking-wider">FPT SOFTWARE</span>
              <span className="text-sm sm:text-base font-semibold text-slate-700 tracking-wider">TECHCOMBANK</span>
              <span className="text-sm sm:text-base font-semibold text-slate-700 tracking-wider">VNPT-IT</span>
            </div>
          </div>
        </div>
      </section>

      {/* CORE SOLUTIONS TEASER SECTION */}
      <section className="py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-6">
          <div data-reveal="fade-up" className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
              {t("master.landing.saas.solutionsTeaser.badge")}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-4 mb-4">
              {t("master.landing.saas.solutionsTeaser.title")}
            </h2>
            <p className="text-slate-600 text-base leading-relaxed">
              {t("master.landing.saas.solutionsTeaser.subtitle")}
            </p>
          </div>

          <div data-reveal-stagger className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="p-8 rounded-3xl bg-slate-50/70 border border-slate-200 hover:border-blue-400 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 border border-blue-200 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {t("master.landing.saas.solutionsTeaser.card1Title")}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                {t("master.landing.saas.solutionsTeaser.card1Desc")}
              </p>
              <Link to="/solutions" className="text-xs font-semibold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>{t("master.landing.saas.solutionsTeaser.exploreLink")}</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50/70 border border-slate-200 hover:border-indigo-400 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 border border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Code2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {t("master.landing.saas.solutionsTeaser.card2Title")}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                {t("master.landing.saas.solutionsTeaser.card2Desc")}
              </p>
              <Link to="/solutions" className="text-xs font-semibold text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>{t("master.landing.saas.solutionsTeaser.exploreLink")}</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50/70 border border-slate-200 hover:border-amber-400 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-5 border border-amber-200 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {t("master.landing.saas.solutionsTeaser.card3Title")}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                {t("master.landing.saas.solutionsTeaser.card3Desc")}
              </p>
              <Link to="/solutions" className="text-xs font-semibold text-amber-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>{t("master.landing.saas.solutionsTeaser.exploreLink")}</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/solutions"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-50 text-blue-700 font-semibold text-xs sm:text-sm border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <span>{t("master.landing.saas.solutionsTeaser.viewAllBtn")}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* VALUE & ROI SECTION */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div data-reveal="fade-up" className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
            {t("master.landing.saas.valueRoi.badge")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-4 mb-4">
            {t("master.landing.saas.valueRoi.title")}
          </h2>
          <p className="text-slate-600 text-base leading-relaxed">
            {t("master.landing.saas.valueRoi.subtitle")}
          </p>
        </div>

        <div data-reveal-stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center hover:-translate-y-1.5 hover:shadow-xl hover:border-blue-400/40 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-200 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
              <Clock className="w-6 h-6" />
            </div>
            <div className="text-4xl font-extrabold text-slate-900 mb-2">-70%</div>
            <h4 className="text-base font-bold text-slate-900 mb-1">
              {t("master.landing.saas.valueRoi.stat1Label")}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t("master.landing.saas.valueRoi.stat1Desc")}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center hover:-translate-y-1.5 hover:shadow-xl hover:border-indigo-400/40 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-200 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="text-4xl font-extrabold text-slate-900 mb-2">3.5x</div>
            <h4 className="text-base font-bold text-slate-900 mb-1">
              {t("master.landing.saas.valueRoi.stat2Label")}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t("master.landing.saas.valueRoi.stat2Desc")}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center hover:-translate-y-1.5 hover:shadow-xl hover:border-emerald-400/40 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="text-4xl font-extrabold text-slate-900 mb-2">99.2%</div>
            <h4 className="text-base font-bold text-slate-900 mb-1">
              {t("master.landing.saas.valueRoi.stat3Label")}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t("master.landing.saas.valueRoi.stat3Desc")}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center hover:-translate-y-1.5 hover:shadow-xl hover:border-amber-400/40 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="text-4xl font-extrabold text-slate-900 mb-2">45%</div>
            <h4 className="text-base font-bold text-slate-900 mb-1">
              {t("master.landing.saas.valueRoi.stat4Label")}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t("master.landing.saas.valueRoi.stat4Desc")}
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link
            to="/roi"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 text-slate-800 font-semibold text-xs sm:text-sm hover:bg-slate-200 transition-colors"
          >
            <span>{t("master.landing.saas.valueRoi.ctaLink")}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* SECURITY TEASER SECTION */}
      <section className="py-12 sm:py-16 max-w-7xl mx-auto px-6">
        <div data-reveal="scale-up" className="relative rounded-[32px] sm:rounded-[36px] overflow-hidden bg-white border border-slate-200/80 p-8 sm:p-12 lg:p-14 shadow-xl shadow-slate-200/40">
          {/* Ambient Warm Gradient */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-orange-300/30 via-rose-200/20 to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Ambient Lavender/Cool Tint */}
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-gradient-to-tr from-blue-200/25 via-indigo-100/20 to-transparent rounded-full blur-2xl pointer-events-none" />

          {/* Faint Tech Ring Watermark */}
          <svg
            className="absolute -bottom-12 -left-12 w-72 h-72 text-indigo-900/[0.035] pointer-events-none"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="100" cy="100" r="25" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="100" cy="100" r="50" stroke="currentColor" strokeWidth="1" />
            <circle cx="100" cy="100" r="75" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="100" cy="100" r="100" stroke="currentColor" strokeWidth="1" />
            <circle cx="100" cy="100" r="125" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" />
            <circle cx="100" cy="100" r="150" stroke="currentColor" strokeWidth="1" />
          </svg>

          <div className="relative grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Heading + Checklist + Buttons */}
            <div data-reveal="slide-left" className="lg:col-span-6 xl:col-span-6">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 leading-tight mb-6">
                <span className="text-[#f05123] font-bold">
                  {t("master.landing.saas.security.titleHighlight")}
                </span>{" "}
                <br className="hidden sm:inline" />
                {t("master.landing.saas.security.titleRest")}
              </h2>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#f05123] shrink-0 stroke-[2.5]" />
                  <span className="text-sm text-slate-700">
                    {t("master.landing.saas.security.check1")}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#f05123] shrink-0 stroke-[2.5]" />
                  <span className="text-sm text-slate-700">
                    {t("master.landing.saas.security.check2")}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#f05123] shrink-0 stroke-[2.5]" />
                  <span className="text-sm text-slate-700">
                    {t("master.landing.saas.security.check3", {
                      law: LEGAL_POLICY_META.lawLabel,
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-[#f05123] shrink-0 stroke-[2.5]" />
                  <span className="text-sm text-slate-700">
                    {t("master.landing.saas.security.check4")}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  to={`/demo?${new URLSearchParams({
                    tier: t("master.landing.shared.consultTier"),
                    type: "DEMO",
                  }).toString()}`}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#ff4d2e] to-[#f05123] hover:from-[#f04121] hover:to-[#e03a18] text-white font-semibold text-sm shadow-md shadow-orange-500/20 active:scale-98 transition-all inline-flex items-center justify-center cursor-pointer"
                >
                  {t("master.landing.saas.security.tryFreeBtn")}
                </Link>
                <Link
                  to="/security"
                  className="px-5 py-3 rounded-xl border border-[#f05123] text-[#f05123] hover:bg-orange-50/60 font-semibold text-sm inline-flex items-center gap-1.5 active:scale-98 transition-all"
                >
                  <span>{t("master.landing.saas.security.learnMoreBtn")}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right Column: White framed media card */}
            <div data-reveal="slide-right" style={{ transitionDelay: "100ms" }} className="lg:col-span-6 xl:col-span-6">
              <div className="bg-white rounded-3xl p-3 sm:p-4 shadow-xl shadow-slate-200/60 border border-slate-100">
                <div className="relative overflow-hidden rounded-2xl aspect-[4/3] bg-slate-100">
                  <img
                    src="/security_showcase.jpg"
                    alt={t("master.landing.saas.security.imageAlt")}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 px-4 sm:px-5 py-2 rounded-lg bg-black/75 backdrop-blur-md text-white text-xs sm:text-sm font-medium shadow-lg whitespace-nowrap">
                    {t("master.landing.saas.security.imageBadge")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PACKAGES PREVIEW SECTION */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div data-reveal="fade-up" className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
            {t("master.landing.plans.badge")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-4 mb-4">
            {t("master.landing.plans.title")}
          </h2>
          <p className="text-slate-600 text-base">
            {t("master.landing.plans.subtitle")}
          </p>
        </div>

        {/* SMALL INTRO / CTA */}
        <div data-reveal="fade-up" className="flex flex-wrap items-center justify-center gap-3 mb-10">
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

        <div data-reveal-stagger className="grid lg:grid-cols-3 gap-8 items-stretch mb-12">
          {loadingPlans ? (
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
              const cleanName = plan.name.replace(/\s*\(.*?\)\s*/g, "");

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

        <div className="text-center">
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-50 text-blue-700 font-semibold text-xs sm:text-sm hover:bg-blue-100 transition-colors"
          >
            <span>{t("master.landing.saas.pricingViewAllBtn")}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-4xl mx-auto px-6">
          <div data-reveal="fade-up" className="text-center mb-14">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
              {t("master.landing.saas.faq.badge")}
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 mt-4 mb-3">
              {t("master.landing.saas.faq.title")}
            </h2>
            <p className="text-slate-600 text-sm">
              {t("master.landing.saas.faq.subtitle")}
            </p>
          </div>

          <div data-reveal-stagger className="space-y-4">
            {faqs.map((faq, index) => {
              const isExpanded = expandedFaq === index;
              return (
                <div
                  key={index}
                  className="border border-slate-200 rounded-2xl overflow-hidden transition-all duration-200 hover:border-blue-300 bg-white shadow-2xs"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full py-4.5 px-6 text-left flex items-center justify-between gap-4 font-semibold text-slate-900 text-sm sm:text-base hover:text-blue-600 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <div
                      className={`w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 transition-transform duration-200 ${
                        isExpanded ? "rotate-180 bg-blue-50 text-blue-600" : "text-slate-400"
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA SECTION */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        </div>
        <div data-reveal="fade-up" className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-sky-400 text-xs font-semibold mb-6 border border-slate-700">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t("master.landing.saas.bottomCta.badge")}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6">
            {t("master.landing.saas.bottomCta.title")}
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            {t("master.landing.saas.bottomCta.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => openDemoModal(t("master.landing.shared.consultTier"))}
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-xl shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
            >
              <span>{t("master.landing.saas.bottomCta.primaryBtn")}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={openWorkspaceModal}
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-200 border border-slate-700 transition-all"
            >
              {t("master.landing.saas.bottomCta.secondaryBtn")}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
