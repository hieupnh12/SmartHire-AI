import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { usersApi, type InviteMemberRequest } from "@/api/tenant/usersApi";
import { tenantRolesApi } from "@/api/tenant/tenantRolesApi";
import { Button } from "@/components/ux/Button";
import { Card } from "@/components/ux/Card";
import { getApiErrorMessage } from "@/lib/axios";
import { toast } from "@/stores/toastStore";

const schema = z.object({
  fullName: z.string().trim().min(1, "Họ tên bắt buộc"),
  email: z.string().trim().email("Email không hợp lệ"),
  role: z.string().trim().min(1, "Chọn vai trò"),
});

type Form = z.infer<typeof schema>;

const inputClass =
  "min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-surface-card px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15";

export function UsersPage() {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { role: "RECRUITER" },
  });

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

  const mutation = useMutation({
    mutationFn: (body: InviteMemberRequest) => usersApi.invite(body),
    onSuccess: (res) => {
      if (!res.success || !res.data) throw new Error(res.message);
      toast.success(res.data.emailSent ? "Đã gửi email lời mời" : "Đã tạo lời mời (email chưa gửi)");
      reset({ fullName: "", email: "", role: "RECRUITER" });
      void queryClient.invalidateQueries({ queryKey: ["tenant-users"] });
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, "Không gửi được lời mời")),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => usersApi.assignRole(id, role),
    onSuccess: (res) => {
      if (!res.success || !res.data) throw new Error(res.message);
      toast.success("Đã gắn vai trò. Nhân viên cần đăng nhập lại để áp dụng quyền mới.");
      void queryClient.invalidateQueries({ queryKey: ["tenant-users"] });
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, "Không gắn được vai trò")),
  });

  const invite = mutation.data?.data;
  const rows = (members.data?.data ?? []).filter(
    (row) => row.role !== "CANDIDATE" && row.workspace !== "CANDIDATE",
  );

  return (
    <section className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">Người dùng</h1>

      <div className="grid gap-6 lg:grid-cols-[minmax(18rem,24rem)_1fr] lg:items-start">
        <Card className="space-y-4">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Gửi lời mời</h2>
          <form
            className="space-y-4"
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
            noValidate
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="fullName">
                Họ tên *
              </label>
              <input id="fullName" className={inputClass} {...register("fullName")} />
              {errors.fullName && (
                <p className="mt-1 text-xs text-status-danger" role="alert">
                  {errors.fullName.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="email">
                Gmail / email *
              </label>
              <input id="email" type="email" className={inputClass} {...register("email")} />
              {errors.email && (
                <p className="mt-1 text-xs text-status-danger" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="role">
                Vai trò *
              </label>
              <select id="role" className={inputClass} {...register("role")}>
                {assignableRoles.map((role) => (
                  <option key={role.code} value={role.code}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Đang gửi…" : "Gửi lời mời"}
            </Button>
          </form>

          {invite && (
            <div className="space-y-1 text-sm text-[var(--color-text-secondary)]">
              <p>{invite.emailSent ? "Email đã gửi." : "SMTP chưa cấu hình hoặc gửi thất bại. Copy link:"}</p>
              <p className="break-all font-mono text-xs text-[var(--color-text-primary)]">{invite.acceptUrl}</p>
            </div>
          )}
        </Card>

        <Card className="space-y-4 overflow-hidden">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Quản lý nhân viên</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Chọn vai trò đã tạo ở Phân quyền cho từng nhân viên.
          </p>
          {members.isLoading && <p className="text-sm text-[var(--color-text-secondary)]">Đang tải…</p>}
          {members.isError && (
            <p className="text-sm text-status-danger" role="alert">
              {getApiErrorMessage(members.error, "Không tải được danh sách nhân viên")}
            </p>
          )}
          {!members.isLoading && !members.isError && rows.length === 0 && (
            <p className="text-sm text-[var(--color-text-secondary)]">Chưa có nhân viên.</p>
          )}
          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--color-surface-container-low)]">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Họ tên</th>
                    <th className="px-3 py-3 font-semibold">Email</th>
                    <th className="px-3 py-3 font-semibold">Vai trò</th>
                    <th className="px-3 py-3 font-semibold">Trạng thái</th>
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
                          aria-label={`Vai trò của ${row.fullName}`}
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
                      <td className="px-3 py-3">{row.status ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}
