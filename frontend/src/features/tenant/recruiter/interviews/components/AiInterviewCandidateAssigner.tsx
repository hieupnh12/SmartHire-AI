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
import { formatDate, useLocale, useT } from "@/i18n";
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

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function AiInterviewCandidateAssigner({ jobId, onOpenDetail }: Props) {
  const t = useT();
  const locale = useLocale();
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
      return (
        app.candidateName.toLowerCase().includes(q) ||
        app.candidateEmail.toLowerCase().includes(q) ||
        String(app.id).includes(q)
      );
    });
  }, [eligibleApplicants, interviewByAppId, search, statusFilter]);

  // Mutation to create single AI interview
  const assignSingle = useMutation({
    mutationFn: (applicationId: number) => aiInterviewApi.create({ applicationId }),
    onSuccess: (created) => {
      void client.invalidateQueries({ queryKey: queryKeys.aiInterviews.byJob(jobId) });
      toast.success(
        t("recruiter.interviews.ai.assigner.toastSuccessTitle"),
        t("recruiter.interviews.ai.assigner.toastSuccessDesc", { id: created.id }),
      );
    },
    onError: (err: any) => {
      toast.error(t("recruiter.interviews.ai.assigner.toastErrorTitle"), err?.response?.data?.message ?? err?.message);
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
        t("recruiter.interviews.ai.assigner.batchSuccessTitle"),
        failCount > 0
          ? t("recruiter.interviews.ai.assigner.batchSuccessDescWithFail", { count: successCount, failCount })
          : t("recruiter.interviews.ai.assigner.batchSuccessDesc", { count: successCount }),
      );
    } else {
      toast.error(
        t("recruiter.interviews.ai.assigner.batchErrorTitle"),
        t("recruiter.interviews.ai.assigner.batchErrorDesc"),
      );
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
                {t("recruiter.interviews.ai.assigner.title")}
              </h2>
              <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-primary-hover)]">
                {t("recruiter.interviews.ai.assigner.badge")}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-[#667085] dark:text-slate-400">
              {t("recruiter.interviews.ai.assigner.subtitle")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Users className="size-3.5 text-slate-400" />
              {t("recruiter.interviews.ai.assigner.totalLabel")} <strong>{counts.total}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
              <UserCheck className="size-3.5 text-emerald-600" />
              {t("recruiter.interviews.ai.assigner.assignedLabel")} <strong>{counts.assigned}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] px-3 py-1.5 text-xs font-medium text-[var(--color-primary-hover)]">
              <Clock3 className="size-3.5 text-[var(--color-primary)]" />
              {t("recruiter.interviews.ai.assigner.unassignedLabel")} <strong>{counts.unassigned}</strong>
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
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-8 text-xs outline-none transition placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:border-slate-700 dark:bg-slate-800/60 dark:focus:bg-slate-900"
                placeholder={t("recruiter.interviews.ai.assigner.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  aria-label={t("recruiter.interviews.ai.assigner.clearSearchAria")}
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
                    ? "border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)] font-semibold"
                    : "border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
                )}
              >
                <Filter className="size-3.5 text-slate-400" />
                <span>
                  {statusFilter === "ALL"
                    ? t("recruiter.interviews.ai.assigner.filterAll")
                    : statusFilter === "UNASSIGNED"
                      ? t("recruiter.interviews.ai.assigner.filterUnassigned")
                      : t("recruiter.interviews.ai.assigner.filterAssigned")}
                </span>
                <ChevronDown className="size-3.5 text-slate-400" />
              </button>

              {activeDropdown === "status" && (
                <div className="absolute left-0 top-full mt-1.5 z-40 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-50 zoom-in-95">
                  {[
                    { value: "ALL" as const, label: t("recruiter.interviews.ai.assigner.filterAll"), count: counts.total },
                    { value: "UNASSIGNED" as const, label: t("recruiter.interviews.ai.assigner.filterUnassigned"), count: counts.unassigned },
                    { value: "ASSIGNED" as const, label: t("recruiter.interviews.ai.assigner.filterAssigned"), count: counts.assigned },
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
                          ? "bg-[var(--color-primary-soft)] font-semibold text-[var(--color-primary-hover)]"
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
              title={t("recruiter.interviews.ai.assigner.refreshTitle")}
            >
              <RefreshCw
                className={cn("size-3.5", (applicants.isFetching || interviews.isFetching) && "animate-spin text-[var(--color-primary)]")}
              />
            </button>
          </div>

          {/* Batch Action Button */}
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBatchAssign}
              disabled={isBatchAssigning}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer disabled:opacity-50"
            >
              {isBatchAssigning ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{t("recruiter.interviews.ai.assigner.batchAssigning")}</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  <span>{t("recruiter.interviews.ai.assigner.batchAssignBtn", { count: selectedIds.length })}</span>
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
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <Users className="size-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t("recruiter.interviews.ai.assigner.emptyTitle")}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t("recruiter.interviews.ai.assigner.emptyHint")}
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
                      className="size-4 cursor-pointer accent-[var(--color-primary)] rounded"
                      checked={allUnassignedSelected}
                      onChange={toggleSelectAll}
                      disabled={unassignedFilteredIds.length === 0}
                      aria-label={t("recruiter.interviews.ai.assigner.selectAllAria")}
                    />
                  </th>
                  <th className="px-4 py-2">{t("recruiter.interviews.ai.assigner.colCandidateEmail")}</th>
                  <th className="px-4 py-2">{t("recruiter.interviews.ai.assigner.colApplicationId")}</th>
                  <th className="px-4 py-2">{t("recruiter.interviews.ai.assigner.colAppliedAt")}</th>
                  <th className="px-4 py-2">{t("recruiter.interviews.ai.assigner.colAiStatus")}</th>
                  <th className="px-4 py-2 text-right">{t("recruiter.interviews.ai.assigner.colActions")}</th>
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
                          ? "bg-[var(--color-primary-subtle)]/50"
                          : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                      )}
                    >
                      <td className="w-10 px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          className="size-4 cursor-pointer accent-[var(--color-primary)] rounded"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(app.id)}
                          disabled={isAssigned}
                          aria-label={t("recruiter.interviews.ai.assigner.selectOneAria", { name: app.candidateName })}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary-hover)] border border-[var(--color-primary)]/25 shadow-2xs">
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
                        {app.createdAt ? formatDate(app.createdAt, undefined, locale) : "—"}
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
                            {t("recruiter.interviews.ai.assigner.unassignedStatus")}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {isAssigned && interview ? (
                          <button
                            type="button"
                            onClick={() => onOpenDetail?.(interview.id)}
                            className="inline-flex h-8 items-center gap-1 rounded-xl bg-[var(--color-primary-soft)] px-2.5 text-xs font-semibold text-[var(--color-primary-hover)] hover:bg-[var(--color-primary-subtle)] transition-colors cursor-pointer"
                          >
                            <span>{t("recruiter.interviews.ai.assigner.viewSession")}</span>
                            <ArrowRight className="size-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => assignSingle.mutate(app.id)}
                            disabled={assignSingle.isPending}
                            className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3 text-xs font-semibold text-white shadow-2xs hover:bg-[var(--color-primary-hover)] transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {assignSingle.isPending && assignSingle.variables === app.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <PlusCircle className="size-3.5" />
                            )}
                            <span>{t("recruiter.interviews.ai.assigner.assignInterview")}</span>
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

