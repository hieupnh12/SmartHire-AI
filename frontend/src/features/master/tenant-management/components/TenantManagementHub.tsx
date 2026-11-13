import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArchiveRestore,
  Building2,
  CheckCircle2,
  Eye,
  LoaderCircle,
  RefreshCw,
  Search,
  ServerCog,
  ShieldCheck,
  UserRoundCog,
  X,
  Receipt,
  FileSignature,
  MapPin,
  Phone,
  Mail,
  Globe,
} from "lucide-react";
import { masterAdminApi, type TenantInfo } from "@/api/master/masterAdminApi";
import { billingApi } from "@/api/master/billingApi";
import { contractApi } from "@/api/master/contractApi";
import { cn } from "@/lib/utils";
import { useT, useLocale, formatNumber, formatDate, formatDateTime } from "@/i18n";

export type TenantHubTab = "directory" | "provisioning";
type Props = {
  activeTab: TenantHubTab;
  onTabChange: (tab: TenantHubTab) => void;
  tenants: TenantInfo[];
  onToggleStatus: (tenant: TenantInfo) => void;
  onSoftDeleteTenant?: (tenant: TenantInfo) => void;
  onRestoreTenant?: (tenant: TenantInfo) => void;
  onRetryProvisioning: (tenant: TenantInfo) => void;
};

const cardClass = "rounded-2xl border border-slate-200 bg-white shadow-[0_4px_14px_-8px_rgba(15,23,42,0.16)]";
const inputClass = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15";

