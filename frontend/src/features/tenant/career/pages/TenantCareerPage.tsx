import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation, Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { getTenantTheme, getTenantThemeStyle } from "@/lib/tenantTheme";
import { jobApi } from "@/api/tenant/jobApi";
import { applicantApi } from "@/api/tenant/applicantApi";
import { landingApi } from "@/api/tenant/landingApi";
import { cvApi } from "@/api/tenant/cvApi";
import type { PublicJob } from "@/api/types/job";
import { getApiErrorMessage } from "@/lib/axios";
import { formatSalaryText } from "@/lib/formatSalary";
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
  CircleDollarSign,
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
  Quote,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  SlidersHorizontal,
  Settings,
  FileText,
  ChevronDown,
  Check,
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

type FeaturedFilterType = "location" | "salary" | "experience";

const FEATURED_FILTER_LABELS: Record<FeaturedFilterType, string> = {
  location: "Địa điểm",
  salary: "Mức lương",
  experience: "Kinh nghiệm",
};

const SALARY_FILTERS = [
  { value: "ALL", label: "Tất cả" },
  { value: "UNDER_10", label: "Dưới 10 triệu", min: 0, max: 10 },
  { value: "10_15", label: "Từ 10-15 triệu", min: 10, max: 15 },
  { value: "15_20", label: "Từ 15-20 triệu", min: 15, max: 20 },
  { value: "20_25", label: "Từ 20-25 triệu", min: 20, max: 25 },
  { value: "25_30", label: "Từ 25-30 triệu", min: 25, max: 30 },
  { value: "OVER_30", label: "Trên 30 triệu", min: 30 },
] as const;

const EXPERIENCE_FILTERS = [
  { value: "ALL", label: "Tất cả" },
  { value: "NONE", label: "Chưa có kinh nghiệm" },
  { value: "UP_TO_1", label: "1 năm trở xuống" },
  { value: "ONE", label: "1 năm" },
  { value: "TWO", label: "2 năm" },
  { value: "THREE", label: "3 năm" },
  { value: "FOUR_TO_FIVE", label: "Từ 4-5 năm" },
  { value: "OVER_FIVE", label: "Trên 5 năm" },
] as const;

function salaryInMillions(salary?: string | null) {
  if (!salary || !/VND|₫|đồng/i.test(salary)) return null;
  const amount = salary.match(/\d[\d.,\s]*/)?.[0];
  if (!amount) return null;
  const value = Number(amount.replace(/\D/g, ""));
  return Number.isFinite(value) ? value / 1_000_000 : null;
}

const formatSalary = formatSalaryText;

function cvStatusLabel(status: string) {
  return ({
    UPLOADED: "Đã tải lên",
    PARSING: "Đang đọc CV",
    PARSED: "Đã đọc CV",
    EXTRACTING: "Đang trích xuất",
    ANALYZING: "Đang phân tích",
    ANALYZED: "Đã phân tích",
    FAILED: "Cần tải lại",
  } as Record<string, string>)[status] ?? status;
}

function normalizedSearchValue(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLocaleLowerCase("vi-VN");
}

function isWorkModeText(value?: string | null) {
  if (!value) return false;
  return /hybrid|remote|tu xa|tai van phong|onsite/.test(normalizedSearchValue(value));
}

function locationLabel(value?: string | null) {
  if (!value || isWorkModeText(value)) return null;
  const normalized = normalizedSearchValue(value);
  if (/^(tp\.?\s*)?(ho chi minh|hcm)$/.test(normalized)) return "TP. Hồ Chí Minh";
  if (/^(tp\.?\s*)?ha noi$/.test(normalized)) return "Hà Nội";
  if (/^(tp\.?\s*)?da nang$/.test(normalized)) return "Đà Nẵng";
  return value.trim();
}

function workModeLabel(value?: string | null) {
  if (!value) return null;
  const normalized = normalizedSearchValue(value);
  if (normalized.includes("hybrid")) return "Hybrid";
  if (normalized.includes("remote") || normalized.includes("tu xa")) return "Từ xa";
  if (normalized.includes("onsite") || normalized.includes("tai van phong")) return "Tại văn phòng";
  return value.trim().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toLocaleUpperCase("vi-VN"));
}

function employmentTypeLabel(value?: string | null) {
  if (!value) return "";
  const labels: Record<string, string> = {
    FULL_TIME: "Toàn thời gian",
    PART_TIME: "Bán thời gian",
    CONTRACT: "Hợp đồng",
    INTERNSHIP: "Thực tập",
  };
  return labels[value] ?? value.replaceAll("_", " ").toLocaleLowerCase("vi-VN");
}

