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
  Users,
} from "lucide-react";
import { Button } from "@/components/ux/Button";
import { formatDate, formatTime, useLocale, useT } from "@/i18n";
import { toast } from "@/stores/toastStore";
import { jobApi } from "@/api/tenant/jobApi";
import { humanInterviewApi } from "@/api/tenant/humanInterviewApi";
import { getApiErrorMessage } from "@/lib/axios";
import { cn } from "@/lib/utils";
import {
  getInterviewRoundShortLabel,
  getInterviewStatusLabel,
  roundMeta,
  statusMeta,
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
  const t = useT();
  const locale = useLocale();
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
      toast.success(t("recruiter.ops.schedules.page.cancelSuccess"));
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const complete = useMutation({
    mutationFn: (id: number) => humanInterviewApi.complete(id),
    onSuccess: () => {
      toast.success(t("recruiter.ops.schedules.page.completeSuccess"));
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
      toast.warning(t("recruiter.ops.schedules.page.selectJobWarning"));
      return;
    }
    navigate(`/recruiter/jobs/${scheduleJobId}/interviews`);
  };

  const handleCopyLink = (link: string) => {
    void navigator.clipboard.writeText(link).then(
      () => toast.success(t("recruiter.ops.schedules.page.copySuccess")),
      () => toast.error(t("recruiter.ops.schedules.page.copyError")),
    );
  };

  return (
    <section className="space-y-4 text-[var(--color-on-surface)]">
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-default)] bg-white p-3 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" aria-label={t("recruiter.ops.schedules.page.prevMonthAria")} onClick={() => shiftMonth(-1)} className="h-9 w-9 rounded-lg p-0">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <span className="min-w-40 text-center text-base font-bold capitalize text-[var(--color-on-surface)]">
            {formatDate(month, { month: "long", year: "numeric" }, locale)}
          </span>
          <Button variant="secondary" size="sm" aria-label={t("recruiter.ops.schedules.page.nextMonthAria")} onClick={() => shiftMonth(1)} className="h-9 w-9 rounded-lg p-0">
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday} className="h-9 px-3 text-xs font-semibold text-brand-primary hover:bg-[var(--color-primary-soft)]">
            {t("recruiter.ops.schedules.page.todayBtn")}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1 sm:w-52">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-outline)]" />
            <input
              type="search"
              placeholder={t("recruiter.ops.schedules.page.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] pl-9 pr-3 text-xs outline-none focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/15"
            />
          </div>
          {!scopedJobId && (
            <select
              aria-label={t("recruiter.ops.schedules.page.filterJobAria")}
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
              className="h-9 rounded-lg border border-[var(--color-border-default)] bg-white px-3 text-xs font-medium outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15"
            >
              <option value="ALL">{t("recruiter.ops.schedules.page.allJobs")}</option>
              {availableJobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
          )}
          <select
            aria-label={t("recruiter.ops.schedules.page.filterRoundAria")}
            value={roundFilter}
            onChange={(e) => setRoundFilter(e.target.value as InterviewRound | "ALL")}
            className="h-9 rounded-lg border border-[var(--color-border-default)] bg-white px-3 text-xs font-medium outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15"
          >
            <option value="ALL">{t("recruiter.ops.schedules.page.allRounds")}</option>
            <option value="TECHNICAL">{t("recruiter.ops.schedules.roundLabels.TECHNICAL")}</option>
            <option value="CULTURE">{t("recruiter.ops.schedules.roundLabels.CULTURE")}</option>
            <option value="EXECUTIVE">{t("recruiter.ops.schedules.roundLabels.EXECUTIVE")}</option>
          </select>
          <select
            aria-label={t("recruiter.ops.schedules.page.filterModeAria")}
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as InterviewMode | "ALL")}
            className="h-9 rounded-lg border border-[var(--color-border-default)] bg-white px-3 text-xs font-medium outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15"
          >
            <option value="ALL">{t("recruiter.ops.schedules.page.allModes")}</option>
            <option value="ONLINE">{t("recruiter.ops.schedules.modeLabels.ONLINE")}</option>
            <option value="OFFLINE">{t("recruiter.ops.schedules.modeLabels.OFFLINE")}</option>
          </select>
          <select
            aria-label={t("recruiter.ops.schedules.page.filterStatusAria")}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InterviewStatus | "ALL")}
            className="h-9 rounded-lg border border-[var(--color-border-default)] bg-white px-3 text-xs font-medium outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15"
          >
            <option value="ALL">{t("recruiter.ops.schedules.page.allStatuses")}</option>
            <option value="CONFIRMED">{t("recruiter.ops.schedules.statusLabels.CONFIRMED")}</option>
            <option value="PENDING">{t("recruiter.ops.schedules.statusLabels.PENDING")}</option>
            <option value="DONE">{t("recruiter.ops.schedules.statusLabels.DONE")}</option>
            <option value="CANCELLED">{t("recruiter.ops.schedules.statusLabels.CANCELLED")}</option>
          </select>
          <Button size="sm" onClick={openSchedule} className="h-9 gap-1.5 px-3.5 text-xs font-semibold">
            <CalendarPlus className="size-4" />
            {t("recruiter.ops.schedules.page.scheduleBtn")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border-default)] bg-white px-3.5 py-2.5 text-xs shadow-2xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="font-semibold text-slate-800">
            {t("recruiter.ops.schedules.page.legendStatus")}
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
            {t("recruiter.ops.schedules.statusLabels.CONFIRMED")}
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />
            {t("recruiter.ops.schedules.statusLabels.PENDING")}
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="size-2 rounded-full bg-slate-400" aria-hidden="true" />
            {t("recruiter.ops.schedules.statusLabels.DONE")}
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="size-2 rounded-full bg-rose-400" aria-hidden="true" />
            {t("recruiter.ops.schedules.statusLabels.CANCELLED")}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-slate-600 border-t sm:border-t-0 sm:border-l border-slate-200 pt-1.5 sm:pt-0 sm:pl-4">
          <span className="font-semibold text-slate-800">
            {t("recruiter.ops.schedules.page.legendMode")}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-sky-700">
            <Video className="size-3.5 text-sky-600" aria-hidden="true" />
            {t("recruiter.ops.schedules.modeLabels.ONLINE")}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
            <MapPin className="size-3.5 text-emerald-600" aria-hidden="true" />
            {t("recruiter.ops.schedules.modeLabels.OFFLINE")}
          </span>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getApiErrorMessage(loadError)}
          <Button variant="secondary" size="sm" className="ml-3 h-8 text-xs" onClick={() => invalidate()}>
            {t("recruiter.ops.common.retry")}
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

        <aside className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white shadow-2xs">
          <div className="flex items-center border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)]/60 p-1">
            <button
              type="button"
              onClick={() => setSidebarTab("DAY")}
              className={cn(
                "flex-1 rounded-lg py-2 text-center text-xs font-semibold transition-colors",
                sidebarTab === "DAY" ? "bg-white text-brand-primary shadow-xs" : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]",
              )}
            >
              {t("recruiter.ops.schedules.page.tabDay", {
                date: formatDate(selected, { day: "numeric", month: "numeric" }, locale),
                count: dayInterviews.length,
              })}
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab("UPCOMING")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors",
                sidebarTab === "UPCOMING" ? "bg-white text-brand-primary shadow-xs" : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]",
              )}
            >
              <Sparkles className="size-3.5 text-brand-primary" />
              {t("recruiter.ops.schedules.page.tabUpcoming", { count: upcomingInterviews.length })}
            </button>
          </div>

          <div className="max-h-[640px] flex-1 overflow-y-auto">
            {loading && (
              <p className="p-8 text-center text-xs text-[var(--color-on-surface-variant)]" role="status">
                {t("recruiter.ops.schedules.page.loadingSchedules")}
              </p>
            )}
            {!loading && sidebarTab === "DAY" && dayInterviews.length === 0 && (
              <div className="px-4 py-12 text-center">
                <CalendarDays className="mx-auto size-8 text-[var(--color-outline)]" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-[var(--color-on-surface)]">
                  {t("recruiter.ops.schedules.page.emptyDayTitle", {
                    date: formatDate(selected, { day: "numeric", month: "numeric" }, locale),
                  })}
                </p>
                <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                  {t("recruiter.ops.schedules.page.emptyDayHint")}
                </p>
                <Button variant="secondary" size="sm" onClick={openSchedule} className="mt-3.5 h-8 gap-1.5 px-3 text-xs font-semibold">
                  <CalendarPlus className="size-3.5" />
                  {t("recruiter.ops.schedules.page.scheduleThisDayBtn")}
                </Button>
              </div>
            )}
            {!loading && sidebarTab === "DAY" && dayInterviews.length > 0 && (
              <ul className="divide-y divide-[var(--color-border-default)]">
                {dayInterviews.map((item) => {
                  const startTime = formatTime(item.startsAt, timeFormat, locale);
                  const itemEndMs = new Date(item.startsAt).getTime() + item.durationMinutes * 60000;
                  const endTime = formatTime(itemEndMs, timeFormat, locale);
                  const isItemExpired = itemEndMs < Date.now();
                  const meta = roundMeta[item.round];
                  const initials = item.candidateName.split(" ").filter(Boolean).slice(-2).map((p) => p[0]).join("").toUpperCase();
                  const busy = cancel.isPending || complete.isPending;
                  return (
                    <li
                      key={item.id}
                      className={cn(
                        "p-4 transition-colors hover:bg-[var(--color-surface-alt)]/50",
                        item.status === "DONE" && "bg-emerald-50/20",
                        item.status === "CANCELLED" && "bg-slate-50/50 opacity-60",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-xs font-bold text-brand-primary">
                            {initials}
                          </span>
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-semibold text-slate-900">{item.candidateName}</h4>
                            <p className="truncate text-xs text-slate-500">{item.jobTitle}</p>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
                            item.status === "CONFIRMED" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                            item.status === "PENDING" && "bg-amber-50 text-amber-700 border-amber-200",
                            item.status === "DONE" && "bg-slate-100 text-slate-600 border-slate-200",
                            item.status === "CANCELLED" && "bg-red-50 text-red-600 line-through border-red-200",
                          )}
                        >
                          {getInterviewStatusLabel(item.status, t)}
                        </span>
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600">
                        <span className="flex items-center gap-1 font-semibold text-slate-800">
                          <Clock className="size-3.5 text-brand-primary" />
                          {startTime} – {endTime}
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          {item.mode === "ONLINE" ? (
                            <>
                              <Video className="size-3.5 text-sky-600" />
                              <span className="text-sky-700">Online</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="size-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Offline</span>
                            </>
                          )}
                          {item.locationOrLink && (
                            <span className="max-w-[140px] truncate text-slate-400 font-normal">({item.locationOrLink})</span>
                          )}
                        </span>
                        <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium border", meta?.chip)}>
                          {getInterviewRoundShortLabel(item.round, t)}
                        </span>
                      </div>
                      {item.interviewerName && item.interviewerName !== "—" && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                          <Users className="size-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">Hội đồng: {item.interviewerName}</span>
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {item.mode === "ONLINE" && !isItemExpired && (item.locationOrLink.includes("/meet/human/") || item.locationOrLink.startsWith("http")) && (
                          <>
                            {item.locationOrLink.includes("/meet/human/") ? (
                              <Link to={`/meet/human/${item.id}`} className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-brand-primary px-3 text-xs font-semibold text-white hover:bg-brand-primary-hover shadow-2xs">
                                <Video className="size-3.5" /> {t("recruiter.ops.schedules.page.joinMeetingBtn")}
                              </Link>
                            ) : (
                              <a href={item.locationOrLink} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-brand-primary px-3 text-xs font-semibold text-white hover:bg-brand-primary-hover shadow-2xs">
                                <Video className="size-3.5" /> {t("recruiter.ops.schedules.page.joinMeetingBtn")}
                              </a>
                            )}
                            <button type="button" onClick={() => handleCopyLink(item.locationOrLink.includes("/meet/human/") ? `${window.location.origin}/meet/human/${item.id}` : item.locationOrLink)} className="inline-flex h-7 items-center gap-1 rounded-lg border border-[var(--color-border-default)] px-2 text-xs font-medium text-slate-700 hover:bg-[var(--color-surface-alt)]">
                              <Copy className="size-3" /> {t("recruiter.ops.common.copyLink")}
                            </button>
                          </>
                        )}
                        {item.jobId && (
                          <Link
                            to={`/recruiter/jobs/${item.jobId}/interviews`}
                            className="inline-flex h-7 items-center gap-1 rounded-lg border border-[var(--color-border-default)] px-2 text-xs font-medium text-slate-700 hover:bg-[var(--color-surface-alt)]"
                          >
                            <ExternalLink className="size-3" /> {t("recruiter.ops.common.details")}
                          </Link>
                        )}
                        {item.status !== "DONE" && item.status !== "CANCELLED" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => complete.mutate(item.id)}
                            className="inline-flex h-7 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            <CheckCircle2 className="size-3" /> {t("recruiter.ops.schedules.page.markDoneBtn")}
                          </button>
                        )}
                        {item.status !== "CANCELLED" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => cancel.mutate(item.id)}
                            className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            <XCircle className="size-3" /> {t("recruiter.ops.common.cancel")}
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
                {t("recruiter.ops.schedules.page.emptyUpcoming")}
              </p>
            )}
            {!loading && sidebarTab === "UPCOMING" && upcomingInterviews.length > 0 && (
              <ul className="divide-y divide-[var(--color-border-default)]">
                {upcomingInterviews.map((item) => {
                  const dateStr = formatDate(item.startsAt, { weekday: "short", day: "numeric", month: "numeric" }, locale);
                  const timeStr = formatTime(item.startsAt, timeFormat, locale);
                  return (
                    <li
                      key={item.id}
                      onClick={() => {
                        setSelected(new Date(item.startsAt));
                        setMonth(new Date(new Date(item.startsAt).getFullYear(), new Date(item.startsAt).getMonth(), 1));
                        setSidebarTab("DAY");
                      }}
                      className="flex cursor-pointer items-center justify-between gap-3 p-3.5 transition-colors hover:bg-[var(--color-surface-alt)]/50"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("size-2 shrink-0 rounded-full", statusMeta[item.status]?.dot)} aria-hidden="true" />
                          <span className="truncate text-sm font-semibold text-slate-900">{item.candidateName}</span>
                          <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-medium border", roundMeta[item.round]?.chip)}>
                            {getInterviewRoundShortLabel(item.round, t)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                          {item.mode === "ONLINE" ? <Video className="size-3 text-sky-600" /> : <MapPin className="size-3 text-emerald-600" />}
                          <span className="truncate">{item.jobTitle}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="block text-xs font-bold text-brand-primary">{timeStr}</span>
                        <span className="text-xs text-slate-500">{dateStr}</span>
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
