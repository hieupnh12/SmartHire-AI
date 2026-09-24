import React, { useState } from "react";
import { X, PhoneCall, FileText, Loader2, Send, CheckCircle2 } from "lucide-react";
import { consultationApi } from "@/api/master/consultationApi";
import { useLandingModal } from "../../context/LandingModalContext";

interface DemoRequestForm {
  companyName: string;
  contactName: string;
  jobTitle: string;
  workEmail: string;
  phoneNumber: string;
  companySize: string;
  primaryNeed: string;
  notes: string;
}

const BLOCKED_PERSONAL_DOMAINS = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com",
  "icloud.com", "mail.com", "zoho.com", "proton.me", "protonmail.com", "yandex.com"
];

const isPersonalEmail = (email: string) => {
  const domain = email.trim().toLowerCase().split("@")[1];
  return domain ? BLOCKED_PERSONAL_DOMAINS.includes(domain) : false;
};

export function DemoModal() {
  const { showDemoModal, closeDemoModal, selectedTier, requestType, openDemoModal } = useLandingModal();

  const [formData, setFormData] = useState<DemoRequestForm>({
    companyName: "",
    contactName: "",
    jobTitle: "",
    workEmail: "",
    phoneNumber: "",
    companySize: "100-500",
    primaryNeed: "Tự động hóa sàng lọc CV và phỏng vấn sơ loại AI",
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  if (!showDemoModal) return null;

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (isPersonalEmail(formData.workEmail)) {
      setSubmitError(
        "Vui lòng sử dụng Email Doanh nghiệp (domain công ty riêng, ví dụ: name@company.com) để được xếp lịch thẩm định & demo 1:1 nhanh nhất."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await consultationApi.submit({
        companyName: formData.companyName,
        contactName: formData.contactName,
        jobTitle: formData.jobTitle,
        workEmail: formData.workEmail,
        phoneNumber: formData.phoneNumber,
        companySize: formData.companySize,
        requestType: requestType,
        planTier: selectedTier,
        primaryNeed: formData.primaryNeed,
        notes: formData.notes,
      });
      setDemoSubmitted(true);
    } catch (err: any) {
      if (err?.response?.data?.errors && typeof err.response.data.errors === "object") {
        const firstErrMsg = Object.values(err.response.data.errors)[0] as string;
        setSubmitError(firstErrMsg || err.response.data.message || "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.");
      } else if (err?.response?.data?.message) {
        setSubmitError(err.response.data.message);
      } else if (err?.message === "Network Error" || !err?.response) {
        setSubmitError("Không thể kết nối đến máy chủ Backend (Port 8080). Vui lòng đảm bảo dịch vụ Backend đang chạy.");
      } else {
        setSubmitError("Không thể gửi yêu cầu lúc này. Vui lòng thử lại hoặc gửi email tới contact@smarthire.top");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setDemoSubmitted(false);
    setSubmitError(null);
    closeDemoModal();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-lg w-full text-left shadow-2xl relative my-8">
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"
          aria-label="Đóng cửa sổ"
        >
          <X className="w-5 h-5" />
        </button>

        {!demoSubmitted ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold">
                {requestType === "DEMO" ? <PhoneCall className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {requestType === "DEMO" ? "Đăng Ký Trải Nghiệm Demo 1:1" : "Tư Vấn Báo Giá & Hợp Đồng"}
                </h3>
                <span className="text-xs font-medium text-blue-600">{selectedTier}</span>
              </div>
            </div>

            {/* Switch between Demo and Contract quote */}
            <div className="flex rounded-lg bg-slate-100 p-1 mb-5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => openDemoModal(selectedTier, "DEMO")}
                className={`flex-1 py-1.5 rounded-md transition-all ${
                  requestType === "DEMO" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Đặt Lịch Demo 1:1
              </button>
              <button
                type="button"
                onClick={() => openDemoModal(selectedTier, "CONTRACT_QUOTE")}
                className={`flex-1 py-1.5 rounded-md transition-all ${
                  requestType === "CONTRACT_QUOTE"
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Báo Giá & Hợp Đồng Enterprise
              </button>
            </div>

            {submitError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                {submitError}
              </div>
            )}

            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              {requestType === "DEMO"
                ? "Chuyên viên giải pháp của SmartHire-AI sẽ liên hệ trong 2 giờ làm việc để chuẩn bị nội dung demo phù hợp với doanh nghiệp của bạn."
                : "Đội ngũ chuyên trách Enterprise sẽ liên hệ để trao đổi chi tiết bảng giá, thỏa thuận SLA và quy trình ký kết hợp đồng."}
            </p>

            <form onSubmit={handleDemoSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  Tên Doanh Nghiệp / Tổ Chức <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tập đoàn Công nghệ VNP..."
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1">
                    Họ và Tên Người Liên Hệ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1">
                    Chức Vụ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Trưởng phòng Tuyển dụng / HRD..."
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1">
                    Email Doanh Nghiệp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={formData.workEmail}
                    onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border text-sm text-slate-900 focus:bg-white focus:outline-none transition-colors ${
                      isPersonalEmail(formData.workEmail)
                        ? "border-amber-500 focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
                        : "border-slate-300 focus:border-blue-600"
                    }`}
                  />
                  {isPersonalEmail(formData.workEmail) && (
                    <span className="text-[11px] text-amber-600 mt-1 block">
                      * Yêu cầu email công ty (domain riêng, không dùng @gmail/@yahoo)
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-900 mb-1">
                    Số Điện Thoại Liên Hệ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0912 345 678"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  Quy Mô Nhân Sự Doanh Nghiệp
                </label>
                <select
                  value={formData.companySize}
                  onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none transition-colors"
                >
                  <option value="50-100">Dưới 100 nhân sự</option>
                  <option value="100-500">100 - 500 nhân sự</option>
                  <option value="500-2000">500 - 2,000 nhân sự</option>
                  <option value="2000+">Trên 2,000 nhân sự</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  Nhu Cầu hoặc Ghi Chú Cụ Thể (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Mong muốn tích hợp đánh giá code tự động và phỏng vấn AI cho khối IT..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang gửi thông tin...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{requestType === "DEMO" ? "Gửi Yêu Cầu Đặt Lịch Demo" : "Gửi Yêu Cầu Báo Giá & Ký Hợp Đồng"}</span>
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-6 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Đã Tiếp Nhận Thông Tin!</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Cảm ơn Quý doanh nghiệp <strong>{formData.companyName}</strong>. Chuyên viên giải pháp của SmartHire-AI sẽ liên hệ trực tiếp qua email <strong>{formData.workEmail}</strong> và số điện thoại <strong>{formData.phoneNumber}</strong> trong vòng 2 giờ làm việc.
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Đóng Cửa Sổ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
