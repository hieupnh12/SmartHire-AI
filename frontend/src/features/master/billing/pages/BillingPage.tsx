import { useLocation, useNavigate } from "react-router-dom";
import { masterAdminApi, type SubscriptionPlan } from "@/api/master/masterAdminApi";
import { BillingWorkspace, type BillingView } from "../components/BillingWorkspace";
import { useMasterDashboard } from "@/features/master/shell/MasterAdminContext";

function currentView(pathname: string): BillingView {
  const value = pathname.split("/")[3];
  return value === "plans" || value === "allocations" || value === "invoices" ? value : "overview";
}

export function BillingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { plans, setPlans, tenants, revenue, triggerNotification } = useMasterDashboard();

  const togglePlan = async (plan: SubscriptionPlan) => {
    if (!plan.id) return;
    const status = plan.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const updated = await masterAdminApi.updateSubscriptionStatus(plan.id, status);
    setPlans((items) => items.map((item) => item.id === updated.id ? updated : item));
    triggerNotification(`Đã cập nhật trạng thái gói ${plan.name}`);
  };

  return (
    <BillingWorkspace
      plans={plans}
      tenants={tenants}
      view={currentView(location.pathname)}
      onViewChange={(view) => navigate(`/admin/subscriptions/${view}`)}
      monthlyRevenue={revenue?.mrr ?? 0}
      activeTenants={revenue?.activeTenants ?? tenants.filter((tenant) => tenant.status === "ACTIVE").length}
      onCreatePlan={() => navigate("/admin/subscriptions/plans")}
      onEditPlan={() => navigate("/admin/subscriptions/plans")}
      onTogglePlanStatus={togglePlan}
    />
  );
}
