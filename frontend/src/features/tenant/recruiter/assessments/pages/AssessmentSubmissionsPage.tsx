import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Clock3, RefreshCw, Search, Users } from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import type { SubmissionStatus, SubmissionSummary } from "@/api/types/assessment";
import { AssessmentError, assessmentStatus } from "@/components/ux/assessmentUi";
import { Button } from "@/components/ux/Button";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";

type StatusTab = "ALL" | "IN_PROGRESS" | "DONE" | "EXPIRED";

const PAGE_SIZE = 10;
const REFRESH_MS = 15_000;

const tabs: { id: StatusTab; label: string; match: (status: SubmissionStatus) => boolean }[] = [
  { id: "ALL", label: "Tất cả lượt làm", match: () => true },
  { id: "IN_PROGRESS", label: "Đang làm bài", match: (status) => status === "IN_PROGRESS" || status === "NOT_STARTED" },
  { id: "DONE", label: "Đã nộp", match: (status) => status === "SUBMITTED" || status === "GRADED" },
  { id: "EXPIRED", label: "Hết thời gian", match: (status) => status === "EXPIRED" },
];

function formatDateTime(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "—";
}

function formatRemaining(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `Còn ${minutes} phút` : `Còn ${seconds} giây`;
}

function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function statusTone(status: SubmissionStatus) {
  if (status === "IN_PROGRESS") return { badge: "bg-sky-50 text-sky-700", dot: "bg-sky-500 animate-pulse" };
  if (status === "GRADED") return { badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" };
  if (status === "SUBMITTED") return { badge: "bg-amber-50 text-amber-800", dot: "bg-amber-500" };
  return { badge: "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]", dot: "bg-[var(--color-outline)]" };
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const tone = statusTone(status);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", tone.badge)}>
      <span className={cn("size-1.5 rounded-full", tone.dot)} />
      {assessmentStatus[status]}
    </span>
  );
}

