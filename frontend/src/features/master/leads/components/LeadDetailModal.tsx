import React from "react";
import { createPortal } from "react-dom";
import { X, Building2, Phone, Mail, Calculator, FileText, Check, Loader2 } from "lucide-react";
import { ConsultationResponse } from "@/api/master/consultationApi";
import { CustomSelect, type CustomSelectOption } from "@/components/ux/CustomSelect";
import { useT, formatSimpleDateTime } from "@/i18n";

type LeadStatus = "PENDING" | "CONTACTED" | "QUOTED" | "PROVISIONED" | "REJECTED";

interface LeadDetailModalProps {
  selectedLead: ConsultationResponse | null;
  setSelectedLead: (lead: ConsultationResponse | null) => void;
  leadStatusEdit: LeadStatus;
  setLeadStatusEdit: (val: LeadStatus) => void;
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

  const statusOptions = React.useMemo<CustomSelectOption<LeadStatus>[]>(
    () => [
      { value: "PENDING", label: t("master.ops.leads.modal.statusOptionPending"), dotClassName: "bg-amber-500" },
      { value: "CONTACTED", label: t("master.ops.leads.modal.statusOptionContacted"), dotClassName: "bg-blue-500" },
      { value: "QUOTED", label: t("master.ops.leads.modal.statusOptionQuoted"), dotClassName: "bg-purple-500" },
      { value: "PROVISIONED", label: t("master.ops.leads.modal.statusOptionProvisioned"), dotClassName: "bg-emerald-500" },
      { value: "REJECTED", label: t("master.ops.leads.modal.statusOptionRejected"), dotClassName: "bg-rose-500" },
    ],
    [t],
  );

