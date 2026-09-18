import { useState, type ComponentType } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Gauge,
  ListChecks,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { Card } from "@/components/ux/Card";
import { cn } from "@/lib/utils";

type RecruiterTab = "workload" | "pipeline" | "quality" | "performance";

const tabs: Array<{ id: RecruiterTab; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "workload", label: "Công việc của tôi", icon: ListChecks },
  { id: "pipeline", label: "Pipeline & SLA", icon: TrendingUp },
  { id: "quality", label: "Chất lượng ứng viên", icon: Target },
  { id: "performance", label: "Hiệu suất cá nhân", icon: Gauge },
];

const actionItems = [
  { title: "CV mới cần sàng lọc", detail: "Java Backend Developer", count: 18, urgency: "Hôm nay", icon: Users },
  { title: "Ứng viên chờ phản hồi", detail: "Quá SLA 24 giờ", count: 7, urgency: "Ưu tiên", icon: Clock3 },
  { title: "Đánh giá chờ duyệt", detail: "3 vị trí đang tuyển", count: 9, urgency: "Tuần này", icon: ListChecks },
  { title: "Phỏng vấn sắp tới", detail: "2 lịch cần xác nhận", count: 6, urgency: "48 giờ tới", icon: UserCheck },
];

const jobs = [
  { role: "Java Backend Developer", candidates: 86, stage: "Phỏng vấn kỹ thuật", stale: 4, health: 82 },
  { role: "React Native Lead", candidates: 54, stage: "Sàng lọc", stale: 7, health: 68 },
  { role: "DevOps & SRE Specialist", candidates: 41, stage: "Assessment", stale: 3, health: 74 },
  { role: "AI/ML Research Engineer", candidates: 32, stage: "Phỏng vấn HR", stale: 1, health: 91 },
];

const sources = [
  { label: "Referral", volume: 64, quality: 88, conversion: "24%" },
  { label: "LinkedIn", volume: 118, quality: 82, conversion: "17%" },
  { label: "Career site", volume: 96, quality: 76, conversion: "14%" },
  { label: "Job boards", volume: 142, quality: 67, conversion: "9%" },
];

function WorkloadPanel() {
  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {actionItems.map((item) => { const Icon = item.icon; return <Card key={item.title} className="p-4">
        <div className="flex items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary"><Icon className="size-5" aria-hidden="true" /></span><span className="rounded-full bg-surface-muted px-2 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)]">{item.urgency}</span></div>
        <p className="mt-4 text-3xl font-semibold tracking-tight">{item.count}</p><h2 className="mt-1 text-sm font-semibold">{item.title}</h2><p className="mt-1 text-xs text-[var(--color-text-secondary)]">{item.detail}</p>
      </Card>; })}
    </div>
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--color-border-default)] px-5 py-4"><h2 className="font-display text-lg font-semibold">Vị trí cần chú ý</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">Ưu tiên dựa trên SLA, độ khỏe pipeline và số ứng viên đang chờ</p></div>
      <div className="divide-y divide-[var(--color-border-default)]">
        {jobs.map((job) => <div key={job.role} className="grid gap-4 px-5 py-4 transition-colors hover:bg-[var(--color-primary-subtle)] md:grid-cols-[1fr_150px_120px_auto] md:items-center">
          <div><h3 className="font-semibold">{job.role}</h3><p className="mt-1 text-xs text-[var(--color-text-secondary)]">{job.candidates} ứng viên · Đang ở vòng {job.stage}</p></div>
          <div><div className="mb-1 flex justify-between text-xs"><span className="text-[var(--color-text-secondary)]">Độ khỏe</span><strong>{job.health}%</strong></div><div className="h-2 rounded-full bg-surface-muted"><div className="h-full rounded-full bg-brand-primary" style={{ width: `${job.health}%` }} /></div></div>
          <span className={cn("w-fit rounded-full px-2.5 py-1 text-xs font-semibold", job.stale >= 5 ? "bg-amber-100 text-amber-800" : "bg-[var(--color-primary-soft)] text-brand-primary")}>{job.stale} quá SLA</span>
          <button type="button" className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-brand-primary hover:bg-[var(--color-primary-soft)]">Xem pipeline <ArrowRight className="size-4" /></button>
        </div>)}
      </div>
    </Card>
  </div>;
}

