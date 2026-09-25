import { useMemo, useState, type ReactNode } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  Archive,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Clock3,
  Edit3,
  Eye,
  FileEdit,
  Lightbulb,
  Plus,
  Search,
  Target,
} from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import { jobApi } from "@/api/tenant/jobApi";
import type { JobTest, TestStatus } from "@/api/types/assessment";
import { AssessmentError, assessmentStatus } from "@/components/ux/assessmentUi";
import { Button } from "@/components/ux/Button";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

type StatusTab = "ALL" | TestStatus;
type SortKey = "latest" | "title" | "duration";

const PAGE_SIZE = 5;
const FETCH_SIZE = 50;

const tabs: { id: StatusTab; label: string }[] = [
  { id: "ALL", label: "Tất cả bài thi" },
  { id: "PUBLISHED", label: "Đã xuất bản" },
  { id: "DRAFT", label: "Bản nháp" },
  { id: "ARCHIVED", label: "Lưu trữ" },
];

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

function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  footer,
  tone = "primary",
}: {
  label: string;
  value: number;
  unit: string;
  icon: typeof ClipboardList;
  footer: ReactNode;
  tone?: "primary" | "success" | "warning" | "muted";
}) {
  const tones = {
    primary: {
      value: "text-[var(--color-on-surface)]",
      iconWrap: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
      blob: "bg-[var(--color-surface-container-low)]",
    },
    success: {
      value: "text-emerald-700",
      iconWrap: "bg-emerald-50 text-emerald-700",
      blob: "bg-emerald-50",
    },
    warning: {
      value: "text-amber-700",
      iconWrap: "bg-amber-50 text-amber-700",
      blob: "bg-amber-50",
    },
    muted: {
      value: "text-[var(--color-on-surface-variant)]",
      iconWrap: "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]",
      blob: "bg-[var(--color-surface-container)]",
    },
  }[tone];

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-ambient)]">
      <div className={cn("pointer-events-none absolute -right-4 -top-4 size-24 rounded-full opacity-60 transition-transform group-hover:scale-110", tones.blob)} />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-outline)]">{label}</span>
          <p className={cn("mt-1 text-3xl font-semibold tracking-tight", tones.value)}>
            {value.toLocaleString("vi-VN")}{" "}
            <span className="text-base font-semibold text-[var(--color-on-surface-variant)]">{unit}</span>
          </p>
        </div>
        <div className={cn("grid size-11 place-items-center rounded-xl", tones.iconWrap)}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
      <div className="relative z-10 mt-4 flex items-center justify-between gap-2 text-xs text-[var(--color-on-surface-variant)]">
        {footer}
      </div>
    </div>
  );
}

