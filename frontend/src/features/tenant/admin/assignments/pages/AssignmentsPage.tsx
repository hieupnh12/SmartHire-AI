import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { jobApi } from "@/api/tenant/jobApi";
import { jobAssignmentsApi, type JobAssignment } from "@/api/tenant/jobAssignmentsApi";
import { usersApi } from "@/api/tenant/usersApi";
import { tenantRolesApi } from "@/api/tenant/tenantRolesApi";
import { Button } from "@/components/ux/Button";
import { Card } from "@/components/ux/Card";
import { Skeleton } from "@/components/ux/Skeleton";
import { keepPreviousData, keepPreviousForScope, TableRefreshBar } from "@/components/ux/TableRefresh";
import { StatusPill } from "@/components/ux/StatusPill";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/stores/toastStore";
import type { JobStatus } from "@/api/types/job";
import {
  Crown,
  ArrowRightLeft,
  Trash2,
  X,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const PAGE_SIZE = 10;

const inputClass =
  "min-h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-surface-card px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15";

/** Transfer Ownership modal — only staff with JOBS_CREATE can become OWNER */
function TransferOwnerModal({
  jobId,
  staff,
  currentOwnerId,
  canStaffCreateJob,
  onClose,
  onSuccess,
}: {
  jobId: number;
  staff: { id: number; fullName: string; role: string }[];
  currentOwnerId: number | undefined;
  canStaffCreateJob: (roleCode: string) => boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const [newOwnerId, setNewOwnerId] = useState("");
  const mutation = useMutation({
    mutationFn: () => jobAssignmentsApi.transferOwner(jobId, Number(newOwnerId)),
    onSuccess: (res) => {
      if (!res.success) throw new Error(res.message);
      toast.success(t("tenantAdmin.assignments.transferModal.success"));
      onSuccess();
      onClose();
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, t("tenantAdmin.assignments.transferModal.error"))),
  });

  // Only candidates who have permission to create jobs can become OWNER
  const candidates = staff.filter((row) => row.id !== currentOwnerId && canStaffCreateJob(row.role));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="transfer-owner-title">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 id="transfer-owner-title" className="text-base font-semibold">{t("tenantAdmin.assignments.transferModal.title")}</h2>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-lg hover:bg-[var(--color-surface-alt)]" aria-label={t("tenantAdmin.assignments.transferModal.closeAria")}>
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
          {t("tenantAdmin.assignments.transferModal.descriptionPrefix")}
          <strong>{t("tenantAdmin.assignments.transferModal.descriptionBold")}</strong>
          {t("tenantAdmin.assignments.transferModal.descriptionMiddle")}
          <strong>{t("tenantAdmin.assignments.transferModal.descriptionRole")}</strong>
          {t("tenantAdmin.assignments.transferModal.descriptionSuffix")}
        </p>

        {candidates.length === 0 ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            {t("tenantAdmin.assignments.transferModal.noCandidates")}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">{t("tenantAdmin.assignments.transferModal.selectLabel")}</span>
              <select className={inputClass} value={newOwnerId} onChange={(e) => setNewOwnerId(e.target.value)}>
                <option value="">{t("tenantAdmin.assignments.transferModal.selectPlaceholder")}</option>
                {candidates.map((row) => (
                  <option key={row.id} value={row.id}>{row.fullName} · {row.role}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t("tenantAdmin.assignments.transferModal.cancel")}</Button>
          <Button disabled={!newOwnerId || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? t("tenantAdmin.assignments.transferModal.transferring") : t("tenantAdmin.assignments.transferModal.confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AssignmentsPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const askConfirm = useUiStore((s) => s.askConfirm);
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const urlJobIdRaw = searchParams.get("jobId");
  const urlJobId = urlJobIdRaw ? Number(urlJobIdRaw) : NaN;

  const [query, setQuery] = useState(urlQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(urlQuery);
  const [statusFilter, setStatusFilter] = useState<JobStatus | "">("");
  const [page, setPage] = useState(0);

  const [selectedJobId, setSelectedJobId] = useState<number | null>(() =>
    Number.isFinite(urlJobId) && urlJobId > 0 ? urlJobId : null,
  );
  const [userId, setUserId] = useState("");
  const [showTransfer, setShowTransfer] = useState(false);

  useEffect(() => {
    if (urlQuery) {
      setQuery(urlQuery);
      setDebouncedQuery(urlQuery);
    }
    if (Number.isFinite(urlJobId) && urlJobId > 0) {
      setSelectedJobId(urlJobId);
    }
  }, [urlQuery, urlJobId]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const jobsQuery = useQuery({
    queryKey: queryKeys.jobs.list({ q: debouncedQuery, status: statusFilter, size: PAGE_SIZE, page, scope: "all" }),
    queryFn: () =>
      jobApi.search({
        q: debouncedQuery.trim() || undefined,
        status: statusFilter || undefined,
        page,
        size: PAGE_SIZE,
        scope: "all",
      }),
    placeholderData: keepPreviousData,
  });

  const isJobsRefreshing = jobsQuery.isFetching && jobsQuery.isPlaceholderData;
  const isJobsLoading = jobsQuery.isPending && !jobsQuery.data;
  const jobsData = jobsQuery.data?.data;
  const jobs = jobsData?.items ?? [];
  const totalJobs = jobsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalJobs / PAGE_SIZE));

  // Auto-select first job on load or when jobs change if selectedJobId is invalid
  useEffect(() => {
    if (jobs.length > 0) {
      const existsOnPage = jobs.some((job) => job.id === selectedJobId);
      if (!existsOnPage) {
        setSelectedJobId(jobs[0].id);
      }
    } else {
      setSelectedJobId(null);
    }
  }, [jobs, selectedJobId]);

  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? null;

  const membersQuery = useQuery({
    queryKey: ["tenant-users"],
    queryFn: () => usersApi.list(),
  });
  const staff = useMemo(
    () => (membersQuery.data?.data ?? []).filter((row) => row.workspace === "RECRUITER"),
    [membersQuery.data],
  );

  const rolesQuery = useQuery({
    queryKey: ["tenant-roles"],
    queryFn: tenantRolesApi.list,
  });
  const tenantRoles = rolesQuery.data?.data?.roles ?? [];

  const canStaffCreateJob = (roleCode: string) => {
    if (roleCode === "TENANT_ADMIN" || roleCode === "ADMIN" || roleCode === "SUPER_ADMIN") return true;
    const r = tenantRoles.find((role) => role.code === roleCode);
    if (!r) return false;
    return r.features.includes("JOBS_CREATE") || r.features.includes("JOBS");
  };

  const assignmentsQuery = useQuery({
    queryKey: queryKeys.jobs.assignments(selectedJobId ?? 0),
    queryFn: () => jobAssignmentsApi.list(selectedJobId as number),
    placeholderData: keepPreviousForScope(selectedJobId, 2),
    enabled: selectedJobId != null,
  });
  const assigned = assignmentsQuery.data?.data ?? [];
  const assignedIds = new Set(assigned.map((row) => row.userId));
  const availableStaff = staff.filter((row) => !assignedIds.has(row.id));
  const currentOwner = assigned.find((row) => row.assignmentRole === "OWNER");

  const invalidate = () => {
    if (selectedJobId != null) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.assignments(selectedJobId) });
    }
  };

  const assignMutation = useMutation({
    mutationFn: () => {
      return jobAssignmentsApi.assign(selectedJobId as number, {
        userId: Number(userId),
        assignmentRole: "COLLABORATOR",
        canView: true,
        canEdit: true,
      });
    },
    onSuccess: (res) => {
      if (!res.success) throw new Error(res.message);
      toast.success(t("tenantAdmin.assignments.assignSuccess"));
      setUserId("");
      invalidate();
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, t("tenantAdmin.assignments.assignError"))),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => jobAssignmentsApi.remove(selectedJobId as number, id),
    onSuccess: (res) => {
      if (!res.success) throw new Error(res.message);
      toast.success(t("tenantAdmin.assignments.removeSuccess"));
      invalidate();
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, t("tenantAdmin.assignments.removeError"))),
  });

  const askRemove = (row: JobAssignment) => {
    askConfirm({
      title: t("tenantAdmin.assignments.removeConfirmTitle", { name: row.fullName }),
      description: t("tenantAdmin.assignments.removeConfirmDesc"),
      confirmLabel: t("tenantAdmin.assignments.removeConfirmLabel"),
      danger: true,
      onConfirm: () => removeMutation.mutate(row.userId),
    });
  };

  return (
    <section className="flex h-full min-h-0 flex-col gap-3">
      {showTransfer && selectedJobId != null && (
        <TransferOwnerModal
          jobId={selectedJobId}
          staff={staff}
          currentOwnerId={currentOwner?.userId}
          canStaffCreateJob={canStaffCreateJob}
          onClose={() => setShowTransfer(false)}
          onSuccess={invalidate}
        />
      )}

      {/* Page Title (compact) */}
      <div className="shrink-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {t("tenantAdmin.assignments.title")}
        </h1>
      </div>

      {/* Main Grid: Left Job Selector + Right Assignment Details */}
      <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[20rem_1fr] xl:grid-cols-[22rem_1fr] overflow-hidden">
        {/* Left Column: Job Selector with Search, Status Filter & Pagination */}
        <Card className="relative flex flex-col h-full min-h-0 overflow-hidden p-3.5 gap-2.5">
          <TableRefreshBar active={isJobsRefreshing} />

          {/* Section Header with Total Count */}
          <div className="flex shrink-0 items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              {t("tenantAdmin.assignments.jobsTitle")}
              <span className="rounded-full bg-[var(--color-surface-alt)] px-2 py-0.5 text-xs font-semibold text-[var(--color-on-surface-variant)]">
                {totalJobs}
              </span>
            </h2>
          </div>

          {/* Search Input & Status Filter */}
          <div className="shrink-0 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[var(--color-text-secondary)] pointer-events-none" />
              <input
                className={cn(inputClass, "h-8 min-h-8 pl-8 pr-7 text-xs")}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(0);
                }}
                placeholder={t("tenantAdmin.assignments.searchPlaceholder")}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setPage(0);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Xoá tìm kiếm"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <select
                className={cn(inputClass, "h-8 min-h-8 py-0 text-xs font-medium text-[var(--color-text-secondary)]")}
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as JobStatus | "");
                  setPage(0);
                }}
              >
                <option value="">{t("tenantAdmin.assignments.filterAllStatus")}</option>
                <option value="PUBLISHED">{t("tenantAdmin.assignments.filterPublished")}</option>
                <option value="DRAFT">{t("tenantAdmin.assignments.filterDraft")}</option>
                <option value="PAUSED">{t("tenantAdmin.assignments.filterPaused")}</option>
                <option value="CLOSED">{t("tenantAdmin.assignments.filterClosed")}</option>
              </select>
            </div>
          </div>

          {/* Loading Skeleton */}
          {isJobsLoading && (
            <div className="flex-1 space-y-2 py-1" role="status" aria-busy="true">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
              <span className="sr-only">{t("tenantAdmin.assignments.loadingJobsSr")}</span>
            </div>
          )}

          {/* Error Message */}
          {jobsQuery.isError && (
            <p className="text-xs text-status-danger py-2" role="alert">
              {getApiErrorMessage(jobsQuery.error, t("tenantAdmin.assignments.loadJobsError"))}
            </p>
          )}

          {/* Empty State */}
          {jobs.length === 0 && !isJobsLoading && (
            <div className="flex flex-1 flex-col items-center justify-center py-6 text-center text-xs text-[var(--color-text-secondary)]">
              <p>{t("tenantAdmin.assignments.emptyJobs")}</p>
            </div>
          )}

          {/* Scrollable Job Items List */}
          {jobs.length > 0 && !isJobsLoading && (
            <ul
              className={cn(
                "flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 transition-opacity duration-200",
                isJobsRefreshing && "opacity-60",
              )}
            >
              {jobs.map((job) => {
                const isSelected = selectedJobId === job.id;
                return (
                  <li key={job.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedJobId(job.id)}
                      className={cn(
                        "group flex w-full flex-col gap-1 rounded-xl border p-2.5 text-left text-xs transition-all",
                        isSelected
                          ? "border-brand-primary bg-[var(--color-primary-soft)]/50 shadow-xs ring-1 ring-brand-primary"
                          : "border-transparent bg-white hover:border-[var(--color-border-default)] hover:bg-[var(--color-surface-alt)]/60",
                      )}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <span
                          className={cn(
                            "font-semibold line-clamp-1 text-[var(--color-text-primary)]",
                            isSelected && "text-brand-primary",
                          )}
                        >
                          {job.title}
                        </span>
                        <StatusPill status={job.status} label={job.status} />
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-secondary)]">
                        {job.department && <span className="truncate max-w-[120px]">{job.department}</span>}
                        {job.department && job.location && <span>•</span>}
                        {job.location && <span className="truncate max-w-[100px]">{job.location}</span>}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Pagination Controls Footer */}
          <div className="flex shrink-0 items-center justify-between border-t border-[var(--color-border-default)] pt-2 text-xs text-[var(--color-text-secondary)]">
            <span className="font-medium">
              {totalJobs > 0
                ? `${page * PAGE_SIZE + 1}-${Math.min((page + 1) * PAGE_SIZE, totalJobs)} / ${totalJobs}`
                : "0 tin"}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={page === 0 || isJobsLoading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="h-7 w-7 p-0"
                aria-label={t("tenantAdmin.assignments.prevPage")}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="px-1 text-xs font-semibold text-[var(--color-text-primary)]">
                {totalPages > 0 ? `${page + 1} / ${totalPages}` : "1 / 1"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages - 1 || isJobsLoading}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 w-7 p-0"
                aria-label={t("tenantAdmin.assignments.nextPage")}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Right Column: Assigned Team & Role Management */}
        <Card className="flex flex-col h-full min-h-0 overflow-hidden p-5">
          {selectedJob == null && (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center text-sm text-[var(--color-text-secondary)]">
              <div className="grid size-14 place-items-center rounded-2xl bg-[var(--color-surface-alt)] mb-3 text-slate-400">
                <ShieldCheck className="size-7 stroke-1" />
              </div>
              <p className="font-medium text-[var(--color-text-primary)]">{t("tenantAdmin.assignments.emptySelection")}</p>
            </div>
          )}

          {selectedJob != null && (
            <>
              {/* Job Header & Transfer Owner Button (shrink-0) */}
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-default)] pb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[var(--color-text-primary)] truncate">{selectedJob.title}</h2>
                    <StatusPill status={selectedJob.status} label={selectedJob.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                    {assigned.length === 0
                      ? t("tenantAdmin.assignments.noAssignees")
                      : t("tenantAdmin.assignments.assigneesCount", { count: assigned.length })}
                    {selectedJob.department && ` · ${selectedJob.department}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTransfer(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                >
                  <ArrowRightLeft className="size-3.5" aria-hidden="true" />
                  {t("tenantAdmin.assignments.transferOwnerButton")}
                </button>
              </div>

              {/* Scrollable Content: Assign Form + Team List */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-3.5 pr-1.5 py-3">
                {/* Add Member Section */}
                <div className="rounded-xl border border-[var(--color-border-default)] bg-white p-3.5 shadow-xs space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    {t("tenantAdmin.assignments.assignCardTitle")}
                  </h3>
                  <form
                    className="grid gap-2.5 sm:grid-cols-[1fr_auto] sm:items-end"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!userId) return;
                      assignMutation.mutate();
                    }}
                  >
                    <label className="space-y-1 text-xs font-medium text-[var(--color-text-secondary)]">
                      <span>{t("tenantAdmin.assignments.selectRecruiterLabel")}</span>
                      <select
                        className={cn(inputClass, "h-9 min-h-9 text-xs")}
                        value={userId}
                        onChange={(event) => setUserId(event.target.value)}
                      >
                        <option value="">{t("tenantAdmin.assignments.selectRecruiterPlaceholder")}</option>
                        {availableStaff.map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.fullName} · {row.role}
                          </option>
                        ))}
                      </select>
                    </label>

                    <Button
                      type="submit"
                      disabled={assignMutation.isPending || !userId}
                      className="h-9 min-h-9 text-xs"
                    >
                      <UserPlus className="size-3.5 mr-1.5" />
                      {assignMutation.isPending ? t("tenantAdmin.assignments.assigning") : t("tenantAdmin.assignments.assignButton")}
                    </Button>
                  </form>
                </div>

                {assignmentsQuery.isLoading && (
                  <div className="space-y-2 py-2" role="status" aria-busy="true">
                    {Array.from({ length: 3 }, (_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-xl" />
                    ))}
                    <span className="sr-only">{t("tenantAdmin.assignments.loadingAssignmentsSr")}</span>
                  </div>
                )}
                {assignmentsQuery.isError && (
                  <p className="text-xs text-status-danger" role="alert">
                    {getApiErrorMessage(assignmentsQuery.error, t("tenantAdmin.assignments.loadAssignmentsError"))}
                  </p>
                )}

                {/* Team Members List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      {t("tenantAdmin.assignments.teamTitle", { count: assigned.length })}
                    </h3>
                  </div>

                  <ul className="divide-y divide-[var(--color-border-default)] rounded-xl border border-[var(--color-border-default)] bg-white shadow-xs overflow-hidden">
                    {assigned.map((row) => {
                      const isOwner = row.assignmentRole === "OWNER";
                      return (
                        <li key={row.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 hover:bg-[var(--color-surface-alt)]/30 transition-colors">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-xs font-semibold text-[var(--color-text-primary)]">{row.fullName}</p>
                              {row.isCreator && (
                                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                                  {t("tenantAdmin.assignments.jobCreatorBadge")}
                                </span>
                              )}
                            </div>
                            <p className="truncate text-[11px] text-[var(--color-text-secondary)]">
                              {row.email} · {t("tenantAdmin.assignments.accountRoleLabel")}{" "}
                              <span className="font-medium text-[var(--color-text-primary)]">{row.role}</span>
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 sm:self-center">
                            {isOwner ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 shadow-xs">
                                <Crown className="size-3 text-amber-600" />
                                {t("tenantAdmin.assignments.ownerBadge")}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                                <UserCheck className="size-3 text-blue-600" />
                                {t("tenantAdmin.assignments.collaboratorBadge")}
                              </span>
                            )}

                            {!isOwner && !row.isCreator && (
                              <button
                                type="button"
                                aria-label={t("tenantAdmin.assignments.removeAria", { name: row.fullName })}
                                disabled={removeMutation.isPending}
                                onClick={() => askRemove(row)}
                                className="inline-flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger)]/10 transition-colors"
                                title={t("tenantAdmin.assignments.removeTitle")}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </section>
  );
}
