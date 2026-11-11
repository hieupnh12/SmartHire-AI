import { useState } from "react";
import { X, Check } from "lucide-react";
import { useT } from "@/i18n";

export type LegalPolicyTab = "TOS" | "PRIVACY_ND13";

interface LegalPolicyModalProps {
  openTab: LegalPolicyTab | null;
  policyVersion?: string;
  onClose: () => void;
  onSwitchTab: (tab: LegalPolicyTab) => void;
  isAccepted?: boolean;
  onAcceptChange?: (accepted: boolean) => void;
  inline?: boolean;
}

export function LegalPolicyModal({
  openTab,
  policyVersion = "15/06/2026",
  onClose,
  onSwitchTab,
  isAccepted = false,
  onAcceptChange,
  inline = false,
}: LegalPolicyModalProps) {
  const t = useT();
  const [internalAccepted, setInternalAccepted] = useState<boolean>(isAccepted);

  if (!openTab) return null;

  const currentAccepted = onAcceptChange ? isAccepted : internalAccepted;

  const handleToggleConsent = (checked: boolean) => {
    setInternalAccepted(checked);
    if (onAcceptChange) {
      onAcceptChange(checked);
    }
  };

  const handleConfirm = () => {
    if (!currentAccepted && onAcceptChange) {
      onAcceptChange(true);
    }
    onClose();
  };

  const modalContent = (
    <div
      className={`bg-white rounded-2xl shadow-2xl border border-slate-200/90 max-w-4xl w-full flex flex-col overflow-hidden ${
        inline ? "h-[calc(100vh-85px)] shadow-md" : "h-[88vh] max-h-[850px] animate-fade-in"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Header Tab Navigation */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 pt-2 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-1 sm:gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => onSwitchTab("PRIVACY_ND13")}
            className={`pb-3.5 pt-3 text-sm sm:text-base font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              openTab === "PRIVACY_ND13"
                ? "text-blue-600 border-blue-600"
                : "text-slate-600 hover:text-slate-900 border-transparent"
            }`}
          >
            {t("master.commerce.legalPolicyModal.tabPrivacy")}
          </button>

          <button
            type="button"
            onClick={() => onSwitchTab("TOS")}
            className={`pb-3.5 pt-3 text-sm sm:text-base font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              openTab === "TOS"
                ? "text-blue-600 border-blue-600"
                : "text-slate-600 hover:text-slate-900 border-transparent"
            }`}
          >
            {t("master.commerce.legalPolicyModal.tabTos")}
          </button>
        </div>

        {/* Close Button X */}
        {!inline && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title={t("master.commerce.legalPolicyModal.closeTitle")}
            aria-label={t("master.commerce.legalPolicyModal.closeTitle")}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. Modal Body: Document Container Box with Times New Roman font */}
      <div className="p-3 sm:p-6 bg-slate-50/60 flex-1 overflow-hidden flex flex-col">
        <div
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
          className="bg-white border border-slate-200/90 rounded-xl p-5 sm:p-8 overflow-y-auto flex-1 shadow-2xs select-text text-black text-[14.5px] sm:text-[15px] leading-[1.7] custom-scrollbar"
        >
          {openTab === "PRIVACY_ND13" ? (
            <div className="space-y-4">
              <div className="text-right text-xs text-slate-700 italic pb-1">
                {t("master.commerce.legalPolicyModal.updatedVersion", { version: policyVersion })}
              </div>

              <div className="text-center space-y-1 mb-6">
                <h1 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-black">
                  {t("master.commerce.legalPolicyModal.privacy.docTitle")}
                </h1>
                <p className="text-[14px] font-bold text-slate-900">
                  {t("master.commerce.legalPolicyModal.privacy.docAudience")}
                </p>
                <p className="text-[12.5px] italic text-slate-600">
                  {t("master.commerce.legalPolicyModal.privacy.docBasis")}
                </p>
              </div>

              <p className="text-justify indent-6">
                {t("master.commerce.legalPolicyModal.privacy.p1Before")}
                <strong>{t("master.commerce.legalPolicyModal.privacy.p1PolicyTerm")}</strong>
                {t("master.commerce.legalPolicyModal.privacy.p1Mid1")}
                <strong>{t("master.commerce.legalPolicyModal.privacy.p1Company")}</strong>
                {t("master.commerce.legalPolicyModal.privacy.p1Mid2")}
                <strong>{t("master.commerce.legalPolicyModal.privacy.p1Brand")}</strong>
                {t("master.commerce.legalPolicyModal.privacy.p1After")}
              </p>

              <p className="text-justify indent-6">
                {t("master.commerce.legalPolicyModal.privacy.p2")}
              </p>

              <div className="space-y-2 pt-2">
                <h2 className="font-bold text-[15px] uppercase text-black">
                  {t("master.commerce.legalPolicyModal.privacy.s1Title")}
                </h2>
                <p className="text-justify indent-6">
                  <strong>{t("master.commerce.legalPolicyModal.privacy.s1_1Title")}</strong>{" "}
                  {t("master.commerce.legalPolicyModal.privacy.s1_1Body")}
                </p>
                <p className="text-justify indent-6">
                  <strong>{t("master.commerce.legalPolicyModal.privacy.s1_2Title")}</strong>{" "}
                  {t("master.commerce.legalPolicyModal.privacy.s1_2Body")}
                </p>
                <p className="text-justify indent-6">
                  <strong>{t("master.commerce.legalPolicyModal.privacy.s1_3Title")}</strong>{" "}
                  {t("master.commerce.legalPolicyModal.privacy.s1_3Body")}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h2 className="font-bold text-[15px] uppercase text-black">
                  {t("master.commerce.legalPolicyModal.privacy.s2Title")}
                </h2>
                <p className="text-justify indent-6">
                  <strong>{t("master.commerce.legalPolicyModal.privacy.s2_1Title")}</strong>{" "}
                  {t("master.commerce.legalPolicyModal.privacy.s2_1Body")}
                </p>
                <p className="text-justify indent-6">
                  <strong>{t("master.commerce.legalPolicyModal.privacy.s2_2Title")}</strong>{" "}
                  {t("master.commerce.legalPolicyModal.privacy.s2_2Body")}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h2 className="font-bold text-[15px] uppercase text-black">
                  {t("master.commerce.legalPolicyModal.privacy.s3Title")}
                </h2>
                <p className="text-justify indent-6">
                  <strong>{t("master.commerce.legalPolicyModal.privacy.s3_1Title")}</strong>{" "}
                  {t("master.commerce.legalPolicyModal.privacy.s3_1Body")}
                </p>
                <p className="text-justify indent-6">
                  <strong>{t("master.commerce.legalPolicyModal.privacy.s3_2Title")}</strong>{" "}
                  {t("master.commerce.legalPolicyModal.privacy.s3_2Body")}
                </p>
                <p className="text-justify indent-6">
                  <strong>{t("master.commerce.legalPolicyModal.privacy.s3_3Title")}</strong>{" "}
                  {t("master.commerce.legalPolicyModal.privacy.s3_3Body")}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h2 className="font-bold text-[15px] uppercase text-black">
                  {t("master.commerce.legalPolicyModal.privacy.s4Title")}
                </h2>
                <p className="text-justify indent-6">
                  {t("master.commerce.legalPolicyModal.privacy.s4Before")}
                  <strong>privacy@smarthire.top</strong>
                  {t("master.commerce.legalPolicyModal.privacy.s4After")}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-right text-xs text-slate-700 italic pb-1">
                {t("master.commerce.legalPolicyModal.updatedVersion", { version: policyVersion })}
              </div>

              <div className="text-center space-y-1 mb-6">
                <h1 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-black">
                  {t("master.commerce.legalPolicyModal.tos.docTitle")}
                </h1>
                <p className="text-[14px] font-bold text-slate-900">
                  {t("master.commerce.legalPolicyModal.tos.docAudience")}
                </p>
                <p className="text-[12.5px] italic text-slate-600">
                  {t("master.commerce.legalPolicyModal.tos.docBasis")}
                </p>
              </div>

              <p className="text-justify indent-6">
                {t("master.commerce.legalPolicyModal.tos.p1Before")}
                <strong>{t("master.commerce.legalPolicyModal.tos.p1AgreementTerm")}</strong>
                {t("master.commerce.legalPolicyModal.tos.p1Mid1")}
                <strong>{t("master.commerce.legalPolicyModal.tos.p1Company")}</strong>
                {t("master.commerce.legalPolicyModal.tos.p1Mid2")}
                <strong>{t("master.commerce.legalPolicyModal.tos.p1Brand")}</strong>
                {t("master.commerce.legalPolicyModal.tos.p1Mid3")}
                <strong>{t("master.commerce.legalPolicyModal.tos.p1CustomerType")}</strong>
                {t("master.commerce.legalPolicyModal.tos.p1Mid4")}
                <strong>{t("master.commerce.legalPolicyModal.tos.p1CustomerTerm")}</strong>
                {t("master.commerce.legalPolicyModal.tos.p1After")}
              </p>

              <div className="space-y-2 pt-2">
                <h2 className="font-bold text-[15px] uppercase text-black">
                  {t("master.commerce.legalPolicyModal.tos.s1Title")}
                </h2>
                <p className="text-justify indent-6">
                  <strong>{t("master.commerce.legalPolicyModal.tos.s1_1Title")}</strong>{" "}
                  {t("master.commerce.legalPolicyModal.tos.s1_1Body")}
                </p>
                <p className="text-justify indent-6">
                  <strong>{t("master.commerce.legalPolicyModal.tos.s1_2Title")}</strong>{" "}
                  {t("master.commerce.legalPolicyModal.tos.s1_2Body")}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h2 className="font-bold text-[15px] uppercase text-black">
                  {t("master.commerce.legalPolicyModal.tos.s2Title")}
                </h2>
                <p className="text-justify indent-6">
                  <strong>{t("master.commerce.legalPolicyModal.tos.s2_1Title")}</strong>{" "}
                  {t("master.commerce.legalPolicyModal.tos.s2_1Body")}
                </p>
                <p className="text-justify indent-6">
                  <strong>{t("master.commerce.legalPolicyModal.tos.s2_2Title")}</strong>{" "}
                  {t("master.commerce.legalPolicyModal.tos.s2_2Body")}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h2 className="font-bold text-[15px] uppercase text-black">
                  {t("master.commerce.legalPolicyModal.tos.s3Title")}
                </h2>
                <p className="text-justify indent-6">
                  <strong>{t("master.commerce.legalPolicyModal.tos.s3_1Title")}</strong>{" "}
                  {t("master.commerce.legalPolicyModal.tos.s3_1Body")}
                </p>
                <p className="text-justify indent-6">
                  <strong>{t("master.commerce.legalPolicyModal.tos.s3_2Title")}</strong>{" "}
                  {t("master.commerce.legalPolicyModal.tos.s3_2Body")}
                </p>
                <p className="text-justify indent-6">
                  <strong>{t("master.commerce.legalPolicyModal.tos.s3_3Title")}</strong>{" "}
                  {t("master.commerce.legalPolicyModal.tos.s3_3Body")}
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h2 className="font-bold text-[15px] uppercase text-black">
                  {t("master.commerce.legalPolicyModal.tos.s4Title")}
                </h2>
                <p className="text-justify indent-6">
                  <strong>{t("master.commerce.legalPolicyModal.tos.s4_1Title")}</strong>{" "}
                  {t("master.commerce.legalPolicyModal.tos.s4_1Before")}
                  <em>{t("master.commerce.legalPolicyModal.tos.s4_1Quote")}</em>
                  {t("master.commerce.legalPolicyModal.tos.s4_1After")}
                </p>
                <p className="text-justify indent-6">
                  <strong>{t("master.commerce.legalPolicyModal.tos.s4_2Title")}</strong>{" "}
                  {t("master.commerce.legalPolicyModal.tos.s4_2Body")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Modal Footer */}
      <div className="px-4 sm:px-6 py-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={currentAccepted}
            onChange={(e) => handleToggleConsent(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 accent-blue-600 cursor-pointer"
          />
          <span className="text-xs sm:text-sm text-slate-800 font-medium leading-snug">
            {t("master.commerce.legalPolicyModal.consentCheckbox")}
          </span>
        </label>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{t("master.commerce.legalPolicyModal.acceptAndClose")}</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (inline) {
    return modalContent;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      {modalContent}
    </div>
  );
}

export default LegalPolicyModal;
