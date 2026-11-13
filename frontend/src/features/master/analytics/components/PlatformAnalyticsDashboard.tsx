import { useState, type ComponentType } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CircleDollarSign,
  Clock3,
  Download,
  LifeBuoy,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import type { AiQuotaUsage, AuditLog, RevenueAnalytics, TenantInfo } from "@/api/master/masterAdminApi";
import { HeaderActions } from "@/features/master/shell/HeaderActions";
import { cn } from "@/lib/utils";
import { useT, useLocale, formatNumber } from "@/i18n";

type PlatformTab = "overview" | "revenue" | "operations";

type Props = {
  revenue: RevenueAnalytics | null;
  aiQuota: AiQuotaUsage | null;
  tenants: TenantInfo[];
  logs: AuditLog[];
  onExport: () => void;
};

const tabs: Array<{ id: PlatformTab; labelKey: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "overview", labelKey: "master.ops.analytics.tabs.overview", icon: TrendingUp },
  { id: "revenue", labelKey: "master.ops.analytics.tabs.revenue", icon: CircleDollarSign },
  { id: "operations", labelKey: "master.ops.analytics.tabs.operations", icon: LifeBuoy },
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
  const t = useT();
  const locale = useLocale();
  const nonDeletedTenants = tenants.filter((item) => !item.deleted);
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
      <MetricCard
        label={t("master.ops.analytics.overview.mrrLabel")}
        value={t("master.ops.analytics.overview.amountVnd", { amount: formatNumber(revenue?.mrr ?? 0, undefined, locale) })}
        change={revenue?.growthRate ?? "0.0%"}
        helper={t("master.ops.analytics.overview.vsLastMonth")}
        icon={CircleDollarSign}
      />
      <MetricCard
        label={t("master.ops.analytics.overview.totalTenantsLabel")}
        value={`${revenue?.totalTenants ?? nonDeletedTenants.length}`}
        change={t("master.ops.analytics.overview.activeCount", { count: revenue?.activeTenants ?? 0 })}
        helper={t("master.ops.analytics.overview.newThisMonth", { count: revenue?.newTenantsThisMonth ?? 0 })}
        icon={Building2}
      />
      <MetricCard
        label={t("master.ops.analytics.overview.arpaLabel")}
        value={t("master.ops.analytics.overview.amountVnd", { amount: formatNumber(revenue?.arpa ?? 0, undefined, locale) })}
        change={`${revenue?.conversionRatePercent ?? 0}%`}
        helper={t("master.ops.analytics.overview.leadConversion")}
        icon={Sparkles}
      />
      <MetricCard
        label={t("master.ops.analytics.overview.aiApiHealthLabel")}
        value={aiQuota?.systemHealth === "DEGRADED" ? "Degraded" : "Healthy"}
        change={`${aiQuota?.apiSuccessRate ?? 100}%`}
        helper={t("master.ops.analytics.overview.aiSuccessHelper")}
        icon={Activity}
      />
      <MetricCard
        label={t("master.ops.analytics.overview.suspendedRateLabel")}
        value={suspendedRate}
        change={t("master.ops.analytics.overview.tenantsCount", { count: suspendedCount })}
        helper="SUSPENDED / FAILED"
        icon={Users}
        direction="down"
      />
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
      <section className={cn(cardClass, "overflow-hidden")}><div className="flex items-start justify-between border-b border-slate-100 p-5"><div><h2 className="font-semibold text-slate-950">{t("master.ops.analytics.overview.revenueChartTitle")}</h2><p className="mt-1 text-xs text-slate-500">{t("master.ops.analytics.overview.revenueChartSubtitle")}</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{revenue?.growthRate || "0.0%"}</span></div><div className="p-5">
        <div className="h-[235px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenue?.revenueTrend || []} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} tickFormatter={(v) => `${formatNumber(Number(v), undefined, locale)}${t("master.ops.analytics.overview.yAxisSuffix")}`} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} name={t("master.ops.analytics.overview.revenueSeriesName")} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div></section>
      <section className={cn(cardClass, "p-5")}><h2 className="font-semibold text-slate-950">{t("master.ops.analytics.overview.actionRequiredTitle")}</h2><p className="mt-1 text-xs text-slate-500">{t("master.ops.analytics.overview.actionRequiredSubtitle")}</p><div className="mt-5 space-y-3">{[
        [attentionTenants, t("master.ops.analytics.overview.attentionTenantsTitle"), t("master.ops.analytics.overview.attentionTenantsDetail"), attentionTenants > 0 ? "amber" : "blue"],
        [overdueCount, t("master.ops.analytics.overview.overdueInvoicesTitle"), t("master.ops.analytics.overview.overdueInvoicesDetail", { amount: formatNumber(overdueAmt, undefined, locale) }), overdueCount > 0 ? "rose" : "blue"],
        [nearQuotaCount, t("master.ops.analytics.overview.nearQuotaTitle"), t("master.ops.analytics.overview.nearQuotaDetail"), nearQuotaCount > 0 ? "amber" : "blue"],
        [errorLogsCount, t("master.ops.analytics.overview.errorLogsTitle"), t("master.ops.analytics.overview.errorLogsDetail"), errorLogsCount > 0 ? "rose" : "blue"],
      ].map(([count,title,detail,tone]) => <div key={String(title)} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><span className={cn("grid size-9 shrink-0 place-items-center rounded-lg text-sm font-bold", tone === "rose" ? "bg-rose-50 text-rose-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700")}>{count}</span><div><p className="text-sm font-semibold text-slate-900">{title}</p><p className="text-xs text-slate-500">{detail}</p></div></div>)}</div></section>
    </div>
    <section className={cn(cardClass, "grid gap-4 p-5 md:grid-cols-4")}>
      <div><p className="text-xs font-medium text-slate-500">{t("master.ops.analytics.overview.cvParsed")}</p><p className="mt-1 text-xl font-bold">{formatNumber(aiQuota?.totalCvParsesUsed ?? 0, undefined, locale)}</p></div>
      <div><p className="text-xs font-medium text-slate-500">{t("master.ops.analytics.overview.aiInterviewHours")}</p><p className="mt-1 text-xl font-bold">{t("master.ops.analytics.overview.hoursUnit", { hours: aiQuota?.totalVoiceHoursUsed ?? 0 })}</p></div>
      <div><p className="text-xs font-medium text-slate-500">{t("master.ops.analytics.overview.estimatedAiCost")}</p><p className="mt-1 text-xl font-bold">{t("master.ops.analytics.overview.amountVnd", { amount: formatNumber(aiQuota?.estimatedAiCostVnd ?? 0, undefined, locale) })}</p></div>
      <div><p className="text-xs font-medium text-slate-500">{t("master.ops.analytics.overview.apiSuccessRate")}</p><p className="mt-1 text-xl font-bold text-emerald-700">{aiQuota?.apiSuccessRate ?? 100}%</p></div>
    </section>
  </div>;
}

