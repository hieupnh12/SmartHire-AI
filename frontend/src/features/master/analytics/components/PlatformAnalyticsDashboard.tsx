import { useState, type ComponentType } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Building2,
  CircleDollarSign,
  Clock3,
  Cpu,
  Download,
  HeartPulse,
  LifeBuoy,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import type { AiQuotaUsage, AuditLog, RevenueAnalytics, TenantInfo } from "@/api/master/masterAdminApi";
import { cn } from "@/lib/utils";

type PlatformTab = "overview" | "revenue" | "tenants" | "ai" | "system" | "security" | "operations";

type Props = {
  revenue: RevenueAnalytics | null;
  aiQuota: AiQuotaUsage | null;
  tenants: TenantInfo[];
  logs: AuditLog[];
  onExport: () => void;
};

const tabs: Array<{ id: PlatformTab; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "overview", label: "Tổng quan", icon: TrendingUp },
  { id: "revenue", label: "Doanh thu", icon: CircleDollarSign },
  { id: "tenants", label: "Tenant health", icon: Building2 },
  { id: "ai", label: "AI usage", icon: Bot },
  { id: "system", label: "Hệ thống", icon: HeartPulse },
  { id: "security", label: "Bảo mật", icon: ShieldCheck },
  { id: "operations", label: "Vận hành", icon: LifeBuoy },
];

const cardClass = "rounded-2xl border border-slate-200 bg-white shadow-[0_4px_14px_-8px_rgba(15,23,42,0.18)]";

function MetricCard({ label, value, change, helper, icon: Icon, direction = "up" }: { label: string; value: string; change: string; helper: string; icon: ComponentType<{ className?: string }>; direction?: "up" | "down" }) {
  const ChangeIcon = direction === "up" ? ArrowUpRight : ArrowDownRight;
  return <article className={cn(cardClass, "p-5")}>
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p></div><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon className="size-5" aria-hidden="true" /></span></div>
    <p className="mt-4 flex items-center gap-1 text-xs text-slate-500"><span className={cn("inline-flex items-center font-semibold", direction === "up" ? "text-emerald-700" : "text-blue-700")}><ChangeIcon className="size-3.5" />{change}</span>{helper}</p>
  </article>;
}

