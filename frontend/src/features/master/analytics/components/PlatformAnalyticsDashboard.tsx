import { useState, type ComponentType } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
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
import { HeaderActions } from "@/features/master/shell/HeaderActions";
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
  const nonDeletedTenants = tenants.filter((t) => !t.deleted);
  const attentionTenants = nonDeletedTenants.filter((tenant) => tenant.status !== "ACTIVE").length;
  const suspendedCount = nonDeletedTenants.filter((tenant) => tenant.status === "SUSPENDED" || tenant.status === "FAILED").length;
  const suspendedRate = nonDeletedTenants.length > 0
    ? `${((suspendedCount * 100) / nonDeletedTenants.length).toFixed(1)}%`
    : "0.0%";
  const overdueCount = revenue?.overdueInvoicesCount ?? 0;
  const overdueAmt = revenue?.overdueInvoicesAmount ?? 0;
  const nearQuotaCount = aiQuota?.nearQuotaTenantsCount ?? 0;
  const errorLogsCount = logs.filter((log) => log.level === "ERROR").length;

  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <MetricCard label="MRR (Quy đổi năm)" value={`${(revenue?.mrr ?? 0).toLocaleString("vi-VN")} ₫`} change={revenue?.growthRate ?? "0.0%"} helper="so với tháng trước" icon={CircleDollarSign} />
      <MetricCard label="Tổng số Tenant" value={`${revenue?.totalTenants ?? nonDeletedTenants.length}`} change={`${revenue?.activeTenants ?? 0} hoạt động`} helper={`+${revenue?.newTenantsThisMonth ?? 0} tháng này`} icon={Building2} />
      <MetricCard label="ARPA (Trung bình năm)" value={`${(revenue?.arpa ?? 0).toLocaleString("vi-VN")} ₫`} change={`${revenue?.conversionRatePercent ?? 0}%`} helper="tỷ lệ chuyển đổi Lead" icon={Sparkles} />
      <MetricCard label="Tình trạng AI & API" value={aiQuota?.systemHealth === "DEGRADED" ? "Degraded" : "Healthy"} change={`${aiQuota?.apiSuccessRate ?? 100}%`} helper="tỷ lệ gọi AI thành công" icon={Activity} />
      <MetricCard label="Tỷ lệ tạm ngưng / lỗi" value={suspendedRate} change={`${suspendedCount} tenant`} helper="SUSPENDED / FAILED" icon={Users} direction="down" />
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
      <section className={cn(cardClass, "overflow-hidden")}><div className="flex items-start justify-between border-b border-slate-100 p-5"><div><h2 className="font-semibold text-slate-950">Biểu đồ doanh thu (VNĐ)</h2><p className="mt-1 text-xs text-slate-500">Doanh thu thực tế theo chu kỳ</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{revenue?.growthRate || "0.0%"}</span></div><div className="p-5">
        <div className="h-[235px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenue?.revenueTrend || []} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} tickFormatter={(v) => `${Number(v).toLocaleString("vi-VN")}₫`} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} name="Doanh thu (VNĐ)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div></section>
      <section className={cn(cardClass, "p-5")}><h2 className="font-semibold text-slate-950">Cần xử lý</h2><p className="mt-1 text-xs text-slate-500">Ưu tiên vận hành toàn nền tảng</p><div className="mt-5 space-y-3">{[
        [attentionTenants, "tenant cần chú ý", "Provisioning, chờ thanh toán hoặc tạm ngưng", attentionTenants > 0 ? "amber" : "blue"],
        [overdueCount, "hóa đơn quá hạn", `${overdueAmt.toLocaleString("vi-VN")} ₫ cần thu hồi`, overdueCount > 0 ? "rose" : "blue"],
        [nearQuotaCount, "tenant gần chạm quota", "Trên 80% hạn mức AI", nearQuotaCount > 0 ? "amber" : "blue"],
        [errorLogsCount, "sự kiện hệ thống lỗi", "Cần kiểm tra audit log", errorLogsCount > 0 ? "rose" : "blue"],
      ].map(([count,title,detail,tone]) => <div key={String(title)} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><span className={cn("grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold", tone === "rose" ? "bg-rose-50 text-rose-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700")}>{count}</span><div><p className="text-sm font-semibold text-slate-900">{title}</p><p className="text-xs text-slate-500">{detail}</p></div></div>)}</div></section>
    </div>
    <section className={cn(cardClass, "grid gap-4 p-5 md:grid-cols-4")}>
      <div><p className="text-xs font-medium text-slate-500">CV đã phân tích</p><p className="mt-1 text-xl font-bold">{(aiQuota?.totalCvParsesUsed ?? 0).toLocaleString("vi-VN")}</p></div>
      <div><p className="text-xs font-medium text-slate-500">Giờ AI interview</p><p className="mt-1 text-xl font-bold">{aiQuota?.totalVoiceHoursUsed ?? 0} giờ</p></div>
      <div><p className="text-xs font-medium text-slate-500">Chi phí AI ước tính</p><p className="mt-1 text-xl font-bold">{(aiQuota?.estimatedAiCostVnd ?? 0).toLocaleString("vi-VN")} ₫</p></div>
      <div><p className="text-xs font-medium text-slate-500">API success rate</p><p className="mt-1 text-xl font-bold text-emerald-700">{aiQuota?.apiSuccessRate ?? 100}%</p></div>
    </section>
  </div>;
}

