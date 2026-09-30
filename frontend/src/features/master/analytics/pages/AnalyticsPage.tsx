import { useState, useEffect } from "react";
import { PlatformAnalyticsDashboard } from "@/features/master/analytics/components/PlatformAnalyticsDashboard";
import { useTenants, useSubscriptions, useRevenueAnalytics, useAiQuotaUsage, useAuditLogs, useLeads, useInvoices, useContracts, masterQueryKeys } from "@/api/master/queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";

export function AnalyticsPage() {
  const queryClient = useQueryClient();
  const { data: tenants = [] } = useTenants();
  const { data: revenue } = useRevenueAnalytics();
  const { data: aiQuota } = useAiQuotaUsage();
  const { data: logs = [] } = useAuditLogs();
  const triggerNotification = (msg: string) => toast.success(msg);
  const fetchAnalytics = () => queryClient.invalidateQueries({ queryKey: masterQueryKeys.revenue(undefined) });

  useEffect(() => {
    fetchAnalytics(undefined, undefined, "MONTH");
  }, [fetchAnalytics]);

  const handleExportReport = () => {
    const report = {
      exportedAt: new Date().toISOString(),
      revenue,
      aiQuota,
      tenants,
      logs,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `smarthire-platform-analytics-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    triggerNotification("Đã xuất báo cáo phân tích nền tảng thành công.");
  };

  return (
    <PlatformAnalyticsDashboard
      revenue={revenue}
      aiQuota={aiQuota}
      tenants={tenants}
      logs={logs}
      onExport={handleExportReport}
    />
  );
}
