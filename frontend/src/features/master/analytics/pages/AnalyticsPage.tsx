import { useState, useEffect } from "react";
import { PlatformAnalyticsDashboard } from "@/features/master/analytics/components/PlatformAnalyticsDashboard";
import { useMasterDashboard } from "@/features/master/shell/MasterAdminContext";

export function AnalyticsPage() {
  const { revenue, aiQuota, tenants, logs, triggerNotification, fetchAnalytics } = useMasterDashboard();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupBy, setGroupBy] = useState("MONTH");

  useEffect(() => {
    if (startDate && endDate) {
      fetchAnalytics(startDate + "T00:00:00", endDate + "T23:59:59", groupBy);
    } else {
      fetchAnalytics(undefined, undefined, groupBy);
    }
  }, [startDate, endDate, groupBy, fetchAnalytics]);

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
    <div className="space-y-4">
      <div className="flex gap-4 items-center bg-white p-4 rounded-xl border border-slate-200">
        <h3 className="font-semibold text-slate-700">Lọc dữ liệu</h3>
        <input 
          type="date" 
          value={startDate} 
          onChange={(e) => setStartDate(e.target.value)} 
          className="rounded-lg border-slate-200 text-sm p-2"
        />
        <span>-</span>
        <input 
          type="date" 
          value={endDate} 
          onChange={(e) => setEndDate(e.target.value)} 
          className="rounded-lg border-slate-200 text-sm p-2"
        />
        <select 
          value={groupBy} 
          onChange={(e) => setGroupBy(e.target.value)}
          className="rounded-lg border-slate-200 text-sm p-2"
        >
          <option value="WEEK">Theo tuần</option>
          <option value="MONTH">Theo tháng</option>
          <option value="YEAR">Theo năm</option>
        </select>
      </div>

      <PlatformAnalyticsDashboard
        revenue={revenue}
        aiQuota={aiQuota}
        tenants={tenants}
        logs={logs}
        onExport={handleExportReport}
      />
    </div>
  );
}
