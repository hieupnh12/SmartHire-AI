import { Plus, Check, Sliders } from "lucide-react";
import { SubscriptionPlan, masterAdminApi } from "@/api/master/masterAdminApi";
import { useMasterDashboard } from "@/features/master/shell/MasterAdminContext";

interface SubscriptionsTabProps {
  setIsNewPlan: (val: boolean) => void;
  setPlanCode: (val: string) => void;
  setPlanName: (val: string) => void;
  setPlanDesc: (val: string) => void;
  setPriceMonthly: (val: number) => void;
  setPriceYearly: (val: number) => void;
  setMaxJobs: (val: number) => void;
  setMaxCvParses: (val: number) => void;
  setMaxAiHours: (val: number) => void;
  setShowPlanModal: (plan: SubscriptionPlan | null) => void;
}

export function SubscriptionsTab(_props: SubscriptionsTabProps) {
  const { plans, setPlans, triggerNotification } = useMasterDashboard();

  const handleTogglePlanStatus = async (plan: SubscriptionPlan) => {
    if (!plan.id) return;
    const nextStatus = plan.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const updated = await masterAdminApi.updateSubscriptionStatus(plan.id, nextStatus);
      setPlans(plans.map((p) => (p.id === updated.id ? updated : p)));
      triggerNotification(`Gói cước ${plan.name} đã chuyển sang ${nextStatus}`);
    } catch (err) {
      alert("Đã xảy ra lỗi khi cập nhật trạng thái gói cước.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Quản Lý Gói Dịch Vụ SaaS (Subscriptions)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Định nghĩa các gói cước, thiết lập hạn mức tuyển dụng và giá thuê phần mềm định kỳ.
          </p>
        </div>

        <button
          onClick={() => {
            window.location.href = "/admin/subscriptions/create";
          }}
          className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Gói Dịch Vụ Mới</span>
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
                <span className="text-3xl font-extrabold text-blue-600">${plan.priceMonthly}</span>
                <span className="text-xs text-slate-500">/tháng (${plan.priceYearly}/năm)</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-600 mb-6 font-medium">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600" />
                  <span>
                    Tối đa <strong>{plan.maxJobs} Vị trí tuyển dụng</strong>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600" />
                  <span>
                    Sàng lọc <strong>{plan.maxCvParses.toLocaleString()} CVs</strong> / tháng
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600" />
                  <span>
                    {plan.maxAiInterviewHours === null ? (
                      <strong>Phỏng vấn AI Voice Không Giới Hạn</strong>
                    ) : plan.maxAiInterviewHours === 0 ? (
                      <span className="text-slate-400">Không hỗ trợ Phỏng vấn AI</span>
                    ) : (
                      <>
                        <strong>{plan.maxAiInterviewHours} Giờ</strong> Phỏng vấn AI Voice
                      </>
                    )}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600" />
                  <span>
                    {plan.maxStorageGb === null ? (
                      <strong>Lưu trữ Không Giới Hạn</strong>
                    ) : plan.maxStorageGb === 0 ? (
                      <span className="text-slate-400">Không cấp phát lưu trữ</span>
                    ) : (
                      <>
                        <strong>{plan.maxStorageGb} GB</strong> Lưu trữ dữ liệu
                      </>
                    )}
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  alert("Tính năng sửa đang được phát triển, vui lòng sử dụng chức năng thêm mới.");
                }}
                className="flex-1 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                <span>Sửa cấu hình</span>
              </button>

              <button
                onClick={() => handleTogglePlanStatus(plan)}
                className={`px-3 py-2 rounded-lg font-semibold text-xs transition-colors ${
                  plan.status === "ACTIVE"
                    ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                    : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                }`}
              >
                {plan.status === "ACTIVE" ? "Tạm ngưng" : "Kích hoạt"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