function RevenuePanel({ revenue }: { revenue: RevenueAnalytics | null }) {
  const t = useT();
  const locale = useLocale();
  const distribution = Object.entries(revenue?.planDistribution ?? {});
  const total = distribution.reduce((sum, [, count]) => sum + count, 0) || 1;

  const paidAmt = revenue?.paidInvoicesAmount ?? 0;
  const pendingAmt = revenue?.pendingInvoicesAmount ?? 0;
  const overdueAmt = revenue?.overdueInvoicesAmount ?? 0;
  const totalInvoicedAmt = paidAmt + pendingAmt + overdueAmt;

  const formatShare = (amt: number) =>
    totalInvoicedAmt > 0 ? `${((amt * 100) / totalInvoicedAmt).toFixed(1)}%` : "0.0%";

  const invoiceRows = [
    [t("master.ops.analytics.revenue.statusPaid"), `${revenue?.paidInvoicesCount ?? 0}`, t("master.ops.analytics.revenue.amountVnd", { amount: formatNumber(paidAmt, undefined, locale) }), formatShare(paidAmt)],
    [t("master.ops.analytics.revenue.statusPending"), `${revenue?.pendingInvoicesCount ?? 0}`, t("master.ops.analytics.revenue.amountVnd", { amount: formatNumber(pendingAmt, undefined, locale) }), formatShare(pendingAmt)],
    [t("master.ops.analytics.revenue.statusOverdue"), `${revenue?.overdueInvoicesCount ?? 0}`, t("master.ops.analytics.revenue.amountVnd", { amount: formatNumber(overdueAmt, undefined, locale) }), formatShare(overdueAmt)],
  ];

  return <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
    <section className={cn(cardClass, "p-5")}><h2 className="font-semibold">{t("master.ops.analytics.revenue.recurringTitle")}</h2><p className="mt-1 text-xs text-slate-500">{t("master.ops.analytics.revenue.recurringSubtitle")}</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-blue-50 p-4"><p className="text-xs font-semibold text-blue-700">{t("master.ops.analytics.revenue.mrrFormula")}</p><p className="mt-2 text-2xl font-bold text-blue-950">{t("master.ops.analytics.revenue.amountVnd", { amount: formatNumber(revenue?.mrr ?? 0, undefined, locale) })}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-600">{t("master.ops.analytics.revenue.arrLabel")}</p><p className="mt-2 text-2xl font-bold text-slate-950">{t("master.ops.analytics.revenue.amountVnd", { amount: formatNumber(revenue?.arr ?? 0, undefined, locale) })}</p></div><div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">{t("master.ops.analytics.revenue.totalCollected")}</p><p className="mt-1 text-xl font-bold">{t("master.ops.analytics.revenue.amountVnd", { amount: formatNumber(revenue?.totalRevenue ?? 0, undefined, locale) })}</p><p className="mt-1 text-xs text-emerald-700">{t("master.ops.analytics.revenue.vsPreviousPeriod", { rate: revenue?.growthRate ?? "0.0%" })}</p></div><div className="rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-500">{t("master.ops.analytics.revenue.arpaPerTenant")}</p><p className="mt-1 text-xl font-bold">{t("master.ops.analytics.revenue.amountVnd", { amount: formatNumber(revenue?.arpa ?? 0, undefined, locale) })}</p><p className="mt-1 text-xs text-emerald-700">{t("master.ops.analytics.revenue.leadToTenant", { rate: revenue?.conversionRatePercent ?? 0 })}</p></div></div></section>
    <section className={cn(cardClass, "p-5")}><h2 className="font-semibold">{t("master.ops.analytics.revenue.planDistributionTitle")}</h2><p className="mt-1 text-xs text-slate-500">{t("master.ops.analytics.revenue.planDistributionSubtitle")}</p><div className="mt-6 space-y-5">{distribution.map(([name,count],index) => <div key={name}><div className="mb-2 flex justify-between text-sm"><span className="font-medium">{name}</span><strong>{t("master.ops.analytics.revenue.tenantsCount", { count })}</strong></div><div className="h-2.5 rounded-full bg-slate-100"><div className={cn("h-full rounded-full", index === 0 ? "bg-blue-600" : index === 1 ? "bg-indigo-500" : "bg-sky-400")} style={{ width: `${count / total * 100}%` }} /></div></div>)}{distribution.length === 0 && <p className="text-xs text-slate-500 italic">{t("master.ops.analytics.revenue.noActiveSubscriptions")}</p>}</div></section>
    <section className={cn(cardClass, "overflow-hidden xl:col-span-2")}><div className="border-b border-slate-100 p-5"><h2 className="font-semibold">{t("master.ops.analytics.revenue.invoicesRiskTitle")}</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">{t("master.ops.analytics.revenue.colStatus")}</th><th className="px-3 py-3 text-right">{t("master.ops.analytics.revenue.colInvoiceCount")}</th><th className="px-3 py-3 text-right">{t("master.ops.analytics.revenue.colValue")}</th><th className="px-3 py-3 text-right">{t("master.ops.analytics.revenue.colShare")}</th></tr></thead><tbody>{invoiceRows.map((row) => <tr key={row[0]} className="border-t border-slate-100"><td className="px-5 py-4 font-semibold">{row[0]}</td><td className="px-3 py-4 text-right">{row[1]}</td><td className="px-3 py-4 text-right font-medium">{row[2]}</td><td className="px-5 py-4 text-right">{row[3]}</td></tr>)}</tbody></table></div></section>
  </div>;
}

