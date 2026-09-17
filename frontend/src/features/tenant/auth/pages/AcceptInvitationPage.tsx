import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { usersApi } from "@/api/tenant/usersApi";
import { Button } from "@/components/ux/Button";
import { getApiErrorMessage } from "@/lib/axios";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { toast } from "@/stores/toastStore";

const schema = z
  .object({
    password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
    confirmPassword: z.string().min(6),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Mật khẩu không khớp",
    path: ["confirmPassword"],
  });

type Form = z.infer<typeof schema>;

const inputClass =
  "min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15";

export function AcceptInvitationPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token")?.trim() ?? "";
  const tenant = getTenantIdFromWindow();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (password: string) => usersApi.acceptInvite({ token, password }),
    onSuccess: (res) => {
      if (!res.success) throw new Error(res.message);
      toast.success("Tài khoản đã kích hoạt. Hãy đăng nhập.");
      navigate("/internal/login", { replace: true });
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, "Không kích hoạt được tài khoản")),
  });

  if (!token) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-display text-2xl font-bold">Link không hợp lệ</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">Thiếu token lời mời.</p>
      </main>
    );
  }

  if (!tenant) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-display text-2xl font-bold">Sai địa chỉ workspace</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          Mở link dạng <code>ten-cong-ty.localhost:5173</code> (đúng subdomain workspace) để hệ thống biết công ty nào.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <form
        className="w-full space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-surface-card p-8"
        onSubmit={handleSubmit((values) => mutation.mutate(values.password))}
        noValidate
      >
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">Đặt mật khẩu</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Workspace {tenant}. Sau đó đăng nhập bằng email đã được mời.</p>
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="password">
            Mật khẩu *
          </label>
          <input id="password" type="password" className={inputClass} {...register("password")} />
          {errors.password && (
            <p className="mt-1 text-xs text-status-danger" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="confirmPassword">
            Nhập lại mật khẩu *
          </label>
          <input id="confirmPassword" type="password" className={inputClass} {...register("confirmPassword")} />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-status-danger" role="alert">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
        <Button type="submit" disabled={mutation.isPending} className="w-full">
          {mutation.isPending ? "Đang lưu…" : "Kích hoạt tài khoản"}
        </Button>
      </form>
    </main>
  );
}
