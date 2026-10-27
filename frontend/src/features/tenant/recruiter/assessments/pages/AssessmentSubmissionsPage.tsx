import { AssessmentJobReportPanel } from "../components/AssessmentJobReportPanel";
import { SubmissionGradingDetail } from "../components/SubmissionGradingDetail";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  Eye,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import type { SubmissionStatus, SubmissionSummary } from "@/api/types/assessment";
import { AssessmentError } from "@/components/ux/assessmentUi";
import { Breadcrumb } from "@/components/ux/Breadcrumb";
import { Button } from "@/components/ux/Button";
import { TableSkeleton } from "@/components/ux/Skeleton";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";

type StatusTab = "ALL" | "IN_PROGRESS" | "DONE" | "EXPIRED";

const PAGE_SIZE = 10;
const REFRESH_MS = 15_000;

const tabs: { id: StatusTab; label: string; match: (status: SubmissionStatus) => boolean }[] = [
  { id: "ALL", label: "Tất cả", match: () => true },
  { id: "IN_PROGRESS", label: "Đang làm bài", match: (status) => status === "IN_PROGRESS" || status === "NOT_STARTED" },
  { id: "DONE", label: "Đã nộp", match: (status) => status === "SUBMITTED" || status === "GRADED" },
  { id: "EXPIRED", label: "Quá giờ", match: (status) => status === "EXPIRED" },
];

function formatDateTime(iso: string | null) {
  return iso
    ? new Date(iso).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      })
    : "—";
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