function OperationsPanel({ revenue, aiQuota, tenants }: Omit<Props, "onExport" | "logs">) {
  const t = useT();
  const locale = useLocale();
  const nonDeleted = tenants.filter((item) => !item.deleted);
  const failedTenants = nonDeleted.filter((item) => item.status === "FAILED");
  const pendingTenants = nonDeleted.filter((item) => item.status === "PENDING_PAYMENT" || item.status === "PROVISIONING");
  const openLeads = revenue?.openLeadsCount ?? 0;
  const pendingInvoices = revenue?.pendingInvoicesCount ?? 0;
  const overdueInvoices = revenue?.overdueInvoicesCount ?? 0;
  const pendingContracts = revenue?.pendingContractsCount ?? 0;

  const dynamicTasks: Array<[string, string, string]> = [];
  failedTenants.forEach((item) => dynamicTasks.push([t("master.ops.analytics.operations.taskRetryTitle", { name: item.name, code: item.code }), t("master.ops.analytics.operations.taskTypeDbInfra"), t("master.ops.analytics.operations.dueHighPriority")]));
  pendingTenants.forEach((item) => dynamicTasks.push([t("master.ops.analytics.operations.taskPendingTitle", { name: item.name, code: item.code }), t("master.ops.analytics.operations.taskTypeOnboarding"), t("master.ops.analytics.operations.duePendingPayment")]));
  if (overdueInvoices > 0) {
    dynamicTasks.push([t("master.ops.analytics.operations.taskOverdueTitle", { count: overdueInvoices, amount: formatNumber(revenue?.overdueInvoicesAmount ?? 0, undefined, locale) }), t("master.ops.analytics.operations.taskTypeBilling"), t("master.ops.analytics.operations.dueImmediate")]);
  }
  if (pendingContracts > 0) {
    dynamicTasks.push([t("master.ops.analytics.operations.taskContractsTitle", { count: pendingContracts }), t("master.ops.analytics.operations.taskTypeLegal"), t("master.ops.analytics.operations.dueThisWeek")]);
  }
  if (openLeads > 0) {
    dynamicTasks.push([t("master.ops.analytics.operations.taskLeadsTitle", { count: openLeads }), t("master.ops.analytics.operations.taskTypeSales"), t("master.ops.analytics.operations.dueWithin24h")]);
  }
  if ((aiQuota?.nearQuotaTenantsCount ?? 0) > 0) {
    dynamicTasks.push([t("master.ops.analytics.operations.taskQuotaTitle", { count: aiQuota?.nearQuotaTenantsCount ?? 0 }), t("master.ops.analytics.operations.taskTypeAiQuota"), t("master.ops.analytics.operations.dueMonitor")]);
  }

  return <div className="grid gap-5 md:grid-cols-3"><section className={cn(cardClass, "p-5")}><LifeBuoy className="size-6 text-blue-600" /><p className="mt-4 text-sm text-slate-500">{t("master.ops.analytics.operations.openLeadsCard")}</p><p className="mt-1 text-3xl font-bold">{openLeads}</p><p className="mt-2 text-xs text-blue-700">{t("master.ops.analytics.operations.conversionRate", { rate: revenue?.conversionRatePercent ?? 0 })}</p></section><section className={cn(cardClass, "p-5")}><Clock3 className="size-6 text-blue-600" /><p className="mt-4 text-sm text-slate-500">{t("master.ops.analytics.operations.pendingDocsCard")}</p><p className="mt-1 text-3xl font-bold">{pendingInvoices + pendingContracts}</p><p className="mt-2 text-xs text-amber-700">{t("master.ops.analytics.operations.pendingDocsDetail", { invoices: pendingInvoices, contracts: pendingContracts })}</p></section><section className={cn(cardClass, "p-5")}><Building2 className="size-6 text-blue-600" /><p className="mt-4 text-sm text-slate-500">{t("master.ops.analytics.operations.pendingOnboardingCard")}</p><p className="mt-1 text-3xl font-bold">{pendingTenants.length + failedTenants.length}</p><p className="mt-2 text-xs text-rose-700">{t("master.ops.analytics.operations.failedProvDetail", { count: failedTenants.length })}</p></section><section className={cn(cardClass, "overflow-hidden md:col-span-3")}><div className="border-b border-slate-100 p-5"><h2 className="font-semibold">{t("master.ops.analytics.operations.opsQueueTitle", { count: dynamicTasks.length })}</h2></div><div className="divide-y divide-slate-100">{dynamicTasks.map(([task,type,due],index) => <div key={task} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center"><span className={cn("grid size-8 place-items-center rounded-lg", index === 0 ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700")}><AlertTriangle className="size-4" /></span><div className="flex-1"><p className="text-sm font-semibold">{task}</p><p className="text-xs text-slate-500">{type}</p></div><span className="text-xs font-semibold text-slate-600">{due}</span></div>)}{dynamicTasks.length === 0 && <p className="p-8 text-center text-sm text-slate-500">{t("master.ops.analytics.operations.opsQueueEmpty")}</p>}</div></section></div>;
}

