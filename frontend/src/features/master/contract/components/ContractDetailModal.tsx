import { X, FileSignature, Send, Copy, ExternalLink, CheckCircle2, RefreshCw, Download, ShieldCheck } from "lucide-react";
import { ContractItem, contractApi } from "@/api/master/contractApi";
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

  if (!selectedContract) return null;

  const token = selectedContract.signingToken || `CTR-TOKEN-${selectedContract.id}`;
  const pdfUrl = contractApi.getPublicPdfUrl(token);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto font-sans">
        <button
          onClick={() => setSelectedContract(null)}
          aria-label={t("master.commerce.common.close")}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Document Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 mb-5 pr-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-200">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{t("master.commerce.contractDetailModal.title")}</h3>
              <span className="text-xs text-indigo-600 font-mono font-bold">{selectedContract.contractNumber}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!["SIGNED", "REJECTED", "TERMINATED"].includes(selectedContract.status) && (
              <button
                onClick={() => handleSendContract(selectedContract)}
                className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                title={t("master.commerce.contractDetailModal.sendTitle")}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t("master.commerce.contractDetailModal.sendBtn")}</span>
              </button>
            )}

            {handleSyncEsign && selectedContract.externalSignatureRequestId && !["SIGNED", "REJECTED", "TERMINATED"].includes(selectedContract.status) && (
              <button
                onClick={() => handleSyncEsign(selectedContract)}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1"
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
              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
              title={t("master.commerce.contractDetailModal.downloadPdfTitle")}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t("master.commerce.contractDetailModal.downloadPdfBtn")}</span>
            </a>

            <button
              onClick={() => handleCopySigningLink(selectedContract)}
              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
              title={t("master.commerce.contractDetailModal.copyLinkTitle")}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{t("master.commerce.contractDetailModal.copyLinkBtn")}</span>
            </button>

            <a
              href={`/contracts/sign/${token}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t("master.commerce.contractDetailModal.openSigningPageBtn")}</span>
            </a>
          </div>
        </div>

        {/* National Header Document Layout */}
        <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/50 space-y-5 text-xs text-slate-800 leading-relaxed">
          <div className="text-center pb-4 border-b border-slate-200">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-900">
              {t("master.commerce.contractDetailModal.nationalHeader")}
            </div>
            <div className="text-xs font-semibold text-slate-800 mt-0.5">{t("master.commerce.contractDetailModal.nationalMotto")}</div>
            <div className="w-24 h-0.5 bg-slate-800 mx-auto my-2" />
            <div className="text-[11px] text-slate-500 italic">
              {t("master.commerce.contractDetailModal.placeDate", {
                date: formatDate(selectedContract.createdAt, undefined, locale),
              })}
            </div>
          </div>

          <div className="text-center my-3">
            <div className="text-base font-black uppercase tracking-tight text-slate-900">
              {selectedContract.title}
            </div>
            <div className="text-xs font-mono font-bold text-indigo-700 mt-1">
              {t("master.commerce.contractDetailModal.contractNumberLine", { contractNumber: selectedContract.contractNumber })}
            </div>
          </div>

          {/* Party A & Party B */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-1">
              <div className="font-bold text-indigo-900 uppercase">{t("master.commerce.contractDetailModal.partyAHeader")}</div>
              <div><span className="font-semibold">{t("master.commerce.contractDetailModal.companyLabel")} </span>{selectedContract.partyAName || t("master.commerce.contractDetailModal.partyAFallbackName")}</div>
              <div><span className="font-semibold">{t("master.commerce.contractDetailModal.taxCodeLabel")} </span><span className="font-mono font-bold">{selectedContract.partyATaxCode || "0110889988"}</span></div>
              <div><span className="font-semibold">{t("master.commerce.contractDetailModal.repLabel")} </span>{selectedContract.partyARepresentative || "Phan Nhật Hưng"} ({selectedContract.partyAPosition || t("master.commerce.contractDetailModal.partyAFallbackPosition")})</div>
              <div><span className="font-semibold">{t("master.commerce.contractDetailModal.bankAccountLabel")} </span><span className="font-mono font-bold">{selectedContract.partyABankAccount || "190388889999"}</span> - Techcombank</div>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900 uppercase">{t("master.commerce.contractDetailModal.partyBHeader")}</div>
              <div><span className="font-semibold">{t("master.commerce.contractDetailModal.companyLabel")} </span><span className="font-bold">{selectedContract.partyBName || selectedContract.tenantName || t("master.commerce.contractDetailModal.partyBFallbackName")}</span></div>
              <div><span className="font-semibold">{t("master.commerce.contractDetailModal.taxCodeLabel")} </span><span className="font-mono font-bold text-slate-900">{selectedContract.partyBTaxCode || t("master.commerce.contractDetailModal.taxCodeUpdating")}</span></div>
              <div><span className="font-semibold">{t("master.commerce.contractDetailModal.repLabel")} </span>{selectedContract.partyBRepresentative || t("master.commerce.contractDetailModal.repFallback")} ({selectedContract.partyBPosition || t("master.commerce.contractDetailModal.partyBFallbackPosition")})</div>
              <div><span className="font-semibold">{t("master.commerce.contractDetailModal.emailLabel")} </span><span className="font-mono text-indigo-700">{selectedContract.partyBEmail || "email@company.com"}</span></div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-1.5 text-[11px]">
            <div className="font-bold text-slate-900 uppercase">{t("master.commerce.contractDetailModal.financialHeader")}</div>
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-500">{t("master.commerce.contractDetailModal.totalContractValueLabel")}</span>
              <span className="font-bold text-emerald-600 text-sm">{formatNumber(selectedContract.totalAmount || selectedContract.contractValue, undefined, locale)} ₫</span>
            </div>
            {selectedContract.amountInWords && (
              <div className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-100">
                {t("master.commerce.contractDetailModal.amountInWords", { words: selectedContract.amountInWords })}
              </div>
            )}
          </div>

          {/* Dropbox Sign / Cryptographic Integrity Metadata */}
          {(selectedContract.externalSignatureRequestId || selectedContract.documentChecksum) && (
            <div className="bg-indigo-50/70 p-3.5 rounded-lg border border-indigo-200 space-y-1 text-[11px]">
              <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>{t("master.commerce.contractDetailModal.cryptoTitle")}</span>
              </div>
              {selectedContract.externalSignatureRequestId && (
                <div>
                  <span className="font-semibold text-slate-600">{t("master.commerce.contractDetailModal.requestIdLabel")} </span>
                  <span className="font-mono font-bold text-indigo-900">{selectedContract.externalSignatureRequestId}</span>
                </div>
              )}
              {selectedContract.documentChecksum && (
                <div className="break-all">
                  <span className="font-semibold text-slate-600">{t("master.commerce.contractDetailModal.checksumLabel")} </span>
                  <span className="font-mono text-slate-800">{selectedContract.documentChecksum}</span>
                </div>
              )}
            </div>
          )}

          {/* Digital Signature Certificate Section */}
          {selectedContract.status === "SIGNED" && (
            <div className="bg-emerald-50/80 p-3.5 rounded-lg border border-emerald-300 space-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{t("master.commerce.contractDetailModal.certTitle")}</span>
              </div>
              <div className="grid grid-cols-1 gap-2 text-emerald-800 sm:grid-cols-2">
                <div>{t("master.commerce.contractDetailModal.methodLabel")} <span className="font-semibold">{selectedContract.signMethod}</span></div>
                <div>{t("master.commerce.contractDetailModal.timeLabel")} <span className="font-mono font-semibold">{selectedContract.signedAt ? formatDateTime(selectedContract.signedAt, undefined, locale) : t("master.commerce.contractDetailModal.signedFallback")}</span></div>
              </div>
              {selectedContract.signatures && selectedContract.signatures.length > 0 && (
                <div className="mt-2 pt-2 border-t border-emerald-200/50">
                  <div className="font-semibold text-emerald-900 mb-1.5">{t("master.commerce.contractDetailModal.auditTrailLabel")}</div>
                  <div className="space-y-1.5">
                    {selectedContract.signatures.map((sig: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-white/60 p-1.5 rounded border border-emerald-100">
                        <div>
                          <span className="font-bold">{sig.signerName || t("master.commerce.contractDetailModal.signerFallback")}</span>
                          <span className="text-emerald-700 ml-1">({sig.signerTitle || sig.signerEmail || t("master.commerce.contractDetailModal.partyBFallback")})</span>
                        </div>
                        <div className="font-mono text-[10px] text-emerald-600 flex flex-col items-end">
                          <span>{sig.signedAt ? formatDateTime(sig.signedAt, undefined, locale) : sig.status}</span>
                          {sig.externalSignatureId && <span className="text-[9px] opacity-70">SigID: {sig.externalSignatureId}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-200">
          <button
            onClick={() => setSelectedContract(null)}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
          >
            {t("master.commerce.common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
