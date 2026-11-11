import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  CheckCircle2, Building2, CreditCard, FileSignature, Loader2, 
  ShieldCheck, ReceiptText, Plus, X,
  Calculator, ShieldAlert, Sliders, Layers, Check,
  Mail, Send
} from "lucide-react";
import { masterTenantApi } from "@/api/master/tenantApi";
import { billingApi } from "@/api/master/billingApi";
import { contractApi } from "@/api/master/contractApi";
import { consultationApi } from "@/api/master/consultationApi";
import { useSubscriptions, useCreateSubscription, masterQueryKeys } from "@/api/master/queries";
import { useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/axios";
import { formatNumber, useLocale, useT, type TranslateFn } from "@/i18n";
import { 
  calculateTemplateAddonQuote, 
  calculateScratchCustomQuote, 
  STANDARD_TEMPLATE_PLANS, 
  CPQ_RATES, 
  type CpqPricingMode 
} from "../utils/cpqPricingEngine";


function createWizardSchema(t: TranslateFn) {
  return z.object({
    // Step 1: Tenant
    name: z.string().trim().min(1, t("master.commerce.dealWizard.validation.nameRequired")),
    code: z.string().regex(/^[a-z][a-z0-9-]{1,31}$/, t("master.commerce.dealWizard.validation.codePattern")),
    subdomain: z.string().regex(/^[a-z][a-z0-9-]{1,61}[a-z0-9]$/, t("master.commerce.dealWizard.validation.subdomainInvalid")),
    environmentType: z.enum(["PRODUCTION", "POC_SANDBOX"]).default("PRODUCTION"),
    adminName: z.string().trim().min(1, t("master.commerce.dealWizard.validation.adminNameRequired")),
    adminEmail: z.string().trim().email(t("master.commerce.dealWizard.validation.emailInvalid")),

    // Step 2: Plan
    planId: z.number({ required_error: t("master.commerce.dealWizard.validation.planRequired") }).min(1, t("master.commerce.dealWizard.validation.planRequired")),
    billingCycle: z.enum(["YEARLY"]).default("YEARLY"),

    // Step 3: Billing & Contract
    closingMethod: z.enum(["QUOTATION", "INVOICE", "CONTRACT"]).default("QUOTATION"),
    companyLegalName: z.string().trim().optional(),
    taxCode: z.string().trim().optional(),
    address: z.string().trim().optional(),
    billingEmail: z.string().trim().email(t("master.commerce.dealWizard.validation.emailInvalid")),
    phone: z.string().optional(),
    representative: z.string().optional(),
    notes: z.string().optional(),
  }).superRefine((data, ctx) => {
    if (data.closingMethod === "INVOICE" || data.closingMethod === "CONTRACT") {
      if (!data.companyLegalName || data.companyLegalName.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("master.commerce.dealWizard.validation.companyLegalRequired"),
          path: ["companyLegalName"],
        });
      }
      if (!data.taxCode || data.taxCode.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("master.commerce.dealWizard.validation.taxCodeRequired"),
          path: ["taxCode"],
        });
      }
      if (!data.address || data.address.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("master.commerce.dealWizard.validation.addressRequired"),
          path: ["address"],
        });
      }
    }
  });
}

type FormValues = z.infer<ReturnType<typeof createWizardSchema>>;

