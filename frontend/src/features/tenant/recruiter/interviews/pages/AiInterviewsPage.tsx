import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  FileText,
  Filter,
  Hourglass,
  Kanban,
  LayoutList,
  ListFilter,
  MoreVertical,
  PlusCircle,
  RefreshCw,
  Send,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Upload,
  Verified,
  View,
  X,
  Search,
  Bot,
  Inbox,
  Building2,
  Mic,
  Type,
  RotateCcw,
  Ban,
  Volume2,
} from "lucide-react";
import { PrototypeBanner } from "@/components/ux/PrototypeBanner";
import { cn } from "@/lib/utils";

type SessionStatus =
  | "PENDING_REVIEW"
  | "IN_PROGRESS"
  | "ANALYZING"
  | "INVITED"
  | "COMPLETED"
  | "CANCELLED";

type AiMode = "SPEECH_TO_SPEECH" | "SPEECH_TO_TEXT" | "LIVE_CODING";

type AiSession = {
  jobId?: number;
  id: string;
  title: string;
  tier: string;
  rubric: string;
  candidate: string;
  email: string;
  cvLabel: string;
  avatarUrl?: string;
  job: string;
  project: string;
  mode: AiMode;
  scheduleLabel: string;
  scheduleHint: string;
  scheduleHintTone?: "error" | "live" | "muted";
  status: SessionStatus;
  statusHint: string;
  score: number | null;
  scoreLabel?: string;
  scoreMeta?: string;
  progressPct?: number;
  action: "REVIEW" | "WATCH" | "EXTRACTING" | "REMIND" | "REPORT";
};

const sessions: AiSession[] = [
  {
    id: "INT-8921",
    title: "Phỏng vấn Java Backend Junior",
    tier: "Junior Tier-1",
    rubric: "Rubric: v4.2 Standard",
    candidate: "Nguyễn Văn An",
    email: "an.nguyen89@gmail.com",
    cvLabel: "CV_NguyenVanAn.pdf",
    job: "Java Backend Engineer",
    project: "VNG & TechViet Core",
    mode: "SPEECH_TO_SPEECH",
    scheduleLabel: "28/10/2024 - 18:00",
    scheduleHint: "Còn 2 ngày",
    scheduleHintTone: "error",
    status: "PENDING_REVIEW",
    statusHint: "Đã phỏng vấn xong 14:20",
    score: 8.4,
    scoreLabel: "Khuyên tuyển",
    scoreMeta: "Khớp kỹ thuật: 89%",
    progressPct: 84,
    action: "REVIEW",
  },
  {
    id: "INT-8919",
    title: "Senior Frontend Architect Round",
    tier: "Senior Tier-3",
    rubric: "Live Code Sandbox",
    candidate: "Trần Mai Phương",
    email: "phuong.tran@techviet.io",
    cvLabel: "CV_MaiPhuong_Lead.pdf",
    job: "Senior Frontend Engineer",
    project: "Fintech Hub Platform",
    mode: "SPEECH_TO_SPEECH",
    scheduleLabel: "Đang trực tiếp",
    scheduleHint: "Câu 4/6 (28:15)",
    scheduleHintTone: "live",
    status: "IN_PROGRESS",
    statusHint: "AI Interviewer: 'Sophia'",
    score: null,
    scoreMeta: "Tín hiệu mic: Rất tốt",
    progressPct: 68,
    action: "WATCH",
  },
  {
    id: "INT-8915",
    title: "DevOps CI/CD & Cloud Infra",
    tier: "Mid-level",
    rubric: "Rubric: Cloud DevOps v2",
    candidate: "Lê Hoàng Huy",
    email: "huy.lehoang@cloudhub.vn",
    cvLabel: "CV_LeHoangHuy_AWS.pdf",
    job: "DevOps / SRE Architect",
    project: "Cloud Infrastructure Dept",
    mode: "SPEECH_TO_TEXT",
    scheduleLabel: "Hôm nay - 11:30",
    scheduleHint: "Đã hoàn thành phiên",
    scheduleHintTone: "muted",
    status: "ANALYZING",
    statusHint: "Trích xuất bằng chứng 74%",
    score: null,
    progressPct: 50,
    action: "EXTRACTING",
  },
  {
    id: "INT-8910",
    title: "AI & Data Science Screening",
    tier: "Mid Tier-2",
    rubric: "PyTorch & LLM Benchmark",
    candidate: "Phạm Đức Dũng",
    email: "dung.pham@aimind.edu.vn",
    cvLabel: "CV_PhamDucDung_AI.pdf",
    job: "AI / Machine Learning Engineer",
    project: "SmartHire AI R&D",
    mode: "SPEECH_TO_SPEECH",
    scheduleLabel: "30/10/2024 - 10:00",
    scheduleHint: "Còn 4 ngày",
    scheduleHintTone: "muted",
    status: "INVITED",
    statusHint: "Đã mở email mời 2 lần",
    score: null,
    action: "REMIND",
  },
  {
    id: "INT-8890",
    title: "Fullstack Node.js & Next.js",
    tier: "Senior Tier-2",
    rubric: "Full Evaluation Cycle",
    candidate: "Vũ Tuấn Kiệt",
    email: "kiet.vu@vietdev.com",
    cvLabel: "CV_VuTuanKiet_Fullstack.pdf",
    job: "Fullstack Engineer",
    project: "TechViet Ecosystem",
    mode: "SPEECH_TO_TEXT",
    scheduleLabel: "24/10/2024",
    scheduleHint: "Đã lưu trữ",
    scheduleHintTone: "muted",
    status: "COMPLETED",
    statusHint: "Feedback đã gửi ứng viên",
    score: 6.8,
    scoreLabel: "Cần PV thêm",
    scoreMeta: "Khớp văn hóa: 72%",
    progressPct: 68,
    action: "REPORT",
  },
];

