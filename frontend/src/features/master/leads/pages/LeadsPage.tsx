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

export function LeadsPage() {
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
      { value: "ALL", label: "Tất cả trạng thái", count: leads.length },
      {
        value: "PENDING",
        label: "Chờ liên hệ",
        dotClassName: "bg-amber-500",
        count: leads.filter((l) => l.status === "PENDING").length,
      },
      {
        value: "CONTACTED",
        label: "Đang trao đổi",
        dotClassName: "bg-blue-500",
        count: leads.filter((l) => l.status === "CONTACTED").length,
      },
      {
        value: "QUOTED",
        label: "Đã gửi báo giá",
        dotClassName: "bg-purple-500",
        count: leads.filter((l) => l.status === "QUOTED").length,
      },
      {
        value: "PROVISIONED",
        label: "Đã cấp Workspace",
        dotClassName: "bg-emerald-500",
        count: leads.filter((l) => l.status === "PROVISIONED").length,
      },
      {
        value: "REJECTED",
        label: "Từ chối",
        dotClassName: "bg-rose-500",
        count: leads.filter((l) => l.status === "REJECTED").length,
      },
    ],
    [leads],
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
      triggerNotification(`Đã cập nhật yêu cầu của ${updated.companyName}`);
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
            {pendingLeadsCount} yêu cầu mới
          </span>
        )}
        <button
          onClick={() => navigate("/admin/tenants/create")}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700"
        >
          <Plus className="size-3.5" />
          <span>Cấp phát Workspace</span>
        </button>
      </HeaderActions>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Tổng Số Lead Tiếp Nhận</span>
          <span className="text-2xl font-bold text-slate-900">{leads.length}</span>
        </div>
        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 shadow-2xs">
          <span className="text-xs text-amber-800 font-semibold block mb-1">Chờ Xử Lý & Liên Hệ</span>
          <span className="text-2xl font-bold text-amber-600">{pendingLeadsCount}</span>
        </div>
        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 shadow-2xs">
          <span className="text-xs text-blue-800 font-semibold block mb-1">Đăng Ký Trải Nghiệm Demo</span>
          <span className="text-2xl font-bold text-blue-600">
            {leads.filter((l) => l.requestType === "DEMO").length}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 shadow-2xs">
          <span className="text-xs text-emerald-800 font-semibold block mb-1">Báo Giá & Hợp Đồng Enterprise</span>
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
            placeholder="Tìm theo tên công ty, người liên hệ, email, số điện thoại..."
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
            ariaLabel="Lọc theo trạng thái yêu cầu"
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
                <th className="py-3 px-3.5 whitespace-nowrap">Doanh Nghiệp</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Người Liên Hệ</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Loại Yêu Cầu</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Nhu Cầu / Ghi Chú</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Thời Gian</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Trạng Thái</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <span>Không tìm thấy yêu cầu demo hoặc báo giá nào.</span>
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
                                Quy mô: {lead.companySize || "Chưa rõ"}
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
                                  SĐT: {lead.phoneNumber}
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
                                  ? "Báo Giá Hợp Đồng"
                                  : "Trải Nghiệm Demo"}
                              </span>
                              <span className="block text-slate-300">
                                Gói quan tâm: {lead.planTier || "Chưa chọn gói"}
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
                            {lead.requestType === "CONTRACT_QUOTE" ? "Báo giá HĐ" : "Demo"}
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
                                    <strong className="font-semibold text-white">Nhu cầu:</strong>{" "}
                                    {lead.primaryNeed}
                                  </span>
                                )}
                                {lead.notes && (
                                  <span className="block text-slate-100">
                                    <strong className="font-semibold text-white">Ghi chú:</strong>{" "}
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
                          content={createdDate.toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        >
                          <span className="text-[11px] text-slate-500 cursor-default">
                            {createdDate.toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
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
                          {lead.status === "PENDING" && "Chờ liên hệ"}
                          {lead.status === "CONTACTED" && "Đang trao đổi"}
                          {lead.status === "QUOTED" && "Đã gửi báo giá"}
                          {lead.status === "PROVISIONED" && "Đã cấp Workspace"}
                          {lead.status === "REJECTED" && "Từ chối"}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {lead.status !== "PROVISIONED" && (
                            <Tooltip
                              side="top"
                              content={
                                lead.status === "QUOTED"
                                  ? "Chốt hợp đồng & cấp Workspace"
                                  : "Lên báo giá hoặc cấp Workspace"
                              }
                            >
                              <button
                                type="button"
                                onClick={() => handleProvisionFromLead(lead)}
                                className="inline-flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-2.5 text-[11px] font-semibold text-white shadow-2xs transition-colors hover:bg-blue-700"
                              >
                                <Calculator className="w-3.5 h-3.5 shrink-0" />
                                <span>{lead.status === "QUOTED" ? "Chốt deal" : "Báo giá"}</span>
                              </button>
                            </Tooltip>
                          )}

                          <Tooltip side="top" content="Soạn hợp đồng cho khách hàng này">
                            <button
                              type="button"
                              onClick={() => handleOpenCreateContractForLead(lead)}
                              aria-label={`Soạn hợp đồng cho ${lead.companyName}`}
                              className="inline-flex size-8 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 transition-colors hover:bg-indigo-100"
                            >
                              <FileSignature className="w-4 h-4" />
                            </button>
                          </Tooltip>

                          <Tooltip side="top" content="Xem chi tiết & cập nhật">
                            <button
                              type="button"
                              onClick={() => handleOpenLeadModal(lead)}
                              aria-label={`Xem chi tiết ${lead.companyName}`}
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