  if (!selectedLead) return null;

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        onClick={() => setSelectedLead(null)}
        aria-label={t("master.ops.leads.modal.closeAria")}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={selectedLead.companyName}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-xl sm:max-w-2xl overflow-y-auto bg-slate-50 p-6 shadow-2xl flex flex-col justify-between"
      >
        <form onSubmit={handleSaveLeadModal} className="flex-1 flex flex-col justify-between">
          <div>
            {/* Header Banner - non-sticky, close to top edge */}
            <div className="flex items-start justify-between border-b border-slate-200 bg-white -mx-6 -mt-6 px-6 pt-3 pb-3 mb-4 shadow-2xs">
              <div>
                <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wide">
                  {selectedLead.requestType === "CONTRACT_QUOTE"
                    ? t("master.ops.leads.modal.typeContractQuote")
                    : t("master.ops.leads.modal.typeDemo")}
                </h2>
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  {selectedLead.companyName}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  LEAD #{selectedLead.id}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="grid size-8 place-items-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                  aria-label={t("master.ops.leads.modal.closeAria")}
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Section 1: Customer Profile & Requirements */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="flex items-center gap-2.5 font-bold text-slate-600 mb-4 text-xs uppercase tracking-wider">
                  <span className="grid size-7 place-items-center rounded-lg bg-slate-100 text-slate-600">
                    <Building2 className="size-4" />
                  </span>
                  <span>THÔNG TIN DOANH NGHIỆP & YÊU CẦU</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-1 font-sans">
                      {t("master.ops.leads.colCompany")}
                    </span>
                    <strong className="font-semibold text-slate-600 text-sm block">
                      {selectedLead.companyName}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1 font-sans">
                      {t("master.ops.leads.modal.contactPerson").replace(/:$/, "")}
                    </span>
                    <strong className="font-semibold text-slate-600 text-sm block">
                      {selectedLead.contactName}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1 font-sans">
                      {t("master.ops.leads.modal.jobTitle").replace(/:$/, "")}
                    </span>
                    <strong className="font-medium text-slate-600 text-sm block">
                      {selectedLead.jobTitle || "—"}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1 font-sans flex items-center gap-1.5">
                      <Mail className="size-3 text-slate-400" />
                      {t("master.ops.leads.modal.workEmail").replace(/:$/, "")}
                    </span>
                    <a
                      href={`mailto:${selectedLead.workEmail}`}
                      className="font-mono text-blue-600 hover:text-blue-700 hover:underline text-xs sm:text-sm block truncate"
                    >
                      {selectedLead.workEmail}
                    </a>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1 font-sans flex items-center gap-1.5">
                      <Phone className="size-3 text-slate-400" />
                      {t("master.ops.leads.modal.phoneNumber").replace(/:$/, "")}
                    </span>
                    <a
                      href={`tel:${selectedLead.phoneNumber}`}
                      className="font-mono font-medium text-slate-600 hover:underline text-xs sm:text-sm block"
                    >
                      {selectedLead.phoneNumber || "—"}
                    </a>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1 font-sans">
                      {t("master.ops.leads.modal.companySize").replace(/:$/, "")}
                    </span>
                    <strong className="font-medium text-slate-600 text-sm block">
                      {selectedLead.companySize || "—"}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1 font-sans">
                      {t("master.ops.leads.modal.planTier").replace(/:$/, "")}
                    </span>
                    <span className="font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 text-xs inline-block">
                      {selectedLead.planTier || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-1 font-sans">
                      {t("master.ops.leads.colTypePlan")}
                    </span>
                    <strong className="font-medium text-slate-600 text-sm block">
                      {selectedLead.requestType === "CONTRACT_QUOTE"
                        ? t("master.ops.leads.modal.typeContractQuote")
                        : t("master.ops.leads.modal.typeDemo")}
                    </strong>
                  </div>

                  {selectedLead.primaryNeed && (
                    <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                      <span className="text-slate-500 block mb-1 font-sans font-medium">
                        {t("master.ops.leads.modal.primaryNeed").replace(/:$/, "")}
                      </span>
                      <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs leading-relaxed">
                        {selectedLead.primaryNeed}
                      </p>
                    </div>
                  )}

                  <div className="sm:col-span-2 flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span>{t("master.ops.leads.modal.submittedAt").replace(/:$/, "")}</span>
                    <strong className="font-mono text-slate-600">
                      {formatSimpleDateTime(selectedLead.createdAt)}
                    </strong>
                  </div>
                </div>
              </section>

              {/* Section 2: Status & Internal Care Notes */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <h3 className="flex items-center gap-2.5 font-bold text-slate-600 text-xs uppercase tracking-wider">
                  <span className="grid size-7 place-items-center rounded-lg bg-slate-100 text-slate-600">
                    <FileText className="size-4" />
                  </span>
                  <span>XỬ LÝ TRẠNG THÁI & GHI CHÚ CHĂM SÓC</span>
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    {t("master.ops.leads.modal.statusLabel")}
                  </label>
                  <CustomSelect
                    value={leadStatusEdit}
                    onChange={setLeadStatusEdit}
                    options={statusOptions}
                    ariaLabel={t("master.ops.leads.modal.statusAria")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    {t("master.ops.leads.modal.notesLabel")}
                  </label>
                  <textarea
                    rows={4}
                    value={leadNotesEdit}
                    onChange={(e) => setLeadNotesEdit(e.target.value)}
                    placeholder={t("master.ops.leads.modal.notesPlaceholder")}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs text-slate-600 bg-white resize-none transition-colors"
                  />
                </div>
              </section>
            </div>
          </div>

          {/* Footer Actions - non-sticky */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            {selectedLead.status !== "PROVISIONED" ? (
              <button
                type="button"
                onClick={() => {
                  const l = selectedLead;
                  setSelectedLead(null);
                  handleProvisionFromLead(l);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                title={t("master.ops.leads.dealWizardTitle")}
              >
                <Calculator className="size-4" />
                <span>{t("master.ops.leads.modal.dealWizardBtn")}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors shadow-2xs"
              >
                {t("master.ops.leads.modal.closeBtn")}
              </button>

              <button
                type="submit"
                disabled={updatingLead}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                {updatingLead ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                <span>{t("master.ops.leads.modal.saveChangesBtn")}</span>
              </button>
            </div>
          </div>
        </form>
      </aside>
    </>,
    document.body
  );
}
