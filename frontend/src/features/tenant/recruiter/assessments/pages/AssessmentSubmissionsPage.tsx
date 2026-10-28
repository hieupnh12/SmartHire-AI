import { AssessmentJobReportPanel } from "../components/AssessmentJobReportPanel";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  Eye,
  Pencil,
  RefreshCw,
  Rows3,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import type { SubmissionStatus, SubmissionSummary } from "@/api/types/assessment";
import { AssessmentError } from "@/components/ux/assessmentUi";
import { AssessmentSubNav } from "../components/AssessmentSubNav";
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

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function isSameDay(iso1: string | null, iso2: string | null) {
  if (!iso1 || !iso2) return true;
  const d1 = new Date(iso1);
  const d2 = new Date(iso2);
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function computeDuration(startedAt: string | null, submittedAt: string | null): string | null {
  if (!startedAt || !submittedAt) return null;
  const diffMs = new Date(submittedAt).getTime() - new Date(startedAt).getTime();
  if (diffMs <= 0) return null;
  const totalMinutes = Math.round(diffMs / 60000);
  if (totalMinutes < 60) return `${Math.max(1, totalMinutes)} phút`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}p` : `${hours} giờ`;
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
        badge: "bg-emerald-50 text-emerald-700 border border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
        dot: "bg-emerald-500",
      };
    case "SUBMITTED":
      return {
        label: "Đã nộp",
        badge: "bg-blue-50 text-blue-700 border border-blue-200/70 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40",
        dot: "bg-blue-500",
      };
    case "IN_PROGRESS":
      return {
        label: "Đang làm bài",
        badge: "bg-sky-50 text-sky-700 border border-sky-200/70 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40",
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
        label: "Quá hạn",
        badge: "bg-rose-50 text-rose-700 border border-rose-200/70 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40",
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
  const navigate = useNavigate();
  const [tab, setTab] = useState<StatusTab>("ALL");
  const [query, setQuery] = useState("");
  const [density, setDensity] = useState<"compact" | "normal">("normal");
  const [page, setPage] = useState(0);

  const submissions = useQuery({
    queryKey: queryKeys.assessments.jobSubmissions(job.id),
    queryFn: () => assessmentApi.jobSubmissions(job.id),
    refetchInterval: REFRESH_MS,
  });
  const items = submissions.data ?? [];

  // Group attempts by candidateId + testId to accurately label "Lần 1", "Lần 2"
  const attemptMap = useMemo(() => {
    const map = new Map<string, number[]>();
    const sorted = [...items].sort((a, b) => {
      const timeA = a.startedAt ? new Date(a.startedAt).getTime() : a.id;
      const timeB = b.startedAt ? new Date(b.startedAt).getTime() : b.id;
      return timeA - timeB;
    });
    for (const item of sorted) {
      const key = `${item.candidateId}_${item.testId}`;
      const list = map.get(key) ?? [];
      list.push(item.id);
      map.set(key, list);
    }
    const result = new Map<number, { attempt: number; totalAttempts: number }>();
    for (const [, ids] of map.entries()) {
      ids.forEach((id, index) => {
        result.set(id, { attempt: index + 1, totalAttempts: ids.length });
      });
    }
    return result;
  }, [items]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        tabs.map((item) => [item.id, items.filter((row) => item.match(row.status)).length]),
      ) as Record<StatusTab, number>,
    [items],
  );

  const filtered = useMemo(() => {
    const matcher = tabs.find((item) => item.id === tab)!.match;
    const q = query.trim().toLowerCase();
    return items.filter(
      (item) =>
        matcher(item.status) &&
        (!q ||
          item.candidateName.toLowerCase().includes(q) ||
          item.candidateEmail.toLowerCase().includes(q) ||
          item.testTitle.toLowerCase().includes(q)),
    );
  }, [items, tab, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const resetPage = () => setPage(0);

  return (
    <section className="flex flex-col gap-4 text-[var(--color-on-surface)]">
      {/* 1. Sub-tabs Navigation */}
      <AssessmentSubNav jobId={job.id} activeTab="submissions" />

      <AssessmentError error={submissions.error} retry={() => void submissions.refetch()} />

      {/* 2. Visual Metric Cards with Enhanced Typography & Progress Trackers */}
      <AssessmentJobReportPanel jobId={job.id} />

      {/* 3. Single-line Responsive Toolbar (Left: Status Tabs, Right: Search & Actions) */}
      <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
        {/* Left: Segmented Status Tabs (Cuộn ngang êm ái trên mobile, không vỡ layout) */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none rounded-xl bg-slate-100/70 p-1 dark:bg-slate-800/60 shrink-0">
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
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all cursor-pointer",
                  active
                    ? "bg-white font-semibold text-[#0066FF] shadow-2xs dark:bg-slate-900 dark:text-blue-400"
                    : "text-[#475467] hover:text-[#101828] dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                <span>{item.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    active
                      ? "bg-blue-50 text-[#0066FF] dark:bg-blue-950 dark:text-blue-300"
                      : "bg-slate-200/60 text-[#667085] dark:bg-slate-700/60 dark:text-slate-400",
                  )}
                >
                  {counts[item.id]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Search & Action Icons (Làm mới & Mật độ hiển thị) */}
        <div className="flex flex-wrap items-center gap-2 flex-1 md:flex-initial justify-end min-w-0">
          {/* Search bar co giãn linh hoạt: Tiêu chuẩn (rộng 280-320px) vs Thu gọn (rộng 200-240px) */}
          <div
            className={cn(
              "relative flex-1 transition-all duration-200 min-w-[150px]",
              density === "compact" ? "md:w-52 max-w-xs" : "md:w-72 max-w-sm",
            )}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#667085]" />
            <input
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-8 text-[13px] text-[#101828] placeholder:text-[#667085] outline-none transition focus:border-[#0066FF] focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-800/40 dark:text-white dark:focus:bg-slate-900"
              placeholder="Tìm ứng viên, email…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                resetPage();
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  resetPage();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer dark:hover:text-slate-200"
                title="Xóa tìm kiếm"
                aria-label="Xóa tìm kiếm"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Nút Làm mới */}
          <button
            type="button"
            onClick={() => void submissions.refetch()}
            disabled={submissions.isFetching}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50/50 text-[#475467] transition-all hover:bg-slate-100 hover:text-[#101828] active:scale-95 disabled:opacity-50 cursor-pointer dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Làm mới dữ liệu"
            aria-label="Làm mới dữ liệu"
          >
            <RefreshCw className={cn("size-3.5", submissions.isFetching && "animate-spin text-[#0066FF]")} aria-hidden="true" />
          </button>

          {/* Nút Chuyển chế độ: Tiêu chuẩn / Thu gọn (Segmented Control trực quan) */}
          <div className="inline-flex shrink-0 items-center rounded-xl border border-slate-200 bg-slate-100/70 p-0.5 dark:border-slate-800 dark:bg-slate-800/60">
            <button
              type="button"
              onClick={() => setDensity("normal")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-all cursor-pointer",
                density === "normal"
                  ? "bg-white font-semibold text-slate-900 shadow-2xs border border-slate-200/60 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                  : "font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
              )}
              title="Chế độ Tiêu chuẩn: Thoáng mắt, hiển thị đầy đủ thông tin"
            >
              <Rows3 className="size-3.5" />
              <span className="hidden sm:inline">Tiêu chuẩn</span>
            </button>
            <button
              type="button"
              onClick={() => setDensity("compact")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-all cursor-pointer",
                density === "compact"
                  ? "bg-white font-semibold text-slate-900 shadow-2xs border border-slate-200/60 dark:bg-slate-900 dark:text-white dark:border-slate-700"
                  : "font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
              )}
              title="Chế độ Thu gọn: Tối ưu số dòng trên màn hình, mật độ dữ liệu cao"
            >
              <SlidersHorizontal className="size-3.5" />
              <span className="hidden sm:inline">Thu gọn</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Main Submissions Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        {submissions.isPending && (
          <div className="p-4">
            <TableSkeleton columns={6} rows={6} />
          </div>
        )}

        {submissions.data && !pageRows.length && (
          <div className="flex items-center gap-3 p-8">
            <Users className="size-8 text-[var(--color-primary)]" aria-hidden="true" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Chưa có lượt làm bài phù hợp</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {items.length === 0
                  ? "Chưa ứng viên nào bắt đầu bài đánh giá của vị trí này."
                  : "Thử đổi bộ lọc hoặc từ khóa tìm kiếm."}
              </p>
            </div>
          </div>
        )}

        {pageRows.length > 0 && (
          <>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full table-fixed border-collapse text-left text-sm">
                <colgroup>
                  <col className="w-[22%] min-w-[170px]" />
                  <col className="w-[24%] min-w-[180px]" />
                  <col className="w-[13%] min-w-[110px]" />
                  <col className="w-[20%] min-w-[170px]" />
                  <col className="w-[11%] min-w-[95px]" />
                  <col className="w-[10%] min-w-[90px]" />
                </colgroup>
                <thead>
                  <tr
                    className={cn(
                      "border-b border-slate-100 bg-slate-50/70 font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400",
                      density === "compact" ? "text-[10px]" : "text-[11px]",
                    )}
                  >
                    <th className={cn("px-4", density === "compact" ? "py-2" : "py-3")}>Ứng viên</th>
                    <th className={cn("px-4", density === "compact" ? "py-2" : "py-3")}>Bài đánh giá &amp; Lượt thi</th>
                    <th className={cn("px-4", density === "compact" ? "py-2" : "py-3")}>Trạng thái</th>
                    <th className={cn("px-4", density === "compact" ? "py-2" : "py-3")}>Thời gian</th>
                    <th className={cn("px-4", density === "compact" ? "py-2" : "py-3")}>Điểm số &amp; Đạt</th>
                    <th
                      className={cn(
                        "sticky right-0 z-10 bg-slate-50/95 px-4 text-right shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)] backdrop-blur-xs dark:bg-slate-800/95",
                        density === "compact" ? "py-2" : "py-3",
                      )}
                    >
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {pageRows.map((row) => (
                    <SubmissionRow
                      key={row.id}
                      row={row}
                      attemptInfo={attemptMap.get(row.id)}
                      density={density}
                      onReview={() => navigate(`/recruiter/jobs/${job.id}/assessments/submissions/${row.id}`)}
                    />
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

function SubmissionRow({
  row,
  attemptInfo,
  density,
  onReview,
}: {
  row: SubmissionSummary;
  attemptInfo?: { attempt: number; totalAttempts: number };
  density: "compact" | "normal";
  onReview: () => void;
}) {
  const inProgress = row.status === "IN_PROGRESS";
  const isPendingGrading = row.status === "SUBMITTED" || (row.status !== "IN_PROGRESS" && row.score == null);
  const canReview = ["SUBMITTED", "GRADED", "EXPIRED"].includes(row.status);
  const durationText = computeDuration(row.startedAt, row.submittedAt);
  const sameDay = isSameDay(row.startedAt, row.submittedAt);

  const padY = density === "compact" ? "py-1.5" : "py-3.5";

  return (
    <tr className="group transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
      {/* 1. Candidate Info */}
      <td className={cn("px-4", padY)}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "grid shrink-0 place-items-center rounded-full bg-[var(--color-primary-subtle)] font-bold text-[var(--color-primary)]",
              density === "compact" ? "size-6.5 text-[10px]" : "size-8.5 text-xs",
            )}
          >
            {initials(row.candidateName)}
          </div>
          <div className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate font-semibold text-slate-900 dark:text-slate-100",
                density === "compact" ? "text-xs" : "text-[13.5px]",
              )}
              title={row.candidateName}
            >
              {row.candidateName}
            </span>
            <span
              className={cn(
                "block truncate text-slate-500 dark:text-slate-400",
                density === "compact" ? "text-[11px]" : "text-xs mt-0.5",
              )}
              title={row.candidateEmail}
            >
              {row.candidateEmail}
            </span>
          </div>
        </div>
      </td>

      {/* 2. Assessment Name & Attempt / Retry Badge */}
      <td className={cn("px-4", padY)}>
        <div className="flex flex-col min-w-0">
          <span
            className={cn(
              "truncate font-medium text-slate-900 dark:text-slate-100",
              density === "compact" ? "text-xs" : "text-sm",
            )}
            title={row.testTitle}
          >
            {row.testTitle}
          </span>
          <div className={cn("flex items-center gap-1.5", density === "compact" ? "text-[10px]" : "mt-0.5 text-[11px]")}>
            <span className="font-mono text-slate-400 dark:text-slate-500">ASM-{row.testId}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            {attemptInfo && attemptInfo.totalAttempts > 1 ? (
              <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300">
                Lần {attemptInfo.attempt}/{attemptInfo.totalAttempts}
              </span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500">Lần 1</span>
            )}
          </div>
        </div>
      </td>

      {/* 3. Status Badge */}
      <td className={cn("whitespace-nowrap px-4", padY)}>
        <StatusBadge status={row.status} />
      </td>

      {/* 4. Combined Time Column (Bắt đầu - Nộp bài / Thời lượng) */}
      <td className={cn("px-4 text-xs", padY)}>
        {inProgress ? (
          density === "compact" ? (
            <div className="truncate text-xs text-sky-600 dark:text-sky-400 font-medium inline-flex items-center gap-1">
              <Clock3 className="size-3 shrink-0" />
              <span>{formatTime(row.startedAt)} · {formatRemaining(row.remainingSeconds)}</span>
            </div>
          ) : (
            <div className="flex flex-col min-w-0">
              <span className="truncate font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-[13px]">
                {formatTime(row.startedAt)} ({formatDate(row.startedAt)})
              </span>
              <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 dark:text-sky-400">
                <Clock3 className="size-3 shrink-0" aria-hidden="true" />
                {formatRemaining(row.remainingSeconds)}
              </span>
            </div>
          )
        ) : row.submittedAt ? (
          density === "compact" ? (
            <div
              className="truncate text-xs text-slate-700 dark:text-slate-300"
              title={`Bắt đầu: ${formatTime(row.startedAt)} (${formatDate(row.startedAt)})\nNộp bài: ${formatTime(row.submittedAt)} (${formatDate(row.submittedAt)})\nThời lượng: ${durationText ?? "—"}`}
            >
              <span>{formatTime(row.startedAt)} ({formatDate(row.startedAt)})</span>
              <span className="text-slate-400 mx-1">·</span>
              <strong className="font-semibold text-slate-900 dark:text-slate-100">{durationText ?? "—"}</strong>
            </div>
          ) : (
            <div
              className="flex flex-col min-w-0"
              title={`Bắt đầu: ${new Date(row.startedAt ?? "").toLocaleString("vi-VN")}\nNộp bài: ${new Date(row.submittedAt).toLocaleString("vi-VN")}`}
            >
              <span className="truncate font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-[13px]">
                {sameDay ? (
                  <>
                    {formatTime(row.startedAt)} - {formatTime(row.submittedAt)}{" "}
                    <span className="font-normal text-slate-500 dark:text-slate-400">({formatDate(row.submittedAt)})</span>
                  </>
                ) : (
                  <>
                    {formatTime(row.startedAt)} {formatDate(row.startedAt)} - {formatTime(row.submittedAt)} {formatDate(row.submittedAt)}
                  </>
                )}
              </span>
              <span className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Thời lượng: <strong className="font-medium text-slate-700 dark:text-slate-300">{durationText ?? "—"}</strong>
              </span>
            </div>
          )
        ) : (
          <div className="flex flex-col min-w-0">
            <span className="truncate font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-[13px]">
              {formatTime(row.startedAt)} ({formatDate(row.startedAt)})
            </span>
            <span className="mt-0.5 text-[11px] text-slate-400 italic">Chưa nộp bài</span>
          </div>
        )}
      </td>

      {/* 5. Score & Passed / Failed */}
      <td className={cn("whitespace-nowrap px-4", padY)}>
        {inProgress || row.status === "NOT_STARTED" ? (
          <span className="inline-flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 font-medium">
            <Clock3 className="size-3" /> Đang thi
          </span>
        ) : row.status === "SUBMITTED" && row.score == null ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
            Chờ chấm bài
          </span>
        ) : row.status === "EXPIRED" && row.score == null ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40">
            Quá giờ (0đ)
          </span>
        ) : row.score != null ? (
          density === "compact" ? (
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                {row.score}/{row.totalPoints ?? "—"}đ
              </span>
              {row.passed != null && (
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.2 rounded",
                    row.passed
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
                  )}
                >
                  {row.passed ? "Đạt" : "Trượt"}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {row.score} <span className="text-xs font-normal text-slate-500">/ {row.totalPoints ?? "—"}đ</span>
              </span>
              {row.passed != null && (
                <span
                  className={cn(
                    "text-[11px] font-semibold mt-0.5",
                    row.passed ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {row.passed ? "✓ Đạt" : "✗ Chưa đạt"}
                </span>
              )}
            </div>
          )
        ) : (
          <span className="text-xs text-slate-400 italic">Chưa có điểm</span>
        )}
      </td>

      {/* 6. Sticky Action Column (Contextual: Primary for Pending Grading, Secondary for View) */}
      <td
        className={cn(
          "sticky right-0 z-10 whitespace-nowrap px-4 text-right transition-colors",
          "bg-white/95 group-hover:bg-slate-50/95 dark:bg-slate-900/95 dark:group-hover:bg-slate-800/95 backdrop-blur-xs",
          "shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.05)]",
          padY,
        )}
      >
        {isPendingGrading ? (
          density === "compact" ? (
            <button
              type="button"
              onClick={onReview}
              title="Chấm bài thi này"
              className="inline-flex size-7 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white shadow-xs hover:bg-[var(--color-primary-hover)] active:scale-95 transition-all cursor-pointer"
            >
              <Pencil className="size-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onReview}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[var(--color-primary-hover)] active:scale-95 transition-all cursor-pointer"
            >
              <Pencil className="size-3.5" />
              Chấm bài
            </button>
          )
        ) : canReview ? (
          density === "compact" ? (
            <button
              type="button"
              onClick={onReview}
              title="Xem chi tiết bài làm & nhận xét"
              className="inline-flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-primary)] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition-all cursor-pointer"
            >
              <Eye className="size-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onReview}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-primary)] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition-all cursor-pointer"
              title="Xem chi tiết bài làm & nhận xét"
            >
              <Eye className="size-3.5" />
              Xem bài làm
            </button>
          )
        ) : (
          <span className="text-xs text-slate-400 italic">Đang làm bài</span>
        )}
      </td>
    </tr>
  );
}
