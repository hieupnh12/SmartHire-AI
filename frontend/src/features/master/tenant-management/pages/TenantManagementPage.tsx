import { useLocation, useNavigate } from "react-router-dom";
import { masterAdminApi, type TenantInfo } from "@/api/master/masterAdminApi";
import { TenantManagementHub, type TenantHubTab } from "../components/TenantManagementHub";
import { useMasterDashboard } from "@/features/master/shell/MasterAdminContext";

function currentTab(pathname: string): TenantHubTab {
  const value = pathname.split("/")[3];
  return value === "overview" || value === "create" || value === "verification" || value === "provisioning"
    ? value
    : "directory";
}

export function TenantManagementPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { tenants, setTenants, triggerNotification } = useMasterDashboard();

  const toggleStatus = async (tenant: TenantInfo) => {
    if (tenant.status === "FAILED" || tenant.status === "PROVISIONING") {
      navigate(`/onboard?retry=${tenant.id}`);
      return;
    }
    const status = tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const updated = await masterAdminApi.updateTenantStatus(tenant.id, status);
    setTenants((items) => items.map((item) => item.id === updated.id ? updated : item));
    triggerNotification(`Đã cập nhật trạng thái tenant ${tenant.code} sang ${status}`);
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
      onRetryProvisioning={(tenant) => navigate(`/onboard?retry=${tenant.id}`)}
    />
  );
}
