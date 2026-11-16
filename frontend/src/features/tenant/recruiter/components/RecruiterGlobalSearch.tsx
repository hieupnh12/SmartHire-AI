import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Briefcase,
  Calendar,
  CheckSquare,
  Compass,
  CornerDownLeft,
  FileText,
  HelpCircle,
  Layers,
  Loader2,
  PencilLine,
  PlusCircle,
  Search,
  Settings,
  Sparkles,
  User,
  Users,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { jobApi } from "@/api/tenant/jobApi";
import { applicantApi } from "@/api/tenant/applicantApi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { canViewAllJobs } from "@/features/tenant/recruiter/permissions";
import { cn } from "@/lib/utils";

export type RecruiterSearchItem = {
  id: string;
  category: "navigation" | "jobs" | "candidates";
  title: string;
  subtitle?: string;
  badge?: string;
  badgeTone?: "emerald" | "amber" | "sky" | "indigo" | "slate" | "purple";
  to: string;
  icon: LucideIcon;
  keywords?: string;
  section?: "currentJob" | "jobScoped" | "global";
};

function normalizeSearch(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
}

function matchesTokens(tokens: string[], ...fields: (string | undefined | null)[]): boolean {
  if (tokens.length === 0) return true;
  const merged = normalizeSearch(fields.filter(Boolean).join(" "));
  return tokens.every((token) => merged.includes(token));
}

