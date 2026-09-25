import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  FileCheck2,
  Code2,
  Mic,
  ChevronDown,
  TrendingUp,
  Clock,
  UserCheck,
  Award,
  Activity,
  Check,
  DollarSign,
  ChevronRight
} from "lucide-react";
import { useLandingModal } from "../context/LandingModalContext";

export function SaasLandingPage() {
  const navigate = useNavigate();
  const { openDemoModal, openWorkspaceModal } = useLandingModal();

  // Interactive FAQ State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "Hệ thống có bảo vệ và cách ly dữ liệu tuyển dụng giữa các công ty không?",
      a: "Tuyệt đối an toàn. Mỗi doanh nghiệp được cấp phát một môi trường dữ liệu và không gian làm việc hoàn toàn tách biệt theo kiến trúc Separate Database per Tenant. Dữ liệu ứng viên, lịch sử phỏng vấn và mức lương đề xuất của công ty bạn không bao giờ bị chia sẻ hay rò rỉ sang bất kỳ tổ chức nào khác.",
    },
    {
      q: "Thời gian triển khai giải pháp cho một doanh nghiệp mất bao lâu?",
      a: "Với các gói tiêu chuẩn, không gian làm việc số hóa của doanh nghiệp được cấu hình và bàn giao tự động trong vòng 24 giờ. Với các tập đoàn lớn cần tích hợp đăng nhập một lần (SSO) hoặc kết nối máy chủ nội bộ, đội ngũ kỹ sư giải pháp sẽ đồng hành triển khai trọn gói từ 3 đến 5 ngày làm việc.",
    },
    {
      q: "Trợ lý AI phỏng vấn giọng nói có gây khó khăn cho ứng viên không?",
      a: "Trải nghiệm được thiết kế vô cùng tự nhiên và thân thiện. Ứng viên có thể trả lời bằng micro trên điện thoại hoặc máy tính bất kỳ lúc nào thuận tiện 24/7. AI sẽ tương tác đàm thoại 2 chiều, ghi nhận âm thanh và xuất báo cáo khách quan, loại bỏ cảm giác căng thẳng so với phỏng vấn thông thường.",
    },
    {
      q: "Doanh nghiệp có thể tùy chỉnh bài thi kỹ thuật và tiêu chí chấm điểm theo yêu cầu riêng không?",
      a: "Hoàn toàn có thể. Doanh nghiệp có thể sử dụng ngân hàng đề thi chuẩn hóa của SmartHire-AI hoặc tự tạo đề trắc nghiệm, bài test lập trình và thiết lập trọng số ưu tiên (kinh nghiệm, kỹ năng cốt lõi) phù hợp với tiêu chuẩn nội bộ của từng phòng ban.",
    },
  ];

  return (
    <>
      {/* HERO SECTION */}
      <section className="pt-16 pb-12 md:pt-24 md:pb-20 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6 shadow-2xs">
            <Sparkles className="w-4 h-4 text-blue-600 animate-spin" style={{ animationDuration: "8s" }} />
            <span>Nền Tảng Quản Trị Tuyển Dụng Thông Minh Thế Hệ Mới</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.15] mb-6">
            Nâng Tầm Hiệu Suất Tuyển Dụng Với{" "}
            <span className="text-blue-600 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 bg-clip-text text-transparent">
              Trí Tuệ Nhân Tạo
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            Giải pháp toàn diện giúp doanh nghiệp tự động hóa từ khâu sàng lọc hồ sơ, đánh giá năng lực đến phỏng vấn sơ loại. Rút ngắn 70% thời gian tuyển dụng, tối ưu chi phí và thu hút nhân tài xuất sắc.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-16">
            <button
              onClick={() => openDemoModal("Tư Vấn Giải Pháp Doanh Nghiệp")}
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2.5 group"
            >
              <span>Nhận Tư Vấn & Buổi Demo 1:1</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <Link
              to="/preview"
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold rounded-xl bg-white hover:bg-slate-50 active:scale-98 text-slate-700 border border-slate-300 shadow-2xs transition-all inline-flex items-center justify-center"
            >
              Xem Trải Nghiệm Thực Tế
            </Link>
          </div>

          {/* LIVE PRODUCT PREVIEW MOCKUP WITH FLOATING CHIPS */}
          <div className="relative max-w-5xl mx-auto mt-4 mb-16">
            {/* Floating Chip Left */}
            <div className="hidden lg:flex items-center gap-3 absolute -top-6 -left-6 z-20 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-900/5 animate-float">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-semibold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-left text-xs">
                <div className="font-semibold text-slate-900">Đã sàng lọc 1,840 CVs hôm nay</div>
                <div className="text-slate-500 font-medium">Tốc độ xử lý: 1.2s / hồ sơ</div>
              </div>
            </div>

            {/* Floating Chip Right */}
            <div className="hidden lg:flex items-center gap-3 absolute -bottom-6 -right-6 z-20 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-900/5 animate-float-delayed">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold">
                <Activity className="w-5 h-5" />
              </div>
              <div className="text-left text-xs">
                <div className="font-semibold text-slate-900">96.4% Độ khớp ứng viên</div>
                <div className="text-slate-500 font-medium">Tự động đề xuất phỏng vấn AI</div>
              </div>
            </div>

            {/* Central Mockup Shell */}
            <div className="rounded-2xl bg-white border border-slate-200/90 shadow-2xl shadow-blue-900/5 overflow-hidden text-left transition-all hover:shadow-blue-900/10">
              {/* Mockup Header Bar */}
              <div className="bg-slate-50/90 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-400" />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-3 text-xs font-mono text-slate-500 font-medium">
                    smarthire.top/workspace/pipeline/senior-fullstack
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                    Live Recruitment Workspace
                  </span>
                </div>
              </div>

              {/* Mockup Content: Pipeline Columns */}
              <div className="p-6 bg-slate-50/50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Column 1: Sàng lọc CV */}
                  <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                      <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>1. Sàng lọc CV</span>
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        48
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200/70 mb-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-900">Nguyễn Minh Anh</span>
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                          96% Match
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">Senior Java & React · 5 năm kn</p>
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-[10px] bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                          Spring Boot
                        </span>
                        <span className="text-[10px] bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                          PostgreSQL
                        </span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-white border border-slate-200 opacity-70">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-800">Trần Quốc Bảo</span>
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          88% Match
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">Fullstack Engineer · 3 năm kn</p>
                    </div>
                  </div>

                  {/* Column 2: Đánh giá Kỹ thuật */}
                  <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                      <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>2. Đánh giá Code</span>
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        14
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-200/70 mb-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-900">Lê Hoàng Nam</span>
                        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                          100/100
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">Coding Challenge: 4/4 Test Passed</p>
                      <div className="mt-2 text-[10px] text-emerald-700 flex items-center gap-1 font-semibold">
                        <Check className="w-3 h-3" /> Chống gian lận: Tuyệt đối an toàn
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Phỏng vấn AI */}
                  <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                      <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <Mic className="w-3.5 h-3.5 text-amber-600" />
                        <span>3. Phỏng vấn AI</span>
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        8
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200/70 mb-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-900">Phạm Thúy Vy</span>
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          9.2 / 10
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">AI Voice STT: Giao tiếp xuất sắc</p>
                      <div className="mt-2 text-[10px] text-amber-800 bg-white px-2 py-1 rounded border border-amber-200">
                        Khuyên dùng: Phù hợp văn hóa & tư duy
                      </div>
                    </div>
                  </div>

                  {/* Column 4: Gửi Thư Mời (Offer) */}
                  <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                      <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-emerald-600" />
                        <span>4. Chốt Offer</span>
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        5
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/70">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-900">Vũ Đình Khoa</span>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Accepted
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">Vị trí: Lead Software Engineer</p>
                      <p className="text-[10px] text-slate-400 mt-1">Đã ký thư mời nhận việc</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TRUST BANNER */}
          <div className="pt-8 border-t border-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-6">
              Giải pháp được nghiên cứu và tin cậy bởi các tổ chức & doanh nghiệp hàng đầu
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-75 hover:opacity-100 transition-opacity">
              <span className="text-sm sm:text-base font-semibold text-slate-700 tracking-wider">VIETTEL SOLUTIONS</span>
              <span className="text-sm sm:text-base font-semibold text-slate-700 tracking-wider">VNG CORPORATION</span>
              <span className="text-sm sm:text-base font-semibold text-slate-700 tracking-wider">FPT SOFTWARE</span>
              <span className="text-sm sm:text-base font-semibold text-slate-700 tracking-wider">TECHCOMBANK</span>
              <span className="text-sm sm:text-base font-semibold text-slate-700 tracking-wider">VNPT-IT</span>
            </div>
          </div>
        </div>
      </section>

      {/* CORE SOLUTIONS TEASER SECTION */}
      <section className="py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
              Hệ Sinh Thái Tuyển Dụng
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-4 mb-4">
              5 Module AI Chuyên Sâu Tối Ưu Mọi Điểm Chạm Tuyển Dụng
            </h2>
            <p className="text-slate-600 text-base leading-relaxed">
              Từ lúc nhận hồ sơ CV đến bài test kỹ thuật và phỏng vấn đàm thoại trực tiếp, AI đồng hành cùng HR ở từng công đoạn.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="p-8 rounded-3xl bg-slate-50/70 border border-slate-200 hover:border-blue-400 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 border border-blue-200 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">1. Sàng Lọc CV & Đối Khớp JD</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                Bóc tách đa định dạng PDF/Word trong 1.2s, so khớp thông minh theo ngữ nghĩa và xếp hạng tự động hồ sơ tiềm năng.
              </p>
              <Link to="/solutions" className="text-xs font-semibold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>Khám phá tính năng</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50/70 border border-slate-200 hover:border-indigo-400 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5 border border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Code2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">2. Đánh Giá Code & Sandbox Docker</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                Môi trường thi lập trình độc lập, chấm điểm tức thì qua bộ TestCase ẩn và phân tích độ tối ưu thuật toán.
              </p>
              <Link to="/solutions" className="text-xs font-semibold text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>Khám phá tính năng</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50/70 border border-slate-200 hover:border-amber-400 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-5 border border-amber-200 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">3. Phỏng Vấn Giọng Nói AI 24/7</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                Trợ lý AI đàm thoại bằng giọng nói tự nhiên, nhận diện âm thanh thời gian thực và phân tích năng lực phản biện.
              </p>
              <Link to="/solutions" className="text-xs font-semibold text-amber-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>Khám phá tính năng</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/solutions"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-50 text-blue-700 font-semibold text-xs sm:text-sm border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <span>Xem Đầy Đủ Chi Tiết Hệ Sinh Thái Giải Pháp AI</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* VALUE & ROI SECTION */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
            Giá Trị Thực Tiễn
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-4 mb-4">
            Chuyển Đổi Hiệu Quả Tuyển Dụng Bằng Số Liệu Đo Lường Cụ Thể
          </h2>
          <p className="text-slate-600 text-base leading-relaxed">
            Giúp đội ngũ nhân sự thoát khỏi các tác vụ thủ công lặp lại để tập trung vào việc tương tác, thu hút và giữ chân nhân tài chất lượng cao.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center hover:-translate-y-1.5 hover:shadow-xl hover:border-blue-400/40 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-200 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
              <Clock className="w-6 h-6" />
            </div>
            <div className="text-4xl font-extrabold text-slate-900 mb-2">-70%</div>
            <h4 className="text-base font-bold text-slate-900 mb-1">Thời Gian Lọc Hồ Sơ</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tự động phân loại và đọc hiểu hàng trăm CV trong vài phút thay vì hàng tuần làm thủ công.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center hover:-translate-y-1.5 hover:shadow-xl hover:border-indigo-400/40 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-200 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="text-4xl font-extrabold text-slate-900 mb-2">3.5x</div>
            <h4 className="text-base font-bold text-slate-900 mb-1">Tốc Độ Tuyển Dụng</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Rút ngắn chu kỳ tuyển dụng từ 32 ngày xuống còn 9 ngày trung bình cho mỗi vị trí nhân sự.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center hover:-translate-y-1.5 hover:shadow-xl hover:border-emerald-400/40 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="text-4xl font-extrabold text-slate-900 mb-2">99.2%</div>
            <h4 className="text-base font-bold text-slate-900 mb-1">Chính Xác & Khách Quan</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Loại bỏ thiên vị cảm tính trong vòng lọc hồ sơ nhờ chuẩn hóa tiêu chí và số liệu đo lường.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center hover:-translate-y-1.5 hover:shadow-xl hover:border-amber-400/40 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="text-4xl font-extrabold text-slate-900 mb-2">45%</div>
            <h4 className="text-base font-bold text-slate-900 mb-1">Tiết Kiệm Chi Phí</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Giảm thiểu chi phí nhân lực sàng lọc sơ cấp và thời gian phỏng vấn không hiệu quả của Tech Lead.
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link
            to="/roi"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 text-slate-800 font-semibold text-xs sm:text-sm hover:bg-slate-200 transition-colors"
          >
            <span>Xem Chi Tiết Bài Toán Kinh Tế & Phân Tích ROI</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* SECURITY TEASER SECTION */}
      <section className="py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
                An Toàn & Bảo Mật Doanh Nghiệp
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-4 mb-6">
                Bảo Vệ Dữ Liệu Nhân Sự & Danh Tiếng Doanh Nghiệp
              </h2>
              <p className="text-slate-600 text-base leading-relaxed mb-8">
                Hồ sơ nhân sự và thông tin ứng viên là tài sản chiến lược của mỗi công ty. Chúng tôi cam kết bảo vệ dữ liệu của bạn bằng các chuẩn mực an ninh thông tin nghiêm ngặt nhất.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Cô Lập Dữ Liệu Tuyệt Đối (Separate Database)</h4>
                    <p className="text-xs text-slate-600">Mỗi công ty sở hữu một không gian lưu trữ dữ liệu độc lập hoàn toàn, triệt tiêu mọi rủi ro thất thoát thông tin.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Tuân Thủ Nghị Định 13/2023/NĐ-CP</h4>
                    <p className="text-xs text-slate-600">Đảm bảo trọn vẹn quyền riêng tư dữ liệu cá nhân của ứng viên theo đúng quy định pháp luật Việt Nam.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Tích Hợp Đăng Nhập Một Lần (SSO)</h4>
                    <p className="text-xs text-slate-600">Đồng bộ thuận tiện và bảo mật với tài khoản doanh nghiệp qua Google Workspace, Microsoft 365, Okta.</p>
                  </div>
                </div>
              </div>

              <Link
                to="/security"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                <span>Tìm hiểu thêm về tiêu chuẩn an ninh & pháp lý</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 shadow-inner space-y-6">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-400/50 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500">Tiêu chuẩn bảo mật</span>
                  <h4 className="text-base font-bold text-slate-900">Mã Hóa Toàn Diện AES-256 & TLS 1.3</h4>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-400/50 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500">Cam kết vận hành</span>
                  <h4 className="text-base font-bold text-slate-900">Độ Sẵn Sàng Dịch Vụ Ổn Định 99.9%</h4>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-400/50 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500">Pháp lý vững chắc</span>
                  <h4 className="text-base font-bold text-slate-900">Ký Kết Thỏa Thuận Bảo Mật Thông Tin (NDA)</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PACKAGES PREVIEW SECTION */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
            Gói Giải Pháp Doanh Nghiệp
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-4 mb-4">
            Linh Hoạt Theo Quy Mô & Mục Tiêu Tuyển Dụng
          </h2>
          <p className="text-slate-600 text-base">
            Chúng tôi đồng hành cùng quý doanh nghiệp qua từng bước tư vấn chuyên sâu, thử nghiệm thực tế và ký kết hợp đồng rõ ràng.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-stretch mb-12">
          {/* TIER 1 */}
          <div className="rounded-3xl bg-white border border-slate-200 p-8 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-slate-900">Gói Chuyên Nghiệp</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  Doanh nghiệp vừa
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-6">Tối ưu cho doanh nghiệp có nhu cầu chuẩn hóa tuyển dụng cốt lõi.</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-2xl font-extrabold text-slate-900">3.600.000 đ</span>
                <span className="text-xs text-slate-500 font-medium">/ tháng</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-600 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" /> 10 tài khoản Tuyển dụng
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" /> Sàng lọc 1,500 CVs / tháng
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" /> Cổng Career Site riêng
                </li>
              </ul>
            </div>
            <button
              onClick={() => navigate("/checkout/PROFESSIONAL")}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow transition-all"
            >
              Mua Ngay Gói Này
            </button>
          </div>

          {/* TIER 2 (HIGHLIGHT) */}
          <div className="rounded-3xl bg-white border-2 border-blue-600 p-8 flex flex-col justify-between shadow-xl relative hover:-translate-y-1.5 transition-all">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-bold px-3.5 py-1 rounded-full shadow-sm">
              Lựa Chọn Phổ Biến Nhất
            </div>
            <div>
              <div className="flex items-center justify-between mb-3 mt-1">
                <h3 className="text-xl font-bold text-slate-900">Gói Doanh Nghiệp</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                  Doanh nghiệp lớn
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-6">Tối ưu cho tổ chức có nhiều phòng ban và khối lượng ứng viên lớn.</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-2xl font-extrabold text-blue-600">9.900.000 đ</span>
                <span className="text-xs text-slate-500 font-medium">/ tháng</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-600 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" /> Không giới hạn vị trí tuyển
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" /> Sàng lọc 10,000 CVs / tháng
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" /> Trợ lý phỏng vấn AI giọng nói 24/7
                </li>
              </ul>
            </div>
            <button
              onClick={() => navigate("/checkout/ENTERPRISE")}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow transition-all"
            >
              Mua Ngay Gói Doanh Nghiệp
            </button>
          </div>

          {/* TIER 3 */}
          <div className="rounded-3xl bg-white border border-slate-200 p-8 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-slate-900">Gói Tùy Biến Chuyên Sâu</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  Tập đoàn
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-6">Dành cho các đơn vị có yêu cầu riêng biệt về hạ tầng máy chủ.</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-2xl font-extrabold text-slate-900">Liên hệ báo giá</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-600 mb-8">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" /> Cụm máy chủ riêng biệt
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" /> Không giới hạn tài khoản & CV
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" /> Hỗ trợ kỹ thuật 24/7 chuyên trách
                </li>
              </ul>
            </div>
            <button
              onClick={() => openDemoModal("Gói Tùy Biến Chuyên Sâu (Custom Solution)", "CONTRACT_QUOTE")}
              className="w-full py-3 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 font-semibold text-xs transition-all"
            >
              Liên Hệ Đội Ngũ Chuyên Gia
            </button>
          </div>
        </div>

        <div className="text-center">
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-50 text-blue-700 font-semibold text-xs sm:text-sm hover:bg-blue-100 transition-colors"
          >
            <span>Xem Bảng So Sánh Tính Năng Đầy Đủ</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
              Hỏi Đáp Thường Gặp
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 mt-4 mb-3">
              Giải Đáp Thắc Mắc Về Nền Tảng
            </h2>
            <p className="text-slate-600 text-sm">
              Những câu hỏi doanh nghiệp quan tâm hàng đầu trước khi tiến hành triển khai giải pháp.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isExpanded = expandedFaq === index;
              return (
                <div
                  key={index}
                  className="border border-slate-200 rounded-2xl overflow-hidden transition-all duration-200 hover:border-blue-300 bg-white shadow-2xs"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full py-4.5 px-6 text-left flex items-center justify-between gap-4 font-semibold text-slate-900 text-sm sm:text-base hover:text-blue-600 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <div
                      className={`w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 transition-transform duration-200 ${
                        isExpanded ? "rotate-180 bg-blue-50 text-blue-600" : "text-slate-400"
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA SECTION */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-sky-400 text-xs font-semibold mb-6 border border-slate-700">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chuyển Đổi Số Tuyển Dụng</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Sẵn Sàng Nâng Tầm Năng Lực Tuyển Dụng Của Doanh Nghiệp?
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Trải nghiệm buổi trao đổi chuyên sâu và theo dõi trực tiếp quy trình AI hoạt động trên chính bài toán tuyển dụng thực tế của bạn.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => openDemoModal("Tư Vấn Giải Pháp Doanh Nghiệp")}
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-xl shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
            >
              <span>Đặt Lịch Tư Vấn 1:1 Cùng Chuyên Gia</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={openWorkspaceModal}
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-200 border border-slate-700 transition-all"
            >
              Vào Không Gian Làm Việc
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
