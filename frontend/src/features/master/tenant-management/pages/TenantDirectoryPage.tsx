import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, ExternalLink, CheckCircle2, XCircle, Clock, FileSignature, ReceiptText, Eye } from "lucide-react";
import { TenantInfo, masterAdminApi } from "@/api/master/masterAdminApi";
import { useTenants, masterQueryKeys } from "@/api/master/queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";
import { useT } from "@/i18n";

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
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: tenants = [] } = useTenants();
  const setTenants = (updater: any) => queryClient.setQueryData(masterQueryKeys.tenants(), updater);
  const triggerNotification = (msg: string) => toast.success(msg);

  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantStatusFilter, setTenantStatusFilter] = useState<string>("ALL");

  const filteredTenants = useMemo(() => {
    return tenants.filter((tenantItem) => {
      const matchSearch =
        tenantItem.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
        tenantItem.code.toLowerCase().includes(tenantSearch.toLowerCase()) ||
        tenantItem.subdomain.toLowerCase().includes(tenantSearch.toLowerCase());
      const matchStatus = tenantStatusFilter === "ALL" || tenantItem.status === tenantStatusFilter;
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
      setTenants(tenants.map((tenantItem) => (tenantItem.id === updated.id ? updated : tenantItem)));
      triggerNotification(t("master.ops.tenants.dirPage.statusUpdatedToast", { code: tenant.code, status: nextStatus }));
    } catch {
      toast.error(t("master.ops.tenants.dirPage.statusUpdateError"));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & New Tenant CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t("master.ops.tenants.dirPage.title")}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t("master.ops.tenants.dirPage.subtitle")}
          </p>
        </div>

        <button
          onClick={() => navigate("/onboard")}
          className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>{t("master.ops.tenants.dirPage.createBtn")}</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t("master.ops.tenants.dirPage.searchPlaceholder")}
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
            <option value="ALL">{t("master.ops.tenants.dirPage.filterAll")}</option>
            <option value="ACTIVE">{t("master.ops.tenants.dirPage.filterActive")}</option>
            <option value="PENDING_PAYMENT">{t("master.ops.tenants.dirPage.filterPendingPayment")}</option>
            <option value="SUSPENDED">{t("master.ops.tenants.dirPage.filterSuspended")}</option>
            <option value="PROVISIONING">{t("master.ops.tenants.dirPage.filterProvisioning")}</option>
            <option value="FAILED">{t("master.ops.tenants.dirPage.filterFailed")}</option>
          </select>
        </div>
      </div>

      {/* Tenant Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
            <tr>
              <th className="p-4">{t("master.ops.tenants.dirPage.colCompany")}</th>
              <th className="p-4">{t("master.ops.tenants.dirPage.colEnvironment")}</th>
              <th className="p-4">{t("master.ops.tenants.dirPage.colCode")}</th>
              <th className="p-4">{t("master.ops.tenants.dirPage.colDomain")}</th>
              <th className="p-4">{t("master.ops.tenants.dirPage.colDatabase")}</th>
              <th className="p-4">{t("master.ops.tenants.dirPage.colStatus")}</th>
              <th className="p-4 text-right">{t("master.ops.tenants.dirPage.colActions")}</th>
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
                        <div className="text-[11px] text-slate-400">{t("master.ops.tenants.dirPage.idPrefix", { id: tenant.id })}</div>
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
                      {tenant.environmentType === "POC_SANDBOX"
                        ? t("master.ops.tenants.dirPage.envSandbox")
                        : t("master.ops.tenants.dirPage.envProduction")}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-blue-600">{tenant.code}</td>
                  <td className="p-4 font-mono text-slate-500">
                    <a
                      href={`http://${tenant.subdomain}.localhost:5173/internal/login`}
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
                      title={t("master.ops.tenants.dirPage.draftContractTitle")}
                    >
                      <FileSignature className="w-3.5 h-3.5" />
                      <span>{t("master.ops.tenants.dirPage.draftContractBtn")}</span>
                    </button>

                    <button
                      onClick={() => handleOpenCreateInvoiceForTenant(tenant)}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors inline-flex items-center gap-1"
                      title={t("master.ops.tenants.dirPage.createInvoiceTitle")}
                    >
                      <ReceiptText className="w-3.5 h-3.5" />
                      <span>{t("master.ops.tenants.dirPage.createInvoiceBtn")}</span>
                    </button>

                    <button
                      onClick={() => setSelectedTenant(tenant)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition-colors inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>{t("master.ops.tenants.dirPage.detailBtn")}</span>
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
                        ? t("master.ops.tenants.dirPage.reprovisionBtn")
                        : tenant.status === "ACTIVE"
                        ? t("master.ops.tenants.dirPage.suspendBtn")
                        : t("master.ops.tenants.dirPage.unlockBtn")}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  {t("master.ops.tenants.dirPage.emptySearch", { query: tenantSearch })}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
