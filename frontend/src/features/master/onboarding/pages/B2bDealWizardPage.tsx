import React, { useState, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Building2, CreditCard, FileSignature, Loader2, ShieldCheck, ReceiptText, Plus, X, ChevronDown, BrainCircuit } from "lucide-react";
import { masterTenantApi } from "@/api/master/tenantApi";
import { billingApi } from "@/api/master/billingApi";
import { contractApi } from "@/api/master/contractApi";
import { masterAdminApi } from "@/api/master/masterAdminApi";
import { useTenants, useSubscriptions, useRevenueAnalytics, useAiQuotaUsage, useAuditLogs, useLeads, useInvoices, useContracts, masterQueryKeys, useCreateSubscription } from "@/api/master/queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";
import { getApiErrorMessage } from "@/lib/axios";


const wizardSchema = z.object({
  // Step 1: Tenant
  name: z.string().trim().min(1, "Vui lòng nhập tên doanh nghiệp"),
  code: z.string().regex(/^[a-z][a-z0-9-]{1,31}$/, "Mã gồm 2-32 ký tự thường/số (vd: fpt)"),
  subdomain: z.string().regex(/^[a-z][a-z0-9-]{1,61}[a-z0-9]$/, "Subdomain không hợp lệ"),
  environmentType: z.enum(["PRODUCTION", "POC_SANDBOX"]).default("PRODUCTION"),
  adminName: z.string().trim().min(1, "Vui lòng nhập tên quản trị viên"),
  adminEmail: z.string().trim().email("Email không hợp lệ"),
  adminPassword: z.string().min(12, "Mật khẩu tối thiểu 12 ký tự"),

  // Step 2: Plan
  planId: z.number({ required_error: "Vui lòng chọn gói dịch vụ" }).min(1, "Vui lòng chọn gói dịch vụ"),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).default("YEARLY"),

  // Step 3: Billing & Contract
  closingMethod: z.enum(["INVOICE", "CONTRACT"]),
  companyLegalName: z.string().trim().min(1, "Vui lòng nhập Tên công ty / Pháp nhân"),
  taxCode: z.string().trim().min(1, "Vui lòng nhập Mã số thuế"),
  address: z.string().trim().min(1, "Vui lòng nhập địa chỉ doanh nghiệp"),
  billingEmail: z.string().trim().email("Email nhận hóa đơn không hợp lệ"),
  phone: z.string().optional(),
  representative: z.string().optional(),
});

type FormValues = z.infer<typeof wizardSchema>;

