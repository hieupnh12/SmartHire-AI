import React from "react";
import { X, PhoneCall, Loader2, Check, Calculator } from "lucide-react";
import { ConsultationResponse } from "@/api/master/consultationApi";
import { useT, useLocale, formatDateTime } from "@/i18n";

interface LeadDetailModalProps {
  selectedLead: ConsultationResponse | null;
  setSelectedLead: (lead: ConsultationResponse | null) => void;
  leadStatusEdit: string;
  setLeadStatusEdit: (val: "PENDING" | "CONTACTED" | "QUOTED" | "PROVISIONED" | "REJECTED") => void;
  leadNotesEdit: string;
  setLeadNotesEdit: (val: string) => void;
  updatingLead: boolean;
  handleSaveLeadModal: (e: React.FormEvent) => void;
  handleProvisionFromLead: (lead: ConsultationResponse) => void;
}

export function LeadDetailModal({
  selectedLead,
  setSelectedLead,
  leadStatusEdit,
  setLeadStatusEdit,
  leadNotesEdit,
  setLeadNotesEdit,
  updatingLead,
  handleSaveLeadModal,
  handleProvisionFromLead,
}: LeadDetailModalProps) {
  const t = useT();
  const locale = useLocale();
  if (!selectedLead) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={() => setSelectedLead(null)}
          aria-label={t("master.ops.leads.modal.closeAria")}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-200">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{selectedLead.companyName}</h3>
            <span className="text-xs text-slate-500">
              {selectedLead.requestType === "CONTRACT_QUOTE"
                ? t("master.ops.leads.modal.typeContractQuote")
                : t("master.ops.leads.modal.typeDemo")}{" "}
              · {t("master.ops.leads.modal.leadId", { id: selectedLead.id })}
            </span>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl space-y-2.5 border border-slate-200 text-xs mb-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <span className="text-slate-500 block text-[11px]">{t("master.ops.leads.modal.contactPerson")}</span>
              <span className="font-semibold text-slate-800">{selectedLead.contactName}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">{t("master.ops.leads.modal.jobTitle")}</span>
              <span className="text-slate-700">{selectedLead.jobTitle || "—"}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <span className="text-slate-500 block text-[11px]">{t("master.ops.leads.modal.workEmail")}</span>
              <a href={`mailto:${selectedLead.workEmail}`} className="text-blue-600 font-mono hover:underline">
                {selectedLead.workEmail}
              </a>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">{t("master.ops.leads.modal.phoneNumber")}</span>
              <a href={`tel:${selectedLead.phoneNumber}`} className="text-slate-800 font-mono hover:underline">
                {selectedLead.phoneNumber || "—"}
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 border-t border-slate-200/60 pt-1 sm:grid-cols-2">
            <div>
              <span className="text-slate-500 block text-[11px]">{t("master.ops.leads.modal.companySize")}</span>
              <span className="text-slate-700">{selectedLead.companySize || "—"}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">{t("master.ops.leads.modal.planTier")}</span>
              <span className="font-semibold text-blue-700">{selectedLead.planTier || "—"}</span>
            </div>
          </div>

          {selectedLead.primaryNeed && (
            <div className="pt-1 border-t border-slate-200/60">
              <span className="text-slate-500 block text-[11px]">{t("master.ops.leads.modal.primaryNeed")}</span>
              <span className="text-slate-700">{selectedLead.primaryNeed}</span>
            </div>
          )}

          <div className="pt-1 border-t border-slate-200/60 flex justify-between text-[11px] text-slate-500">
            <span>{t("master.ops.leads.modal.submittedAt")}</span>
            <span>{formatDateTime(selectedLead.createdAt, undefined, locale)}</span>
          </div>
        </div>

        <form onSubmit={handleSaveLeadModal} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">{t("master.ops.leads.modal.statusLabel")}</label>
            <select
              value={leadStatusEdit}
              onChange={(e) => setLeadStatusEdit(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-semibold focus:outline-none focus:border-blue-600"
            >
              <option value="PENDING">{t("master.ops.leads.modal.statusOptionPending")}</option>
              <option value="CONTACTED">{t("master.ops.leads.modal.statusOptionContacted")}</option>
              <option value="QUOTED">{t("master.ops.leads.modal.statusOptionQuoted")}</option>
              <option value="PROVISIONED">{t("master.ops.leads.modal.statusOptionProvisioned")}</option>
              <option value="REJECTED">{t("master.ops.leads.modal.statusOptionRejected")}</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {t("master.ops.leads.modal.notesLabel")}
            </label>
            <textarea
              rows={3}
              value={leadNotesEdit}
              onChange={(e) => setLeadNotesEdit(e.target.value)}
              placeholder={t("master.ops.leads.modal.notesPlaceholder")}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 resize-none"
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            {selectedLead.status !== "PROVISIONED" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const l = selectedLead;
                    setSelectedLead(null);
                    handleProvisionFromLead(l);
                  }}
                  className="py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-1.5 transition-colors text-xs"
                  title={t("master.ops.leads.dealWizardTitle")}
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>{t("master.ops.leads.modal.dealWizardBtn")}</span>
                </button>
              </div>
            )}

            <div className="flex-1 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
              >
                {t("master.ops.leads.modal.closeBtn")}
              </button>
              <button
                type="submit"
                disabled={updatingLead}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 flex items-center gap-1.5"
              >
                {updatingLead ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>{t("master.ops.leads.modal.saveChangesBtn")}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
