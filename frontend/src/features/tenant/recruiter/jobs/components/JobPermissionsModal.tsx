import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobAssignmentsApi, type JobAssignment } from "@/api/tenant/jobAssignmentsApi";
import { usersApi } from "@/api/tenant/usersApi";
import { Button } from "@/components/ux/Button";
import { toast } from "@/stores/toastStore";
import { getApiErrorMessage } from "@/lib/axios";
import {
  X,
  ShieldCheck,
  UserPlus,
  Trash2,
  Crown,
  Eye,
  Pencil,
  Loader2,
  Users,
} from "lucide-react";

interface JobPermissionsModalProps {
  jobId: number;
  jobTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function JobPermissionsModal({
  jobId,
  jobTitle,
  isOpen,
  onClose,
}: JobPermissionsModalProps) {
  const queryClient = useQueryClient();

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [newCanView, setNewCanView] = useState(true);
  const [newCanEdit, setNewCanEdit] = useState(false);

  const queryKey = ["job-assignments", jobId];

  // 1. Fetch current job permissions
  const { data: assignmentsRes, isLoading: loadingAssignments } = useQuery({
    queryKey,
    queryFn: () => jobAssignmentsApi.list(jobId),
    enabled: isOpen,
  });

  // 2. Fetch company users (staff/recruiters)
  const { data: usersRes, isLoading: loadingUsers } = useQuery({
    queryKey: ["tenant-users"],
    queryFn: () => usersApi.list(),
    enabled: isOpen,
  });

  const assignments = assignmentsRes?.data ?? [];
  const assignedUserIds = useMemo(
    () => new Set(assignments.map((a) => a.userId)),
    [assignments]
  );

  // Available staff to add: active recruiter/staff not yet assigned
  const availableStaff = useMemo(() => {
    const allUsers = usersRes?.data ?? [];
    return allUsers.filter(
      (u) =>
        u.status === "ACTIVE" &&
        u.role !== "CANDIDATE" &&
        u.role !== "TENANT_ADMIN" &&
        u.role !== "ADMIN" &&
        !assignedUserIds.has(u.id)
    );
  }, [usersRes, assignedUserIds]);

  // Mutations
  const addMutation = useMutation({
    mutationFn: () =>
      jobAssignmentsApi.assign(jobId, {
        userId: Number(selectedUserId),
        canView: newCanView,
        canEdit: newCanEdit,
      }),
    onSuccess: () => {
      toast.success("Đã thêm quyền cho nhân viên");
      setSelectedUserId("");
      setNewCanView(true);
      setNewCanEdit(false);
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, "Không thêm được quyền")),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      userId,
      canView,
      canEdit,
    }: {
      userId: number;
      canView: boolean;
      canEdit: boolean;
    }) => jobAssignmentsApi.updatePermissions(jobId, userId, { canView, canEdit }),
    onSuccess: () => {
      toast.success("Đã cập nhật quyền");
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, "Không cập nhật được quyền")),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: number) => jobAssignmentsApi.remove(jobId, userId),
    onSuccess: () => {
      toast.success("Đã thu hồi quyền");
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, "Không thu hồi được quyền")),
  });

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-permissions-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-[var(--color-border-default)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h2 id="job-permissions-title" className="text-lg font-semibold text-slate-900">
                Phân quyền tin tuyển dụng
              </h2>
              <p className="text-xs text-slate-500 truncate max-w-md">
                Vị trí: <span className="font-medium text-slate-700">{jobTitle}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Add member section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <UserPlus className="size-4 text-blue-600" />
              Thêm nhân viên được phân quyền
            </h3>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={loadingUsers || availableStaff.length === 0}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  {loadingUsers
                    ? "Đang tải danh sách nhân viên..."
                    : availableStaff.length === 0
                    ? "Không còn nhân sự khả dụng"
                    : "-- Chọn nhân viên --"}
                </option>
                {availableStaff.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.email}) — {u.role}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-4 px-2">
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCanView}
                    onChange={(e) => setNewCanView(e.target.checked)}
                    className="size-4 rounded accent-blue-600"
                  />
                  <span>Xem</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCanEdit}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setNewCanEdit(checked);
                      if (checked) setNewCanView(true); // Edit requires view
                    }}
                    className="size-4 rounded accent-blue-600"
                  />
                  <span>Chỉnh sửa</span>
                </label>
              </div>

              <Button
                type="button"
                size="sm"
                disabled={!selectedUserId || addMutation.isPending}
                onClick={() => addMutation.mutate()}
                className="h-10"
              >
                {addMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Cấp quyền"
                )}
              </Button>
            </div>
          </div>

          {/* Members list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Users className="size-4 text-slate-600" />
                Danh sách người dùng có quyền ({assignments.length})
              </h3>
            </div>

            {loadingAssignments ? (
              <div className="py-8 text-center text-sm text-slate-400">
                <Loader2 className="size-6 animate-spin mx-auto mb-2 text-blue-600" />
                Đang tải danh sách phân quyền...
              </div>
            ) : assignments.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500 rounded-xl border border-dashed border-slate-200">
                Chưa có nhân viên nào được cấp quyền cụ thể trên tin này.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
                {assignments.map((member: JobAssignment) => {
                  const isCreator = member.isCreator;
                  return (
                    <div
                      key={member.id || member.userId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-semibold text-xs">
                          {member.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {member.fullName}
                            </p>
                            {isCreator && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                                <Crown className="size-3" />
                                Người tạo
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">{member.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-center">
                        {isCreator ? (
                          <span className="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-100 rounded-lg">
                            Toàn quyền (Xem & Sửa)
                          </span>
                        ) : (
                          <>
                            {/* Toggle canView */}
                            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={member.canView}
                                disabled={updateMutation.isPending}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  updateMutation.mutate({
                                    userId: member.userId,
                                    canView: checked,
                                    canEdit: checked ? member.canEdit : false,
                                  });
                                }}
                                className="size-4 rounded accent-blue-600"
                              />
                              <Eye className="size-3.5 text-slate-500" />
                              <span>Xem</span>
                            </label>

                            {/* Toggle canEdit */}
                            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={member.canEdit}
                                disabled={updateMutation.isPending}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  updateMutation.mutate({
                                    userId: member.userId,
                                    canView: checked ? true : member.canView,
                                    canEdit: checked,
                                  });
                                }}
                                className="size-4 rounded accent-blue-600"
                              />
                              <Pencil className="size-3.5 text-slate-500" />
                              <span>Sửa</span>
                            </label>

                            {/* Remove button */}
                            <button
                              type="button"
                              title="Thu hồi quyền"
                              disabled={removeMutation.isPending}
                              onClick={() => removeMutation.mutate(member.userId)}
                              className="size-8 inline-flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-[var(--color-border-default)] px-6 py-3 bg-slate-50/50">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
