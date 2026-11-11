import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { usersApi, type InviteMemberRequest, type StaffAssignment, type TenantMember } from "@/api/tenant/usersApi";
import { companyApi } from "@/api/tenant/companyApi";
import { tenantRolesApi } from "@/api/tenant/tenantRolesApi";
import { Button } from "@/components/ux/Button";
import { Card } from "@/components/ux/Card";
import { Skeleton, TableSkeleton } from "@/components/ux/Skeleton";
import { formatDateTime, useLocale, useT, type TranslateFn } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { toast } from "@/stores/toastStore";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  Mail,
  MailPlus,
  Send,
  Shield,
  User as UserIcon,
} from "lucide-react";
import { InviteEmailPreviewModal } from "../components/InviteEmailPreviewModal";

function createInviteSchema(t: TranslateFn) {
  return z.object({
    fullName: z.string().trim().min(1, t("tenantAdmin.users.validation.fullNameRequired")),
    email: z.string().trim().email(t("tenantAdmin.users.validation.emailInvalid")),
    role: z.string().trim().min(1, t("tenantAdmin.users.validation.roleRequired")),
  });
}

type Form = z.infer<ReturnType<typeof createInviteSchema>>;

const inputClass =
  "min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-surface-card px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15";

export function UsersPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const schema = useMemo(() => createInviteSchema(t), [t]);

  const statusLabel = useMemo<Record<string, string>>(
    () => ({
      ACTIVE: t("tenantAdmin.users.statuses.ACTIVE"),
      LOCKED: t("tenantAdmin.users.statuses.LOCKED"),
      DISABLED: t("tenantAdmin.users.statuses.DISABLED"),
    }),
    [t],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { role: "RECRUITER" },
  });

  const formValues = watch();

  const rolesQuery = useQuery({
    queryKey: ["tenant-roles"],
    queryFn: tenantRolesApi.list,
  });
  const assignableRoles = (rolesQuery.data?.data?.roles ?? []).filter((role) => role.workspace !== "CANDIDATE");
  const roleLabel = (code: string) => assignableRoles.find((role) => role.code === code)?.name ?? code;

  const members = useQuery({
    queryKey: ["tenant-users"],
    queryFn: () => usersApi.list(),
  });

  const mailSettings = useQuery({
    queryKey: ["tenant", "company", "mail-settings"],
    queryFn: companyApi.getMailSettings,
  });
  const isMailConfigured = Boolean(mailSettings.data?.data?.configured);

  const companyProfile = useQuery({
    queryKey: ["tenant", "company", "profile"],
    queryFn: companyApi.getProfile,
  });
  const workspaceName = companyProfile.data?.data?.companyName || mailSettings.data?.data?.fromName || "SmartHire Workspace";

  const handleCopy = (url: string) => {
    void navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success(t("tenantAdmin.users.toasts.copiedActivationLink"));
    setTimeout(() => setCopied(false), 2500);
  };

  const mutation = useMutation({
    mutationFn: (body: InviteMemberRequest) => usersApi.invite(body),
    onSuccess: (res) => {
      if (!res.success || !res.data) throw new Error(res.message);
      toast.success(
        res.data.emailSent
          ? t("tenantAdmin.users.toasts.inviteEmailSent")
          : t("tenantAdmin.users.toasts.inviteCreated"),
      );
      void queryClient.invalidateQueries({ queryKey: ["tenant-users"] });
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, t("tenantAdmin.users.toasts.inviteError"))),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => usersApi.assignRole(id, role),
    onSuccess: (res) => {
      if (!res.success || !res.data) throw new Error(res.message);
      toast.success(t("tenantAdmin.users.toasts.roleAssigned"));
      void queryClient.invalidateQueries({ queryKey: ["tenant-users"] });
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, t("tenantAdmin.users.toasts.roleAssignError"))),
  });

  const invite = mutation.data?.data;
  const rows = (members.data?.data ?? []).filter(
    (row) => row.role !== "CANDIDATE" && row.workspace !== "CANDIDATE",
  );
  const selected = rows.find((row) => row.id === selectedId) ?? null;
  const duties = useQuery({
    queryKey: ["tenant-users", selectedId, "assignments"],
    queryFn: () => usersApi.assignments(selectedId!),
    enabled: selectedId != null,
  });

  useEffect(() => {
    if (selectedId == null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">{t("tenantAdmin.users.pageTitle")}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {t("tenantAdmin.users.pageSubtitle")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(20rem,26rem)_1fr] lg:items-start">
        {/* Invite Card */}
        <Card className="space-y-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-default)]/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary">
                <MailPlus className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--color-text-primary)]">{t("tenantAdmin.users.inviteCardTitle")}</h2>
                <p className="text-xs text-[var(--color-text-secondary)]">{t("tenantAdmin.users.inviteCardSubtitle")}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] hover:border-brand-primary hover:text-brand-primary transition-colors"
              title={t("tenantAdmin.users.previewEmailTitle")}
            >
              <Eye className="size-3.5" />
              <span>{t("tenantAdmin.users.previewEmailButton")}</span>
            </button>
          </div>

          {/* Company Gmail Status Badge */}
          {isMailConfigured ? (
            <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
              <span className="flex items-center gap-1.5 font-medium truncate">
                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="truncate">
                  {t("tenantAdmin.users.mailConfiguredSender")}{" "}
                  <strong>{mailSettings.data?.data?.mailUsername}</strong>
                </span>
              </span>
              <Link to="/internal/admin/system" className="text-[11px] font-semibold text-brand-primary hover:underline shrink-0 ml-2">
                {t("tenantAdmin.users.changeMailLink")}
              </Link>
            </div>
          ) : !mailSettings.isLoading ? (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300 space-y-1.5">
              <p className="font-semibold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <AlertCircle className="size-4 shrink-0" />
                {t("tenantAdmin.users.mailNotConfiguredTitle")}
              </p>
              <p className="leading-relaxed text-[11px]">
                {t("tenantAdmin.users.mailNotConfiguredDesc")}
              </p>
              <Link
                to="/internal/admin/system"
                className="inline-flex items-center gap-1 font-semibold text-brand-primary hover:underline pt-0.5 text-xs"
              >
                {t("tenantAdmin.users.configureMailLink")}
              </Link>
            </div>
          ) : null}

          <form
            className="space-y-4"
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
            noValidate
          >
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs sm:text-sm font-medium" htmlFor="fullName">
                <UserIcon className="size-3.5 text-[var(--color-text-secondary)]" />
                <span>{t("tenantAdmin.users.fullNameLabel")} <strong className="text-red-500">*</strong></span>
              </label>
              <input id="fullName" placeholder={t("tenantAdmin.users.fullNamePlaceholder")} className={inputClass} {...register("fullName")} />
              {errors.fullName && (
                <p className="mt-1 text-xs text-status-danger" role="alert">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs sm:text-sm font-medium" htmlFor="email">
                <Mail className="size-3.5 text-[var(--color-text-secondary)]" />
                <span>{t("tenantAdmin.users.emailLabel")} <strong className="text-red-500">*</strong></span>
              </label>
              <input id="email" type="email" placeholder={t("tenantAdmin.users.emailPlaceholder")} className={inputClass} {...register("email")} />
              {errors.email && (
                <p className="mt-1 text-xs text-status-danger" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs sm:text-sm font-medium" htmlFor="role">
                <Shield className="size-3.5 text-[var(--color-text-secondary)]" />
                <span>{t("tenantAdmin.users.roleLabel")} <strong className="text-red-500">*</strong></span>
              </label>
              <select id="role" className={inputClass} {...register("role")}>
                {assignableRoles.map((role) => (
                  <option key={role.code} value={role.code}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button type="submit" disabled={mutation.isPending} className="flex-1">
                <Send className="size-4 mr-1.5" />
                {mutation.isPending ? t("tenantAdmin.users.sendingEmail") : t("tenantAdmin.users.sendInviteButton")}
              </Button>
            </div>
          </form>

          {/* Invite Result */}
          {invite && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3 text-xs animate-in fade-in">
              <div className="flex items-start gap-2 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-sm">
                    {invite.emailSent ? t("tenantAdmin.users.inviteSentTitle") : t("tenantAdmin.users.inviteLinkCreatedTitle")}
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    {invite.emailSent
                      ? t("tenantAdmin.users.inviteSentDesc", {
                          fullName: invite.fullName,
                          email: invite.email,
                        })
                      : t("tenantAdmin.users.inviteFallbackDesc")}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{t("tenantAdmin.users.activationLinkLabel")}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(invite.acceptUrl)}
                    className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 font-semibold text-brand-primary shadow-xs border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                  >
                    {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                    <span>{copied ? t("tenantAdmin.users.copiedButton") : t("tenantAdmin.users.copyLinkButton")}</span>
                  </button>
                </div>
                <div className="break-all rounded-md bg-white/80 p-2 font-mono text-[11px] text-slate-800 border border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800">
                  {invite.acceptUrl}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-emerald-500/10">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="inline-flex items-center gap-1 font-semibold text-brand-primary hover:underline text-xs"
                >
                  <Eye className="size-3" />
                  <span>{t("tenantAdmin.users.viewSentEmailButton")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    reset({ fullName: "", email: "", role: "RECRUITER" });
                    mutation.reset();
                  }}
                  className="text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  {t("tenantAdmin.users.inviteAnotherButton")}
                </button>
              </div>
            </div>
          )}
        </Card>

        <Card className="space-y-4 overflow-hidden">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{t("tenantAdmin.users.membersCardTitle")}</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {t("tenantAdmin.users.membersCardSubtitle")}
          </p>
          {members.isLoading && (
            <div className="py-2" role="status" aria-busy="true">
              <TableSkeleton columns={5} rows={4} />
              <span className="sr-only">{t("tenantAdmin.users.loadingMembersSr")}</span>
            </div>
          )}
          {members.isError && (
            <p className="text-sm text-status-danger" role="alert">
              {getApiErrorMessage(members.error, t("tenantAdmin.users.loadMembersError"))}
            </p>
          )}
          {!members.isLoading && !members.isError && rows.length === 0 && (
            <p className="text-sm text-[var(--color-text-secondary)]">{t("tenantAdmin.users.emptyMembers")}</p>
          )}
          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--color-surface-container-low)]">
                  <tr>
                    <th className="px-3 py-3 font-semibold">{t("tenantAdmin.users.columns.fullName")}</th>
                    <th className="px-3 py-3 font-semibold">{t("tenantAdmin.users.columns.email")}</th>
                    <th className="px-3 py-3 font-semibold">{t("tenantAdmin.users.columns.role")}</th>
                    <th className="px-3 py-3 font-semibold">{t("tenantAdmin.users.columns.status")}</th>
                    <th className="px-3 py-3 font-semibold">{t("tenantAdmin.users.columns.detail")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-[var(--color-border-default)]">
                      <td className="px-3 py-3">{row.fullName}</td>
                      <td className="px-3 py-3">{row.email}</td>
                      <td className="px-3 py-3">
                        <select
                          className={inputClass}
                          value={row.role}
                          disabled={assignMutation.isPending}
                          aria-label={t("tenantAdmin.users.memberRoleAria", { name: row.fullName })}
                          onChange={(event) => {
                            const next = event.target.value;
                            if (next === row.role) return;
                            assignMutation.mutate({ id: row.id, role: next });
                          }}
                        >
                          {assignableRoles.map((role) => (
                            <option key={role.code} value={role.code}>
                              {role.name}
                            </option>
                          ))}
                          {!assignableRoles.some((role) => role.code === row.role) && (
                            <option value={row.role}>{roleLabel(row.role)}</option>
                          )}
                        </select>
                      </td>
                      <td className="px-3 py-3">{statusLabel[row.status ?? ""] ?? row.status ?? "—"}</td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          className="text-sm font-semibold text-brand-primary"
                          onClick={() => setSelectedId(row.id)}
                        >
                          {t("tenantAdmin.users.viewButton")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
      {selected && (
        <EmployeeDetailDialog
          member={selected}
          roleName={roleLabel(selected.role)}
          jobs={duties.data?.data ?? []}
          loading={duties.isLoading}
          error={duties.isError ? getApiErrorMessage(duties.error) : null}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* Modal previewing staff invitation Gmail */}
      <InviteEmailPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        workspaceName={workspaceName}
        senderEmail={mailSettings.data?.data?.mailUsername || ""}
        senderName={mailSettings.data?.data?.fromName || t("tenantAdmin.users.defaultSenderName", { workspace: workspaceName })}
        recipientName={invite?.fullName || formValues.fullName}
        recipientEmail={invite?.email || formValues.email}
        roleName={roleLabel(invite?.role || formValues.role)}
        acceptUrl={invite?.acceptUrl}
      />
    </section>
  );
}

function EmployeeDetailDialog({
  member,
  roleName,
  jobs,
  loading,
  error,
  onClose,
}: {
  member: TenantMember;
  roleName: string;
  jobs: StaffAssignment[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const t = useT();
  const locale = useLocale();

  const statusLabel: Record<string, string> = {
    ACTIVE: t("tenantAdmin.users.statuses.ACTIVE"),
    LOCKED: t("tenantAdmin.users.statuses.LOCKED"),
    DISABLED: t("tenantAdmin.users.statuses.DISABLED"),
  };

  const workspaceLabel: Record<string, string> = {
    ADMIN: t("tenantAdmin.users.workspaces.ADMIN"),
    RECRUITER: t("tenantAdmin.users.workspaces.RECRUITER"),
    CANDIDATE: t("tenantAdmin.users.workspaces.CANDIDATE"),
  };

  const assignmentRoleLabel: Record<string, string> = {
    PRIMARY_RECRUITER: t("tenantAdmin.users.assignmentRoles.PRIMARY_RECRUITER"),
    CO_RECRUITER: t("tenantAdmin.users.assignmentRoles.CO_RECRUITER"),
  };

  const jobStatusLabel: Record<string, string> = {
    DRAFT: t("tenantAdmin.users.jobStatuses.DRAFT"),
    PUBLISHED: t("tenantAdmin.users.jobStatuses.PUBLISHED"),
    PAUSED: t("tenantAdmin.users.jobStatuses.PAUSED"),
    CLOSED: t("tenantAdmin.users.jobStatuses.CLOSED"),
    ARCHIVED: t("tenantAdmin.users.jobStatuses.ARCHIVED"),
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-detail-title"
        className="max-h-[min(40rem,90vh)] w-full max-w-lg overflow-y-auto rounded-[var(--radius-lg)] bg-surface-card p-6 shadow-[var(--shadow-elevated)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="employee-detail-title" className="font-display text-xl font-semibold text-[var(--color-text-primary)]">
            {member.fullName}
          </h2>
          <button type="button" className="text-sm text-[var(--color-text-secondary)]" onClick={onClose}>
            {t("tenantAdmin.users.detailDialog.close")}
          </button>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--color-text-secondary)]">{t("tenantAdmin.users.detailDialog.email")}</dt>
            <dd className="mt-1 font-medium text-[var(--color-text-primary)]">{member.email}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-secondary)]">{t("tenantAdmin.users.detailDialog.role")}</dt>
            <dd className="mt-1 font-medium text-[var(--color-text-primary)]">{roleName}</dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-secondary)]">{t("tenantAdmin.users.detailDialog.workspace")}</dt>
            <dd className="mt-1 font-medium text-[var(--color-text-primary)]">
              {workspaceLabel[member.workspace ?? ""] ?? member.workspace ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-text-secondary)]">{t("tenantAdmin.users.detailDialog.status")}</dt>
            <dd className="mt-1 font-medium text-[var(--color-text-primary)]">
              {statusLabel[member.status ?? ""] ?? member.status ?? "—"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[var(--color-text-secondary)]">{t("tenantAdmin.users.detailDialog.joinedAt")}</dt>
            <dd className="mt-1 font-medium text-[var(--color-text-primary)]">
              {member.createdAt ? formatDateTime(member.createdAt, undefined, locale) : "—"}
            </dd>
          </div>
        </dl>
        <h3 className="mt-6 text-sm font-semibold text-[var(--color-text-primary)]">{t("tenantAdmin.users.detailDialog.assignedJobsTitle")}</h3>
        {loading && (
          <div className="mt-3 space-y-2" role="status" aria-busy="true">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
            <span className="sr-only">{t("tenantAdmin.users.detailDialog.loadingJobsSr")}</span>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-status-danger">{error}</p>}
        {!loading && !error && jobs.length === 0 && (
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{t("tenantAdmin.users.detailDialog.noJobsAssigned")}</p>
        )}
        {jobs.length > 0 && (
          <ul className="mt-2 divide-y divide-[var(--color-border-default)]">
            {jobs.map((job) => (
              <li key={job.jobId} className="flex items-start justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="block font-medium text-[var(--color-text-primary)]">{job.title}</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {assignmentRoleLabel[job.assignmentRole] ?? job.assignmentRole}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-brand-primary">
                  {jobStatusLabel[job.status] ?? job.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
