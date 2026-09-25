import { Link } from "react-router-dom";
import {
  FileCheck2,
  Code2,
  Mic,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Layers,
  Bot
} from "lucide-react";
import { useLandingModal } from "../context/LandingModalContext";

export function SolutionsPage() {
  const { openDemoModal } = useLandingModal();

  const solutions = [
    {
      id: "cv-screening",
      badge: "AI CV Screening & Semantic Matching",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      icon: FileCheck2,
      iconBg: "bg-blue-50 text-blue-600",
      title: "Bóc Tách & Đối Khớp Hồ Sơ Thông Minh",
      description:
        "Tự động đọc hiểu toàn bộ cấu trúc CV đa định dạng (PDF, DOCX, Hình ảnh) bằng công nghệ OCR & NLP tiên tiến. Thuật toán Semantic Search so khớp kinh nghiệm, kỹ năng và mức độ phù hợp thực tế với Mô tả công việc (JD).",
      features: [
        "Trích xuất chính xác số năm kinh nghiệm, học vấn, công nghệ và chứng chỉ",
        "Chấm điểm độ khớp (Match Score 0 - 100%) kèm giải thích chi tiết lý do từ AI",
        "Tự động phát hiện từ khóa rác, CV sao chép hoặc phóng đại kỹ năng",
        "Xếp hạng tự động Top 10% hồ sơ tiềm năng nhất để chuyển thẳng vòng tiếp theo",
      ],
      mockupType: "cv",
    },
    {
      id: "tech-assessment",
      badge: "Automated Coding Sandbox & Anti-Cheat",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      icon: Code2,
      iconBg: "bg-indigo-50 text-indigo-600",
      title: "Đánh Giá Năng Lực Kỹ Thuật & Sandbox Độc Lập",
      description:
        "Môi trường kiểm tra lập trình và trắc nghiệm chuyên sâu tự động hóa. Đề thi được tạo theo chuẩn quốc tế, mã nguồn được biên dịch và chấm điểm tức thời trong Sandbox Docker cô lập an toàn.",
      features: [
        "Hỗ trợ hơn 15+ ngôn ngữ: Java, Python, Go, C++, TypeScript, SQL,...",
        "Chạy hàng chục Test Case ẩn, đánh giá độ tối ưu thuật toán (Time & Space Complexity)",
        "Cơ chế chống gian lận thông minh: Khóa màn hình, cảnh báo chuyển tab, kiểm soát paste code",
        "Báo cáo phân tích chuyên sâu năng lực lập trình gửi trực tiếp cho Tech Lead",
      ],
      mockupType: "code",
    },
    {
      id: "ai-interview",
      badge: "Realtime Voice STT & Soft-skills Assessment",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      icon: Mic,
      iconBg: "bg-amber-50 text-amber-600",
      title: "Trợ Lý Phỏng Vấn Giọng Nói AI Đàm Thoại 24/7",
      description:
        "Ứng viên được phỏng vấn tương tác bằng giọng nói tự nhiên với Trợ lý AI ở mọi thời điểm thuận tiện. Hệ thống nhận diện âm thanh siêu tốc (Voice STT) và phân tích chiều sâu phong thái, khả năng giao tiếp.",
      features: [
        "Đàm thoại 2 chiều mượt mà tiếng Việt và tiếng Anh với độ trễ phản hồi cực thấp",
        "Câu hỏi phỏng vấn biến thiên thông minh tùy theo câu trả lời trước đó của ứng viên",
        "Chấm điểm 5 chỉ số kỹ năng mềm: Tư duy phản biện, sự mạch lạc, thái độ, giải quyết vấn đề",
        "Ghi âm & tạo biên bản bóc băng phỏng vấn tự động kèm tóm tắt đề xuất tuyển dụng",
      ],
      mockupType: "voice",
    },
    {
      id: "matching-ranking",
      badge: "Predictive Ranking & Talent Insights",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: TrendingUp,
      iconBg: "bg-emerald-50 text-emerald-600",
      title: "Xếp Hạng Đa Chiều & Dự Báo Mức Độ Phù Hợp",
      description:
        "Tổng hợp toàn bộ dữ liệu từ CV, điểm thi code và phỏng vấn sơ loại để đưa ra chỉ số xếp hạng toàn diện. Giúp doanh nghiệp ra quyết định tuyển dụng dựa trên dữ liệu khách quan thay vì cảm tính.",
      features: [
        "Trọng số xếp hạng tùy chỉnh linh hoạt theo từng phòng ban và tiêu chuẩn doanh nghiệp",
        "Dự báo tỷ lệ gắn bó lâu dài và độ tương thích văn hóa tổ chức",
        "So sánh trực quan giữa các ứng viên trong cùng một đợt tuyển dụng",
        "Lưu trữ và tái kích hoạt hồ sơ tiềm năng (Talent Pool) cho các chiến dịch tương lai",
      ],
      mockupType: "ranking",
    },
    {
      id: "workflow-automation",
      badge: "End-to-End Pipeline Automation",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      icon: Layers,
      iconBg: "bg-purple-50 text-purple-600",
      title: "Quy Trình Tuyển Dụng Tự Động Hóa Toàn Diện",
      description:
        "Tự động kích hoạt các hành động tiếp theo trong phễu tuyển dụng: Gửi email xác nhận, mời làm bài test kỹ thuật, xếp lịch phỏng vấn AI, và thông báo kết quả cho ứng viên.",
      features: [
        "Bảng Kanban trực quan kéo thả hồ sơ qua các vòng tuyển dụng",
        "Tự động gửi email thương hiệu cá nhân hóa kèm mã thi và đường link phỏng vấn",
        "Tích hợp cổng thông tin nghề nghiệp (Career Portal) riêng biệt cho từng doanh nghiệp",
        "Báo cáo thời gian thực về tỷ lệ chuyển đổi, chi phí tuyển dụng và thời gian tuyển (Time-to-Hire)",
      ],
      mockupType: "pipeline",
    },
  ];

  const comparisonRows = [
    {
      feature: "Thời gian sàng lọc hồ sơ",
      traditional: "Mất 5 - 15 phút mỗi CV, dễ mệt mỏi và bỏ sót hồ sơ",
      smarthire: "Chỉ 1.2 giây/CV, phân tích tự động hàng nghìn hồ sơ cùng lúc",
    },
    {
      feature: "Đánh giá bài test kỹ thuật",
      traditional: "Tech Lead mất 2-3 giờ chấm bài thủ công cho mỗi ứng viên",
      smarthire: "Sandbox Docker tự động chấm điểm, chạy TestCase tức thì",
    },
    {
      feature: "Lịch phỏng vấn sơ loại",
      traditional: "Mất nhiều ngày email qua lại xếp lịch, tỷ lệ bùng phỏng vấn cao",
      smarthire: "Phỏng vấn AI giọng nói 24/7, ứng viên chủ động thực hiện mọi lúc",
    },
    {
      feature: "Tính khách quan khi đánh giá",
      traditional: "Dễ bị ảnh hưởng bởi thiên vị cảm tính hoặc áp lực thời gian",
      smarthire: "Chuẩn hóa 100% bằng tiêu chí dữ liệu đo lường minh bạch",
    },
    {
      feature: "Trải nghiệm của ứng viên",
      traditional: "Phản hồi chậm trễ, thường đợi hàng tuần không có kết quả",
      smarthire: "Phản hồi tức thì, tạo ấn tượng chuyên nghiệp về thương hiệu nhà tuyển dụng",
    },
  ];

  return (
    <div className="py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* HERO INTRO */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6 shadow-2xs">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Hệ Sinh Thái Tuyển Dụng AI Toàn Diện</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.15] mb-6">
            Đột Phá Năng Suất Nhân Sự Với{" "}
            <span className="text-blue-600 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 bg-clip-text text-transparent">
              5 Module AI Chuyên Sâu
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-8 leading-relaxed">
            Kết hợp sức mạnh của Mô hình Ngôn ngữ Lớn (LLM), Xử lý Giọng nói Realtime (Voice STT/TTS) và Môi trường Sandbox Code độc lập để chuẩn hóa toàn bộ phễu tuyển dụng doanh nghiệp.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => openDemoModal("Tư Vấn Giải Pháp Doanh Nghiệp")}
              className="px-8 py-3.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
            >
              <span>Đăng Ký Tư Vấn & Demo 1:1</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/preview"
              className="px-8 py-3.5 text-sm font-semibold rounded-xl bg-white hover:bg-slate-50 active:scale-98 text-slate-700 border border-slate-300 shadow-2xs transition-all inline-flex items-center gap-2"
            >
              <span>Xem Trải Nghiệm Thực Tế</span>
            </Link>
          </div>
        </div>

        {/* 5 DEEP DIVE SOLUTION MODULES */}
        <div className="space-y-16 mb-28">
          {solutions.map((sol, index) => {
            const Icon = sol.icon;
            const isReversed = index % 2 !== 0;

            return (
              <div
                key={sol.id}
                className={`grid lg:grid-cols-12 gap-10 items-center rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 ${
                  isReversed ? "lg:grid-flow-dense" : ""
                }`}
              >
                {/* Left Description Column */}
                <div className={`space-y-5 lg:col-span-6 ${isReversed ? "lg:col-start-7" : ""}`}>
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${sol.badgeColor}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{sol.badge}</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    {sol.title}
                  </h2>

                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    {sol.description}
                  </p>

                  <div className="space-y-3 pt-2">
                    {sol.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-sm text-slate-700 font-medium">
                          {feat}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={() => openDemoModal(sol.title)}
                      className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 group"
                    >
                      <span>Trải nghiệm thử tính năng này</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Right Visual / Mockup Preview */}
                <div className={`lg:col-span-6 ${isReversed ? "lg:col-start-1" : ""}`}>
                  {sol.mockupType === "cv" && (
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 shadow-inner space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                            NA
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">Nguyễn Tuấn Anh</div>
                            <div className="text-xs text-slate-500">Ứng tuyển: Backend Tech Lead (Java)</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-blue-600">96 / 100</span>
                          <div className="text-[11px] text-emerald-600 font-semibold">Khớp 96% JD</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-slate-700 block">Kỹ năng cốt lõi bóc tách:</span>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-xs font-medium">
                            ✓ Spring Boot (5 năm)
                          </span>
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-xs font-medium">
                            ✓ Microservices Architecture
                          </span>
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-xs font-medium">
                            ✓ Distributed Cache & RabbitMQ
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed shadow-2xs">
                        <div className="font-semibold text-blue-700 mb-1 flex items-center gap-1.5">
                          <Bot className="w-4 h-4" /> Đánh giá từ SmartHire AI:
                        </div>
                        Ứng viên có bề dày thiết kế hệ thống chịu tải cao, giải quyết trọn vẹn yêu cầu kỹ thuật trong JD. Khuyến nghị mời vào vòng thi đánh giá code tự động.
                      </div>
                    </div>
                  )}

                  {sol.mockupType === "code" && (
                    <div className="rounded-2xl bg-slate-900 text-white p-6 font-mono text-xs shadow-xl border border-slate-800">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-3">
                        <span className="text-slate-400">Solution.java (Coding Challenge)</span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 4 / 4 Test Cases Passed
                        </span>
                      </div>
                      <div className="text-slate-300 space-y-1 text-xs mb-4">
                        <p><span className="text-blue-400">public</span> <span className="text-blue-400">int</span> maxSubArray(<span className="text-blue-400">int</span>[] nums) &#123;</p>
                        <p className="pl-4 text-slate-500">// Kadane's Algorithm O(n)</p>
                        <p className="pl-4"><span className="text-blue-400">int</span> maxSoFar = nums[0], curr = nums[0];</p>
                        <p className="pl-4"><span className="text-purple-400">for</span> (<span className="text-blue-400">int</span> i = 1; i &lt; nums.length; i++) &#123;</p>
                        <p className="pl-8">curr = Math.max(nums[i], curr + nums[i]);</p>
                        <p className="pl-8">maxSoFar = Math.max(maxSoFar, curr);</p>
                        <p className="pl-4">&#125;</p>
                        <p className="pl-4"><span className="text-purple-400">return</span> maxSoFar;</p>
                        <p>&#125;</p>
                      </div>
                      <div className="pt-3 border-t border-slate-700 flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Thời gian: 12ms · Bộ nhớ: 41.2MB</span>
                        <span className="text-emerald-400 font-semibold">Điểm Sandbox: 100/100</span>
                      </div>
                    </div>
                  )}

                  {sol.mockupType === "voice" && (
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 shadow-inner space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                          <span className="font-semibold text-slate-900 text-xs sm:text-sm">Phiên Phỏng Vấn Giọng Nói AI</span>
                        </div>
                        <span className="text-slate-500 font-mono text-xs">00:04:18</span>
                      </div>
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs">
                        <div className="text-[11px] font-semibold text-blue-600 mb-1">Trợ lý AI đặt câu hỏi:</div>
                        <p className="text-slate-700 italic">
                          "Hãy chia sẻ cách bạn xử lý khi hệ thống database gặp tắc nghẽn connection pool vào giờ cao điểm?"
                        </p>
                      </div>
                      <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 text-xs space-y-2">
                        <div className="font-semibold text-slate-800 text-[11px]">Phân tích phản hồi ứng viên:</div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Độ rõ ràng & mạch lạc</span>
                          <span className="font-semibold text-blue-700">92%</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Tư duy giải quyết vấn đề</span>
                          <span className="font-semibold text-blue-700">89%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {sol.mockupType === "ranking" && (
                    <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-md space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-xs font-semibold text-slate-800">Bảng Xếp Hạng Ứng Viên Tiềm Năng</span>
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Top Đề Xuất</span>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-slate-900">#1. Nguyễn Minh Anh</div>
                          <div className="text-[11px] text-slate-500">CV: 96% · Code: 100/100 · AI Interview: 9.2</div>
                        </div>
                        <span className="text-xs font-bold text-blue-700">98.4 Total</span>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-slate-800">#2. Lê Hoàng Nam</div>
                          <div className="text-[11px] text-slate-500">CV: 91% · Code: 95/100 · AI Interview: 8.8</div>
                        </div>
                        <span className="text-xs font-bold text-slate-700">92.1 Total</span>
                      </div>
                    </div>
                  )}

                  {sol.mockupType === "pipeline" && (
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 shadow-inner">
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                          <div className="text-slate-500 text-[10px] mb-1">1. Lọc CV</div>
                          <div className="font-bold text-slate-900 text-sm">48</div>
                          <div className="text-[10px] text-blue-600 mt-1">Tự động</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                          <div className="text-slate-500 text-[10px] mb-1">2. Test Code</div>
                          <div className="font-bold text-slate-900 text-sm">14</div>
                          <div className="text-[10px] text-indigo-600 mt-1">Sandbox</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                          <div className="text-slate-500 text-[10px] mb-1">3. Phỏng vấn AI</div>
                          <div className="font-bold text-slate-900 text-sm">8</div>
                          <div className="text-[10px] text-amber-600 mt-1">Voice 24/7</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* COMPARISON TABLE: TRADITIONAL VS SMARTHIRE AI */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-sm mb-24">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
              Đối Chiếu Hiệu Năng
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-3 mb-2">
              So Sánh Tuyển Dụng Truyền Thống vs SmartHire-AI
            </h2>
            <p className="text-slate-600 text-sm">
              Sự chuyển dịch rõ rệt từ quy trình thủ công rời rạc sang tự động hóa thông minh.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="py-4 px-5 font-semibold text-slate-900">Giai đoạn & Tiêu chí</th>
                  <th className="py-4 px-5 font-semibold text-rose-700 bg-rose-50/40">Phương Pháp Truyền Thống</th>
                  <th className="py-4 px-5 font-semibold text-blue-700 bg-blue-50/50">Giải Pháp SmartHire-AI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisonRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-5 font-semibold text-slate-900">{row.feature}</td>
                    <td className="py-4 px-5 text-slate-600 bg-rose-50/20">
                      <div className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span>{row.traditional}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-slate-900 font-medium bg-blue-50/30">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{row.smarthire}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* BOTTOM CTA */}
        <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-8 sm:p-14 text-white text-center shadow-xl">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4">
            Sẵn Sàng Trải Nghiệm Hệ Sinh Thái Tuyển Dụng AI?
          </h2>
          <p className="text-blue-100 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
            Đội ngũ chuyên gia của SmartHire-AI sẽ tư vấn quy trình mẫu phù hợp chính xác với cơ cấu tuyển dụng của công ty bạn.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => openDemoModal("Tư Vấn Giải Pháp Doanh Nghiệp")}
              className="px-8 py-3.5 rounded-xl bg-white text-blue-700 font-semibold text-sm hover:bg-blue-50 shadow-md active:scale-95 transition-all"
            >
              Đặt Lịch Tư Vấn 1:1 Cùng Chuyên Gia
            </button>
            <Link
              to="/pricing"
              className="px-8 py-3.5 rounded-xl bg-blue-800/60 hover:bg-blue-800 text-white font-semibold text-sm border border-blue-400/40 active:scale-95 transition-all"
            >
              Xem Bảng Giá Gói Giải Pháp
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
