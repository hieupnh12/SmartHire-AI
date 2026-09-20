import { useState, type ComponentType } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Clock3,
  Gauge,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ux/Card";
import { cn } from "@/lib/utils";

type AnalyticsTab = "overview" | "pipeline" | "talent" | "team" | "usage";

const tabs: Array<{ id: AnalyticsTab; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "overview", label: "Tổng quan", icon: ChartNoAxesCombined },
  { id: "pipeline", label: "Hiệu suất pipeline", icon: TrendingUp },
  { id: "talent", label: "Chất lượng ứng viên", icon: Target },
  { id: "team", label: "Hiệu suất đội ngũ", icon: Users },
  { id: "usage", label: "AI & chi phí", icon: Sparkles },
];

const kpis = [
  { label: "Vị trí đang tuyển", value: "24", change: "+3", trend: "up", helper: "so với kỳ trước", icon: BriefcaseBusiness },
  { label: "Ứng viên mới", value: "1.248", change: "+12,5%", trend: "up", helper: "trong 30 ngày", icon: Users },
  { label: "Tỷ lệ tuyển thành công", value: "18,7%", change: "+2,4%", trend: "up", helper: "so với kỳ trước", icon: UserCheck },
  { label: "Thời gian tuyển TB", value: "18 ngày", change: "-3 ngày", trend: "down", helper: "nhanh hơn kỳ trước", icon: Clock3 },
] as const;

const funnel = [
  { label: "Ứng tuyển", value: 1248, width: 100 },
  { label: "Qua sàng lọc", value: 786, width: 78 },
  { label: "Đánh giá kỹ thuật", value: 342, width: 58 },
  { label: "Phỏng vấn", value: 156, width: 42 },
  { label: "Đề nghị", value: 48, width: 29 },
  { label: "Đã tuyển", value: 32, width: 22 },
];

const skills = [
  { name: "Java & JVM", average: 88, required: 92, tone: "primary" },
  { name: "Spring Boot", average: 82, required: 85, tone: "primary" },
  { name: "Docker & Kubernetes", average: 58, required: 75, tone: "warning" },
  { name: "Cloud Architecture", average: 42, required: 70, tone: "danger" },
];

const requisitions = [
  { role: "Java Backend Developer", owner: "Thu Trang", applicants: 320, screened: 184, interviews: 32, hires: 7, time: "16 ngày", status: "Đang tuyển" },
  { role: "React Native Lead", owner: "Minh Tuấn", applicants: 210, screened: 126, interviews: 28, hires: 5, time: "21 ngày", status: "Đang tuyển" },
  { role: "DevOps & SRE Specialist", owner: "Hoàng Nam", applicants: 180, screened: 96, interviews: 19, hires: 4, time: "19 ngày", status: "Đã đóng" },
  { role: "AI/ML Research Engineer", owner: "Thu Trang", applicants: 140, screened: 72, interviews: 14, hires: 3, time: "24 ngày", status: "Đang tuyển" },
];

function MetricCard({ item }: { item: (typeof kpis)[number] }) {
  const Icon = item.icon;
  const TrendIcon = item.trend === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <Card className="min-w-0 p-4 lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{item.label}</p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">{item.value}</p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
        <span className="inline-flex items-center font-semibold text-brand-primary">
          <TrendIcon className="mr-0.5 size-3.5" aria-hidden="true" />{item.change}
        </span>
        <span>{item.helper}</span>
      </div>
    </Card>
  );
}

