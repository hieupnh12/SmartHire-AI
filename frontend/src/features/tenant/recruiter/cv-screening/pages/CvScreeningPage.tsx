import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  FileText,
  Gauge,
  Inbox,
  ListChecks,
  LoaderCircle,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { cvApi } from "@/api/tenant/cvApi";
import { jobApi } from "@/api/tenant/jobApi";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/stores/toastStore";
import { button, input, muted, panel, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { DetailDialog } from "@/components/ux/DetailDialog";
import { CvFilePreview } from "@/components/shared/CvFilePreview";
import { ScreeningBreakdown } from "@/features/tenant/recruiter/cv-screening/components/ScreeningBreakdown";
import { CvScreeningDecision } from "@/features/tenant/recruiter/cv-screening/components/CvScreeningDecision";
import type { CvDetail, CvStatus, CvSummary } from "@/api/types/cv";

const jobOptionsKey = ["screening-jobs"] as const;

type Tone = "done" | "work" | "idle" | "fail";
type Tab = "ALL" | "SCORED" | "PROCESSING" | "FAILED";
type Sort = "newest" | "score";

const STATUS: Record<CvStatus, { label: string; tone: Tone }> = {
  UPLOADED: { label: "Chờ phân tích", tone: "idle" },
  PARSING: { label: "Đang đọc file", tone: "work" },
  PARSED: { label: "Đã đọc file", tone: "work" },
  EXTRACTING: { label: "Đang trích xuất", tone: "work" },
  ANALYZING: { label: "Đang phân tích", tone: "work" },
  ANALYZED: { label: "Đã phân tích", tone: "done" },
  FAILED: { label: "Lỗi xử lý", tone: "fail" },
};

const TONE_CLASS: Record<Tone, string> = {
  done: "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]",
  work: "bg-[var(--color-surface-container-high)] text-[var(--color-primary)]",
  idle: "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]",
  fail: "bg-[var(--color-error-container)] text-[var(--color-on-error-container)]",
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase() || "?";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}

function inTab(row: CvSummary, tab: Tab) {
  const tone = STATUS[row.status]?.tone ?? "idle";
  if (tab === "SCORED") return row.matchScore != null;
  if (tab === "PROCESSING") return tone === "work" || tone === "idle";
  if (tab === "FAILED") return tone === "fail";
  return true;
}

export function CvScreeningPage() {
  const token = useAuthStore((s) => s.accessToken);
  const client = useQueryClient();
  const askConfirm = useUiStore((s) => s.askConfirm);
  const { id: routeJobId } = useParams<{ id?: string }>();
  const scopedJobId = routeJobId && /^\d+$/.test(routeJobId) ? Number(routeJobId) : null;
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const jobId = scopedJobId ?? selectedJobId;
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("ALL");
  const [sort, setSort] = useState<Sort>("newest");
  const jobs = useQuery({ queryKey: jobOptionsKey, queryFn: jobApi.options, enabled: !!token });
  const list = useQuery({
    queryKey: queryKeys.cvs.byJob(jobId ?? 0),
    queryFn: () => cvApi.listByJob(jobId!),
    enabled: jobId !== null && !!token,
    refetchInterval: 5_000,
  });
  const detail = useQuery({
    queryKey: queryKeys.cvs.detail(selectedId ?? 0),
    queryFn: () => cvApi.get(selectedId!),
    enabled: selectedId !== null,
    refetchInterval: 4_000,
  });
  const skills = useQuery({ queryKey: ["job-skills", jobId], queryFn: () => jobApi.skills(jobId!), enabled: jobId !== null });
  const retryParse = useMutation({
    mutationFn: (cvId: number) => cvApi.parse(cvId),
    onSuccess: (response, cvId) => {
      client.setQueryData(queryKeys.cvs.detail(cvId), response);
      void list.refetch();
      void detail.refetch();
      toast.success("Đã phân tích CV");
    },
  });
  const remove = useMutation({
    mutationFn: (cvId: number) => cvApi.remove(cvId),
    onSuccess: (_response, cvId) => {
      setSelectedId(null);
      client.removeQueries({ queryKey: queryKeys.cvs.detail(cvId) });
      void list.refetch();
      toast.success("Đã xóa CV");
    },
  });

  const rows = useMemo(() => list.data?.data ?? [], [list.data]);
  const cv = detail.data?.data;
  const jobList = jobs.data?.data ?? [];
  const jobTitle = jobList.find((job) => job.id === jobId)?.title;
  const jobSkills = skills.data?.data ?? [];
  const requiredSkills = jobSkills.filter((skill) => skill.required);
  const preferredSkills = jobSkills.filter((skill) => !skill.required);

  const counts = useMemo(() => {
    const scored = rows.filter((row) => row.matchScore != null);
    const average = scored.length
      ? scored.reduce((sum, row) => sum + Number(row.matchScore), 0) / scored.length
      : null;
    return {
      all: rows.length,
      scored: scored.length,
      processing: rows.filter((row) => inTab(row, "PROCESSING")).length,
      failed: rows.filter((row) => inTab(row, "FAILED")).length,
      average,
    };
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter((row) => inTab(row, tab) && (!q
      || row.candidateName.toLowerCase().includes(q)
      || row.originalFilename.toLowerCase().includes(q)));
    if (sort === "score") {
      return [...filtered].sort((a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1));
    }
    return filtered;
  }, [rows, tab, query, sort]);

  const confirmDelete = (target: CvDetail) =>
    askConfirm({
      title: "Xóa CV này khỏi job?",
      description: `CV của ${target.candidateName} và kết quả phân tích sẽ bị xóa. Không thể hoàn tác.`,
      confirmLabel: "Xóa CV",
      danger: true,
      onConfirm: async () => {
        await remove.mutateAsync(target.id);
      },
    });

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "ALL", label: "Tất cả", count: counts.all },
    { id: "SCORED", label: "Đã chấm điểm", count: counts.scored },
    { id: "PROCESSING", label: "Đang xử lý", count: counts.processing },
    { id: "FAILED", label: "Lỗi", count: counts.failed },
  ];

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 text-[var(--color-on-surface)]">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-7 w-2.5 rounded-full bg-[var(--color-primary)]" />
            <h1 className="text-[30px] font-semibold leading-[38px] tracking-tight">Sàng lọc CV</h1>
          </div>
          <p className="max-w-2xl pl-4 text-sm leading-[22px] text-[var(--color-on-surface-variant)]">
            {jobTitle ? <><span className="font-semibold text-[var(--color-on-surface)]">{jobTitle}</span> · </> : null}
            Chấm điểm hybrid: taxonomy, Jaccard và đánh giá ngữ nghĩa của Gemini so với yêu cầu job.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-xl bg-[var(--color-surface-container-low)] px-3.5 py-2 text-xs font-medium text-[var(--color-on-surface-variant)] lg:self-auto">
          <Sparkles className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
          Tự động phân tích CV còn lại khi job hết hạn đăng
        </div>
      </header>

      {!scopedJobId && (
        <div className={panel}>
          <label className="block max-w-xl space-y-2">
            <span className="text-sm font-semibold">Vị trí tuyển dụng</span>
            <select className={input} value={jobId ?? ""} onChange={(e) => { setSelectedJobId(e.target.value ? Number(e.target.value) : null); setSelectedId(null); }}>
              <option value="">Chọn job</option>
              {jobList.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
            </select>
          </label>
          {jobs.isPending && token && <p className={`mt-3 ${muted}`}>Đang tải danh sách job…</p>}
          {jobs.isError && <p role="alert" className="mt-3">{getApiErrorMessage(jobs.error)}</p>}
          {jobs.isSuccess && jobList.length === 0 && (
            <p className={`mt-3 ${muted}`}>Chưa có job. Tạo tin tuyển ở trang Quản lý việc làm; CV chỉ xuất hiện khi ứng viên apply.</p>
          )}
        </div>
      )}

      {jobId && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Tổng CV" value={String(counts.all)} hint="CV ứng viên đã nộp" icon={Users} />
            <KpiCard label="Đã chấm điểm" value={String(counts.scored)} hint="Có điểm sàng lọc" icon={CheckCircle2} />
            <KpiCard label="Đang xử lý" value={String(counts.processing)} hint="Chờ hoặc đang phân tích" icon={LoaderCircle} />
            <KpiCard
              label="Điểm trung bình"
              value={counts.average == null ? "—" : counts.average.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}
              hint="Trên các CV đã chấm"
              icon={Gauge}
            />
          </div>

          {jobSkills.length > 0 && (
            <div className="rounded-2xl bg-[var(--color-surface-card)] p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ListChecks className="size-5 text-[var(--color-primary)]" aria-hidden="true" />
                <h2 className="text-sm font-semibold">Yêu cầu kỹ năng của job</h2>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <SkillGroup title="Bắt buộc" names={requiredSkills.map((skill) => skill.name)} strong />
                <SkillGroup title="Tùy chọn" names={preferredSkills.map((skill) => skill.name)} />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-surface-card)] p-4 shadow-sm">
            <div className="flex flex-col items-stretch justify-between gap-3 lg:flex-row lg:items-center">
              <label className="relative flex max-w-xl flex-1 items-center">
                <span className="sr-only">Tìm CV</span>
                <Search className="pointer-events-none absolute left-3.5 size-5 text-[var(--color-outline)]" aria-hidden="true" />
                <input
                  className="h-11 w-full rounded-xl bg-[var(--color-surface)] pl-11 pr-4 text-sm text-[var(--color-on-surface)] shadow-[0_0_0_1px_var(--color-outline-variant)] outline-none transition-shadow placeholder:text-[var(--color-outline)] focus:shadow-[0_0_0_2px_var(--color-primary-hover)]"
                  placeholder="Tìm theo tên ứng viên hoặc tên file"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <select
                aria-label="Sắp xếp"
                className="h-10 cursor-pointer rounded-lg bg-[var(--color-surface-container-low)] pl-3.5 pr-8 text-xs font-medium text-[var(--color-on-surface)] outline-none focus:shadow-[0_0_0_2px_var(--color-primary-hover)]"
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
              >
                <option value="newest">Sắp xếp: Mới nộp nhất</option>
                <option value="score">Sắp xếp: Điểm cao nhất</option>
              </select>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Lọc theo trạng thái">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-colors",
                    tab === item.id
                      ? "bg-[var(--color-primary)] font-semibold text-[var(--color-on-primary)]"
                      : "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]",
                  )}
                >
                  {item.label}
                  <span className="tabular-nums opacity-80">({item.count})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl bg-[var(--color-surface-card)] shadow-sm">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead>
                  <tr className="h-12 select-none bg-[var(--color-surface-container-low)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                    <th className="py-3 pl-6 pr-4">Ứng viên</th>
                    <th className="px-4 py-3">File CV</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Điểm sàng lọc</th>
                    <th className="py-3 pr-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-surface-container-low)]">
                  {list.isPending && (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-[var(--color-on-surface-variant)]" role="status">Đang tải CV…</td></tr>
                  )}
                  {list.isError && (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-sm" role="alert">{getApiErrorMessage(list.error)}</td></tr>
                  )}
                  {visible.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer transition-colors hover:bg-[var(--color-primary-subtle)]"
                      onClick={() => setSelectedId(row.id)}
                    >
                      <td className="py-4 pl-6 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary-hover)]">
                            {initials(row.candidateName)}
                          </div>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-semibold leading-tight">{row.candidateName}</span>
                            <span className="text-xs text-[var(--color-on-surface-variant)]">Nộp {formatDate(row.createdAt)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex max-w-[260px] items-center gap-1.5 text-[var(--color-on-surface-variant)]">
                          <FileText className="size-4 shrink-0" aria-hidden="true" />
                          <span className="truncate" title={row.originalFilename}>{row.originalFilename}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4"><CvStatusBadge status={row.status} /></td>
                      <td className="px-4 py-4"><ScoreCell score={row.matchScore} /></td>
                      <td className="py-4 pr-6 text-right">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedId(row.id); }}
                          className="inline-flex h-9 items-center gap-1 rounded-lg bg-[var(--color-primary-soft)] px-3 text-xs font-semibold text-[var(--color-primary-hover)] transition-colors hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)]"
                        >
                          Chi tiết
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {list.isSuccess && visible.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-14">
                        <div className="flex flex-col items-center text-center">
                          <Inbox className="size-8 text-[var(--color-outline)]" aria-hidden="true" />
                          <p className="mt-3 text-sm font-semibold">{rows.length === 0 ? "Chưa có CV cho job này" : "Không có CV phù hợp bộ lọc"}</p>
                          <p className="mt-1 max-w-md text-sm text-[var(--color-on-surface-variant)]">
                            {rows.length === 0
                              ? "CV chỉ xuất hiện khi ứng viên apply vào job. Recruiter không tải CV hộ ứng viên."
                              : "Thử đổi từ khóa hoặc chọn tab trạng thái khác."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <DetailDialog open={selectedId != null} title={cv?.candidateName ?? "Chi tiết CV"} onClose={() => setSelectedId(null)}>
        {detail.isPending && selectedId != null && <p role="status" className={muted}>Đang tải…</p>}
        {cv && (
          <CvDetailPanel
            cv={cv}
            onRetry={() => retryParse.mutate(cv.id)}
            retryPending={retryParse.isPending}
            onDelete={() => confirmDelete(cv)}
            deletePending={remove.isPending}
          />
        )}
        {retryParse.isError && <p role="alert" className="mt-3 rounded-xl bg-[var(--color-error-container)] p-3 text-sm text-[var(--color-on-error-container)]">{getApiErrorMessage(retryParse.error)}</p>}
      </DetailDialog>
    </section>
  );
}

function KpiCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint: string; icon: typeof Users }) {
  return (
    <div className="group relative flex items-center justify-between overflow-hidden rounded-2xl bg-[var(--color-surface-card)] p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="absolute -bottom-4 -right-4 size-24 rounded-full bg-[var(--color-surface-container-low)] opacity-40 transition-transform group-hover:scale-110 motion-reduce:transition-none" />
      <div className="z-10 flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-on-surface-variant)]">{label}</span>
        <span className="text-4xl font-bold tracking-tight tabular-nums">{value}</span>
        <span className="text-xs text-[var(--color-on-surface-variant)]">{hint}</span>
      </div>
      <div className="z-10 flex size-12 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <Icon className="size-6" aria-hidden="true" />
      </div>
    </div>
  );
}

function SkillGroup({ title, names, strong }: { title: string; names: string[]; strong?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{title} · {names.length}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {names.length === 0 && <span className="text-sm text-[var(--color-on-surface-variant)]">Không có</span>}
        {names.map((name) => (
          <span
            key={name}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              strong ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]" : "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface)]",
            )}
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

function CvStatusBadge({ status }: { status: CvStatus }) {
  const meta = STATUS[status] ?? { label: status, tone: "idle" as Tone };
  const Icon = meta.tone === "done" ? CheckCircle2 : meta.tone === "fail" ? AlertTriangle : meta.tone === "work" ? LoaderCircle : CircleDashed;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", TONE_CLASS[meta.tone])}>
      <Icon className={cn("size-3.5", meta.tone === "work" && "animate-spin motion-reduce:animate-none")} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function ScoreCell({ score }: { score: number | null }) {
  if (score == null) return <span className="text-xs italic text-[var(--color-outline)]">Chưa có điểm</span>;
  const pct = Math.min(Math.max(Number(score), 0), 100);
  return (
    <div className="flex w-36 flex-col gap-1.5">
      <span className="text-base font-bold tabular-nums">
        {Number(score).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}
        <span className="text-xs font-normal text-[var(--color-on-surface-variant)]"> /100</span>
      </span>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-container-high)]">
        <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CvDetailPanel({ cv, onRetry, retryPending, onDelete, deletePending }: {
  cv: CvDetail;
  onRetry: () => void;
  retryPending: boolean;
  onDelete: () => void;
  deletePending: boolean;
}) {
  const canAnalyze = cv.status === "UPLOADED" || cv.status === "FAILED" || cv.status === "ANALYZED";
  const analyzed = cv.status === "ANALYZED";
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-surface-container-low)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-sm font-bold text-[var(--color-primary-hover)]">
            {initials(cv.candidateName)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{cv.candidateName}</p>
            <p className="truncate text-xs text-[var(--color-on-surface-variant)]">{cv.originalFilename} · Nộp {formatDate(cv.createdAt)}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <CvStatusBadge status={cv.status} />
              <span className="rounded-full bg-[var(--color-surface-card)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-on-surface-variant)]">
                {cv.extractionModel ?? "Chưa phân tích"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canAnalyze && (
            <button type="button" className={primary} disabled={retryPending || deletePending} onClick={onRetry}>
              {retryPending
                ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                : <RefreshCw className="size-4" aria-hidden="true" />}
              {retryPending ? "Đang phân tích…" : analyzed ? "Phân tích lại" : "Phân tích CV"}
            </button>
          )}
          <button
            type="button"
            className={cn(button, "hover:border-[var(--color-error)] hover:bg-[var(--color-error-container)] hover:text-[var(--color-on-error-container)]")}
            disabled={deletePending}
            onClick={onDelete}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {deletePending ? "Đang xóa…" : "Xóa CV"}
          </button>
        </div>
      </div>

      {cv.errorMessage && (
        <div role="alert" className="flex items-start gap-2 rounded-xl bg-[var(--color-error-container)] p-3 text-sm text-[var(--color-on-error-container)]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{cv.errorMessage}</span>
        </div>
      )}

      {cv.match
        ? <ScreeningBreakdown score={cv.match.score} modelVersion={cv.match.modelVersion} breakdown={cv.match.breakdown} />
        : (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[var(--color-border-default)] p-4 text-sm text-[var(--color-on-surface-variant)]">
            <CircleDashed className="size-5 shrink-0" aria-hidden="true" />
            Chưa có điểm sàng lọc. Bấm “Phân tích CV” để chấm theo yêu cầu của job.
          </div>
        )}

      {cv.applicationId != null && <CvScreeningDecision applicationId={cv.applicationId} />}

      {(cv.skills.length > 0 || cv.analysis?.yearsExperience != null) && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Kỹ năng trích từ CV</h3>
            {cv.analysis?.yearsExperience != null && (
              <span className="text-xs text-[var(--color-on-surface-variant)]">{cv.analysis.yearsExperience} năm kinh nghiệm</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {cv.skills.map((skill) => (
              <span key={skill.canonicalName} className="rounded-full bg-[var(--color-surface-container-low)] px-3 py-1 text-xs font-medium">
                {skill.skillName}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">File CV</h3>
        <CvFilePreview cvId={cv.id} mimeType={cv.mimeType} filename={cv.originalFilename} />
      </div>
    </div>
  );
}
