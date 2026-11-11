import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bell, ChevronRight, KeyRound, Trash2, UserRound } from "lucide-react";
import { authApi } from "@/api/tenant/authApi";
import { Button } from "@/components/ux/Button";
import { LoadingState, SkeletonCard } from "@/components/ux/Skeleton";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import type { AccountProfile } from "@/features/tenant/auth/types";
import { useT, type TranslateFn } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { getTenantTheme } from "@/lib/tenantTheme";
import { MobileAppSyncCard } from "@/features/tenant/candidate/shared/components/MobileAppQrModal";

function createProfileSchema(t: TranslateFn) {
  return z.object({
    fullName: z
      .string()
      .trim()
      .min(1, t("candidate.core.account.profile.validation.fullNameRequired"))
      .max(255, t("candidate.core.account.profile.validation.fullNameMax")),
    phone: z
      .string()
      .trim()
      .max(32, t("candidate.core.account.profile.validation.phoneMax"))
      .regex(/^$|^[+0-9 ()-]{8,32}$/, t("candidate.core.account.profile.validation.phoneInvalid")),
    headline: z.string().trim().max(255, t("candidate.core.account.profile.validation.headlineMax")),
    bio: z.string().trim().max(2000, t("candidate.core.account.profile.validation.bioMax")),
  });
}
type ProfileForm = z.infer<ReturnType<typeof createProfileSchema>>;

function createPasswordSchema(t: TranslateFn) {
  return z
    .object({
      currentPassword: z.string().min(1, t("candidate.core.account.password.validation.currentRequired")),
      newPassword: z.string().min(6, t("candidate.core.account.password.validation.newMin6")),
      confirmPassword: z.string(),
    })
    .refine((value) => value.newPassword === value.confirmPassword, {
      path: ["confirmPassword"],
      message: t("candidate.core.account.password.validation.confirmMismatch"),
    });
}
type PasswordForm = z.infer<ReturnType<typeof createPasswordSchema>>;

const inputClass = "min-h-11 w-full rounded-lg border border-[var(--color-border-default)] bg-white px-3.5 text-sm outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 disabled:bg-[var(--color-surface-alt)] disabled:text-[var(--color-on-surface-variant)]";
const PROFILE_KEY = ["auth", "account-profile"] as const;

export function CandidateAccountPage() {
  const t = useT();
  const tenantCode = getTenantIdFromWindow() || "acme";
  const theme = getTenantTheme(tenantCode);
  const profile = useQuery({ queryKey: PROFILE_KEY, queryFn: authApi.profile });

  return <section className="mx-auto max-w-3xl space-y-6 text-[var(--color-on-surface)]" aria-labelledby="account-title">
    <header className="rounded-3xl border border-[var(--color-border-default)] bg-[linear-gradient(135deg,var(--color-primary-subtle),white_58%)] px-5 py-6 shadow-[var(--shadow-card)] sm:px-7">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">{t("candidate.core.account.eyebrow")}</p>
      <h1 id="account-title" className="mt-2 text-3xl font-semibold tracking-tight">{t("candidate.core.account.title")}</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--color-on-surface-variant)]">{t("candidate.core.account.subtitle")}</p>
    </header>

    {profile.isPending && <LoadingState className="space-y-3" label={t("candidate.core.account.loading")}>{[0, 1].map((item) => <SkeletonCard key={item} className="min-h-48" />)}</LoadingState>}
    {profile.error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--color-error-container)] p-4 text-sm text-[var(--color-on-error-container)]"><p>{getApiErrorMessage(profile.error)}</p><Button variant="secondary" size="sm" onClick={() => profile.refetch()}>{t("common.retry")}</Button></div>}

    {profile.data && <>
      <ProfileSection profile={profile.data} />
      <MobileAppSyncCard tenantName={theme.name} tenantCode={tenantCode} />
      <PasswordSection hasPassword={profile.data.hasPassword} />
      <Link to="/notifications?tab=settings" className="flex items-center gap-4 rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)] transition-colors hover:bg-[var(--color-surface-alt)]">
        <SectionIcon icon={Bell} />
        <span className="min-w-0 flex-1"><span className="block font-semibold">{t("candidate.core.account.notificationPrefsTitle")}</span><span className="block text-sm text-[var(--color-on-surface-variant)]">{t("candidate.core.account.notificationPrefsDesc")}</span></span>
        <ChevronRight className="size-5 text-[var(--color-on-surface-variant)]" aria-hidden="true" />
      </Link>
      <EraseDataSection />
    </>}
  </section>;
}

function EraseDataSection() {
  const t = useT();
  const navigate = useNavigate();
  const askConfirm = useUiStore((state) => state.askConfirm);
  const logout = useAuthStore((state) => state.logout);
  const confirmErase = () => askConfirm({
    title: t("candidate.core.account.erase.confirmTitle"),
    description: t("candidate.core.account.erase.confirmDesc"),
    danger: true,
    confirmLabel: t("candidate.core.account.erase.confirmLabel"),
    onConfirm: async () => {
      await authApi.eraseProfile();
      logout();
      toast.success(t("candidate.core.account.erase.successToast"));
      navigate("/");
    },
  });

  return <section className="rounded-2xl border border-[var(--color-error)]/30 bg-white p-5 shadow-[var(--shadow-card)] sm:p-6" aria-labelledby="erase-title">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--color-error-container)] text-[var(--color-error)]"><Trash2 className="size-5" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <h2 id="erase-title" className="font-semibold">{t("candidate.core.account.erase.title")}</h2>
        <p className="text-sm text-[var(--color-on-surface-variant)]">{t("candidate.core.account.erase.description")}</p>
      </div>
      <Button variant="danger" onClick={confirmErase}>{t("candidate.core.account.erase.button")}</Button>
    </div>
  </section>;
}

