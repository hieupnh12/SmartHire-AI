import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Save, Box, Zap, Settings, HardDrive, Shield, Video } from "lucide-react";
import { masterQueryKeys } from "@/api/master/queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";
import { masterAdminApi, type SubscriptionPlan } from "@/api/master/masterAdminApi";
import { useT } from "@/i18n";

export function CreateSubscriptionPlanPage() {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setPlans = (updater: any) => queryClient.setQueryData(masterQueryKeys.subscriptions(), updater);

  const [planCode, setPlanCode] = useState("");
  const [planName, setPlanName] = useState("");
  const [planDesc, setPlanDesc] = useState("");
  const [priceYearly, setPriceYearly] = useState(36000000);
  const [maxJobs, setMaxJobs] = useState(5);
  const [maxCvParses, setMaxCvParses] = useState(100);

  // Checkboxes
  const [enableStorage, setEnableStorage] = useState(true);
  const [enableAi, setEnableAi] = useState(true);
  const [enableProctoring, setEnableProctoring] = useState(false);
  const [enableVideoRetention, setEnableVideoRetention] = useState(true);

  // Dropdown values (number | "")
  const [maxStorageGb, setMaxStorageGb] = useState<number | "">(5);
  const [maxAiHours, setMaxAiHours] = useState<number | "">(10);
  const [maxProctoringHours, setMaxProctoringHours] = useState<number | "">(10);
  const [videoRetentionDays, setVideoRetentionDays] = useState<number | "">(30);

  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code: planCode,
        name: planName,
        description: planDesc,
        priceYearly,
        maxJobs,
        maxCvParses,
        maxStorageGb: enableStorage ? (maxStorageGb === "" ? null : maxStorageGb) : 0,
        maxAiInterviewHours: enableAi ? (maxAiHours === "" ? null : maxAiHours) : 0,
        maxProctoringHours: enableProctoring ? (maxProctoringHours === "" ? null : maxProctoringHours) : 0,
        videoRetentionDays: enableVideoRetention ? (videoRetentionDays === "" ? null : videoRetentionDays) : 0,
      };

      const res = await masterAdminApi.createSubscription(payload);
      setPlans((prev: SubscriptionPlan[]) => [res, ...prev]);
      toast.success(t("master.commerce.createPlan.savedToast"));
      navigate("/admin/subscriptions/plans");
    } catch (error) {
      console.error(error);
      toast.error(t("master.commerce.createPlan.saveErrorToast"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/subscriptions/plans")}
            aria-label={t("master.commerce.createPlan.backAria")}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-indigo-600" />
              {t("master.commerce.createPlan.title")}
            </h1>
            <p className="text-xs text-slate-500 mt-1">{t("master.commerce.createPlan.subtitle")}</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{t("master.commerce.createPlan.savingBtn")}</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{t("master.commerce.createPlan.saveBtn")}</span>
            </>
          )}
        </button>
      </div>

      <form id="createPlanForm" onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1 */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="font-bold text-indigo-900 text-sm uppercase flex items-center gap-2">
            <Box className="w-5 h-5 text-indigo-600" />
            <span>{t("master.commerce.createPlan.section1Title")}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">{t("master.commerce.createPlan.codeLabel")}</label>
              <input
                type="text"
                required
                value={planCode}
                onChange={(e) => setPlanCode(e.target.value.toUpperCase())}
                placeholder={t("master.commerce.createPlan.codePlaceholder")}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">{t("master.commerce.createPlan.nameLabel")}</label>
              <input
                type="text"
                required
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder={t("master.commerce.createPlan.namePlaceholder")}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">{t("master.commerce.createPlan.descLabel")}</label>
            <input
              type="text"
              value={planDesc}
              onChange={(e) => setPlanDesc(e.target.value)}
              placeholder={t("master.commerce.createPlan.descPlaceholder")}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-600"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              {t("master.commerce.createPlan.priceLabel")}
            </label>
            <input
              type="number"
              min={0}
              required
              value={priceYearly}
              onChange={(e) => setPriceYearly(Number(e.target.value))}
              placeholder="36000000"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
            />
            <p className="text-[11px] text-slate-500 mt-1">{t("master.commerce.createPlan.priceHint")}</p>
          </div>
        </div>

        {/* SECTION 2 */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="font-bold text-indigo-900 text-sm uppercase flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <span>{t("master.commerce.createPlan.section2Title")}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">{t("master.commerce.createPlan.maxJobsLabel")}</label>
              <input
                type="number"
                min={0}
                required
                value={maxJobs}
                onChange={(e) => setMaxJobs(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">{t("master.commerce.createPlan.maxCvLabel")}</label>
              <input
                type="number"
                min={0}
                required
                value={maxCvParses}
                onChange={(e) => setMaxCvParses(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3 */}
        <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200 space-y-5">
          <div className="font-bold text-slate-900 text-sm uppercase flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-600" />
            <span>{t("master.commerce.createPlan.section3Title")}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Storage */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableStorage}
                  onChange={(e) => setEnableStorage(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                />
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <HardDrive className="w-4 h-4 text-slate-500" />
                  {t("master.commerce.createPlan.storageTitle")}
                </div>
              </label>
              {enableStorage && (
                <div className="pl-8">
                  <select
                    value={maxStorageGb}
                    onChange={(e) => setMaxStorageGb(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
                  >
                    <option value={5}>5 GB</option>
                    <option value={10}>10 GB</option>
                    <option value={50}>50 GB</option>
                    <option value={100}>100 GB</option>
                    <option value={500}>500 GB</option>
                    <option value="">{t("master.commerce.createPlan.unlimitedOption")}</option>
                  </select>
                </div>
              )}
              {!enableStorage && <p className="text-xs text-slate-500 pl-8">{t("master.commerce.createPlan.storageDisabled")}</p>}
            </div>

            {/* AI Interview */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableAi}
                  onChange={(e) => setEnableAi(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                />
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Zap className="w-4 h-4 text-slate-500" />
                  {t("master.commerce.createPlan.aiTitle")}
                </div>
              </label>
              {enableAi && (
                <div className="pl-8">
                  <select
                    value={maxAiHours}
                    onChange={(e) => setMaxAiHours(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
                  >
                    <option value={5}>{t("master.commerce.createPlan.hoursOption", { count: 5 })}</option>
                    <option value={10}>{t("master.commerce.createPlan.hoursOption", { count: 10 })}</option>
                    <option value={20}>{t("master.commerce.createPlan.hoursOption", { count: 20 })}</option>
                    <option value={50}>{t("master.commerce.createPlan.hoursOption", { count: 50 })}</option>
                    <option value={100}>{t("master.commerce.createPlan.hoursOption", { count: 100 })}</option>
                    <option value="">{t("master.commerce.createPlan.unlimitedOption")}</option>
                  </select>
                </div>
              )}
              {!enableAi && <p className="text-xs text-slate-500 pl-8">{t("master.commerce.createPlan.aiDisabled")}</p>}
            </div>

            {/* Proctoring */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableProctoring}
                  onChange={(e) => setEnableProctoring(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                />
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Shield className="w-4 h-4 text-slate-500" />
                  {t("master.commerce.createPlan.proctoringTitle")}
                </div>
              </label>
              {enableProctoring && (
                <div className="pl-8">
                  <select
                    value={maxProctoringHours}
                    onChange={(e) => setMaxProctoringHours(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
                  >
                    <option value={5}>{t("master.commerce.createPlan.hoursOption", { count: 5 })}</option>
                    <option value={10}>{t("master.commerce.createPlan.hoursOption", { count: 10 })}</option>
                    <option value={20}>{t("master.commerce.createPlan.hoursOption", { count: 20 })}</option>
                    <option value={50}>{t("master.commerce.createPlan.hoursOption", { count: 50 })}</option>
                    <option value={100}>{t("master.commerce.createPlan.hoursOption", { count: 100 })}</option>
                    <option value="">{t("master.commerce.createPlan.unlimitedOption")}</option>
                  </select>
                </div>
              )}
              {!enableProctoring && <p className="text-xs text-slate-500 pl-8">{t("master.commerce.createPlan.proctoringDisabled")}</p>}
            </div>

            {/* Video Retention */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableVideoRetention}
                  onChange={(e) => setEnableVideoRetention(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                />
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Video className="w-4 h-4 text-slate-500" />
                  {t("master.commerce.createPlan.videoTitle")}
                </div>
              </label>
              {enableVideoRetention && (
                <div className="pl-8">
                  <select
                    value={videoRetentionDays}
                    onChange={(e) => setVideoRetentionDays(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
                  >
                    <option value={7}>{t("master.commerce.createPlan.daysOption", { count: 7 })}</option>
                    <option value={14}>{t("master.commerce.createPlan.daysOption", { count: 14 })}</option>
                    <option value={30}>{t("master.commerce.createPlan.daysOption", { count: 30 })}</option>
                    <option value={90}>{t("master.commerce.createPlan.daysOption", { count: 90 })}</option>
                    <option value={365}>{t("master.commerce.createPlan.oneYearOption")}</option>
                    <option value="">{t("master.commerce.createPlan.foreverOption")}</option>
                  </select>
                </div>
              )}
              {!enableVideoRetention && <p className="text-xs text-slate-500 pl-8">{t("master.commerce.createPlan.videoDisabled")}</p>}
            </div>

          </div>
        </div>

      </form>
    </div>
  );
}
