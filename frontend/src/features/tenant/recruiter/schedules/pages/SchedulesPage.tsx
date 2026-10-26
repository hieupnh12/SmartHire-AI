import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Search,
  Video,
  CheckCircle2,
  XCircle,
  Copy,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ux/Button";
import { toast } from "@/stores/toastStore";
import { jobApi } from "@/api/tenant/jobApi";
import { cn } from "@/lib/utils";
import {
  mockInterviews as initialMockInterviews,
  interviewStatusLabel,
  roundMeta,
  type MockInterview,
  type InterviewRound,
  type InterviewStatus,
  type InterviewMode,
} from "../constants/mockInterviews";
import {
  RecruiterCalendarMonth,
  coversDay,
  sortInterviewsByTime,
} from "../components/RecruiterCalendarMonth";
import { ScheduleModalDialog } from "../components/ScheduleModalDialog";

const timeFormat: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };

export function SchedulesPage() {
  const [params] = useSearchParams();
  const { id: routeJobId } = useParams<{ id?: string }>();
  const scopedJobId = routeJobId && /^\d+$/.test(routeJobId) ? Number(routeJobId) : null;
  const urlStatus = params.get("status")?.toUpperCase();
  const initialStatus: InterviewStatus | "ALL" =
    urlStatus === "PENDING" || urlStatus === "CONFIRMED" || urlStatus === "DONE" || urlStatus === "CANCELLED"
      ? urlStatus
      : "ALL";

  // Month & Day Selection
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState(() => new Date());

  // Interviews State (local state initialized with rich seed data)
  const [interviews, setInterviews] = useState<MockInterview[]>(() => {
    const saved = localStorage.getItem("smarthire_recruiter_schedules");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore fallback
      }
    }
    return initialMockInterviews;
  });

  // Filter States
  const [jobFilter, setJobFilter] = useState<number | "ALL">(scopedJobId ?? "ALL");
  const [roundFilter, setRoundFilter] = useState<InterviewRound | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<InterviewStatus | "ALL">(initialStatus);
  const [modeFilter, setModeFilter] = useState<InterviewMode | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sidebar Tab state
  const [sidebarTab, setSidebarTab] = useState<"DAY" | "UPCOMING">("DAY");

  // Fetch Jobs for the dropdown
  const jobsQuery = useQuery({
    queryKey: ["screening-jobs"],
    queryFn: jobApi.options,
  });
  const availableJobs = jobsQuery.data?.data ?? [];

  // Filter logic
  const filteredInterviews = useMemo(() => {
    return interviews.filter((item) => {
      if (jobFilter !== "ALL") {
        if (item.jobId && item.jobId !== jobFilter) return false;
        const matchedJob = availableJobs.find((j) => j.id === jobFilter);
        if (matchedJob && item.jobTitle !== matchedJob.title) return false;
      }
      if (roundFilter !== "ALL" && item.round !== roundFilter) return false;
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (modeFilter !== "ALL" && item.mode !== modeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const nameMatch = item.candidateName.toLowerCase().includes(q);
        const emailMatch = item.candidateEmail?.toLowerCase().includes(q) ?? false;
        const jobMatch = item.jobTitle.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !jobMatch) return false;
      }
      return true;
    });
  }, [interviews, jobFilter, roundFilter, statusFilter, modeFilter, searchQuery, availableJobs]);

  // Day Interviews
  const dayInterviews = useMemo(() => {
    return filteredInterviews
      .filter((item) => coversDay(item, selected))
      .sort(sortInterviewsByTime);
  }, [filteredInterviews, selected]);

  // Upcoming Interviews (next 7 days from now)
  const upcomingInterviews = useMemo(() => {
    const now = Date.now();
    return filteredInterviews
      .filter((item) => {
        const itemTime = new Date(item.startsAt).getTime();
        return itemTime >= now && item.status !== "CANCELLED";
      })
      .sort(sortInterviewsByTime)
      .slice(0, 10);
  }, [filteredInterviews]);

  // Month navigation helpers
  const shiftMonth = (offset: number) =>
    setMonth((value) => new Date(value.getFullYear(), value.getMonth() + offset, 1));
  const goToday = () => {
    const now = new Date();
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelected(now);
  };

  // Add new interview handler
  const handleSaveInterview = (newInterview: MockInterview) => {
    const updated = [newInterview, ...interviews];
    setInterviews(updated);
    localStorage.setItem("smarthire_recruiter_schedules", JSON.stringify(updated));
    setSelected(new Date(newInterview.startsAt));
    setMonth(new Date(new Date(newInterview.startsAt).getFullYear(), new Date(newInterview.startsAt).getMonth(), 1));
    toast.success(`Đã lên lịch phỏng vấn cho ứng viên ${newInterview.candidateName} thành công 🎉`);
  };

  // Update interview status
  const handleUpdateStatus = (id: number, nextStatus: InterviewStatus) => {
    const updated = interviews.map((item) =>
      item.id === id ? { ...item, status: nextStatus } : item,
    );
    setInterviews(updated);
    localStorage.setItem("smarthire_recruiter_schedules", JSON.stringify(updated));
    toast.success(
      nextStatus === "DONE"
        ? "Đã đánh dấu buổi phỏng vấn hoàn thành ✓"
        : nextStatus === "CANCELLED"
          ? "Đã hủy lịch phỏng vấn"
          : "Đã cập nhật trạng thái lịch",
    );
  };

  // Copy meeting link
  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Đã sao chép đường dẫn phòng họp vào clipboard 📋");
  };

  return (
    <section className="space-y-4 text-[var(--color-on-surface)]">
      {/* 1. Compact Toolbar & Filters */}
      <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--color-border-default)] bg-white p-2.5 lg:flex-row lg:items-center lg:justify-between">
        {/* Month Navigator */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            aria-label="Tháng trước"
            onClick={() => shiftMonth(-1)}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <span className="min-w-36 text-center text-sm font-bold capitalize text-[var(--color-on-surface)]">
            {month.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}
          </span>
          <Button
            variant="secondary"
            size="sm"
            aria-label="Tháng sau"
            onClick={() => shiftMonth(1)}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday} className="h-8 text-xs font-semibold text-brand-primary px-2">
            Hôm nay
          </Button>
        </div>

        {/* Compact Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[170px] flex-1 sm:w-48">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-outline)]" />
            <input
              type="search"
              placeholder="Tìm ứng viên, job..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-1.5 pl-8 pr-2.5 text-xs outline-none focus:border-brand-primary focus:bg-white"
            />
          </div>

          {/* Job Filter */}
          <select
            aria-label="Lọc theo vị trí"
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
            className="h-8 rounded-lg border border-[var(--color-border-default)] bg-white px-2 text-xs font-medium text-[var(--color-on-surface)] outline-none focus:border-brand-primary"
          >
            <option value="ALL">Tất cả vị trí</option>
            {availableJobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>

          {/* Round Filter */}
          <select
            aria-label="Lọc theo vòng"
            value={roundFilter}
            onChange={(e) => setRoundFilter(e.target.value as InterviewRound | "ALL")}
            className="h-8 rounded-lg border border-[var(--color-border-default)] bg-white px-2 text-xs font-medium text-[var(--color-on-surface)] outline-none focus:border-brand-primary"
          >
            <option value="ALL">Tất cả vòng</option>
            <option value="TECHNICAL">Kỹ thuật</option>
            <option value="CULTURE">Văn hóa</option>
            <option value="EXECUTIVE">Lãnh đạo</option>
            <option value="AI_INTERVIEW">Phỏng vấn AI</option>
          </select>

          {/* Mode Filter */}
          <select
            aria-label="Lọc theo hình thức"
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as InterviewMode | "ALL")}
            className="h-8 rounded-lg border border-[var(--color-border-default)] bg-white px-2 text-xs font-medium text-[var(--color-on-surface)] outline-none focus:border-brand-primary"
          >
            <option value="ALL">Mọi hình thức</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
          </select>

          {/* Status Filter */}
          <select
            aria-label="Lọc theo trạng thái"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InterviewStatus | "ALL")}
            className="h-8 rounded-lg border border-[var(--color-border-default)] bg-white px-2 text-xs font-medium text-[var(--color-on-surface)] outline-none focus:border-brand-primary"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="PENDING">Chờ xác nhận</option>
            <option value="DONE">Hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>
      </div>

      {/* 3. Inline Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-[var(--color-on-surface-variant)]">
        <span className="font-medium text-[var(--color-on-surface)]">Vòng PV:</span>
        {Object.entries(roundMeta).map(([roundKey, meta]) => (
          <span key={roundKey} className="flex items-center gap-1">
            <span className={cn("size-2 rounded-full", meta.dot)} aria-hidden="true" />
            {meta.label}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />
          Chờ xác nhận
        </span>
      </div>

      {/* 4. Main Grid: Calendar & Flat Sidebar Panel */}
      <div className="grid gap-4 xl:grid-cols-[1fr_360px] 2xl:grid-cols-[1fr_400px]">
        {/* Left: Monthly Calendar Board */}
        <div>
          <RecruiterCalendarMonth
            month={month}
            interviews={filteredInterviews}
            selected={selected}
            onSelect={(day) => {
              setSelected(day);
              if (day.getMonth() !== month.getMonth()) {
                setMonth(new Date(day.getFullYear(), day.getMonth(), 1));
              }
            }}
          />
        </div>

        {/* Right: Unified Single Flat Panel (No nested cards) */}
        <aside className="flex flex-col rounded-xl border border-[var(--color-border-default)] bg-white overflow-hidden">
          {/* Tab Switcher Header */}
          <div className="flex items-center border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)]/50 p-1">
            <button
              type="button"
              onClick={() => setSidebarTab("DAY")}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold text-center rounded-lg transition-colors",
                sidebarTab === "DAY"
                  ? "bg-white text-brand-primary shadow-xs"
                  : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]",
              )}
            >
              Ngày {selected.getDate()}/{selected.getMonth() + 1} ({dayInterviews.length})
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab("UPCOMING")}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold text-center rounded-lg transition-colors flex items-center justify-center gap-1",
                sidebarTab === "UPCOMING"
                  ? "bg-white text-brand-primary shadow-xs"
                  : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]",
              )}
            >
              <Sparkles className="size-3 text-brand-primary" />
              7 ngày tới ({upcomingInterviews.length})
            </button>
          </div>

          {/* Panel Body */}
          <div className="flex-1 overflow-y-auto max-h-[640px]">
            {sidebarTab === "DAY" ? (
              /* Tab 1: Selected Day List */
              dayInterviews.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <CalendarDays className="mx-auto size-7 text-[var(--color-outline)]" aria-hidden="true" />
                  <p className="mt-2 text-xs font-semibold text-[var(--color-on-surface)]">
                    Không có lịch ngày {selected.toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" })}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--color-on-surface-variant)]">
                    Chọn ngày khác trên lịch hoặc bấm lên lịch mới.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsModalOpen(true)}
                    className="mt-3 h-7 text-xs gap-1"
                  >
                    <CalendarPlus className="size-3" />
                    Lên lịch ngày này
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--color-border-default)]">
                  {dayInterviews.map((item) => {
                    const startTime = new Date(item.startsAt).toLocaleTimeString("vi-VN", timeFormat);
                    const endTime = new Date(
                      new Date(item.startsAt).getTime() + item.durationMinutes * 60000,
                    ).toLocaleTimeString("vi-VN", timeFormat);
                    const meta = roundMeta[item.round];
                    const initials = item.candidateName
                      .split(" ")
                      .filter(Boolean)
                      .slice(-2)
                      .map((p) => p[0])
                      .join("")
                      .toUpperCase();

                    return (
                      <li
                        key={item.id}
                        className={cn(
                          "p-3.5 transition-colors hover:bg-[var(--color-surface-alt)]/50",
                          item.status === "DONE" && "bg-emerald-50/20",
                          item.status === "CANCELLED" && "opacity-60 bg-slate-50/50",
                        )}
                      >
                        {/* Row 1: Candidate & Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[11px] font-bold text-brand-primary">
                              {initials}
                            </span>
                            <div className="min-w-0">
                              <h4 className="truncate text-xs font-bold text-[var(--color-on-surface)]">
                                {item.candidateName}
                              </h4>
                              <p className="truncate text-[11px] text-[var(--color-on-surface-variant)]">
                                {item.jobTitle}
                              </p>
                            </div>
                          </div>

                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              item.status === "CONFIRMED"
                                ? "bg-emerald-50 text-emerald-700"
                                : item.status === "PENDING"
                                  ? "bg-amber-50 text-amber-700"
                                  : item.status === "DONE"
                                    ? "bg-slate-100 text-slate-600"
                                    : "bg-red-50 text-red-600 line-through",
                            )}
                          >
                            {interviewStatusLabel[item.status]}
                          </span>
                        </div>

                        {/* Row 2: Time, Mode & Round */}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-on-surface-variant)]">
                          <span className="flex items-center gap-1 font-medium text-[var(--color-on-surface)]">
                            <Clock className="size-3 text-brand-primary" />
                            {startTime} – {endTime}
                          </span>

                          <span className="flex items-center gap-1">
                            {item.mode === "ONLINE" ? (
                              <Video className="size-3 text-sky-600" />
                            ) : (
                              <MapPin className="size-3 text-emerald-600" />
                            )}
                            <span className="truncate max-w-[150px]">{item.locationOrLink}</span>
                          </span>

                          <span className={cn("rounded px-1.5 py-0.2 text-[10px] font-medium", meta?.chip)}>
                            {meta?.label || item.round}
                          </span>
                        </div>

                        {/* Row 3: Action Buttons */}
                        <div className="mt-2.5 flex items-center gap-1.5">
                          {item.mode === "ONLINE" && item.locationOrLink.startsWith("http") && (
                            <>
                              <a
                                href={item.locationOrLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-6 items-center gap-1 rounded bg-brand-primary px-2 text-[11px] font-semibold text-white hover:bg-brand-primary-hover"
                              >
                                <Video className="size-3" />
                                Vào họp
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopyLink(item.locationOrLink)}
                                className="inline-flex h-6 items-center gap-0.5 rounded border border-[var(--color-border-default)] px-1.5 text-[11px] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-alt)]"
                              >
                                <Copy className="size-2.5" />
                                Copy link
                              </button>
                            </>
                          )}

                          {item.status !== "DONE" && item.status !== "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(item.id, "DONE")}
                              className="inline-flex h-6 items-center gap-0.5 rounded border border-emerald-200 bg-emerald-50 px-2 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
                            >
                              <CheckCircle2 className="size-2.5" />
                              Xong
                            </button>
                          )}

                          {item.status !== "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(item.id, "CANCELLED")}
                              className="inline-flex h-6 items-center gap-0.5 rounded px-1.5 text-[11px] text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="size-2.5" />
                              Hủy
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : (
              /* Tab 2: Upcoming 7 Days List */
              upcomingInterviews.length === 0 ? (
                <p className="p-8 text-center text-xs text-[var(--color-on-surface-variant)]">
                  Không có lịch phỏng vấn trong 7 ngày tới.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--color-border-default)]">
                  {upcomingInterviews.map((item) => {
                    const dateStr = new Date(item.startsAt).toLocaleDateString("vi-VN", {
                      weekday: "short",
                      day: "numeric",
                      month: "numeric",
                    });
                    const timeStr = new Date(item.startsAt).toLocaleTimeString("vi-VN", timeFormat);

                    return (
                      <li
                        key={item.id}
                        onClick={() => {
                          setSelected(new Date(item.startsAt));
                          setSidebarTab("DAY");
                        }}
                        className="cursor-pointer p-3 transition-colors hover:bg-[var(--color-surface-alt)]/50 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-[var(--color-on-surface)] truncate">
                              {item.candidateName}
                            </span>
                            <span className={cn("rounded px-1 text-[10px] font-medium", roundMeta[item.round]?.chip)}>
                              {roundMeta[item.round]?.label || item.round}
                            </span>
                          </div>
                          <p className="truncate text-[11px] text-[var(--color-on-surface-variant)]">
                            {item.jobTitle}
                          </p>
                        </div>
                        <div className="shrink-0 text-right text-[11px]">
                          <span className="font-semibold text-brand-primary block">{timeStr}</span>
                          <span className="text-[10px] text-[var(--color-outline)]">{dateStr}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )
            )}
          </div>
        </aside>
      </div>

      {/* 5. Schedule Modal Dialog */}
      <ScheduleModalDialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveInterview}
        availableJobs={availableJobs}
        initialDate={selected}
      />
    </section>
  );
}
