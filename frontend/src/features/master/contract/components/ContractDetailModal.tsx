import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  FileSignature,
  Send,
  Copy,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Download,
  ShieldCheck,
} from "lucide-react";
import { ContractItem, contractApi } from "@/api/master/contractApi";
import { LEGAL_POLICY_META } from "@/config/legalConfig";
import { PAYMENT_BANK_INFO } from "@/config/paymentConfig";
import { formatDate, formatDateTime, formatNumber, useLocale, useT } from "@/i18n";

interface ContractDetailModalProps {
  selectedContract: ContractItem | null;
  setSelectedContract: (val: ContractItem | null) => void;
  handleSendContract: (contract: ContractItem) => void;
  handleCopySigningLink: (contract: ContractItem) => void;
  handleSyncEsign?: (contract: ContractItem) => void;
}

export function ContractDetailModal({
  selectedContract,
  setSelectedContract,
  handleSendContract,
  handleCopySigningLink,
  handleSyncEsign,
}: ContractDetailModalProps) {
  const t = useT();
  const locale = useLocale();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedContract(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setSelectedContract]);

  if (!selectedContract) return null;

  const token = selectedContract.signingToken || `CTR-TOKEN-${selectedContract.id}`;
  const pdfUrl = contractApi.getPublicPdfUrl(token);

  const cleanAmountInWords = (words?: string | null): string => {
    if (!words) return "";
    return words
      .replace(/\s*\(?đã bao gồm thuế GTGT\)?/gi, "")
      .replace(/\s*\(?đã bao gồm VAT\)?/gi, "")
      .replace(/\s*\(?bao gồm thuế GTGT\)?/gi, "")
      .replace(/\s*\(?bao gồm VAT\)?/gi, "")
      .trim();
  };

  const isOldPartyA =
    !selectedContract.partyATaxCode ||
    selectedContract.partyATaxCode === "0110889988" ||
    selectedContract.partyABankAccount === "190388889999" ||
    selectedContract.partyARepresentative === "Phan Nhật Hưng";

  const providerTaxCode = isOldPartyA ? LEGAL_POLICY_META.taxCode : selectedContract.partyATaxCode;
  const providerRepresentative =
    !selectedContract.partyARepresentative || selectedContract.partyARepresentative === "Phan Nhật Hưng"
      ? LEGAL_POLICY_META.representative
      : selectedContract.partyARepresentative;
  const providerBankAccount = isOldPartyA
    ? PAYMENT_BANK_INFO.accountNumber
    : selectedContract.partyABankAccount || PAYMENT_BANK_INFO.accountNumber;
  const providerBankName = isOldPartyA
    ? PAYMENT_BANK_INFO.shortName
    : selectedContract.partyABankName || PAYMENT_BANK_INFO.shortName;
  const providerBankBranch = isOldPartyA
    ? (PAYMENT_BANK_INFO.branch || t("master.commerce.publicSigning.partyADefaultBankBranch"))
    : (selectedContract.partyABankBranch || t("master.commerce.publicSigning.partyADefaultBankBranch"));

  return createPortal(
    <>
      {/* Backdrop overlay */}
      <button
        type="button"
        className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        onClick={() => setSelectedContract(null)}
        aria-label={t("master.commerce.common.close")}
      />

      {/* Side Panel Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t("master.commerce.contractDetailModal.title")}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl lg:max-w-3xl overflow-y-auto bg-slate-50 p-6 shadow-2xl flex flex-col justify-between font-sans antialiased text-slate-800"
      >
        <div>
          {/* Header Banner */}
          <div className="flex items-start justify-between border-b border-slate-200 bg-white -mx-6 -mt-6 px-6 pt-3.5 pb-3.5 mb-5 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-200 shrink-0">
                <FileSignature className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  {t("master.commerce.contractDetailModal.title")}
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-600 tracking-wide">
                  {selectedContract.contractNumber}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedContract(null)}
                className="grid size-8 place-items-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                aria-label={t("master.commerce.common.close")}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 mb-5 p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              {!["SIGNED", "REJECTED", "TERMINATED"].includes(selectedContract.status) && (
                <button
                  type="button"
                  onClick={() => handleSendContract(selectedContract)}
                  className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title={t("master.commerce.contractDetailModal.sendTitle")}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{t("master.commerce.contractDetailModal.sendBtn")}</span>
                </button>
              )}

              {handleSyncEsign && selectedContract.externalSignatureRequestId && !["SIGNED", "REJECTED", "TERMINATED"].includes(selectedContract.status) && (
                <button
                  type="button"
                  onClick={() => handleSyncEsign(selectedContract)}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title={t("master.commerce.contractDetailModal.syncTitle")}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t("master.commerce.contractDetailModal.syncBtn")}</span>
                </button>
              )}

              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                title={t("master.commerce.contractDetailModal.downloadPdfTitle")}
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t("master.commerce.contractDetailModal.downloadPdfBtn")}</span>
              </a>

              <button
                type="button"
                onClick={() => handleCopySigningLink(selectedContract)}
                className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                title={t("master.commerce.contractDetailModal.copyLinkTitle")}
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{t("master.commerce.contractDetailModal.copyLinkBtn")}</span>
              </button>
            </div>

            <a
              href={`/contracts/sign/${token}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t("master.commerce.contractDetailModal.openSigningPageBtn")}</span>
            </a>
          </div>

          {/* National Document Content Box */}
          <div className="border border-slate-200/90 rounded-2xl p-6 sm:p-7 bg-white shadow-xs space-y-6 text-xs sm:text-[13px] text-slate-800 leading-relaxed font-sans">
            <div className="text-center pb-4 border-b border-slate-200">
              <div className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-900">
                {t("master.commerce.contractDetailModal.nationalHeader")}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-slate-800 mt-1">{t("master.commerce.contractDetailModal.nationalMotto")}</div>
              <div className="w-24 h-0.5 bg-slate-800 mx-auto my-2.5" />
              <div className="text-xs text-slate-500 italic">
                {t("master.commerce.contractDetailModal.placeDate", {
                  city: LEGAL_POLICY_META.city,
                  date: formatDate(selectedContract.createdAt, undefined, locale),
                })}
              </div>
            </div>

            <div className="text-center my-4">
              <div className="text-base sm:text-lg font-bold uppercase tracking-tight text-slate-900">
                {selectedContract.title}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-slate-700 mt-1.5 tracking-wide">
                {t("master.commerce.contractDetailModal.contractNumberLine", { contractNumber: selectedContract.contractNumber })}
              </div>
            </div>

            {/* Party A & Party B */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 text-xs sm:text-[13px]">
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/90 space-y-3 shadow-2xs">
                <div className="font-bold text-slate-900 uppercase text-xs sm:text-[13px] tracking-wider pb-2 border-b border-slate-200/80">
                  {t("master.commerce.contractDetailModal.partyAHeader")}
                </div>
                <div className="leading-relaxed">
                  <span className="font-semibold text-slate-600">{t("master.commerce.contractDetailModal.companyLabel")} </span>
                  <span className="font-medium text-slate-900">{selectedContract.partyAName || LEGAL_POLICY_META.companyName}</span>
                </div>
                <div className="leading-relaxed">
                  <span className="font-semibold text-slate-600">{t("master.commerce.contractDetailModal.taxCodeLabel")} </span>
                  <span className="font-semibold text-slate-900 tracking-wide">{providerTaxCode}</span>
                </div>
                <div className="leading-relaxed">
                  <span className="font-semibold text-slate-600">{t("master.commerce.contractDetailModal.repLabel")} </span>
                  <span className="text-slate-900 font-medium">{providerRepresentative}</span>
                </div>
                <div className="leading-relaxed">
                  <span className="font-semibold text-slate-600">{t("master.commerce.contractDetailModal.bankAccountLabel")} </span>
                  <span className="font-semibold text-slate-900">{providerBankAccount}</span>
                  {" "}-{" "}
                  <span className="text-slate-800">{providerBankName}</span>{" "}
                  <span className="text-slate-600">({providerBankBranch})</span>
                </div>
              </div>

              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/90 space-y-3 shadow-2xs">
                <div className="font-bold text-slate-900 uppercase text-xs sm:text-[13px] tracking-wider pb-2 border-b border-slate-200/80">
                  {t("master.commerce.contractDetailModal.partyBHeader")}
                </div>
                <div className="leading-relaxed">
                  <span className="font-semibold text-slate-600">{t("master.commerce.contractDetailModal.companyLabel")} </span>
                  <span className="font-semibold text-slate-900">{selectedContract.partyBName || selectedContract.tenantName || t("master.commerce.contractDetailModal.partyBFallbackName")}</span>
                </div>
                <div className="leading-relaxed">
                  <span className="font-semibold text-slate-600">{t("master.commerce.contractDetailModal.taxCodeLabel")} </span>
                  <span className="font-semibold text-slate-900 tracking-wide">{selectedContract.partyBTaxCode || t("master.commerce.contractDetailModal.taxCodeUpdating")}</span>
                </div>
                <div className="leading-relaxed">
                  <span className="font-semibold text-slate-600">{t("master.commerce.contractDetailModal.repLabel")} </span>
                  <span className="text-slate-900 font-medium">{selectedContract.partyBRepresentative || t("master.commerce.contractDetailModal.repFallback")}</span>{" "}
                  <span className="text-slate-600">({selectedContract.partyBPosition || t("master.commerce.contractDetailModal.partyBFallbackPosition")})</span>
                </div>
                <div className="leading-relaxed">
                  <span className="font-semibold text-slate-600">{t("master.commerce.contractDetailModal.emailLabel")} </span>
                  <span className="font-medium text-slate-900">{selectedContract.partyBEmail || "email@company.com"}</span>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/90 space-y-2.5 text-xs sm:text-[13px] shadow-2xs">
              <div className="font-bold text-slate-900 uppercase text-xs tracking-wider pb-1.5 border-b border-slate-200/80">
                {t("master.commerce.contractDetailModal.financialHeader")}
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-600 font-medium">{t("master.commerce.contractDetailModal.totalContractValueLabel")}</span>
                <span className="font-bold text-emerald-600 text-lg sm:text-xl">{formatNumber(selectedContract.totalAmount || selectedContract.contractValue, undefined, locale)}&nbsp;₫</span>
              </div>
              {cleanAmountInWords(selectedContract.amountInWords) && (
                <div className="text-xs text-slate-600 italic pt-2 border-t border-slate-200/80 leading-relaxed">
                  {t("master.commerce.contractDetailModal.amountInWords", {
                    words: cleanAmountInWords(selectedContract.amountInWords),
                  })}
                </div>
              )}
            </div>

            {/* Dropbox Sign / Cryptographic Integrity Metadata */}
            {(selectedContract.externalSignatureRequestId || selectedContract.documentChecksum) && (
              <div className="bg-indigo-50/70 p-5 rounded-2xl border border-indigo-200/90 space-y-2.5 text-xs sm:text-[13px] shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-indigo-950 text-xs sm:text-[13px] tracking-wide pb-1.5 border-b border-indigo-100">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{t("master.commerce.contractDetailModal.cryptoTitle")}</span>
                </div>
                {selectedContract.externalSignatureRequestId && (
                  <div className="leading-relaxed">
                    <span className="font-semibold text-slate-600">{t("master.commerce.contractDetailModal.requestIdLabel")} </span>
                    <span className="font-semibold text-indigo-900">{selectedContract.externalSignatureRequestId}</span>
                  </div>
                )}
                {selectedContract.documentChecksum && (
                  <div className="break-all leading-relaxed">
                    <span className="font-semibold text-slate-600">{t("master.commerce.contractDetailModal.checksumLabel")} </span>
                    <span className="font-medium text-slate-800">{selectedContract.documentChecksum}</span>
                  </div>
                )}
              </div>
            )}

            {/* Digital Signature Certificate Section */}
            {selectedContract.status === "SIGNED" && (
              <div className="bg-emerald-50/80 p-5 rounded-2xl border border-emerald-300 space-y-3 text-xs sm:text-[13px] shadow-2xs">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs sm:text-[13px] pb-1.5 border-b border-emerald-200/60">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t("master.commerce.contractDetailModal.certTitle")}</span>
                </div>
                <div className="grid grid-cols-1 gap-2.5 text-emerald-800 sm:grid-cols-2 leading-relaxed">
                  <div>{t("master.commerce.contractDetailModal.methodLabel")} <span className="font-semibold">{selectedContract.signMethod}</span></div>
                  <div>{t("master.commerce.contractDetailModal.timeLabel")} <span className="font-semibold">{selectedContract.signedAt ? formatDateTime(selectedContract.signedAt, undefined, locale) : t("master.commerce.contractDetailModal.signedFallback")}</span></div>
                </div>
                {selectedContract.signatures && selectedContract.signatures.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-emerald-200/60">
                    <div className="font-semibold text-emerald-900 mb-2">{t("master.commerce.contractDetailModal.auditTrailLabel")}</div>
                    <div className="space-y-2">
                      {selectedContract.signatures.map((sig: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                          <div>
                            <span className="font-bold text-slate-900">{sig.signerName || t("master.commerce.contractDetailModal.signerFallback")}</span>
                            <span className="text-slate-600 ml-1.5">({sig.signerTitle || sig.signerEmail || t("master.commerce.contractDetailModal.partyBFallback")})</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex flex-col items-end">
                            <span className="font-medium">{sig.signedAt ? formatDateTime(sig.signedAt, undefined, locale) : sig.status}</span>
                            {sig.externalSignatureId && <span className="text-[10px] opacity-75">SigID: {sig.externalSignatureId}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => setSelectedContract(null)}
            className="px-5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors shadow-2xs"
          >
            {t("master.commerce.common.close")}
          </button>
        </div>
      </aside>
    </>,
    document.body
  );
}
