import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Save, Box, Zap, Settings, HardDrive, Shield, Video } from "lucide-react";
import { useMasterDashboard } from "@/features/master/shell/MasterAdminContext";
import { masterAdminApi } from "@/api/master/masterAdminApi";

export function CreateSubscriptionPlanPage() {
  const navigate = useNavigate();
  const { setPlans, triggerNotification } = useMasterDashboard();

  const [planCode, setPlanCode] = useState("");
  const [planName, setPlanName] = useState("");
  const [planDesc, setPlanDesc] = useState("");
  const [priceMonthly, setPriceMonthly] = useState(0);
  const [priceYearly, setPriceYearly] = useState(0);
  const [maxJobs, setMaxJobs] = useState(5);
  const [maxCvParses, setMaxCvParses] = useState(100);

  // Checkboxes
  const [enableStorage, setEnableStorage] = useState(true);
  const [enableAi, setEnableAi] = useState(true);
  const [enableProctoring, setEnableProctoring] = useState(false);
  const [enableVideoRetention, setEnableVideoRetention] = useState(true);

  // Dropdown values (number | "")
  const [maxStorageGb, setMaxStorageGb] = useState<number | "">(5);
  const [maxAiHours, setMaxAiHours] = useState<number | "">(10);
  const [maxProctoringHours, setMaxProctoringHours] = useState<number | "">(10);
  const [videoRetentionDays, setVideoRetentionDays] = useState<number | "">(30);

  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code: planCode,
        name: planName,
        description: planDesc,
        priceMonthly,
        priceYearly,
        maxJobs,
        maxCvParses,
        maxStorageGb: enableStorage ? (maxStorageGb === "" ? null : maxStorageGb) : 0,
        maxAiInterviewHours: enableAi ? (maxAiHours === "" ? null : maxAiHours) : 0,
        maxProctoringHours: enableProctoring ? (maxProctoringHours === "" ? null : maxProctoringHours) : 0,
        videoRetentionDays: enableVideoRetention ? (videoRetentionDays === "" ? null : videoRetentionDays) : 0,
      };

      const res = await masterAdminApi.createSubscription(payload);
      setPlans((prev) => [res, ...prev]);
      triggerNotification("Đã lưu gói dịch vụ mới.");
      navigate("/admin/subscriptions/plans");
    } catch (error) {
      console.error(error);
      triggerNotification("Đã xảy ra lỗi khi lưu gói cước.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/subscriptions/plans")}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-indigo-600" />
              Tạo Gói Dịch Vụ Mới
            </h1>
            <p className="text-xs text-slate-500 mt-1">Cấu hình thông tin, giá cước và giới hạn tài nguyên (Quotas).</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Đang lưu...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Lưu Gói Cước</span>
            </>
          )}
        </button>
      </div>

      <form id="createPlanForm" onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1 */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="font-bold text-indigo-900 text-sm uppercase flex items-center gap-2">
            <Box className="w-5 h-5 text-indigo-600" />
            <span>1. Thông Tin Cơ Bản</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Mã Gói (Code) *</label>
              <input
                type="text"
                required
                value={planCode}
                onChange={(e) => setPlanCode(e.target.value.toUpperCase())}
                placeholder="VD: ENTERPRISE_PLUS"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Tên Gói Hiển Thị *</label>
              <input
                type="text"
                required
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="Gói Doanh Nghiệp Không Giới Hạn"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Mô Tả Gói</label>
            <input
              type="text"
              value={planDesc}
              onChange={(e) => setPlanDesc(e.target.value)}
              placeholder="Gói cao cấp dành cho tổ chức quy mô lớn..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-indigo-600"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Giá Trọn Gói / Tháng (USD) *</label>
              <input
                type="number"
                min={0}
                required
                value={priceMonthly}
                onChange={(e) => setPriceMonthly(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Giá Trọn Gói / Năm (USD) *</label>
              <input
                type="number"
                min={0}
                required
                value={priceYearly}
                onChange={(e) => setPriceYearly(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2 */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="font-bold text-indigo-900 text-sm uppercase flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <span>2. Giới Hạn Cốt Lõi (Core Quotas)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Số Lượng Tin Tuyển Dụng Tối Đa (Max Jobs) *</label>
              <input
                type="number"
                min={0}
                required
                value={maxJobs}
                onChange={(e) => setMaxJobs(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Số Lượng Lọc CV Bằng AI Tối Đa (Max CVs) *</label>
              <input
                type="number"
                min={0}
                required
                value={maxCvParses}
                onChange={(e) => setMaxCvParses(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3 */}
        <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200 space-y-5">
          <div className="font-bold text-slate-900 text-sm uppercase flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-600" />
            <span>3. Tùy Chọn Tính Năng Nâng Cao</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Storage */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableStorage}
                  onChange={(e) => setEnableStorage(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                />
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <HardDrive className="w-4 h-4 text-slate-500" />
                  Dung Lượng Lưu Trữ (GB)
                </div>
              </label>
              {enableStorage && (
                <div className="pl-8">
                  <select
                    value={maxStorageGb}
                    onChange={(e) => setMaxStorageGb(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
                  >
                    <option value={5}>5 GB</option>
                    <option value={10}>10 GB</option>
                    <option value={50}>50 GB</option>
                    <option value={100}>100 GB</option>
                    <option value={500}>500 GB</option>
                    <option value="">Không giới hạn (Unlimited)</option>
                  </select>
                </div>
              )}
              {!enableStorage && <p className="text-xs text-slate-500 pl-8">Không cấp phát lưu trữ.</p>}
            </div>

            {/* AI Interview */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableAi}
                  onChange={(e) => setEnableAi(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                />
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Zap className="w-4 h-4 text-slate-500" />
                  Giờ Phỏng Vấn AI (Hours)
                </div>
              </label>
              {enableAi && (
                <div className="pl-8">
                  <select
                    value={maxAiHours}
                    onChange={(e) => setMaxAiHours(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
                  >
                    <option value={5}>5 Giờ</option>
                    <option value={10}>10 Giờ</option>
                    <option value={20}>20 Giờ</option>
                    <option value={50}>50 Giờ</option>
                    <option value={100}>100 Giờ</option>
                    <option value="">Không giới hạn (Unlimited)</option>
                  </select>
                </div>
              )}
              {!enableAi && <p className="text-xs text-slate-500 pl-8">Không hỗ trợ AI Interview.</p>}
            </div>

            {/* Proctoring */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableProctoring}
                  onChange={(e) => setEnableProctoring(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                />
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Shield className="w-4 h-4 text-slate-500" />
                  Giờ Giám Sát Thi (Proctoring)
                </div>
              </label>
              {enableProctoring && (
                <div className="pl-8">
                  <select
                    value={maxProctoringHours}
                    onChange={(e) => setMaxProctoringHours(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
                  >
                    <option value={5}>5 Giờ</option>
                    <option value={10}>10 Giờ</option>
                    <option value={20}>20 Giờ</option>
                    <option value={50}>50 Giờ</option>
                    <option value={100}>100 Giờ</option>
                    <option value="">Không giới hạn (Unlimited)</option>
                  </select>
                </div>
              )}
              {!enableProctoring && <p className="text-xs text-slate-500 pl-8">Không hỗ trợ Proctoring.</p>}
            </div>

            {/* Video Retention */}
            <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableVideoRetention}
                  onChange={(e) => setEnableVideoRetention(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                />
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Video className="w-4 h-4 text-slate-500" />
                  Lưu Trữ Video (Ngày)
                </div>
              </label>
              {enableVideoRetention && (
                <div className="pl-8">
                  <select
                    value={videoRetentionDays}
                    onChange={(e) => setVideoRetentionDays(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
                  >
                    <option value={7}>7 Ngày</option>
                    <option value={14}>14 Ngày</option>
                    <option value={30}>30 Ngày</option>
                    <option value={90}>90 Ngày</option>
                    <option value={365}>1 Năm (365 Ngày)</option>
                    <option value="">Lưu vĩnh viễn (Unlimited)</option>
                  </select>
                </div>
              )}
              {!enableVideoRetention && <p className="text-xs text-slate-500 pl-8">Không lưu trữ Video.</p>}
            </div>

          </div>
        </div>

      </form>
    </div>
  );
}
