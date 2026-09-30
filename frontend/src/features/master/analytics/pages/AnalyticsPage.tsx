import { PlatformAnalyticsDashboard } from "@/features/master/analytics/components/PlatformAnalyticsDashboard";
import { useTenants, useRevenueAnalytics, useAiQuotaUsage, useAuditLogs } from "@/api/master/queries";
import { toast } from "@/stores/toastStore";

export function AnalyticsPage() {
  const { data: tenants = [] } = useTenants();
  const { data: revenue } = useRevenueAnalytics();
  const { data: aiQuota } = useAiQuotaUsage();
  const { data: logs = [] } = useAuditLogs();
  const triggerNotification = (msg: string) => toast.success(msg);

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
      revenue={revenue ?? null}
      aiQuota={aiQuota ?? null}
      tenants={tenants}
      logs={logs}
      onExport={handleExportReport}
    />
  );
}
