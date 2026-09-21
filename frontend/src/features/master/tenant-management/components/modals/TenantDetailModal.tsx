import { X, Building2 } from "lucide-react";
import { TenantInfo } from "@/api/master/masterAdminApi";

interface TenantDetailModalProps {
  selectedTenant: TenantInfo | null;
  setSelectedTenant: (tenant: TenantInfo | null) => void;
  handleToggleTenantStatus: (tenant: TenantInfo) => void;
}

export function TenantDetailModal({
  selectedTenant,
  setSelectedTenant,
  handleToggleTenantStatus,
}: TenantDetailModalProps) {
  if (!selectedTenant) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative animate-fade-in">
        <button
          onClick={() => setSelectedTenant(null)}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-200">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Chi Tiết Khách Hàng Doanh Nghiệp</h3>
            <span className="text-xs text-slate-500 font-mono">Tenant ID #{selectedTenant.id}</span>
          </div>
        </div>

        <div className="space-y-3 text-xs font-mono bg-slate-50 p-5 rounded-xl border border-slate-200">
          <div className="flex justify-between pb-2 border-b border-slate-200/80">
            <span className="text-slate-500 font-sans">Tên Doanh Nghiệp:</span>
            <span className="font-bold text-slate-900 text-right font-sans">{selectedTenant.name}</span>
          </div>
          <div className="flex justify-between pb-2 border-b border-slate-200/80">
            <span className="text-slate-500 font-sans">Mã Định Danh (Code):</span>
            <span className="font-bold text-blue-600">{selectedTenant.code}</span>
          </div>
          <div className="flex justify-between pb-2 border-b border-slate-200/80">
            <span className="text-slate-500 font-sans">Cổng Đăng Nhập (Subdomain):</span>
            <span className="text-slate-700">{selectedTenant.subdomain}.smarthire.top</span>
          </div>
          <div className="flex justify-between pb-2 border-b border-slate-200/80">
            <span className="text-slate-500 font-sans">Database Riêng Biệt:</span>
            <span className="text-emerald-700 font-bold">{selectedTenant.dbName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">Trạng Thái Hoạt Động:</span>
            <span className="font-bold text-slate-900">{selectedTenant.status}</span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={() => setSelectedTenant(null)}
            className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            Đóng cửa sổ
          </button>
          <button
            onClick={() => {
              const t = selectedTenant;
              setSelectedTenant(null);
              handleToggleTenantStatus(t);
            }}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
          >
            Đổi trạng thái vận hành
          </button>
        </div>
      </div>
    </div>
  );
}
