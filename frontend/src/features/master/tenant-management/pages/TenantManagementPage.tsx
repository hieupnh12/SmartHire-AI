import { useLocation, useNavigate } from "react-router-dom";
import { masterAdminApi, type TenantInfo } from "@/api/master/masterAdminApi";
import { TenantManagementHub, type TenantHubTab } from "../components/TenantManagementHub";
import { useTenants, useSubscriptions, useRevenueAnalytics, useAiQuotaUsage, useAuditLogs, useLeads, useInvoices, useContracts, masterQueryKeys } from "@/api/master/queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";

function currentTab(pathname: string): TenantHubTab {
  const value = pathname.split("/")[3];
  return value === "overview" || value === "create" || value === "verification" || value === "provisioning"
    ? value
    : "directory";
}

export function TenantManagementPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: tenants = [] } = useTenants();
  const setTenants = (updater: any) => queryClient.setQueryData(masterQueryKeys.tenants(), updater);
  const triggerNotification = (msg: string) => toast.success(msg);

  const toggleStatus = async (tenant: TenantInfo) => {
    if (tenant.status === "FAILED" || tenant.status === "PROVISIONING") {
      navigate(`/onboard?retry=${tenant.id}`);
      return;
    }
    const status = tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const updated = await masterAdminApi.updateTenantStatus(tenant.id, status);
    setTenants((items: TenantInfo[]) => items.map((item) => item.id === updated.id ? updated : item));
    triggerNotification(`Đã cập nhật trạng thái tenant ${tenant.code} sang ${status}`);
  };

  const deleteTenant = async (tenant: TenantInfo) => {
    if (!confirm(`Bạn có chắc muốn xoá sạch tenant ${tenant.code}? Hành động này KHÔNG THỂ PHỤC HỒI.`)) {
      return;
    }
    try {
      await masterAdminApi.deleteTenant(tenant.id);
      setTenants((items: TenantInfo[]) => items.filter((item) => item.id !== tenant.id));
      triggerNotification(`Đã xoá tenant ${tenant.code} và database thành công.`);
    } catch (error) {
      toast.danger("Lỗi khi xoá tenant.");
    }
  };

  return (
    <TenantManagementHub
      activeTab={currentTab(location.pathname)}
      onTabChange={(tab) => navigate(`/admin/tenants/${tab}`)}
      tenants={tenants}
      onTenantCreated={(tenant) => setTenants((items) => [{
        ...tenant,
        environmentType: tenant.environmentType === "POC_SANDBOX" ? "POC_SANDBOX" : "PRODUCTION",
      }, ...items])}
      onToggleStatus={toggleStatus}
      onDeleteTenant={deleteTenant}
      onRetryProvisioning={(tenant) => navigate(`/onboard?retry=${tenant.id}`)}
    />
  );
}
