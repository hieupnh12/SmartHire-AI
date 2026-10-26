import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Clock3,
  Edit3,
  Eye,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import type { JobTest, TestStatus } from "@/api/types/assessment";
import { AssessmentError, assessmentStatus } from "@/components/ux/assessmentUi";
import { Breadcrumb } from "@/components/ux/Breadcrumb";
import { Button } from "@/components/ux/Button";
import { shortAssessmentTitle } from "@/lib/assessmentTitle";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

type SortKey = "latest" | "title" | "duration";

const PAGE_SIZE = 5;

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
  const [query, setQuery] = useState("");
  const jobFilter = job.id;
  const [sort, setSort] = useState<SortKey>("latest");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);

  const tests = useQuery({
    queryKey: [...queryKeys.assessments.all(), "job", job.id],
    queryFn: () => assessmentApi.listForJob(job.id),
    refetchInterval: 15000,
  });
  const jobMap = useMemo(() => new Map([[job.id, { title: job.title, department: job.department ?? "" }]]), [job]);

  const jobTitle = (jobId: number) => jobMap.get(jobId)?.title ?? `Job #${jobId}`;

  const filtered = useMemo(() => {
    let rows = [...(tests.data?.items ?? [])].filter((item) => item.jobId === jobFilter);
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
  }, [tests.data, jobFilter, query, sort, jobMap]);

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

  const resetPage = () => setPage(0);

  return (
    <section className="flex flex-col gap-3 text-[var(--color-on-surface)]">
      <Breadcrumb
        items={[{ label: "Tuyển dụng" }, { label: "Bài đánh giá năng lực" }]}
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
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 text-sm font-semibold text-[var(--color-on-primary)] shadow-sm transition-colors hover:bg-[var(--color-primary-hover)]"
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
          <label className="relative md:col-span-9">
            <span className="sr-only">Tìm kiếm bài đánh giá</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" aria-hidden="true" />
            <input
              className="h-10 w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] pl-10 pr-3 text-sm outline-none transition-[box-shadow,border-color] placeholder:text-[var(--color-outline)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
              placeholder="Tìm theo tên bài đánh giá, mã đề…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                resetPage();
              }}
            />
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
                  {tests.data.items.length === 0 ? "Tạo đề mới cho vị trí đang mở." : "Thử đổi từ khóa tìm kiếm."}
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

            <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--color-border-default)] px-4 py-3 sm:flex-row">
              <p className="text-sm text-[var(--color-outline)]">
                Hiển thị{" "}
                <span className="font-semibold text-[var(--color-on-surface)]">
                  {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)}
                </span>{" "}
                của <span className="font-semibold text-[var(--color-on-surface)]">{filtered.length}</span> bài đánh giá

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
