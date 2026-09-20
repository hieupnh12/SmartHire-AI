import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, Building2, Globe, ImageOff, MapPin } from "lucide-react";
import { companyApi } from "@/api/tenant/companyApi";
import { Button } from "@/components/ux/Button";
import { Card } from "@/components/ux/Card";
import { PageSkeleton } from "@/components/ux/Skeleton";
import { getApiErrorMessage } from "@/lib/axios";
import { toast } from "@/stores/toastStore";
import { useT } from "@/i18n";

const HTTP_URL = /^https?:\/\/\S+$/;

type CompanyProfileForm = {
  companyName: string;
  industry: string;
  companySize: string;
  website: string;
  logoUrl: string;
  address: string;
  description: string;
};

const EMPTY_FORM: CompanyProfileForm = {
  companyName: "",
  industry: "",
  companySize: "",
  website: "",
  logoUrl: "",
  address: "",
  description: "",
};

const inputClass =
  "min-h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-surface-card px-3 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15";

export function CompanyProfilePage() {
  const t = useT();
  const queryClient = useQueryClient();

  const companyProfileSchema = useMemo(() => {
    const optionalUrl = (max: number, maxMessage: string) =>
      z
        .string()
        .trim()
        .max(max, maxMessage)
        .refine((value) => value === "" || HTTP_URL.test(value), t("companyProfile.urlInvalid"));

    return z.object({
      companyName: z.string().trim().min(1, t("companyProfile.nameRequired")).max(255, t("companyProfile.max255")),
      industry: z.string().trim().max(128, t("companyProfile.max128")),
      companySize: z.string().trim().max(64, t("companyProfile.max64")),
      website: optionalUrl(255, t("companyProfile.max255")),
      logoUrl: optionalUrl(512, t("companyProfile.max512")),
      address: z.string().trim().max(512, t("companyProfile.max512")),
      description: z.string().trim().max(5000, t("companyProfile.max5000")),
    });
  }, [t]);

  const profileQuery = useQuery({
    queryKey: ["tenant", "company", "profile"],
    queryFn: companyApi.getProfile,
  });
  const profile = profileQuery.data?.data;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<CompanyProfileForm>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (!profile) return;
    reset({
      companyName: profile.companyName ?? "",
      industry: profile.industry ?? "",
      companySize: profile.companySize ?? "",
      website: profile.website ?? "",
      logoUrl: profile.logoUrl ?? "",
      address: profile.address ?? "",
      description: profile.description ?? "",
    });
  }, [profile, reset]);

  const mutation = useMutation({
    mutationFn: companyApi.updateProfile,
    onSuccess: (res) => {
      if (!res.success || !res.data) throw new Error(res.message || t("common.errorGeneric"));
      queryClient.setQueryData(["tenant", "company", "profile"], res);
      toast.success(t("companyProfile.updated"));
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, t("common.errorGeneric"))),
  });

  const logoPreview = watch("logoUrl");

  if (profileQuery.isLoading) return <PageSkeleton />;

  if (profileQuery.isError) {
    return (
      <section className="space-y-4">
        <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">{t("companyProfile.title")}</h1>
        <p className="text-status-danger" role="alert">
          {getApiErrorMessage(profileQuery.error, t("common.errorGeneric"))}
        </p>
        <Button variant="secondary" onClick={() => profileQuery.refetch()}>
          {t("common.retry")}
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">{t("companyProfile.title")}</h1>
          {profile?.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-semibold text-brand-primary">
              <BadgeCheck className="size-4" aria-hidden="true" />
              {t("companyProfile.verified")}
            </span>
          )}
        </div>
        <p className="max-w-2xl text-[var(--color-text-secondary)]">{t("companyProfile.subtitle")}</p>
        {profile && (
          <p className="text-sm text-[var(--color-text-secondary)]">
            COMPANY-01 · {t("companyProfile.workspace")} <span className="font-mono">{profile.subdomain}</span> ·{" "}
            {t("companyProfile.tenantCode")} <span className="font-mono">{profile.tenantId}</span>
          </p>
        )}
      </header>

      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-5" noValidate>
        <Card className="space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
            <Building2 className="size-4 text-brand-primary" aria-hidden="true" />
            {t("companyProfile.companySection")}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]" htmlFor="companyName">
                {t("companyProfile.companyName")} *
              </label>
              <input
                id="companyName"
                aria-invalid={!!errors.companyName}
                {...register("companyName")}
                className={inputClass}
              />
              {errors.companyName && (
                <p className="mt-1 text-xs text-status-danger" role="alert">
                  {errors.companyName.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]" htmlFor="industry">
                {t("companyProfile.industry")}
              </label>
              <input
                id="industry"
                placeholder={t("companyProfile.industryPlaceholder")}
                aria-invalid={!!errors.industry}
                {...register("industry")}
                className={inputClass}
              />
              {errors.industry && (
                <p className="mt-1 text-xs text-status-danger" role="alert">
                  {errors.industry.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]" htmlFor="companySize">
                {t("companyProfile.companySize")}
              </label>
              <input
                id="companySize"
                placeholder={t("companyProfile.companySizePlaceholder")}
                aria-invalid={!!errors.companySize}
                {...register("companySize")}
                className={inputClass}
              />
              {errors.companySize && (
                <p className="mt-1 text-xs text-status-danger" role="alert">
                  {errors.companySize.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]" htmlFor="website">
                {t("companyProfile.website")}
              </label>
              <div className="relative">
                <Globe className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-secondary)]" aria-hidden="true" />
                <input
                  id="website"
                  placeholder={t("companyProfile.websitePlaceholder")}
                  aria-invalid={!!errors.website}
                  {...register("website")}
                  className={`${inputClass} pl-9`}
                />
              </div>
              {errors.website && (
                <p className="mt-1 text-xs text-status-danger" role="alert">
                  {errors.website.message}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]" htmlFor="address">
                {t("companyProfile.address")}
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-secondary)]" aria-hidden="true" />
                <input
                  id="address"
                  placeholder={t("companyProfile.addressPlaceholder")}
                  aria-invalid={!!errors.address}
                  {...register("address")}
                  className={`${inputClass} pl-9`}
                />
              </div>
              {errors.address && (
                <p className="mt-1 text-xs text-status-danger" role="alert">
                  {errors.address.message}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]" htmlFor="description">
                {t("companyProfile.description")}
              </label>
              <textarea
                id="description"
                rows={5}
                placeholder={t("companyProfile.descriptionPlaceholder")}
                aria-invalid={!!errors.description}
                {...register("description")}
                className={`${inputClass} min-h-32 py-2 leading-relaxed`}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-status-danger" role="alert">
                  {errors.description.message}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
            <ImageOff className="size-4 text-brand-primary" aria-hidden="true" />
            {t("companyProfile.logoSection")}
          </div>
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]" htmlFor="logoUrl">
                {t("companyProfile.logoUrl")}
              </label>
              <input
                id="logoUrl"
                placeholder={t("companyProfile.logoUrlPlaceholder")}
                aria-invalid={!!errors.logoUrl}
                {...register("logoUrl")}
                className={inputClass}
              />
              {errors.logoUrl ? (
                <p className="mt-1 text-xs text-status-danger" role="alert">
                  {errors.logoUrl.message}
                </p>
              ) : (
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{t("companyProfile.logoHint")}</p>
              )}
            </div>
            <div className="grid size-24 place-items-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-surface-muted">
              {logoPreview && HTTP_URL.test(logoPreview) ? (
                <img src={logoPreview} alt={t("companyProfile.logoAlt")} className="size-full object-contain" />
              ) : (
                <span className="text-xs text-[var(--color-text-secondary)]">{t("companyProfile.noLogo")}</span>
              )}
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={mutation.isPending || !isDirty}>
            {mutation.isPending ? t("common.saving") : t("common.save")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={mutation.isPending || !isDirty}
            onClick={() => reset()}
          >
            {t("common.undo")}
          </Button>
        </div>
      </form>
    </section>
  );
}
