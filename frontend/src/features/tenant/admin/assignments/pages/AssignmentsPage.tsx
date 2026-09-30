import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jobApi } from "@/api/tenant/jobApi";
import { jobAssignmentsApi, type AssignmentRole, type JobAssignment } from "@/api/tenant/jobAssignmentsApi";
import { usersApi } from "@/api/tenant/usersApi";
import { Button } from "@/components/ux/Button";
import { Card } from "@/components/ux/Card";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/stores/toastStore";
import { Trash2 } from "lucide-react";

const inputClass =
  "min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-surface-card px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15";

const roleLabels: Record<AssignmentRole, string> = {
  PRIMARY_RECRUITER: "Phụ trách chính",
  CO_RECRUITER: "Đồng phụ trách",
};

export function AssignmentsPage() {
  const queryClient = useQueryClient();
  const askConfirm = useUiStore((s) => s.askConfirm);
  const [query, setQuery] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const [assignmentRole, setAssignmentRole] = useState<AssignmentRole>("CO_RECRUITER");

  const jobsQuery = useQuery({
    queryKey: queryKeys.jobs.list({ q: query, size: 50, page: 0 }),
    queryFn: () => jobApi.search({ q: query || undefined, page: 0, size: 50 }),
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

  const assignmentsQuery = useQuery({
    queryKey: queryKeys.jobs.assignments(selectedJobId ?? 0),
    queryFn: () => jobAssignmentsApi.list(selectedJobId as number),
    enabled: selectedJobId != null,
  });
  const assigned = assignmentsQuery.data?.data ?? [];
  const assignedIds = new Set(assigned.map((row) => row.userId));
  const availableStaff = staff.filter((row) => !assignedIds.has(row.id));

  const invalidate = () => {
    if (selectedJobId != null) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs.assignments(selectedJobId) });
    }
  };

  const assignMutation = useMutation({
    mutationFn: () =>
      jobAssignmentsApi.assign(selectedJobId as number, {
        userId: Number(userId),
        assignmentRole,
      }),
    onSuccess: (res) => {
      if (!res.success) throw new Error(res.message);
      toast.success("Đã phân công");
      setUserId("");
      invalidate();
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, "Không phân công được")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId: id, role }: { userId: number; role: AssignmentRole }) =>
      jobAssignmentsApi.updateRole(selectedJobId as number, id, role),
    onSuccess: (res) => {
      if (!res.success) throw new Error(res.message);
      toast.success("Đã đổi vai trò phân công");
      invalidate();
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, "Không đổi được vai trò")),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => jobAssignmentsApi.remove(selectedJobId as number, id),
    onSuccess: (res) => {
      if (!res.success) throw new Error(res.message);
      toast.success("Đã gỡ phân công");
      invalidate();
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, "Không gỡ được phân công")),
  });

  const askRemove = (row: JobAssignment) => {
    askConfirm({
      title: `Gỡ ${row.fullName} khỏi job?`,
      description: "Người này sẽ không còn xem hoặc xử lý tin tuyển dụng này.",
      confirmLabel: "Gỡ",
      danger: true,
      onConfirm: () => removeMutation.mutate(row.userId),
    });
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">Phân công</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--color-text-secondary)]">
          Gán Recruiter/HR vào từng tin tuyển dụng. Họ chỉ thấy và xử lý job được phân công.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(16rem,22rem)_1fr] lg:items-start">
        <Card className="space-y-3">
          <h2 className="text-base font-semibold">Tin tuyển dụng</h2>
          <input
            className={inputClass}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tiêu đề, địa điểm, phòng ban"
          />
          {jobsQuery.isLoading && <p className="text-sm text-[var(--color-text-secondary)]">Đang tải…</p>}
          {jobsQuery.isError && (
            <p className="text-sm text-status-danger" role="alert">
              {getApiErrorMessage(jobsQuery.error, "Không tải được danh sách job")}
            </p>
          )}
          {jobs.length === 0 && !jobsQuery.isLoading && (
            <p className="text-sm text-[var(--color-text-secondary)]">Chưa có tin tuyển dụng.</p>
          )}
          <ul className="space-y-1">
            {jobs.map((job) => (
              <li key={job.id}>
                <button
                  type="button"
                  onClick={() => setSelectedJobId(job.id)}
                  className={`flex w-full items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-left text-sm ${
                    selectedJobId === job.id
                      ? "bg-[var(--color-primary-soft)] text-brand-primary"
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

        <Card className="space-y-4">
          {selectedJob == null && (
            <p className="text-sm text-[var(--color-text-secondary)]">
              Chọn một tin tuyển dụng để gán người phụ trách.
            </p>
          )}
          {selectedJob != null && (
            <>
              <div>
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{selectedJob.title}</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {assigned.length === 0
                    ? "Chưa phân công — chỉ admin nhìn thấy job này."
                    : `${assigned.length} người phụ trách`}
                </p>
              </div>

              <form
                className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!userId) return;
                  assignMutation.mutate();
                }}
              >
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium">Nhân viên</span>
                  <select className={inputClass} value={userId} onChange={(event) => setUserId(event.target.value)}>
                    <option value="">Chọn Recruiter/HR</option>
                    {availableStaff.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.fullName} · {row.role}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium">Vai trò</span>
                  <select
                    className={inputClass}
                    value={assignmentRole}
                    onChange={(event) => setAssignmentRole(event.target.value as AssignmentRole)}
                  >
                    <option value="PRIMARY_RECRUITER">{roleLabels.PRIMARY_RECRUITER}</option>
                    <option value="CO_RECRUITER">{roleLabels.CO_RECRUITER}</option>
                  </select>
                </label>
                <Button type="submit" disabled={assignMutation.isPending || !userId}>
                  {assignMutation.isPending ? "Đang gán…" : "Gán"}
                </Button>
              </form>

              {assignmentsQuery.isLoading && <p className="text-sm text-[var(--color-text-secondary)]">Đang tải phân công…</p>}
              {assignmentsQuery.isError && (
                <p className="text-sm text-status-danger" role="alert">
                  {getApiErrorMessage(assignmentsQuery.error, "Không tải được phân công")}
                </p>
              )}

              <ul className="divide-y divide-[var(--color-border-default)]">
                {assigned.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{row.fullName}</p>
                      <p className="truncate text-xs text-[var(--color-text-secondary)]">
                        {row.email} · {row.role}
                      </p>
                    </div>
                    <select
                      aria-label={`Vai trò phân công của ${row.fullName}`}
                      className="min-h-10 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-surface-card px-2 text-sm"
                      value={row.assignmentRole}
                      disabled={updateMutation.isPending}
                      onChange={(event) =>
                        updateMutation.mutate({
                          userId: row.userId,
                          role: event.target.value as AssignmentRole,
                        })
                      }
                    >
                      <option value="PRIMARY_RECRUITER">{roleLabels.PRIMARY_RECRUITER}</option>
                      <option value="CO_RECRUITER">{roleLabels.CO_RECRUITER}</option>
                    </select>
                    <button
                      type="button"
                      aria-label={`Gỡ ${row.fullName}`}
                      disabled={removeMutation.isPending}
                      onClick={() => askRemove(row)}
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger)]/10 disabled:opacity-50"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
    </section>
  );
}