function RevenuePanel({ revenue }: { revenue: RevenueAnalytics | null }) {
  const distribution = Object.entries(revenue?.planDistribution ?? {});
  const total = distribution.reduce((sum, [, count]) => sum + count, 0) || 1;

  const paidAmt = revenue?.paidInvoicesAmount ?? 0;
  const pendingAmt = revenue?.pendingInvoicesAmount ?? 0;
  const overdueAmt = revenue?.overdueInvoicesAmount ?? 0;
  const totalInvoicedAmt = paidAmt + pendingAmt + overdueAmt;

  const formatShare = (amt: number) =>
    totalInvoicedAmt > 0 ? `${((amt * 100) / totalInvoicedAmt).toFixed(1)}%` : "0.0%";

  const invoiceRows = [
    ["Đã thanh toán (PAID)", `${revenue?.paidInvoicesCount ?? 0}`, `${paidAmt.toLocaleString("vi-VN")} ₫`, formatShare(paidAmt)],
    ["Chờ thanh toán (PENDING)", `${revenue?.pendingInvoicesCount ?? 0}`, `${pendingAmt.toLocaleString("vi-VN")} ₫`, formatShare(pendingAmt)],
    ["Quá hạn (OVERDUE)", `${revenue?.overdueInvoicesCount ?? 0}`, `${overdueAmt.toLocaleString("vi-VN")} ₫`, formatShare(overdueAmt)],
  ];

  return <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
    <section className={cn(cardClass, "p-5")}><h2 className="font-semibold">Doanh thu định kỳ</h2><p className="mt-1 text-xs text-slate-500">Chỉ số tài chính tổng hợp từ Master Database (Chu kỳ năm)</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-blue-50 p-4"><p className="text-xs font-semibold text-blue-700">MRR (ARR / 12)</p><p className="mt-2 text-2xl font-bold text-blue-950">{(revenue?.mrr ?? 0).toLocaleString("vi-VN")} ₫</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-600">ARR (Bản quyền năm)</p><p className="mt-2 text-2xl font-bold text-slate-950">{(revenue?.arr ?? 0).toLocaleString("vi-VN")} ₫</p></div><div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">Tổng doanh thu đã thu</p><p className="mt-1 text-xl font-bold">{(revenue?.totalRevenue ?? 0).toLocaleString("vi-VN")} ₫</p><p className="mt-1 text-xs text-emerald-700">{revenue?.growthRate ?? "0.0%"} kỳ trước</p></div><div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">ARPA (Trung bình / Tenant)</p><p className="mt-1 text-xl font-bold">{(revenue?.arpa ?? 0).toLocaleString("vi-VN")} ₫</p><p className="mt-1 text-xs text-emerald-700">Lead → Tenant: {revenue?.conversionRatePercent ?? 0}%</p></div></div></section>
    <section className={cn(cardClass, "p-5")}><h2 className="font-semibold">Phân bổ gói dịch vụ</h2><p className="mt-1 text-xs text-slate-500">Tenant đang hoạt động theo subscription</p><div className="mt-6 space-y-5">{distribution.map(([name,count],index) => <div key={name}><div className="mb-2 flex justify-between text-sm"><span className="font-medium">{name}</span><strong>{count} tenant</strong></div><div className="h-2.5 rounded-full bg-slate-100"><div className={cn("h-full rounded-full", index === 0 ? "bg-blue-600" : index === 1 ? "bg-indigo-500" : "bg-sky-400")} style={{ width: `${count / total * 100}%` }} /></div></div>)}{distribution.length === 0 && <p className="text-xs text-slate-500 italic">Chưa có thuê bao ACTIVE.</p>}</div></section>
    <section className={cn(cardClass, "overflow-hidden xl:col-span-2")}><div className="border-b border-slate-100 p-5"><h2 className="font-semibold">Hóa đơn và rủi ro doanh thu</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Trạng thái</th><th className="px-3 py-3 text-right">Số hóa đơn</th><th className="px-3 py-3 text-right">Giá trị</th><th className="px-3 py-3 text-right">Tỷ trọng</th></tr></thead><tbody>{invoiceRows.map((row) => <tr key={row[0]} className="border-t border-slate-100"><td className="px-5 py-4 font-semibold">{row[0]}</td><td className="px-3 py-4 text-right">{row[1]}</td><td className="px-3 py-4 text-right font-medium">{row[2]}</td><td className="px-5 py-4 text-right">{row[3]}</td></tr>)}</tbody></table></div></section>
  </div>;
}

