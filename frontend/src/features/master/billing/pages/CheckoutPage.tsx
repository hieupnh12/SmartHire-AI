import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
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
  Mail,
  Printer,
  ExternalLink,
  Wallet,
  MapPin,
} from "lucide-react";
import { checkoutApi, PublicSubscriptionPlan, CheckoutResponseData } from "@/api/master/checkoutApi";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { SmartHireLogo } from "@/components/shared/SmartHireLogo";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { toast } from "@/stores/toastStore";
import { formatDate, formatNumber, useLocale, useT } from "@/i18n";
import { LegalPolicyModal, type LegalPolicyTab } from "../components/modals/LegalPolicyModal";

const CURRENT_POLICY_VERSION = "v2026.10";

export function CheckoutPage() {
  const t = useT();
  const locale = useLocale();
  const { planCode } = useParams<{ planCode: string }>();
  const [searchParams] = useSearchParams();
  const invoiceParam = searchParams.get("invoice") || searchParams.get("invoiceId") || searchParams.get("invoiceNumber");
  // Wizard Step: 1 = Order, 2 = Payment, 3 = Activate
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
  // B2B Invoice info
  const [needCompanyInvoice, setNeedCompanyInvoice] = useState(false);
  const [companyLegalName, setCompanyLegalName] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [notes, setNotes] = useState("");
  // Click-wrap Legal Consent state (Mandatory explicit Opt-in, NEVER pre-checked)
  const [isTermsAccepted, setIsTermsAccepted] = useState<boolean>(false);
  const [termsError, setTermsError] = useState<boolean>(false);
  const [policyModalTab, setPolicyModalTab] = useState<LegalPolicyTab | null>(null);
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
        } else if (statusRes && statusRes.status === "CANCELLED") {
          setErrorMsg(t("master.commerce.checkout.errors.expiredCancelled"));
        }
      } catch (err) {
        console.debug("Status polling check...", err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [currentStep, orderResult?.invoiceId, t]);

  // If invoiceId or invoice is provided in URL (e.g. from Order Lookup), load the pending order directly into Step 2
  useEffect(() => {
    if (!invoiceParam) return;
    setLoading(true);
    checkoutApi.getOrderDetails(invoiceParam)
      .then((data) => {
        if (data) {
          setOrderResult(data);
          if (data.planCode) {
            setSelectedPlanCode(data.planCode.toUpperCase());
          }
          if (data.status === "PAID") {
            setCurrentStep(3);
          } else if (data.status === "CANCELLED") {
            setCurrentStep(2);
            setErrorMsg(t("master.commerce.checkout.errors.expiredCancelled"));
          } else {
            setCurrentStep(2);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load invoice order details", err);
        setErrorMsg(t("master.commerce.checkout.errors.orderNotFound"));
      })
      .finally(() => setLoading(false));
  }, [invoiceParam, t]);

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
  const defaultFallbackPlans = useMemo<PublicSubscriptionPlan[]>(() => [
    {
      id: 1,
      code: "STARTER",
      name: t("master.commerce.checkout.fallbackPlans.starter"),
      priceYearly: 12000000,
      maxJobs: 5,
      maxCvParses: 200,
      maxAiInterviewHours: 5,
      status: "ACTIVE",
    },
    {
      id: 2,
      code: "PROFESSIONAL",
      name: t("master.commerce.checkout.fallbackPlans.professional"),
      priceYearly: 36000000,
      maxJobs: 25,
      maxCvParses: 2500,
      maxAiInterviewHours: 30,
      status: "ACTIVE",
    },
    {
      id: 3,
      code: "ENTERPRISE",
      name: t("master.commerce.checkout.fallbackPlans.enterprise"),
      priceYearly: 99000000,
      maxJobs: 100,
      maxCvParses: 15000,
      maxAiInterviewHours: 150,
      status: "ACTIVE",
    },
  ], [t]);
  const currentPlan = useMemo(() => {
    const pool = plans.length > 0 ? plans : defaultFallbackPlans;
    return pool.find((p) => p.code.toUpperCase() === selectedPlanCode) || pool[1];
  }, [plans, defaultFallbackPlans, selectedPlanCode]);
  const currentAmountVnd = useMemo(() => {
    if (!currentPlan) return 0;
    const basePrice = currentPlan.priceYearly || 36000000;
    return basePrice * quantity;
  }, [currentPlan, quantity]);
  // Realtime Subdomain Check
  const handleCheckSubdomain = async () => {
    const cleanSub = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!cleanSub || cleanSub.length < 3) {
      toast.warning(t("master.commerce.checkout.errors.subdomainMinLength"));
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
  const formatUsagePeriod = (years: number, dateStr?: string) => {
    const start = dateStr ? new Date(dateStr) : new Date();
    const end = new Date(start);
    end.setFullYear(start.getFullYear() + years);
    return t("master.commerce.checkout.usagePeriod", {
      years,
      start: formatDate(start, undefined, locale),
      end: formatDate(end, undefined, locale),
    });
  };
  const handleDownloadQr = async () => {
    const qrSource = orderResult?.qrUrl || "/sepay_qr.png";
    try {
      const res = await fetch(qrSource);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `VietQR-SePay-${orderResult?.invoiceNumber || "order"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(qrSource, "_blank");
    }
  };
  // Step 1: Submit to generate invoice & order
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!isTermsAccepted) {
      setTermsError(true);
    }
    const cleanSub = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!cleanSub || cleanSub.length < 2) {
      setErrorMsg(t("master.commerce.checkout.errors.subdomainInvalid"));
      return;
    }
    if (!workspaceName.trim()) {
      setErrorMsg(t("master.commerce.checkout.errors.workspaceRequired"));
      return;
    }
    if (!adminFullName.trim() || !adminEmail.trim() || !adminPhone.trim()) {
      setErrorMsg(t("master.commerce.checkout.errors.adminFieldsRequired"));
      return;
    }
    if (!isTermsAccepted) {
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
        taxCode: needCompanyInvoice ? taxCode.trim() : undefined,
        companyLegalName: needCompanyInvoice ? companyLegalName.trim() : undefined,
        billingAddress: needCompanyInvoice ? billingAddress.trim() : undefined,
        notes: notes.trim() || undefined,
        quantity: quantity,
        termsAccepted: isTermsAccepted,
        termsVersion: CURRENT_POLICY_VERSION,
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
      const msg = err.response?.data?.message || t("master.commerce.checkout.errors.createOrderFailed");
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
        setErrorMsg(t("master.commerce.checkout.errors.vnpayMissingUrl"));
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || t("master.commerce.checkout.errors.vnpayConnectFailed");
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center group">
            <SmartHireLogo className="h-9 sm:h-10" />
          </Link>
          <LanguageSwitcher variant="icon" />
        </div>
      </header>
      {/* 3-STEP PROGRESS WIZARD STEPPER */}
      <div className="bg-[#F0F2F4] border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-3xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex items-center justify-between text-xs sm:text-sm font-semibold select-none">
            {/* Step 1 */}
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${currentStep === 1
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
                {t("master.commerce.checkout.steps.order")}
              </span>
            </div>
            {/* Connector 1-2 */}
            <div
              className={`flex-1 mx-3 sm:mx-6 h-[2px] rounded transition-colors ${currentStep >= 2 ? "bg-blue-600" : "bg-slate-300"
                }`}
            />
            {/* Step 2 */}
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${currentStep === 2
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
                {t("master.commerce.checkout.steps.payment")}
              </span>
            </div>
            {/* Connector 2-3 */}
            <div
              className={`flex-1 mx-3 sm:mx-6 h-[2px] rounded transition-colors ${currentStep >= 3 ? "bg-blue-600" : "bg-slate-300"
                }`}
            />
            {/* Step 3 */}
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${currentStep === 3
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
                {t("master.commerce.checkout.steps.activate")}
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
        {/* STEP 1: ORDER INFORMATION                                */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <div className="animate-fade-in">
            <div className="mb-5">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {t("master.commerce.checkout.step1.title")}
              </h1>
            </div>
            <form onSubmit={handleProceedToPayment} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-8 space-y-6">
                {/* 1. SELECTED PLAN */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-900">{t("master.commerce.checkout.step1.selectedPlanTitle")}</h2>
                    <Link
                      to="/pricing"
                      className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 shrink-0"
                    >
                      {t("master.commerce.checkout.step1.changePlan")}
                    </Link>
                  </div>

                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-500">{t("master.commerce.checkout.step1.planNameLabel")}</span>
                      <span className="font-bold text-slate-900 text-sm">{currentPlan.name}</span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-500">{t("master.commerce.checkout.step1.billingCycleLabel")}</span>
                      <span className="font-medium text-slate-800">{t("master.commerce.checkout.step1.billingCycleYearly")}</span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-500">{t("master.commerce.checkout.step1.listPriceLabel")}</span>
                      <span className="font-semibold text-slate-900">
                        {t("master.commerce.checkout.step1.pricePerYear", {
                          price: formatNumber(currentPlan.priceYearly || 36000000, undefined, locale),
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-500">{t("master.commerce.checkout.step1.jobsLabel")}</span>
                      <span className="font-semibold text-slate-900">
                        {currentPlan.maxJobs > 0
                          ? t("master.commerce.checkout.step1.jobsValue", { count: currentPlan.maxJobs })
                          : t("master.commerce.common.unlimited")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-500">{t("master.commerce.checkout.step1.cvScreeningLabel")}</span>
                      <span className="font-semibold text-slate-900">
                        {currentPlan.maxCvParses > 0
                          ? t("master.commerce.checkout.step1.cvValue", { count: formatNumber(currentPlan.maxCvParses, undefined, locale) })
                          : t("master.commerce.common.unlimited")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-500">{t("master.commerce.checkout.step1.aiInterviewLabel")}</span>
                      <span className="font-semibold text-slate-900">
                        {currentPlan.maxAiInterviewHours && currentPlan.maxAiInterviewHours > 0
                          ? t("master.commerce.checkout.step1.aiValue", { count: currentPlan.maxAiInterviewHours })
                          : t("master.commerce.common.unlimited")}
                      </span>
                    </div>
                  </div>

                  {/* License Duration Stepper */}
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-slate-700">{t("master.commerce.checkout.step1.licenseTermLabel")}</span>
                      <div className="flex items-center h-7 border border-slate-200 rounded-md bg-white overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                          disabled={quantity <= 1}
                          className="w-7 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                          title={t("master.commerce.checkout.step1.decreaseYearTitle")}
                          aria-label={t("master.commerce.checkout.step1.decreaseYearTitle")}
                        >
                          -
                        </button>
                        <div className="px-2.5 h-full flex items-center justify-center font-bold text-xs text-slate-900 border-x border-slate-100 min-w-[55px]">
                          {t("master.commerce.checkout.step1.yearsCount", { count: quantity })}
                        </div>
                        <button
                          type="button"
                          onClick={() => setQuantity(q => Math.min(10, q + 1))}
                          disabled={quantity >= 10}
                          className="w-7 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                          title={t("master.commerce.checkout.step1.increaseYearTitle")}
                          aria-label={t("master.commerce.checkout.step1.increaseYearTitle")}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:justify-end">
                      <span className="text-slate-500 text-[11px]">
                        {quantity > 1
                          ? t("master.commerce.checkout.step1.calcPrefix", {
                              count: quantity,
                              price: formatNumber(currentPlan.priceYearly || 36000000, undefined, locale),
                            })
                          : t("master.commerce.checkout.step1.subtotalLabel")}
                      </span>
                      <span className="text-base font-extrabold text-slate-900">
                        {formatNumber(currentAmountVnd, undefined, locale)}
                      </span>
                      <span className="text-xs font-bold text-slate-700">{t("master.commerce.common.vnd")}</span>
                    </div>
                  </div>
                </div>
                {/* 2. ORGANIZATION INFO */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                  <div className="pb-3 border-b border-slate-100">
                    <h2 className="text-base font-bold text-slate-900">{t("master.commerce.checkout.step1.unitSectionTitle")}</h2>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {t("master.commerce.checkout.step1.companyNameLabel")}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={t("master.commerce.checkout.step1.companyNamePlaceholder")}
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      className="w-full px-4 py-3 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 transition-all font-medium text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {t("master.commerce.checkout.step1.subdomainLabel")}
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
                        {subdomainStatus === "CHECKING" ? t("master.commerce.checkout.step1.subdomainChecking") : t("master.commerce.checkout.step1.subdomainCheckBtn")}
                      </button>
                    </div>
                    {subdomainStatus === "AVAILABLE" && (
                      <p className="text-[11px] font-semibold text-emerald-600 mt-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t("master.commerce.checkout.step1.subdomainAvailable", { subdomain })}</span>
                      </p>
                    )}
                    {subdomainStatus === "TAKEN" && (
                      <p className="text-[11px] font-semibold text-rose-600 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{t("master.commerce.checkout.step1.subdomainTaken")}</span>
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        {t("master.commerce.checkout.step1.adminNameLabel")}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={t("master.commerce.checkout.step1.adminNamePlaceholder")}
                        value={adminFullName}
                        onChange={(e) => setAdminFullName(e.target.value)}
                        className="w-full px-4 py-3 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 font-medium text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        {t("master.commerce.checkout.step1.adminPhoneLabel")}
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
                      {t("master.commerce.checkout.step1.adminEmailLabel")}
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="admin@acmecorp.vn"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full px-4 py-3 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 font-medium text-slate-800"
                    />
                  </div>
                </div>
                {/* 3. B2B INVOICE DETAILS */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h2 className="text-base font-bold text-slate-900">{t("master.commerce.checkout.step1.invoiceSectionTitle")}</h2>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={needCompanyInvoice}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setNeedCompanyInvoice(checked);
                          if (checked) {
                            if (!companyLegalName && workspaceName) setCompanyLegalName(workspaceName);
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  {needCompanyInvoice && (
                    <div className="space-y-4 pt-1 animate-fade-in">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">
                          {t("master.commerce.checkout.step1.legalNameLabel")}
                        </label>
                        <input
                          type="text"
                          placeholder={t("master.commerce.checkout.step1.legalNamePlaceholder")}
                          value={companyLegalName}
                          onChange={(e) => setCompanyLegalName(e.target.value)}
                          className="w-full px-4 py-3 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 font-medium text-slate-800"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5">
                            {t("master.commerce.checkout.step1.taxCodeLabel")}
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
                              {t("master.commerce.checkout.step1.addressLabel")}
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                if ("geolocation" in navigator) {
                                  navigator.geolocation.getCurrentPosition(
                                    async (position) => {
                                      try {
                                        const { latitude, longitude } = position.coords;
                                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${locale}`);
                                        const data = await res.json();
                                        if (data && data.display_name) {
                                          setBillingAddress(data.display_name);
                                        } else {
                                          setBillingAddress(`${latitude}, ${longitude}`);
                                        }
                                      } catch {
                                        setBillingAddress(`${position.coords.latitude}, ${position.coords.longitude}`);
                                      }
                                    },
                                    () => {
                                      toast.error(t("master.commerce.checkout.errors.geoDenied"));
                                    }
                                  );
                                } else {
                                  toast.warning(t("master.commerce.checkout.errors.geoUnsupported"));
                                }
                              }}
                              className="text-blue-600 hover:text-blue-700 p-1 rounded-md hover:bg-blue-50 transition-colors flex items-center gap-1 text-[11px] font-semibold"
                              title={t("master.commerce.checkout.step1.getLocationTitle")}
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              {t("master.commerce.checkout.step1.getLocationBtn")}
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder={t("master.commerce.checkout.step1.addressPlaceholder")}
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
                      {t("master.commerce.checkout.step1.notesLabel")}
                    </label>
                    <textarea
                      rows={3}
                      placeholder={t("master.commerce.checkout.step1.notesPlaceholder")}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-3 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 font-medium text-slate-800 resize-none"
                    />
                  </div>
                </div>
              </div>
              {/* Right Column */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                  <h2 className="text-base font-bold text-slate-900">{t("master.commerce.checkout.step1.paymentMethodTitle")}</h2>
                  <div className="space-y-2.5 pt-1">
                    {/* Transfer */}
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
                        {t("master.commerce.checkout.step1.methodTransfer")}
                      </span>
                    </div>
                    {/* Domestic ATM */}
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
                        {t("master.commerce.checkout.step1.methodAtm")}
                      </span>
                    </div>
                    {/* International Card */}
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
                        {t("master.commerce.checkout.step1.methodIntl")}
                      </span>
                    </div>
                    {/* E-Wallet */}
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
                        {t("master.commerce.checkout.step1.methodEwallet")}
                      </span>
                    </div>
                  </div>
                </div>
                {/* 2. ORDER SUMMARY */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h2 className="text-base font-bold text-slate-900">{t("master.commerce.checkout.step1.orderDetailsTitle")}</h2>
                    <span className="text-xs font-semibold text-slate-500">
                      {t("master.commerce.checkout.step1.licenseBadge", { count: quantity })}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>{t("master.commerce.checkout.step1.detailPlanLabel")}</span>
                      <span className="font-semibold text-slate-800">{currentPlan.name}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>{t("master.commerce.checkout.step1.detailCycleLabel")}</span>
                      <span className="font-semibold text-slate-800">
                        {t("master.commerce.checkout.step1.billingCycleYearly")}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>{t("master.commerce.checkout.step1.detailTermLabel")}</span>
                      <span className="font-semibold text-blue-600">
                        {t("master.commerce.checkout.step1.yearsCount", { count: quantity })}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>{t("master.commerce.checkout.step1.detailListPriceLabel")}</span>
                      <span className="font-medium text-slate-700">
                        {t("master.commerce.checkout.step1.pricePerYear", {
                          price: formatNumber(currentPlan.priceYearly || 0, undefined, locale),
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>{t("master.commerce.checkout.step1.detailSubtotalLabel")}</span>
                      <span className="font-medium text-slate-700">
                        {t("master.commerce.checkout.step1.detailSubtotalValue", {
                          amount: formatNumber(currentAmountVnd, undefined, locale),
                        })}
                      </span>
                    </div>

                  </div>
                </div>
                {/* STICKY TOTAL & PAY CTA */}
                <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 p-5 shadow-xl space-y-3.5 sticky bottom-4 z-30 ring-1 ring-slate-900/5">
                  <div className="flex justify-between items-baseline text-base font-extrabold text-slate-900">
                    <span>{t("master.commerce.checkout.step1.totalPaymentLabel")}</span>
                    <span className="text-slate-900 text-xl font-black">
                      {formatNumber(currentAmountVnd, undefined, locale)} <span className="text-xs font-bold text-slate-600">{t("master.commerce.common.vnd")}</span>
                    </span>
                  </div>

                  {/* Click-wrap Legal Consent Checkbox */}
                  <div
                    className={`p-3 rounded-xl border transition-all ${termsError && !isTermsAccepted
                      ? "bg-rose-50/90 border-rose-400 ring-2 ring-rose-100"
                      : "bg-slate-50/90 border-slate-200/80"
                      }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        id="checkout-terms-consent"
                        type="checkbox"
                        checked={isTermsAccepted}
                        onChange={(e) => {
                          setIsTermsAccepted(e.target.checked);
                          if (e.target.checked) {
                            setTermsError(false);
                          }
                        }}
                        className={`mt-0.5 w-4 h-4 rounded cursor-pointer shrink-0 ${termsError && !isTermsAccepted
                          ? "border-rose-400 text-rose-600 focus:ring-rose-500 accent-rose-600"
                          : "border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600"
                          }`}
                      />
                      <label
                        htmlFor="checkout-terms-consent"
                        className={`text-xs leading-relaxed cursor-pointer select-none ${termsError && !isTermsAccepted ? "text-rose-700 font-medium" : "text-slate-600"
                          }`}
                      >
                        {t("master.commerce.checkout.step1.consentAgreement", {
                          tos: "__TOS_LINK__",
                          privacy: "__PRIVACY_LINK__",
                        })
                          .split(/(__TOS_LINK__|__PRIVACY_LINK__)/g)
                          .map((part, idx) =>
                            part === "__TOS_LINK__" ? (
                              <button
                                key={idx}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setPolicyModalTab("TOS");
                                }}
                                className="font-medium text-blue-600 hover:text-blue-700 underline underline-offset-2 cursor-pointer"
                              >
                                {t("master.commerce.checkout.step1.consentTosLink")}
                              </button>
                            ) : part === "__PRIVACY_LINK__" ? (
                              <button
                                key={idx}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setPolicyModalTab("PRIVACY_ND13");
                                }}
                                className="font-medium text-blue-600 hover:text-blue-700 underline underline-offset-2 cursor-pointer"
                              >
                                {t("master.commerce.checkout.step1.consentPrivacyLink")}
                              </button>
                            ) : (
                              part
                            ),
                          )}
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    onClick={() => {
                      if (!isTermsAccepted) {
                        setTermsError(true);
                      }
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t("master.commerce.checkout.step1.submittingOrderBtn")}</span>
                      </>
                    ) : (
                      <>
                        <span>{t("master.commerce.checkout.step1.payBtn")}</span>
                      </>
                    )}
                  </button>

                  {termsError && !isTermsAccepted && (
                    <p className="text-xs font-semibold text-rose-600 flex items-center gap-1.5 animate-fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                      <span>{t("master.commerce.checkout.errors.termsRequired")}</span>
                    </p>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}
        {/* ======================================================== */}
        {/* STEP 2: PAYMENT                                          */}
        {/* ======================================================== */}
        {currentStep === 2 && orderResult && (
          <div className="animate-fade-in max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-6 sm:p-8 lg:p-10 shadow-sm">
              {/* Header */}
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (invoiceParam) {
                      window.location.href = "/pricing";
                    } else {
                      setCurrentStep(1);
                    }
                  }}
                  className="inline-flex items-center gap-2.5 text-lg sm:text-xl font-bold text-slate-900 hover:text-blue-600 transition-colors group"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-800 group-hover:-translate-x-0.5 transition-transform" />
                  <span>{invoiceParam ? t("master.commerce.checkout.step2.backToPricing") : t("master.commerce.checkout.step2.paymentInfoTitle")}</span>
                </button>

                {invoiceParam && (
                  <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full font-medium inline-flex items-center gap-1.5 self-start sm:self-auto">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    {t("master.commerce.checkout.step2.payingOrderBadge", { invoiceNumber: orderResult?.invoiceNumber ?? "" })}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

                {/* LEFT COLUMN: PAYMENT METHODS */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between text-sm sm:text-base min-h-[28px]">
                    <span className="font-bold text-slate-900">{t("master.commerce.checkout.step2.paymentMethodHeading")}</span>
                    <span className="text-slate-700">
                      {t("master.commerce.checkout.step2.amountPrefix")}{" "}
                      <span className="font-bold text-[#059669]">
                        {formatNumber(orderResult.amountVnd, undefined, locale)} {t("master.commerce.common.vndCode")}
                      </span>
                    </span>
                  </div>

                  {/* 4 Payment Tab Buttons (Grid 2x2) */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* 1. Transfer */}
                    <button
                      type="button"
                      onClick={() => {
                        setActivePaymentTab("TRANSFER");
                        setPaymentMethod("VIETQR");
                      }}
                      className={`flex items-center justify-center gap-2 py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-medium transition-all ${activePaymentTab === "TRANSFER"
                        ? "border-2 border-blue-500 bg-blue-50/50 text-blue-600 font-bold shadow-xs"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      <span>{t("master.commerce.checkout.step2.tabTransfer")}</span>
                    </button>

                    {/* 2. Domestic Card */}
                    <button
                      type="button"
                      onClick={() => {
                        setActivePaymentTab("DOMESTIC_CARD");
                        setPaymentMethod("ATM_CARD");
                      }}
                      className={`flex items-center justify-center gap-2 py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-medium transition-all ${activePaymentTab === "DOMESTIC_CARD"
                        ? "border-2 border-blue-500 bg-blue-50/50 text-blue-600 font-bold shadow-xs"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>{t("master.commerce.checkout.step2.tabDomesticCard")}</span>
                    </button>

                    {/* 3. International Card */}
                    <button
                      type="button"
                      onClick={() => {
                        setActivePaymentTab("INTL_CARD");
                        setPaymentMethod("E_WALLET");
                      }}
                      className={`flex items-center justify-center gap-2 py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-medium transition-all ${activePaymentTab === "INTL_CARD"
                        ? "border-2 border-blue-500 bg-blue-50/50 text-blue-600 font-bold shadow-xs"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>{t("master.commerce.checkout.step2.tabIntlCard")}</span>
                    </button>

                    {/* 4. QR Code */}
                    <button
                      type="button"
                      onClick={() => {
                        setActivePaymentTab("QR_CODE");
                        setPaymentMethod("VIETQR");
                      }}
                      className={`flex items-center justify-center gap-2 py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-medium transition-all ${activePaymentTab === "QR_CODE"
                        ? "border-2 border-blue-500 bg-blue-50/50 text-blue-600 font-bold shadow-xs"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>{t("master.commerce.checkout.step2.tabQrCode")}</span>
                    </button>
                  </div>

                  {/* TAB DETAILS */}
                  {activePaymentTab === "TRANSFER" && (
                    <div className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                        <div className="sm:col-span-6 flex flex-col items-center justify-center shrink-0">
                          <div className="border border-slate-200/90 rounded-2xl p-2.5 bg-white shadow-xs">
                            <img
                              src={orderResult?.qrUrl || "/sepay_qr.png"}
                              alt={t("master.commerce.checkout.step2.qrAlt")}
                              className="w-52 h-52 sm:w-60 sm:h-60 object-contain"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleDownloadQr}
                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{t("master.commerce.checkout.step2.saveQrBtn")}</span>
                          </button>
                        </div>

                        <div className="sm:col-span-6 space-y-2 text-xs sm:text-[13px]">
                          {/* Account No */}
                          <div className="flex items-baseline gap-1.5">
                            <span className="w-24 sm:w-26 text-slate-500 font-normal shrink-0 text-xs sm:text-[13px]">
                              {t("master.commerce.checkout.step2.accountNumberLabel")}
                            </span>
                            <span className="font-bold text-slate-900 font-mono text-xs sm:text-[13px]">
                              {orderResult.accountNumber || "07744348801"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(orderResult.accountNumber || "07744348801", "acc")}
                              className="text-blue-600 hover:text-blue-800 p-0.5 ml-1 transition-colors"
                              title={t("master.commerce.checkout.step2.copyAccountTitle")}
                              aria-label={t("master.commerce.checkout.step2.copyAccountTitle")}
                            >
                              {copiedField === "acc" ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Account Holder */}
                          <div className="flex items-baseline gap-1.5">
                            <span className="w-24 sm:w-26 text-slate-500 font-normal shrink-0 text-xs sm:text-[13px]">
                              {t("master.commerce.checkout.step2.accountNameLabel")}
                            </span>
                            <span className="font-semibold text-slate-900 text-xs sm:text-[13px]">
                              {orderResult.accountName || "NGUYEN NHAT SINH"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(orderResult.accountName || "NGUYEN NHAT SINH", "name")}
                              className="text-blue-600 hover:text-blue-800 p-0.5 ml-1 transition-colors"
                              title={t("master.commerce.checkout.step2.copyNameTitle")}
                              aria-label={t("master.commerce.checkout.step2.copyNameTitle")}
                            >
                              {copiedField === "name" ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Bank */}
                          <div className="flex items-baseline gap-1.5">
                            <span className="w-24 sm:w-26 text-slate-500 font-normal shrink-0 text-xs sm:text-[13px]">
                              {t("master.commerce.checkout.step2.bankLabel")}
                            </span>
                            <span className="font-semibold text-slate-900 text-xs sm:text-[13px]">
                              {orderResult.bankName || t("master.commerce.checkout.step2.defaultBankName")}
                            </span>
                          </div>

                          {/* Branch */}
                          <div className="flex items-baseline gap-1.5">
                            <span className="w-24 sm:w-26 text-slate-500 font-normal shrink-0 text-xs sm:text-[13px]">
                              {t("master.commerce.checkout.step2.branchLabel")}
                            </span>
                            <span className="font-semibold text-slate-900 text-xs sm:text-[13px]">
                              {t("master.commerce.checkout.step2.defaultBranch")}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(t("master.commerce.checkout.step2.defaultBranch"), "branch")}
                              className="text-blue-600 hover:text-blue-800 p-0.5 ml-1 transition-colors"
                              title={t("master.commerce.checkout.step2.copyBranchTitle")}
                              aria-label={t("master.commerce.checkout.step2.copyBranchTitle")}
                            >
                              {copiedField === "branch" ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Amount */}
                          <div className="flex items-baseline gap-1.5">
                            <span className="w-24 sm:w-26 text-slate-500 font-normal shrink-0 text-xs sm:text-[13px]">
                              {t("master.commerce.checkout.step2.amountLabel")}
                            </span>
                            <span className="font-bold text-slate-900 text-xs sm:text-[13px]">
                              {formatNumber(orderResult.amountVnd || 36000000, undefined, locale)} {t("master.commerce.common.vndCode")}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy((orderResult.amountVnd || 36000000).toString(), "amount")
                              }
                              className="text-blue-600 hover:text-blue-800 p-0.5 ml-1 transition-colors"
                              title={t("master.commerce.checkout.step2.copyAmountTitle")}
                              aria-label={t("master.commerce.checkout.step2.copyAmountTitle")}
                            >
                              {copiedField === "amount" ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Reference */}
                          <div className="flex items-baseline gap-1.5">
                            <span className="w-24 sm:w-26 text-slate-500 font-normal shrink-0 text-xs sm:text-[13px]">
                              {t("master.commerce.checkout.step2.contentLabel")}
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
                              title={t("master.commerce.checkout.step2.copyContentTitle")}
                              aria-label={t("master.commerce.checkout.step2.copyContentTitle")}
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
                        <h4 className="font-bold text-slate-900 text-base">{t("master.commerce.checkout.step2.domesticTitle")}</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                          {t("master.commerce.checkout.step2.domesticDesc")}
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
                            <span>{t("master.commerce.checkout.step2.vnpayConnecting")}</span>
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-4 h-4" />
                            <span>{t("master.commerce.checkout.step2.vnpayProceedBtn")}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {activePaymentTab === "INTL_CARD" && (
                    <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 pt-6">
                      <div className="text-center">
                        <h4 className="font-bold text-slate-900 text-base">{t("master.commerce.checkout.step2.intlTitle")}</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          {t("master.commerce.checkout.step2.intlDesc")}
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
                                    custom_id: String(orderResult.invoiceId),
                                    invoice_id: orderResult.invoiceNumber,
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
                                      setErrorMsg(res.message || t("master.commerce.checkout.errors.paypalVerifyFailed"));
                                    }
                                  } else {
                                    setErrorMsg(t("master.commerce.checkout.errors.paypalNotCompleted", { status: details.status ?? "" }));
                                  }
                                } catch (err: any) {
                                  setErrorMsg(err?.response?.data?.message || t("master.commerce.checkout.errors.paypalVerifyError"));
                                } finally {
                                  setPaypalVerifying(false);
                                }
                              }
                            }}
                            onError={(err) => {
                              setErrorMsg(t("master.commerce.checkout.errors.paypalSdkError"));
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
                          src={orderResult?.qrUrl || "/sepay_qr.png"}
                          alt={t("master.commerce.checkout.step2.qrAlt")}
                          className="w-44 h-44 object-contain rounded-lg border border-slate-200 bg-white p-2"
                        />
                        <button
                          type="button"
                          onClick={handleDownloadQr}
                          className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{t("master.commerce.checkout.step2.saveQrBtn")}</span>
                        </button>
                      </div>
                      <div className="space-y-2 text-xs sm:text-sm">
                        <div className="font-bold text-slate-900 text-base">{t("master.commerce.checkout.step2.autoQrTitle")}</div>
                        <p className="text-slate-600 text-xs leading-relaxed">
                          {t("master.commerce.checkout.step2.autoQrDesc")}
                        </p>
                        <div className="pt-2 text-xs text-slate-700 space-y-1">
                          <div>{t("master.commerce.checkout.step2.autoQrAmount")} <strong className="text-emerald-600 font-bold">{formatNumber(orderResult.amountVnd, undefined, locale)} {t("master.commerce.common.vndCode")}</strong></div>
                          <div>{t("master.commerce.checkout.step2.autoQrContent")} <strong className="font-mono text-blue-700 font-bold">{orderResult.transferSyntax}</strong></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: BUYER & INVOICE SUMMARY */}
                <div className="lg:col-span-5 space-y-6">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-3 min-h-[28px] flex items-center">
                      {t("master.commerce.checkout.step2.orderInfoTitle")}
                    </h3>
                    <div className="space-y-2 text-xs sm:text-[13px]">
                      <div className="flex items-baseline gap-2">
                        <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">{t("master.commerce.checkout.step2.orderCodeLabel")}</span>
                        <span className="font-bold text-blue-700 font-mono">#{orderResult.invoiceNumber}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">{t("master.commerce.checkout.step2.orderPlanLabel")}</span>
                        <span className="font-medium text-slate-900">{orderResult.planName}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">{t("master.commerce.checkout.step2.orderTermLabel")}</span>
                        <span className="font-medium text-blue-600">{t("master.commerce.checkout.step1.yearsCount", { count: quantity })}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">{t("master.commerce.checkout.step2.orderDomainLabel")}</span>
                        <span className="font-mono font-medium text-slate-900">{orderResult.subdomain}.smarthire.top</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-3">{t("master.commerce.checkout.step2.buyerInfoTitle")}</h3>
                    <div className="space-y-2 text-xs sm:text-[13px]">
                      <div className="flex items-baseline gap-2">
                        <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">{t("master.commerce.checkout.step2.buyerNameLabel")}</span>
                        <span className="font-medium text-slate-900">{adminFullName || "—"}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">{t("master.commerce.checkout.step2.buyerPhoneLabel")}</span>
                        <span className="font-medium text-slate-900">{adminPhone || "—"}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">{t("master.commerce.checkout.step2.buyerEmailLabel")}</span>
                        <span className="font-medium text-slate-900 break-all">{adminEmail || "—"}</span>
                      </div>
                      {workspaceName && (
                        <div className="flex items-baseline gap-2">
                          <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">{t("master.commerce.checkout.step2.buyerOrgLabel")}</span>
                          <span className="font-medium text-slate-900">{workspaceName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {needCompanyInvoice && (taxCode || companyLegalName || billingAddress) ? (
                    <div>
                      <h3 className="text-base font-bold text-slate-900 mb-3">{t("master.commerce.checkout.step2.invoiceInfoTitle")}</h3>
                      <div className="space-y-2 text-xs sm:text-[13px]">
                        {taxCode && (
                          <div className="flex items-baseline gap-2">
                            <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">{t("master.commerce.checkout.step2.invoiceTaxLabel")}</span>
                            <span className="font-medium text-slate-900">{taxCode}</span>
                          </div>
                        )}
                        {companyLegalName && (
                          <div className="flex items-baseline gap-2">
                            <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">{t("master.commerce.checkout.step2.invoiceOrgLabel")}</span>
                            <span className="font-medium text-slate-900">{companyLegalName}</span>
                          </div>
                        )}
                        {billingAddress && (
                          <div className="flex items-baseline gap-2">
                            <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">{t("master.commerce.checkout.step2.invoiceAddrLabel")}</span>
                            <span className="font-medium text-slate-900">{billingAddress}</span>
                          </div>
                        )}
                        <div className="flex items-baseline gap-2">
                          <span className="w-24 sm:w-28 text-slate-500 font-normal shrink-0">{t("master.commerce.checkout.step2.invoiceEmailLabel")}</span>
                          <span className="font-medium text-slate-900 break-all">{adminEmail || "—"}</span>
                        </div>
                      </div>
                    </div>
                  ) : null}

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
                              <span>{t("master.commerce.checkout.step2.vnpayActionConnecting")}</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4" />
                              <span>{t("master.commerce.checkout.step2.vnpayActionBtn")}</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="text-xs text-slate-500 text-center py-2 font-medium">
                          {paypalVerifying ? t("master.commerce.checkout.step2.paypalVerifying") : t("master.commerce.checkout.step2.paypalPrompt")}
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
        {/* STEP 3: ACTIVATED                                        */}
        {/* ======================================================== */}
        {currentStep === 3 && orderResult && (
          <div className="animate-fade-in max-w-2xl mx-auto space-y-6 pb-20">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 shadow-sm text-center">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block mb-3">
                {t("master.commerce.checkout.step3.badge")}
              </span>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {t("master.commerce.checkout.step3.title")}
              </h1>

              <p className="text-sm text-slate-600 mt-3 max-w-md mx-auto">
                {t("master.commerce.checkout.step3.subtitle")}
              </p>
              <div className="mt-8 p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
                  <span className="text-sm font-semibold text-slate-700">{t("master.commerce.checkout.step3.orderNumberLabel")}</span>
                  <span className="font-mono font-bold text-slate-900">{orderResult.invoiceNumber}</span>
                </div>

                <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
                  <span className="text-sm font-semibold text-slate-700">{t("master.commerce.checkout.step3.planLabel")}</span>
                  <span className="font-bold text-blue-600">{orderResult.planName}</span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
                  <span className="text-sm font-semibold text-slate-700">{t("master.commerce.checkout.step3.usageTermLabel")}</span>
                  <span className="font-semibold text-slate-900">
                    {formatUsagePeriod(quantity, orderResult.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">{t("master.commerce.checkout.step3.workspaceUrlLabel")}</span>
                  <span className="font-mono font-bold text-blue-600">
                    {orderResult.subdomain}.{baseDomain}
                  </span>
                </div>
              </div>
              <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-sm text-left flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {t("master.commerce.checkout.step3.magicLinkBefore")}
                  <strong>{adminEmail}</strong>
                  {t("master.commerce.checkout.step3.magicLinkAfter")}
                </p>
              </div>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={workspaceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>{t("master.commerce.checkout.step3.accessWorkspaceBtn")}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full sm:w-auto px-5 py-3.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  <span>{t("master.commerce.checkout.step3.printInvoiceBtn")}</span>
                </button>
                <a
                  href="/"
                  className="w-full sm:w-auto px-5 py-3.5 rounded-xl text-slate-600 hover:text-slate-900 font-bold text-sm transition-colors block"
                >
                  {t("master.commerce.checkout.step3.backHomeBtn")}
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
      <LegalPolicyModal
        openTab={policyModalTab}
        policyVersion="15/06/2026"
        onClose={() => setPolicyModalTab(null)}
        onSwitchTab={(tab) => setPolicyModalTab(tab)}
        isAccepted={isTermsAccepted}
        onAcceptChange={(val) => {
          setIsTermsAccepted(val);
          if (val) setTermsError(false);
        }}
      />
    </div>
  );
}
export default CheckoutPage;