function statusStyle(status: string, deleted?: boolean) {
  if (deleted) return "bg-slate-200 text-slate-700 line-through";
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-700";
  if (status === "PENDING_PAYMENT") return "bg-indigo-50 text-indigo-700";
  if (status === "FAILED") return "bg-rose-50 text-rose-700";
  if (status === "PROVISIONING") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function DirectoryPanel({ tenants, onToggleStatus, onSoftDeleteTenant, onRestoreTenant, onRetryProvisioning }: Pick<Props, "tenants" | "onToggleStatus" | "onSoftDeleteTenant" | "onRestoreTenant" | "onRetryProvisioning">) {
  const t = useT();
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [selected, setSelected] = useState<TenantInfo | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const filtered = tenants.filter((tenant) => {
    const matchStatus = status === "ALL"
      || (status === "DELETED" ? Boolean(tenant.deleted) : (!tenant.deleted && tenant.status === status));
    const matchSearch = [tenant.name, tenant.code, tenant.subdomain].some((value) => value.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });
  const openDetail = async (tenant: TenantInfo) => {
    setDetailLoading(true);
    setSelected(tenant);
    try { setSelected(await masterAdminApi.getTenantById(tenant.id)); } catch { setSelected(tenant); } finally { setDetailLoading(false); }
  };
  return <div className="relative"><section className={cn(cardClass, "overflow-hidden")}><div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-semibold text-slate-600">{t("master.ops.tenants.directory.title")}</h2></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("master.ops.tenants.directory.searchPlaceholder")} className={cn(inputClass, "pl-9 sm:w-64")} /></label><select value={status} onChange={(event) => setStatus(event.target.value)} className={cn(inputClass, "sm:w-48")}><option value="ALL">{t("master.ops.tenants.directory.filterAll")}</option><option value="ACTIVE">{t("master.ops.tenants.directory.filterActive")}</option><option value="PENDING_PAYMENT">{t("master.ops.tenants.directory.filterPendingPayment")}</option><option value="PROVISIONING">{t("master.ops.tenants.directory.filterProvisioning")}</option><option value="FAILED">{t("master.ops.tenants.directory.filterFailed")}</option><option value="SUSPENDED">{t("master.ops.tenants.directory.filterSuspended")}</option><option value="DELETED">{t("master.ops.tenants.directory.filterDeleted")}</option></select></div></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm text-slate-600"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600"><tr><th className="px-5 py-3">{t("master.ops.tenants.directory.colCompany")}</th><th className="px-3 py-3">{t("master.ops.tenants.directory.colSubdomain")}</th><th className="px-3 py-3">{t("master.ops.tenants.directory.colDatabase")}</th><th className="px-3 py-3">{t("master.ops.tenants.directory.colStatus")}</th><th className="px-3 py-3">{t("master.ops.tenants.directory.colCreatedAt")}</th><th className="px-5 py-3 text-right">{t("master.ops.tenants.directory.colActions")}</th></tr></thead><tbody>{filtered.map((tenant) => <tr key={tenant.id} className={cn("border-t border-slate-100 hover:bg-blue-50/30", tenant.deleted && "bg-slate-50/70 opacity-75")}><td className="px-5 py-4"><strong className="block text-slate-600">{tenant.name}</strong><span className="text-xs text-slate-500">{tenant.code}</span></td><td className="px-3 py-4 font-mono text-xs text-slate-600">{tenant.subdomain}.smarthire.top</td><td className="px-3 py-4 font-mono text-xs text-slate-600">{tenant.dbName}</td><td className="px-3 py-4"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusStyle(tenant.status, tenant.deleted))}>{tenant.deleted ? "SOFT_DELETED" : tenant.status}</span></td><td className="px-3 py-4 text-slate-500">{formatDate(tenant.createdAt, undefined, locale)}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => openDetail(tenant)} className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" title={t("master.ops.tenants.directory.viewDetailTitle")} aria-label={t("master.ops.tenants.directory.viewTenantAria", { name: tenant.name })}><Eye className="size-4" /></button>{!tenant.deleted && (tenant.status === "FAILED" || tenant.status === "PROVISIONING" ? <button type="button" onClick={() => onRetryProvisioning(tenant)} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-amber-50 px-3 text-xs font-semibold text-amber-700"><RefreshCw className="size-3.5" />{t("master.ops.tenants.directory.retryBtn")}</button> : tenant.status !== "PENDING_PAYMENT" && <button type="button" onClick={() => onToggleStatus(tenant)} className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">{tenant.status === "ACTIVE" ? t("master.ops.tenants.directory.suspendBtn") : t("master.ops.tenants.directory.activateBtn")}</button>)}{tenant.deleted ? (onRestoreTenant && <button type="button" onClick={() => onRestoreTenant(tenant)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100" title={t("master.ops.tenants.directory.restoreTitle")}><ArchiveRestore className="size-3.5" />{t("master.ops.tenants.directory.restoreBtn")}</button>) : (onSoftDeleteTenant && <button type="button" onClick={() => onSoftDeleteTenant(tenant)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-100" title={t("master.ops.tenants.directory.softDeleteTitle")}><ArchiveRestore className="size-3.5" />{t("master.ops.tenants.directory.softDeleteBtn")}</button>)}</div></td></tr>)}{filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">{t("master.ops.tenants.directory.empty")}</td></tr>}</tbody></table></div></section>{selected && <TenantDetailPanel tenant={selected} detailLoading={detailLoading} onClose={() => setSelected(null)} />}</div>;
}

function ProvisioningPanel({ tenants, onRetryProvisioning }: Pick<Props, "tenants" | "onRetryProvisioning">) {
  const t = useT();
  const relevant = tenants.filter((tenant) => tenant.status === "PROVISIONING" || tenant.status === "FAILED");
  const sample = relevant[0];
  const stages = [
    t("master.ops.tenants.provisioning.stage1"),
    t("master.ops.tenants.provisioning.stage2"),
    t("master.ops.tenants.provisioning.stage3"),
    t("master.ops.tenants.provisioning.stage4"),
    t("master.ops.tenants.provisioning.stage5"),
    t("master.ops.tenants.provisioning.stage6"),
  ];
  return <div className="grid gap-5 xl:grid-cols-[1fr_380px]"><section className={cn(cardClass, "overflow-hidden")}><div className="border-b border-slate-100 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{t("master.ops.tenants.provisioning.monitorTitle")}</h2><p className="mt-1 text-xs text-slate-500">{t("master.ops.tenants.provisioning.monitorSubtitle")}</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{t("master.ops.tenants.provisioning.zeroSecretBadge")}</span></div></div><div className="divide-y divide-slate-100">{relevant.map((tenant) => <div key={tenant.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center"><span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", tenant.status === "FAILED" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700")}>{tenant.status === "FAILED" ? <AlertTriangle className="size-5" /> : <LoaderCircle className="size-5 animate-spin" />}</span><div className="flex-1"><h3 className="text-sm font-semibold">{tenant.name}</h3><p className="mt-1 text-xs text-slate-500">{tenant.dbName} · {tenant.status === "FAILED" ? t("master.ops.tenants.provisioning.partialKeptDesc") : t("master.ops.tenants.provisioning.provisioningDesc")}</p></div><button type="button" onClick={() => onRetryProvisioning(tenant)} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white"><RefreshCw className="size-3.5" />{tenant.status === "FAILED" ? t("master.ops.tenants.provisioning.safeRetryBtn") : t("master.ops.tenants.provisioning.openDetailBtn")}</button></div>)}{relevant.length === 0 && <div className="px-5 py-8 text-center"><CheckCircle2 className="mx-auto size-8 text-emerald-600" /><p className="mt-3 text-sm font-semibold">{t("master.ops.tenants.provisioning.emptyTitle")}</p><p className="mt-1 text-xs text-slate-500">{t("master.ops.tenants.provisioning.emptyDesc")}</p></div>}</div><div className="border-t border-slate-100 p-5"><h3 className="text-sm font-semibold">{t("master.ops.tenants.provisioning.pipelineTitle")}</h3><ol className="mt-4 grid gap-3 sm:grid-cols-2">{stages.map((stage, index) => <li key={stage} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><span className={cn("grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold", index < 2 ? "bg-emerald-100 text-emerald-700" : index === 2 && sample ? "bg-amber-100 text-amber-700" : "bg-white text-slate-500")}>{index + 1}</span><span className="text-xs font-medium text-slate-700">{stage}</span></li>)}</ol></div></section><aside className={cn(cardClass, "h-fit p-5")}><div className="flex items-center gap-2"><ShieldCheck className="size-5 text-blue-600" /><h2 className="font-semibold">{t("master.ops.tenants.provisioning.guardrailsTitle")}</h2></div><div className="mt-4 space-y-3 text-xs leading-5 text-slate-600"><p className="rounded-xl bg-blue-50 p-3"><strong className="block text-blue-900">{t("master.ops.tenants.provisioning.guard1Title")}</strong>{t("master.ops.tenants.provisioning.guard1Desc")}</p><p className="rounded-xl bg-amber-50 p-3"><strong className="block text-amber-900">{t("master.ops.tenants.provisioning.guard2Title")}</strong>{t("master.ops.tenants.provisioning.guard2Desc")}</p><p className="rounded-xl bg-slate-50 p-3"><strong className="block text-slate-900">{t("master.ops.tenants.provisioning.guard3Title")}</strong>{t("master.ops.tenants.provisioning.guard3Desc")}</p></div></aside></div>;
}

