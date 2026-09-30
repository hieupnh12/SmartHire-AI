import { useState, type ComponentType } from "react";
import { Gauge, ListChecks, RefreshCw, Target, TrendingUp } from "lucide-react";
import { Card } from "@/components/ux/Card";
import { cn } from "@/lib/utils";
import { AnalyticsLoadingState } from "../components/AnalyticsLoadingState";
import { PerformancePanel } from "../components/PerformancePanel";
import { PipelinePanel } from "../components/PipelinePanel";
import { QualityPanel } from "../components/QualityPanel";
import { WorkloadPanel } from "../components/WorkloadPanel";
import { useRecruiterAnalytics, type RecruiterAnalyticsTab } from "../hooks/useRecruiterAnalytics";
import type { AnalyticsRange, PerformanceData, PipelineData, QualityData, WorkloadData } from "../types/recruiterAnalytics";

const tabs: Array<{ id: RecruiterAnalyticsTab; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "workload", label: "Công việc của tôi", icon: ListChecks },
  { id: "pipeline", label: "Pipeline & SLA", icon: TrendingUp },
  { id: "quality", label: "Chất lượng ứng viên", icon: Target },
  { id: "performance", label: "Hiệu suất cá nhân", icon: Gauge },
];

export function RecruiterAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<RecruiterAnalyticsTab>("workload");
  const [range, setRange] = useState<AnalyticsRange>("LAST_30_DAYS");
  const query = useRecruiterAnalytics(activeTab, range);
  const panel = query.data && (activeTab === "workload" ? <WorkloadPanel data={query.data as WorkloadData} /> : activeTab === "pipeline" ? <PipelinePanel data={query.data as PipelineData} /> : activeTab === "quality" ? <QualityPanel data={query.data as QualityData} /> : <PerformancePanel data={query.data as PerformanceData} />);
  return <section className="space-y-5"><header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-brand-primary">Recruiter analytics</p><h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Phân tích tuyển dụng của tôi</h1><p className="mt-2 text-sm text-[var(--color-text-secondary)]">Dữ liệu giới hạn theo các vị trí và ứng viên bạn phụ trách.</p></div><label className="flex items-center gap-2 text-sm">Thời gian<select value={range} onChange={(event) => setRange(event.target.value as AnalyticsRange)} className="min-h-10 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-surface-card px-3"><option value="LAST_30_DAYS">30 ngày qua</option><option value="CURRENT_QUARTER">Quý này</option><option value="LAST_12_MONTHS">12 tháng qua</option></select></label></header><nav className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-white/90 p-1" aria-label="Các nhóm phân tích"><div className="flex min-w-max gap-1" role="tablist">{tabs.map((tab) => { const Icon=tab.icon; const selected=activeTab===tab.id; return <button key={tab.id} type="button" role="tab" aria-selected={selected} onClick={() => setActiveTab(tab.id)} className={cn("inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] px-3.5 text-sm font-medium",selected?"bg-brand-primary text-white":"hover:bg-surface-muted")}><Icon className="size-4" aria-hidden="true" />{tab.label}</button>; })}</div></nav>{query.isPending?<AnalyticsLoadingState/>:query.isError?<Card className="py-10 text-center"><p className="text-sm text-red-700">Không thể tải dữ liệu phân tích.</p><button type="button" onClick={() => query.refetch()} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white"><RefreshCw className="size-4" aria-hidden="true"/>Thử lại</button></Card>:<div role="tabpanel">{panel}</div>}</section>;
}
