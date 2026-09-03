import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Bot,
  Zap,
  BrainCircuit,
  Check,
  ShieldCheck,
  Code,
  Mic,
  LogIn,
  Building2,
  X
} from "lucide-react";

export function SaasLandingPage() {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [tenantCodeInput, setTenantCodeInput] = useState("");

  const handleSubdomainLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantCodeInput.trim()) return;
    const code = tenantCodeInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    
    // Save tenant code override in localStorage
    localStorage.setItem("smarthire_tenant_id", code);
    
    // Redirect to subdomain URL or tenant login route
    const currentHost = window.location.host;
    if (currentHost.includes("localhost")) {
      window.location.href = `http://${code}.localhost:${window.location.port || 5173}/login`;
    } else {
      window.location.href = `http://${code}.smarthire.ai/login`;
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#191b23] font-sans antialiased selection:bg-[#3b82f6] selection:text-white">
      {/* Background Subtle Luminous Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#3b82f6]/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-[#60a5fa]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-1/3 w-[500px] h-[500px] bg-[#dbeafe]/20 rounded-full blur-3xl" />
      </div>

      {/* Top Glassmorphism Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/75 backdrop-blur-md border-b border-[#e2e8f0] transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 rounded-[12px] bg-[#3b82f6] text-white flex items-center justify-center shadow-md shadow-[#3b82f6]/20">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold font-display text-[#1e293b] tracking-tight">
                SmartHire AI
              </span>
              <span className="ml-2.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[rgba(59,130,246,0.1)] text-[#3b82f6]">
                Luminous SaaS
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#475569]">
            <a href="#features" className="hover:text-[#3b82f6] transition-colors">
              Tính Năng AI
            </a>
            <a href="#multitenancy" className="hover:text-[#3b82f6] transition-colors">
              Bảo Mật Multi-Tenant
            </a>
            <a href="#pricing" className="hover:text-[#3b82f6] transition-colors">
              Bảng Giá SaaS
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {/* Sign In Button (Opens Tenant Lookup Modal) */}
            <button
              onClick={() => setShowSignInModal(true)}
              className="px-4 py-2 text-sm font-medium rounded-[8px] bg-[rgba(59,130,246,0.08)] hover:bg-[rgba(59,130,246,0.15)] text-[#3b82f6] transition-all flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>

            {/* Start Free Trial Button */}
            <button
              onClick={() => navigate("/onboard")}
              className="px-5 py-2.5 text-sm font-semibold rounded-[8px] bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-lg shadow-[#3b82f6]/20 hover:shadow-[#3b82f6]/30 transition-all flex items-center gap-2 group"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* HERO SECTION */}
        <section className="relative pt-16 pb-20 md:pt-28 md:pb-32 max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[rgba(59,130,246,0.12)] text-[#3b82f6] text-xs font-semibold mb-6">
            <Sparkles className="w-4 h-4 text-[#3b82f6]" />
            <span>Nền Tảng Tuyển Dụng AI SaaS Enterprise</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold font-display tracking-tight text-[#1e293b] max-w-4xl mx-auto leading-tight mb-6">
            Hire Smarter With{" "}
            <span className="text-[#3b82f6] bg-gradient-to-r from-[#3b82f6] to-[#2563eb] bg-clip-text text-transparent">
              SmartHire AI Enterprise
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-[#475569] max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
            Hệ thống áp dụng kiến trúc <strong>Separate Database per Tenant</strong> bảo mật độc lập tuyệt đối. Tích hợp AI Lọc CV, Đánh giá Kỹ thuật và Phỏng vấn AI giọng nói tự động.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-16">
            <button
              onClick={() => navigate("/onboard")}
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold rounded-[8px] bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-xl shadow-[#3b82f6]/25 transition-all flex items-center justify-center gap-2 group"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <a
              href="#pricing"
              className="w-full sm:w-auto px-8 py-4 text-base font-medium rounded-[8px] bg-[rgba(59,130,246,0.08)] hover:bg-[rgba(59,130,246,0.15)] text-[#3b82f6] transition-all inline-flex items-center justify-center"
            >
              Xem Gói Dịch Vụ
            </a>
          </div>

          {/* Hero Feature Cards - 24px Radius Luminous Glass Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 max-w-5xl mx-auto text-left">
            <div className="p-6 rounded-[24px] bg-white border border-[#e2e8f0] shadow-[0_20px_25px_-5px_rgba(59,130,246,0.05)] hover:border-[#3b82f6]/30 transition-all">
              <div className="flex items-center gap-3 text-[#3b82f6] font-semibold text-sm mb-2">
                <ShieldCheck className="w-5 h-5" />
                <span>Separate DB Isolation</span>
              </div>
              <p className="text-xs text-[#64748b] leading-relaxed">Mỗi công ty 1 Database riêng biệt, không lo rò rỉ dữ liệu.</p>
            </div>

            <div className="p-6 rounded-[24px] bg-white border border-[#e2e8f0] shadow-[0_20px_25px_-5px_rgba(59,130,246,0.05)] hover:border-[#3b82f6]/30 transition-all">
              <div className="flex items-center gap-3 text-[#3b82f6] font-semibold text-sm mb-2">
                <Bot className="w-5 h-5" />
                <span>AI Screening & Match</span>
              </div>
              <p className="text-xs text-[#64748b] leading-relaxed">Trích xuất kỹ năng & xếp hạng ứng viên tự động.</p>
            </div>

            <div className="p-6 rounded-[24px] bg-white border border-[#e2e8f0] shadow-[0_20px_25px_-5px_rgba(59,130,246,0.05)] hover:border-[#3b82f6]/30 transition-all">
              <div className="flex items-center gap-3 text-[#3b82f6] font-semibold text-sm mb-2">
                <Mic className="w-5 h-5" />
                <span>Voice AI Interview</span>
              </div>
              <p className="text-xs text-[#64748b] leading-relaxed">Phỏng vấn giọng nói STT/NLP và chấm điểm Realtime.</p>
            </div>

            <div className="p-6 rounded-[24px] bg-white border border-[#e2e8f0] shadow-[0_20px_25px_-5px_rgba(59,130,246,0.05)] hover:border-[#3b82f6]/30 transition-all">
              <div className="flex items-center gap-3 text-[#3b82f6] font-semibold text-sm mb-2">
                <Zap className="w-5 h-5" />
                <span>RabbitMQ & Redis</span>
              </div>
              <p className="text-xs text-[#64748b] leading-relaxed">Xử lý bất đồng bộ hàng ngàn CV siêu tốc.</p>
            </div>
          </div>
        </section>

        {/* FEATURES HIGHLIGHT SECTION */}
        <section id="features" className="py-20 bg-[#f8f9ff] border-y border-[#e2e8f0]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold font-display text-[#1e293b] mb-3">
                Tính Năng Đột Phá Cho Nhà Tuyển Dụng Enterprise
              </h2>
              <p className="text-[#64748b] text-base">
                Giải pháp toàn diện giúp doanh nghiệp tự động hóa từ khâu Đăng Tin, Lọc Hồ Sơ cho tới Phỏng Vấn AI.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-8 rounded-[24px] bg-white border border-[#e2e8f0] shadow-[0_20px_25px_-5px_rgba(59,130,246,0.05)]">
                <div className="w-12 h-12 rounded-[12px] bg-[rgba(59,130,246,0.1)] text-[#3b82f6] flex items-center justify-center mb-6 font-bold">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#1e293b] mb-3">AI CV Parsing & Ranking</h3>
                <p className="text-[#64748b] text-sm leading-relaxed mb-4">
                  Phân tích cấu trúc file CV PDF/Word, trích xuất kỹ năng cốt lõi và chấm điểm khớp matching với Mô Tả Công Việc.
                </p>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#16a34a]">
                  <CheckCircle2 className="w-4 h-4" /> Độ chính xác 98%
                </div>
              </div>

              <div className="p-8 rounded-[24px] bg-white border border-[#e2e8f0] shadow-[0_20px_25px_-5px_rgba(59,130,246,0.05)]">
                <div className="w-12 h-12 rounded-[12px] bg-[rgba(59,130,246,0.1)] text-[#3b82f6] flex items-center justify-center mb-6 font-bold">
                  <Code className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#1e293b] mb-3">Technical Assessment</h3>
                <p className="text-[#64748b] text-sm leading-relaxed mb-4">
                  Bài test kỹ thuật tự động: Trắc nghiệm chuyên môn, Coding challenge kèm kiểm thử TestCase tự động.
                </p>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#3b82f6]">
                  <CheckCircle2 className="w-4 h-4" /> Tự động chấm điểm tức thì
                </div>
              </div>

              <div className="p-8 rounded-[24px] bg-white border border-[#e2e8f0] shadow-[0_20px_25px_-5px_rgba(59,130,246,0.05)]">
                <div className="w-12 h-12 rounded-[12px] bg-[rgba(59,130,246,0.1)] text-[#3b82f6] flex items-center justify-center mb-6 font-bold">
                  <Mic className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#1e293b] mb-3">AI Voice Interview (STT/NLP)</h3>
                <p className="text-[#64748b] text-sm leading-relaxed mb-4">
                  Ứng viên thực hiện phỏng vấn tương tác bằng giọng nói. AI tự động chuyển âm thanh thành văn bản và xuất báo cáo.
                </p>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#d97706]">
                  <CheckCircle2 className="w-4 h-4" /> Phỏng vấn không cần HR túc trực
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SUBSCRIPTION PRICING PLANS SECTION */}
        <section id="pricing" className="py-24 max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold text-[#3b82f6] uppercase tracking-wider px-3 py-1 rounded-full bg-[rgba(59,130,246,0.1)]">
              Bảng Giá SaaS Subscription
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold font-display text-[#1e293b] mt-4 mb-4">
              Chọn Gói Dịch Vụ Phù Hợp Cho Doanh Nghiệp
            </h2>
            <p className="text-[#64748b] text-sm">
              Mỗi doanh nghiệp sở hữu 1 Database riêng biệt, được tự động kích hoạt ngay sau khi chọn gói.
            </p>

            {/* Monthly / Yearly Toggle */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <span className={`text-sm font-medium ${!isYearly ? "text-[#1e293b]" : "text-[#64748b]"}`}>Thanh Toán Hàng Tháng</span>
              <button
                onClick={() => setIsYearly(!isYearly)}
                className="w-12 h-7 rounded-full bg-[#e2e8f0] p-1 transition-colors relative"
              >
                <div
                  className={`w-5 h-5 rounded-full bg-[#3b82f6] transition-transform ${
                    isYearly ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${isYearly ? "text-[#1e293b]" : "text-[#64748b]"}`}>
                Thanh Toán Hàng Năm <span className="text-xs text-[#16a34a] font-bold px-2 py-0.5 bg-[#16a34a]/10 rounded-full">Tiết kiệm 20%</span>
              </span>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 items-stretch">
            {/* PLAN 1: STARTER */}
            <div className="rounded-[24px] bg-white border border-[#e2e8f0] p-8 flex flex-col justify-between shadow-[0_20px_25px_-5px_rgba(59,130,246,0.03)] hover:border-[#3b82f6]/40 transition-all">
              <div>
                <h3 className="text-xl font-bold text-[#1e293b] mb-1">Gói Starter</h3>
                <p className="text-xs text-[#64748b] mb-6">Dành cho công ty khởi nghiệp & doanh nghiệp nhỏ.</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-extrabold text-[#1e293b]">{isYearly ? "$39" : "$49"}</span>
                  <span className="text-xs text-[#64748b]">/tháng</span>
                </div>

                <ul className="space-y-3.5 text-sm text-[#475569] mb-8">
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-[#3b82f6]" />
                    <span><strong>1 Database riêng</strong> (Tenant Isolation)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-[#3b82f6]" />
                    <span>Tối đa <strong>5 vị trí tuyển dụng</strong></span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-[#3b82f6]" />
                    <span>Phân tích <strong>100 CVs / tháng</strong></span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => navigate("/onboard?plan=starter")}
                className="w-full py-3 px-4 rounded-[8px] bg-[rgba(59,130,246,0.08)] hover:bg-[rgba(59,130,246,0.15)] text-[#3b82f6] font-semibold text-sm transition-colors"
              >
                Start Free Trial
              </button>
            </div>

            {/* PLAN 2: PROFESSIONAL */}
            <div className="rounded-[24px] bg-white border-2 border-[#3b82f6] p-8 flex flex-col justify-between relative shadow-[0_20px_25px_-5px_rgba(59,130,246,0.12)]">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#3b82f6] text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-sm">
                Phổ Biến Nhất ✨
              </div>

              <div>
                <h3 className="text-xl font-bold text-[#1e293b] mb-1">Gói Professional</h3>
                <p className="text-xs text-[#64748b] mb-6">Tối ưu cho doanh nghiệp đang mở rộng quy mô.</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-extrabold text-[#3b82f6]">{isYearly ? "$119" : "$149"}</span>
                  <span className="text-xs text-[#64748b]">/tháng</span>
                </div>

                <ul className="space-y-3.5 text-sm text-[#475569] mb-8">
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-[#3b82f6]" />
                    <span><strong>1 Database riêng biệt</strong> Enterprise</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-[#3b82f6]" />
                    <span>Tối đa <strong>20 vị trí tuyển dụng</strong></span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-[#3b82f6]" />
                    <span>Phân tích <strong>1,000 CVs / tháng</strong></span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-[#3b82f6]" />
                    <span><strong>AI Ranking & Score</strong></span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-[#3b82f6]" />
                    <span><strong>10 Giờ Phỏng Vấn AI Voice</strong></span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => navigate("/onboard?plan=professional")}
                className="w-full py-3.5 px-4 rounded-[8px] bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-sm shadow-md shadow-[#3b82f6]/20 transition-all"
              >
                Start Free Trial
              </button>
            </div>

            {/* PLAN 3: ENTERPRISE */}
            <div className="rounded-[24px] bg-white border border-[#e2e8f0] p-8 flex flex-col justify-between shadow-[0_20px_25px_-5px_rgba(59,130,246,0.03)] hover:border-[#3b82f6]/40 transition-all">
              <div>
                <h3 className="text-xl font-bold text-[#1e293b] mb-1">Gói Enterprise</h3>
                <p className="text-xs text-[#64748b] mb-6">Dành cho tập đoàn lớn cần SLA 24/7.</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-extrabold text-[#1e293b]">{isYearly ? "$319" : "$399"}</span>
                  <span className="text-xs text-[#64748b]">/tháng</span>
                </div>

                <ul className="space-y-3.5 text-sm text-[#475569] mb-8">
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-[#3b82f6]" />
                    <span>Dedicated HikariCP Connection Pool</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-[#3b82f6]" />
                    <span><strong>Không giới hạn</strong> Jobs & CVs</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-[#3b82f6]" />
                    <span>Full AI Voice Interview & Proctoring</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-[#3b82f6]" />
                    <span>Hỗ trợ kỹ thuật SLA 24/7 Dedicated Manager</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => navigate("/onboard?plan=enterprise")}
                className="w-full py-3 px-4 rounded-[8px] bg-[rgba(59,130,246,0.08)] hover:bg-[rgba(59,130,246,0.15)] text-[#3b82f6] font-semibold text-sm transition-colors"
              >
                Liên Hệ Đăng Ký Enterprise
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* TENANT SUBDOMAIN LOOKUP MODAL ("SIGN IN") */}
      {showSignInModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border border-[#e2e8f0] rounded-[24px] p-8 max-w-md w-full text-left shadow-2xl relative animate-fade-in">
            <button
              onClick={() => setShowSignInModal(false)}
              className="absolute top-6 right-6 text-[#64748b] hover:text-[#1e293b] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-[12px] bg-[rgba(59,130,246,0.1)] text-[#3b82f6] flex items-center justify-center mb-5 font-bold">
              <Building2 className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold font-display text-[#1e293b] mb-1">
              Đăng Nhập Workspace Doanh Nghiệp
            </h3>
            <p className="text-xs text-[#64748b] mb-6">
              Nhập Mã Doanh Nghiệp (Tenant Subdomain) của bạn để vào trang Đăng nhập riêng.
            </p>

            <form onSubmit={handleSubdomainLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1e293b] mb-1.5">
                  Mã Doanh Nghiệp (Tenant Code)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: acme"
                  value={tenantCodeInput}
                  onChange={(e) => setTenantCodeInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-[8px] bg-[#f8f9ff] border border-[#e2e8f0] text-[#1e293b] font-mono text-sm focus:border-[#3b82f6] focus:outline-none"
                />
              </div>

              {tenantCodeInput.trim() && (
                <div className="p-3 rounded-[8px] bg-[#f2f3fd] border border-[#c2c6d6] text-xs text-[#3b82f6] font-mono">
                  Link Subdomain: http://{tenantCodeInput.trim().toLowerCase()}.smarthire.ai/login
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-[8px] bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-sm shadow-md shadow-[#3b82f6]/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Chuyển Đến Trang Đăng Nhập</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-[#e2e8f0] py-8 bg-white text-[#64748b] text-xs">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-[#3b82f6]" />
            <span className="font-bold text-[#1e293b] text-sm">SmartHire AI Enterprise</span>
          </div>
          <p>© 2026 SmartHire AI. Luminous Professional Design System.</p>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-[#3b82f6] transition-colors">Điều khoản</a>
            <a href="#" className="hover:text-[#3b82f6] transition-colors">Bảo mật</a>
            <a href="#" className="hover:text-[#3b82f6] transition-colors">SaaS Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
