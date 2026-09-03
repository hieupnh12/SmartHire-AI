import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTenantIdFromWindow } from "@/lib/tenant";
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
  ShieldCheck
} from "lucide-react";

interface TenantThemeConfig {
  code: string;
  name: string;
  tagline: string;
  primaryColorBtn: string;
  primaryHoverBtn: string;
  primaryText: string;
  primaryBgLight: string;
  primaryGradient: string;
  badgeBg: string;
  heroImage: string;
  cultureImage: string;
  accentBadge: string;
}

const COLOR_PRESETS: Omit<TenantThemeConfig, "code" | "name" | "tagline">[] = [
  {
    primaryColorBtn: "bg-teal-600 hover:bg-teal-700",
    primaryHoverBtn: "hover:bg-teal-700",
    primaryText: "text-teal-600",
    primaryBgLight: "bg-teal-50",
    primaryGradient: "from-teal-600 via-cyan-600 to-emerald-600",
    badgeBg: "bg-teal-500/10 text-teal-600 border-teal-500/20",
    heroImage: "/acme_tech_hero.png",
    cultureImage: "/acme_culture.png",
    accentBadge: "Teal Cyber Tech"
  },
  {
    primaryColorBtn: "bg-indigo-600 hover:bg-indigo-700",
    primaryHoverBtn: "hover:bg-indigo-700",
    primaryText: "text-indigo-600",
    primaryBgLight: "bg-indigo-50",
    primaryGradient: "from-indigo-600 via-purple-600 to-blue-600",
    badgeBg: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    heroImage: "/acme_tech_hero.png",
    cultureImage: "/acme_culture.png",
    accentBadge: "Royal Indigo Tech"
  },
  {
    primaryColorBtn: "bg-amber-600 hover:bg-amber-700",
    primaryHoverBtn: "hover:bg-amber-700",
    primaryText: "text-amber-600",
    primaryBgLight: "bg-amber-50",
    primaryGradient: "from-amber-600 via-orange-600 to-yellow-500",
    badgeBg: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    heroImage: "/acme_tech_hero.png",
    cultureImage: "/acme_culture.png",
    accentBadge: "Sunset Amber Tech"
  },
  {
    primaryColorBtn: "bg-rose-600 hover:bg-rose-700",
    primaryHoverBtn: "hover:bg-rose-700",
    primaryText: "text-rose-600",
    primaryBgLight: "bg-rose-50",
    primaryGradient: "from-rose-600 via-red-600 to-pink-600",
    badgeBg: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    heroImage: "/acme_tech_hero.png",
    cultureImage: "/acme_culture.png",
    accentBadge: "Ruby Crimson Tech"
  },
  {
    primaryColorBtn: "bg-emerald-600 hover:bg-emerald-700",
    primaryHoverBtn: "hover:bg-emerald-700",
    primaryText: "text-emerald-600",
    primaryBgLight: "bg-emerald-50",
    primaryGradient: "from-emerald-600 via-teal-600 to-green-600",
    badgeBg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    heroImage: "/acme_tech_hero.png",
    cultureImage: "/acme_culture.png",
    accentBadge: "Vibrant Emerald Tech"
  },
  {
    primaryColorBtn: "bg-violet-600 hover:bg-violet-700",
    primaryHoverBtn: "hover:bg-violet-700",
    primaryText: "text-violet-600",
    primaryBgLight: "bg-violet-50",
    primaryGradient: "from-violet-600 via-purple-600 to-fuchsia-600",
    badgeBg: "bg-violet-500/10 text-violet-600 border-violet-500/20",
    heroImage: "/acme_tech_hero.png",
    cultureImage: "/acme_culture.png",
    accentBadge: "Deep Violet Tech"
  },
  {
    primaryColorBtn: "bg-blue-600 hover:bg-blue-700",
    primaryHoverBtn: "hover:bg-blue-700",
    primaryText: "text-blue-600",
    primaryBgLight: "bg-blue-50",
    primaryGradient: "from-blue-600 via-cyan-600 to-sky-600",
    badgeBg: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    heroImage: "/acme_tech_hero.png",
    cultureImage: "/acme_culture.png",
    accentBadge: "Electric Blue Tech"
  }
];

