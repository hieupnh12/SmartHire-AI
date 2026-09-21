import React from "react";
import { X, CreditCard } from "lucide-react";
import { SubscriptionPlan } from "@/api/master/masterAdminApi";

interface SubscriptionPlanModalProps {
  showPlanModal: SubscriptionPlan | null;
  setShowPlanModal: (plan: SubscriptionPlan | null) => void;
  isNewPlan: boolean;
  planCode: string;
  setPlanCode: (val: string) => void;
  planName: string;
  setPlanName: (val: string) => void;
  planDesc: string;
  setPlanDesc: (val: string) => void;
  priceMonthly: number;
  setPriceMonthly: (val: number) => void;
  priceYearly: number;
  setPriceYearly: (val: number) => void;
  maxJobs: number;
  setMaxJobs: (val: number) => void;
  maxCvParses: number;
  setMaxCvParses: (val: number) => void;
  maxAiHours: number;
  setMaxAiHours: (val: number) => void;
  handleSavePlanSubmit: (e: React.FormEvent) => void;
}

export function SubscriptionPlanModal({
  showPlanModal,
  setShowPlanModal,
  isNewPlan,
  planCode,
  setPlanCode,
  planName,
  setPlanName,
  planDesc,
  setPlanDesc,
  priceMonthly,
  setPriceMonthly,
  priceYearly,
  setPriceYearly,
  maxJobs,
  setMaxJobs,
  maxCvParses,
  setMaxCvParses,
  maxAiHours,
  setMaxAiHours,
  handleSavePlanSubmit,
}: SubscriptionPlanModalProps) {
  if (!showPlanModal) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-fade-in">
        <button
          onClick={() => setShowPlanModal(null)}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-200">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {isNewPlan ? "Tạo Gói SaaS Mới" : "Cập Nhật Gói SaaS"}
            </h3>
            <p className="text-xs text-slate-500">Cấu hình giá cước và hạn ngạch tài nguyên.</p>
          </div>
        </div>

        <form onSubmit={handleSavePlanSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Mã Gói (Code)</label>
            <input
              type="text"
              required
              disabled={!isNewPlan}
              placeholder="VD: ENTERPRISE_PLUS"
              value={planCode}
              onChange={(e) => setPlanCode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tên Hiển Thị Gói</label>
            <input
              type="text"
              required
              placeholder="Gói Doanh Nghiệp Tùy Biến"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Mô Tả Gói</label>
            <input
              type="text"
              placeholder="Tối ưu cho doanh nghiệp trên 500 nhân sự"
              value={planDesc}
              onChange={(e) => setPlanDesc(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Giá Tháng ($)</label>
              <input
                type="number"
                value={priceMonthly}
                onChange={(e) => setPriceMonthly(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Giá Năm ($)</label>
              <input
                type="number"
                value={priceYearly}
                onChange={(e) => setPriceYearly(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Max Jobs</label>
              <input
                type="number"
                value={maxJobs}
                onChange={(e) => setMaxJobs(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Max CVs</label>
              <input
                type="number"
                value={maxCvParses}
                onChange={(e) => setMaxCvParses(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Max Voice (hrs)</label>
              <input
                type="number"
                value={maxAiHours}
                onChange={(e) => setMaxAiHours(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="pt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setShowPlanModal(null)}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-semibold"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
            >
              Lưu Gói SaaS
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
