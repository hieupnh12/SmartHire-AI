import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Clock3,
  Copy,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Settings2,
  Users,
  X,
} from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import type { JobTest, TestOrigin, TestStatus } from "@/api/types/assessment";
import { AssessmentError, assessmentStatus } from "@/components/ux/assessmentUi";
import { AssessmentSubNav } from "../components/AssessmentSubNav";
import { TableSkeleton } from "@/components/ux/Skeleton";
import { Tooltip } from "@/components/ux/Tooltip";
import { toast } from "@/stores/toastStore";
import { shortAssessmentTitle } from "@/lib/assessmentTitle";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

type SortKey = "latest" | "title" | "duration";
type StatusFilter = "ALL" | TestStatus;

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

function getPaginationItems(current: number, total: number): (number | "ellipsis-start" | "ellipsis-end")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const showStartEllipsis = current > 4;
  const showEndEllipsis = current < total - 3;

  if (!showStartEllipsis && showEndEllipsis) {
    return [1, 2, 3, 4, 5, "ellipsis-end", total];
  }

  if (showStartEllipsis && !showEndEllipsis) {
    return [1, "ellipsis-start", total - 4, total - 3, total - 2, total - 1, total];
  }

  return [1, "ellipsis-start", current - 1, current, current + 1, "ellipsis-end", total];
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.round(diff / 60_000));
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} giờ trước`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function statusTone(status: TestStatus) {
  if (status === "PUBLISHED") return "bg-emerald-50 text-emerald-700";
  if (status === "DRAFT") return "bg-amber-50 text-amber-800";
  return "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]";
}

function OriginBadge({ origin }: { origin?: TestOrigin }) {
  const ai = origin === "GENERATED";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
        ai
          ? "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      )}
    >
      {ai ? "AI" : "Thường"}
    </span>
  );
}

function StatusBadge({ status }: { status: TestStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", statusTone(status))}>
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "PUBLISHED" && "bg-emerald-500",
          status === "DRAFT" && "bg-amber-500",
          status === "ARCHIVED" && "bg-[var(--color-outline)]",
        )}
      />
      {assessmentStatus[status]}
    </span>
  );
}

export function AssessmentsPage() {
  const job = useRecruitmentJob();
  const basePath = `/recruiter/jobs/${job.id}/assessments`;
  const [params, setParams] = useSearchParams();

  const requestedPage = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
  const rawSize = parseInt(params.get("limit") || params.get("size") || "10", 10);
  const requestedSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(rawSize) ? rawSize : 10;
  const requestedQ = params.get("q") ?? "";
  const requestedSort = (params.get("sort") as SortKey) ?? "latest";
  const requestedStatus = (params.get("status") as StatusFilter) ?? "ALL";
  const initialSort: SortKey = ["latest", "title", "duration"].includes(requestedSort) ? requestedSort : "latest";
  const initialStatus: StatusFilter = ["ALL", "PUBLISHED", "DRAFT", "ARCHIVED"].includes(requestedStatus) ? requestedStatus : "ALL";

  const [page, setPage] = useState(requestedPage);
  const [pageSize, setPageSize] = useState(requestedSize);
  const [query, setQuery] = useState(requestedQ);
  const [sort, setSort] = useState<SortKey>(initialSort);
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [jumpVal, setJumpVal] = useState("");
  const [isTableTransitioning, setIsTableTransitioning] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<"status" | "sort" | "export" | null>(null);

  // Click outside and escape listeners for floating dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-dropdown-root]")) {
        setActiveDropdown(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Sync state if browser Back/Forward or direct URL query changes
  useEffect(() => {
    const p = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
    const raw = parseInt(params.get("limit") || params.get("size") || "10", 10);
    const s = (PAGE_SIZE_OPTIONS as readonly number[]).includes(raw) ? raw : 10;
    const q = params.get("q") ?? "";
    const so = (params.get("sort") as SortKey) ?? "latest";
    const st = (params.get("status") as StatusFilter) ?? "ALL";
    const srt: SortKey = ["latest", "title", "duration"].includes(so) ? so : "latest";
    const stat: StatusFilter = ["ALL", "PUBLISHED", "DRAFT", "ARCHIVED"].includes(st) ? st : "ALL";

    if (p !== page) setPage(p);
    if (s !== pageSize) setPageSize(s);
    if (q !== query) setQuery(q);
    if (srt !== sort) setSort(srt);
    if (stat !== status) setStatus(stat);
  }, [params]);

  const tests = useQuery({
    queryKey: [...queryKeys.assessments.all(), "job", job.id],
    queryFn: () => assessmentApi.listForJob(job.id, { page: 0, size: 100 }),
    refetchInterval: 15000,
  });
  const jobMap = useMemo(() => new Map([[job.id, { title: job.title, department: job.department ?? "" }]]), [job]);

  const jobTitle = (jobId: number) => jobMap.get(jobId)?.title ?? `Job #${jobId}`;

  const allTests = useMemo(() => (tests.data?.items ?? []).filter((item) => item.jobId === job.id), [tests.data, job.id]);

  const counts = useMemo(() => {
    return {
      ALL: allTests.length,
      PUBLISHED: allTests.filter((t) => t.status === "PUBLISHED").length,
      DRAFT: allTests.filter((t) => t.status === "DRAFT").length,
      ARCHIVED: allTests.filter((t) => t.status === "ARCHIVED").length,
    };
  }, [allTests]);

  const filtered = useMemo(() => {
    let rows = [...allTests];
    if (status !== "ALL") {
      rows = rows.filter((item) => item.status === status);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          String(item.id).includes(q) ||
          jobTitle(item.jobId).toLowerCase().includes(q),
      );
    }
    rows.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, "vi");
      if (sort === "duration") return a.durationMinutes - b.durationMinutes;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return rows;
  }, [allTests, job.id, query, sort, status, jobMap]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = useMemo(
    () => filtered.slice(startIndex, startIndex + pageSize),
    [filtered, startIndex, pageSize],
  );
  const pageItems = useMemo(() => getPaginationItems(currentPage, totalPages), [currentPage, totalPages]);

  const triggerTableTransition = (action: () => void) => {
    setIsTableTransitioning(true);
    action();
    setTimeout(() => {
      setIsTableTransitioning(false);
    }, 220);
  };

  const goToPage = (nextPage: number, nextSize: number = pageSize) => {
    const calcTotalPages = Math.max(1, Math.ceil(totalItems / nextSize));
    const target = Math.max(1, Math.min(nextPage, calcTotalPages));
    triggerTableTransition(() => {
      setPage(target);
      if (nextSize !== pageSize) {
        setPageSize(nextSize);
      }
      const nextParams = new URLSearchParams(params);
      nextParams.set("page", String(target));
      nextParams.set("limit", String(nextSize));
      nextParams.delete("size");
      setParams(nextParams, { replace: true });
    });
  };

  const handleQueryChange = (newQ: string) => {
    setQuery(newQ);
    const nextParams = new URLSearchParams(params);
    if (newQ.trim()) nextParams.set("q", newQ.trim());
    else nextParams.delete("q");
    nextParams.set("page", "1");
    nextParams.set("limit", String(pageSize));
    nextParams.delete("size");
    setParams(nextParams, { replace: true });
    setPage(1);
  };

  const handleSortChange = (newSort: SortKey) => {
    setSort(newSort);
    const nextParams = new URLSearchParams(params);
    if (newSort !== "latest") nextParams.set("sort", newSort);
    else nextParams.delete("sort");
    nextParams.set("page", "1");
    nextParams.set("limit", String(pageSize));
    nextParams.delete("size");
    setParams(nextParams, { replace: true });
    setPage(1);
  };

  const handleStatusChange = (newStatus: StatusFilter) => {
    setStatus(newStatus);
    const nextParams = new URLSearchParams(params);
    if (newStatus !== "ALL") nextParams.set("status", newStatus);
    else nextParams.delete("status");
    nextParams.set("page", "1");
    nextParams.set("limit", String(pageSize));
    nextParams.delete("size");
    setParams(nextParams, { replace: true });
    setPage(1);
  };

  useEffect(() => {
    if (!tests.isFetching && totalItems > 0 && page > totalPages) {
      goToPage(totalPages);
    }
  }, [tests.isFetching, totalItems, page, totalPages]);

  const structureQueries = useQueries({
    queries: pageRows.map((test) => ({
      queryKey: queryKeys.assessments.questions(test.id),
      queryFn: () => assessmentApi.questions(test.id),
    })),
  });

  const pageIds = pageRows.map((row) => row.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const toggleAllPage = () => {
    setSelected((prev) => (allPageSelected ? prev.filter((id) => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]));
  };
  const toggleOne = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const exportCsv = (rowsToExport: JobTest[]) => {
    if (rowsToExport.length === 0) {
      toast.warning("Không có dữ liệu bài đánh giá để xuất");
      return;
    }
    const headers = ["Mã đề", "Tên bài đánh giá", "Thời lượng (phút)", "Ngưỡng đạt", "Trạng thái", "Người tạo", "Ngày tạo"];
    const lines = rowsToExport.map((t) => [
      `ASM-${t.id}`,
      `"${(t.title ?? "").replace(/"/g, '""')}"`,
      t.durationMinutes,
      t.passingScore != null ? t.passingScore : "—",
      assessmentStatus[t.status] ?? t.status,
      `"${(t.createdByName ?? "").replace(/"/g, '""')}"`,
      new Date(t.createdAt).toLocaleDateString("vi-VN"),
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...lines.map((l) => l.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Danh_sach_bai_danh_gia_Job_${job.id}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Xuất file CSV thành công", `Đã xuất ${rowsToExport.length} bài đánh giá`);
  };

  return (
    <section className="flex flex-col gap-3.5 text-[var(--color-on-surface)]">
      <AssessmentSubNav jobId={job.id} activeTab="tests" />

      <AssessmentError error={tests.error} retry={() => void tests.refetch()} />

      {/* Thanh tác vụ chọn nhiều (Selection Batch Action Bar) */}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#213145] px-4 py-2.5 text-white shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="grid size-6 place-items-center rounded-full bg-[var(--color-primary)] text-xs font-bold">
              {selected.length}
            </span>
            <span className="font-medium">Đã chọn {selected.length} bài đánh giá</span>
            <button
              type="button"
              className="text-xs text-sky-200 hover:underline cursor-pointer"
              onClick={() => setSelected(pageRows.map((row) => row.id))}
            >
              Chọn toàn bộ {pageRows.length} bài trên trang
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`${basePath}/submissions`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20 transition-colors"
            >
              <Users className="size-3.5" /> Xem bài nộp ứng viên
            </Link>
            <button
              type="button"
              onClick={() => {
                const selectedTests = filtered.filter((t) => selected.includes(t.id));
                exportCsv(selectedTests);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20 transition-colors cursor-pointer"
            >
              <Download className="size-3.5" /> Xuất file CSV ({selected.length})
            </button>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="inline-flex items-center gap-1 rounded-xl bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="size-3.5" /> Bỏ chọn
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        {/* Toolbar với các nút Dropdown Panel hiện đại */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 p-3 bg-white dark:bg-slate-900">
          <div className="flex min-w-[280px] flex-1 flex-wrap items-center gap-2">
            {/* Input tìm kiếm */}
            <div className="relative min-w-[200px] max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-8 text-xs outline-none transition-[box-shadow,border-color] placeholder:text-slate-400 focus:border-[#0066FF] focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/60 dark:focus:bg-slate-900"
                placeholder="Tìm theo tên bài đánh giá, mã đề…"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  aria-label="Xóa tìm kiếm"
                  onClick={() => handleQueryChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Panel: Trạng thái */}
            <div className="relative" data-dropdown-root>
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === "status" ? null : "status")}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                  status !== "ALL"
                    ? "border-blue-300 bg-blue-50 text-[#0066FF] font-semibold dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300 shadow-2xs"
                    : "border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
                )}
                aria-expanded={activeDropdown === "status"}
              >
                <span className={cn(
                  "size-1.5 rounded-full",
                  status === "PUBLISHED" ? "bg-emerald-500" : status === "DRAFT" ? "bg-amber-500" : status === "ARCHIVED" ? "bg-slate-400" : "bg-slate-300"
                )} />
                <span>{status === "ALL" ? "Tất cả trạng thái" : assessmentStatus[status]}</span>
                <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform", activeDropdown === "status" && "rotate-180")} />
              </button>

              {activeDropdown === "status" && (
                <div className="absolute left-0 top-full mt-1.5 z-40 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-50 zoom-in-95">
                  <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Lọc theo trạng thái
                  </p>
                  {[
                    { value: "ALL", label: "Tất cả trạng thái", dot: "bg-slate-400", count: counts.ALL },
                    { value: "PUBLISHED", label: "Đã xuất bản", dot: "bg-emerald-500", count: counts.PUBLISHED },
                    { value: "DRAFT", label: "Bản nháp", dot: "bg-amber-500", count: counts.DRAFT },
                    { value: "ARCHIVED", label: "Lưu trữ", dot: "bg-slate-400", count: counts.ARCHIVED },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        handleStatusChange(item.value as StatusFilter);
                        setActiveDropdown(null);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer",
                        status === item.value
                          ? "bg-blue-50 font-semibold text-[#0066FF] dark:bg-blue-950/60 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn("size-2 rounded-full", item.dot)} />
                        <span>{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400">
                          {item.count}
                        </span>
                        {status === item.value && <Check className="size-3.5 text-[#0066FF]" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dropdown Panel: Sắp xếp */}
            <div className="relative" data-dropdown-root>
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === "sort" ? null : "sort")}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                  sort !== "latest"
                    ? "border-blue-300 bg-blue-50 text-[#0066FF] font-semibold dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300 shadow-2xs"
                    : "border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
                )}
                aria-expanded={activeDropdown === "sort"}
              >
                <span>
                  {sort === "latest" ? "Mới tạo gần đây" : sort === "title" ? "Tên A → Z" : "Thời lượng test"}
                </span>
                <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform", activeDropdown === "sort" && "rotate-180")} />
              </button>

              {activeDropdown === "sort" && (
                <div className="absolute left-0 top-full mt-1.5 z-40 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-50 zoom-in-95">
                  <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Sắp xếp theo
                  </p>
                  {[
                    { value: "latest", label: "Mới tạo gần đây" },
                    { value: "title", label: "Tên bài đánh giá (A → Z)" },
                    { value: "duration", label: "Thời lượng thi" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        handleSortChange(item.value as SortKey);
                        setActiveDropdown(null);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer",
                        sort === item.value
                          ? "bg-blue-50 font-semibold text-[#0066FF] dark:bg-blue-950/60 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                    >
                      <span>{item.label}</span>
                      {sort === item.value && <Check className="size-3.5 text-[#0066FF]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Dropdown Panel: Xuất file */}
            <div className="relative" data-dropdown-root>
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === "export" ? null : "export")}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
                aria-expanded={activeDropdown === "export"}
              >
                <Download className="size-3.5 text-slate-500" />
                <span>Xuất file</span>
                <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform", activeDropdown === "export" && "rotate-180")} />
              </button>

              {activeDropdown === "export" && (
                <div className="absolute right-0 top-full mt-1.5 z-40 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-50 zoom-in-95">
                  <button
                    type="button"
                    onClick={() => {
                      exportCsv(filtered);
                      setActiveDropdown(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="size-4 text-emerald-600" />
                    <div className="text-left">
                      <p className="font-semibold">Xuất toàn bộ bộ lọc</p>
                      <p className="text-[10px] text-slate-400">{filtered.length} bài đánh giá</p>
                    </div>
                  </button>
                  {selected.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const selectedTests = filtered.filter((t) => selected.includes(t.id));
                        exportCsv(selectedTests);
                        setActiveDropdown(null);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-t border-slate-100 dark:border-slate-800"
                    >
                      <FileSpreadsheet className="size-4 text-blue-600" />
                      <div className="text-left">
                        <p className="font-semibold">Xuất bài đã chọn</p>
                        <p className="text-[10px] text-slate-400">{selected.length} bài đã chọn</p>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Nút Cấu hình bài đánh giá */}
            <Link
              to={`${basePath}/new`}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3 text-xs font-semibold text-[var(--color-on-primary)] shadow-xs transition-colors hover:bg-[var(--color-primary-hover)] cursor-pointer"
            >
              <Settings2 className="size-3.5" aria-hidden="true" />
              Cấu hình bài đánh giá
            </Link>
          </div>
        </div>

        {/* Thanh chip bộ lọc đang bật */}
        {(query || status !== "ALL" || sort !== "latest") && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800 px-4 py-2 text-xs bg-slate-50/40 dark:bg-slate-800/20">
            <span className="font-medium text-slate-400">Bộ lọc đang bật:</span>
            {query && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-[#0066FF] dark:bg-blue-950/60 dark:text-blue-300 px-2.5 py-0.5 text-xs font-medium">
                Từ khóa: "{query}"
                <button
                  type="button"
                  onClick={() => handleQueryChange("")}
                  className="rounded-full p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            {status !== "ALL" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-[#0066FF] dark:bg-blue-950/60 dark:text-blue-300 px-2.5 py-0.5 text-xs font-medium">
                Trạng thái: {assessmentStatus[status]}
                <button
                  type="button"
                  onClick={() => handleStatusChange("ALL")}
                  className="rounded-full p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer"
                  aria-label="Xóa lọc trạng thái"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            {sort !== "latest" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-[#0066FF] dark:bg-blue-950/60 dark:text-blue-300 px-2.5 py-0.5 text-xs font-medium">
                Sắp xếp: {sort === "title" ? "Tên A → Z" : "Thời lượng"}
                <button
                  type="button"
                  onClick={() => handleSortChange("latest")}
                  className="rounded-full p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer"
                  aria-label="Xóa sắp xếp"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                handleQueryChange("");
                handleStatusChange("ALL");
                handleSortChange("latest");
              }}
              className="ml-auto text-xs font-semibold text-[#0066FF] hover:underline dark:text-blue-400 cursor-pointer"
            >
              Xóa tất cả bộ lọc
            </button>
          </div>
        )}

        {tests.isPending && (
          <div className="p-4">
            <TableSkeleton columns={6} rows={5} />
          </div>
        )}

        {tests.data && !pageRows.length && (
          <div className="flex flex-col items-start gap-4 p-8">
            <div className="flex items-center gap-3">
              <ClipboardList className="size-8 text-[var(--color-primary)]" aria-hidden="true" />
              <div>
                <p className="font-semibold">Chưa có đề thi nào</p>
                <p className="text-sm text-[var(--color-on-surface-variant)]">
                  {tests.data.items.length === 0
                    ? "Đề thi sẽ được hệ thống tự động bốc từ Ngân hàng câu hỏi khi ứng viên vào vòng Assessment."
                    : "Thử đổi từ khóa hoặc bộ lọc tìm kiếm."}
                </p>
              </div>
            </div>
            {tests.data.items.length === 0 && (
              <Link
                to={`${basePath}/new`}
                className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)]"
              >
                <Settings2 className="size-4" aria-hidden="true" />
                Cấu hình bài đánh giá
              </Link>
            )}
          </div>
        )}

        {pageRows.length > 0 && (
          <>
            <div className={cn("overflow-x-auto transition-opacity", isTableTransitioning && "opacity-50 pointer-events-none")}>
              <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                <thead>
                  <tr className="h-11 bg-[var(--color-surface-container-low)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-outline)]">
                    <th className="w-12 px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        className="size-4 cursor-pointer accent-[var(--color-primary)]"
                        checked={allPageSelected}
                        onChange={toggleAllPage}
                        aria-label="Chọn tất cả trên trang"
                      />
                    </th>
                    <th className="px-4 py-2">Tên bài đánh giá &amp; Mã đề</th>
                    <th className="px-4 py-2">Cấu trúc đề</th>
                    <th className="px-4 py-2">Thời lượng</th>
                    <th className="px-4 py-2">Thang điểm / Đạt</th>
                    <th className="px-4 py-2">Trạng thái</th>
                    <th className="px-4 py-2">Người tạo &amp; Cập nhật</th>
                    <th className="px-4 py-2 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-surface-container-low)]">
                  {pageRows.map((test, index) => {
                    const questions = structureQueries[index]?.data ?? [];
                    return (
                      <AssessmentRow
                        key={test.id}
                        test={test}
                        jobTitle={job.title}
                        basePath={basePath}
                        structure={{
                          count: questions.length,
                          totalPoints: questions.reduce((sum, item) => sum + item.points, 0),
                          loading: Boolean(structureQueries[index]?.isPending),
                        }}
                        checked={selected.includes(test.id)}
                        onToggle={() => toggleOne(test.id)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 4 Nhóm Phân trang Chuẩn UX/UI */}
            <div
              className={cn(
                "flex flex-col gap-3 border-t border-[var(--color-border-default)] bg-slate-50/60 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between transition-opacity",
                isTableTransitioning && "opacity-50 pointer-events-none"
              )}
            >
              {/* Nhóm 1: Thông tin Dữ liệu (Left) */}
              <div className="flex items-center gap-2 text-xs sm:text-[13px] text-slate-600">
                <p>
                  Hiển thị <strong className="font-semibold text-slate-900">{totalItems > 0 ? startIndex + 1 : 0}–{Math.min(startIndex + pageSize, totalItems)}</strong> trên <strong className="font-semibold text-slate-900">{totalItems}</strong> bài đánh giá
                </p>
                <span className="text-slate-300">·</span>
                <span className="tabular-nums">Trang {currentPage} / {totalPages}</span>
                {tests.isFetching && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-primary ml-1" role="status">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    <span className="hidden sm:inline">Đang tải…</span>
                  </span>
                )}
              </div>

              {/* Nhóm 2: Chọn số bản ghi / trang (Center) */}
              <div className="flex items-center justify-start lg:justify-center">
                <label className="flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-600">
                  <span>Hiển thị</span>
                  <select
                    aria-label="Số bài đánh giá mỗi trang"
                    value={pageSize}
                    onChange={(e) => {
                      const nextSize = Number(e.target.value);
                      goToPage(1, nextSize);
                    }}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs sm:text-[13px] font-semibold text-slate-800 shadow-2xs outline-none transition-colors hover:border-brand-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 cursor-pointer"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size} / trang
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Nhóm 3 & 4: Điều hướng & Nhảy trang (Right) */}
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <nav className="flex items-center gap-1" aria-label="Phân trang danh sách bài đánh giá">
                  {/* First Page [|<] */}
                  <button
                    type="button"
                    aria-label="Về trang đầu"
                    title="Về trang đầu (Trang 1)"
                    disabled={currentPage === 1}
                    onClick={() => goToPage(1)}
                    className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronsLeft className="size-4" aria-hidden="true" />
                  </button>

                  {/* Previous [<] */}
                  <button
                    type="button"
                    aria-label="Trang trước"
                    title="Trang trước"
                    disabled={currentPage === 1}
                    onClick={() => goToPage(currentPage - 1)}
                    className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  </button>

                  {/* Page Numbers with Ellipsis */}
                  {pageItems.map((item, idx) => {
                    if (typeof item === "string") {
                      return (
                        <span
                          key={`${item}-${idx}`}
                          className="grid size-8 place-items-center text-xs text-slate-400 select-none"
                          aria-hidden="true"
                        >
                          …
                        </span>
                      );
                    }
                    const isActive = item === currentPage;
                    return (
                      <button
                        key={item}
                        type="button"
                        aria-label={`Trang ${item}`}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => goToPage(item)}
                        className={cn(
                          "grid size-8 place-items-center rounded-lg text-xs font-semibold transition-all cursor-pointer",
                          isActive
                            ? "bg-brand-primary text-white shadow-xs font-bold"
                            : "border border-slate-200 bg-white text-slate-700 hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary"
                        )}
                      >
                        {item}
                      </button>
                    );
                  })}

                  {/* Next [>] */}
                  <button
                    type="button"
                    aria-label="Trang sau"
                    title="Trang sau"
                    disabled={currentPage >= totalPages}
                    onClick={() => goToPage(currentPage + 1)}
                    className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </button>

                  {/* Last Page [>|] */}
                  <button
                    type="button"
                    aria-label="Đến trang cuối"
                    title={`Đến trang cuối (Trang ${totalPages})`}
                    disabled={currentPage >= totalPages}
                    onClick={() => goToPage(totalPages)}
                    className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronsRight className="size-4" aria-hidden="true" />
                  </button>
                </nav>

                <div className="hidden h-4 w-px bg-slate-300 sm:block" />

                {/* Nhóm 4: Nhảy trang nhanh (Jump To Page) */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const target = parseInt(jumpVal, 10);
                    if (!Number.isNaN(target)) {
                      goToPage(target);
                      setJumpVal("");
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-600"
                >
                  <label htmlFor="assessment-jump-page" className="whitespace-nowrap">
                    Đi đến:
                  </label>
                  <input
                    id="assessment-jump-page"
                    type="number"
                    min={1}
                    max={totalPages}
                    value={jumpVal}
                    onChange={(e) => setJumpVal(e.target.value)}
                    placeholder={String(currentPage)}
                    className="h-8 w-13 rounded-lg border border-slate-200 bg-white px-1.5 text-center text-xs font-semibold text-slate-800 shadow-2xs outline-none transition-colors hover:border-brand-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  />
                  <span>Trang</span>
                  <button
                    type="submit"
                    disabled={!jumpVal.trim() || Number(jumpVal) < 1 || Number(jumpVal) > totalPages}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:border-brand-primary hover:bg-brand-primary/5 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  >
                    Đi
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function AssessmentRow({
  test,
  structure,
  checked,
  onToggle,
  jobTitle,
  basePath,
}: {
  test: JobTest;
  structure?: { count: number; totalPoints: number; loading: boolean };
  checked: boolean;
  onToggle: () => void;
  jobTitle?: string | null;
  basePath: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const draft = test.status === "DRAFT";
  const totalPoints = structure?.loading ? null : structure?.totalPoints ?? 0;
  const questionCount = structure?.loading ? null : structure?.count ?? 0;
  const title = shortAssessmentTitle(jobTitle, test.title);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`[data-row-action="${test.id}"]`)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen, test.id]);

  return (
    <tr className="group transition-colors hover:bg-[var(--color-primary-subtle)]">
      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          className="size-4 cursor-pointer accent-[var(--color-primary)]"
          checked={checked}
          onChange={onToggle}
          aria-label={`Chọn ${title}`}
        />
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#0066FF] border border-blue-100 dark:bg-blue-950/60 dark:border-blue-900 dark:text-blue-300">
            <ClipboardList className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <Link
              to={String(test.id)}
              className="block truncate font-semibold transition-colors group-hover:text-[var(--color-primary)] text-slate-900 dark:text-slate-100"
            >
              {title}
            </Link>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">ASM-{test.id}</span>
              <OriginBadge origin={test.origin} />
              {draft && (
                <>
                  <span className="size-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                  <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">Đang biên soạn</span>
                </>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3.5">
        {questionCount === null ? (
          <span className="text-slate-400">Đang tải…</span>
        ) : (
          <>
            <span className="block font-semibold text-slate-900 dark:text-slate-100">{questionCount} câu hỏi</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {questionCount === 0 ? "Chưa có câu hỏi" : "Trắc nghiệm một đáp án"}
            </span>
          </>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3.5">
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
          <Clock3 className="size-3.5 text-slate-400" aria-hidden="true" />
          {test.durationMinutes} phút
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3.5">
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {totalPoints === null ? "…" : totalPoints > 0 ? `${totalPoints} điểm` : "Chưa có điểm"}
          </span>
          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
            {test.passingScore != null ? `Đạt: ≥ ${test.passingScore} điểm` : "Không đặt ngưỡng"}
          </span>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3.5">
        <StatusBadge status={test.status} />
      </td>
      <td className="whitespace-nowrap px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
            {initials(test.createdByName)}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{test.createdByName?.trim() || "Chưa ghi nhận"}</span>
            <span className="text-[11px] text-slate-400">
              {formatRelative(test.updatedAt ?? test.createdAt)}
            </span>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          {draft ? (
            <Link
              to={String(test.id)}
              className="inline-flex h-8 items-center gap-1 rounded-xl bg-amber-50 px-2.5 text-xs font-semibold text-amber-800 border border-amber-200/80 hover:bg-amber-100 transition-colors shadow-2xs"
            >
              <Edit3 className="size-3.5" aria-hidden="true" />
              Chỉnh sửa
            </Link>
          ) : (
            <Link
              to={String(test.id)}
              className="inline-flex h-8 items-center gap-1 rounded-xl bg-blue-50 px-2.5 text-xs font-semibold text-[#0066FF] border border-blue-200/80 hover:bg-blue-100 transition-colors shadow-2xs"
            >
              <Eye className="size-3.5" aria-hidden="true" />
              Xem đề
            </Link>
          )}

          <Tooltip content="Xem bài nộp của ứng viên" side="top">
            <Link
              to={`${basePath}/submissions?testId=${test.id}`}
              aria-label="Xem bài nộp của ứng viên"
              className="inline-flex size-8 items-center justify-center rounded-xl text-slate-500 hover:bg-blue-50 hover:text-[#0066FF] transition-colors border border-transparent hover:border-blue-200/60"
            >
              <Users className="size-4" />
            </Link>
          </Tooltip>

          <div className="relative" data-row-action={test.id}>
            <Tooltip content="Tùy chọn khác" side="top">
              <button
                type="button"
                aria-label="Tùy chọn khác"
                onClick={() => setMenuOpen((prev) => !prev)}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-xl text-slate-500 transition-colors cursor-pointer",
                  menuOpen
                    ? "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white"
                    : "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800"
                )}
              >
                <MoreVertical className="size-4" />
              </button>
            </Tooltip>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-40 w-48 rounded-2xl bg-white dark:bg-slate-900 p-1.5 text-left text-xs shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in-50 zoom-in-95">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  onClick={() => {
                    void navigator.clipboard.writeText(`ASM-${test.id}`);
                    setMenuOpen(false);
                    toast.success("Đã sao chép mã đề ASM-" + test.id);
                  }}
                >
                  <Copy className="size-3.5 text-slate-500" /> Sao chép mã đề
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  onClick={() => {
                    void navigator.clipboard.writeText(test.title);
                    setMenuOpen(false);
                    toast.success("Đã sao chép tên bài đánh giá");
                  }}
                >
                  <Copy className="size-3.5 text-slate-500" /> Sao chép tên bài thi
                </button>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <Link
                  to={`${basePath}/submissions?testId=${test.id}`}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <Users className="size-3.5 text-blue-600" /> Bài nộp ứng viên
                </Link>
                <Link
                  to={String(test.id)}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <Eye className="size-3.5 text-slate-600" /> Chi tiết bài đánh giá
                </Link>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
