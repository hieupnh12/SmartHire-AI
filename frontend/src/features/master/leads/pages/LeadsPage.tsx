import { useState, useMemo, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Inbox, FileSignature, Calculator, Eye } from "lucide-react";
import { consultationApi, ConsultationResponse } from "@/api/master/consultationApi";
import { useLeads, masterQueryKeys } from "@/api/master/queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";
import { Tooltip } from "@/components/ux/Tooltip";
import { CustomSelect, type CustomSelectOption } from "@/components/ux/CustomSelect";
import { LeadDetailModal } from "../components/LeadDetailModal";
import { HeaderActions } from "@/features/master/shell/HeaderActions";
import React from "react";
import { useT, useLocale, formatDate, formatDateTime } from "@/i18n";

export function LeadsPage() {
  const t = useT();
  const locale = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: leads = [] } = useLeads();
  const setLeads = (updater: any) => queryClient.setQueryData(masterQueryKeys.leads(), updater);
  const triggerNotification = (msg: string) => toast.success(msg);
  const fetchLeads = () => queryClient.invalidateQueries({ queryKey: masterQueryKeys.leads() });
  const [selectedLead, setSelectedLead] = useState<ConsultationResponse | null>(null);
  const [leadStatusEdit, setLeadStatusEdit] = useState<ConsultationResponse["status"]>("PENDING");
  const [leadNotesEdit, setLeadNotesEdit] = useState("");
  const [updatingLead, setUpdatingLead] = useState(false);

  React.useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);


  const [leadSearch, setLeadSearch] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>("ALL");

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const q = leadSearch.toLowerCase();
      const matchSearch =
        l.companyName.toLowerCase().includes(q) ||
        l.contactName.toLowerCase().includes(q) ||
        l.workEmail.toLowerCase().includes(q) ||
        (l.phoneNumber && l.phoneNumber.toLowerCase().includes(q)) ||
        (l.planTier && l.planTier.toLowerCase().includes(q));
      const matchStatus = leadStatusFilter === "ALL" || l.status === leadStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [leads, leadSearch, leadStatusFilter]);

  const pendingLeadsCount = useMemo(() => {
    return leads.filter((l) => l.status === "PENDING").length;
  }, [leads]);

  const statusFilterOptions = useMemo<CustomSelectOption<string>[]>(
    () => [
      { value: "ALL", label: t("master.ops.leads.filterAll"), count: leads.length },
      {
        value: "PENDING",
        label: t("master.ops.leads.filterPending"),
        dotClassName: "bg-amber-500",
        count: leads.filter((l) => l.status === "PENDING").length,
      },
      {
        value: "CONTACTED",
        label: t("master.ops.leads.filterContacted"),
        dotClassName: "bg-blue-500",
        count: leads.filter((l) => l.status === "CONTACTED").length,
      },
      {
        value: "QUOTED",
        label: t("master.ops.leads.filterQuoted"),
        dotClassName: "bg-purple-500",
        count: leads.filter((l) => l.status === "QUOTED").length,
      },
      {
        value: "PROVISIONED",
        label: t("master.ops.leads.filterProvisioned"),
        dotClassName: "bg-emerald-500",
        count: leads.filter((l) => l.status === "PROVISIONED").length,
      },
      {
        value: "REJECTED",
        label: t("master.ops.leads.filterRejected"),
        dotClassName: "bg-rose-500",
        count: leads.filter((l) => l.status === "REJECTED").length,
      },
    ],
    [leads, t],
  );

  const handleProvisionFromLead = (lead: ConsultationResponse) => {
    const query = new URLSearchParams({
      leadId: String(lead.id),
      name: lead.companyName,
      email: lead.workEmail,
      adminName: lead.contactName,
      phone: lead.phoneNumber || "",
    }).toString();
    navigate(`/admin/tenants/create?${query}`);
  };

  const handleOpenLeadModal = (lead: ConsultationResponse) => {
    setSelectedLead(lead);
    setLeadStatusEdit(lead.status);
    setLeadNotesEdit(lead.notes ?? "");
  };

  const handleOpenCreateContractForLead = (lead: ConsultationResponse) => {
    navigate(`/admin/contracts/create?leadId=${lead.id}`);
  };

  const handleSaveLeadModal = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedLead) return;
    setUpdatingLead(true);
    try {
      const updated = await consultationApi.updateStatus(selectedLead.id, { status: leadStatusEdit, notes: leadNotesEdit });
      setLeads((items: ConsultationResponse[]) => (items || []).map((item: ConsultationResponse) => item.id === updated.id ? updated : item));
      setSelectedLead(null);
      triggerNotification(t("master.ops.leads.updatedToast", { company: updated.companyName }));
    } finally {
      setUpdatingLead(false);
    }
  };

  return (
    <>
    <div className="space-y-6 animate-fade-in">
      <HeaderActions>
        {pendingLeadsCount > 0 && (
          <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
            {t("master.ops.leads.newRequestsBadge", { count: pendingLeadsCount })}
          </span>
        )}
        <button
          onClick={() => navigate("/admin/tenants/create")}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700"
        >
          <Plus className="size-3.5" />
          <span>{t("master.ops.leads.provisionWorkspaceBtn")}</span>
        </button>
      </HeaderActions>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold block mb-1">{t("master.ops.leads.kpiTotal")}</span>
          <span className="text-2xl font-bold text-slate-900">{leads.length}</span>
        </div>
        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 shadow-2xs">
          <span className="text-xs text-amber-800 font-semibold block mb-1">{t("master.ops.leads.kpiPending")}</span>
          <span className="text-2xl font-bold text-amber-600">{pendingLeadsCount}</span>
        </div>
        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 shadow-2xs">
          <span className="text-xs text-blue-800 font-semibold block mb-1">{t("master.ops.leads.kpiDemo")}</span>
          <span className="text-2xl font-bold text-blue-600">
            {leads.filter((l) => l.requestType === "DEMO").length}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 shadow-2xs">
          <span className="text-xs text-emerald-800 font-semibold block mb-1">{t("master.ops.leads.kpiQuote")}</span>
          <span className="text-2xl font-bold text-emerald-600">
            {leads.filter((l) => l.requestType === "CONTRACT_QUOTE").length}
          </span>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t("master.ops.leads.searchPlaceholder")}
            value={leadSearch}
            onChange={(e) => setLeadSearch(e.target.value)}
            className="w-full min-h-10 pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl shadow-2xs focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100 transition-all"
          />
        </div>

        <div className="w-full sm:w-[235px] shrink-0">
          <CustomSelect
            value={leadStatusFilter}
            onChange={setLeadStatusFilter}
            options={statusFilterOptions}
            icon={<Filter className="size-3.5" />}
            ariaLabel={t("master.ops.leads.filterAria")}
          />
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] table-fixed border-collapse text-left text-xs">
            <colgroup>
              <col />
              <col />
              <col className="w-[118px]" />
              <col />
              <col className="w-[104px]" />
              <col className="w-[154px]" />
              <col className="w-[194px]" />
            </colgroup>
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-3.5 whitespace-nowrap">{t("master.ops.leads.colCompany")}</th>
                <th className="py-3 px-3.5 whitespace-nowrap">{t("master.ops.leads.colContact")}</th>
                <th className="py-3 px-3.5 whitespace-nowrap">{t("master.ops.leads.colTypePlan")}</th>
                <th className="py-3 px-3.5 whitespace-nowrap">{t("master.ops.leads.colNotes")}</th>
                <th className="py-3 px-3.5 whitespace-nowrap">{t("master.ops.leads.colTime")}</th>
                <th className="py-3 px-3.5 whitespace-nowrap">{t("master.ops.leads.colStatus")}</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">{t("master.ops.leads.colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <span>{t("master.ops.leads.empty")}</span>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const notePreview = lead.notes || lead.primaryNeed || "";
                  const createdDate = new Date(lead.createdAt);

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors align-middle">
                      <td className="py-3 px-3.5">
                        <Tooltip
                          className="flex w-full min-w-0"
                          side="top"
                          content={
                            <span className="block space-y-0.5">
                              <span className="block font-semibold text-white">{lead.companyName}</span>
                              <span className="block text-slate-300">
                                {t("master.ops.leads.companySizePrefix", {
                                  size: lead.companySize || t("master.ops.leads.unknownSize"),
                                })}
                              </span>
                            </span>
                          }
                        >
                          <span className="min-w-0 flex-1 truncate font-semibold text-slate-700 cursor-default">
                            {lead.companyName}
                          </span>
                        </Tooltip>
                      </td>

                      <td className="py-3 px-3.5">
                        <Tooltip
                          className="flex w-full min-w-0"
                          side="top"
                          content={
                            <span className="block space-y-0.5">
                              <span className="block font-semibold text-white">
                                {lead.contactName}
                                {lead.jobTitle ? ` · ${lead.jobTitle}` : ""}
                              </span>
                              <span className="block font-mono text-sky-300">{lead.workEmail}</span>
                              {lead.phoneNumber && (
                                <span className="block font-mono text-slate-300">
                                  {t("master.ops.leads.phonePrefix", { phone: lead.phoneNumber })}
                                </span>
                              )}
                            </span>
                          }
                        >
                          <span className="min-w-0 flex-1 truncate font-medium text-slate-700 cursor-default">
                            {lead.contactName}
                          </span>
                        </Tooltip>
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <Tooltip
                          side="top"
                          content={
                            <span className="block space-y-0.5">
                              <span className="block font-semibold text-white">
                                {lead.requestType === "CONTRACT_QUOTE"
                                  ? t("master.ops.leads.badgeContractQuote")
                                  : t("master.ops.leads.badgeDemo")}
                              </span>
                              <span className="block text-slate-300">
                                {t("master.ops.leads.interestedPlanPrefix", {
                                  plan: lead.planTier || t("master.ops.leads.noPlanSelected"),
                                })}
                              </span>
                            </span>
                          }
                        >
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold border cursor-default ${
                              lead.requestType === "CONTRACT_QUOTE"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-sky-50 text-sky-700 border-sky-200"
                            }`}
                          >
                            {lead.requestType === "CONTRACT_QUOTE"
                              ? t("master.ops.leads.shortBadgeContractQuote")
                              : t("master.ops.leads.shortBadgeDemo")}
                          </span>
                        </Tooltip>
                      </td>

                      <td className="py-3 px-3.5">
                        {notePreview ? (
                          <Tooltip
                            className="flex w-full min-w-0"
                            side="top"
                            content={
                              <span className="block space-y-1">
                                {lead.primaryNeed && (
                                  <span className="block text-slate-300">
                                    <strong className="font-semibold text-white">{t("master.ops.leads.tooltipNeedLabel")}</strong>{" "}
                                    {lead.primaryNeed}
                                  </span>
                                )}
                                {lead.notes && (
                                  <span className="block text-slate-100">
                                    <strong className="font-semibold text-white">{t("master.ops.leads.tooltipNoteLabel")}</strong>{" "}
                                    {lead.notes}
                                  </span>
                                )}
                              </span>
                            }
                          >
                            <span
                              className={`min-w-0 flex-1 truncate cursor-default ${
                                lead.notes ? "text-slate-700" : "text-slate-500"
                              }`}
                            >
                              {notePreview}
                            </span>
                          </Tooltip>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <Tooltip
                          side="top"
                          content={formatDateTime(
                            createdDate,
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                            locale,
                          )}
                        >
                          <span className="text-[11px] text-slate-500 cursor-default">
                            {formatDate(
                              createdDate,
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              },
                              locale,
                            )}
                          </span>
                        </Tooltip>
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            lead.status === "PENDING"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : lead.status === "CONTACTED"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : lead.status === "QUOTED"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : lead.status === "PROVISIONED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {lead.status === "PENDING" && t("master.ops.leads.statusPending")}
                          {lead.status === "CONTACTED" && t("master.ops.leads.statusContacted")}
                          {lead.status === "QUOTED" && t("master.ops.leads.statusQuoted")}
                          {lead.status === "PROVISIONED" && t("master.ops.leads.statusProvisioned")}
                          {lead.status === "REJECTED" && t("master.ops.leads.statusRejected")}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {lead.status !== "PROVISIONED" && (
                            <Tooltip
                              side="top"
                              content={
                                lead.status === "QUOTED"
                                  ? t("master.ops.leads.closeDealTooltip")
                                  : t("master.ops.leads.quoteDealTooltip")
                              }
                            >
                              <button
                                type="button"
                                onClick={() => handleProvisionFromLead(lead)}
                                className="inline-flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-2.5 text-[11px] font-semibold text-white shadow-2xs transition-colors hover:bg-blue-700"
                              >
                                <Calculator className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  {lead.status === "QUOTED"
                                    ? t("master.ops.leads.closeDealBtn")
                                    : t("master.ops.leads.quoteDealBtn")}
                                </span>
                              </button>
                            </Tooltip>
                          )}

                          <Tooltip side="top" content={t("master.ops.leads.draftContractTitle")}>
                            <button
                              type="button"
                              onClick={() => handleOpenCreateContractForLead(lead)}
                              aria-label={t("master.ops.leads.draftContractAria", { company: lead.companyName })}
                              className="inline-flex size-8 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 transition-colors hover:bg-indigo-100"
                            >
                              <FileSignature className="w-4 h-4" />
                            </button>
                          </Tooltip>

                          <Tooltip side="top" content={t("master.ops.leads.detailTitle")}>
                            <button
                              type="button"
                              onClick={() => handleOpenLeadModal(lead)}
                              aria-label={t("master.ops.leads.detailAria", { company: lead.companyName })}
                              className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <LeadDetailModal
      selectedLead={selectedLead}
      setSelectedLead={setSelectedLead}
      leadStatusEdit={leadStatusEdit}
      setLeadStatusEdit={setLeadStatusEdit}
      leadNotesEdit={leadNotesEdit}
      setLeadNotesEdit={setLeadNotesEdit}
      updatingLead={updatingLead}
      handleSaveLeadModal={handleSaveLeadModal}
      handleProvisionFromLead={handleProvisionFromLead}
    />
    </>
  );
}
