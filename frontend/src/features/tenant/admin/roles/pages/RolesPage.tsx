import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  Plus,
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
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger)]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-border-focus)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Trash2 className="size-3.5" aria-hidden />
    </button>
  );
}

export function RolesPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const askConfirm = useUiStore((s) => s.askConfirm);
  const [searchParams] = useSearchParams();
  const urlRoleCode = searchParams.get("role");
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
  const selected =
    selectedId === "new"
      ? null
      : recruiterRoles.find((role) => role.id === selectedId) ?? null;

  // Apply explicit deep-link ?role=... when present
  useEffect(() => {
    if (!urlRoleCode || recruiterRoles.length === 0) return;
    const matched = recruiterRoles.find(
      (role) => role.code.toLowerCase() === urlRoleCode.trim().toLowerCase(),
    );
    if (matched) {
      setSelectedId(matched.id);
    }
  }, [urlRoleCode, recruiterRoles]);

  // Auto-select first role immediately on page load (or after deletion) so panel is never empty
  useEffect(() => {
    if (recruiterRoles.length === 0) return;
    setSelectedId((current) => {
      if (current === "new") return current;
      if (current != null && recruiterRoles.some((role) => role.id === current)) {
        return current;
      }
      if (urlRoleCode) {
        const matched = recruiterRoles.find(
          (role) => role.code.toLowerCase() === urlRoleCode.trim().toLowerCase(),
        );
        if (matched) return matched.id;
      }
      return recruiterRoles[0].id;
    });
  }, [recruiterRoles, urlRoleCode]);

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
        if (updated.includes(item.code)) {
          updated = updated.filter((f) => f !== item.code);
          for (const act of item.actions) {
            if (act !== action && !updated.includes(`${item.code}_${act}`)) {
              updated.push(`${item.code}_${act}`);
            }
          }
        }
        updated = updated.filter((f) => f !== `${item.code}_${action}`);

        if (action === "VIEW") {
          updated = updated.filter(
            (f) => f !== item.code && !f.startsWith(`${item.code}_`),
          );
        }
      } else {
        if (!updated.includes(`${item.code}_${action}`)) {
          updated.push(`${item.code}_${action}`);
        }
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
      const updated = current.filter(
        (f) => f !== item.code && !f.startsWith(`${item.code}_`),
      );
      if (!allChecked) {
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
    <section className="flex flex-col gap-3 lg:h-[calc(100dvh-6.25rem)] lg:overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">
          {t("tenantAdmin.roles.title")}
        </h1>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[16.5rem_minmax(0,1fr)]">
        {/* Left Column: Roles List + Scope */}
        <div className="flex min-h-0 flex-col gap-3">
          <Card className="flex min-h-0 flex-1 flex-col gap-2.5 p-3.5">
            <div className="flex shrink-0 items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{t("tenantAdmin.roles.rolesCardTitle")}</h2>
              <Button type="button" size="sm" onClick={() => setSelectedId("new")}>
                <Plus className="mr-1 size-3.5" />
                {t("tenantAdmin.roles.createShort")}
              </Button>
            </div>

            {query.isLoading && (
              <div className="space-y-2 py-1" role="status" aria-busy="true">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-9 w-full rounded-lg" />
                ))}
                <span className="sr-only">{t("tenantAdmin.roles.loadingRolesSr")}</span>
              </div>
            )}

            {query.isError && (
              <p className="text-xs text-status-danger" role="alert">
                {getApiErrorMessage(query.error, t("tenantAdmin.roles.loadRolesError"))}
              </p>
            )}

            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
              {recruiterRoles.map((role) => (
                <li key={role.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedId(role.id)}
                    className={`flex min-w-0 flex-1 items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedId === role.id
                        ? "bg-[var(--color-primary-soft)] font-semibold text-brand-primary"
                        : "hover:bg-[var(--color-surface-alt)]"
                    }`}
                  >
                    <span className="truncate">{role.name}</span>
                    <span className="ml-2 shrink-0 text-[11px] text-[var(--color-text-secondary)]">
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

          {selectedId != null && (
            <Card className="shrink-0 border border-[var(--color-primary-soft)] bg-gradient-to-br from-[var(--color-primary-soft)]/40 to-transparent p-3.5">
              <label className="flex cursor-pointer select-none items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={features.includes("JOBS_ALL")}
                  onChange={() => toggleScope("JOBS_ALL")}
                  className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-[var(--color-border-default)] accent-[var(--color-primary)]"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-primary)]">
                    <ShieldCheck className="size-3.5 shrink-0 text-brand-primary" />
                    {t("tenantAdmin.roles.jobsAllShortTitle")}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-[var(--color-text-secondary)]">
                    {t("tenantAdmin.roles.jobsAllShortDesc")}
                  </span>
                </span>
              </label>
            </Card>
          )}
        </div>

        {/* Right Column: Role Permissions Matrix */}
        <Card className="flex min-h-0 flex-col gap-3 p-4">
          {selectedId == null && !query.isLoading && (
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center text-sm text-[var(--color-text-secondary)]">
              <Shield className="mb-2 size-9 stroke-1 text-slate-300" />
              {t("tenantAdmin.roles.emptySelectionShort")}
            </div>
          )}

          {selectedId != null && (
            <>
              {/* Role Name & Quick Matrix Controls */}
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-b border-[var(--color-border-default)] pb-3">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <label className="sr-only" htmlFor="role-name">
                    {t("tenantAdmin.roles.roleNameLabel")}
                  </label>
                  <input
                    id="role-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={selected?.system}
                    placeholder={t("tenantAdmin.roles.roleNamePlaceholder")}
                    className="min-h-9 w-full max-w-xs rounded-lg border border-[var(--color-border-default)] bg-white px-3 text-sm font-semibold outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 disabled:bg-slate-50 disabled:opacity-75"
                  />
                  {selected?.system && (
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                      {t("tenantAdmin.roles.defaultRoleBadge")}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-semibold text-brand-primary">
                    <Check className="size-3.5" />
                    {t("tenantAdmin.roles.assignedCountShort", { count: totalAssignedCount })}
                  </span>
                  <button
                    type="button"
                    onClick={selectAllFeatures}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-default)] bg-white px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--color-surface-alt)] hover:text-brand-primary"
                  >
                    <CheckCheck className="size-3.5" />
                    {t("tenantAdmin.roles.selectAllShort")}
                  </button>
                  <button
                    type="button"
                    onClick={clearAllFeatures}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-default)] bg-white px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--color-surface-alt)] hover:text-status-danger"
                  >
                    {t("tenantAdmin.roles.clearAllShort")}
                  </button>
                </div>
              </div>

              {/* Granular Permissions Table */}
              <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-[var(--color-border-default)] bg-white">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-[var(--color-surface-alt)]">
                    <tr className="border-b border-[var(--color-border-default)] text-xs font-semibold text-[var(--color-text-secondary)]">
                      <th className="px-3.5 py-2.5 font-semibold">{t("tenantAdmin.roles.columns.moduleShort")}</th>
                      <th className="w-16 px-2 py-2.5 text-center font-semibold">{t("tenantAdmin.roles.columns.all")}</th>
                      <th className="w-14 px-2 py-2.5 text-center font-semibold">{t("tenantAdmin.roles.columns.view")}</th>
                      <th className="w-14 px-2 py-2.5 text-center font-semibold">{t("tenantAdmin.roles.columns.create")}</th>
                      <th className="w-14 px-2 py-2.5 text-center font-semibold">{t("tenantAdmin.roles.columns.edit")}</th>
                      <th className="w-14 px-2 py-2.5 text-center font-semibold">{t("tenantAdmin.roles.columns.delete")}</th>
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
                      const featureLabel = item.customLabelKey ? t(item.customLabelKey) : t(item.labelKey);

                      return (
                        <tr
                          key={item.code}
                          title={t(item.descriptionKey)}
                          className="transition-colors hover:bg-[var(--color-surface-alt)]/50"
                        >
                          <td className="px-3.5 py-2">
                            <div className="flex items-center gap-2.5">
                              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-brand-primary">
                                <Icon className="size-3.5" />
                              </span>
                              <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                                {featureLabel}
                              </span>
                            </div>
                          </td>

                          <td className="px-2 py-2 text-center">
                            <label className="inline-flex cursor-pointer items-center justify-center p-1">
                              <input
                                type="checkbox"
                                checked={allChecked}
                                onChange={() => toggleAllModule(item)}
                                aria-label={t("tenantAdmin.roles.ariaAll", { name: featureLabel })}
                                className="size-4 cursor-pointer rounded border-[var(--color-border-default)] accent-[var(--color-primary)]"
                              />
                            </label>
                          </td>

                          <td className="px-2 py-2 text-center">
                            <label className="inline-flex cursor-pointer items-center justify-center p-1">
                              <input
                                type="checkbox"
                                checked={viewChecked}
                                onChange={() => toggleAction(item, "VIEW")}
                                aria-label={t("tenantAdmin.roles.ariaView", { name: featureLabel })}
                                className="size-4 cursor-pointer rounded border-[var(--color-border-default)] accent-[var(--color-primary)]"
                              />
                            </label>
                          </td>

                          <td className="px-2 py-2 text-center">
                            {hasCreate ? (
                              <label className="inline-flex cursor-pointer items-center justify-center p-1">
                                <input
                                  type="checkbox"
                                  checked={createChecked}
                                  onChange={() => toggleAction(item, "CREATE")}
                                  aria-label={t("tenantAdmin.roles.ariaCreate", { name: featureLabel })}
                                  className="size-4 cursor-pointer rounded border-[var(--color-border-default)] accent-[var(--color-primary)]"
                                />
                              </label>
                            ) : (
                              <span className="select-none text-slate-300">—</span>
                            )}
                          </td>

                          <td className="px-2 py-2 text-center">
                            {hasEdit ? (
                              <label className="inline-flex cursor-pointer items-center justify-center p-1">
                                <input
                                  type="checkbox"
                                  checked={editChecked}
                                  onChange={() => toggleAction(item, "EDIT")}
                                  aria-label={t("tenantAdmin.roles.ariaEdit", { name: featureLabel })}
                                  className="size-4 cursor-pointer rounded border-[var(--color-border-default)] accent-[var(--color-primary)]"
                                />
                              </label>
                            ) : (
                              <span className="select-none text-slate-300">—</span>
                            )}
                          </td>

                          <td className="px-2 py-2 text-center">
                            {hasDelete ? (
                              <label className="inline-flex cursor-pointer items-center justify-center p-1">
                                <input
                                  type="checkbox"
                                  checked={deleteChecked}
                                  onChange={() => toggleAction(item, "DELETE")}
                                  aria-label={t("tenantAdmin.roles.ariaDelete", { name: featureLabel })}
                                  className="size-4 cursor-pointer rounded border-[var(--color-border-default)] accent-[var(--color-primary)]"
                                />
                              </label>
                            ) : (
                              <span className="select-none text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-default)] pt-3">
                <div>
                  {selected && canDeleteRole(selected) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-status-danger hover:bg-status-danger/10"
                      disabled={deleteMutation.isPending}
                      onClick={() => askDelete(selected)}
                    >
                      <Trash2 className="mr-1.5 size-3.5" />
                      {t("tenantAdmin.roles.deleteRoleButton")}
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (selected) {
                        setName(selected.name);
                        setFeatures(selected.features);
                      } else {
                        setSelectedId(recruiterRoles[0]?.id ?? null);
                      }
                    }}
                  >
                    {t("tenantAdmin.roles.revert")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
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
