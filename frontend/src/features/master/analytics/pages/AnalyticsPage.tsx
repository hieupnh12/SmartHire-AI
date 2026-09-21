import { PlatformAnalyticsDashboard } from "@/features/master/analytics/components/PlatformAnalyticsDashboard";
import { useMasterDashboard } from "@/features/master/shell/MasterAdminContext";

export function AnalyticsPage() {
  const { revenue, aiQuota, tenants, logs, triggerNotification } = useMasterDashboard();

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
