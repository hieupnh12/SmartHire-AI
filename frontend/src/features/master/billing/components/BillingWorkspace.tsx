import { useMemo, useState } from "react";
import type {
  ChartDataPoint,
  RevenueAnalytics,
  SubscriptionPlan,
  TenantInfo,
  TenantSubscriptionInstance,
} from "@/api/master/masterAdminApi";
import type { InvoiceItem } from "@/api/master/billingApi";
import { cn } from "@/lib/utils";
import { HeaderActions } from "@/features/master/shell/HeaderActions";
import { toast } from "@/stores/toastStore";
import { formatDate, formatNumber, useLocale, useT, type Locale } from "@/i18n";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Download,
  FileText,
  Plus,
  Search,
  SlidersHorizontal,
  TriangleAlert,
  UserRoundCheck,
} from "lucide-react";

export type BillingView = "overview" | "plans" | "allocations" | "invoices";

type BillingWorkspaceProps = {
  plans: SubscriptionPlan[];
  tenants: TenantInfo[];
  invoices?: InvoiceItem[];
  revenue?: RevenueAnalytics | null;
  tenantSubscriptions?: TenantSubscriptionInstance[];
  view: BillingView;
  onViewChange: (view: BillingView) => void;
  monthlyRevenue: number;
  activeTenants: number;
  onCreatePlan: () => void;
  onEditPlan: (plan: SubscriptionPlan) => void;
  onTogglePlanStatus: (plan: SubscriptionPlan) => void;
  onSubscriptionAssigned?: () => Promise<void> | void;
};

type InvoiceStatus = "PAID" | "PENDING" | "OVERDUE" | "CANCELLED";

function formatVndCurrency(value: number, locale: Locale): string {
  return formatNumber(
    value,
    {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    },
    locale,
  );
}

const surface = "rounded-2xl border border-slate-200/90 bg-white shadow-[0_8px_24px_-18px_rgba(15,23,42,0.28)]";

