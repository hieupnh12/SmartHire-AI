import { useState } from "react";
import {
  FileCheck2,
  Code2,
  Mic,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Terminal,
  Check,
  Award,
  Volume2
} from "lucide-react";
import { useLandingModal } from "../context/LandingModalContext";

export function PreviewPage() {
  const { openDemoModal } = useLandingModal();
  const [activeTab, setActiveTab] = useState<"screening" | "assessment" | "interview">("screening");

  return (
    <div className="py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* HERO INTRO */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6 shadow-2xs">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Phòng Trải Nghiệm Công Nghệ Tương Tác</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.15] mb-6">
            Thao Tác Trực Tiếp Với{" "}
            <span className="text-blue-600 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 bg-clip-text text-transparent">
              Giao Diện Tuyển Dụng AI
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-8 leading-relaxed">
            Xem cách nền tảng SmartHire-AI xử lý hồ sơ ứng viên, chấm điểm code tự động trong Sandbox và đàm thoại phỏng vấn bằng giọng nói thời gian thực.
          </p>

          {/* Interactive Tab Switcher */}
          <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-slate-200/70 max-w-xl mx-auto">
            <button
              onClick={() => setActiveTab("screening")}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === "screening"
                  ? "bg-white text-blue-700 shadow-md shadow-slate-900/5"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>1. Lọc CV Thông Minh</span>
            </button>
            <button
              onClick={() => setActiveTab("assessment")}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === "assessment"
                  ? "bg-white text-blue-700 shadow-md shadow-slate-900/5"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>2. Đánh Giá Kỹ Thuật</span>
            </button>
            <button
              onClick={() => setActiveTab("interview")}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === "interview"
                  ? "bg-white text-blue-700 shadow-md shadow-slate-900/5"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>3. Phỏng Vấn Giọng Nói AI</span>
            </button>
          </div>
        </div>

        {/* TAB INTERACTIVE DISPLAY CARD */}
        <div className="max-w-5xl mx-auto rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-900/5 p-6 sm:p-12 mb-24 transition-all duration-300">
          {activeTab === "screening" && (
            <div className="grid md:grid-cols-12 gap-8 items-center animate-fade-in">
              <div className="md:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" /> AI Parsing & Match Scoring
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Tự động bóc tách & xếp hạng hồ sơ trong 1 giây
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  AI tự động đọc hiểu mọi file CV (PDF, DOCX), trích xuất chính xác số năm kinh nghiệm, bộ kỹ năng kỹ thuật và đối khớp thông minh với bản Mô tả công việc (JD).
                </p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 font-medium pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Tự động loại bỏ hồ sơ rác, phát hiện từ khóa spam
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Đề xuất Top 10% ứng viên sáng giá nhất vào vòng tiếp
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Giải thích lý do vì sao hồ sơ phù hợp hoặc thiếu hụt
                  </li>
                </ul>
              </div>
              <div className="md:col-span-6 bg-slate-50 rounded-2xl p-6 border border-slate-200 font-sans text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                      NA
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">Nguyễn Tuấn Anh</div>
                      <div className="text-[11px] text-slate-500">Ứng tuyển: Backend Tech Lead</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-blue-600">96 / 100</span>
                    <div className="text-[10px] text-emerald-600 font-semibold">Rất Phù Hợp</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-700 block mb-1.5">
                      Kỹ năng đối khớp trực tiếp với JD:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-medium">
                        ✓ Spring Boot (5 năm)
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-medium">
                        ✓ Microservices Architecture
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-medium">
                        ✓ Redis & RabbitMQ
                      </span>
                    </div>
                  </div>
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed shadow-2xs">
                    <strong>Nhận xét từ AI:</strong> Ứng viên có bề dày kinh nghiệm thiết kế hệ thống lớn, đã từng lead team 15 người. Khuyến nghị mời tham gia bài test kỹ thuật.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "assessment" && (
            <div className="grid md:grid-cols-12 gap-8 items-center animate-fade-in">
              <div className="md:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                  <Terminal className="w-3.5 h-3.5" /> Coding Sandbox & Anti-Cheat
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Đánh giá năng lực thực chiến & Chống gian lận
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Hệ thống bài thi trắc nghiệm chuyên sâu và bài tập lập trình tương tác. Tự động biên dịch, chạy TestCase trong môi trường Sandbox độc lập và chấm điểm tức thì.
                </p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 font-medium pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Tự động khóa bài và cảnh báo khi phát hiện chuyển tab
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Báo cáo chi tiết độ tối ưu thuật toán (Time & Space Complexity)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Ngân hàng hơn 500+ bài toán lập trình chuẩn LeetCode
                  </li>
                </ul>
              </div>
              <div className="md:col-span-6 bg-slate-900 rounded-2xl p-6 text-white font-mono text-xs shadow-inner border border-slate-800">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-3">
                  <span className="text-slate-400">Solution.java (Coding Challenge)</span>
                  <span className="text-emerald-400 font-semibold">4 / 4 Test Cases Passed</span>
                </div>
                <div className="text-slate-300 space-y-1 text-[11px] mb-4">
                  <p><span className="text-blue-400">public</span> <span className="text-blue-400">int</span> maxSubArray(<span className="text-blue-400">int</span>[] nums) &#123;</p>
                  <p className="pl-4 text-slate-400">// Kadane's Algorithm O(n)</p>
                  <p className="pl-4"><span className="text-blue-400">int</span> maxSoFar = nums[0], curr = nums[0];</p>
                  <p className="pl-4"><span className="text-purple-400">for</span> (<span className="text-blue-400">int</span> i = 1; i &lt; nums.length; i++) &#123;</p>
                  <p className="pl-8">curr = Math.max(nums[i], curr + nums[i]);</p>
                  <p className="pl-8">maxSoFar = Math.max(maxSoFar, curr);</p>
                  <p className="pl-4">&#125;</p>
                  <p className="pl-4"><span className="text-purple-400">return</span> maxSoFar;</p>
                  <p>&#125;</p>
                </div>
                <div className="pt-3 border-t border-slate-700 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Thời gian thực thi: 12ms</span>
                  <span className="text-emerald-400 font-semibold">Điểm tuyệt đối: 100/100</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "interview" && (
            <div className="grid md:grid-cols-12 gap-8 items-center animate-fade-in">
              <div className="md:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">
                  <Mic className="w-3.5 h-3.5" /> Realtime Voice STT & NLP Analysis
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Phỏng vấn đàm thoại 24/7 cùng Trợ lý AI
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Ứng viên được phỏng vấn tương tác bằng giọng nói tự nhiên. AI tự động nhận diện âm thanh (Speech-to-Text), phân tích tư duy phản biện và phong thái trả lời.
                </p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 font-medium pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Ứng viên chủ động tham gia mọi lúc, không kẹt lịch HR
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Báo cáo chấm điểm chi tiết 5 yếu tố kỹ năng mềm
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Lưu trữ bản ghi âm và transcript đầy đủ
                  </li>
                </ul>
              </div>
              <div className="md:col-span-6 bg-slate-50 rounded-2xl p-6 border border-slate-200 font-sans text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="font-semibold text-slate-900">AI Voice Session: Đang phỏng vấn</span>
                  </div>
                  <span className="text-slate-500 font-mono text-[11px]">00:04:18</span>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 mb-3 shadow-2xs">
                  <div className="text-[11px] font-semibold text-blue-600 mb-1 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" /> Câu hỏi từ Trợ lý AI:
                  </div>
                  <p className="text-slate-700 italic">
                    "Hãy chia sẻ cách bạn xử lý khi hệ thống database gặp tắc nghẽn connection pool vào giờ cao điểm?"
                  </p>
                </div>
                <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-800 mb-1">Phân tích phản hồi ứng viên:</div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Độ rõ ràng & mạch lạc</span>
                    <span className="font-semibold text-blue-700">92%</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Khả năng giải quyết vấn đề</span>
                    <span className="font-semibold text-blue-700">89%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FULL PIPELINE MOCKUP SHELL */}
        <div className="rounded-3xl bg-white border border-slate-200/90 shadow-2xl shadow-blue-900/5 overflow-hidden text-left mb-24">
          {/* Mockup Header Bar */}
          <div className="bg-slate-50/90 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-400" />
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="ml-3 text-xs font-mono text-slate-500 font-medium">
                smarthire.top/workspace/pipeline/senior-fullstack
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-md border border-blue-200">
                Toàn Cảnh Bảng Kanban Tuyển Dụng Doanh Nghiệp
              </span>
            </div>
          </div>

          {/* Mockup Content: Pipeline Columns */}
          <div className="p-6 sm:p-8 bg-slate-50/50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Column 1: Sàng lọc CV */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
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
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
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
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
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
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
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

        {/* 4-STEP RECRUITMENT FLOW */}
        <div className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
              Quy Trình Hoạt Động
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-3 mb-2">
              4 Bước Triển Khai Tuyển Dụng Tự Động
            </h2>
            <p className="text-slate-600 text-sm">
              Doanh nghiệp chỉ cần cung cấp Mô tả công việc, toàn bộ khâu sàng lọc sơ bộ sẽ do SmartHire-AI đảm nhận.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs relative">
              <span className="text-3xl font-extrabold text-blue-100 absolute top-4 right-4">01</span>
              <h3 className="text-base font-semibold text-slate-900 mb-2">Đăng Tuyển & Nhận CV</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tạo chiến dịch tuyển dụng, kết nối Career Site riêng. Ứng viên nộp CV qua cổng thông tin hoặc HR tải hàng loạt CV lên hệ thống.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs relative">
              <span className="text-3xl font-extrabold text-blue-100 absolute top-4 right-4">02</span>
              <h3 className="text-base font-semibold text-slate-900 mb-2">AI Sàng Lọc & Xếp Hạng</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Trong 1.2 giây/CV, AI đọc hiểu toàn bộ thông tin, so khớp với tiêu chí công việc và tự động gửi email mời làm bài kiểm tra năng lực.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs relative">
              <span className="text-3xl font-extrabold text-blue-100 absolute top-4 right-4">03</span>
              <h3 className="text-base font-semibold text-slate-900 mb-2">Đánh Giá & Phỏng Vấn AI</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ứng viên làm bài test lập trình trên Sandbox an toàn và thực hiện phỏng vấn bằng giọng nói với AI bất kỳ lúc nào thuận tiện.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs relative">
              <span className="text-3xl font-extrabold text-blue-100 absolute top-4 right-4">04</span>
              <h3 className="text-base font-semibold text-slate-900 mb-2">Báo Cáo & Chốt Offer</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                HR và Hội đồng tuyển dụng nhận báo cáo đa chiều kèm khuyến nghị từ AI, chỉ cần phỏng vấn vòng cuối và gửi thư mời làm việc.
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM CTA */}
        <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-14 text-center shadow-xl">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4">
            Muốn Xem Demo Trực Tiếp Trên Dữ Liệu Doanh Nghiệp?
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
            Chúng tôi cung cấp buổi chạy thử 1:1 miễn phí với bài toán tuyển dụng thực tế của công ty bạn trong 30 phút.
          </p>
          <button
            onClick={() => openDemoModal("Trải Nghiệm Live Demo 1:1")}
            className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 transition-all inline-flex items-center gap-2"
          >
            <span>Đặt Lịch Demo 1:1 Ngay</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