function statusMeta(status: SubmissionStatus) {
  switch (status) {
    case "GRADED":
      return {
        label: "Đã chấm",
        badge: "bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
        dot: "bg-emerald-500",
      };
    case "SUBMITTED":
      return {
        label: "Đã nộp",
        badge: "bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
        dot: "bg-amber-500",
      };
    case "IN_PROGRESS":
      return {
        label: "Đang làm bài",
        badge: "bg-sky-50 text-sky-700 border border-sky-200/60 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40",
        dot: "bg-sky-500 animate-pulse",
      };
    case "NOT_STARTED":
      return {
        label: "Chưa bắt đầu",
        badge: "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
        dot: "bg-slate-400",
      };
    case "EXPIRED":
      return {
        label: "Quá giờ",
        badge: "bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40",
        dot: "bg-rose-500",
      };
    default:
      return {
        label: "Đã hủy",
        badge: "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
        dot: "bg-slate-400",
      };
  }
}

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const meta = statusMeta(status);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", meta.badge)}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export function AssessmentSubmissionsPage() {
  const job = useRecruitmentJob();
  const basePath = `/recruiter/jobs/${job.id}/assessments`;
  const [reviewId, setReviewId] = useState<number | null>(null);
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
    () =>
      Object.fromEntries(
        tabs.map((item) => [item.id, scoped.filter((row) => item.match(row.status)).length]),
      ) as Record<StatusTab, number>,
    [scoped],
  );

  const filtered = useMemo(() => {
    const matcher = tabs.find((item) => item.id === tab)!.match;
    const q = query.trim().toLowerCase();
    return scoped.filter(
      (item) =>
        matcher(item.status) &&
        (!q ||
          item.candidateName.toLowerCase().includes(q) ||
          item.candidateEmail.toLowerCase().includes(q) ||
          item.testTitle.toLowerCase().includes(q)),
    );
  }, [scoped, tab, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const resetPage = () => setPage(0);

  return (
    <section className="flex flex-col gap-5 text-[var(--color-on-surface)]">
      {/* 1. Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <Breadcrumb
            items={[
              { label: "Tuyển dụng" },
              { label: "Bài đánh giá năng lực", to: basePath },
              { label: "Theo dõi bài làm" },
            ]}
          />
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Theo dõi bài làm của ứng viên
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-[var(--color-on-surface-variant)] sm:text-sm">
            Xem tiến độ làm bài, trạng thái nộp và chấm điểm của từng ứng viên. Tự động làm mới mỗi 15 giây.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void submissions.refetch()}
          disabled={submissions.isFetching}
          className="self-start md:self-auto shrink-0"
        >
          <RefreshCw className={cn("size-3.5", submissions.isFetching && "animate-spin")} aria-hidden="true" />
          Làm mới
        </Button>
      </header>

      {reviewId != null && <SubmissionGradingDetail key={reviewId} id={reviewId} onClose={() => setReviewId(null)} />}
      <AssessmentError error={submissions.error} retry={() => void submissions.refetch()} />

      {/* 2. Compact Metric Cards */}
      <AssessmentJobReportPanel jobId={job.id} />

      {/* 3. Unified Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100/70 p-1 dark:bg-slate-800/60">
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
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                  active
                    ? "bg-white font-semibold text-[var(--color-primary)] shadow-2xs dark:bg-slate-900"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    active
                      ? "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"
                      : "bg-slate-200/60 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400",
                  )}
                >
                  {counts[item.id]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Test Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              className="h-8.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8.5 pr-3 text-xs outline-none transition focus:border-[var(--color-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:border-slate-800 dark:bg-slate-800/40 dark:focus:bg-slate-900"
              placeholder="Tìm ứng viên, email, tên bài…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                resetPage();
              }}
            />
          </div>

          <select
            aria-label="Lọc theo bài đánh giá"
            className="h-8.5 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium text-slate-700 outline-none transition cursor-pointer hover:bg-slate-100 focus:border-[var(--color-primary)] dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800"
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
        </div>
      </div>

      {/* 4. Main Submissions Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        {submissions.isPending && (
          <div className="p-4">
            <TableSkeleton columns={7} rows={6} />
          </div>
        )}

        {submissions.data && !pageRows.length && (
          <div className="flex items-center gap-3 p-8">
            <Users className="size-8 text-[var(--color-primary)]" aria-hidden="true" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Chưa có lượt làm bài phù hợp</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {items.length === 0
                  ? "Chưa ứng viên nào bắt đầu bài đánh giá của vị trí này."
                  : "Thử đổi bộ lọc hoặc từ khóa tìm kiếm."}
              </p>
            </div>
          </div>
        )}

        {pageRows.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
                    <th className="px-4 py-3">Ứng viên</th>
                    <th className="px-4 py-3">Bài đánh giá</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Bắt đầu</th>
                    <th className="px-4 py-3">Nộp bài / Thời gian</th>
                    <th className="px-4 py-3">Điểm</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {pageRows.map((row) => (
                    <SubmissionRow key={row.id} row={row} onReview={() => setReviewId(row.id)} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hiển thị{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)}
                </span>{" "}
                trên <span className="font-semibold text-slate-900 dark:text-slate-100">{filtered.length}</span> lượt làm
              </p>
              <div className="flex items-center gap-1">
                <Button variant="secondary" size="sm" disabled={safePage === 0} aria-label="Trang đầu" onClick={() => setPage(0)}>
                  <ChevronsLeft className="size-3.5" aria-hidden="true" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={safePage === 0}
                  aria-label="Trang trước"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="size-3.5" aria-hidden="true" />
                </Button>
                <span className="min-w-16 px-2 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {safePage + 1} / {pageCount}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={safePage >= pageCount - 1}
                  aria-label="Trang sau"
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                >
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={safePage >= pageCount - 1}
                  aria-label="Trang cuối"
                  onClick={() => setPage(pageCount - 1)}
                >
                  <ChevronsRight className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function SubmissionRow({ row, onReview }: { row: SubmissionSummary; onReview: () => void }) {
  const inProgress = row.status === "IN_PROGRESS";
  const canReview = ["SUBMITTED", "GRADED", "EXPIRED"].includes(row.status);

  return (
    <tr className="group transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-primary-subtle)] text-xs font-bold text-[var(--color-primary)]">
            {initials(row.candidateName)}
          </div>
          <div className="min-w-0">
            <span className="block truncate font-semibold text-slate-900 dark:text-slate-100">{row.candidateName}</span>
            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{row.candidateEmail}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className="block truncate font-medium text-slate-900 dark:text-slate-100">{row.testTitle}</span>
        <span className="font-mono text-xs text-slate-400 dark:text-slate-500">Mã: ASM-{row.testId}</span>
      </td>
      <td className="whitespace-nowrap px-4 py-3.5">
        <StatusBadge status={row.status} />
      </td>
      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-600 dark:text-slate-400">
        {formatDateTime(row.startedAt)}
      </td>
      <td className="whitespace-nowrap px-4 py-3.5 text-xs">
        {inProgress ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-sky-600 dark:text-sky-400">
            <Clock3 className="size-3.5" aria-hidden="true" />
            {formatRemaining(row.remainingSeconds)}
          </span>
        ) : row.submittedAt ? (
          <span className="text-slate-700 dark:text-slate-300">{formatDateTime(row.submittedAt)}</span>
        ) : (
          <span className="text-slate-400 italic">Chưa nộp bài</span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3.5">
        {inProgress || row.status === "NOT_STARTED" ? (
          <span className="inline-flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 font-medium">
            <Clock3 className="size-3" /> Đang làm bài
          </span>
        ) : row.status === "SUBMITTED" && row.score == null ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
            Chờ chấm bài
          </span>
        ) : row.status === "EXPIRED" && row.score == null ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40">
            Quá giờ (0 điểm)
          </span>
        ) : row.score != null ? (
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {row.score} <span className="text-xs font-normal text-slate-500">/ {row.totalPoints ?? "—"} điểm</span>
            </span>
            {row.passed != null && (
              <span
                className={cn(
                  "text-[11px] font-semibold mt-0.5",
                  row.passed ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                )}
              >
                {row.passed ? "✓ Đạt yêu cầu" : "✗ Chưa đạt"}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">Chưa có điểm</span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3.5 text-right">
        {canReview ? (
          <button
            type="button"
            onClick={onReview}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[var(--color-primary-hover)] active:scale-98 transition-all cursor-pointer"
          >
            <Eye className="size-3.5" />
            Xem & chấm bài
          </button>
        ) : (
          <span className="text-xs text-slate-400 italic">Đang làm bài</span>
        )}
      </td>
    </tr>
  );
}