export function getTenantTheme(code: string): TenantThemeConfig {
  const cleanCode = (code || "acme").toLowerCase();

  // Deterministic hash based on tenant code string
  let hash = 0;
  for (let i = 0; i < cleanCode.length; i++) {
    hash = cleanCode.charCodeAt(i) + ((hash << 5) - hash);
  }
  const presetIndex = Math.abs(hash) % COLOR_PRESETS.length;
  const preset = COLOR_PRESETS[presetIndex];

  const formattedName = cleanCode.toUpperCase() + " Enterprise IT";

  return {
    code: cleanCode,
    name: formattedName,
    tagline: `Dẫn đầu Giải pháp Công nghệ Enterprise Multi-Tenant & AI`,
    ...preset
  };
}

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

export function TenantCareerPage() {
  const navigate = useNavigate();
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

  // IT Open Positions
  const jobsList: JobPosting[] = [
    {
      id: 1,
      title: "Senior Java Backend Engineer (Microservices & Spring Boot)",
      department: "Backend Engineering",
      location: "Hồ Chí Minh / Hybrid",
      type: "Toàn thời gian",
      salary: "$2,200 - $3,500",
      tags: ["Java 21", "Spring Boot", "MySQL Multi-Tenant", "RabbitMQ", "Redis"],
      description: `Phát triển hệ thống Backend SaaS quy mô lớn tại ${theme.name}, xử lý hàng triệu requests song song với kiến trúc Separate Database per Tenant bảo mật cao.`,
      requirements: [
        "Từ 4+ năm kinh nghiệm Java / Spring Boot 3.x",
        "Thành thạo MySQL, Hibernate/JPA Multi-Tenancy strategy",
        "Kinh nghiệm làm việc với Redis Cache, RabbitMQ Queue Worker Pool"
      ]
    },
    {
      id: 2,
      title: "Lead Frontend Engineer (React 19 & TypeScript)",
      department: "Frontend Engineering",
      location: "Hà Nội / Hybrid",
      type: "Toàn thời gian",
      salary: "$2,000 - $3,200",
      tags: ["React 19", "TypeScript", "Vite", "Zustand", "Tailwind CSS"],
      description: `Xây dựng các giao diện Dashboard tuyển dụng AI cao cấp cho ${theme.name}, tối ưu trải nghiệm người dùng với Luminous Professional Design System.`,
      requirements: [
        "Từ 3+ năm kinh nghiệm React, TypeScript, TanStack Query",
        "Tư duy UI/UX xuất sắc, thành thạo Tailwind CSS và Design Tokens",
        "Có kinh nghiệm tối ưu performance & code-splitting"
      ]
    },
    {
      id: 3,
      title: "AI / ML Engineer (NLP & Voice STT Engine)",
      department: "AI Research",
      location: "Hồ Chí Minh / Remote",
      type: "Toàn thời gian",
      salary: "$2,500 - $4,000",
      tags: ["Python", "PyTorch", "Whisper STT", "NLP Parsing", "FastText"],
      description: `Nghiên cứu và triển khai mô hình AI Phân tích CV tự động & Engine Phỏng Vấn Giọng Nói AI (Speech-to-Text & Sentiment Analysis) cho ${theme.name}.`,
      requirements: [
        "Kinh nghiệm huấn luyện / fine-tune LLM, Whisper STT",
        "Thành thạo Python, PyTorch, Docker Containerization",
        "Tư duy toán học và tối ưu thuật toán Matching Score"
      ]
    },
    {
      id: 4,
      title: "DevOps & Cloud Infrastructure Specialist",
      department: "Infrastructure",
      location: "Đà Nẵng / Hybrid",
      type: "Toàn thời gian",
      salary: "$2,200 - $3,800",
      tags: ["GCP Cloud", "Docker", "Kubernetes", "Nginx", "GitHub Actions"],
      description: `Quản trị hạ tầng Compute Engine trên Google Cloud VPS, tự động hóa CI/CD pipeline và duy trì High Availability cho Separate DB per Tenant tại ${theme.name}.`,
      requirements: [
        "Kinh nghiệm triển khai Docker, Docker Compose Prod, Nginx TLS",
        "Thành thạo GCP / AWS Cloud Services & Shell Scripting",
        "Hiểu biết về monitoring Redis, RabbitMQ & HikariCP Connection Pool"
      ]
    }
  ];

  const filteredJobs = jobsList.filter((j) => {
    const matchSearch =
      j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchDept = selectedDepartment === "ALL" || j.department === selectedDepartment;
    return matchSearch && matchDept;
  });

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApplySubmitted(true);
    setTimeout(() => {
      setApplySubmitted(false);
      setShowApplyModal(null);
      setCandidateName("");
      setCandidateEmail("");
      setCandidatePhone("");
      setCvFile(null);
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#191b23] font-sans antialiased flex flex-col justify-between selection:bg-teal-600 selection:text-white">
      {/* Top Glassmorphism Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-[#e2e8f0] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
            <div className={`w-10 h-10 rounded-[12px] ${theme.primaryColorBtn} text-white flex items-center justify-center shadow-md font-bold text-lg`}>
              {theme.code.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="text-xl font-bold font-display text-[#1e293b] tracking-tight">
                {theme.name}
              </span>
              <span className={`ml-2.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${theme.badgeBg}`}>
                {theme.accentBadge}
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#475569]">
            <a href="#about" className={`hover:${theme.primaryText} transition-colors`}>Về Chúng Tôi</a>
            <a href="#techstack" className={`hover:${theme.primaryText} transition-colors`}>Tech Stack</a>
            <a href="#jobs" className={`hover:${theme.primaryText} transition-colors`}>Vị Trí Tuyển Dụng</a>
          </nav>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            {/* Strict "Đăng Nhập" Button (Navigates to /candidate/login) */}
            <button
              onClick={() => navigate("/candidate/login")}
              className={`px-5 py-2.5 text-sm font-semibold rounded-[8px] ${theme.primaryColorBtn} text-white transition-all flex items-center gap-2 shadow-sm`}
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng Nhập</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* HERO SECTION WITH HIGH-TECH IMAGE BANNER */}
        <section className="relative pt-12 pb-24 max-w-7xl mx-auto px-6">
          <div className="relative rounded-[32px] overflow-hidden border border-[#e2e8f0] shadow-2xl bg-slate-950">
            {/* Background Generated Image */}
            <img
              src={theme.heroImage}
              alt="High-Tech IT Office Hero"
              className="absolute inset-0 w-full h-full object-cover object-center opacity-40 mix-blend-luminosity scale-105 transition-transform duration-1000 hover:scale-100"
            />

            {/* Ambient Lighting & Glass Layer */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/75 to-slate-950/50" />
            <div className="relative z-10 p-8 sm:p-14 md:p-20 text-white max-w-4xl">
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold mb-6 ${theme.primaryText}`}>
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>{theme.tagline}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold font-display tracking-tight leading-tight mb-6 text-white">
                Chinh Phục Tương Lai Công Nghệ Cùng{" "}
                <span className={`bg-gradient-to-r ${theme.primaryGradient} bg-clip-text text-transparent`}>
                  {theme.name}
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 mb-10 leading-relaxed max-w-2xl font-normal">
                Chúng tôi xây dựng môi trường kỹ thuật chuẩn International Enterprise — Nơi các Kỹ sư Phần mềm & AI được phát triển những sản phẩm công nghệ tạo giá trị thực sự.
              </p>

              {/* Job Search Bar */}
              <div className="max-w-2xl bg-white/95 backdrop-blur-md p-3 rounded-[18px] border border-white/20 shadow-2xl flex flex-col sm:flex-row items-center gap-3">
                <div className="flex-1 flex items-center gap-3 px-3 w-full">
                  <Search className="w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Nhập vị trí IT, kỹ năng (Java, React, Python, Cloud)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-sm text-slate-900 focus:outline-none bg-transparent placeholder-slate-400 font-medium"
                  />
                </div>

                <a
                  href="#jobs"
                  className={`w-full sm:w-auto px-7 py-3 rounded-[10px] ${theme.primaryColorBtn} text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg`}
                >
                  <span>Tìm Việc IT</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* COMPANY CULTURE & NUMBERS SHOWCASE */}
        <section id="about" className="py-20 bg-white border-y border-[#e2e8f0]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Culture Image */}
              <div className="relative rounded-[28px] overflow-hidden border border-[#e2e8f0] shadow-xl group">
                <img
                  src={theme.cultureImage}
                  alt="IT Team Culture"
                  className="w-full h-[420px] object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-8">
                  <div className="text-white space-y-1">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">Văn Hóa Làm Việc Agile</span>
                    <h3 className="text-xl font-bold font-display">Tự Do Sáng Tạo & Phát Triển Sự Nghiệp IT</h3>
                  </div>
                </div>
              </div>

              {/* Content & Stats */}
              <div className="space-y-6">
                <div>
                  <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${theme.badgeBg}`}>
                    Về Chúng Tôi
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-bold font-display text-[#1e293b] mt-3 mb-4">
                    Vì Sao Bạn Nên Chọn {theme.name}?
                  </h2>
                  <p className="text-[#64748b] text-sm leading-relaxed">
                    Tại {theme.name}, chúng tôi tin rằng con người là tài sản quý giá nhất. Đội ngũ Kỹ sư làm việc trong môi trường cởi mở, áp dụng quy trình Agile/Scrum tiêu chuẩn toàn cầu, liên tục tiếp cận các bài toán Enterprise thách thức.
                  </p>
                </div>

                {/* Numbers Grid */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="p-5 rounded-[16px] bg-[#f8f9ff] border border-[#e2e8f0]">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-5 h-5 text-teal-600" />
                      <span className="text-2xl font-extrabold text-[#1e293b]">500+</span>
                    </div>
                    <span className="text-xs text-[#64748b]">Kỹ Sư Phần Mềm & AI</span>
                  </div>

                  <div className="p-5 rounded-[16px] bg-[#f8f9ff] border border-[#e2e8f0]">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-5 h-5 text-amber-600" />
                      <span className="text-2xl font-extrabold text-[#1e293b]">99.99%</span>
                    </div>
                    <span className="text-xs text-[#64748b]">SLA Enterprise High Availability</span>
                  </div>

                  <div className="p-5 rounded-[16px] bg-[#f8f9ff] border border-[#e2e8f0]">
                    <div className="flex items-center gap-2 mb-1">
                      <Award className="w-5 h-5 text-[#3b82f6]" />
                      <span className="text-2xl font-extrabold text-[#1e293b]">100%</span>
                    </div>
                    <span className="text-xs text-[#64748b]">Tài Trợ Chứng Chỉ AWS/GCP</span>
                  </div>

                  <div className="p-5 rounded-[16px] bg-[#f8f9ff] border border-[#e2e8f0]">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="w-5 h-5 text-indigo-600" />
                      <span className="text-2xl font-extrabold text-[#1e293b]">Global</span>
                    </div>
                    <span className="text-xs text-[#64748b]">Dự Án Enterprise Quốc Tế</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TECH STACK GRID SECTION */}
        <section id="techstack" className="py-20 bg-[#f8f9ff] border-b border-[#e2e8f0]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <h2 className="text-3xl font-bold font-display text-[#1e293b] mb-3">Hệ Sinh Thái Công Nghệ Core</h2>
              <p className="text-[#64748b] text-sm">Các công nghệ tiên tiến đang được áp dụng trực tiếp tại các dự án.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="p-6 rounded-[24px] bg-white border border-[#e2e8f0] shadow-sm hover:shadow-md transition-all text-center">
                <div className="w-12 h-12 rounded-[12px] bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-4 font-bold">
                  <Code className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-[#1e293b] text-base mb-1">Backend Microservices</h3>
                <p className="text-xs text-[#64748b]">Java 21, Spring Boot 3, Hibernate Multi-Tenancy, MySQL Separate DB.</p>
              </div>

              <div className="p-6 rounded-[24px] bg-white border border-[#e2e8f0] shadow-sm hover:shadow-md transition-all text-center">
                <div className="w-12 h-12 rounded-[12px] bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto mb-4 font-bold">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-[#1e293b] text-base mb-1">Modern Web Frontend</h3>
                <p className="text-xs text-[#64748b]">React 19, TypeScript, Vite, Zustand, Tailwind CSS, TanStack Query.</p>
              </div>

              <div className="p-6 rounded-[24px] bg-white border border-[#e2e8f0] shadow-sm hover:shadow-md transition-all text-center">
                <div className="w-12 h-12 rounded-[12px] bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 font-bold">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-[#1e293b] text-base mb-1">AI CV & Voice Engine</h3>
                <p className="text-xs text-[#64748b]">Python PyTorch, Whisper STT, NLP Parsing & Matching Score Model.</p>
              </div>

              <div className="p-6 rounded-[24px] bg-white border border-[#e2e8f0] shadow-sm hover:shadow-md transition-all text-center">
                <div className="w-12 h-12 rounded-[12px] bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 font-bold">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-[#1e293b] text-base mb-1">Cloud & Async Queue</h3>
                <p className="text-xs text-[#64748b]">Google Cloud VPS, Docker, Kubernetes, Redis, RabbitMQ Worker Pool.</p>
              </div>
            </div>
          </div>
        </section>

        {/* OPEN JOBS SECTION */}
        <section id="jobs" className="py-24 max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-12">
            <div>
              <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${theme.badgeBg}`}>
                Tất Cả Vị Trí IT Đang Mở
              </span>
              <h2 className="text-3xl font-bold font-display text-[#1e293b] mt-3">Cơ Hội Việc Làm Nổi Bật</h2>
            </div>

            {/* Department Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {["ALL", "Backend Engineering", "Frontend Engineering", "AI Research", "Infrastructure"].map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDepartment(dept)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                    selectedDepartment === dept
                      ? `${theme.primaryColorBtn} text-white shadow-md`
                      : "bg-white border border-[#e2e8f0] text-[#64748b] hover:text-[#1e293b]"
                  }`}
                >
                  {dept === "ALL" ? "Tất Cả Vị Trí" : dept}
                </button>
              ))}
            </div>
          </div>

          {/* Jobs List Grid */}
          <div className="grid gap-6">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="p-8 rounded-[28px] bg-white border border-[#e2e8f0] shadow-[0_20px_25px_-5px_rgba(59,130,246,0.03)] hover:border-teal-500/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                <div className="space-y-3 max-w-3xl">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-3 py-0.5 rounded-full text-[11px] font-bold ${theme.badgeBg}`}>
                      {job.department}
                    </span>
                    <span className="text-xs text-[#64748b] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#64748b]" /> {job.location}
                    </span>
                    <span className="text-xs text-[#64748b] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#64748b]" /> {job.type}
                    </span>
                  </div>

                  <h3
                    className="text-xl font-bold text-[#1e293b] hover:text-teal-600 transition-colors cursor-pointer"
                    onClick={() => setSelectedJob(job)}
                  >
                    {job.title}
                  </h3>

                  <p className="text-xs text-[#64748b] leading-relaxed">{job.description}</p>

                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {job.tags.map((tag) => (
                      <span key={tag} className="px-2.5 py-1 rounded-[6px] bg-[#f8f9ff] border border-[#e2e8f0] text-[11px] font-mono text-[#475569]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between gap-4 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-[#e2e8f0]">
                  <div className="text-right">
                    <span className="text-xs text-[#64748b] block">Mức Lương Hấp Dẫn</span>
                    <span className={`text-xl font-extrabold ${theme.primaryText}`}>{job.salary}</span>
                  </div>

                  <button
                    onClick={() => setShowApplyModal(job)}
                    className={`w-full md:w-auto px-6 py-3 rounded-[10px] ${theme.primaryColorBtn} text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2`}
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Ứng Tuyển Ngay</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* JOB DETAIL MODAL */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border border-[#e2e8f0] rounded-[28px] p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto animate-fade-in">
            <button onClick={() => setSelectedJob(null)} className="absolute top-6 right-6 text-[#64748b] hover:text-[#1e293b]">
              <X className="w-5 h-5" />
            </button>

            <span className={`px-3 py-0.5 rounded-full text-[11px] font-bold mb-3 inline-block ${theme.badgeBg}`}>
              {selectedJob.department}
            </span>
            <h3 className="text-2xl font-bold font-display text-[#1e293b] mb-2">{selectedJob.title}</h3>

            <div className="flex items-center gap-4 text-xs text-[#64748b] mb-6 border-b border-[#e2e8f0] pb-4">
              <span>📍 {selectedJob.location}</span>
              <span>💼 {selectedJob.type}</span>
              <span className={`${theme.primaryText} font-bold`}>💰 {selectedJob.salary}</span>
            </div>

            <div className="space-y-4 text-xs text-[#475569] mb-8">
              <div>
                <h4 className="font-bold text-[#1e293b] text-sm mb-1.5">Mô Tả Công Việc</h4>
                <p className="leading-relaxed">{selectedJob.description}</p>
              </div>

              <div>
                <h4 className="font-bold text-[#1e293b] text-sm mb-1.5">Yêu Cầu Chuyên Môn</h4>
                <ul className="space-y-1.5 list-disc pl-5">
                  {selectedJob.requirements.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => {
                const target = selectedJob;
                setSelectedJob(null);
                setShowApplyModal(target);
              }}
              className={`w-full py-3.5 rounded-[10px] ${theme.primaryColorBtn} text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2`}
            >
              <span>Nộp Hồ Sơ Ứng Tuyển Vị Trí Này</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* QUICK APPLY MODAL */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border border-[#e2e8f0] rounded-[28px] p-8 max-w-md w-full shadow-2xl relative animate-fade-in">
            <button onClick={() => setShowApplyModal(null)} className="absolute top-6 right-6 text-[#64748b] hover:text-[#1e293b]">
              <X className="w-5 h-5" />
            </button>

            {applySubmitted ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-[#16a34a] mx-auto mb-3" />
                <h4 className="text-xl font-bold text-[#1e293b] mb-1">Nộp Hồ Sơ Thành Công 🎉</h4>
                <p className="text-xs text-[#64748b]">Cảm ơn bạn đã ứng tuyển vào {theme.name}. Hệ thống AI sẽ tự động phân tích CV và liên hệ bạn sớm nhất!</p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold font-display text-[#1e293b] mb-1">Nộp CV Ứng Tuyển</h3>
                <p className={`text-xs ${theme.primaryText} font-semibold mb-6`}>{showApplyModal.title}</p>

                <form onSubmit={handleApplySubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-[#1e293b] mb-1">Họ và Tên ứng viên *</label>
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
                      <Upload className={`w-6 h-6 ${theme.primaryText} mx-auto mb-1`} />
                      <span className="text-xs text-[#64748b] block font-medium">
                        {cvFile ? cvFile.name : "Kéo thả file CV hoặc bấm để tải lên"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`w-full py-3 rounded-[8px] ${theme.primaryColorBtn} text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-4`}
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

      {/* Footer Bar with Dedicated Internal Staff Link */}
      <footer className="border-t border-[#e2e8f0] py-8 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748b]">
          <div>
            {theme.name} Careers Portal © 2026. Powered by SmartHire AI Multi-Tenant SaaS.
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/internal/login")}
              className="text-xs text-[#3b82f6] font-bold hover:underline inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#3b82f6]/10"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Dành Cho HR & Admin (Internal Portal Login)</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
