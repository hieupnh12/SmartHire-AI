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

const PIPELINE_COLUMNS: PipelineColumn[] = [
  {
    status: "NEW",
    label: "Mới",
    description: "Hồ sơ vừa nhận",
    theme: {
      icon: <Users className={iconClass} aria-hidden="true" />,
      headerIcon: "text-sky-600",
      card: "bg-sky-50/70 border-sky-200/80",
      badge: "bg-sky-100 text-sky-800",
    },
  },
  {
    status: "IN_REVIEW",
    label: "Sàng lọc CV",
    description: "Đang xem xét hồ sơ",
    theme: {
      icon: <FileSearch className={iconClass} aria-hidden="true" />,
      headerIcon: "text-blue-600",
      card: "bg-blue-50/70 border-blue-200/80",
      badge: "bg-blue-100 text-blue-800",
    },
  },
  {
    status: "ASSESSMENT",
    label: "Bài đánh giá",
    description: "Đánh giá kỹ thuật",
    theme: {
      icon: <ClipboardList className={iconClass} aria-hidden="true" />,
      headerIcon: "text-indigo-600",
      card: "bg-indigo-50/70 border-indigo-200/80",
      badge: "bg-indigo-100 text-indigo-800",
    },
  },
  {
    status: "INTERVIEW",
    label: "Phỏng vấn AI",
    description: "Vòng phỏng vấn AI",
    theme: {
      icon: <Mic className={iconClass} aria-hidden="true" />,
      headerIcon: "text-amber-600",
      card: "bg-amber-50/70 border-amber-200/80",
      badge: "bg-amber-100 text-amber-800",
    },
  },
  {
    status: "HUMAN_INTERVIEW",
    label: "Phỏng vấn trực tiếp",
    description: "Phỏng vấn với hội đồng",
    theme: {
      icon: <Video className={iconClass} aria-hidden="true" />,
      headerIcon: "text-teal-600",
      card: "bg-teal-50/70 border-teal-200/80",
      badge: "bg-teal-100 text-teal-800",
    },
  },
  {
    status: "OFFER",
    label: "Đề nghị",
    description: "Đang xử lý offer",
    theme: {
      icon: <Handshake className={iconClass} aria-hidden="true" />,
      headerIcon: "text-orange-600",
      card: "bg-orange-50/70 border-orange-200/80",
      badge: "bg-orange-100 text-orange-800",
    },
  },
  {
    status: "HIRED",
    label: "Chốt Offer",
    description: "Tuyển thành công",
    theme: {
      icon: <Award className={iconClass} aria-hidden="true" />,
      headerIcon: "text-emerald-600",
      card: "bg-emerald-50/70 border-emerald-200/80",
      badge: "bg-emerald-100 text-emerald-800",
    },
  },
  {
    status: "REJECTED",
    label: "Từ chối",
    description: "Không tiếp tục",
    theme: {
      icon: <XCircle className={iconClass} aria-hidden="true" />,
      headerIcon: "text-red-600",
      card: "bg-red-50/60 border-red-200/70",
      badge: "bg-red-100 text-red-700",
    },
  },
  {
    status: "FAILED",
    label: "Trượt PV AI",
    description: "Hết lượt phỏng vấn AI",
    theme: {
      icon: <XCircle className={iconClass} aria-hidden="true" />,
      headerIcon: "text-rose-700",
      card: "bg-rose-50/60 border-rose-200/70",
      badge: "bg-rose-100 text-rose-800",
    },
  },
  {
    status: "WITHDRAWN",
    label: "Đã rút",
    description: "Ứng viên chủ động rút",
    theme: {
      icon: <UserX className={iconClass} aria-hidden="true" />,
      headerIcon: "text-slate-500",
      card: "bg-slate-50 border-slate-200",
      badge: "bg-slate-100 text-slate-600",
    },
  },
];

const movableStatuses = PIPELINE_COLUMNS.filter((column) => column.status !== "WITHDRAWN" && column.status !== "FAILED");
const CLOSED_STATUSES: ApplicationStatus[] = ["REJECTED", "FAILED", "WITHDRAWN"];

function relativeDate(value: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days === 0) return "Hôm nay";
  if (days === 1) return "Hôm qua";
  return `${days} ngày trước`;
}

function skillTags(tags: string | null) {
  if (!tags?.trim()) return [];
  return tags.split(/[,;|]/).map((part) => part.trim()).filter(Boolean).slice(0, 3);
}

function statusBadge(application: ApplicationSummary, column: PipelineColumn) {
  if (application.duplicate) return { text: "Trùng", className: "bg-amber-100 text-amber-800" };
  if (application.status === "HIRED") return { text: "Accepted", className: column.theme.badge };
  if (application.status === "OFFER") return { text: "Offer", className: column.theme.badge };
  if (application.status === "NEW") return { text: "Mới", className: column.theme.badge };
  return { text: relativeDate(application.createdAt), className: column.theme.badge };
}

