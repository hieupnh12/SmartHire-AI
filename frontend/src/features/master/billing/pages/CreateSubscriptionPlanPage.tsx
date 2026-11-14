import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Box,
  Zap,
  Settings,
  HardDrive,
  Shield,
  Video,
  HelpCircle,
  Save,
  Loader2,
  ChevronDown,
  Check,
} from "lucide-react";
import { Tooltip } from "@/components/ux/Tooltip";
import { masterQueryKeys } from "@/api/master/queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";
import { masterAdminApi, type SubscriptionPlan } from "@/api/master/masterAdminApi";
import { formatNumber, useLocale, useT } from "@/i18n";

function SectionHelpTip({ content }: { content?: string }) {
  if (!content) return null;
  return (
    <Tooltip content={content} side="top">
      <span
        tabIndex={0}
        role="button"
        aria-label={content}
        className="inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
      >
        <HelpCircle className="size-3.5" aria-hidden="true" />
      </span>
    </Tooltip>
  );
}

interface DropdownOption<T extends string | number> {
  value: T;
  label: string;
  sublabel?: string;
}

interface SelectDropdownProps<T extends string | number> {
  value: T;
  onChange: (val: T) => void;
  options: DropdownOption<T>[];
  placeholder: string;
  disabled?: boolean;
}

