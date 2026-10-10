import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { masterAdminApi, type SubscriptionPlan } from "@/api/master/masterAdminApi";
import { BillingWorkspace, type BillingView } from "../components/BillingWorkspace";
import { useTenants, useSubscriptions, useRevenueAnalytics, masterQueryKeys } from "@/api/master/queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";
import { X, Copy, GitBranch } from "lucide-react";

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
      triggerNotification(
        status === "ARCHIVED"
          ? `Đã lưu trữ gói ${plan.name} (Ngừng bán mới, bảo lưu giá cho khách cũ)`
          : `Đã mở bán lại gói ${plan.name}`
      );
    } catch {
      triggerNotification("Lỗi khi cập nhật trạng thái gói");
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
        triggerNotification(
          (editingPlan.subscriberCount ?? 0) > 0
            ? `Đã lưu trữ bản cũ v${editingPlan.version ?? 1} (Grandfathered) và phát hành phiên bản mới v${(editingPlan.version ?? 1) + 1}`
            : `Đã cập nhật gói ${name}`
        );
      } else {
        if (!targetTenantId) {
          triggerNotification("Vui lòng chọn doanh nghiệp (Tenant) để tạo gói Custom");
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
        triggerNotification("Đã nhân bản Gói Custom Enterprise riêng và kích hoạt Snapshot cho Tenant!");
      }
      setEditingPlan(null);
    } catch {
      triggerNotification("Đã xảy ra lỗi khi lưu thay đổi gói dịch vụ");
    } finally {
      setSaving(false);
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

      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Quản trị Gói Dịch Vụ: {editingPlan.name} (v{editingPlan.version ?? 1})
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                   Bảo vệ hợp đồng khách cũ (Grandfathering) hoặc nhân bản Gói Tùy Biến (Custom Plan) cho riêng 1 Doanh nghiệp.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
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
                <span>Cập nhật / Phát hành Version mới</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("CLONE_CUSTOM")}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-colors ${
                  mode === "CLONE_CUSTOM" ? "bg-white text-purple-700 shadow-xs" : "text-slate-600"
                }`}
              >
                <Copy className="size-3.5" />
                <span>Clone Gói Custom riêng cho 1 Tenant</span>
              </button>
            </div>

            {mode === "VERSION_UPDATE" && (editingPlan.subscriberCount ?? 0) > 0 && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <strong>Chính sách Bảo lưu giá (Grandfathering):</strong> Gói này đang có{" "}
                <strong>{editingPlan.subscriberCount}</strong> hợp đồng tham chiếu. Khi lưu, hệ thống sẽ giữ nguyên{" "}
                <strong>v{editingPlan.version ?? 1} (ARCHIVED)</strong> cho khách cũ và tự động tạo{" "}
                <strong>v{(editingPlan.version ?? 1) + 1} (ACTIVE)</strong> cho khách mua mới.
              </div>
            )}

            <form onSubmit={handleSaveModal} className="mt-4 space-y-4">
              {mode === "CLONE_CUSTOM" && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Doanh nghiệp nhận Gói Custom (Ẩn khỏi trang Pricing công khai) *
                  </label>
                  <select
                    required
                    value={targetTenantId}
                    onChange={(e) => setTargetTenantId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="">-- Chọn Doanh Nghiệp (Tenant) --</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Tên gói *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Giá theo năm (VNĐ) *</label>
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
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Max Jobs (-1 = Vô hạn)</label>
                  <input
                    type="number"
                    min={-1}
                    value={maxJobs}
                    onChange={(e) => setMaxJobs(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Max CV Parses</label>
                  <input
                    type="number"
                    min={-1}
                    value={maxCvParses}
                    onChange={(e) => setMaxCvParses(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Giờ AI Interview (Trống = Vô hạn)</label>
                  <input
                    type="number"
                    min={-1}
                    value={maxAiInterviewHours ?? ""}
                    onChange={(e) => setMaxAiInterviewHours(e.target.value === "" ? null : Number(e.target.value))}
                    placeholder="Không giới hạn"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Lưu trữ GB (Trống = Vô hạn)</label>
                  <input
                    type="number"
                    min={-1}
                    value={maxStorageGb ?? ""}
                    onChange={(e) => setMaxStorageGb(e.target.value === "" ? null : Number(e.target.value))}
                    placeholder="Không giới hạn"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Giờ Proctoring (Trống = Vô hạn)</label>
                  <input
                    type="number"
                    min={-1}
                    value={maxProctoringHours ?? ""}
                    onChange={(e) => setMaxProctoringHours(e.target.value === "" ? null : Number(e.target.value))}
                    placeholder="Không giới hạn"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Lưu Video (Ngày)</label>
                  <input
                    type="number"
                    min={-1}
                    value={videoRetentionDays ?? ""}
                    onChange={(e) => setVideoRetentionDays(e.target.value === "" ? null : Number(e.target.value))}
                    placeholder="Không giới hạn"
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
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving
                    ? "Đang xử lý..."
                    : mode === "VERSION_UPDATE"
                    ? (editingPlan.subscriberCount ?? 0) > 0
                      ? `Phát hành Version v${(editingPlan.version ?? 1) + 1}`
                      : "Lưu cập nhật"
                    : "Tạo & Kích hoạt Gói Custom"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