function PipelinePanel() {
  const stages = [
    { label: "Ứng tuyển", value: 420, percent: 100 },
    { label: "Sàng lọc", value: 258, percent: 61 },
    { label: "Assessment", value: 126, percent: 49 },
    { label: "Phỏng vấn", value: 68, percent: 54 },
    { label: "Offer", value: 22, percent: 32 },
    { label: "Đã tuyển", value: 17, percent: 77 },
  ];
  return <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
    <Card><h2 className="font-display text-lg font-semibold">Pipeline của tôi</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">420 ứng viên trên 4 vị trí đang phụ trách</p><div className="mt-6 space-y-3">{stages.map((stage, index) => <div key={stage.label} className="grid grid-cols-[92px_1fr_48px] items-center gap-3 text-sm"><span className="text-[var(--color-text-secondary)]">{stage.label}</span><div className="h-9 overflow-hidden rounded-lg bg-surface-muted"><div className="flex h-full items-center rounded-lg bg-brand-primary px-3 text-xs font-semibold text-white" style={{ width: `${Math.max(22, 100 - index * 13)}%`, opacity: 1 - index * .08 }}>{index === 0 ? "Bắt đầu" : `${stage.percent}% chuyển đổi`}</div></div><strong className="text-right">{stage.value}</strong></div>)}</div></Card>
    <Card><div className="flex items-center justify-between"><div><h2 className="font-display text-lg font-semibold">Cảnh báo SLA</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">Ứng viên chờ xử lý quá lâu</p></div><Clock3 className="size-6 text-amber-600" /></div><div className="mt-5 space-y-3">{[
      ["Sàng lọc CV", "7 ứng viên", "38 giờ"], ["Chờ feedback phỏng vấn", "4 ứng viên", "31 giờ"], ["Chờ gửi offer", "2 ứng viên", "19 giờ"],
    ].map(([stage, count, duration]) => <div key={stage} className="rounded-xl border border-[var(--color-border-default)] p-4"><div className="flex items-center justify-between gap-3"><strong className="text-sm">{stage}</strong><span className="text-xs font-semibold text-amber-700">{duration}</span></div><p className="mt-1 text-xs text-[var(--color-text-secondary)]">{count} cần được xử lý</p></div>)}</div></Card>
  </div>;
}

function QualityPanel() {
  return <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
    <Card className="overflow-hidden p-0"><div className="border-b border-[var(--color-border-default)] px-5 py-4"><h2 className="font-display text-lg font-semibold">Chất lượng theo nguồn ứng viên</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">So sánh quy mô, chất lượng và tỷ lệ chuyển đổi</p></div><div className="overflow-x-auto"><table className="w-full min-w-[580px] text-sm"><thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-[var(--color-text-secondary)]"><tr><th className="px-5 py-3">Nguồn</th><th className="px-3 py-3 text-center">Ứng viên</th><th className="px-3 py-3">Điểm chất lượng</th><th className="px-5 py-3 text-right">Chuyển đổi</th></tr></thead><tbody>{sources.map((source) => <tr key={source.label} className="border-t border-[var(--color-border-default)]"><td className="px-5 py-4 font-semibold">{source.label}</td><td className="px-3 py-4 text-center">{source.volume}</td><td className="px-3 py-4"><div className="flex items-center gap-3"><div className="h-2 flex-1 rounded-full bg-surface-muted"><div className="h-full rounded-full bg-brand-primary" style={{ width: `${source.quality}%` }} /></div><strong className="w-8 text-xs">{source.quality}</strong></div></td><td className="px-5 py-4 text-right font-semibold text-brand-primary">{source.conversion}</td></tr>)}</tbody></table></div></Card>
    <Card className="bg-[linear-gradient(145deg,var(--color-primary-subtle),var(--color-surface-card))]"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-brand-primary text-white"><Sparkles className="size-5" /></span><div><p className="text-xs font-medium text-[var(--color-text-secondary)]">Talent Quality Index</p><p className="text-2xl font-semibold">82,6 / 100</p></div></div><svg viewBox="0 0 360 150" className="mt-6 w-full" role="img" aria-label="Điểm chất lượng ứng viên tăng đều trong sáu tháng"><path d="M15 120 C65 118 72 105 110 106 S165 84 200 88 S255 55 285 62 S325 31 345 35" fill="none" stroke="var(--color-primary)" strokeWidth="4" strokeLinecap="round" /><path d="M15 120 C65 118 72 105 110 106 S165 84 200 88 S255 55 285 62 S325 31 345 35 L345 140 L15 140 Z" fill="var(--color-primary-soft)" /></svg><div className="mt-3 rounded-xl border border-brand-primary/15 bg-white/70 p-3 text-sm"><strong className="text-brand-primary">AI insight:</strong><span className="text-[var(--color-text-secondary)]"> Referral có chất lượng cao nhất; nên tăng chiến dịch giới thiệu cho nhóm Cloud.</span></div></Card>
  </div>;
}