function SelectDropdown<T extends string | number>({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: SelectDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-left flex items-center justify-between transition-all shadow-2xs ${
          isOpen
            ? "border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs"
            : "border-slate-300 hover:border-slate-400"
        } ${disabled ? "opacity-60 cursor-not-allowed bg-slate-100 text-slate-500" : "cursor-pointer"}`}
      >
        <span
          className={`truncate ${
            selectedOption
              ? "text-sm font-medium text-slate-900"
              : "text-xs text-slate-400"
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-indigo-600" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-200/70 p-1.5 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all ${
                  isSelected
                    ? "bg-indigo-50/90 text-indigo-700 font-semibold"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="truncate">{opt.label}</div>
                  {opt.sublabel && (
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {opt.sublabel}
                    </div>
                  )}
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CreateSubscriptionPlanPage() {
  const t = useT();
  const locale = useLocale();
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

  // Dropdown options
  const storageOptions = useMemo(
    () => [
      { value: 5, label: "5 GB" },
      { value: 10, label: "10 GB" },
      { value: 50, label: "50 GB" },
      { value: 100, label: "100 GB" },
      { value: 500, label: "500 GB" },
      { value: "" as const, label: t("master.commerce.createPlan.unlimitedOption") },
    ],
    [t]
  );

  const aiHoursOptions = useMemo(
    () => [
      { value: 5, label: t("master.commerce.createPlan.hoursOption", { count: 5 }) },
      { value: 10, label: t("master.commerce.createPlan.hoursOption", { count: 10 }) },
      { value: 20, label: t("master.commerce.createPlan.hoursOption", { count: 20 }) },
      { value: 50, label: t("master.commerce.createPlan.hoursOption", { count: 50 }) },
      { value: 100, label: t("master.commerce.createPlan.hoursOption", { count: 100 }) },
      { value: "" as const, label: t("master.commerce.createPlan.unlimitedOption") },
    ],
    [t]
  );

  const proctoringOptions = useMemo(
    () => [
      { value: 5, label: t("master.commerce.createPlan.hoursOption", { count: 5 }) },
      { value: 10, label: t("master.commerce.createPlan.hoursOption", { count: 10 }) },
      { value: 20, label: t("master.commerce.createPlan.hoursOption", { count: 20 }) },
      { value: 50, label: t("master.commerce.createPlan.hoursOption", { count: 50 }) },
      { value: 100, label: t("master.commerce.createPlan.hoursOption", { count: 100 }) },
      { value: "" as const, label: t("master.commerce.createPlan.unlimitedOption") },
    ],
    [t]
  );

  const videoRetentionOptions = useMemo(
    () => [
      { value: 7, label: t("master.commerce.createPlan.daysOption", { count: 7 }) },
      { value: 14, label: t("master.commerce.createPlan.daysOption", { count: 14 }) },
      { value: 30, label: t("master.commerce.createPlan.daysOption", { count: 30 }) },
      { value: 90, label: t("master.commerce.createPlan.daysOption", { count: 90 }) },
      { value: 365, label: t("master.commerce.createPlan.oneYearOption") },
      { value: "" as const, label: t("master.commerce.createPlan.foreverOption") },
    ],
    [t]
  );

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
    <div className="max-w-4xl space-y-5 animate-fade-in pb-12">
      {/* Top Back Action & Title */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/subscriptions/plans")}
            aria-label={t("master.commerce.createPlan.backAria")}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 text-xs font-medium transition-all shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>{t("master.commerce.createPlan.backAria")}</span>
          </button>
          <div className="h-3.5 w-px bg-slate-200" />
          <span className="text-xs sm:text-sm font-medium text-slate-600">
            {t("master.commerce.createPlan.title")}
          </span>
        </div>

        <button
          type="submit"
          form="createPlanForm"
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all text-xs sm:text-sm"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
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

      {/* Main Form Container */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs relative">
        <form id="createPlanForm" onSubmit={handleSave} className="space-y-6 text-sm">
          {/* SECTION 1: BASIC INFORMATION */}
          <div className="p-6 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-5 transition-all">
            <div className="flex items-center gap-3 pb-3.5 border-b border-slate-200/80">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shadow-2xs">
                <Box className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-600">
                  {t("master.commerce.createPlan.section1Title")}
                </h2>
                <SectionHelpTip content={t("master.commerce.createPlan.section1Desc")} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {t("master.commerce.createPlan.codeLabel")}
                </label>
                <input
                  type="text"
                  required
                  value={planCode}
                  onChange={(e) => setPlanCode(e.target.value.toUpperCase())}
                  placeholder={t("master.commerce.createPlan.codePlaceholder")}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors shadow-2xs uppercase tracking-wider"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {t("master.commerce.createPlan.nameLabel")}
                </label>
                <input
                  type="text"
                  required
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder={t("master.commerce.createPlan.namePlaceholder")}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {t("master.commerce.createPlan.descLabel")}
              </label>
              <input
                type="text"
                value={planDesc}
                onChange={(e) => setPlanDesc(e.target.value)}
                placeholder={t("master.commerce.createPlan.descPlaceholder")}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {t("master.commerce.createPlan.priceLabel")}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  required
                  value={priceYearly}
                  onChange={(e) => setPriceYearly(Number(e.target.value))}
                  placeholder="36000000"
                  className="w-full px-3.5 py-2.5 pr-20 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-emerald-600 placeholder:text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors shadow-2xs"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-xs font-bold text-emerald-600">
                  ₫/năm
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-1.5">
                <span>{t("master.commerce.createPlan.priceHint")}</span>
                <span className="font-semibold text-emerald-600">
                  ≈ {formatNumber(Math.round(priceYearly / 12), undefined, locale)}&nbsp;₫/tháng
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: CORE QUOTAS */}
          <div className="p-6 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-5 transition-all">
            <div className="flex items-center gap-3 pb-3.5 border-b border-slate-200/80">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-600 shadow-2xs">
                <Zap className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-600">
                  {t("master.commerce.createPlan.section2Title")}
                </h2>
                <SectionHelpTip content={t("master.commerce.createPlan.section2Desc")} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {t("master.commerce.createPlan.maxJobsLabel")}
                </label>
                <input
                  type="number"
                  min={-1}
                  required
                  value={maxJobs}
                  onChange={(e) => setMaxJobs(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors shadow-2xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">-1 = Không giới hạn, 0 = Không hỗ trợ</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  {t("master.commerce.createPlan.maxCvLabel")}
                </label>
                <input
                  type="number"
                  min={-1}
                  required
                  value={maxCvParses}
                  onChange={(e) => setMaxCvParses(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors shadow-2xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">-1 = Không giới hạn, 0 = Không hỗ trợ</p>
              </div>
            </div>
          </div>

          {/* SECTION 3: ADVANCED FEATURES */}
          <div className="p-6 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-5 transition-all">
            <div className="flex items-center gap-3 pb-3.5 border-b border-slate-200/80">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shadow-2xs">
                <Settings className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-600">
                  {t("master.commerce.createPlan.section3Title")}
                </h2>
                <SectionHelpTip content={t("master.commerce.createPlan.section3Desc")} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Storage */}
              <div className="space-y-3 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs transition-all">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enableStorage}
                    onChange={(e) => setEnableStorage(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500/20"
                  />
                  <div className="flex items-center gap-2 font-semibold text-xs text-slate-700">
                    <HardDrive className="w-4 h-4 text-slate-500" />
                    <span>{t("master.commerce.createPlan.storageTitle")}</span>
                  </div>
                </label>
                {enableStorage ? (
                  <div className="pt-1">
                    <SelectDropdown
                      value={maxStorageGb}
                      onChange={(val) => setMaxStorageGb(val)}
                      options={storageOptions}
                      placeholder={t("master.commerce.createPlan.unlimitedOption")}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 pl-7">{t("master.commerce.createPlan.storageDisabled")}</p>
                )}
              </div>

              {/* AI Interview */}
              <div className="space-y-3 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs transition-all">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enableAi}
                    onChange={(e) => setEnableAi(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500/20"
                  />
                  <div className="flex items-center gap-2 font-semibold text-xs text-slate-700">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>{t("master.commerce.createPlan.aiTitle")}</span>
                  </div>
                </label>
                {enableAi ? (
                  <div className="pt-1">
                    <SelectDropdown
                      value={maxAiHours}
                      onChange={(val) => setMaxAiHours(val)}
                      options={aiHoursOptions}
                      placeholder={t("master.commerce.createPlan.unlimitedOption")}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 pl-7">{t("master.commerce.createPlan.aiDisabled")}</p>
                )}
              </div>

              {/* Proctoring */}
              <div className="space-y-3 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs transition-all">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enableProctoring}
                    onChange={(e) => setEnableProctoring(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500/20"
                  />
                  <div className="flex items-center gap-2 font-semibold text-xs text-slate-700">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span>{t("master.commerce.createPlan.proctoringTitle")}</span>
                  </div>
                </label>
                {enableProctoring ? (
                  <div className="pt-1">
                    <SelectDropdown
                      value={maxProctoringHours}
                      onChange={(val) => setMaxProctoringHours(val)}
                      options={proctoringOptions}
                      placeholder={t("master.commerce.createPlan.unlimitedOption")}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 pl-7">{t("master.commerce.createPlan.proctoringDisabled")}</p>
                )}
              </div>

              {/* Video Retention */}
              <div className="space-y-3 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs transition-all">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enableVideoRetention}
                    onChange={(e) => setEnableVideoRetention(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500/20"
                  />
                  <div className="flex items-center gap-2 font-semibold text-xs text-slate-700">
                    <Video className="w-4 h-4 text-indigo-500" />
                    <span>{t("master.commerce.createPlan.videoTitle")}</span>
                  </div>
                </label>
                {enableVideoRetention ? (
                  <div className="pt-1">
                    <SelectDropdown
                      value={videoRetentionDays}
                      onChange={(val) => setVideoRetentionDays(val)}
                      options={videoRetentionOptions}
                      placeholder={t("master.commerce.createPlan.foreverOption")}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 pl-7">{t("master.commerce.createPlan.videoDisabled")}</p>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => navigate("/admin/subscriptions/plans")}
              className="px-6 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium transition-all shadow-2xs"
            >
              {t("master.commerce.common.cancelAction") || "Hủy"}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t("master.commerce.createPlan.savingBtn")}</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>{t("master.commerce.createPlan.saveBtn")}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
