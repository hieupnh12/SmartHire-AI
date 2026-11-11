import { useLocation, useNavigate } from "react-router-dom";
import { masterAdminApi, type TenantInfo } from "@/api/master/masterAdminApi";
import { TenantManagementHub, type TenantHubTab } from "../components/TenantManagementHub";
import { useTenants, masterQueryKeys } from "@/api/master/queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";

function currentTab(pathname: string): TenantHubTab {
  const value = pathname.split("/")[3];
  return value === "overview" || value === "create" || value === "provisioning"
    ? value
    : "directory";
}

export function TenantManagementPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const askConfirm = useUiStore((s) => s.askConfirm);
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

  const softDeleteTenant = (tenant: TenantInfo) => {
    askConfirm({
      title: `Xoá mềm tenant ${tenant.code}?`,
      description: "Database vẫn được giữ lại và có thể khôi phục sau.",
      confirmLabel: "Xoá mềm",
      danger: true,
      onConfirm: async () => {
        try {
          const updated = await masterAdminApi.softDeleteTenant(tenant.id);
          setTenants((items: TenantInfo[]) => items.map((item) => item.id === updated.id ? updated : item));
          triggerNotification(`Đã xoá mềm tenant ${tenant.code}.`);
        } catch {
          toast.danger("Lỗi khi xoá mềm tenant.");
        }
      },
    });
  };

  const restoreTenant = async (tenant: TenantInfo) => {
    try {
      const updated = await masterAdminApi.restoreTenant(tenant.id);
      setTenants((items: TenantInfo[]) => items.map((item) => item.id === updated.id ? updated : item));
      triggerNotification(`Đã khôi phục tenant ${tenant.code} về trạng thái SUSPENDED.`);
    } catch {
      toast.danger("Lỗi khi khôi phục tenant.");
    }
  };

  return (
    <TenantManagementHub
      activeTab={currentTab(location.pathname)}
      onTabChange={(tab) => navigate(`/admin/tenants/${tab}`)}
      tenants={tenants}
      onTenantCreated={(tenant) => setTenants((items: TenantInfo[]) => [{
        ...tenant,
        environmentType: tenant.environmentType === "POC_SANDBOX" ? "POC_SANDBOX" : "PRODUCTION",
      }, ...items])}
      onToggleStatus={toggleStatus}
      onSoftDeleteTenant={softDeleteTenant}
      onRestoreTenant={restoreTenant}
      onRetryProvisioning={(tenant) => navigate(`/onboard?retry=${tenant.id}`)}
    />
  );
}
