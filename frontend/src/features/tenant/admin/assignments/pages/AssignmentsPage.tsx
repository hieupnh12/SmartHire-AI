import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jobApi } from "@/api/tenant/jobApi";
import { jobAssignmentsApi, type JobAssignment } from "@/api/tenant/jobAssignmentsApi";
import { usersApi } from "@/api/tenant/usersApi";
import { tenantRolesApi } from "@/api/tenant/tenantRolesApi";
import { Button } from "@/components/ux/Button";
import { Card } from "@/components/ux/Card";
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
  const [newOwnerId, setNewOwnerId] = useState("");
  const mutation = useMutation({
    mutationFn: () => jobAssignmentsApi.transferOwner(jobId, Number(newOwnerId)),
    onSuccess: (res) => {
      if (!res.success) throw new Error(res.message);
      toast.success("Đã chuyển quyền sở hữu thành công");
      onSuccess();
      onClose();
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, "Không chuyển được quyền sở hữu")),
  });

  // Only candidates who have permission to create jobs can become OWNER
  const candidates = staff.filter((row) => row.id !== currentOwnerId && canStaffCreateJob(row.role));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="transfer-owner-title">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 id="transfer-owner-title" className="text-base font-semibold">Chuyển quyền sở hữu (OWNER)</h2>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-lg hover:bg-[var(--color-surface-alt)]" aria-label="Đóng">
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
          Người nhận quyền OWNER mới <strong>bắt buộc phải có quyền Tạo tin tuyển dụng (`JOBS_CREATE`)</strong>. OWNER hiện tại sẽ trở thành <strong>Người phụ trách</strong>.
        </p>

        {candidates.length === 0 ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Không có nhân viên nào khác có quyền Tạo tin tuyển dụng để chuyển quyền sở hữu. Vui lòng cấp quyền Tạo job trong trang Phân quyền trước.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">Chọn OWNER mới (Chỉ hiện người có quyền Tạo job)</span>
              <select className={inputClass} value={newOwnerId} onChange={(e) => setNewOwnerId(e.target.value)}>
                <option value="">-- Chọn nhân viên có quyền Tạo job --</option>
                {candidates.map((row) => (
                  <option key={row.id} value={row.id}>{row.fullName} · {row.role}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button disabled={!newOwnerId || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Đang chuyển…" : "Xác nhận chuyển"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AssignmentsPage() {
  const queryClient = useQueryClient();
  const askConfirm = useUiStore((s) => s.askConfirm);
  const [query, setQuery] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const [showTransfer, setShowTransfer] = useState(false);

  const jobsQuery = useQuery({
    queryKey: queryKeys.jobs.list({ q: query, size: 50, page: 0, scope: "all" }),
    queryFn: () => jobApi.search({ q: query || undefined, page: 0, size: 50, scope: "all" }),
  });
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
      toast.success("Đã gán người phụ trách");
      setUserId("");
      invalidate();
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, "Không gán được người phụ trách")),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => jobAssignmentsApi.remove(selectedJobId as number, id),
    onSuccess: (res) => {
      if (!res.success) throw new Error(res.message);
      toast.success("Đã gỡ quyền phụ trách");
      invalidate();
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, "Không gỡ được quyền")),
  });

  const askRemove = (row: JobAssignment) => {
    askConfirm({
      title: `Gỡ người phụ trách ${row.fullName}?`,
      description: "Nhân sự này sẽ không còn quyền truy cập vào tin tuyển dụng này.",
      confirmLabel: "Gỡ phụ trách",
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
        <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">Quản lý công việc</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">
          Phân công nhân sự phụ trách từng tin tuyển dụng. Mỗi job có đúng <strong>1 Chủ sở hữu (OWNER)</strong> và các <strong>Người phụ trách</strong>.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(16rem,22rem)_1fr] lg:items-start">
        {/* Left Column: Job Selector */}
        <Card className="space-y-3">
          <h2 className="text-base font-semibold">Tin tuyển dụng</h2>
          <input
            className={inputClass}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tiêu đề, địa điểm, phòng ban"
          />
          {jobsQuery.isLoading && <p className="text-sm text-[var(--color-text-secondary)]">Đang tải…</p>}
          {jobsQuery.isError && <p className="text-sm text-status-danger" role="alert">{getApiErrorMessage(jobsQuery.error, "Không tải được danh sách job")}</p>}
          {jobs.length === 0 && !jobsQuery.isLoading && <p className="text-sm text-[var(--color-text-secondary)]">Chưa có tin tuyển dụng.</p>}
          <ul className="space-y-1">
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
              Chọn một tin tuyển dụng bên trái để quản lý người phụ trách.
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
                      ? "Chưa có nhân sự phụ trách — chỉ Admin hoặc người có quyền JOBS_ALL nhìn thấy job này."
                      : `${assigned.length} nhân sự đang phụ trách job`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTransfer(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                >
                  <ArrowRightLeft className="size-3.5" aria-hidden="true" />
                  Chuyển OWNER
                </button>
              </div>

              {/* RBAC Relationship Banner */}
              <div className="rounded-xl border border-[var(--color-primary-soft)] bg-gradient-to-r from-[var(--color-primary-soft)]/30 to-transparent p-3.5 text-xs text-[var(--color-text-secondary)]">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="size-4 shrink-0 text-brand-primary mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-xs text-[var(--color-text-primary)]">
                      Nguyên tắc phân định quyền hạn:
                    </p>
                    <p>
                      • <strong>Chủ sở hữu (OWNER)</strong>: Người tạo job hoặc nhận chuyển giao (bắt buộc phải có quyền Tạo job `JOBS_CREATE`).
                    </p>
                    <p>
                      • <strong>Người phụ trách</strong>: Được gán quyền vào job này. Mọi thao tác (sửa JD, xem ứng viên, đánh giá, chấm phỏng vấn...) được quyết định chặt chẽ bởi bảng <strong>Phân quyền chi tiết</strong> của vai trò nhân sự đó.
                    </p>
                  </div>
                </div>
              </div>

              {/* Add Member Section */}
              <div className="rounded-xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Gán người phụ trách
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
                    <span>Chọn nhân viên Recruiter / HR</span>
                    <select
                      className={inputClass}
                      value={userId}
                      onChange={(event) => setUserId(event.target.value)}
                    >
                      <option value="">-- Chọn nhân viên để phân công --</option>
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
                    {assignMutation.isPending ? "Đang gán…" : "Gán phụ trách"}
                  </Button>
                </form>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  ℹ️ Người phụ trách được quyền truy cập job này. Các quyền hạn cụ thể (xem/sửa job, xem ứng viên, chấm điểm...) hoàn toàn tuân theo vai trò của người đó trong hệ thống.
                </p>
              </div>

              {assignmentsQuery.isLoading && <p className="text-sm text-[var(--color-text-secondary)]">Đang tải danh sách phụ trách…</p>}
              {assignmentsQuery.isError && (
                <p className="text-sm text-status-danger" role="alert">
                  {getApiErrorMessage(assignmentsQuery.error, "Không tải được danh sách phụ trách")}
                </p>
              )}

              {/* Team Members List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Nhân sự phụ trách công việc ({assigned.length})
                  </h3>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    Gồm 1 OWNER và các Người phụ trách
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
                                Người tạo job
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-[var(--color-text-secondary)]">
                            {row.email} · Vai trò tài khoản: <span className="font-medium text-[var(--color-text-primary)]">{row.role}</span>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
                          {isOwner ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 shadow-xs">
                              <Crown className="size-3.5 text-amber-600" />
                              Chủ sở hữu (OWNER)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                              <UserCheck className="size-3.5 text-blue-600" />
                              Người phụ trách
                            </span>
                          )}

                          {!isOwner && !row.isCreator && (
                            <button
                              type="button"
                              aria-label={`Gỡ ${row.fullName}`}
                              disabled={removeMutation.isPending}
                              onClick={() => askRemove(row)}
                              className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger)]/10 transition-colors"
                              title="Gỡ khỏi tin tuyển dụng này"
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


