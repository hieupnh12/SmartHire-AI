import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearchParams } from "react-router-dom";
import {
  usersApi,
  type InviteMemberRequest,
  type InviteMemberResponse,
  type PendingInvitation,
  type StaffAssignment,
  type TenantMember,
  type UserStatus,
} from "@/api/tenant/usersApi";
import { companyApi } from "@/api/tenant/companyApi";
import { tenantRolesApi } from "@/api/tenant/tenantRolesApi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { Button } from "@/components/ux/Button";
import { Card } from "@/components/ux/Card";
import { Skeleton, TableSkeleton } from "@/components/ux/Skeleton";
import { formatDateTime, useLocale, useT, type TranslateFn } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";
import {
  AlertCircle,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  Lock,
  Mail,
  MailPlus,
  RotateCcw,
  Search,
  Send,
  Shield,
  Unlock,
  User as UserIcon,
  Users,
} from "lucide-react";
import { InviteEmailPreviewModal } from "../components/InviteEmailPreviewModal";
import { TransferJobsModal } from "../components/TransferJobsModal";

function createInviteSchema(t: TranslateFn) {
  return z.object({
    fullName: z.string().trim().min(1, t("tenantAdmin.users.validation.fullNameRequired")),
    email: z.string().trim().email(t("tenantAdmin.users.validation.emailInvalid")),
    role: z.string().trim().min(1, t("tenantAdmin.users.validation.roleRequired")),
  });
}

type Form = z.infer<ReturnType<typeof createInviteSchema>>;
type RightTab = "employees" | "invitations";
type StatusFilter = "ACTIVE_OR_LOCKED" | "ACTIVE" | "LOCKED" | "DISABLED" | "ALL";

const PAGE_SIZE = 20;

const inputClass =
  "min-h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-surface-card px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15";

const statusBadgeStyle: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  LOCKED: "bg-amber-50 text-amber-800 border-amber-200",
  DISABLED: "bg-slate-100 text-slate-600 border-slate-200",
};

