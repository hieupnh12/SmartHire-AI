import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  CheckCircle2, Building2, CreditCard, FileSignature, Loader2, 
  ShieldCheck, ReceiptText, Plus, X,
  Calculator, ShieldAlert, Sliders, Layers, Check,
  Mail, Send, HelpCircle
} from "lucide-react";
import { Tooltip } from "@/components/ux/Tooltip";
import { masterTenantApi } from "@/api/master/tenantApi";
import { billingApi } from "@/api/master/billingApi";
import { contractApi } from "@/api/master/contractApi";
import { consultationApi } from "@/api/master/consultationApi";
import { useSubscriptions, useCreateSubscription, masterQueryKeys } from "@/api/master/queries";
import { useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/axios";
import { formatQuotaLimit } from "@/lib/quotaFormatters";
import { 
  calculateTemplateAddonQuote, 
  calculateScratchCustomQuote, 
  STANDARD_TEMPLATE_PLANS, 
  CPQ_RATES, 
  type CpqPricingMode 
} from "../utils/cpqPricingEngine";


const wizardSchema = z.object({
  // Step 1: Tenant
  name: z.string().trim().min(1, "Vui lòng nhập tên doanh nghiệp"),
  code: z.string().regex(/^[a-z][a-z0-9-]{1,31}$/, "Mã gồm 2-32 ký tự thường/số (vd: fpt)"),
  subdomain: z.string().regex(/^[a-z][a-z0-9-]{1,61}[a-z0-9]$/, "Tên miền riêng không hợp lệ"),
  environmentType: z.enum(["PRODUCTION", "POC_SANDBOX"]).default("PRODUCTION"),
  adminName: z.string().trim().min(1, "Vui lòng nhập tên người liên hệ"),
  adminEmail: z.string().trim().email("Email không hợp lệ"),

  // Step 2: Plan
  planId: z.number({ required_error: "Vui lòng chọn gói dịch vụ" }).min(1, "Vui lòng chọn gói dịch vụ"),
  billingCycle: z.enum(["YEARLY"]).default("YEARLY"),

  // Step 3: Billing & Contract
  closingMethod: z.enum(["QUOTATION", "INVOICE", "CONTRACT"]).default("QUOTATION"),
  companyLegalName: z.string().trim().optional(),
  taxCode: z.string().trim().optional(),
  address: z.string().trim().optional(),
  billingEmail: z.string().trim().email("Email không hợp lệ"),
  phone: z.string().optional(),
  representative: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.closingMethod === "INVOICE" || data.closingMethod === "CONTRACT") {
    if (!data.companyLegalName || data.companyLegalName.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng nhập Tên công ty / Pháp nhân để lập hóa đơn/hợp đồng",
        path: ["companyLegalName"],
      });
    }
    if (!data.taxCode || data.taxCode.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng nhập Mã số thuế",
        path: ["taxCode"],
      });
    }
    if (!data.address || data.address.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vui lòng nhập địa chỉ doanh nghiệp",
        path: ["address"],
      });
    }
  }
});

type FormValues = z.infer<typeof wizardSchema>;

function HelpTip({ content, label }: { content: string; label: string }) {
  return (
    <Tooltip content={content} side="top">
      <button
        type="button"
        aria-label={label}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
      >
        <HelpCircle className="size-3.5" aria-hidden="true" />
      </button>
    </Tooltip>
  );
}

