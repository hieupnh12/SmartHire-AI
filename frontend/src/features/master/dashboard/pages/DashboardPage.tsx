import { useNavigate } from "react-router-dom";
import { PlatformHomeDashboard } from "../components/PlatformHomeDashboard";
import { useTenants, useSubscriptions, useRevenueAnalytics, useAiQuotaUsage, useAuditLogs, useLeads, useInvoices, useContracts, masterQueryKeys } from "@/api/master/queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";

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
      revenue={revenue}
      aiQuota={aiQuota}
      tenants={tenants}
      logs={logs}
      onNavigate={(destination) => navigate(destinationPaths[destination])}
      onCreateTenant={() => navigate("/admin/tenants/create")}
    />
  );
}
