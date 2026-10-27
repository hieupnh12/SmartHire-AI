import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Clock3,
  Edit3,
  Eye,
  Loader2,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import type { JobTest, TestStatus } from "@/api/types/assessment";
import { AssessmentError, assessmentStatus } from "@/components/ux/assessmentUi";
import { Breadcrumb } from "@/components/ux/Breadcrumb";
import { TableSkeleton } from "@/components/ux/Skeleton";
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

  const filtered = useMemo(() => {
    let rows = [...(tests.data?.items ?? [])].filter((item) => item.jobId === job.id);
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
  }, [tests.data, job.id, query, sort, status, jobMap]);

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

  return (
    <section className="flex flex-col gap-3 text-[var(--color-on-surface)]">
      <Breadcrumb
        items={[
          { label: "Tuyển dụng", to: "/recruiter" },
          { label: job.title, to: `/recruiter/jobs/${job.id}` },
          { label: "Bài đánh giá năng lực" },
        ]}
        actions={
          <>
            <Link
              to={`${basePath}/submissions`}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary-subtle)] px-3 text-sm font-semibold text-[var(--color-primary-hover)] transition-colors hover:bg-[var(--color-primary-soft)]"
            >
              <Users className="size-4" aria-hidden="true" />
              Theo dõi bài làm
            </Link>
            <Link
              to={`${basePath}/question-bank`}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary-subtle)] px-3 text-sm font-semibold text-[var(--color-primary-hover)] transition-colors hover:bg-[var(--color-primary-soft)]"
            >
              Ngân hàng câu hỏi
            </Link>
            <Link
              to={`${basePath}/new`}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 text-sm font-semibold text-[var(--color-on-primary)] shadow-sm transition-colors hover:bg-[var(--color-primary-hover)]"
            >
              <Plus className="size-4" aria-hidden="true" />
              Cấu hình tạo đề
            </Link>
          </>
        }
      />

      <AssessmentError error={tests.error} retry={() => void tests.refetch()} />

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] shadow-[var(--shadow-card)]">
        <div className="grid grid-cols-1 gap-3 border-b border-[var(--color-border-default)] p-3 md:grid-cols-12">
          <label className="relative md:col-span-6">
            <span className="sr-only">Tìm kiếm bài đánh giá</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" aria-hidden="true" />
            <input
              className="h-10 w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] pl-10 pr-3 text-sm outline-none transition-[box-shadow,border-color] placeholder:text-[var(--color-outline)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              placeholder="Tìm theo tên bài đánh giá, mã đề…"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
            />
          </label>
          <label className="md:col-span-3">
            <span className="sr-only">Trạng thái</span>
            <select
              className="h-10 w-full appearance-none rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] px-3 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 cursor-pointer"
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as StatusFilter)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PUBLISHED">Đã xuất bản</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="ARCHIVED">Lưu trữ</option>
            </select>
          </label>
          <label className="md:col-span-3">
            <span className="sr-only">Sắp xếp</span>
            <select
              className="h-10 w-full appearance-none rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] px-3 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 cursor-pointer"
              value={sort}
              onChange={(e) => handleSortChange(e.target.value as SortKey)}
            >
              <option value="latest">Mới tạo gần đây</option>
              <option value="title">Tên A → Z</option>
              <option value="duration">Thời lượng test</option>
            </select>
          </label>
        </div>

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
                <p className="font-semibold">Chưa có bài đánh giá phù hợp</p>
                <p className="text-sm text-[var(--color-on-surface-variant)]">
                  {tests.data.items.length === 0 ? "Tạo đề mới cho vị trí đang mở." : "Thử đổi từ khóa hoặc bộ lọc tìm kiếm."}
                </p>
              </div>
            </div>
            {tests.data.items.length === 0 && (
              <Link
                to={`${basePath}/new`}
                className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)]"
              >
                <Plus className="size-4" aria-hidden="true" />
                Tạo bài đánh giá
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
}: {
  test: JobTest;
  structure?: { count: number; totalPoints: number; loading: boolean };
  checked: boolean;
  onToggle: () => void;
  jobTitle?: string | null;
}) {
  const draft = test.status === "DRAFT";
  const totalPoints = structure?.loading ? null : structure?.totalPoints ?? 0;
  const questionCount = structure?.loading ? null : structure?.count ?? 0;
  const title = shortAssessmentTitle(jobTitle, test.title);

  return (
    <tr className="group transition-colors hover:bg-[var(--color-primary-subtle)]">
      <td className="px-4 py-3.5 text-center">
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
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--color-surface-container)] text-[var(--color-primary)]">
            <ClipboardList className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <Link
              to={String(test.id)}
              className="block truncate font-semibold transition-colors group-hover:text-[var(--color-primary)]"
            >
              {title}
            </Link>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-[var(--color-outline)]">Mã: ASM-{test.id}</span>
              {draft && (
                <>
                  <span className="size-1 rounded-full bg-[var(--color-outline-variant)]" />
                  <span className="text-[11px] font-medium text-[var(--color-secondary)]">Đang biên soạn</span>
                </>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3.5">
        {questionCount === null ? (
          <span className="text-[var(--color-outline)]">Đang tải…</span>
        ) : (
          <>
            <span className="block font-semibold">{questionCount} câu hỏi</span>
            <span className="text-[11px] text-[var(--color-outline)]">
              {questionCount === 0 ? "Chưa có câu hỏi" : "Trắc nghiệm một đáp án"}
            </span>
          </>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3.5">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Clock3 className="size-3.5 text-[var(--color-outline)]" aria-hidden="true" />
          {test.durationMinutes} phút
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3.5">
        <div className="flex flex-col">
          <span className="font-semibold">
            {totalPoints === null ? "…" : totalPoints > 0 ? `${totalPoints} điểm` : "Chưa có điểm"}
          </span>
          <span className="text-[11px] font-medium text-emerald-700">
            {test.passingScore != null ? `Đạt: ≥ ${test.passingScore} điểm` : "Không đặt ngưỡng"}
          </span>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3.5">
        <StatusBadge status={test.status} />
      </td>
      <td className="whitespace-nowrap px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-full bg-[var(--color-secondary-container)] text-[10px] font-bold text-[var(--color-on-surface)]">
            {initials(test.createdByName)}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold">{test.createdByName?.trim() || "Chưa ghi nhận"}</span>
            <span className="text-[11px] text-[var(--color-outline)]">
              {formatRelative(test.updatedAt ?? test.createdAt)}
            </span>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3.5 text-right">
        {draft ? (
          <Link
            to={String(test.id)}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-[var(--color-primary-soft)] px-2.5 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20"
          >
            <Edit3 className="size-3.5" aria-hidden="true" />
            Chỉnh sửa
          </Link>
        ) : (
          <Link
            to={String(test.id)}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-[var(--color-primary)] px-2.5 text-xs font-medium text-[var(--color-on-primary)] shadow-sm hover:bg-[var(--color-primary-hover)]"
          >
            <Eye className="size-3.5" aria-hidden="true" />
            Xem đề
          </Link>
        )}
      </td>
    </tr>
  );
}
