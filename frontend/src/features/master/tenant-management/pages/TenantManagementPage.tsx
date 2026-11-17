import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { masterAdminApi, type TenantInfo } from "@/api/master/masterAdminApi";
import { TenantManagementHub, type TenantHubTab } from "../components/TenantManagementHub";
import { RetryProvisioningModal } from "../components/RetryProvisioningModal";
import { useTenants, masterQueryKeys } from "@/api/master/queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";
import { useT } from "@/i18n";

function currentTab(pathname: string): TenantHubTab {
  const value = pathname.split("/")[3];
  return value === "provisioning" ? "provisioning" : "directory";
}

export function TenantManagementPage() {
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const askConfirm = useUiStore((s) => s.askConfirm);
  const { data: tenants = [] } = useTenants();
  const [retryTenant, setRetryTenant] = useState<TenantInfo | null>(null);
  const setTenants = (updater: any) => queryClient.setQueryData(masterQueryKeys.tenants(), updater);
  const triggerNotification = (msg: string) => toast.success(msg);

  const toggleStatus = async (tenant: TenantInfo) => {
    if (tenant.status === "FAILED" || tenant.status === "PROVISIONING") {
      setRetryTenant(tenant);
      return;
    }
    const status = tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const updated = await masterAdminApi.updateTenantStatus(tenant.id, status);
    setTenants((items: TenantInfo[]) => items.map((item) => item.id === updated.id ? updated : item));
    triggerNotification(t("master.ops.tenants.toasts.statusUpdated", { code: tenant.code, status }));
  };

  const handleRetrySuccess = (updatedData: any) => {
    queryClient.invalidateQueries({ queryKey: masterQueryKeys.tenants() });
    if (updatedData?.id) {
      setTenants((items: TenantInfo[]) =>
        items.map((item) => (item.id === updatedData.id ? { ...item, ...updatedData } : item))
      );
    }
  };

  const softDeleteTenant = (tenant: TenantInfo) => {
    askConfirm({
      title: t("master.ops.tenants.toasts.softDeleteConfirmTitle", { code: tenant.code }),
      description: t("master.ops.tenants.toasts.softDeleteConfirmDesc"),
      confirmLabel: t("master.ops.tenants.toasts.softDeleteConfirmBtn"),
      danger: true,
      onConfirm: async () => {
        try {
          const updated = await masterAdminApi.softDeleteTenant(tenant.id);
          setTenants((items: TenantInfo[]) => items.map((item) => item.id === updated.id ? updated : item));
          triggerNotification(t("master.ops.tenants.toasts.softDeleteSuccess", { code: tenant.code }));
        } catch {
          toast.danger(t("master.ops.tenants.toasts.softDeleteError"));
        }
      },
    });
  };

  const restoreTenant = async (tenant: TenantInfo) => {
    try {
      const updated = await masterAdminApi.restoreTenant(tenant.id);
      setTenants((items: TenantInfo[]) => items.map((item) => item.id === updated.id ? updated : item));
      triggerNotification(t("master.ops.tenants.toasts.restoreSuccess", { code: tenant.code }));
    } catch {
      toast.danger(t("master.ops.tenants.toasts.restoreError"));
    }
  };

  return (
    <>
      <TenantManagementHub
        activeTab={currentTab(location.pathname)}
        onTabChange={(tab) => navigate(`/admin/tenants/${tab}`)}
        tenants={tenants}
        onToggleStatus={toggleStatus}
        onSoftDeleteTenant={softDeleteTenant}
        onRestoreTenant={restoreTenant}
        onRetryProvisioning={(tenant) => setRetryTenant(tenant)}
      />
      {retryTenant && (
        <RetryProvisioningModal
          tenant={retryTenant}
          onClose={() => setRetryTenant(null)}
          onSuccess={handleRetrySuccess}
        />
      )}
    </>
  );
}
