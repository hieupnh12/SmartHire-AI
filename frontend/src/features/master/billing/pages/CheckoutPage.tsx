import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  BrainCircuit,
  CheckCircle2,
  Copy,
  Check,
  ArrowLeft,
  ArrowLeftRight,
  Download,
  Loader2,
  AlertCircle,
  QrCode,
  CreditCard,
  Clock,
  Printer,
  ExternalLink,
  Wallet,
  MapPin,
} from "lucide-react";
import { checkoutApi, PublicSubscriptionPlan, CheckoutResponseData } from "@/api/master/checkoutApi";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
export function CheckoutPage() {
  const { planCode } = useParams<{ planCode: string }>();
  // Wizard Step: 1 = Đặt hàng, 2 = Thanh toán, 3 = Kích hoạt
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [plans, setPlans] = useState<PublicSubscriptionPlan[]>([]);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>(
    (planCode || "PROFESSIONAL").toUpperCase()
  );
  const billingCycle = "YEARLY";
  const [quantity, setQuantity] = useState<number>(1);
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
  const [, setPaymentMethod] = useState<"VIETQR" | "ATM_CARD" | "E_WALLET">("VIETQR");
  const [activePaymentTab, setActivePaymentTab] = useState<"TRANSFER" | "DOMESTIC_CARD" | "INTL_CARD" | "QR_CODE">("TRANSFER");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // VNPay state
  const [vnpayLoading, setVnpayLoading] = useState(false);
  const selectedBankCode = "VNBANK";
  // PayPal state
  const [paypalVerifying, setPaypalVerifying] = useState(false);

  // Realtime Polling for VietQR SePay payment status in Step 2 -> Auto transitions to Step 3
  useEffect(() => {
    if (currentStep !== 2 || !orderResult?.invoiceId) return;

    const pollInterval = setInterval(async () => {
      try {
        const statusRes = await checkoutApi.checkInvoiceStatus(orderResult.invoiceId);
        if (statusRes && (statusRes.status === "PAID" || statusRes.isPaid)) {
          setOrderResult((prev) => (prev ? { ...prev, status: "PAID" } : null));
          setCurrentStep(3);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } catch (err) {
        console.debug("Status polling check...", err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [currentStep, orderResult?.invoiceId]);

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
  const defaultFallbackPlans: PublicSubscriptionPlan[] = [
    {
      id: 1,
      code: "STARTER",
      name: "Gói Khởi Đầu (Starter)",
      priceYearly: 12000000,
      maxJobs: 5,
      maxCvParses: 200,
      maxAiInterviewHours: 5,
      status: "ACTIVE",
    },
    {
      id: 2,
      code: "PROFESSIONAL",
      name: "Gói Chuyên Nghiệp (Professional)",
      priceYearly: 36000000,
      maxJobs: 25,
      maxCvParses: 2500,
      maxAiInterviewHours: 30,
      status: "ACTIVE",
    },
    {
      id: 3,
      code: "ENTERPRISE",
      name: "Gói Doanh Nghiệp (Enterprise)",
      priceYearly: 99000000,
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
    const basePrice = currentPlan.priceYearly || 36000000;
    return basePrice * quantity;
  }, [currentPlan, quantity]);
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
  const handleDownloadQr = () => {
    const link = document.createElement("a");
    link.href = "/sepay_qr.png";
    link.download = `VietQR-SePay-${orderResult?.invoiceNumber || "order"}.png`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // Step 1: Submit to generate invoice & order
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanSub = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!cleanSub || cleanSub.length < 2) {
      setErrorMsg("Vui lòng nhập Subdomain hợp lệ (mycompany).");
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
        quantity: quantity,
      });
      setOrderResult(response);
      if (selectedPaymentType === "ATM") {
        setPaymentMethod("ATM_CARD");
        setActivePaymentTab("DOMESTIC_CARD");
      } else if (selectedPaymentType === "INTERNATIONAL" || selectedPaymentType === "E_WALLET") {
        setPaymentMethod("E_WALLET");
        setActivePaymentTab("INTL_CARD");
      } else {
        setPaymentMethod("VIETQR");
        setActivePaymentTab("TRANSFER");
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
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const baseDomain = isLocalhost ? "localhost:5173" : "smarthire.top";
  const protocol = isLocalhost ? "http" : "https";
  const workspaceUrl = orderResult?.subdomain
    ? `${protocol}://${orderResult.subdomain}.${baseDomain}/internal/login`
    : "#";
  return (
    <div className="min-h-screen bg-[#F0F2F4] text-slate-800 font-sans antialiased pb-24">
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
      <div className="bg-[#F0F2F4] border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-3xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex items-center justify-between text-xs sm:text-sm font-semibold select-none">
            {/* Step 1 */}
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 1
                    ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm"
                    : "border-2 border-blue-600 text-blue-600 bg-white"
                }`}
              >
                {currentStep > 1 ? <Check className="w-4 h-4 stroke-[3]" /> : "1"}
              </div>
              <span
                className={
                  currentStep === 1
                    ? "text-blue-600 font-bold"
                    : currentStep > 1
                      ? "text-slate-900 font-bold"
                      : "text-slate-400"
                }
              >
                Đặt hàng
              </span>
            </div>
            {/* Connector 1-2 */}
            <div
              className={`flex-1 mx-3 sm:mx-6 h-[2px] rounded transition-colors ${
                currentStep >= 2 ? "bg-blue-600" : "bg-slate-300"
              }`}
            />
            {/* Step 2 */}
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 2
                    ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm"
                    : currentStep > 2
                      ? "border-2 border-blue-600 text-blue-600 bg-white"
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
                      ? "text-slate-900 font-bold"
                      : "text-slate-400"
                }
              >
                Thanh toán
              </span>
            </div>
            {/* Connector 2-3 */}
            <div
              className={`flex-1 mx-3 sm:mx-6 h-[2px] rounded transition-colors ${
                currentStep >= 3 ? "bg-blue-600" : "bg-slate-300"
              }`}
            />
            {/* Step 3 */}
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 3
                    ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm"
                    : "border-2 border-slate-300 text-slate-400 bg-white"
                }`}
              >
                3
              </div>
              <span
                className={
                  currentStep === 3
                    ? "text-blue-600 font-bold"
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
            <div className="mb-5">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                Thông tin đặt hàng
              </h1>
            </div>
            <form onSubmit={handleProceedToPayment} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Gói hàng, Đơn vị sử dụng, Xuất hóa đơn (8 cols) */}
              <div className="lg:col-span-8 space-y-6">
                {/* 1. GÓI HÀNG (Thông tin gói mua) */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-900">Gói Dịch Vụ Đã Chọn</h2>
                    <Link
                      to="/pricing"
                      className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 shrink-0"
                    >
                      Đổi gói cước
                    </Link>
                  </div>

                  {/* Thông tin chi tiết xếp theo dạng dòng gọn gàng, không icon */}
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-500">Tên gói cước:</span>
                      <span className="font-bold text-slate-900 text-sm">{currentPlan.name}</span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-500">Chu kỳ thanh toán:</span>
                      <span className="font-medium text-slate-800">Hàng năm</span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-500">Đơn giá niêm yết:</span>
                      <span className="font-semibold text-slate-900">
                        {(currentPlan.priceYearly || 36000000).toLocaleString('vi-VN')} đ / năm
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-500">Vị trí tuyển dụng:</span>
                      <span className="font-semibold text-slate-900">
                        {currentPlan.maxJobs > 0 ? `${currentPlan.maxJobs} vị trí` : "Không giới hạn"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-500">Sàng lọc CV AI:</span>
                      <span className="font-semibold text-slate-900">
                        {currentPlan.maxCvParses > 0 ? `${currentPlan.maxCvParses.toLocaleString()} CVs / tháng` : "Không giới hạn"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-500">Phỏng vấn trợ lý AI:</span>
                      <span className="font-semibold text-slate-900">
                        {currentPlan.maxAiInterviewHours && currentPlan.maxAiInterviewHours > 0 ? `${currentPlan.maxAiInterviewHours} giờ` : "Không giới hạn"}
                      </span>
                    </div>
                  </div>

                  {/* Dòng Thời hạn bản quyền & Tính tiền (nhỏ gọn) */}
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                    {/* Left: Stepper nhỏ */}
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-slate-700">Thời hạn bản quyền:</span>
                      <div className="flex items-center h-7 border border-slate-200 rounded-md bg-white overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                          disabled={quantity <= 1}
                          className="w-7 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Giảm 1 năm"
                        >
                          -
                        </button>
                        <div className="px-2.5 h-full flex items-center justify-center font-bold text-xs text-slate-900 border-x border-slate-100 min-w-[55px]">
                          {quantity} Năm
                        </div>
                        <button
                          type="button"
                          onClick={() => setQuantity(q => Math.min(10, q + 1))}
                          disabled={quantity >= 10}
                          className="w-7 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Tăng 1 năm"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Right: Phép tính & Thành tiền */}
                    <div className="flex items-center gap-1.5 sm:justify-end">
                      <span className="text-slate-500 text-[11px]">
                        {quantity > 1 ? `${quantity} x ${(currentPlan.priceYearly || 36000000).toLocaleString('vi-VN')} đ =` : "Thành tiền:"}
                      </span>
                      <span className="text-base font-extrabold text-slate-900">
                        {currentAmountVnd.toLocaleString('vi-VN')}
                      </span>
                      <span className="text-xs font-bold text-slate-700">VNĐ</span>
                    </div>
                  </div>
                </div>
                {/* 2. THÔNG TIN ĐƠN VỊ SỬ DỤNG */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                  <div className="pb-3 border-b border-slate-100">
                    <h2 className="text-base font-bold text-slate-900">Thông Tin Đơn Vị Sử Dụng</h2>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Tên Doanh Nghiệp / Tổ Chức
                    </label>
                    <input
                      type="text"
                      required
                      placeholder=" Công Ty Cổ Phần Công Nghệ Acme"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      className="w-full px-4 py-3 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 transition-all font-medium text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Địa Chỉ Subdomain Độc Lập
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
                          className="w-full px-4 py-3 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 font-mono font-medium text-slate-800"
                        />
                      </div>
                      <span className="text-sm font-bold text-slate-500 select-none">
                        .smarthire.top
                      </span>
                      <button
                        type="button"
                        onClick={handleCheckSubdomain}
                        disabled={!subdomain || subdomainStatus === "CHECKING"}
                        className="px-4 py-3 text-sm font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0 disabled:opacity-50"
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
                        Họ và Tên Admin Quản Trị
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Nguyễn Văn A"
                        value={adminFullName}
                        onChange={(e) => setAdminFullName(e.target.value)}
                        className="w-full px-4 py-3 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 font-medium text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Số Điện Thoại Liên Hệ
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="0912 345 678"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        className="w-full px-4 py-3 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 font-medium text-slate-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Email Nhận Link Kích Hoạt & Mật Khẩu
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="admin@acmecorp.vn"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full px-4 py-3 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 font-medium text-slate-800"
                    />
                    <p className="text-xs text-slate-500 mt-1.5">
                      💡 Mật khẩu đăng nhập sẽ được gửi tới email này sau khi hoàn tất đối soát thanh toán.
                    </p>
                  </div>
                </div>
                {/* 3. THÔNG TIN XUẤT HÓA ĐƠN VAT */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h2 className="text-base font-bold text-slate-900">Thông Tin Xuất Hóa Đơn VAT (Tùy chọn)</h2>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={needVatInvoice}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setNeedVatInvoice(checked);
                          if (checked) {
                            if (!companyLegalName && workspaceName) setCompanyLegalName(workspaceName);
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  {needVatInvoice && (
                    <div className="space-y-4 pt-1 animate-fade-in">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">
                          Tên Pháp Nhân Doanh Nghiệp
                        </label>
                        <input
                          type="text"
                          placeholder="CÔNG TY CỔ PHẦN CÔNG NGHỆ ACME VIỆT NAM"
                          value={companyLegalName}
                          onChange={(e) => setCompanyLegalName(e.target.value)}
                          className="w-full px-4 py-3 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 font-medium text-slate-800"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5">
                            Mã Số Thuế (MST)
                          </label>
                          <input
                            type="text"
                            placeholder="0101234567"
                            value={taxCode}
                            onChange={(e) => setTaxCode(e.target.value)}
                            className="w-full px-4 py-3 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 font-medium text-slate-800"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-sm font-bold text-slate-700">
                              Địa Chỉ Trụ Sở ĐKKD
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                if ("geolocation" in navigator) {
                                  navigator.geolocation.getCurrentPosition(
                                    async (position) => {
                                      try {
                                        const { latitude, longitude } = position.coords;
                                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=vi`);
                                        const data = await res.json();
                                        if (data && data.display_name) {
                                          setBillingAddress(data.display_name);
                                        } else {
                                          setBillingAddress(`${latitude}, ${longitude}`);
                                        }
                                      } catch (error) {
                                        setBillingAddress(`${position.coords.latitude}, ${position.coords.longitude}`);
                                      }
                                    },
                                    () => {
                                      alert("Không thể lấy vị trí hiện tại. Vui lòng cấp quyền truy cập vị trí.");
                                    }
                                  );
                                } else {
                                  alert("Trình duyệt không hỗ trợ lấy vị trí.");
                                }
                              }}
                              className="text-blue-600 hover:text-blue-700 p-1 rounded-md hover:bg-blue-50 transition-colors flex items-center gap-1 text-[11px] font-semibold"
                              title="Lấy vị trí hiện tại"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              Lấy vị trí
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Số 10 Phạm Hùng, Cầu Giấy, Hà Nội"
                            value={billingAddress}
                            onChange={(e) => setBillingAddress(e.target.value)}
                            className="w-full px-4 py-3 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 font-medium text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Ghi chú đơn hàng (nếu có)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Lưu ý khi xuất hóa đơn hoặc triển khai..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-3 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 font-medium text-slate-800 resize-none"
                    />
                  </div>
                </div>
              </div>
              {/* Right Column: Phương thức thanh toán & Tóm tắt chi phí (4 cols) */}
              <div className="lg:col-span-4 space-y-6">
                {/* 1. PHƯƠNG THỨC THANH TOÁN (Cuộn bình thường) */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                  <h2 className="text-base font-bold text-slate-900">Phương thức thanh toán</h2>
                  <div className="space-y-2.5 pt-1">
                    {/* Chuyển khoản */}
                    <div
                      onClick={() => {
                        setSelectedPaymentType("TRANSFER");
                        setPaymentMethod("VIETQR");
                      }}
                      className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${selectedPaymentType === "TRANSFER"
                        ? "border-blue-600 bg-blue-50/40 shadow-2xs"
                        : "border-slate-200 hover:bg-slate-50/70"
                        }`}
                    >
                      <div className="relative flex items-center justify-center">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedPaymentType === "TRANSFER" ? "border-blue-600 bg-white" : "border-slate-300"
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
                        className={`text-sm ${selectedPaymentType === "TRANSFER"
                          ? "text-blue-600 font-semibold"
                          : "text-slate-800 font-medium"
                          }`}
                      >
                        Chuyển khoản VietQR
                      </span>
                    </div>
                    {/* Thẻ ATM nội địa */}
                    <div
                      onClick={() => {
                        setSelectedPaymentType("ATM");
                        setPaymentMethod("ATM_CARD");
                      }}
                      className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${selectedPaymentType === "ATM"
                        ? "border-blue-600 bg-blue-50/40 shadow-2xs"
                        : "border-slate-200 hover:bg-slate-50/70"
                        }`}
                    >
                      <div className="relative flex items-center justify-center">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedPaymentType === "ATM" ? "border-blue-600 bg-white" : "border-slate-300"
                            }`}
                        >
                          {selectedPaymentType === "ATM" && (
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                          )}
                        </div>
                      </div>
                      <CreditCard className="w-5 h-5 text-slate-600" />
                      <span
                        className={`text-sm ${selectedPaymentType === "ATM"
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
                      className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${selectedPaymentType === "INTERNATIONAL"
                        ? "border-blue-600 bg-blue-50/40 shadow-2xs"
                        : "border-slate-200 hover:bg-slate-50/70"
                        }`}
                    >
                      <div className="relative flex items-center justify-center">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedPaymentType === "INTERNATIONAL"
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
                        className={`text-sm ${selectedPaymentType === "INTERNATIONAL"
                          ? "text-blue-600 font-semibold"
                          : "text-slate-800 font-medium"
                          }`}
                      >
                        Thẻ quốc tế (Visa/Master)
                      </span>
                    </div>
                    {/* Ví điện tử */}
                    <div
                      onClick={() => {
                        setSelectedPaymentType("E_WALLET");
                        setPaymentMethod("E_WALLET");
                      }}
                      className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${selectedPaymentType === "E_WALLET"
                        ? "border-blue-600 bg-blue-50/40 shadow-2xs"
                        : "border-slate-200 hover:bg-slate-50/70"
                        }`}
                    >
                      <div className="relative flex items-center justify-center">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedPaymentType === "E_WALLET" ? "border-blue-600 bg-white" : "border-slate-300"
                            }`}
                        >
                          {selectedPaymentType === "E_WALLET" && (
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                          )}
                        </div>
                      </div>
                      <Wallet className="w-5 h-5 text-slate-600" />
                      <span
                        className={`text-sm ${selectedPaymentType === "E_WALLET"
                          ? "text-blue-600 font-semibold"
                          : "text-slate-800 font-medium"
                          }`}
                      >
                        Ví điện tử
                      </span>
                    </div>
                  </div>
                </div>
                {/* 2. CHI TIẾT ĐƠN HÀNG (CẮT TÁCH: Phần chi tiết cuộn bình thường, Chỉ khối Tổng Tiền & Nút Thanh Toán là Sticky) */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h2 className="text-base font-bold text-slate-900">Chi Tiết Đơn Hàng</h2>
                    <span className="text-xs font-semibold text-slate-500">
                      {`Bản quyền ${quantity} Năm`}
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
                        Hàng năm
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Thời hạn bản quyền:</span>
                      <span className="font-semibold text-blue-600">
                        {quantity} Năm
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Đơn giá niêm yết:</span>
                      <span className="font-medium text-slate-700">
                        {(currentPlan.priceYearly || 0).toLocaleString("vi-VN")} đ / năm
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
                  </div>
                </div>
                {/* KHỐI TỔNG TIỀN & NÚT THANH TOÁN (STICKY ĐÁY MÀN HÌNH CHỈ RIÊNG PHẦN NÀY) */}
                <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 p-5 shadow-xl space-y-3.5 sticky bottom-4 z-30 ring-1 ring-slate-900/5">
                  <div className="flex justify-between items-baseline text-base font-extrabold text-slate-900">
                    <span>Tổng thanh toán:</span>
                    <span className="text-slate-900 text-xl font-black">
                      {currentAmountVnd.toLocaleString("vi-VN")} <span className="text-xs font-bold text-slate-600">VNĐ</span>
                    </span>
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
                        <span>Thanh Toán</span>
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
          <div className="animate-fade-in max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-6 sm:p-8 lg:p-10 shadow-sm">
              {/* Header: ← Thông tin thanh toán */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-2.5 text-lg sm:text-xl font-bold text-slate-900 hover:text-blue-600 transition-colors group"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-800 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Thông tin thanh toán</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

                {/* CỘT TRÁI: PHƯƠNG THỨC & THÔNG TIN THANH TOÁN (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Dòng Phương thức thanh toán - Số tiền */}
                  <div className="flex items-center justify-between text-sm sm:text-base min-h-[28px]">
                    <span className="font-bold text-slate-900">Phương thức thanh toán</span>
                    <span className="text-slate-700">
                      Số tiền:{" "}
                      <span className="font-bold text-[#059669]">
                        {orderResult.amountVnd.toLocaleString("vi-VN")} VND
                      </span>
                    </span>
                  </div>

                  {/* 4 Nút Chọn Phương Thức (Grid 2x2) */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* 1. Chuyển khoản */}
                    <button
                      type="button"
                      onClick={() => {
                        setActivePaymentTab("TRANSFER");
                        setPaymentMethod("VIETQR");
                      }}
                      className={`flex items-center justify-center gap-2 py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                        activePaymentTab === "TRANSFER"
                          ? "border-2 border-blue-500 bg-blue-50/50 text-blue-600 font-bold shadow-xs"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      <span>Chuyển khoản</span>
                    </button>

                    {/* 2. Thẻ nội địa */}
                    <button
                      type="button"
                      onClick={() => {
                        setActivePaymentTab("DOMESTIC_CARD");
                        setPaymentMethod("ATM_CARD");
                      }}
                      className={`flex items-center justify-center gap-2 py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                        activePaymentTab === "DOMESTIC_CARD"
                          ? "border-2 border-blue-500 bg-blue-50/50 text-blue-600 font-bold shadow-xs"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Thẻ nội địa</span>
                    </button>

                    {/* 3. Thẻ quốc tế */}
                    <button
                      type="button"
                      onClick={() => {
                        setActivePaymentTab("INTL_CARD");
                        setPaymentMethod("E_WALLET");
                      }}
                      className={`flex items-center justify-center gap-2 py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                        activePaymentTab === "INTL_CARD"
                          ? "border-2 border-blue-500 bg-blue-50/50 text-blue-600 font-bold shadow-xs"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Thẻ quốc tế</span>
                    </button>

                    {/* 4. QR Code */}
                    <button
                      type="button"
                      onClick={() => {
                        setActivePaymentTab("QR_CODE");
                        setPaymentMethod("VIETQR");
                      }}
                      className={`flex items-center justify-center gap-2 py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                        activePaymentTab === "QR_CODE"
                          ? "border-2 border-blue-500 bg-blue-50/50 text-blue-600 font-bold shadow-xs"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>QR Code</span>
                    </button>
                  </div>

                  {/* CHI TIẾT THEO TAB ĐƯỢC CHỌN */}
                  {activePaymentTab === "TRANSFER" && (
                    <div className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                        {/* Cột trái: QR Code to hơn + Lưu mã QR */}
                        <div className="sm:col-span-6 flex flex-col items-center justify-center shrink-0">
                          <div className="border border-slate-200/90 rounded-2xl p-2.5 bg-white shadow-xs">
                            <img
                              src="/sepay_qr.png"
                              alt="VietQR Chuyển Khoản SePay"
                              className="w-52 h-52 sm:w-60 sm:h-60 object-contain"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleDownloadQr}
                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Lưu mã QR</span>
                          </button>
                        </div>

                        {/* Cột phải: Danh sách thông tin tài khoản nhỏ gọn hơn */}
                        <div className="sm:col-span-6 space-y-2 text-xs sm:text-[13px]">
                          {/* Số tài khoản */}
                          <div className="flex items-baseline gap-1.5">
                            <span className="w-24 sm:w-26 text-slate-500 font-normal shrink-0 text-xs sm:text-[13px]">
                              Số tài khoản:
                            </span>
                            <span className="font-bold text-slate-900 font-mono text-xs sm:text-[13px]">
                              {orderResult.accountNumber || "07744348801"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(orderResult.accountNumber || "07744348801", "acc")}
                              className="text-blue-600 hover:text-blue-800 p-0.5 ml-1 transition-colors"
                              title="Sao chép số tài khoản"
                            >
                              {copiedField === "acc" ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Tên tài khoản */}
                          <div className="flex items-baseline gap-1.5">
                            <span className="w-24 sm:w-26 text-slate-500 font-normal shrink-0 text-xs sm:text-[13px]">
                              Tên tài khoản:
                            </span>
                            <span className="font-semibold text-slate-900 text-xs sm:text-[13px]">
                              {orderResult.accountName || "NGUYEN NHAT SINH"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(orderResult.accountName || "NGUYEN NHAT SINH", "name")}
                              className="text-blue-600 hover:text-blue-800 p-0.5 ml-1 transition-colors"
                              title="Sao chép tên tài khoản"
                            >
                              {copiedField === "name" ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Ngân hàng */}
                          <div className="flex items-baseline gap-1.5">
                            <span className="w-24 sm:w-26 text-slate-500 font-normal shrink-0 text-xs sm:text-[13px]">
                              Ngân hàng:
                            </span>
                            <span className="font-semibold text-slate-900 text-xs sm:text-[13px]">
                              {orderResult.bankName || "Ngân hàng TMCP Tiên Phong (TPBank)"}
                            </span>
                          </div>

                          {/* Chi nhánh */}
                          <div className="flex items-baseline gap-1.5">
                            <span className="w-24 sm:w-26 text-slate-500 font-normal shrink-0 text-xs sm:text-[13px]">
                              Chi nhánh:
                            </span>
                            <span className="font-semibold text-slate-900 text-xs sm:text-[13px]">
                              Hà Nội
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy("Hà Nội", "branch")}
                              className="text-blue-600 hover:text-blue-800 p-0.5 ml-1 transition-colors"
                              title="Sao chép chi nhánh"
                            >
                              {copiedField === "branch" ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Số tiền */}
                          <div className="flex items-baseline gap-1.5">
                            <span className="w-24 sm:w-26 text-slate-500 font-normal shrink-0 text-xs sm:text-[13px]">
                              Số tiền:
                            </span>
                            <span className="font-bold text-slate-900 text-xs sm:text-[13px]">
                              {(orderResult.amountVnd || 36000000).toLocaleString("vi-VN")} VND
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy((orderResult.amountVnd || 36000000).toString(), "amount")
                              }
                              className="text-blue-600 hover:text-blue-800 p-0.5 ml-1 transition-colors"
                              title="Sao chép số tiền"
                            >
                              {copiedField === "amount" ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Nội dung */}
                          <div className="flex items-baseline gap-1.5">
                            <span className="w-24 sm:w-26 text-slate-500 font-normal shrink-0 text-xs sm:text-[13px]">
                              Nội dung:
                            </span>
                            <span className="font-bold text-slate-900 font-mono text-xs sm:text-[13px]">
                              {orderResult.transferSyntax || `SH ${orderResult.invoiceNumber || "INV-202609-5499"}`}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(orderResult.transferSyntax || `SH ${orderResult.invoiceNumber || "INV-202609-5499"}`, "syntax")
                              }
                              className="text-blue-600 hover:text-blue-800 p-0.5 ml-1 transition-colors"
                              title="Sao chép nội dung"
                            >
                              {copiedField === "syntax" ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activePaymentTab === "DOMESTIC_CARD" && (
                    <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-4 pt-6">
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">Thanh toán Thẻ nội địa (Napas / VNPay)</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                          Hỗ trợ thanh toán qua thẻ ATM của hơn 40 ngân hàng tại Việt Nam (Vietcombank, BIDV, Techcombank, ACB,...).
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={vnpayLoading}
                        onClick={handlePayWithVnPay}
                        className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-all disabled:opacity-60"
                      >
                        {vnpayLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Đang kết nối cổng VNPay...</span>
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-4 h-4" />
                            <span>Tiến Hành Thanh Toán VNPay</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {activePaymentTab === "INTL_CARD" && (
                    <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 pt-6">
                      <div className="text-center">
                        <h4 className="font-bold text-slate-900 text-base">Thanh toán Thẻ Quốc Tế (Visa, Master, JCB, PayPal)</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Thanh toán an toàn tiêu chuẩn quốc tế qua cổng PayPal.
                        </p>
                      </div>
                      <div className="flex justify-center w-full z-0 relative min-h-[160px] pt-2">
                        <PayPalScriptProvider options={{ clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || "test", currency: "USD" }}>
                          <PayPalButtons
                            style={{ layout: "vertical", color: "blue", shape: "rect", label: "pay" }}
                            createOrder={(_, actions) => {
                              const usdAmount = (orderResult.amountVnd / 25000).toFixed(2);
                              return actions.order.create({
                                intent: "CAPTURE",
                                purchase_units: [
                                  {
                                    amount: {
                                      currency_code: "USD",
                                      value: usdAmount,
                                    },
                                    description: `Order ${orderResult.invoiceNumber}`,
                                  },
                                ],
                              });
                            }}
                            onApprove={async (data, actions) => {
                              if (actions.order) {
                                try {
                                  setPaypalVerifying(true);
                                  setErrorMsg(null);
                                  const details = await actions.order.capture();
                                  if (details.status === "COMPLETED") {
                                    const res = await checkoutApi.verifyPayPalReturn(orderResult.invoiceId, data.orderID);
                                    if (res.success) {
                                      setCurrentStep(3);
                                      window.scrollTo({ top: 0, behavior: "smooth" });
                                    } else {
                                      setErrorMsg(res.message || "Xác thực PayPal thất bại");
                                    }
                                  } else {
                                    setErrorMsg("Thanh toán PayPal chưa hoàn tất: " + details.status);
                                  }
                                } catch (err: any) {
                                  setErrorMsg(err?.response?.data?.message || "Lỗi khi xác thực PayPal");
                                } finally {
                                  setPaypalVerifying(false);
                                }
                              }
                            }}
                            onError={(err) => {
                              setErrorMsg("Lỗi khi tải hoặc thực hiện thanh toán PayPal. Vui lòng thử lại.");
                              console.error(err);
                            }}
                          />
                        </PayPalScriptProvider>
                      </div>
                    </div>
                  )}

                  {activePaymentTab === "QR_CODE" && (
                    <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-blue-50/40 border border-blue-100 pt-6">
                      <div className="flex flex-col items-center shrink-0">
                        <img
                          src="/sepay_qr.png"
                          alt="VietQR Chuyển Khoản SePay"
                          className="w-44 h-44 object-contain rounded-lg border border-slate-200 bg-white p-2"
                        />
                        <button
                          type="button"
                          onClick={handleDownloadQr}
                          className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Lưu mã QR</span>
                        </button>
                      </div>
                      <div className="space-y-2 text-xs sm:text-sm">
                        <div className="font-bold text-slate-900 text-base">Mã QR Thanh Toán Tự Động</div>
                        <p className="text-slate-600 text-xs leading-relaxed">
                          Sử dụng bất kỳ ứng dụng ngân hàng hoặc ví điện tử có hỗ trợ VietQR để quét mã. Số tiền và nội dung chuyển khoản đã được mã hóa tự động chính xác 100%.
                        </p>
                        <div className="pt-2 text-xs text-slate-700 space-y-1">
                          <div>• Số tiền: <strong className="text-emerald-600 font-bold">{orderResult.amountVnd.toLocaleString("vi-VN")} VND</strong></div>
                          <div>• Nội dung: <strong className="font-mono text-blue-700 font-bold">{orderResult.transferSyntax}</strong></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* CỘT PHẢI: THÔNG TIN NGƯỜI MUA & HÓA ĐƠN (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Thông tin đơn hàng */}
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-3 min-h-[28px] flex items-center">
                      Thông tin đơn hàng
                    </h3>
                    <div className="space-y-2 text-xs sm:text-[13px]">
                      <div className="flex items-baseline gap-2">
                        <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">Mã đơn hàng:</span>
                        <span className="font-bold text-blue-700 font-mono">#{orderResult.invoiceNumber}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">Gói bản quyền:</span>
                        <span className="font-medium text-slate-900">{orderResult.planName}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">Thời hạn:</span>
                        <span className="font-medium text-blue-600">{quantity} Năm</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">Tên miền hệ thống:</span>
                        <span className="font-mono font-medium text-slate-900">{orderResult.subdomain}.smarthire.top</span>
                      </div>
                    </div>
                  </div>

                  {/* Thông tin người mua hàng thực tế */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-3">Thông tin người mua hàng</h3>
                    <div className="space-y-2 text-xs sm:text-[13px]">
                      <div className="flex items-baseline gap-2">
                        <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">Họ và tên:</span>
                        <span className="font-medium text-slate-900">{adminFullName || "—"}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">Số điện thoại:</span>
                        <span className="font-medium text-slate-900">{adminPhone || "—"}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">Email:</span>
                        <span className="font-medium text-slate-900 break-all">{adminEmail || "—"}</span>
                      </div>
                      {workspaceName && (
                        <div className="flex items-baseline gap-2">
                          <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">Đơn vị:</span>
                          <span className="font-medium text-slate-900">{workspaceName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Thông tin xuất hóa đơn (CHỈ HIỂN THỊ KHI NGƯỜI DÙNG CÓ YÊU CẦU XUẤT HÓA ĐƠN VAT) */}
                  {needVatInvoice && (taxCode || companyLegalName || billingAddress) ? (
                    <div>
                      <h3 className="text-base font-bold text-slate-900 mb-3">Thông tin xuất hóa đơn VAT</h3>
                      <div className="space-y-2 text-xs sm:text-[13px]">
                        {taxCode && (
                          <div className="flex items-baseline gap-2">
                            <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">Mã số thuế:</span>
                            <span className="font-medium text-slate-900">{taxCode}</span>
                          </div>
                        )}
                        {companyLegalName && (
                          <div className="flex items-baseline gap-2">
                            <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">Tên đơn vị:</span>
                            <span className="font-medium text-slate-900">{companyLegalName}</span>
                          </div>
                        )}
                        {billingAddress && (
                          <div className="flex items-baseline gap-2">
                            <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">Địa chỉ:</span>
                            <span className="font-medium text-slate-900">{billingAddress}</span>
                          </div>
                        )}
                        <div className="flex items-baseline gap-2">
                          <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">Email nhận HĐ:</span>
                          <span className="font-medium text-slate-900 break-all">{adminEmail || "—"}</span>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Nút hành động cho VNPay / PayPal nếu được chọn */}
                  {(activePaymentTab === "DOMESTIC_CARD" || activePaymentTab === "INTL_CARD") && (
                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      {activePaymentTab === "DOMESTIC_CARD" ? (
                        <button
                          type="button"
                          disabled={vnpayLoading}
                          onClick={handlePayWithVnPay}
                          className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
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
                        <div className="text-xs text-slate-500 text-center py-2 font-medium">
                          {paypalVerifying ? "Đang xác thực thanh toán PayPal..." : "Vui lòng chọn nút PayPal ở khung bên trái"}
                        </div>
                      )}
                    </div>
                  )}

                </div>

              </div>
            </div>
          </div>
        )}
        {/* ======================================================== */}
        {/* BƯỚC 3: KÍCH HOẠT (THÔNG BÁO, BẢN QUYỀN & TÀI NGUYÊN)    */}
        {/* ======================================================== */}
        {currentStep === 3 && orderResult && (
          <div className="animate-fade-in max-w-2xl mx-auto space-y-6 pb-20">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 shadow-sm text-center">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block mb-3">
                Thanh Toán Thành Công
              </span>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Không Gian Làm Việc Đã Kích Hoạt!
              </h1>

              <p className="text-sm text-slate-600 mt-3 max-w-md mx-auto">
                Cảm ơn quý doanh nghiệp. Giao dịch đã được hệ thống xác nhận thanh toán thành công và tự động kích hoạt dịch vụ.
              </p>
              <div className="mt-8 p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
                  <span className="text-sm font-semibold text-slate-700">Mã đơn hàng</span>
                  <span className="font-mono font-bold text-slate-900">{orderResult.invoiceNumber}</span>
                </div>

                <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
                  <span className="text-sm font-semibold text-slate-700">Gói dịch vụ</span>
                  <span className="font-bold text-blue-600">{orderResult.planName}</span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
                  <span className="text-sm font-semibold text-slate-700">Thời hạn bản quyền</span>
                  <span className="font-semibold text-slate-900">
                    {quantity} Năm
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Địa chỉ truy cập</span>
                  <span className="font-mono font-bold text-blue-600">
                    {orderResult.subdomain}.{baseDomain}
                  </span>
                </div>
              </div>
              <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm text-left flex gap-3">
                <div className="mt-0.5"><Clock className="w-4 h-4" /></div>
                <p>
                  Thông tin tài khoản quản trị viên đã được gửi tới email <strong>{adminEmail}</strong>.
                  Quý khách vui lòng kiểm tra hộp thư (kể cả thư rác) để đăng nhập và thiết lập lại mật khẩu.
                </p>
              </div>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={workspaceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>Truy Cập Workspace</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full sm:w-auto px-5 py-3.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  <span>In Hóa Đơn</span>
                </button>
                <a
                  href="/"
                  className="w-full sm:w-auto px-5 py-3.5 rounded-xl text-slate-600 hover:text-slate-900 font-bold text-sm transition-colors block"
                >
                  Về Trang Chủ
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
export default CheckoutPage;