export function AssessmentSubmissionsPage() {
  const job = useRecruitmentJob();
  const basePath = `/recruiter/jobs/${job.id}/assessments`;
  const [tab, setTab] = useState<StatusTab>("ALL");
  const [query, setQuery] = useState("");
  const [testFilter, setTestFilter] = useState<number | "ALL">("ALL");
  const [page, setPage] = useState(0);

  const submissions = useQuery({
    queryKey: queryKeys.assessments.jobSubmissions(job.id),
    queryFn: () => assessmentApi.jobSubmissions(job.id),
    refetchInterval: REFRESH_MS,
  });
  const items = submissions.data ?? [];

  const testOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of items) map.set(item.testId, item.testTitle);
    return [...map.entries()];
  }, [items]);

  const scoped = useMemo(
    () => (testFilter === "ALL" ? items : items.filter((item) => item.testId === testFilter)),
    [items, testFilter],
  );

  const counts = useMemo(
    () => Object.fromEntries(tabs.map((item) => [item.id, scoped.filter((row) => item.match(row.status)).length])) as Record<StatusTab, number>,
    [scoped],
  );

  const filtered = useMemo(() => {
    const matcher = tabs.find((item) => item.id === tab)!.match;
    const q = query.trim().toLowerCase();
    return scoped.filter(
      (item) =>
        matcher(item.status) &&
        (!q || item.candidateName.toLowerCase().includes(q) || item.candidateEmail.toLowerCase().includes(q) || item.testTitle.toLowerCase().includes(q)),
    );
  }, [scoped, tab, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const resetPage = () => setPage(0);

  return (
    <section className="flex flex-col gap-8 text-[var(--color-on-surface)]">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <nav className="flex flex-wrap items-center gap-1 text-xs text-[var(--color-on-surface-variant)]" aria-label="Breadcrumb">
            <span>Tuyển dụng</span>
            <span className="text-[var(--color-outline)]">/</span>
            <Link to={basePath} className="hover:text-[var(--color-primary)]">Bài đánh giá năng lực</Link>
            <span className="text-[var(--color-outline)]">/</span>
            <span className="font-semibold text-[var(--color-primary)]">Theo dõi bài làm</span>
          </nav>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Theo dõi bài làm của ứng viên</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">
            Xem ai đang làm bài, ai đã nộp và kết quả của từng lượt làm. Danh sách tự làm mới mỗi 15 giây.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void submissions.refetch()} disabled={submissions.isFetching}>
          <RefreshCw className={cn("size-4", submissions.isFetching && "animate-spin")} aria-hidden="true" />
          Làm mới
        </Button>
      </header>

      <AssessmentError error={submissions.error} retry={() => void submissions.refetch()} />

      <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[var(--color-surface-container-low)]/80 p-1">
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTab(item.id);
                  resetPage();
                }}
                className={cn(
                  "inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-[var(--color-surface-card)] font-semibold text-[var(--color-primary)] shadow-sm"
                    : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    active
                      ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]"
                      : "bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]",
                  )}
                >
                  {counts[item.id]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <label className="relative md:col-span-8">
            <span className="sr-only">Tìm kiếm ứng viên</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" aria-hidden="true" />
            <input
              className="h-10 w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] pl-10 pr-3 text-sm outline-none transition-[box-shadow,border-color] placeholder:text-[var(--color-outline)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              placeholder="Tìm theo tên, email ứng viên hoặc tên bài…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                resetPage();
              }}
            />
          </label>
          <label className="md:col-span-4">
            <span className="sr-only">Lọc theo bài đánh giá</span>
            <select
              className="h-10 w-full appearance-none rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] px-3 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              value={testFilter}
              onChange={(e) => {
                setTestFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value));
                resetPage();
              }}
            >
              <option value="ALL">Tất cả bài đánh giá</option>
              {testOptions.map(([id, title]) => (
                <option key={id} value={id}>
                  {title} (ASM-{id})
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] shadow-[var(--shadow-card)]">
        {submissions.isPending && (
          <p className="p-6 text-sm text-[var(--color-on-surface-variant)]" role="status">
            Đang tải danh sách bài làm…
          </p>
        )}

        {submissions.data && !pageRows.length && (
          <div className="flex items-center gap-3 p-8">
            <Users className="size-8 text-[var(--color-primary)]" aria-hidden="true" />
            <div>
              <p className="font-semibold">Chưa có lượt làm bài phù hợp</p>
              <p className="text-sm text-[var(--color-on-surface-variant)]">
                {items.length === 0 ? "Chưa ứng viên nào bắt đầu bài đánh giá của vị trí này." : "Thử đổi bộ lọc hoặc từ khóa tìm kiếm."}
              </p>
            </div>
          </div>
        )}

        {pageRows.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                <thead>
                  <tr className="h-11 bg-[var(--color-surface-container-low)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-outline)]">
                    <th className="px-4 py-2">Ứng viên</th>
                    <th className="px-4 py-2">Bài đánh giá</th>
                    <th className="px-4 py-2">Trạng thái</th>
                    <th className="px-4 py-2">Bắt đầu</th>
                    <th className="px-4 py-2">Nộp bài / Thời gian</th>
                    <th className="px-4 py-2">Điểm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-surface-container-low)]">
                  {pageRows.map((row) => (
                    <SubmissionRow key={row.id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--color-border-default)] px-4 py-3 sm:flex-row">
              <p className="text-sm text-[var(--color-outline)]">
                Hiển thị{" "}
                <span className="font-semibold text-[var(--color-on-surface)]">
                  {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)}
                </span>{" "}
                của <span className="font-semibold text-[var(--color-on-surface)]">{filtered.length}</span> lượt làm
              </p>
              <div className="flex items-center gap-1">
                <Button variant="secondary" size="sm" disabled={safePage === 0} aria-label="Trang đầu" onClick={() => setPage(0)}>
                  <ChevronsLeft className="size-4" aria-hidden="true" />
                </Button>
                <Button variant="secondary" size="sm" disabled={safePage === 0} aria-label="Trang trước" onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Button>
                <span className="min-w-16 px-2 text-center text-sm font-semibold">
                  {safePage + 1} / {pageCount}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={safePage >= pageCount - 1}
                  aria-label="Trang sau"
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
                <Button variant="secondary" size="sm" disabled={safePage >= pageCount - 1} aria-label="Trang cuối" onClick={() => setPage(pageCount - 1)}>
                  <ChevronsRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function SubmissionRow({ row }: { row: SubmissionSummary }) {
  const inProgress = row.status === "IN_PROGRESS";
  return (
    <tr className="transition-colors hover:bg-[var(--color-primary-subtle)]">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-secondary-container)] text-xs font-bold">
            {initials(row.candidateName)}
          </div>
          <div className="min-w-0">
            <span className="block truncate font-semibold">{row.candidateName}</span>
            <span className="block truncate text-xs text-[var(--color-outline)]">{row.candidateEmail}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className="block truncate font-medium">{row.testTitle}</span>
        <span className="font-mono text-xs text-[var(--color-outline)]">Mã: ASM-{row.testId}</span>
      </td>
      <td className="whitespace-nowrap px-4 py-3.5">
        <StatusBadge status={row.status} />
      </td>
      <td className="whitespace-nowrap px-4 py-3.5">{formatDateTime(row.startedAt)}</td>
      <td className="whitespace-nowrap px-4 py-3.5">
        {inProgress ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-sky-700">
            <Clock3 className="size-3.5" aria-hidden="true" />
            {formatRemaining(row.remainingSeconds)}
          </span>
        ) : row.submittedAt ? (
          formatDateTime(row.submittedAt)
        ) : (
          <span className="text-[var(--color-outline)]">Chưa nộp</span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3.5">
        {row.score == null ? (
          <span className="text-[var(--color-outline)]">{row.status === "SUBMITTED" ? "Chờ chấm tự luận" : "—"}</span>
        ) : (
          <div className="flex flex-col">
            <span className="font-semibold">
              {row.score} / {row.totalPoints} điểm
            </span>
            {row.passed != null && (
              <span className={cn("text-[11px] font-medium", row.passed ? "text-emerald-700" : "text-[var(--color-status-danger)]")}>
                {row.passed ? "Đạt" : "Chưa đạt"}
              </span>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
