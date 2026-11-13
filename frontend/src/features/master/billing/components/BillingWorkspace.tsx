import { useMemo, useState } from "react";
import type {
  SubscriptionPlan,
  TenantInfo,
  TenantSubscriptionInstance,
} from "@/api/master/masterAdminApi";
import { cn } from "@/lib/utils";
import { HeaderActions } from "@/features/master/shell/HeaderActions";
import { Tooltip } from "@/components/ux/Tooltip";
import { CustomSelect } from "@/components/ux/CustomSelect";
import { toast } from "@/stores/toastStore";
import { formatNumber, useLocale, useT, type Locale } from "@/i18n";
import {
  Building2,
  Check,
  HelpCircle,
  Plus,
  Search,
  SlidersHorizontal,
  UserRoundCheck,
} from "lucide-react";

export type BillingView = "plans" | "allocations";

type BillingWorkspaceProps = {
  plans: SubscriptionPlan[];
  tenants: TenantInfo[];
  tenantSubscriptions?: TenantSubscriptionInstance[];
  view: BillingView;
  onViewChange: (view: BillingView) => void;
  onCreatePlan: () => void;
  onEditPlan: (plan: SubscriptionPlan) => void;
  onTogglePlanStatus: (plan: SubscriptionPlan) => void;
  onSubscriptionAssigned?: () => Promise<void> | void;
};

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

function HelpTip({ content, label }: { content: string; label: string }) {
  return (
    <Tooltip content={content} side="top">
      <button
        type="button"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
      >
        <HelpCircle className="size-3.5" aria-hidden="true" />
      </button>
    </Tooltip>
  );
}

const TENANT_STATUS_CLS: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  PENDING_PAYMENT: "bg-amber-50 text-amber-700",
  PROVISIONING: "bg-blue-50 text-blue-700",
  SUSPENDED: "bg-amber-50 text-amber-700",
  FAILED: "bg-rose-50 text-rose-700",
};

