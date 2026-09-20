import { useNavigate } from "react-router-dom";
import { PlatformHomeDashboard } from "../components/PlatformHomeDashboard";
import { useMasterDashboard } from "@/features/master/shell/MasterAdminContext";

const destinationPaths = {
  analytics: "/admin/analytics",
  tenants: "/admin/tenants/directory",
  subscriptions: "/admin/subscriptions/plans",
  logs: "/admin/system/logs",
} as const;

export function DashboardPage() {
  const navigate = useNavigate();
  const { revenue, aiQuota, tenants, logs } = useMasterDashboard();

  return (
    <PlatformHomeDashboard
      revenue={revenue}
      aiQuota={aiQuota}
      tenants={tenants}
      logs={logs}
      onNavigate={(destination) => navigate(destinationPaths[destination])}
      onCreateTenant={() => navigate("/admin/tenants/create")}
    />
  );
}
