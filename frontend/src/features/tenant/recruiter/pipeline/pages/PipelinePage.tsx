import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BriefcaseBusiness, CircleAlert, Clock3, FilterX, Search, UserRound } from "lucide-react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { applicantApi } from "@/api/tenant/applicantApi";
import { jobApi } from "@/api/tenant/jobApi";
import type { ApplicationStatus, ApplicationSummary } from "@/api/types/applicant";
import { DetailDialog } from "@/components/ux/DetailDialog";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

type PipelineColumn = { status: ApplicationStatus; label: string; description: string; accent: string };

const PIPELINE_COLUMNS: PipelineColumn[] = [
  { status: "NEW", label: "Mới", description: "Hồ sơ vừa nhận", accent: "bg-blue-500" },
  { status: "IN_REVIEW", label: "Đang xem xét", description: "Đang sàng lọc", accent: "bg-violet-500" },
  { status: "ASSESSMENT", label: "Bài đánh giá", description: "Đang làm bài", accent: "bg-amber-500" },
  { status: "INTERVIEW", label: "Phỏng vấn", description: "Đang phỏng vấn", accent: "bg-cyan-600" },
  { status: "OFFER", label: "Đề nghị", description: "Đang xử lý offer", accent: "bg-orange-500" },
  { status: "HIRED", label: "Đã tuyển", description: "Tuyển thành công", accent: "bg-emerald-600" },
  { status: "REJECTED", label: "Từ chối", description: "Không tiếp tục", accent: "bg-red-500" },
  { status: "WITHDRAWN", label: "Đã rút", description: "Ứng viên chủ động rút", accent: "bg-slate-500" },
];

const movableStatuses = PIPELINE_COLUMNS.filter((column) => column.status !== "WITHDRAWN");

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toLocaleUpperCase();
}

function relativeDate(value: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days === 0) return "Hôm nay";
  if (days === 1) return "Hôm qua";
  return `${days} ngày trước`;
}