function ProfileSection({ profile }: { profile: AccountProfile }) {
  const t = useT();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const profileSchema = useMemo(() => createProfileSchema(t), [t]);
  const form = useForm<ProfileForm>({ resolver: zodResolver(profileSchema), defaultValues: toForm(profile) });
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = form;

  useEffect(() => reset(toForm(profile)), [profile, reset]);

  const save = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (saved) => {
      queryClient.setQueryData(PROFILE_KEY, saved);
      if (user) setUser({ ...user, fullName: saved.fullName, phone: saved.phone, headline: saved.headline, bio: saved.bio });
      toast.success(t("candidate.core.account.profile.updatedToast"));
    },
    onError: (error) => toast.danger(getApiErrorMessage(error)),
  });

  return <form onSubmit={handleSubmit((value) => save.mutate({ fullName: value.fullName, phone: value.phone || null, headline: value.headline || null, bio: value.bio || null }))}
    className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6" aria-labelledby="profile-title" noValidate>
    <div className="mb-5 flex items-center gap-4"><SectionIcon icon={UserRound} /><div><h2 id="profile-title" className="font-semibold">{t("candidate.core.account.profile.title")}</h2><p className="text-sm text-[var(--color-on-surface-variant)]">{t("candidate.core.account.profile.subtitle")}</p></div></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("candidate.core.account.profile.fullNameLabel")} error={errors.fullName?.message}><input {...register("fullName")} autoComplete="name" className={inputClass} /></Field>
      <Field label={t("candidate.core.account.profile.emailLabel")}><input value={profile.email} disabled className={inputClass} /></Field>
      <Field label={t("candidate.core.account.profile.phoneLabel")} error={errors.phone?.message}><input {...register("phone")} type="tel" autoComplete="tel" placeholder={t("candidate.core.account.profile.phonePlaceholder")} className={inputClass} /></Field>
      <Field label={t("candidate.core.account.profile.headlineLabel")} error={errors.headline?.message}><input {...register("headline")} placeholder={t("candidate.core.account.profile.headlinePlaceholder")} className={inputClass} /></Field>
      <div className="sm:col-span-2"><Field label={t("candidate.core.account.profile.bioLabel")} error={errors.bio?.message}><textarea {...register("bio")} rows={4} className={`${inputClass} py-2.5`} /></Field></div>
    </div>
    <div className="mt-5 flex justify-end gap-2">
      <Button type="button" variant="ghost" disabled={!isDirty || save.isPending} onClick={() => reset(toForm(profile))}>{t("common.cancel")}</Button>
      <Button type="submit" disabled={!isDirty || save.isPending}>{save.isPending ? t("common.saving") : t("candidate.core.account.profile.saveChanges")}</Button>
    </div>
  </form>;
}

function PasswordSection({ hasPassword }: { hasPassword: boolean }) {
  const t = useT();
  const passwordSchema = useMemo(() => createPasswordSchema(t), [t]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });
  const change = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => { reset(); toast.success(t("candidate.core.account.password.changedToast")); },
    onError: (error) => toast.danger(getApiErrorMessage(error)),
  });

  return <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6" aria-labelledby="password-title">
    <div className="mb-5 flex items-center gap-4"><SectionIcon icon={KeyRound} /><div><h2 id="password-title" className="font-semibold">{t("candidate.core.account.password.title")}</h2><p className="text-sm text-[var(--color-on-surface-variant)]">{t("candidate.core.account.password.subtitle")}</p></div></div>
    {!hasPassword
      ? <p className="rounded-xl bg-[var(--color-surface-alt)] p-4 text-sm leading-6 text-[var(--color-on-surface-variant)]">{t("candidate.core.account.password.googleNotice")}</p>
      : <form onSubmit={handleSubmit((value) => change.mutate({ currentPassword: value.currentPassword, newPassword: value.newPassword }))} noValidate>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("candidate.core.account.password.currentLabel")} error={errors.currentPassword?.message}><input {...register("currentPassword")} type="password" autoComplete="current-password" className={inputClass} /></Field>
          <Field label={t("candidate.core.account.password.newLabel")} error={errors.newPassword?.message}><input {...register("newPassword")} type="password" autoComplete="new-password" className={inputClass} /></Field>
          <Field label={t("candidate.core.account.password.confirmLabel")} error={errors.confirmPassword?.message}><input {...register("confirmPassword")} type="password" autoComplete="new-password" className={inputClass} /></Field>
        </div>
        <div className="mt-5 flex justify-end"><Button type="submit" disabled={change.isPending}>{change.isPending ? t("candidate.core.account.password.changing") : t("candidate.core.account.password.submit")}</Button></div>
      </form>}
  </section>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5 text-sm">
    <span className="font-medium">{label}</span>
    {children}
    {error && <span role="alert" className="block text-xs text-red-600">{error}</span>}
  </label>;
}

function SectionIcon({ icon: Icon }: { icon: React.ElementType }) {
  return <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><Icon className="size-5" aria-hidden="true" /></span>;
}

function toForm(profile: AccountProfile): ProfileForm {
  return { fullName: profile.fullName, phone: profile.phone ?? "", headline: profile.headline ?? "", bio: profile.bio ?? "" };
}