export function UsersPage() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const askConfirm = useUiStore((s) => s.askConfirm);
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const urlUserId = searchParams.get("userId");

  const [rightTab, setRightTab] = useState<RightTab>("employees");
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE_OR_LOCKED");
  const [page, setPage] = useState(0);

  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const parsed = urlUserId ? Number(urlUserId) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastInviteResult, setLastInviteResult] = useState<InviteMemberResponse | null>(null);
  const [transferPrompt, setTransferPrompt] = useState<{
    member: TenantMember;
    status: UserStatus;
  } | null>(null);

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

  const invitationsQuery = useQuery({
    queryKey: ["tenant-invitations", "PENDING"],
    queryFn: () => usersApi.listInvitations("PENDING"),
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

  const inviteMutation = useMutation({
    mutationFn: (body: InviteMemberRequest) => usersApi.invite(body),
    onSuccess: (res) => {
      if (!res.success || !res.data) throw new Error(res.message);
      setLastInviteResult(res.data);
      toast.success(
        res.data.emailSent
          ? t("tenantAdmin.users.toasts.inviteEmailSent")
          : t("tenantAdmin.users.toasts.inviteCreated"),
      );
      void queryClient.invalidateQueries({ queryKey: ["tenant-users"] });
      void queryClient.invalidateQueries({ queryKey: ["tenant-invitations"] });
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

  const statusMutation = useMutation({
    mutationFn: ({
      member,
      status,
      transferToUserId,
    }: {
      member: TenantMember;
      status: UserStatus;
      transferToUserId?: number;
    }) => usersApi.updateStatus(member.id, { status, transferToUserId }),
    onSuccess: (res, vars) => {
      if (!res.success || !res.data) throw new Error(res.message);
      const label =
        vars.status === "ACTIVE"
          ? t("tenantAdmin.users.toasts.statusActivated")
          : vars.status === "LOCKED"
          ? t("tenantAdmin.users.toasts.statusLocked")
          : t("tenantAdmin.users.toasts.statusDisabled");
      toast.success(label);
      setTransferPrompt(null);
      void queryClient.invalidateQueries({ queryKey: ["tenant-users"] });
    },
    onError: (err, vars) => {
      if (axios.isAxiosError(err)) {
        const code = (err.response?.data as { code?: string } | undefined)?.code;
        if (code === "OWNER_TRANSFER_REQUIRED") {
          setTransferPrompt({ member: vars.member, status: vars.status });
          return;
        }
      }
      toast.danger(getApiErrorMessage(err, t("tenantAdmin.users.toasts.statusError")));
    },
  });

  const resendMutation = useMutation({
    mutationFn: (id: number) => usersApi.resendInvitation(id),
    onSuccess: (res) => {
      if (!res.success || !res.data) throw new Error(res.message);
      setLastInviteResult(res.data);
      toast.success(
        res.data.emailSent
          ? t("tenantAdmin.users.toasts.resendEmailSent")
          : t("tenantAdmin.users.toasts.resendExtended"),
      );
      void queryClient.invalidateQueries({ queryKey: ["tenant-invitations"] });
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, t("tenantAdmin.users.toasts.resendError"))),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: number) => usersApi.revokeInvitation(id),
    onSuccess: () => {
      toast.success(t("tenantAdmin.users.toasts.revokeSuccess"));
      void queryClient.invalidateQueries({ queryKey: ["tenant-invitations"] });
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, t("tenantAdmin.users.toasts.revokeError"))),
  });

  const allStaff = useMemo(
    () =>
      (members.data?.data ?? []).filter(
        (row) => row.role !== "CANDIDATE" && row.workspace !== "CANDIDATE",
      ),
    [members.data?.data],
  );

  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase();
    return allStaff.filter((row) => {
      const rowStatus = row.status ?? "ACTIVE";
      if (statusFilter === "ACTIVE_OR_LOCKED" && rowStatus === "DISABLED") return false;
      if (
        statusFilter !== "ALL" &&
        statusFilter !== "ACTIVE_OR_LOCKED" &&
        rowStatus !== statusFilter
      ) {
        return false;
      }
      if (roleFilter !== "ALL" && row.role !== roleFilter) return false;
      if (
        q &&
        !row.fullName.toLocaleLowerCase().includes(q) &&
        !row.email.toLocaleLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [allStaff, searchQuery, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pagedStaff = useMemo(
    () => filteredStaff.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
    [filteredStaff, safePage],
  );

  const pendingInvitations = invitationsQuery.data?.data ?? [];
  const selected = allStaff.find((row) => row.id === selectedId) ?? null;

  useEffect(() => {
    if (!urlQuery && !urlUserId) return;
    if (urlQuery) {
      setRightTab("employees");
      setSearchQuery(urlQuery);
      setPage(0);
    }
    if (urlUserId) {
      const parsed = Number(urlUserId);
      if (Number.isFinite(parsed) && parsed > 0) {
        setSelectedId(parsed);
      }
    }
  }, [urlQuery, urlUserId]);

  useEffect(() => {
    if (!urlUserId) return;
    const parsed = Number(urlUserId);
    const matched = allStaff.find((row) => row.id === parsed);
    if (matched && matched.status === "DISABLED") {
      setStatusFilter("ALL");
    }
  }, [allStaff, urlUserId]);

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

  const confirmStatusChange = (member: TenantMember, targetStatus: UserStatus) => {
    const config: Record<UserStatus, { title: string; description: string; confirmLabel: string; danger: boolean }> = {
      LOCKED: {
        title: t("tenantAdmin.users.confirms.lockTitle", { name: member.fullName }),
        description: t("tenantAdmin.users.confirms.lockDesc"),
        confirmLabel: t("tenantAdmin.users.confirms.lockConfirm"),
        danger: true,
      },
      DISABLED: {
        title: t("tenantAdmin.users.confirms.disableTitle", { name: member.fullName }),
        description: t("tenantAdmin.users.confirms.disableDesc"),
        confirmLabel: t("tenantAdmin.users.confirms.disableConfirm"),
        danger: true,
      },
      ACTIVE: {
        title: t("tenantAdmin.users.confirms.activateTitle", { name: member.fullName }),
        description: t("tenantAdmin.users.confirms.activateDesc"),
        confirmLabel: t("tenantAdmin.users.confirms.activateConfirm"),
        danger: false,
      },
    };
    const cfg = config[targetStatus];
    askConfirm({
      ...cfg,
      onConfirm: () => statusMutation.mutate({ member, status: targetStatus }),
    });
  };

  const confirmRevokeInvitation = (inv: PendingInvitation) => {
    askConfirm({
      title: t("tenantAdmin.users.confirms.revokeTitle", { email: inv.email }),
      description: t("tenantAdmin.users.confirms.revokeDesc"),
      confirmLabel: t("tenantAdmin.users.confirms.revokeConfirm"),
      danger: true,
      onConfirm: () => revokeMutation.mutate(inv.id),
    });
  };

  const eligibleRecipients = useMemo(() => {
    if (!transferPrompt) return [];
    return allStaff.filter((m) => m.id !== transferPrompt.member.id && m.status === "ACTIVE");
  }, [allStaff, transferPrompt]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">{t("tenantAdmin.users.pageTitle")}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {t("tenantAdmin.users.pageSubtitleV2")}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(20rem,25rem)_1fr] lg:items-start">
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
            onSubmit={handleSubmit((values) => inviteMutation.mutate(values))}
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
              <Button type="submit" disabled={inviteMutation.isPending} className="flex-1">
                <Send className="size-4 mr-1.5" />
                {inviteMutation.isPending ? t("tenantAdmin.users.sendingEmail") : t("tenantAdmin.users.sendInviteButton")}
              </Button>
            </div>
          </form>

          {lastInviteResult && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3 text-xs animate-in fade-in">
              <div className="flex items-start gap-2 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-sm">
                    {lastInviteResult.emailSent ? t("tenantAdmin.users.inviteSentTitle") : t("tenantAdmin.users.inviteLinkCreatedTitle")}
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    {lastInviteResult.emailSent
                      ? t("tenantAdmin.users.inviteSentDesc", {
                          fullName: lastInviteResult.fullName,
                          email: lastInviteResult.email,
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
                    onClick={() => handleCopy(lastInviteResult.acceptUrl)}
                    className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 font-semibold text-brand-primary shadow-xs border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                  >
                    {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                    <span>{copied ? t("tenantAdmin.users.copiedButton") : t("tenantAdmin.users.copyLinkButton")}</span>
                  </button>
                </div>
                <div className="break-all rounded-md bg-white/80 p-2 font-mono text-[11px] text-slate-800 border border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800">
                  {lastInviteResult.acceptUrl}
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
                    setLastInviteResult(null);
                    inviteMutation.reset();
                  }}
                  className="text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  {t("tenantAdmin.users.inviteAnotherButton")}
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* Staff & Pending Invitations Card */}
        <Card className="space-y-4 overflow-hidden p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-default)] pb-3">
            <div className="flex items-center gap-1.5" role="tablist" aria-label={t("tenantAdmin.users.tabsAriaLabel")}>
              <button
                type="button"
                role="tab"
                aria-selected={rightTab === "employees"}
                onClick={() => setRightTab("employees")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  rightTab === "employees"
                    ? "bg-[var(--color-primary-soft)] text-brand-primary"
                    : "text-[var(--color-text-secondary)] hover:bg-surface-muted",
                )}
              >
                <Users className="size-4" aria-hidden="true" />
                {t("tenantAdmin.users.employeesTab")}
                <span className="rounded-full bg-surface-card px-2 py-0.5 text-xs font-bold text-[var(--color-text-primary)]">
                  {allStaff.length}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={rightTab === "invitations"}
                onClick={() => setRightTab("invitations")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  rightTab === "invitations"
                    ? "bg-[var(--color-primary-soft)] text-brand-primary"
                    : "text-[var(--color-text-secondary)] hover:bg-surface-muted",
                )}
              >
                <Clock className="size-4" aria-hidden="true" />
                {t("tenantAdmin.users.invitationsTab")}
                {pendingInvitations.length > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                    {pendingInvitations.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {rightTab === "employees" ? (
            <>
              <div className="grid gap-2.5 sm:grid-cols-[1fr_11rem_12rem]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setPage(0);
                    }}
                    placeholder={t("tenantAdmin.users.searchPlaceholder")}
                    aria-label={t("tenantAdmin.users.searchAria")}
                    className={cn(inputClass, "pl-9")}
                  />
                </div>
                <select
                  aria-label={t("tenantAdmin.users.roleFilterAria")}
                  value={roleFilter}
                  onChange={(event) => {
                    setRoleFilter(event.target.value);
                    setPage(0);
                  }}
                  className={inputClass}
                >
                  <option value="ALL">{t("tenantAdmin.users.allRolesOption")}</option>
                  {assignableRoles.map((role) => (
                    <option key={role.code} value={role.code}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t("tenantAdmin.users.statusFilterAria")}
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as StatusFilter);
                    setPage(0);
                  }}
                  className={inputClass}
                >
                  <option value="ACTIVE_OR_LOCKED">{t("tenantAdmin.users.statusOptions.ACTIVE_OR_LOCKED")}</option>
                  <option value="ACTIVE">{t("tenantAdmin.users.statusOptions.ACTIVE")}</option>
                  <option value="LOCKED">{t("tenantAdmin.users.statusOptions.LOCKED")}</option>
                  <option value="DISABLED">{t("tenantAdmin.users.statusOptions.DISABLED")}</option>
                  <option value="ALL">{t("tenantAdmin.users.statusOptions.ALL")}</option>
                </select>
              </div>

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
              {!members.isLoading && !members.isError && filteredStaff.length === 0 && (
                <p className="py-6 text-center text-sm text-[var(--color-text-secondary)]">
                  {t("tenantAdmin.users.noFilteredMembers")}
                </p>
              )}

              {pagedStaff.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-[var(--color-surface-container-low)] text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
                      <tr>
                        <th className="px-3 py-3 font-semibold">{t("tenantAdmin.users.columns.member")}</th>
                        <th className="px-3 py-3 font-semibold">{t("tenantAdmin.users.columns.role")}</th>
                        <th className="px-3 py-3 font-semibold">{t("tenantAdmin.users.columns.status")}</th>
                        <th className="px-3 py-3 text-right font-semibold">{t("tenantAdmin.users.columns.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedStaff.map((row) => {
                        const rowStatus = (row.status ?? "ACTIVE") as UserStatus;
                        const isSelf = currentUser?.id != null && row.id === currentUser.id;
                        return (
                          <tr key={row.id} className="border-t border-[var(--color-border-default)]">
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-[var(--color-text-primary)]">{row.fullName}</span>
                                {isSelf && (
                                  <span className="rounded bg-[var(--color-primary-soft)] px-1.5 py-0.5 text-[10px] font-bold text-brand-primary">
                                    {t("tenantAdmin.users.selfBadge")}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[var(--color-text-secondary)]">{row.email}</p>
                            </td>
                            <td className="px-3 py-3">
                              <select
                                className={inputClass}
                                value={row.role}
                                disabled={assignMutation.isPending || rowStatus === "DISABLED"}
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
                            <td className="px-3 py-3">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                                  statusBadgeStyle[rowStatus] ?? "bg-slate-100 text-slate-700 border-slate-200",
                                )}
                              >
                                {statusLabel[rowStatus] ?? rowStatus}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  className="rounded-lg border border-[var(--color-border-default)] px-2.5 py-1.5 text-xs font-semibold text-brand-primary hover:bg-[var(--color-primary-subtle)]"
                                  onClick={() => setSelectedId(row.id)}
                                >
                                  {t("tenantAdmin.users.viewButton")}
                                </button>
                                {!isSelf && rowStatus === "ACTIVE" && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={statusMutation.isPending}
                                      onClick={() => confirmStatusChange(row, "LOCKED")}
                                      title={t("tenantAdmin.users.lockTitle")}
                                      className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                                    >
                                      <Lock className="size-3.5" aria-hidden="true" />
                                      {t("tenantAdmin.users.lockBtn")}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={statusMutation.isPending}
                                      onClick={() => confirmStatusChange(row, "DISABLED")}
                                      title={t("tenantAdmin.users.disableTitle")}
                                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                                    >
                                      <Ban className="size-3.5" aria-hidden="true" />
                                      {t("tenantAdmin.users.disableBtn")}
                                    </button>
                                  </>
                                )}
                                {!isSelf && rowStatus === "LOCKED" && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={statusMutation.isPending}
                                      onClick={() => confirmStatusChange(row, "ACTIVE")}
                                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                                    >
                                      <Unlock className="size-3.5" aria-hidden="true" />
                                      {t("tenantAdmin.users.unlockBtn")}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={statusMutation.isPending}
                                      onClick={() => confirmStatusChange(row, "DISABLED")}
                                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                                    >
                                      <Ban className="size-3.5" aria-hidden="true" />
                                      {t("tenantAdmin.users.disableBtn")}
                                    </button>
                                  </>
                                )}
                                {!isSelf && rowStatus === "DISABLED" && (
                                  <button
                                    type="button"
                                    disabled={statusMutation.isPending}
                                    onClick={() => confirmStatusChange(row, "ACTIVE")}
                                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                                  >
                                    <RotateCcw className="size-3.5" aria-hidden="true" />
                                    {t("tenantAdmin.users.restoreBtn")}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {filteredStaff.length > PAGE_SIZE && (
                <div className="flex items-center justify-between border-t border-[var(--color-border-default)] pt-3 text-xs text-[var(--color-text-secondary)]">
                  <span>
                    {t("tenantAdmin.users.pagination.summary", {
                      from: safePage * PAGE_SIZE + 1,
                      to: Math.min((safePage + 1) * PAGE_SIZE, filteredStaff.length),
                      total: filteredStaff.length,
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={safePage === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      {t("tenantAdmin.users.pagination.prev")}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={safePage + 1 >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      {t("tenantAdmin.users.pagination.next")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              {invitationsQuery.isLoading && <TableSkeleton columns={4} rows={3} />}
              {invitationsQuery.isError && (
                <p className="text-sm text-status-danger" role="alert">
                  {getApiErrorMessage(invitationsQuery.error, t("tenantAdmin.users.invitations.loadError"))}
                </p>
              )}
              {!invitationsQuery.isLoading && !invitationsQuery.isError && pendingInvitations.length === 0 && (
                <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
                  {t("tenantAdmin.users.invitations.empty")}
                </p>
              )}
              {pendingInvitations.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead className="bg-[var(--color-surface-container-low)] text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
                      <tr>
                        <th className="px-3 py-3 font-semibold">{t("tenantAdmin.users.invitations.columns.recipient")}</th>
                        <th className="px-3 py-3 font-semibold">{t("tenantAdmin.users.invitations.columns.role")}</th>
                        <th className="px-3 py-3 font-semibold">{t("tenantAdmin.users.invitations.columns.expiresAt")}</th>
                        <th className="px-3 py-3 text-right font-semibold">{t("tenantAdmin.users.invitations.columns.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingInvitations.map((inv) => (
                        <tr key={inv.id} className="border-t border-[var(--color-border-default)]">
                          <td className="px-3 py-3">
                            <p className="font-semibold text-[var(--color-text-primary)]">{inv.fullName}</p>
                            <p className="text-xs text-[var(--color-text-secondary)]">{inv.email}</p>
                          </td>
                          <td className="px-3 py-3 text-xs font-medium text-[var(--color-text-primary)]">
                            {roleLabel(inv.role)}
                          </td>
                          <td className="px-3 py-3 text-xs">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[var(--color-text-secondary)]">
                                {formatDateTime(inv.expiresAt, undefined, locale)}
                              </span>
                              {inv.expired && (
                                <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                  {t("tenantAdmin.users.invitations.expiredBadge")}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={resendMutation.isPending}
                                onClick={() => resendMutation.mutate(inv.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-default)] px-2.5 py-1.5 text-xs font-semibold text-brand-primary hover:bg-[var(--color-primary-subtle)] disabled:opacity-50"
                              >
                                <Send className="size-3.5" aria-hidden="true" />
                                {t("tenantAdmin.users.invitations.resendBtn")}
                              </button>
                              <button
                                type="button"
                                disabled={revokeMutation.isPending}
                                onClick={() => confirmRevokeInvitation(inv)}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                              >
                                <Ban className="size-3.5" aria-hidden="true" />
                                {t("tenantAdmin.users.invitations.revokeBtn")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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

      <TransferJobsModal
        open={transferPrompt != null}
        targetMember={transferPrompt?.member ?? null}
        targetStatus={transferPrompt?.status ?? "LOCKED"}
        eligibleRecipients={eligibleRecipients}
        submitting={statusMutation.isPending}
        onClose={() => setTransferPrompt(null)}
        onConfirm={(recipientId) => {
          if (!transferPrompt) return;
          statusMutation.mutate({
            member: transferPrompt.member,
            status: transferPrompt.status,
            transferToUserId: recipientId,
          });
        }}
      />

      {/* Modal previewing staff invitation Gmail */}
      <InviteEmailPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        workspaceName={workspaceName}
        senderEmail={mailSettings.data?.data?.mailUsername || ""}
        senderName={mailSettings.data?.data?.fromName || t("tenantAdmin.users.defaultSenderName", { workspace: workspaceName })}
        recipientName={lastInviteResult?.fullName || formValues.fullName}
        recipientEmail={lastInviteResult?.email || formValues.email}
        roleName={roleLabel(lastInviteResult?.role || formValues.role)}
        acceptUrl={lastInviteResult?.acceptUrl}
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
    OWNER: t("tenantAdmin.users.assignmentRoles.OWNER"),
    PRIMARY_RECRUITER: t("tenantAdmin.users.assignmentRoles.PRIMARY_RECRUITER"),
    COLLABORATOR: t("tenantAdmin.users.assignmentRoles.COLLABORATOR"),
    CO_RECRUITER: t("tenantAdmin.users.assignmentRoles.CO_RECRUITER"),
    VIEWER: t("tenantAdmin.users.assignmentRoles.VIEWER"),
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
