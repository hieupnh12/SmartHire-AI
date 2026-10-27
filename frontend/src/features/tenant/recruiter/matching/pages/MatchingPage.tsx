import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  FilterX,
  Info,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { matchingApi } from "@/api/tenant/matchingApi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { getApiErrorMessage } from "@/lib/axios";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { LoadingState, Skeleton } from "@/components/ux/Skeleton";
import { Tooltip } from "@/components/ux/Tooltip";
import { cn } from "@/lib/utils";
import { createRankingSocket } from "@/lib/ws";
import { RankingDetail } from "../components/RankingDetail";
import { PREVIEW_JOB_ID, rankingPreview } from "../data/rankingPreview";
import { applicationStatusLabel, button, labels, scoreText } from "../components/rankingUi";
import { useRankingStore } from "../stores/useRankingStore";
import type { RankingConfig, RankingPage as RankingPageType, RankingRow, RankingSummary } from "../types/ranking";

const terminal = new Set(["REJECTED", "WITHDRAWN", "HIRED"]);
const componentScore = (row: RankingRow, key: string) =>
  row.result.components.find((part) => part.key === key)?.score ?? null;

function RankingLoadingState() {
  return (
    <LoadingState label="Đang tải và tính điểm ứng viên" className="space-y-3">
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
        <Skeleton className="h-16 w-full" />
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
        <div className="grid grid-cols-6 gap-4 bg-slate-50 px-4 py-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-3 w-3/4" />
          ))}
        </div>
        {Array.from({ length: 7 }, (_, row) => (
          <div key={row} className="grid grid-cols-6 gap-4 border-t border-slate-100 px-4 py-4">
            {Array.from({ length: 6 }, (_, column) => (
              <Skeleton key={column} className={column === 1 ? "h-5 w-full" : "h-5 w-2/3"} />
            ))}
          </div>
        ))}
      </div>
    </LoadingState>
  );
}

function statusTone(status: string) {
  if (status === "HIRED" || status === "OFFER") return "bg-emerald-50 text-emerald-700";
  if (status === "REJECTED" || status === "WITHDRAWN") return "bg-red-50 text-red-700";
  return "bg-brand-primary/10 text-brand-primary";
}

function getScoreTier(score: number | null) {
  if (score == null) return { text: "text-slate-400", label: "Chưa có", bar: "bg-slate-300" };
  const num = Number(score);
  if (num >= 80) return { text: "text-emerald-700", label: "Xuất sắc", bar: "bg-emerald-500" };
  if (num >= 70) return { text: "text-blue-700", label: "Phù hợp", bar: "bg-blue-500" };
  if (num >= 50) return { text: "text-amber-700", label: "Cân nhắc", bar: "bg-amber-500" };
  return { text: "text-rose-600", label: "Chưa đạt", bar: "bg-rose-500" };
}

