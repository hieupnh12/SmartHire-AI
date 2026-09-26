import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { getTenantTheme, getTenantThemeStyle } from "@/lib/tenantTheme";
import { jobApi } from "@/api/tenant/jobApi";
import { applicantApi } from "@/api/tenant/applicantApi";
import { landingApi } from "@/api/tenant/landingApi";
import { cvApi } from "@/api/tenant/cvApi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import {
  Search,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  LogIn,
  Upload,
  X,
  Code,
  Cpu,
  Layers,
  HeartHandshake,
  Users,
  Award,
  Zap,
  Globe,
  Briefcase,
  ShieldCheck,
  Laptop,
  TrendingUp,
  Coffee,
  Mail,
  Phone,
  Building,
  Linkedin,
  Facebook,
  Github,
} from "lucide-react";

interface JobPosting {
  id: number;
  title: string;
  department: string;
  location: string;
  type: string;
  salary: string;
  tags: string[];
  description: string;
  requirements: string[];
}

const ICON_MAP: Record<string, React.ElementType> = {
  Users,
  Award,
  Globe,
  Zap,
  Briefcase,
  HeartHandshake,
  Laptop,
  TrendingUp,
  Coffee,
  ShieldCheck,
  CheckCircle2,
  Code,
  Layers,
  Cpu,
};

function renderIcon(name: string, className?: string) {
  const IconComponent = ICON_MAP[name] || Sparkles;
  return <IconComponent className={className || "w-5 h-5"} />;
}

