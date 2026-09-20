import React from "react";
import { Download, Activity, Cpu, CheckCircle2, Layers, ShieldCheck } from "lucide-react";
import { useMasterDashboard } from "../../context/MasterDashboardContext";

export function AnalyticsTab() {
  const { revenue, aiQuota, tenants, triggerNotification } = useMasterDashboard();

  const handleExportFinancial = () => {
    const csvContent =
      "data:text/csv;charset=utf-8,Tenant Code,Company Name,Database,Subdomain,Status\n" +
      tenants.map((t) => `${t.code},${t.name},${t.dbName},${t.subdomain}.smarthire.top,${t.status}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `smarthire_tenants_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerNotification("Đã xuất báo cáo danh sách Tenant dạng CSV thành công!");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Action & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Tổng Quan Doanh Thu & Tài Nguyên Nền Tảng
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Số liệu thời gian thực từ Master Database về doanh thu định kỳ và hạn ngạch AI toàn hệ thống.
          </p>
        </div>

        <button
          onClick={handleExportFinancial}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Xuất báo cáo tài chính (CSV)</span>
        </button>
      </div>

      {/* Metrics 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">
            Doanh thu hàng tháng (MRR)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-blue-600">
              ${revenue?.mrr.toLocaleString() || "0"}
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {revenue?.growthRate || "+0%"}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Tăng trưởng so với tháng trước</span>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">
            Doanh thu dự phóng năm (ARR)
          </span>
          <span className="text-3xl font-extrabold text-slate-900">
            ${revenue?.arr.toLocaleString() || "0"}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Hợp đồng B2B 12 tháng</span>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">
            Doanh nghiệp đang kích hoạt
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">
              {revenue?.activeTenants || 0}
            </span>
            <span className="text-xs font-semibold text-slate-500">Doanh nghiệp</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Mỗi công ty 1 Database riêng biệt</span>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">
            Độ sẵn sàng hệ thống (SLA)
          </span>
          <div className="flex items-center gap-2 mt-1">
            <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
            <span className="text-lg font-bold text-emerald-700">
              {aiQuota?.systemHealth || "Good"}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Tất cả cụm Cloud hoạt động bình thường</span>
        </div>
      </div>

      {/* AI Quotas Monitor & Plan Distribution */}
      <div className="grid lg:grid-cols-12 gap-8">
        {/* AI Quotas */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Giám Sát Tài Nguyên AI Toàn Sàn</h3>
                <p className="text-xs text-slate-500">Tiến độ tiêu thụ Quota sàng lọc CV & Phỏng vấn thoại tháng này.</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
              Realtime Workers
            </span>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="text-slate-700">Hạn ngạch Sàng lọc CV (Monthly Parsing)</span>
                <span className="text-blue-600 font-mono">
                  {aiQuota?.totalCvParsesUsed.toLocaleString() || 0} / {aiQuota?.totalCvParsesLimit.toLocaleString() || 0} CVs (
                  {Math.round(((aiQuota?.totalCvParsesUsed || 0) / (aiQuota?.totalCvParsesLimit || 1)) * 100)}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${((aiQuota?.totalCvParsesUsed || 0) / (aiQuota?.totalCvParsesLimit || 1)) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="text-slate-700">Hạn ngạch Phỏng vấn AI bằng Giọng nói (Voice Hours)</span>
                <span className="text-amber-600 font-mono">
                  {aiQuota?.totalVoiceHoursUsed || 0} / {aiQuota?.totalVoiceHoursLimit || 0} Giờ (
                  {Math.round(((aiQuota?.totalVoiceHoursUsed || 0) / (aiQuota?.totalVoiceHoursLimit || 1)) * 100)}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${((aiQuota?.totalVoiceHoursUsed || 0) / (aiQuota?.totalVoiceHoursLimit || 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Active AI Engines List */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700 block mb-3">
              Các mô hình AI đang vận hành trực tuyến:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {aiQuota?.activeModels?.map((model, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate font-medium">{model}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Plan Distribution & Recent Tenants */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Phân Bổ Gói Cước Doanh Nghiệp</h3>
                <p className="text-xs text-slate-500">Tỷ trọng các gói dịch vụ đang hoạt động.</p>
              </div>
            </div>

            <div className="space-y-4 my-6">
              {revenue?.planDistribution &&
                Object.entries(revenue.planDistribution).map(([name, count], i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-700">{name}</span>
                      <span className="font-mono text-slate-900">{count} Khách hàng</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          i === 0 ? "bg-blue-600" : i === 1 ? "bg-indigo-500" : "bg-sky-400"
                        }`}
                        style={{ width: `${(Number(count) / 18) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-slate-700">
            <div className="font-bold text-blue-900 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Cam kết hạ tầng Enterprise</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              100% doanh nghiệp được cung cấp Database riêng biệt và connection pool độc lập, đảm bảo an toàn dữ liệu mức tối cao.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
