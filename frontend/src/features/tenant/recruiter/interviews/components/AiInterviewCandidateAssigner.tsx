import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ChevronDown,
  Clock3,
  Filter,
  Loader2,
  PlusCircle,
  RefreshCw,
  Search,
  Sparkles,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { aiInterviewApi } from "@/api/tenant/aiInterviewApi";
import { TableSkeleton } from "@/components/ux/Skeleton";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";
import { useJobAiInterviews } from "../hooks/useJobAiInterviews";
import { AiStatusBadge } from "./aiInterviewUi";

type StatusFilter = "ALL" | "UNASSIGNED" | "ASSIGNED";

type Props = {
  jobId: number;
  onOpenDetail?: (interviewId: number) => void;
};

function initials(name?: string | null) {
  if (!name) return "UV";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "UV";
}

export function AiInterviewCandidateAssigner({ jobId, onOpenDetail }: Props) {
  const client = useQueryClient();
  const { interviews, applicants, rows } = useJobAiInterviews(jobId);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<"status" | null>(null);

  // Map of applicationId -> AiInterview
  const interviewByAppId = useMemo(() => {
    const map = new Map<number, (typeof rows)[number]>();
    for (const r of rows) {
      map.set(r.applicationId, r);
    }
    return map;
  }, [rows]);

  // Eligible applicants: not archived, not rejected, not withdrawn
  const eligibleApplicants = useMemo(() => {
    const list = applicants.data ?? [];
    return list.filter((a) => !a.archived && a.status !== "REJECTED" && a.status !== "WITHDRAWN");
  }, [applicants.data]);

  // Counts
  const counts = useMemo(() => {
    const total = eligibleApplicants.length;
    const assigned = eligibleApplicants.filter((a) => interviewByAppId.has(a.id)).length;
    const unassigned = total - assigned;
    return { total, assigned, unassigned };
  }, [eligibleApplicants, interviewByAppId]);

  // Filtered rows
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return eligibleApplicants.filter((app) => {
      const hasInterview = interviewByAppId.has(app.id);
      if (statusFilter === "ASSIGNED" && !hasInterview) return false;
      if (statusFilter === "UNASSIGNED" && hasInterview) return false;

      if (!q) return true;
      const name = (app.candidateName ?? "").toLowerCase();
      const email = (app.candidateEmail ?? "").toLowerCase();
      return name.includes(q) || email.includes(q) || String(app.id).includes(q);
    });
  }, [eligibleApplicants, interviewByAppId, search, statusFilter]);

  // Mutation to create single AI interview
  const assignSingle = useMutation({
    mutationFn: (applicationId: number) => aiInterviewApi.create({ applicationId }),
    onSuccess: (created) => {
      void client.invalidateQueries({ queryKey: queryKeys.aiInterviews.byJob(jobId) });
      toast.success("Đã giao phỏng vấn AI thành công", `Mã phiên #AI-${created.id}`);
    },
    onError: (err: any) => {
      toast.error("Không thể giao phỏng vấn AI", err?.response?.data?.message ?? err?.message);
    },
  });

  // Mutation to create batch AI interviews
  const [isBatchAssigning, setIsBatchAssigning] = useState(false);
  const handleBatchAssign = async () => {
    if (selectedIds.length === 0) return;
    setIsBatchAssigning(true);
    let successCount = 0;
    let failCount = 0;

    for (const appId of selectedIds) {
      try {
        await aiInterviewApi.create({ applicationId: appId });
        successCount++;
      } catch {
        failCount++;
      }
    }

    await client.invalidateQueries({ queryKey: queryKeys.aiInterviews.byJob(jobId) });
    setSelectedIds([]);
    setIsBatchAssigning(false);

    if (successCount > 0) {
      toast.success(
        "Giao đề phỏng vấn thành công",
        `Đã tạo phiên phỏng vấn AI cho ${successCount} ứng viên${failCount > 0 ? ` (${failCount} lỗi)` : ""}`
      );
    } else {
      toast.error("Giao phỏng vấn thất bại", "Vui lòng kiểm tra lại hạn mức tài khoản.");
    }
  };

  const unassignedFilteredIds = filtered
    .filter((a) => !interviewByAppId.has(a.id))
    .map((a) => a.id);

  const allUnassignedSelected =
    unassignedFilteredIds.length > 0 &&
    unassignedFilteredIds.every((id) => selectedIds.includes(id));

  const toggleSelectAll = () => {
    if (allUnassignedSelected) {
      setSelectedIds((prev) => prev.filter((id) => !unassignedFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...unassignedFilteredIds])]);
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-bold tracking-tight text-[#101828] dark:text-white">
                Giao đề cho ứng viên
              </h2>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#0066FF] dark:bg-blue-950 dark:text-blue-300">
                AI Interview
              </span>
            </div>
            <p className="mt-1 text-[12px] text-[#667085] dark:text-slate-400">
              Chỉ định và tự động tạo phiên phỏng vấn AI theo đúng cấu hình chung và bài tập đã thiết lập.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Users className="size-3.5 text-slate-400" />
              Tổng: <strong>{counts.total}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
              <UserCheck className="size-3.5 text-emerald-600" />
              Đã giao: <strong>{counts.assigned}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-[#0066FF] dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
              <Clock3 className="size-3.5 text-[#0066FF]" />
              Chưa giao: <strong>{counts.unassigned}</strong>
            </span>
          </div>
        </div>

        {/* Toolbar: Search, Filters & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <div className="flex min-w-[260px] flex-1 flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[200px] max-w-sm flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-8 text-xs outline-none transition placeholder:text-slate-400 focus:border-[#0066FF] focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/60 dark:focus:bg-slate-900"
                placeholder="Tìm theo tên ứng viên, email, mã đơn..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  aria-label="Xóa tìm kiếm"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Filter by status */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === "status" ? null : "status")}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                  statusFilter !== "ALL"
                    ? "border-blue-300 bg-blue-50 text-[#0066FF] font-semibold dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                    : "border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
                )}
              >
                <Filter className="size-3.5 text-slate-400" />
                <span>
                  {statusFilter === "ALL"
                    ? "Tất cả trạng thái"
                    : statusFilter === "UNASSIGNED"
                      ? "Chưa giao đề"
                      : "Đã giao đề"}
                </span>
                <ChevronDown className="size-3.5 text-slate-400" />
              </button>

              {activeDropdown === "status" && (
                <div className="absolute left-0 top-full mt-1.5 z-40 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-50 zoom-in-95">
                  {[
                    { value: "ALL" as const, label: "Tất cả trạng thái", count: counts.total },
                    { value: "UNASSIGNED" as const, label: "Chưa giao đề", count: counts.unassigned },
                    { value: "ASSIGNED" as const, label: "Đã giao đề", count: counts.assigned },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(item.value);
                        setActiveDropdown(null);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer",
                        statusFilter === item.value
                          ? "bg-blue-50 font-semibold text-[#0066FF] dark:bg-blue-950/60 dark:text-blue-300"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                    >
                      <span>{item.label}</span>
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                        {item.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => {
                void applicants.refetch();
                void interviews.refetch();
              }}
              disabled={applicants.isFetching || interviews.isFetching}
              className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50/60 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400"
              title="Làm mới danh sách"
            >
              <RefreshCw
                className={cn("size-3.5", (applicants.isFetching || interviews.isFetching) && "animate-spin text-[#0066FF]")}
              />
            </button>
          </div>

          {/* Batch Action Button */}
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBatchAssign}
              disabled={isBatchAssigning}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0066FF] px-4 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer disabled:opacity-50"
            >
              {isBatchAssigning ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Đang giao phỏng vấn...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  <span>Giao phỏng vấn cho {selectedIds.length} ứng viên đã chọn</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Candidates List Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        {applicants.isPending ? (
          <div className="p-4">
            <TableSkeleton columns={6} rows={5} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-50 text-[#0066FF] dark:bg-blue-950/60 dark:text-blue-400">
              <Users className="size-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Không tìm thấy hồ sơ ứng viên phù hợp
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Thử thay đổi từ khóa tìm kiếm hoặc lọc theo trạng thái khác.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] border-collapse text-left text-sm">
              <thead>
                <tr className="h-11 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/70 dark:border-slate-800">
                  <th className="w-10 px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      className="size-4 cursor-pointer accent-[#0066FF] rounded"
                      checked={allUnassignedSelected}
                      onChange={toggleSelectAll}
                      disabled={unassignedFilteredIds.length === 0}
                      aria-label="Chọn tất cả ứng viên chưa giao đề"
                    />
                  </th>
                  <th className="px-4 py-2">Ứng viên &amp; Email</th>
                  <th className="px-4 py-2">Mã đơn</th>
                  <th className="px-4 py-2">Ngày ứng tuyển</th>
                  <th className="px-4 py-2">Trạng thái Phỏng vấn AI</th>
                  <th className="px-4 py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filtered.map((app) => {
                  const interview = interviewByAppId.get(app.id);
                  const isAssigned = Boolean(interview);
                  const isSelected = selectedIds.includes(app.id);

                  return (
                    <tr
                      key={app.id}
                      className={cn(
                        "group transition-colors",
                        isSelected
                          ? "bg-blue-50/50 dark:bg-blue-950/30"
                          : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                      )}
                    >
                      <td className="w-10 px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          className="size-4 cursor-pointer accent-[#0066FF] rounded"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(app.id)}
                          disabled={isAssigned}
                          aria-label={`Chọn ứng viên ${app.candidateName}`}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-[#0066FF] border border-blue-200/60 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900 shadow-2xs">
                            {initials(app.candidateName)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate text-xs">
                              {app.candidateName}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                              {app.candidateEmail}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                        #{app.id}
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {app.createdAt ? new Date(app.createdAt).toLocaleDateString("vi-VN") : "—"}
                      </td>

                      <td className="px-4 py-3">
                        {isAssigned && interview ? (
                          <div className="flex items-center gap-2">
                            <AiStatusBadge status={interview.status} />
                            <span className="font-mono text-[11px] text-slate-400">
                              #AI-{interview.id}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            <span className="size-1.5 rounded-full bg-slate-400" />
                            Chưa giao
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {isAssigned && interview ? (
                          <button
                            type="button"
                            onClick={() => onOpenDetail?.(interview.id)}
                            className="inline-flex h-8 items-center gap-1 rounded-xl bg-blue-50 px-2.5 text-xs font-semibold text-[#0066FF] hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                          >
                            <span>Xem phiên</span>
                            <ArrowRight className="size-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => assignSingle.mutate(app.id)}
                            disabled={assignSingle.isPending}
                            className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#0066FF] px-3 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {assignSingle.isPending && assignSingle.variables === app.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <PlusCircle className="size-3.5" />
                            )}
                            <span>Giao phỏng vấn</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

