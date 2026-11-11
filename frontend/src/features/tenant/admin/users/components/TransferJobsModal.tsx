import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, X } from "lucide-react";
import { usersApi, type TenantMember, type UserStatus } from "@/api/tenant/usersApi";
import { Button } from "@/components/ux/Button";
import { Skeleton } from "@/components/ux/Skeleton";
import { useT } from "@/i18n";

type TransferJobsModalProps = {
  open: boolean;
  targetMember: TenantMember | null;
  targetStatus: UserStatus;
  eligibleRecipients: TenantMember[];
  submitting: boolean;
  onClose: () => void;
  onConfirm: (recipientId: number) => void;
};

export function TransferJobsModal({
  open,
  targetMember,
  targetStatus,
  eligibleRecipients,
  submitting,
  onClose,
  onConfirm,
}: TransferJobsModalProps) {
  const t = useT();
  const [recipientId, setRecipientId] = useState("");

  useEffect(() => {
    if (!open) {
      setRecipientId("");
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const assignmentsQuery = useQuery({
    queryKey: ["tenant-users", targetMember?.id, "assignments"],
    queryFn: () => usersApi.assignments(targetMember!.id),
    enabled: open && targetMember != null,
  });

  if (!open || !targetMember) return null;

  const allAssignments = assignmentsQuery.data?.data ?? [];
  const ownedJobs = allAssignments.filter(
    (item) => item.assignmentRole === "OWNER" || item.assignmentRole === "PRIMARY_RECRUITER",
  );
  const displayJobs = ownedJobs.length > 0 ? ownedJobs : allAssignments;
  const actionLabel =
    targetStatus === "DISABLED"
      ? t("tenantAdmin.users.transferModal.actionDisable")
      : t("tenantAdmin.users.transferModal.actionLock");
  const getJobStatusLabel = (status: string) => {
    const key = `tenantAdmin.users.jobStatuses.${status}`;
    const label = t(key);
    return label !== key ? label : status;
  };

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-jobs-title"
        className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-surface-card p-6 shadow-[var(--shadow-elevated)] space-y-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-default)] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 id="transfer-jobs-title" className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
                {t("tenantAdmin.users.transferModal.title")}
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {t("tenantAdmin.users.transferModal.subtitle", {
                  action: actionLabel,
                  name: targetMember.fullName,
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("tenantAdmin.users.transferModal.closeAria")}
            className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:bg-surface-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--color-text-primary)]">
            {t("tenantAdmin.users.transferModal.ownedJobsHeading", { name: targetMember.fullName })}
          </p>
          {assignmentsQuery.isLoading ? (
            <Skeleton className="h-20 w-full rounded-lg" />
          ) : (
            <ul className="max-h-40 divide-y divide-[var(--color-border-default)] overflow-y-auto rounded-xl border border-[var(--color-border-default)] bg-surface-muted px-3 text-xs">
              {displayJobs.map((job) => (
                <li key={job.jobId} className="flex items-center justify-between gap-2 py-2.5">
                  <span className="font-medium text-[var(--color-text-primary)]">{job.title}</span>
                  <span className="shrink-0 rounded bg-surface-card px-2 py-0.5 text-[11px] font-semibold text-brand-primary">
                    {getJobStatusLabel(job.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="transfer-recipient-select" className="block text-xs font-semibold text-[var(--color-text-primary)]">
            {t("tenantAdmin.users.transferModal.recipientLabel")}
          </label>
          <select
            id="transfer-recipient-select"
            value={recipientId}
            onChange={(event) => setRecipientId(event.target.value)}
            className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-surface-card px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15"
          >
            <option value="">{t("tenantAdmin.users.transferModal.recipientPlaceholder")}</option>
            {eligibleRecipients.map((member) => (
              <option key={member.id} value={member.id}>
                {member.fullName} ({member.email} · {member.role})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-[var(--color-text-secondary)]">
            {t("tenantAdmin.users.transferModal.recipientHint")}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border-default)] pt-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {t("tenantAdmin.users.transferModal.cancelBtn")}
          </Button>
          <Button
            variant="danger"
            disabled={!recipientId || submitting}
            onClick={() => recipientId && onConfirm(Number(recipientId))}
          >
            {submitting
              ? t("tenantAdmin.users.transferModal.submittingBtn")
              : t("tenantAdmin.users.transferModal.confirmBtn", { action: actionLabel })}
          </Button>
        </div>
      </div>
    </div>
  );
}