export function BillingWorkspace({
  plans,
  tenants,
  tenantSubscriptions = [],
  view,
  onViewChange,
  onCreatePlan,
  onEditPlan,
  onTogglePlanStatus,
  onSubscriptionAssigned,
}: BillingWorkspaceProps) {
  const t = useT();
  const locale = useLocale();
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

  const filteredTenants = useMemo(() => {
    const nonDeleted = tenants.filter((item) => !item.deleted);
    const query = allocationQuery.trim().toLowerCase();
    return query
      ? nonDeleted.filter((tenant) =>
          `${tenant.name} ${tenant.code} ${tenant.subdomain}`.toLowerCase().includes(query),
        )
      : nonDeleted;
  }, [allocationQuery, tenants]);

  return (
    <div className="space-y-6 animate-fade-in">
      <HeaderActions>
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
          ["plans", t("master.commerce.billingWorkspace.tabs.plans", { count: plans.length })],
          ["allocations", t("master.commerce.billingWorkspace.tabs.allocations")],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => onViewChange(id)} aria-current={view === id ? "page" : undefined} className={cn("min-h-9 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors", view === id ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>{label}</button>
        ))}
      </nav>

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
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-600">
                {t("master.commerce.billingWorkspace.allocations.title")}
              </h2>
              <HelpTip
                content={t("master.commerce.billingWorkspace.allocations.titleTooltip")}
                label={t("master.commerce.billingWorkspace.allocations.titleHelpLabel")}
              />
            </div>
            <label className="relative block w-full sm:max-w-xs">
              <span className="sr-only">{t("master.commerce.billingWorkspace.allocations.searchSrOnly")}</span>
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={allocationQuery}
                onChange={(event) => setAllocationQuery(event.target.value)}
                placeholder={t("master.commerce.billingWorkspace.allocations.searchPlaceholder")}
                className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-blue-100"
              />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-6 py-3">{t("master.commerce.billingWorkspace.allocations.colCompany")}</th>
                  <th className="px-6 py-3">
                    <span className="inline-flex items-center gap-1">
                      <span>{t("master.commerce.billingWorkspace.allocations.colStatus")}</span>
                      <HelpTip
                        content={t("master.commerce.billingWorkspace.allocations.colStatusTooltip")}
                        label={t("master.commerce.billingWorkspace.allocations.colStatusHelpLabel")}
                      />
                    </span>
                  </th>
                  <th className="px-6 py-3">
                    <span className="inline-flex items-center gap-1">
                      <span>{t("master.commerce.billingWorkspace.allocations.colCurrentPlan")}</span>
                      <HelpTip
                        content={t("master.commerce.billingWorkspace.allocations.colCurrentPlanTooltip")}
                        label={t("master.commerce.billingWorkspace.allocations.colCurrentPlanHelpLabel")}
                      />
                    </span>
                  </th>
                  <th className="px-6 py-3">
                    <span className="inline-flex items-center gap-1">
                      <span>{t("master.commerce.billingWorkspace.allocations.colCyclePrice")}</span>
                      <HelpTip
                        content={t("master.commerce.billingWorkspace.allocations.colCyclePriceTooltip")}
                        label={t("master.commerce.billingWorkspace.allocations.colCyclePriceHelpLabel")}
                      />
                    </span>
                  </th>
                  <th className="px-6 py-3 text-right">{t("master.commerce.billingWorkspace.allocations.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((tenant) => {
                  const subInstance = subscriptionByTenantId.get(tenant.id);
                  const resolvedPlan = subInstance ? planById.get(subInstance.planId) : undefined;
                  const currentPlanCode =
                    subInstance?.planCodeSnapshot ?? resolvedPlan?.code ?? plans[0]?.code ?? "";
                  const selectedCode = assignments[tenant.id] ?? currentPlanCode;
                  const contractedPrice =
                    subInstance?.contractedPriceYearly ?? resolvedPlan?.priceYearly ?? 0;
                  const tenantCls = TENANT_STATUS_CLS[tenant.status] ?? "bg-slate-100 text-slate-600";
                  const tenantLabel =
                    tenant.status in TENANT_STATUS_CLS
                      ? t(`master.commerce.billingWorkspace.allocations.tenantStatuses.${tenant.status}`)
                      : tenant.status;
                  const subKnown =
                    subInstance?.status === "ACTIVE" ||
                    subInstance?.status === "GRACE_PERIOD" ||
                    subInstance?.status === "PAST_DUE" ||
                    subInstance?.status === "EXPIRED" ||
                    subInstance?.status === "CANCELLED";
                  const availablePlans = plans
                    .filter(
                      (plan) =>
                        (plan.status === "ACTIVE" && !plan.archived) || plan.code === currentPlanCode,
                    )
                    .map((plan) => ({
                      value: plan.code,
                      label: `${plan.name} (v${plan.version ?? 1}${
                        plan.custom ? t("master.commerce.billingWorkspace.allocations.customSuffix") : ""
                      })`,
                    }));

                  return (
                    <tr key={tenant.id} className="border-t border-slate-100 hover:bg-blue-50/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-700">
                            <Building2 className="size-4" />
                          </span>
                          <span>
                            <strong className="block font-semibold text-slate-600">
                              {tenant.name}
                            </strong>
                            <small className="text-xs text-slate-500">
                              {tenant.code} · {tenant.subdomain}
                            </small>
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                              tenantCls,
                            )}
                          >
                            {tenantLabel}
                          </span>
                          {subInstance?.status && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                              {subKnown
                                ? t(`master.commerce.billingWorkspace.allocations.subStatuses.${subInstance.status}`)
                                : t("master.commerce.billingWorkspace.allocations.subPrefix", {
                                    status: subInstance.status,
                                  })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="min-w-52 max-w-64">
                          <CustomSelect
                            ariaLabel={t("master.commerce.billingWorkspace.allocations.selectAria", {
                              name: tenant.name,
                            })}
                            value={selectedCode}
                            onChange={(val) => {
                              setAssignments((current) => ({
                                ...current,
                                [tenant.id]: val,
                              }));
                              setSavedTenantId(null);
                            }}
                            options={availablePlans}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        <strong className="block font-semibold text-slate-600">
                          {formatVndCurrency(contractedPrice, locale)} / {t("master.commerce.common.yearUnit")}
                        </strong>
                        <span className="text-slate-500">
                          {t("master.commerce.billingWorkspace.allocations.yearlySnapshot")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const { masterAdminApi } = await import("@/api/master/masterAdminApi");
                              await masterAdminApi.assignTenantSubscription(tenant.id, {
                                planCode: selectedCode,
                                status: "ACTIVE",
                              });
                              setSavedTenantId(tenant.id);
                              await onSubscriptionAssigned?.();
                              toast.success(
                                t("master.commerce.billingWorkspace.allocations.assignedToast", {
                                  code: selectedCode,
                                  name: tenant.name,
                                }),
                              );
                            } catch {
                              toast.danger(
                                t("master.commerce.billingWorkspace.allocations.assignFailedToast"),
                              );
                            }
                          }}
                          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          {savedTenantId === tenant.id ? (
                            <>
                              <UserRoundCheck className="size-3.5" />
                              {t("master.commerce.billingWorkspace.allocations.savedSnapshot")}
                            </>
                          ) : (
                            t("master.commerce.billingWorkspace.allocations.saveChanges")
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredTenants.length === 0 && (
            <p className="p-10 text-center text-sm text-slate-500">
              {t("master.commerce.billingWorkspace.allocations.empty")}
            </p>
          )}
        </section>
      )}

    </div>
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
        <PlanFeature text={plan.maxJobs == null || plan.maxJobs < 0 ? t("master.commerce.billingWorkspace.planCard.unlimitedJobs") : plan.maxJobs === 0 ? t("master.commerce.billingWorkspace.planCard.noJobs") : t("master.commerce.billingWorkspace.planCard.limitedJobs", { count: formatNumber(plan.maxJobs, undefined, locale) })} />
        <PlanFeature text={plan.maxCvParses == null || plan.maxCvParses < 0 ? t("master.commerce.billingWorkspace.planCard.unlimitedCv") : plan.maxCvParses === 0 ? t("master.commerce.billingWorkspace.planCard.noCv") : t("master.commerce.billingWorkspace.planCard.limitedCv", { count: formatNumber(plan.maxCvParses, undefined, locale) })} />
        <PlanFeature text={plan.maxAiInterviewHours == null || plan.maxAiInterviewHours < 0 ? t("master.commerce.billingWorkspace.planCard.unlimitedAi") : plan.maxAiInterviewHours === 0 ? t("master.commerce.billingWorkspace.planCard.noAi") : t("master.commerce.billingWorkspace.planCard.limitedAi", { count: formatNumber(plan.maxAiInterviewHours, undefined, locale) })} />
        <PlanFeature text={plan.maxStorageGb == null || plan.maxStorageGb < 0 ? t("master.commerce.billingWorkspace.planCard.unlimitedStorage") : plan.maxStorageGb === 0 ? t("master.commerce.billingWorkspace.planCard.noStorage") : t("master.commerce.billingWorkspace.planCard.limitedStorage", { count: formatNumber(plan.maxStorageGb, undefined, locale) })} />
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
