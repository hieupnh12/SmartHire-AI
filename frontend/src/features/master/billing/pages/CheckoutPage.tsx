import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  BrainCircuit,
  Building2,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  QrCode,
  FileText,
  CreditCard,
  Clock,
  Printer,
  ExternalLink,
  Wallet,
  Server,
  Users,
  Cpu,
  PackageCheck,
} from "lucide-react";
import { checkoutApi, PublicSubscriptionPlan, CheckoutResponseData } from "@/api/master/checkoutApi";
import { DEFAULT_BANK_CONFIG } from "@/config/paymentConfig";

export function CheckoutPage() {
  const { planCode } = useParams<{ planCode: string }>();

  // Wizard Step: 1 = Đặt hàng, 2 = Thanh toán, 3 = Kích hoạt
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [plans, setPlans] = useState<PublicSubscriptionPlan[]>([]);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>(
    (planCode || "PROFESSIONAL").toUpperCase()
  );
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("YEARLY");

  // Step 1 Form States
  const [workspaceName, setWorkspaceName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [subdomainStatus, setSubdomainStatus] = useState<"IDLE" | "CHECKING" | "AVAILABLE" | "TAKEN">("IDLE");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");

  // Invoice & VAT info
  const [needVatInvoice, setNeedVatInvoice] = useState(false);
  const [companyLegalName, setCompanyLegalName] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Selected payment method on Step 1
  const [selectedPaymentType, setSelectedPaymentType] = useState<
    "TRANSFER" | "ATM" | "INTERNATIONAL" | "E_WALLET"
  >("TRANSFER");

  // Step 2 & 3: Order Result from Backend
  const [orderResult, setOrderResult] = useState<CheckoutResponseData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"VIETQR" | "ATM_CARD" | "E_WALLET">("VIETQR");

  // Countdown timer for Step 2 (15 minutes = 900 seconds)
  const [countdown, setCountdown] = useState<number>(15 * 60);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // VNPay state
  const [vnpayLoading, setVnpayLoading] = useState(false);
  const selectedBankCode = "VNBANK";

  // Fetch public plans
  useEffect(() => {
    checkoutApi.getPublicPlans()
      .then((data) => {
        if (data && data.length > 0) {
          setPlans(data);
          const match = data.find((p) => p.code.toUpperCase() === (planCode || "").toUpperCase());
          if (match) setSelectedPlanCode(match.code.toUpperCase());
        }
      })
      .catch((err) => {
        console.warn("Could not fetch dynamic plans, using defaults", err);
      });
  }, [planCode]);

  // Countdown effect during Step 2
  useEffect(() => {
    if (currentStep !== 2 || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [currentStep, countdown]);

  const defaultFallbackPlans: PublicSubscriptionPlan[] = [
    {
      id: 1,
      code: "STARTER",
      name: "Gói Khởi Đầu (Starter)",
      priceMonthly: 49,
      priceYearly: 490,
      priceMonthlyVnd: 1200000,
      priceYearlyVnd: 12000000,
      maxJobs: 5,
      maxCvParses: 200,
      maxAiInterviewHours: 5,
      status: "ACTIVE",
    },
    {
      id: 2,
      code: "PROFESSIONAL",
      name: "Gói Chuyên Nghiệp (Professional)",
      priceMonthly: 149,
      priceYearly: 1490,
      priceMonthlyVnd: 3600000,
      priceYearlyVnd: 36000000,
      maxJobs: 25,
      maxCvParses: 2500,
      maxAiInterviewHours: 30,
      status: "ACTIVE",
    },
    {
      id: 3,
      code: "ENTERPRISE",
      name: "Gói Doanh Nghiệp (Enterprise)",
      priceMonthly: 399,
      priceYearly: 3990,
      priceMonthlyVnd: 9900000,
      priceYearlyVnd: 99000000,
      maxJobs: 100,
      maxCvParses: 15000,
      maxAiInterviewHours: 150,
      status: "ACTIVE",
    },
  ];

  const currentPlan = useMemo(() => {
    const pool = plans.length > 0 ? plans : defaultFallbackPlans;
    return pool.find((p) => p.code.toUpperCase() === selectedPlanCode) || pool[1];
  }, [plans, selectedPlanCode]);

  const currentAmountVnd = useMemo(() => {
    if (!currentPlan) return 0;
    return billingCycle === "YEARLY"
      ? currentPlan.priceYearlyVnd || 36000000
      : currentPlan.priceMonthlyVnd || 3600000;
  }, [currentPlan, billingCycle]);

  // Realtime Subdomain Check
  const handleCheckSubdomain = async () => {
    const cleanSub = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!cleanSub || cleanSub.length < 3) {
      alert("Subdomain phải có ít nhất 3 ký tự (chữ thường, số, gạch ngang).");
      return;
    }
    setSubdomainStatus("CHECKING");
    try {
      const exists = await checkoutApi.checkSubdomain(cleanSub);
      setSubdomainStatus(exists ? "TAKEN" : "AVAILABLE");
    } catch {
      setSubdomainStatus("AVAILABLE");
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const secs = (totalSeconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  // Step 1: Submit to generate invoice & order
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanSub = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!cleanSub || cleanSub.length < 2) {
      setErrorMsg("Vui lòng nhập Subdomain hợp lệ (ví dụ: mycompany).");
      return;
    }
    if (!workspaceName.trim()) {
      setErrorMsg("Vui lòng nhập Tên Không gian làm việc.");
      return;
    }
    if (!adminFullName.trim() || !adminEmail.trim() || !adminPhone.trim()) {
      setErrorMsg("Vui lòng điền đầy đủ Họ tên, Email và Số điện thoại quản trị viên.");
      return;
    }

    setLoading(true);
    try {
      const response = await checkoutApi.submitCheckout({
        planCode: currentPlan.code,
        billingCycle,
        workspaceName: workspaceName.trim(),
        subdomain: cleanSub,
        adminFullName: adminFullName.trim(),
        adminEmail: adminEmail.trim(),
        adminPhone: adminPhone.trim(),
        taxCode: needVatInvoice ? taxCode.trim() : undefined,
        companyLegalName: needVatInvoice ? companyLegalName.trim() : undefined,
        billingAddress: needVatInvoice ? billingAddress.trim() : undefined,
        notes: notes.trim() || undefined,
      });

      setOrderResult(response);
      setCountdown(15 * 60); // reset 15 minutes timer
      if (selectedPaymentType === "ATM") {
        setPaymentMethod("ATM_CARD");
      } else {
        setPaymentMethod("VIETQR");
      }
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      const msg = err.response?.data?.message || "Đã xảy ra lỗi khi tạo đơn hàng. Vui lòng thử lại.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle VNPay Domestic ATM payment redirect
  const handlePayWithVnPay = async () => {
    if (!orderResult) return;
    setVnpayLoading(true);
    setErrorMsg(null);
    try {
      const res = await checkoutApi.createVnPayUrl({
        invoiceId: orderResult.invoiceId,
        bankCode: selectedBankCode || "VNBANK",
      });
      if (res && res.paymentUrl) {
        window.location.href = res.paymentUrl;
      } else {
        setErrorMsg("Không nhận được đường dẫn thanh toán từ cổng VNPay.");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Không thể kết nối tới cổng thanh toán VNPay. Vui lòng thử lại.";
      setErrorMsg(msg);
    } finally {
      setVnpayLoading(false);
    }
  };

  // Step 2: Confirm transfer completed -> Move to Step 3
  const handleConfirmPaid = () => {
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-blue-600/20 group-hover:scale-105 transition-transform">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              SmartHire<span className="text-blue-600">.AI</span>
            </span>
          </Link>


        </div>
      </header>

      {/* 3-STEP PROGRESS WIZARD STEPPER */}
      <div className="bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-3xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex items-center justify-between text-xs sm:text-sm font-semibold select-none">
            {/* Step 1 */}
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 1
                    ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm"
                    : "bg-emerald-600 text-white"
                }`}
              >
                {currentStep > 1 ? <Check className="w-4 h-4 stroke-[3]" /> : "1"}
              </div>
              <span
                className={
                  currentStep === 1
                    ? "text-blue-600 font-bold"
                    : currentStep > 1
                    ? "text-slate-800"
                    : "text-slate-400"
                }
              >
                Đặt hàng
              </span>
            </div>

            {/* Connector 1-2 */}
            <div
              className={`flex-1 mx-3 sm:mx-6 h-[2px] rounded transition-colors ${
                currentStep >= 2 ? "bg-emerald-500" : "bg-slate-200"
              }`}
            />

            {/* Step 2 */}
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 2
                    ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm"
                    : currentStep > 2
                    ? "bg-emerald-600 text-white"
                    : "border-2 border-slate-300 text-slate-400 bg-white"
                }`}
              >
                {currentStep > 2 ? <Check className="w-4 h-4 stroke-[3]" /> : "2"}
              </div>
              <span
                className={
                  currentStep === 2
                    ? "text-blue-600 font-bold"
                    : currentStep > 2
                    ? "text-slate-800"
                    : "text-slate-400"
                }
              >
                Thanh toán
              </span>
            </div>

            {/* Connector 2-3 */}
            <div
              className={`flex-1 mx-3 sm:mx-6 h-[2px] rounded transition-colors ${
                currentStep >= 3 ? "bg-emerald-500" : "bg-slate-200"
              }`}
            />

            {/* Step 3 */}
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 3
                    ? "bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-sm"
                    : "border-2 border-slate-300 text-slate-400 bg-white"
                }`}
              >
                3
              </div>
              <span
                className={
                  currentStep === 3
                    ? "text-emerald-700 font-bold"
                    : "text-slate-400"
                }
              >
                Kích hoạt
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 shadow-2xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* BƯỚC 1: THÔNG TIN ĐẶT HÀNG                               */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <Link
                to="/pricing"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors mb-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại Bảng giá</span>
              </Link>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Thông tin đặt hàng
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Khai báo thông tin gói mua, đơn vị sử dụng và lựa chọn phương thức thanh toán.
              </p>
            </div>

            <form onSubmit={handleProceedToPayment} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Gói hàng, Đơn vị sử dụng, Xuất hóa đơn (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. GÓI HÀNG (Thông tin gói mua) */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <PackageCheck className="w-5 h-5 text-blue-600" />
                      <h2 className="text-base font-bold text-slate-900">Gói Hàng & Dịch Vụ Đã Chọn</h2>
                    </div>
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      {currentPlan.name}
                    </span>
                  </div>

                  {/* Plan Switcher */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">Chọn Gói Cước</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["STARTER", "PROFESSIONAL", "ENTERPRISE"].map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => setSelectedPlanCode(code)}
                          className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all truncate text-center ${
                            selectedPlanCode === code
                              ? "bg-blue-50 border-blue-600 text-blue-700 shadow-2xs"
                              : "border-slate-200 hover:bg-slate-50 text-slate-600"
                          }`}
                        >
                          {code === "STARTER" ? "Starter" : code === "PROFESSIONAL" ? "Professional" : "Enterprise"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Billing Cycle Toggle */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Chu Kỳ Thanh Toán</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/80 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setBillingCycle("MONTHLY")}
                        className={`py-2 text-xs font-bold rounded-lg transition-all ${
                          billingCycle === "MONTHLY"
                            ? "bg-white text-slate-900 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Hàng Tháng
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle("YEARLY")}
                        className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                          billingCycle === "YEARLY"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <span>Hàng Năm</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 font-extrabold">
                          -17%
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Resource Quota Specs */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{currentPlan.name}</span>
                      <span className="text-blue-600">
                        {billingCycle === "YEARLY" ? "12 tháng" : "1 tháng"}
                      </span>
                    </div>
                    <div className="text-slate-500 space-y-1.5 pt-2 border-t border-slate-200/60">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400" /> Vị trí tuyển dụng:</span>
                        <span className="font-semibold text-slate-700">{currentPlan.maxJobs} vị trí</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-slate-400" /> Sàng lọc CV bằng AI:</span>
                        <span className="font-semibold text-slate-700">{currentPlan.maxCvParses.toLocaleString()} CVs/tháng</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-slate-400" /> Phỏng vấn giọng nói AI:</span>
                        <span className="font-semibold text-slate-700">{currentPlan.maxAiInterviewHours || 30} giờ</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><Server className="w-3.5 h-3.5 text-slate-400" /> Cơ sở dữ liệu:</span>
                        <span className="font-semibold text-emerald-600">MySQL độc lập (Separate DB)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. THÔNG TIN ĐƠN VỊ SỬ DỤNG */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <h2 className="text-base font-bold text-slate-900">Thông Tin Đơn Vị Sử Dụng</h2>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Tên Doanh Nghiệp / Tổ Chức <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Công Ty Cổ Phần Công Nghệ Acme"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 transition-all font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Địa Chỉ Subdomain Độc Lập <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          required
                          placeholder="acmecorp"
                          value={subdomain}
                          onChange={(e) => {
                            const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                            setSubdomain(val);
                            setSubdomainStatus("IDLE");
                          }}
                          className="w-full px-3.5 py-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 font-mono font-medium text-slate-800"
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-500 select-none">
                        .smarthire.top
                      </span>
                      <button
                        type="button"
                        onClick={handleCheckSubdomain}
                        disabled={!subdomain || subdomainStatus === "CHECKING"}
                        className="px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0 disabled:opacity-50"
                      >
                        {subdomainStatus === "CHECKING" ? "Đang check..." : "Kiểm tra"}
                      </button>
                    </div>

                    {subdomainStatus === "AVAILABLE" && (
                      <p className="text-[11px] font-semibold text-emerald-600 mt-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Subdomain khả dụng: https://{subdomain}.smarthire.top</span>
                      </p>
                    )}
                    {subdomainStatus === "TAKEN" && (
                      <p className="text-[11px] font-semibold text-rose-600 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Subdomain này đã có đơn vị sử dụng. Vui lòng chọn tên khác.</span>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Họ và Tên Admin Quản Trị <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Nguyễn Văn A"
                        value={adminFullName}
                        onChange={(e) => setAdminFullName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 font-medium text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Số Điện Thoại Liên Hệ <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="0912 345 678"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 font-medium text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Email Nhận Link Kích Hoạt & Mật Khẩu <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="admin@acmecorp.vn"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 font-medium text-slate-800"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      💡 Mật khẩu đăng nhập sẽ được gửi tới email này sau khi hoàn tất đối soát thanh toán.
                    </p>
                  </div>
                </div>

                {/* 3. THÔNG TIN XUẤT HÓA ĐƠN VAT */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-amber-600" />
                      <h2 className="text-base font-bold text-slate-900">Thông Tin Xuất Hóa Đơn VAT (Tùy chọn)</h2>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={needVatInvoice}
                        onChange={(e) => setNeedVatInvoice(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {needVatInvoice && (
                    <div className="space-y-4 pt-1 animate-fade-in">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Tên Pháp Nhân Doanh Nghiệp
                        </label>
                        <input
                          type="text"
                          placeholder="CÔNG TY CỔ PHẦN CÔNG NGHỆ ACME VIỆT NAM"
                          value={companyLegalName}
                          onChange={(e) => setCompanyLegalName(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 font-medium text-slate-800"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Mã Số Thuế (MST)
                          </label>
                          <input
                            type="text"
                            placeholder="0101234567"
                            value={taxCode}
                            onChange={(e) => setTaxCode(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 font-medium text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Địa Chỉ Trụ Sở ĐKKD
                          </label>
                          <input
                            type="text"
                            placeholder="Số 10 Phạm Hùng, Cầu Giấy, Hà Nội"
                            value={billingAddress}
                            onChange={(e) => setBillingAddress(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 font-medium text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Ghi chú đơn hàng (nếu có)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Lưu ý khi xuất hóa đơn hoặc triển khai..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 font-medium text-slate-800 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Phương thức thanh toán & Tóm tắt chi phí (5 cols) */}
              <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
                {/* 1. PHƯƠNG THỨC THANH TOÁN (khớp 100% hình ảnh người dùng) */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                  <h2 className="text-base font-bold text-slate-900">Phương thức thanh toán</h2>

                  <div className="space-y-2.5 pt-1">
                    {/* Chuyển khoản */}
                    <div
                      onClick={() => {
                        setSelectedPaymentType("TRANSFER");
                        setPaymentMethod("VIETQR");
                      }}
                      className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        selectedPaymentType === "TRANSFER"
                          ? "border-blue-600 bg-blue-50/40 shadow-2xs"
                          : "border-slate-200 hover:bg-slate-50/70"
                      }`}
                    >
                      <div className="relative flex items-center justify-center">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedPaymentType === "TRANSFER" ? "border-blue-600 bg-white" : "border-slate-300"
                          }`}
                        >
                          {selectedPaymentType === "TRANSFER" && (
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                          )}
                        </div>
                      </div>

                      <div className="w-6 h-6 rounded-full border-2 border-amber-500 text-amber-500 flex items-center justify-center font-bold text-xs select-none">
                        $
                      </div>

                      <span
                        className={`text-sm ${
                          selectedPaymentType === "TRANSFER"
                            ? "text-blue-600 font-semibold"
                            : "text-slate-800 font-medium"
                        }`}
                      >
                        Chuyển khoản
                      </span>
                    </div>

                    {/* Thẻ ATM nội địa */}
                    <div
                      onClick={() => {
                        setSelectedPaymentType("ATM");
                        setPaymentMethod("ATM_CARD");
                      }}
                      className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        selectedPaymentType === "ATM"
                          ? "border-blue-600 bg-blue-50/40 shadow-2xs"
                          : "border-slate-200 hover:bg-slate-50/70"
                      }`}
                    >
                      <div className="relative flex items-center justify-center">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedPaymentType === "ATM" ? "border-blue-600 bg-white" : "border-slate-300"
                          }`}
                        >
                          {selectedPaymentType === "ATM" && (
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                          )}
                        </div>
                      </div>

                      <CreditCard className="w-5 h-5 text-slate-600" />

                      <span
                        className={`text-sm ${
                          selectedPaymentType === "ATM"
                            ? "text-blue-600 font-semibold"
                            : "text-slate-800 font-medium"
                        }`}
                      >
                        Thẻ ATM nội địa
                      </span>
                    </div>

                    {/* Thẻ quốc tế */}
                    <div
                      onClick={() => {
                        setSelectedPaymentType("INTERNATIONAL");
                        setPaymentMethod("ATM_CARD");
                      }}
                      className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        selectedPaymentType === "INTERNATIONAL"
                          ? "border-blue-600 bg-blue-50/40 shadow-2xs"
                          : "border-slate-200 hover:bg-slate-50/70"
                      }`}
                    >
                      <div className="relative flex items-center justify-center">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedPaymentType === "INTERNATIONAL"
                              ? "border-blue-600 bg-white"
                              : "border-slate-300"
                          }`}
                        >
                          {selectedPaymentType === "INTERNATIONAL" && (
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                          )}
                        </div>
                      </div>

                      <CreditCard className="w-5 h-5 text-slate-600" />

                      <span
                        className={`text-sm ${
                          selectedPaymentType === "INTERNATIONAL"
                            ? "text-blue-600 font-semibold"
                            : "text-slate-800 font-medium"
                        }`}
                      >
                        Thẻ quốc tế
                      </span>
                    </div>

                    {/* Ví điện tử */}
                    <div
                      onClick={() => {
                        setSelectedPaymentType("E_WALLET");
                        setPaymentMethod("E_WALLET");
                      }}
                      className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        selectedPaymentType === "E_WALLET"
                          ? "border-blue-600 bg-blue-50/40 shadow-2xs"
                          : "border-slate-200 hover:bg-slate-50/70"
                      }`}
                    >
                      <div className="relative flex items-center justify-center">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedPaymentType === "E_WALLET" ? "border-blue-600 bg-white" : "border-slate-300"
                          }`}
                        >
                          {selectedPaymentType === "E_WALLET" && (
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                          )}
                        </div>
                      </div>

                      <Wallet className="w-5 h-5 text-slate-600" />

                      <span
                        className={`text-sm ${
                          selectedPaymentType === "E_WALLET"
                            ? "text-blue-600 font-semibold"
                            : "text-slate-800 font-medium"
                        }`}
                      >
                        Ví điện tử
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed">
                    {selectedPaymentType === "TRANSFER" && (
                      <span>💡 Hệ thống tự động tạo mã VietQR Napas 24/7 có sẵn số tiền và nội dung chuyển khoản, kích hoạt tức thì.</span>
                    )}
                    {selectedPaymentType === "ATM" && (
                      <span>💡 Hỗ trợ thanh toán qua thẻ ATM nội địa có đăng ký Internet Banking của hơn 40 ngân hàng tại Việt Nam.</span>
                    )}
                    {selectedPaymentType === "INTERNATIONAL" && (
                      <span>💡 Hỗ trợ thanh toán qua thẻ tín dụng & ghi nợ quốc tế Visa, Mastercard, JCB bảo mật chuẩn 3D-Secure.</span>
                    )}
                    {selectedPaymentType === "E_WALLET" && (
                      <span>💡 Quét mã thanh toán qua các ví điện tử phổ biến (VNPAY-QR, MoMo, ZaloPay, Viettel Money).</span>
                    )}
                  </div>
                </div>

                {/* 2. TÓM TẮT ĐƠN HÀNG & NÚT TIẾP TỤC */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h2 className="text-base font-bold text-slate-900">Chi Tiết Đơn Hàng</h2>
                    <span className="text-xs font-semibold text-slate-500">
                      {billingCycle === "YEARLY" ? "Gói 12 Tháng" : "Gói 1 Tháng"}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Gói dịch vụ:</span>
                      <span className="font-semibold text-slate-800">{currentPlan.name}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Chu kỳ thanh toán:</span>
                      <span className="font-semibold text-slate-800">
                        {billingCycle === "YEARLY" ? "Hàng năm (-17%)" : "Hàng tháng"}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Tạm tính:</span>
                      <span className="font-medium text-slate-700">
                        {currentAmountVnd.toLocaleString("vi-VN")} đ
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Thuế GTGT (VAT):</span>
                      <span className="font-medium text-emerald-600">Đã bao gồm</span>
                    </div>
                    <div className="flex justify-between items-baseline text-base font-extrabold text-slate-900 pt-3 border-t border-slate-200/70">
                      <span>Tổng thanh toán:</span>
                      <span className="text-blue-600 text-xl font-black">
                        {currentAmountVnd.toLocaleString("vi-VN")} <span className="text-xs font-bold text-slate-600">VNĐ</span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang khởi tạo đơn hàng...</span>
                      </>
                    ) : (
                      <>
                        <span>Tiến Hành Thanh Toán</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>


                </div>
              </div>
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* BƯỚC 2: THANH TOÁN (CỔNG THANH TOÁN & VIETQR CHÍNH THỨC) */}
        {/* ======================================================== */}
        {currentStep === 2 && orderResult && (
          <div className="animate-fade-in space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  Bước 2: Cổng Thanh Toán
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                  Xác Nhận & Tiến Hành Thanh Toán
                </h1>
                <p className="text-xs text-slate-500">
                  Đơn hàng của bạn đã được ghi nhận. Vui lòng hoàn tất thanh toán để giữ chỗ Subdomain.
                </p>
              </div>

              {/* Countdown Timer Badge */}
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 shrink-0">
                <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-amber-700 block">Thời gian giữ đơn</span>
                  <span className="font-mono text-base font-extrabold text-amber-900">
                    {formatCountdown(countdown)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Payment Methods & VietQR (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* Method Tabs */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-5">
                  <h3 className="text-sm font-bold text-slate-900">Phương Thức Thanh Toán</h3>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("VIETQR")}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                        paymentMethod === "VIETQR"
                          ? "bg-blue-50/70 border-blue-600 text-blue-700 shadow-2xs"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <QrCode className="w-5 h-5" />
                      <span className="text-xs font-bold">Chuyển Khoản VietQR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("ATM_CARD")}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all relative ${
                        paymentMethod === "ATM_CARD"
                          ? "bg-blue-50/70 border-blue-600 text-blue-700 shadow-2xs font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-blue-600" />
                      <span className="text-xs">Thẻ ATM Nội Địa</span>
                      <span className="absolute top-1 right-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                        VNPay
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("E_WALLET")}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all relative ${
                        paymentMethod === "E_WALLET"
                          ? "bg-blue-50/70 border-blue-600 text-blue-700"
                          : "border-slate-200 text-slate-500 hover:bg-slate-50 opacity-80"
                      }`}
                    >
                      <Wallet className="w-5 h-5" />
                      <span className="text-xs font-semibold">Ví Điện Tử</span>
                      <span className="absolute top-1 right-1 text-[9px] font-bold px-1 rounded bg-amber-100 text-amber-800">
                        Sắp có
                      </span>
                    </button>
                  </div>

                  {/* Payment Details Container */}
                  {paymentMethod === "VIETQR" ? (
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/70 to-indigo-50/60 border border-blue-200 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-blue-200/70">
                        <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                          <QrCode className="w-4 h-4 text-blue-700" />
                          <span>Mã QR Chuyển Khoản Tự Động Điền Nội Dung</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white">
                          Napas 247
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                        <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-blue-200 shadow-sm">
                          <img
                            src={orderResult.qrUrl}
                            alt="VietQR Chuyển Khoản"
                            className="w-44 h-44 object-contain"
                          />
                          <span className="text-[11px] font-semibold text-slate-500 mt-2">
                            Mở App Ngân hàng quét QR
                          </span>
                        </div>

                        <div className="sm:col-span-7 space-y-3 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Ngân hàng thụ hưởng</span>
                            <span className="font-bold text-slate-800 text-xs">
                              {DEFAULT_BANK_CONFIG.bankName}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 block">Số tài khoản</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-extrabold text-slate-900 text-sm">
                                {DEFAULT_BANK_CONFIG.accountNumber}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(DEFAULT_BANK_CONFIG.accountNumber, "acc")}
                                className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 text-[11px] font-bold"
                              >
                                {copiedField === "acc" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>Copy</span>
                              </button>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 block">Chủ tài khoản</span>
                            <span className="font-semibold text-slate-800 text-xs truncate block">
                              {DEFAULT_BANK_CONFIG.accountName}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 block">Số tiền cần chuyển</span>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-blue-600 text-base">
                                {orderResult.amountVnd.toLocaleString("vi-VN")} VNĐ
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(orderResult.amountVnd.toString(), "amount")}
                                className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 text-[11px] font-bold"
                              >
                                {copiedField === "amount" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>Copy</span>
                              </button>
                            </div>
                          </div>

                          {/* Transfer Syntax Box */}
                          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                            <span className="text-[10px] font-bold text-amber-800 block mb-0.5">
                              Nội dung chuyển khoản (bắt buộc chính xác):
                            </span>
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-extrabold text-amber-950 text-sm">
                                {orderResult.transferSyntax}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(orderResult.transferSyntax, "syntax")}
                                className="text-amber-700 hover:text-amber-900 font-bold text-xs inline-flex items-center gap-1"
                              >
                                {copiedField === "syntax" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>Copy cú pháp</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : paymentMethod === "ATM_CARD" ? (
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50/70 via-indigo-50/50 to-slate-50 border border-blue-200 space-y-5">
                      {/* VNPay Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-blue-200/70">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-black text-xs flex items-center justify-center tracking-tighter shadow-sm">
                            VNPAY
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">Cổng Thanh Toán Trực Tuyến VNPay</span>
                            <span className="text-[10px] text-slate-500 block">Thẻ ATM & Tài khoản ngân hàng nội địa</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Chuẩn PCI-DSS</span>
                        </span>
                      </div>

                      <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 text-sm text-blue-900 text-center shadow-inner">
                        <p>Bạn sẽ được chuyển hướng an toàn sang cổng thanh toán <strong>VNPAY</strong> để chọn ngân hàng và hoàn tất giao dịch.</p>
                      </div>

                      {/* Sandbox Testing Guide Card */}
                      <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200/80 space-y-2 text-xs text-amber-950">
                        <div className="flex items-center justify-between font-bold text-amber-900 border-b border-amber-200/60 pb-1.5">
                          <span className="flex items-center gap-1.5">
                            <span>🧪</span> Thông Tin Thẻ Test Sandbox (Ngân hàng NCB)
                          </span>
                          <span className="text-[10px] font-semibold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded">
                            Môi trường Test
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                          <div>
                            <span className="text-amber-700 block text-[10px]">Số thẻ test:</span>
                            <div className="flex items-center gap-1">
                              <span className="font-mono font-bold">9704198526191432198</span>
                              <button
                                type="button"
                                onClick={() => handleCopy("9704198526191432198", "card")}
                                className="text-amber-800 hover:text-amber-950"
                              >
                                {copiedField === "card" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <span className="text-amber-700 block text-[10px]">Tên chủ thẻ:</span>
                            <span className="font-bold">NGUYEN VAN A</span>
                          </div>
                          <div>
                            <span className="text-amber-700 block text-[10px]">Ngày phát hành:</span>
                            <span className="font-mono font-bold">07/15</span>
                          </div>
                          <div>
                            <span className="text-amber-700 block text-[10px]">Mã OTP:</span>
                            <span className="font-mono font-bold text-emerald-700">123456</span>
                          </div>
                        </div>
                      </div>

                      {/* Action button */}
                      <div className="space-y-2 pt-2">
                        <button
                          type="button"
                          disabled={vnpayLoading}
                          onClick={handlePayWithVnPay}
                          className="w-full py-4 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-sm shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          {vnpayLoading ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Đang chuyển hướng tới cổng thanh toán VNPay...</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-5 h-5" />
                              <span>Thanh Toán Thẻ ATM Qua VNPay ({orderResult.amountVnd.toLocaleString("vi-VN")} đ)</span>
                              <ExternalLink className="w-4 h-4 ml-1" />
                            </>
                          )}
                        </button>
                        <p className="text-center text-[11px] text-slate-400">
                          🔒 Quý khách sẽ được chuyển sang cổng bảo mật VNPay để xác thực thông tin thẻ và OTP ngân hàng.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 space-y-2">
                      <Wallet className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="font-semibold text-slate-700">Cổng thanh toán Ví điện tử đang trong giai đoạn kết nối sandbox.</p>
                      <p>Quý khách vui lòng chọn phương thức <strong>Thẻ ATM nội địa (VNPay)</strong> hoặc <strong>Chuyển khoản VietQR</strong>.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Summary & Confirm Paid (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900">Chi Tiết Đơn Hàng</h3>
                    <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      #{orderResult.invoiceNumber}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Gói phần mềm:</span>
                      <span className="font-bold text-slate-900">{orderResult.planName}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Chu kỳ thanh toán:</span>
                      <span className="font-semibold text-blue-600">
                        {orderResult.billingCycle === "YEARLY" ? "12 tháng (1 năm)" : "1 tháng"}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Subdomain đăng ký:</span>
                      <span className="font-mono font-bold text-slate-800">{orderResult.subdomain}.smarthire.top</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Phương thức:</span>
                      <span className="font-semibold text-slate-800">
                        {paymentMethod === "ATM_CARD" ? "Cổng VNPay (Thẻ ATM)" : "Chuyển khoản VietQR"}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Trạng thái đơn:</span>
                      <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <Clock className="w-3 h-3" />
                        <span>Chờ Thanh Toán</span>
                      </span>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                      <span className="font-bold text-slate-700 text-sm">Tổng cần thanh toán:</span>
                      <span className="font-extrabold text-blue-600 text-lg">
                        {orderResult.amountVnd.toLocaleString("vi-VN")} VNĐ
                      </span>
                    </div>
                  </div>

                  {/* Confirm CTA */}
                  <div className="space-y-3 pt-2">
                    {paymentMethod === "ATM_CARD" ? (
                      <button
                        type="button"
                        disabled={vnpayLoading}
                        onClick={handlePayWithVnPay}
                        className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {vnpayLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Đang kết nối VNPay...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            <span>Thanh Toán Thẻ ATM Qua VNPay</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConfirmPaid}
                        className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Tôi Đã Hoàn Tất Chuyển Khoản</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="w-full py-2.5 px-4 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Quay lại chỉnh sửa thông tin</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 text-center">
                    Sau khi quý khách bấm xác nhận, hệ thống sẽ chuyển sang màn hình tiếp nhận và bàn giao tài nguyên.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* BƯỚC 3: KÍCH HOẠT (THÔNG BÁO, BẢN QUYỀN & TÀI NGUYÊN)    */}
        {/* ======================================================== */}
        {currentStep === 3 && orderResult && (
          <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-10 shadow-sm text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xs">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block mb-2">
                Bước 3: Tiếp Nhận & Kích Hoạt Dịch Vụ
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Giao Dịch Đã Được Ghi Nhận Thành Công!
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-xl mx-auto">
                Hệ thống SmartHire-AI đã tiếp nhận yêu cầu đăng ký không gian làm việc của quý doanh nghiệp.
              </p>

              {/* License Card / Resource Allocation */}
              <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white text-left shadow-lg space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider block">Giấy Phép Bản Quyền (License Key)</span>
                    <span className="text-lg font-mono font-bold text-amber-400">
                      SH-LIC-{orderResult.invoiceNumber.replace("INV-", "")}
                    </span>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-slate-400 block">Gói Giải Pháp</span>
                    <span className="text-sm font-bold text-white bg-blue-600 px-3 py-1 rounded-lg inline-block mt-0.5">
                      {orderResult.planName}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-slate-400 block mb-1">Vị Trí Tuyển Dụng</span>
                    <span className="text-base font-extrabold text-white">{currentPlan.maxJobs} tin</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-slate-400 block mb-1">Sàng Lọc CV Bằng AI</span>
                    <span className="text-base font-extrabold text-white">{currentPlan.maxCvParses.toLocaleString()} CVs</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-slate-400 block mb-1">Phỏng Vấn AI Giọng Nói</span>
                    <span className="text-base font-extrabold text-white">{currentPlan.maxAiInterviewHours || 30} giờ</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                    <span className="text-slate-400 block mb-1">Hạ Tầng Dữ Liệu</span>
                    <span className="text-base font-extrabold text-emerald-400">MySQL Riêng Biệt</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-t border-slate-700/80">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>Không gian làm việc: <strong className="text-blue-300 font-mono">https://{orderResult.subdomain}.smarthire.top</strong></span>
                  </div>
                  <span className="text-slate-400">Thời hạn: 12 tháng kể từ ngày duyệt</span>
                </div>
              </div>

              {/* Verification & Manual Transfer Process Notice */}
              <div className="mt-6 p-5 rounded-2xl bg-blue-50/70 border border-blue-200 text-left space-y-2 text-xs">
                <div className="flex items-center gap-2 text-blue-900 font-bold">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Quy trình kích hoạt & bàn giao hệ thống:</span>
                </div>
                <ul className="text-slate-600 space-y-1.5 pl-6 list-disc">
                  <li>
                    <strong>Đối soát giao dịch chuyển khoản:</strong> Bộ phận quản trị Master Admin sẽ đối soát ủy nhiệm chi trong vòng 1-2 giờ làm việc.
                  </li>
                  <li>
                    <strong>Tự động khởi tạo Database:</strong> Ngay khi admin xác nhận, hệ thống sẽ tự động chạy lệnh tạo Database MySQL riêng và chạy các migrations.
                  </li>
                  <li>
                    <strong>Email kích hoạt & Mật khẩu:</strong> Một email chứa thông tin tài khoản và liên kết thiết lập mật khẩu sẽ được gửi trực tiếp đến hộp thư của bạn.
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={`https://${orderResult.subdomain}.smarthire.top/login`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>Truy Cập Không Gian Làm Việc</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  <span>In / Lưu Hóa Đơn Đơn Hàng</span>
                </button>

                <Link
                  to="/"
                  className="w-full sm:w-auto px-5 py-3 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-semibold transition-colors"
                >
                  Về Trang Chủ
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default CheckoutPage;
