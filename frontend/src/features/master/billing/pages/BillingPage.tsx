import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { masterAdminApi, type SubscriptionPlan } from "@/api/master/masterAdminApi";
import { BillingWorkspace, type BillingView } from "../components/BillingWorkspace";
import {
  useTenants,
  useSubscriptions,
  useTenantSubscriptionInstances,
  masterQueryKeys,
} from "@/api/master/queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";
import { useT } from "@/i18n";
import { X, Copy, GitBranch } from "lucide-react";

function currentView(pathname: string): BillingView {
  const value = pathname.split("/")[3];
  return value === "allocations" ? "allocations" : "plans";
}

export function BillingPage() {
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: tenants = [] } = useTenants();
  const { data: plans = [] } = useSubscriptions();
  const { data: tenantSubscriptions = [] } = useTenantSubscriptionInstances();
  const setPlans = (updater: any) => queryClient.setQueryData(masterQueryKeys.subscriptions(), updater);

  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [mode, setMode] = useState<"VERSION_UPDATE" | "CLONE_CUSTOM">("VERSION_UPDATE");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceYearly, setPriceYearly] = useState(0);
  const [maxJobs, setMaxJobs] = useState(5);
  const [maxCvParses, setMaxCvParses] = useState(200);
  const [maxAiInterviewHours, setMaxAiInterviewHours] = useState<number | null>(5);
  const [maxStorageGb, setMaxStorageGb] = useState<number | null>(5);
  const [maxProctoringHours, setMaxProctoringHours] = useState<number | null>(0);
  const [videoRetentionDays, setVideoRetentionDays] = useState<number | null>(30);
  const [targetTenantId, setTargetTenantId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  const togglePlan = async (plan: SubscriptionPlan) => {
    if (!plan.id) return;
    const status = plan.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
    try {
      const updated = await masterAdminApi.updateSubscriptionStatus(plan.id, status);
      setPlans((items: SubscriptionPlan[]) => items.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(
        status === "ARCHIVED"
          ? t("master.commerce.billingPage.archivedToast", { name: plan.name })
          : t("master.commerce.billingPage.reactivatedToast", { name: plan.name }),
      );
    } catch {
      toast.error(t("master.commerce.billingPage.statusUpdateError"));
    }
  };

  const handleCreateOrEditPlan = (plan?: SubscriptionPlan) => {
    if (plan && plan.id) {
      setEditingPlan(plan);
      setMode("VERSION_UPDATE");
      setName(plan.name);
      setDescription(plan.description || "");
      setPriceYearly(plan.priceYearly || 0);
      setMaxJobs(plan.maxJobs ?? 5);
      setMaxCvParses(plan.maxCvParses ?? 200);
      setMaxAiInterviewHours(plan.maxAiInterviewHours ?? null);
      setMaxStorageGb(plan.maxStorageGb ?? null);
      setMaxProctoringHours(plan.maxProctoringHours ?? null);
      setVideoRetentionDays(plan.videoRetentionDays ?? null);
      setTargetTenantId(tenants[0]?.id ?? "");
    } else {
      navigate("/admin/subscriptions/create");
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan?.id) return;
    setSaving(true);
    try {
      if (mode === "VERSION_UPDATE") {
        await masterAdminApi.updateSubscription(editingPlan.id, {
          name,
          description,
          priceYearly,
          maxJobs,
          maxCvParses,
          maxAiInterviewHours,
          maxStorageGb,
          maxProctoringHours,
          videoRetentionDays,
        });
        await queryClient.invalidateQueries({ queryKey: masterQueryKeys.subscriptions() });
        toast.success(
          (editingPlan.subscriberCount ?? 0) > 0
            ? t("master.commerce.billingPage.versionCreatedToast", {
                oldVersion: editingPlan.version ?? 1,
                newVersion: (editingPlan.version ?? 1) + 1,
              })
            : t("master.commerce.billingPage.planUpdatedToast", { name }),
        );
      } else {
        if (!targetTenantId) {
          toast.warning(t("master.commerce.billingPage.selectTenantWarning"));
          setSaving(false);
          return;
        }
        await masterAdminApi.cloneCustomPlan(editingPlan.id, {
          targetTenantId: Number(targetTenantId),
          name,
          priceYearly,
          maxJobs,
          maxCvParses,
          maxAiInterviewHours,
          maxStorageGb,
          maxProctoringHours,
          videoRetentionDays,
          activateImmediately: true,
        });
        await queryClient.invalidateQueries({ queryKey: masterQueryKeys.subscriptions() });
        await queryClient.invalidateQueries({ queryKey: masterQueryKeys.tenantSubscriptionInstances() });
        toast.success(t("master.commerce.billingPage.clonedToast"));
      }
      setEditingPlan(null);
    } catch {
      toast.error(t("master.commerce.billingPage.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <BillingWorkspace
        plans={plans}
        tenants={tenants}
        tenantSubscriptions={tenantSubscriptions}
        view={currentView(location.pathname)}
        onViewChange={(view) => navigate(`/admin/subscriptions/${view}`)}
        onCreatePlan={() => handleCreateOrEditPlan()}
        onEditPlan={(plan) => handleCreateOrEditPlan(plan)}
        onTogglePlanStatus={togglePlan}
        onSubscriptionAssigned={async () => {
          await queryClient.invalidateQueries({ queryKey: masterQueryKeys.tenantSubscriptionInstances() });
          await queryClient.invalidateQueries({ queryKey: masterQueryKeys.subscriptions() });
          await queryClient.invalidateQueries({ queryKey: masterQueryKeys.all });
        }}
      />

      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {t("master.commerce.billingPage.modalTitle", {
                    name: editingPlan.name,
                    version: editingPlan.version ?? 1,
                  })}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {t("master.commerce.billingPage.modalSubtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                aria-label={t("master.commerce.common.close")}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setMode("VERSION_UPDATE")}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-colors ${
                  mode === "VERSION_UPDATE" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600"
                }`}
              >
                <GitBranch className="size-3.5" />
                <span>{t("master.commerce.billingPage.modeVersionUpdate")}</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("CLONE_CUSTOM")}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-colors ${
                  mode === "CLONE_CUSTOM" ? "bg-white text-purple-700 shadow-xs" : "text-slate-600"
                }`}
              >
                <Copy className="size-3.5" />
                <span>{t("master.commerce.billingPage.modeCloneCustom")}</span>
              </button>
            </div>

            {mode === "VERSION_UPDATE" && (editingPlan.subscriberCount ?? 0) > 0 && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <strong>{t("master.commerce.billingPage.grandfatherTitle")}</strong>{" "}
                {t("master.commerce.billingPage.grandfatherPart1")}{" "}
                <strong>{editingPlan.subscriberCount}</strong>{" "}
                {t("master.commerce.billingPage.grandfatherPart2")}{" "}
                <strong>{t("master.commerce.billingPage.grandfatherOldTag", { version: editingPlan.version ?? 1 })}</strong>{" "}
                {t("master.commerce.billingPage.grandfatherPart3")}{" "}
                <strong>{t("master.commerce.billingPage.grandfatherNewTag", { version: (editingPlan.version ?? 1) + 1 })}</strong>{" "}
                {t("master.commerce.billingPage.grandfatherPart4")}
              </div>
            )}

            <form onSubmit={handleSaveModal} className="mt-4 space-y-4">
              {mode === "CLONE_CUSTOM" && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    {t("master.commerce.billingPage.targetTenantLabel")}
                  </label>
                  <select
                    required
                    value={targetTenantId}
                    onChange={(e) => setTargetTenantId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="">{t("master.commerce.billingPage.targetTenantPlaceholder")}</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name} ({tenant.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">{t("master.commerce.billingPage.planNameLabel")}</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">{t("master.commerce.billingPage.priceYearlyLabel")}</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={priceYearly}
                    onChange={(e) => setPriceYearly(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">{t("master.commerce.billingPage.maxJobsLabel")}</label>
                  <input
                    type="number"
                    min={-1}
                    value={maxJobs}
                    onChange={(e) => setMaxJobs(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">{t("master.commerce.billingPage.maxCvLabel")}</label>
                  <input
                    type="number"
                    min={-1}
                    value={maxCvParses}
                    onChange={(e) => setMaxCvParses(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">{t("master.commerce.billingPage.maxAiLabel")}</label>
                  <input
                    type="number"
                    min={-1}
                    value={maxAiInterviewHours ?? ""}
                    onChange={(e) => setMaxAiInterviewHours(e.target.value === "" ? null : Number(e.target.value))}
                    placeholder={t("master.commerce.common.unlimited")}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">{t("master.commerce.billingPage.maxStorageLabel")}</label>
                  <input
                    type="number"
                    min={-1}
                    value={maxStorageGb ?? ""}
                    onChange={(e) => setMaxStorageGb(e.target.value === "" ? null : Number(e.target.value))}
                    placeholder={t("master.commerce.common.unlimited")}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">{t("master.commerce.billingPage.maxProctoringLabel")}</label>
                  <input
                    type="number"
                    min={-1}
                    value={maxProctoringHours ?? ""}
                    onChange={(e) => setMaxProctoringHours(e.target.value === "" ? null : Number(e.target.value))}
                    placeholder={t("master.commerce.common.unlimited")}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">{t("master.commerce.billingPage.videoRetentionLabel")}</label>
                  <input
                    type="number"
                    min={-1}
                    value={videoRetentionDays ?? ""}
                    onChange={(e) => setVideoRetentionDays(e.target.value === "" ? null : Number(e.target.value))}
                    placeholder={t("master.commerce.common.unlimited")}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t("master.commerce.common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving
                    ? t("master.commerce.common.processing")
                    : mode === "VERSION_UPDATE"
                    ? (editingPlan.subscriberCount ?? 0) > 0
                      ? t("master.commerce.billingPage.publishVersionBtn", { version: (editingPlan.version ?? 1) + 1 })
                      : t("master.commerce.billingPage.saveUpdateBtn")
                    : t("master.commerce.billingPage.createCustomBtn")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
