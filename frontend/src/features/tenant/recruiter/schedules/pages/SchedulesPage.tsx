import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ux/Button";
import { toast } from "@/stores/toastStore";
import { jobApi } from "@/api/tenant/jobApi";
import { humanInterviewApi } from "@/api/tenant/humanInterviewApi";
import { getApiErrorMessage } from "@/lib/axios";
import { cn } from "@/lib/utils";
import {
  interviewStatusLabel,
  roundMeta,
  type CalendarInterview,
  type InterviewRound,
  type InterviewStatus,
  type InterviewMode,
} from "../constants/mockInterviews";
import {
  RecruiterCalendarMonth,
  coversDay,
  sortInterviewsByTime,
} from "../components/RecruiterCalendarMonth";
import { mapHumanInterview } from "../utils/mapHumanInterview";

const timeFormat: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };

export function SchedulesPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [params] = useSearchParams();
  const { id: routeJobId } = useParams<{ id?: string }>();
  const scopedJobId = routeJobId && /^\d+$/.test(routeJobId) ? Number(routeJobId) : null;
  const urlStatus = params.get("status")?.toUpperCase();
  const initialStatus: InterviewStatus | "ALL" =
    urlStatus === "PENDING" || urlStatus === "CONFIRMED" || urlStatus === "DONE" || urlStatus === "CANCELLED"
      ? urlStatus
      : "ALL";
  const focusUpcoming = params.get("status")?.toLowerCase() === "upcoming";

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState(() => new Date());
  const [jobFilter, setJobFilter] = useState<number | "ALL">(scopedJobId ?? "ALL");
  const [roundFilter, setRoundFilter] = useState<InterviewRound | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<InterviewStatus | "ALL">(initialStatus);
  const [modeFilter, setModeFilter] = useState<InterviewMode | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarTab, setSidebarTab] = useState<"DAY" | "UPCOMING">(focusUpcoming ? "UPCOMING" : "DAY");

  const jobsQuery = useQuery({
    queryKey: ["screening-jobs"],
    queryFn: jobApi.options,
  });
  const availableJobs = jobsQuery.data?.data ?? [];
  const jobIds = useMemo(() => {
    if (jobFilter !== "ALL") return [jobFilter];
    if (scopedJobId) return [scopedJobId];
    return availableJobs.map((j) => j.id);
  }, [jobFilter, scopedJobId, availableJobs]);

  const interviewQueries = useQueries({
    queries: jobIds.map((jobId) => ({
      queryKey: ["human-interviews", "calendar", jobId] as const,
      queryFn: () => humanInterviewApi.list({ jobId, size: 100 }),
      enabled: Number.isFinite(jobId) && jobId > 0,
    })),
  });

  const interviews = useMemo(() => {
    const rows: CalendarInterview[] = [];
    for (const query of interviewQueries) {
      for (const item of query.data?.items ?? []) {
        const mapped = mapHumanInterview(item);
        if (mapped) rows.push(mapped);
      }
    }
    return rows;
  }, [interviewQueries]);

  const loading = jobsQuery.isPending || (jobIds.length > 0 && interviewQueries.some((q) => q.isPending));
  const loadError = interviewQueries.find((q) => q.isError)?.error;

  const filteredInterviews = useMemo(() => {
    return interviews.filter((item) => {
      if (jobFilter !== "ALL" && item.jobId !== jobFilter) return false;
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
  }, [interviews, jobFilter, roundFilter, statusFilter, modeFilter, searchQuery]);

  const dayInterviews = useMemo(
    () => filteredInterviews.filter((item) => coversDay(item, selected)).sort(sortInterviewsByTime),
    [filteredInterviews, selected],
  );

  const upcomingInterviews = useMemo(() => {
    const now = Date.now();
    const week = now + 7 * 24 * 60 * 60 * 1000;
    return filteredInterviews
      .filter((item) => {
        const t = new Date(item.startsAt).getTime();
        return t >= now && t <= week && item.status !== "CANCELLED" && item.status !== "DONE";
      })
      .sort(sortInterviewsByTime)
      .slice(0, 20);
  }, [filteredInterviews]);

  const invalidate = () => {
    void client.invalidateQueries({ queryKey: ["human-interviews"] });
  };

  const cancel = useMutation({
    mutationFn: (id: number) => humanInterviewApi.cancel(id),
    onSuccess: () => {
      toast.success("Đã hủy lịch phỏng vấn và gửi thông báo.");
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const complete = useMutation({
    mutationFn: (id: number) => humanInterviewApi.complete(id),
    onSuccess: () => {
      toast.success("Đã đánh dấu buổi phỏng vấn hoàn thành.");
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const shiftMonth = (offset: number) =>
    setMonth((value) => new Date(value.getFullYear(), value.getMonth() + offset, 1));
  const goToday = () => {
    const now = new Date();
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelected(now);
  };

  const scheduleJobId = jobFilter !== "ALL" ? jobFilter : scopedJobId ?? availableJobs[0]?.id;
  const openSchedule = () => {
    if (!scheduleJobId) {
      toast.warning("Chọn một vị trí tuyển dụng trước khi lên lịch.");
      return;
    }
    navigate(`/recruiter/jobs/${scheduleJobId}/interviews`);
  };

  const handleCopyLink = (link: string) => {
    void navigator.clipboard.writeText(link).then(
      () => toast.success("Đã sao chép đường dẫn phòng họp."),
      () => toast.error("Không thể sao chép link."),
    );
  };

  return (
    <section className="space-y-4 text-[var(--color-on-surface)]">
      <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--color-border-default)] bg-white p-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-1.5">
          <Button variant="secondary" size="sm" aria-label="Tháng trước" onClick={() => shiftMonth(-1)} className="h-8 w-8 p-0">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <span className="min-w-36 text-center text-sm font-bold capitalize text-[var(--color-on-surface)]">
            {month.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}
          </span>
          <Button variant="secondary" size="sm" aria-label="Tháng sau" onClick={() => shiftMonth(1)} className="h-8 w-8 p-0">
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday} className="h-8 px-2 text-xs font-semibold text-brand-primary">
            Hôm nay
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
          <select
            aria-label="Lọc theo vị trí"
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
            className="h-8 rounded-lg border border-[var(--color-border-default)] bg-white px-2 text-xs font-medium outline-none focus:border-brand-primary"
          >
            {!scopedJobId && <option value="ALL">Tất cả vị trí</option>}
            {availableJobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
          <select
            aria-label="Lọc theo vòng"
            value={roundFilter}
            onChange={(e) => setRoundFilter(e.target.value as InterviewRound | "ALL")}
            className="h-8 rounded-lg border border-[var(--color-border-default)] bg-white px-2 text-xs font-medium outline-none focus:border-brand-primary"
          >
            <option value="ALL">Tất cả vòng</option>
            <option value="TECHNICAL">Kỹ thuật</option>
            <option value="CULTURE">Văn hóa</option>
            <option value="EXECUTIVE">Lãnh đạo</option>
          </select>
          <select
            aria-label="Lọc theo hình thức"
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as InterviewMode | "ALL")}
            className="h-8 rounded-lg border border-[var(--color-border-default)] bg-white px-2 text-xs font-medium outline-none focus:border-brand-primary"
          >
            <option value="ALL">Mọi hình thức</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
          </select>
          <select
            aria-label="Lọc theo trạng thái"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InterviewStatus | "ALL")}
            className="h-8 rounded-lg border border-[var(--color-border-default)] bg-white px-2 text-xs font-medium outline-none focus:border-brand-primary"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="PENDING">Chờ xác nhận</option>
            <option value="DONE">Hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
          <Button size="sm" onClick={openSchedule} className="h-8 gap-1 text-xs">
            <CalendarPlus className="size-3.5" />
            Lên lịch
          </Button>
        </div>
      </div>

      <p className="px-1 text-[11px] text-[var(--color-on-surface-variant)]">
        Lịch hẹn đồng bộ từ <strong className="font-semibold text-[var(--color-on-surface)]">Phỏng vấn trực tiếp</strong> đã gửi lời mời (không gồm bản nháp).
        {scheduleJobId ? (
          <>
            {" "}
            Quản lý chi tiết tại{" "}
            <Link to={`/recruiter/jobs/${scheduleJobId}/interviews`} className="font-semibold text-brand-primary hover:underline">
              trang Phỏng vấn
            </Link>
            .
          </>
        ) : null}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-[var(--color-on-surface-variant)]">
        <span className="font-medium text-[var(--color-on-surface)]">Vòng PV:</span>
        {(["TECHNICAL", "CULTURE", "EXECUTIVE"] as const).map((roundKey) => (
          <span key={roundKey} className="flex items-center gap-1">
            <span className={cn("size-2 rounded-full", roundMeta[roundKey].dot)} aria-hidden="true" />
            {roundMeta[roundKey].label}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />
          Chờ xác nhận
        </span>
      </div>

      {loadError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getApiErrorMessage(loadError)}
          <Button variant="secondary" size="sm" className="ml-3 h-7 text-xs" onClick={() => invalidate()}>
            Thử lại
          </Button>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_360px] 2xl:grid-cols-[1fr_400px]">
        <div className={cn(loading && "opacity-60")}>
          <RecruiterCalendarMonth
            month={month}
            interviews={filteredInterviews}
            selected={selected}
            onSelect={(day) => {
              setSelected(day);
              setSidebarTab("DAY");
              if (day.getMonth() !== month.getMonth()) {
                setMonth(new Date(day.getFullYear(), day.getMonth(), 1));
              }
            }}
          />
        </div>

        <aside className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white">
          <div className="flex items-center border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)]/50 p-1">
            <button
              type="button"
              onClick={() => setSidebarTab("DAY")}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-center text-xs font-semibold transition-colors",
                sidebarTab === "DAY" ? "bg-white text-brand-primary shadow-xs" : "text-[var(--color-on-surface-variant)]",
              )}
            >
              Ngày {selected.getDate()}/{selected.getMonth() + 1} ({dayInterviews.length})
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab("UPCOMING")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition-colors",
                sidebarTab === "UPCOMING" ? "bg-white text-brand-primary shadow-xs" : "text-[var(--color-on-surface-variant)]",
              )}
            >
              <Sparkles className="size-3 text-brand-primary" />
              7 ngày tới ({upcomingInterviews.length})
            </button>
          </div>

          <div className="max-h-[640px] flex-1 overflow-y-auto">
            {loading && (
              <p className="p-8 text-center text-xs text-[var(--color-on-surface-variant)]" role="status">
                Đang tải lịch phỏng vấn…
              </p>
            )}
            {!loading && sidebarTab === "DAY" && dayInterviews.length === 0 && (
              <div className="px-4 py-12 text-center">
                <CalendarDays className="mx-auto size-7 text-[var(--color-outline)]" aria-hidden="true" />
                <p className="mt-2 text-xs font-semibold text-[var(--color-on-surface)]">
                  Không có lịch ngày {selected.toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" })}
                </p>
                <p className="mt-1 text-[11px] text-[var(--color-on-surface-variant)]">
                  Lịch lấy từ phỏng vấn trực tiếp đã gửi lời mời. Chọn ngày khác hoặc lên lịch mới.
                </p>
                <Button variant="secondary" size="sm" onClick={openSchedule} className="mt-3 h-7 gap-1 text-xs">
                  <CalendarPlus className="size-3" />
                  Lên lịch ngày này
                </Button>
              </div>
            )}
            {!loading && sidebarTab === "DAY" && dayInterviews.length > 0 && (
              <ul className="divide-y divide-[var(--color-border-default)]">
                {dayInterviews.map((item) => {
                  const startTime = new Date(item.startsAt).toLocaleTimeString("vi-VN", timeFormat);
                  const endTime = new Date(new Date(item.startsAt).getTime() + item.durationMinutes * 60000).toLocaleTimeString("vi-VN", timeFormat);
                  const meta = roundMeta[item.round];
                  const initials = item.candidateName.split(" ").filter(Boolean).slice(-2).map((p) => p[0]).join("").toUpperCase();
                  const busy = cancel.isPending || complete.isPending;
                  return (
                    <li
                      key={item.id}
                      className={cn(
                        "p-3.5 transition-colors hover:bg-[var(--color-surface-alt)]/50",
                        item.status === "DONE" && "bg-emerald-50/20",
                        item.status === "CANCELLED" && "bg-slate-50/50 opacity-60",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[11px] font-bold text-brand-primary">
                            {initials}
                          </span>
                          <div className="min-w-0">
                            <h4 className="truncate text-xs font-bold">{item.candidateName}</h4>
                            <p className="truncate text-[11px] text-[var(--color-on-surface-variant)]">{item.jobTitle}</p>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            item.status === "CONFIRMED" && "bg-emerald-50 text-emerald-700",
                            item.status === "PENDING" && "bg-amber-50 text-amber-700",
                            item.status === "DONE" && "bg-slate-100 text-slate-600",
                            item.status === "CANCELLED" && "bg-red-50 text-red-600 line-through",
                          )}
                        >
                          {interviewStatusLabel[item.status]}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-on-surface-variant)]">
                        <span className="flex items-center gap-1 font-medium text-[var(--color-on-surface)]">
                          <Clock className="size-3 text-brand-primary" />
                          {startTime} – {endTime}
                        </span>
                        <span className="flex items-center gap-1">
                          {item.mode === "ONLINE" ? <Video className="size-3 text-sky-600" /> : <MapPin className="size-3 text-emerald-600" />}
                          <span className="max-w-[150px] truncate">{item.locationOrLink || "—"}</span>
                        </span>
                        <span className={cn("rounded px-1.5 text-[10px] font-medium", meta?.chip)}>{meta?.label || item.round}</span>
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        {item.mode === "ONLINE" && item.locationOrLink.startsWith("http") && (
                          <>
                            <a href={item.locationOrLink} target="_blank" rel="noreferrer" className="inline-flex h-6 items-center gap-1 rounded bg-brand-primary px-2 text-[11px] font-semibold text-white hover:bg-brand-primary-hover">
                              <Video className="size-3" /> Vào họp
                            </a>
                            <button type="button" onClick={() => handleCopyLink(item.locationOrLink)} className="inline-flex h-6 items-center gap-0.5 rounded border border-[var(--color-border-default)] px-1.5 text-[11px] hover:bg-[var(--color-surface-alt)]">
                              <Copy className="size-2.5" /> Copy link
                            </button>
                          </>
                        )}
                        {item.jobId && (
                          <Link
                            to={`/recruiter/jobs/${item.jobId}/interviews`}
                            className="inline-flex h-6 items-center gap-0.5 rounded border border-[var(--color-border-default)] px-1.5 text-[11px] hover:bg-[var(--color-surface-alt)]"
                          >
                            <ExternalLink className="size-2.5" /> Chi tiết
                          </Link>
                        )}
                        {item.status !== "DONE" && item.status !== "CANCELLED" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => complete.mutate(item.id)}
                            className="inline-flex h-6 items-center gap-0.5 rounded border border-emerald-200 bg-emerald-50 px-2 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            <CheckCircle2 className="size-2.5" /> Xong
                          </button>
                        )}
                        {item.status !== "CANCELLED" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => cancel.mutate(item.id)}
                            className="inline-flex h-6 items-center gap-0.5 rounded px-1.5 text-[11px] text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            <XCircle className="size-2.5" /> Hủy
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {!loading && sidebarTab === "UPCOMING" && upcomingInterviews.length === 0 && (
              <p className="p-8 text-center text-xs text-[var(--color-on-surface-variant)]">
                Không có lịch phỏng vấn trong 7 ngày tới.
              </p>
            )}
            {!loading && sidebarTab === "UPCOMING" && upcomingInterviews.length > 0 && (
              <ul className="divide-y divide-[var(--color-border-default)]">
                {upcomingInterviews.map((item) => {
                  const dateStr = new Date(item.startsAt).toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "numeric" });
                  const timeStr = new Date(item.startsAt).toLocaleTimeString("vi-VN", timeFormat);
                  return (
                    <li
                      key={item.id}
                      onClick={() => {
                        setSelected(new Date(item.startsAt));
                        setMonth(new Date(new Date(item.startsAt).getFullYear(), new Date(item.startsAt).getMonth(), 1));
                        setSidebarTab("DAY");
                      }}
                      className="flex cursor-pointer items-center justify-between gap-2 p-3 transition-colors hover:bg-[var(--color-surface-alt)]/50"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-semibold">{item.candidateName}</span>
                          <span className={cn("rounded px-1 text-[10px] font-medium", roundMeta[item.round]?.chip)}>
                            {roundMeta[item.round]?.label || item.round}
                          </span>
                        </div>
                        <p className="truncate text-[11px] text-[var(--color-on-surface-variant)]">{item.jobTitle}</p>
                      </div>
                      <div className="shrink-0 text-right text-[11px]">
                        <span className="block font-semibold text-brand-primary">{timeStr}</span>
                        <span className="text-[10px] text-[var(--color-outline)]">{dateStr}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