function PerformancePanel() {
  const metrics = [
    { label: "Time-to-shortlist", value: "2,4 ngày", target: "Mục tiêu ≤ 3 ngày", score: 88 },
    { label: "Thời gian phản hồi", value: "11 giờ", target: "Mục tiêu ≤ 24 giờ", score: 94 },
    { label: "Offer acceptance", value: "77%", target: "Mục tiêu ≥ 75%", score: 77 },
    { label: "Tỷ lệ tuyển thành công", value: "16,2%", target: "Benchmark 14,8%", score: 84 },
  ];
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <Card key={metric.label} className="p-4"><p className="text-sm font-medium text-[var(--color-text-secondary)]">{metric.label}</p><p className="mt-2 text-2xl font-semibold">{metric.value}</p><div className="mt-4 h-2 rounded-full bg-surface-muted"><div className="h-full rounded-full bg-brand-primary" style={{ width: `${metric.score}%` }} /></div><p className="mt-2 text-xs text-[var(--color-text-secondary)]">{metric.target}</p></Card>)}</div><Card className="flex flex-col gap-5 sm:flex-row sm:items-center"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-brand-primary"><CheckCircle2 className="size-7" /></span><div className="flex-1"><h2 className="font-display text-lg font-semibold">Bạn đang đạt 3/4 mục tiêu vận hành</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">Ưu tiên cải thiện offer acceptance cho nhóm Senior Engineering. Đây là benchmark tổng hợp, không phải bảng xếp hạng đồng nghiệp.</p></div></Card></div>;
}

export function RecruiterAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<RecruiterTab>("workload");
  const panels: Record<RecruiterTab, React.ReactNode> = { workload: <WorkloadPanel />, pipeline: <PipelinePanel />, quality: <QualityPanel />, performance: <PerformancePanel /> };
  return <section className="space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-brand-primary">Recruiter analytics</p><h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Phân tích tuyển dụng của tôi</h1><p className="mt-2 max-w-2xl text-sm text-[var(--color-text-secondary)]">Tập trung vào việc cần xử lý, SLA pipeline và chất lượng ứng viên trong các vị trí bạn phụ trách.</p></div><label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)]">Thời gian<select className="min-h-10 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-surface-card px-3 text-[var(--color-text-primary)]"><option>30 ngày qua</option><option>Quý này</option><option>12 tháng qua</option></select></label></header>
    <nav className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-white/90 p-1 shadow-[var(--shadow-card)]" aria-label="Các nhóm phân tích tuyển dụng"><div className="flex min-w-max gap-1" role="tablist">{tabs.map((tab) => { const Icon = tab.icon; const selected = activeTab === tab.id; return <button key={tab.id} type="button" role="tab" id={`recruiter-analytics-tab-${tab.id}`} aria-controls={`recruiter-analytics-panel-${tab.id}`} aria-selected={selected} onClick={() => setActiveTab(tab.id)} className={cn("inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] px-3.5 text-sm font-medium transition-colors", selected ? "bg-brand-primary text-white shadow-sm" : "text-[var(--color-text-secondary)] hover:bg-surface-muted hover:text-[var(--color-text-primary)]")}><Icon className="size-4" />{tab.label}</button>; })}</div></nav>
    <div role="tabpanel" tabIndex={0} id={`recruiter-analytics-panel-${activeTab}`} aria-labelledby={`recruiter-analytics-tab-${activeTab}`}>{panels[activeTab]}</div>
  </section>;
}