function CandidateCard({ application, pending, onOpen, onMove }: {
  application: ApplicationSummary;
  pending: boolean;
  onOpen: () => void;
  onMove: (status: ApplicationStatus) => void;
}) {
  const withdrawn = application.status === "WITHDRAWN";
  const terminal = application.status === "HIRED" || application.status === "REJECTED";
  const availableStatuses = terminal
    ? movableStatuses.filter((column) => column.status === application.status || column.status === "IN_REVIEW")
    : movableStatuses;
  return (
    <article className="rounded-xl border border-[var(--color-border-default)] bg-white p-3 shadow-sm transition-[border-color,box-shadow] hover:border-brand-primary/35 hover:shadow-md">
      <button type="button" onClick={onOpen} className="w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30">
        <div className="flex items-start gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[11px] font-semibold text-brand-primary">{initials(application.candidateName)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{application.candidateName}</span>
            <span className="mt-0.5 block truncate text-[11px] text-[var(--color-on-surface-variant)]">{application.candidateEmail}</span>
          </span>
          {application.duplicate && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-800">Trùng</span>}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-[var(--color-on-surface-variant)]">
          <span className="inline-flex min-w-0 items-center gap-1.5 truncate"><UserRound className="size-3.5 shrink-0" aria-hidden="true" />{application.assigneeName ?? "Chưa phân công"}</span>
          <span className="inline-flex shrink-0 items-center gap-1"><Clock3 className="size-3.5" aria-hidden="true" />{relativeDate(application.createdAt)}</span>
        </div>
      </button>
      <div className="mt-3 border-t border-[var(--color-border-default)] pt-3">
        {withdrawn ? <p className="text-[11px] leading-4 text-[var(--color-on-surface-variant)]">Chỉ ứng viên mới có thể rút hồ sơ.</p> : (
          <label className="block">
            <span className="sr-only">Chuyển {application.candidateName} sang giai đoạn</span>
            <select value={application.status} disabled={pending} onChange={(event) => onMove(event.target.value as ApplicationStatus)} className="min-h-9 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-2 text-xs font-medium outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 disabled:cursor-wait disabled:opacity-60">
              {availableStatuses.map((column) => <option key={column.status} value={column.status}>{column.label}</option>)}
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
  });
  const detailQuery = useQuery({ queryKey: queryKeys.applicants.detail(selectedId ?? 0), queryFn: () => applicantApi.get(selectedId!), enabled: selectedId != null });
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
  const filtered = useMemo(() => applications.filter((application) => !normalizedQuery || `${application.candidateName} ${application.candidateEmail} ${application.tags ?? ""}`.toLocaleLowerCase().includes(normalizedQuery)), [applications, normalizedQuery]);
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
    <section className="flex h-full min-h-0 flex-col gap-4 py-4 text-[var(--color-on-surface)] sm:py-6">
      <header className="flex shrink-0 flex-col gap-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-brand-primary"><BriefcaseBusiness className="size-4" aria-hidden="true" />Bảng quy trình tuyển dụng</div>
          <h1 className="mt-1 truncate text-lg font-semibold sm:text-xl">{jobQuery.data?.data.title ?? "Đang tải vị trí…"}</h1>
          <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{applications.length} ứng viên · cập nhật trực tiếp theo trạng thái hồ sơ</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative block min-w-[240px]">
            <span className="sr-only">Tìm ứng viên trong pipeline</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên, email, kỹ năng…" className="min-h-10 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] pl-9 pr-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15" />
          </label>
          {query && <button type="button" onClick={() => setQuery("")} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] px-3 text-xs font-semibold hover:bg-[var(--color-surface-alt)]"><FilterX className="size-4" aria-hidden="true" />Xóa lọc</button>}
          <Link to={`/recruiter/jobs/${jobId}/applicants?view=list`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 text-xs font-semibold text-white hover:bg-brand-primary-hover">Xem dạng danh sách<ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
      </header>

      {feedback && <div role="status" className={cn("flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-xs", feedback.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}><CircleAlert className="size-4 shrink-0" aria-hidden="true" />{feedback.message}<button type="button" onClick={() => setFeedback(null)} className="ml-auto font-semibold underline">Đóng</button></div>}

      {applicationsQuery.isError ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{getApiErrorMessage(applicationsQuery.error, "Không tải được pipeline.")}</div> : (
        <div className="min-h-0 flex-1 overflow-x-auto overscroll-contain [scrollbar-color:var(--color-outline-variant)_transparent] [scrollbar-width:thin]">
          <div className="flex h-full min-h-[480px] min-w-max gap-3 pb-3">
            {PIPELINE_COLUMNS.map((column) => {
              const rows = filtered.filter((application) => application.status === column.status);
              return <section key={column.status} className="flex h-full w-[286px] flex-col overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)]/75 p-2.5" aria-labelledby={`pipeline-${column.status}`}>
                <header className="mb-2 flex shrink-0 items-center gap-2 rounded-xl bg-white px-3 py-2.5">
                  <span className={cn("size-2.5 rounded-full", column.accent)} aria-hidden="true" />
                  <div className="min-w-0 flex-1"><h2 id={`pipeline-${column.status}`} className="text-sm font-semibold">{column.label}</h2><p className="truncate text-[10px] text-[var(--color-on-surface-variant)]">{column.description}</p></div>
                  <span className="rounded-full bg-[var(--color-surface-alt)] px-2 py-1 text-[11px] font-semibold">{rows.length}</span>
                </header>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-color:var(--color-outline-variant)_transparent] [scrollbar-width:thin]">
                  {rows.map((application) => <CandidateCard key={application.id} application={application} pending={moveMutation.isPending && moveMutation.variables?.applicationId === application.id} onOpen={() => openDetail(application.id)} onMove={(status) => status !== application.status && moveMutation.mutate({ applicationId: application.id, status })} />)}
                  {!applicationsQuery.isLoading && rows.length === 0 && <div className="grid min-h-28 place-items-center rounded-xl border border-dashed border-[var(--color-outline-variant)] bg-white/60 px-5 text-center text-[11px] leading-4 text-[var(--color-on-surface-variant)]">Chưa có ứng viên ở giai đoạn này</div>}
                  {applicationsQuery.isLoading && <div className="h-28 animate-pulse rounded-xl bg-white" />}
                </div>
              </section>;
            })}
          </div>
        </div>
      )}

      <DetailDialog open={selectedId != null} title={detail?.candidateName ?? "Chi tiết ứng viên"} onClose={closeDetail}>
        {detailQuery.isLoading ? <p className="text-sm text-[var(--color-on-surface-variant)]">Đang tải hồ sơ…</p> : detail ? <div className="space-y-4">
          <div className="grid gap-3 rounded-xl bg-[var(--color-surface-alt)] p-4 sm:grid-cols-2">
            <div><p className="text-xs text-[var(--color-on-surface-variant)]">Email</p><p className="mt-1 text-sm font-medium">{detail.candidateEmail}</p></div>
            <div><p className="text-xs text-[var(--color-on-surface-variant)]">Người phụ trách</p><p className="mt-1 text-sm font-medium">{detail.assigneeName ?? "Chưa phân công"}</p></div>
            <div><p className="text-xs text-[var(--color-on-surface-variant)]">Nguồn</p><p className="mt-1 text-sm font-medium">{detail.source ?? "Không ghi nhận"}</p></div>
            <div><p className="text-xs text-[var(--color-on-surface-variant)]">Ngày ứng tuyển</p><p className="mt-1 text-sm font-medium">{new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(detail.createdAt))}</p></div>
          </div>
          {detail.tags && <div><p className="text-xs font-semibold">Kỹ năng / nhãn</p><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{detail.tags}</p></div>}
          {detail.notes && <div><p className="text-xs font-semibold">Ghi chú</p><p className="mt-1 whitespace-pre-wrap text-sm text-[var(--color-on-surface-variant)]">{detail.notes}</p></div>}
          <Link to={`/recruiter/jobs/${jobId}/applicants?view=list&applicationId=${detail.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-primary-hover">Mở hồ sơ đầy đủ<ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div> : <p className="text-sm text-red-700">{getApiErrorMessage(detailQuery.error, "Không tải được chi tiết ứng viên.")}</p>}
      </DetailDialog>
    </section>
  );
}

export function PipelinePage() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/recruiter/jobs/${id}/applicants?view=board` : "/recruiter/jobs"} replace />;
}