export function BillingWorkspace({
  plans,
  tenants,
  invoices = [],
  revenue = null,
  tenantSubscriptions = [],
  view,
  onViewChange,
  monthlyRevenue,
  activeTenants,
  onCreatePlan,
  onEditPlan,
  onTogglePlanStatus,
  onSubscriptionAssigned,
}: BillingWorkspaceProps) {
  const t = useT();
  const locale = useLocale();
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [allocationQuery, setAllocationQuery] = useState("");
  const [savedTenantId, setSavedTenantId] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Record<number, string>>(() => ({}));

  const subscriptionByTenantId = useMemo(() => {
    const map = new Map<number, TenantSubscriptionInstance>();
    tenantSubscriptions.forEach((sub) => {
      map.set(sub.tenantId, sub);
    });
    return map;
  }, [tenantSubscriptions]);

  const planById = useMemo(() => {
    const map = new Map<number, SubscriptionPlan>();
    plans.forEach((plan) => {
      if (plan.id != null) {
        map.set(plan.id, plan);
      }
    });
    return map;
  }, [plans]);

  const filteredInvoices = useMemo(() => {
    const query = invoiceQuery.trim().toLowerCase();
    return query
      ? invoices.filter((invoice) =>
          `${invoice.invoiceNumber} ${invoice.tenantName ?? ""} ${invoice.tenantCode ?? ""} ${invoice.planName ?? ""}`
            .toLowerCase()
            .includes(query),
        )
      : invoices;
  }, [invoiceQuery, invoices]);

  const filteredTenants = useMemo(() => {
    const nonDeleted = tenants.filter((item) => !item.deleted);
    const query = allocationQuery.trim().toLowerCase();
    return query
      ? nonDeleted.filter((tenant) =>
          `${tenant.name} ${tenant.code} ${tenant.subdomain}`.toLowerCase().includes(query),
        )
      : nonDeleted;
  }, [allocationQuery, tenants]);

  const paidTotal =
    revenue?.paidInvoicesAmount ??
    invoices.filter((inv) => inv.status === "PAID").reduce((sum, inv) => sum + (inv.amount ?? 0), 0);
  const pendingTotal =
    revenue?.pendingInvoicesAmount ??
    invoices.filter((inv) => inv.status === "PENDING").reduce((sum, inv) => sum + (inv.amount ?? 0), 0);
  const overdueTotal =
    revenue?.overdueInvoicesAmount ??
    invoices.filter((inv) => inv.status === "OVERDUE").reduce((sum, inv) => sum + (inv.amount ?? 0), 0);

  const pendingCount =
    revenue?.pendingInvoicesCount ?? invoices.filter((inv) => inv.status === "PENDING").length;
  const overdueCount =
    revenue?.overdueInvoicesCount ?? invoices.filter((inv) => inv.status === "OVERDUE").length;

  const totalBilled = paidTotal + pendingTotal + overdueTotal;
  const collectionPercent = totalBilled > 0 ? Math.round((paidTotal * 100) / totalBilled) : 100;

  const downloadInvoices = () => {
    const header = t("master.commerce.billingWorkspace.csvHeader");
    const rows = invoices.map((invoice) =>
      [
        invoice.invoiceNumber,
        invoice.tenantName ?? invoice.tenantCode ?? `#${invoice.tenantId}`,
        invoice.planName ?? invoice.planCode ?? "Enterprise",
        invoice.dueDate ? formatDate(invoice.dueDate, undefined, locale) : "—",
        invoice.amount,
        invoice.status,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `smarthire-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <HeaderActions>
        <button
          type="button"
          onClick={downloadInvoices}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50"
        >
          <Download className="size-3.5" aria-hidden="true" />
          <span>{t("master.commerce.billingWorkspace.exportReport")}</span>
        </button>
        <button
          type="button"
          onClick={onCreatePlan}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          <span>{t("master.commerce.billingWorkspace.createPlan")}</span>
        </button>
      </HeaderActions>

      <nav className="flex w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 sm:w-fit" aria-label={t("master.commerce.billingWorkspace.navAria")}>
        {([
          ["overview", t("master.commerce.billingWorkspace.tabs.overview")],
          ["plans", t("master.commerce.billingWorkspace.tabs.plans", { count: plans.length })],
          ["allocations", t("master.commerce.billingWorkspace.tabs.allocations")],
          ["invoices", t("master.commerce.billingWorkspace.tabs.invoices", { count: invoices.length })],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => onViewChange(id)} aria-current={view === id ? "page" : undefined} className={cn("min-h-9 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors", view === id ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>{label}</button>
        ))}
      </nav>

      {view === "overview" && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("master.commerce.billingWorkspace.overviewAria")}>
            <MetricCard icon={CircleDollarSign} label={t("master.commerce.billingWorkspace.metrics.mrrLabel")} value={formatVndCurrency(monthlyRevenue, locale)} detail={t("master.commerce.billingWorkspace.metrics.mrrDetail")} trend={revenue?.growthRate ?? "0.0%"} positive />
            <MetricCard icon={Building2} label={t("master.commerce.billingWorkspace.metrics.activeTenantsLabel")} value={activeTenants.toString()} detail={t("master.commerce.billingWorkspace.metrics.activeTenantsDetail")} trend={t("master.commerce.billingWorkspace.metrics.activeTenantsTrend", { count: revenue?.newTenantsThisMonth ?? 0 })} positive />
            <MetricCard icon={Clock3} label={t("master.commerce.billingWorkspace.metrics.pendingLabel")} value={formatVndCurrency(pendingTotal, locale)} detail={t("master.commerce.billingWorkspace.metrics.pendingDetail", { count: pendingCount })} trend={t("master.commerce.billingWorkspace.metrics.pendingTrend", { count: pendingCount })} />
            <MetricCard icon={TriangleAlert} label={t("master.commerce.billingWorkspace.metrics.overdueLabel")} value={formatVndCurrency(overdueTotal, locale)} detail={t("master.commerce.billingWorkspace.metrics.overdueDetail", { count: overdueCount })} trend={t("master.commerce.billingWorkspace.metrics.overdueTrend", { count: overdueCount })} />
          </section>

          <div className="grid gap-5 xl:grid-cols-[1.45fr_0.75fr]">
            <section className={cn(surface, "overflow-hidden")}>
              <SectionHeader title={t("master.commerce.billingWorkspace.revenuePerfTitle")} description={t("master.commerce.billingWorkspace.revenuePerfDesc")} action={t("master.commerce.billingWorkspace.exportReport")} onAction={downloadInvoices} />
              <RevenueChart
                totalRevenue={revenue?.totalRevenue ?? paidTotal}
                growthRate={revenue?.growthRate ?? "0.0%"}
                trend={revenue?.revenueTrend ?? []}
              />
            </section>
            <section className={cn(surface, "p-5 sm:p-6")}>
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-sm font-semibold text-slate-950">{t("master.commerce.billingWorkspace.collectionTitle")}</p><p className="mt-1 text-xs text-slate-500">{t("master.commerce.billingWorkspace.collectionDesc")}</p></div>
                <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><CreditCard className="size-5" aria-hidden="true" /></span>
              </div>
              <div className="mt-6 flex items-center gap-5">
                <div className="grid size-28 shrink-0 place-items-center rounded-full bg-[conic-gradient(#2563eb_0_82%,#f59e0b_82%_94%,#ef4444_94%)] p-3">
                  <div className="grid size-full place-items-center rounded-full bg-white text-center"><span><strong className="block text-2xl text-slate-950">{collectionPercent}%</strong><small className="text-[10px] font-medium text-slate-500">{t("master.commerce.billingWorkspace.collectedLabel")}</small></span></div>
                </div>
                <dl className="min-w-0 flex-1 space-y-3 text-xs">
                  <StatusLegend color="bg-blue-600" label={t("master.commerce.billingWorkspace.paidLegend")} value={formatVndCurrency(paidTotal, locale)} />
                  <StatusLegend color="bg-amber-500" label={t("master.commerce.billingWorkspace.pendingLegend")} value={formatVndCurrency(pendingTotal, locale)} />
                  <StatusLegend color="bg-red-500" label={t("master.commerce.billingWorkspace.overdueLegend")} value={formatVndCurrency(overdueTotal, locale)} />
                </dl>
              </div>
              <button type="button" onClick={() => onViewChange("invoices")} className="mt-6 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-50 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100">{t("master.commerce.billingWorkspace.viewAllInvoices")}<ChevronRight className="size-4" /></button>
            </section>
          </div>

          <section className={cn(surface, "overflow-hidden")}>
            <SectionHeader title={t("master.commerce.billingWorkspace.plansSectionTitle")} description={t("master.commerce.billingWorkspace.plansSectionDesc")} action={t("master.commerce.billingWorkspace.managePlansAction")} onAction={() => onViewChange("plans")} />
            <div className="grid divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">
              {plans.slice(0, 3).map((plan) => <CompactPlan key={plan.id ?? plan.code} plan={plan} tenants={plan.subscriberCount ?? 0} />)}
            </div>
          </section>
          <InvoiceTable invoices={invoices.slice(0, 6)} onShowAll={() => onViewChange("invoices")} onDownload={downloadInvoices} />
        </>
      )}

      {view === "plans" && (
        <section className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {plans.map((plan) => <PlanCard key={plan.id ?? plan.code} plan={plan} tenants={plan.subscriberCount ?? 0} onEdit={() => onEditPlan(plan)} onToggle={() => onTogglePlanStatus(plan)} />)}
          <button type="button" onClick={onCreatePlan} className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-blue-300 bg-blue-50/40 p-8 text-center transition-colors hover:bg-blue-50">
            <span className="grid size-12 place-items-center rounded-2xl bg-white text-blue-700 shadow-sm"><Plus className="size-5" /></span>
            <span className="mt-4 text-sm font-semibold text-slate-900">{t("master.commerce.billingWorkspace.createNewPlanTitle")}</span>
            <span className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{t("master.commerce.billingWorkspace.createNewPlanDesc")}</span>
          </button>
        </section>
      )}

      {view === "allocations" && (
        <section className={cn(surface, "overflow-hidden")}>
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-base font-semibold text-slate-950">{t("master.commerce.billingWorkspace.allocations.title")}</h2>
              <p className="mt-1 text-xs text-slate-500">{t("master.commerce.billingWorkspace.allocations.subtitle")}</p>
            </div>
            <label className="relative block w-full sm:max-w-xs"><span className="sr-only">{t("master.commerce.billingWorkspace.allocations.searchSrOnly")}</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={allocationQuery} onChange={(event) => setAllocationQuery(event.target.value)} placeholder={t("master.commerce.billingWorkspace.allocations.searchPlaceholder")} className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" /></label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-3">{t("master.commerce.billingWorkspace.allocations.colCompany")}</th><th className="px-6 py-3">{t("master.commerce.billingWorkspace.allocations.colStatus")}</th><th className="px-6 py-3">{t("master.commerce.billingWorkspace.allocations.colCurrentPlan")}</th><th className="px-6 py-3">{t("master.commerce.billingWorkspace.allocations.colCyclePrice")}</th><th className="px-6 py-3 text-right">{t("master.commerce.billingWorkspace.allocations.colActions")}</th></tr></thead>
              <tbody>{filteredTenants.map((tenant) => {
                const subInstance = subscriptionByTenantId.get(tenant.id);
                const resolvedPlan = subInstance ? planById.get(subInstance.planId) : undefined;
                const currentPlanCode = subInstance?.planCodeSnapshot ?? resolvedPlan?.code ?? plans[0]?.code ?? "";
                const selectedCode = assignments[tenant.id] ?? currentPlanCode;
                const contractedPrice = subInstance?.contractedPriceYearly ?? resolvedPlan?.priceYearly ?? 0;
                return <tr key={tenant.id} className="border-t border-slate-100 hover:bg-blue-50/30"><td className="px-6 py-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-700"><Building2 className="size-4" /></span><span><strong className="block font-semibold text-slate-900">{tenant.name}</strong><small className="text-xs text-slate-500">{tenant.code} · {tenant.subdomain}</small></span></div></td><td className="px-6 py-4"><div className="flex flex-wrap items-center gap-1.5"><span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", tenant.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{tenant.status}</span>{subInstance?.status && <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600">{t("master.commerce.billingWorkspace.allocations.subPrefix", { status: subInstance.status })}</span>}</div></td><td className="px-6 py-4"><select aria-label={t("master.commerce.billingWorkspace.allocations.selectAria", { name: tenant.name })} value={selectedCode} onChange={(event) => { setAssignments((current) => ({ ...current, [tenant.id]: event.target.value })); setSavedTenantId(null); }} className="min-h-10 min-w-48 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100">{plans.filter((plan) => (plan.status === "ACTIVE" && !plan.archived) || plan.code === currentPlanCode).map((plan) => <option key={plan.id ?? plan.code} value={plan.code}>{plan.name} (v{plan.version ?? 1}{plan.custom ? t("master.commerce.billingWorkspace.allocations.customSuffix") : ""})</option>)}</select></td><td className="px-6 py-4 text-xs text-slate-600"><strong className="block text-slate-900">{formatVndCurrency(contractedPrice, locale)} / {t("master.commerce.common.yearUnit")}</strong><span>{t("master.commerce.billingWorkspace.allocations.yearlySnapshot")}</span></td><td className="px-6 py-4 text-right"><button type="button" onClick={async () => { try { const { masterAdminApi } = await import("@/api/master/masterAdminApi"); await masterAdminApi.assignTenantSubscription(tenant.id, { planCode: selectedCode, status: "ACTIVE" }); setSavedTenantId(tenant.id); await onSubscriptionAssigned?.(); toast.success(t("master.commerce.billingWorkspace.allocations.assignedToast", { code: selectedCode, name: tenant.name })); } catch { toast.danger(t("master.commerce.billingWorkspace.allocations.assignFailedToast")); } }} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700">{savedTenantId === tenant.id ? <><UserRoundCheck className="size-3.5" />{t("master.commerce.billingWorkspace.allocations.savedSnapshot")}</> : t("master.commerce.billingWorkspace.allocations.saveChanges")}</button></td></tr>;
              })}</tbody>
            </table>
          </div>
          {filteredTenants.length === 0 && <p className="p-10 text-center text-sm text-slate-500">{t("master.commerce.billingWorkspace.allocations.empty")}</p>}
        </section>
      )}

      {view === "invoices" && (
        <>
          <div className={cn(surface, "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between")}>
            <label className="relative block w-full sm:max-w-sm"><span className="sr-only">{t("master.commerce.billingWorkspace.invoicesSearchSrOnly")}</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={invoiceQuery} onChange={(event) => setInvoiceQuery(event.target.value)} placeholder={t("master.commerce.billingWorkspace.invoicesSearchPlaceholder")} className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100" /></label>
            <button type="button" onClick={downloadInvoices} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><SlidersHorizontal className="size-4" />{t("master.commerce.billingWorkspace.exportCsvCount", { count: filteredInvoices.length })}</button>
          </div>
          <InvoiceTable invoices={filteredInvoices} onDownload={downloadInvoices} />
        </>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail, trend, positive = false }: { icon: typeof CreditCard; label: string; value: string; detail: string; trend: string; positive?: boolean }) {
  return <article className={cn(surface, "p-5")}><div className="flex items-start justify-between"><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon className="size-5" /></span><span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold", positive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>{positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{trend}</span></div><p className="mt-5 text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{value}</p><p className="mt-2 text-xs text-slate-400">{detail}</p></article>;
}

function SectionHeader({ title, description, action, onAction }: { title: string; description: string; action: string; onAction: () => void }) {
  return <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6"><div><h2 className="text-sm font-semibold text-slate-950">{title}</h2><p className="mt-1 text-xs text-slate-500">{description}</p></div><button type="button" onClick={onAction} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">{action}<ChevronRight className="size-3.5" /></button></div>;
}

function RevenueChart({ totalRevenue, growthRate, trend }: { totalRevenue: number; growthRate: string; trend: ChartDataPoint[] }) {
  const t = useT();
  const locale = useLocale();
  const maxVal = Math.max(...trend.map((d) => d.value), 1);
  return (
    <div className="p-5 sm:p-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <strong className="text-2xl font-semibold text-slate-950">{formatVndCurrency(totalRevenue, locale)}</strong>
          <span className="ml-2 text-xs font-semibold text-emerald-700">{growthRate}</span>
        </div>
        <span className="text-xs text-slate-400">{t("master.commerce.billingWorkspace.chart.unit")}</span>
      </div>
      {trend.length > 0 ? (
        <>
          <div className="flex h-44 items-end gap-3 sm:gap-5" role="img" aria-label={t("master.commerce.billingWorkspace.chart.ariaLabel")}>
            <div className="flex h-full flex-1 items-end justify-around border-b border-slate-200 bg-[linear-gradient(to_top,#e2e8f0_1px,transparent_1px)] [background-size:100%_25%]">
              {trend.map((point) => {
                const heightPct = Math.max(8, Math.round((point.value / maxVal) * 92));
                return (
                  <div key={point.label} className="group flex h-full w-full items-end justify-center">
                    <div
                      className="relative w-3/5 max-w-12 rounded-t-lg bg-blue-100 transition-colors group-hover:bg-blue-200"
                      style={{ height: `${heightPct}%` }}
                    >
                      <span className="absolute inset-x-0 -top-6 hidden text-center text-[10px] font-semibold text-blue-700 group-hover:block">
                        {formatVndCurrency(point.value, locale)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div
            className="mt-3 grid text-center text-[10px] font-medium text-slate-400"
            style={{ gridTemplateColumns: `repeat(${trend.length}, minmax(0, 1fr))` }}
          >
            {trend.map((point) => (
              <span key={point.label} className="truncate px-1">
                {point.label}
              </span>
            ))}
          </div>
        </>
      ) : (
        <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
          {t("master.commerce.billingWorkspace.chart.empty")}
        </div>
      )}
    </div>
  );
}

function StatusLegend({ color, label, value }: { color: string; label: string; value: string }) {
  return <div className="flex items-center gap-2"><span className={cn("size-2 rounded-full", color)} /><dt className="min-w-0 flex-1 text-slate-500">{label}</dt><dd className="font-semibold text-slate-900">{value}</dd></div>;
}

function CompactPlan({ plan, tenants }: { plan: SubscriptionPlan; tenants: number }) {
  const t = useT();
  const locale = useLocale();
  const displayPrice = plan.priceYearly
    ? `${formatNumber(plan.priceYearly, undefined, locale)} ₫`
    : "0 ₫";
  const count = plan.subscriberCount ?? tenants;
  return (
    <article className="p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="rounded-lg bg-blue-50 px-2 py-1 font-mono text-[10px] font-semibold text-blue-700">{plan.code}</span>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">v{plan.version ?? 1}</span>
        </div>
        <span className={cn("size-2 rounded-full", plan.status === "ACTIVE" ? "bg-emerald-500" : plan.status === "ARCHIVED" ? "bg-amber-500" : "bg-slate-300")} />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-950">{plan.name}</h3>
      <p className="mt-1 text-xs text-slate-500">{t("master.commerce.billingWorkspace.compactPlan.tenantsUsing", { count })}</p>
      <div className="mt-4 flex items-baseline gap-1">
        <strong className="text-xl text-slate-950">{displayPrice}</strong>
        <span className="text-xs text-slate-500">/ {t("master.commerce.common.yearUnit")}</span>
      </div>
    </article>
  );
}

function PlanCard({ plan, tenants, onEdit, onToggle }: { plan: SubscriptionPlan; tenants: number; onEdit: () => void; onToggle: () => void }) {
  const t = useT();
  const locale = useLocale();
  const displayPrice = plan.priceYearly
    ? `${formatNumber(plan.priceYearly, undefined, locale)} ₫`
    : "0 ₫";
  const subscriberCount = plan.subscriberCount ?? tenants;
  const isArchived = plan.archived || plan.status === "ARCHIVED";
  return (
    <article className={cn(surface, "flex flex-col overflow-hidden", isArchived && "border-amber-200/80 bg-amber-50/10")}>
      <div className="border-b border-slate-100 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] font-semibold tracking-wide text-blue-700">{plan.code}</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">v{plan.version ?? 1}</span>
              {plan.custom && (
                <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                  {t("master.commerce.billingWorkspace.planCard.customBadge")} {plan.targetTenantId ? `#${plan.targetTenantId}` : ""}
                </span>
              )}
            </div>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">{plan.name}</h2>
          </div>
          <span className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-semibold",
            plan.status === "ACTIVE" && !isArchived
              ? "bg-emerald-50 text-emerald-700"
              : isArchived
              ? "bg-amber-100 text-amber-800"
              : "bg-slate-100 text-slate-500"
          )}>
            {plan.status === "ACTIVE" && !isArchived
              ? t("master.commerce.billingWorkspace.planCard.statusActive")
              : isArchived
              ? t("master.commerce.billingWorkspace.planCard.statusArchived")
              : t("master.commerce.billingWorkspace.planCard.statusPaused")}
          </span>
        </div>
        <p className="mt-3 min-h-10 text-xs leading-5 text-slate-500">{plan.description}</p>
        <div className="mt-5 flex items-baseline gap-1.5">
          <strong className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">{displayPrice}</strong>
          <span className="text-xs font-semibold text-slate-600">/ {t("master.commerce.common.yearUnit")}</span>
        </div>
        <p className="mt-1 text-xs text-emerald-600 font-medium">
          {isArchived ? t("master.commerce.billingWorkspace.planCard.archivedDesc") : t("master.commerce.billingWorkspace.planCard.activeDesc")}
        </p>
      </div>
      <div className="flex-1 space-y-3 p-6 text-sm text-slate-600">
        <PlanFeature text={plan.maxJobs < 0 ? t("master.commerce.billingWorkspace.planCard.unlimitedJobs") : t("master.commerce.billingWorkspace.planCard.limitedJobs", { count: plan.maxJobs })} />
        <PlanFeature text={plan.maxCvParses < 0 ? t("master.commerce.billingWorkspace.planCard.unlimitedCv") : t("master.commerce.billingWorkspace.planCard.limitedCv", { count: formatNumber(plan.maxCvParses, undefined, locale) })} />
        <PlanFeature text={plan.maxAiInterviewHours == null || plan.maxAiInterviewHours < 0 ? t("master.commerce.billingWorkspace.planCard.unlimitedAi") : plan.maxAiInterviewHours === 0 ? t("master.commerce.billingWorkspace.planCard.noAi") : t("master.commerce.billingWorkspace.planCard.limitedAi", { count: plan.maxAiInterviewHours })} />
        <PlanFeature text={plan.maxStorageGb == null || plan.maxStorageGb < 0 ? t("master.commerce.billingWorkspace.planCard.unlimitedStorage") : plan.maxStorageGb === 0 ? t("master.commerce.billingWorkspace.planCard.noStorage") : t("master.commerce.billingWorkspace.planCard.limitedStorage", { count: plan.maxStorageGb })} />
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
          <span className="text-slate-500">{t("master.commerce.billingWorkspace.planCard.referencingContracts")}</span>
          <strong className="text-slate-900">{subscriberCount}</strong>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-4">
        <button type="button" onClick={onEdit} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-50 text-sm font-semibold text-blue-700 hover:bg-blue-100">
          <SlidersHorizontal className="size-4" />{subscriberCount > 0 ? t("master.commerce.billingWorkspace.planCard.cloneBtn") : t("master.commerce.billingWorkspace.planCard.editBtn")}
        </button>
        <button type="button" onClick={onToggle} className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          {plan.status === "ACTIVE" ? t("master.commerce.billingWorkspace.planCard.archiveBtn") : t("master.commerce.billingWorkspace.planCard.reactivateBtn")}
        </button>
      </div>
    </article>
  );
}

