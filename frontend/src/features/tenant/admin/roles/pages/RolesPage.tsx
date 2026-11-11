import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tenantRolesApi, type TenantRole } from "@/api/tenant/tenantRolesApi";
import {
  Bell,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CheckCheck,
  FileSearch,
  GraduationCap,
  House,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ux/Button";
import { Card } from "@/components/ux/Card";
import { Skeleton } from "@/components/ux/Skeleton";
import { useT } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/stores/toastStore";

const PROTECTED_ROLE_CODES = new Set(["TENANT_ADMIN", "ADMIN", "HR", "RECRUITER", "CANDIDATE"]);

type FeatureAction = "VIEW" | "CREATE" | "EDIT" | "DELETE";

interface FeatureMatrixItem {
  code: string;
  labelKey: string;
  customLabelKey?: string;
  descriptionKey: string;
  icon: LucideIcon;
  actions: FeatureAction[];
}

const FEATURE_MATRIX: FeatureMatrixItem[] = [
  {
    code: "DASHBOARD",
    labelKey: "nav.dashboard",
    descriptionKey: "tenantAdmin.roles.matrix.descriptions.DASHBOARD",
    icon: House,
    actions: ["VIEW"],
  },
  {
    code: "JOBS",
    labelKey: "nav.publishedJobs",
    customLabelKey: "tenantAdmin.roles.matrix.jobsLabel",
    descriptionKey: "tenantAdmin.roles.matrix.descriptions.JOBS",
    icon: BriefcaseBusiness,
    actions: ["VIEW", "CREATE", "EDIT", "DELETE"],
  },
  {
    code: "APPLICANTS",
    labelKey: "nav.applicants",
    descriptionKey: "tenantAdmin.roles.matrix.descriptions.APPLICANTS",
    icon: Users,
    actions: ["VIEW", "EDIT", "DELETE"],
  },
  {
    code: "CV_SCREENING",
    labelKey: "nav.cvScreening",
    descriptionKey: "tenantAdmin.roles.matrix.descriptions.CV_SCREENING",
    icon: FileSearch,
    actions: ["VIEW", "EDIT", "DELETE"],
  },
  {
    code: "RANKING",
    labelKey: "nav.ranking",
    descriptionKey: "tenantAdmin.roles.matrix.descriptions.RANKING",
    icon: Sparkles,
    actions: ["VIEW", "EDIT"],
  },
  {
    code: "ANALYTICS",
    labelKey: "nav.recruitmentAnalytics",
    descriptionKey: "tenantAdmin.roles.matrix.descriptions.ANALYTICS",
    icon: ChartNoAxesCombined,
    actions: ["VIEW"],
  },
  {
    code: "ASSESSMENTS",
    labelKey: "nav.assessments",
    descriptionKey: "tenantAdmin.roles.matrix.descriptions.ASSESSMENTS",
    icon: GraduationCap,
    actions: ["VIEW", "EDIT", "DELETE"],
  },
  {
    code: "AI_INTERVIEWS",
    labelKey: "nav.aiInterview",
    descriptionKey: "tenantAdmin.roles.matrix.descriptions.AI_INTERVIEWS",
    icon: Bot,
    actions: ["VIEW", "EDIT", "DELETE"],
  },
  {
    code: "INTERVIEWS",
    labelKey: "nav.interviews",
    descriptionKey: "tenantAdmin.roles.matrix.descriptions.INTERVIEWS",
    icon: CalendarClock,
    actions: ["VIEW", "EDIT", "DELETE"],
  },
  {
    code: "SCHEDULES",
    labelKey: "nav.schedules",
    descriptionKey: "tenantAdmin.roles.matrix.descriptions.SCHEDULES",
    icon: CalendarDays,
    actions: ["VIEW", "EDIT", "DELETE"],
  },
  {
    code: "NOTIFICATIONS",
    labelKey: "nav.notifications",
    descriptionKey: "tenantAdmin.roles.matrix.descriptions.NOTIFICATIONS",
    icon: Bell,
    actions: ["VIEW", "EDIT", "DELETE"],
  },
];

function canDeleteRole(role: TenantRole) {
  return !role.system && role.workspace === "RECRUITER" && !PROTECTED_ROLE_CODES.has(role.code);
}

function DeleteIconButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger)]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-border-focus)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Trash2 className="size-4" aria-hidden />
    </button>
  );
}