function TenantHealthPanel({ tenants, aiQuota }: { tenants: TenantInfo[]; aiQuota: AiQuotaUsage | null }) {
  const avgUsage = aiQuota?.totalCvParsesLimit && aiQuota.totalCvParsesLimit > 0
    ? Math.min(100, Math.round(((aiQuota.totalCvParsesUsed ?? 0) * 100) / aiQuota.totalCvParsesLimit))
    : 0;
  const rows = tenants
    .filter((t) => !t.deleted)
    .map((tenant) => {
      const isActive = tenant.status === "ACTIVE";
      const isPending = tenant.status === "PENDING_PAYMENT" || tenant.status === "PROVISIONING";
      const score = isActive ? Math.max(70, 100 - Math.round(avgUsage * 0.25)) : isPending ? 75 : 40;
      const risk = !isActive && !isPending ? "Cao" : score < 80 ? "Trung bình" : "Thấp";
      const statusLabel = isActive ? "Khỏe mạnh (ACTIVE)" : tenant.status;
      return {
        id: tenant.id,
        name: tenant.name,
        code: tenant.code,
        status: statusLabel,
        score,
        usage: isActive ? avgUsage : 0,
        risk,
      };
    });

  return <section className={cn(cardClass, "overflow-hidden")}><div className="p-5"><h2 className="font-semibold">Sức khỏe tenant ({rows.length})</h2><p className="mt-1 text-xs text-slate-500">Health score tổng hợp từ trạng thái hoạt động, quota và thanh toán</p></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Tenant</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3">Health score</th><th className="px-3 py-3">AI quota</th><th className="px-5 py-3 text-right">Rủi ro churn</th></tr></thead><tbody>{rows.map((tenant) => <tr key={tenant.id} className="border-t border-slate-100 hover:bg-blue-50/40"><td className="px-5 py-4 font-semibold text-slate-900">{tenant.name} <span className="text-xs font-mono text-slate-400">({tenant.code})</span></td><td className="px-3 py-4 text-slate-600">{tenant.status}</td><td className="px-3 py-4"><div className="flex items-center gap-3"><div className="h-2 w-28 rounded-full bg-slate-100"><div className={cn("h-full rounded-full", tenant.score < 60 ? "bg-rose-500" : tenant.score < 80 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${tenant.score}%` }} /></div><strong>{tenant.score}</strong></div></td><td className="px-3 py-4">{tenant.usage}%</td><td className="px-5 py-4 text-right"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", tenant.risk === "Cao" ? "bg-rose-50 text-rose-700" : tenant.risk === "Trung bình" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>{tenant.risk}</span></td></tr>)}{rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">Chưa có dữ liệu tenant.</td></tr>}</tbody></table></div></section>;
}