function CustomSelect({
  value,
  onChange,
  options,
  name,
  className
}: {
  value: any,
  onChange: (val: any) => void,
  options: { value: any, label: string }[],
  name: string,
  className?: string
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find(o => String(o.value) === String(value)) || options[0];

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value} />
      <div
        onClick={() => setOpen(!open)}
        className={`flex justify-between items-center cursor-pointer ${className}`}
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 top-full left-0 w-full mt-1 py-1 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/40 max-h-60 overflow-auto">
            {options.map((opt, i) => (
              <div
                key={i}
                className="px-4 py-2.5 text-sm hover:bg-slate-50 cursor-pointer text-slate-700 transition-colors"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CreatePlanInlineForm({ onCancel, onSuccess }: { onCancel: () => void, onSuccess: (plan: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createPlanMutation = useCreateSubscription();
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [maxJobs, setMaxJobs] = useState(10);
  const [maxCvParses, setMaxCvParses] = useState(500);
  const [maxAiInterviewHours, setMaxAiInterviewHours] = useState(10);
  const [maxStorageGb, setMaxStorageGb] = useState(5);
  const [maxProctoringHours, setMaxProctoringHours] = useState(0);
  const [videoRetentionDays, setVideoRetentionDays] = useState(30);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!containerRef.current) return;
    const nameInput = containerRef.current.querySelector<HTMLInputElement>('input[name="name"]');
    const codeInput = containerRef.current.querySelector<HTMLInputElement>('input[name="code"]');
    const descInput = containerRef.current.querySelector<HTMLInputElement>('input[name="description"]');
    const priceYInput = containerRef.current.querySelector<HTMLInputElement>('input[name="priceYearly"]');
    const priceYVal = Number(priceYInput?.value || 0);

    if (!nameInput?.value || !codeInput?.value) {
      setError("Vui lòng nhập Tên gói và Mã code");
      return;
    }

    const data = {
      name: nameInput.value,
      code: codeInput.value,
      description: descInput?.value || "Gói tạo từ Wizard",
      priceYearly: priceYVal,
      maxJobs: maxJobs,
      maxCvParses: maxCvParses,
      maxAiInterviewHours: maxAiInterviewHours,
      maxStorageGb: maxStorageGb,
      maxProctoringHours: maxProctoringHours,
      videoRetentionDays: videoRetentionDays,
      status: "ACTIVE",
    };

    setLoading(true);
    setError(null);
    try {
      const newPlan = await createPlanMutation.mutateAsync(data as any);
      onSuccess(newPlan);
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Không thể tạo gói dịch vụ"));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20";
  const labelClass = "mb-1 block text-xs font-semibold text-slate-700";

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown} className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/50 p-5 relative animate-in fade-in slide-in-from-top-2 shadow-inner">
      <button type="button" onClick={onCancel} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors">
        <X className="h-5 w-5" />
      </button>
      <h3 className="font-bold text-slate-900 mb-4 text-lg">Tạo Gói Dịch Vụ Mới</h3>
      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="col-span-2">
          <label className={labelClass}>Tên gói <span className="text-red-500">*</span></label>
          <input name="name" required className={inputClass} placeholder="Gói Custom VIP" />
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Mã Code <span className="text-red-500">*</span></label>
          <input name="code" required className={inputClass} placeholder="CUSTOM_VIP" />
        </div>

        <div className="col-span-2 sm:col-span-4">
          <label className={labelClass}>Mô tả gói</label>
          <input name="description" className={inputClass} placeholder="Mô tả ngắn gọn về gói dịch vụ..." />
        </div>

        <div className="col-span-2 sm:col-span-4">
          <label className={labelClass}>Giá bản quyền năm (VNĐ) <span className="text-red-500">*</span></label>
          <input name="priceYearly" type="number" required defaultValue={36000000} className={inputClass} />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass}>Tin tuyển dụng <span className="text-red-500">*</span></label>
          <CustomSelect
            name="maxJobs"
            value={maxJobs}
            onChange={setMaxJobs}
            className={inputClass}
            options={[
              { value: 10, label: "10 tin" },
              { value: 30, label: "30 tin" },
              { value: 50, label: "50 tin" },
              { value: 100, label: "100 tin" },
              { value: 500, label: "500 tin" },
              { value: -1, label: "Không giới hạn" }
            ]}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass}>Lượt CV AI <span className="text-red-500">*</span></label>
          <CustomSelect
            name="maxCvParses"
            value={maxCvParses}
            onChange={setMaxCvParses}
            className={inputClass}
            options={[
              { value: 500, label: "500 lượt" },
              { value: 1000, label: "1,000 lượt" },
              { value: 5000, label: "5,000 lượt" },
              { value: 10000, label: "10,000 lượt" },
              { value: -1, label: "Không giới hạn" }
            ]}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass}>Giờ Phỏng vấn AI <span className="text-red-500">*</span></label>
          <CustomSelect
            name="maxAiInterviewHours"
            value={maxAiInterviewHours}
            onChange={setMaxAiInterviewHours}
            className={inputClass}
            options={[
              { value: 10, label: "10 giờ" },
              { value: 50, label: "50 giờ" },
              { value: 100, label: "100 giờ" },
              { value: 500, label: "500 giờ" },
              { value: -1, label: "Không giới hạn" }
            ]}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass}>Lưu trữ (GB) <span className="text-red-500">*</span></label>
          <CustomSelect
            name="maxStorageGb"
            value={maxStorageGb}
            onChange={setMaxStorageGb}
            className={inputClass}
            options={[
              { value: 5, label: "5 GB" },
              { value: 10, label: "10 GB" },
              { value: 50, label: "50 GB" },
              { value: 100, label: "100 GB" },
              { value: 500, label: "500 GB" },
              { value: -1, label: "Không giới hạn" }
            ]}
          />
        </div>

        <div className="col-span-2 sm:col-span-2">
          <label className={labelClass}>Giờ Giám sát thi (Proctoring) <span className="text-red-500">*</span></label>
          <CustomSelect
            name="maxProctoringHours"
            value={maxProctoringHours}
            onChange={setMaxProctoringHours}
            className={inputClass}
            options={[
              { value: 0, label: "Không hỗ trợ" },
              { value: 10, label: "10 giờ" },
              { value: 50, label: "50 giờ" },
              { value: 100, label: "100 giờ" },
              { value: -1, label: "Không giới hạn" }
            ]}
          />
        </div>
        <div className="col-span-2 sm:col-span-2">
          <label className={labelClass}>Lưu Video <span className="text-red-500">*</span></label>
          <CustomSelect
            name="videoRetentionDays"
            value={videoRetentionDays}
            onChange={setVideoRetentionDays}
            className={inputClass}
            options={[
              { value: 30, label: "1 tháng (30 ngày)" },
              { value: 90, label: "3 tháng (90 ngày)" },
              { value: 180, label: "6 tháng (180 ngày)" },
              { value: 365, label: "12 tháng (1 năm)" },
              { value: -1, label: "Lưu vĩnh viễn" }
            ]}
          />
        </div>

        <div className="col-span-2 sm:col-span-4 flex justify-end mt-2">
          <button type="button" onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-70 text-sm shadow-sm transition-colors">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Xác nhận tạo gói
          </button>
        </div>
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
  const [successData, setSuccessData] = useState<{ tenantCode: string; closingMethod: "INVOICE" | "CONTRACT" } | null>(null);

  const initialName = searchParams.get("name") || "";
  const initialAdminName = searchParams.get("adminName") || "";
  const initialEmail = searchParams.get("email") || "";
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
      environmentType: "PRODUCTION",
      billingCycle: "YEARLY",
      closingMethod: "INVOICE",
      planId: plans?.[0]?.id || 0,
      adminPassword: "",
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
      // 1. Khởi tạo Tenant & Database
      const tenant = await masterTenantApi.onboardTenant({
        name: values.name,
        code: values.code,
        subdomain: values.subdomain,
        adminName: values.adminName,
        adminEmail: values.adminEmail,
        adminPassword: values.adminPassword,
        environmentType: values.environmentType,
        companyLegalName: values.companyLegalName,
        taxCode: values.taxCode,
        billingAddress: values.address,
        billingEmail: values.billingEmail,
      });

      // 2. Lấy thông tin gói
      const plan = plans.find((p) => p.id === values.planId);
      if (!plan) throw new Error("Không tìm thấy thông tin gói cước");

      const isYearly = values.billingCycle === "YEARLY";
      const amountVnd = isYearly ? (plan.priceYearly || 0) : Math.round((plan.priceYearly || 0) / 12);

      // 3. Xử lý hình thức chốt sale
      if (values.closingMethod === "INVOICE") {
        await billingApi.create({
          tenantId: tenant.id,
          planId: plan.id,
          amount: amountVnd,
          currency: "VND",
          notes: `Khởi tạo qua B2B Wizard. Gói: ${plan.name} (${values.billingCycle})`,
        });
      } else {
        const today = new Date();
        const endDate = new Date();
        if (isYearly) endDate.setFullYear(today.getFullYear() + 1);
        else endDate.setMonth(today.getMonth() + 1);

        await contractApi.create({
          tenantId: tenant.id,
          planId: plan.id,
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

      // 4. Refresh data
      fetchData();

      setSuccessData({ tenantCode: tenant.code, closingMethod: values.closingMethod });
    } catch (err: any) {
      setApiError(getApiErrorMessage(err, "Có lỗi xảy ra trong quá trình khởi tạo"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20";
  const labelClass = "mb-1.5 block text-sm font-semibold text-slate-900";

  if (successData) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-8 sm:px-6 lg:py-12">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm border border-emerald-200 mb-6">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Chốt Sale Thành Công! 🎉</h1>
          <p className="text-slate-600 mb-8 max-w-lg mx-auto">
            Workspace <strong>{successData.tenantCode}</strong> đã được khởi tạo thành công cùng với Database độc lập.
            {successData.closingMethod === "INVOICE"
              ? " Hóa đơn thanh toán đã được tạo."
              : " Hợp đồng điện tử đã được tạo và sẵn sàng gửi cho khách ký số."}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/admin/tenants/directory")}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            >
              Về Danh bạ Doanh nghiệp
            </button>
            <button
              onClick={() => navigate(successData.closingMethod === "INVOICE" ? "/admin/invoices" : "/admin/contracts")}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-md"
            >
              Xem {successData.closingMethod === "INVOICE" ? "Hóa đơn" : "Hợp đồng"} vừa tạo
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="sticky top-16 md:top-0 z-10 bg-[#f8fafc]/95 backdrop-blur-md px-4 py-4 sm:px-6 lg:px-8 -mx-4 -mt-5 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 mb-6 border-b border-slate-200/50 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Khởi Tạo Doanh Nghiệp</h1>
        </div>
      </header>

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
                    Hồ sơ Doanh nghiệp & Quản trị
                  </h2>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Tên Doanh nghiệp <span className="text-red-500">*</span></label>
                    <input {...form.register("name")} onChange={handleNameChange} className={inputClass} placeholder="FPT Software" />
                    {form.formState.errors.name && <p className="mt-1 text-xs text-red-600">{form.formState.errors.name.message}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>Mã Code <span className="text-red-500">*</span></label>
                    <input {...form.register("code")} className={`${inputClass} font-mono text-blue-700 font-semibold`} />
                    {form.formState.errors.code && <p className="mt-1 text-xs text-red-600">{form.formState.errors.code.message}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>Subdomain <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input {...form.register("subdomain")} className={`${inputClass} font-mono pr-28 text-blue-700 font-semibold`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">.smarthire.top</span>
                    </div>
                    {form.formState.errors.subdomain && <p className="mt-1 text-xs text-red-600">{form.formState.errors.subdomain.message}</p>}
                  </div>


                  <div className="sm:col-span-2 pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" /> Tài khoản Quản trị
                    </h3>
                  </div>

                  <div>
                    <label className={labelClass}>Họ tên Admin <span className="text-red-500">*</span></label>
                    <input {...form.register("adminName")} className={inputClass} placeholder="Nguyễn Văn A" />
                    {form.formState.errors.adminName && <p className="mt-1 text-xs text-red-600">{form.formState.errors.adminName.message}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>Email Admin <span className="text-red-500">*</span></label>
                    <input type="email" {...form.register("adminEmail")} className={inputClass} placeholder="admin@domain.com" />
                    {form.formState.errors.adminEmail && <p className="mt-1 text-xs text-red-600">{form.formState.errors.adminEmail.message}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass}>Mật khẩu Admin <span className="text-red-500">*</span></label>
                    <input type="password" {...form.register("adminPassword")} className={inputClass} placeholder="Ít nhất 12 ký tự" />
                    {form.formState.errors.adminPassword && <p className="mt-1 text-xs text-red-600">{form.formState.errors.adminPassword.message}</p>}
                  </div>
                </div>

              </div>

              {/* STEP 2: PLAN SELECTION */}
              <div className="space-y-6 pt-8 border-t border-slate-200">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    Gói Dịch Vụ & Chu Kỳ
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Phân bổ tài nguyên và tính năng cho Doanh nghiệp.</p>
                </div>

                <div className="space-y-2">
                  <label className={labelClass}>Chu kỳ bản quyền</label>
                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
                    <span>Hàng Năm (Yearly License Only)</span>
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
                          {price?.toLocaleString("vi-VN")} ₫
                        </div>
                        <div className="text-xs text-slate-500 font-medium pb-4 border-b border-slate-100">
                          /năm
                        </div>

                        <ul className="mt-4 space-y-2 text-sm text-slate-600">
                          <li className="flex items-center justify-between">
                            <span>Tin tuyển dụng:</span>
                            <span className="font-semibold text-slate-900">{plan.maxJobs === -1 ? "Không giới hạn" : plan.maxJobs}</span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span>Lượt CV AI:</span>
                            <span className="font-semibold text-slate-900">{plan.maxCvParses === -1 ? "Không giới hạn" : plan.maxCvParses}</span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span>Phỏng vấn AI:</span>
                            <span className="font-semibold text-slate-900">{plan.maxAiInterviewHours === -1 ? "Không giới hạn" : `${plan.maxAiInterviewHours}h`}</span>
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
                    onSuccess={(newPlan) => {
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
                    Hình thức Pháp lý & Thanh toán
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Chọn cấp Hóa đơn nhanh hoặc tạo Hợp đồng E-Contract B2B.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className={`flex gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${form.watch("closingMethod") === "INVOICE" ? "border-amber-500 bg-amber-50/50" : "border-slate-200 hover:bg-slate-50"}`}>
                    <input type="radio" value="INVOICE" {...form.register("closingMethod")} className="mt-1 w-4 h-4 text-amber-600" />
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2"><ReceiptText className="h-4 w-4 text-amber-600" /> Chỉ xuất Hóa đơn</div>
                      <p className="text-xs text-slate-600 mt-1">Nhanh chóng, phù hợp khách lẻ mua gói trải nghiệm không cần hợp đồng rườm rà.</p>
                    </div>
                  </label>

                  <label className={`flex gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${form.watch("closingMethod") === "CONTRACT" ? "border-indigo-600 bg-indigo-50/50" : "border-slate-200 hover:bg-slate-50"}`}>
                    <input type="radio" value="CONTRACT" {...form.register("closingMethod")} className="mt-1 w-4 h-4 text-indigo-600" />
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2"><FileSignature className="h-4 w-4 text-indigo-600" /> Hợp đồng E-Contract</div>
                      <p className="text-xs text-slate-600 mt-1">Tạo Hợp đồng B2B chuẩn pháp lý. Sinh Hóa đơn tự động sau khi khách ký số.</p>
                    </div>
                  </label>
                </div>

                <div className="grid sm:grid-cols-2 gap-6 bg-slate-50 rounded-2xl p-5 border border-slate-200">
                  <div className="sm:col-span-2">
                    <h3 className="font-bold text-slate-900 text-sm mb-4">Thông tin Xuất Hóa Đơn</h3>
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
                    <label className={labelClass}>Email nhận Hóa đơn <span className="text-red-500">*</span></label>
                    <input {...form.register("billingEmail")} type="email" className={inputClass} placeholder="ketoan@congty.com" />
                    {form.formState.errors.billingEmail && <p className="mt-1 text-xs text-red-600">{form.formState.errors.billingEmail.message}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass}>Địa chỉ xuất hóa đơn <span className="text-red-500">*</span></label>
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

                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-70 disabled:hover:bg-blue-600"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Đang xử lý...</>
                    ) : (
                      "Hoàn tất"
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
