import { Plus, Check, Sliders } from "lucide-react";
import { SubscriptionPlan, masterAdminApi } from "@/api/master/masterAdminApi";
import { useSubscriptions, masterQueryKeys } from "@/api/master/queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";
import { formatNumber, useLocale, useT } from "@/i18n";

interface SubscriptionsTabProps {
  setIsNewPlan: (val: boolean) => void;
  setPlanCode: (val: string) => void;
  setPlanName: (val: string) => void;
  setPlanDesc: (val: string) => void;
  setPriceYearly: (val: number) => void;
  setMaxJobs: (val: number) => void;
  setMaxCvParses: (val: number) => void;
  setMaxAiHours: (val: number) => void;
  setShowPlanModal: (plan: SubscriptionPlan | null) => void;
}

export function SubscriptionsTab(_props: SubscriptionsTabProps) {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { data: plans = [] } = useSubscriptions();
  const setPlans = (updater: any) => queryClient.setQueryData(masterQueryKeys.subscriptions(), updater);

  const handleTogglePlanStatus = async (plan: SubscriptionPlan) => {
    if (!plan.id) return;
    const nextStatus = plan.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const updated = await masterAdminApi.updateSubscriptionStatus(plan.id, nextStatus);
      setPlans(plans.map((p) => (p.id === updated.id ? updated : p)));
      toast.success(t("master.commerce.plansPage.statusChangedToast", { name: plan.name, status: nextStatus }));
    } catch {
      toast.error(t("master.commerce.plansPage.statusUpdateError"));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t("master.commerce.plansPage.title")}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t("master.commerce.plansPage.subtitle")}
          </p>
        </div>

        <button
          onClick={() => {
            window.location.href = "/admin/subscriptions/create";
          }}
          className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>{t("master.commerce.plansPage.createBtn")}</span>
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id || plan.code}
            className="p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:shadow-md transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    plan.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  }`}
                >
                  {plan.status}
                </span>
              </div>

              <p className="text-xs text-slate-500 mb-4 min-h-[32px]">{plan.description}</p>

              <div className="flex items-baseline gap-1 mb-6 pb-4 border-b border-slate-100">
                <span className="text-2xl font-extrabold text-blue-600">
                  {plan.priceYearly ? `${formatNumber(plan.priceYearly, undefined, locale)} ₫` : "0 ₫"}
                </span>
                <span className="text-xs text-slate-500">/ {t("master.commerce.common.yearUnit")}</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-600 mb-6 font-medium">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600" />
                  <span>
                    {t("master.commerce.plansPage.maxJobsPrefix")}{" "}
                    <strong>{t("master.commerce.plansPage.maxJobsValue", { count: plan.maxJobs })}</strong>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600" />
                  <span>
                    {t("master.commerce.plansPage.screenPrefix")}{" "}
                    <strong>{t("master.commerce.plansPage.screenValue", { count: formatNumber(plan.maxCvParses, undefined, locale) })}</strong> / {t("master.commerce.common.yearUnit")}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600" />
                  <span>
                    {plan.maxAiInterviewHours === null ? (
                      <strong>{t("master.commerce.plansPage.aiUnlimited")}</strong>
                    ) : plan.maxAiInterviewHours === 0 ? (
                      <span className="text-slate-400">{t("master.commerce.plansPage.aiNone")}</span>
                    ) : (
                      <>
                        <strong>{t("master.commerce.plansPage.aiHoursPrefix", { count: plan.maxAiInterviewHours })}</strong>{" "}
                        {t("master.commerce.plansPage.aiHoursSuffix")}
                      </>
                    )}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600" />
                  <span>
                    {plan.maxStorageGb === null ? (
                      <strong>{t("master.commerce.plansPage.storageUnlimited")}</strong>
                    ) : plan.maxStorageGb === 0 ? (
                      <span className="text-slate-400">{t("master.commerce.plansPage.storageNone")}</span>
                    ) : (
                      <>
                        <strong>{plan.maxStorageGb} GB</strong> {t("master.commerce.plansPage.storageSuffix")}
                      </>
                    )}
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  toast.info(t("master.commerce.plansPage.editInDevInfo"));
                }}
                className="flex-1 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                <span>{t("master.commerce.plansPage.editConfigBtn")}</span>
              </button>

              <button
                onClick={() => handleTogglePlanStatus(plan)}
                className={`px-3 py-2 rounded-lg font-semibold text-xs transition-colors ${
                  plan.status === "ACTIVE"
                    ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                    : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                }`}
              >
                {plan.status === "ACTIVE" ? t("master.commerce.plansPage.pauseBtn") : t("master.commerce.plansPage.activateBtn")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
