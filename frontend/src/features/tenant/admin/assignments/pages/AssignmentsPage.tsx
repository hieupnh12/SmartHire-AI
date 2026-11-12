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
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/stores/toastStore";
import { Crown, ArrowRightLeft, Trash2, X, ShieldCheck, UserCheck, UserPlus } from "lucide-react";

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
  const [selectedJobId, setSelectedJobId] = useState<number | null>(() =>
    Number.isFinite(urlJobId) && urlJobId > 0 ? urlJobId : null,
  );
  const [userId, setUserId] = useState("");
  const [showTransfer, setShowTransfer] = useState(false);

  useEffect(() => {
    if (urlQuery) {
      setQuery(urlQuery);
    }
    if (Number.isFinite(urlJobId) && urlJobId > 0) {
      setSelectedJobId(urlJobId);
    }
  }, [urlQuery, urlJobId]);

  const jobsQuery = useQuery({
    queryKey: queryKeys.jobs.list({ q: query, size: 50, page: 0, scope: "all" }),
    queryFn: () => jobApi.search({ q: query || undefined, page: 0, size: 50, scope: "all" }),
    placeholderData: keepPreviousData,
  });
  const isJobsRefreshing = jobsQuery.isFetching && jobsQuery.isPlaceholderData;
  const jobs = jobsQuery.data?.data?.items ?? [];
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
    <section className="space-y-6">
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

      <div>
        <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">{t("tenantAdmin.assignments.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">
          {t("tenantAdmin.assignments.subtitlePrefix")}
          <strong>{t("tenantAdmin.assignments.subtitleOwner")}</strong>
          {t("tenantAdmin.assignments.subtitleMiddle")}
          <strong>{t("tenantAdmin.assignments.subtitleCollaborator")}</strong>
          {t("tenantAdmin.assignments.subtitleSuffix")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(16rem,22rem)_1fr] lg:items-start">
        {/* Left Column: Job Selector */}
        <Card className="relative overflow-hidden space-y-3">
          <TableRefreshBar active={isJobsRefreshing} />
          <h2 className="text-base font-semibold">{t("tenantAdmin.assignments.jobsTitle")}</h2>
          <input
            className={inputClass}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("tenantAdmin.assignments.searchPlaceholder")}
          />
          {jobsQuery.isPending && !jobsQuery.data && (
            <div className="space-y-2 py-1" role="status" aria-busy="true">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-[var(--radius-md)]" />
              ))}
              <span className="sr-only">{t("tenantAdmin.assignments.loadingJobsSr")}</span>
            </div>
          )}
          {jobsQuery.isError && <p className="text-sm text-status-danger" role="alert">{getApiErrorMessage(jobsQuery.error, t("tenantAdmin.assignments.loadJobsError"))}</p>}
          {jobs.length === 0 && !(jobsQuery.isPending && !jobsQuery.data) && <p className="text-sm text-[var(--color-text-secondary)]">{t("tenantAdmin.assignments.emptyJobs")}</p>}
          <ul className={cn("space-y-1 transition-opacity duration-200", isJobsRefreshing && "opacity-60")}>
            {jobs.map((job) => (
              <li key={job.id}>
                <button
                  type="button"
                  onClick={() => setSelectedJobId(job.id)}
                  className={`flex w-full items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-left text-sm transition-colors ${
                    selectedJobId === job.id
                      ? "bg-[var(--color-primary-soft)] text-brand-primary font-semibold"
                      : "hover:bg-[var(--color-surface-alt)]"
                  }`}
                >
                  <span className="truncate font-medium">{job.title}</span>
                  <span className="ml-2 shrink-0 text-xs text-[var(--color-text-secondary)]">{job.status}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {/* Right Column: Assigned Team & Role Management */}
        <Card className="space-y-5">
          {selectedJob == null && (
            <div className="py-12 text-center text-sm text-[var(--color-text-secondary)]">
              <ShieldCheck className="mx-auto size-10 stroke-1 text-slate-300 mb-2" />
              {t("tenantAdmin.assignments.emptySelection")}
            </div>
          )}
          {selectedJob != null && (
            <>
              {/* Job Header & Transfer Owner */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border-default)] pb-4">
                <div>
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{selectedJob.title}</h2>
                  <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                    {assigned.length === 0
                      ? t("tenantAdmin.assignments.noAssignees")
                      : t("tenantAdmin.assignments.assigneesCount", { count: assigned.length })}
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

              {/* RBAC Relationship Banner */}
              <div className="rounded-xl border border-[var(--color-primary-soft)] bg-gradient-to-r from-[var(--color-primary-soft)]/30 to-transparent p-3.5 text-xs text-[var(--color-text-secondary)]">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="size-4 shrink-0 text-brand-primary mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-xs text-[var(--color-text-primary)]">
                      {t("tenantAdmin.assignments.rbacBannerTitle")}
                    </p>
                    <p>
                      {t("tenantAdmin.assignments.rbacOwnerRulePrefix")}
                      <code>`JOBS_CREATE`</code>
                      {t("tenantAdmin.assignments.rbacOwnerRuleSuffix")}
                    </p>
                    <p>
                      {t("tenantAdmin.assignments.rbacCollaboratorRulePrefix")}
                      <strong>{t("tenantAdmin.assignments.rbacCollaboratorRuleBold")}</strong>
                      {t("tenantAdmin.assignments.rbacCollaboratorRuleSuffix")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Add Member Section */}
              <div className="rounded-xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {t("tenantAdmin.assignments.assignCardTitle")}
                </h3>
                <form
                  className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!userId) return;
                    assignMutation.mutate();
                  }}
                >
                  <label className="space-y-1 text-xs font-medium text-[var(--color-text-secondary)]">
                    <span>{t("tenantAdmin.assignments.selectRecruiterLabel")}</span>
                    <select
                      className={inputClass}
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
                    className="min-h-10"
                  >
                    <UserPlus className="size-4 mr-1.5" />
                    {assignMutation.isPending ? t("tenantAdmin.assignments.assigning") : t("tenantAdmin.assignments.assignButton")}
                  </Button>
                </form>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {t("tenantAdmin.assignments.assignNote")}
                </p>
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
                <p className="text-sm text-status-danger" role="alert">
                  {getApiErrorMessage(assignmentsQuery.error, t("tenantAdmin.assignments.loadAssignmentsError"))}
                </p>
              )}

              {/* Team Members List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {t("tenantAdmin.assignments.teamTitle", { count: assigned.length })}
                  </h3>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {t("tenantAdmin.assignments.teamSummary")}
                  </span>
                </div>

                <ul className="divide-y divide-[var(--color-border-default)] rounded-xl border border-[var(--color-border-default)] bg-white shadow-sm overflow-hidden">
                  {assigned.map((row) => {
                    const isOwner = row.assignmentRole === "OWNER";
                    return (
                      <li key={row.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 hover:bg-[var(--color-surface-alt)]/30 transition-colors">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{row.fullName}</p>
                            {row.isCreator && (
                              <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                                {t("tenantAdmin.assignments.jobCreatorBadge")}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-[var(--color-text-secondary)]">
                            {row.email} · {t("tenantAdmin.assignments.accountRoleLabel")}{" "}
                            <span className="font-medium text-[var(--color-text-primary)]">{row.role}</span>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
                          {isOwner ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 shadow-xs">
                              <Crown className="size-3.5 text-amber-600" />
                              {t("tenantAdmin.assignments.ownerBadge")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                              <UserCheck className="size-3.5 text-blue-600" />
                              {t("tenantAdmin.assignments.collaboratorBadge")}
                            </span>
                          )}

                          {!isOwner && !row.isCreator && (
                            <button
                              type="button"
                              aria-label={t("tenantAdmin.assignments.removeAria", { name: row.fullName })}
                              disabled={removeMutation.isPending}
                              onClick={() => askRemove(row)}
                              className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger)]/10 transition-colors"
                              title={t("tenantAdmin.assignments.removeTitle")}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </Card>
      </div>
    </section>
  );
}
