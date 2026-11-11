import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileClock,
  Plus,
  ShieldCheck,
} from "lucide-react";
import type { AiQuotaUsage, AuditLog, RevenueAnalytics, TenantInfo } from "@/api/master/masterAdminApi";
import { HeaderActions } from "@/features/master/shell/HeaderActions";
import { cn } from "@/lib/utils";
import { useT, useLocale, formatNumber, formatDateTime } from "@/i18n";

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
  const t = useT();
  const locale = useLocale();
  const activeTenantsList = tenants.filter((tenant) => !tenant.deleted && tenant.status === "ACTIVE");
  const attentionTenants = tenants.filter((tenant) => !tenant.deleted && tenant.status !== "ACTIVE");
  const warnings = logs.filter((log) => log.level !== "INFO");
  const cvLimit = aiQuota?.totalCvParsesLimit && aiQuota.totalCvParsesLimit > 0 ? aiQuota.totalCvParsesLimit : 1000;
  const cvUsage = Math.min(100, Math.round(((aiQuota?.totalCvParsesUsed ?? 0) / cvLimit) * 100));

  const overdueCount = revenue?.overdueInvoicesCount ?? 0;
  const overdueAmount = revenue?.overdueInvoicesAmount ?? 0;
  const nearQuotaCount = aiQuota?.nearQuotaTenantsCount ?? 0;
  const totalActionItems = attentionTenants.length + overdueCount + nearQuotaCount + warnings.length;

  const tasks = [
    {
      title: t("master.ops.dashboard.tasks.attentionTitle", { count: attentionTenants.length }),
      detail: attentionTenants.length > 0
        ? t("master.ops.dashboard.tasks.attentionDetailActive")
        : t("master.ops.dashboard.tasks.attentionDetailOk"),
      icon: Building2,
      tone: attentionTenants.length > 0 ? "rose" : "blue",
      destination: "tenants" as const,
    },
    {
      title: t("master.ops.dashboard.tasks.overdueTitle", { count: overdueCount }),
      detail: overdueCount > 0
        ? t("master.ops.dashboard.tasks.overdueDetailActive", {
            amount: formatNumber(overdueAmount, undefined, locale),
          })
        : t("master.ops.dashboard.tasks.overdueDetailOk"),
      icon: CreditCard,
      tone: overdueCount > 0 ? "amber" : "blue",
      destination: "subscriptions" as const,
    },
    {
      title: t("master.ops.dashboard.tasks.nearQuotaTitle", { count: nearQuotaCount }),
      detail: nearQuotaCount > 0
        ? t("master.ops.dashboard.tasks.nearQuotaDetailActive")
        : t("master.ops.dashboard.tasks.nearQuotaDetailOk"),
      icon: Bot,
      tone: nearQuotaCount > 0 ? "amber" : "blue",
      destination: "analytics" as const,
    },
    {
      title: t("master.ops.dashboard.tasks.warningsTitle", { count: warnings.length }),
      detail: warnings.length > 0
        ? t("master.ops.dashboard.tasks.warningsDetailActive")
        : t("master.ops.dashboard.tasks.warningsDetailOk"),
      icon: ShieldCheck,
      tone: warnings.length > 0 ? "rose" : "blue",
      destination: "logs" as const,
    },
  ];

  const isHealthy = (aiQuota?.systemHealth ?? "HEALTHY") === "HEALTHY";

  return (
    <div className="space-y-6 animate-fade-in">
      <HeaderActions>
        <button
          type="button"
          onClick={onCreateTenant}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700"
        >
          <Plus className="size-3.5" />
          <span>{t("master.ops.dashboard.createTenant")}</span>
        </button>
      </HeaderActions>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <QuickMetric
          label={t("master.ops.dashboard.metrics.activeTenantsLabel")}
          value={`${revenue?.activeTenants ?? activeTenantsList.length}`}
          helper={t("master.ops.dashboard.metrics.activeTenantsHelper", {
            attention: attentionTenants.length,
            total: revenue?.totalTenants ?? tenants.length,
          })}
          icon={Building2}
        />
        <QuickMetric
          label={t("master.ops.dashboard.metrics.mrrLabel")}
          value={t("master.ops.dashboard.metrics.mrrValue", {
            amount: formatNumber(revenue?.mrr ?? 0, undefined, locale),
          })}
          helper={t("master.ops.dashboard.metrics.mrrHelper", {
            rate: revenue?.growthRate ?? "0.0%",
          })}
          icon={CircleDollarSign}
        />
        <QuickMetric
          label={t("master.ops.dashboard.metrics.aiQuotaLabel")}
          value={`${cvUsage}%`}
          helper={t("master.ops.dashboard.metrics.aiQuotaHelper", {
            used: formatNumber(aiQuota?.totalCvParsesUsed ?? 0, undefined, locale),
            limit: formatNumber(cvLimit, undefined, locale),
          })}
          icon={Bot}
        />
        <QuickMetric
          label={t("master.ops.dashboard.metrics.systemHealthLabel")}
          value={isHealthy ? "HEALTHY" : "DEGRADED"}
          helper={t("master.ops.dashboard.metrics.systemHealthHelper", {
            rate: aiQuota?.apiSuccessRate ?? 100,
            models: aiQuota?.activeModels?.length ?? 0,
          })}
          icon={Activity}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className={cn(cardClass, "overflow-hidden")}>
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="font-semibold text-slate-950">{t("master.ops.dashboard.recentEvents.title")}</h2>
              <p className="mt-1 text-xs text-slate-500">{t("master.ops.dashboard.recentEvents.subtitle")}</p>
            </div>
            <button type="button" onClick={() => onNavigate("logs")} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">
              {t("master.ops.dashboard.recentEvents.viewLogs")} <ArrowRight className="size-3.5" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {logs.slice(0, 6).map((log) => (
              <article key={log.id} className="flex gap-3 px-5 py-4">
                <span className={cn("mt-1 grid size-9 shrink-0 place-items-center rounded-xl", log.level === "ERROR" ? "bg-rose-50 text-rose-700" : log.level === "WARN" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700")}>
                  {log.level === "INFO" ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{log.action}</h3>
                    <time className="text-[11px] text-slate-400">{formatDateTime(log.timestamp, undefined, locale)}</time>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{log.tenantCode} · {log.description}</p>
                </div>
              </article>
            ))}
            {logs.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500">{t("master.ops.dashboard.recentEvents.empty")}</p>}
          </div>
        </section>

        <section className={cn(cardClass, "p-5")}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-950">{t("master.ops.dashboard.actionRequired.title")}</h2>
              <p className="mt-1 text-xs text-slate-500">{t("master.ops.dashboard.actionRequired.subtitle")}</p>
            </div>
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", totalActionItems > 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700")}>
              {totalActionItems}
            </span>
          </div>
          <div className="mt-4 space-y-2.5">
            {tasks.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => onNavigate(item.destination)}
                  className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/50"
                >
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", item.tone === "rose" ? "bg-rose-50 text-rose-700" : item.tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700")}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{item.detail}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-slate-400" />
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <SummaryCard
          icon={Activity}
          title={t("master.ops.dashboard.summary.infraTitle")}
          subtitle={t("master.ops.dashboard.summary.infraSubtitle")}
          rows={[
            [t("master.ops.dashboard.summary.avgLatency"), aiQuota?.averageLatencyMs ? `${aiQuota.averageLatencyMs} ms` : "< 150 ms"],
            [t("master.ops.dashboard.summary.aiSuccessRate"), `${aiQuota?.apiSuccessRate ?? 100}%`],
            [t("master.ops.dashboard.summary.activeDbPools"), t("master.ops.dashboard.summary.poolsCount", {
              active: revenue?.activeTenants ?? activeTenantsList.length,
              total: revenue?.totalTenants ?? tenants.length,
            })],
          ]}
        />
        <SummaryCard
          icon={FileClock}
          title={t("master.ops.dashboard.summary.usageTitle")}
          subtitle={t("master.ops.dashboard.summary.usageSubtitle")}
          rows={[
            [t("master.ops.dashboard.summary.newTenants"), `${revenue?.newTenantsThisMonth ?? 0}`],
            [t("master.ops.dashboard.summary.cvProcessed"), formatNumber(aiQuota?.totalCvParsesUsed ?? 0, undefined, locale)],
            [t("master.ops.dashboard.summary.interviewHours"), t("master.ops.dashboard.summary.hoursUnit", {
              hours: aiQuota?.totalVoiceHoursUsed ?? 0,
            })],
          ]}
        />
        <SummaryCard
          icon={CreditCard}
          title={t("master.ops.dashboard.summary.financeTitle")}
          subtitle={t("master.ops.dashboard.summary.financeSubtitle")}
          rows={[
            [t("master.ops.dashboard.summary.arrLabel"), t("master.ops.dashboard.summary.arrValue", {
              amount: formatNumber(revenue?.arr ?? 0, undefined, locale),
            })],
            [t("master.ops.dashboard.summary.pendingInvoices"), t("master.ops.dashboard.summary.pendingInvoicesValue", {
              count: revenue?.pendingInvoicesCount ?? 0,
              amount: formatNumber(revenue?.pendingInvoicesAmount ?? 0, undefined, locale),
            })],
            [t("master.ops.dashboard.summary.leadsContracts"), t("master.ops.dashboard.summary.leadsContractsValue", {
              leads: revenue?.openLeadsCount ?? 0,
              contracts: revenue?.pendingContractsCount ?? 0,
            })],
          ]}
        />
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, title, subtitle, rows }: { icon: typeof Activity; title: string; subtitle: string; rows: string[][] }) {
  return <section className={cn(cardClass, "p-5")}><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon className="size-5" /></span><div><h2 className="text-sm font-semibold">{title}</h2><p className="text-xs text-slate-500">{subtitle}</p></div></div><dl className="mt-4 space-y-3 text-sm">{rows.map(([label,value]) => <div key={label} className="flex justify-between"><dt className="text-slate-500">{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl></section>;
}
