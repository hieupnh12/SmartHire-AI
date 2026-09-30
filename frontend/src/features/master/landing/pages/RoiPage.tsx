import { Link } from "react-router-dom";
import {
  Clock,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Calculator,
  Briefcase,
  Users2,
  DollarSign
} from "lucide-react";
import { useLandingModal } from "../context/LandingModalContext";

export function RoiPage() {
  const { openDemoModal } = useLandingModal();

  const metrics = [
    {
      stat: "-70%",
      label: "Thời Gian Lọc Hồ Sơ",
      description: "Tự động phân loại, đọc hiểu và so khớp hàng trăm CV trong vài phút thay vì hàng tuần làm thủ công.",
      icon: Clock,
      color: "text-blue-600 bg-blue-50 border-blue-200",
    },
    {
      stat: "3.5x",
      label: "Tốc Độ Tuyển Dụng",
      description: "Rút ngắn thời gian từ lúc ứng viên nộp hồ sơ đến khi chốt Offer từ trung bình 32 ngày xuống còn 9 ngày.",
      icon: TrendingUp,
      color: "text-indigo-600 bg-indigo-50 border-indigo-200",
    },
    {
      stat: "99.2%",
      label: "Chính Xác & Khách Quan",
      description: "Loại bỏ hoàn toàn thiên vị cảm tính trong vòng sơ loại nhờ tiêu chuẩn chấm điểm và đối soát kỹ năng minh bạch.",
      icon: UserCheck,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
    {
      stat: "45%",
      label: "Tiết Kiệm Chi Phí",
      description: "Cắt giảm ngân sách cho các khâu sàng lọc sơ cấp, giảm thời gian phỏng vấn không hiệu quả của các Tech Lead.",
      icon: DollarSign,
      color: "text-amber-600 bg-amber-50 border-amber-200",
    },
  ];

  const roleBenefits = [
    {
      role: "Dành Cho Giám Đốc Nhân Sự (CHRO / HRD)",
      icon: Users2,
      points: [
        "Kiểm soát toàn diện hiệu suất tuyển dụng với Realtime Dashboard và báo cáo chuyển đổi phễu",
        "Tiết kiệm hàng trăm triệu đồng chi phí sourcing và chi phí cơ hội do chậm tuyển dụng",
        "Nâng cao trải nghiệm ứng viên, định vị thương hiệu nhà tuyển dụng công nghệ hiện đại",
        "Dữ liệu nhân sự được quản lý an toàn, tuân thủ nghiêm ngặt quy định bảo mật pháp lý",
      ],
    },
    {
      role: "Dành Cho Chuyên Viên Tuyển Dụng (Recruiters)",
      icon: Briefcase,
      points: [
        "Thoát khỏi gánh nặng đọc và phân loại hàng trăm CV mỗi ngày",
        "Tự động hóa 100% email thông báo, mời thi tuyển và xếp lịch phỏng vấn",
        "Chỉ tập trung phỏng vấn sâu những ứng viên đã vượt qua vòng đánh giá chất lượng",
        "Giao diện trực quan kéo thả hồ sơ dễ sử dụng, phối hợp mượt mà với Hiring Manager",
      ],
    },
    {
      role: "Dành Cho Trưởng Bộ Phận Kỹ Thuật (Tech Leads)",
      icon: Calculator,
      points: [
        "Không còn mất 2-3 giờ mỗi tuần chấm bài test code lập trình thủ công",
        "Nhận báo cáo chấm điểm tự động kèm độ phức tạp giải thuật và video phỏng vấn AI",
        "Chỉ gặp mặt những ứng viên thực chiến có năng lực lập trình và tư duy logic vững vàng",
        "Ngân hàng đề thi lập trình được chuẩn hóa, không cần tự soạn đề thi từ đầu",
      ],
    },
  ];

  return (
    <div className="py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* HERO INTRO */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6 shadow-2xs">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Hiệu Quả Kinh Tế & Chỉ Số ROI Thực Tế</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.15] mb-6">
            Tối Ưu Hóa Chi Phí &{" "}
            <span className="text-blue-600 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 bg-clip-text text-transparent">
              Tăng Tốc Tuyển Dụng 3.5x
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-8 leading-relaxed">
            Giúp doanh nghiệp chuyển dịch từ các tác vụ thủ công lặp lại sang quản trị nhân tài dựa trên dữ liệu. Đo lường chính xác giá trị kinh tế mang lại cho tổ chức.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => openDemoModal("Tư Vấn Báo Giá & Tính Toán ROI")}
              className="px-8 py-3.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
            >
              <span>Nhận Bản Tính Toán ROI Cho Công Ty Bạn</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/pricing"
              className="px-8 py-3.5 text-sm font-semibold rounded-xl bg-white hover:bg-slate-50 active:scale-98 text-slate-700 border border-slate-300 shadow-2xs transition-all inline-flex items-center gap-2"
            >
              <span>Xem Các Gói Giải Pháp</span>
            </Link>
          </div>
        </div>

        {/* 4 KEY METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {metrics.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-8 rounded-3xl bg-white border border-slate-200/90 text-center hover:-translate-y-2 hover:shadow-xl hover:border-blue-400/50 transition-all duration-300 group"
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 border ${item.color} group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-7 h-7" />
                </div>
                <div className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-2 tracking-tight">
                  {item.stat}
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{item.label}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
              </div>
            );
          })}
        </div>

        {/* ROI BREAKDOWN COMPARISON TABLE */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm mb-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
              Mô Hình Tính Toán
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-3 mb-2">
              Bài Toán Kinh Tế Tuyển Dụng Hàng Năm
            </h2>
            <p className="text-slate-600 text-sm">
              Giả định doanh nghiệp tuyển dụng trung bình 50 vị trí công nghệ mỗi năm.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-6 sm:p-8 rounded-2xl bg-rose-50/40 border border-rose-200/70 space-y-4">
              <h3 className="text-lg font-bold text-rose-950 flex items-center gap-2">
                <span>Quy trình Tuyển dụng Truyền thống</span>
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                <li className="flex justify-between border-b border-rose-100 pb-2">
                  <span>Thời gian lọc 2,500 CVs thủ công:</span>
                  <strong>~250 giờ làm việc</strong>
                </li>
                <li className="flex justify-between border-b border-rose-100 pb-2">
                  <span>Tech Lead chấm bài code & test:</span>
                  <strong>~150 giờ kỹ sư</strong>
                </li>
                <li className="flex justify-between border-b border-rose-100 pb-2">
                  <span>Phỏng vấn sơ loại ứng viên không đạt:</span>
                  <strong>~120 giờ lãng phí</strong>
                </li>
                <li className="flex justify-between border-b border-rose-100 pb-2">
                  <span>Thời gian hoàn tất một đợt tuyển:</span>
                  <strong className="text-rose-700">32 ngày trung bình</strong>
                </li>
                <li className="flex justify-between pt-2 text-rose-900 font-bold text-sm sm:text-base">
                  <span>Ước tính chi phí giờ làm việc hao phí:</span>
                  <span>~350.000.000 đ / năm</span>
                </li>
              </ul>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl bg-blue-50/40 border border-blue-200/70 space-y-4">
              <h3 className="text-lg font-bold text-blue-950 flex items-center gap-2">
                <span>Triển khai cùng SmartHire-AI</span>
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                <li className="flex justify-between border-b border-blue-100 pb-2">
                  <span>AI lọc và bóc tách 2,500 CVs:</span>
                  <strong className="text-emerald-700">Tự động trong ~50 phút</strong>
                </li>
                <li className="flex justify-between border-b border-blue-100 pb-2">
                  <span>Sandbox tự động biên dịch và chấm điểm:</span>
                  <strong className="text-emerald-700">0 giờ Tech Lead</strong>
                </li>
                <li className="flex justify-between border-b border-blue-100 pb-2">
                  <span>Trợ lý AI phỏng vấn đàm thoại sơ bộ 24/7:</span>
                  <strong className="text-emerald-700">Tự động hóa 100%</strong>
                </li>
                <li className="flex justify-between border-b border-blue-100 pb-2">
                  <span>Thời gian hoàn tất một đợt tuyển:</span>
                  <strong className="text-blue-700">Chỉ 9 ngày</strong>
                </li>
                <li className="flex justify-between pt-2 text-blue-900 font-bold text-sm sm:text-base">
                  <span>Chi phí tiết kiệm ròng cho doanh nghiệp:</span>
                  <span className="text-emerald-600">~230.000.000 đ / năm</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ROLE BENEFITS */}
        <div className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
              Lợi Ích Đa Chiều
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-3 mb-2">
              Giá Trị Thiết Thực Cho Từng Vị Trí Trong Tổ Chức
            </h2>
            <p className="text-slate-600 text-sm">
              Đồng bộ hiệu quả từ cấp lãnh đạo chiến lược đến đội ngũ chuyên môn trực tiếp tuyển dụng.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {roleBenefits.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="rounded-3xl bg-white border border-slate-200 p-8 shadow-sm hover:shadow-lg transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-4">{item.role}</h3>
                  <ul className="space-y-3">
                    {item.points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM CTA */}
        <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-8 sm:p-14 text-white text-center shadow-xl">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4">
            Tính Toán Chi Phí & Thời Gian Tiết Kiệm Của Công Ty Bạn
          </h2>
          <p className="text-blue-100 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
            Nhập thông tin quy mô nhân sự và khối lượng tuyển dụng hàng năm để nhận bản phân tích ROI cá nhân hóa từ chuyên gia giải pháp.
          </p>
          <button
            onClick={() => openDemoModal("Yêu Cầu Báo Cáo Đo Lường ROI")}
            className="px-8 py-3.5 rounded-xl bg-white text-blue-700 font-semibold text-sm hover:bg-blue-50 shadow-md active:scale-95 transition-all inline-flex items-center gap-2"
          >
            <span>Nhận Báo Cáo Đo Lường ROI 1:1</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