export function AssessmentsPage() {
  const { id: scopedJobId } = useParams<{ id?: string }>();
  const scopedJob = Number(scopedJobId);
  const hasScopedJob = Number.isSafeInteger(scopedJob) && scopedJob > 0;
  const [tab, setTab] = useState<StatusTab>("ALL");
  const [query, setQuery] = useState("");
  const [jobFilter, setJobFilter] = useState<number | "">(hasScopedJob ? scopedJob : "");
  const [sort, setSort] = useState<SortKey>("latest");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);

  const tests = useQuery({
    queryKey: [...queryKeys.assessments.list(0), FETCH_SIZE],
    queryFn: () => assessmentApi.list(0, FETCH_SIZE),
  });
  const jobs = useQuery({
    queryKey: [...queryKeys.assessments.all(), "jobs-list"],
    queryFn: () => jobApi.search({ page: 0, size: 50 }),
  });

  const jobMap = useMemo(() => {
    const map = new Map<number, { title: string; department: string | null }>();
    for (const job of jobs.data?.data.items ?? []) {
      map.set(job.id, { title: job.title, department: job.department ?? null });
    }
    return map;
  }, [jobs.data]);

  const jobTitle = (jobId: number) => jobMap.get(jobId)?.title ?? `Job #${jobId}`;
  const jobDepartment = (jobId: number) => jobMap.get(jobId)?.department;

  const counts = useMemo(() => {
    const items = tests.data?.items ?? [];
    return {
      all: tests.data?.total ?? items.length,
      published: items.filter((item) => item.status === "PUBLISHED").length,
      draft: items.filter((item) => item.status === "DRAFT").length,
      archived: items.filter((item) => item.status === "ARCHIVED").length,
    };
  }, [tests.data]);

  const filtered = useMemo(() => {
    let rows = [...(tests.data?.items ?? [])];
    if (tab !== "ALL") rows = rows.filter((item) => item.status === tab);
    if (jobFilter !== "") rows = rows.filter((item) => item.jobId === jobFilter);
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
  }, [tests.data, tab, jobFilter, query, sort, jobMap]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

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

  const activeRate = counts.all ? Math.round((counts.published / Math.max(counts.all, 1)) * 1000) / 10 : 0;

  const jobDistribution = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of tests.data?.items ?? []) {
      map.set(item.jobId, (map.get(item.jobId) ?? 0) + 1);
    }
    const total = Math.max(1, tests.data?.items.length ?? 1);
    return [...map.entries()]
      .map(([jobId, count]) => ({ jobId, count, percent: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [tests.data]);

  const resetPage = () => setPage(0);

  return (
    <section className="flex flex-col gap-8 text-[var(--color-on-surface)]">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <nav className="flex flex-wrap items-center gap-1 text-xs text-[var(--color-on-surface-variant)]" aria-label="Breadcrumb">
            <span>Tuyển dụng</span>
            <span className="text-[var(--color-outline)]">/</span>
            <span className="font-semibold text-[var(--color-primary)]">Bài đánh giá năng lực</span>
          </nav>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Quản lý bài đánh giá năng lực</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">
            Thiết lập và theo dõi các bài test chuyên môn gắn với vị trí tuyển dụng — tạo nháp, thêm câu hỏi trắc nghiệm, rồi xuất bản khi sẵn sàng.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <Link
            to="/recruiter/assessments/question-bank"
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--color-primary)] bg-[var(--color-primary-subtle)] px-4 text-sm font-semibold text-[var(--color-primary-hover)] transition-colors hover:bg-[var(--color-primary-soft)]"
          >
            Ngân hàng câu hỏi
          </Link>
          <Link
            to={hasScopedJob ? "new" : "/recruiter/assessments/excel-template"}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-on-primary)] shadow-sm transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            <Plus className="size-4" aria-hidden="true" />
            Tạo bài đánh giá
          </Link>
        </div>
      </header>

      <AssessmentError error={tests.error} retry={() => void tests.refetch()} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Hệ thống bài thi"
          value={counts.all}
          unit="bài"
          icon={ClipboardList}
          tone="primary"
          footer={
            <>
              <span className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)]">
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
                {counts.published} đang xuất bản
              </span>
              <span className="text-[var(--color-outline)]">toàn bộ thư viện</span>
            </>
          }
        />
        <MetricCard
          label="Đang kích hoạt"
          value={counts.published}
          unit="bài"
          icon={CheckCircle2}
          tone="success"
          footer={
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {activeRate}% vận hành
              </span>
              <span className="text-[var(--color-outline)]">sẵn sàng thi</span>
            </>
          }
        />
        <MetricCard
          label="Bản nháp"
          value={counts.draft}
          unit="bài"
          icon={FileEdit}
          tone="warning"
          footer={
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
                <span className="size-1.5 rounded-full bg-amber-500" />
                Chưa xuất bản
              </span>
              <span className="text-[var(--color-outline)]">cần hoàn thiện</span>
            </>
          }
        />
        <MetricCard
          label="Đã lưu trữ"
          value={counts.archived}
          unit="bài"
          icon={Archive}
          tone="muted"
          footer={
            <>
              <span className="font-medium text-[var(--color-on-surface-variant)]">Không còn giao thi</span>
              <span className="text-[var(--color-outline)]">lưu để tra cứu</span>
            </>
          }
        />
      </div>

      <div className="flex flex-col items-start justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-gradient-to-r from-[var(--color-surface-container-low)] via-[var(--color-surface-card)] to-[var(--color-surface-container-low)] p-5 shadow-[var(--shadow-card)] lg:flex-row lg:items-center">
        <div className="flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm">
            <Lightbulb className="size-6" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">Quy trình tạo đề chuẩn</h2>
              <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary-hover)]">
                3 bước
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">
              <strong className="font-semibold text-[var(--color-on-surface)]">1. Tạo bản nháp</strong>
              {" → "}
              <strong className="font-semibold text-[var(--color-on-surface)]">2. Thêm câu hỏi & đáp án</strong>
              {" → "}
              <strong className="font-semibold text-[var(--color-on-surface)]">3. Xuất bản</strong> để ứng viên bắt đầu làm bài.
            </p>
          </div>
        </div>
        <Link
          to="/recruiter/assessments/excel-template"
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-on-primary)] shadow-sm hover:bg-[var(--color-primary-hover)]"
        >
          <Plus className="size-4" aria-hidden="true" />
          Bắt đầu tạo đề
        </Link>
      </div>

      <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[var(--color-surface-container-low)]/80 p-1">
          {tabs.map((item) => {
            const count =
              item.id === "ALL" ? counts.all : item.id === "PUBLISHED" ? counts.published : item.id === "DRAFT" ? counts.draft : counts.archived;
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
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <label className="relative md:col-span-5">
            <span className="sr-only">Tìm kiếm bài đánh giá</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" aria-hidden="true" />
            <input
              className="h-10 w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] pl-10 pr-3 text-sm outline-none transition-[box-shadow,border-color] placeholder:text-[var(--color-outline)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              placeholder="Tìm theo tên bài đánh giá, mã đề, vị trí…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                resetPage();
              }}
            />
          </label>
          <label className="md:col-span-4">
            <span className="sr-only">Lọc theo vị trí</span>
            <select
              className="h-10 w-full appearance-none rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] px-3 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              value={jobFilter}
              onChange={(e) => {
                setJobFilter(e.target.value ? Number(e.target.value) : "");
                resetPage();
              }}
            >
              <option value="">Vị trí: Tất cả ({jobs.data?.data.items.length ?? 0})</option>
              {(jobs.data?.data.items ?? []).map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </label>
          <label className="md:col-span-3">
            <span className="sr-only">Sắp xếp</span>
            <select
              className="h-10 w-full appearance-none rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] px-3 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as SortKey);
                resetPage();
              }}
            >
              <option value="latest">Mới tạo gần đây</option>
              <option value="title">Tên A → Z</option>
              <option value="duration">Thời lượng test</option>
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] shadow-[var(--shadow-card)]">
        {tests.isPending && (
          <p className="p-6 text-sm text-[var(--color-on-surface-variant)]" role="status">
            Đang tải đề kiểm tra…
          </p>
        )}

        {tests.data && !pageRows.length && (
          <div className="flex flex-col items-start gap-4 p-8">
            <div className="flex items-center gap-3">
              <ClipboardList className="size-8 text-[var(--color-primary)]" aria-hidden="true" />
              <div>
                <p className="font-semibold">Chưa có bài đánh giá phù hợp</p>
                <p className="text-sm text-[var(--color-on-surface-variant)]">
                  {tests.data.items.length === 0 ? "Tạo đề mới rồi gắn với vị trí tuyển dụng." : "Thử đổi bộ lọc hoặc từ khóa tìm kiếm."}
                </p>
              </div>
            </div>
            {tests.data.items.length === 0 && (
              <Link
                to="/recruiter/assessments/excel-template"
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
            <div className="overflow-x-auto">
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
                    <th className="px-4 py-2">Vị trí &amp; Bộ phận</th>
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
                        jobTitle={jobTitle(test.jobId)}
                        department={jobDepartment(test.jobId)}
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

            <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--color-border-default)] px-4 py-3 sm:flex-row">
              <p className="text-sm text-[var(--color-outline)]">
                Hiển thị{" "}
                <span className="font-semibold text-[var(--color-on-surface)]">
                  {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)}
                </span>{" "}
                của <span className="font-semibold text-[var(--color-on-surface)]">{filtered.length}</span> bài đánh giá
                {(tests.data?.total ?? 0) > FETCH_SIZE && (
                  <span className="text-[var(--color-outline)]"> · đang xem {FETCH_SIZE}/{tests.data?.total} mới nhất</span>
                )}
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
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={safePage >= pageCount - 1}
                  aria-label="Trang cuối"
                  onClick={() => setPage(pageCount - 1)}
                >
                  <ChevronsRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mb-2 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col justify-between rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-[var(--shadow-card)]">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold">Phân bổ theo trạng thái</h3>
              <Target className="size-5 text-[var(--color-outline)]" aria-hidden="true" />
            </div>
            <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">Tỷ lệ đề trong thư viện đang tải.</p>
            <div className="mt-4 space-y-3">
              {[
                { label: "Đã xuất bản", count: counts.published, color: "bg-emerald-500", text: "text-emerald-700" },
                { label: "Bản nháp", count: counts.draft, color: "bg-amber-500", text: "text-amber-700" },
                { label: "Lưu trữ", count: counts.archived, color: "bg-[var(--color-outline)]", text: "text-[var(--color-on-surface-variant)]" },
              ].map((row) => {
                const pct = counts.all ? Math.round((row.count / Math.max(counts.all, 1)) * 100) : 0;
                return (
                  <div key={row.label}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-medium">{row.label}</span>
                      <span className={cn("font-bold", row.text)}>
                        {pct}% ({row.count})
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-container)]">
                      <div className={cn("h-full rounded-full", row.color)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-[var(--shadow-card)]">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold">Vị trí có nhiều đề nhất</h3>
              <ClipboardList className="size-5 text-[var(--color-outline)]" aria-hidden="true" />
            </div>
            <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">Dựa trên các đề đang hiển thị trong thư viện.</p>
            <div className="mt-4 space-y-2">
              {jobDistribution.length === 0 && <p className="text-sm text-[var(--color-on-surface-variant)]">Chưa có dữ liệu.</p>}
              {jobDistribution.map((row, index) => (
                <div key={row.jobId} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-surface-container-low)]/70 p-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                        index === 0
                          ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                          : "bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)]",
                      )}
                    >
                      {index + 1}
                    </div>
                    <span className="truncate text-sm font-medium">{jobTitle(row.jobId)}</span>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-[var(--color-primary)]">{row.count} đề</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-gradient-to-br from-[var(--color-surface-card)] to-[var(--color-surface-container-low)] p-5 shadow-[var(--shadow-card)]">
          <div>
            <div className="flex items-center gap-2">
              <Plus className="size-5 text-[var(--color-primary)]" aria-hidden="true" />
              <h3 className="text-base font-semibold">Tạo đề mới nhanh</h3>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-[var(--color-on-surface-variant)]">
              Chọn vị trí tuyển dụng, đặt thời lượng và điểm đạt, rồi thêm câu hỏi trắc nghiệm trước khi xuất bản.
            </p>
            <div className="mt-4 rounded-xl bg-[var(--color-surface-card)] p-4 text-center">
              <ClipboardList className="mx-auto size-8 text-[var(--color-primary)]" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold">Sẵn sàng soạn đề?</p>
              <p className="mt-0.5 text-xs text-[var(--color-outline)]">Mỗi đề gắn với một job trong tenant</p>
            </div>
          </div>
          <Link
            to="/recruiter/assessments/excel-template"
            className="mt-4 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-on-primary)] shadow-sm hover:bg-[var(--color-primary-hover)]"
          >
            <Plus className="size-4" aria-hidden="true" />
            Tạo bài đánh giá
          </Link>
        </div>
      </div>
    </section>
  );
}

function AssessmentRow({
  test,
  jobTitle,
  department,
  structure,
  checked,
  onToggle,
}: {
  test: JobTest;
  jobTitle: string;
  department?: string | null;
  structure?: { count: number; totalPoints: number; loading: boolean };
  checked: boolean;
  onToggle: () => void;
}) {
  const draft = test.status === "DRAFT";
  const totalPoints = structure?.loading ? null : structure?.totalPoints ?? 0;
  const questionCount = structure?.loading ? null : structure?.count ?? 0;

  return (
    <tr className="group transition-colors hover:bg-[var(--color-primary-subtle)]">
      <td className="px-4 py-3.5 text-center">
        <input
          type="checkbox"
          className="size-4 cursor-pointer accent-[var(--color-primary)]"
          checked={checked}
          onChange={onToggle}
          aria-label={`Chọn ${test.title}`}
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
              {test.title}
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
        <span className="block font-medium">{jobTitle}</span>
        <span className="mt-0.5 inline-block rounded bg-[var(--color-surface-container)] px-2 py-0.5 text-[11px] text-[var(--color-on-surface-variant)]">
          {department || "Chưa gán bộ phận"}
        </span>
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
            —
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold">Chưa ghi nhận</span>
            <span className="text-[11px] text-[var(--color-outline)]">{formatRelative(test.createdAt)}</span>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1">
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
          <Link
            to={String(test.id)}
            className="grid size-8 place-items-center rounded-lg text-[var(--color-outline)] transition-colors hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]"
            title="Chi tiết"
            aria-label={`Chi tiết ${test.title}`}
          >
            <Eye className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </td>
    </tr>
  );
}