function CreatePlanInlineForm({ onCancel, onSuccess }: { 
  onCancel: () => void, 
  onSuccess: (plan: any, cpqDetails?: { platformFee: number; addonFee: number; discount: number; totalQuote: number; pricingMode: string }) => void 
}) {
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
      setError("Vui lòng nhập Tên gói và Mã code");
      return;
    }

    if (activeResult.totalQuoteVnd <= 0) {
      setError("Tổng giá trị báo giá phải lớn hơn 0 VNĐ");
      return;
    }

    if (activeResult.isBelowSafeFloor && !confirmedLoss) {
      setError("Giá chốt hợp đồng thấp hơn giá sàn an toàn tối thiểu (Lãi < 50%). Vui lòng xác nhận phê duyệt bán giá ưu đãi từ Ban Giám đốc để tiếp tục.");
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
        ? `Gói mở rộng từ ${STANDARD_TEMPLATE_PLANS[selectedTemplate]?.name}`
        : "Gói thiết kế riêng cho doanh nghiệp"),
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
      setError(getApiErrorMessage(err, "Không thể tạo gói dịch vụ"));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20";
  const labelClass = "mb-1 block text-xs font-semibold text-slate-600";

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown} className="mt-6 rounded-2xl border-2 border-indigo-200 bg-white p-5 sm:p-6 relative animate-in fade-in slide-in-from-top-2 shadow-xl">
      <button type="button" onClick={onCancel} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors">
        <X className="h-5 w-5" />
      </button>

      {/* Title & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-600 text-lg sm:text-xl">Thiết Kế Báo Giá Doanh Nghiệp</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Chọn chế độ định giá phù hợp với quy mô và yêu cầu đàm phán của doanh nghiệp.</p>
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
            <span>1. Mở rộng từ gói mẫu</span>
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
            <span>2. Thiết kế từ đầu</span>
          </button>
        </div>
      </div>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 font-medium">{error}</div>}

      {/* Plan Identity */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        <div className="col-span-2">
          <label className={labelClass}>Tên gói báo giá <span className="text-red-500">*</span></label>
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder={pricingMode === "TEMPLATE_ADDON" ? "Gói Pro Custom - FPT Software" : "Gói May Đo Riêng - VNG Corp"}
          />
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Mã gói dịch vụ <span className="text-red-500">*</span></label>
          <input
            name="code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={inputClass}
            placeholder="CUSTOM_FPT_2026"
          />
        </div>
        <div className="col-span-2 sm:col-span-4">
          <label className={labelClass}>Mô tả tóm tắt</label>
          <input
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            placeholder="Ghi chú các điều khoản ưu đãi hoặc phạm vi sử dụng..."
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
            <label className={labelClass}>1. Chọn Gói Nền Tảng Làm Mốc <span className="text-red-500">*</span></label>
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
                      <span className="font-bold text-sm text-slate-600">{plan.name}</span>
                      {isSelected && <Check className="h-4 w-4 text-indigo-600" />}
                    </div>
                    <div className="text-base font-extrabold text-indigo-700">
                      {plan.priceYearly.toLocaleString("vi-VN")} ₫<span className="text-xs font-normal text-slate-500">/năm</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Gốc: {formatQuotaLimit(plan.baseJobs, "vị trí")} · {formatQuotaLimit(plan.baseCvParsesMonthly, "CV", { monthly: true })} · {formatQuotaLimit(plan.baseAiHoursMonthly, "giờ AI", { monthly: true })} · {formatQuotaLimit(plan.baseStorageGb, "GB")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add-on Quota Inputs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>2. Cấu hình hạn mức sử dụng (Tự động cộng phí mở rộng)</label>
              <span className="text-[11px] text-indigo-600 font-semibold">
                Đơn giá mở rộng: +500k/tin · +1.000đ/CV · +200k/giờ AI · +25k/GB
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Tin tuyển dụng (Gốc: {STANDARD_TEMPLATE_PLANS[selectedTemplate]?.baseJobs})
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
                    <strong className="text-indigo-600">+{templateResult.deltaJobs} tin (+{templateResult.addonJobsFee.toLocaleString()}đ)</strong>
                  ) : "Không tăng thêm"}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Lượt CV/tháng (Gốc: {STANDARD_TEMPLATE_PLANS[selectedTemplate]?.baseCvParsesMonthly.toLocaleString()})
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
                    <strong className="text-indigo-600">+{templateResult.deltaCv.toLocaleString()} CV (+{templateResult.addonCvFee.toLocaleString()}đ)</strong>
                  ) : "Không tăng thêm"}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Giờ AI/tháng (Gốc: {STANDARD_TEMPLATE_PLANS[selectedTemplate]?.baseAiHoursMonthly}h)
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
                    <strong className="text-indigo-600">+{templateResult.deltaAiHours}h AI (+{templateResult.addonAiFee.toLocaleString()}đ)</strong>
                  ) : "Không tăng thêm"}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Lưu trữ GB (Gốc: {STANDARD_TEMPLATE_PLANS[selectedTemplate]?.baseStorageGb}GB)
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
                    <strong className="text-indigo-600">+{templateResult.deltaStorageGb}GB (+{templateResult.addonStorageFee.toLocaleString()}đ)</strong>
                  ) : "Không tăng thêm"}
                </span>
              </div>
            </div>
          </div>

          {/* Discount Input */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="text-xs font-bold text-slate-600">
                3. Chiết khấu thương mại đối tác
              </label>
              <span className="text-[11px] text-slate-500">Giảm trừ trên tổng giá niêm yết</span>
            </div>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={500000}
                value={templateDiscount}
                onChange={(e) => setTemplateDiscount(Number(e.target.value || 0))}
                className={`${inputClass} text-base font-bold text-emerald-800`}
                placeholder="Nhập số tiền chiết khấu..."
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                VNĐ
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
                <span className="text-xs font-bold text-indigo-950 block">1. Phí Nền Tảng Cố Định</span>
                <span className="text-[11px] text-indigo-700">Chi phí khởi tạo hệ thống, cơ sở dữ liệu riêng, tên miền riêng và cam kết vận hành</span>
              </div>
              <div className="text-base font-extrabold text-indigo-900">
                {scratchPlatformFee.toLocaleString("vi-VN")} ₫<span className="text-xs font-normal">/năm</span>
              </div>
            </div>
          </div>

          {/* Scratch Resource Inputs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>2. Định lượng tài nguyên theo nhu cầu</label>
              <span className="text-[11px] text-indigo-600 font-semibold">
                Đơn giá: 400k/tin · 800đ/CV · 200k/giờ AI · 50k/GB
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Số tin tuyển dụng tối đa</label>
                <input
                  type="number"
                  min={1}
                  value={scratchJobs}
                  onChange={(e) => setScratchJobs(Number(e.target.value || 0))}
                  className={inputClass}
                />
                <span className="text-[10px] text-indigo-700 mt-1 block font-semibold">
                  = {(scratchJobs * CPQ_RATES.SCRATCH.JOB_PRICE_YEARLY).toLocaleString()} ₫/năm
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Lượt lọc CV / năm</label>
                <input
                  type="number"
                  min={100}
                  step={1000}
                  value={scratchYearlyCv}
                  onChange={(e) => setScratchYearlyCv(Number(e.target.value || 0))}
                  className={inputClass}
                />
                <span className="text-[10px] text-indigo-700 mt-1 block font-semibold">
                  = {(scratchYearlyCv * CPQ_RATES.SCRATCH.CV_PRICE_YEARLY).toLocaleString("vi-VN")} ₫/năm
                </span>
                <span className="text-[10px] text-slate-500 block">
                  ≈ {Math.max(100, Math.round(scratchYearlyCv / 12)).toLocaleString("vi-VN")} CV/tháng (khi lưu gói)
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Giờ phỏng vấn AI / năm</label>
                <input
                  type="number"
                  min={1}
                  value={scratchYearlyAiHours}
                  onChange={(e) => setScratchYearlyAiHours(Number(e.target.value || 0))}
                  className={inputClass}
                />
                <span className="text-[10px] text-indigo-700 mt-1 block font-semibold">
                  = {(scratchYearlyAiHours * CPQ_RATES.SCRATCH.AI_HOUR_PRICE_YEARLY).toLocaleString("vi-VN")} ₫/năm
                </span>
                <span className="text-[10px] text-slate-500 block">
                  ≈ {Math.max(1, Math.round(scratchYearlyAiHours / 12)).toLocaleString("vi-VN")} giờ/tháng (khi lưu gói)
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Dung lượng lưu trữ (GB)</label>
                <input
                  type="number"
                  min={5}
                  step={10}
                  value={scratchStorage}
                  onChange={(e) => setScratchStorage(Number(e.target.value || 0))}
                  className={inputClass}
                />
                <span className="text-[10px] text-indigo-700 mt-1 block font-semibold">
                  = {(scratchStorage * CPQ_RATES.SCRATCH.STORAGE_GB_PRICE_YEARLY).toLocaleString()} ₫/năm
                </span>
              </div>
            </div>
          </div>

          {/* Enterprise Advanced Options */}
          <div>
            <label className={labelClass}>3. Tùy chọn Nâng cao</label>
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
                  <span className="font-bold text-xs text-slate-600 block">Đăng nhập một lần (+5tr)</span>
                  <span className="text-[11px] text-slate-500">Kết nối hệ thống đăng nhập nội bộ</span>
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
                  <span className="font-bold text-xs text-slate-600 block">Thi lập trình tự động (+3tr)</span>
                  <span className="text-[11px] text-slate-500">Chạy và chấm bài thi code tự động</span>
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
                  <span className="font-bold text-xs text-slate-600 block">Hỗ trợ ưu tiên 24/7 (+10tr)</span>
                  <span className="text-[11px] text-slate-500">Kênh hỗ trợ riêng & cam kết ổn định 99,99%</span>
                </div>
              </label>
            </div>
          </div>

          {/* Discount Input */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="text-xs font-bold text-slate-600">
                4. Chiết khấu thương mại đối tác
              </label>
              <span className="text-[11px] text-slate-500">Giảm trừ trên tổng giá cấu hình</span>
            </div>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={500000}
                value={scratchDiscount}
                onChange={(e) => setScratchDiscount(Number(e.target.value || 0))}
                className={`${inputClass} text-base font-bold text-emerald-800`}
                placeholder="Nhập số tiền chiết khấu..."
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                VNĐ
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
            <span>BẢNG BÁO GIÁ THƯƠNG MẠI (3 HẠNG MỤC)</span>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Thời hạn hiệu lực: 15–30 ngày
          </span>
        </div>

        <div className="space-y-2 text-xs">
          {pricingMode === "TEMPLATE_ADDON" ? (
            <>
              <div className="flex justify-between text-slate-700">
                <span>1. Phí bản quyền nền tảng ({STANDARD_TEMPLATE_PLANS[selectedTemplate]?.name}):</span>
                <span className="font-semibold">{templateResult.basePlanPrice.toLocaleString("vi-VN")} ₫</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>2. Tài nguyên mở rộng:</span>
                <span className="font-semibold text-indigo-700">+{templateResult.totalAddonFees.toLocaleString("vi-VN")} ₫</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px] pl-3">
                <span>• Tổng giá niêm yết:</span>
                <span>{templateResult.listPrice.toLocaleString("vi-VN")} ₫</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>3. Chiết khấu đối tác chiến lược:</span>
                <span>-{templateResult.discountVnd.toLocaleString("vi-VN")} ₫</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-slate-700">
                <span>1. Phí nền tảng cố định (Khởi tạo & vận hành hệ thống riêng):</span>
                <span className="font-semibold">{scratchResult.platformBaseFee.toLocaleString("vi-VN")} ₫</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>2. Chi phí tài nguyên định lượng + Tùy chọn cao cấp:</span>
                <span className="font-semibold text-indigo-700">
                  +{(scratchResult.jobsFee + scratchResult.cvFee + scratchResult.aiFee + scratchResult.storageFee + scratchResult.totalEnterpriseOptionsFee).toLocaleString("vi-VN")} ₫
                </span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px] pl-3">
                <span>• Tổng giá niêm yết:</span>
                <span>{scratchResult.listPrice.toLocaleString("vi-VN")} ₫</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>3. Chiết khấu đối tác chiến lược:</span>
                <span>-{scratchResult.discountVnd.toLocaleString("vi-VN")} ₫</span>
              </div>
            </>
          )}

          <div className="border-t-2 border-indigo-100 pt-2.5 flex flex-wrap items-baseline justify-between">
            <span className="text-sm font-bold text-slate-600">TỔNG GIÁ TRỊ BÁO GIÁ:</span>
            <div className="text-right">
              <span className="text-2xl font-black text-indigo-700">
                {activeResult.totalQuoteVnd.toLocaleString("vi-VN")} ₫
              </span>
              <span className="text-xs font-semibold text-slate-500 ml-1">/ năm</span>
            </div>
          </div>
        </div>

        {/* Floor Price and Guardrail */}
        <div className="border-t border-indigo-100 pt-3 flex flex-wrap items-center justify-between text-[11px] gap-2">
          <div className="text-slate-500">
            Giá vốn ước tính: <strong>{activeResult.floorPriceVnd.toLocaleString("vi-VN")} ₫</strong> · Giá sàn an toàn (lãi &gt;50%): <strong>{activeResult.safeFloorPriceVnd.toLocaleString("vi-VN")} ₫</strong>
          </div>
          <div className="text-emerald-700 font-semibold">
            Biên lợi nhuận ước tính: +{activeResult.marginPercent.toFixed(1)}% (+{activeResult.grossProfitVnd.toLocaleString("vi-VN")} ₫)
          </div>
        </div>

        {/* Red Alert if below safe floor */}
        {activeResult.isBelowSafeFloor && (
          <div className="rounded-xl border-2 border-red-300 bg-red-50 p-3.5 text-xs text-red-900 space-y-2 animate-in fade-in">
            <div className="flex items-start gap-2 font-bold text-red-700">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
              <div>
                <div className="text-sm font-bold">CẢNH BÁO DƯỚI GIÁ SÀN AN TOÀN!</div>
                <div className="font-normal text-red-800 mt-0.5">
                  Mức giá chốt <strong>{activeResult.totalQuoteVnd.toLocaleString()} ₫</strong> thấp hơn ngưỡng an toàn <strong>{activeResult.safeFloorPriceVnd.toLocaleString()} ₫</strong> (lợi nhuận gộp dưới 50% hoặc bán lỗ).
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
              <span>Tôi xác nhận thương vụ chiến lược này đã có phê duyệt giá bán ưu đãi từ Ban Giám đốc / Tài chính.</span>
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
          Hủy bỏ
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || (activeResult.isBelowSafeFloor && !confirmedLoss)}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm transition-colors"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Lưu cấu hình gói & Áp dụng
        </button>
      </div>
    </div>
  );
}

