import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Receipt,
  RotateCcw,
  Mail,
} from "lucide-react";
import { checkoutApi, VnPayVerifyReturnData } from "@/api/master/checkoutApi";
import { SmartHireLogo } from "@/components/shared/SmartHireLogo";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { formatNumber, useLocale, useT } from "@/i18n";

export function VnPayReturnPage() {
  const t = useT();
  const locale = useLocale();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VnPayVerifyReturnData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    if (Object.keys(params).length === 0) {
      setErrorMsg(t("master.commerce.vnpayReturn.missingParamsError"));
      setLoading(false);
      return;
    }

    checkoutApi
      .verifyVnPayReturn(params)
      .then((data) => {
        setResult(data);
      })
      .catch((err) => {
        const msg = err.response?.data?.message || t("master.commerce.vnpayReturn.verifyError");
        setErrorMsg(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [searchParams, t]);

  const currentWindowTenant = getTenantIdFromWindow();
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname.endsWith(".localhost");
  const baseDomain = isLocalhost ? `localhost:${window.location.port || "5173"}` : "smarthire.top";
  const protocol = window.location.protocol === "https:" ? "https" : "http";

  const isUpgrade = result?.paymentPurpose === "UPGRADE";
  const isRenewal = result?.paymentPurpose === "RENEWAL";
  const isSelfServeTenantPayment = isUpgrade || isRenewal;

  const isSameSubdomainHost = Boolean(
    currentWindowTenant &&
      (!result?.subdomain || currentWindowTenant.toLowerCase() === result.subdomain.toLowerCase()),
  );

  const workspaceUrl = result?.subdomain
    ? `${protocol}://${result.subdomain}.${baseDomain}/internal/login`
    : "#";

  const billingUrl = result?.subdomain
    ? `${protocol}://${result.subdomain}.${baseDomain}/internal/admin/billing`
    : "/internal/admin/billing";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center group">
            <SmartHireLogo className="h-9" />
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{t("master.commerce.vnpayReturn.headerBadge")}</span>
            </div>
            <LanguageSwitcher variant="icon" />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-12">
        {loading && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">{t("master.commerce.vnpayReturn.loadingTitle")}</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {t("master.commerce.vnpayReturn.loadingDesc")}
            </p>
          </div>
        )}

        {!loading && errorMsg && (
          <div className="bg-white rounded-3xl border border-rose-200 p-8 sm:p-10 shadow-sm text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">{t("master.commerce.vnpayReturn.errorTitle")}</h2>
              <p className="text-sm text-rose-600 mt-2 font-medium">{errorMsg}</p>
            </div>
            <div className="flex items-center justify-center gap-4 pt-4">
              {currentWindowTenant ? (
                <Link
                  to="/internal/admin/billing"
                  className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  {t("master.commerce.vnpayReturn.backToBilling")}
                </Link>
              ) : (
                <Link
                  to="/pricing"
                  className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  {t("master.commerce.vnpayReturn.backToPricing")}
                </Link>
              )}
            </div>
          </div>
        )}

        {!loading && result && result.success && (
          <div className="bg-white rounded-3xl border border-emerald-200/80 p-8 sm:p-10 shadow-sm space-y-8 animate-fade-in">
            {/* Top Badge & Header */}
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>
              <span className="inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                {t("master.commerce.vnpayReturn.successBadge")}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {isUpgrade
                  ? t("master.commerce.vnpayReturn.titleUpgrade")
                  : isRenewal
                    ? t("master.commerce.vnpayReturn.titleRenewal")
                    : t("master.commerce.vnpayReturn.titleActivated")}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
                {isUpgrade
                  ? t("master.commerce.vnpayReturn.descUpgrade", {
                      planName: result.planName || t("master.commerce.vnpayReturn.defaultPlanFallback"),
                      workspace: result.workspaceName || result.subdomain || t("master.commerce.vnpayReturn.defaultWorkspaceRef"),
                    })
                  : isRenewal
                    ? t("master.commerce.vnpayReturn.descRenewal", {
                        planName: result.planName || t("master.commerce.vnpayReturn.defaultPlanName"),
                        workspace: result.workspaceName || result.subdomain || t("master.commerce.vnpayReturn.defaultWorkspaceRef"),
                      })
                    : t("master.commerce.vnpayReturn.descActivated")}
              </p>
            </div>

            {/* Receipt Summary Box */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 font-bold text-slate-900">
                <span className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-600" />
                  <span>{t("master.commerce.vnpayReturn.receiptTitle")}</span>
                </span>
                <span className="text-blue-600 font-mono">#{result.invoiceNumber}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
                <div>
                  <span className="text-[11px] text-slate-400 block">{t("master.commerce.vnpayReturn.txnCodeLabel")}</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">{result.transactionNo || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">{t("master.commerce.vnpayReturn.bankLabel")}</span>
                  <span className="font-bold text-slate-900">{result.bankCode || "NCB (ATM)"}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">{t("master.commerce.vnpayReturn.paidAmountLabel")}</span>
                  <span className="font-black text-emerald-600 text-sm">
                    {formatNumber(result.amountVnd ?? 0, undefined, locale)} {t("master.commerce.common.vnd")}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">{t("master.commerce.vnpayReturn.payTimeLabel")}</span>
                  <span className="font-medium text-slate-800">{result.payDate || t("master.commerce.vnpayReturn.instantTime")}</span>
                </div>
                {result.planName && (
                  <div className="sm:col-span-2">
                    <span className="text-[11px] text-slate-400 block">{t("master.commerce.vnpayReturn.appliedPlanLabel")}</span>
                    <span className="font-bold text-slate-900">{result.planName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Workspace Activation Info */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50/70 to-indigo-50/60 border border-blue-200 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-950">
                <Building2 className="w-4 h-4 text-blue-700" />
                <span>{t("master.commerce.vnpayReturn.workspaceSectionTitle")}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">{t("master.commerce.vnpayReturn.companyLabel")}</span>
                  <span className="font-bold text-slate-900">{result.workspaceName || t("master.commerce.vnpayReturn.defaultWorkspaceName")}</span>
                </div>
                {result.subdomain && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">{t("master.commerce.vnpayReturn.workspaceUrlLabel")}</span>
                    <a
                      href={workspaceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <span>{protocol}://{result.subdomain}.{baseDomain}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {result.contactEmail && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">{t("master.commerce.vnpayReturn.adminEmailLabel")}</span>
                    <span className="font-semibold text-slate-900">{result.contactEmail}</span>
                  </div>
                )}
              </div>

              {!isSelfServeTenantPayment && (
                <div className="p-3.5 rounded-xl bg-white/90 border border-blue-200/80 text-xs text-blue-900 leading-relaxed flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p>
                    {t("master.commerce.vnpayReturn.magicLinkBefore")}
                    <strong>{result.contactEmail}</strong>
                    {t("master.commerce.vnpayReturn.magicLinkAfter")}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {isSelfServeTenantPayment ? (
                isSameSubdomainHost ? (
                  <Link
                    to="/internal/admin/billing"
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <span>{t("master.commerce.vnpayReturn.backToBilling")}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <a
                    href={billingUrl}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <span>{t("master.commerce.vnpayReturn.backToBilling")}</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                )
              ) : (
                <a
                  href={workspaceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <span>{t("master.commerce.vnpayReturn.accessWorkspaceBtn")}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              )}

              <Link
                to={isSelfServeTenantPayment && isSameSubdomainHost ? "/internal/admin" : "/"}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors text-center"
              >
                {isSelfServeTenantPayment ? t("master.commerce.vnpayReturn.backAdminDashboardBtn") : t("master.commerce.vnpayReturn.backHomeBtn")}
              </Link>
            </div>
          </div>
        )}

        {!loading && result && !result.success && (
          <div className="bg-white rounded-3xl border border-amber-200 p-8 sm:p-10 shadow-sm text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                {t("master.commerce.vnpayReturn.failedCodeBadge", { code: result.responseCode ?? "" })}
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">{t("master.commerce.vnpayReturn.failedTitle")}</h2>
              <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">{result.message}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 max-w-md mx-auto space-y-1 text-left">
              <div className="flex justify-between">
                <span>{t("master.commerce.vnpayReturn.orderCodeLabel")}</span>
                <span className="font-mono font-bold text-slate-800">#{result.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("master.commerce.vnpayReturn.amountLabel")}</span>
                <span className="font-bold text-slate-800">{formatNumber(result.amountVnd ?? 0, undefined, locale)} ₫</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              {isSelfServeTenantPayment || currentWindowTenant ? (
                isSameSubdomainHost ? (
                  <Link
                    to="/internal/admin/billing"
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t("master.commerce.vnpayReturn.retryPaymentBillingBtn")}</span>
                  </Link>
                ) : (
                  <a
                    href={billingUrl}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t("master.commerce.vnpayReturn.retryPaymentBillingBtn")}</span>
                  </a>
                )
              ) : (
                <Link
                  to="/pricing"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t("master.commerce.vnpayReturn.retryPaymentBtn")}</span>
                </Link>
              )}
              <Link
                to={isSelfServeTenantPayment && isSameSubdomainHost ? "/internal/admin" : "/"}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                {isSelfServeTenantPayment ? t("master.commerce.vnpayReturn.backAdminDashboardBtn") : t("master.commerce.vnpayReturn.backHomeBtn")}
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
