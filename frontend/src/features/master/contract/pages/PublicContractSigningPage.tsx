import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { contractApi, ContractItem } from "@/api/master/contractApi";
import { LEGAL_POLICY_META } from "@/config/legalConfig";
import { PAYMENT_BANK_INFO } from "@/config/paymentConfig";
import { formatQuotaLimit } from "@/lib/quotaFormatters";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { formatDate, formatDateTime, formatNumber, useLocale, useT } from "@/i18n";
import {
  FileSignature,
  ShieldCheck,
  Building2,
  Printer,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Download,
  Hash,
} from "lucide-react";

const cleanAmountInWords = (words?: string | null): string => {
  if (!words) return "";
  return words
    .replace(/\s*\(?đã bao gồm thuế GTGT\)?/gi, "")
    .replace(/\s*\(?đã bao gồm VAT\)?/gi, "")
    .replace(/\s*\(?bao gồm thuế GTGT\)?/gi, "")
    .replace(/\s*\(?bao gồm VAT\)?/gi, "")
    .trim();
};

export function PublicContractSigningPage() {
  const t = useT();
  const locale = useLocale();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [contract, setContract] = useState<ContractItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError(t("master.commerce.publicSigning.invalidLinkError"));
      setLoading(false);
      return;
    }

    const fetchContract = async () => {
      setLoading(true);
      try {
        const data = await contractApi.getBySigningToken(token);
        setContract(data);
      } catch (err: any) {
        const msg =
          err.response?.data?.message ||
          t("master.commerce.publicSigning.fetchError");
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [token, t]);

  const handleSyncDropboxSign = async () => {
    if (!token) return;
    setSyncing(true);
    setSyncNotice(null);
    try {
      const updated = await contractApi.syncEsignByToken(token);
      setContract(updated);
      if (updated.status === "SIGNED") {
        setSyncNotice(t("master.commerce.publicSigning.syncSigned"));
      } else if (updated.status === "REJECTED") {
        setSyncNotice(t("master.commerce.publicSigning.syncRejected"));
      } else if (updated.status === "TERMINATED") {
        setSyncNotice(t("master.commerce.publicSigning.syncTerminated"));
      } else if (updated.status === "EXPIRED") {
        setSyncNotice(t("master.commerce.publicSigning.syncExpired"));
      } else {
        setSyncNotice(t("master.commerce.publicSigning.syncPending"));
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        t("master.commerce.publicSigning.syncError");
      setSyncNotice(msg);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center max-w-sm w-full">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
          <h2 className="text-base font-bold text-slate-800">{t("master.commerce.publicSigning.loadingTitle")}</h2>
          <p className="text-xs text-slate-500 mt-1">{t("master.commerce.publicSigning.loadingDesc")}</p>
        </div>
      </div>
    );
  }

  if (error && !contract) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-rose-200 text-center max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900">{t("master.commerce.publicSigning.invalidTitle")}</h2>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            {t("master.commerce.publicSigning.backHomeBtn")}
          </button>
        </div>
      </div>
    );
  }

  if (!contract) return null;

  const isSigned = contract.status === "SIGNED";
  const isRejected = contract.status === "REJECTED";
  const isTerminated = contract.status === "TERMINATED";
  const isExpired = contract.status === "EXPIRED";
  const isClosedWithoutSignature = isRejected || isTerminated || isExpired;
  const pdfDownloadUrl = token ? contractApi.getPublicPdfUrl(token) : "#";

  return (
    <div className="min-h-screen bg-slate-200/70 py-8 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-900">
      {/* Top Floating Action Bar */}
      <div className="max-w-4xl mx-auto mb-4 bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-slate-300/80 shadow-md flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold">
            <FileSignature className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-900">{t("master.commerce.publicSigning.portalTitle")}</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isSigned
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : isClosedWithoutSignature
                    ? "bg-rose-100 text-rose-800 border border-rose-300"
                    : "bg-amber-100 text-amber-800 border border-amber-300"
                }`}
              >
                {isSigned
                  ? t("master.commerce.publicSigning.statusSigned")
                  : isRejected
                  ? t("master.commerce.publicSigning.statusRejected")
                  : isTerminated
                  ? t("master.commerce.publicSigning.statusTerminated")
                  : isExpired
                  ? t("master.commerce.publicSigning.statusExpired")
                  : t("master.commerce.publicSigning.statusPending")}
              </span>
              {contract.esignTestMode && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-100 text-sky-800 border border-sky-300">
                  {t("master.commerce.publicSigning.sandboxBadge")}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {t("master.commerce.publicSigning.contractCodeLine", { code: contract.contractNumber })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={pdfDownloadUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{isSigned ? t("master.commerce.publicSigning.downloadSignedPdf") : t("master.commerce.publicSigning.downloadDraftPdf")}</span>
          </a>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>{t("master.commerce.publicSigning.printBtn")}</span>
          </button>

          {!isSigned && !isClosedWithoutSignature && (
            <button
              onClick={handleSyncDropboxSign}
              disabled={syncing}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span>{t("master.commerce.publicSigning.syncBtn")}</span>
            </button>
          )}

          <LanguageSwitcher variant="icon" />
        </div>
      </div>

      {/* Dropbox Sign Legal E-Signature & Cryptographic Verification Banner */}
      <div className="max-w-4xl mx-auto mb-6 bg-white rounded-2xl p-4 sm:p-5 border border-indigo-200/90 shadow-sm print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2 font-bold text-indigo-950 text-sm">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                {isSigned
                  ? t("master.commerce.publicSigning.bannerTitleSigned")
                  : isRejected
                  ? t("master.commerce.publicSigning.bannerTitleRejected")
                  : isTerminated
                  ? t("master.commerce.publicSigning.bannerTitleTerminated")
                  : isExpired
                  ? t("master.commerce.publicSigning.bannerTitleExpired")
                  : t("master.commerce.publicSigning.bannerTitlePending")}
              </span>
            </div>
            {isSigned ? (
              <p className="text-emerald-800 leading-relaxed">
                {t("master.commerce.publicSigning.bannerSignedBefore")}
                <strong>{t("master.commerce.publicSigning.bannerSignedStrong")}</strong>
                {t("master.commerce.publicSigning.bannerSignedAfter")}
              </p>
            ) : isClosedWithoutSignature ? (
              <p className="text-rose-700 leading-relaxed">
                {isRejected
                  ? t("master.commerce.publicSigning.bannerRejectedDesc")
                  : isTerminated
                  ? t("master.commerce.publicSigning.bannerTerminatedDesc")
                  : t("master.commerce.publicSigning.bannerExpiredDesc")}
              </p>
            ) : (
              <p className="text-slate-600 leading-relaxed">
                {t("master.commerce.publicSigning.bannerPendingPart1")}
                <strong>{t("master.commerce.publicSigning.bannerPendingProvider")}</strong>
                {t("master.commerce.publicSigning.bannerPendingPart2")}
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                  {contract.partyBEmail || t("master.commerce.publicSigning.bannerPendingEmailFallback")}
                </span>
                {t("master.commerce.publicSigning.bannerPendingPart3")}
                <strong>{t("master.commerce.publicSigning.bannerPendingSender")}</strong>
                {t("master.commerce.publicSigning.bannerPendingPart4")}
                <strong>{t("master.commerce.publicSigning.bannerPendingAction")}</strong>
                {t("master.commerce.publicSigning.bannerPendingPart5")}
              </p>
            )}

            <div className="pt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-slate-500 font-mono">
              {contract.externalSignatureRequestId && (
                <div>
                  <span className="font-sans font-medium text-slate-500">{t("master.commerce.publicSigning.requestIdLabel")} </span>
                  <span className="text-slate-800 font-semibold">{contract.externalSignatureRequestId}</span>
                </div>
              )}
              {contract.documentChecksum && (
                <div className="flex items-center gap-1" title={contract.documentChecksum}>
                  <Hash className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="font-sans font-medium text-slate-500">{t("master.commerce.publicSigning.shaLabel")} </span>
                  <span className="text-slate-800">{contract.documentChecksum.length > 24 ? `${contract.documentChecksum.slice(0, 12)}...${contract.documentChecksum.slice(-8)}` : contract.documentChecksum}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {syncNotice && (
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs font-medium text-indigo-800 flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{syncNotice}</span>
          </div>
        )}
      </div>

      {/* Contract Paper Document */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-300 p-8 sm:p-14 print:p-0 print:border-none print:shadow-none">
        {/* National Header */}
        <div className="text-center pb-6 border-b border-slate-200">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900">
            {t("master.commerce.contractDetailModal.nationalHeader")}
          </h4>
          <h5 className="text-xs font-semibold text-slate-800 mt-1">{t("master.commerce.contractDetailModal.nationalMotto")}</h5>
          <div className="w-36 h-0.5 bg-slate-900 mx-auto my-3" />
          <p className="text-[11px] text-slate-500 italic">
            {t("master.commerce.contractDetailModal.placeDate", {
              city: LEGAL_POLICY_META.city,
              date: formatDate(contract.createdAt, undefined, locale),
            })}
          </p>
        </div>

        {/* Contract Title */}
        <div className="text-center my-6">
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 leading-tight">
            {t("master.commerce.publicSigning.docTitleLine1")}
            <br />
            <span className="text-slate-900 text-lg sm:text-xl">{t("master.commerce.publicSigning.docTitleLine2")}</span>
          </h1>
          <p className="text-xs font-mono font-bold text-slate-600 mt-2">
            {t("master.commerce.contractDetailModal.contractNumberLine", { contractNumber: contract.contractNumber })}
          </p>
        </div>

        {/* Legal Basis */}
        <div className="text-[11px] sm:text-xs text-slate-600 italic space-y-1 mb-8 leading-relaxed pl-1">
          <p>{t("master.commerce.publicSigning.legalBasis1")}</p>
          <p>{t("master.commerce.publicSigning.legalBasis2")}</p>
          <p>{t("master.commerce.publicSigning.legalBasis3")}</p>
          <p>{t("master.commerce.publicSigning.legalBasis4", { law: LEGAL_POLICY_META.lawLabel })}</p>
          <p>{t("master.commerce.publicSigning.legalBasis5")}</p>
        </div>

        {/* Parties Information */}
        <div className="mb-8 text-xs text-slate-800 leading-relaxed">
          <p className="font-semibold mb-4 text-slate-900">
            {t("master.commerce.publicSigning.todayPartiesIntro", {
              date: formatDate(contract.createdAt, undefined, locale),
            })}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* NHÀ CUNG CẤP */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
              <h3 className="font-bold text-xs uppercase text-slate-900 pb-2 border-b border-slate-200 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  {t("master.commerce.publicSigning.partyAHeading", {
                    name: contract.partyAName || LEGAL_POLICY_META.companyName,
                  })}
                </span>
              </h3>
              <div className="space-y-1.5 text-[12px] leading-relaxed">
                <div>
                  <span className="text-slate-500 font-medium">{t("master.commerce.publicSigning.partyATaxLabel")} </span>
                  <span className="font-mono font-bold text-slate-900">{contract.partyATaxCode || LEGAL_POLICY_META.taxCode}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">{t("master.commerce.publicSigning.partyARepLabel")} </span>
                  <span className="font-semibold text-slate-900">
                    {contract.partyARepresentative || LEGAL_POLICY_META.representative}
                  </span>
                  <span className="text-slate-600">
                    {t("master.commerce.publicSigning.partyAPositionSegment", {
                      position: contract.partyAPosition || t("master.commerce.contractDetailModal.partyAFallbackPosition"),
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">{t("master.commerce.publicSigning.partyAAddressLabel")} </span>
                  <span className="text-slate-800">{contract.partyAAddress || t("master.commerce.publicSigning.partyADefaultAddress")}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">{t("master.commerce.publicSigning.partyAEmailLabel")} </span>
                  <span className="text-slate-800">{contract.partyAEmail || LEGAL_POLICY_META.supportEmail}</span>
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="text-slate-500 font-medium">{t("master.commerce.publicSigning.partyAHotlineLabel")} </span>
                  <span className="text-slate-800">{contract.partyAPhone || LEGAL_POLICY_META.hotline}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">{t("master.commerce.publicSigning.partyAAccountLabel")} </span>
                  <span className="font-mono font-bold text-slate-900">{contract.partyABankAccount || PAYMENT_BANK_INFO.accountNumber}</span>{" "}
                  {t("master.commerce.publicSigning.partyABankAt")}{" "}
                  <span className="text-slate-800">
                    {contract.partyABankName || PAYMENT_BANK_INFO.bankName} – {contract.partyABankBranch || t("master.commerce.publicSigning.partyADefaultBankBranch")}
                  </span>
                </div>
              </div>
            </div>

            {/* KHÁCH HÀNG */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
              <h3 className="font-bold text-xs uppercase text-slate-900 pb-2 border-b border-slate-200 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-600 shrink-0" />
                <span>{t("master.commerce.publicSigning.partyBHeading")}</span>
              </h3>
              <div className="space-y-1.5 text-[12px] leading-relaxed">
                <div>
                  <span className="text-slate-500 font-medium">{t("master.commerce.publicSigning.partyBCompanyLabel")} </span>
                  <span className="font-bold text-slate-900">{contract.partyBName || contract.tenantName || t("master.commerce.publicSigning.partyBDefaultName")}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">{t("master.commerce.publicSigning.partyATaxLabel")} </span>
                  <span className="font-mono font-bold text-slate-900">{contract.partyBTaxCode || t("master.commerce.contractDetailModal.taxCodeUpdating")}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">{t("master.commerce.publicSigning.partyBRepLabel")} </span>
                  <span className="font-semibold text-slate-900">
                    {contract.partyBRepresentative || t("master.commerce.contractDetailModal.repFallback")}
                  </span>
                  <span className="text-slate-600">
                    {t("master.commerce.publicSigning.partyAPositionSegment", {
                      position: contract.partyBPosition || t("master.commerce.contractDetailModal.partyBFallbackPosition"),
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">{t("master.commerce.publicSigning.partyBAddressLabel")} </span>
                  <span className="text-slate-800">{contract.partyBAddress || t("master.commerce.publicSigning.partyBDefaultAddress")}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">{t("master.commerce.publicSigning.partyBEmailLabel")} </span>
                  <span className="font-mono text-indigo-700">{contract.partyBEmail || "email@company.com"}</span>
                  {contract.partyBPhone && (
                    <>
                      <span className="mx-2 text-slate-300">|</span>
                      <span className="text-slate-500 font-medium">{t("master.commerce.publicSigning.partyBPhoneLabel")} </span>
                      <span className="text-slate-800">{contract.partyBPhone}</span>
                    </>
                  )}
                </div>
                {contract.partyBBankAccount && (
                  <div>
                    <span className="text-slate-500 font-medium">{t("master.commerce.publicSigning.partyBBankLabel")} </span>
                    <span className="font-mono text-slate-800">{contract.partyBBankAccount}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contract Articles */}
        <div className="space-y-7 text-xs sm:text-[13px] text-slate-800 leading-relaxed">
          {/* Article 1 */}
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
              {t("master.commerce.publicSigning.article1Title")}
            </h4>
            <p>
              {t("master.commerce.publicSigning.article1_1Before")}
              <strong>SmartHire-AI</strong>
              {t("master.commerce.publicSigning.article1_1After")}
            </p>
            <div className="overflow-hidden rounded-xl border border-slate-200 my-3">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/90 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Hạng mục tài nguyên & dịch vụ</th>
                    <th className="px-4 py-2.5 text-right">Hạn ngạch phân bổ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  <tr>
                    <td className="px-4 py-2.5 text-slate-600 font-medium">Gói dịch vụ bản quyền</td>
                    <td className="px-4 py-2.5 text-right font-bold text-indigo-700">{contract.planName || t("master.commerce.publicSigning.article1DefaultPlan")}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-600 font-medium">Không gian làm việc (Subdomain)</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-900 font-semibold">https://{contract.tenantCode || "company"}.smarthire.top</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-600 font-medium">Vị trí tuyển dụng mở đồng thời (Active Jobs)</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                      {formatQuotaLimit(contract.maxJobs, t("master.commerce.publicSigning.quotaJobsUnit"), {
                        locale,
                        unlimitedLabel: t("master.commerce.publicSigning.quotaUnlimitedJobs"),
                        unsupportedLabel: t("master.commerce.publicSigning.quotaUnsupportedJobs"),
                        monthlySuffix: t("master.commerce.common.monthlySuffix"),
                      })}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-600 font-medium">Lượt phân tích & sàng lọc CV AI</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                      {formatQuotaLimit(contract.maxCvParses, t("master.commerce.publicSigning.quotaCvUnit"), {
                        locale,
                        monthly: true,
                        unlimitedLabel: t("master.commerce.publicSigning.quotaUnlimitedCv"),
                        unsupportedLabel: t("master.commerce.publicSigning.quotaUnsupportedCv"),
                        monthlySuffix: t("master.commerce.common.monthlySuffix"),
                      })}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-600 font-medium">Thời lượng phỏng vấn AI Voice</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                      {formatQuotaLimit(contract.maxAiInterviewHours, t("master.commerce.publicSigning.quotaAiUnit"), {
                        locale,
                        monthly: true,
                        unlimitedLabel: t("master.commerce.publicSigning.quotaUnlimitedAi"),
                        unsupportedLabel: t("master.commerce.publicSigning.quotaUnsupportedAi"),
                        monthlySuffix: t("master.commerce.common.monthlySuffix"),
                      })}
                    </td>
                  </tr>
                  {contract.maxProctoringHours !== undefined && (
                    <tr>
                      <td className="px-4 py-2.5 text-slate-600 font-medium">Giám sát thi trực tuyến (AI Proctoring)</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                        {formatQuotaLimit(contract.maxProctoringHours, t("master.commerce.publicSigning.quotaProctoringUnit"), {
                          locale,
                          monthly: true,
                          unlimitedLabel: t("master.commerce.publicSigning.quotaUnlimitedProctoring"),
                          unsupportedLabel: t("master.commerce.publicSigning.quotaUnsupportedProctoring"),
                          monthlySuffix: t("master.commerce.common.monthlySuffix"),
                        })}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="px-4 py-2.5 text-slate-600 font-medium">Dung lượng lưu trữ dữ liệu</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                      {formatQuotaLimit(contract.maxStorageGb, t("master.commerce.publicSigning.quotaStorageUnit"), {
                        locale,
                        unlimitedLabel: t("master.commerce.publicSigning.quotaUnlimitedStorage"),
                        unsupportedLabel: t("master.commerce.publicSigning.quotaUnsupportedStorage"),
                        monthlySuffix: t("master.commerce.common.monthlySuffix"),
                      })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              <strong>{t("master.commerce.publicSigning.article1_2Title")}</strong>{" "}
              {t("master.commerce.publicSigning.article1_2Before")}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-indigo-700">
                smarthire_tenant_{contract.tenantCode || "company"}
              </code>
              {t("master.commerce.publicSigning.article1_2After")}
            </p>
            <p>
              <strong>{t("master.commerce.publicSigning.article1_3Title")}</strong>{" "}
              {t("master.commerce.publicSigning.article1_3From")}{" "}
              <span className="font-semibold font-mono">{contract.startDate}</span>{" "}
              {t("master.commerce.publicSigning.article1_3To")}{" "}
              <span className="font-semibold font-mono">{contract.endDate}</span>.
            </p>
          </div>

          {/* Article 2 */}
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
              {t("master.commerce.publicSigning.article2Title")}
            </h4>
            <p>{t("master.commerce.publicSigning.article2_1Intro")}</p>
            <div className="overflow-hidden rounded-xl border border-slate-200 my-3">
              <table className="w-full text-xs text-left">
                <tbody className="divide-y divide-slate-200 bg-white">
                  <tr>
                    <td className="px-4 py-2.5 text-slate-600 font-medium">{t("master.commerce.publicSigning.article2LicenseFee")}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-900">{formatNumber(contract.contractValue, undefined, locale)} {t("master.commerce.common.vndCode")}</td>
                  </tr>
                  <tr className="bg-slate-50 font-bold">
                    <td className="px-4 py-2.5 text-slate-900">{t("master.commerce.publicSigning.article2TotalFee")}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-600 text-sm">{formatNumber(contract.totalAmount || contract.contractValue, undefined, locale)} {t("master.commerce.common.vndCode")}</td>
                  </tr>
                </tbody>
              </table>
              {cleanAmountInWords(contract.amountInWords) && (
                <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-200 text-[11px] text-slate-500 italic">
                  {t("master.commerce.contractDetailModal.amountInWords", {
                    words: cleanAmountInWords(contract.amountInWords),
                  })}
                </div>
              )}
            </div>
            <p className="font-semibold pt-1">{t("master.commerce.publicSigning.article2_2Title")}</p>
            <ul className="space-y-1.5 pl-4 list-disc text-slate-700">
              <li>
                {t("master.commerce.publicSigning.article2_2Bullet1Before")}
                <strong>{t("master.commerce.publicSigning.article2_2Bullet1Strong")}</strong>
                {t("master.commerce.publicSigning.article2_2Bullet1After")}
              </li>
              <li>
                {t("master.commerce.publicSigning.article2_2Bullet2")}
              </li>
            </ul>
          </div>

          {/* Article 3 */}
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
              {t("master.commerce.publicSigning.article3Title")}
            </h4>
            <p>
              <strong>{t("master.commerce.publicSigning.article3_1Title")}</strong>{" "}
              {t("master.commerce.publicSigning.article3_1Before")}
              <strong>{t("master.commerce.publicSigning.article3_1Strong")}</strong>
              {t("master.commerce.publicSigning.article3_1After")}
            </p>
            <p>
              <strong>{t("master.commerce.publicSigning.article3_2Title", { law: LEGAL_POLICY_META.lawLabel })}</strong>{" "}
              {t("master.commerce.publicSigning.article3_2Part1")}
              <strong>{t("master.commerce.publicSigning.article3_2Controller")}</strong>
              {t("master.commerce.publicSigning.article3_2Part2")}
              <strong>{t("master.commerce.publicSigning.article3_2Processor")}</strong>
              {t("master.commerce.publicSigning.article3_2Part3")}
            </p>
            <p>
              <strong>{t("master.commerce.publicSigning.article3_3Title")}</strong>{" "}
              {t("master.commerce.publicSigning.article3_3Body")}
            </p>
          </div>

          {/* Article 4 */}
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
              {t("master.commerce.publicSigning.article4Title")}
            </h4>
            <p>
              {t("master.commerce.publicSigning.article4_1Before")}
              <strong>{t("master.commerce.publicSigning.article4_1Strong")}</strong>
              {t("master.commerce.publicSigning.article4_1After")}
            </p>
            <p>
              {t("master.commerce.publicSigning.article4_2Part1")}
              <strong>{t("master.commerce.publicSigning.article4_2Provider")}</strong>
              {t("master.commerce.publicSigning.article4_2Part2")}
              <strong>{t("master.commerce.publicSigning.article4_2Hash")}</strong>
              {t("master.commerce.publicSigning.article4_2Part3")}
            </p>
            <p>
              {t("master.commerce.publicSigning.article4_3Before")}
              <strong>
                {t("master.commerce.publicSigning.article4_3Strong", {
                  court: LEGAL_POLICY_META.disputeCourt,
                })}
              </strong>
              {t("master.commerce.publicSigning.article4_3After")}
            </p>
          </div>
        </div>

        {/* Signature Blocks */}
        <div className="mt-12 pt-8 border-t-2 border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs">
          {/* Party A Signature */}
          <div className="space-y-2 flex flex-col items-center">
            <span className="font-bold uppercase text-slate-900">{t("master.commerce.publicSigning.sigPartyAHeader")}</span>
            <span className="text-[11px] text-slate-500 italic">{t("master.commerce.publicSigning.sigPartyASignedCaption")}</span>
            <div className="h-32 flex flex-col items-center justify-center">
              <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 text-center w-full max-w-[250px]">
                <ShieldCheck className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                <div className="text-[10px] font-bold text-indigo-900">{t("master.commerce.publicSigning.sigPartyACa")}</div>
                <div className="text-[9px] text-indigo-700 font-mono">
                  {t("master.commerce.publicSigning.sigPartyATimestamp", {
                    date: formatDate(contract.createdAt, undefined, locale),
                  })}
                </div>
                <div className="text-[9px] text-emerald-700 font-semibold">{t("master.commerce.publicSigning.sigPartyAValid")}</div>
              </div>
            </div>
            <span className="font-bold text-slate-900 mt-2">{contract.partyARepresentative || LEGAL_POLICY_META.representative}</span>
            <span className="text-[11px] text-slate-500">{contract.partyAPosition || t("master.commerce.contractDetailModal.partyAFallbackPosition")}</span>
          </div>

          {/* Party B Signature */}
          <div className="space-y-2 flex flex-col items-center">
            <span className="font-bold uppercase text-slate-900">{t("master.commerce.publicSigning.sigPartyBHeader")}</span>
            <span className="text-[11px] text-slate-500 italic">
              {isSigned
                ? t("master.commerce.publicSigning.sigPartyBSignedCaption")
                : isRejected
                ? t("master.commerce.publicSigning.sigPartyBRejectedCaption")
                : isTerminated
                ? t("master.commerce.publicSigning.sigPartyBTerminatedCaption")
                : isExpired
                ? t("master.commerce.publicSigning.sigPartyBExpiredCaption")
                : t("master.commerce.publicSigning.sigPartyBPendingCaption")}
            </span>
            <div className="h-32 flex flex-col items-center justify-center">
              {isSigned ? (
                <div className="p-3 bg-emerald-50/90 rounded-xl border border-emerald-300 text-center w-full max-w-[260px] shadow-2xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                  <div className="text-[10px] font-bold text-emerald-900">
                    {t("master.commerce.publicSigning.sigVerifiedBadge")}
                  </div>
                  <div className="text-[9px] text-emerald-800 font-mono">
                    {t("master.commerce.publicSigning.sigSignedAt", {
                      datetime: contract.signedAt
                        ? formatDateTime(contract.signedAt, undefined, locale)
                        : t("master.commerce.contractDetailModal.signedFallback"),
                    })}
                  </div>
                  {contract.externalSignatureRequestId && (
                    <div className="text-[8px] text-slate-500 font-mono truncate">
                      ReqID: {contract.externalSignatureRequestId}
                    </div>
                  )}
                </div>
              ) : isClosedWithoutSignature ? (
                <div className="p-3 bg-rose-50/90 rounded-xl border border-rose-300 text-center w-full max-w-[260px] space-y-1">
                  <AlertCircle className="w-5 h-5 text-rose-600 mx-auto mb-1" />
                  <div className="text-[10px] font-bold text-rose-900">
                    {isRejected
                      ? t("master.commerce.publicSigning.sigRejectedBox")
                      : isTerminated
                      ? t("master.commerce.publicSigning.sigTerminatedBox")
                      : t("master.commerce.publicSigning.sigExpiredBox")}
                  </div>
                  {contract.externalSignatureRequestId && (
                    <div className="text-[8px] text-rose-700 font-mono truncate">
                      ReqID: {contract.externalSignatureRequestId}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-300 text-center w-full max-w-[260px] space-y-2 print:hidden">
                  <div className="text-[11px] font-semibold text-amber-900">
                    {t("master.commerce.publicSigning.sigCheckInboxBefore")}
                    <span className="font-mono underline">{contract.partyBEmail}</span>
                    {t("master.commerce.publicSigning.sigCheckInboxAfter")}
                  </div>
                  <button
                    onClick={handleSyncDropboxSign}
                    disabled={syncing}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] shadow-xs transition-all inline-flex items-center gap-1.5"
                  >
                    {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>{t("master.commerce.publicSigning.sigCheckStatusBtn")}</span>
                  </button>
                </div>
              )}
            </div>
            <span className="font-bold text-slate-900 mt-2">
              {contract.partyBRepresentative || t("master.commerce.publicSigning.sigRepFallback")}
            </span>
            <span className="text-[11px] text-slate-500">
              {contract.partyBPosition || t("master.commerce.publicSigning.sigPositionFallback")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