function AiUsagePanel({ aiQuota }: { aiQuota: AiQuotaUsage | null }) {
  const cvLimit = aiQuota?.totalCvParsesLimit || 1000;
  const voiceHoursLimit = aiQuota?.totalVoiceHoursLimit || 50;
  const cvPercent = Math.round(((aiQuota?.totalCvParsesUsed ?? 0) / cvLimit) * 100);
  const voicePercent = Math.round(((aiQuota?.totalVoiceHoursUsed ?? 0) / voiceHoursLimit) * 100);
  return <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
    <section className={cn(cardClass, "p-5")}><h2 className="font-semibold">Tiêu thụ tài nguyên AI</h2><p className="mt-1 text-xs text-slate-500">Toàn nền tảng trong chu kỳ hiện tại</p><div className="mt-6 space-y-6">{[
      [`CV parsing & screening (Hạn mức: ${cvLimit.toLocaleString("vi-VN")})`, aiQuota?.totalCvParsesUsed ?? 0, cvPercent],
      [`AI interview voice hours (Hạn mức: ${voiceHoursLimit.toLocaleString("vi-VN")} giờ)`, aiQuota?.totalVoiceHoursUsed ?? 0, voicePercent],
    ].map(([label,used,percent]) => <div key={String(label)}><div className="mb-2 flex flex-wrap justify-between gap-2 text-sm"><span className="font-medium">{label}</span><strong>{Number(used).toLocaleString("vi-VN")} ({percent}%)</strong></div><div className="h-3 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(percent as number, 100)}%` }} /></div></div>)}</div>
    
      <h3 className="mt-8 font-semibold text-sm">Xu hướng sử dụng (Tokens: {(aiQuota?.totalTokensConsumed ?? 0).toLocaleString("vi-VN")})</h3>
      <div className="h-40 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={aiQuota?.usageTrend || []} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
            <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Tokens" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
    <section className={cn(cardClass, "p-5")}><h2 className="font-semibold">Dịch vụ AI đang hoạt động</h2><p className="mt-1 text-xs text-slate-500">Trạng thái mô hình AI từ cấu hình hệ thống</p><div className="mt-5 space-y-3">{(aiQuota?.activeModels ?? []).map((model) => <div key={model} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-600"><Bot className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{model}</p><p className="text-xs text-slate-500">Đang hoạt động · Chi phí ước tính: {(aiQuota?.estimatedAiCostVnd ?? 0).toLocaleString("vi-VN")} ₫</p></div><span className="size-2.5 rounded-full bg-emerald-500" aria-label="Đang hoạt động" /></div>)}</div></section>
  </div>;
}

function SystemPanel({ revenue, aiQuota, tenants, logs }: Omit<Props, "onExport">) {
  const activeCount = revenue?.activeTenants ?? tenants.filter((t) => !t.deleted && t.status === "ACTIVE").length;
  const totalCount = revenue?.totalTenants ?? tenants.filter((t) => !t.deleted).length;
  const provisioningCount = tenants.filter((t) => !t.deleted && (t.status === "PROVISIONING" || t.status === "PENDING_PAYMENT")).length;
  const failedCount = tenants.filter((t) => !t.deleted && t.status === "FAILED").length;
  const errorLogsCount = logs.filter((l) => l.level === "ERROR").length;

  const services = [
    ["Master API", `${aiQuota?.apiSuccessRate ?? 100}%`, aiQuota?.averageLatencyMs ? `${aiQuota.averageLatencyMs} ms` : "< 150 ms", "Healthy"],
    ["Tenant databases (HikariCP)", "100%", `${activeCount} / ${totalCount} pools`, "Healthy"],
    ["AI Provider Routing", aiQuota?.systemHealth === "DEGRADED" ? "Degraded" : "100%", `${aiQuota?.activeModels?.length ?? 0} models active`, aiQuota?.systemHealth === "DEGRADED" ? "Warning" : "Healthy"],
    ["Provisioning Queue", failedCount > 0 ? "Needs Retry" : "100%", `${provisioningCount} pending · ${failedCount} failed`, failedCount > 0 ? "Warning" : "Healthy"],
    ["Audit & Security Monitor", errorLogsCount > 0 ? "Alert" : "100%", `${logs.length} events logged`, errorLogsCount > 0 ? "Warning" : "Healthy"],
  ];
  return <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]"><section className={cn(cardClass, "overflow-hidden")}><div className="p-5"><h2 className="font-semibold">Tình trạng dịch vụ</h2><p className="mt-1 text-xs text-slate-500">Trạng thái thời gian thực từ Master Registry & AI Engine</p></div><div className="divide-y divide-slate-100">{services.map(([name,uptime,detail,status]) => <div key={name} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 sm:grid-cols-[1fr_100px_150px_90px]"><strong className="text-sm">{name}</strong><span className="text-sm">{uptime}</span><span className="text-xs text-slate-500">{detail}</span><span className={cn("text-right text-xs font-semibold", status === "Warning" ? "text-amber-700" : "text-emerald-700")}>{status}</span></div>)}</div></section><section className={cn(cardClass, "p-5")}><Cpu className="size-6 text-blue-600" /><h2 className="mt-4 font-semibold">Thống kê xử lý nền tảng</h2><dl className="mt-5 space-y-4 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Tenant chờ cấp phát</dt><dd className="font-bold">{provisioningCount}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Provisioning lỗi cần Retry</dt><dd className="font-bold text-amber-700">{failedCount}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Sự kiện lỗi (ERROR logs)</dt><dd className="font-bold text-rose-700">{errorLogsCount}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Tổng Tokens AI đã xử lý</dt><dd className="font-bold">{(aiQuota?.totalTokensConsumed ?? 0).toLocaleString("vi-VN")}</dd></div></dl></section></div>;
}

function SecurityPanel({ logs }: { logs: AuditLog[] }) {
  const items = logs.slice(0, 8);
  const errorCount = logs.filter((l) => l.level === "ERROR").length;
  const warnCount = logs.filter((l) => l.level === "WARN").length;
  return <div className="grid gap-5 xl:grid-cols-[0.7fr_1.3fr]"><section className={cn(cardClass, "p-5")}><ShieldCheck className="size-7 text-blue-600" /><h2 className="mt-4 font-semibold">Security posture</h2><p className="mt-1 text-xs text-slate-500">Cách ly dữ liệu Separate Database per Tenant đang bật.</p><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-rose-50 p-3"><p className="text-xs text-rose-700">Sự kiện lỗi (ERROR)</p><p className="mt-1 text-2xl font-bold text-rose-900">{errorCount}</p></div><div className="rounded-xl bg-amber-50 p-3"><p className="text-xs text-amber-700">Cảnh báo (WARN)</p><p className="mt-1 text-2xl font-bold text-amber-900">{warnCount}</p></div></div></section><section className={cn(cardClass, "overflow-hidden")}><div className="border-b border-slate-100 p-5"><h2 className="font-semibold">Sự kiện bảo mật và audit gần đây ({logs.length})</h2></div><div className="divide-y divide-slate-100">{items.length ? items.map((log) => <div key={log.id} className="flex gap-3 px-5 py-4"><span className={cn("mt-0.5 size-2.5 shrink-0 rounded-full", log.level === "ERROR" ? "bg-rose-500" : log.level === "WARN" ? "bg-amber-500" : "bg-blue-500")} /><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><strong className="text-sm">{log.action}</strong><span className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString("vi-VN")}</span></div><p className="mt-1 text-xs text-slate-500">{log.tenantCode} · {log.description}</p></div></div>) : <p className="p-8 text-center text-sm text-slate-500">Chưa có sự kiện audit.</p>}</div></section></div>;
}

function OperationsPanel({ revenue, aiQuota, tenants }: Omit<Props, "onExport" | "logs">) {
  const nonDeleted = tenants.filter((t) => !t.deleted);
  const failedTenants = nonDeleted.filter((t) => t.status === "FAILED");
  const pendingTenants = nonDeleted.filter((t) => t.status === "PENDING_PAYMENT" || t.status === "PROVISIONING");
  const openLeads = revenue?.openLeadsCount ?? 0;
  const pendingInvoices = revenue?.pendingInvoicesCount ?? 0;
  const overdueInvoices = revenue?.overdueInvoicesCount ?? 0;
  const pendingContracts = revenue?.pendingContractsCount ?? 0;

  const dynamicTasks: Array<[string, string, string]> = [];
  failedTenants.forEach((t) => dynamicTasks.push([`Retry provisioning cho tenant ${t.name} (${t.code})`, "Hạ tầng DB", "Ưu tiên cao"]));
  pendingTenants.forEach((t) => dynamicTasks.push([`Hoàn tất thanh toán & kích hoạt DB cho ${t.name} (${t.code})`, "Onboarding / Deal B2B", "Chờ thanh toán"]));
  if (overdueInvoices > 0) {
    dynamicTasks.push([`Thu hồi ${overdueInvoices} hóa đơn quá hạn (${(revenue?.overdueInvoicesAmount ?? 0).toLocaleString("vi-VN")} ₫)`, "Thanh toán", "Cần xử lý ngay"]);
  }
  if (pendingContracts > 0) {
    dynamicTasks.push([`Theo dõi ${pendingContracts} hợp đồng B2B đang chờ ký số`, "Pháp lý / E-Contract", "Trong tuần"]);
  }
  if (openLeads > 0) {
    dynamicTasks.push([`Liên hệ tư vấn ${openLeads} yêu cầu (Leads) mới`, "Kinh doanh B2B", "Trong 24 giờ"]);
  }
  if ((aiQuota?.nearQuotaTenantsCount ?? 0) > 0) {
    dynamicTasks.push([`Kiểm tra ${aiQuota?.nearQuotaTenantsCount} tenant đã dùng trên 80% hạn mức AI`, "AI Quota", "Theo dõi"]);
  }

  return <div className="grid gap-5 md:grid-cols-3"><section className={cn(cardClass, "p-5")}><LifeBuoy className="size-6 text-blue-600" /><p className="mt-4 text-sm text-slate-500">Yêu cầu tư vấn (Leads) mở</p><p className="mt-1 text-3xl font-bold">{openLeads}</p><p className="mt-2 text-xs text-blue-700">Tỷ lệ chuyển đổi: {revenue?.conversionRatePercent ?? 0}%</p></section><section className={cn(cardClass, "p-5")}><Clock3 className="size-6 text-blue-600" /><p className="mt-4 text-sm text-slate-500">Hóa đơn & Hợp đồng chờ</p><p className="mt-1 text-3xl font-bold">{pendingInvoices + pendingContracts}</p><p className="mt-2 text-xs text-amber-700">{pendingInvoices} hóa đơn · {pendingContracts} hợp đồng</p></section><section className={cn(cardClass, "p-5")}><Building2 className="size-6 text-blue-600" /><p className="mt-4 text-sm text-slate-500">Onboarding chờ xử lý</p><p className="mt-1 text-3xl font-bold">{pendingTenants.length + failedTenants.length}</p><p className="mt-2 text-xs text-rose-700">{failedTenants.length} provisioning cần retry</p></section><section className={cn(cardClass, "overflow-hidden md:col-span-3")}><div className="border-b border-slate-100 p-5"><h2 className="font-semibold">Hàng đợi công việc vận hành thực tế ({dynamicTasks.length})</h2></div><div className="divide-y divide-slate-100">{dynamicTasks.map(([task,type,due],index) => <div key={task} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center"><span className={cn("grid size-8 place-items-center rounded-lg", index === 0 ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700")}><AlertTriangle className="size-4" /></span><div className="flex-1"><p className="text-sm font-semibold">{task}</p><p className="text-xs text-slate-500">{type}</p></div><span className="text-xs font-semibold text-slate-600">{due}</span></div>)}{dynamicTasks.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Tất cả hạng mục vận hành đều đã được xử lý hoàn tất.</p>}</div></section></div>;
}

