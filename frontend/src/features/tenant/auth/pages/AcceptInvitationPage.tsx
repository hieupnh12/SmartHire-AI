import { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { usersApi } from "@/api/tenant/usersApi";
import { Button } from "@/components/ux/Button";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { useT, type TranslateFn } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { toast } from "@/stores/toastStore";

function createSchema(t: TranslateFn) {
  return z
    .object({
      password: z
        .string()
        .min(8, t("auth.validation.passwordMin8"))
        .refine(
          (v) => new TextEncoder().encode(v).length <= 72,
          t("auth.validation.passwordMax72"),
        ),
      confirmPassword: z.string().min(8, t("auth.validation.confirmPasswordMin8")),
    })
    .refine((v) => v.password === v.confirmPassword, {
      message: t("auth.validation.passwordsMismatch"),
      path: ["confirmPassword"],
    });
}

type Form = z.infer<ReturnType<typeof createSchema>>;

const inputClass =
  "min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15";

export function AcceptInvitationPage() {
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token")?.trim() ?? "";
  const tenant = getTenantIdFromWindow();
  const schema = useMemo(() => createSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (password: string) => usersApi.acceptInvite({ token, password }),
    onSuccess: (res) => {
      if (!res.success) throw new Error(res.message);
      toast.success(t("auth.invite.activatedToast"));
      navigate("/internal/login", { replace: true });
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, t("auth.invite.activateFailed"))),
  });

  if (!token) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="mb-4 flex justify-end"><LanguageSwitcher variant="icon" /></div>
        <h1 className="font-display text-2xl font-bold">{t("auth.invite.invalidLinkTitle")}</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">{t("auth.invite.missingToken")}</p>
      </main>
    );
  }

  if (!tenant) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="mb-4 flex justify-end"><LanguageSwitcher variant="icon" /></div>
        <h1 className="font-display text-2xl font-bold">{t("auth.invite.wrongWorkspaceTitle")}</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          {t("auth.invite.wrongWorkspaceHintPrefix")} <code>ten-cong-ty.localhost:5173</code> {t("auth.invite.wrongWorkspaceHintSuffix")}
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
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
            {t("auth.invite.activateTitle")}
          </h1>
          <LanguageSwitcher variant="icon" />
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {t("auth.invite.activateSubtitlePrefix")} <strong>{tenant}</strong>{t("auth.invite.activateSubtitleSuffix")}
        </p>
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="password">
            {t("auth.invite.newPasswordMin8Label")}
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
            {t("auth.invite.reenterPasswordLabel")}
          </label>
          <input id="confirmPassword" type="password" className={inputClass} {...register("confirmPassword")} />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-status-danger" role="alert">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
        <Button type="submit" disabled={mutation.isPending} className="w-full">
          {mutation.isPending ? t("auth.invite.activating") : t("auth.invite.activateButton")}
        </Button>
      </form>
    </main>
  );
}