export function PlatformAnalyticsDashboard({ revenue, aiQuota, tenants, logs, onExport }: Props) {
  const t = useT();
  const [activeTab, setActiveTab] = useState<PlatformTab>("overview");
  const panels: Record<PlatformTab, React.ReactNode> = {
    overview: <Overview revenue={revenue} aiQuota={aiQuota} tenants={tenants} logs={logs} />,
    revenue: <RevenuePanel revenue={revenue} />,
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
          <span>{t("master.ops.analytics.exportReport")}</span>
        </button>
      </HeaderActions>
    <nav className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm" aria-label={t("master.ops.analytics.tabsAria")}><div className="flex min-w-max gap-1" role="tablist">{tabs.map((tab) => { const Icon = tab.icon; const selected = activeTab === tab.id; return <button key={tab.id} type="button" role="tab" id={`platform-tab-${tab.id}`} aria-selected={selected} aria-controls={`platform-panel-${tab.id}`} onClick={() => setActiveTab(tab.id)} className={cn("inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition-colors", selected ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}><Icon className="size-4" aria-hidden="true" />{t(tab.labelKey)}</button>; })}</div></nav>
    <div role="tabpanel" tabIndex={0} id={`platform-panel-${activeTab}`} aria-labelledby={`platform-tab-${activeTab}`}>{panels[activeTab]}</div>
    </div>
  );
}
