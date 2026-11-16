import { useState } from "react";
import { PlatformAnalyticsDashboard } from "@/features/master/analytics/components/PlatformAnalyticsDashboard";
import { useTenants, useRevenueAnalytics, useAiQuotaUsage, useAuditLogs } from "@/api/master/queries";
import { toast } from "@/stores/toastStore";
import { useT } from "@/i18n";

export function AnalyticsPage() {
  const t = useT();
  const [groupBy, setGroupBy] = useState<"MONTH" | "QUARTER" | "YEAR">("MONTH");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const startDate = groupBy === "YEAR"
    ? `${selectedYear - 4}-01-01T00:00:00`
    : `${selectedYear}-01-01T00:00:00`;
  const endDate = `${selectedYear}-12-31T23:59:59`;

  const { data: tenants = [] } = useTenants();
  const { data: revenue } = useRevenueAnalytics({ startDate, endDate, groupBy });
  const { data: aiQuota } = useAiQuotaUsage();
  const { data: logs = [] } = useAuditLogs();
  const triggerNotification = (msg: string) => toast.success(msg);

  const handleExportReport = () => {
    const report = {
      exportedAt: new Date().toISOString(),
      groupBy,
      selectedYear,
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
    triggerNotification(t("master.ops.analytics.exportSuccess"));
  };

  return (
    <PlatformAnalyticsDashboard
      revenue={revenue ?? null}
      aiQuota={aiQuota ?? null}
      tenants={tenants}
      logs={logs}
      groupBy={groupBy}
      onGroupByChange={setGroupBy}
      selectedYear={selectedYear}
      onYearChange={setSelectedYear}
      onExport={handleExportReport}
    />
  );
}
