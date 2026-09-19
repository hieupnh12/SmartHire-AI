import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tenantRolesApi, type TenantRole } from "@/api/tenant/tenantRolesApi";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { Card } from "@/components/ux/Card";
import { recruiterNav, type RecruiterFeatureCode } from "@/features/tenant/recruiter/nav";
import { useT } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/stores/toastStore";

const PROTECTED_ROLE_CODES = new Set(["TENANT_ADMIN", "ADMIN", "HR", "RECRUITER", "CANDIDATE"]);

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

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["tenant-roles"] });

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

  const toggle = (feature: RecruiterFeatureCode) => {
    setFeatures((current) =>
      current.includes(feature) ? current.filter((item) => item !== feature) : [...current, feature],
    );
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

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">Phân quyền</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">
          Tạo vai trò tùy ý và tick tính năng. Vai trò mặc định (HR, Recruiter) và admin không thể xóa.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(16rem,20rem)_1fr] lg:items-start">
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Vai trò</h2>
            <Button type="button" size="sm" onClick={() => setSelectedId("new")}>
              Tạo vai trò
            </Button>
          </div>
          {query.isLoading && <p className="text-sm text-[var(--color-text-secondary)]">Đang tải…</p>}
          {query.isError && (
            <p className="text-sm text-status-danger" role="alert">
              {getApiErrorMessage(query.error, "Không tải được danh sách vai trò")}
            </p>
          )}
          <ul className="space-y-1">
            {recruiterRoles.map((role) => (
              <li key={role.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedId(role.id)}
                  className={`flex min-w-0 flex-1 items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-left text-sm ${
                    selectedId === role.id
                      ? "bg-[var(--color-primary-soft)] text-brand-primary"
                      : "hover:bg-[var(--color-surface-alt)]"
                  }`}
                >
                  <span className="truncate font-medium">{role.name}</span>
                  <span className="ml-2 shrink-0 text-xs text-[var(--color-text-secondary)]">
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

        <Card className="space-y-4">
          {selectedId == null && (
            <p className="text-sm text-[var(--color-text-secondary)]">
              Chọn một vai trò hoặc tạo vai trò mới để tick tính năng.
            </p>
          )}
          {selectedId != null && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="role-name">
                  Tên vai trò
                </label>
                <input
                  id="role-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={selected?.system}
                  className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-surface-card px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 disabled:opacity-70"
                />
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Tính năng</legend>
                {recruiterNav.map((item) => {
                  const checked = features.includes(item.featureCode);
                  return (
                    <label key={item.featureCode} className="flex min-h-10 items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(item.featureCode)}
                        className="size-4 accent-[var(--color-primary)]"
                      />
                      {t(item.labelKey)}
                    </label>
                  );
                })}
              </fieldset>
              <div className="flex flex-wrap justify-end gap-3">
                {selected && canDeleteRole(selected) && (
                  <DeleteIconButton
                    label={`Xóa vai trò ${selected.name}`}
                    disabled={deleteMutation.isPending}
                    onClick={() => askDelete(selected)}
                  />
                )}
                <Button
                  type="button"
                  disabled={saving || !name.trim()}
                  onClick={() => {
                    if (selectedId === "new") createMutation.mutate();
                    else if (selected) updateMutation.mutate(selected);
                  }}
                >
                  {saving ? "Đang lưu…" : selectedId === "new" ? "Tạo vai trò" : "Lưu"}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </section>
  );
}
