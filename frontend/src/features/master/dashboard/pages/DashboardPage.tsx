import { useNavigate } from "react-router-dom";
import { PlatformHomeDashboard } from "../components/PlatformHomeDashboard";
import { useTenants, useRevenueAnalytics, useAiQuotaUsage, useAuditLogs } from "@/api/master/queries";

const destinationPaths = {
  analytics: "/admin/analytics",
  tenants: "/admin/tenants/directory",
  subscriptions: "/admin/subscriptions/plans",
  logs: "/admin/system/logs",
} as const;

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: tenants = [] } = useTenants();
  const { data: revenue } = useRevenueAnalytics();
  const { data: aiQuota } = useAiQuotaUsage();
  const { data: logs = [] } = useAuditLogs();

  return (
    <PlatformHomeDashboard
      revenue={revenue ?? null}
      aiQuota={aiQuota ?? null}
      tenants={tenants}
      logs={logs}
      onNavigate={(destination) => navigate(destinationPaths[destination])}
      onCreateTenant={() => navigate("/admin/tenants/create")}
    />
  );
}
