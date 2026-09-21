import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BrainCircuit,
  ShieldCheck,
  Lock,
  Building2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  FileCheck2,
  Code2,
  Mic,
  ChevronRight,
  ChevronDown,
  PhoneCall,
  X,
  Send,
  KeyRound,
  TrendingUp,
  Clock,
  UserCheck,
  Award,
  Terminal,
  Activity,
  Check,
  Loader2,
  FileText
} from "lucide-react";
import { consultationApi } from "@/api/master/consultationApi";

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

export function SaasLandingPage() {
  const navigate = useNavigate();
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [tenantCodeInput, setTenantCodeInput] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("Gói Doanh Nghiệp (Enterprise)");
  const [requestType, setRequestType] = useState<"DEMO" | "CONTRACT_QUOTE">("DEMO");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  // Interactive Live Preview State
  const [activeTab, setActiveTab] = useState<"screening" | "assessment" | "interview">("screening");

  // Interactive FAQ State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

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

  const handleSubdomainLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantCodeInput.trim()) return;
    const code = tenantCodeInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");

    const currentHost = window.location.host;
    if (currentHost.includes("localhost")) {
      window.location.href = `http://${code}.localhost:${window.location.port || 5173}/login`;
    } else {
      window.location.href = `https://${code}.smarthire.top/login`;
    }
  };

  const handleDirectTenantJump = (code: string) => {
    const currentHost = window.location.host;
    if (currentHost.includes("localhost")) {
      window.location.href = `http://${code}.localhost:${window.location.port || 5173}/login`;
    } else {
      window.location.href = `https://${code}.smarthire.top/login`;
    }
  };

  const BLOCKED_PERSONAL_DOMAINS = [
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com",
    "icloud.com", "mail.com", "zoho.com", "proton.me", "protonmail.com", "yandex.com"
  ];

  const isPersonalEmail = (email: string) => {
    const domain = email.trim().toLowerCase().split("@")[1];
    return domain ? BLOCKED_PERSONAL_DOMAINS.includes(domain) : false;
  };

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (isPersonalEmail(formData.workEmail)) {
      setSubmitError("Vui lòng sử dụng Email Doanh nghiệp (domain công ty riêng, ví dụ: name@company.com) để được xếp lịch thẩm định & demo 1:1 nhanh nhất.");
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

  const openDemoModalWithTier = (tierName: string, type: "DEMO" | "CONTRACT_QUOTE" = "DEMO") => {
    setSelectedTier(tierName);
    setRequestType(type);
    setDemoSubmitted(false);
    setSubmitError(null);
    setShowDemoModal(true);
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "Hệ thống có bảo vệ và cách ly dữ liệu tuyển dụng giữa các công ty không?",
      a: "Tuyệt đối an toàn. Mỗi doanh nghiệp được cấp phát một môi trường dữ liệu và không gian làm việc hoàn toàn tách biệt. Dữ liệu ứng viên, lịch sử phỏng vấn và mức lương đề xuất của công ty bạn không bao giờ bị chia sẻ hay rò rỉ sang bất kỳ tổ chức nào khác.",
    },
    {
      q: "Thời gian triển khai giải pháp cho một doanh nghiệp mất bao lâu?",
      a: "Với các gói tiêu chuẩn, không gian làm việc số hóa của doanh nghiệp được cấu hình và bàn giao trong vòng 24 giờ. Với các tập đoàn lớn cần tích hợp đăng nhập một lần (SSO) hoặc kết nối máy chủ nội bộ, đội ngũ kỹ sư giải pháp sẽ đồng hành triển khai trọn gói từ 3 đến 5 ngày làm việc.",
    },
    {
      q: "Trợ lý AI phỏng vấn giọng nói có gây khó khăn cho ứng viên không?",
      a: "Trải nghiệm được thiết kế vô cùng tự nhiên và thân thiện. Ứng viên có thể trả lời bằng micro trên điện thoại hoặc máy tính bất kỳ lúc nào thuận tiện. AI sẽ tương tác đàm thoại 2 chiều, ghi nhận âm thanh và xuất báo cáo khách quan, loại bỏ cảm giác căng thẳng so với phỏng vấn thông thường.",
    },
    {
      q: "Doanh nghiệp có thể tùy chỉnh bài thi kỹ thuật và tiêu chí chấm điểm theo yêu cầu riêng không?",
      a: "Hoàn toàn có thể. Doanh nghiệp có thể sử dụng ngân hàng đề thi chuẩn hóa của SmartHire-AI hoặc tự tạo đề trắc nghiệm, bài test lập trình và thiết lập trọng số ưu tiên (kinh nghiệm, kỹ năng cốt lõi) phù hợp với tiêu chuẩn nội bộ của từng phòng ban.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] font-sans antialiased selection:bg-[#2563eb] selection:text-white relative overflow-x-hidden">
      {/* Dynamic Luminous Ambient Glow Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-400/15 rounded-full blur-3xl animate-pulse-glow" />
        <div
          className="absolute top-1/3 -right-32 w-[420px] h-[420px] bg-indigo-400/15 rounded-full blur-3xl animate-pulse-glow"
          style={{ animationDelay: "3s" }}
        />
        <div
          className="absolute bottom-20 left-1/4 w-[500px] h-[500px] bg-sky-300/15 rounded-full blur-3xl animate-pulse-glow"
          style={{ animationDelay: "5s" }}
        />
      </div>

      {/* Subtle Background Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-35">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] transition-all">
        <div className="mx-auto grid min-h-20 w-full max-w-[1536px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-3 sm:min-h-[84px] sm:gap-6 sm:px-6 lg:px-8 xl:grid-cols-[minmax(max-content,1fr)_auto_minmax(max-content,1fr)]">
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-3.5 cursor-pointer select-none shrink-0 group"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-blue-600/25 ring-1 ring-white/20 group-hover:scale-105 transition-transform duration-200">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="hidden text-xl font-semibold tracking-tight text-slate-900 font-display min-[420px]:inline sm:text-2xl">
                SmartHire<span className="text-blue-600">.AI</span>
              </span>
              <span className="hidden text-[11px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 lg:inline-flex">
                Enterprise
              </span>
            </div>
          </div>

          {/* Navigation Links - Clean, spacious, no line-breaks */}
          <nav className="hidden items-center justify-center gap-1.5 text-sm font-medium text-slate-600 xl:flex" aria-label="Điều hướng chính">
            <a
              href="#solutions"
              className="px-3.5 py-2 rounded-full hover:text-blue-600 hover:bg-slate-100/80 transition-all whitespace-nowrap active:scale-95"
            >
              Giải pháp AI
            </a>
            <a
              href="#preview"
              className="px-3.5 py-2 rounded-full hover:text-blue-600 hover:bg-slate-100/80 transition-all whitespace-nowrap active:scale-95"
            >
              Trải nghiệm thực tế
            </a>
            <a
              href="#value"
              className="px-3.5 py-2 rounded-full hover:text-blue-600 hover:bg-slate-100/80 transition-all whitespace-nowrap active:scale-95"
            >
              Hiệu quả & ROI
            </a>
            <a
              href="#security"
              className="px-3.5 py-2 rounded-full hover:text-blue-600 hover:bg-slate-100/80 transition-all whitespace-nowrap active:scale-95"
            >
              Bảo mật dữ liệu
            </a>
            <a
              href="#packages"
              className="px-3.5 py-2 rounded-full hover:text-blue-600 hover:bg-slate-100/80 transition-all whitespace-nowrap active:scale-95"
            >
              Gói giải pháp
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex shrink-0 items-center justify-self-end gap-2 sm:gap-3">
            <button
              onClick={() => setShowWorkspaceModal(true)}
              className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-2xs transition-all hover:bg-slate-100/80 hover:text-slate-900 active:scale-95 sm:px-4"
              aria-label="Vào Workspace"
            >
              <Building2 className="w-4 h-4 text-slate-500" />
              <span className="hidden lg:inline">Vào Workspace</span>
            </button>

            <button
              onClick={() => openDemoModalWithTier("Tư Vấn Giải Pháp Doanh Nghiệp")}
              className="group flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md active:scale-95 active:bg-blue-800 sm:px-5"
            >
              <span className="sm:hidden">Demo</span>
              <span className="hidden sm:inline">Yêu cầu Demo</span>
              <ArrowRight className="hidden w-4 h-4 group-hover:translate-x-1 transition-transform min-[360px]:block" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* HERO SECTION */}
        <section className="pt-16 pb-12 md:pt-24 md:pb-20 max-w-7xl mx-auto px-6">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6 shadow-2xs">
              <Sparkles className="w-4 h-4 text-blue-600 animate-spin" style={{ animationDuration: "8s" }} />
              <span>Nền Tảng Quản Trị Tuyển Dụng Thông Minh Thế Hệ Mới</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-slate-900 leading-[1.15] mb-6">
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
                onClick={() => openDemoModalWithTier("Tư Vấn Giải Pháp Doanh Nghiệp")}
                className="w-full sm:w-auto px-8 py-4 text-base font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2.5 group"
              >
                <span>Nhận Tư Vấn & Buổi Demo 1:1</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <a
                href="#preview"
                className="w-full sm:w-auto px-8 py-4 text-base font-semibold rounded-xl bg-white hover:bg-slate-50 active:scale-98 text-slate-700 border border-slate-300 shadow-2xs transition-all inline-flex items-center justify-center"
              >
                Xem Trải Nghiệm Thực Tế
              </a>
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

        {/* SECTION 1: BUSINESS IMPACT & ROI */}
        <section id="value" className="py-20 bg-white border-y border-slate-200/80">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
                Giá Trị Thực Tiễn
              </span>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mt-4 mb-4">
                Chuyển Đổi Hiệu Quả Tuyển Dụng Bằng Số Liệu Đo Lường Cụ Thể
              </h2>
              <p className="text-slate-600 text-base leading-relaxed">
                Giúp đội ngũ nhân sự thoát khỏi các tác vụ thủ công lặp lại để tập trung vào việc tương tác, thu hút và giữ chân nhân tài chất lượng cao.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200 text-center hover:-translate-y-1.5 hover:shadow-xl hover:border-blue-400/40 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-200 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-2">-70%</div>
                <h4 className="text-base font-semibold text-slate-900 mb-1">Thời Gian Lọc Hồ Sơ</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tự động phân loại và đọc hiểu hàng trăm CV trong vài phút thay vì hàng tuần làm thủ công.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200 text-center hover:-translate-y-1.5 hover:shadow-xl hover:border-blue-400/40 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-200 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-2">3.5x</div>
                <h4 className="text-base font-semibold text-slate-900 mb-1">Tốc Độ Đóng Vị Trí</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Rút ngắn chu kỳ tuyển dụng từ khi đăng tin đến khi gửi thư mời nhận việc (Offer letter).
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200 text-center hover:-translate-y-1.5 hover:shadow-xl hover:border-blue-400/40 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-200 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-2">95%</div>
                <h4 className="text-base font-semibold text-slate-900 mb-1">Độ Chính Xác Phù Hợp</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Đối khớp năng lực ứng viên chính xác với yêu cầu công việc, giảm thiểu tỷ lệ tuyển sai người.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200 text-center hover:-translate-y-1.5 hover:shadow-xl hover:border-blue-400/40 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-200 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-2">100%</div>
                <h4 className="text-base font-semibold text-slate-900 mb-1">Bảo Mật & Riêng Tư</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Không gian dữ liệu độc lập cho từng công ty, tuyệt đối không chia sẻ dữ liệu nhân sự ra bên ngoài.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: INTERACTIVE DEEP DIVE PREVIEW TABS */}
        <section id="preview" className="py-24 max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
              Trải Nghiệm Tính Năng
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mt-4 mb-4">
              Khám Phá Sức Mạnh Tuyển Dụng AI Trực Quan
            </h2>
            <p className="text-slate-600 text-base">
              Lựa chọn từng giai đoạn tuyển dụng bên dưới để xem cách AI tự động hóa và hỗ trợ đội ngũ HR của bạn:
            </p>

            {/* Interactive Tab Switcher */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-8 p-1.5 rounded-2xl bg-slate-200/70 max-w-xl mx-auto">
              <button
                onClick={() => setActiveTab("screening")}
                className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === "screening"
                    ? "bg-white text-blue-700 shadow-md shadow-slate-900/5"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
              >
                <FileCheck2 className="w-4 h-4" />
                <span>1. Lọc CV Thông Minh</span>
              </button>
              <button
                onClick={() => setActiveTab("assessment")}
                className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === "assessment"
                    ? "bg-white text-blue-700 shadow-md shadow-slate-900/5"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
              >
                <Code2 className="w-4 h-4" />
                <span>2. Đánh Giá Kỹ Thuật</span>
              </button>
              <button
                onClick={() => setActiveTab("interview")}
                className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === "interview"
                    ? "bg-white text-blue-700 shadow-md shadow-slate-900/5"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
              >
                <Mic className="w-4 h-4" />
                <span>3. Phỏng Vấn Giọng Nói AI</span>
              </button>
            </div>
          </div>

          {/* Tab Content Display Card */}
          <div className="max-w-4xl mx-auto rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-900/5 p-6 sm:p-10 transition-all duration-300">
            {activeTab === "screening" && (
              <div className="grid md:grid-cols-12 gap-8 items-center animate-fade-in">
                <div className="md:col-span-6 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" /> AI Parsing & Match Scoring
                  </div>
                  <h3 className="text-2xl font-semibold text-slate-900">
                    Tự động bóc tách & xếp hạng hồ sơ trong 1 giây
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    AI tự động đọc hiểu mọi file CV (PDF, DOCX), trích xuất chính xác số năm kinh nghiệm, bộ kỹ năng kỹ thuật và đối khớp thông minh với bản Mô tả công việc (JD).
                  </p>
                  <ul className="space-y-2.5 text-xs text-slate-700 font-medium pt-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Tự động loại bỏ hồ sơ rác, phát hiện từ khóa spam
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Đề xuất Top 10% ứng viên sáng giá nhất vào vòng tiếp
                    </li>
                  </ul>
                </div>
                <div className="md:col-span-6 bg-slate-50 rounded-xl p-5 border border-slate-200 font-sans text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center text-xs">
                        NA
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">Nguyễn Tuấn Anh</div>
                        <div className="text-[11px] text-slate-500">Ứng tuyển: Backend Tech Lead</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-blue-600">96 / 100</span>
                      <div className="text-[10px] text-emerald-600 font-semibold">Rất Phù Hợp</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Kỹ năng đối khớp:
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
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
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
                  <h3 className="text-2xl font-semibold text-slate-900">
                    Đánh giá năng lực thực chiến & Chống gian lận
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Hệ thống bài thi trắc nghiệm chuyên sâu và bài tập lập trình tương tác. Tự động biên dịch, chạy TestCase trong môi trường Sandbox độc lập và chấm điểm tức thì.
                  </p>
                  <ul className="space-y-2.5 text-xs text-slate-700 font-medium pt-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Tự động khóa bài và cảnh báo khi phát hiện chuyển tab
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Báo cáo chi tiết độ tối ưu thuật toán (Time & Space Complexity)
                    </li>
                  </ul>
                </div>
                <div className="md:col-span-6 bg-slate-900 rounded-xl p-5 text-white font-mono text-xs shadow-inner">
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
                  <div className="pt-2 border-t border-slate-700 flex items-center justify-between text-[10px] text-slate-400">
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
                  <h3 className="text-2xl font-semibold text-slate-900">
                    Phỏng vấn đàm thoại 24/7 cùng Trợ lý AI
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Ứng viên được phỏng vấn tương tác bằng giọng nói tự nhiên. AI tự động nhận diện âm thanh (Speech-to-Text), phân tích tư duy phản biện và phong thái trả lời.
                  </p>
                  <ul className="space-y-2.5 text-xs text-slate-700 font-medium pt-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Ứng viên chủ động tham gia mọi lúc, không kẹt lịch HR
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Báo cáo chấm điểm chi tiết 5 yếu tố kỹ năng mềm
                    </li>
                  </ul>
                </div>
                <div className="md:col-span-6 bg-slate-50 rounded-xl p-5 border border-slate-200 font-sans text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <span className="font-semibold text-slate-900">AI Voice Session: Đang phỏng vấn</span>
                    </div>
                    <span className="text-slate-500 font-mono text-[11px]">00:04:18</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 mb-3">
                    <div className="text-[11px] font-semibold text-blue-600 mb-1">Câu hỏi từ Trợ lý AI:</div>
                    <p className="text-slate-700 italic">
                      "Hãy chia sẻ cách bạn xử lý khi hệ thống database gặp tắc nghẽn connection pool vào giờ cao điểm?"
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200">
                    <div className="text-[11px] font-semibold text-slate-800 mb-1">
                      Phân tích phản hồi ứng viên:
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                      <span>Độ rõ ràng & mạch lạc</span>
                      <span className="font-semibold text-blue-700">92%</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>Khả năng giải quyết vấn đề</span>
                      <span className="font-semibold text-blue-700">89%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 3: ENTERPRISE DATA PRIVACY & COMPLIANCE */}
        <section id="security" className="py-20 bg-white border-y border-slate-200/80">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
                  An Toàn & Bảo Mật Doanh Nghiệp
                </span>
                <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mt-4 mb-6">
                  Bảo Vệ Dữ Liệu Nhân Sự & Danh Tiếng Doanh Nghiệp
                </h2>
                <p className="text-slate-600 text-base leading-relaxed mb-8">
                  Hồ sơ nhân sự và thông tin ứng viên là tài sản chiến lược của mỗi công ty. Chúng tôi cam kết bảo vệ dữ liệu của bạn bằng các chuẩn mực an ninh thông tin nghiêm ngặt nhất.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Cô Lập Dữ Liệu Tuyệt Đối</h4>
                      <p className="text-xs text-slate-600">Mỗi công ty sở hữu một không gian lưu trữ dữ liệu độc lập hoàn toàn, triệt tiêu mọi rủi ro thất thoát thông tin sang các bên thứ ba.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Tuân Thủ Nghị Định 13/2023/NĐ-CP</h4>
                      <p className="text-xs text-slate-600">Đảm bảo trọn vẹn quyền riêng tư dữ liệu cá nhân của ứng viên theo đúng quy định pháp luật Việt Nam.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Tích Hợp Đăng Nhập Một Lần (SSO)</h4>
                      <p className="text-xs text-slate-600">Đồng bộ thuận tiện và bảo mật với tài khoản doanh nghiệp qua Google Workspace, Microsoft 365, Okta.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 shadow-inner space-y-6">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-400/50 hover:shadow-md transition-all">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500">Tiêu chuẩn bảo mật</span>
                    <h4 className="text-base font-semibold text-slate-900">Mã Hóa Toàn Diện Dữ Liệu Lưu Trữ & Truyền Tải</h4>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-400/50 hover:shadow-md transition-all">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500">Cam kết vận hành</span>
                    <h4 className="text-base font-semibold text-slate-900">Độ Sẵn Sàng Dịch Vụ Ổn Định 99.9%</h4>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-400/50 hover:shadow-md transition-all">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500">Pháp lý vững chắc</span>
                    <h4 className="text-base font-semibold text-slate-900">Ký Kết Thỏa Thuận Bảo Mật Thông Tin (NDA)</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: SOLUTION TIERS */}
        <section id="packages" className="py-24 max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
              Gói Giải Pháp Doanh Nghiệp
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mt-4 mb-4">
              Linh Hoạt Theo Quy Mô & Mục Tiêu Tuyển Dụng
            </h2>
            <p className="text-slate-600 text-base">
              Chúng tôi đồng hành cùng quý doanh nghiệp qua từng bước tư vấn chuyên sâu, thử nghiệm thực tế và ký kết hợp đồng rõ ràng.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 items-stretch">
            {/* TIER 1: PROFESSIONAL */}
            <div className="rounded-2xl bg-white border border-slate-200 p-8 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-semibold text-slate-900">Gói Chuyên Nghiệp</h3>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    Doanh nghiệp tăng trưởng
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-6">Tối ưu cho doanh nghiệp có nhu cầu chuẩn hóa và tự động hóa quy trình tuyển dụng cốt lõi.</p>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6">
                  <span className="text-xs text-slate-500 block mb-1">Quy mô phù hợp</span>
                  <span className="text-sm font-semibold text-slate-900">Từ 50 đến 200 nhân sự</span>
                </div>

                <ul className="space-y-3 text-sm text-slate-600 mb-8">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Không gian làm việc & dữ liệu độc lập</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Tối đa <strong>10 tài khoản Tuyển dụng</strong> (Recruiters)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Sàng lọc <strong>1,500 CVs / tháng</strong> bằng AI</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Cổng thông tin tuyển dụng (Career Site) riêng</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => openDemoModalWithTier("Gói Chuyên Nghiệp (Professional)", "CONTRACT_QUOTE")}
                className="w-full py-3.5 px-4 rounded-lg bg-blue-50 hover:bg-blue-100 active:scale-98 text-blue-700 font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                <span>Nhận Tư Vấn Gói Này</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* TIER 2: ENTERPRISE (HIGHLIGHTED) */}
            <div className="rounded-2xl bg-white border-2 border-blue-600 p-8 flex flex-col justify-between shadow-xl relative hover:-translate-y-2 transition-all duration-300">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-semibold px-3.5 py-1 rounded-full shadow-sm tracking-wide">
                Lựa Chọn Phổ Biến Nhất
              </div>

              <div>
                <div className="flex items-center justify-between mb-3 mt-1">
                  <h3 className="text-xl font-semibold text-slate-900">Gói Doanh Nghiệp</h3>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                    Doanh nghiệp quy mô lớn
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-6">Tối ưu cho tổ chức có nhiều phòng ban, khối lượng ứng viên lớn và yêu cầu tích hợp sâu.</p>

                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 mb-6">
                  <span className="text-xs text-blue-700 block mb-1">Quy mô phù hợp</span>
                  <span className="text-sm font-semibold text-slate-900">Từ 200 đến 1,000+ nhân sự</span>
                </div>

                <ul className="space-y-3 text-sm text-slate-600 mb-8">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span><strong>Không giới hạn</strong> vị trí tuyển dụng</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Tối đa <strong>30 tài khoản Nhà tuyển dụng & Người phỏng vấn</strong></span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Sàng lọc <strong>10,000 CVs / tháng</strong> bằng AI</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span><strong>Trợ lý phỏng vấn AI bằng giọng nói</strong></span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Hỗ trợ tích hợp <strong>Đăng nhập một lần (SSO)</strong></span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => openDemoModalWithTier("Gói Doanh Nghiệp (Enterprise)", "CONTRACT_QUOTE")}
                className="w-full py-3.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Đăng Ký Tư Vấn Doanh Nghiệp</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* TIER 3: CUSTOM / SOVEREIGN */}
            <div className="rounded-2xl bg-white border border-slate-200 p-8 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-semibold text-slate-900">Gói Tùy Biến Chuyên Sâu</h3>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    Tập đoàn & Tổ chức tài chính
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-6">Dành cho các đơn vị có yêu cầu riêng biệt về hạ tầng máy chủ nội bộ hoặc chính sách bảo mật đặc thù.</p>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6">
                  <span className="text-xs text-slate-500 block mb-1">Mô hình triển khai</span>
                  <span className="text-sm font-semibold text-slate-900">Tùy biến theo hạ tầng riêng của công ty</span>
                </div>

                <ul className="space-y-3 text-sm text-slate-600 mb-8">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Lưu trữ dữ liệu trên <strong>cụm máy chủ riêng của doanh nghiệp</strong></span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span><strong>Không giới hạn</strong> số lượng tài khoản & hồ sơ tuyển dụng</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Tùy biến tiêu chí chấm điểm và quy trình theo đặc thù công ty</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Đội ngũ chuyên gia kỹ thuật hỗ trợ chuyên trách 24/7</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => openDemoModalWithTier("Gói Tùy Biến Chuyên Sâu (Custom Solution)", "CONTRACT_QUOTE")}
                className="w-full py-3.5 px-4 rounded-lg bg-blue-50 hover:bg-blue-100 active:scale-98 text-blue-700 font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                <span>Liên Hệ Đội Ngũ Chuyên Gia</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 5: INTERACTIVE FAQ ACCORDION */}
        <section className="py-20 bg-white border-t border-slate-200/80">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-14">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
                Hỏi Đáp Thường Gặp
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900 mt-4 mb-3">
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
                      <div className={`w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180 bg-blue-50 text-blue-600" : "text-slate-400"}`}>
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
                onClick={() => openDemoModalWithTier("Tư Vấn Giải Pháp Doanh Nghiệp")}
                className="w-full sm:w-auto px-8 py-4 text-base font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-xl shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
              >
                <span>Đặt Lịch Tư Vấn 1:1 Cùng Chuyên Gia</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowWorkspaceModal(true)}
                className="w-full sm:w-auto px-8 py-4 text-base font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-200 border border-slate-700 transition-all"
              >
                Vào Không Gian Làm Việc
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 py-12 bg-white text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <span className="font-semibold text-slate-900 text-base">SmartHire.AI Enterprise</span>
              </div>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Nền tảng quản trị tuyển dụng thông minh hàng đầu dành cho doanh nghiệp, tối ưu hóa thời gian và gia tăng chất lượng tuyển dụng nhân tài.
              </p>
            </div>

            <div>
              <h5 className="font-semibold text-slate-900 text-sm mb-3">Thông Tin Giải Pháp</h5>
              <ul className="space-y-2 text-xs">
                <li><a href="#value" className="hover:text-blue-600 transition-colors">Hiệu Quả & Chỉ Số Tuyển Dụng</a></li>
                <li><a href="#preview" className="hover:text-blue-600 transition-colors">Trải Nghiệm Tính Năng Trực Quan</a></li>
                <li><a href="#security" className="hover:text-blue-600 transition-colors">Bảo Vệ Dữ Liệu & Nghị Định 13</a></li>
                <li><a href="#packages" className="hover:text-blue-600 transition-colors">Các Gói Giải Pháp Doanh Nghiệp</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-semibold text-slate-900 text-sm mb-3">Dành Cho Khách Hàng</h5>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    onClick={() => setShowWorkspaceModal(true)}
                    className="hover:text-blue-600 transition-colors text-left"
                  >
                    Vào Không Gian Làm Việc (Workspace)
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/admin/login")}
                    className="hover:text-blue-600 transition-colors text-left flex items-center gap-1 font-medium text-blue-600"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Cổng Quản Trị Hệ Thống (Master Admin)</span>
                  </button>
                </li>
                <li>
                  <a href="mailto:contact@smarthire.top" className="hover:text-blue-600 transition-colors">
                    contact@smarthire.top
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© 2026 SmartHire.AI Enterprise. Bản quyền thuộc về nền tảng SmartHire-AI.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-blue-600 transition-colors">Điều khoản sử dụng</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Chính sách bảo mật dữ liệu</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Hỗ trợ khách hàng</a>
            </div>
          </div>
        </div>
      </footer>

      {/* MODAL 1: ENTERPRISE DEMO & CONSULTATION REQUEST */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-lg w-full text-left shadow-2xl relative my-8">
            <button
              onClick={() => setShowDemoModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"
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
                    onClick={() => setRequestType("DEMO")}
                    className={`flex-1 py-1.5 rounded-md transition-all ${requestType === "DEMO" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                  >
                    Đặt Lịch Demo 1:1
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestType("CONTRACT_QUOTE")}
                    className={`flex-1 py-1.5 rounded-md transition-all ${requestType === "CONTRACT_QUOTE" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
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
                        className={`w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border text-sm text-slate-900 focus:bg-white focus:outline-none transition-colors ${isPersonalEmail(formData.workEmail)
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
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Đã Tiếp Nhận Thông Tin!</h3>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  Cảm ơn Quý doanh nghiệp <strong>{formData.companyName}</strong>. Chuyên viên giải pháp của SmartHire-AI sẽ liên hệ trực tiếp qua email <strong>{formData.workEmail}</strong> và số điện thoại <strong>{formData.phoneNumber}</strong> trong vòng 2 giờ làm việc.
                </p>
                <button
                  onClick={() => setShowDemoModal(false)}
                  className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Đóng Cửa Sổ
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: TENANT WORKSPACE LOCATOR ("ĐĂNG NHẬP WORKSPACE") */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-md w-full text-left shadow-2xl relative">
            <button
              onClick={() => setShowWorkspaceModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-5 font-semibold border border-blue-200">
              <Building2 className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-semibold text-slate-900 mb-1">
              Đăng Nhập Không Gian Tuyển Dụng
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Nhập Tên miền phụ (Subdomain) hoặc Mã không gian làm việc của công ty bạn để truy cập vào cổng tuyển dụng riêng.
            </p>

            <form onSubmit={handleSubdomainLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1.5">
                  Mã hoặc Tên Không Gian Làm Việc
                </label>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:border-blue-600 transition-colors">
                  <input
                    type="text"
                    required
                    placeholder="viettel"
                    value={tenantCodeInput}
                    onChange={(e) => setTenantCodeInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-slate-900 font-mono text-sm focus:outline-none"
                  />
                  <span className="bg-slate-100 text-slate-500 px-3.5 py-2.5 text-xs font-mono border-l border-slate-300 flex items-center">
                    .smarthire.top
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-semibold text-sm shadow transition-all flex items-center justify-center gap-2"
              >
                <span>Đến Trang Đăng Nhập Riêng</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* QUICK SEED WORKSPACE SELECTOR */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2.5">
                Hoặc trải nghiệm nhanh không gian mẫu:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDirectTenantJump("se36")}
                  className="px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 text-xs font-mono text-slate-700 transition-colors text-center active:scale-95"
                >
                  se36
                </button>
                <button
                  type="button"
                  onClick={() => handleDirectTenantJump("se37")}
                  className="px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 text-xs font-mono text-slate-700 transition-colors text-center active:scale-95"
                >
                  se37
                </button>
              </div>
            </div>

            {/* LINK TO MASTER PLATFORM LOGIN */}
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => {
                  setShowWorkspaceModal(false);
                  navigate("/admin/login");
                }}
                className="text-xs text-slate-500 hover:text-blue-600 inline-flex items-center gap-1.5 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Quản trị viên nền tảng? Đăng nhập Workspace Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
