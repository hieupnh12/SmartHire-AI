import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Award,
  BriefcaseBusiness,
  CircleAlert,
  ClipboardList,
  Clock3,
  FileSearch,
  FilterX,
  Handshake,
  Mic,
  Search,
  UserRound,
  UserX,
  Users,
  Video,
  XCircle,
} from "lucide-react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { applicantApi } from "@/api/tenant/applicantApi";
import { jobApi } from "@/api/tenant/jobApi";
import type { ApplicationStatus, ApplicationSummary } from "@/api/types/applicant";
import { DetailDialog } from "@/components/ux/DetailDialog";
import { Skeleton, SkeletonCard } from "@/components/ux/Skeleton";
import { formatDate, useLocale, useT, type TranslateFn } from "@/i18n";
import { sourceLabel } from "@/features/tenant/recruiter/applicants/components/applicantUi";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

type ColumnTheme = {
  icon: ReactNode;
  headerIcon: string;
  card: string;
  badge: string;
};

type PipelineColumn = {
  status: ApplicationStatus;
  label: string;
  description: string;
  theme: ColumnTheme;
};

const iconClass = "size-3.5 shrink-0";

const PIPELINE_COLUMN_DEFS: Array<{ status: ApplicationStatus; theme: ColumnTheme }> = [
  {
    status: "NEW",
    theme: {
      icon: <Users className={iconClass} aria-hidden="true" />,
      headerIcon: "text-sky-600",
      card: "bg-sky-50/70 border-sky-200/80",
      badge: "bg-sky-100 text-sky-800",
    },
  },
  {
    status: "IN_REVIEW",
    theme: {
      icon: <FileSearch className={iconClass} aria-hidden="true" />,
      headerIcon: "text-blue-600",
      card: "bg-blue-50/70 border-blue-200/80",
      badge: "bg-blue-100 text-blue-800",
    },
  },
  {
    status: "ASSESSMENT",
    theme: {
      icon: <ClipboardList className={iconClass} aria-hidden="true" />,
      headerIcon: "text-indigo-600",
      card: "bg-indigo-50/70 border-indigo-200/80",
      badge: "bg-indigo-100 text-indigo-800",
    },
  },
  {
    status: "INTERVIEW",
    theme: {
      icon: <Mic className={iconClass} aria-hidden="true" />,
      headerIcon: "text-amber-600",
      card: "bg-amber-50/70 border-amber-200/80",
      badge: "bg-amber-100 text-amber-800",
    },
  },
  {
    status: "HUMAN_INTERVIEW",
    theme: {
      icon: <Video className={iconClass} aria-hidden="true" />,
      headerIcon: "text-teal-600",
      card: "bg-teal-50/70 border-teal-200/80",
      badge: "bg-teal-100 text-teal-800",
    },
  },
  {
    status: "OFFER",
    theme: {
      icon: <Handshake className={iconClass} aria-hidden="true" />,
      headerIcon: "text-orange-600",
      card: "bg-orange-50/70 border-orange-200/80",
      badge: "bg-orange-100 text-orange-800",
    },
  },
  {
    status: "HIRED",
    theme: {
      icon: <Award className={iconClass} aria-hidden="true" />,
      headerIcon: "text-emerald-600",
      card: "bg-emerald-50/70 border-emerald-200/80",
      badge: "bg-emerald-100 text-emerald-800",
    },
  },
  {
    status: "REJECTED",
    theme: {
      icon: <XCircle className={iconClass} aria-hidden="true" />,
      headerIcon: "text-red-600",
      card: "bg-red-50/60 border-red-200/70",
      badge: "bg-red-100 text-red-700",
    },
  },
  {
    status: "FAILED",
    theme: {
      icon: <XCircle className={iconClass} aria-hidden="true" />,
      headerIcon: "text-rose-700",
      card: "bg-rose-50/60 border-rose-200/70",
      badge: "bg-rose-100 text-rose-800",
    },
  },
  {
    status: "WITHDRAWN",
    theme: {
      icon: <UserX className={iconClass} aria-hidden="true" />,
      headerIcon: "text-slate-500",
      card: "bg-slate-50 border-slate-200",
      badge: "bg-slate-100 text-slate-600",
    },
  },
];

const CLOSED_STATUSES: ApplicationStatus[] = ["REJECTED", "FAILED", "WITHDRAWN"];