type QuickTab = "ALL" | "PENDING_REVIEW" | "IN_PROGRESS" | "ANALYZING" | "COMPLETED";

const statusLabel: Record<SessionStatus, string> = {
  PENDING_REVIEW: "Chờ duyệt",
  IN_PROGRESS: "Đang diễn ra",
  ANALYZING: "Đang phân tích",
  INVITED: "Đã mời",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Huỷ",
};

function initials(name: string) {
  return name
    .split(" ")
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function ModeBadge({ mode }: { mode: AiMode }) {
  const isSpeech = mode === "SPEECH_TO_SPEECH";
  const label =
    mode === "SPEECH_TO_SPEECH"
      ? "Speech-to-Speech"
      : mode === "SPEECH_TO_TEXT"
        ? "Speech-to-Text"
        : "Live Coding + Audio AI";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        isSpeech
          ? "bg-[var(--color-surface-container-high)] text-[var(--color-primary)]"
          : "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]",
      )}
    >
      {isSpeech ? <Mic className="size-3.5" aria-hidden="true" /> : <Type className="size-3.5" aria-hidden="true" />}
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: SessionStatus }) {
  if (status === "PENDING_REVIEW") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ffdad6] px-3 py-1 text-xs font-bold text-[#93000a] shadow-sm">
        <span className="size-2 animate-pulse rounded-full bg-[#ba1a1a]" />
        Chờ duyệt
      </span>
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#c9e6ff] px-3 py-1 text-xs font-bold text-[#001e2f] shadow-sm">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--color-tertiary-container)] opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-[var(--color-tertiary-container)]" />
        </span>
        Đang diễn ra
      </span>
    );
  }
  if (status === "ANALYZING") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-container-high)] px-3 py-1 text-xs font-bold text-[var(--color-primary)] shadow-sm">
        <RefreshCw className="size-3.5 animate-spin" aria-hidden="true" />
        Đang phân tích
      </span>
    );
  }
  if (status === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-container-low)] px-3 py-1 text-xs font-bold text-[var(--color-primary)] shadow-sm">
        <CheckCircle2 className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" />
        Hoàn tất
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-container)] px-3 py-1 text-xs font-semibold text-[var(--color-on-surface-variant)]">
      <span className="size-2 rounded-full bg-[var(--color-outline)]" />
      {statusLabel[status]}
    </span>
  );
}