function JobContentList({ content }: { content: string }) {
  const items = content
    .split(/\r?\n/)
    .map((item) => item.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter(Boolean);

  return (
    <ul className="mt-5 space-y-3 text-sm leading-7 text-[var(--color-on-surface-variant)]">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-start gap-3">
          <span className="mt-2.5 size-2 shrink-0 rounded-full bg-[var(--color-primary)] shadow-[0_0_0_4px_var(--color-primary-subtle)]" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function matchesExperienceFilter(job: PublicJob, filter: string) {
  const years = job.minYearsExperience;
  if (filter === "ALL") return true;
  if (filter === "NONE") return years == null || years === 0;
  if (years == null) return false;
  if (filter === "UP_TO_1") return years <= 1;
  if (filter === "ONE") return years === 1;
  if (filter === "TWO") return years === 2;
  if (filter === "THREE") return years === 3;
  if (filter === "FOUR_TO_FIVE") return years >= 4 && years <= 5;
  return filter === "OVER_FIVE" && years > 5;
}

function matchesSalaryFilter(job: PublicJob, filter: string) {
  if (filter === "ALL") return true;
  const salary = salaryInMillions(job.salary);
  if (salary == null) return false;
  const range = SALARY_FILTERS.find((item) => item.value === filter);
  if (!range || !("min" in range)) return true;
  if (!("max" in range)) return salary > range.min;
  if (range.value === "25_30") return salary >= range.min && salary <= range.max;
  return salary >= range.min && salary < range.max;
}

function FeaturedFilterDropdown({ value, onChange }: {
  value: FeaturedFilterType;
  onChange: (value: FeaturedFilterType) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const options: Array<{ value: FeaturedFilterType; description: string; icon: React.ElementType }> = [
    { value: "location", description: "Tìm việc theo khu vực làm việc", icon: MapPin },
    { value: "salary", description: "Chọn khoảng thu nhập mong muốn", icon: CircleDollarSign },
    { value: "experience", description: "Lọc theo số năm kinh nghiệm", icon: Briefcase },
  ];

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full shrink-0 lg:w-72">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((current) => !current)} className={`flex min-h-12 w-full items-center rounded-lg border bg-white px-4 text-left shadow-sm transition-[border-color,box-shadow] ${open ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/15" : "border-[var(--color-border-default)] hover:border-[var(--color-primary)]/60"}`}>
        <SlidersHorizontal className="mr-3 size-4 shrink-0 text-slate-400" aria-hidden="true" />
        <span className="mr-2 text-sm text-slate-500">Lọc theo:</span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{FEATURED_FILTER_LABELS[value]}</span>
        <ChevronDown className={`ml-2 size-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" aria-label="Chọn tiêu chí lọc" className="absolute left-0 top-[calc(100%+8px)] z-40 w-full min-w-[280px] overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
          <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Tiêu chí lọc</p>
          {options.map((option) => {
            const Icon = option.icon;
            const selected = value === option.value;
            return (
              <button key={option.value} type="button" role="menuitemradio" aria-checked={selected} onClick={() => { onChange(option.value); setOpen(false); }} className={`flex min-h-14 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${selected ? "bg-[var(--color-primary-subtle)]" : "hover:bg-[var(--color-surface-alt)]"}`}>
                <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${selected ? "bg-white text-[var(--color-primary)] shadow-sm" : "bg-[var(--color-surface-container)] text-slate-500"}`}><Icon className="size-4" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1"><span className={`block text-sm font-semibold ${selected ? "text-[var(--color-primary)]" : "text-slate-800"}`}>{FEATURED_FILTER_LABELS[option.value]}</span><span className="mt-0.5 block text-xs text-slate-500">{option.description}</span></span>
                {selected && <Check className="size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterValueDropdown({ label, value, options, icon: Icon, onChange }: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  icon: React.ElementType;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? options[0]?.label;

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative min-w-0 sm:min-w-52">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className={`flex min-h-11 w-full items-center gap-2 rounded-lg border bg-white px-3 text-left text-sm shadow-sm transition-colors ${open ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/15" : "border-[var(--color-border-default)] hover:border-[var(--color-primary)]/60"}`}>
        <Icon className="size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{selectedLabel}</span>
        <ChevronDown className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && <div role="listbox" aria-label={label} className="absolute left-0 top-[calc(100%+8px)] z-40 max-h-64 w-full min-w-56 overflow-y-auto rounded-xl border border-[var(--color-border-default)] bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">{options.map((option) => {
        const selected = value === option.value;
        return <button key={option.value} type="button" role="option" aria-selected={selected} onClick={() => { onChange(option.value); setOpen(false); }} className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm transition-colors ${selected ? "bg-[var(--color-primary-subtle)] font-semibold text-[var(--color-primary)]" : "text-slate-700 hover:bg-[var(--color-surface-alt)]"}`}><span className="min-w-0 break-words">{option.label}</span>{selected && <Check className="size-4 shrink-0" aria-hidden="true" />}</button>;
      })}</div>}
    </div>
  );
}

function LocationDropdown({ locations, value, onChange, jobs }: {
  locations: string[];
  value: string;
  onChange: (location: string) => void;
  jobs: PublicJob[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const label = value === "ALL" ? "Tất cả địa điểm" : value;
  const countJobs = (location: string) => location === "ALL" ? jobs.length : jobs.filter((job) => locationLabel(job.location) === location).length;

  return (
    <div ref={containerRef} className="career-location-picker relative min-w-0 md:border-r">
      <input type="hidden" name="location" value={value === "ALL" ? "" : value} />
      <button type="button" className="flex min-h-16 w-full items-center px-5 text-left" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><MapPin className="size-4" aria-hidden="true" /></span>
        <span className="ml-3 min-w-0 flex-1"><span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Địa điểm</span><span className="mt-0.5 block truncate text-sm font-semibold text-slate-800">{label}</span></span>
        <ChevronDown className={`ml-3 size-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="career-location-menu absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.18)] md:min-w-[320px]">
          <div className="border-b border-slate-100 px-3 pb-2.5 pt-1.5"><p className="text-sm font-semibold text-slate-900">Chọn địa điểm làm việc</p><p className="mt-0.5 text-xs text-slate-500">Hiển thị cơ hội phù hợp theo khu vực</p></div>
          <div role="listbox" aria-label="Chọn địa điểm" className="mt-2 max-h-64 space-y-1 overflow-y-auto overscroll-contain">
            {locations.map((location) => {
              const selected = value === location;
              return <button key={location} type="button" role="option" aria-selected={selected} onClick={() => { onChange(location); setOpen(false); }} className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors ${selected ? "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]" : "text-slate-700 hover:bg-slate-50"}`}><span className={`grid size-8 shrink-0 place-items-center rounded-lg ${selected ? "bg-white" : "bg-slate-100"}`}>{selected ? <Check className="size-4" aria-hidden="true" /> : <MapPin className="size-4 text-slate-400" aria-hidden="true" />}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{location === "ALL" ? "Tất cả địa điểm" : location}</span><span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-500 shadow-sm">{countJobs(location)} việc</span></button>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FeaturedJobCard({ job, tenantName, primaryColor, matchedSkills }: {
  job: PublicJob;
  tenantName: string;
  primaryColor: string;
  matchedSkills?: string[];
}) {
  const deadline = getDeadlineInfo(job.deadline);
  const location = locationLabel(job.location);
  const workMode = workModeLabel(job.workMode ?? (isWorkModeText(job.location) ? job.location : null));
  const employmentType = employmentTypeLabel(job.employmentType);
  return (
    <article className="career-featured-job-card group flex min-w-0 flex-col rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-[var(--color-primary)]/45 hover:shadow-[0_16px_34px_rgba(15,23,42,0.10)]">
      <div className="flex min-w-0 gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)] text-xl font-semibold shadow-sm" style={{ color: primaryColor }} aria-hidden="true">{tenantName.charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">{deadline?.urgent && <span className="mt-0.5 shrink-0 rounded-full bg-[var(--color-warning-container)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-on-warning-container)]">Tuyển gấp</span>}<h3 className="line-clamp-2 text-lg font-semibold leading-6 text-[var(--color-on-surface)]"><Link to={`/jobs/${job.id}`} className="text-left transition-colors hover:text-[var(--color-primary)]">{job.title}</Link></h3></div>
          <p className="mt-2 truncate text-sm text-[var(--color-on-surface-variant)]">{tenantName}{job.department ? ` · ${job.department}` : ""}</p>
        </div>
      </div>
      <div className="mt-5 flex min-h-7 flex-wrap gap-2">
        {location && <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[var(--color-surface-alt)] px-3 py-1.5 text-xs font-medium text-[var(--color-on-surface-variant)]"><MapPin className="size-3.5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" /><span className="truncate">{location}</span></span>}
        {workMode && <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--color-primary)]"><Laptop className="size-3.5" aria-hidden="true" />{workMode}</span>}
        {employmentType && <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-alt)] px-3 py-1.5 text-xs font-medium text-[var(--color-on-surface-variant)]"><Briefcase className="size-3.5" aria-hidden="true" />{employmentTypeLabel(job.employmentType)}</span>}
      </div>
      {matchedSkills && matchedSkills.length > 0 && <p className="mt-3 text-xs leading-5 text-[var(--color-primary)]">Phù hợp: {matchedSkills.slice(0, 3).join(", ")}{matchedSkills.length > 3 ? ` +${matchedSkills.length - 3}` : ""}</p>}
      <div className="mt-5 flex items-end justify-between gap-4 border-t border-[var(--color-border-default)] pt-4">
        <div>{job.salary ? <p className="text-lg font-semibold text-emerald-700">{formatSalaryText(job.salary)}</p> : <p className="text-sm font-medium text-[var(--color-on-surface-variant)]">Lương thỏa thuận</p>}{deadline?.urgent && <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700"><Clock className="size-3.5" aria-hidden="true" />Còn {deadline.daysRemaining} ngày</p>}</div>
        <Link to={`/jobs/${job.id}`} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-primary-subtle)] px-4 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)] hover:text-white">Xem chi tiết <ArrowRight className="size-3.5" aria-hidden="true" /></Link>
      </div>
    </article>
  );
}

export function TenantCareerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { jobId } = useParams<{ jobId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isJobsPage = location.pathname.endsWith("/jobs");
  const isJobDetailPage = Boolean(jobId);
  
  const rawTenantCode = getTenantIdFromWindow() || "acme";
  const theme = getTenantTheme(rawTenantCode);

  const initialQuery = isJobsPage ? searchParams.get("q")?.trim() ?? "" : "";
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [submittedSearch, setSubmittedSearch] = useState(initialQuery);
  const [selectedDepartment, setSelectedDepartment] = useState<string>(searchParams.get("department") || "ALL");
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get("location") || "ALL");
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [featuredFilterType, setFeaturedFilterType] = useState<FeaturedFilterType>("location");
  const [featuredLocation, setFeaturedLocation] = useState("ALL");
  const [featuredWorkMode, setFeaturedWorkMode] = useState("ALL");
  const [featuredSalary, setFeaturedSalary] = useState("ALL");
  const [featuredExperience, setFeaturedExperience] = useState("ALL");
  const [selectedSkill, setSelectedSkill] = useState("ALL");
  const [selectedEmploymentType, setSelectedEmploymentType] = useState("ALL");
  const [selectedEducationLevel, setSelectedEducationLevel] = useState("ALL");
  const [applicationStatus, setApplicationStatus] = useState<"ALL" | "OPEN">("ALL");
  const [showJobsFilters, setShowJobsFilters] = useState(false);
  const [jobView, setJobView] = useState<"featured" | "recommended">("featured");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showApplyModal, setShowApplyModal] = useState<PublicJob | null>(null);

  // Apply Form State
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [selectedCvId, setSelectedCvId] = useState<number | null>(null);
  const [applyPending, setApplyPending] = useState(false);
  const [applySubmitted, setApplySubmitted] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const token = useAuthStore((s) => s.accessToken);
  const authUser = useAuthStore((s) => s.user);
  const isCandidate = Boolean(token) && authUser?.role === "CANDIDATE";
  const publicJobs = useQuery({
    queryKey: ["public-jobs", isJobsPage ? submittedSearch : ""],
    queryFn: () => jobApi.publicList(isJobsPage ? submittedSearch || undefined : undefined),
  });
  const publicJobDetail = useQuery({
    queryKey: ["public-job", jobId],
    queryFn: () => jobApi.publicGet(jobId!),
    enabled: isJobDetailPage && Boolean(jobId),
  });
  const publicLanding = useQuery({
    queryKey: ["public-landing", rawTenantCode],
    queryFn: () => landingApi.getPublicLanding(),
    staleTime: 0,
    refetchOnMount: "always",
  });
  const candidateCvs = useQuery({
    queryKey: ["career-candidate-cvs"],
    queryFn: cvApi.mine,
    enabled: isCandidate,
  });
  const analyzedCv = candidateCvs.data?.data.find((cv) => cv.status === "ANALYZED");
  const candidateCvDetail = useQuery({
    queryKey: ["career-candidate-cv", analyzedCv?.id],
    queryFn: () => cvApi.get(analyzedCv!.id),
    enabled: Boolean(analyzedCv),
  });

  const customLanding = publicLanding.data?.data;
  const buildJobsHref = (overrides?: { query?: string; department?: string; location?: string }) => {
    const params = new URLSearchParams();
    const query = overrides?.query ?? searchTerm.trim();
    const department = overrides?.department ?? "ALL";
    const location = overrides?.location ?? selectedLocation;
    if (query) params.set("q", query);
    if (department !== "ALL") params.set("department", department);
    if (location !== "ALL") params.set("location", location);
    const queryString = params.toString();
    return queryString ? `/jobs?${queryString}` : "/jobs";
  };
  const jobsHref = buildJobsHref();

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

  const filteredJobs = jobsList.filter(
    (job) =>
      (selectedDepartment === "ALL" || job.department === selectedDepartment) &&
      (selectedLocation === "ALL" || locationLabel(job.location) === selectedLocation) &&
      (featuredWorkMode === "ALL" || workModeLabel(job.workMode ?? (isWorkModeText(job.location) ? job.location : null)) === featuredWorkMode) &&
      (selectedSkill === "ALL" || job.skills.includes(selectedSkill)) &&
      (selectedEmploymentType === "ALL" || job.employmentType === selectedEmploymentType) &&
      (selectedEducationLevel === "ALL" || job.educationLevel === selectedEducationLevel) &&
      (applicationStatus === "ALL" || job.acceptingApplications) &&
      matchesSalaryFilter(job, featuredSalary) &&
      matchesExperienceFilter(job, featuredExperience),
  );

  const departments = ["ALL", ...new Set(jobsList.map((job) => job.department).filter(Boolean))] as string[];
  const locations = ["ALL", ...new Set(jobsList.map((job) => locationLabel(job.location)).filter((value): value is string => Boolean(value)))];
  const workModes = ["ALL", ...new Set(jobsList.map((job) => workModeLabel(job.workMode ?? (isWorkModeText(job.location) ? job.location : null))).filter((value): value is string => Boolean(value)))];
  const skills = ["ALL", ...new Set(jobsList.flatMap((job) => job.skills).filter(Boolean))].sort((a, b) => a === "ALL" ? -1 : b === "ALL" ? 1 : a.localeCompare(b));
  const employmentTypes = ["ALL", ...new Set(jobsList.map((job) => job.employmentType).filter((value): value is string => Boolean(value)))];
  const educationLevels = ["ALL", ...new Set(jobsList.map((job) => job.educationLevel).filter((value): value is string => Boolean(value)))];
  const activeJobFilterCount = [selectedDepartment, selectedLocation, featuredWorkMode, featuredSalary, featuredExperience, selectedSkill, selectedEmploymentType, selectedEducationLevel, applicationStatus].filter((value) => value !== "ALL").length + (submittedSearch ? 1 : 0);
  const featuredJobs = jobsList.filter((job) => {
    if (featuredFilterType === "location") {
      const jobLocation = locationLabel(job.location);
      const jobWorkMode = workModeLabel(job.workMode ?? (isWorkModeText(job.location) ? job.location : null));
      return (featuredLocation === "ALL" || jobLocation === featuredLocation) && (featuredWorkMode === "ALL" || jobWorkMode === featuredWorkMode);
    }
    if (featuredFilterType === "experience") return matchesExperienceFilter(job, featuredExperience);
    return matchesSalaryFilter(job, featuredSalary);
  }).slice(0, 8);
  const cvSkillNames = new Set((candidateCvDetail.data?.data.skills ?? []).flatMap((skill) => [skill.skillName, skill.canonicalName].map((name) => name.trim().toLocaleLowerCase())));
  const recommendedJobs = jobsList
    .map((job) => ({
      job,
      matchedSkills: job.skills.filter((skill) => cvSkillNames.has(skill.trim().toLocaleLowerCase())),
    }))
    .filter((item) => item.matchedSkills.length > 0)
    .sort((a, b) => b.matchedSkills.length - a.matchedSkills.length)
    .slice(0, 8);
  const heroSlides = [
    {
      eyebrow: customLanding?.hero?.badgeText || "Cơ hội tại " + theme.name,
      title: customLanding?.hero?.title || `Kiến tạo tương lai công nghệ cùng ${theme.name}`,
      description: customLanding?.hero?.subtitle || "Phát triển năng lực, làm việc cùng đội ngũ giàu kinh nghiệm và tạo ra những sản phẩm có giá trị.",
      image: customLanding?.hero?.bannerImageUrl || theme.heroImage || "/acme_tech_hero.png",
    },
    {
      eyebrow: "Con người và văn hóa",
      title: "Một môi trường để bạn phát triển mỗi ngày",
      description: "Cùng cộng tác, học hỏi và biến những ý tưởng mới thành kết quả thiết thực.",
      image: customLanding?.about?.cultureImageUrl || theme.cultureImage || "/acme_culture.png",
    },
    {
      eyebrow: `${jobsList.length} vị trí đang mở`,
      title: "Tìm đúng cơ hội cho bước tiến tiếp theo",
      description: "Khám phá các vị trí phù hợp với kỹ năng, địa điểm và mục tiêu nghề nghiệp của bạn.",
      image: customLanding?.hero?.bannerImageUrl || theme.heroImage || "/acme_tech_hero.png",
    },
  ];

  useEffect(() => {
    if (heroPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActiveHeroSlide((slide) => (slide + 1) % heroSlides.length), 7000);
    return () => window.clearInterval(timer);
  }, [heroPaused, heroSlides.length]);

  const startApply = (job: PublicJob) => {
    if (!job.acceptingApplications) return;
    if (!token) {
      navigate("/login", { state: { from: `/jobs/${job.id}` } });
      return;
    }
    setApplyError(null);
    setCvFile(null);
    setSelectedCvId(candidateCvs.data?.data[0]?.id ?? null);
    setShowApplyModal(job);
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchTerm.trim();
    setSubmittedSearch(query);
    setSelectedDepartment("ALL");
    const params: Record<string, string> = {};
    if (query) params.q = query;
    if (selectedLocation !== "ALL") params.location = selectedLocation;
    setSearchParams(params);
  };

  const resetJobFilters = () => {
    setSearchTerm("");
    setSubmittedSearch("");
    setSelectedDepartment("ALL");
    setSelectedLocation("ALL");
    setFeaturedWorkMode("ALL");
    setFeaturedSalary("ALL");
    setFeaturedExperience("ALL");
    setSelectedSkill("ALL");
    setSelectedEmploymentType("ALL");
    setSelectedEducationLevel("ALL");
    setApplicationStatus("ALL");
    setSearchParams({});
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showApplyModal) return;
    if (!token) {
      navigate("/login");
      return;
    }
    if (!selectedCvId && !cvFile) {
      setApplyError("Vui lòng chọn một CV đã lưu hoặc tải CV mới.");
      return;
    }
    const jobId = showApplyModal.id;
    setApplyPending(true);
    setApplyError(null);
    try {
      let cvId = selectedCvId;
      if (cvFile) {
        const form = new FormData();
        form.append("file", cvFile);
        const uploaded = await cvApi.upload(form);
        cvId = uploaded.data.id;
      }
      await applicantApi.apply(jobId, { source: "CAREER", cvId: String(cvId) });
      setApplySubmitted(true);
      setTimeout(() => {
        setApplySubmitted(false);
        setShowApplyModal(null);
        setCvFile(null);
        setSelectedCvId(null);
        navigate("/applications");
      }, 1200);
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      if (code === "APPLICATION_EXISTS") navigate("/applications");
      else setApplyError(getApiErrorMessage(err));
    } finally {
      setApplyPending(false);
    }
  };

  useEffect(() => {
    if (!showApplyModal) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const modal = document.querySelector<HTMLElement>("[data-career-modal]");
    modal?.querySelector<HTMLElement>("button, a, input")?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setShowApplyModal(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [showApplyModal]);

  useEffect(() => {
    if (publicLanding.isPending) return;
    const sections = document.querySelectorAll<HTMLElement>("[data-career-reveal]");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sections.forEach((section) => section.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10%", threshold: 0.08 });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [isJobsPage, publicLanding.isPending]);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({
      autoRaf: true,
      autoToggle: true,
      anchors: { offset: -80 },
      duration: 1.05,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.9,
      prevent: (node) => Boolean(node.closest("[role='listbox'], [data-career-modal]")),
    });
    return () => lenis.destroy();
  }, [isJobsPage]);

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
        {isJobDetailPage ? (
          <section className="min-h-[70vh] bg-[var(--color-surface-alt)]">
            {publicJobDetail.isPending ? (
              <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" role="status" aria-label="Đang tải chi tiết việc làm"><div className="h-72 animate-pulse rounded-3xl bg-white" /></div>
            ) : publicJobDetail.isError || !publicJobDetail.data?.data ? (
              <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6"><span className="mx-auto grid size-16 place-items-center rounded-2xl bg-white text-[var(--color-primary)] shadow-sm"><FileText className="size-7" aria-hidden="true" /></span><h1 className="mt-5 text-2xl font-semibold">Không tìm thấy vị trí tuyển dụng</h1><p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">Vị trí có thể đã đóng hoặc đường dẫn không còn hợp lệ.</p><Link to="/jobs" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white"><ChevronLeft className="size-4" aria-hidden="true" />Quay lại danh sách</Link></div>
            ) : (() => {
              const job = publicJobDetail.data.data;
              const deadline = getDeadlineInfo(job.deadline);
              const detailLocation = locationLabel(job.location);
              const detailWorkMode = workModeLabel(job.workMode ?? (isWorkModeText(job.location) ? job.location : null));
              const relatedJobs = jobsList
                .filter((candidate) => candidate.id !== job.id)
                .map((candidate) => ({
                  job: candidate,
                  score: (candidate.department === job.department ? 3 : 0) + candidate.skills.filter((skill) => job.skills.includes(skill)).length,
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 3)
                .map((item) => item.job);
              return <>
                <div className="career-jobs-hero px-4 py-10 text-white sm:px-6 lg:px-8 lg:py-14"><div className="mx-auto max-w-7xl"><Link to="/jobs" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-white/75 hover:text-white"><ChevronLeft className="size-4" aria-hidden="true" />Tất cả việc làm</Link><div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-4xl"><div className="flex flex-wrap gap-2">{job.department && <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold">{job.department}</span>}{deadline?.urgent && <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-amber-950">Tuyển gấp</span>}</div><h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">{job.title}</h1><p className="mt-3 text-base text-white/75">{theme.name}</p><div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm text-white/85">{detailLocation && <span className="inline-flex items-center gap-2"><MapPin className="size-4" />{detailLocation}</span>}{detailWorkMode && <span className="inline-flex items-center gap-2"><Laptop className="size-4" />{detailWorkMode}</span>}{job.employmentType && <span className="inline-flex items-center gap-2"><Briefcase className="size-4" />{employmentTypeLabel(job.employmentType)}</span>}</div></div><div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm lg:min-w-64"><p className="text-xs uppercase tracking-wider text-white/60">Mức lương</p><p className="mt-1 text-2xl font-semibold">{job.salary ? formatSalary(job.salary) : "Thỏa thuận"}</p></div></div></div></div>
                <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
                  <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <article className="space-y-5">
                      <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-sm sm:p-8">
                        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><FileText className="size-5" aria-hidden="true" /></span><h2 className="text-xl font-semibold">Mô tả công việc</h2></div>
                        <JobContentList content={job.description} />
                      </section>
                      {job.responsibilities && <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-sm sm:p-8"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><CheckCircle2 className="size-5" aria-hidden="true" /></span><h2 className="text-xl font-semibold">Trách nhiệm và yêu cầu</h2></div><JobContentList content={job.responsibilities} /></section>}
                      {job.skills.length > 0 && <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-sm sm:p-8"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><Code className="size-5" aria-hidden="true" /></span><h2 className="text-xl font-semibold">Công nghệ và kỹ năng</h2></div><div className="mt-5 flex flex-wrap gap-2">{job.skills.map((skill) => <span key={skill} className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)] px-3 py-2 text-sm font-semibold text-[var(--color-primary)]"><span className="size-1.5 rounded-full bg-[var(--color-primary)]" aria-hidden="true" />{skill}</span>)}</div></section>}
                      {job.benefits && <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-sm sm:p-8"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><HeartHandshake className="size-5" aria-hidden="true" /></span><h2 className="text-xl font-semibold">Quyền lợi</h2></div><JobContentList content={job.benefits} /></section>}
                      <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 sm:p-8" aria-labelledby="safe-job-title">
                        <div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-amber-100 text-amber-700"><ShieldCheck className="size-6" aria-hidden="true" /></span><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Ứng tuyển an toàn</p><h2 id="safe-job-title" className="mt-1 text-xl font-semibold text-slate-900">Bí kíp tìm việc an toàn</h2></div></div>
                        <div className="mt-5 grid gap-5 md:grid-cols-2"><div><h3 className="text-sm font-semibold text-slate-900">Dấu hiệu phổ biến</h3><ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700"><li className="flex gap-2"><span className="mt-2 size-2 shrink-0 rounded-full bg-amber-500" />Hứa hẹn “việc nhẹ lương cao” hoặc thu nhập bất thường.</li><li className="flex gap-2"><span className="mt-2 size-2 shrink-0 rounded-full bg-amber-500" />Yêu cầu đóng phí, chuyển tiền hoặc cung cấp mã OTP.</li><li className="flex gap-2"><span className="mt-2 size-2 shrink-0 rounded-full bg-amber-500" />Trao đổi qua tài khoản cá nhân, thiếu email và thông tin công ty rõ ràng.</li></ul></div><div><h3 className="text-sm font-semibold text-slate-900">Bạn nên làm gì?</h3><ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700"><li className="flex gap-2"><Check className="mt-1 size-4 shrink-0 text-emerald-700" aria-hidden="true" />Kiểm tra website, địa chỉ và thông tin pháp lý của doanh nghiệp.</li><li className="flex gap-2"><Check className="mt-1 size-4 shrink-0 text-emerald-700" aria-hidden="true" />Không chuyển tiền hoặc cung cấp thông tin tài chính khi ứng tuyển.</li><li className="flex gap-2"><Check className="mt-1 size-4 shrink-0 text-emerald-700" aria-hidden="true" />Liên hệ kênh tuyển dụng chính thức nếu có nghi ngờ.</li></ul></div></div>
                      </section>
                    </article>
                    <aside className="space-y-5 lg:sticky lg:top-24">
                      <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><Briefcase className="size-5" aria-hidden="true" /></span><h2 className="text-lg font-semibold">Thông tin chung</h2></div><dl className="mt-5 divide-y divide-[var(--color-border-default)] text-sm">{detailLocation && <div className="flex gap-3 py-3 first:pt-0"><MapPin className="mt-0.5 size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" /><div><dt className="text-xs text-slate-500">Địa điểm</dt><dd className="mt-1 font-semibold">{detailLocation}</dd></div></div>}{detailWorkMode && <div className="flex gap-3 py-3"><Laptop className="mt-0.5 size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" /><div><dt className="text-xs text-slate-500">Hình thức làm việc</dt><dd className="mt-1 font-semibold">{detailWorkMode}</dd></div></div>}{job.employmentType && <div className="flex gap-3 py-3"><Clock className="mt-0.5 size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" /><div><dt className="text-xs text-slate-500">Loại công việc</dt><dd className="mt-1 font-semibold">{employmentTypeLabel(job.employmentType)}</dd></div></div>}{job.minYearsExperience != null && <div className="flex gap-3 py-3"><Briefcase className="mt-0.5 size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" /><div><dt className="text-xs text-slate-500">Kinh nghiệm</dt><dd className="mt-1 font-semibold">{job.minYearsExperience === 0 ? "Không yêu cầu" : `Từ ${job.minYearsExperience} năm`}</dd></div></div>}{job.educationLevel && <div className="flex gap-3 py-3"><Award className="mt-0.5 size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" /><div><dt className="text-xs text-slate-500">Học vấn</dt><dd className="mt-1 font-semibold">{job.educationLevel}</dd></div></div>}{deadline && <div className="flex gap-3 py-3"><Clock className="mt-0.5 size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" /><div><dt className="text-xs text-slate-500">Hạn nộp hồ sơ</dt><dd className="mt-1 font-semibold">{deadline.dateLabel}</dd></div></div>}</dl><button type="button" onClick={() => startApply(job)} disabled={!job.acceptingApplications} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50">{job.acceptingApplications ? (token ? "Ứng tuyển ngay" : "Đăng nhập để ứng tuyển") : "Đã ngừng nhận hồ sơ"}<ArrowRight className="size-4" aria-hidden="true" /></button><p className="mt-3 text-center text-xs leading-5 text-slate-500">Hồ sơ được bảo mật và chỉ dùng cho tuyển dụng.</p></section>
                      <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><span className="grid size-12 place-items-center overflow-hidden rounded-xl bg-[var(--color-primary)] text-lg font-semibold text-white">{customLanding?.header?.logoImageUrl ? <img src={customLanding.header.logoImageUrl} alt="" className="size-full object-contain bg-white p-1" /> : theme.name.charAt(0).toUpperCase()}</span><div><p className="font-semibold text-slate-900">{theme.name}</p><p className="text-xs text-slate-500">Nhà tuyển dụng</p></div></div><p className="mt-4 text-sm leading-6 text-slate-600">{customLanding?.about?.description || customLanding?.footer?.description || "Môi trường công nghệ chuyên nghiệp, nơi đội ngũ cùng phát triển sản phẩm và tạo ra giá trị bền vững."}</p><div className="mt-5 space-y-3 border-t border-[var(--color-border-default)] pt-4 text-sm">{customLanding?.footer?.address && <p className="flex items-start gap-2 text-slate-600"><Building className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />{customLanding.footer.address}</p>}{customLanding?.footer?.contactEmail && <a href={`mailto:${customLanding.footer.contactEmail}`} className="flex items-center gap-2 text-slate-600 hover:text-[var(--color-primary)]"><Mail className="size-4 shrink-0" aria-hidden="true" />{customLanding.footer.contactEmail}</a>}{customLanding?.footer?.websiteUrl && <a href={customLanding.footer.websiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 font-semibold text-[var(--color-primary)]"><Globe className="size-4 shrink-0" aria-hidden="true" />Xem website công ty</a>}</div></section>
                    </aside>
                  </div>
                  {relatedJobs.length > 0 && <section className="mt-12 border-t border-[var(--color-border-default)] pt-10" aria-labelledby="related-jobs-title"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">Khám phá thêm</p><h2 id="related-jobs-title" className="mt-1 text-2xl font-semibold">Việc làm liên quan</h2></div><Link to="/jobs" className="hidden text-sm font-semibold text-[var(--color-primary)] hover:underline sm:block">Xem tất cả</Link></div><div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{relatedJobs.map((relatedJob) => <FeaturedJobCard key={relatedJob.id} job={relatedJob} tenantName={theme.name} primaryColor={primaryColor} />)}</div></section>}
                </div>
              </>;
            })()}
          </section>
        ) : !isJobsPage ? (
          <>
            <section className="career-discovery-hero px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
              <div className="mx-auto max-w-[1420px]">
                <div className="mb-6 text-center text-white">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">Cổng tuyển dụng {theme.name}</p>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
                    Tìm công việc phù hợp. Phát triển sự nghiệp cùng {theme.name}
                  </h1>
                </div>

                {customLanding?.hero?.showSearchBar !== false && (
                  <form action="/jobs" role="search" className="career-discovery-search mb-6 grid rounded-2xl border border-white/55 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.18)] md:grid-cols-[minmax(0,1fr)_300px_auto]">
                    <label className="relative flex min-h-16 items-center border-b border-slate-200 px-4 md:border-b-0 md:border-r">
                      <span className="sr-only">Vị trí tuyển dụng hoặc kỹ năng</span>
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500"><Search className="size-4" aria-hidden="true" /></span>
                      <span className="ml-3 min-w-0 flex-1"><span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Từ khóa</span><input name="q" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Vị trí tuyển dụng, kỹ năng..." className="mt-0.5 w-full min-w-0 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400" /></span>
                    </label>
                    <LocationDropdown locations={locations} value={selectedLocation} onChange={setSelectedLocation} jobs={jobsList} />
                    <div className="pt-1.5 md:pl-1.5 md:pt-0">
                      <button type="submit" className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-8 text-sm font-semibold text-white shadow-sm transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] md:h-full">
                        <Search className="size-4" aria-hidden="true" />Tìm việc ngay
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
                  <aside className="career-category-card overflow-hidden rounded-2xl border border-white/45 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.16)]" aria-labelledby="career-category-title">
                    <div className="career-category-heading relative overflow-hidden border-b border-[var(--career-border)] px-4 py-3.5">
                      <div className="relative z-10 flex items-center gap-3">
                        {customLanding?.header?.logoImageUrl ? <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-[var(--career-border)] bg-white p-1.5 shadow-sm"><img src={customLanding.header.logoImageUrl} alt="" className="max-h-full max-w-full object-contain" /></span> : <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--color-primary)] text-sm font-semibold text-white shadow-sm" aria-hidden="true">{theme.code.charAt(0).toUpperCase()}</span>}
                        <div className="min-w-0"><h2 id="career-category-title" className="truncate text-base font-semibold text-slate-900">Nhóm nghề nghiệp</h2><p className="mt-0.5 text-xs text-slate-600">Khám phá theo phòng ban</p></div>
                      </div>
                    </div>
                    <nav className="space-y-1.5 p-2.5" aria-label="Danh sách nhóm nghề nghiệp">
                      {departments.slice(1, 7).map((department) => {
                        const jobCount = jobsList.filter((job) => job.department === department).length;
                        return (
                          <Link key={department} to={buildJobsHref({ department, location: "ALL" })} aria-label={`${department}, ${jobCount} vị trí`} className="group flex min-h-14 items-center gap-3 rounded-xl border border-transparent px-3 transition-[background-color,border-color] hover:border-[var(--career-border)] hover:bg-[var(--color-primary-subtle)]">
                            <span className="size-2.5 shrink-0 rounded-full bg-[var(--color-primary)] shadow-[0_0_0_4px_var(--color-primary-subtle)]" aria-hidden="true" />
                            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800 group-hover:text-[var(--color-primary)]">{department}</span><span className="mt-0.5 block text-[11px] text-slate-500">{jobCount} vị trí đang mở</span></span>
                            <ChevronRight className="size-4 shrink-0 text-slate-300 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-[var(--color-primary)]" aria-hidden="true" />
                          </Link>
                        );
                      })}
                      {departments.length <= 1 && <div className="px-3 py-7 text-center"><span className="mx-auto grid size-10 place-items-center rounded-full bg-slate-100 text-slate-400"><Briefcase className="size-5" aria-hidden="true" /></span><p className="mt-3 text-sm text-slate-500">Danh mục sẽ xuất hiện khi có vị trí tuyển dụng.</p></div>}
                    </nav>
                    <Link to="/jobs" className="group flex min-h-14 items-center justify-between border-t border-[var(--career-border)] bg-[var(--color-primary-subtle)] px-5 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--career-tint-strong)]">Xem tất cả vị trí <span className="grid size-8 place-items-center rounded-full bg-white shadow-sm"><ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span></Link>
                  </aside>

                  <div className="career-banner-slider relative min-h-[360px] overflow-hidden rounded-2xl border border-white/35 bg-slate-900 shadow-lg" onMouseEnter={() => setHeroPaused(true)} onMouseLeave={() => setHeroPaused(false)} onFocusCapture={() => setHeroPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeroPaused(false); }} aria-roledescription="carousel" aria-label="Thông tin tuyển dụng nổi bật">
                    {heroSlides.map((slide, index) => (
                      <article key={slide.title} aria-hidden={index !== activeHeroSlide} className={`career-banner-slide absolute inset-0 transition-opacity duration-500 ${index === activeHeroSlide ? "z-10 opacity-100" : "pointer-events-none opacity-0"}`}>
                        <img src={slide.image} alt="" className="absolute inset-0 size-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/62 to-slate-900/10" />
                        <div className="relative z-10 flex h-full max-w-2xl flex-col justify-center p-7 text-white sm:p-10 lg:p-12">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/75">{slide.eyebrow}</p>
                          <h2 className="text-2xl font-semibold leading-tight sm:text-3xl lg:text-4xl">{slide.title}</h2>
                          <p className="mt-4 max-w-xl text-sm leading-6 text-white/80 sm:text-base">{slide.description}</p>
                          <Link to={jobsHref} tabIndex={index === activeHeroSlide ? 0 : -1} className="mt-6 inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100">Khám phá cơ hội <ArrowRight className="size-4" aria-hidden="true" /></Link>
                        </div>
                      </article>
                    ))}
                    <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between p-4 sm:p-5">
                      <div className="flex gap-2">{heroSlides.map((slide, index) => <button key={slide.title} type="button" onClick={() => setActiveHeroSlide(index)} aria-label={`Chuyển đến slide ${index + 1}`} aria-current={index === activeHeroSlide} className={`h-1.5 rounded-full transition-all ${index === activeHeroSlide ? "w-8 bg-white" : "w-3 bg-white/45 hover:bg-white/75"}`} />)}</div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setHeroPaused((paused) => !paused)} className="grid size-11 place-items-center rounded-full border border-white/30 bg-slate-950/35 text-white backdrop-blur-sm hover:bg-slate-950/55" aria-label={heroPaused ? "Tiếp tục tự động chuyển slide" : "Tạm dừng tự động chuyển slide"}>{heroPaused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}</button>
                        <button type="button" onClick={() => setActiveHeroSlide((slide) => (slide - 1 + heroSlides.length) % heroSlides.length)} className="grid size-11 place-items-center rounded-full border border-white/30 bg-slate-950/35 text-white backdrop-blur-sm hover:bg-slate-950/55" aria-label="Slide trước"><ChevronLeft className="size-5" aria-hidden="true" /></button>
                        <button type="button" onClick={() => setActiveHeroSlide((slide) => (slide + 1) % heroSlides.length)} className="grid size-11 place-items-center rounded-full border border-white/30 bg-slate-950/35 text-white backdrop-blur-sm hover:bg-slate-950/55" aria-label="Slide tiếp theo"><ChevronRight className="size-5" aria-hidden="true" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

        <section aria-labelledby="career-open-jobs" data-career-reveal className="career-featured-jobs border-b border-[var(--color-border-default)] py-14 lg:py-20">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="career-featured-heading relative mb-7 overflow-hidden rounded-3xl px-6 py-7 text-white sm:px-8 sm:py-9 lg:flex lg:items-end lg:justify-between lg:gap-10">
              <div className="relative z-10 max-w-3xl"><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] backdrop-blur-sm"><Sparkles className="size-3.5" aria-hidden="true" />Cơ hội nghề nghiệp</span><h2 id="career-open-jobs" className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Việc làm nổi bật dành cho bạn</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">Khám phá những vị trí mới nhất, so sánh thông tin quan trọng và tìm cơ hội phù hợp với định hướng của bạn.</p></div>
              <div className="relative z-10 mt-6 flex items-center gap-4 lg:mt-0"><div className="hidden text-right sm:block"><strong className="block text-2xl font-semibold">{jobsList.length}</strong><span className="text-xs text-white/70">vị trí đang mở</span></div><Link to={jobsHref} className="group inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[var(--color-primary)] shadow-lg transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-xl">Xem tất cả việc làm <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link></div>
            </div>

            <div className="mb-5 inline-flex rounded-xl border border-[var(--color-border-default)] bg-white p-1 shadow-sm" role="tablist" aria-label="Chế độ hiển thị việc làm">
              <button type="button" role="tab" onClick={() => setJobView("featured")} aria-selected={jobView === "featured"} className={`min-h-10 rounded-lg px-5 text-sm font-semibold transition-colors ${jobView === "featured" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-primary-subtle)]"}`}>Tất cả vị trí</button>
              {isCandidate && <button type="button" role="tab" onClick={() => setJobView("recommended")} aria-selected={jobView === "recommended"} className={`min-h-10 rounded-lg px-5 text-sm font-semibold transition-colors ${jobView === "recommended" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-primary-subtle)]"}`}>Phù hợp với bạn</button>}
            </div>

            {jobView === "featured" && <>
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start">
                <FeaturedFilterDropdown value={featuredFilterType} onChange={setFeaturedFilterType} />
                <div className="flex flex-wrap items-center gap-2" aria-label={`Lọc nhanh theo ${FEATURED_FILTER_LABELS[featuredFilterType].toLocaleLowerCase("vi-VN")}`}>
                  {featuredFilterType === "location" && <><FilterValueDropdown label="Chọn địa điểm" value={featuredLocation} onChange={setFeaturedLocation} icon={MapPin} options={locations.map((location) => ({ value: location, label: location === "ALL" ? "Tất cả địa điểm" : location }))} /><FilterValueDropdown label="Chọn hình thức làm việc" value={featuredWorkMode} onChange={setFeaturedWorkMode} icon={Laptop} options={workModes.map((workMode) => ({ value: workMode, label: workMode === "ALL" ? "Tất cả hình thức" : workMode }))} /></>}
                  {featuredFilterType === "salary" && <FilterValueDropdown label="Chọn khoảng lương" value={featuredSalary} onChange={setFeaturedSalary} icon={CircleDollarSign} options={SALARY_FILTERS.map((filter) => ({ value: filter.value, label: filter.value === "ALL" ? "Tất cả mức lương" : filter.label }))} />}
                  {featuredFilterType === "experience" && <FilterValueDropdown label="Chọn kinh nghiệm" value={featuredExperience} onChange={setFeaturedExperience} icon={Briefcase} options={EXPERIENCE_FILTERS.map((filter) => ({ value: filter.value, label: filter.value === "ALL" ? "Tất cả kinh nghiệm" : filter.label }))} />}
                </div>
              </div>
              {publicJobs.isPending ? <div className="grid gap-5 md:grid-cols-2" role="status" aria-label="Đang tải việc làm">{[0, 1, 2, 3].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl bg-white" />)}</div> : publicJobs.isError ? <p role="alert" className="text-sm text-[var(--color-error)]">{getApiErrorMessage(publicJobs.error)}</p> : featuredJobs.length > 0 ? <div className="grid auto-rows-fr gap-5 md:grid-cols-2">{featuredJobs.map((job) => <FeaturedJobCard key={job.id} job={job} tenantName={theme.name} primaryColor={primaryColor} />)}</div> : <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-default)] bg-white p-8 text-center text-sm text-[var(--color-on-surface-variant)]">Chưa có vị trí phù hợp với bộ lọc.</p>}
            </>}

            {jobView === "recommended" && isCandidate && (
              candidateCvs.isPending ? <p role="status" className="rounded-xl bg-white p-6 text-sm text-slate-600">Đang kiểm tra hồ sơ nghề nghiệp của bạn…</p>
              : candidateCvs.isError ? <p role="alert" className="rounded-xl bg-white p-6 text-sm text-[var(--color-error)]">Không thể tải CV để tạo gợi ý lúc này. Vui lòng thử lại sau.</p>
              : !analyzedCv ? <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-7 text-center shadow-sm sm:p-10"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><Settings className="size-6" aria-hidden="true" /></span><h3 className="mt-4 text-xl font-semibold">Thiết lập thông tin nghề nghiệp</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--color-on-surface-variant)]">Tải lên và phân tích CV để hệ thống nhận diện kỹ năng, sau đó mới có thể gợi ý các vị trí phù hợp với bạn.</p><Link to="/cv" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]"><FileText className="size-4" aria-hidden="true" />Cài đặt thông tin</Link></div>
              : candidateCvDetail.isPending ? <p role="status" className="rounded-xl bg-white p-6 text-sm text-slate-600">Đang phân tích mức độ phù hợp…</p>
              : recommendedJobs.length > 0 ? <><div className="mb-5 rounded-lg border border-[var(--color-primary)]/30 bg-[var(--color-primary-subtle)] px-4 py-3 text-sm text-[var(--color-on-surface-variant)]">Gợi ý dựa trên kỹ năng trong CV <strong className="text-[var(--color-on-surface)]">{analyzedCv.originalFilename}</strong>. Đây là đối chiếu kỹ năng trực tiếp, không phải quyết định tuyển dụng.</div><div className="grid gap-5 md:grid-cols-2">{recommendedJobs.map(({ job, matchedSkills }) => <FeaturedJobCard key={job.id} job={job} tenantName={theme.name} primaryColor={primaryColor} matchedSkills={matchedSkills} />)}</div></>
              : <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-8 text-center"><h3 className="text-lg font-semibold">Chưa tìm thấy vị trí trùng kỹ năng</h3><p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">Bạn vẫn có thể xem toàn bộ việc làm hoặc cập nhật CV để nhận gợi ý mới.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><button type="button" onClick={() => setJobView("featured")} className="min-h-11 rounded-lg bg-[var(--color-primary)] px-5 text-sm font-semibold text-white">Xem tất cả việc làm</button><Link to="/cv" className="inline-flex min-h-11 items-center rounded-lg border border-[var(--color-border-default)] px-5 text-sm font-semibold">Cập nhật CV</Link></div></div>
            )}
          </div>
        </section>

        {/* COMPANY CULTURE & NUMBERS SHOWCASE */}
        {customLanding?.about?.enabled !== false && (
          <section id="about" data-career-reveal className="career-section career-section-white border-b border-[var(--color-border-default)] py-16 lg:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                {/* Culture Image */}
                <div className="career-media-card group relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-default)] shadow-lg">
                  <img
                    src={customLanding?.about?.cultureImageUrl || theme.cultureImage || "/acme_culture.png"}
                    alt="Văn hóa công ty"
                  className="aspect-[4/3] w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-8">
                    <div className="text-white space-y-1">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-white/75">
                        Văn hóa làm việc
                      </span>
                      <h3 className="text-xl font-semibold font-display">
                        Cùng phát triển và tạo ra giá trị bền vững
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
                    <h2 className="mb-4 mt-3 text-3xl font-semibold tracking-tight text-[var(--color-on-surface)] sm:text-4xl">
                      {customLanding?.about?.title || `Vì Sao Bạn Nên Chọn ${theme.name}?`}
                    </h2>
                    <p className="whitespace-pre-line text-sm leading-7 text-[var(--color-on-surface-variant)]">
                      {customLanding?.about?.description ||
                        `Tại ${theme.name}, chúng tôi tin rằng con người là tài sản quý giá nhất. Đội ngũ Kỹ sư làm việc trong môi trường cởi mở, áp dụng quy trình Agile/Scrum tiêu chuẩn toàn cầu, liên tục tiếp cận các bài toán Enterprise thách thức.`}
                    </p>
                  </div>

                  {/* Numbers Grid */}
                  <div className="grid gap-4 pt-2 sm:grid-cols-2">
                    {(customLanding?.about?.stats && customLanding.about.stats.length > 0
                      ? customLanding.about.stats
                      : [
                          { icon: "Briefcase", value: String(jobsList.length), label: "Vị trí đang mở" },
                          { icon: "Users", value: String(Math.max(0, departments.length - 1)), label: "Đội ngũ đang tuyển" },
                        ]
                    ).map((st, i) => (
                      <div
                        key={i}
                        className="career-stat-card rounded-[var(--radius-lg)] border border-[var(--color-border-default)] p-5"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div style={{ color: primaryColor }}>{renderIcon(st.icon)}</div>
                          <span className="text-2xl font-semibold text-[var(--color-on-surface)]">{st.value}</span>
                        </div>
                        <span className="text-xs text-[var(--color-on-surface-variant)]">{st.label}</span>
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
          <section id="benefits" data-career-reveal className="career-benefits-section career-section border-b border-[var(--color-border-default)] py-16 lg:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto mb-14 max-w-2xl text-center">
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
                <h2 className="mb-2 mt-3 text-3xl font-semibold tracking-tight text-[var(--color-on-surface)]">
                  {customLanding?.benefits?.title || "Chế Độ Đãi Ngộ & Phúc Lợi Toàn Diện"}
                </h2>
                <p className="text-sm leading-6 text-[var(--color-on-surface-variant)]">
                  {customLanding?.benefits?.subtitle ||
                    "Chúng tôi chăm sóc toàn diện cho sức khỏe, sự nghiệp và đời sống tinh thần của bạn"}
                </p>
              </div>

              <div className="career-benefits-grid grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
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
                    data-reveal-item
                    className="career-benefit-card career-content-card group relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-white p-6 shadow-sm transition-[transform,border-color,box-shadow] hover:-translate-y-1 hover:shadow-lg"
                  >
                    <span className="absolute right-5 top-4 text-5xl font-semibold text-[var(--color-primary)] opacity-[0.06]" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                    <div
                      className="mb-5 flex size-12 items-center justify-center rounded-[14px] transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                    >
                      {renderIcon(b.icon, "w-6 h-6")}
                    </div>
                    <h3 className="mb-2 text-base font-semibold text-[var(--color-on-surface)]">{b.title}</h3>
                    <p className="text-sm leading-6 text-[var(--color-on-surface-variant)]">{b.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section id="hiring-process" data-career-reveal className="career-process-section career-section border-b border-[var(--color-border-default)] py-16 lg:py-24" aria-labelledby="hiring-process-title">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-12 max-w-2xl text-center"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">Quy trình tuyển dụng</p><h2 id="hiring-process-title" className="mt-2 text-3xl font-semibold tracking-tight">Minh bạch trong từng bước</h2><p className="mt-3 text-sm leading-6 text-[var(--color-on-surface-variant)]">Số vòng và thời gian có thể thay đổi theo từng vị trí; người phụ trách tuyển dụng sẽ thông báo rõ cho bạn.</p></div>
            <ol className="career-process grid gap-4 md:grid-cols-5">
              {[{ title: "Gửi hồ sơ", text: "Chọn vị trí và nộp CV phù hợp." }, { title: "Trao đổi với HR", text: "Tìm hiểu kỳ vọng từ hai phía." }, { title: "Đánh giá chuyên môn", text: "Bài tập hoặc trao đổi nghiệp vụ." }, { title: "Phỏng vấn đội ngũ", text: "Gặp quản lý và cộng sự tương lai." }, { title: "Kết quả & đề nghị", text: "Nhận phản hồi và thảo luận offer." }].map((step, index) => <li key={step.title} data-reveal-item className="career-process-step group relative rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-white p-5 shadow-sm transition-[transform,border-color,box-shadow] hover:-translate-y-1 hover:shadow-lg"><span className="grid size-10 place-items-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white shadow-[0_0_0_6px_var(--color-primary-subtle)] transition-transform group-hover:scale-110">{String(index + 1).padStart(2, "0")}</span><h3 className="mt-5 font-semibold text-[var(--color-on-surface)]">{step.title}</h3><p className="mt-2 text-sm leading-6 text-[var(--color-on-surface-variant)]">{step.text}</p></li>)}
            </ol>
          </div>
        </section>


        {/* TESTIMONIALS SECTION */}
        {customLanding?.testimonials?.enabled !== false && (
          <section id="stories" data-career-reveal className="career-stories-section career-section border-b border-[var(--color-border-default)] py-16 lg:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mx-auto mb-12 max-w-2xl text-center">
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
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-on-surface)]">
                  {customLanding?.testimonials?.title || "Đánh Giá Từ Đội Ngũ Kỹ Sư"}
                </h2>
              </div>

              <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
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
                    data-reveal-item
                    className="career-story-card career-content-card relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-white p-8 shadow-sm transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-lg"
                  >
                    <Quote className="mb-5 size-9 text-[var(--color-primary)] opacity-25" aria-hidden="true" />
                    <blockquote className="mb-7 flex-1 text-base italic leading-7 text-[var(--color-on-surface-variant)]">“{item.quote}”</blockquote>
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
                        <div className="text-sm font-semibold text-[var(--color-on-surface)]">{item.name}</div>
                        <div className="text-xs text-[var(--color-on-surface-variant)]">{item.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section id="faq" data-career-reveal className="career-faq-section career-section border-b border-[var(--color-border-default)] py-16 lg:py-24" aria-labelledby="candidate-faq-title">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
            <div className="career-faq-intro h-fit rounded-3xl p-7 sm:p-8 lg:sticky lg:top-24"><span className="grid size-12 place-items-center rounded-2xl bg-white text-[var(--color-primary)] shadow-sm"><FileText className="size-5" aria-hidden="true" /></span><p className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">Câu hỏi thường gặp</p><h2 id="candidate-faq-title" className="mt-2 text-3xl font-semibold tracking-tight">Thông tin dành cho ứng viên</h2><p className="mt-3 text-sm leading-6 text-[var(--color-on-surface-variant)]">Những điều bạn có thể cần biết trước khi bắt đầu ứng tuyển.</p></div>
            <div className="space-y-3">{[
              ["Tôi có thể ứng tuyển nhiều vị trí không?", "Có. Bạn nên chọn những vị trí phù hợp nhất với kinh nghiệm và định hướng của mình."],
              ["Khi nào tôi nhận được phản hồi?", "Thời gian phản hồi phụ thuộc vào từng vị trí. Trạng thái hồ sơ sẽ được cập nhật trong không gian ứng viên."],
              ["Quy trình phỏng vấn gồm bao nhiêu vòng?", "Thông thường gồm trao đổi với HR, đánh giá chuyên môn và phỏng vấn đội ngũ. Một số vị trí có thể có quy trình khác."],
              ["Tôi có thể cập nhật CV sau khi nộp không?", "Bạn có thể quản lý và cập nhật CV trong mục CV của tôi trước các lần ứng tuyển tiếp theo."],
            ].map(([question, answer], index) => <div key={question} data-reveal-item className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-[border-color,box-shadow] ${openFaq === index ? "border-[var(--color-primary)]/40 shadow-md" : "border-[var(--color-border-default)] hover:border-[var(--color-primary)]/30"}`}><h3><button type="button" aria-expanded={openFaq === index} aria-controls={`candidate-faq-answer-${index}`} onClick={() => setOpenFaq(openFaq === index ? null : index)} className="flex min-h-16 w-full items-center justify-between gap-4 px-5 text-left text-sm font-semibold hover:bg-[var(--color-primary-subtle)]"><span className="flex items-center gap-3"><span className="text-xs tabular-nums text-[var(--color-primary)]">{String(index + 1).padStart(2, "0")}</span>{question}</span><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-surface-alt)]"><ChevronDown className={`size-4 transition-transform ${openFaq === index ? "rotate-180" : ""}`} aria-hidden="true" /></span></button></h3>{openFaq === index && <p id={`candidate-faq-answer-${index}`} className="border-t border-[var(--color-border-default)] px-5 py-5 text-sm leading-6 text-[var(--color-on-surface-variant)]">{answer}</p>}</div>)}</div>
          </div>
        </section>

        <section data-career-reveal className="career-section career-section-white px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="career-final-cta mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 overflow-hidden rounded-[2rem] p-8 text-white shadow-[0_24px_70px_rgba(15,23,42,0.20)] sm:p-10 lg:flex-row lg:items-center lg:p-12">
            <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Bước tiếp theo của bạn</p><h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Sẵn sàng đồng hành cùng {theme.name}?</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">Khám phá các vị trí đang mở và chọn cơ hội phù hợp với kinh nghiệm, kỹ năng và mục tiêu nghề nghiệp của bạn.</p></div>
            <Link to="/jobs" className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-[var(--color-primary)] hover:bg-slate-50">Xem tất cả việc làm <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </div>
        </section>
        </>
        ) : (
        <section id="jobs" className="career-jobs-page min-h-[70vh] bg-[var(--color-surface-alt)]">
          <div className="career-jobs-hero px-4 py-10 text-white sm:px-6 sm:py-14 lg:px-8">
            <div className="mx-auto max-w-[1400px]">
              <Link to="/" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-white/75 hover:text-white"><ChevronLeft className="size-4" aria-hidden="true" />Về trang tuyển dụng</Link>
              <div className="mt-4 max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Cơ hội tại {theme.name}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">Tìm công việc phù hợp với bạn</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">Khám phá {jobsList.length} vị trí đang mở và lọc nhanh theo chuyên môn, địa điểm, kinh nghiệm hoặc mức lương.</p></div>
              <form className="mt-8 grid max-w-5xl gap-2 rounded-2xl border border-white/30 bg-white p-2 shadow-[0_20px_50px_rgba(15,23,42,0.22)] sm:grid-cols-[minmax(0,1fr)_240px_auto]" role="search" onSubmit={submitSearch}>
                <label className="relative min-w-0"><span className="sr-only">Tìm kiếm việc làm</span><Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Chức danh, kỹ năng hoặc từ khóa" className="min-h-12 w-full rounded-xl bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[var(--color-primary)]/20" /></label>
                <label className="relative min-w-0"><span className="sr-only">Lọc theo địa điểm</span><MapPin className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true" /><select value={selectedLocation} onChange={(event) => setSelectedLocation(event.target.value)} className="min-h-12 w-full appearance-none rounded-xl bg-slate-50 py-3 pl-12 pr-9 text-sm text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-[var(--color-primary)]/20">{locations.map((location) => <option key={location} value={location}>{location === "ALL" ? "Tất cả địa điểm" : location}</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /></label>
                <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-primary-hover)]"><Search className="size-4" aria-hidden="true" />Tìm việc</button>
              </form>
            </div>
          </div>

          <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
            <button type="button" aria-expanded={showJobsFilters} onClick={() => setShowJobsFilters((current) => !current)} className="mb-4 inline-flex min-h-11 w-full items-center justify-between rounded-xl border border-[var(--color-border-default)] bg-white px-4 text-sm font-semibold shadow-sm lg:hidden"><span className="flex items-center gap-2"><SlidersHorizontal className="size-4 text-[var(--color-primary)]" aria-hidden="true" />Bộ lọc {activeJobFilterCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-[var(--color-primary)] text-[10px] text-white">{activeJobFilterCount}</span>}</span><ChevronDown className={`size-4 transition-transform ${showJobsFilters ? "rotate-180" : ""}`} aria-hidden="true" /></button>
            <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside aria-label="Bộ lọc việc làm" className={`${showJobsFilters ? "block" : "hidden"} rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm lg:sticky lg:top-24 lg:block`}>
                <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-semibold"><SlidersHorizontal className="size-4 text-[var(--color-primary)]" aria-hidden="true" />Bộ lọc</h2>{activeJobFilterCount > 0 && <button type="button" onClick={resetJobFilters} className="text-xs font-semibold text-[var(--color-primary)] hover:underline">Đặt lại</button>}</div>
                <div className="mt-5 border-t border-[var(--color-border-default)] pt-5"><h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Phòng ban</h3><div className="mt-3 max-h-64 space-y-1 overflow-y-auto overscroll-contain pr-1" data-lenis-prevent>{departments.map((department) => <button key={department} type="button" onClick={() => setSelectedDepartment(department)} aria-pressed={selectedDepartment === department} className={`flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm transition-colors ${selectedDepartment === department ? "bg-[var(--color-primary-subtle)] font-semibold text-[var(--color-primary)]" : "text-slate-700 hover:bg-[var(--color-surface-alt)]"}`}><span className="min-w-0 truncate">{department === "ALL" ? "Tất cả phòng ban" : department}</span>{selectedDepartment === department && <Check className="size-4 shrink-0" aria-hidden="true" />}</button>)}</div></div>
                <div className="mt-5 border-t border-[var(--color-border-default)] pt-5"><h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Hình thức làm việc</h3><div className="mt-3 flex flex-wrap gap-2">{workModes.map((workMode) => <button key={workMode} type="button" onClick={() => setFeaturedWorkMode(workMode)} aria-pressed={featuredWorkMode === workMode} className={`min-h-9 rounded-full px-3 text-xs font-semibold ${featuredWorkMode === workMode ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-alt)] text-slate-600 hover:bg-[var(--color-primary-subtle)]"}`}>{workMode === "ALL" ? "Tất cả" : workMode}</button>)}</div></div>
                <div className="mt-5 space-y-3 border-t border-[var(--color-border-default)] pt-5"><FilterValueDropdown label="Mức lương" value={featuredSalary} onChange={setFeaturedSalary} icon={CircleDollarSign} options={SALARY_FILTERS.map((filter) => ({ value: filter.value, label: filter.value === "ALL" ? "Tất cả mức lương" : filter.label }))} /><FilterValueDropdown label="Kinh nghiệm" value={featuredExperience} onChange={setFeaturedExperience} icon={Briefcase} options={EXPERIENCE_FILTERS.map((filter) => ({ value: filter.value, label: filter.value === "ALL" ? "Tất cả kinh nghiệm" : filter.label }))} /><FilterValueDropdown label="Công nghệ & kỹ năng" value={selectedSkill} onChange={setSelectedSkill} icon={Code} options={skills.map((skill) => ({ value: skill, label: skill === "ALL" ? "Tất cả kỹ năng" : skill }))} /><FilterValueDropdown label="Loại công việc" value={selectedEmploymentType} onChange={setSelectedEmploymentType} icon={Clock} options={employmentTypes.map((type) => ({ value: type, label: type === "ALL" ? "Tất cả loại công việc" : employmentTypeLabel(type) }))} /><FilterValueDropdown label="Trình độ học vấn" value={selectedEducationLevel} onChange={setSelectedEducationLevel} icon={Award} options={educationLevels.map((level) => ({ value: level, label: level === "ALL" ? "Tất cả trình độ" : level }))} /></div><div className="mt-5 border-t border-[var(--color-border-default)] pt-5"><h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Trạng thái tuyển dụng</h3><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => setApplicationStatus("ALL")} aria-pressed={applicationStatus === "ALL"} className={`min-h-10 rounded-lg text-xs font-semibold ${applicationStatus === "ALL" ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-alt)] text-slate-600"}`}>Tất cả</button><button type="button" onClick={() => setApplicationStatus("OPEN")} aria-pressed={applicationStatus === "OPEN"} className={`min-h-10 rounded-lg text-xs font-semibold ${applicationStatus === "OPEN" ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-alt)] text-slate-600"}`}>Đang nhận hồ sơ</button></div></div>
              </aside>

              <div className="min-w-0">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-[var(--color-on-surface-variant)]">Tìm thấy <strong className="font-semibold text-[var(--color-on-surface)]">{filteredJobs.length}</strong> vị trí phù hợp</p>{submittedSearch && <p className="mt-1 text-xs text-slate-500">Kết quả cho “{submittedSearch}”</p>}</div>{activeJobFilterCount > 0 && <button type="button" onClick={resetJobFilters} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-[var(--color-surface-alt)]"><X className="size-3.5" aria-hidden="true" />Xóa bộ lọc</button>}</div>
                {publicJobs.isPending ? <div className="space-y-4" role="status" aria-label="Đang tải việc làm">{[0, 1, 2].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl bg-white" />)}</div> : publicJobs.isError ? <div role="alert" className="rounded-2xl border border-[var(--color-error-container)] bg-[var(--color-error-container)] p-5 text-sm text-[var(--color-on-error-container)]">{getApiErrorMessage(publicJobs.error)}</div> : filteredJobs.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--color-border-default)] bg-white px-6 py-16 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><Search className="size-6" aria-hidden="true" /></span><h3 className="mt-4 text-lg font-semibold">Chưa tìm thấy vị trí phù hợp</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--color-on-surface-variant)]">Hãy thử từ khóa rộng hơn, đổi khu vực hoặc xóa bớt điều kiện lọc.</p><button type="button" onClick={resetJobFilters} className="mt-5 min-h-11 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white">Xem tất cả việc làm</button></div> : <div className="space-y-4">{filteredJobs.map((job) => {
                  const deadline = getDeadlineInfo(job.deadline);
                  const jobLocation = locationLabel(job.location);
                  const jobWorkMode = workModeLabel(job.workMode ?? (isWorkModeText(job.location) ? job.location : null));
                  return <article key={job.id} className="group rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-[var(--color-primary)]/40 hover:shadow-lg sm:p-6"><div className="flex min-w-0 gap-4"><span className="grid size-14 shrink-0 place-items-center rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)] text-lg font-semibold text-[var(--color-primary)]" aria-hidden="true">{theme.name.charAt(0).toUpperCase()}</span><div className="min-w-0 flex-1"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2">{job.department && <span className="rounded-full bg-[var(--color-primary-subtle)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-primary)]">{job.department}</span>}{deadline?.urgent && <span className="rounded-full bg-[var(--color-warning-container)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-on-warning-container)]">Tuyển gấp</span>}</div><h2 className="mt-2 break-words text-xl font-semibold leading-7"><Link to={`/jobs/${job.id}`} className="text-left transition-colors hover:text-[var(--color-primary)]">{job.title}</Link></h2><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{theme.name}</p></div><div className="shrink-0 sm:text-right">{job.salary ? <p className="text-lg font-semibold text-emerald-700">{formatSalary(job.salary)}</p> : <p className="text-sm font-medium text-slate-500">Lương thỏa thuận</p>}</div></div><div className="mt-4 flex flex-wrap gap-2">{jobLocation && <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-alt)] px-3 py-1.5 text-xs text-slate-600"><MapPin className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" />{jobLocation}</span>}{jobWorkMode && <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--color-primary)]"><Laptop className="size-3.5" aria-hidden="true" />{jobWorkMode}</span>}{job.employmentType && <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-alt)] px-3 py-1.5 text-xs text-slate-600"><Briefcase className="size-3.5" aria-hidden="true" />{employmentTypeLabel(job.employmentType)}</span>}{job.minYearsExperience != null && <span className="rounded-full bg-[var(--color-surface-alt)] px-3 py-1.5 text-xs text-slate-600">{job.minYearsExperience} năm kinh nghiệm</span>}</div>{job.skills.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{job.skills.slice(0, 5).map((skill) => <span key={skill} className="rounded-md border border-[var(--color-border-default)] px-2 py-1 text-[11px] font-medium text-slate-600">{skill}</span>)}{job.skills.length > 5 && <span className="px-2 py-1 text-[11px] text-slate-500">+{job.skills.length - 5}</span>}</div>}<div className="mt-5 flex flex-col gap-3 border-t border-[var(--color-border-default)] pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">{deadline ? <>Hạn nộp {deadline.dateLabel}{deadline.urgent ? ` · Còn ${deadline.daysRemaining} ngày` : ""}</> : "Đang nhận hồ sơ"}</p><div className="flex gap-2"><Link to={`/jobs/${job.id}`} className="inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-[var(--color-surface-alt)]">Xem chi tiết</Link><button type="button" onClick={() => startApply(job)} disabled={!job.acceptingApplications} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50">{job.acceptingApplications ? (token ? "Ứng tuyển ngay" : "Đăng nhập để ứng tuyển") : "Đã đóng"}{job.acceptingApplications && <ArrowRight className="size-4" aria-hidden="true" />}</button></div></div></div></div></article>;
                })}</div>}
              </div>
            </div>
          </div>
        </section>
        )}
      </main>

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

                <form onSubmit={handleApplySubmit} className="space-y-5 text-sm">
                  <fieldset>
                    <legend className="font-semibold text-slate-800">Chọn CV để ứng tuyển <span className="text-[var(--color-error)]">*</span></legend>
                    <p className="mt-1 text-xs text-slate-500">Chọn một CV đã lưu hoặc tải lên bản mới dành cho vị trí này.</p>

                    {candidateCvs.isPending && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Đang tải danh sách CV…</p>}
                    {candidateCvs.isError && <p role="alert" className="mt-3 rounded-xl bg-[var(--color-error-container)] p-3 text-xs text-[var(--color-on-error-container)]">Không thể tải CV đã lưu. Bạn vẫn có thể tải file mới bên dưới.</p>}
                    {(candidateCvs.data?.data.length ?? 0) > 0 && (
                      <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                        {candidateCvs.data!.data.map((cv) => {
                          const selected = selectedCvId === cv.id && !cvFile;
                          return (
                            <label key={cv.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${selected ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)] ring-1 ring-[var(--color-primary)]/20" : "border-[var(--color-border-default)] hover:border-[var(--color-primary)]/40"}`}>
                              <input type="radio" name="saved-cv" checked={selected} onChange={() => { setSelectedCvId(cv.id); setCvFile(null); setApplyError(null); }} className="mt-1 accent-[var(--color-primary)]" />
                              <FileText className="mt-0.5 size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
                              <span className="min-w-0 flex-1"><span className="block break-words font-semibold text-slate-800">{cv.originalFilename}</span><span className="mt-1 block text-xs text-slate-500">{cvStatusLabel(cv.status)} · Tải lên {new Date(cv.createdAt).toLocaleDateString("vi-VN")}</span></span>
                              {selected && <CheckCircle2 className="size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />}
                            </label>
                          );
                        })}
                      </div>
                    )}

                    <div className="my-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" /><span>hoặc tải CV mới</span><span className="h-px flex-1 bg-slate-200" /></div>
                    <label className={`relative block cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition-colors ${cvFile ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]" : "border-slate-200 bg-slate-50 hover:border-[var(--color-primary)]/50"}`}>
                      <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => { const file = event.target.files?.[0] ?? null; setCvFile(file); if (file) setSelectedCvId(null); setApplyError(null); }} className="sr-only" />
                      <Upload className="mx-auto size-6 text-slate-400" aria-hidden="true" />
                      <span className="mt-2 block break-words text-xs font-semibold text-slate-700">{cvFile ? cvFile.name : "Bấm để chọn file PDF, DOC hoặc DOCX"}</span>
                      <span className="mt-1 block text-[11px] text-slate-500">Tối đa 10 MB</span>
                    </label>
                  </fieldset>

                  {applyError && <p role="alert" className="rounded-[var(--radius-default)] bg-[var(--color-error-container)] p-3 text-sm text-[var(--color-on-error-container)]">{applyError}</p>}

                  <button
                    type="submit"
                    disabled={applyPending || candidateCvs.isPending || (!selectedCvId && !cvFile)}
                    className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-md transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {applyPending ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" /><span>Đang gửi hồ sơ…</span></> : <><span>Gửi hồ sơ ứng tuyển</span><ArrowRight className="size-4" aria-hidden="true" /></>}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <footer data-career-reveal className="career-footer relative overflow-hidden border-t border-white/10 pb-8 pt-16 text-sm">
        <div className="mx-auto max-w-7xl space-y-10 px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_1fr_0.8fr]">
            <div className="max-w-sm space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex size-10 items-center justify-center rounded-xl text-sm font-semibold text-white shadow-sm"
                  style={{ backgroundColor: primaryColor }}
                >
                  {theme.code.charAt(0).toUpperCase()}
                </div>
                <span className="text-base font-semibold tracking-tight text-white">{theme.name}</span>
              </div>
              <p className="text-sm leading-6 text-white/65">
                {customLanding?.footer?.description || "Cổng thông tin tuyển dụng & cơ hội phát triển nghề nghiệp chuẩn Enterprise."}
              </p>
            </div>

            <nav aria-label="Liên kết nghề nghiệp">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-white">Khám phá</h2>
              <ul className="space-y-3 text-white/65"><li><Link to="/jobs" className="hover:text-white">Việc làm đang tuyển</Link></li><li><a href="#about" className="hover:text-white">Về chúng tôi</a></li><li><a href="#hiring-process" className="hover:text-white">Quy trình tuyển dụng</a></li><li><a href="#faq" className="hover:text-white">Câu hỏi thường gặp</a></li></ul>
            </nav>

            <div className="space-y-3 text-white/65">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-white">{customLanding?.footer?.contactTitle || "Liên hệ tuyển dụng"}</h2>
              {customLanding?.footer?.address && (
                <div className="flex items-start gap-2.5">
                  <Building className="mt-0.5 size-4 shrink-0 text-white/45" aria-hidden="true" />
                  <span>{customLanding.footer.address}</span>
                </div>
              )}
              {customLanding?.footer?.contactEmail && (
                <div className="flex items-center gap-2.5">
                  <Mail className="size-4 shrink-0 text-white/45" aria-hidden="true" />
                  <a href={`mailto:${customLanding.footer.contactEmail}`} className="hover:text-white">
                    {customLanding.footer.contactEmail}
                  </a>
                </div>
              )}
              {customLanding?.footer?.contactPhone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="size-4 shrink-0 text-white/45" aria-hidden="true" />
                  <a href={`tel:${customLanding.footer.contactPhone}`} className="hover:text-white">{customLanding.footer.contactPhone}</a>
                </div>
              )}
              {!customLanding?.footer?.address && !customLanding?.footer?.contactEmail && !customLanding?.footer?.contactPhone && <p className="text-sm leading-6">Thông tin liên hệ sẽ được doanh nghiệp cập nhật.</p>}
            </div>

            <div className="space-y-3">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-white">{customLanding?.footer?.socialTitle || "Kết nối"}</h2>
              <div className="flex flex-wrap items-center gap-2 text-white/65">
                {customLanding?.footer?.linkedinUrl && (
                  <a href={customLanding.footer.linkedinUrl} target="_blank" rel="noreferrer" aria-label={`${theme.name} trên LinkedIn`} className="grid size-10 place-items-center rounded-full border border-white/15 hover:border-white/35 hover:text-white">
                    <Linkedin className="size-4" aria-hidden="true" />
                  </a>
                )}
                {customLanding?.footer?.facebookUrl && (
                  <a href={customLanding.footer.facebookUrl} target="_blank" rel="noreferrer" aria-label={`${theme.name} trên Facebook`} className="grid size-10 place-items-center rounded-full border border-white/15 hover:border-white/35 hover:text-white">
                    <Facebook className="size-4" aria-hidden="true" />
                  </a>
                )}
                {customLanding?.footer?.githubUrl && (
                  <a href={customLanding.footer.githubUrl} target="_blank" rel="noreferrer" aria-label={`${theme.name} trên GitHub`} className="grid size-10 place-items-center rounded-full border border-white/15 hover:border-white/35 hover:text-white">
                    <Github className="size-4" aria-hidden="true" />
                  </a>
                )}
                {customLanding?.footer?.websiteUrl && (
                  <a href={customLanding.footer.websiteUrl} target="_blank" rel="noreferrer" aria-label={`Website ${theme.name}`} className="grid size-10 place-items-center rounded-full border border-white/15 hover:border-white/35 hover:text-white">
                    <Globe className="size-4" aria-hidden="true" />
                  </a>
                )}
                {!customLanding?.footer?.linkedinUrl && !customLanding?.footer?.facebookUrl && !customLanding?.footer?.githubUrl && !customLanding?.footer?.websiteUrl && <span className="text-sm">Chưa có liên kết.</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {customLanding?.footer?.copyrightText ||
                `${theme.name} Careers Portal © 2026. Powered by SmartHire AI Multi-Tenant SaaS.`}
            </p>
            <p>{customLanding?.footer?.bottomText || "Hệ thống tuyển dụng doanh nghiệp"}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
