import { useState, useMemo, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Inbox, Building2, FileSignature, UserPlus } from "lucide-react";
import { consultationApi, ConsultationResponse } from "@/api/master/consultationApi";
import { useMasterDashboard } from "@/features/master/shell/MasterAdminContext";
import { LeadDetailModal } from "../components/LeadDetailModal";

export function LeadsPage() {
  const navigate = useNavigate();
  const { leads, setLeads, triggerNotification } = useMasterDashboard();
  const [selectedLead, setSelectedLead] = useState<ConsultationResponse | null>(null);
  const [leadStatusEdit, setLeadStatusEdit] = useState<ConsultationResponse["status"]>("PENDING");
  const [leadNotesEdit, setLeadNotesEdit] = useState("");
  const [updatingLead, setUpdatingLead] = useState(false);

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

  const handleProvisionFromLead = (lead: ConsultationResponse) => {
    const query = new URLSearchParams({
      name: lead.companyName,
      email: lead.workEmail,
      adminName: lead.contactName,
    }).toString();
    navigate(`/onboard?${query}`);
  };

  const handleOpenLeadModal = (lead: ConsultationResponse) => {
    setSelectedLead(lead);
    setLeadStatusEdit(lead.status);
    setLeadNotesEdit(lead.notes ?? "");
  };

  const handleOpenCreateContractForLead = (lead: ConsultationResponse) => {
    navigate(`/admin/contracts?leadId=${lead.id}`);
  };

  const handleSaveLeadModal = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedLead) return;
    setUpdatingLead(true);
    try {
      const updated = await consultationApi.updateStatus(selectedLead.id, { status: leadStatusEdit, notes: leadNotesEdit });
      setLeads((items) => items.map((item) => item.id === updated.id ? updated : item));
      setSelectedLead(null);
      triggerNotification(`Đã cập nhật yêu cầu của ${updated.companyName}`);
    } finally {
      setUpdatingLead(false);
    }
  };

  return (
    <>
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <span>Yêu Cầu Demo & Báo Giá Hợp Đồng</span>
            {pendingLeadsCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
                {pendingLeadsCount} yêu cầu mới
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Khách hàng doanh nghiệp quan tâm từ Landing Page. Trao đổi nhu cầu và trực tiếp Cấp phát Workspace riêng khi chốt hợp đồng.
          </p>
        </div>

        <button
          onClick={() => navigate("/onboard")}
          className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Cấp phát Workspace thủ công</span>
        </button>
      </div>

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
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={leadStatusFilter}
            onChange={(e) => setLeadStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-semibold text-slate-700"
          >
            <option value="ALL">Tất cả trạng thái ({leads.length})</option>
            <option value="PENDING">Chờ xử lý ({leads.filter((l) => l.status === "PENDING").length})</option>
            <option value="CONTACTED">Đang trao đổi / Demo ({leads.filter((l) => l.status === "CONTACTED").length})</option>
            <option value="PROVISIONED">Đã cấp Workspace ({leads.filter((l) => l.status === "PROVISIONED").length})</option>
            <option value="REJECTED">Từ chối / Hủy ({leads.filter((l) => l.status === "REJECTED").length})</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Doanh Nghiệp</th>
                <th className="py-3 px-4">Người Liên Hệ</th>
                <th className="py-3 px-4">Loại Yêu Cầu & Gói</th>
                <th className="py-3 px-4">Nhu Cầu / Ghi Chú</th>
                <th className="py-3 px-4">Thời Gian</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
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
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{lead.companyName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>Quy mô: {lead.companySize || "Chưa rõ"}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{lead.contactName}</div>
                      {lead.jobTitle && <div className="text-[11px] text-slate-500">{lead.jobTitle}</div>}
                      <div className="text-[11px] text-blue-600 font-mono mt-0.5">{lead.workEmail}</div>
                      {lead.phoneNumber && (
                        <div className="text-[11px] text-slate-500 font-mono">{lead.phoneNumber}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          lead.requestType === "CONTRACT_QUOTE"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-sky-50 text-sky-700 border border-sky-200"
                        }`}
                      >
                        {lead.requestType === "CONTRACT_QUOTE" ? "Báo Giá Hợp Đồng" : "Trải Nghiệm Demo"}
                      </span>
                      <div className="text-[11px] text-slate-600 font-medium mt-1 truncate max-w-[180px]">
                        {lead.planTier || "Chưa chọn gói"}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-[220px]">
                      {lead.notes ? (
                        <p className="text-[11px] text-slate-700 line-clamp-2 leading-relaxed" title={lead.notes}>
                          {lead.notes}
                        </p>
                      ) : lead.primaryNeed ? (
                        <p className="text-[11px] text-slate-500 line-clamp-2" title={lead.primaryNeed}>
                          {lead.primaryNeed}
                        </p>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                      {new Date(lead.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          lead.status === "PENDING"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : lead.status === "CONTACTED"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : lead.status === "PROVISIONED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {lead.status === "PENDING" && "Chờ liên hệ"}
                        {lead.status === "CONTACTED" && "Đang trao đổi"}
                        {lead.status === "PROVISIONED" && "Đã cấp Tenant"}
                        {lead.status === "REJECTED" && "Từ chối"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenCreateContractForLead(lead)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-semibold transition-colors flex items-center gap-1"
                          title="Soạn hợp đồng e-Contract B2B cho khách hàng này"
                        >
                          <FileSignature className="w-3.5 h-3.5" />
                          <span>Soạn HĐ</span>
                        </button>

                        <button
                          onClick={() => handleOpenLeadModal(lead)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold transition-colors"
                          title="Xem chi tiết & Cập nhật ghi chú"
                        >
                          Chi tiết
                        </button>

                        {lead.status !== "PROVISIONED" && (
                          <button
                            onClick={() => handleProvisionFromLead(lead)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-2xs"
                            title="Tự động điền thông tin và chuyển tới trang cấp phát Database riêng"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Cấp Workspace</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
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
