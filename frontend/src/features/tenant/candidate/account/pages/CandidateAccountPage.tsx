import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bell, Camera, ExternalLink, Globe, KeyRound, Link2, Smartphone, Trash2, Upload, UserRound } from "lucide-react";
import { authApi } from "@/api/tenant/authApi";
import { fitImage } from "@/features/tenant/candidate/cv/utils/cropAvatar";
import { Button } from "@/components/ux/Button";
import { LoadingState, SkeletonCard } from "@/components/ux/Skeleton";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import type { AccountProfile } from "@/features/tenant/auth/types";
import { useT, type TranslateFn } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { getTenantTheme } from "@/lib/tenantTheme";
import { MobileAppSyncCard } from "@/features/tenant/candidate/shared/components/MobileAppQrModal";
import { NotificationSettings } from "@/features/tenant/candidate/notifications/components/NotificationSettings";

function createProfileSchema(t: TranslateFn) {
  const linkField = z
    .string()
    .trim()
    .max(512, t("candidate.core.account.profile.validation.linkMax"))
    .refine((value) => !value || /^https?:\/\/[^\s]+$/i.test(value), {
      message: t("candidate.core.account.profile.validation.linkInvalid"),
    });
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
    github: linkField,
    linkedin: linkField,
    portfolio: linkField,
    website: linkField,
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

type AccountSection = "profile" | "security" | "mobile" | "notifications" | "data";
const ACCOUNT_SECTIONS: readonly AccountSection[] = ["profile", "security", "mobile", "notifications", "data"];

export function CandidateAccountPage() {
  const t = useT();
  const [searchParams, setSearchParams] = useSearchParams();
  const tenantCode = getTenantIdFromWindow() || "acme";
  const theme = getTenantTheme(tenantCode);
  const profile = useQuery({ queryKey: PROFILE_KEY, queryFn: authApi.profile });

  const requestedSection = searchParams.get("section") as AccountSection | null;
  const activeSection: AccountSection = requestedSection && ACCOUNT_SECTIONS.includes(requestedSection) ? requestedSection : "profile";

  const setActiveSection = (section: AccountSection) => {
    const next = new URLSearchParams(searchParams);
    if (section === "profile") next.delete("section");
    else next.set("section", section);
    setSearchParams(next, { replace: true });
  };

  const navItems: Array<{ id: AccountSection; label: string; icon: typeof UserRound; danger?: boolean }> = [
    { id: "profile", label: t("candidate.core.account.tabs.profile"), icon: UserRound },
    { id: "security", label: t("candidate.core.account.tabs.security"), icon: KeyRound },
    { id: "mobile", label: t("candidate.core.account.tabs.mobile"), icon: Smartphone },
    { id: "notifications", label: t("candidate.core.account.tabs.notifications"), icon: Bell },
    { id: "data", label: t("candidate.core.account.tabs.data"), icon: Trash2, danger: true },
  ];

  return <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 pb-10 text-[var(--color-on-surface)]" aria-labelledby="account-title">
    <header className="flex flex-col gap-4 rounded-3xl border border-[var(--color-border-default)] bg-[linear-gradient(135deg,var(--color-primary-subtle),white_58%)] px-5 py-6 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">{t("candidate.core.account.eyebrow")}</p>
        <h1 id="account-title" className="mt-2 text-3xl font-semibold tracking-tight">{t("candidate.core.account.title")}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-on-surface-variant)]">{t("candidate.core.account.subtitle")}</p>
      </div>
      {profile.data && (
        <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-[var(--color-border-default)] bg-white/90 px-4 py-2.5 shadow-2xs">
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-primary-subtle)] text-sm font-semibold text-[var(--color-primary)]">
            {profile.data.avatarUrl
              ? <img src={profile.data.avatarUrl} alt={profile.data.fullName} className="size-full object-cover" />
              : <span>{(profile.data.fullName || profile.data.email || "?").charAt(0).toUpperCase()}</span>}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--color-on-surface)]">{profile.data.fullName}</p>
            <p className="truncate text-xs text-[var(--color-on-surface-variant)]">{profile.data.email}</p>
          </div>
        </div>
      )}
    </header>

    {profile.isPending && (
      <LoadingState className="space-y-4" label={t("candidate.core.account.loading")}>
        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-96" />
        </div>
      </LoadingState>
    )}
    {profile.error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--color-error-container)] p-4 text-sm text-[var(--color-on-error-container)]"><p>{getApiErrorMessage(profile.error)}</p><Button variant="secondary" size="sm" onClick={() => profile.refetch()}>{t("common.retry")}</Button></div>}

    {profile.data && (
      <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[var(--color-border-default)] bg-white p-3 shadow-[var(--shadow-card)] lg:sticky lg:top-24 lg:self-start">
          <p className="px-2.5 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {t("candidate.core.account.sidebarHeading")}
          </p>
          <nav className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1" aria-label={t("candidate.core.account.sidebarNavAria")}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-all",
                    active
                      ? item.danger
                        ? "border-[var(--color-error)]/30 bg-[var(--color-error-container)]/50 font-semibold text-[var(--color-error)] shadow-2xs"
                        : "border-[var(--color-primary)]/30 bg-[var(--color-primary-subtle)] font-semibold text-[var(--color-primary-hover)] shadow-2xs"
                      : item.danger
                        ? "border-transparent text-slate-600 hover:border-rose-200/80 hover:bg-rose-50/70 hover:text-[var(--color-error)]"
                        : "border-transparent text-slate-600 hover:border-slate-200/80 hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      active
                        ? item.danger ? "text-[var(--color-error)]" : "text-[var(--color-primary)]"
                        : "text-slate-400",
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 space-y-5">
          {activeSection === "profile" && <ProfileSection profile={profile.data} />}
          {activeSection === "security" && <PasswordSection hasPassword={profile.data.hasPassword} />}
          {activeSection === "mobile" && <MobileAppSyncCard tenantName={theme.name} tenantCode={tenantCode} />}
          {activeSection === "notifications" && (
            <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6" aria-labelledby="notifications-prefs-title">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <SectionIcon icon={Bell} />
                  <div>
                    <h2 id="notifications-prefs-title" className="font-semibold">{t("candidate.core.account.notificationPrefsTitle")}</h2>
                    <p className="text-sm text-[var(--color-on-surface-variant)]">{t("candidate.core.account.notificationPrefsDesc")}</p>
                  </div>
                </div>
                <Link
                  to="/notifications"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-3 py-2 text-xs font-semibold text-[var(--color-on-surface)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-primary-hover)]"
                >
                  <span>{t("candidate.core.account.openNotificationsInbox")}</span>
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
              <NotificationSettings />
            </section>
          )}
          {activeSection === "data" && <EraseDataSection />}
        </div>
      </div>
    )}
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const profileSchema = useMemo(() => createProfileSchema(t), [t]);
  const form = useForm<ProfileForm>({ resolver: zodResolver(profileSchema), defaultValues: toForm(profile) });
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = form;

  useEffect(() => reset(toForm(profile)), [profile, reset]);

  const syncAvatarToStore = (saved: AccountProfile) => {
    queryClient.setQueryData(PROFILE_KEY, saved);
    if (user) {
      setUser({
        ...user,
        fullName: saved.fullName,
        phone: saved.phone,
        headline: saved.headline,
        bio: saved.bio,
        avatarUrl: saved.avatarUrl,
      });
    }
  };

  const save = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (saved) => {
      syncAvatarToStore(saved);
      toast.success(t("candidate.core.account.profile.updatedToast"));
    },
    onError: (error) => toast.danger(getApiErrorMessage(error)),
  });

  const handleAvatarSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type.toLowerCase())) {
      toast.error(t("candidate.core.account.profile.avatarTypeError"));
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error(t("candidate.core.account.profile.avatarTooLargeToast"));
      return;
    }
    setAvatarBusy(true);
    try {
      const processed = await fitImage(file, 512);
      if (processed.size > 2 * 1024 * 1024) {
        toast.error(t("candidate.core.account.profile.avatarTooLargeToast"));
        return;
      }
      const saved = await authApi.uploadProfileAvatar(processed, "avatar.jpg");
      syncAvatarToStore(saved);
      toast.success(t("candidate.core.account.profile.avatarUpdatedToast"));
    } catch (error) {
      toast.danger(getApiErrorMessage(error));
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarBusy(true);
    try {
      const saved = await authApi.removeProfileAvatar();
      syncAvatarToStore(saved);
      toast.success(t("candidate.core.account.profile.avatarRemovedToast"));
    } catch (error) {
      toast.danger(getApiErrorMessage(error));
    } finally {
      setAvatarBusy(false);
    }
  };

  return <form onSubmit={handleSubmit((value) => save.mutate({
    fullName: value.fullName,
    phone: value.phone || null,
    headline: value.headline || null,
    bio: value.bio || null,
    links: {
      github: value.github || null,
      linkedin: value.linkedin || null,
      portfolio: value.portfolio || null,
      website: value.website || null,
    },
  }))}
    className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6" aria-labelledby="profile-title" noValidate>
    <div className="mb-5 flex items-center gap-4"><SectionIcon icon={UserRound} /><div><h2 id="profile-title" className="font-semibold">{t("candidate.core.account.profile.title")}</h2><p className="text-sm text-[var(--color-on-surface-variant)]">{t("candidate.core.account.profile.subtitle")}</p></div></div>

    <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] p-4 sm:flex-row sm:items-center">
      <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white text-2xl font-semibold text-[var(--color-primary)] shadow-sm">
        {profile.avatarUrl
          ? <img src={profile.avatarUrl} alt={profile.fullName} className="size-full object-cover" />
          : <span>{(profile.fullName || profile.email || "?").charAt(0).toUpperCase()}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{t("candidate.core.account.profile.avatarLabel")}</p>
        <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">{t("candidate.core.account.profile.avatarHint")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarSelected}
            className="hidden"
          />
          <Button type="button" variant="secondary" size="sm" disabled={avatarBusy} onClick={() => fileInputRef.current?.click()}>
            {profile.avatarUrl ? <Camera className="size-4" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
            {avatarBusy ? t("candidate.core.account.profile.uploadingAvatar") : t("candidate.core.account.profile.uploadAvatar")}
          </Button>
          {profile.avatarUrl && (
            <Button type="button" variant="ghost" size="sm" disabled={avatarBusy} onClick={handleRemoveAvatar}>
              {t("candidate.core.account.profile.removeAvatar")}
            </Button>
          )}
        </div>
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("candidate.core.account.profile.fullNameLabel")} error={errors.fullName?.message}><input {...register("fullName")} autoComplete="name" className={inputClass} /></Field>
      <Field label={t("candidate.core.account.profile.emailLabel")}><input value={profile.email} disabled className={inputClass} /></Field>
      <Field label={t("candidate.core.account.profile.phoneLabel")} error={errors.phone?.message}><input {...register("phone")} type="tel" autoComplete="tel" placeholder={t("candidate.core.account.profile.phonePlaceholder")} className={inputClass} /></Field>
      <Field label={t("candidate.core.account.profile.headlineLabel")} error={errors.headline?.message}><input {...register("headline")} placeholder={t("candidate.core.account.profile.headlinePlaceholder")} className={inputClass} /></Field>
      <div className="sm:col-span-2"><Field label={t("candidate.core.account.profile.bioLabel")} error={errors.bio?.message}><textarea {...register("bio")} rows={4} className={`${inputClass} py-2.5`} /></Field></div>
    </div>

    <div className="mt-6 border-t border-[var(--color-border-default)] pt-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-on-surface)]">
        <Link2 className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
        {t("candidate.core.account.profile.linksSectionTitle")}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("candidate.core.account.profile.githubLabel")} error={errors.github?.message}><input {...register("github")} type="url" placeholder={t("candidate.core.account.profile.linkPlaceholder")} className={inputClass} /></Field>
        <Field label={t("candidate.core.account.profile.linkedinLabel")} error={errors.linkedin?.message}><input {...register("linkedin")} type="url" placeholder={t("candidate.core.account.profile.linkPlaceholder")} className={inputClass} /></Field>
        <Field label={t("candidate.core.account.profile.portfolioLabel")} error={errors.portfolio?.message}><input {...register("portfolio")} type="url" placeholder={t("candidate.core.account.profile.linkPlaceholder")} className={inputClass} /></Field>
        <Field label={t("candidate.core.account.profile.websiteLabel")} error={errors.website?.message}>
          <div className="relative">
            <Globe className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-on-surface-variant)]" aria-hidden="true" />
            <input {...register("website")} type="url" placeholder={t("candidate.core.account.profile.linkPlaceholder")} className={`${inputClass} pl-9`} />
          </div>
        </Field>
      </div>
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
  return {
    fullName: profile.fullName,
    phone: profile.phone ?? "",
    headline: profile.headline ?? "",
    bio: profile.bio ?? "",
    github: profile.links?.github ?? "",
    linkedin: profile.links?.linkedin ?? "",
    portfolio: profile.links?.portfolio ?? "",
    website: profile.links?.website ?? "",
  };
}