function ScoreCell({ session }: { session: AiSession }) {
  if (session.status === "IN_PROGRESS") {
    return (
      <div className="flex w-36 flex-col gap-1">
        <div className="flex items-center justify-between text-xs text-[var(--color-on-surface-variant)]">
          <span>Đang streaming</span>
          <span className="font-mono text-[11px]">{session.progressPct ?? 0}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-container-high)]">
          <div
            className="h-full animate-pulse rounded-full bg-[var(--color-tertiary-container)]"
            style={{ width: `${session.progressPct ?? 0}%` }}
          />
        </div>
        {session.scoreMeta && (
          <span className="font-mono text-[11px] text-[var(--color-on-surface-variant)]">{session.scoreMeta}</span>
        )}
      </div>
    );
  }
  if (session.status === "ANALYZING") {
    return (
      <div className="flex w-36 flex-col gap-1">
        <span className="text-xs italic text-[var(--color-on-surface-variant)]">Đang tổng hợp điểm...</span>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-container-high)]">
          <div
            className="h-full rounded-full bg-[var(--color-primary-container)] transition-all"
            style={{ width: `${session.progressPct ?? 50}%` }}
          />
        </div>
      </div>
    );
  }
  if (session.status === "INVITED" || session.score == null) {
    return <span className="text-xs italic text-[var(--color-outline)]">Chưa làm bài</span>;
  }
  const recommend = session.scoreLabel === "Khuyên tuyển";
  return (
    <div className="flex w-36 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-base font-bold text-[var(--color-on-surface)]">
          {session.score.toFixed(1)}{" "}
          <span className="text-xs font-normal text-[var(--color-on-surface-variant)]">/10</span>
        </span>
        {session.scoreLabel && (
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-semibold",
              recommend
                ? "bg-[var(--color-surface-container-high)] text-[var(--color-primary)]"
                : "bg-[var(--color-secondary-container)] text-[var(--color-on-surface)]",
            )}
          >
            {session.scoreLabel}
          </span>
        )}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-container-high)]">
        <div
          className={cn(
            "h-full rounded-full",
            recommend ? "bg-[var(--color-primary-container)]" : "bg-[var(--color-secondary)]",
          )}
          style={{ width: `${session.progressPct ?? session.score * 10}%` }}
        />
      </div>
      {session.scoreMeta && (
        <span className="font-mono text-[11px] text-[var(--color-on-surface-variant)]">{session.scoreMeta}</span>
      )}
    </div>
  );
}