function relativeDate(value: string, t: TranslateFn) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days === 0) return t("recruiter.ops.pipeline.today");
  if (days === 1) return t("recruiter.ops.pipeline.yesterday");
  return t("recruiter.ops.pipeline.daysAgo", { count: days });
}

function skillTags(tags: string | null) {
  if (!tags?.trim()) return [];
  return tags.split(/[,;|]/).map((part) => part.trim()).filter(Boolean).slice(0, 3);
}

function statusBadge(application: ApplicationSummary, column: PipelineColumn, t: TranslateFn) {
  if (application.duplicate) return { text: t("recruiter.ops.pipeline.badgeDuplicate"), className: "bg-amber-100 text-amber-800" };
  if (application.status === "HIRED") return { text: t("recruiter.ops.pipeline.badgeAccepted"), className: column.theme.badge };
  if (application.status === "OFFER") return { text: t("recruiter.ops.pipeline.badgeOffer"), className: column.theme.badge };
  if (application.status === "NEW") return { text: t("recruiter.ops.pipeline.badgeNew"), className: column.theme.badge };
  return { text: relativeDate(application.createdAt, t), className: column.theme.badge };
}

function CandidateCard({
  application,
  column,
  movableStatuses,
  pending,
  onOpen,
  onMove,
}: {
  application: ApplicationSummary;
  column: PipelineColumn;
  movableStatuses: PipelineColumn[];
  pending: boolean;
  onOpen: () => void;
  onMove: (status: ApplicationStatus) => void;
}) {
  const t = useT();
  const closed = CLOSED_STATUSES.includes(application.status);
  const availableStatuses = application.status === "HIRED"
    ? movableStatuses.filter((item) => item.status === application.status || item.status === "IN_REVIEW")
    : movableStatuses;
  const badge = statusBadge(application, column, t);
  const tags = skillTags(application.tags);

  return (
    <article className={cn("rounded-lg border p-3 shadow-2xs transition-shadow hover:shadow-sm", column.theme.card)}>
      <button type="button" onClick={onOpen} className="w-full rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30">
        <div className="mb-1 flex items-start justify-between gap-2">
          <span className="min-w-0 truncate text-xs font-semibold text-slate-900">{application.candidateName}</span>
          <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold", badge.className)}>{badge.text}</span>
        </div>
        <p className="truncate text-[11px] text-slate-500">{application.candidateEmail}</p>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span key={tag} className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-500">
          <span className="inline-flex min-w-0 items-center gap-1 truncate">
            <UserRound className="size-3 shrink-0" aria-hidden="true" />
            {application.assigneeName ?? t("recruiter.ops.common.unassigned")}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1">
            <Clock3 className="size-3" aria-hidden="true" />
            {relativeDate(application.createdAt, t)}
          </span>
        </div>
      </button>
      <div className="mt-2.5 border-t border-white/70 pt-2.5">
        {closed ? (
          <p className="text-[11px] leading-4 text-slate-500">
            {application.status === "WITHDRAWN"
              ? t("recruiter.ops.pipeline.withdrawnNote")
              : t("recruiter.ops.pipeline.closedNote")}
          </p>
        ) : (
          <label className="block">
            <span className="sr-only">{t("recruiter.ops.pipeline.moveStageSr", { name: application.candidateName })}</span>
            <select
              value={application.status}
              disabled={pending}
              onChange={(event) => onMove(event.target.value as ApplicationStatus)}
              className="min-h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-700 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 disabled:cursor-wait disabled:opacity-60"
            >
              {availableStatuses.map((item) => (
                <option key={item.status} value={item.status}>{item.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>
    </article>
  );
}

export function PipelineBoard() {
  const t = useT();
  const locale = useLocale();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const jobId = id && /^\d+$/.test(id) ? id : undefined;
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const value = Number(searchParams.get("applicationId"));
    return Number.isInteger(value) && value > 0 ? value : null;
  });
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const pipelineColumns = useMemo<PipelineColumn[]>(
    () =>
      PIPELINE_COLUMN_DEFS.map((def) => ({
        status: def.status,
        label: t(`recruiter.ops.pipeline.columns.${def.status}.label`),
        description: t(`recruiter.ops.pipeline.columns.${def.status}.description`),
        theme: def.theme,
      })),
    [t],
  );
  const movableStatuses = useMemo(
    () => pipelineColumns.filter((column) => column.status !== "WITHDRAWN" && column.status !== "FAILED"),
    [pipelineColumns],
  );

  const jobQuery = useQuery({ queryKey: queryKeys.jobs.detail(jobId ?? 0), queryFn: () => jobApi.get(jobId!), enabled: Boolean(jobId) });
  const applicationsQuery = useQuery({
    queryKey: [...queryKeys.applicants.byJob(jobId ?? 0), "pipeline"],
    queryFn: async () => {
      const first = await applicantApi.listByJob(jobId!, { page: 0, size: 50, includeWithdrawn: true });
      const pageCount = Math.ceil(first.data.total / 50);
      if (pageCount <= 1) return first.data.items;
      const remaining = await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) => applicantApi.listByJob(jobId!, { page: index + 1, size: 50, includeWithdrawn: true })));
      return [first, ...remaining].flatMap((response) => response.data.items);
    },
    enabled: Boolean(jobId),
    refetchInterval: 5_000,
  });
  const detailQuery = useQuery({ queryKey: queryKeys.applicants.detail(selectedId ?? 0), queryFn: () => applicantApi.get(selectedId!), enabled: selectedId != null, refetchInterval: 5_000 });
  const moveMutation = useMutation({
    mutationFn: ({ applicationId, status }: { applicationId: number; status: ApplicationStatus }) => applicantApi.changeStatus(applicationId, status),
    onSuccess: async () => {
      setFeedback({ type: "success", message: t("recruiter.ops.pipeline.moveSuccess") });
      await queryClient.invalidateQueries({ queryKey: queryKeys.applicants.byJob(jobId ?? 0) });
      if (selectedId) await queryClient.invalidateQueries({ queryKey: queryKeys.applicants.detail(selectedId) });
    },
    onError: (error) => setFeedback({ type: "error", message: getApiErrorMessage(error, t("recruiter.ops.pipeline.moveError")) }),
  });

  const applications = applicationsQuery.data ?? [];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = useMemo(
    () => applications.filter((application) => !normalizedQuery || `${application.candidateName} ${application.candidateEmail} ${application.tags ?? ""}`.toLocaleLowerCase().includes(normalizedQuery)),
    [applications, normalizedQuery],
  );
  const detail = detailQuery.data?.data;

  const openDetail = (applicationId: number) => {
    setSelectedId(applicationId);
    const next = new URLSearchParams(searchParams);
    next.set("applicationId", String(applicationId));
    setSearchParams(next, { replace: true });
  };
  const closeDetail = () => {
    setSelectedId(null);
    const next = new URLSearchParams(searchParams);
    next.delete("applicationId");
    setSearchParams(next, { replace: true });
  };

  if (!jobId) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{t("recruiter.ops.pipeline.missingJobError")}</div>;

  return (
    <section className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col gap-3 overflow-hidden py-3 text-[var(--color-on-surface)] sm:gap-4 sm:py-4">
      <header className="flex w-full min-w-0 shrink-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700">
            <BriefcaseBusiness className="size-4 shrink-0" aria-hidden="true" />
            {t("recruiter.ops.pipeline.workspaceEyebrow")}
          </div>
          <h1 className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
            {jobQuery.data?.data.title ? jobQuery.data.data.title : <Skeleton className="inline-block h-6 w-48" />}
          </h1>
          <p className="mt-1 text-xs text-slate-500">{t("recruiter.ops.pipeline.subtitle", { count: applications.length })}</p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="relative block w-full min-w-0 sm:max-w-[240px] sm:flex-1">
            <span className="sr-only">{t("recruiter.ops.pipeline.searchSr")}</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("recruiter.ops.pipeline.searchPlaceholder")}
              className="min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
            />
          </label>
          {query && (
            <button type="button" onClick={() => setQuery("")} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <FilterX className="size-4" aria-hidden="true" />
              {t("recruiter.ops.pipeline.clearFilterBtn")}
            </button>
          )}
          <Link to={`/recruiter/jobs/${jobId}/applicants?view=list`} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700">
            {t("recruiter.ops.pipeline.listViewBtn")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      {feedback && (
        <div
          role="status"
          className={cn(
            "flex w-full min-w-0 shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-xs",
            feedback.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800",
          )}
        >
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {feedback.message}
          <button type="button" onClick={() => setFeedback(null)} className="ml-auto font-semibold underline">{t("recruiter.ops.common.close")}</button>
        </div>
      )}

      {applicationsQuery.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {getApiErrorMessage(applicationsQuery.error, t("recruiter.ops.pipeline.loadError"))}
        </div>
      ) : (
        <div className="relative min-h-0 min-w-0 w-full flex-1 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
          <div className="absolute inset-3 overflow-x-auto overflow-y-hidden overscroll-x-contain sm:inset-4 [scrollbar-color:var(--color-outline-variant)_transparent] [scrollbar-width:thin]">
            <div className="flex h-full w-max gap-4 pb-2">
              {pipelineColumns.map((column, index) => {
                const rows = filtered.filter((application) => application.status === column.status);
                return (
                  <section
                    key={column.status}
                    className="flex h-full w-[272px] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs sm:w-[286px]"
                    aria-labelledby={`pipeline-${column.status}`}
                  >
                    <header className="mb-3 flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <h2 id={`pipeline-${column.status}`} className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-slate-800">
                        <span className={column.theme.headerIcon}>{column.theme.icon}</span>
                        <span className="truncate">{index + 1}. {column.label}</span>
                      </h2>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                        {rows.length}
                      </span>
                    </header>
                    <div className="min-h-0 min-w-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-color:var(--color-outline-variant)_transparent] [scrollbar-width:thin]">
                      {rows.map((application) => (
                        <CandidateCard
                          key={application.id}
                          application={application}
                          column={column}
                          movableStatuses={movableStatuses}
                          pending={moveMutation.isPending && moveMutation.variables?.applicationId === application.id}
                          onOpen={() => openDetail(application.id)}
                          onMove={(status) => status !== application.status && moveMutation.mutate({ applicationId: application.id, status })}
                        />
                      ))}
                      {!applicationsQuery.isLoading && rows.length === 0 && (
                        <div className="grid min-h-28 place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-5 text-center text-[11px] leading-4 text-slate-500">
                          {t("recruiter.ops.pipeline.columnEmpty")}
                        </div>
                      )}
                      {applicationsQuery.isLoading && <div className="h-28 animate-pulse rounded-lg bg-slate-100" />}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <DetailDialog open={selectedId != null} title={detail?.candidateName ?? t("recruiter.ops.pipeline.detailTitleFallback")} onClose={closeDetail}>
        {detailQuery.isLoading ? (
          <SkeletonCard className="h-56" />
        ) : detail ? (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-xl bg-[var(--color-surface-alt)] p-4 sm:grid-cols-2">
              <div><p className="text-xs text-[var(--color-on-surface-variant)]">{t("recruiter.ops.common.email")}</p><p className="mt-1 text-sm font-medium">{detail.candidateEmail}</p></div>
              <div><p className="text-xs text-[var(--color-on-surface-variant)]">{t("recruiter.ops.common.assignee")}</p><p className="mt-1 text-sm font-medium">{detail.assigneeName ?? t("recruiter.ops.common.unassigned")}</p></div>
              <div><p className="text-xs text-[var(--color-on-surface-variant)]">{t("recruiter.ops.common.source")}</p><p className="mt-1 text-sm font-medium">{detail.source ? sourceLabel(detail.source, t) : t("recruiter.ops.common.notRecorded")}</p></div>
              <div><p className="text-xs text-[var(--color-on-surface-variant)]">{t("recruiter.ops.pipeline.detailAppliedAt")}</p><p className="mt-1 text-sm font-medium">{formatDate(detail.createdAt, { dateStyle: "medium" }, locale)}</p></div>
            </div>
            {detail.tags && <div><p className="text-xs font-semibold">{t("recruiter.ops.pipeline.detailSkillsTags")}</p><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{detail.tags}</p></div>}
            {detail.notes && <div><p className="text-xs font-semibold">{t("recruiter.ops.common.notes")}</p><p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-on-surface-variant)]">{detail.notes}</p></div>}
            <Link to={`/recruiter/jobs/${jobId}/applicants?view=list&applicationId=${detail.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-primary-hover">
              {t("recruiter.ops.pipeline.openFullProfileBtn")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <p className="text-sm text-red-700">{getApiErrorMessage(detailQuery.error, t("recruiter.ops.pipeline.detailLoadError"))}</p>
        )}
      </DetailDialog>
    </section>
  );
}

export function PipelinePage() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/recruiter/jobs/${id}/applicants?view=board` : "/recruiter"} replace />;
}