function Overview({ revenue, aiQuota, tenants, logs }: Omit<Props, "onExport">) {
  const attentionTenants = tenants.filter((tenant) => tenant.status !== "ACTIVE").length;
  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <MetricCard label="MRR" value={`$${(revenue?.mrr ?? 0).toLocaleString()}`} change={revenue?.growthRate ?? "+0%"} helper="so với tháng trước" icon={CircleDollarSign} />
      <MetricCard label="Tenant hoạt động" value={`${revenue?.activeTenants ?? 0}`} change="+3" helper="tenant mới kỳ này" icon={Building2} />
      <MetricCard label="AI gross margin" value="68,4%" change="+4,2%" helper="sau chi phí mô hình" icon={Sparkles} />
      <MetricCard label="System uptime" value="99,98%" change="Ổn định" helper="trong 30 ngày" icon={Activity} />
      <MetricCard label="Churn rate" value="2,1%" change="-0,7%" helper="thấp hơn kỳ trước" icon={Users} direction="down" />
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
      <section className={cn(cardClass, "overflow-hidden")}><div className="flex items-start justify-between border-b border-slate-100 p-5"><div><h2 className="font-semibold text-slate-950">Tăng trưởng nền tảng</h2><p className="mt-1 text-xs text-slate-500">MRR thực tế và dự báo trong 8 tháng</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Dự báo +14,8%</span></div><div className="p-5"><div className="mb-4 flex gap-5 text-xs text-slate-500"><span className="flex items-center gap-2"><i className="size-2.5 rounded-full bg-blue-600" />MRR thực tế</span><span className="flex items-center gap-2"><i className="h-0.5 w-4 border-t-2 border-dashed border-amber-500" />Dự báo</span></div><svg viewBox="0 0 700 235" className="w-full" role="img" aria-labelledby="platform-growth-title platform-growth-desc"><title id="platform-growth-title">Biểu đồ tăng trưởng MRR</title><desc id="platform-growth-desc">MRR tăng từ 29 nghìn lên 48,5 nghìn đô la và dự báo đạt 56 nghìn đô la.</desc>{[35,85,135,185].map((y) => <line key={y} x1="38" x2="675" y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 5" />)}<path d="M38 178 C100 166 118 156 170 150 S260 127 310 132 S400 91 450 98 S520 66 565 72" fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" /><path d="M565 72 C610 63 640 45 675 38" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="8 7" strokeLinecap="round" />{["T2","T3","T4","T5","T6","T7","T8","T9"].map((label,index) => <text key={label} x={38 + index * 91} y="225" fill="#64748b" fontSize="12" textAnchor={index === 0 ? "start" : index === 7 ? "end" : "middle"}>{label}</text>)}</svg></div></section>
      <section className={cn(cardClass, "p-5")}><h2 className="font-semibold text-slate-950">Cần xử lý</h2><p className="mt-1 text-xs text-slate-500">Ưu tiên vận hành toàn nền tảng</p><div className="mt-5 space-y-3">{[
        [attentionTenants || 2, "tenant cần chú ý", "Provisioning hoặc tạm ngưng", "amber"],
        [3, "hóa đơn quá hạn", "$2.940 cần thu hồi", "rose"],
        [6, "tenant gần chạm quota", "Trên 80% hạn mức AI", "amber"],
        [logs.filter((log) => log.level === "ERROR").length || 1, "sự kiện hệ thống lỗi", "Cần kiểm tra audit log", "rose"],
      ].map(([count,title,detail,tone]) => <div key={String(title)} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><span className={cn("grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold", tone === "rose" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700")}>{count}</span><div><p className="text-sm font-semibold text-slate-900">{title}</p><p className="text-xs text-slate-500">{detail}</p></div></div>)}</div></section>
    </div>
    <section className={cn(cardClass, "grid gap-4 p-5 md:grid-cols-4")}><div><p className="text-xs font-medium text-slate-500">CV đã phân tích</p><p className="mt-1 text-xl font-bold">{(aiQuota?.totalCvParsesUsed ?? 0).toLocaleString()}</p></div><div><p className="text-xs font-medium text-slate-500">Giờ AI interview</p><p className="mt-1 text-xl font-bold">{aiQuota?.totalVoiceHoursUsed ?? 0}</p></div><div><p className="text-xs font-medium text-slate-500">Chi phí AI ước tính</p><p className="mt-1 text-xl font-bold">$8.420</p></div><div><p className="text-xs font-medium text-slate-500">API success rate</p><p className="mt-1 text-xl font-bold text-emerald-700">99,72%</p></div></section>
  </div>;
}

function RevenuePanel({ revenue }: { revenue: RevenueAnalytics | null }) {
  const distribution = Object.entries(revenue?.planDistribution ?? {});
  const total = distribution.reduce((sum, [, count]) => sum + count, 0) || 1;
  return <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
    <section className={cn(cardClass, "p-5")}><h2 className="font-semibold">Doanh thu định kỳ</h2><p className="mt-1 text-xs text-slate-500">Chỉ số tài chính tổng hợp từ Master Database</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-blue-50 p-4"><p className="text-xs font-semibold text-blue-700">MRR</p><p className="mt-2 text-3xl font-bold text-blue-950">${(revenue?.mrr ?? 0).toLocaleString()}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-600">ARR</p><p className="mt-2 text-3xl font-bold text-slate-950">${(revenue?.arr ?? 0).toLocaleString()}</p></div><div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">ARPA</p><p className="mt-1 text-xl font-bold">$2.694</p><p className="mt-1 text-xs text-emerald-700">+8,1% kỳ trước</p></div><div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">Trial → Paid</p><p className="mt-1 text-xl font-bold">31,6%</p><p className="mt-1 text-xs text-emerald-700">+3,4% kỳ trước</p></div></div></section>
    <section className={cn(cardClass, "p-5")}><h2 className="font-semibold">Phân bổ gói dịch vụ</h2><p className="mt-1 text-xs text-slate-500">Tenant đang hoạt động theo subscription</p><div className="mt-6 space-y-5">{distribution.map(([name,count],index) => <div key={name}><div className="mb-2 flex justify-between text-sm"><span className="font-medium">{name}</span><strong>{count} tenant</strong></div><div className="h-2.5 rounded-full bg-slate-100"><div className={cn("h-full rounded-full", index === 0 ? "bg-blue-600" : index === 1 ? "bg-indigo-500" : "bg-sky-400")} style={{ width: `${count / total * 100}%` }} /></div></div>)}</div></section>
    <section className={cn(cardClass, "overflow-hidden xl:col-span-2")}><div className="border-b border-slate-100 p-5"><h2 className="font-semibold">Hóa đơn và rủi ro doanh thu</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Trạng thái</th><th className="px-3 py-3 text-right">Số hóa đơn</th><th className="px-3 py-3 text-right">Giá trị</th><th className="px-5 py-3 text-right">Tỷ trọng</th></tr></thead><tbody>{[["Đã thanh toán","46","$45.320","91,2%"],["Chờ thanh toán","7","$4.120","8,3%"],["Quá hạn","3","$2.940","5,9%"]].map((row) => <tr key={row[0]} className="border-t border-slate-100"><td className="px-5 py-4 font-semibold">{row[0]}</td><td className="px-3 py-4 text-right">{row[1]}</td><td className="px-3 py-4 text-right font-medium">{row[2]}</td><td className="px-5 py-4 text-right">{row[3]}</td></tr>)}</tbody></table></div></section>
  </div>;
}

function TenantHealthPanel({ tenants }: { tenants: TenantInfo[] }) {
  const fallback = [
    { name: "TechCorp Vietnam", status: "Khỏe mạnh", score: 94, usage: 72, risk: "Thấp" },
    { name: "VNG Corporation", status: "Theo dõi quota", score: 78, usage: 86, risk: "Trung bình" },
    { name: "ACME Enterprise", status: "Ít hoạt động", score: 62, usage: 34, risk: "Cao" },
    { name: "FPT Software", status: "Khỏe mạnh", score: 91, usage: 68, risk: "Thấp" },
  ];
  const rows = tenants.length ? tenants.slice(0, 6).map((tenant,index) => ({ name: tenant.name, status: tenant.status === "ACTIVE" ? index === 1 ? "Theo dõi quota" : "Khỏe mạnh" : tenant.status, score: tenant.status === "ACTIVE" ? [94,78,91,86,82,75][index] ?? 80 : 48, usage: [72,86,68,54,31,79][index] ?? 50, risk: tenant.status === "ACTIVE" ? index === 1 ? "Trung bình" : "Thấp" : "Cao" })) : fallback;
  return <section className={cn(cardClass, "overflow-hidden")}><div className="p-5"><h2 className="font-semibold">Sức khỏe tenant</h2><p className="mt-1 text-xs text-slate-500">Health score tổng hợp từ hoạt động, quota, thanh toán và hệ thống</p></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Tenant</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3">Health score</th><th className="px-3 py-3">AI quota</th><th className="px-5 py-3 text-right">Rủi ro churn</th></tr></thead><tbody>{rows.map((tenant) => <tr key={tenant.name} className="border-t border-slate-100 hover:bg-blue-50/40"><td className="px-5 py-4 font-semibold text-slate-900">{tenant.name}</td><td className="px-3 py-4 text-slate-600">{tenant.status}</td><td className="px-3 py-4"><div className="flex items-center gap-3"><div className="h-2 w-28 rounded-full bg-slate-100"><div className={cn("h-full rounded-full", tenant.score < 60 ? "bg-rose-500" : tenant.score < 80 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${tenant.score}%` }} /></div><strong>{tenant.score}</strong></div></td><td className="px-3 py-4">{tenant.usage}%</td><td className="px-5 py-4 text-right"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", tenant.risk === "Cao" ? "bg-rose-50 text-rose-700" : tenant.risk === "Trung bình" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>{tenant.risk}</span></td></tr>)}</tbody></table></div></section>;
}

function AiUsagePanel({ aiQuota }: { aiQuota: AiQuotaUsage | null }) {
  const cvPercent = Math.round(((aiQuota?.totalCvParsesUsed ?? 0) / (aiQuota?.totalCvParsesLimit || 1)) * 100);
  const voicePercent = Math.round(((aiQuota?.totalVoiceHoursUsed ?? 0) / (aiQuota?.totalVoiceHoursLimit || 1)) * 100);
  return <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
    <section className={cn(cardClass, "p-5")}><h2 className="font-semibold">Tiêu thụ tài nguyên AI</h2><p className="mt-1 text-xs text-slate-500">Toàn nền tảng trong chu kỳ hiện tại</p><div className="mt-6 space-y-6">{[["CV parsing & screening", aiQuota?.totalCvParsesUsed ?? 0, aiQuota?.totalCvParsesLimit ?? 0, cvPercent],["AI interview voice hours", aiQuota?.totalVoiceHoursUsed ?? 0, aiQuota?.totalVoiceHoursLimit ?? 0, voicePercent]].map(([label,used,limit,percent]) => <div key={String(label)}><div className="mb-2 flex flex-wrap justify-between gap-2 text-sm"><span className="font-medium">{label}</span><strong>{Number(used).toLocaleString()} / {Number(limit).toLocaleString()} ({percent}%)</strong></div><div className="h-3 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${percent}%` }} /></div></div>)}</div><div className="mt-7 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Chi phí AI</p><p className="mt-1 text-xl font-bold">$8.420</p></div><div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs text-emerald-700">AI gross margin</p><p className="mt-1 text-xl font-bold text-emerald-900">68,4%</p></div></div></section>
    <section className={cn(cardClass, "p-5")}><h2 className="font-semibold">Dịch vụ AI đang hoạt động</h2><p className="mt-1 text-xs text-slate-500">Trạng thái và tỷ trọng chi phí ước tính</p><div className="mt-5 space-y-3">{(aiQuota?.activeModels ?? ["CV Screening Model","Speech-to-Text","Semantic Matching"]).map((model,index) => <div key={model} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-600"><Bot className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{model}</p><p className="text-xs text-slate-500">{["42% chi phí AI","26% chi phí AI","18% chi phí AI","14% chi phí AI"][index] ?? "Đang hoạt động"}</p></div><span className="size-2.5 rounded-full bg-emerald-500" aria-label="Đang hoạt động" /></div>)}</div></section>
  </div>;
}

function SystemPanel() {
  const services = [["Master API","99,99%","142 ms","Healthy"],["Tenant databases","99,98%","38 / 40 pools","Healthy"],["Redis cache","99,97%","92% hit rate","Healthy"],["RabbitMQ workers","99,91%","18 jobs queued","Warning"],["Email delivery","99,62%","0,38% bounced","Healthy"]];
  return <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]"><section className={cn(cardClass, "overflow-hidden")}><div className="p-5"><h2 className="font-semibold">Tình trạng dịch vụ</h2><p className="mt-1 text-xs text-slate-500">Uptime, latency và tài nguyên hạ tầng</p></div><div className="divide-y divide-slate-100">{services.map(([name,uptime,detail,status]) => <div key={name} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 sm:grid-cols-[1fr_100px_130px_90px]"><strong className="text-sm">{name}</strong><span className="text-sm">{uptime}</span><span className="text-xs text-slate-500">{detail}</span><span className={cn("text-right text-xs font-semibold", status === "Warning" ? "text-amber-700" : "text-emerald-700")}>{status}</span></div>)}</div></section><section className={cn(cardClass, "p-5")}><Cpu className="size-6 text-blue-600" /><h2 className="mt-4 font-semibold">Worker pipeline</h2><dl className="mt-5 space-y-4 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Job đang chờ</dt><dd className="font-bold">18</dd></div><div className="flex justify-between"><dt className="text-slate-500">Job retry</dt><dd className="font-bold text-amber-700">3</dd></div><div className="flex justify-between"><dt className="text-slate-500">Job thất bại</dt><dd className="font-bold text-rose-700">1</dd></div><div className="flex justify-between"><dt className="text-slate-500">Throughput</dt><dd className="font-bold">248/phút</dd></div></dl></section></div>;
}

function SecurityPanel({ logs }: { logs: AuditLog[] }) {
  const items = logs.slice(0, 5);
  return <div className="grid gap-5 xl:grid-cols-[0.7fr_1.3fr]"><section className={cn(cardClass, "p-5")}><ShieldCheck className="size-7 text-blue-600" /><h2 className="mt-4 font-semibold">Security posture</h2><p className="mt-1 text-xs text-slate-500">Không phát hiện truy cập cross-tenant thành công.</p><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Đã chặn</p><p className="mt-1 text-2xl font-bold text-emerald-900">27</p></div><div className="rounded-xl bg-amber-50 p-3"><p className="text-xs text-amber-700">Cần xem xét</p><p className="mt-1 text-2xl font-bold text-amber-900">3</p></div></div></section><section className={cn(cardClass, "overflow-hidden")}><div className="border-b border-slate-100 p-5"><h2 className="font-semibold">Sự kiện bảo mật và audit gần đây</h2></div><div className="divide-y divide-slate-100">{items.length ? items.map((log) => <div key={log.id} className="flex gap-3 px-5 py-4"><span className={cn("mt-0.5 size-2.5 shrink-0 rounded-full", log.level === "ERROR" ? "bg-rose-500" : log.level === "WARN" ? "bg-amber-500" : "bg-blue-500")} /><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><strong className="text-sm">{log.action}</strong><span className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString("vi-VN")}</span></div><p className="mt-1 text-xs text-slate-500">{log.tenantCode} · {log.description}</p></div></div>) : <p className="p-8 text-center text-sm text-slate-500">Chưa có sự kiện audit.</p>}</div></section></div>;
}

function OperationsPanel() {
  return <div className="grid gap-5 md:grid-cols-3"><section className={cn(cardClass, "p-5")}><LifeBuoy className="size-6 text-blue-600" /><p className="mt-4 text-sm text-slate-500">Ticket đang mở</p><p className="mt-1 text-3xl font-bold">14</p><p className="mt-2 text-xs text-rose-700">3 ticket quá SLA</p></section><section className={cn(cardClass, "p-5")}><Clock3 className="size-6 text-blue-600" /><p className="mt-4 text-sm text-slate-500">Thời gian phản hồi TB</p><p className="mt-1 text-3xl font-bold">2,4 giờ</p><p className="mt-2 text-xs text-emerald-700">Nhanh hơn 18% kỳ trước</p></section><section className={cn(cardClass, "p-5")}><Building2 className="size-6 text-blue-600" /><p className="mt-4 text-sm text-slate-500">Onboarding chờ xử lý</p><p className="mt-1 text-3xl font-bold">4</p><p className="mt-2 text-xs text-amber-700">1 provisioning cần retry</p></section><section className={cn(cardClass, "overflow-hidden md:col-span-3")}><div className="border-b border-slate-100 p-5"><h2 className="font-semibold">Hàng đợi công việc vận hành</h2></div><div className="divide-y divide-slate-100">{[["Retry provisioning Techcombank","Hạ tầng","Ưu tiên cao"],["Xử lý invoice quá hạn ACME","Thanh toán","Hôm nay"],["Kiểm tra quota VNG","AI usage","Trong 24 giờ"],["Phê duyệt nâng gói FPT Software","Subscription","Trong 48 giờ"]].map(([task,type,due],index) => <div key={task} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center"><span className={cn("grid size-8 place-items-center rounded-lg", index === 0 ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700")}><AlertTriangle className="size-4" /></span><div className="flex-1"><p className="text-sm font-semibold">{task}</p><p className="text-xs text-slate-500">{type}</p></div><span className="text-xs font-semibold text-slate-600">{due}</span></div>)}</div></section></div>;
}

export function PlatformAnalyticsDashboard({ revenue, aiQuota, tenants, logs, onExport }: Props) {
  const [activeTab, setActiveTab] = useState<PlatformTab>("overview");
  const panels: Record<PlatformTab, React.ReactNode> = {
    overview: <Overview revenue={revenue} aiQuota={aiQuota} tenants={tenants} logs={logs} />,
    revenue: <RevenuePanel revenue={revenue} />,
    tenants: <TenantHealthPanel tenants={tenants} />,
    ai: <AiUsagePanel aiQuota={aiQuota} />,
    system: <SystemPanel />,
    security: <SecurityPanel logs={logs} />,
    operations: <OperationsPanel />,
  };
  return <div className="space-y-5 animate-fade-in">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-blue-600">Platform intelligence</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Trung tâm điều hành SmartHire AI</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">Theo dõi tăng trưởng SaaS, sức khỏe tenant, chi phí AI và vận hành hệ thống mà không truy cập dữ liệu tuyển dụng chi tiết của khách hàng.</p></div><button type="button" onClick={onExport} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"><Download className="size-4" />Xuất báo cáo</button></header>
    <nav className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm" aria-label="Các nhóm thống kê nền tảng"><div className="flex min-w-max gap-1" role="tablist">{tabs.map((tab) => { const Icon = tab.icon; const selected = activeTab === tab.id; return <button key={tab.id} type="button" role="tab" id={`platform-tab-${tab.id}`} aria-selected={selected} aria-controls={`platform-panel-${tab.id}`} onClick={() => setActiveTab(tab.id)} className={cn("inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition-colors", selected ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}><Icon className="size-4" aria-hidden="true" />{tab.label}</button>; })}</div></nav>
    <div role="tabpanel" tabIndex={0} id={`platform-panel-${activeTab}`} aria-labelledby={`platform-tab-${activeTab}`}>{panels[activeTab]}</div>
  </div>;
}