function OverviewPanel() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => <MetricCard key={item.label} item={item} />)}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.05fr_1fr]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-[var(--color-border-default)] px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">Phễu tuyển dụng</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Tỷ lệ chuyển đổi qua từng giai đoạn trong 30 ngày</p>
          </div>
          <div className="space-y-3 p-5" aria-label="Phễu tuyển dụng gồm 6 giai đoạn">
            {funnel.map((stage, index) => (
              <div key={stage.label} className="grid grid-cols-[100px_1fr_52px] items-center gap-3 text-sm">
                <span className="text-[var(--color-text-secondary)]">{stage.label}</span>
                <div className="h-8 overflow-hidden rounded-lg bg-surface-muted">
                  <div className="flex h-full items-center rounded-lg bg-brand-primary px-3 text-xs font-semibold text-white" style={{ width: `${stage.width}%`, opacity: 1 - index * 0.09 }}>
                    {index > 0 && `${Math.round((stage.value / funnel[index - 1].value) * 100)}%`}
                  </div>
                </div>
                <strong className="text-right font-semibold text-[var(--color-text-primary)]">{stage.value.toLocaleString("vi-VN")}</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-0">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border-default)] px-5 py-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">Xu hướng ứng viên</h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Ứng viên mới và phỏng vấn theo tuần</p>
            </div>
            <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-semibold text-brand-primary">+12,5%</span>
          </div>
          <div className="p-5">
            <div className="mb-4 flex gap-5 text-xs text-[var(--color-text-secondary)]">
              <span className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-brand-primary" />Ứng viên</span>
              <span className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-[var(--color-secondary)]" />Phỏng vấn</span>
            </div>
            <svg viewBox="0 0 620 235" className="h-auto w-full" role="img" aria-labelledby="trend-title trend-description">
              <title id="trend-title">Xu hướng ứng viên trong 8 tuần</title>
              <desc id="trend-description">Số ứng viên tăng từ 82 lên 189; số phỏng vấn tăng từ 18 lên 45.</desc>
              {[35, 85, 135, 185].map((y) => <line key={y} x1="32" x2="600" y1={y} y2={y} stroke="var(--color-border-default)" strokeDasharray="4 5" />)}
              <path d="M32 175 C85 155 100 164 140 130 S220 115 260 120 S345 76 390 92 S475 48 520 65 S570 30 600 42" fill="none" stroke="var(--color-primary)" strokeWidth="4" strokeLinecap="round" />
              <path d="M32 198 C90 194 105 183 140 185 S220 167 260 174 S345 145 390 154 S475 126 520 135 S570 108 600 112" fill="none" stroke="var(--color-secondary)" strokeWidth="3" strokeDasharray="7 6" strokeLinecap="round" />
              {['T1','T2','T3','T4','T5','T6','T7','T8'].map((label, index) => <text key={label} x={32 + index * 81} y="225" fill="var(--color-text-secondary)" fontSize="12" textAnchor={index === 0 ? "start" : index === 7 ? "end" : "middle"}>{label}</text>)}
            </svg>
          </div>
        </Card>
      </div>
    </div>
  );
}

function PipelinePanel() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col gap-2 border-b border-[var(--color-border-default)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">Hiệu suất theo vị trí tuyển dụng</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">So sánh lượng ứng viên, chuyển đổi và tốc độ tuyển</p>
        </div>
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">Cập nhật 10 phút trước</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
            <tr><th className="px-5 py-3 font-semibold">Vị trí / phụ trách</th><th className="px-3 py-3 text-center font-semibold">Ứng viên</th><th className="px-3 py-3 text-center font-semibold">Sàng lọc</th><th className="px-3 py-3 text-center font-semibold">Phỏng vấn</th><th className="px-3 py-3 text-center font-semibold">Đã tuyển</th><th className="px-3 py-3 text-center font-semibold">Thời gian TB</th><th className="px-5 py-3 text-right font-semibold">Trạng thái</th></tr>
          </thead>
          <tbody>
            {requisitions.map((item) => (
              <tr key={item.role} className="border-t border-[var(--color-border-default)] transition-colors hover:bg-[var(--color-primary-subtle)]">
                <td className="px-5 py-4"><strong className="block font-semibold text-[var(--color-text-primary)]">{item.role}</strong><span className="text-xs text-[var(--color-text-secondary)]">{item.owner}</span></td>
                <td className="px-3 py-4 text-center font-medium">{item.applicants}</td><td className="px-3 py-4 text-center">{item.screened}</td><td className="px-3 py-4 text-center">{item.interviews}</td><td className="px-3 py-4 text-center font-semibold text-brand-primary">{item.hires}</td><td className="px-3 py-4 text-center">{item.time}</td>
                <td className="px-5 py-4 text-right"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", item.status === "Đang tuyển" ? "bg-[var(--color-primary-soft)] text-brand-primary" : "bg-surface-muted text-[var(--color-text-secondary)]")}>{item.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function TalentPanel() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <div className="mb-6"><h2 className="font-display text-lg font-semibold">Khoảng cách kỹ năng</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">Năng lực trung bình của ứng viên so với yêu cầu công việc</p></div>
        <div className="space-y-5">
          {skills.map((skill) => {
            const gap = skill.average - skill.required;
            return <div key={skill.name}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-medium">{skill.name}</span><span className={cn("text-xs font-semibold", skill.tone === "danger" ? "text-status-danger" : skill.tone === "warning" ? "text-status-warning" : "text-brand-primary")}>TB {skill.average}% · Yêu cầu {skill.required}% · {gap}%</span></div>
              <div className="relative h-2.5 rounded-full bg-surface-muted"><div className={cn("h-full rounded-full", skill.tone === "danger" ? "bg-status-danger" : skill.tone === "warning" ? "bg-status-warning" : "bg-brand-primary")} style={{ width: `${skill.average}%` }} /><span className="absolute -top-1 h-4 w-0.5 bg-[var(--color-text-primary)]" style={{ left: `${skill.required}%` }} /></div>
            </div>;
          })}
        </div>
      </Card>
      <Card className="flex flex-col justify-between bg-[linear-gradient(145deg,var(--color-primary-subtle),var(--color-surface-card))]">
        <div><span className="inline-flex size-11 items-center justify-center rounded-xl bg-brand-primary text-white"><Gauge className="size-5" /></span><p className="mt-5 text-sm font-medium text-[var(--color-text-secondary)]">Điểm chất lượng ứng viên</p><p className="mt-1 font-display text-5xl font-semibold tracking-tight">78<span className="text-xl text-[var(--color-text-secondary)]">/100</span></p><p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">Tăng 6 điểm so với quý trước. Cloud Architecture là nhóm kỹ năng cần ưu tiên nguồn ứng viên mới.</p></div>
        <div className="mt-8 border-t border-[var(--color-border-default)] pt-4 text-sm"><div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">AI - Hội đồng đồng thuận</span><strong>91,4%</strong></div><div className="mt-3 flex justify-between"><span className="text-[var(--color-text-secondary)]">Điểm matching trung bình</span><strong>82%</strong></div></div>
      </Card>
    </div>
  );
}

function TeamPanel() {
  const team = [
    { name: "Thu Trang", role: "Recruitment Lead", jobs: 5, candidates: 320, interviews: 45, hires: 12, initials: "TT" },
    { name: "Minh Tuấn", role: "Senior Recruiter", jobs: 4, candidates: 250, interviews: 38, hires: 9, initials: "MT" },
    { name: "Hoàng Nam", role: "Talent Specialist", jobs: 3, candidates: 180, interviews: 26, hires: 6, initials: "HN" },
  ];
  return <div className="grid gap-4 md:grid-cols-3">{team.map((member) => <Card key={member.name}>
    <div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-xl bg-brand-primary font-semibold text-white">{member.initials}</span><div><h2 className="font-semibold">{member.name}</h2><p className="text-xs text-[var(--color-text-secondary)]">{member.role}</p></div></div>
    <dl className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-surface-muted p-3"><dt className="text-xs text-[var(--color-text-secondary)]">Vị trí quản lý</dt><dd className="mt-1 text-xl font-semibold">{member.jobs}</dd></div><div className="rounded-xl bg-surface-muted p-3"><dt className="text-xs text-[var(--color-text-secondary)]">Ứng viên</dt><dd className="mt-1 text-xl font-semibold">{member.candidates}</dd></div><div className="rounded-xl bg-surface-muted p-3"><dt className="text-xs text-[var(--color-text-secondary)]">Phỏng vấn</dt><dd className="mt-1 text-xl font-semibold">{member.interviews}</dd></div><div className="rounded-xl bg-[var(--color-primary-soft)] p-3"><dt className="text-xs text-brand-primary">Đã tuyển</dt><dd className="mt-1 text-xl font-semibold text-brand-primary">{member.hires}</dd></div></dl>
  </Card>)}</div>;
}

function UsagePanel() {
  return <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
    <Card><div className="flex items-start gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary"><Zap className="size-5" /></span><div><h2 className="font-display text-lg font-semibold">Hạn mức AI hàng tháng</h2><p className="mt-1 text-sm text-[var(--color-text-secondary)]">Gói Enterprise Professional · còn 12 ngày</p></div></div><div className="mt-7 rounded-xl bg-surface-muted p-4"><div className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-medium">CV parsing & screening</span><strong className="text-brand-primary">7.200 / 10.000 credits</strong></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--color-surface-container-highest)]"><div className="h-full w-[72%] rounded-full bg-brand-primary" /></div><div className="mt-2 flex justify-between text-xs text-[var(--color-text-secondary)]"><span>Còn 2.800 credits</span><span>Ước tính 140 credits/ngày</span></div></div></Card>
    <Card className="bg-[linear-gradient(145deg,var(--color-primary-subtle),var(--color-surface-card))]"><Activity className="size-6 text-brand-primary" /><p className="mt-5 text-sm font-medium text-[var(--color-text-secondary)]">ROI ước tính kỳ này</p><p className="mt-1 font-display text-4xl font-semibold">₫348 triệu</p><p className="mt-2 text-sm text-[var(--color-text-secondary)]">Chi phí headhunter và 320 giờ kỹ thuật được tiết kiệm.</p></Card>
  </div>;
}

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");
  const panels: Record<AnalyticsTab, React.ReactNode> = { overview: <OverviewPanel />, pipeline: <PipelinePanel />, talent: <TalentPanel />, team: <TeamPanel />, usage: <UsagePanel /> };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-semibold text-brand-primary">Company analytics</p><h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">Phân tích tuyển dụng</h1><p className="mt-2 max-w-2xl text-sm text-[var(--color-text-secondary)]">Theo dõi sức khỏe pipeline, chất lượng nhân tài và hiệu quả vận hành của doanh nghiệp.</p></div>
        <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)]">Khoảng thời gian<select className="min-h-10 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-surface-card px-3 text-[var(--color-text-primary)] focus:border-[var(--color-border-focus)]"><option>30 ngày qua</option><option>Quý này</option><option>12 tháng qua</option></select></label>
      </header>

      <nav className="sticky top-0 z-20 -mx-1 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-white/90 p-1 shadow-[var(--shadow-card)] backdrop-blur-md" aria-label="Các nhóm thống kê">
        <div className="flex min-w-max gap-1" role="tablist" aria-label="Thống kê doanh nghiệp">
          {tabs.map((tab) => { const Icon = tab.icon; const selected = activeTab === tab.id; return <button key={tab.id} type="button" role="tab" aria-selected={selected} aria-controls={`analytics-panel-${tab.id}`} id={`analytics-tab-${tab.id}`} onClick={() => setActiveTab(tab.id)} className={cn("inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] px-3.5 text-sm font-medium transition-colors", selected ? "bg-brand-primary text-white shadow-sm" : "text-[var(--color-text-secondary)] hover:bg-surface-muted hover:text-[var(--color-text-primary)]")}><Icon className="size-4" aria-hidden="true" />{tab.label}</button>; })}
        </div>
      </nav>

      <div role="tabpanel" id={`analytics-panel-${activeTab}`} aria-labelledby={`analytics-tab-${activeTab}`} tabIndex={0}>{panels[activeTab]}</div>
    </section>
  );
}