export function RecruiterGlobalSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const trimmedQuery = query.trim();

  // Detect current active Job ID if the user is inside a job page
  const currentJobId = useMemo(() => {
    return location.pathname.match(/^\/recruiter\/jobs\/(\d+)(?:\/|$)/)?.[1];
  }, [location.pathname]);

  // Fetch current Job details if inside a job
  const currentJobQuery = useQuery({
    queryKey: ["jobs", "detail", currentJobId],
    queryFn: () => jobApi.get(currentJobId!),
    enabled: !!currentJobId && !!accessToken,
    staleTime: 60_000,
  });
  const currentJob = currentJobQuery.data?.data;

  // Fetch latest Job if NOT inside a job, so job-scoped features have a valid fallback target
  const canViewAll = canViewAllJobs(user);
  const latestJobQuery = useQuery({
    queryKey: ["recruiter-global-search-latest-job", canViewAll ? "all" : "my"],
    queryFn: () => jobApi.search({ page: 0, size: 1, scope: canViewAll ? "all" : "my" }),
    enabled: isOpen && !currentJobId && !!accessToken,
    staleTime: 60_000,
  });
  const latestJob = latestJobQuery.data?.data?.items?.[0];

  // Debounce query
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(trimmedQuery);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [trimmedQuery]);

  // Close dropdown on route change
  useEffect(() => {
    setIsOpen(false);
    setQuery("");
  }, [location.pathname, location.search]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  // Global hotkey: Cmd+K / Ctrl+K or "/"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const shouldFetchEntities = isOpen && !!accessToken && debouncedQuery.length >= 1;

  // Search Jobs
  const jobsQuery = useQuery({
    queryKey: ["recruiter-global-search-jobs", debouncedQuery],
    queryFn: () => jobApi.search({ q: debouncedQuery, page: 0, size: 5, scope: "all" }),
    enabled: shouldFetchEntities,
    staleTime: 30_000,
  });

  // Search Applicants
  const applicantsQuery = useQuery({
    queryKey: ["recruiter-global-search-applicants", debouncedQuery],
    queryFn: () => applicantApi.list({ q: debouncedQuery, page: 0, size: 5 }),
    enabled: shouldFetchEntities,
    staleTime: 30_000,
  });

  const isLoading = (jobsQuery.isFetching || applicantsQuery.isFetching) && debouncedQuery.length >= 1;

  const normalized = normalizeSearch(trimmedQuery);
  const tokens = useMemo(
    () => (normalized ? normalized.split(" ").filter(Boolean) : []),
    [normalized],
  );

  // Dynamic Navigation Items
  const navItemsList = useMemo<RecruiterSearchItem[]>(() => {
    if (currentJobId) {
      const jobTitle = currentJob?.title || `Tin tuyển dụng #${currentJobId}`;
      return [
        {
          id: "job-overview",
          category: "navigation",
          section: "currentJob",
          title: "Chi tiết tin tuyển dụng",
          subtitle: `${jobTitle} · Thông tin & mô tả vị trí`,
          to: `/recruiter/jobs/${currentJobId}`,
          keywords: `chi tiet tin tuyen dung job ${currentJobId} mo ta cong viec thong tin ${jobTitle}`,
          icon: Briefcase,
          badge: `Job #${currentJobId}`,
          badgeTone: "emerald",
        },
        {
          id: "job-applicants",
          category: "navigation",
          section: "currentJob",
          title: "Danh sách ứng viên",
          subtitle: `Quản lý và duyệt hồ sơ ứng viên của ${jobTitle}`,
          to: `/recruiter/jobs/${currentJobId}/applicants`,
          keywords: `ung vien ho so candidate apply nop don danh sach ${jobTitle}`,
          icon: Users,
          badge: "Ứng viên",
          badgeTone: "sky",
        },
        {
          id: "job-cv-screening",
          category: "navigation",
          section: "currentJob",
          title: "Sàng lọc hồ sơ (CV Screening)",
          subtitle: `AI trích xuất dữ liệu, phân tích kỹ năng và đánh giá CV`,
          to: `/recruiter/jobs/${currentJobId}/cvs`,
          keywords: `sang loc ho so cv screening parse resume phan tich cham diem ${jobTitle}`,
          icon: FileText,
          badge: "CV AI",
          badgeTone: "indigo",
        },
        {
          id: "job-ranking",
          category: "navigation",
          section: "currentJob",
          title: "Xếp hạng ứng viên (Matching & Ranking)",
          subtitle: `So khớp kỹ năng, điểm phù hợp và danh sách top ứng viên`,
          to: `/recruiter/jobs/${currentJobId}/rank`,
          keywords: `xep hang matching ranking top ung vien score phu hop fit ${jobTitle}`,
          icon: Sparkles,
          badge: "Ranking",
          badgeTone: "purple",
        },
        {
          id: "job-ai-interview",
          category: "navigation",
          section: "currentJob",
          title: "Phỏng vấn AI (AI Interview)",
          subtitle: `Theo dõi phòng phỏng vấn AI, kết quả và video câu trả lời`,
          to: `/recruiter/jobs/${currentJobId}/ai-interviews`,
          keywords: `ai interview phong van tu dong bot video report cau hoi ${jobTitle}`,
          icon: Bot,
          badge: "AI Video",
          badgeTone: "purple",
        },
        {
          id: "job-human-interview",
          category: "navigation",
          section: "currentJob",
          title: "Phỏng vấn trực tiếp",
          subtitle: `Hội đồng phỏng vấn, phòng họp trực tuyến và phiếu đánh giá Scorecard`,
          to: `/recruiter/jobs/${currentJobId}/interviews`,
          keywords: `phong van truc tiep human interview hoi dong meet zoom scorecard ${jobTitle}`,
          icon: Video,
          badge: "Scorecard",
          badgeTone: "amber",
        },
        {
          id: "job-assessments",
          category: "navigation",
          section: "currentJob",
          title: "Bài kiểm tra đánh giá",
          subtitle: `Ngân hàng bài test trắc nghiệm, tự luận và bài tập coding`,
          to: `/recruiter/jobs/${currentJobId}/assessments`,
          keywords: `bai kiem tra assessment test trac nghiem code cham diem thuc hanh ${jobTitle}`,
          icon: CheckSquare,
          badge: "Bài test",
          badgeTone: "sky",
        },
        {
          id: "job-pipeline",
          category: "navigation",
          section: "currentJob",
          title: "Quy trình tuyển dụng (Pipeline Kanban)",
          subtitle: `Bảng Kanban theo dõi giai đoạn ứng viên trong quy trình`,
          to: `/recruiter/jobs/${currentJobId}/pipeline`,
          keywords: `quy trinh tuyen dung pipeline kanban board giai doan stage ${jobTitle}`,
          icon: Layers,
          badge: "Pipeline",
          badgeTone: "emerald",
        },
        {
          id: "job-schedules",
          category: "navigation",
          section: "currentJob",
          title: "Lịch hẹn phỏng vấn của Job",
          subtitle: `Lịch điều phối các vòng phỏng vấn thuộc vị trí tuyển dụng này`,
          to: `/recruiter/jobs/${currentJobId}/schedules`,
          keywords: `lich hen schedule calendar phong van hen gio cuoc hen thoi gian ${jobTitle}`,
          icon: Calendar,
          badge: "Lịch hẹn",
          badgeTone: "amber",
        },
        {
          id: "job-analytics",
          category: "navigation",
          section: "currentJob",
          title: "Báo cáo phân tích tuyển dụng",
          subtitle: `Biểu đồ hiệu quả và phễu chuyển đổi của vị trí này`,
          to: `/recruiter/jobs/${currentJobId}/analytics`,
          keywords: `bao cao phan tich analytics pheu kpi funnel metric thong ke ${jobTitle}`,
          icon: BarChart3,
          badge: "Báo cáo",
          badgeTone: "indigo",
        },
        {
          id: "job-edit",
          category: "navigation",
          section: "currentJob",
          title: "Chỉnh sửa tin tuyển dụng",
          subtitle: `Cập nhật mô tả, yêu cầu kỹ năng và quyền lợi của tin #${currentJobId}`,
          to: `/recruiter/jobs/${currentJobId}/edit`,
          keywords: `chinh sua sua tin edit job cap nhat thong tin ${jobTitle}`,
          icon: PencilLine,
          badge: "Chỉnh sửa",
          badgeTone: "slate",
        },
        // Global pages accessible from anywhere
        {
          id: "nav-overview",
          category: "navigation",
          section: "global",
          title: "Trang chủ tuyển dụng (Dashboard)",
          subtitle: "Xem tổng quan hệ thống và danh sách tất cả tin tuyển dụng",
          to: "/recruiter",
          keywords: "tong quan dashboard home bang dieu khien tat ca tin tuyen dung",
          icon: Compass,
        },
        {
          id: "nav-create-job",
          category: "navigation",
          section: "global",
          title: "Tạo tin tuyển dụng mới",
          subtitle: "Mở vị trí mới và cấu hình quy trình đánh giá ứng viên",
          to: "/recruiter/jobs/new",
          keywords: "tao viec lam dang tin create new job mo vi tri tuyen moi",
          icon: PlusCircle,
        },
        {
          id: "nav-questions",
          category: "navigation",
          section: "global",
          title: "Ngân hàng câu hỏi",
          subtitle: "Quản lý câu hỏi kỹ thuật, tình huống và ngân hàng đề thi chung",
          to: "/recruiter/question-bank",
          keywords: "ngan hang cau hoi question bank ky thuat tinh huong van hoa",
          icon: HelpCircle,
        },
        {
          id: "nav-schedules-global",
          category: "navigation",
          section: "global",
          title: "Lịch hẹn phỏng vấn toàn hệ thống",
          subtitle: "Lịch phỏng vấn tổng hợp của tất cả các vị trí tuyển dụng",
          to: "/recruiter/schedules",
          keywords: "lich hen toan he thong schedule calendar phong van",
          icon: Calendar,
        },
        {
          id: "nav-notifications",
          category: "navigation",
          section: "global",
          title: "Cài đặt thông báo",
          subtitle: "Tùy chọn nhận thông báo tuyển dụng qua Web và Email",
          to: "/recruiter/notifications?tab=settings",
          keywords: "cai dat thong bao notification settings chuong gmail email",
          icon: Settings,
        },
      ];
    }

    // When NOT in a specific job (e.g. at /recruiter):
    const targetJob = latestJob;
    const hasJob = !!targetJob?.id;

    return [
      // Global navigation pages
      {
        id: "nav-overview",
        category: "navigation",
        section: "global",
        title: "Tổng quan tuyển dụng (Danh sách tin tuyển dụng)",
        subtitle: "Bảng điều khiển và quản lý danh sách việc làm của công ty",
        to: "/recruiter",
        keywords: "tong quan dashboard home bang dieu khien hoat dong tong hop danh sach viec lam",
        icon: Compass,
      },
      {
        id: "nav-create-job",
        category: "navigation",
        section: "global",
        title: "Tạo tin tuyển dụng mới",
        subtitle: "Mở vị trí mới và cấu hình quy trình đánh giá ứng viên",
        to: "/recruiter/jobs/new",
        keywords: "tao viec lam dang tin create new job mo vi tri tuyen moi",
        icon: PlusCircle,
      },
      {
        id: "nav-questions",
        category: "navigation",
        section: "global",
        title: "Ngân hàng câu hỏi",
        subtitle: "Quản lý câu hỏi kỹ thuật, tình huống và ngân hàng đề thi chung",
        to: "/recruiter/question-bank",
        keywords: "ngan hang cau hoi question bank ky thuat tinh huong van hoa",
        icon: HelpCircle,
      },
      {
        id: "nav-schedules",
        category: "navigation",
        section: "global",
        title: "Lịch hẹn phỏng vấn toàn hệ thống",
        subtitle: "Lịch tháng tổng hợp, điều phối giờ và theo dõi xác nhận của ứng viên",
        to: "/recruiter/schedules",
        keywords: "lich hen schedule calendar phong van hen gio cuoc hen thoi gian",
        icon: Calendar,
      },
      {
        id: "nav-notifications",
        category: "navigation",
        section: "global",
        title: "Cài đặt thông báo",
        subtitle: "Tùy chọn nhận thông báo tuyển dụng qua Web và Email",
        to: "/recruiter/notifications?tab=settings",
        keywords: "cai dat thong bao notification settings chuong gmail email nhac lich",
        icon: Settings,
      },
      // Job-scoped navigation items (routed to latest job if available)
      {
        id: "nav-cv-screening",
        category: "navigation",
        section: "jobScoped",
        title: "Sàng lọc hồ sơ (CV Screening)",
        subtitle: hasJob
          ? `AI trích xuất & phân tích CV · Job gần nhất: ${targetJob.title}`
          : "AI trích xuất, phân tích kỹ năng và đánh giá hồ sơ",
        to: hasJob ? `/recruiter/jobs/${targetJob.id}/cvs` : "/recruiter/jobs/new",
        keywords: "sang loc ho so cv screening parse resume phan tich cham diem ho so",
        icon: FileText,
        badge: hasJob ? `#${targetJob.id}` : "Tạo job",
        badgeTone: hasJob ? "indigo" : "slate",
      },
      {
        id: "nav-ranking",
        category: "navigation",
        section: "jobScoped",
        title: "Xếp hạng ứng viên (Matching & Ranking)",
        subtitle: hasJob
          ? `So khớp kỹ năng & xếp hạng top · Job gần nhất: ${targetJob.title}`
          : "So khớp kỹ năng, điểm phù hợp và danh sách top ứng viên",
        to: hasJob ? `/recruiter/jobs/${targetJob.id}/rank` : "/recruiter/jobs/new",
        keywords: "xep hang matching ranking top ung vien score phu hop fit",
        icon: Sparkles,
        badge: hasJob ? `#${targetJob.id}` : "Tạo job",
        badgeTone: hasJob ? "purple" : "slate",
      },
      {
        id: "nav-ai-interview",
        category: "navigation",
        section: "jobScoped",
        title: "Phỏng vấn AI (AI Interview)",
        subtitle: hasJob
          ? `Theo dõi phỏng vấn AI & video · Job gần nhất: ${targetJob.title}`
          : "Theo dõi phòng phỏng vấn AI, kết quả và video câu trả lời",
        to: hasJob ? `/recruiter/jobs/${targetJob.id}/ai-interviews` : "/recruiter/jobs/new",
        keywords: "ai interview phong van tu dong bot video report cau hoi",
        icon: Bot,
        badge: hasJob ? `#${targetJob.id}` : "Tạo job",
        badgeTone: hasJob ? "purple" : "slate",
      },
      {
        id: "nav-human-interview",
        category: "navigation",
        section: "jobScoped",
        title: "Phỏng vấn trực tiếp",
        subtitle: hasJob
          ? `Hội đồng phỏng vấn & Scorecard · Job gần nhất: ${targetJob.title}`
          : "Hội đồng phỏng vấn, phòng họp trực tuyến và phiếu đánh giá Scorecard",
        to: hasJob ? `/recruiter/jobs/${targetJob.id}/interviews` : "/recruiter/jobs/new",
        keywords: "phong van truc tiep human interview hoi dong meet zoom scorecard danh gia",
        icon: Video,
        badge: hasJob ? `#${targetJob.id}` : "Tạo job",
        badgeTone: hasJob ? "amber" : "slate",
      },
      {
        id: "nav-assessments",
        category: "navigation",
        section: "jobScoped",
        title: "Bài kiểm tra đánh giá",
        subtitle: hasJob
          ? `Ngân hàng bài test trắc nghiệm & coding · Job gần nhất: ${targetJob.title}`
          : "Ngân hàng bài test trắc nghiệm, tự luận và bài tập lập trình",
        to: hasJob ? `/recruiter/jobs/${targetJob.id}/assessments` : "/recruiter/jobs/new",
        keywords: "bai kiem tra assessment test trac nghiem code cham diem thuc hanh",
        icon: CheckSquare,
        badge: hasJob ? `#${targetJob.id}` : "Tạo job",
        badgeTone: hasJob ? "sky" : "slate",
      },
      {
        id: "nav-pipeline",
        category: "navigation",
        section: "jobScoped",
        title: "Quy trình tuyển dụng (Pipeline Kanban)",
        subtitle: hasJob
          ? `Bảng Kanban quản lý ứng viên · Job gần nhất: ${targetJob.title}`
          : "Bảng Kanban theo dõi giai đoạn ứng viên trong quy trình tuyển dụng",
        to: hasJob ? `/recruiter/jobs/${targetJob.id}/pipeline` : "/recruiter/jobs/new",
        keywords: "quy trinh tuyen dung pipeline kanban board giai doan stage",
        icon: Layers,
        badge: hasJob ? `#${targetJob.id}` : "Tạo job",
        badgeTone: hasJob ? "emerald" : "slate",
      },
      {
        id: "nav-applicants",
        category: "navigation",
        section: "jobScoped",
        title: "Danh sách ứng viên (Applicants)",
        subtitle: hasJob
          ? `Quản lý hồ sơ ứng viên · Job gần nhất: ${targetJob.title}`
          : "Quản lý và duyệt tất cả hồ sơ ứng viên ứng tuyển",
        to: hasJob ? `/recruiter/jobs/${targetJob.id}/applicants` : "/recruiter/jobs/new",
        keywords: "ung vien ho so candidate apply nop don danh sach",
        icon: Users,
        badge: hasJob ? `#${targetJob.id}` : "Tạo job",
        badgeTone: hasJob ? "sky" : "slate",
      },
    ];
  }, [currentJobId, currentJob, latestJob]);

  // Grouped search results
  const results = useMemo(() => {
    // 1. Navigation items filtered by query tokens
    const filteredNav = navItemsList.filter((item) => {
      if (tokens.length === 0) return true;
      return matchesTokens(tokens, item.title, item.subtitle, item.keywords, item.badge);
    });

    // 2. Jobs matching query
    const jobItems: RecruiterSearchItem[] = [];
    if (tokens.length > 0) {
      const fetchedJobs = jobsQuery.data?.data?.items ?? [];
      for (const j of fetchedJobs) {
        jobItems.push({
          id: `job-${j.id}`,
          category: "jobs",
          title: j.title,
          subtitle: `${j.department || "Tuyển dụng"} · ${j.headcount ?? 1} chỉ tiêu · Cập nhật ${j.updatedAt?.slice(0, 10) || ""}`,
          badge:
            j.status === "PUBLISHED"
              ? "Đang tuyển"
              : j.status === "DRAFT"
                ? "Bản nháp"
                : "Đã đóng",
          badgeTone:
            j.status === "PUBLISHED"
              ? "emerald"
              : j.status === "DRAFT"
                ? "amber"
                : "slate",
          to: `/recruiter/jobs/${j.id}`,
          icon: Briefcase,
        });
      }
    }

    // 3. Candidates matching query
    const candidateItems: RecruiterSearchItem[] = [];
    if (tokens.length > 0) {
      const fetchedApplicants = applicantsQuery.data?.data?.items ?? [];
      for (const a of fetchedApplicants) {
        candidateItems.push({
          id: `candidate-${a.id}`,
          category: "candidates",
          title: a.candidateName,
          subtitle: `${a.jobTitle} · ${a.candidateEmail}`,
          badge: a.status,
          badgeTone:
            a.status === "HIRED"
              ? "emerald"
              : a.status === "REJECTED"
                ? "slate"
                : "sky",
          to: a.jobId ? `/recruiter/jobs/${a.jobId}/applicants?applicantId=${a.id}` : "/recruiter",
          icon: User,
        });
      }
    }

    return {
      navigation: filteredNav,
      jobs: jobItems,
      candidates: candidateItems,
      all: [...filteredNav, ...jobItems, ...candidateItems],
    };
  }, [tokens, navItemsList, jobsQuery.data, applicantsQuery.data]);

  // Reset or clamp active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [trimmedQuery]);

  useEffect(() => {
    if (results.all.length === 0) return;
    if (activeIndex >= results.all.length) {
      setActiveIndex(0);
    }
  }, [results.all.length, activeIndex]);

  // Auto-scroll active item into view
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    itemRefs.current[activeIndex]?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [activeIndex, isOpen]);

  const handleSelect = (item: RecruiterSearchItem) => {
    navigate(item.to);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    const total = results.all.length;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      if (total > 0) {
        setActiveIndex((prev) => (prev + 1) % total);
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      if (total > 0) {
        setActiveIndex((prev) => (prev - 1 + total) % total);
      }
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (total > 0 && results.all[activeIndex]) {
        handleSelect(results.all[activeIndex]);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative mx-auto hidden min-w-0 max-w-xl flex-1 md:block">
      {/* Search Input Bar */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Tìm ứng viên, việc làm, tính năng... (Ctrl + K)"
          aria-label="Tìm kiếm toàn hệ thống"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          className="min-h-10 w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-1.5 pl-10 pr-24 text-sm text-[var(--color-on-surface)] outline-none transition-all placeholder:text-slate-400 focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/15"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
          {isLoading && (
            <Loader2 className="size-3.5 animate-spin text-brand-primary" aria-hidden="true" />
          )}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="grid size-5 place-items-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              aria-label="Xoá tìm kiếm"
            >
              <X className="size-3" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 shadow-2xs">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Search Results Dropdown Panel */}
      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          aria-label="Kết quả tìm kiếm toàn hệ thống"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[480px] overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-xl shadow-slate-900/10 backdrop-blur-lg animate-in fade-in zoom-in-95 duration-150 flex flex-col"
        >
          {results.all.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Search className="mx-auto size-8 text-slate-300" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-slate-700">
                Không tìm thấy kết quả phù hợp
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Thử tìm với từ khóa khác như tên ứng viên, vị trí tuyển dụng hoặc tính năng hệ thống.
              </p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto p-2 divide-y divide-slate-100">
              {/* Category 1: Navigation / Features */}
              {results.navigation.length > 0 && (
                <div className="py-1">
                  <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {trimmedQuery
                      ? "Điều hướng & Tính năng"
                      : currentJobId
                        ? `Tính năng Job hiện tại (${currentJob?.title || `#${currentJobId}`})`
                        : "Gợi ý điều hướng nhanh"}
                  </div>
                  <div className="space-y-0.5">
                    {results.navigation.map((item) => {
                      const itemGlobalIndex = results.all.findIndex((x) => x.id === item.id);
                      const isActive = itemGlobalIndex === activeIndex;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          ref={(el) => {
                            itemRefs.current[itemGlobalIndex] = el;
                          }}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onMouseEnter={() => setActiveIndex(itemGlobalIndex)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelect(item);
                          }}
                          onClick={() => handleSelect(item)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-xs transition-colors",
                            isActive
                              ? "bg-[var(--color-primary-subtle)] text-brand-primary font-medium"
                              : "text-slate-700 hover:bg-slate-50",
                          )}
                        >
                          <span
                            className={cn(
                              "grid size-7 shrink-0 place-items-center rounded-lg border",
                              isActive
                                ? "border-brand-primary/30 bg-white text-brand-primary"
                                : "border-slate-200 bg-slate-50 text-slate-500",
                            )}
                          >
                            <Icon className="size-3.5" aria-hidden="true" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-semibold text-slate-900 leading-snug">
                                {item.title}
                              </p>
                              {item.badge && (
                                <span
                                  className={cn(
                                    "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.2 text-[10px] font-semibold border",
                                    item.badgeTone === "emerald" &&
                                      "bg-emerald-50 text-emerald-700 border-emerald-200",
                                    item.badgeTone === "indigo" &&
                                      "bg-indigo-50 text-indigo-700 border-indigo-200",
                                    item.badgeTone === "purple" &&
                                      "bg-purple-50 text-purple-700 border-purple-200",
                                    item.badgeTone === "sky" &&
                                      "bg-sky-50 text-sky-700 border-sky-200",
                                    item.badgeTone === "amber" &&
                                      "bg-amber-50 text-amber-700 border-amber-200",
                                    item.badgeTone === "slate" &&
                                      "bg-slate-100 text-slate-600 border-slate-200",
                                  )}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {item.subtitle && (
                              <p className="truncate text-[11px] text-slate-500">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                          <ArrowRight
                            className={cn(
                              "size-3.5 shrink-0 transition-opacity",
                              isActive ? "opacity-100 text-brand-primary" : "opacity-0",
                            )}
                            aria-hidden="true"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category 2: Jobs */}
              {results.jobs.length > 0 && (
                <div className="py-1">
                  <div className="flex items-center justify-between px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Tin tuyển dụng ({results.jobs.length})</span>
                  </div>
                  <div className="space-y-0.5">
                    {results.jobs.map((item) => {
                      const itemGlobalIndex = results.all.findIndex((x) => x.id === item.id);
                      const isActive = itemGlobalIndex === activeIndex;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          ref={(el) => {
                            itemRefs.current[itemGlobalIndex] = el;
                          }}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onMouseEnter={() => setActiveIndex(itemGlobalIndex)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelect(item);
                          }}
                          onClick={() => handleSelect(item)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-xs transition-colors",
                            isActive
                              ? "bg-[var(--color-primary-subtle)] text-brand-primary font-medium"
                              : "text-slate-700 hover:bg-slate-50",
                          )}
                        >
                          <span
                            className={cn(
                              "grid size-7 shrink-0 place-items-center rounded-lg border",
                              isActive
                                ? "border-brand-primary/30 bg-white text-brand-primary"
                                : "border-slate-200 bg-slate-50 text-slate-500",
                            )}
                          >
                            <Icon className="size-3.5" aria-hidden="true" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-semibold text-slate-900 leading-snug">
                                {item.title}
                              </p>
                              {item.badge && (
                                <span
                                  className={cn(
                                    "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.2 text-[10px] font-semibold border",
                                    item.badgeTone === "emerald" &&
                                      "bg-emerald-50 text-emerald-700 border-emerald-200",
                                    item.badgeTone === "amber" &&
                                      "bg-amber-50 text-amber-700 border-amber-200",
                                    item.badgeTone === "slate" &&
                                      "bg-slate-100 text-slate-600 border-slate-200",
                                  )}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {item.subtitle && (
                              <p className="truncate text-[11px] text-slate-500">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                          <ArrowRight
                            className={cn(
                              "size-3.5 shrink-0 transition-opacity",
                              isActive ? "opacity-100 text-brand-primary" : "opacity-0",
                            )}
                            aria-hidden="true"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category 3: Candidates */}
              {results.candidates.length > 0 && (
                <div className="py-1">
                  <div className="flex items-center justify-between px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Ứng viên & Hồ sơ ({results.candidates.length})</span>
                  </div>
                  <div className="space-y-0.5">
                    {results.candidates.map((item) => {
                      const itemGlobalIndex = results.all.findIndex((x) => x.id === item.id);
                      const isActive = itemGlobalIndex === activeIndex;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          ref={(el) => {
                            itemRefs.current[itemGlobalIndex] = el;
                          }}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onMouseEnter={() => setActiveIndex(itemGlobalIndex)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelect(item);
                          }}
                          onClick={() => handleSelect(item)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-xs transition-colors",
                            isActive
                              ? "bg-[var(--color-primary-subtle)] text-brand-primary font-medium"
                              : "text-slate-700 hover:bg-slate-50",
                          )}
                        >
                          <span
                            className={cn(
                              "grid size-7 shrink-0 place-items-center rounded-lg border",
                              isActive
                                ? "border-brand-primary/30 bg-white text-brand-primary"
                                : "border-slate-200 bg-slate-50 text-slate-500",
                            )}
                          >
                            <Icon className="size-3.5" aria-hidden="true" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-semibold text-slate-900 leading-snug">
                                {item.title}
                              </p>
                              {item.badge && (
                                <span className="inline-flex shrink-0 items-center rounded-full bg-blue-50 px-1.5 py-0.2 text-[10px] font-semibold text-blue-700 border border-blue-200">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {item.subtitle && (
                              <p className="truncate text-[11px] text-slate-500">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                          <ArrowRight
                            className={cn(
                              "size-3.5 shrink-0 transition-opacity",
                              isActive ? "opacity-100 text-brand-primary" : "opacity-0",
                            )}
                            aria-hidden="true"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Keyboard Navigation Tip Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-3.5 py-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-2xs">
                  ↑
                </kbd>
                <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-2xs">
                  ↓
                </kbd>
                <span className="text-slate-600">Di chuyển</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="inline-flex items-center rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-2xs">
                  <CornerDownLeft className="size-2.5 mr-0.5" /> Enter
                </kbd>
                <span className="text-slate-600">Chọn</span>
              </span>
            </div>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-2xs">
                Esc
              </kbd>
              <span className="text-slate-600">Đóng</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
