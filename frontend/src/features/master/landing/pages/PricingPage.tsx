import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ChevronRight,
  X
} from "lucide-react";
import { useLandingModal } from "../context/LandingModalContext";
import { checkoutApi, PublicSubscriptionPlan } from "@/api/master/checkoutApi";

export function PricingPage() {
  const navigate = useNavigate();
  const { openDemoModal } = useLandingModal();
  const [plans, setPlans] = useState<PublicSubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkoutApi.getPublicPlans()
      .then(data => {
        const standardPlans = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
        let fetchedPlans = data
          .filter(p => p.status === "ACTIVE" && standardPlans.includes(p.code))
          .sort((a, b) => a.priceMonthlyVnd - b.priceMonthlyVnd);
          
        if (fetchedPlans.length === 0) {
           fetchedPlans = data.filter(p => p.status === "ACTIVE" && p.priceMonthlyVnd > 0)
              .sort((a, b) => a.priceMonthlyVnd - b.priceMonthlyVnd)
              .slice(0, 3);
        }
        setPlans(fetchedPlans);
      })
      .catch(err => console.error("Failed to fetch plans", err))
      .finally(() => setLoading(false));
  }, []);

  const getPlanValue = (index: number, field: keyof PublicSubscriptionPlan, defaultValue: string, formatSuffix = "") => {
    const plan = plans[index];
    if (!plan) return defaultValue;
    const value = plan[field];
    if (typeof value === "number") {
      if (value <= 0) return "Không giới hạn";
      return `${value.toLocaleString()}${formatSuffix}`;
    }
    return defaultValue;
  };

  const featureMatrix = [
    {
      category: "Sàng Lọc & Phân Tích Hồ Sơ (CV Screening)",
      features: [
        { name: "Số lượng CV sàng lọc AI hàng tháng", starter: getPlanValue(0, "maxCvParses", "500 CVs/tháng", " CVs/tháng"), pro: getPlanValue(1, "maxCvParses", "1,500 CVs/tháng", " CVs/tháng"), enterprise: getPlanValue(2, "maxCvParses", "Không giới hạn", " CVs/tháng") },
        { name: "Bóc tách đa định dạng (PDF, DOCX, Ảnh scanned)", starter: true, pro: true, enterprise: true },
        { name: "Chấm điểm độ khớp JD (Match Score 0-100%)", starter: true, pro: true, enterprise: true },
        { name: "Phát hiện từ khóa spam & CV sao chép", starter: false, pro: true, enterprise: true },
        { name: "Tự động xếp hạng Top ứng viên sáng giá", starter: false, pro: true, enterprise: true },
      ],
    },
    {
      category: "Đánh Giá Kỹ Thuật (Technical Assessment)",
      features: [
        { name: "Ngân hàng đề thi lập trình & trắc nghiệm", starter: "Cơ bản", pro: "Đề thi tiêu chuẩn", enterprise: "Tùy biến ngân hàng đề riêng" },
        { name: "Docker Sandbox chấm code tự động", starter: "Hỗ trợ 5 ngôn ngữ", pro: "Hỗ trợ 10 ngôn ngữ", enterprise: "Hỗ trợ 20+ ngôn ngữ" },
        { name: "Kiểm tra độ phức tạp thuật toán Time & Space", starter: false, pro: true, enterprise: true },
        { name: "Cơ chế chống gian lận & giám sát đổi tab", starter: true, pro: true, enterprise: true },
      ],
    },
    {
      category: "Phỏng Vấn Giọng Nói AI (AI Voice Interview)",
      features: [
        { name: "Thời lượng Trợ lý phỏng vấn AI/tháng", starter: getPlanValue(0, "maxAiInterviewHours", "Tối đa 10 giờ", " giờ"), pro: getPlanValue(1, "maxAiInterviewHours", "Tối đa 50 giờ", " giờ"), enterprise: getPlanValue(2, "maxAiInterviewHours", "Không giới hạn", " giờ") },
        { name: "Đàm thoại tiếng Việt & tiếng Anh realtime", starter: true, pro: true, enterprise: true },
        { name: "Phân tích tư duy logic & kỹ năng mềm", starter: false, pro: true, enterprise: true },
        { name: "Ghi âm & bóc băng transcript tự động", starter: true, pro: true, enterprise: true },
      ],
    },
    {
      category: "Tài Khoản & Quản Trị Hệ Thống",
      features: [
        { name: "Số lượng vị trí tuyển dụng (Jobs)", starter: getPlanValue(0, "maxJobs", "Tối đa 5", ""), pro: getPlanValue(1, "maxJobs", "Tối đa 20", ""), enterprise: getPlanValue(2, "maxJobs", "Không giới hạn", "") },
        { name: "Cổng thông tin tuyển dụng (Career Site) riêng", starter: true, pro: true, enterprise: true },
        { name: "Phân quyền theo phòng ban (RBAC)", starter: "Cơ bản", pro: "Tiêu chuẩn", enterprise: "Tùy biến sâu" },
        { name: "Bảng Kanban quản lý phễu tuyển dụng", starter: true, pro: true, enterprise: true },
      ],
    },
    {
      category: "Bảo Mật & Hạ Tầng Doanh Nghiệp",
      features: [
        { name: "Kiến trúc Cơ sở dữ liệu riêng (Separate DB)", starter: true, pro: true, enterprise: true },
        { name: "Đăng nhập một lần doanh nghiệp (SSO SAML / OIDC)", starter: false, pro: false, enterprise: true },
        { name: "Tùy chọn hạ tầng Private Cloud hoặc On-Premise", starter: false, pro: false, enterprise: true },
        { name: "Ký kết Thỏa thuận Bảo mật Thông tin (NDA)", starter: false, pro: true, enterprise: true },
        { name: "Cam kết chất lượng dịch vụ (SLA)", starter: "99.0%", pro: "99.5%", enterprise: "99.99% Dedicated" },
      ],
    },
  ];

  return (
    <div className="py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* SMALL INTRO / CTA */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <span className="italic text-slate-900 font-medium text-lg">Nếu Doanh nghiệp có quy mô khác</span>
          <button 
            onClick={() => openDemoModal("Gói Tùy Biến Chuyên Sâu", "CONTRACT_QUOTE")}
            className="px-5 py-2 rounded-full bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-bold text-sm transition-all shadow-sm flex items-center gap-2"
          >
            Báo giá 1-1
          </button>
        </div>

        {/* 3 TIERS CARDS */}
        <div className="grid lg:grid-cols-3 gap-8 items-stretch mb-24">
          {loading ? (
            <div className="col-span-3 py-20 text-center text-slate-500 flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p>Đang tải bảng giá...</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="col-span-3 py-20 text-center text-slate-500">
              Không có gói cước nào khả dụng.
            </div>
          ) : (
            plans.map((plan, index) => {
              const isHighlighted = index === 1;
              const isEnterprise = plan.code === "ENTERPRISE";
              const cleanName = plan.name.replace(/\s*\(.*?\)\s*/g, '');

              return (
                <div 
                  key={plan.id}
                  className={`rounded-3xl bg-white p-8 flex flex-col justify-between shadow-sm transition-all duration-300 ${
                    isHighlighted 
                      ? "border-2 border-blue-600 shadow-xl relative hover:-translate-y-2" 
                      : "border border-slate-200 hover:shadow-xl hover:-translate-y-1.5"
                  }`}
                >
                  {isHighlighted && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-bold px-4 py-1 rounded-full shadow-sm tracking-wide whitespace-nowrap">
                      Lựa Chọn Phổ Biến Nhất
                    </div>
                  )}

                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3 mt-1">
                      <h3 className="text-xl font-bold text-slate-900 leading-tight">{cleanName}</h3>
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded shrink-0 whitespace-nowrap ${
                        isHighlighted ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-700"
                      }`}>
                        {index === 0 ? "Doanh nghiệp nhỏ" : index === 1 ? "Doanh nghiệp vừa" : "Doanh nghiệp lớn"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-6 min-h-[32px]">
                      {plan.description || "Tối ưu cho doanh nghiệp có nhu cầu chuẩn hóa quy trình tuyển dụng."}
                    </p>

                    <div className={`p-4 rounded-xl mb-5 ${
                      isHighlighted ? "bg-blue-50/60 border-blue-200" : "bg-slate-50 border border-slate-200"
                    }`}>
                      <span className={`text-xs block mb-1 ${isHighlighted ? "text-blue-700 font-semibold" : "text-slate-500"}`}>Quy mô phù hợp</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {index === 0 ? "Dưới 50 nhân sự" : index === 1 ? "Từ 50 - 200 nhân sự" : "Từ 200+ nhân sự"}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1 mb-6">
                      {plan.priceMonthlyVnd > 0 ? (
                        <>
                          <span className={`text-3xl font-extrabold ${isHighlighted ? "text-blue-600" : "text-slate-900"}`}>
                            {plan.priceMonthlyVnd.toLocaleString('vi-VN')} đ
                          </span>
                          <span className="text-xs text-slate-500 font-medium">/ tháng</span>
                        </>
                      ) : (
                        <span className={`text-3xl font-extrabold ${isHighlighted ? "text-blue-600" : "text-slate-900"}`}>
                          Liên hệ báo giá
                        </span>
                      )}
                    </div>

                    <ul className="space-y-3 text-sm text-slate-600 mb-8">
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <span>Cơ sở dữ liệu riêng biệt & bảo mật</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <span><strong>{plan.maxJobs > 0 ? plan.maxJobs : "Không giới hạn"}</strong> vị trí tuyển dụng</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <span>Sàng lọc <strong>{plan.maxCvParses > 0 ? plan.maxCvParses.toLocaleString() : "Không giới hạn"} CVs / tháng</strong></span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <span>Trợ lý phỏng vấn AI <strong>{plan.maxAiInterviewHours ? `${plan.maxAiInterviewHours}h` : "Không giới hạn"}</strong></span>
                      </li>
                      {isEnterprise && (
                        <li className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <span>Hỗ trợ tích hợp <strong>SSO SAML / OIDC</strong></span>
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="flex gap-2.5 mt-auto">
                    <button
                      onClick={() => openDemoModal(plan.name, "CONTRACT_QUOTE")}
                      className="flex-[1.2] py-3.5 px-2 rounded-full bg-[#00bda5] hover:bg-[#00a893] active:scale-95 text-white font-bold text-[13px] transition-all flex items-center justify-center shadow-md whitespace-nowrap"
                    >
                      Tư vấn báo giá 1:1
                    </button>
                    {plan.priceMonthlyVnd > 0 && (
                      <button
                        onClick={() => navigate(`/checkout/${plan.code}`)}
                        className="flex-1 py-3.5 px-2 rounded-full bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 active:scale-95 text-white font-bold text-[13px] transition-all flex items-center justify-center gap-1.5 shadow-md whitespace-nowrap"
                      >
                        <span>Mua ngay</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {/* DETAILED FEATURE MATRIX TABLE */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm mb-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
              Chi Tiết Tính Năng
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-3 mb-2">
              Bảng So Sánh Toàn Bộ Tính Năng
            </h2>
            <p className="text-slate-600 text-sm">
              Xem đầy đủ thông số kỹ thuật và phân quyền của từng gói dịch vụ.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="py-4 px-5 font-semibold text-slate-900 w-2/5">Tính năng</th>
                  <th className="py-4 px-5 font-semibold text-slate-700 text-center w-1/5">{plans[0]?.name?.replace(/\s*\(.*?\)\s*/g, '') || "Starter"}</th>
                  <th className="py-4 px-5 font-semibold text-blue-700 bg-blue-50/50 text-center w-1/5">{plans[1]?.name?.replace(/\s*\(.*?\)\s*/g, '') || "Professional"}</th>
                  <th className="py-4 px-5 font-semibold text-slate-700 text-center w-1/5">{plans[2]?.name?.replace(/\s*\(.*?\)\s*/g, '') || "Enterprise"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {featureMatrix.map((section, sIdx) => (
                  <tr key={sIdx} className="contents">
                    <tr className="bg-slate-100/60 font-bold text-slate-900">
                      <td colSpan={4} className="py-3 px-5 text-xs uppercase tracking-wider text-slate-700">
                        {section.category}
                      </td>
                    </tr>
                    {section.features.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-5 text-slate-800 font-medium">{row.name}</td>
                        <td className="py-3.5 px-5 text-center text-slate-600">
                          {typeof row.starter === "boolean" ? (
                            row.starter ? <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />
                          ) : (
                            row.starter
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-center font-semibold text-blue-900 bg-blue-50/30">
                          {typeof row.pro === "boolean" ? (
                            row.pro ? <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />
                          ) : (
                            row.pro
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-center text-slate-600">
                          {typeof row.enterprise === "boolean" ? (
                            row.enterprise ? <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />
                          ) : (
                            row.enterprise
                          )}
                        </td>
                      </tr>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PRICING FAQ */}
        <div className="max-w-4xl mx-auto mb-24">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
              Câu Hỏi Về Bảng Giá
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-3 mb-2">
              Những Điều Doanh Nghiệp Thường Quan Tâm
            </h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <h4 className="font-bold text-slate-900 mb-2">SmartHire-AI có xuất hóa đơn giá trị gia tăng (VAT) không?</h4>
              <p className="text-slate-600 leading-relaxed">
                Có. Toàn bộ các gói cước và hợp đồng dịch vụ của SmartHire-AI đều được xuất hóa đơn điện tử VAT hợp pháp theo quy định của Tổng cục Thuế Việt Nam ngay sau khi thanh toán thành công.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <h4 className="font-bold text-slate-900 mb-2">Công ty chúng tôi có thể thanh toán theo hình thức nào?</h4>
              <p className="text-slate-600 leading-relaxed">
                Quý doanh nghiệp có thể thanh toán trực tuyến tức thì qua Cổng VNPAY / Thẻ tín dụng doanh nghiệp, hoặc thanh toán qua chuyển khoản ngân hàng theo hợp đồng dịch vụ có đóng dấu pháp nhân.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <h4 className="font-bold text-slate-900 mb-2">Nếu công ty tuyển dụng vượt quá hạn mức CV trong tháng thì sao?</h4>
              <p className="text-slate-600 leading-relaxed">
                Hệ thống sẽ thông báo khi lượng CV đạt 90% quota. Doanh nghiệp có thể mua thêm gói CV bổ sung hoặc nâng cấp trực tiếp lên gói cao hơn mà không làm gián đoạn bất kỳ chiến dịch tuyển dụng nào đang diễn ra.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <h4 className="font-bold text-slate-900 mb-2">Dữ liệu có được đảm bảo an toàn nếu chúng tôi tạm ngưng sử dụng?</h4>
              <p className="text-slate-600 leading-relaxed">
                Toàn bộ dữ liệu trong cơ sở dữ liệu riêng của công ty sẽ được lưu trữ an toàn trong 90 ngày sau khi hết hạn thuê bao. Quý công ty có thể xuất trọn bộ dữ liệu (Export All Data) hoặc yêu cầu xóa vĩnh viễn bất kỳ lúc nào.
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM CTA */}
        <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-14 text-center shadow-xl">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4">
            Cần Tư Vấn Báo Giá Riêng Cho Doanh Nghiệp Của Bạn?
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
            Chúng tôi luôn có các chính sách ưu đãi đặc biệt cho hợp đồng dài hạn (12 - 24 tháng) hoặc các doanh nghiệp có nhu cầu tùy biến hạ tầng riêng.
          </p>
          <button
            onClick={() => openDemoModal("Gói Doanh Nghiệp (Enterprise)", "CONTRACT_QUOTE")}
            className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 transition-all inline-flex items-center gap-2"
          >
            <span>Nhận Báo Giá Chi Tiết & Hợp Đồng Mẫu</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
