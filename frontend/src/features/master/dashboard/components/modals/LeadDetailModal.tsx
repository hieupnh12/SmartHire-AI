import React from "react";
import { X, PhoneCall, UserPlus, Loader2, Check } from "lucide-react";
import { ConsultationResponse } from "@/api/master/masterAdminApi";

interface LeadDetailModalProps {
  selectedLead: ConsultationResponse | null;
  setSelectedLead: (lead: ConsultationResponse | null) => void;
  leadStatusEdit: string;
  setLeadStatusEdit: (val: "PENDING" | "CONTACTED" | "PROVISIONED" | "REJECTED") => void;
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
  if (!selectedLead) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setSelectedLead(null)}
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
                ? "Yêu cầu Báo giá & Hợp đồng"
                : "Đăng ký Trải nghiệm Demo"}{" "}
              · Lead #{selectedLead.id}
            </span>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl space-y-2.5 border border-slate-200 text-xs mb-5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500 block text-[11px]">Người liên hệ:</span>
              <span className="font-semibold text-slate-800">{selectedLead.contactName}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Chức vụ:</span>
              <span className="text-slate-700">{selectedLead.jobTitle || "—"}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500 block text-[11px]">Email doanh nghiệp:</span>
              <a href={`mailto:${selectedLead.workEmail}`} className="text-blue-600 font-mono hover:underline">
                {selectedLead.workEmail}
              </a>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Số điện thoại:</span>
              <a href={`tel:${selectedLead.phoneNumber}`} className="text-slate-800 font-mono hover:underline">
                {selectedLead.phoneNumber || "—"}
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
            <div>
              <span className="text-slate-500 block text-[11px]">Quy mô nhân sự:</span>
              <span className="text-slate-700">{selectedLead.companySize || "—"}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Gói quan tâm:</span>
              <span className="font-semibold text-blue-700">{selectedLead.planTier || "—"}</span>
            </div>
          </div>

          {selectedLead.primaryNeed && (
            <div className="pt-1 border-t border-slate-200/60">
              <span className="text-slate-500 block text-[11px]">Nhu cầu chính:</span>
              <span className="text-slate-700">{selectedLead.primaryNeed}</span>
            </div>
          )}

          <div className="pt-1 border-t border-slate-200/60 flex justify-between text-[11px] text-slate-500">
            <span>Thời gian đăng ký:</span>
            <span>{new Date(selectedLead.createdAt).toLocaleString("vi-VN")}</span>
          </div>
        </div>

        <form onSubmit={handleSaveLeadModal} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Trạng thái xử lý *</label>
            <select
              value={leadStatusEdit}
              onChange={(e) => setLeadStatusEdit(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-semibold focus:outline-none focus:border-blue-600"
            >
              <option value="PENDING">Chờ xử lý / Chưa liên hệ</option>
              <option value="CONTACTED">Đang liên hệ & Trao đổi Demo</option>
              <option value="PROVISIONED">Đã cấp phát Workspace (Hoàn tất)</option>
              <option value="REJECTED">Từ chối / Hủy yêu cầu</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Ghi chú chăm sóc / Nhu cầu chi tiết
            </label>
            <textarea
              rows={3}
              value={leadNotesEdit}
              onChange={(e) => setLeadNotesEdit(e.target.value)}
              placeholder="Nhập ghi chú sau khi gọi điện/trao đổi với khách hàng..."
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 resize-none"
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            {selectedLead.status !== "PROVISIONED" && (
              <button
                type="button"
                onClick={() => {
                  const l = selectedLead;
                  setSelectedLead(null);
                  handleProvisionFromLead(l);
                }}
                className="py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Cấp Workspace Ngay</span>
              </button>
            )}

            <div className="flex-1 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
              >
                Đóng
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
                <span>Lưu Thay Đổi</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