export function TenantCareerPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "home";
  const rawTenantCode = getTenantIdFromWindow() || "acme";
  const theme = getTenantTheme(rawTenantCode);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [showApplyModal, setShowApplyModal] = useState<JobPosting | null>(null);

  // Apply Form State
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidatePhone, setCandidatePhone] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [applySubmitted, setApplySubmitted] = useState(false);

  const token = useAuthStore((s) => s.accessToken);
  const publicJobs = useQuery({ queryKey: ["public-jobs"], queryFn: () => jobApi.publicList() });
  const publicLanding = useQuery({
    queryKey: ["public-landing", rawTenantCode],
    queryFn: () => landingApi.getPublicLanding(),
  });

  const customLanding = publicLanding.data?.data;

  // Dynamic Theme & Palette
  const primaryColor = customLanding?.theme?.primaryColor || theme.primary;
  const primaryHover = customLanding?.theme?.primaryHover || theme.primaryHover;
  const isDarkHero = customLanding?.theme?.darkModeHero !== false;

  const dynamicThemeStyle = useMemo(() => {
    const baseStyle = getTenantThemeStyle(theme);
    return {
      ...baseStyle,
      "--color-primary": primaryColor,
      "--color-primary-hover": primaryHover,
      "--color-brand-primary": primaryColor,
      "--color-brand-primary-hover": primaryHover,
      fontFamily: customLanding?.theme?.fontFamily || "inherit",
    } as React.CSSProperties;
  }, [theme, customLanding, primaryColor, primaryHover]);

  const jobsList: JobPosting[] = (publicJobs.data?.data ?? []).map((job) => ({
    id: job.id,
    title: job.title,
    department: job.department || "General",
    location: [job.location, job.workMode].filter(Boolean).join(" / ") || "Flexible",
    type: job.employmentType || "FULL_TIME",
    salary: job.salary || "Thỏa thuận",
    tags: job.skills,
    description: job.description,
    requirements: [
      job.minYearsExperience ? `${job.minYearsExperience}+ năm kinh nghiệm` : "",
      job.educationLevel || "",
      job.responsibilities || "",
    ].filter(Boolean),
  }));

  const filteredJobs = jobsList.filter((j) => {
    const matchSearch =
      j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchDept = selectedDepartment === "ALL" || j.department === selectedDepartment;
    return matchSearch && matchDept;
  });

  const departments = ["ALL", ...new Set(jobsList.map((job) => job.department))];

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showApplyModal) return;
    if (!token) {
      navigate("/candidate/login");
      return;
    }
    const jobId = showApplyModal.id;
    const file = cvFile;
    void applicantApi.apply(jobId, { source: "CAREER" }).catch((err: unknown) => {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      if (code !== "APPLICATION_EXISTS") throw err;
    }).then(async () => {
      if (file) {
        const form = new FormData();
        form.append("file", file);
        form.append("jobId", String(jobId));
        await cvApi.upload(form);
      }
      setApplySubmitted(true);
      setTimeout(() => {
        setApplySubmitted(false);
        setShowApplyModal(null);
        setCandidateName("");
        setCandidateEmail("");
        setCandidatePhone("");
        setCvFile(null);
        navigate("/candidate/cv");
      }, 1200);
    }).catch((err: unknown) => {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      if (code === "APPLICATION_EXISTS") navigate("/candidate/cv");
    });
  };

  if (publicLanding.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-cyan-500 animate-spin" />
          <p className="text-slate-500 text-sm font-medium animate-pulse">Đang tải cấu hình trang...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="tenant-workspace-theme min-h-screen bg-[#f9f9ff] text-[#191b23] font-sans antialiased flex flex-col justify-between"
      style={dynamicThemeStyle}
    >
      {/* Top Glassmorphism Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-[#e2e8f0] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
            <div
              className="w-10 h-10 rounded-[12px] text-white flex items-center justify-center shadow-md font-semibold text-lg"
              style={{ backgroundColor: primaryColor }}
            >
              {theme.code.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="text-xl font-semibold font-display text-[#1e293b] tracking-tight">
                {theme.name}
              </span>
              <span
                className="ml-2.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border"
                style={{
                  backgroundColor: `${primaryColor}15`,
                  color: primaryColor,
                  borderColor: `${primaryColor}30`,
                }}
              >
                {theme.accentBadge}
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#475569]">
            <button onClick={() => setSearchParams({ tab: 'home' })} className={`hover:text-slate-900 transition-colors ${activeTab === 'home' ? 'text-slate-900 font-bold' : ''}`}>
              Trang Chủ
            </button>
            {customLanding?.techStack?.enabled !== false && (
              <button onClick={() => setSearchParams({ tab: 'techstack' })} className={`hover:text-slate-900 transition-colors ${activeTab === 'techstack' ? 'text-slate-900 font-bold' : ''}`}>
                Công Nghệ
              </button>
            )}
            <button onClick={() => setSearchParams({ tab: 'jobs' })} className={`hover:text-slate-900 transition-colors ${activeTab === 'jobs' ? 'text-slate-900 font-bold' : ''}`}>
              Vị Trí Tuyển Dụng
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            <button
              onClick={() => navigate("/candidate/login")}
              className="px-5 py-2.5 text-sm font-semibold rounded-[8px] text-white transition-all flex items-center gap-2 shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng Nhập</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {activeTab === "home" && (
          <>
        {/* HERO SECTION WITH DYNAMIC BANNER */}
        <section className="relative pt-12 pb-24 max-w-7xl mx-auto px-6">
          <div
            className={`relative overflow-hidden border border-[#e2e8f0] shadow-2xl ${
              customLanding?.theme?.borderRadius || "rounded-[32px]"
            }`}
            style={{
              minHeight: customLanding?.hero?.bannerHeight || "540px",
              backgroundColor: isDarkHero ? "#020617" : "#ffffff",
            }}
          >
            {/* Background Image */}
            <img
              src={customLanding?.hero?.bannerImageUrl || theme.heroImage || "/acme_tech_hero.png"}
              alt={theme.name}
              className={`absolute inset-0 w-full h-full object-cover object-center scale-105 transition-transform duration-1000 hover:scale-100 ${
                customLanding?.hero?.bannerImageUrl ? "" : "opacity-40 mix-blend-luminosity"
              }`}
            />

            {/* Ambient Lighting & Glass Layer */}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: isDarkHero ? "#020617" : "#ffffff",
                opacity: (customLanding?.hero?.overlayOpacity ?? 75) / 100,
              }}
            />

            <div
              className={`relative z-10 p-8 sm:p-14 md:p-20 max-w-4xl ${
                isDarkHero ? "text-white" : "text-slate-900"
              }`}
            >

              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-md border text-xs font-semibold mb-6"
                style={{
                  backgroundColor: isDarkHero ? "rgba(255,255,255,0.12)" : `${primaryColor}15`,
                  borderColor: isDarkHero ? "rgba(255,255,255,0.2)" : `${primaryColor}30`,
                  color: isDarkHero ? "#67e8f9" : primaryColor,
                }}
              >
                <span>{customLanding?.hero?.badgeText || theme.tagline || "Dẫn đầu Giải pháp Công nghệ"}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-display tracking-tight leading-tight mb-6">
                {customLanding?.hero?.title || `Chinh Phục Tương Lai Công Nghệ Cùng ${theme.name}`}
                {customLanding?.hero?.highlightWords && (
                  <span className="block bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent mt-2">
                    {customLanding.hero.highlightWords}
                  </span>
                )}
              </h1>

              <p
                className={`text-base sm:text-lg mb-10 leading-relaxed max-w-2xl font-normal ${
                  isDarkHero ? "text-slate-300" : "text-slate-600"
                }`}
              >
                {customLanding?.hero?.subtitle ||
                  "Gia nhập đội ngũ kỹ sư tài năng tại môi trường làm việc chuẩn quốc tế. Cùng chúng tôi kiến tạo các sản phẩm công nghệ đột phá và khai phóng tối đa tiềm năng của bạn."}
              </p>

              {/* Job Search Bar */}
              {(customLanding?.hero?.showSearchBar !== false) && (
                <div className="max-w-2xl bg-white/95 backdrop-blur-md p-3 rounded-[18px] border border-white/20 shadow-2xl flex flex-col sm:flex-row items-center gap-3 mb-6">
                  <div className="flex-1 flex items-center gap-3 px-3 w-full">
                    <Search className="w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm vị trí tuyển dụng, kỹ năng..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full text-sm text-slate-900 focus:outline-none bg-transparent placeholder-slate-400 font-medium"
                    />
                  </div>

                  <button
                    onClick={() => setSearchParams({ tab: 'jobs' })}
                    className="w-full sm:w-auto px-7 py-3 rounded-[10px] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <span>{customLanding?.hero?.primaryCtaText || "Xem Vị Trí Tuyển Dụng"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSearchParams({ tab: 'jobs' })}
                  className="px-7 py-3 rounded-[10px] text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span>{customLanding?.hero?.primaryCtaText || "Xem Vị Trí Tuyển Dụng"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {customLanding?.hero?.secondaryCtaText && (
                  <button
                    onClick={() => {
                      const link = customLanding.hero.secondaryCtaLink || "about";
                      setSearchParams({ tab: link.replace("#", "") });
                    }}
                    className={`px-6 py-3 rounded-[10px] font-semibold text-sm transition-all border ${
                      isDarkHero
                        ? "border-white/30 text-white hover:bg-white/10"
                        : "border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                    }`}
                  >
                    {customLanding.hero.secondaryCtaText}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
        </>
        )}

        {/* COMPANY CULTURE & NUMBERS SHOWCASE */}
        {activeTab === "home" && customLanding?.about?.enabled !== false && (
          <section id="about" className="py-20 bg-white border-y border-[#e2e8f0]">
            <div className="max-w-7xl mx-auto px-6">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Culture Image */}
                <div className="relative rounded-[28px] overflow-hidden border border-[#e2e8f0] shadow-xl group">
                  <img
                    src={customLanding?.about?.cultureImageUrl || theme.cultureImage || "/acme_culture.png"}
                    alt="Văn hóa công ty"
                    className="w-full h-[420px] object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-8">
                    <div className="text-white space-y-1">
                      <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider block">
                        Văn Hóa Làm Việc Agile
                      </span>
                      <h3 className="text-xl font-semibold font-display">
                        Tự Do Sáng Tạo & Phát Triển Sự Nghiệp IT
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Content & Stats */}
                <div className="space-y-6">
                  <div>
                    <span
                      className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border"
                      style={{
                        backgroundColor: `${primaryColor}15`,
                        color: primaryColor,
                        borderColor: `${primaryColor}30`,
                      }}
                    >
                      {customLanding?.about?.badge || "Về Chúng Tôi"}
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-semibold font-display text-[#1e293b] mt-3 mb-4">
                      {customLanding?.about?.title || `Vì Sao Bạn Nên Chọn ${theme.name}?`}
                    </h2>
                    <p className="text-[#64748b] text-sm leading-relaxed whitespace-pre-line">
                      {customLanding?.about?.description ||
                        `Tại ${theme.name}, chúng tôi tin rằng con người là tài sản quý giá nhất. Đội ngũ Kỹ sư làm việc trong môi trường cởi mở, áp dụng quy trình Agile/Scrum tiêu chuẩn toàn cầu, liên tục tiếp cận các bài toán Enterprise thách thức.`}
                    </p>
                  </div>

                  {/* Numbers Grid */}
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    {(customLanding?.about?.stats && customLanding.about.stats.length > 0
                      ? customLanding.about.stats
                      : [
                          { icon: "Users", value: "500+", label: "Kỹ Sư Phần Mềm & AI" },
                          { icon: "Zap", value: "99.99%", label: "SLA Enterprise High Availability" },
                          { icon: "Award", value: "100%", label: "Tài Trợ Chứng Chỉ AWS/GCP" },
                          { icon: "Globe", value: "Global", label: "Dự Án Enterprise Quốc Tế" },
                        ]
                    ).map((st, i) => (
                      <div
                        key={i}
                        className="p-5 rounded-[16px] bg-[#f8f9ff] border border-[#e2e8f0]"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div style={{ color: primaryColor }}>{renderIcon(st.icon)}</div>
                          <span className="text-2xl font-bold text-[#1e293b]">{st.value}</span>
                        </div>
                        <span className="text-xs text-[#64748b]">{st.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* PERKS & BENEFITS SECTION */}
        {activeTab === "home" && customLanding?.benefits?.enabled !== false && (
          <section id="benefits" className="py-20 bg-[#f8f9ff] border-b border-[#e2e8f0]">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center max-w-2xl mx-auto mb-14">
                <span
                  className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border"
                  style={{
                    backgroundColor: `${primaryColor}15`,
                    color: primaryColor,
                    borderColor: `${primaryColor}30`,
                  }}
                >
                  {customLanding?.benefits?.badge || "Đãi Ngộ"}
                </span>
                <h2 className="text-3xl font-semibold font-display text-[#1e293b] mt-3 mb-2">
                  {customLanding?.benefits?.title || "Chế Độ Đãi Ngộ & Phúc Lợi Toàn Diện"}
                </h2>
                <p className="text-[#64748b] text-sm">
                  {customLanding?.benefits?.subtitle ||
                    "Chúng tôi chăm sóc toàn diện cho sức khỏe, sự nghiệp và đời sống tinh thần của bạn"}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {(customLanding?.benefits?.items && customLanding.benefits.items.length > 0
                  ? customLanding.benefits.items
                  : [
                      {
                        icon: "HeartHandshake",
                        title: "Chăm Sóc Sức Khỏe Toàn Diện",
                        description:
                          "Bảo hiểm sức khỏe cao cấp cho nhân viên và người thân, khám sức khỏe định kỳ hàng năm.",
                      },
                      {
                        icon: "Laptop",
                        title: "Thiết Bị Làm Việc Hiện Đại",
                        description:
                          "Trang bị Macbook Pro / Laptop cấu hình cao cùng màn hình 4K và trợ cấp setup góc làm việc.",
                      },
                      {
                        icon: "TrendingUp",
                        title: "Đào Tạo & Phát Triển Chuyên Sâu",
                        description:
                          "Ngân sách học tập cá nhân, hỗ trợ thi chứng chỉ quốc tế và các buổi tech-talk chia sẻ nội bộ.",
                      },
                      {
                        icon: "Coffee",
                        title: "Cân Bằng Cuộc Sống & Thưởng Hiệu Suất",
                        description:
                          "Lương tháng 13, thưởng dự án, ngày nghỉ phép linh hoạt và tiệc teambuilding định kỳ.",
                      },
                    ]
                ).map((b, i) => (
                  <div
                    key={i}
                    className="p-6 rounded-[24px] bg-white border border-[#e2e8f0] shadow-sm hover:shadow-md transition-all"
                  >
                    <div
                      className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                    >
                      {renderIcon(b.icon, "w-6 h-6")}
                    </div>
                    <h3 className="font-semibold text-[#1e293b] text-base mb-2">{b.title}</h3>
                    <p className="text-xs text-[#64748b] leading-relaxed">{b.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* TECH STACK GRID SECTION */}
        {(activeTab === "home" || activeTab === "techstack") && customLanding?.techStack?.enabled !== false && (
          <section id="techstack" className="py-20 bg-white border-b border-[#e2e8f0]">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center max-w-2xl mx-auto mb-14">
                <span
                  className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border"
                  style={{
                    backgroundColor: `${primaryColor}15`,
                    color: primaryColor,
                    borderColor: `${primaryColor}30`,
                  }}
                >
                  {customLanding?.techStack?.badge || "Hệ Sinh Thái Core"}
                </span>
                <h2 className="text-3xl font-semibold font-display text-[#1e293b] mt-3 mb-2">
                  {customLanding?.techStack?.title || "Hệ Sinh Thái Công Nghệ Core"}
                </h2>
                <p className="text-[#64748b] text-sm">
                  {customLanding?.techStack?.subtitle ||
                    "Các công nghệ tiên tiến đang được áp dụng trực tiếp tại các dự án."}
                </p>
              </div>

              {/* 4 Iconic Tech Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="p-6 rounded-[24px] bg-[#f8f9ff] border border-[#e2e8f0] shadow-sm hover:shadow-md transition-all text-center">
                  <div
                    className="w-12 h-12 rounded-[14px] flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                  >
                    <Code className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-[#1e293b] text-base mb-1">Backend Microservices</h3>
                  <p className="text-xs text-[#64748b]">Java 21, Spring Boot 3, Hibernate Multi-Tenancy, MySQL Separate DB.</p>
                </div>

                <div className="p-6 rounded-[24px] bg-[#f8f9ff] border border-[#e2e8f0] shadow-sm hover:shadow-md transition-all text-center">
                  <div className="w-12 h-12 rounded-[14px] bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto mb-4">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-[#1e293b] text-base mb-1">Modern Web Frontend</h3>
                  <p className="text-xs text-[#64748b]">React 19, TypeScript, Vite, Zustand, Tailwind CSS, TanStack Query.</p>
                </div>

                <div className="p-6 rounded-[24px] bg-[#f8f9ff] border border-[#e2e8f0] shadow-sm hover:shadow-md transition-all text-center">
                  <div className="w-12 h-12 rounded-[14px] bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-[#1e293b] text-base mb-1">AI CV & Voice Engine</h3>
                  <p className="text-xs text-[#64748b]">Python PyTorch, Whisper STT, NLP Parsing & Matching Score Model.</p>
                </div>

                <div className="p-6 rounded-[24px] bg-[#f8f9ff] border border-[#e2e8f0] shadow-sm hover:shadow-md transition-all text-center">
                  <div className="w-12 h-12 rounded-[14px] bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                    <HeartHandshake className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-[#1e293b] text-base mb-1">Cloud & Async Queue</h3>
                  <p className="text-xs text-[#64748b]">Google Cloud VPS, Docker, Kubernetes, Redis, RabbitMQ Worker Pool.</p>
                </div>
              </div>

              {/* Dynamic Tech Tags */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-4xl mx-auto pt-2">
                {(customLanding?.techStack?.tags && customLanding.techStack.tags.length > 0
                  ? customLanding.techStack.tags
                  : [
                      "Java 21",
                      "Spring Boot",
                      "React 19",
                      "TypeScript",
                      "Docker",
                      "Kubernetes",
                      "Redis",
                      "RabbitMQ",
                      "MySQL",
                      "Whisper AI",
                      "Tailwind CSS",
                    ]
                ).map((tag, i) => (
                  <span
                    key={i}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 shadow-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* TESTIMONIALS SECTION */}
        {(activeTab === "home") && customLanding?.testimonials?.enabled !== false && (
          <section className="py-20 bg-[#f8f9ff] border-b border-[#e2e8f0]">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center max-w-2xl mx-auto mb-14">
                <span
                  className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border"
                  style={{
                    backgroundColor: `${primaryColor}15`,
                    color: primaryColor,
                    borderColor: `${primaryColor}30`,
                  }}
                >
                  {customLanding?.testimonials?.badge || "Chia Sẻ"}
                </span>
                <h2 className="text-3xl font-semibold font-display text-[#1e293b] mt-3">
                  {customLanding?.testimonials?.title || "Đánh Giá Từ Đội Ngũ Kỹ Sư"}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {(customLanding?.testimonials?.items && customLanding.testimonials.items.length > 0
                  ? customLanding.testimonials.items
                  : [
                      {
                        name: "Minh Quân",
                        role: "Senior Software Engineer",
                        avatarUrl: "",
                        quote: `Môi trường tại ${theme.name} mang lại cho tôi cơ hội làm việc với các hệ thống phân tán lớn và học hỏi liên tục từ các đồng nghiệp tài năng.`,
                      },
                      {
                        name: "Thu Hà",
                        role: "Tech Lead / Architect",
                        avatarUrl: "",
                        quote:
                          "Văn hóa trao quyền và tôn trọng ý tưởng mới là điều tôi yêu thích nhất ở đây. Bạn luôn có không gian để tạo ra đột phá và nâng tầm giải pháp.",
                      },
                    ]
                ).map((item, i) => (
                  <div
                    key={i}
                    className="p-8 rounded-[24px] bg-white border border-[#e2e8f0] shadow-sm flex flex-col justify-between"
                  >
                    <p className="text-sm text-slate-700 italic mb-6 leading-relaxed">
                      "{item.quote}"
                    </p>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {item.avatarUrl ? (
                          <img
                            src={item.avatarUrl}
                            alt={item.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          item.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500">{item.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* JOB POSITIONS SECTION */}
        {(activeTab === "home" || activeTab === "jobs") && (
        <section id="jobs" className="py-20 max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span
                className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border"
                style={{
                  backgroundColor: `${primaryColor}15`,
                  color: primaryColor,
                  borderColor: `${primaryColor}30`,
                }}
              >
                Cơ Hội Nghề Nghiệp
              </span>
              <h2 className="text-3xl font-semibold font-display text-[#1e293b] mt-3 mb-2">
                Các Vị Trí Đang Tuyển Dụng
              </h2>
              <p className="text-[#64748b] text-sm">
                Tìm kiếm vị trí phù hợp với năng lực kỹ thuật và mục tiêu sự nghiệp của bạn.
              </p>
            </div>

            {/* Department Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDepartment(dept)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                    selectedDepartment === dept
                      ? "text-white shadow-sm"
                      : "bg-white text-[#64748b] border border-[#e2e8f0] hover:bg-[#f8f9ff]"
                  }`}
                  style={selectedDepartment === dept ? { backgroundColor: primaryColor } : undefined}
                >
                  {dept === "ALL" ? "Tất Cả Phòng Ban" : dept}
                </button>
              ))}
            </div>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-[24px] border border-[#e2e8f0] p-8">
              <Briefcase className="w-12 h-12 text-[#94a3b8] mx-auto mb-3 opacity-60" />
              <h3 className="font-semibold text-lg text-[#1e293b]">Chưa có vị trí tuyển dụng phù hợp</h3>
              <p className="text-xs text-[#64748b] mt-1 max-w-sm mx-auto">
                Hiện tại phòng ban này chưa mở đợt tuyển mới hoặc không khớp với từ khóa tìm kiếm. Vui lòng thử lại sau!
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-6 rounded-[24px] bg-white border border-[#e2e8f0] shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-semibold text-[#64748b] px-2.5 py-1 rounded-[6px] bg-[#f8f9ff] border border-[#e2e8f0]">
                        {job.department}
                      </span>
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                        {job.salary}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-[#1e293b] mb-2 hover:underline cursor-pointer" onClick={() => setSelectedJob(job)}>
                      {job.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748b] mb-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{job.type}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {job.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#f1f5f9] text-[#475569]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-[#e2e8f0]">
                    <button
                      onClick={() => setSelectedJob(job)}
                      className="flex-1 py-2 rounded-[8px] text-xs font-semibold text-[#475569] hover:bg-[#f1f5f9] transition-colors"
                    >
                      Chi Tiết
                    </button>
                    <button
                      onClick={() => setShowApplyModal(job)}
                      className="flex-1 py-2 rounded-[8px] text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <span>Ứng Tuyển</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        )}
      </main>

      {/* JOB DETAIL MODAL */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedJob(null)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="pr-8">
              <span className="text-xs font-semibold text-[#64748b] px-2.5 py-1 rounded-[6px] bg-[#f8f9ff] border border-[#e2e8f0] inline-block mb-2">
                {selectedJob.department}
              </span>
              <h2 className="text-2xl font-bold text-[#1e293b] mb-2">{selectedJob.title}</h2>
              <div className="flex flex-wrap gap-4 text-xs text-[#64748b] mb-6">
                <span>📍 {selectedJob.location}</span>
                <span>⏰ {selectedJob.type}</span>
                <span className="text-emerald-600 font-semibold">💰 {selectedJob.salary}</span>
              </div>
            </div>

            <div className="space-y-6 text-sm text-slate-700">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Mô tả công việc</h4>
                <p className="whitespace-pre-line leading-relaxed text-slate-600">{selectedJob.description}</p>
              </div>

              {selectedJob.requirements.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Yêu cầu ứng viên</h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-600">
                    {selectedJob.requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-5 py-2.5 text-xs font-semibold rounded-[8px] text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setShowApplyModal(selectedJob);
                  setSelectedJob(null);
                }}
                className="px-6 py-2.5 text-xs font-semibold rounded-[8px] text-white shadow-sm flex items-center gap-1.5"
                style={{ backgroundColor: primaryColor }}
              >
                <span>Nộp Hồ Sơ Ngay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK APPLY MODAL */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowApplyModal(null)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {applySubmitted ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="font-bold text-lg text-slate-900">Ứng tuyển thành công!</h3>
                <p className="text-xs text-slate-500 mt-1">Đang chuyển hướng tới trang quản lý hồ sơ ứng viên...</p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Ứng tuyển vị trí</h3>
                <p className="text-xs text-slate-500 mb-6">{showApplyModal.title}</p>

                <form onSubmit={handleApplySubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-[#1e293b] mb-1">Họ và tên *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[8px] bg-[#f8f9ff] border border-[#e2e8f0] text-[#1e293b] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1e293b] mb-1">Email liên hệ *</label>
                    <input
                      type="email"
                      required
                      placeholder="nguyenvana@gmail.com"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[8px] bg-[#f8f9ff] border border-[#e2e8f0] text-[#1e293b] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1e293b] mb-1">Số điện thoại *</label>
                    <input
                      type="tel"
                      required
                      placeholder="0912345678"
                      value={candidatePhone}
                      onChange={(e) => setCandidatePhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[8px] bg-[#f8f9ff] border border-[#e2e8f0] text-[#1e293b] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1e293b] mb-1">Đính Kèm CV (PDF/Word) *</label>
                    <div className="border-2 border-dashed border-[#e2e8f0] p-4 rounded-[12px] bg-[#f8f9ff] text-center cursor-pointer transition-colors relative">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        required
                        onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Upload className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                      <span className="text-xs text-[#64748b] block font-medium">
                        {cvFile ? cvFile.name : "Kéo thả file CV hoặc bấm để tải lên"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-[8px] text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-4"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <span>Gửi Hồ Sơ Ứng Tuyển</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* RICH FOOTER & CONTACTS */}
      <footer className="border-t border-[#e2e8f0] pt-12 pb-8 bg-slate-900 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-6 space-y-8">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div className="space-y-3 max-w-sm">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg text-white font-bold flex items-center justify-center text-sm shadow-sm"
                  style={{ backgroundColor: primaryColor }}
                >
                  {theme.code.charAt(0).toUpperCase()}
                </div>
                <span className="font-bold text-white text-base tracking-tight">{theme.name}</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-xs">
                {customLanding?.about?.description
                  ? customLanding.about.description.slice(0, 150) + "..."
                  : `${theme.name} — Cổng thông tin tuyển dụng và phát triển nghề nghiệp.`}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-bold text-white uppercase tracking-wider block mb-2">Liên Hệ Tuyển Dụng</span>
              {customLanding?.footer?.address && (
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>{customLanding.footer.address}</span>
                </div>
              )}
              {customLanding?.footer?.contactEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                  <a href={`mailto:${customLanding.footer.contactEmail}`} className="hover:text-white">
                    {customLanding.footer.contactEmail}
                  </a>
                </div>
              )}
              {customLanding?.footer?.contactPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>{customLanding.footer.contactPhone}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <span className="font-bold text-white uppercase tracking-wider block">Mạng Xã Hội</span>
              <div className="flex items-center gap-3 text-slate-400">
                {customLanding?.footer?.linkedinUrl && (
                  <a href={customLanding.footer.linkedinUrl} target="_blank" rel="noreferrer" className="hover:text-white">
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
                {customLanding?.footer?.facebookUrl && (
                  <a href={customLanding.footer.facebookUrl} target="_blank" rel="noreferrer" className="hover:text-white">
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {customLanding?.footer?.githubUrl && (
                  <a href={customLanding.footer.githubUrl} target="_blank" rel="noreferrer" className="hover:text-white">
                    <Github className="w-5 h-5" />
                  </a>
                )}
                {customLanding?.footer?.websiteUrl && (
                  <a href={customLanding.footer.websiteUrl} target="_blank" rel="noreferrer" className="hover:text-white">
                    <Globe className="w-5 h-5" />
                  </a>
                )}
              </div>

            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <div>
              {customLanding?.footer?.copyrightText ||
                `${theme.name} Careers Portal © 2026. Powered by SmartHire AI Multi-Tenant SaaS.`}
            </div>
            <div>Hệ thống Tuyển dụng Doanh nghiệp Chuẩn hóa</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