export function RolesPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const askConfirm = useUiStore((s) => s.askConfirm);
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
  const [name, setName] = useState("");
  const [features, setFeatures] = useState<string[]>([]);

  const query = useQuery({
    queryKey: ["tenant-roles"],
    queryFn: tenantRolesApi.list,
  });

  const roles = query.data?.data?.roles ?? [];
  const recruiterRoles = useMemo(
    () => roles.filter((role) => role.workspace === "RECRUITER"),
    [roles],
  );
  const selected = selectedId === "new" ? null : recruiterRoles.find((role) => role.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId === "new") {
      setName("");
      setFeatures([]);
      return;
    }
    if (selected) {
      setName(selected.name);
      setFeatures(selected.features);
    }
  }, [selected, selectedId]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["tenant-roles"] });
    void queryClient.invalidateQueries({ queryKey: ["tenant-auth-profile"] });
  };

  const createMutation = useMutation({
    mutationFn: () => tenantRolesApi.create({ name, features }),
    onSuccess: (res) => {
      if (!res.success || !res.data) throw new Error(res.message);
      toast.success(t("tenantAdmin.roles.toasts.createSuccess"));
      invalidate();
      setSelectedId(res.data.id);
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, t("tenantAdmin.roles.toasts.createError"))),
  });

  const updateMutation = useMutation({
    mutationFn: (role: TenantRole) =>
      tenantRolesApi.update(role.id, role.system ? { features } : { name, features }),
    onSuccess: (res) => {
      if (!res.success || !res.data) throw new Error(res.message);
      toast.success(t("tenantAdmin.roles.toasts.updateSuccess"));
      invalidate();
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, t("tenantAdmin.roles.toasts.updateError"))),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => tenantRolesApi.remove(id),
    onSuccess: (res) => {
      if (!res.success) throw new Error(res.message);
      toast.success(t("tenantAdmin.roles.toasts.deleteSuccess"));
      setSelectedId(null);
      invalidate();
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, t("tenantAdmin.roles.toasts.deleteError"))),
  });

  const isActionChecked = (moduleCode: string, action: FeatureAction) => {
    return features.includes(moduleCode) || features.includes(`${moduleCode}_${action}`);
  };

  const isModuleAllChecked = (item: FeatureMatrixItem) => {
    return item.actions.every((act) => isActionChecked(item.code, act));
  };

  const toggleAction = (item: FeatureMatrixItem, action: FeatureAction) => {
    setFeatures((current) => {
      const checked = isActionChecked(item.code, action);
      let updated = [...current];

      if (checked) {
        // If the legacy full module code was stored, expand it into specific remaining actions
        if (updated.includes(item.code)) {
          updated = updated.filter((f) => f !== item.code);
          for (const act of item.actions) {
            if (act !== action && !updated.includes(`${item.code}_${act}`)) {
              updated.push(`${item.code}_${act}`);
            }
          }
        }
        // Remove this action
        updated = updated.filter((f) => f !== `${item.code}_${action}`);

        // If unchecking VIEW, user cannot edit or delete either -> remove all actions
        if (action === "VIEW") {
          updated = updated.filter(
            (f) => f !== item.code && !f.startsWith(`${item.code}_`),
          );
        }
      } else {
        // Checking this action
        if (!updated.includes(`${item.code}_${action}`)) {
          updated.push(`${item.code}_${action}`);
        }
        // If checking CREATE, EDIT or DELETE, ensure VIEW is also enabled
        if (action === "CREATE" || action === "EDIT" || action === "DELETE") {
          if (!updated.includes(`${item.code}_VIEW`) && !updated.includes(item.code)) {
            updated.push(`${item.code}_VIEW`);
          }
        }
      }
      return updated;
    });
  };

  const toggleAllModule = (item: FeatureMatrixItem) => {
    setFeatures((current) => {
      const allChecked = isModuleAllChecked(item);
      let updated = current.filter(
        (f) => f !== item.code && !f.startsWith(`${item.code}_`),
      );
      if (!allChecked) {
        // Grant all actions for this module
        for (const act of item.actions) {
          updated.push(`${item.code}_${act}`);
        }
      }
      return updated;
    });
  };

  const toggleScope = (scopeCode: string) => {
    setFeatures((current) =>
      current.includes(scopeCode)
        ? current.filter((f) => f !== scopeCode)
        : [...current, scopeCode],
    );
  };

  const selectAllFeatures = () => {
    const all: string[] = [];
    for (const item of FEATURE_MATRIX) {
      for (const act of item.actions) {
        all.push(`${item.code}_${act}`);
      }
    }
    setFeatures(all);
  };

  const clearAllFeatures = () => {
    setFeatures([]);
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  const askDelete = (role: TenantRole) => {
    if (!canDeleteRole(role)) {
      toast.danger(t("tenantAdmin.roles.toasts.cannotDeleteProtected"));
      return;
    }
    askConfirm({
      title: t("tenantAdmin.roles.deleteConfirm.title", { name: role.name }),
      description: t("tenantAdmin.roles.deleteConfirm.description"),
      confirmLabel: t("tenantAdmin.roles.deleteConfirm.confirmLabel"),
      danger: true,
      onConfirm: () => deleteMutation.mutate(role.id),
    });
  };

  const totalAssignedCount = useMemo(() => {
    let count = 0;
    for (const item of FEATURE_MATRIX) {
      for (const act of item.actions) {
        if (isActionChecked(item.code, act)) count++;
      }
    }
    if (features.includes("JOBS_ALL")) count++;
    return count;
  }, [features]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">{t("tenantAdmin.roles.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">
          {t("tenantAdmin.roles.subtitle")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(18rem,22rem)_1fr] lg:items-start">
        {/* Left Column: Roles List & Scope */}
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">{t("tenantAdmin.roles.rolesCardTitle")}</h2>
              <Button type="button" size="sm" onClick={() => setSelectedId("new")}>
                {t("tenantAdmin.roles.createRoleButton")}
              </Button>
            </div>
            {query.isLoading && (
              <div className="space-y-2 py-1" role="status" aria-busy="true">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-9 w-full rounded-[var(--radius-md)]" />
                ))}
                <span className="sr-only">{t("tenantAdmin.roles.loadingRolesSr")}</span>
              </div>
            )}
            {query.isError && (
              <p className="text-sm text-status-danger" role="alert">
                {getApiErrorMessage(query.error, t("tenantAdmin.roles.loadRolesError"))}
              </p>
            )}
            <ul className="space-y-1">
              {recruiterRoles.map((role) => (
                <li key={role.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedId(role.id)}
                    className={`flex min-w-0 flex-1 items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-left text-sm transition-colors ${
                      selectedId === role.id
                        ? "bg-[var(--color-primary-soft)] text-brand-primary font-semibold"
                        : "hover:bg-[var(--color-surface-alt)]"
                    }`}
                  >
                    <span className="truncate">{role.name}</span>
                    <span className="ml-2 shrink-0 text-xs text-[var(--color-text-secondary)]">
                      {role.system ? t("tenantAdmin.roles.defaultRoleBadge") : role.code}
                    </span>
                  </button>
                  {canDeleteRole(role) && (
                    <DeleteIconButton
                      label={t("tenantAdmin.roles.deleteRoleAria", { name: role.name })}
                      disabled={deleteMutation.isPending}
                      onClick={() => askDelete(role)}
                    />
                  )}
                </li>
              ))}
            </ul>
          </Card>

          {/* Recruitment Scope Section moved under Roles List */}
          {selectedId != null && (
            <Card className="border border-[var(--color-primary-soft)] bg-gradient-to-br from-[var(--color-primary-soft)]/40 to-transparent p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary text-white shadow-sm mt-0.5">
                  <ShieldCheck className="size-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={features.includes("JOBS_ALL")}
                      onChange={() => toggleScope("JOBS_ALL")}
                      className="mt-0.5 size-4 rounded border-[var(--color-border-default)] text-brand-primary focus:ring-brand-primary/20 accent-[var(--color-primary)] cursor-pointer"
                    />
                    <span className="font-semibold text-xs text-[var(--color-text-primary)] leading-snug">
                      {t("tenantAdmin.roles.jobsAllTitle")}
                    </span>
                  </label>
                  <p className="mt-1.5 text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                    {t("tenantAdmin.roles.jobsAllDesc")}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Role Permissions Matrix */}
        <Card className="space-y-5">
          {selectedId == null && (
            <div className="py-12 text-center text-sm text-[var(--color-text-secondary)]">
              <Shield className="mx-auto size-10 stroke-1 text-slate-300 mb-2" />
              {t("tenantAdmin.roles.emptySelection")}
            </div>
          )}
          {selectedId != null && (
            <>
              {/* Role Name */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--color-border-default)] pb-4">
                <div className="flex-1 max-w-md">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]" htmlFor="role-name">
                    {t("tenantAdmin.roles.roleNameLabel")}
                  </label>
                  <input
                    id="role-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={selected?.system}
                    placeholder={t("tenantAdmin.roles.roleNamePlaceholder")}
                    className="min-h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-white px-3 text-sm font-medium outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 disabled:opacity-70 disabled:bg-slate-50"
                  />
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-medium text-brand-primary">
                    <Check className="size-3.5" />
                    {t("tenantAdmin.roles.assignedCountBadge", { count: totalAssignedCount })}
                  </span>
                </div>
              </div>

              {/* Granular Permissions Table */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                    {t("tenantAdmin.roles.granularTitle")}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllFeatures}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-default)] bg-white px-2.5 py-1 text-xs font-medium hover:bg-[var(--color-surface-alt)] hover:text-brand-primary transition-colors"
                    >
                      <CheckCheck className="size-3.5" />
                      {t("tenantAdmin.roles.selectAll")}
                    </button>
                    <button
                      type="button"
                      onClick={clearAllFeatures}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-default)] bg-white px-2.5 py-1 text-xs font-medium hover:bg-[var(--color-surface-alt)] hover:text-status-danger transition-colors"
                    >
                      {t("tenantAdmin.roles.clearAll")}
                    </button>
                  </div>
                </div>

                <div className="max-h-[480px] overflow-y-auto rounded-xl border border-[var(--color-border-default)] bg-white shadow-sm">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="sticky top-0 z-10 bg-[var(--color-surface-alt)] shadow-sm">
                      <tr className="border-b border-[var(--color-border-default)] text-[var(--color-text-secondary)] text-xs font-semibold">
                        <th className="py-3 px-4 font-semibold">{t("tenantAdmin.roles.columns.feature")}</th>
                        <th className="py-3 px-2 text-center w-16 font-semibold">{t("tenantAdmin.roles.columns.all")}</th>
                        <th className="py-3 px-2 text-center w-16 font-semibold">{t("tenantAdmin.roles.columns.view")}</th>
                        <th className="py-3 px-2 text-center w-16 font-semibold">{t("tenantAdmin.roles.columns.create")}</th>
                        <th className="py-3 px-2 text-center w-16 font-semibold">{t("tenantAdmin.roles.columns.edit")}</th>
                        <th className="py-3 px-2 text-center w-16 font-semibold">{t("tenantAdmin.roles.columns.delete")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border-default)]">
                      {FEATURE_MATRIX.map((item) => {
                        const Icon = item.icon;
                        const allChecked = isModuleAllChecked(item);
                        const hasCreate = item.actions.includes("CREATE");
                        const hasEdit = item.actions.includes("EDIT");
                        const hasDelete = item.actions.includes("DELETE");

                        const viewChecked = isActionChecked(item.code, "VIEW");
                        const createChecked = isActionChecked(item.code, "CREATE");
                        const editChecked = isActionChecked(item.code, "EDIT");
                        const deleteChecked = isActionChecked(item.code, "DELETE");

                        return (
                          <tr
                            key={item.code}
                            className="hover:bg-[var(--color-surface-alt)]/40 transition-colors"
                          >
                            {/* Feature Info */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-brand-primary">
                                  <Icon className="size-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm text-[var(--color-text-primary)]">
                                    {item.customLabelKey ? t(item.customLabelKey) : t(item.labelKey)}
                                  </p>
                                  <p className="text-xs text-[var(--color-text-secondary)] line-clamp-1">
                                    {t(item.descriptionKey)}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* All Checkbox */}
                            <td className="py-3 px-2 text-center">
                              <label className="inline-flex items-center justify-center cursor-pointer p-1">
                                <input
                                  type="checkbox"
                                  checked={allChecked}
                                  onChange={() => toggleAllModule(item)}
                                  className="size-4.5 rounded border-[var(--color-border-default)] text-brand-primary focus:ring-brand-primary/20 accent-[var(--color-primary)] cursor-pointer"
                                />
                              </label>
                            </td>

                            {/* VIEW Action */}
                            <td className="py-3 px-2 text-center">
                              <label className="inline-flex items-center justify-center cursor-pointer p-1">
                                <input
                                  type="checkbox"
                                  checked={viewChecked}
                                  onChange={() => toggleAction(item, "VIEW")}
                                  className="size-4.5 rounded border-[var(--color-border-default)] text-brand-primary focus:ring-brand-primary/20 accent-[var(--color-primary)] cursor-pointer"
                                />
                              </label>
                            </td>

                            {/* CREATE Action */}
                            <td className="py-3 px-2 text-center">
                              {hasCreate ? (
                                <label
                                  title={item.code === "JOBS" ? t("tenantAdmin.roles.jobsCreateTooltip") : undefined}
                                  className="inline-flex items-center justify-center cursor-pointer p-1"
                                >
                                  <input
                                    type="checkbox"
                                    checked={createChecked}
                                    onChange={() => toggleAction(item, "CREATE")}
                                    className="size-4.5 rounded border-[var(--color-border-default)] text-brand-primary focus:ring-brand-primary/20 accent-[var(--color-primary)] cursor-pointer"
                                  />
                                </label>
                              ) : (
                                <span className="text-slate-300 font-medium select-none">—</span>
                              )}
                            </td>

                            {/* EDIT Action */}
                            <td className="py-3 px-2 text-center">
                              {hasEdit ? (
                                <label className="inline-flex items-center justify-center cursor-pointer p-1">
                                  <input
                                    type="checkbox"
                                    checked={editChecked}
                                    onChange={() => toggleAction(item, "EDIT")}
                                    className="size-4.5 rounded border-[var(--color-border-default)] text-brand-primary focus:ring-brand-primary/20 accent-[var(--color-primary)] cursor-pointer"
                                  />
                                </label>
                              ) : (
                                <span className="text-slate-300 font-medium select-none">—</span>
                              )}
                            </td>

                            {/* DELETE Action */}
                            <td className="py-3 px-2 text-center">
                              {hasDelete ? (
                                <label className="inline-flex items-center justify-center cursor-pointer p-1">
                                  <input
                                    type="checkbox"
                                    checked={deleteChecked}
                                    onChange={() => toggleAction(item, "DELETE")}
                                    className="size-4.5 rounded border-[var(--color-border-default)] text-brand-primary focus:ring-brand-primary/20 accent-[var(--color-primary)] cursor-pointer"
                                  />
                                </label>
                              ) : (
                                <span className="text-slate-300 font-medium select-none">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-default)] pt-4">
                <div>
                  {selected && canDeleteRole(selected) && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-status-danger hover:bg-status-danger/10"
                      disabled={deleteMutation.isPending}
                      onClick={() => askDelete(selected)}
                    >
                      <Trash2 className="size-4 mr-1.5" />
                      {t("tenantAdmin.roles.deleteRoleButton")}
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (selected) {
                        setName(selected.name);
                        setFeatures(selected.features);
                      } else {
                        setSelectedId(null);
                      }
                    }}
                  >
                    {t("tenantAdmin.roles.cancelChanges")}
                  </Button>
                  <Button
                    type="button"
                    disabled={saving || !name.trim()}
                    onClick={() => {
                      if (selectedId === "new") createMutation.mutate();
                      else if (selected) updateMutation.mutate(selected);
                    }}
                  >
                    {saving
                      ? t("tenantAdmin.roles.saving")
                      : selectedId === "new"
                        ? t("tenantAdmin.roles.createRoleButton")
                        : t("tenantAdmin.roles.saveChanges")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </section>
  );
}