export function PlatformAnalyticsDashboard({ revenue, aiQuota, tenants, logs, onExport }: Props) {
  const [activeTab, setActiveTab] = useState<PlatformTab>("overview");
  const panels: Record<PlatformTab, React.ReactNode> = {
    overview: <Overview revenue={revenue} aiQuota={aiQuota} tenants={tenants} logs={logs} />,
    revenue: <RevenuePanel revenue={revenue} />,
    tenants: <TenantHealthPanel tenants={tenants} aiQuota={aiQuota} />,
    ai: <AiUsagePanel aiQuota={aiQuota} />,
    system: <SystemPanel revenue={revenue} aiQuota={aiQuota} tenants={tenants} logs={logs} />,
    security: <SecurityPanel logs={logs} />,
    operations: <OperationsPanel revenue={revenue} aiQuota={aiQuota} tenants={tenants} />,
  };
  return (
    <div className="space-y-5 animate-fade-in">
      <HeaderActions>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50"
        >
          <Download className="size-3.5" />
          <span>Xuất báo cáo</span>
        </button>
      </HeaderActions>
    <nav className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm" aria-label="Các nhóm thống kê nền tảng"><div className="flex min-w-max gap-1" role="tablist">{tabs.map((tab) => { const Icon = tab.icon; const selected = activeTab === tab.id; return <button key={tab.id} type="button" role="tab" id={`platform-tab-${tab.id}`} aria-selected={selected} aria-controls={`platform-panel-${tab.id}`} onClick={() => setActiveTab(tab.id)} className={cn("inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition-colors", selected ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}><Icon className="size-4" aria-hidden="true" />{tab.label}</button>; })}</div></nav>
    <div role="tabpanel" tabIndex={0} id={`platform-panel-${activeTab}`} aria-labelledby={`platform-tab-${activeTab}`}>{panels[activeTab]}</div>
    </div>
  );
}
