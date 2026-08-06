import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authApi } from "@/api/authApi";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { getApiErrorMessage } from "@/lib/axios";
import type { Role } from "@/types/api";
import { useT } from "@/i18n";
import { Button } from "@/components/ux/Button";
import { Card } from "@/components/ux/Card";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { toast } from "@/stores/toastStore";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginForm = z.infer<typeof loginSchema>;

function homeForRole(role?: Role) {
  if (role === "ADMIN") return "/admin";
  if (role === "RECRUITER") return "/recruiter";
  return "/candidate";
}

export function LoginPage() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: async (res) => {
      if (!res.success || !res.data) throw new Error(res.message || t("common.errorGeneric"));
      setTokens(res.data.accessToken, res.data.refreshToken);
      let role: Role | undefined;
      try {
        const me = await authApi.me();
        if (me.success && me.data) {
          setUser(me.data);
          role = me.data.role;
        }
      } catch {
        /* AUTH-05 may not be ready */
      }
      toast.success(t("auth.loginTitle"));
      navigate(from && from !== "/login" ? from : homeForRole(role), { replace: true });
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, t("common.errorGeneric"))),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-page px-4 py-10">
      <Card className="w-full max-w-md space-y-4 shadow-[var(--shadow-elevated)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-primary">
              {t("brand.name")}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t("auth.loginHint")}</p>
          </div>
          <LanguageSwitcher />
        </div>
        <form
          className="space-y-4"
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          noValidate
        >
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="email">
              {t("auth.email")}
            </label>
            <input
              id="email"
              className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-border-focus)]"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-status-danger" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="password">
              {t("auth.password")}
            </label>
            <input
              id="password"
              className="min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-border-focus)]"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-status-danger" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={mutation.isPending}>
            {mutation.isPending ? t("auth.signingIn") : t("common.login")}
          </Button>
        </form>
        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          {t("auth.noAccount")}{" "}
          <Link className="font-medium text-brand-secondary hover:underline" to="/register">
            {t("common.register")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
