import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FileCheck2,
  Code2,
  Mic,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Layers,
  Bot
} from "lucide-react";
import { useLandingModal } from "../context/LandingModalContext";
import { useT } from "@/i18n";

export function SolutionsPage() {
  const t = useT();
  const { openDemoModal } = useLandingModal();

  const solutions = useMemo(
    () => [
      {
        id: "cv-screening",
        badge: t("master.landing.solutions.modules.cvScreening.badge"),
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        icon: FileCheck2,
        iconBg: "bg-blue-50 text-blue-600",
        title: t("master.landing.solutions.modules.cvScreening.title"),
        description: t("master.landing.solutions.modules.cvScreening.description"),
        features: [
          t("master.landing.solutions.modules.cvScreening.f1"),
          t("master.landing.solutions.modules.cvScreening.f2"),
          t("master.landing.solutions.modules.cvScreening.f3"),
          t("master.landing.solutions.modules.cvScreening.f4"),
        ],
        mockupType: "cv",
      },
      {
        id: "tech-assessment",
        badge: t("master.landing.solutions.modules.techAssessment.badge"),
        badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
        icon: Code2,
        iconBg: "bg-indigo-50 text-indigo-600",
        title: t("master.landing.solutions.modules.techAssessment.title"),
        description: t("master.landing.solutions.modules.techAssessment.description"),
        features: [
          t("master.landing.solutions.modules.techAssessment.f1"),
          t("master.landing.solutions.modules.techAssessment.f2"),
          t("master.landing.solutions.modules.techAssessment.f3"),
          t("master.landing.solutions.modules.techAssessment.f4"),
        ],
        mockupType: "code",
      },
      {
        id: "ai-interview",
        badge: t("master.landing.solutions.modules.aiInterview.badge"),
        badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
        icon: Mic,
        iconBg: "bg-amber-50 text-amber-600",
        title: t("master.landing.solutions.modules.aiInterview.title"),
        description: t("master.landing.solutions.modules.aiInterview.description"),
        features: [
          t("master.landing.solutions.modules.aiInterview.f1"),
          t("master.landing.solutions.modules.aiInterview.f2"),
          t("master.landing.solutions.modules.aiInterview.f3"),
          t("master.landing.solutions.modules.aiInterview.f4"),
        ],
        mockupType: "voice",
      },
      {
        id: "matching-ranking",
        badge: t("master.landing.solutions.modules.matchingRanking.badge"),
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: TrendingUp,
        iconBg: "bg-emerald-50 text-emerald-600",
        title: t("master.landing.solutions.modules.matchingRanking.title"),
        description: t("master.landing.solutions.modules.matchingRanking.description"),
        features: [
          t("master.landing.solutions.modules.matchingRanking.f1"),
          t("master.landing.solutions.modules.matchingRanking.f2"),
          t("master.landing.solutions.modules.matchingRanking.f3"),
          t("master.landing.solutions.modules.matchingRanking.f4"),
        ],
        mockupType: "ranking",
      },
      {
        id: "workflow-automation",
        badge: t("master.landing.solutions.modules.workflowAutomation.badge"),
        badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
        icon: Layers,
        iconBg: "bg-purple-50 text-purple-600",
        title: t("master.landing.solutions.modules.workflowAutomation.title"),
        description: t("master.landing.solutions.modules.workflowAutomation.description"),
        features: [
          t("master.landing.solutions.modules.workflowAutomation.f1"),
          t("master.landing.solutions.modules.workflowAutomation.f2"),
          t("master.landing.solutions.modules.workflowAutomation.f3"),
          t("master.landing.solutions.modules.workflowAutomation.f4"),
        ],
        mockupType: "pipeline",
      },
    ],
    [t],
  );

  const comparisonRows = useMemo(
    () => [
      {
        feature: t("master.landing.solutions.comparison.row1Feature"),
        traditional: t("master.landing.solutions.comparison.row1Trad"),
        smarthire: t("master.landing.solutions.comparison.row1Smart"),
      },
      {
        feature: t("master.landing.solutions.comparison.row2Feature"),
        traditional: t("master.landing.solutions.comparison.row2Trad"),
        smarthire: t("master.landing.solutions.comparison.row2Smart"),
      },
      {
        feature: t("master.landing.solutions.comparison.row3Feature"),
        traditional: t("master.landing.solutions.comparison.row3Trad"),
        smarthire: t("master.landing.solutions.comparison.row3Smart"),
      },
      {
        feature: t("master.landing.solutions.comparison.row4Feature"),
        traditional: t("master.landing.solutions.comparison.row4Trad"),
        smarthire: t("master.landing.solutions.comparison.row4Smart"),
      },
      {
        feature: t("master.landing.solutions.comparison.row5Feature"),
        traditional: t("master.landing.solutions.comparison.row5Trad"),
        smarthire: t("master.landing.solutions.comparison.row5Smart"),
      },
    ],
    [t],
  );

  return (
    <div className="py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* HERO INTRO */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.15] mb-6 bg-gradient-to-r from-slate-900 via-violet-600 to-purple-700 bg-clip-text text-transparent">
            {t("master.landing.solutions.hero.title")}
          </h1>

          <p className="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto mb-8 leading-relaxed">
            {t("master.landing.solutions.hero.subtitle")}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => openDemoModal(t("master.landing.shared.consultTier"))}
              className="px-8 py-3.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
            >
              <span>{t("master.landing.solutions.hero.primaryCta")}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/preview"
              className="px-8 py-3.5 text-sm font-semibold rounded-xl bg-white hover:bg-slate-50 active:scale-98 text-slate-700 border border-slate-300 shadow-2xs transition-all inline-flex items-center gap-2"
            >
              <span>{t("master.landing.solutions.hero.secondaryCta")}</span>
            </Link>
          </div>
        </div>

        {/* 5 DEEP DIVE SOLUTION MODULES */}
        <div className="space-y-16 mb-28">
          {solutions.map((sol, index) => {
            const Icon = sol.icon;
            const isReversed = index % 2 !== 0;

            return (
              <div
                key={sol.id}
                className={`grid lg:grid-cols-12 gap-10 items-center rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 ${
                  isReversed ? "lg:grid-flow-dense" : ""
                }`}
              >
                {/* Left Description Column */}
                <div className={`space-y-5 lg:col-span-6 ${isReversed ? "lg:col-start-7" : ""}`}>
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${sol.badgeColor}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{sol.badge}</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    {sol.title}
                  </h2>

                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    {sol.description}
                  </p>

                  <div className="space-y-3 pt-2">
                    {sol.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-sm text-slate-700 font-medium">
                          {feat}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => openDemoModal(sol.title)}
                      className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 group"
                    >
                      <span>{t("master.landing.solutions.tryFeatureBtn")}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Right Visual / Mockup Preview */}
                <div className={`lg:col-span-6 ${isReversed ? "lg:col-start-1" : ""}`}>
                  {sol.mockupType === "cv" && (
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 shadow-inner space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                            {t("master.landing.solutions.mockups.cv.initials")}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">
                              {t("master.landing.solutions.mockups.cv.candidateName")}
                            </div>
                            <div className="text-xs text-slate-500">
                              {t("master.landing.solutions.mockups.cv.appliedRole")}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-blue-600">96 / 100</span>
                          <div className="text-[11px] text-emerald-600 font-semibold">
                            {t("master.landing.solutions.mockups.cv.matchBadge")}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-slate-700 block">
                          {t("master.landing.solutions.mockups.cv.extractedSkillsTitle")}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-xs font-medium">
                            {t("master.landing.solutions.mockups.cv.skill1")}
                          </span>
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-xs font-medium">
                            {t("master.landing.solutions.mockups.cv.skill2")}
                          </span>
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-xs font-medium">
                            {t("master.landing.solutions.mockups.cv.skill3")}
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed shadow-2xs">
                        <div className="font-semibold text-blue-700 mb-1 flex items-center gap-1.5">
                          <Bot className="w-4 h-4" /> {t("master.landing.solutions.mockups.cv.aiEvalTitle")}
                        </div>
                        {t("master.landing.solutions.mockups.cv.aiEvalBody")}
                      </div>
                    </div>
                  )}

                  {sol.mockupType === "code" && (
                    <div className="rounded-2xl bg-slate-900 text-white p-6 font-mono text-xs shadow-xl border border-slate-800">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-3">
                        <span className="text-slate-400">
                          {t("master.landing.solutions.mockups.code.fileHeader")}
                        </span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />{" "}
                          {t("master.landing.solutions.mockups.code.testsPassed")}
                        </span>
                      </div>
                      <div className="text-slate-300 space-y-1 text-xs mb-4">
                        <p><span className="text-blue-400">public</span> <span className="text-blue-400">int</span> maxSubArray(<span className="text-blue-400">int</span>[] nums) &#123;</p>
                        <p className="pl-4 text-slate-500">// Kadane's Algorithm O(n)</p>
                        <p className="pl-4"><span className="text-blue-400">int</span> maxSoFar = nums[0], curr = nums[0];</p>
                        <p className="pl-4"><span className="text-purple-400">for</span> (<span className="text-blue-400">int</span> i = 1; i &lt; nums.length; i++) &#123;</p>
                        <p className="pl-8">curr = Math.max(nums[i], curr + nums[i]);</p>
                        <p className="pl-8">maxSoFar = Math.max(maxSoFar, curr);</p>
                        <p className="pl-4">&#125;</p>
                        <p className="pl-4"><span className="text-purple-400">return</span> maxSoFar;</p>
                        <p>&#125;</p>
                      </div>
                      <div className="pt-3 border-t border-slate-700 flex items-center justify-between text-slate-400 text-[11px]">
                        <span>{t("master.landing.solutions.mockups.code.metrics")}</span>
                        <span className="text-emerald-400 font-semibold">
                          {t("master.landing.solutions.mockups.code.sandboxScore")}
                        </span>
                      </div>
                    </div>
                  )}

                  {sol.mockupType === "voice" && (
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 shadow-inner space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                          <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                            {t("master.landing.solutions.mockups.voice.sessionTitle")}
                          </span>
                        </div>
                        <span className="text-slate-500 font-mono text-xs">00:04:18</span>
                      </div>
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs">
                        <div className="text-[11px] font-semibold text-blue-600 mb-1">
                          {t("master.landing.solutions.mockups.voice.questionLabel")}
                        </div>
                        <p className="text-slate-700 italic">
                          {t("master.landing.solutions.mockups.voice.questionText")}
                        </p>
                      </div>
                      <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 text-xs space-y-2">
                        <div className="font-semibold text-slate-800 text-[11px]">
                          {t("master.landing.solutions.mockups.voice.analysisTitle")}
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>{t("master.landing.solutions.mockups.voice.metric1Label")}</span>
                          <span className="font-semibold text-blue-700">92%</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>{t("master.landing.solutions.mockups.voice.metric2Label")}</span>
                          <span className="font-semibold text-blue-700">89%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {sol.mockupType === "ranking" && (
                    <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-md space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-xs font-semibold text-slate-800">
                          {t("master.landing.solutions.mockups.ranking.title")}
                        </span>
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {t("master.landing.solutions.mockups.ranking.badge")}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            {t("master.landing.solutions.mockups.ranking.cand1Name")}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {t("master.landing.solutions.mockups.ranking.cand1Meta")}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-blue-700">
                          {t("master.landing.solutions.mockups.ranking.cand1Score")}
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-slate-800">
                            {t("master.landing.solutions.mockups.ranking.cand2Name")}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {t("master.landing.solutions.mockups.ranking.cand2Meta")}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-700">
                          {t("master.landing.solutions.mockups.ranking.cand2Score")}
                        </span>
                      </div>
                    </div>
                  )}

                  {sol.mockupType === "pipeline" && (
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 shadow-inner">
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                          <div className="text-slate-500 text-[10px] mb-1">
                            {t("master.landing.solutions.mockups.pipeline.step1Label")}
                          </div>
                          <div className="font-bold text-slate-900 text-sm">48</div>
                          <div className="text-[10px] text-blue-600 mt-1">
                            {t("master.landing.solutions.mockups.pipeline.step1Tag")}
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                          <div className="text-slate-500 text-[10px] mb-1">
                            {t("master.landing.solutions.mockups.pipeline.step2Label")}
                          </div>
                          <div className="font-bold text-slate-900 text-sm">14</div>
                          <div className="text-[10px] text-indigo-600 mt-1">
                            {t("master.landing.solutions.mockups.pipeline.step2Tag")}
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                          <div className="text-slate-500 text-[10px] mb-1">
                            {t("master.landing.solutions.mockups.pipeline.step3Label")}
                          </div>
                          <div className="font-bold text-slate-900 text-sm">8</div>
                          <div className="text-[10px] text-amber-600 mt-1">
                            {t("master.landing.solutions.mockups.pipeline.step3Tag")}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* COMPARISON TABLE: TRADITIONAL VS SMARTHIRE AI */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm mb-24">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
              {t("master.landing.solutions.comparison.badge")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-3 mb-2">
              {t("master.landing.solutions.comparison.title")}
            </h2>
            <p className="text-slate-600 text-sm">
              {t("master.landing.solutions.comparison.subtitle")}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="py-4 px-5 font-semibold text-slate-900">
                    {t("master.landing.solutions.comparison.colStage")}
                  </th>
                  <th className="py-4 px-5 font-semibold text-rose-700 bg-rose-50/40">
                    {t("master.landing.solutions.comparison.colTraditional")}
                  </th>
                  <th className="py-4 px-5 font-semibold text-blue-700 bg-blue-50/50">
                    {t("master.landing.solutions.comparison.colSmartHire")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisonRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-5 font-semibold text-slate-900">{row.feature}</td>
                    <td className="py-4 px-5 text-slate-600 bg-rose-50/20">
                      <div className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span>{row.traditional}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-slate-900 font-medium bg-blue-50/30">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{row.smarthire}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* BOTTOM CTA */}
        <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-8 sm:p-14 text-white text-center shadow-xl">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4">
            {t("master.landing.solutions.bottomCta.title")}
          </h2>
          <p className="text-blue-100 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
            {t("master.landing.solutions.bottomCta.subtitle")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => openDemoModal(t("master.landing.shared.consultTier"))}
              className="px-8 py-3.5 rounded-xl bg-white text-blue-700 font-semibold text-sm hover:bg-blue-50 shadow-md active:scale-95 transition-all"
            >
              {t("master.landing.solutions.bottomCta.primaryBtn")}
            </button>
            <Link
              to="/pricing"
              className="px-8 py-3.5 rounded-xl bg-blue-800/60 hover:bg-blue-800 text-white font-semibold text-sm border border-blue-400/40 active:scale-95 transition-all"
            >
              {t("master.landing.solutions.bottomCta.secondaryBtn")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
