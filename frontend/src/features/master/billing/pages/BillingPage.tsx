import { useLocation, useNavigate } from "react-router-dom";
import { masterAdminApi, type SubscriptionPlan } from "@/api/master/masterAdminApi";
import { BillingWorkspace, type BillingView } from "../components/BillingWorkspace";
import { useTenants, useSubscriptions, useRevenueAnalytics, useAiQuotaUsage, useAuditLogs, useLeads, useInvoices, useContracts, masterQueryKeys } from "@/api/master/queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";
function currentView(pathname: string): BillingView {
  const value = pathname.split("/")[3];
  return value === "plans" || value === "allocations" || value === "invoices" ? value : "overview";
}

export function BillingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: tenants = [] } = useTenants();
  const { data: plans = [] } = useSubscriptions();
  const { data: revenue } = useRevenueAnalytics();
  const setPlans = (updater: any) => queryClient.setQueryData(masterQueryKeys.subscriptions(), updater);
  const triggerNotification = (msg: string) => toast.success(msg);

  // Removed modal states

  const togglePlan = async (plan: SubscriptionPlan) => {
    if (!plan.id) return;
    const status = plan.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const updated = await masterAdminApi.updateSubscriptionStatus(plan.id, status);
      setPlans((items) => items.map((item) => item.id === updated.id ? updated : item));
      triggerNotification(`Đã cập nhật trạng thái gói ${plan.name}`);
    } catch (e) {
      triggerNotification("Lỗi khi cập nhật trạng thái gói");
    }
  };

  const handleCreateOrEditPlan = (plan?: SubscriptionPlan) => {
    if (plan && plan.id) {
      triggerNotification("Tính năng chỉnh sửa đang được phát triển.");
    } else {
      navigate("/admin/subscriptions/create");
    }
  };

  return (
    <>
      <BillingWorkspace
        plans={plans}
        tenants={tenants}
        view={currentView(location.pathname)}
        onViewChange={(view) => navigate(`/admin/subscriptions/${view}`)}
        monthlyRevenue={revenue?.mrr ?? 0}
        activeTenants={revenue?.activeTenants ?? tenants.filter((tenant) => tenant.status === "ACTIVE").length}
        onCreatePlan={() => handleCreateOrEditPlan()}
        onEditPlan={(plan) => handleCreateOrEditPlan(plan)}
        onTogglePlanStatus={togglePlan}
      />
    </>
  );
}