function CreatePlanInlineForm({ onCancel, onSuccess }: { 
  onCancel: () => void, 
  onSuccess: (plan: any, cpqDetails?: { platformFee: number; addonFee: number; discount: number; totalQuote: number; pricingMode: string }) => void 
}) {
  const t = useT();
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createPlanMutation = useCreateSubscription();
  const containerRef = React.useRef<HTMLDivElement>(null);

  // General Plan Identity
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  // Mode switcher: "TEMPLATE_ADDON" | "FROM_SCRATCH"
  const [pricingMode, setPricingMode] = useState<CpqPricingMode>("TEMPLATE_ADDON");

  // Mode 1: Template Add-ons
  const [selectedTemplate, setSelectedTemplate] = useState<"STARTER" | "PROFESSIONAL" | "ENTERPRISE">("PROFESSIONAL");
  const [customJobs, setCustomJobs] = useState(35);
  const [customCvMonthly, setCustomCvMonthly] = useState(4500);
  const [customAiMonthly, setCustomAiMonthly] = useState(50);
  const [customStorage, setCustomStorage] = useState(50);
  const [templateDiscount, setTemplateDiscount] = useState(3000000);

  // Mode 2: From Scratch Custom
  const scratchPlatformFee = CPQ_RATES.SCRATCH.PLATFORM_BASE_FEE;
  const [scratchJobs, setScratchJobs] = useState(100);
  const [scratchYearlyCv, setScratchYearlyCv] = useState(20000);
  const [scratchYearlyAiHours, setScratchYearlyAiHours] = useState(50);
  const [scratchStorage, setScratchStorage] = useState(100);
  const [scratchEnableSso, setScratchEnableSso] = useState(true);
  const [scratchEnableSandbox, setScratchEnableSandbox] = useState(false);
  const [scratchEnableSupport247, setScratchEnableSupport247] = useState(false);
  const [scratchDiscount, setScratchDiscount] = useState(6000000);

  // Common additional settings
  const maxProctoringHours = 0;
  const videoRetentionDays = 30;
  const [confirmedLoss, setConfirmedLoss] = useState(false);

  // Mode 1 Calculation
  const templateResult = useMemo(() => {
    return calculateTemplateAddonQuote({
      templateCode: selectedTemplate,
      customJobs,
      customCvParsesMonthly: customCvMonthly,
      customAiHoursMonthly: customAiMonthly,
      customStorageGb: customStorage,
      discountVnd: templateDiscount,
    });
  }, [selectedTemplate, customJobs, customCvMonthly, customAiMonthly, customStorage, templateDiscount]);

  // Mode 2 Calculation
  const scratchResult = useMemo(() => {
    return calculateScratchCustomQuote({
      platformBaseFee: scratchPlatformFee,
      jobsCount: scratchJobs,
      yearlyCvCount: scratchYearlyCv,
      yearlyAiHours: scratchYearlyAiHours,
      storageGb: scratchStorage,
      enableSso: scratchEnableSso,
      enableCodeSandbox: scratchEnableSandbox,
      enableSupport247: scratchEnableSupport247,
      discountVnd: scratchDiscount,
    });
  }, [scratchPlatformFee, scratchJobs, scratchYearlyCv, scratchYearlyAiHours, scratchStorage, scratchEnableSso, scratchEnableSandbox, scratchEnableSupport247, scratchDiscount]);

  const activeResult = pricingMode === "TEMPLATE_ADDON" ? templateResult : scratchResult;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      setError(t("master.commerce.cpq.errors.nameCodeRequired"));
      return;
    }

    if (activeResult.totalQuoteVnd <= 0) {
      setError(t("master.commerce.cpq.errors.quoteMustBePositive"));
      return;
    }

    if (activeResult.isBelowSafeFloor && !confirmedLoss) {
      setError(t("master.commerce.cpq.errors.belowSafeFloorApproval"));
      return;
    }

    const finalJobs = pricingMode === "TEMPLATE_ADDON" ? customJobs : scratchJobs;
    const finalCv = pricingMode === "TEMPLATE_ADDON" ? customCvMonthly : Math.max(100, Math.round(scratchYearlyCv / 12));
    const finalAi = pricingMode === "TEMPLATE_ADDON" ? customAiMonthly : Math.max(1, Math.round(scratchYearlyAiHours / 12));
    const finalStorage = pricingMode === "TEMPLATE_ADDON" ? customStorage : scratchStorage;

    const featureList = ["AI CV Screening", "Career Site", "Email Support"];
    if (pricingMode === "TEMPLATE_ADDON") {
      if (selectedTemplate === "PROFESSIONAL" || selectedTemplate === "ENTERPRISE") {
        featureList.push("Voice AI Interview", "Priority Support");
      }
      if (selectedTemplate === "ENTERPRISE") {
        featureList.push("SSO SAML", "Dedicated Database Engine", "SLA 99.99%");
      }
    } else {
      if (scratchEnableSso) featureList.push("SSO SAML Integration");
      if (scratchEnableSandbox) featureList.push("Docker Code Sandbox Auto-Grading");
      if (scratchEnableSupport247) featureList.push("Dedicated 24/7 Support & SLA 99.99%");
    }

    const data = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim() || (pricingMode === "TEMPLATE_ADDON"
        ? t("master.commerce.cpq.defaultDescTemplate", { name: t(STANDARD_TEMPLATE_PLANS[selectedTemplate]?.nameKey) })
        : t("master.commerce.cpq.defaultDescScratch")),
      priceYearly: activeResult.totalQuoteVnd,
      maxJobs: finalJobs,
      maxCvParses: finalCv,
      maxAiInterviewHours: finalAi,
      maxStorageGb: finalStorage,
      maxProctoringHours: maxProctoringHours,
      videoRetentionDays: videoRetentionDays,
      featuresJson: JSON.stringify({ features: featureList }),
      status: "ACTIVE",
    };

    setLoading(true);
    setError(null);
    try {
      const newPlan = await createPlanMutation.mutateAsync(data as any);
      const platformFee = pricingMode === "TEMPLATE_ADDON"
        ? (activeResult as any).basePlanPrice
        : (activeResult as any).platformBaseFee;
      const addonFee = pricingMode === "TEMPLATE_ADDON"
        ? (activeResult as any).totalAddonFees
        : Math.max(0, (activeResult as any).listPrice - (activeResult as any).platformBaseFee);

      onSuccess(newPlan, {
        platformFee,
        addonFee,
        discount: activeResult.discountVnd,
        totalQuote: activeResult.totalQuoteVnd,
        pricingMode: pricingMode,
      });
    } catch (err: any) {
      setError(getApiErrorMessage(err, t("master.commerce.cpq.errors.createFailed")));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20";
  const labelClass = "mb-1 block text-xs font-semibold text-slate-700";

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown} className="mt-6 rounded-2xl border-2 border-indigo-200 bg-white p-5 sm:p-6 relative animate-in fade-in slide-in-from-top-2 shadow-xl">
      <button
        type="button"
        onClick={onCancel}
        aria-label={t("master.commerce.common.close")}
        className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Title & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-lg sm:text-xl">{t("master.commerce.cpq.title")}</h3>
            <span className="text-[11px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
              {t("master.commerce.cpq.badge")}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{t("master.commerce.cpq.subtitle")}</p>
        </div>

        {/* Dual Mode Switcher Tabs */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setPricingMode("TEMPLATE_ADDON")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              pricingMode === "TEMPLATE_ADDON"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{t("master.commerce.cpq.modeTemplate")}</span>
          </button>
          <button
            type="button"
            onClick={() => setPricingMode("FROM_SCRATCH")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              pricingMode === "FROM_SCRATCH"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>{t("master.commerce.cpq.modeScratch")}</span>
          </button>
        </div>
      </div>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 font-medium">{error}</div>}

      {/* Plan Identity */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        <div className="col-span-2">
          <label className={labelClass}>{t("master.commerce.cpq.planNameLabel")} <span className="text-red-500">*</span></label>
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder={pricingMode === "TEMPLATE_ADDON" ? t("master.commerce.cpq.planNamePlaceholderTemplate") : t("master.commerce.cpq.planNamePlaceholderScratch")}
          />
        </div>
        <div className="col-span-2">
          <label className={labelClass}>{t("master.commerce.cpq.planCodeLabel")} <span className="text-red-500">*</span></label>
          <input
            name="code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={inputClass}
            placeholder={t("master.commerce.cpq.planCodePlaceholder")}
          />
        </div>
        <div className="col-span-2 sm:col-span-4">
          <label className={labelClass}>{t("master.commerce.cpq.summaryDescLabel")}</label>
          <input
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            placeholder={t("master.commerce.cpq.summaryDescPlaceholder")}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: TEMPLATE-BASED ADD-ONS                                            */}
      {/* ========================================================================= */}
      {pricingMode === "TEMPLATE_ADDON" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Base Template Selector */}
          <div>
            <label className={labelClass}>{t("master.commerce.cpq.selectBaseTemplate")} <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1.5">
              {(["STARTER", "PROFESSIONAL", "ENTERPRISE"] as const).map((tCode) => {
                const plan = STANDARD_TEMPLATE_PLANS[tCode];
                const isSelected = selectedTemplate === tCode;
                return (
                  <div
                    key={tCode}
                    onClick={() => {
                      setSelectedTemplate(tCode);
                      setCustomJobs(plan.baseJobs + 10);
                      setCustomCvMonthly(plan.baseCvParsesMonthly + 1000);
                      setCustomAiMonthly(plan.baseAiHoursMonthly + 20);
                      setCustomStorage(plan.baseStorageGb + 25);
                    }}
                    className={`cursor-pointer rounded-xl border-2 p-3.5 transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                        : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm text-slate-900">{t(plan.nameKey)}</span>
                      {isSelected && <Check className="h-4 w-4 text-indigo-600" />}
                    </div>
                    <div className="text-base font-extrabold text-indigo-700">
                      {formatNumber(plan.priceYearly, undefined, locale)} ₫<span className="text-xs font-normal text-slate-500">/{t("master.commerce.common.yearUnit")}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {t("master.commerce.cpq.templateBaseLine", {
                        jobs: plan.baseJobs,
                        cv: formatNumber(plan.baseCvParsesMonthly, undefined, locale),
                        ai: plan.baseAiHoursMonthly,
                        storage: plan.baseStorageGb,
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add-on Quota Inputs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>{t("master.commerce.cpq.addonHeader")}</label>
              <span className="text-[11px] text-indigo-600 font-semibold">
                {t("master.commerce.cpq.addonUnitPrices")}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  {t("master.commerce.cpq.jobsLabel", { base: STANDARD_TEMPLATE_PLANS[selectedTemplate]?.baseJobs })}
                </label>
                <input
                  type="number"
                  min={1}
                  value={customJobs}
                  onChange={(e) => setCustomJobs(Number(e.target.value || 0))}
                  className={inputClass}
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {templateResult.deltaJobs > 0 ? (
                    <strong className="text-indigo-600">
                      {t("master.commerce.cpq.jobsDelta", {
                        delta: templateResult.deltaJobs,
                        fee: formatNumber(templateResult.addonJobsFee, undefined, locale),
                      })}
                    </strong>
                  ) : t("master.commerce.cpq.noAddonDelta")}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  {t("master.commerce.cpq.cvMonthlyLabel", { base: formatNumber(STANDARD_TEMPLATE_PLANS[selectedTemplate]?.baseCvParsesMonthly ?? 0, undefined, locale) })}
                </label>
                <input
                  type="number"
                  min={100}
                  step={500}
                  value={customCvMonthly}
                  onChange={(e) => setCustomCvMonthly(Number(e.target.value || 0))}
                  className={inputClass}
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {templateResult.deltaCv > 0 ? (
                    <strong className="text-indigo-600">
                      {t("master.commerce.cpq.cvDelta", {
                        delta: formatNumber(templateResult.deltaCv, undefined, locale),
                        fee: formatNumber(templateResult.addonCvFee, undefined, locale),
                      })}
                    </strong>
                  ) : t("master.commerce.cpq.noAddonDelta")}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  {t("master.commerce.cpq.aiMonthlyLabel", { base: STANDARD_TEMPLATE_PLANS[selectedTemplate]?.baseAiHoursMonthly })}
                </label>
                <input
                  type="number"
                  min={1}
                  value={customAiMonthly}
                  onChange={(e) => setCustomAiMonthly(Number(e.target.value || 0))}
                  className={inputClass}
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {templateResult.deltaAiHours > 0 ? (
                    <strong className="text-indigo-600">
                      {t("master.commerce.cpq.aiDelta", {
                        delta: templateResult.deltaAiHours,
                        fee: formatNumber(templateResult.addonAiFee, undefined, locale),
                      })}
                    </strong>
                  ) : t("master.commerce.cpq.noAddonDelta")}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  {t("master.commerce.cpq.storageLabel", { base: STANDARD_TEMPLATE_PLANS[selectedTemplate]?.baseStorageGb })}
                </label>
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={customStorage}
                  onChange={(e) => setCustomStorage(Number(e.target.value || 0))}
                  className={inputClass}
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {templateResult.deltaStorageGb > 0 ? (
                    <strong className="text-indigo-600">
                      {t("master.commerce.cpq.storageDelta", {
                        delta: templateResult.deltaStorageGb,
                        fee: formatNumber(templateResult.addonStorageFee, undefined, locale),
                      })}
                    </strong>
                  ) : t("master.commerce.cpq.noAddonDelta")}
                </span>
              </div>
            </div>
          </div>

          {/* Discount Input */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="text-xs font-bold text-slate-800">
                {t("master.commerce.cpq.discountTemplateTitle")}
              </label>
              <span className="text-[11px] text-slate-500">{t("master.commerce.cpq.discountTemplateHint")}</span>
            </div>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={500000}
                value={templateDiscount}
                onChange={(e) => setTemplateDiscount(Number(e.target.value || 0))}
                className={`${inputClass} text-base font-bold text-emerald-800`}
                placeholder={t("master.commerce.cpq.discountPlaceholder")}
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                {t("master.commerce.common.vnd")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: CUSTOM FROM SCRATCH                                               */}
      {/* ========================================================================= */}
      {pricingMode === "FROM_SCRATCH" && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-950 block">{t("master.commerce.cpq.scratchPlatformFeeTitle")}</span>
                <span className="text-[11px] text-indigo-700">{t("master.commerce.cpq.scratchPlatformFeeDesc")}</span>
              </div>
              <div className="text-base font-extrabold text-indigo-900">
                {formatNumber(scratchPlatformFee, undefined, locale)} ₫<span className="text-xs font-normal">/{t("master.commerce.common.yearUnit")}</span>
              </div>
            </div>
          </div>

          {/* Scratch Resource Inputs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>{t("master.commerce.cpq.scratchResourcesTitle")}</label>
              <span className="text-[11px] text-indigo-600 font-semibold">
                {t("master.commerce.cpq.scratchUnitPrices")}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">{t("master.commerce.cpq.scratchMaxJobsLabel")}</label>
                <input
                  type="number"
                  min={1}
                  value={scratchJobs}
                  onChange={(e) => setScratchJobs(Number(e.target.value || 0))}
                  className={inputClass}
                />
                <span className="text-[10px] text-indigo-700 mt-1 block font-semibold">
                  = {formatNumber(scratchJobs * CPQ_RATES.SCRATCH.JOB_PRICE_YEARLY, undefined, locale)} ₫/{t("master.commerce.common.yearUnit")}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">{t("master.commerce.cpq.scratchYearlyCvLabel")}</label>
                <input
                  type="number"
                  min={100}
                  step={1000}
                  value={scratchYearlyCv}
                  onChange={(e) => setScratchYearlyCv(Number(e.target.value || 0))}
                  className={inputClass}
                />
                <span className="text-[10px] text-indigo-700 mt-1 block font-semibold">
                  = {formatNumber(scratchYearlyCv * CPQ_RATES.SCRATCH.CV_PRICE_YEARLY, undefined, locale)} ₫/{t("master.commerce.common.yearUnit")}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">{t("master.commerce.cpq.scratchYearlyAiLabel")}</label>
                <input
                  type="number"
                  min={1}
                  value={scratchYearlyAiHours}
                  onChange={(e) => setScratchYearlyAiHours(Number(e.target.value || 0))}
                  className={inputClass}
                />
                <span className="text-[10px] text-indigo-700 mt-1 block font-semibold">
                  = {formatNumber(scratchYearlyAiHours * CPQ_RATES.SCRATCH.AI_HOUR_PRICE_YEARLY, undefined, locale)} ₫/{t("master.commerce.common.yearUnit")}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">{t("master.commerce.cpq.scratchStorageLabel")}</label>
                <input
                  type="number"
                  min={5}
                  step={10}
                  value={scratchStorage}
                  onChange={(e) => setScratchStorage(Number(e.target.value || 0))}
                  className={inputClass}
                />
                <span className="text-[10px] text-indigo-700 mt-1 block font-semibold">
                  = {formatNumber(scratchStorage * CPQ_RATES.SCRATCH.STORAGE_GB_PRICE_YEARLY, undefined, locale)} ₫/{t("master.commerce.common.yearUnit")}
                </span>
              </div>
            </div>
          </div>

          {/* Enterprise Advanced Options */}
          <div>
            <label className={labelClass}>{t("master.commerce.cpq.enterpriseOptionsTitle")}</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1.5">
              <label className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                scratchEnableSso ? "border-indigo-600 bg-indigo-50/40" : "border-slate-200 bg-slate-50/50"
              }`}>
                <input
                  type="checkbox"
                  checked={scratchEnableSso}
                  onChange={(e) => setScratchEnableSso(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">{t("master.commerce.cpq.ssoTitle")}</span>
                  <span className="text-[11px] text-slate-500">{t("master.commerce.cpq.ssoDesc")}</span>
                </div>
              </label>

              <label className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                scratchEnableSandbox ? "border-indigo-600 bg-indigo-50/40" : "border-slate-200 bg-slate-50/50"
              }`}>
                <input
                  type="checkbox"
                  checked={scratchEnableSandbox}
                  onChange={(e) => setScratchEnableSandbox(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">{t("master.commerce.cpq.sandboxTitle")}</span>
                  <span className="text-[11px] text-slate-500">{t("master.commerce.cpq.sandboxDesc")}</span>
                </div>
              </label>

              <label className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                scratchEnableSupport247 ? "border-indigo-600 bg-indigo-50/40" : "border-slate-200 bg-slate-50/50"
              }`}>
                <input
                  type="checkbox"
                  checked={scratchEnableSupport247}
                  onChange={(e) => setScratchEnableSupport247(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">{t("master.commerce.cpq.supportTitle")}</span>
                  <span className="text-[11px] text-slate-500">{t("master.commerce.cpq.supportDesc")}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Discount Input */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="text-xs font-bold text-slate-800">
                {t("master.commerce.cpq.discountScratchTitle")}
              </label>
              <span className="text-[11px] text-slate-500">{t("master.commerce.cpq.discountScratchHint")}</span>
            </div>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={500000}
                value={scratchDiscount}
                onChange={(e) => setScratchDiscount(Number(e.target.value || 0))}
                className={`${inputClass} text-base font-bold text-emerald-800`}
                placeholder={t("master.commerce.cpq.discountPlaceholder")}
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                {t("master.commerce.common.vnd")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUMMARY 3-COMPONENT QUOTATION DISPLAY                                     */}
      {/* ========================================================================= */}
      <div className="mt-6 rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
          <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
            <Calculator className="h-4 w-4 text-indigo-600" />
            <span>{t("master.commerce.cpq.quoteSummaryTitle")}</span>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {t("master.commerce.cpq.quoteValidity")}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          {pricingMode === "TEMPLATE_ADDON" ? (
            <>
              <div className="flex justify-between text-slate-700">
                <span>{t("master.commerce.cpq.line1Template", { name: t(STANDARD_TEMPLATE_PLANS[selectedTemplate]?.nameKey) })}</span>
                <span className="font-semibold">{formatNumber(templateResult.basePlanPrice, undefined, locale)} ₫</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>{t("master.commerce.cpq.line2Template")}</span>
                <span className="font-semibold text-indigo-700">+{formatNumber(templateResult.totalAddonFees, undefined, locale)} ₫</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px] pl-3">
                <span>{t("master.commerce.cpq.lineListPrice")}</span>
                <span>{formatNumber(templateResult.listPrice, undefined, locale)} ₫</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>{t("master.commerce.cpq.line3Discount")}</span>
                <span>-{formatNumber(templateResult.discountVnd, undefined, locale)} ₫</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-slate-700">
                <span>{t("master.commerce.cpq.line1Scratch")}</span>
                <span className="font-semibold">{formatNumber(scratchResult.platformBaseFee, undefined, locale)} ₫</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>{t("master.commerce.cpq.line2Scratch")}</span>
                <span className="font-semibold text-indigo-700">
                  +{formatNumber(scratchResult.jobsFee + scratchResult.cvFee + scratchResult.aiFee + scratchResult.storageFee + scratchResult.totalEnterpriseOptionsFee, undefined, locale)} ₫
                </span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px] pl-3">
                <span>{t("master.commerce.cpq.lineListPrice")}</span>
                <span>{formatNumber(scratchResult.listPrice, undefined, locale)} ₫</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>{t("master.commerce.cpq.line3Discount")}</span>
                <span>-{formatNumber(scratchResult.discountVnd, undefined, locale)} ₫</span>
              </div>
            </>
          )}

          <div className="border-t-2 border-indigo-100 pt-2.5 flex flex-wrap items-baseline justify-between">
            <span className="text-sm font-bold text-slate-900">{t("master.commerce.cpq.totalQuoteLabel")}</span>
            <div className="text-right">
              <span className="text-2xl font-black text-indigo-700">
                {formatNumber(activeResult.totalQuoteVnd, undefined, locale)} ₫
              </span>
              <span className="text-xs font-semibold text-slate-500 ml-1">/ {t("master.commerce.common.yearUnit")}</span>
            </div>
          </div>
        </div>

        {/* Floor Price and Guardrail */}
        <div className="border-t border-indigo-100 pt-3 flex flex-wrap items-center justify-between text-[11px] gap-2">
          <div className="text-slate-500">
            {t("master.commerce.cpq.floorCostPrefix")} <strong>{formatNumber(activeResult.floorPriceVnd, undefined, locale)} ₫</strong> · {t("master.commerce.cpq.safeFloorPrefix")} <strong>{formatNumber(activeResult.safeFloorPriceVnd, undefined, locale)} ₫</strong>
          </div>
          <div className="text-emerald-700 font-semibold">
            {t("master.commerce.cpq.marginEstimate", {
              percent: activeResult.marginPercent.toFixed(1),
              profit: formatNumber(activeResult.grossProfitVnd, undefined, locale),
            })}
          </div>
        </div>

        {/* Red Alert if below safe floor */}
        {activeResult.isBelowSafeFloor && (
          <div className="rounded-xl border-2 border-red-300 bg-red-50 p-3.5 text-xs text-red-900 space-y-2 animate-in fade-in">
            <div className="flex items-start gap-2 font-bold text-red-700">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
              <div>
                <div className="text-sm font-bold">{t("master.commerce.cpq.floorGuardTitle")}</div>
                <div className="font-normal text-red-800 mt-0.5">
                  {t("master.commerce.cpq.floorGuardBefore")}{" "}
                  <strong>{formatNumber(activeResult.totalQuoteVnd, undefined, locale)} ₫</strong>{" "}
                  {t("master.commerce.cpq.floorGuardMiddle")}{" "}
                  <strong>{formatNumber(activeResult.safeFloorPriceVnd, undefined, locale)} ₫</strong>{" "}
                  {t("master.commerce.cpq.floorGuardAfter")}
                </div>
              </div>
            </div>
            <label className="flex items-center gap-2 pt-1 font-semibold text-red-900 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedLoss}
                onChange={(e) => setConfirmedLoss(e.target.checked)}
                className="h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
              />
              <span>{t("master.commerce.cpq.floorGuardConfirm")}</span>
            </label>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 text-sm"
        >
          {t("master.commerce.common.cancelAction")}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || (activeResult.isBelowSafeFloor && !confirmedLoss)}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm transition-colors"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("master.commerce.cpq.submitCpqBtn")}
        </button>
      </div>
    </div>
  );
}

export function B2bDealWizardPageContent() {
  const t = useT();
  const locale = useLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: plans = [] } = useSubscriptions();
  const queryClient = useQueryClient();
  const fetchData = () => queryClient.invalidateQueries({ queryKey: masterQueryKeys.all });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [cpqDetails, setCpqDetails] = useState<{ platformFee: number; addonFee: number; discount: number; totalQuote: number; pricingMode: string } | null>(null);
  const [successData, setSuccessData] = useState<{ tenantCode: string; closingMethod: "QUOTATION" | "INVOICE" | "CONTRACT"; recipientEmail?: string } | null>(null);

  const leadIdParam = searchParams.get("leadId");
  const consultationRequestId = leadIdParam ? Number(leadIdParam) : undefined;
  const initialName = searchParams.get("name") || "";
  const initialAdminName = searchParams.get("adminName") || "";
  const initialEmail = searchParams.get("email") || "";
  const initialPhone = searchParams.get("phone") || "";
  const initialCode = initialName
    ? initialName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 30)
    : "";

  const wizardSchema = useMemo(() => createWizardSchema(t), [t]);

  const form = useForm<FormValues>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      name: initialName,
      code: initialCode,
      subdomain: initialCode,
      adminName: initialAdminName,
      adminEmail: initialEmail,
      phone: initialPhone,
      environmentType: "PRODUCTION",
      billingCycle: "YEARLY",
      closingMethod: "QUOTATION",
      planId: plans?.[0]?.id || 0,
      companyLegalName: initialName,
      billingEmail: initialEmail,
    },
    mode: "onChange",
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    form.setValue("name", val);
    const generatedCode = val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 30);

    if (!form.getValues("code") || form.getFieldState("code").isDirty === false) {
      form.setValue("code", generatedCode, { shouldValidate: true });
    }
    if (!form.getValues("subdomain") || form.getFieldState("subdomain").isDirty === false) {
      form.setValue("subdomain", generatedCode, { shouldValidate: true });
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setApiError(null);
    try {
      const plan = plans.find((p) => p.id === values.planId);
      if (!plan) throw new Error(t("master.commerce.dealWizard.errors.planNotFound"));
      const amountVnd = plan.priceYearly || 0;

      // =========================================================================
      // GIAI ĐOẠN 1: GỬI BÁO GIÁ THƯƠNG MẠI (QUOTATION PROPOSAL)
      // =========================================================================
      if (values.closingMethod === "QUOTATION") {
        const quoteRecipientEmail = values.billingEmail || values.adminEmail;
        await consultationApi.sendQuotation({
          consultationRequestId,
          companyName: values.name,
          contactName: values.adminName,
          recipientEmail: quoteRecipientEmail,
          phoneNumber: values.phone,
          planId: plan.id ?? values.planId,
          platformFee: cpqDetails?.platformFee ?? amountVnd,
          addonFee: cpqDetails?.addonFee ?? 0,
          discount: cpqDetails?.discount ?? 0,
          totalQuote: cpqDetails?.totalQuote ?? amountVnd,
          pricingMode: cpqDetails?.pricingMode,
          notes: values.notes,
        });

        fetchData();
        setSuccessData({
          tenantCode: values.name,
          closingMethod: "QUOTATION",
          recipientEmail: quoteRecipientEmail,
        });
        return;
      }

      // =========================================================================
      // GIAI ĐOẠN 2: CHỐT HỢP ĐỒNG HOẶC HÓA ĐƠN PHÁP LÝ (CLOSING DEAL)
      // =========================================================================
      const tenant = await masterTenantApi.onboardTenant({
        name: values.name,
        code: values.code,
        subdomain: values.subdomain,
        adminName: values.adminName,
        adminEmail: values.adminEmail,
        environmentType: values.environmentType,
        companyLegalName: values.companyLegalName,
        taxCode: values.taxCode,
        billingAddress: values.address,
        billingEmail: values.billingEmail,
        deferProvisioning: true,
        consultationRequestId,
      });

      if (values.closingMethod === "INVOICE") {
        await billingApi.create({
          tenantId: tenant.id,
          planId: plan.id,
          amount: amountVnd,
          currency: "VND",
          notes: t("master.commerce.dealWizard.payload.invoiceNotes", { planName: plan.name }),
        });
      } else {
        const today = new Date();
        const endDate = new Date();
        endDate.setFullYear(today.getFullYear() + 1);

        await contractApi.create({
          tenantId: tenant.id,
          planId: plan.id,
          consultationRequestId,
          title: t("master.commerce.dealWizard.payload.contractTitle", { planName: plan.name }),
          contractValue: amountVnd,
          currency: "VND",
          startDate: today.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
          partyBName: values.companyLegalName,
          partyBTaxCode: values.taxCode,
          partyBAddress: values.address,
          partyBRepresentative: values.representative,
          partyBPhone: values.phone,
          partyBEmail: values.billingEmail,
        });
      }

      fetchData();
      setSuccessData({ tenantCode: tenant.code, closingMethod: values.closingMethod });
    } catch (err: any) {
      setApiError(getApiErrorMessage(err, t("master.commerce.dealWizard.errors.createFailed")));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20";
  const labelClass = "mb-1.5 block text-sm font-semibold text-slate-900";

  if (successData) {
    const isQuote = successData.closingMethod === "QUOTATION";
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-8 sm:px-6 lg:py-12">
        <div className="mx-auto max-w-2xl text-center">
          <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full shadow-sm border mb-6 ${
            isQuote ? "bg-purple-100 text-purple-600 border-purple-200" : "bg-emerald-100 text-emerald-600 border-emerald-200"
          }`}>
            {isQuote ? <Mail className="h-10 w-10" /> : <CheckCircle2 className="h-12 w-12" />}
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            {isQuote ? t("master.commerce.dealWizard.success.quoteTitle") : t("master.commerce.dealWizard.success.dealTitle")}
          </h1>
          <p className="text-slate-600 mb-8 max-w-lg mx-auto leading-relaxed">
            {isQuote ? (
              <>
                {t("master.commerce.dealWizard.success.quoteDescBefore")}
                <strong>{successData.recipientEmail}</strong>
                {t("master.commerce.dealWizard.success.quoteDescAfter")}
              </>
            ) : successData.closingMethod === "INVOICE" ? (
              t("master.commerce.dealWizard.success.invoiceDesc")
            ) : (
              t("master.commerce.dealWizard.success.contractDesc")
            )}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(isQuote ? "/admin/leads" : "/admin/tenants/directory")}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              {isQuote ? t("master.commerce.dealWizard.success.backToLeads") : t("master.commerce.dealWizard.success.backToDirectory")}
            </button>
            <button
              onClick={() => navigate(isQuote ? "/admin/subscriptions/plans" : (successData.closingMethod === "INVOICE" ? "/admin/invoices" : "/admin/contracts"))}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-md"
            >
              {isQuote ? t("master.commerce.dealWizard.success.viewPlans") : (successData.closingMethod === "INVOICE" ? t("master.commerce.dealWizard.success.viewInvoice") : t("master.commerce.dealWizard.success.viewContract"))}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      <main className="mx-auto max-w-5xl">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xl shadow-slate-200/40">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">

              {/* API Error Alert */}
              {apiError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-red-600" />
                  <span>{apiError}</span>
                </div>
              )}

              {/* STEP 1: TENANT INFO */}
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    {t("master.commerce.dealWizard.step1Title")}
                  </h2>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>{t("master.commerce.dealWizard.companyNameLabel")} <span className="text-red-500">*</span></label>
                    <input {...form.register("name")} onChange={handleNameChange} className={inputClass} placeholder={t("master.commerce.dealWizard.companyNamePlaceholder")} />
                    {form.formState.errors.name && <p className="mt-1 text-xs text-red-600">{form.formState.errors.name.message}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>{t("master.commerce.dealWizard.codeLabel")} <span className="text-red-500">*</span></label>
                    <input {...form.register("code")} className={`${inputClass} font-mono text-blue-700 font-semibold`} />
                    {form.formState.errors.code && <p className="mt-1 text-xs text-red-600">{form.formState.errors.code.message}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>{t("master.commerce.dealWizard.subdomainLabel")} <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input {...form.register("subdomain")} className={`${inputClass} font-mono pr-28 text-blue-700 font-semibold`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">.smarthire.top</span>
                    </div>
                    {form.formState.errors.subdomain && <p className="mt-1 text-xs text-red-600">{form.formState.errors.subdomain.message}</p>}
                  </div>


                  <div className="sm:col-span-2 pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" /> {t("master.commerce.dealWizard.adminAccountSection")}
                    </h3>
                  </div>

                  <div>
                    <label className={labelClass}>{t("master.commerce.dealWizard.adminNameLabel")} <span className="text-red-500">*</span></label>
                    <input {...form.register("adminName")} className={inputClass} placeholder={t("master.commerce.dealWizard.adminNamePlaceholder")} />
                    {form.formState.errors.adminName && <p className="mt-1 text-xs text-red-600">{form.formState.errors.adminName.message}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>{t("master.commerce.dealWizard.adminEmailLabel")} <span className="text-red-500">*</span></label>
                    <input type="email" {...form.register("adminEmail")} className={inputClass} placeholder={t("master.commerce.dealWizard.adminEmailPlaceholder")} />
                    {form.formState.errors.adminEmail && <p className="mt-1 text-xs text-red-600">{form.formState.errors.adminEmail.message}</p>}
                  </div>

                  <div className="sm:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-900 leading-relaxed">
                    <strong>{t("master.commerce.dealWizard.securityNoteTitle")}</strong>{" "}
                    {t("master.commerce.dealWizard.securityNoteBody")}
                  </div>
                </div>

              </div>

              {/* STEP 2: PLAN SELECTION */}
              <div className="space-y-6 pt-8 border-t border-slate-200">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    {t("master.commerce.dealWizard.step2Title")}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">{t("master.commerce.dealWizard.step2Subtitle")}</p>
                </div>

                <div className="space-y-2">
                  <label className={labelClass}>{t("master.commerce.dealWizard.licenseCycleLabel")}</label>
                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
                    <span>{t("master.commerce.dealWizard.licenseCycleYearly")}</span>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
                  {plans.map((plan) => {
                    const isSelected = form.watch("planId") === plan.id;
                    const price = plan.priceYearly || 0;
                    return (
                      <div
                        key={plan.id}
                        onClick={() => {
                          if (isSelected) {
                            form.setValue("planId", 0, { shouldValidate: true });
                          } else {
                            form.setValue("planId", plan.id as number, { shouldValidate: true });
                            form.setValue("billingCycle", "YEARLY");
                          }
                        }}
                        className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${isSelected ? "border-blue-600 bg-blue-50/30 shadow-lg shadow-blue-500/10" : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md"
                          }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-bold text-slate-900 text-lg">{plan.name}</h4>
                          {isSelected && <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />}
                        </div>
                        <div className="text-2xl font-bold text-slate-900 mb-1">
                          {formatNumber(price, undefined, locale)} ₫
                        </div>
                        <div className="text-xs text-slate-500 font-medium pb-4 border-b border-slate-100">
                          /{t("master.commerce.common.yearUnit")}
                        </div>

                        <ul className="mt-4 space-y-2 text-sm text-slate-600">
                          <li className="flex items-center justify-between">
                            <span>{t("master.commerce.dealWizard.jobsQuotaLabel")}</span>
                            <span className="font-semibold text-slate-900">{plan.maxJobs === -1 ? t("master.commerce.common.unlimited") : plan.maxJobs}</span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span>{t("master.commerce.dealWizard.cvQuotaLabel")}</span>
                            <span className="font-semibold text-slate-900">{plan.maxCvParses === -1 ? t("master.commerce.common.unlimited") : formatNumber(plan.maxCvParses, undefined, locale)}</span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span>{t("master.commerce.dealWizard.aiQuotaLabel")}</span>
                            <span className="font-semibold text-slate-900">{plan.maxAiInterviewHours === -1 ? t("master.commerce.common.unlimited") : `${plan.maxAiInterviewHours}h`}</span>
                          </li>
                        </ul>
                      </div>
                    );
                  })}
                </div>

                {!showCreatePlan && (
                  <div className="flex mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        form.setValue("planId", 0, { shouldValidate: true });
                        setShowCreatePlan(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 shadow-sm"
                    >
                      <Plus className="h-4 w-4" /> {t("master.commerce.dealWizard.addCustomPlanBtn")}
                    </button>
                  </div>
                )}

                {showCreatePlan && (
                  <CreatePlanInlineForm
                    onCancel={() => setShowCreatePlan(false)}
                    onSuccess={(newPlan, details) => {
                      setCpqDetails(details || null);
                      form.setValue("planId", newPlan.id, { shouldValidate: true });
                      setShowCreatePlan(false);
                    }}
                  />
                )}
                {form.formState.errors.planId && <p className="text-sm text-red-600 font-medium">{form.formState.errors.planId.message}</p>}

              </div>

              {/* STEP 3: CLOSING METHOD */}
              <div className="space-y-6 pt-8 border-t border-slate-200">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <FileSignature className="h-5 w-5 text-blue-600" />
                    {t("master.commerce.dealWizard.step3Title")}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">{t("master.commerce.dealWizard.step3Subtitle")}</p>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <label className={`flex gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    form.watch("closingMethod") === "QUOTATION" ? "border-purple-600 bg-purple-50/50 shadow-sm" : "border-slate-200 hover:bg-slate-50"
                  }`}>
                    <input type="radio" value="QUOTATION" {...form.register("closingMethod")} className="mt-1 w-4 h-4 text-purple-600" />
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                        <Mail className="h-4 w-4 text-purple-600" /> {t("master.commerce.dealWizard.methodQuotationTitle")}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {t("master.commerce.dealWizard.methodQuotationDesc")}
                      </p>
                    </div>
                  </label>

                  <label className={`flex gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    form.watch("closingMethod") === "INVOICE" ? "border-amber-500 bg-amber-50/50 shadow-sm" : "border-slate-200 hover:bg-slate-50"
                  }`}>
                    <input type="radio" value="INVOICE" {...form.register("closingMethod")} className="mt-1 w-4 h-4 text-amber-600" />
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                        <ReceiptText className="h-4 w-4 text-amber-600" /> {t("master.commerce.dealWizard.methodInvoiceTitle")}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {t("master.commerce.dealWizard.methodInvoiceDesc")}
                      </p>
                    </div>
                  </label>

                  <label className={`flex gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    form.watch("closingMethod") === "CONTRACT" ? "border-indigo-600 bg-indigo-50/50 shadow-sm" : "border-slate-200 hover:bg-slate-50"
                  }`}>
                    <input type="radio" value="CONTRACT" {...form.register("closingMethod")} className="mt-1 w-4 h-4 text-indigo-600" />
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                        <FileSignature className="h-4 w-4 text-indigo-600" /> {t("master.commerce.dealWizard.methodContractTitle")}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {t("master.commerce.dealWizard.methodContractDesc")}
                      </p>
                    </div>
                  </label>
                </div>

                {form.watch("closingMethod") === "QUOTATION" ? (
                  <div className="space-y-4 bg-purple-50/40 rounded-2xl p-5 border border-purple-200 animate-in fade-in">
                    <div className="flex items-start gap-2.5">
                      <Mail className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-purple-950 text-sm">{t("master.commerce.dealWizard.quotationBoxTitle")}</h4>
                        <p className="text-xs text-purple-800 mt-0.5 leading-relaxed">
                          {t("master.commerce.dealWizard.quotationBoxDescBefore")}
                          <strong>{t("master.commerce.dealWizard.quotationBoxDescStrong")}</strong>
                          {t("master.commerce.dealWizard.quotationBoxDescAfter")}
                        </p>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className={labelClass}>{t("master.commerce.dealWizard.quoteEmailLabel")} <span className="text-red-500">*</span></label>
                        <input {...form.register("billingEmail")} type="email" className={inputClass} placeholder={t("master.commerce.dealWizard.quoteEmailPlaceholder")} />
                        {form.formState.errors.billingEmail && <p className="mt-1 text-xs text-red-600">{form.formState.errors.billingEmail.message}</p>}
                      </div>

                      <div>
                        <label className={labelClass}>{t("master.commerce.dealWizard.contactPhoneLabel")}</label>
                        <input {...form.register("phone")} className={inputClass} placeholder={t("master.commerce.dealWizard.contactPhonePlaceholder")} />
                      </div>

                      <div className="sm:col-span-2">
                        <label className={labelClass}>{t("master.commerce.dealWizard.quoteNotesLabel")}</label>
                        <textarea {...form.register("notes")} rows={2} className={inputClass} placeholder={t("master.commerce.dealWizard.quoteNotesPlaceholder")} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-6 bg-slate-50 rounded-2xl p-5 border border-slate-200 animate-in fade-in">
                    <div className="sm:col-span-2">
                      <h3 className="font-bold text-slate-900 text-sm mb-4">
                        {form.watch("closingMethod") === "INVOICE" ? t("master.commerce.dealWizard.invoiceInfoTitle") : t("master.commerce.dealWizard.contractInfoTitle")}
                      </h3>
                    </div>

                    <div className="sm:col-span-2">
                      <label className={labelClass}>{t("master.commerce.dealWizard.legalNameLabel")} <span className="text-red-500">*</span></label>
                      <input {...form.register("companyLegalName")} className={inputClass} placeholder={t("master.commerce.dealWizard.legalNamePlaceholder")} />
                      {form.formState.errors.companyLegalName && <p className="mt-1 text-xs text-red-600">{form.formState.errors.companyLegalName.message}</p>}
                    </div>

                    <div>
                      <label className={labelClass}>{t("master.commerce.dealWizard.taxCodeLabel")} <span className="text-red-500">*</span></label>
                      <input {...form.register("taxCode")} className={inputClass} placeholder={t("master.commerce.dealWizard.taxCodePlaceholder")} />
                      {form.formState.errors.taxCode && <p className="mt-1 text-xs text-red-600">{form.formState.errors.taxCode.message}</p>}
                    </div>

                    <div>
                      <label className={labelClass}>{t("master.commerce.dealWizard.billingEmailLabel")} <span className="text-red-500">*</span></label>
                      <input {...form.register("billingEmail")} type="email" className={inputClass} placeholder={t("master.commerce.dealWizard.billingEmailPlaceholder")} />
                      {form.formState.errors.billingEmail && <p className="mt-1 text-xs text-red-600">{form.formState.errors.billingEmail.message}</p>}
                    </div>

                    <div className="sm:col-span-2">
                      <label className={labelClass}>{t("master.commerce.dealWizard.addressLabel")} <span className="text-red-500">*</span></label>
                      <input {...form.register("address")} className={inputClass} placeholder={t("master.commerce.dealWizard.addressPlaceholder")} />
                      {form.formState.errors.address && <p className="mt-1 text-xs text-red-600">{form.formState.errors.address.message}</p>}
                    </div>

                    <div className="sm:col-span-2">
                      <label className={labelClass}>{t("master.commerce.dealWizard.phoneLabel")}</label>
                      <input {...form.register("phone")} className={inputClass} placeholder={t("master.commerce.dealWizard.phonePlaceholder")} />
                    </div>

                    {form.watch("closingMethod") === "CONTRACT" && (
                      <div className="sm:col-span-2 animate-in fade-in slide-in-from-top-2">
                        <label className={labelClass}>{t("master.commerce.dealWizard.representativeLabel")}</label>
                        <input {...form.register("representative")} className={inputClass} placeholder={t("master.commerce.dealWizard.representativePlaceholder")} />
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-70 disabled:hover:bg-blue-600"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> {t("master.commerce.common.processing")}</>
                    ) : form.watch("closingMethod") === "QUOTATION" ? (
                      <><Send className="h-4 w-4" /> {t("master.commerce.dealWizard.submitQuotationBtn")}</>
                    ) : form.watch("closingMethod") === "INVOICE" ? (
                      <><ReceiptText className="h-4 w-4" /> {t("master.commerce.dealWizard.submitInvoiceBtn")}</>
                    ) : (
                      <><FileSignature className="h-4 w-4" /> {t("master.commerce.dealWizard.submitContractBtn")}</>
                    )}
                  </button>
                </div>
              </div>

            </form>
          </section>
      </main>
    </div>
  );
}

export function B2bDealWizardPage() {
  return <B2bDealWizardPageContent />;
}