function PlanFeature({ text }: { text: string }) { return <div className="flex items-center gap-2"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700"><Check className="size-3" /></span><span>{text}</span></div>; }

function InvoiceTable({ invoices: rows, onShowAll, onDownload }: { invoices: InvoiceItem[]; onShowAll?: () => void; onDownload: () => void }) {
  const t = useT();
  const locale = useLocale();
  return <section className={cn(surface, "overflow-hidden")}><SectionHeader title={t("master.commerce.billingWorkspace.invoiceTable.title")} description={t("master.commerce.billingWorkspace.invoiceTable.desc", { count: rows.length })} action={onShowAll ? t("master.commerce.billingWorkspace.invoiceTable.viewAll") : t("master.commerce.billingWorkspace.invoiceTable.download")} onAction={onShowAll ?? onDownload} /><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-3">{t("master.commerce.billingWorkspace.invoiceTable.colInvoice")}</th><th className="px-6 py-3">{t("master.commerce.billingWorkspace.invoiceTable.colCompany")}</th><th className="px-6 py-3">{t("master.commerce.billingWorkspace.invoiceTable.colPlan")}</th><th className="px-6 py-3">{t("master.commerce.billingWorkspace.invoiceTable.colDueDate")}</th><th className="px-6 py-3 text-right">{t("master.commerce.billingWorkspace.invoiceTable.colAmount")}</th><th className="px-6 py-3">{t("master.commerce.billingWorkspace.invoiceTable.colStatus")}</th></tr></thead><tbody>{rows.map((invoice) => <tr key={invoice.id} className="border-t border-slate-100 transition-colors hover:bg-blue-50/30"><td className="px-6 py-4 font-mono text-xs font-semibold text-blue-700"><span className="inline-flex items-center gap-2"><FileText className="size-4 text-slate-400" />{invoice.invoiceNumber}</span></td><td className="px-6 py-4 font-medium text-slate-900">{invoice.tenantName ?? invoice.tenantCode ?? `#${invoice.tenantId}`}</td><td className="px-6 py-4 text-slate-500">{invoice.planName ?? invoice.planCode ?? "Enterprise"}</td><td className="px-6 py-4 text-slate-500">{invoice.dueDate ? formatDate(invoice.dueDate, undefined, locale) : "—"}</td><td className="px-6 py-4 text-right font-semibold text-slate-900">{formatVndCurrency(invoice.amount, locale)}</td><td className="px-6 py-4"><InvoiceBadge status={invoice.status} /></td></tr>)}{rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">{t("master.commerce.billingWorkspace.invoiceTable.empty")}</td></tr>}</tbody></table></div></section>;
}

function InvoiceBadge({ status }: { status: InvoiceStatus }) {
  const t = useT();
  const config = ({
    PAID: [t("master.commerce.billingWorkspace.invoiceStatus.PAID"), "bg-emerald-50 text-emerald-700"],
    PENDING: [t("master.commerce.billingWorkspace.invoiceStatus.PENDING"), "bg-amber-50 text-amber-700"],
    OVERDUE: [t("master.commerce.billingWorkspace.invoiceStatus.OVERDUE"), "bg-red-50 text-red-700"],
    CANCELLED: [t("master.commerce.billingWorkspace.invoiceStatus.CANCELLED"), "bg-slate-100 text-slate-600"],
  } as const)[status] ?? [t("master.commerce.billingWorkspace.invoiceStatus.PENDING"), "bg-amber-50 text-amber-700"];
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold", config[1])}><span className="size-1.5 rounded-full bg-current" />{config[0]}</span>;
}