function ActionMenu({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: { label: string; icon: typeof Share2; danger?: boolean; onClick?: () => void }[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      ref={ref}
      className="absolute right-0 top-10 z-30 flex w-48 flex-col rounded-xl bg-[var(--color-surface-card)] py-1.5 shadow-xl"
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            type="button"
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 text-left text-sm font-medium hover:bg-[var(--color-surface-container)]",
              item.danger ? "text-[#ba1a1a] hover:bg-[#ffdad6]" : "text-[var(--color-on-surface)]",
            )}
            onClick={() => {
              item.onClick?.();
              onClose();
            }}
          >
            <Icon className="size-[18px]" aria-hidden="true" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

/** Sample recruiter AI Interview workspace — mock UI aligned to Stitch prototype. */
export function AiInterviewsPage() {
  const job = useRecruitmentJob();
  const jobSessions = useMemo(() => sessions.filter(session => session.jobId === job.id), [job.id]);
  const [tab, setTab] = useState<QuickTab>("ALL");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const counts = useMemo(
    () => ({
      all: jobSessions.length,
      pending: jobSessions.filter((s) => s.status === "PENDING_REVIEW").length,
      live: jobSessions.filter((s) => s.status === "IN_PROGRESS").length,
      analyzing: jobSessions.filter((s) => s.status === "ANALYZING").length,
      completed: jobSessions.filter((s) => s.status === "COMPLETED").length,
    }),
    [jobSessions],
  );

  const completionRate = counts.all ? Math.round(counts.completed / counts.all * 100) : 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobSessions.filter((session) => {
      if (tab !== "ALL" && session.status !== tab) return false;
      if (statusFilter !== "all" && session.status !== statusFilter) return false;
      if (modeFilter !== "all" && session.mode !== modeFilter) return false;
      if (!q) return true;
      return (
        session.candidate.toLowerCase().includes(q) ||
        session.job.toLowerCase().includes(q) ||
        session.title.toLowerCase().includes(q) ||
        session.id.toLowerCase().includes(q)
      );
    });
  }, [tab, query, statusFilter, modeFilter, jobSessions]);


  const resetFilters = () => {
    setTab("ALL");
    setQuery("");
    setStatusFilter("all");
    setModeFilter("all");
  };

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(filtered.map((s) => s.id)) : new Set());
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pills: { id: QuickTab; label: string; dot?: "error" | "live" }[] = [
    { id: "ALL", label: `Tất cả (${counts.all})` },
    { id: "PENDING_REVIEW", label: `Cần duyệt ngay (${counts.pending})`, dot: "error" },
    { id: "IN_PROGRESS", label: `Đang diễn ra (${counts.live})`, dot: "live" },
    { id: "ANALYZING", label: `Đang phân tích (${counts.analyzing})` },
    { id: "COMPLETED", label: `Đã chấm xong (${counts.completed})` },
  ];

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 text-[var(--color-on-surface)]">
      {/* Header & primary operations */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-7 w-2.5 rounded-full bg-[var(--color-primary-container)]" />
            <h1 className="text-[30px] font-semibold leading-[38px] tracking-tight">Phỏng vấn AI</h1>
            <span className="rounded-full bg-[var(--color-surface-container-high)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
              AI Audio-Visual Engine v3.4
            </span>
          </div>
          <p className="max-w-2xl pl-4 text-sm leading-[22px] text-[var(--color-on-surface-variant)]">
            Quản lý phiên phỏng vấn tương tác AI, phân tích năng lực chuyên sâu và đồng bộ hồ sơ tuyển dụng.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--color-surface-container-low)] px-4 text-sm font-medium text-[var(--color-on-surface)] shadow-sm transition-colors hover:bg-[var(--color-surface-container)]"
          >
            <SlidersHorizontal className="size-[19px] text-[var(--color-on-surface-variant)]" aria-hidden="true" />
            Cấu hình Rubric AI
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--color-primary-container)] px-5 text-sm font-semibold text-[var(--color-on-primary)] shadow-md transition-all hover:bg-[var(--color-primary-hover)] active:scale-95"
          >
            <PlusCircle className="size-5" aria-hidden="true" />
            + Tạo phỏng vấn mới
          </button>
        </div>
      </div>

      <PrototypeBanner note="Giao diện mẫu theo job · chưa nối API scoring/STT. Dữ liệu mẫu chưa gắn job không hiển thị." />

      {/* KPI bento ribbon */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Tổng số phiên"
          value={String(counts.all)}
          trend="Trong vị trí đang mở"
          hint={job.title}
          icon={LayoutList}
          blob="primary"
        />
        <KpiCard
          label="Đang diễn ra"
          value={String(counts.live)}
          trend="Real-time Audio Stream"
          trendTone="tertiary"
          hint="Phiên của vị trí đang mở"
          icon={AudioLines}
          blob="secondary"
          live={counts.live > 0}
        />
        <KpiCard
          label="Chờ Recruiter duyệt"
          value={String(counts.pending)}
          trend="Cần xử lý < 24h"
          trendTone="error"
          hint="AI đã chấm sơ bộ & trích đoạn"
          icon={FileText}
          blob="error"
          badge="Ưu tiên cao"
        />
        <div className="group relative flex items-center justify-between overflow-hidden rounded-2xl bg-[var(--color-surface-card)] p-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="z-10 flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Tỷ lệ hoàn tất phiên
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight">{completionRate}%</span>
              <span className="inline-flex items-center text-[11px] font-semibold text-[var(--color-primary)]">
                <ArrowUpRight className="size-3.5" aria-hidden="true" /> {counts.completed} phiên
              </span>
            </div>
            <span className="text-xs text-[var(--color-on-surface-variant)]">Tối ưu trải nghiệm ứng viên</span>
          </div>
          <div className="relative z-10 flex size-12 items-center justify-center">
            <svg className="size-12 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
              <path
                className="text-[var(--color-surface-container-high)]"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
              />
              <path
                className="text-[var(--color-primary-container)]"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeDasharray={`${completionRate}, 100`}
                strokeLinecap="round"
                strokeWidth="3.5"
              />
            </svg>
            <span className="absolute text-[11px] font-bold">{completionRate}%</span>
          </div>
        </div>
      </div>

      {/* Control toolbar */}
      <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-surface-card)] p-4 shadow-sm">
        <div className="flex flex-col items-stretch justify-between gap-4 lg:flex-row lg:items-center">
          <label className="relative flex max-w-2xl flex-1 items-center">
            <span className="sr-only">Tìm phiên phỏng vấn AI</span>
            <Search
              className="pointer-events-none absolute left-3.5 size-5 text-[var(--color-outline)]"
              aria-hidden="true"
            />
            <input
              className="h-11 w-full rounded-xl bg-[var(--color-surface)] pl-11 pr-24 text-sm text-[var(--color-on-surface)] shadow-[0_0_0_1px_var(--color-outline-variant)] outline-none transition-all placeholder:text-[var(--color-outline)] focus:shadow-[0_0_0_2px_var(--color-primary-hover)]"
              placeholder="Tìm theo tên phiên, ứng viên, mã phỏng vấn (#INT-...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="absolute right-3 hidden rounded bg-[var(--color-surface-container-high)] px-2 py-1 font-mono text-[11px] font-medium text-[var(--color-on-surface-variant)] sm:inline-block">
              ⌘ + K
            </span>
          </label>
          <div className="flex flex-wrap items-center justify-end gap-1">
            <div className="flex items-center rounded-xl bg-[var(--color-surface-container-low)] p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors",
                  viewMode === "table"
                    ? "bg-[var(--color-surface-card)] text-[var(--color-on-surface)] shadow-sm"
                    : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]",
                )}
              >
                <LayoutList className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
                Bảng
              </button>
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors",
                  viewMode === "kanban"
                    ? "bg-[var(--color-surface-card)] text-[var(--color-on-surface)] shadow-sm"
                    : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]",
                )}
              >
                <Kanban className="size-4" aria-hidden="true" />
                Kanban
              </button>
            </div>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-surface-container-low)] px-3.5 text-xs font-medium text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container)]"
            >
              <Download className="size-[18px] text-[var(--color-on-surface-variant)]" aria-hidden="true" />
              Xuất Excel / CSV
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-surface-container-low)] px-3.5 text-xs font-medium text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container)]"
            >
              <Bot className="size-[18px] text-[var(--color-primary)]" aria-hidden="true" />
              Cài đặt tự động hóa
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="flex items-center gap-1 pr-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            <Filter className="size-4" aria-hidden="true" />
            Bộ lọc:
          </div>
          <select
            aria-label="Lọc theo trạng thái"
            className="h-9 cursor-pointer appearance-none rounded-lg bg-[var(--color-surface-container-low)] pl-3.5 pr-8 text-xs font-medium text-[var(--color-on-surface)] outline-none focus:shadow-[0_0_0_2px_var(--color-primary-hover)]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Trạng thái: Tất cả ({counts.all})</option>
            <option value="PENDING_REVIEW">Chờ duyệt Recruiter ({counts.pending})</option>
            <option value="IN_PROGRESS">Đang diễn ra ({counts.live})</option>
            <option value="ANALYZING">Đang phân tích AI ({counts.analyzing})</option>
            <option value="INVITED">Đã mời / Sắp diễn ra</option>
            <option value="COMPLETED">Hoàn tất ({counts.completed})</option>
            <option value="CANCELLED">Hết hạn / Huỷ</option>
          </select>
          <select
            aria-label="Lọc theo hình thức"
            className="h-9 cursor-pointer appearance-none rounded-lg bg-[var(--color-surface-container-low)] pl-3.5 pr-8 text-xs font-medium text-[var(--color-on-surface)] outline-none focus:shadow-[0_0_0_2px_var(--color-primary-hover)]"
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
          >
            <option value="all">Hình thức: Tất cả</option>
            <option value="SPEECH_TO_SPEECH">Speech-to-Speech (Hội thoại 2 chiều)</option>
            <option value="SPEECH_TO_TEXT">Speech-to-Text (Giọng nói → Văn bản)</option>
            <option value="LIVE_CODING">Live Coding + Audio AI</option>
          </select>
          <select
            aria-label="Khung thời gian"
            className="h-9 cursor-pointer appearance-none rounded-lg bg-[var(--color-surface-container-low)] pl-3.5 pr-8 text-xs font-medium text-[var(--color-on-surface)] outline-none focus:shadow-[0_0_0_2px_var(--color-primary-hover)]"
            defaultValue="7d"
          >
            <option value="7d">Thời gian: 7 ngày qua</option>
            <option value="30d">30 ngày qua</option>
            <option value="q">Quý này</option>
          </select>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-xs font-medium text-[var(--color-on-surface-variant)] transition-colors hover:bg-[#ffdad6]/30 hover:text-[#ba1a1a]"
          >
            <X className="size-4" aria-hidden="true" />
            Đặt lại
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {pills.map((pill) => {
            const active = tab === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setTab(pill.id)}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all",
                  active
                    ? "bg-[var(--color-primary-container)] font-semibold text-[var(--color-on-primary)]"
                    : "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]",
                )}
              >
                {pill.dot === "error" && <span className="size-1.5 rounded-full bg-[#ba1a1a]" />}
                {pill.dot === "live" && (
                  <span className="size-1.5 rounded-full bg-[var(--color-tertiary-container)]" />
                )}
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Data table */}
      {viewMode === "table" ? (
        <div className="flex flex-col overflow-hidden rounded-3xl bg-[var(--color-surface-card)] shadow-sm">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1240px] border-collapse text-left text-sm">
              <thead>
                <tr className="h-12 select-none bg-[var(--color-surface-container-low)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  <th className="w-12 py-3 pl-4 text-center">
                    <input
                      type="checkbox"
                      className="size-4 cursor-pointer rounded border-[var(--color-outline-variant)]"
                      aria-label="Chọn tất cả"
                      checked={filtered.length > 0 && filtered.every((s) => selected.has(s.id))}
                      onChange={(e) => toggleAll(e.target.checked)}
                    />
                  </th>
                  <th className="px-4 py-3">Tên phiên &amp; Mã</th>
                  <th className="px-4 py-3">Ứng viên &amp; CV</th>
                  <th className="px-4 py-3">Vị trí &amp; Dự án</th>
                  <th className="px-4 py-3">Hình thức AI</th>
                  <th className="px-4 py-3">Lịch &amp; Hạn tham gia</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Đánh giá AI</th>
                  <th className="py-3 pr-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-surface-container-low)]">
                {filtered.map((session) => (
                  <tr
                    key={session.id}
                    className="group transition-colors hover:bg-[var(--color-surface-container-low)]/60"
                  >
                    <td className="py-4 pl-4 text-center">
                      <input
                        type="checkbox"
                        className="size-4 cursor-pointer rounded border-[var(--color-outline-variant)]"
                        aria-label={`Chọn ${session.id}`}
                        checked={selected.has(session.id)}
                        onChange={() => toggleOne(session.id)}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="cursor-pointer text-base font-semibold tracking-tight transition-colors group-hover:text-[var(--color-primary)]">
                            {session.title}
                          </span>
                          <span
                            className={cn(
                              "rounded px-2 py-0.5 text-[11px] font-semibold",
                              session.tier.includes("Senior")
                                ? "bg-[var(--color-secondary-container)] text-[var(--color-on-surface)]"
                                : "bg-[var(--color-surface-container-high)] text-[var(--color-primary)]",
                            )}
                          >
                            {session.tier}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[13px] text-[var(--color-on-surface-variant)]">
                          <Tag className="size-3.5" aria-hidden="true" />
                          <span>#{session.id}</span>
                          <span>•</span>
                          <span>{session.rubric}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {session.avatarUrl ? (
                          <img
                            src={session.avatarUrl}
                            alt=""
                            className="size-10 rounded-full object-cover shadow-sm"
                          />
                        ) : (
                          <div className="flex size-10 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary-hover)] shadow-sm">
                            {initials(session.candidate)}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="leading-tight font-semibold">{session.candidate}</span>
                          <span className="text-xs leading-tight text-[var(--color-on-surface-variant)]">
                            {session.email}
                          </span>
                          <span className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
                            <FileText className="size-3" aria-hidden="true" />
                            {session.cvLabel}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold">{session.job}</span>
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--color-on-surface-variant)]">
                          <Building2 className="size-3.5" aria-hidden="true" />
                          {session.project}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <ModeBadge mode={session.mode} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">{session.scheduleLabel}</span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 text-xs font-medium",
                            session.scheduleHintTone === "error" && "text-[#ba1a1a]",
                            session.scheduleHintTone === "live" && "font-semibold text-[var(--color-tertiary)]",
                            session.scheduleHintTone === "muted" && "text-[var(--color-on-surface-variant)]",
                          )}
                        >
                          {session.scheduleHintTone === "live" ? (
                            <RefreshCw className="size-3.5 animate-spin" aria-hidden="true" />
                          ) : session.scheduleHintTone === "error" ? (
                            <CalendarDays className="size-3.5" aria-hidden="true" />
                          ) : null}
                          {session.scheduleHint}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={session.status} />
                      <span className="mt-1 block font-mono text-[11px] text-[var(--color-on-surface-variant)]">
                        {session.statusHint}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <ScoreCell session={session} />
                    </td>
                    <td className="py-4 pr-4 text-right">
                      <div className="relative flex items-center justify-end gap-1.5">
                        <RowAction session={session} />
                        <button
                          type="button"
                          className="flex size-9 items-center justify-center rounded-lg text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-surface-container)]"
                          aria-label="Thêm thao tác"
                          onClick={() => setMenuId(menuId === session.id ? null : session.id)}
                        >
                          <MoreVertical className="size-5" aria-hidden="true" />
                        </button>
                        <ActionMenu
                          open={menuId === session.id}
                          onClose={() => setMenuId(null)}
                          items={
                            session.status === "IN_PROGRESS"
                              ? [
                                  { label: "Kiểm tra audio log", icon: Volume2 },
                                  { label: "Can thiệp câu hỏi", icon: CircleHelp },
                                ]
                              : [
                                  { label: "Sao chép link phiên", icon: Share2 },
                                  { label: "Gửi lại lời mời", icon: RotateCcw },
                                  { label: "Huỷ phiên này", icon: Ban, danger: true },
                                ]
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-[var(--color-on-surface-variant)]">
                      Không có phiên phù hợp bộ lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-center justify-between gap-2 bg-[var(--color-surface-card)] px-4 py-3.5 sm:flex-row">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-on-surface-variant)]">
              <span>
                Hiển thị <span className="font-semibold text-[var(--color-on-surface)]">1 - {filtered.length}</span> trên
                tổng số <span className="font-semibold text-[var(--color-on-surface)]">{counts.all}</span> phiên
              </span>
              <span className="text-[var(--color-outline-variant)]">•</span>
              <div className="flex items-center gap-1.5">
                <span>Dòng mỗi trang:</span>
                <select
                  aria-label="Số dòng mỗi trang"
                  className="h-8 rounded-md bg-[var(--color-surface-container-low)] px-2 text-[11px] font-medium text-[var(--color-on-surface)] outline-none"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled
                className="flex size-8 items-center justify-center rounded-lg bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] opacity-50"
                aria-label="Trang trước"
              >
                <ChevronLeft className="size-[18px]" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="size-8 rounded-lg bg-[var(--color-primary-container)] text-sm font-semibold text-[var(--color-on-primary)]"
              >
                1
              </button>
              <button
                type="button"
                className="size-8 rounded-lg text-sm font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)]"
              >
                2
              </button>
              <button
                type="button"
                className="size-8 rounded-lg text-sm font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)]"
              >
                3
              </button>
              <span className="px-1 text-[var(--color-outline)]">...</span>
              <button
                type="button"
                className="size-8 rounded-lg text-sm font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)]"
              >
                5
              </button>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-lg bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)]"
                aria-label="Trang sau"
              >
                <ChevronRight className="size-[18px]" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl bg-[var(--color-surface-card)] p-8 text-center shadow-sm">
          <ListFilter className="mx-auto size-8 text-[var(--color-outline)]" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold">Kanban view</p>
          <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
            Chế độ Kanban đang được chuẩn bị — hãy dùng Bảng để quản lý phiên.
          </p>
        </div>
      )}

      {/* Setup guide banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--color-surface-container-low)] via-[var(--color-surface-card)] to-[var(--color-surface-container-low)] p-6 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex max-w-xl flex-col gap-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-[22px] text-[var(--color-primary)]" aria-hidden="true" />
              <h3 className="text-xl font-bold tracking-tight">Quy trình thiết lập phỏng vấn AI chuẩn hóa</h3>
            </div>
            <p className="text-sm leading-[22px] text-[var(--color-on-surface-variant)]">
              Tối ưu hóa thời gian sàng lọc sơ bộ ứng viên lên đến 70% thông qua công nghệ Voice-AI tương tác hai chiều
              và bộ chấm điểm Rubric tự động.
            </p>
          </div>
          <div className="grid w-full flex-1 grid-cols-2 gap-3 md:grid-cols-4 lg:max-w-3xl lg:w-auto">
            {[
              {
                n: 1,
                icon: Upload,
                title: "JD của vị trí đang mở",
                desc: job.title,
              },
              {
                n: 2,
                icon: SlidersHorizontal,
                title: "Cấu hình Bộ hỏi",
                desc: "Chọn Speech-to-Speech hoặc Text mode",
              },
              {
                n: 3,
                icon: Inbox,
                title: "Gửi link phòng",
                desc: "Ứng viên tự do phỏng vấn 24/7 theo lịch hẹn",
              },
              {
                n: 4,
                icon: Verified,
                title: "Duyệt & Ra quyết định",
                desc: "Xem transcript, video và gợi ý tuyển chọn",
              },
            ].map((step) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={step.n}
                  className="flex flex-col gap-1 rounded-xl bg-[var(--color-surface-card)]/80 p-3 shadow-sm backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-6 items-center justify-center rounded-full bg-[var(--color-primary-container)] text-[11px] font-bold text-[var(--color-on-primary)]">
                      {step.n}
                    </span>
                    <StepIcon className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
                  </div>
                  <span className="mt-1 text-xs font-semibold text-[var(--color-on-surface)]">{step.title}</span>
                  <span className="text-xs leading-tight text-[var(--color-on-surface-variant)]">{step.desc}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function RowAction({ session }: { session: AiSession }) {
  if (session.action === "REVIEW") {
    return (
      <button
        type="button"
        className="inline-flex h-9 items-center gap-1 rounded-lg bg-[var(--color-primary-container)] px-3 text-xs font-semibold text-[var(--color-on-primary)] shadow-sm transition-colors hover:bg-[var(--color-primary-hover)]"
      >
        Duyệt feedback
        <ArrowRight className="size-4" aria-hidden="true" />
      </button>
    );
  }
  if (session.action === "WATCH") {
    return (
      <button
        type="button"
        className="inline-flex h-9 items-center gap-1 rounded-lg bg-[var(--color-surface-container-low)] px-3 text-xs font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container)]"
      >
        <View className="size-4 text-[var(--color-tertiary-container)]" aria-hidden="true" />
        Quan sát live
      </button>
    );
  }
  if (session.action === "EXTRACTING") {
    return (
      <button
        type="button"
        disabled
        className="inline-flex h-9 cursor-not-allowed items-center gap-1 rounded-lg bg-[var(--color-surface-container-low)] px-3 text-xs font-medium text-[var(--color-on-surface-variant)] opacity-80"
      >
        <Hourglass className="size-4" aria-hidden="true" />
        Đang trích xuất
      </button>
    );
  }
  if (session.action === "REMIND") {
    return (
      <button
        type="button"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--color-surface-container-low)] px-3 text-xs font-medium text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container)]"
      >
        <Send className="size-4" aria-hidden="true" />
        Nhắc nhở
      </button>
    );
  }
  return (
    <button
      type="button"
      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--color-surface-container-low)] px-3 text-xs font-medium text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container)]"
    >
      <FileText className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
      Báo cáo
    </button>
  );
}

function KpiCard({
  label,
  value,
  trend,
  trendTone = "primary",
  hint,
  icon: Icon,
  blob,
  live,
  badge,
}: {
  label: string;
  value: string;
  trend: string;
  trendTone?: "primary" | "tertiary" | "error";
  hint: string;
  icon: typeof LayoutList;
  blob: "primary" | "secondary" | "error";
  live?: boolean;
  badge?: string;
}) {
  const trendClass =
    trendTone === "error"
      ? "text-[#ba1a1a]"
      : trendTone === "tertiary"
        ? "text-[var(--color-tertiary)]"
        : "text-[var(--color-primary)]";
  const iconClass =
    blob === "error"
      ? "text-[#ba1a1a]"
      : blob === "secondary"
        ? "text-[var(--color-tertiary-container)]"
        : "text-[var(--color-primary)]";
  const blobClass =
    blob === "error"
      ? "bg-[#ffdad6]/20"
      : blob === "secondary"
        ? "bg-[var(--color-secondary-container)]/30"
        : "bg-[var(--color-surface-container-low)]";

  return (
    <div className="group relative flex items-center justify-between overflow-hidden rounded-2xl bg-[var(--color-surface-card)] p-4 shadow-sm transition-shadow hover:shadow-md">
      <div
        className={cn(
          "absolute -right-4 -bottom-4 size-24 rounded-full opacity-40 transition-transform group-hover:scale-110",
          blobClass,
        )}
      />
      <div className="z-10 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">
            {label}
          </span>
          {live && (
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--color-tertiary-container)] opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-[var(--color-tertiary-container)]" />
            </span>
          )}
          {badge && (
            <span className="rounded-full bg-[var(--color-secondary-container)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-on-surface)]">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold tracking-tight">{value}</span>
          <span className={cn("inline-flex items-center text-[11px] font-semibold", trendClass)}>
            {trendTone === "primary" && <ArrowUpRight className="size-3.5" aria-hidden="true" />}
            {trend}
          </span>
        </div>
        <span className="text-xs text-[var(--color-on-surface-variant)]">{hint}</span>
      </div>
      <div
        className={cn(
          "z-10 flex size-12 items-center justify-center rounded-xl bg-[var(--color-surface-container-low)]",
          iconClass,
        )}
      >
        <Icon className="size-6" aria-hidden="true" />
      </div>
    </div>
  );
}
