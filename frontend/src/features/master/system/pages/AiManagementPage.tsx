import { useLocation } from "react-router-dom";
import { SystemManagementWorkspace, type SystemManagementView } from "../components/SystemManagementWorkspace";
import { useTenants, useSubscriptions, useRevenueAnalytics, useAiQuotaUsage, useAuditLogs, useLeads, useInvoices, useContracts, masterQueryKeys } from "@/api/master/queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";

export function AiManagementPage() {
  const location = useLocation();
  const { data: tenants = [] } = useTenants();
  let view: SystemManagementView = "ai-usage";
  if (location.pathname.endsWith("ai-quotas")) {
    view = "ai-quotas";
  } else if (location.pathname.endsWith("ai-config")) {
    view = "ai-config";
  }
  return <SystemManagementWorkspace view={view} tenants={tenants} />;
}