function CandidateCard({
  application,
  column,
  pending,
  onOpen,
  onMove,
}: {
  application: ApplicationSummary;
  column: PipelineColumn;
  pending: boolean;
  onOpen: () => void;
  onMove: (status: ApplicationStatus) => void;
}) {
  const closed = CLOSED_STATUSES.includes(application.status);
  const availableStatuses = application.status === "HIRED"
    ? movableStatuses.filter((item) => item.status === application.status || item.status === "IN_REVIEW")
    : movableStatuses;
  const badge = statusBadge(application, column);
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
            {application.assigneeName ?? "Chưa phân công"}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1">
            <Clock3 className="size-3" aria-hidden="true" />
            {relativeDate(application.createdAt)}
          </span>
        </div>
      </button>
      <div className="mt-2.5 border-t border-white/70 pt-2.5">
        {closed ? (
          <p className="text-[11px] leading-4 text-slate-500">
            {application.status === "WITHDRAWN" ? "Ứng viên đã rút hồ sơ." : "Hồ sơ đã kết thúc, không thể mở lại."}
          </p>
        ) : (
          <label className="block">
            <span className="sr-only">Chuyển {application.candidateName} sang giai đoạn</span>
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
      setFeedback({ type: "success", message: "Đã cập nhật giai đoạn của ứng viên." });
      await queryClient.invalidateQueries({ queryKey: queryKeys.applicants.byJob(jobId ?? 0) });
      if (selectedId) await queryClient.invalidateQueries({ queryKey: queryKeys.applicants.detail(selectedId) });
    },
    onError: (error) => setFeedback({ type: "error", message: getApiErrorMessage(error, "Không thể chuyển giai đoạn ứng viên.") }),
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

  if (!jobId) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Không xác định được job cho pipeline.</div>;

  return (
    <section className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col gap-3 overflow-hidden py-3 text-[var(--color-on-surface)] sm:gap-4 sm:py-4">
      <header className="flex w-full min-w-0 shrink-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700">
            <BriefcaseBusiness className="size-4 shrink-0" aria-hidden="true" />
            Live Recruitment Workspace
          </div>
          <h1 className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
            {jobQuery.data?.data.title ? jobQuery.data.data.title : <Skeleton className="inline-block h-6 w-48" />}
          </h1>
          <p className="mt-1 text-xs text-slate-500">{applications.length} ứng viên · cập nhật trực tiếp theo trạng thái hồ sơ</p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="relative block w-full min-w-0 sm:max-w-[240px] sm:flex-1">
            <span className="sr-only">Tìm ứng viên trong pipeline</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tên, email, kỹ năng…"
              className="min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
            />
          </label>
          {query && (
            <button type="button" onClick={() => setQuery("")} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <FilterX className="size-4" aria-hidden="true" />
              Xóa lọc
            </button>
          )}
          <Link to={`/recruiter/jobs/${jobId}/applicants?view=list`} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700">
            Xem dạng danh sách
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
          <button type="button" onClick={() => setFeedback(null)} className="ml-auto font-semibold underline">Đóng</button>
        </div>
      )}

      {applicationsQuery.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {getApiErrorMessage(applicationsQuery.error, "Không tải được pipeline.")}
        </div>
      ) : (
        <div className="relative min-h-0 min-w-0 w-full flex-1 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
          <div className="absolute inset-3 overflow-x-auto overflow-y-hidden overscroll-x-contain sm:inset-4 [scrollbar-color:var(--color-outline-variant)_transparent] [scrollbar-width:thin]">
            <div className="flex h-full w-max gap-4 pb-2">
              {PIPELINE_COLUMNS.map((column, index) => {
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
                          pending={moveMutation.isPending && moveMutation.variables?.applicationId === application.id}
                          onOpen={() => openDetail(application.id)}
                          onMove={(status) => status !== application.status && moveMutation.mutate({ applicationId: application.id, status })}
                        />
                      ))}
                      {!applicationsQuery.isLoading && rows.length === 0 && (
                        <div className="grid min-h-28 place-items-center rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-5 text-center text-[11px] leading-4 text-slate-500">
                          Chưa có ứng viên ở giai đoạn này
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

      <DetailDialog open={selectedId != null} title={detail?.candidateName ?? "Chi tiết ứng viên"} onClose={closeDetail}>
        {detailQuery.isLoading ? (
          <SkeletonCard className="h-56" />
        ) : detail ? (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-xl bg-[var(--color-surface-alt)] p-4 sm:grid-cols-2">
              <div><p className="text-xs text-[var(--color-on-surface-variant)]">Email</p><p className="mt-1 text-sm font-medium">{detail.candidateEmail}</p></div>
              <div><p className="text-xs text-[var(--color-on-surface-variant)]">Người phụ trách</p><p className="mt-1 text-sm font-medium">{detail.assigneeName ?? "Chưa phân công"}</p></div>
              <div><p className="text-xs text-[var(--color-on-surface-variant)]">Nguồn</p><p className="mt-1 text-sm font-medium">{detail.source ?? "Không ghi nhận"}</p></div>
              <div><p className="text-xs text-[var(--color-on-surface-variant)]">Ngày ứng tuyển</p><p className="mt-1 text-sm font-medium">{new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(detail.createdAt))}</p></div>
            </div>
            {detail.tags && <div><p className="text-xs font-semibold">Kỹ năng / nhãn</p><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{detail.tags}</p></div>}
            {detail.notes && <div><p className="text-xs font-semibold">Ghi chú</p><p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-on-surface-variant)]">{detail.notes}</p></div>}
            <Link to={`/recruiter/jobs/${jobId}/applicants?view=list&applicationId=${detail.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-primary-hover">
              Mở hồ sơ đầy đủ
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <p className="text-sm text-red-700">{getApiErrorMessage(detailQuery.error, "Không tải được chi tiết ứng viên.")}</p>
        )}
      </DetailDialog>
    </section>
  );
}

export function PipelinePage() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/recruiter/jobs/${id}/applicants?view=board` : "/recruiter"} replace />;
}
