import React, { useState } from "react";
import { X, PhoneCall, FileText, Loader2, Send, CheckCircle2 } from "lucide-react";
import { consultationApi } from "@/api/master/consultationApi";
import { t as globalT, useT } from "@/i18n";
import { useLandingModal } from "../../context/LandingModalContext";

interface DemoRequestForm {
  companyName: string;
  contactName: string;
  jobTitle: string;
  workEmail: string;
  phoneNumber: string;
  companySize: string;
  primaryNeed: string;
  notes: string;
}

export function DemoModal() {
  const t = useT();
  const { showDemoModal, closeDemoModal, selectedTier, requestType, openDemoModal } = useLandingModal();

  const [formData, setFormData] = useState<DemoRequestForm>({
    companyName: "",
    contactName: "",
    jobTitle: "",
    workEmail: "",
    phoneNumber: "",
    companySize: "100-500",
    primaryNeed: globalT("master.landingChrome.modals.demo.defaultNeed"),
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  if (!showDemoModal) return null;

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await consultationApi.submit({
        companyName: formData.companyName,
        contactName: formData.contactName,
        jobTitle: formData.jobTitle,
        workEmail: formData.workEmail,
        phoneNumber: formData.phoneNumber,
        companySize: formData.companySize,
        requestType: requestType,
        planTier: selectedTier,
        primaryNeed: formData.primaryNeed,
        notes: formData.notes,
      });
      setDemoSubmitted(true);
    } catch (err: any) {
      if (err?.response?.data?.errors && typeof err.response.data.errors === "object") {
        const firstErrMsg = Object.values(err.response.data.errors)[0] as string;
        setSubmitError(firstErrMsg || err.response.data.message || t("master.landingChrome.modals.demo.invalidData"));
      } else if (err?.response?.data?.message) {
        setSubmitError(err.response.data.message);
      } else if (err?.message === "Network Error" || !err?.response) {
        setSubmitError(t("master.landingChrome.modals.demo.backendError"));
      } else {
        setSubmitError(t("master.landingChrome.modals.demo.submitFailed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setDemoSubmitted(false);
    setSubmitError(null);
    closeDemoModal();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-lg w-full text-left shadow-2xl relative my-8">
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"
          aria-label={t("master.landingChrome.modals.closeWindowAria")}
        >
          <X className="w-5 h-5" />
        </button>

        {!demoSubmitted ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold">
                {requestType === "DEMO" ? <PhoneCall className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {requestType === "DEMO"
                    ? t("master.landingChrome.modals.demo.demoTitle")
                    : t("master.landingChrome.modals.demo.quoteTitle")}
                </h3>
                <span className="text-xs font-medium text-blue-600">{selectedTier}</span>
              </div>
            </div>

            {/* Switch between Demo and Contract quote */}
            <div className="flex rounded-lg bg-slate-100 p-1 mb-5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => openDemoModal(selectedTier, "DEMO")}
                className={`flex-1 py-1.5 rounded-md transition-all ${
                  requestType === "DEMO" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t("master.landingChrome.modals.demo.demoTab")}
              </button>
              <button
                type="button"
                onClick={() => openDemoModal(selectedTier, "CONTRACT_QUOTE")}
                className={`flex-1 py-1.5 rounded-md transition-all ${
                  requestType === "CONTRACT_QUOTE"
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t("master.landingChrome.modals.demo.quoteTab")}
              </button>
            </div>

            {submitError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                {submitError}
              </div>
            )}

            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              {requestType === "DEMO"
                ? t("master.landingChrome.modals.demo.demoDesc")
                : t("master.landingChrome.modals.demo.quoteDesc")}
            </p>

            <form onSubmit={handleDemoSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  {t("master.landingChrome.modals.demo.companyLabel")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t("master.landingChrome.modals.demo.companyPlaceholder")}
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1">
                    {t("master.landingChrome.modals.demo.contactNameLabel")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t("master.landingChrome.modals.demo.contactNamePlaceholder")}
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1">
                    {t("master.landingChrome.modals.demo.jobTitleLabel")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t("master.landingChrome.modals.demo.jobTitlePlaceholder")}
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1">
                    {t("master.landingChrome.modals.demo.workEmailLabel")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder={t("master.landingChrome.modals.demo.workEmailPlaceholder")}
                    value={formData.workEmail}
                    onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1">
                    {t("master.landingChrome.modals.demo.phoneLabel")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder={t("master.landingChrome.modals.demo.phonePlaceholder")}
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  {t("master.landingChrome.modals.demo.companySizeLabel")}
                </label>
                <select
                  value={formData.companySize}
                  onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none transition-colors"
                >
                  <option value="50-100">{t("master.landingChrome.modals.demo.sizeUnder100")}</option>
                  <option value="100-500">{t("master.landingChrome.modals.demo.size100To500")}</option>
                  <option value="500-2000">{t("master.landingChrome.modals.demo.size500To2000")}</option>
                  <option value="2000+">{t("master.landingChrome.modals.demo.size2000Plus")}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  {t("master.landingChrome.modals.demo.notesLabel")}
                </label>
                <textarea
                  rows={2}
                  placeholder={t("master.landingChrome.modals.demo.notesPlaceholder")}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t("master.landingChrome.modals.demo.submitting")}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {requestType === "DEMO"
                        ? t("master.landingChrome.modals.demo.submitDemo")
                        : t("master.landingChrome.modals.demo.submitQuote")}
                    </span>
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-6 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              {t("master.landingChrome.modals.demo.receivedTitle")}
            </h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              {t("master.landingChrome.modals.demo.receivedDescBefore")} <strong>{formData.companyName}</strong>
              {t("master.landingChrome.modals.demo.receivedDescMiddle")} <strong>{formData.workEmail}</strong>{" "}
              {t("master.landingChrome.modals.demo.receivedDescAnd")} <strong>{formData.phoneNumber}</strong>{" "}
              {t("master.landingChrome.modals.demo.receivedDescAfter")}
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              {t("master.landingChrome.modals.demo.closeBtn")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