function TenantDetailPanel({ tenant, detailLoading, onClose }: { tenant: TenantInfo; detailLoading: boolean; onClose: () => void }) {
  const t = useT();
  const locale = useLocale();
  const { data: contracts } = useQuery({
    queryKey: ["master", "contracts", tenant.id],
    queryFn: () => contractApi.getAll("ALL", tenant.id),
  });
  const { data: invoices } = useQuery({
    queryKey: ["master", "invoices", tenant.id],
    queryFn: () => billingApi.getAll("ALL", tenant.id),
  });

  return (
    <>
      <button type="button" className="fixed inset-0 z-40 bg-slate-950/20" onClick={onClose} aria-label={t("master.ops.tenants.detailPanel.closeBackdropAria")} />
      <aside role="dialog" aria-modal="true" aria-label={t("master.ops.tenants.detailPanel.dialogAria", { name: tenant.name })} className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{t("master.ops.tenants.detailPanel.eyebrow")}</p>
            <h2 className="mt-1 text-xl font-bold flex items-center gap-3">
              {tenant.name}
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", statusStyle(tenant.status))}>{tenant.status}</span>
            </h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-lg hover:bg-slate-100" aria-label={t("master.ops.tenants.detailPanel.closeAria")}><X className="size-5" /></button>
        </div>

        {detailLoading ? (
          <div className="grid min-h-48 place-items-center"><LoaderCircle className="size-6 animate-spin text-blue-600" /></div>
        ) : (
          <div className="mt-6 space-y-8">
            <section>
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 mb-4"><Building2 className="size-4 text-blue-600" /> {t("master.ops.tenants.detailPanel.profileTitle")}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500 block text-xs mb-1">{t("master.ops.tenants.detailPanel.fieldCode")}</span><strong className="font-mono font-medium">{tenant.code}</strong></div>
                <div><span className="text-slate-500 block text-xs mb-1">{t("master.ops.tenants.detailPanel.fieldLegalName")}</span><strong className="font-medium">{tenant.companyLegalName || "-"}</strong></div>
                <div><span className="text-slate-500 block text-xs mb-1">{t("master.ops.tenants.detailPanel.fieldTaxCode")}</span><strong className="font-mono font-medium">{tenant.taxCode || "-"}</strong></div>
                <div><span className="text-slate-500 block text-xs mb-1">{t("master.ops.tenants.detailPanel.fieldIndustry")}</span><strong className="font-medium">{tenant.industry || "-"}</strong></div>
                <div className="col-span-2"><span className="text-slate-500 block text-xs mb-1 flex items-center gap-1"><MapPin className="size-3" /> {t("master.ops.tenants.detailPanel.fieldAddress")}</span><strong className="font-medium">{tenant.address || "-"}</strong></div>
                <div><span className="text-slate-500 block text-xs mb-1 flex items-center gap-1"><Globe className="size-3" /> {t("master.ops.tenants.detailPanel.fieldWebsite")}</span><strong className="font-medium">{tenant.website || "-"}</strong></div>
                <div><span className="text-slate-500 block text-xs mb-1">{t("master.ops.tenants.detailPanel.fieldSize")}</span><strong className="font-medium">{tenant.companySize || "-"}</strong></div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-100 bg-slate-50/50 p-5">
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 mb-4"><UserRoundCog className="size-4 text-blue-600" /> {t("master.ops.tenants.detailPanel.contactTitle")}</h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div><span className="text-slate-500 block text-xs mb-1">{t("master.ops.tenants.detailPanel.fieldRepName")}</span><strong className="font-medium">{tenant.contactName || "-"}</strong></div>
                <div><span className="text-slate-500 block text-xs mb-1 flex items-center gap-1"><Phone className="size-3" /> {t("master.ops.tenants.detailPanel.fieldPhone")}</span><strong className="font-medium">{tenant.contactPhone || "-"}</strong></div>
                <div><span className="text-slate-500 block text-xs mb-1 flex items-center gap-1"><Mail className="size-3" /> {t("master.ops.tenants.detailPanel.fieldContactEmail")}</span><strong className="font-medium">{tenant.contactEmail || "-"}</strong></div>
                <div><span className="text-slate-500 block text-xs mb-1 flex items-center gap-1"><Mail className="size-3" /> {t("master.ops.tenants.detailPanel.fieldBillingEmail")}</span><strong className="font-medium">{tenant.billingEmail || "-"}</strong></div>
              </div>
            </section>

            <section>
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 mb-4"><ServerCog className="size-4 text-blue-600" /> {t("master.ops.tenants.detailPanel.systemTitle")}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500 block text-xs mb-1">{t("master.ops.tenants.detailPanel.fieldSubdomain")}</span><strong className="font-mono font-medium text-blue-600">{tenant.subdomain}.smarthire.top</strong></div>
                <div><span className="text-slate-500 block text-xs mb-1">{t("master.ops.tenants.detailPanel.fieldDbName")}</span><strong className="font-mono font-medium">{tenant.dbName}</strong></div>
                <div><span className="text-slate-500 block text-xs mb-1">{t("master.ops.tenants.detailPanel.fieldEnvironment")}</span><strong className="font-medium">{tenant.environmentType || "PRODUCTION"}</strong></div>
                <div><span className="text-slate-500 block text-xs mb-1">{t("master.ops.tenants.detailPanel.fieldManagedDb")}</span><strong className="font-medium">{tenant.managedDatabase ? t("master.ops.tenants.detailPanel.yes") : t("master.ops.tenants.detailPanel.no")}</strong></div>
                <div><span className="text-slate-500 block text-xs mb-1">{t("master.ops.tenants.detailPanel.fieldJoinedAt")}</span><strong className="font-medium">{formatDateTime(tenant.createdAt, undefined, locale)}</strong></div>
              </div>
            </section>

            <section>
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 mb-4"><FileSignature className="size-4 text-blue-600" /> {t("master.ops.tenants.detailPanel.contractsTitle", { count: contracts?.length || 0 })}</h3>
              {contracts && contracts.length > 0 ? (
                <div className="space-y-3">
                  {contracts.map(contract => (
                    <div key={contract.id} className="flex justify-between items-center rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
                      <div>
                        <div className="flex items-center gap-2"><strong className="text-sm font-semibold">{contract.title}</strong><span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">{contract.contractNumber}</span></div>
                        <p className="text-xs text-slate-500 mt-1">{formatDate(contract.startDate, undefined, locale)} - {formatDate(contract.endDate, undefined, locale)}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900">{formatNumber(contract.contractValue, undefined, locale)} {contract.currency}</div>
                        <div className="text-[10px] font-semibold mt-1 text-emerald-600 uppercase tracking-wider">{contract.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-500 italic">{t("master.ops.tenants.detailPanel.noContracts")}</p>}
            </section>

            <section>
              <h3 className="flex items-center gap-2 font-semibold text-slate-900 mb-4"><Receipt className="size-4 text-blue-600" /> {t("master.ops.tenants.detailPanel.invoicesTitle", { count: invoices?.length || 0 })}</h3>
              {invoices && invoices.length > 0 ? (
                <div className="space-y-3">
                  {invoices.map(invoice => (
                    <div key={invoice.id} className="flex justify-between items-center rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
                      <div>
                        <div className="flex items-center gap-2"><strong className="text-sm font-semibold">{invoice.planName || t("master.ops.tenants.detailPanel.defaultPlanName")}</strong><span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">{invoice.invoiceNumber}</span></div>
                        <p className="text-xs text-slate-500 mt-1">{invoice.dueDate ? t("master.ops.tenants.detailPanel.dueDatePrefix", { date: formatDate(invoice.dueDate, undefined, locale) }) : "-"}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900">{formatNumber(invoice.amount, undefined, locale)} {invoice.currency}</div>
                        <div className={cn("text-[10px] font-semibold mt-1 uppercase tracking-wider", invoice.status === "PAID" ? "text-emerald-600" : invoice.status === "OVERDUE" ? "text-rose-600" : "text-amber-600")}>{invoice.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-500 italic">{t("master.ops.tenants.detailPanel.noInvoices")}</p>}
            </section>
          </div>
        )}
        <div className="mt-8 rounded-xl bg-blue-50/50 p-4 text-xs leading-5 text-blue-900 flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-blue-700" />
          <p>{t("master.ops.tenants.detailPanel.securityBanner")}</p>
        </div>
      </aside>
    </>
  );
}

export function TenantManagementHub(props: Props) {
  const panels: Record<TenantHubTab, React.ReactNode> = {
    directory: (
      <DirectoryPanel
        tenants={props.tenants}
        onToggleStatus={props.onToggleStatus}
        onSoftDeleteTenant={props.onSoftDeleteTenant}
        onRestoreTenant={props.onRestoreTenant}
        onRetryProvisioning={props.onRetryProvisioning}
      />
    ),
    provisioning: (
      <ProvisioningPanel
        tenants={props.tenants}
        onRetryProvisioning={props.onRetryProvisioning}
      />
    ),
  };
  return <div className="space-y-6 animate-fade-in"><div>{panels[props.activeTab]}</div></div>;
}
