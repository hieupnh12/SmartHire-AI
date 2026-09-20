import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileClock,
  Plus,
  ShieldCheck,
} from "lucide-react";
import type { AiQuotaUsage, AuditLog, RevenueAnalytics, TenantInfo } from "@/api/master/masterAdminApi";
import { cn } from "@/lib/utils";

type Destination = "analytics" | "tenants" | "subscriptions" | "logs";
type Props = {
  revenue: RevenueAnalytics | null;
  aiQuota: AiQuotaUsage | null;
  tenants: TenantInfo[];
  logs: AuditLog[];
  onNavigate: (destination: Destination) => void;
  onCreateTenant: () => void;
};

const cardClass = "rounded-2xl border border-slate-200 bg-white shadow-[0_4px_14px_-8px_rgba(15,23,42,0.18)]";

function QuickMetric({ label, value, helper, icon: Icon }: { label: string; value: string; helper: string; icon: typeof Activity }) {
  return <div className={cn(cardClass, "p-4")}><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{value}</p></div><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon className="size-5" aria-hidden="true" /></span></div><p className="mt-3 text-xs text-slate-500">{helper}</p></div>;
}

export function PlatformHomeDashboard({ revenue, aiQuota, tenants, logs, onNavigate, onCreateTenant }: Props) {
  const attentionTenants = tenants.filter((tenant) => tenant.status !== "ACTIVE");
  const warnings = logs.filter((log) => log.level !== "INFO");
  const cvUsage = Math.round(((aiQuota?.totalCvParsesUsed ?? 0) / (aiQuota?.totalCvParsesLimit || 1)) * 100);
  const tasks = [
    { title: `${attentionTenants.length || 1} tenant cần kiểm tra`, detail: "Provisioning hoặc trạng thái bất thường", icon: Building2, tone: "rose", destination: "tenants" as const },
    { title: "3 hóa đơn đã quá hạn", detail: "$2.940 đang chờ thu hồi", icon: CreditCard, tone: "amber", destination: "subscriptions" as const },
    { title: "6 tenant gần chạm AI quota", detail: "Mức sử dụng vượt ngưỡng 80%", icon: Bot, tone: "amber", destination: "analytics" as const },
    { title: `${warnings.length} cảnh báo audit mới`, detail: "Kiểm tra hệ thống và bảo mật", icon: ShieldCheck, tone: "blue", destination: "logs" as const },
  ];

  return <div className="space-y-6 animate-fade-in">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-blue-600">Platform command center</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Chào buổi sáng, Super Admin</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">Thông tin nhanh về những gì đang diễn ra trên SmartHire AI và các việc cần bạn xử lý.</p></div><button type="button" onClick={onCreateTenant} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"><Plus className="size-4" />Khởi tạo tenant</button></header>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <QuickMetric label="Tenant hoạt động" value={`${revenue?.activeTenants ?? tenants.filter((tenant) => tenant.status === "ACTIVE").length}`} helper={`${attentionTenants.length} tenant cần chú ý`} icon={Building2} />
      <QuickMetric label="MRR hiện tại" value={`$${(revenue?.mrr ?? 0).toLocaleString()}`} helper={`${revenue?.growthRate ?? "+0%"} so với tháng trước`} icon={CircleDollarSign} />
      <QuickMetric label="AI quota toàn nền tảng" value={`${cvUsage}%`} helper={`${(aiQuota?.totalCvParsesUsed ?? 0).toLocaleString()} CV đã xử lý`} icon={Bot} />
      <QuickMetric label="Tình trạng hệ thống" value="99,98%" helper="Tất cả dịch vụ cốt lõi đang hoạt động" icon={Activity} />
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <section className={cn(cardClass, "overflow-hidden")}><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="font-semibold text-slate-950">Dòng sự kiện gần đây</h2><p className="mt-1 text-xs text-slate-500">Tenant, quota, provisioning và hoạt động quản trị</p></div><button type="button" onClick={() => onNavigate("logs")} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Xem nhật ký <ArrowRight className="size-3.5" /></button></div><div className="divide-y divide-slate-100">{logs.slice(0, 6).map((log) => <article key={log.id} className="flex gap-3 px-5 py-4"><span className={cn("mt-1 grid size-9 shrink-0 place-items-center rounded-xl", log.level === "ERROR" ? "bg-rose-50 text-rose-700" : log.level === "WARN" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700")}>{log.level === "INFO" ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-sm font-semibold text-slate-900">{log.action}</h3><time className="text-[11px] text-slate-400">{new Date(log.timestamp).toLocaleString("vi-VN")}</time></div><p className="mt-1 text-xs leading-5 text-slate-500">{log.tenantCode} · {log.description}</p></div></article>)}{logs.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500">Chưa có sự kiện mới.</p>}</div></section>
      <section className={cn(cardClass, "p-5")}><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-950">Cần xử lý</h2><p className="mt-1 text-xs text-slate-500">Theo mức độ ưu tiên</p></div><span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">{attentionTenants.length + warnings.length + 3}</span></div><div className="mt-4 space-y-2.5">{tasks.map((item) => { const Icon = item.icon; return <button key={item.title} type="button" onClick={() => onNavigate(item.destination)} className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/50"><span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", item.tone === "rose" ? "bg-rose-50 text-rose-700" : item.tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700")}><Icon className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{item.title}</span><span className="mt-0.5 block text-xs text-slate-500">{item.detail}</span></span><ArrowRight className="size-4 shrink-0 text-slate-400" /></button>; })}</div></section>
    </div>

    <div className="grid gap-5 lg:grid-cols-3">
      <SummaryCard icon={Activity} title="Hệ thống ổn định" subtitle="Cập nhật vài phút trước" rows={[["API latency","142 ms"],["Jobs đang chờ","18"],["Cache hit rate","92%"]]} />
      <SummaryCard icon={FileClock} title="Hoạt động hôm nay" subtitle="Tóm tắt toàn nền tảng" rows={[["Tenant mới","2"],["CV đã xử lý","1.842"],["Phiên AI interview","126"]]} />
      <SummaryCard icon={Clock3} title="Vận hành & hỗ trợ" subtitle="SLA đội ngũ platform" rows={[["Ticket đang mở","14"],["Ticket quá SLA","3"],["Phản hồi trung bình","2,4 giờ"]]} />
    </div>
  </div>;
}

function SummaryCard({ icon: Icon, title, subtitle, rows }: { icon: typeof Activity; title: string; subtitle: string; rows: string[][] }) {
  return <section className={cn(cardClass, "p-5")}><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon className="size-5" /></span><div><h2 className="text-sm font-semibold">{title}</h2><p className="text-xs text-slate-500">{subtitle}</p></div></div><dl className="mt-4 space-y-3 text-sm">{rows.map(([label,value]) => <div key={label} className="flex justify-between"><dt className="text-slate-500">{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl></section>;
}