export function B2bDealWizardPageContent() {
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
      if (!plan) throw new Error("Không tìm thấy thông tin gói cước");
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
          notes: `Khởi tạo qua B2B Wizard. Gói: ${plan.name} (YEARLY)`,
        });
      } else {
        const today = new Date();
        const endDate = new Date();
        endDate.setFullYear(today.getFullYear() + 1);

        await contractApi.create({
          tenantId: tenant.id,
          planId: plan.id,
          consultationRequestId,
          title: `Hợp đồng cung cấp Dịch vụ phần mềm SmartHire.AI - ${plan.name}`,
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
      setApiError(getApiErrorMessage(err, "Có lỗi xảy ra trong quá trình khởi tạo"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20";
  const labelClass = "mb-1.5 block text-sm font-semibold text-slate-600";

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
          <h1 className="text-3xl font-bold text-slate-600 mb-3">
            {isQuote ? "Gửi Báo Giá Thương Mại Thành Công! 🚀" : "Khởi Tạo Hồ Sơ Doanh Nghiệp Thành Công! 🎉"}
          </h1>
          <p className="text-slate-600 mb-8 max-w-lg mx-auto leading-relaxed">
            {isQuote ? (
              <>
                Bảng báo giá chi tiết 3 hạng mục đã được gửi tới hòm thư <strong>{successData.recipientEmail}</strong> (hiệu lực trong 15 ngày).
                Sau khi khách hàng xem và đồng ý phương án, bạn có thể chuyển tiếp sang bước Soạn Hợp đồng hoặc Xuất Hóa đơn.
              </>
            ) : successData.closingMethod === "INVOICE" ? (
              "Hồ sơ doanh nghiệp và gói dịch vụ đã được ghi nhận ở trạng thái Chờ thanh toán. Ngay sau khi hóa đơn được xác nhận đã thanh toán, hệ thống sẽ tự động khởi tạo không gian làm việc riêng, kích hoạt gói và gửi email thiết lập mật khẩu cho quản trị viên."
            ) : (
              "Hợp đồng điện tử đã sẵn sàng gửi khách hàng ký số. Sau khi hoàn tất ký kết và thanh toán, hệ thống sẽ tự động khởi tạo không gian làm việc riêng và gửi email kích hoạt cho quản trị viên."
            )}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(isQuote ? "/admin/leads" : "/admin/tenants/directory")}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              {isQuote ? "Về Danh sách Yêu cầu Tư vấn" : "Về Danh bạ Doanh nghiệp"}
            </button>
            <button
              onClick={() => navigate(isQuote ? "/admin/subscriptions/plans" : (successData.closingMethod === "INVOICE" ? "/admin/invoices" : "/admin/contracts"))}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-md"
            >
              {isQuote ? "Xem Quản lý Gói cước" : (successData.closingMethod === "INVOICE" ? "Xem Hóa đơn vừa tạo" : "Xem Hợp đồng vừa tạo")}
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
                  <h2 className="text-xl font-bold text-slate-600 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    Thông tin Doanh nghiệp & Quản trị viên
                  </h2>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Tên Doanh nghiệp <span className="text-red-500">*</span></label>
                    <input {...form.register("name")} onChange={handleNameChange} className={inputClass} placeholder="FPT Software" />
                    {form.formState.errors.name && <p className="mt-1 text-xs text-red-600">{form.formState.errors.name.message}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>Mã doanh nghiệp <span className="text-red-500">*</span></label>
                    <input {...form.register("code")} className={`${inputClass} font-mono text-blue-700 font-semibold`} />
                    {form.formState.errors.code && <p className="mt-1 text-xs text-red-600">{form.formState.errors.code.message}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>Tên miền riêng <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input {...form.register("subdomain")} className={`${inputClass} font-mono pr-28 text-blue-700 font-semibold`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">.smarthire.top</span>
                    </div>
                    {form.formState.errors.subdomain && <p className="mt-1 text-xs text-red-600">{form.formState.errors.subdomain.message}</p>}
                  </div>


                  <div className="sm:col-span-2 pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-600 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>Tài khoản Quản trị viên</span>
                      <HelpTip
                        content="Hệ thống không cấp mật khẩu tạo sẵn. Sau khi khởi tạo tài khoản doanh nghiệp, hệ thống sẽ tự động gửi email chứa liên kết kích hoạt một lần (hiệu lực 72 giờ) tới email quản trị viên để tự thiết lập mật khẩu riêng."
                        label="Giải thích bảo mật tài khoản quản trị"
                      />
                    </h3>
                  </div>

                  <div>
                    <label className={labelClass}>Họ tên quản trị viên <span className="text-red-500">*</span></label>
                    <input {...form.register("adminName")} className={inputClass} placeholder="Nguyễn Văn A" />
                    {form.formState.errors.adminName && <p className="mt-1 text-xs text-red-600">{form.formState.errors.adminName.message}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>Email quản trị viên <span className="text-red-500">*</span></label>
                    <input type="email" {...form.register("adminEmail")} className={inputClass} placeholder="admin@domain.com" />
                    {form.formState.errors.adminEmail && <p className="mt-1 text-xs text-red-600">{form.formState.errors.adminEmail.message}</p>}
                  </div>
                </div>

              </div>

              {/* STEP 2: PLAN SELECTION */}
              <div className="space-y-6 pt-8 border-t border-slate-200">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-bold text-slate-600 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    <span>Gói Dịch Vụ & Chu Kỳ</span>
                    <HelpTip
                      content="Phân bổ tài nguyên và tính năng cho Doanh nghiệp."
                      label="Giải thích Gói Dịch Vụ & Chu Kỳ"
                    />
                  </h2>
                </div>

                <div className="space-y-2">
                  <label className={labelClass}>Chu kỳ bản quyền</label>
                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
                    <span>Theo năm (Bản quyền năm)</span>
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
                          <h4 className="font-bold text-slate-600 text-lg">{plan.name}</h4>
                          {isSelected && <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />}
                        </div>
                        <div className="text-2xl font-bold text-slate-600 mb-1">
                          {price?.toLocaleString("vi-VN")} ₫
                        </div>
                        <div className="text-xs text-slate-500 font-medium pb-4 border-b border-slate-100">
                          /năm
                        </div>

                        <ul className="mt-4 space-y-2 text-sm text-slate-500">
                          <li className="flex items-center justify-between">
                            <span>Tin tuyển dụng:</span>
                            <span className="font-semibold text-slate-600">{formatQuotaLimit(plan.maxJobs, "vị trí")}</span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span>Lượt CV AI:</span>
                            <span className="font-semibold text-slate-600">{formatQuotaLimit(plan.maxCvParses, "CV", { monthly: true })}</span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span>Phỏng vấn AI:</span>
                            <span className="font-semibold text-slate-600">{formatQuotaLimit(plan.maxAiInterviewHours, "giờ", { monthly: true })}</span>
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
                      <Plus className="h-4 w-4" /> Thêm gói dịch vụ mới
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
                  <h2 className="text-xl font-bold text-slate-600 flex items-center gap-2">
                    <FileSignature className="h-5 w-5 text-blue-600" />
                    <span>Hình thức Báo giá & Pháp lý</span>
                    <HelpTip
                      content="Chọn gửi báo giá thương mại để khách xem trước hoặc tiến hành lập hóa đơn / hợp đồng ngay."
                      label="Giải thích Hình thức Báo giá & Pháp lý"
                    />
                  </h2>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div
                    className={`flex items-center justify-between gap-2 rounded-2xl border-2 pr-3.5 transition-all ${
                      form.watch("closingMethod") === "QUOTATION"
                        ? "border-purple-600 bg-purple-50/50 shadow-sm"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <label className="flex flex-1 cursor-pointer items-center gap-2.5 py-3.5 pl-4 pr-1 min-w-0">
                      <input type="radio" value="QUOTATION" {...form.register("closingMethod")} className="h-4 w-4 shrink-0 text-purple-600" />
                      <Mail className="h-4 w-4 shrink-0 text-purple-600" />
                      <span className="font-bold text-slate-600 text-sm leading-snug">1. Gửi Báo giá</span>
                    </label>
                    <HelpTip
                      content="Gửi email báo giá chi tiết 3 hạng mục để khách hàng xem và duyệt. Chưa cần mã số thuế, chưa khởi tạo hệ thống."
                      label="Giải thích Gửi Báo giá"
                    />
                  </div>

                  <div
                    className={`flex items-center justify-between gap-2 rounded-2xl border-2 pr-3.5 transition-all ${
                      form.watch("closingMethod") === "INVOICE"
                        ? "border-amber-500 bg-amber-50/50 shadow-sm"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <label className="flex flex-1 cursor-pointer items-center gap-2.5 py-3.5 pl-4 pr-1 min-w-0">
                      <input type="radio" value="INVOICE" {...form.register("closingMethod")} className="h-4 w-4 shrink-0 text-amber-600" />
                      <ReceiptText className="h-4 w-4 shrink-0 text-amber-600" />
                      <span className="font-bold text-slate-600 text-sm leading-snug">2. Xuất Hóa đơn trực tiếp</span>
                    </label>
                    <HelpTip
                      content="Xuất hóa đơn thanh toán theo năm (chuyển khoản QR / cổng thanh toán). Hệ thống tự động kích hoạt khi nhận thanh toán."
                      label="Giải thích Xuất Hóa đơn trực tiếp"
                    />
                  </div>

                  <div
                    className={`flex items-center justify-between gap-2 rounded-2xl border-2 pr-3.5 transition-all ${
                      form.watch("closingMethod") === "CONTRACT"
                        ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <label className="flex flex-1 cursor-pointer items-center gap-2.5 py-3.5 pl-4 pr-1 min-w-0">
                      <input type="radio" value="CONTRACT" {...form.register("closingMethod")} className="h-4 w-4 shrink-0 text-indigo-600" />
                      <FileSignature className="h-4 w-4 shrink-0 text-indigo-600" />
                      <span className="font-bold text-slate-600 text-sm leading-snug">3. Ký hợp đồng điện tử</span>
                    </label>
                    <HelpTip
                      content="Soạn hợp đồng điện tử gửi khách hàng ký số trực tuyến trước khi thanh toán."
                      label="Giải thích Ký hợp đồng điện tử"
                    />
                  </div>
                </div>

                {form.watch("closingMethod") === "QUOTATION" ? (
                  <div className="space-y-4 bg-purple-50/40 rounded-2xl p-5 border border-purple-200 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-purple-600 shrink-0" />
                      <h4 className="font-bold text-slate-600 text-sm flex items-center gap-2">
                        <span>Gửi Báo Giá Thương Mại</span>
                        <HelpTip
                          content="Hệ thống sẽ gửi email báo giá chi tiết gồm 3 hạng mục (Phí bản quyền nền tảng, Tài nguyên mở rộng, Chiết khấu đối tác) kèm hiệu lực 15 ngày tới khách hàng. Ở bước này không bắt buộc nhập mã số thuế, địa chỉ pháp lý hay người đại diện ký tên."
                          label="Giải thích Gửi Báo Giá Thương Mại"
                        />
                      </h4>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className={labelClass}>Email nhận Báo giá <span className="text-red-500">*</span></label>
                        <input {...form.register("billingEmail")} type="email" className={inputClass} placeholder="khachhang@congty.com" />
                        {form.formState.errors.billingEmail && <p className="mt-1 text-xs text-red-600">{form.formState.errors.billingEmail.message}</p>}
                      </div>

                      <div>
                        <label className={labelClass}>Số điện thoại liên hệ</label>
                        <input {...form.register("phone")} className={inputClass} placeholder="0988 888 888" />
                      </div>

                      <div className="sm:col-span-2">
                        <label className={labelClass}>Ghi chú gửi kèm báo giá (tùy chọn)</label>
                        <textarea {...form.register("notes")} rows={2} className={inputClass} placeholder="Ví dụ: Ưu đãi dành riêng cho Quý doanh nghiệp theo trao đổi ngày..." />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-6 bg-slate-50 rounded-2xl p-5 border border-slate-200 animate-in fade-in">
                    <div className="sm:col-span-2">
                      <h3 className="font-bold text-slate-600 text-sm mb-4">
                        {form.watch("closingMethod") === "INVOICE" ? "Thông tin Xuất Hóa Đơn" : "Thông tin Pháp lý Hợp đồng (Bên B)"}
                      </h3>
                    </div>

                    <div className="sm:col-span-2">
                      <label className={labelClass}>Tên Công ty / Pháp nhân <span className="text-red-500">*</span></label>
                      <input {...form.register("companyLegalName")} className={inputClass} placeholder="Công ty Cổ phần Công nghệ XYZ" />
                      {form.formState.errors.companyLegalName && <p className="mt-1 text-xs text-red-600">{form.formState.errors.companyLegalName.message}</p>}
                    </div>

                    <div>
                      <label className={labelClass}>Mã số thuế <span className="text-red-500">*</span></label>
                      <input {...form.register("taxCode")} className={inputClass} placeholder="0101248141" />
                      {form.formState.errors.taxCode && <p className="mt-1 text-xs text-red-600">{form.formState.errors.taxCode.message}</p>}
                    </div>

                    <div>
                      <label className={labelClass}>Email nhận Hóa đơn / Hợp đồng <span className="text-red-500">*</span></label>
                      <input {...form.register("billingEmail")} type="email" className={inputClass} placeholder="ketoan@congty.com" />
                      {form.formState.errors.billingEmail && <p className="mt-1 text-xs text-red-600">{form.formState.errors.billingEmail.message}</p>}
                    </div>

                    <div className="sm:col-span-2">
                      <label className={labelClass}>Địa chỉ xuất hóa đơn / Trụ sở theo ĐKKD <span className="text-red-500">*</span></label>
                      <input {...form.register("address")} className={inputClass} placeholder="Địa chỉ trên ĐKKD..." />
                      {form.formState.errors.address && <p className="mt-1 text-xs text-red-600">{form.formState.errors.address.message}</p>}
                    </div>

                    <div className="sm:col-span-2">
                      <label className={labelClass}>Số điện thoại</label>
                      <input {...form.register("phone")} className={inputClass} placeholder="SĐT liên hệ" />
                    </div>

                    {form.watch("closingMethod") === "CONTRACT" && (
                      <div className="sm:col-span-2 animate-in fade-in slide-in-from-top-2">
                        <label className={labelClass}>Người đại diện pháp luật (Ký hợp đồng)</label>
                        <input {...form.register("representative")} className={inputClass} placeholder="Ông Nguyễn Văn A - Tổng Giám Đốc" />
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
                      <><Loader2 className="h-4 w-4 animate-spin" /> Đang xử lý...</>
                    ) : form.watch("closingMethod") === "QUOTATION" ? (
                      <><Send className="h-4 w-4" /> Gửi Email Báo Giá Cho Khách Hàng</>
                    ) : form.watch("closingMethod") === "INVOICE" ? (
                      <><ReceiptText className="h-4 w-4" /> Hoàn tất & Phát hành Hóa đơn</>
                    ) : (
                      <><FileSignature className="h-4 w-4" /> Hoàn tất & Soạn Hợp đồng</>
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
