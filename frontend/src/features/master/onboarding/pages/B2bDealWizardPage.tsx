import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, Building2, CreditCard, FileSignature, Sparkles, Loader2, Database, ShieldCheck, ChevronRight, Check, ReceiptText, ArrowRight } from "lucide-react";
import { masterTenantApi } from "@/api/master/tenantApi";
import { billingApi } from "@/api/master/billingApi";
import { contractApi } from "@/api/master/contractApi";
import { MasterDashboardProvider, useMasterDashboard } from "@/features/master/shell/MasterAdminContext";
import { getApiErrorMessage } from "@/lib/axios";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";

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
  planId: z.number({ required_error: "Vui lòng chọn gói dịch vụ" }),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]).default("YEARLY"),

  // Step 3: Billing & Contract
  closingMethod: z.enum(["INVOICE", "CONTRACT"]),
  taxCode: z.string().trim().min(1, "Vui lòng nhập Mã số thuế"),
  address: z.string().trim().min(1, "Vui lòng nhập địa chỉ doanh nghiệp"),
  phone: z.string().optional(),
  representative: z.string().optional(),
});

type FormValues = z.infer<typeof wizardSchema>;

export function B2bDealWizardPageContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { plans, fetchData } = useMasterDashboard();
  
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleNext = async () => {
    let isValid = false;
    if (currentStep === 1) {
      isValid = await form.trigger(["name", "code", "subdomain", "adminName", "adminEmail", "adminPassword"]);
    } else if (currentStep === 2) {
      isValid = await form.trigger(["planId", "billingCycle"]);
    }
    if (isValid) {
      setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3);
      window.scrollTo(0, 0);
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
      });

      // 2. Lấy thông tin gói
      const plan = plans.find((p) => p.id === values.planId);
      if (!plan) throw new Error("Không tìm thấy thông tin gói cước");
      
      const isYearly = values.billingCycle === "YEARLY";
      const amountVnd = isYearly ? (plan.priceYearlyVnd || 0) : (plan.priceMonthlyVnd || 0);

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
          partyBName: values.name,
          partyBTaxCode: values.taxCode,
          partyBAddress: values.address,
          partyBRepresentative: values.representative,
          partyBPhone: values.phone,
          partyBEmail: values.adminEmail,
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
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-white hover:text-slate-900 transition-colors shadow-sm bg-white/50 border border-slate-200/50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Thoát Wizard</span>
          </button>
          <LanguageSwitcher />
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative z-10">
            {[1, 2, 3].map((step, idx) => (
              <div key={step} className="flex flex-col items-center gap-2 flex-1 relative">
                <div 
                  className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm transition-colors border-2 z-10 bg-white ${
                    currentStep === step 
                      ? "border-blue-600 text-blue-700 shadow-md ring-4 ring-blue-50" 
                      : currentStep > step 
                        ? "border-blue-600 bg-blue-600 text-white" 
                        : "border-slate-200 text-slate-400"
                  }`}
                >
                  {currentStep > step ? <Check className="h-5 w-5" /> : step}
                </div>
                <span className={`text-xs font-semibold ${currentStep >= step ? "text-slate-900" : "text-slate-400"}`}>
                  {step === 1 ? "1. Thông tin Doanh nghiệp" : step === 2 ? "2. Gói Dịch Vụ" : "3. Chốt Sale"}
                </span>
                {idx < 2 && (
                  <div 
                    className={`absolute top-5 left-1/2 w-full h-[2px] -z-10 ${
                      currentStep > step ? "bg-blue-600" : "bg-slate-200"
                    }`} 
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xl shadow-slate-200/40">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* API Error Alert */}
            {apiError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 shrink-0 text-red-600" />
                <span>{apiError}</span>
              </div>
            )}

            {/* STEP 1: TENANT INFO */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    Hồ sơ Doanh nghiệp & Quản trị
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Hệ thống sẽ tự động cấp phát Database MySQL riêng biệt.</p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Tên Doanh nghiệp <span className="text-red-500">*</span></label>
                    <input {...form.register("name")} onChange={handleNameChange} className={inputClass} placeholder="VD: FPT Software" />
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

                  <div className="sm:col-span-2">
                    <label className={labelClass}>Môi trường triển khai</label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${form.watch("environmentType") === "PRODUCTION" ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                        <input type="radio" value="PRODUCTION" {...form.register("environmentType")} className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Production</div>
                          <div className="text-[11px] text-slate-500">Môi trường thật</div>
                        </div>
                      </label>
                      <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${form.watch("environmentType") === "POC_SANDBOX" ? "border-amber-600 bg-amber-50 ring-1 ring-amber-600" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                        <input type="radio" value="POC_SANDBOX" {...form.register("environmentType")} className="w-4 h-4 text-amber-600" />
                        <div>
                          <div className="text-sm font-semibold text-slate-900">POC Sandbox</div>
                          <div className="text-[11px] text-slate-500">Môi trường test</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="sm:col-span-2 pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" /> Tài khoản Quản trị
                    </h3>
                  </div>

                  <div>
                    <label className={labelClass}>Họ tên Admin <span className="text-red-500">*</span></label>
                    <input {...form.register("adminName")} className={inputClass} placeholder="VD: Nguyễn Văn A" />
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

                <div className="mt-8 flex justify-end">
                  <button type="button" onClick={handleNext} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-md">
                    Tiếp theo: Chọn Gói Dịch Vụ <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: PLAN SELECTION */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      Gói Dịch Vụ & Chu Kỳ
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Phân bổ tài nguyên và tính năng cho Doanh nghiệp.</p>
                  </div>
                  <button type="button" onClick={() => setCurrentStep(1)} className="text-sm font-medium text-slate-500 hover:text-slate-900">
                    Quay lại
                  </button>
                </div>

                <div className="space-y-4">
                  <label className={labelClass}>Chu kỳ thanh toán</label>
                  <div className="flex bg-slate-100 p-1 rounded-xl w-full max-w-sm">
                    <button type="button" onClick={() => form.setValue("billingCycle", "MONTHLY")} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${form.watch("billingCycle") === "MONTHLY" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                      Hàng Tháng
                    </button>
                    <button type="button" onClick={() => form.setValue("billingCycle", "YEARLY")} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${form.watch("billingCycle") === "YEARLY" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                      Hàng Năm (-20%)
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
                  {plans.map((plan) => {
                    const isSelected = form.watch("planId") === plan.id;
                    const price = form.watch("billingCycle") === "YEARLY" ? plan.priceYearlyVnd : plan.priceMonthlyVnd;
                    return (
                      <div 
                        key={plan.id} 
                        onClick={() => form.setValue("planId", plan.id, { shouldValidate: true })}
                        className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${
                          isSelected ? "border-blue-600 bg-blue-50/30 shadow-lg shadow-blue-500/10" : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-bold text-slate-900 text-lg">{plan.name}</h4>
                          {isSelected && <CheckCircle2 className="h-5 w-5 text-blue-600" />}
                        </div>
                        <div className="text-2xl font-bold text-slate-900 mb-1">
                          {price?.toLocaleString("vi-VN")} ₫
                        </div>
                        <div className="text-xs text-slate-500 font-medium">/{form.watch("billingCycle") === "YEARLY" ? "năm" : "tháng"}</div>
                      </div>
                    );
                  })}
                </div>
                {form.formState.errors.planId && <p className="text-sm text-red-600 font-medium">{form.formState.errors.planId.message}</p>}

                <div className="mt-8 flex justify-end">
                  <button type="button" onClick={handleNext} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-md">
                    Tiếp theo: Hình thức Chốt Sale <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: CLOSING METHOD */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                      Hình thức Chốt Sale
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Chọn cấp Hóa đơn nhanh hoặc tạo Hợp đồng E-Contract B2B.</p>
                  </div>
                  <button type="button" onClick={() => setCurrentStep(2)} className="text-sm font-medium text-slate-500 hover:text-slate-900">
                    Quay lại
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className={`flex gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${form.watch("closingMethod") === "INVOICE" ? "border-amber-500 bg-amber-50/50" : "border-slate-200 hover:bg-slate-50"}`}>
                    <input type="radio" value="INVOICE" {...form.register("closingMethod")} className="mt-1 w-4 h-4 text-amber-600" />
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2"><ReceiptText className="h-4 w-4 text-amber-600"/> Chỉ xuất Hóa đơn</div>
                      <p className="text-xs text-slate-600 mt-1">Nhanh chóng, phù hợp khách lẻ mua gói trải nghiệm không cần hợp đồng rườm rà.</p>
                    </div>
                  </label>

                  <label className={`flex gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${form.watch("closingMethod") === "CONTRACT" ? "border-indigo-600 bg-indigo-50/50" : "border-slate-200 hover:bg-slate-50"}`}>
                    <input type="radio" value="CONTRACT" {...form.register("closingMethod")} className="mt-1 w-4 h-4 text-indigo-600" />
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2"><FileSignature className="h-4 w-4 text-indigo-600"/> Hợp đồng E-Contract</div>
                      <p className="text-xs text-slate-600 mt-1">Tạo Hợp đồng B2B chuẩn pháp lý. Sinh Hóa đơn tự động sau khi khách ký số.</p>
                    </div>
                  </label>
                </div>

                <div className="grid sm:grid-cols-2 gap-6 bg-slate-50 rounded-2xl p-5 border border-slate-200">
                  <div className="sm:col-span-2">
                    <h3 className="font-bold text-slate-900 text-sm mb-4">Thông tin Xuất Hóa Đơn / Pháp lý (Bên B)</h3>
                  </div>

                  <div>
                    <label className={labelClass}>Mã số thuế <span className="text-red-500">*</span></label>
                    <input {...form.register("taxCode")} className={inputClass} placeholder="VD: 0101248141" />
                    {form.formState.errors.taxCode && <p className="mt-1 text-xs text-red-600">{form.formState.errors.taxCode.message}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>Số điện thoại</label>
                    <input {...form.register("phone")} className={inputClass} placeholder="SĐT liên hệ" />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Địa chỉ trụ sở chính <span className="text-red-500">*</span></label>
                    <input {...form.register("address")} className={inputClass} placeholder="Địa chỉ đăng ký kinh doanh..." />
                    {form.formState.errors.address && <p className="mt-1 text-xs text-red-600">{form.formState.errors.address.message}</p>}
                  </div>

                  {form.watch("closingMethod") === "CONTRACT" && (
                    <div className="sm:col-span-2 animate-in fade-in slide-in-from-top-2">
                      <label className={labelClass}>Người đại diện pháp luật (Ký hợp đồng)</label>
                      <input {...form.register("representative")} className={inputClass} placeholder="VD: Ông Nguyễn Văn A - Tổng Giám Đốc" />
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-70 disabled:hover:scale-100"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="h-5 w-5 animate-spin" /> Đang xử lý tự động toàn bộ quy trình...</>
                    ) : (
                      <><Sparkles className="h-5 w-5" /> Hoàn Tất Onboarding & Chốt Sale</>
                    )}
                  </button>
                  <p className="text-center text-xs text-slate-500 mt-3">Hệ thống sẽ tự động cấp Database, tạo tài khoản và sinh Chứng từ tương ứng.</p>
                </div>
              </div>
            )}

          </form>
        </section>
      </div>
    </main>
  );
}

export function B2bDealWizardPage() {
  return (
    <MasterDashboardProvider>
      <B2bDealWizardPageContent />
    </MasterDashboardProvider>
  );
}
