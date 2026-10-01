import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { getTenantTheme, getTenantThemeStyle } from "@/lib/tenantTheme";
import { jobApi } from "@/api/tenant/jobApi";
import { applicantApi } from "@/api/tenant/applicantApi";
import { landingApi } from "@/api/tenant/landingApi";
import { cvApi } from "@/api/tenant/cvApi";
import type { PublicJob } from "@/api/types/job";
import { getApiErrorMessage } from "@/lib/axios";
import { getDeadlineInfo } from "@/features/tenant/career/utils/jobDeadline";
import { CareerHeader } from "@/features/tenant/career/components/CareerHeader";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import "../career-page.css";
import {
  Search,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  ArrowRight,
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
  Loader2,
} from "lucide-react";

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
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isJobsPage = location.pathname.endsWith("/jobs");
  
  const rawTenantCode = getTenantIdFromWindow() || "acme";
  const theme = getTenantTheme(rawTenantCode);

  const initialQuery = isJobsPage ? searchParams.get("q")?.trim() ?? "" : "";
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [submittedSearch, setSubmittedSearch] = useState(initialQuery);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const [selectedJob, setSelectedJob] = useState<PublicJob | null>(null);
  const [showApplyModal, setShowApplyModal] = useState<PublicJob | null>(null);

  // Apply Form State
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [applySubmitted, setApplySubmitted] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const token = useAuthStore((s) => s.accessToken);
  const publicJobs = useQuery({
    queryKey: ["public-jobs", isJobsPage ? submittedSearch : ""],
    queryFn: () => jobApi.publicList(isJobsPage ? submittedSearch || undefined : undefined),
  });
  const publicLanding = useQuery({
    queryKey: ["public-landing", rawTenantCode],
    queryFn: () => landingApi.getPublicLanding(),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const customLanding = publicLanding.data?.data;
  const jobsHref = searchTerm.trim() ? `/jobs?q=${encodeURIComponent(searchTerm.trim())}` : "/jobs";

  // Dynamic Theme & Palette
  const primaryColor = customLanding?.theme?.primaryColor || theme.primary;
  const primaryHover = customLanding?.theme?.primaryHover || theme.primaryHover;
  const secondaryColor = customLanding?.theme?.secondaryColor || "#505f76";
  const isDarkHero = customLanding?.theme?.darkModeHero !== false;

  const dynamicThemeStyle = useMemo(() => {
    const baseStyle = getTenantThemeStyle(theme);
    return {
      ...baseStyle,
      "--color-primary": primaryColor,
      "--color-primary-hover": primaryHover,
      "--color-brand-primary": primaryColor,
      "--color-brand-primary-hover": primaryHover,
      "--color-secondary": secondaryColor,
      "--color-brand-secondary": secondaryColor,
      "--career-hero": isDarkHero ? primaryColor : "#ffffff",
      "--career-secondary": secondaryColor,
      fontFamily: customLanding?.theme?.fontFamily || "inherit",
    } as React.CSSProperties;
  }, [theme, customLanding, primaryColor, primaryHover, secondaryColor, isDarkHero]);

  const jobsList = publicJobs.data?.data ?? [];

  useEffect(() => {
    const jobId = Number(new URLSearchParams(window.location.search).get("jobId"));
    if (!jobId || selectedJob) return;
    const sharedJob = jobsList.find((job) => job.id === jobId);
    if (sharedJob) setSelectedJob(sharedJob);
  }, [jobsList, selectedJob]);

  const filteredJobs = jobsList.filter(
    (job) => selectedDepartment === "ALL" || job.department === selectedDepartment,
  );

  const departments = ["ALL", ...new Set(jobsList.map((job) => job.department).filter(Boolean))] as string[];
  const urgentJobs = jobsList.filter((job) => getDeadlineInfo(job.deadline)?.urgent).slice(0, 3);
  const previewJobs = jobsList.slice(0, 6);

  const startApply = (job: PublicJob) => {
    if (!job.acceptingApplications) return;
    if (!token) {
      navigate("/candidate/login", { state: { from: `/jobs?jobId=${job.id}` } });
      return;
    }
    setApplyError(null);
    setShowApplyModal(job);
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchTerm.trim();
    setSubmittedSearch(query);
    setSelectedDepartment("ALL");
    setSearchParams(query ? { q: query } : {});
  };

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
        setCvFile(null);
        navigate("/candidate/cv");
      }, 1200);
    }).catch((err: unknown) => {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      if (code === "APPLICATION_EXISTS") navigate("/candidate/cv");
      else setApplyError(getApiErrorMessage(err));
    });
  };

  useEffect(() => {
    if (!selectedJob && !showApplyModal) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const modal = document.querySelector<HTMLElement>("[data-career-modal]");
    modal?.querySelector<HTMLElement>("button, a, input")?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSelectedJob(null);
      setShowApplyModal(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [selectedJob, showApplyModal]);

  if (publicLanding.isPending) {
    return (
      <div className="min-h-screen bg-[#f9f9ff] flex items-center justify-center">
        <div className="animate-spin text-slate-400">
          <Loader2 className="w-8 h-8" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="career-page tenant-workspace-theme flex min-h-screen flex-col justify-between bg-[var(--color-surface-alt)] font-sans text-[var(--color-on-surface)] antialiased"
      style={dynamicThemeStyle}
    >
      <CareerHeader
        tenantName={theme.name}
        tenantCode={theme.code}
        logoUrl={customLanding?.header?.logoImageUrl}
        slogan={customLanding?.header?.slogan}
        primaryColor={primaryColor}
      />

      <main id="main-content" className="relative z-10">
        {!isJobsPage ? (
          <>
            {/* HERO SECTION WITH DYNAMIC BANNER */}
            <section className="career-hero-wrap relative mx-auto max-w-[1536px] px-4 py-8 sm:px-6 lg:px-8">
          <div
            className={`career-hero ${isDarkHero ? "career-hero-dark" : "career-hero-light"} relative overflow-hidden border border-[var(--color-border-default)] shadow-xl ${
              customLanding?.theme?.borderRadius || "rounded-[32px]"
            }`}
            style={{
              minHeight: customLanding?.hero?.bannerHeight || "540px",
              backgroundColor: isDarkHero ? primaryColor : "#ffffff",
            }}
          >
            {/* Background Image */}
            <img
              src={customLanding?.hero?.bannerImageUrl || theme.heroImage || "/acme_tech_hero.png"}
              alt={theme.name}
              className={`career-hero-image absolute inset-0 h-full w-full object-cover object-center ${
                customLanding?.hero?.bannerImageUrl ? "" : "opacity-40 mix-blend-luminosity"
              }`}
            />

            {/* Ambient Lighting & Glass Layer */}
            <div
              className="career-hero-overlay absolute inset-0"
              style={{
                backgroundColor: isDarkHero ? primaryColor : "#ffffff",
                opacity: (customLanding?.hero?.overlayOpacity ?? 75) / 100,
              }}
            />

            <div
              className={`career-hero-content relative z-10 max-w-4xl p-7 sm:p-12 lg:p-16 ${
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
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>{customLanding?.hero?.badgeText || theme.tagline || "Dẫn đầu Giải pháp Công nghệ Enterprise Multi-Tenant & AI"}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-display tracking-tight leading-tight mb-6">
                {customLanding?.hero?.title || `Chinh Phục Tương Lai Công Nghệ Cùng ${theme.name}`}
                {customLanding?.hero?.highlightWords && (
                  <span className="career-highlight mt-2 block">
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
                  "Chúng tôi xây dựng môi trường kỹ thuật chuẩn International Enterprise — Nơi các Kỹ sư Phần mềm & AI được phát triển những sản phẩm công nghệ tạo giá trị thực sự."}
              </p>

              {/* Job Search Bar */}
              {(customLanding?.hero?.showSearchBar !== false) && (
                <div className="career-search mb-6 flex max-w-2xl flex-col items-center gap-3 rounded-2xl border border-white/30 bg-white p-2.5 shadow-xl sm:flex-row">
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

                  <Link
                    to={jobsHref}
                    className="w-full sm:w-auto px-7 py-3 rounded-[10px] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <span>{customLanding?.hero?.primaryCtaText || "Xem Vị Trí Tuyển Dụng"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-4">
                {customLanding?.hero?.showSearchBar === false && <Link
                  to={jobsHref}
                  className="px-7 py-3 rounded-[10px] text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span>{customLanding?.hero?.primaryCtaText || "Xem Vị Trí Tuyển Dụng"}</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>}

                {customLanding?.hero?.secondaryCtaText && (
                  <a
                    href={customLanding.hero.secondaryCtaLink || "#about"}
                    className={`px-6 py-3 rounded-[10px] font-semibold text-sm transition-all border ${
                      isDarkHero
                        ? "border-white/30 text-white hover:bg-white/10"
                        : "border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                    }`}
                  >
                    {customLanding.hero.secondaryCtaText}
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="career-open-jobs" className="career-jobs-section mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8">
          {urgentJobs.length > 0 && (
            <div className="career-featured-card mb-10 rounded-[var(--radius-xl)] p-5 sm:p-7">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">Sắp hết hạn</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--color-on-surface)]">Cơ hội cần lưu ý trong 7 ngày tới</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {urgentJobs.map((job) => <button key={job.id} type="button" onClick={() => setSelectedJob(job)} className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-white p-4 text-left hover:border-[var(--color-primary)]"><span className="block break-words font-semibold text-[var(--color-on-surface)]">{job.title}</span>{job.department && <span className="mt-1 block text-sm text-[var(--color-on-surface-variant)]">{job.department}</span>}<span className="mt-3 block text-xs font-medium text-[var(--color-primary-hover)]">Còn {getDeadlineInfo(job.deadline)?.daysRemaining} ngày · {getDeadlineInfo(job.deadline)?.dateLabel}</span></button>)}
              </div>
            </div>
          )}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">Cơ hội nghề nghiệp</p><h2 id="career-open-jobs" className="mt-1 text-2xl font-semibold text-[var(--color-on-surface)]">Vị trí đang mở</h2></div>
            <Link to={jobsHref} className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-default)] px-4 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]">Xem tất cả việc làm <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </div>
          {publicJobs.isError ? <p role="alert" className="text-sm text-[var(--color-error)]">{getApiErrorMessage(publicJobs.error)}</p> : previewJobs.length > 0 ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{previewJobs.map((job) => <article key={job.id} className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)]"><h3 className="break-words text-lg font-semibold"><button type="button" className="text-left hover:underline" onClick={() => setSelectedJob(job)}>{job.title}</button></h3>{(job.department || job.location || job.workMode) && <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">{[job.department, job.location, job.workMode].filter(Boolean).join(" · ")}</p>}<button type="button" onClick={() => setSelectedJob(job)} className="mt-4 min-h-11 text-sm font-medium text-[var(--color-primary)]">Xem chi tiết</button></article>)}</div> : !publicJobs.isPending && <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-default)] p-6 text-center text-sm text-[var(--color-on-surface-variant)]">Hiện chưa có vị trí đang mở.</p>}
        </section>

        {/* COMPANY CULTURE & NUMBERS SHOWCASE */}
        {customLanding?.about?.enabled !== false && (
          <section id="about" className="career-section career-section-white border-y border-[var(--color-border-default)] py-16 lg:py-20">
            <div className="max-w-7xl mx-auto px-6">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Culture Image */}
                <div className="career-media-card group relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-default)] shadow-lg">
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
                        className="career-stat-card rounded-[var(--radius-lg)] border border-[var(--color-border-default)] p-5"
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
        {customLanding?.benefits?.enabled !== false && (
          <section id="benefits" className="career-section career-section-muted border-b border-[var(--color-border-default)] py-16 lg:py-20">
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
                    className="career-content-card rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
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


        {/* TESTIMONIALS SECTION */}
        {customLanding?.testimonials?.enabled !== false && (
          <section className="career-section career-section-white border-b border-[var(--color-border-default)] py-16 lg:py-20">
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
                    className="career-content-card flex flex-col justify-between rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-white p-8 shadow-sm"
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
        </>
        ) : (
        <section id="jobs" className="career-jobs-section mx-auto max-w-[1400px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          {/* JOB POSITIONS SECTION */}
          <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
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
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-on-surface)] sm:text-4xl">
                Các Vị Trí Đang Tuyển Dụng
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">
                Tìm kiếm vị trí phù hợp với năng lực kỹ thuật và mục tiêu sự nghiệp của bạn.
              </p>
            </div>
            <form className="flex w-full max-w-xl flex-col gap-2 sm:flex-row" role="search" onSubmit={submitSearch}>
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Tìm kiếm việc làm</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-[var(--color-on-surface-variant)]" aria-hidden="true" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Chức danh hoặc kỹ năng"
                  className="min-h-11 w-full rounded-[var(--radius-default)] border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-2 pl-10 pr-3 text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:bg-white"
                />
              </label>
              <button type="submit" className="min-h-11 rounded-[var(--radius-default)] bg-[var(--color-primary)] px-5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]">
                Tìm việc
              </button>
            </form>
          </div>

          {departments.length > 1 && (
            <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-2" aria-label="Lọc theo phòng ban">
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDepartment(dept)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                    selectedDepartment === dept
                      ? "text-white shadow-sm"
                      : "border border-[var(--color-border-default)] bg-white text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-alt)]"
                  }`}
                  style={selectedDepartment === dept ? { backgroundColor: primaryColor } : undefined}
                >
                  {dept === "ALL" ? "Tất Cả Phòng Ban" : dept}
                </button>
              ))}
            </div>
          )}

          {publicJobs.isPending ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Đang tải việc làm">
              {[0, 1, 2].map((item) => <div key={item} className="h-72 animate-pulse rounded-[var(--radius-xl)] bg-[var(--color-surface-container-low)]" />)}
            </div>
          ) : publicJobs.isError ? (
            <div role="alert" className="rounded-[var(--radius-lg)] border border-[var(--color-error-container)] bg-[var(--color-error-container)] p-5 text-sm text-[var(--color-on-error-container)]">
              {getApiErrorMessage(publicJobs.error)}
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border-default)] bg-white px-6 py-14 text-center">
              <Briefcase className="w-12 h-12 text-[#94a3b8] mx-auto mb-3 opacity-60" />
              <h3 className="font-semibold text-lg text-[#1e293b]">Chưa có vị trí tuyển dụng phù hợp</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-on-surface-variant)]">
                Thử từ khóa khác hoặc chọn tất cả phòng ban.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job) => (
                <article
                  key={job.id}
                  className="flex min-w-0 flex-col justify-between rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-white p-6 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-ambient)]"
                >
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {job.department && <span className="rounded-full bg-[var(--color-primary-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--color-primary-hover)]">{job.department}</span>}
                      {job.salary && <span className="rounded-full bg-[var(--color-surface-alt)] px-2.5 py-1 text-xs font-semibold text-[var(--color-on-surface-variant)]">{job.salary}</span>}
                    </div>

                    <h2 className="mb-3 break-words text-lg font-semibold leading-7 text-[var(--color-on-surface)]">
                      <button type="button" className="text-left hover:underline" onClick={() => setSelectedJob(job)}>{job.title}</button>
                    </h2>

                    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[var(--color-on-surface-variant)]">
                      {(job.location || job.workMode) && <span className="flex min-w-0 items-center gap-1"><MapPin className="size-3.5 shrink-0" aria-hidden="true" /><span className="break-words">{[job.location, job.workMode].filter(Boolean).join(" · ")}</span></span>}
                      {job.employmentType && <span className="flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" />{job.employmentType}</span>}
                    </div>

                    {job.skills.length > 0 && <div className="mb-5 flex flex-wrap gap-1.5">
                      {job.skills.slice(0, 4).map((tag) => (
                        <span key={tag} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#f1f5f9] text-[#475569]">
                          {tag}
                        </span>
                      ))}
                      {job.skills.length > 4 && <span className="rounded-full bg-[var(--color-surface-alt)] px-2 py-0.5 text-[11px] text-[var(--color-on-surface-variant)]">+{job.skills.length - 4}</span>}
                    </div>}
                    {getDeadlineInfo(job.deadline) && <p className="mb-5 text-xs font-medium text-[var(--color-on-surface-variant)]">Hạn nộp: {getDeadlineInfo(job.deadline)?.dateLabel}{getDeadlineInfo(job.deadline)?.urgent ? ` · Còn ${getDeadlineInfo(job.deadline)?.daysRemaining} ngày` : ""}</p>}
                  </div>

                  <div className="flex flex-col gap-2 border-t border-[var(--color-border-default)] pt-4 sm:flex-row">
                    <button
                      onClick={() => setSelectedJob(job)}
                      className="min-h-11 flex-1 rounded-[var(--radius-default)] px-3 text-sm font-medium text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-alt)]"
                    >
                      Xem chi tiết
                    </button>
                    <button
                      onClick={() => startApply(job)}
                      disabled={!job.acceptingApplications}
                      className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-[var(--radius-default)] px-3 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <span>{job.acceptingApplications ? (token ? "Ứng tuyển" : "Đăng nhập để ứng tuyển") : "Không còn nhận hồ sơ"}</span>
                      {job.acceptingApplications && <ArrowRight className="size-4" aria-hidden="true" />}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        )}
      </main>

      {/* JOB DETAIL MODAL */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedJob(null)}>
          <div data-career-modal role="dialog" aria-modal="true" aria-labelledby="public-job-title" className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-white p-5 shadow-2xl sm:p-7">
            <button
              onClick={() => setSelectedJob(null)}
              aria-label="Đóng chi tiết việc làm"
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="pr-8">
              {selectedJob.department && <span className="mb-2 inline-block rounded-full bg-[var(--color-primary-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--color-primary-hover)]">{selectedJob.department}</span>}
              <h2 id="public-job-title" className="mb-2 break-words text-2xl font-semibold text-[var(--color-on-surface)] sm:text-3xl">{selectedJob.title}</h2>
              <div className="flex flex-wrap gap-4 text-xs text-[#64748b] mb-6">
                {(selectedJob.location || selectedJob.workMode) && <span className="flex items-center gap-1"><MapPin className="size-4" aria-hidden="true" />{[selectedJob.location, selectedJob.workMode].filter(Boolean).join(" · ")}</span>}
                {selectedJob.employmentType && <span className="flex items-center gap-1"><Clock className="size-4" aria-hidden="true" />{selectedJob.employmentType}</span>}
                {selectedJob.salary && <span className="font-semibold text-[var(--color-on-surface)]">{selectedJob.salary}</span>}
              </div>
            </div>

            <div className="space-y-6 text-sm text-slate-700">
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Mô tả công việc</h4>
                <p className="whitespace-pre-line leading-relaxed text-slate-600">{selectedJob.description}</p>
              </div>

              {selectedJob.responsibilities && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Trách nhiệm và yêu cầu</h4>
                  <p className="whitespace-pre-line leading-relaxed text-slate-600">{selectedJob.responsibilities}</p>
                </div>
              )}
              {selectedJob.benefits && <div><h4 className="mb-2 font-semibold text-slate-900">Quyền lợi</h4><p className="whitespace-pre-line leading-relaxed text-slate-600">{selectedJob.benefits}</p></div>}
              {selectedJob.skills.length > 0 && <div><h4 className="mb-3 font-semibold text-slate-900">Kỹ năng</h4><div className="flex flex-wrap gap-2">{selectedJob.skills.map((skill) => <span key={skill} className="rounded-full bg-[var(--color-primary-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--color-primary-hover)]">{skill}</span>)}</div></div>}
              {(selectedJob.minYearsExperience != null || selectedJob.educationLevel || getDeadlineInfo(selectedJob.deadline)) && <aside className="rounded-[var(--radius-lg)] bg-[var(--color-surface-alt)] p-4"><div className="flex flex-wrap gap-x-6 gap-y-2">{selectedJob.minYearsExperience != null && <p>Kinh nghiệm: {selectedJob.minYearsExperience}+ năm</p>}{selectedJob.educationLevel && <p>Học vấn: {selectedJob.educationLevel}</p>}{getDeadlineInfo(selectedJob.deadline) && <p>Hạn nộp: {getDeadlineInfo(selectedJob.deadline)?.dateLabel}</p>}</div></aside>}
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
                  startApply(selectedJob);
                  setSelectedJob(null);
                }}
                disabled={!selectedJob.acceptingApplications}
                className="px-6 py-2.5 text-xs font-semibold rounded-[8px] text-white shadow-sm flex items-center gap-1.5"
                style={{ backgroundColor: primaryColor }}
              >
                <span>{selectedJob.acceptingApplications ? (token ? "Nộp hồ sơ" : "Đăng nhập để ứng tuyển") : "Không còn nhận hồ sơ"}</span>
                {selectedJob.acceptingApplications && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK APPLY MODAL */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowApplyModal(null)}>
          <div data-career-modal role="dialog" aria-modal="true" aria-labelledby="apply-title" className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-white p-6 shadow-2xl">
            <button
              onClick={() => setShowApplyModal(null)}
              aria-label="Đóng biểu mẫu ứng tuyển"
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            {applySubmitted ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="font-bold text-lg text-slate-900">Ứng tuyển thành công!</h3>
                <p className="text-xs text-slate-500 mt-1">Đang chuyển hướng tới trang quản lý hồ sơ ứng viên...</p>
              </div>
            ) : (
              <>
                <h3 id="apply-title" className="text-lg font-semibold text-slate-900 mb-1">Ứng tuyển vị trí</h3>
                <p className="text-xs text-slate-500 mb-6">{showApplyModal.title}</p>

                <form onSubmit={handleApplySubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-[#1e293b] mb-1">Đính kèm CV (PDF/Word) *</label>
                    <div className="border-2 border-dashed border-[#e2e8f0] p-4 rounded-[12px] bg-[#f8f9ff] text-center cursor-pointer transition-colors relative">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        required
                        onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Upload className="w-6 h-6 mx-auto mb-1 text-slate-400" aria-hidden="true" />
                      <span className="text-xs text-[#64748b] block font-medium">
                        {cvFile ? cvFile.name : "Kéo thả file CV hoặc bấm để tải lên"}
                      </span>
                    </div>
                  </div>

                  {applyError && <p role="alert" className="rounded-[var(--radius-default)] bg-[var(--color-error-container)] p-3 text-sm text-[var(--color-on-error-container)]">{applyError}</p>}

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
      <footer className="career-footer border-t border-[var(--color-border-default)] pb-8 pt-12 text-xs">
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
                {customLanding?.footer?.description || "Cổng thông tin tuyển dụng & cơ hội phát triển nghề nghiệp chuẩn Enterprise."}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-bold text-white uppercase tracking-wider block mb-2">{customLanding?.footer?.contactTitle || "Liên Hệ Tuyển Dụng"}</span>
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
              <span className="font-bold text-white uppercase tracking-wider block">{customLanding?.footer?.socialTitle || "Mạng Xã Hội"}</span>
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
            <div>{customLanding?.footer?.bottomText || "Hệ Thống Tuyển Dụng Doanh Nghiệp Multi-Tenant"}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