function TableScoreCell({ score, showBar = false }: { score: number | null; showBar?: boolean }) {
  if (score == null) {
    return <span className="text-xs italic text-slate-400">Chưa có</span>;
  }
  const num = Number(score);
  const tier = getScoreTier(num);
  return (
    <div className="flex flex-col gap-1">
      <span className={cn("text-xs font-bold tabular-nums", tier.text)}>
        {scoreText(num)}
        <span className="font-normal text-slate-400"> /100</span>
      </span>
      {showBar && (
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn("h-full rounded-full transition-all duration-300", tier.bar)}
            style={{ width: `${Math.min(Math.max(num, 0), 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function RankBadge({ rank }: { rank: number | null }) {
  if (rank === null) {
    return (
      <span
        className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 select-none whitespace-nowrap"
        title="Chưa đủ điều kiện để xếp hạng chính thức"
      >
        Chờ bổ sung
      </span>
    );
  }
  if (rank === 1) {
    return (
      <span
        className="flex size-7 items-center justify-center rounded-full bg-amber-100 border border-amber-300 text-xs font-bold text-amber-900 shadow-2xs"
        title="Hạng 1"
      >
        #1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span
        className="flex size-7 items-center justify-center rounded-full bg-slate-200 border border-slate-300 text-xs font-bold text-slate-800 shadow-2xs"
        title="Hạng 2"
      >
        #2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span
        className="flex size-7 items-center justify-center rounded-full bg-amber-700/10 border border-amber-700/20 text-xs font-bold text-amber-800 shadow-2xs"
        title="Hạng 3"
      >
        #3
      </span>
    );
  }
  return (
    <span className="flex size-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
      #{rank}
    </span>
  );
}

function RankingSummaryBar({
  summary,
}: {
  summary: RankingSummary | undefined;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {/* 1. Tổng ứng viên */}
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] sm:text-sm font-medium text-slate-700">Tổng ứng viên:</span>
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {summary?.totalCandidates ?? 0}
            </span>
            <span className="text-xs text-slate-400">
              ({summary?.activeCandidates ?? 0} đang xét tuyển)
            </span>
          </div>

          <div className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden="true" />

          {/* 2. Đủ kết quả */}
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] sm:text-sm font-medium text-slate-700">Đủ kết quả:</span>
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-700 tabular-nums">
              {summary?.completeCandidates ?? 0}
            </span>
            <span className="text-xs text-slate-400">
              ({(summary?.totalCandidates ?? 0) - (summary?.completeCandidates ?? 0)} chờ bổ sung)
            </span>
          </div>

          <div className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden="true" />

          {/* 3. Ứng viên dẫn đầu */}
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] sm:text-sm font-medium text-slate-700">Ứng viên dẫn đầu:</span>
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-brand-primary tabular-nums">
              {summary?.topScore == null ? "—" : scoreText(summary.topScore)}
            </span>
            {summary?.topCandidateName && (
              <span
                className="max-w-[130px] truncate text-xs font-medium text-slate-500 hidden md:inline"
                title={summary.topCandidateName}
              >
                · {summary.topCandidateName}
              </span>
            )}
          </div>

          <div className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden="true" />

          {/* 4. Điểm trung bình */}
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] sm:text-sm font-medium text-slate-700">Điểm trung bình:</span>
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {summary?.averageScore == null ? "—" : scoreText(summary.averageScore)}
            </span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeightDistributionWidget({ config }: { config: RankingConfig }) {
  const [collapsed, setCollapsed] = useState(false);
  const componentWeights = [
    { key: "skills", label: labels.skills ?? "CV Screening", weight: config.weights.skills ?? 0, bg: "bg-blue-500" },
    { key: "experience", label: labels.experience ?? "Kinh nghiệm", weight: config.weights.experience ?? 0, bg: "bg-indigo-500" },
    { key: "assessment", label: labels.assessment ?? "Assessment", weight: config.weights.assessment ?? 0, bg: "bg-amber-500" },
    { key: "interview", label: labels.interview ?? "AI Interview", weight: config.weights.interview ?? 0, bg: "bg-emerald-500" },
  ];
  const activeWeights = componentWeights.filter((c) => c.weight > 0);
  const skillGroups = Object.entries(config.groups);

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
      {/* Widget Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-brand-primary" aria-hidden="true" />
          <span className="text-[13px] font-semibold text-slate-800">Cơ cấu trọng số tính điểm</span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {config.revision === 0 ? "Theo Job" : `R${config.revision}`}
          </span>
          {config.requiredExperienceMonths > 0 && (
            <span className="text-xs text-slate-500 hidden sm:inline">
              · Yêu cầu kinh nghiệm: <strong className="font-semibold text-slate-700">{config.requiredExperienceMonths} tháng</strong>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="text-xs font-semibold text-brand-primary hover:text-brand-primary-hover transition-colors"
        >
          {collapsed ? "Mở rộng chi tiết ▾" : "Thu gọn ▴"}
        </button>
      </div>

      {/* Segmented Progress Bar */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
        {activeWeights.map((c) => (
          <div
            key={c.key}
            style={{ width: `${c.weight}%` }}
            className={cn("h-full transition-all duration-300", c.bg)}
            title={`${c.label}: ${c.weight}%`}
          />
        ))}
      </div>

      {/* Expanded Details / Legend */}
      {!collapsed && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-0.5 text-xs">
          {/* Component Weights Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {activeWeights.map((c) => (
              <div key={c.key} className="flex items-center gap-1.5">
                <span className={cn("size-2.5 rounded-full shrink-0", c.bg)} aria-hidden="true" />
                <span className="text-slate-600">{c.label}:</span>
                <strong className="font-semibold text-slate-900 tabular-nums">{c.weight}%</strong>
              </div>
            ))}
          </div>

          {/* Skill Categories (Groups) */}
          {skillGroups.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Nhóm kỹ năng:</span>
              {skillGroups.map(([key, val]) => (
                <span key={key} className="rounded-md border border-slate-200/90 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                  {labels[key] ?? key} <strong className="font-semibold text-slate-900">{val}%</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RankingFilterToolbar({
  cohorts,
}: {
  cohorts: string[];
}) {
  const state = useRankingStore();
  const isFiltered =
    state.search !== "" ||
    state.cohort !== "ALL" ||
    state.status !== "ACTIVE" ||
    state.sort !== "score" ||
    state.minimum !== "";

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white p-2 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
      {/* Left: Search input */}
      <div className="relative flex items-center min-w-0 flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 size-4 text-slate-400" aria-hidden="true" />
        <input
          value={state.search}
          onChange={(e) => state.filter({ search: e.target.value })}
          placeholder="Tìm tên ứng viên..."
          aria-label="Tìm tên ứng viên"
          className="h-8.5 w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-9 pr-3 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-brand-primary focus:bg-white focus:ring-1 focus:ring-brand-primary"
        />
      </div>

      {/* Right: 3 Dropdowns + Clear button */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Nhóm đánh giá */}
        <select
          aria-label="Nhóm đánh giá"
          value={state.cohort}
          onChange={(e) => state.filter({ cohort: e.target.value })}
          className="h-8.5 max-w-[200px] cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] font-medium text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary shadow-2xs"
        >
          <option value="ALL">Tất cả nhóm điểm</option>
          <option value="COMPLETE">Đủ kết quả</option>
          {cohorts.map((cohort) => (
            <option key={cohort} value={cohort}>
              {cohort.split("+").map((part) => labels[part] ?? part).join(" + ")}
            </option>
          ))}
        </select>

        {/* Trạng thái */}
        <select
          aria-label="Trạng thái ứng viên"
          value={state.status}
          onChange={(e) => state.filter({ status: e.target.value })}
          className="h-8.5 max-w-[170px] cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] font-medium text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary shadow-2xs"
        >
          <option value="ACTIVE">Đang xét tuyển</option>
          <option value="ALL">Tất cả trạng thái</option>
          {["NEW", "IN_REVIEW", "ASSESSMENT", "INTERVIEW", "HUMAN_INTERVIEW", "OFFER", "HIRED", "REJECTED", "WITHDRAWN"].map((status) => (
            <option key={status} value={status}>
              {labels[status] ?? status}
            </option>
          ))}
        </select>

        {/* Sắp xếp */}
        <select
          aria-label="Sắp xếp ứng viên"
          value={state.sort}
          onChange={(e) => state.filter({ sort: e.target.value })}
          className="h-8.5 max-w-[190px] cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] font-medium text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary shadow-2xs"
        >
          <option value="score">Điểm rank cao nhất</option>
          {(["skills", "experience", "assessment", "interview"] as const).map((part) => (
            <option key={part} value={part}>
              {labels[part] ?? part} cao nhất
            </option>
          ))}
        </select>

        {/* Nút Xóa bộ lọc */}
        {isFiltered && (
          <button
            type="button"
            onClick={() => state.filter({ search: "", cohort: "ALL", status: "ACTIVE", minimum: "", sort: "score" })}
            className="inline-flex h-8.5 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 shadow-2xs"
          >
            <FilterX className="size-3.5" aria-hidden="true" />
            <span>Xóa lọc</span>
          </button>
        )}
      </div>
    </div>
  );
}

function CandidateCard({ row, showRank, onOpen }: { row: RankingRow; showRank: boolean; onOpen: () => void }) {
  const scoreTier = getScoreTier(row.result.score);
  return (
    <article className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
      <div className="flex items-start gap-3">
        <div className="shrink-0 pt-0.5">
          <RankBadge rank={showRank ? row.rank : null} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-slate-900">{row.candidateName}</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Hồ sơ #{row.applicationId} · {row.experienceMonths === null ? "Chưa rõ kinh nghiệm" : `${(row.experienceMonths / 12).toFixed(1)} năm kinh nghiệm`}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", statusTone(row.status))}>
                {applicationStatusLabel(row.status)}
              </span>
              {row.result.complete ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Hoàn chỉnh
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200/80 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  Tạm tính
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
            {[
              { key: "score", label: "Tổng", value: row.result.score, text: scoreTier.text },
              { key: "skills", label: "CV Match", value: componentScore(row, "skills"), text: getScoreTier(componentScore(row, "skills")).text },
              { key: "experience", label: "Kinh nghiệm", value: componentScore(row, "experience"), text: getScoreTier(componentScore(row, "experience")).text },
              { key: "assessment", label: "Assessment", value: componentScore(row, "assessment"), text: getScoreTier(componentScore(row, "assessment")).text },
              { key: "interview", label: "PV AI", value: componentScore(row, "interview"), text: getScoreTier(componentScore(row, "interview")).text },
            ].map((item, index) => (
              <div
                key={item.key}
                className={cn(
                  "rounded-lg bg-slate-50 border border-slate-100 px-2 py-1.5",
                  index === 0 && "col-span-2 sm:col-span-1 bg-brand-primary/5 border-brand-primary/15",
                )}
              >
                <strong className={cn("block text-sm tabular-nums", item.text)}>
                  {scoreText(item.value)}
                </strong>
                <span className="text-[10px] font-medium text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-primary/10 px-3 py-2 text-xs font-semibold text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
            onClick={onOpen}
          >
            <Eye className="size-3.5" aria-hidden="true" />
            Xem hồ sơ và điểm chi tiết
          </button>
        </div>
      </div>
    </article>
  );
}

export function RankingPage() {
  const state = useRankingStore();
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((store) => store.accessToken);
  const sessionKey = useMemo(() => crypto.randomUUID(), [token]);
  const tenantKey = `${getTenantIdFromWindow() ?? ""}:${sessionKey}`;
  const client = useQueryClient();
  const jobId = Number(id);
  const validJobId = Number.isInteger(jobId) && jobId > 0;
  const pageSize = state.pageSize;
  const deferredSearch = useDeferredValue(state.search);
  const isPreview = jobId === PREVIEW_JOB_ID;
  const rankingQuery = {
    page: state.page,
    size: pageSize,
    search: deferredSearch,
    status: state.status,
    cohort: state.cohort,
    minScore: state.minimum === "" ? undefined : Number(state.minimum),
    sort: state.sort,
  };
  const query = useQuery({
    queryKey: ["rankings", tenantKey, jobId, rankingQuery],
    queryFn: () => matchingApi.rankings(jobId, rankingQuery),
    enabled: validJobId && jobId !== PREVIEW_JOB_ID && !!token,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const previewRows = rankingPreview.rows.filter((row) => !terminal.has(row.status));
  const previewBoard: RankingPageType = {
    ...rankingPreview,
    cohorts: [...new Set(rankingPreview.rows.map((row) => row.result.cohort))],
    summary: {
      totalCandidates: rankingPreview.rows.length,
      activeCandidates: previewRows.length,
      scoredCandidates: rankingPreview.rows.length,
      averageScore: rankingPreview.rows.reduce((sum, row) => sum + (row.result.score ?? 0), 0) / rankingPreview.rows.length,
      topCandidateName: rankingPreview.rows[0]?.candidateName ?? null,
      topScore: rankingPreview.rows[0]?.result.score ?? null,
      completeCandidates: rankingPreview.rows.filter((row) => row.result.complete).length,
    },
    page: { number: 0, size: pageSize, totalElements: rankingPreview.rows.length, totalPages: 1 },
  };
  const board = isPreview ? previewBoard : query.data?.data;

  useEffect(() => {
    if (validJobId && state.jobId !== jobId) state.setJob(jobId);
  }, [jobId, state, validJobId]);

  useEffect(() => {
    if (!token || isPreview) return;
    const socket = createRankingSocket(token, (event) => {
      if (event.jobId === jobId) void client.invalidateQueries({ queryKey: ["rankings", tenantKey, jobId] });
    });
    return () => socket?.close();
  }, [client, isPreview, jobId, tenantKey, token]);

  const cohorts = board?.cohorts ?? [];
  const filtered = board?.rows ?? [];
  const page = board?.page.number ?? 0;
  const selected = board?.rows.find((row) => row.applicationId === state.selectedId);
  const summary = board?.summary;

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 text-[var(--color-on-surface)]">
      {!token && (
        <p role="status" className="rounded-xl border border-slate-200 bg-white p-5">
          Đăng nhập bằng tài khoản Recruiter để xem bảng xếp hạng.
        </p>
      )}
      {!validJobId && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700" role="alert">
          Đường dẫn công việc không hợp lệ. <Link className="font-semibold underline" to="/recruiter">Quay lại danh sách công việc</Link>
        </div>
      )}
      {jobId && !isPreview && token && query.isPending && <RankingLoadingState />}
      {jobId && !isPreview && query.isError && (
        <div className="rounded-xl border border-slate-200 bg-white p-6" role="alert">
          {getApiErrorMessage(query.error)} <button className={button} onClick={() => void query.refetch()}>Thử lại</button>
        </div>
      )}

      {board && (
        <>
          {/* 1. Header with Info Tooltip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Xếp hạng ứng viên
              </h1>
              <Tooltip
                content={`Điểm ứng viên cho ${board.jobTitle}. Ở chế độ tất cả nhóm điểm, hồ sơ đủ thành phần được ưu tiên xếp trước; thứ hạng chính thức chỉ dành cho hồ sơ đã hoàn thành đầy đủ các vòng đánh giá.`}
                side="bottom"
                className="max-w-xs text-xs"
              >
                <button
                  type="button"
                  className="inline-flex size-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  aria-label="Thông tin quy tắc xếp hạng"
                >
                  <Info className="size-4" aria-hidden="true" />
                </button>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-mono text-slate-600">
                Snapshot: {board.rankingVersion}
              </span>
              <span className="rounded-md bg-brand-primary/10 px-2.5 py-1 text-xs font-semibold text-brand-primary">
                {board.jobTitle}
              </span>
            </div>
          </div>

          {/* 2. Summary Metrics Strip */}
          <RankingSummaryBar summary={summary} />

          {/* 3. Weight Distribution Widget (Progress Segment Bar) */}
          <WeightDistributionWidget config={board.config} />

          {/* Alert if job skills changed */}
          {board.rows.some((row) => row.notices.includes("JOB_SKILLS_CHANGED")) && (
            <div role="alert" className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
              <AlertTriangle className="size-4 shrink-0 text-amber-600" />
              <span>Nhóm kỹ năng của Job đã thay đổi. Hãy kiểm tra và lưu lại cấu hình trọng số trước khi sử dụng điểm.</span>
            </div>
          )}

          {/* 4. Single-line Filter Toolbar */}
          <RankingFilterToolbar cohorts={cohorts} />

          {/* 5. Candidate Ranking Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
            {/* Mobile View */}
            <div className="grid gap-3 p-4 md:hidden">
              {filtered.map((row) => (
                <CandidateCard
                  key={row.applicationId}
                  row={row}
                  showRank
                  onOpen={() => state.select(row.applicationId)}
                />
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
                <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-700">
                  <tr>
                    <th scope="col" className="whitespace-nowrap border-b border-slate-200/80 py-3 pl-6 pr-3 w-28">
                      Hạng
                    </th>
                    <th scope="col" className="whitespace-nowrap border-b border-slate-200/80 px-4 py-3 min-w-[220px]">
                      Ứng viên
                    </th>
                    <th scope="col" className="whitespace-nowrap border-b border-slate-200/80 px-4 py-3 min-w-[130px]">
                      Điểm tổng
                    </th>
                    <th scope="col" className="whitespace-nowrap border-b border-slate-200/80 px-4 py-3">
                      CV Match
                    </th>
                    <th scope="col" className="whitespace-nowrap border-b border-slate-200/80 px-4 py-3">
                      Kinh nghiệm
                    </th>
                    <th scope="col" className="whitespace-nowrap border-b border-slate-200/80 px-4 py-3">
                      Assessment
                    </th>
                    <th scope="col" className="whitespace-nowrap border-b border-slate-200/80 px-4 py-3">
                      AI Interview
                    </th>
                    <th scope="col" className="whitespace-nowrap border-b border-slate-200/80 px-4 py-3 min-w-[150px]">
                      Trạng thái
                    </th>
                    <th scope="col" className="whitespace-nowrap border-b border-slate-200/80 py-3 pr-6 text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((row) => {
                    const isTop1 = row.rank === 1;
                    const skillsScore = componentScore(row, "skills");
                    const expScore = componentScore(row, "experience");
                    const testScore = componentScore(row, "assessment");
                    const aiScore = componentScore(row, "interview");

                    return (
                      <tr
                        key={row.applicationId}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-slate-50/80",
                          isTop1 && "bg-amber-50/20",
                        )}
                        onClick={() => state.select(row.applicationId)}
                      >
                        {/* Hạng */}
                        <td className="py-3.5 pl-6 pr-3">
                          <RankBadge rank={row.rank} />
                        </td>

                        {/* Ứng viên */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary">
                              {row.candidateName.split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase() || "?"}
                            </span>
                            <div className="min-w-0">
                              <span className="block truncate font-semibold text-slate-900 leading-tight hover:text-brand-primary">
                                {row.candidateName}
                              </span>
                              <p className="mt-0.5 truncate text-xs text-slate-500">
                                Hồ sơ #{row.applicationId} · {row.experienceMonths === null ? "Chưa rõ kinh nghiệm" : `${(row.experienceMonths / 12).toFixed(1)} năm kinh nghiệm`}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Điểm tổng */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-0.5">
                            <span className={cn("text-base font-bold tabular-nums", getScoreTier(row.result.score).text)}>
                              {row.result.score == null ? "—" : scoreText(row.result.score)}
                              <span className="text-xs font-normal text-slate-400"> /100</span>
                            </span>
                            <span className="text-[11px] font-medium text-slate-500">
                              {row.result.availableWeight}% trọng số
                            </span>
                          </div>
                        </td>

                        {/* CV Match */}
                        <td className="px-4 py-3.5">
                          <TableScoreCell score={skillsScore} showBar />
                        </td>

                        {/* Kinh nghiệm */}
                        <td className="px-4 py-3.5">
                          <TableScoreCell score={expScore} />
                        </td>

                        {/* Assessment */}
                        <td className="px-4 py-3.5">
                          <TableScoreCell score={testScore} />
                        </td>

                        {/* AI Interview */}
                        <td className="px-4 py-3.5">
                          <TableScoreCell score={aiScore} />
                        </td>

                        {/* Trạng thái & Độ hoàn chỉnh */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold", statusTone(row.status))}>
                              {applicationStatusLabel(row.status)}
                            </span>
                            {row.result.complete ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2 py-0.2 text-[10px] font-semibold text-emerald-700">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                Hoàn chỉnh
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/80 px-2 py-0.2 text-[10px] font-semibold text-amber-700">
                                <span className="size-1.5 rounded-full bg-amber-500" />
                                Tạm tính
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Thao tác */}
                        <td className="py-3.5 pr-6 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              state.select(row.applicationId);
                            }}
                            className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-primary/10 px-3 text-xs font-semibold text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
                          >
                            Chi tiết
                            <ArrowRight className="size-3.5" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {filtered.length === 0 && (
              <div className="px-6 py-14 text-center">
                <FilterX className="mx-auto size-8 text-slate-400" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold text-slate-800">
                  {board.rows.length === 0 ? "Job chưa có ứng viên" : "Không có ứng viên phù hợp bộ lọc"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh nhóm đánh giá/trạng thái.
                </p>
              </div>
            )}

            {/* Pagination Footer */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5 text-xs text-slate-600">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  Hiển thị <strong className="font-semibold text-slate-900">{board.page.totalElements === 0 ? 0 : page * pageSize + 1}–{Math.min((page + 1) * pageSize, board.page.totalElements)}</strong> trong tổng số <strong className="font-semibold text-slate-900">{board.page.totalElements}</strong> ứng viên
                </span>
                <span aria-hidden="true" className="text-slate-300">•</span>
                <div className="flex items-center gap-1.5">
                  <span className="shrink-0 text-slate-600">Số dòng:</span>
                  <select
                    aria-label="Số dòng mỗi trang"
                    value={String(pageSize)}
                    onChange={(e) => state.setPageSize(Number(e.target.value))}
                    className="h-8 cursor-pointer rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary shadow-2xs"
                  >
                    {[20, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 shadow-2xs"
                  disabled={page === 0}
                  onClick={() => state.setPage(page - 1)}
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="size-3.5" aria-hidden="true" />
                  <span>Trước</span>
                </button>
                <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-brand-primary px-2 text-xs font-semibold text-white shadow-xs">
                  {page + 1}
                </span>
                <span className="text-xs text-slate-400">/ {Math.max(1, board.page.totalPages)}</span>
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 shadow-2xs"
                  disabled={page + 1 >= board.page.totalPages}
                  onClick={() => state.setPage(page + 1)}
                  aria-label="Trang sau"
                >
                  <span>Sau</span>
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {state.selectedId && (
        <RankingDetail
          key={`${tenantKey}:${state.selectedId}`}
          applicationId={state.selectedId}
          previewRow={isPreview ? selected : undefined}
          fallbackRow={!isPreview ? selected : undefined}
          jobId={board?.jobId ?? jobId}
          jobTitle={board?.jobTitle ?? ""}
          tenantKey={tenantKey}
          onClose={() => state.select(null)}
        />
      )}
    </section>
  );
}
