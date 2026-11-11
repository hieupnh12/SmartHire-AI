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
  customLabel?: string;
  description: string;
  icon: LucideIcon;
  actions: FeatureAction[];
}

const FEATURE_MATRIX: FeatureMatrixItem[] = [
  {
    code: "DASHBOARD",
    labelKey: "nav.dashboard",
    description: "Xem thống kê tổng quan và tình hình tuyển dụng",
    icon: House,
    actions: ["VIEW"],
  },
  {
    code: "JOBS",
    labelKey: "nav.publishedJobs",
    customLabel: "Tin tuyển dụng",
    description: "Tạo job mới, chỉnh sửa và quản lý tin tuyển dụng",
    icon: BriefcaseBusiness,
    actions: ["VIEW", "CREATE", "EDIT", "DELETE"],
  },
  {
    code: "APPLICANTS",
    labelKey: "nav.applicants",
    description: "Xem danh sách, quản lý trạng thái hồ sơ ứng viên",
    icon: Users,
    actions: ["VIEW", "EDIT", "DELETE"],
  },
  {
    code: "CV_SCREENING",
    labelKey: "nav.cvScreening",
    description: "Tải lên, phân tích và sàng lọc hồ sơ CV bằng AI",
    icon: FileSearch,
    actions: ["VIEW", "EDIT", "DELETE"],
  },
  {
    code: "RANKING",
    labelKey: "nav.ranking",
    description: "Khớp lệnh thông minh và bảng xếp hạng độ phù hợp ứng viên",
    icon: Sparkles,
    actions: ["VIEW", "EDIT"],
  },
  {
    code: "ANALYTICS",
    labelKey: "nav.recruitmentAnalytics",
    description: "Báo cáo chuyên sâu và phân tích hiệu suất tuyển dụng",
    icon: ChartNoAxesCombined,
    actions: ["VIEW"],
  },
  {
    code: "ASSESSMENTS",
    labelKey: "nav.assessments",
    description: "Tạo và chấm điểm bài kiểm tra năng lực chuyên môn",
    icon: GraduationCap,
    actions: ["VIEW", "EDIT", "DELETE"],
  },
  {
    code: "AI_INTERVIEWS",
    labelKey: "nav.aiInterview",
    description: "Cấu hình kịch bản và xem kết quả phỏng vấn AI",
    icon: Bot,
    actions: ["VIEW", "EDIT", "DELETE"],
  },
  {
    code: "INTERVIEWS",
    labelKey: "nav.interviews",
    description: "Điều phối và ghi chú đánh giá buổi phỏng vấn trực tiếp",
    icon: CalendarClock,
    actions: ["VIEW", "EDIT", "DELETE"],
  },
  {
    code: "SCHEDULES",
    labelKey: "nav.schedules",
    description: "Xem và đặt lịch hẹn phỏng vấn với ứng viên",
    icon: CalendarDays,
    actions: ["VIEW", "EDIT", "DELETE"],
  },
  {
    code: "NOTIFICATIONS",
    labelKey: "nav.notifications",
    description: "Thông báo nội bộ và thông báo tiến độ ứng tuyển",
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
      toast.success("Đã tạo vai trò");
      invalidate();
      setSelectedId(res.data.id);
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, "Không tạo được vai trò")),
  });

  const updateMutation = useMutation({
    mutationFn: (role: TenantRole) =>
      tenantRolesApi.update(role.id, role.system ? { features } : { name, features }),
    onSuccess: (res) => {
      if (!res.success || !res.data) throw new Error(res.message);
      toast.success("Đã lưu vai trò");
      invalidate();
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, "Không lưu được vai trò")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => tenantRolesApi.remove(id),
    onSuccess: (res) => {
      if (!res.success) throw new Error(res.message);
      toast.success("Đã xóa vai trò");
      setSelectedId(null);
      invalidate();
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, "Không xóa được vai trò")),
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
      toast.danger("Vai trò mặc định và admin không thể xóa");
      return;
    }
    askConfirm({
      title: `Xóa vai trò ${role.name}?`,
      description: "Chỉ xóa được khi chưa gán cho nhân viên hoặc lời mời đang chờ.",
      confirmLabel: "Xóa",
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
          Phân quyền
        </h1>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[16.5rem_minmax(0,1fr)]">
        {/* Left Column: Roles List + Scope */}
        <div className="flex min-h-0 flex-col gap-3">
          <Card className="flex min-h-0 flex-1 flex-col gap-2.5 p-3.5">
            <div className="flex shrink-0 items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Vai trò</h2>
              <Button type="button" size="sm" onClick={() => setSelectedId("new")}>
                <Plus className="mr-1 size-3.5" />
                Tạo mới
              </Button>
            </div>

            {query.isLoading && (
              <div className="space-y-2 py-1" role="status" aria-busy="true">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-9 w-full rounded-lg" />
                ))}
                <span className="sr-only">Đang tải danh sách vai trò…</span>
              </div>
            )}

            {query.isError && (
              <p className="text-xs text-status-danger" role="alert">
                {getApiErrorMessage(query.error, "Không tải được danh sách vai trò")}
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
                      {role.system ? "Mặc định" : role.code}
                    </span>
                  </button>
                  {canDeleteRole(role) && (
                    <DeleteIconButton
                      label={`Xóa vai trò ${role.name}`}
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
                    Xem toàn bộ tin tuyển dụng
                  </span>
                  <span className="mt-0.5 block text-[11px] text-[var(--color-text-secondary)]">
                    Bật `JOBS_ALL` để xem tất cả job công ty
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
              Chưa có vai trò nào. Nhấn &ldquo;Tạo mới&rdquo; để thiết lập phân quyền.
            </div>
          )}

          {selectedId != null && (
            <>
              {/* Role Name & Quick Matrix Controls */}
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-b border-[var(--color-border-default)] pb-3">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <label className="sr-only" htmlFor="role-name">
                    Tên vai trò
                  </label>
                  <input
                    id="role-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={selected?.system}
                    placeholder="Nhập tên vai trò (VD: Chuyên viên Tuyển dụng)..."
                    className="min-h-9 w-full max-w-xs rounded-lg border border-[var(--color-border-default)] bg-white px-3 text-sm font-semibold outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 disabled:bg-slate-50 disabled:opacity-75"
                  />
                  {selected?.system && (
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                      Mặc định
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-semibold text-brand-primary">
                    <Check className="size-3.5" />
                    {totalAssignedCount} quyền
                  </span>
                  <button
                    type="button"
                    onClick={selectAllFeatures}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-default)] bg-white px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--color-surface-alt)] hover:text-brand-primary"
                  >
                    <CheckCheck className="size-3.5" />
                    Chọn hết
                  </button>
                  <button
                    type="button"
                    onClick={clearAllFeatures}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-default)] bg-white px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--color-surface-alt)] hover:text-status-danger"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              {/* Granular Permissions Table */}
              <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-[var(--color-border-default)] bg-white">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-[var(--color-surface-alt)]">
                    <tr className="border-b border-[var(--color-border-default)] text-xs font-semibold text-[var(--color-text-secondary)]">
                      <th className="px-3.5 py-2.5 font-semibold">PHÂN HỆ</th>
                      <th className="w-16 px-2 py-2.5 text-center font-semibold">TẤT CẢ</th>
                      <th className="w-14 px-2 py-2.5 text-center font-semibold">XEM</th>
                      <th className="w-14 px-2 py-2.5 text-center font-semibold">TẠO</th>
                      <th className="w-14 px-2 py-2.5 text-center font-semibold">SỬA</th>
                      <th className="w-14 px-2 py-2.5 text-center font-semibold">XÓA</th>
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
                          title={item.description}
                          className="transition-colors hover:bg-[var(--color-surface-alt)]/50"
                        >
                          <td className="px-3.5 py-2">
                            <div className="flex items-center gap-2.5">
                              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-brand-primary">
                                <Icon className="size-3.5" />
                              </span>
                              <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                                {item.customLabel ?? t(item.labelKey)}
                              </span>
                            </div>
                          </td>

                          <td className="px-2 py-2 text-center">
                            <label className="inline-flex cursor-pointer items-center justify-center p-1">
                              <input
                                type="checkbox"
                                checked={allChecked}
                                onChange={() => toggleAllModule(item)}
                                aria-label={`Tất cả quyền ${item.customLabel ?? t(item.labelKey)}`}
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
                                aria-label={`Xem ${item.customLabel ?? t(item.labelKey)}`}
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
                                  aria-label={`Tạo ${item.customLabel ?? t(item.labelKey)}`}
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
                                  aria-label={`Sửa ${item.customLabel ?? t(item.labelKey)}`}
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
                                  aria-label={`Xóa ${item.customLabel ?? t(item.labelKey)}`}
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
                      Xóa vai trò
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
                    Hoàn tác
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
                    {saving ? "Đang lưu…" : selectedId === "new" ? "Tạo vai trò" : "Lưu thay đổi"}
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
