import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Building2, ExternalLink, CheckCircle2, XCircle, Clock, FileSignature, ReceiptText, Eye } from "lucide-react";
import { TenantInfo, masterAdminApi } from "@/api/master/masterAdminApi";
import { useMasterDashboard } from "../../context/MasterDashboardContext";

interface TenantsTabProps {
  handleOpenCreateContractForTenant: (tenant: TenantInfo) => void;
  handleOpenCreateInvoiceForTenant: (tenant: TenantInfo) => void;
  setSelectedTenant: (tenant: TenantInfo) => void;
}

export function TenantsTab({
  handleOpenCreateContractForTenant,
  handleOpenCreateInvoiceForTenant,
  setSelectedTenant,
}: TenantsTabProps) {
  const navigate = useNavigate();
  const { tenants, setTenants, triggerNotification } = useMasterDashboard();

  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantStatusFilter, setTenantStatusFilter] = useState<string>("ALL");

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchSearch =
        t.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
        t.code.toLowerCase().includes(tenantSearch.toLowerCase()) ||
        t.subdomain.toLowerCase().includes(tenantSearch.toLowerCase());
      const matchStatus = tenantStatusFilter === "ALL" || t.status === tenantStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [tenants, tenantSearch, tenantStatusFilter]);

  const handleToggleTenantStatus = async (tenant: TenantInfo) => {
    if (tenant.status === "FAILED" || tenant.status === "PROVISIONING") {
      navigate(`/onboard?retry=${tenant.id}`);
      return;
    }
    const nextStatus = tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const updated = await masterAdminApi.updateTenantStatus(tenant.id, nextStatus);
      setTenants(tenants.map((t) => (t.id === updated.id ? updated : t)));
      triggerNotification(`Đã cập nhật trạng thái tenant ${tenant.code} sang ${nextStatus}`);
    } catch (err) {
      alert("Đã xảy ra lỗi khi cập nhật trạng thái Tenant.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & New Tenant CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Danh Bạ Khách Hàng Doanh Nghiệp (Tenants)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý danh sách các công ty sử dụng dịch vụ, cấp phát Database và kiểm soát quyền truy cập.
          </p>
        </div>

        <button
          onClick={() => navigate("/onboard")}
          className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Khởi tạo & Cấp phát Tenant mới</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo Tên doanh nghiệp, Mã Tenant hoặc Subdomain..."
            value={tenantSearch}
            onChange={(e) => setTenantSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:border-blue-600 focus:outline-none transition-colors shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={tenantStatusFilter}
            onChange={(e) => setTenantStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 focus:border-blue-600 focus:outline-none shadow-2xs"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang kích hoạt (ACTIVE)</option>
            <option value="SUSPENDED">Đang tạm khóa (SUSPENDED)</option>
            <option value="PROVISIONING">Đang cấp phát (PROVISIONING)</option>
            <option value="FAILED">Thất bại (FAILED)</option>
          </select>
        </div>
      </div>

      {/* Tenant Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
            <tr>
              <th className="p-4">Doanh Nghiệp</th>
              <th className="p-4">Môi Trường</th>
              <th className="p-4">Mã Tenant</th>
              <th className="p-4">Subdomain / Domain</th>
              <th className="p-4">Database Vật Lý</th>
              <th className="p-4">Trạng Thái</th>
              <th className="p-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTenants.length > 0 ? (
              filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                        {tenant.code.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{tenant.name}</div>
                        <div className="text-[11px] text-slate-400">ID #{tenant.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        tenant.environmentType === "POC_SANDBOX"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${tenant.environmentType === "POC_SANDBOX" ? "bg-amber-500" : "bg-emerald-500"}`} />
                      {tenant.environmentType === "POC_SANDBOX" ? "POC Sandbox" : "Production"}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-blue-600">{tenant.code}</td>
                  <td className="p-4 font-mono text-slate-500">
                    <a
                      href={`http://${tenant.subdomain}.localhost:5173/login`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      <span>{tenant.subdomain}.smarthire.top</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                  <td className="p-4 font-mono text-slate-700 font-medium">{tenant.dbName}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        tenant.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : tenant.status === "SUSPENDED"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {tenant.status === "ACTIVE" ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : tenant.status === "SUSPENDED" ? (
                        <XCircle className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                      {tenant.status}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => handleOpenCreateContractForTenant(tenant)}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-colors inline-flex items-center gap-1"
                      title="Soạn hợp đồng B2B e-Contract cho doanh nghiệp này"
                    >
                      <FileSignature className="w-3.5 h-3.5" />
                      <span>Soạn HĐ</span>
                    </button>

                    <button
                      onClick={() => handleOpenCreateInvoiceForTenant(tenant)}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors inline-flex items-center gap-1"
                      title="Lập hóa đơn thanh toán cho doanh nghiệp này"
                    >
                      <ReceiptText className="w-3.5 h-3.5" />
                      <span>Tạo Hóa Đơn</span>
                    </button>

                    <button
                      onClick={() => setSelectedTenant(tenant)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition-colors inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Chi tiết</span>
                    </button>

                    <button
                      onClick={() => handleToggleTenantStatus(tenant)}
                      className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors inline-flex items-center gap-1 ${
                        tenant.status === "ACTIVE"
                          ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                          : tenant.status === "FAILED" || tenant.status === "PROVISIONING"
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                      }`}
                    >
                      {tenant.status === "FAILED" || tenant.status === "PROVISIONING"
                        ? "Cấp phát lại"
                        : tenant.status === "ACTIVE"
                        ? "Tạm khóa"
                        : "Mở khóa"}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  Không tìm thấy doanh nghiệp nào phù hợp với từ khóa "{tenantSearch}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
