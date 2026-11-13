import { useState } from "react";
import {
  FileCheck2,
  Code2,
  Mic,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Terminal,
  Check,
  Award,
  Volume2
} from "lucide-react";
import { useLandingModal } from "../context/LandingModalContext";
import { useT } from "@/i18n";

export function PreviewPage() {
  const t = useT();
  const { openDemoModal } = useLandingModal();
  const [activeTab, setActiveTab] = useState<"screening" | "assessment" | "interview">("screening");

  return (
    <div className="py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* HERO INTRO */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6 shadow-2xs">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>{t("master.landing.preview.hero.badge")}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.15] mb-6">
            {t("master.landing.preview.hero.titlePrefix")}{" "}
            <span className="text-blue-600 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 bg-clip-text text-transparent">
              {t("master.landing.preview.hero.titleHighlight")}
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-8 leading-relaxed">
            {t("master.landing.preview.hero.subtitle")}
          </p>

          {/* Interactive Tab Switcher */}
          <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-slate-200/70 max-w-xl mx-auto">
            <button
              onClick={() => setActiveTab("screening")}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === "screening"
                  ? "bg-white text-blue-700 shadow-md shadow-slate-900/5"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>{t("master.landing.preview.hero.tabScreening")}</span>
            </button>
            <button
              onClick={() => setActiveTab("assessment")}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === "assessment"
                  ? "bg-white text-blue-700 shadow-md shadow-slate-900/5"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>{t("master.landing.preview.hero.tabAssessment")}</span>
            </button>
            <button
              onClick={() => setActiveTab("interview")}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === "interview"
                  ? "bg-white text-blue-700 shadow-md shadow-slate-900/5"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>{t("master.landing.preview.hero.tabInterview")}</span>
            </button>
          </div>
        </div>

        {/* TAB INTERACTIVE DISPLAY CARD */}
        <div className="max-w-5xl mx-auto rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-900/5 p-6 sm:p-12 mb-24 transition-all duration-300">
          {activeTab === "screening" && (
            <div className="grid md:grid-cols-12 gap-8 items-center animate-fade-in">
              <div className="md:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" /> {t("master.landing.preview.tabs.screening.badge")}
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {t("master.landing.preview.tabs.screening.title")}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {t("master.landing.preview.tabs.screening.description")}
                </p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 font-medium pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />{" "}
                    {t("master.landing.preview.tabs.screening.b1")}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />{" "}
                    {t("master.landing.preview.tabs.screening.b2")}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />{" "}
                    {t("master.landing.preview.tabs.screening.b3")}
                  </li>
                </ul>
              </div>
              <div className="md:col-span-6 bg-slate-50 rounded-2xl p-6 border border-slate-200 font-sans text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                      {t("master.landing.preview.tabs.screening.initials")}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">
                        {t("master.landing.preview.tabs.screening.candidateName")}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {t("master.landing.preview.tabs.screening.appliedRole")}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-blue-600">96 / 100</span>
                    <div className="text-[10px] text-emerald-600 font-semibold">
                      {t("master.landing.preview.tabs.screening.matchStatus")}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-700 block mb-1.5">
                      {t("master.landing.preview.tabs.screening.matchedSkillsLabel")}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-medium">
                        {t("master.landing.preview.tabs.screening.skill1")}
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-medium">
                        {t("master.landing.preview.tabs.screening.skill2")}
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-medium">
                        {t("master.landing.preview.tabs.screening.skill3")}
                      </span>
                    </div>
                  </div>
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed shadow-2xs">
                    <strong>{t("master.landing.preview.tabs.screening.aiCommentLabel")}</strong>{" "}
                    {t("master.landing.preview.tabs.screening.aiCommentBody")}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "assessment" && (
            <div className="grid md:grid-cols-12 gap-8 items-center animate-fade-in">
              <div className="md:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                  <Terminal className="w-3.5 h-3.5" /> {t("master.landing.preview.tabs.assessment.badge")}
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {t("master.landing.preview.tabs.assessment.title")}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {t("master.landing.preview.tabs.assessment.description")}
                </p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 font-medium pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />{" "}
                    {t("master.landing.preview.tabs.assessment.b1")}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />{" "}
                    {t("master.landing.preview.tabs.assessment.b2")}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />{" "}
                    {t("master.landing.preview.tabs.assessment.b3")}
                  </li>
                </ul>
              </div>
              <div className="md:col-span-6 bg-slate-900 rounded-2xl p-6 text-white font-mono text-xs shadow-inner border border-slate-800">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-3">
                  <span className="text-slate-400">
                    {t("master.landing.preview.tabs.assessment.fileHeader")}
                  </span>
                  <span className="text-emerald-400 font-semibold">
                    {t("master.landing.preview.tabs.assessment.testsPassed")}
                  </span>
                </div>
                <div className="text-slate-300 space-y-1 text-[11px] mb-4">
                  <p><span className="text-blue-400">public</span> <span className="text-blue-400">int</span> maxSubArray(<span className="text-blue-400">int</span>[] nums) &#123;</p>
                  <p className="pl-4 text-slate-400">// Kadane's Algorithm O(n)</p>
                  <p className="pl-4"><span className="text-blue-400">int</span> maxSoFar = nums[0], curr = nums[0];</p>
                  <p className="pl-4"><span className="text-purple-400">for</span> (<span className="text-blue-400">int</span> i = 1; i &lt; nums.length; i++) &#123;</p>
                  <p className="pl-8">curr = Math.max(nums[i], curr + nums[i]);</p>
                  <p className="pl-8">maxSoFar = Math.max(maxSoFar, curr);</p>
                  <p className="pl-4">&#125;</p>
                  <p className="pl-4"><span className="text-purple-400">return</span> maxSoFar;</p>
                  <p>&#125;</p>
                </div>
                <div className="pt-3 border-t border-slate-700 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{t("master.landing.preview.tabs.assessment.execTime")}</span>
                  <span className="text-emerald-400 font-semibold">
                    {t("master.landing.preview.tabs.assessment.perfectScore")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "interview" && (
            <div className="grid md:grid-cols-12 gap-8 items-center animate-fade-in">
              <div className="md:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">
                  <Mic className="w-3.5 h-3.5" /> {t("master.landing.preview.tabs.interview.badge")}
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {t("master.landing.preview.tabs.interview.title")}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {t("master.landing.preview.tabs.interview.description")}
                </p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 font-medium pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />{" "}
                    {t("master.landing.preview.tabs.interview.b1")}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />{" "}
                    {t("master.landing.preview.tabs.interview.b2")}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />{" "}
                    {t("master.landing.preview.tabs.interview.b3")}
                  </li>
                </ul>
              </div>
              <div className="md:col-span-6 bg-slate-50 rounded-2xl p-6 border border-slate-200 font-sans text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="font-semibold text-slate-900">
                      {t("master.landing.preview.tabs.interview.sessionStatus")}
                    </span>
                  </div>
                  <span className="text-slate-500 font-mono text-[11px]">00:04:18</span>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 mb-3 shadow-2xs">
                  <div className="text-[11px] font-semibold text-blue-600 mb-1 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" />{" "}
                    {t("master.landing.preview.tabs.interview.questionLabel")}
                  </div>
                  <p className="text-slate-700 italic">
                    {t("master.landing.preview.tabs.interview.questionText")}
                  </p>
                </div>
                <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-800 mb-1">
                    {t("master.landing.preview.tabs.interview.analysisTitle")}
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>{t("master.landing.preview.tabs.interview.metric1Label")}</span>
                    <span className="font-semibold text-blue-700">92%</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>{t("master.landing.preview.tabs.interview.metric2Label")}</span>
                    <span className="font-semibold text-blue-700">89%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FULL PIPELINE MOCKUP SHELL */}
        <div className="rounded-3xl bg-white border border-slate-200/90 shadow-2xl shadow-blue-900/5 overflow-hidden text-left mb-24">
          {/* Mockup Header Bar */}
          <div className="bg-slate-50/90 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-400" />
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="ml-3 text-xs font-mono text-slate-500 font-medium">
                smarthire.top/workspace/pipeline/senior-fullstack
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-md border border-blue-200">
                {t("master.landing.pipelineMockup.previewBadge")}
              </span>
            </div>
          </div>

          {/* Mockup Content: Pipeline Columns */}
          <div className="p-6 sm:p-8 bg-slate-50/50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Column 1: CV Screening */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
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
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
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
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
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
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
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

        {/* 4-STEP RECRUITMENT FLOW */}
        <div className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
              {t("master.landing.preview.flow.badge")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-3 mb-2">
              {t("master.landing.preview.flow.title")}
            </h2>
            <p className="text-slate-600 text-sm">
              {t("master.landing.preview.flow.subtitle")}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs relative">
              <span className="text-3xl font-extrabold text-blue-100 absolute top-4 right-4">01</span>
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                {t("master.landing.preview.flow.s1Title")}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t("master.landing.preview.flow.s1Desc")}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs relative">
              <span className="text-3xl font-extrabold text-blue-100 absolute top-4 right-4">02</span>
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                {t("master.landing.preview.flow.s2Title")}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t("master.landing.preview.flow.s2Desc")}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs relative">
              <span className="text-3xl font-extrabold text-blue-100 absolute top-4 right-4">03</span>
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                {t("master.landing.preview.flow.s3Title")}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t("master.landing.preview.flow.s3Desc")}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs relative">
              <span className="text-3xl font-extrabold text-blue-100 absolute top-4 right-4">04</span>
              <h3 className="text-base font-semibold text-slate-900 mb-2">
                {t("master.landing.preview.flow.s4Title")}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t("master.landing.preview.flow.s4Desc")}
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM CTA */}
        <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-14 text-center shadow-xl">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4">
            {t("master.landing.preview.bottomCta.title")}
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
            {t("master.landing.preview.bottomCta.subtitle")}
          </p>
          <button
            onClick={() => openDemoModal(t("master.landing.shared.liveDemoTier"))}
            className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 transition-all inline-flex items-center gap-2"
          >
            <span>{t("master.landing.preview.bottomCta.button")}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
