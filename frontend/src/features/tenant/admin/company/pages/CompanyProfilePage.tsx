import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BadgeCheck,
  Building2,
  Check,
  ExternalLink,
  Globe,
  ImageIcon,
  MapPin,
  Pencil,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
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

/* Comfortable, well-proportioned enterprise input classes */
const inputClass =
  "h-10 sm:h-11 w-full rounded-lg border border-[var(--color-border-default)] bg-surface-card px-3.5 text-sm text-[var(--color-text-primary)] outline-none transition-all duration-150 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 placeholder:text-[var(--color-text-secondary)]/50";

const textareaClass =
  "w-full rounded-lg border border-[var(--color-border-default)] bg-surface-card px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] outline-none transition-all duration-150 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 placeholder:text-[var(--color-text-secondary)]/50 resize-y";

/* ───────── Profile completeness calculator ────────── */
function computeCompleteness(values: CompanyProfileForm): {
  pct: number;
  filled: number;
  total: number;
  missing: string[];
} {
  const fields: Array<{ key: keyof CompanyProfileForm; label: string }> = [
    { key: "companyName", label: "Tên công ty" },
    { key: "industry", label: "Lĩnh vực" },
    { key: "companySize", label: "Quy mô" },
    { key: "website", label: "Website" },
    { key: "logoUrl", label: "Logo" },
    { key: "address", label: "Địa chỉ" },
    { key: "description", label: "Mô tả" },
  ];
  const missing: string[] = [];
  let filled = 0;
  for (const f of fields) {
    if (values[f.key]?.trim()) filled++;
    else missing.push(f.label);
  }
  return {
    pct: Math.round((filled / fields.length) * 100),
    filled,
    total: fields.length,
    missing,
  };
}

/* ───────── Field component ────────── */
function FieldItem({
  label,
  htmlFor,
  required,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label
        className="mb-1.5 flex items-center justify-between text-xs sm:text-sm font-medium text-[var(--color-text-primary)]"
        htmlFor={htmlFor}
      >
        <span>
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </span>
        {error && (
          <span className="flex items-center gap-0.5 text-xs font-normal text-status-danger" role="alert">
            <X className="size-3" />
            {error}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main CompanyProfilePage
   ═══════════════════════════════════════════ */
export function CompanyProfilePage() {
  const t = useT();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

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
      setEditing(false);
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, t("common.errorGeneric"))),
  });

  const watchAll = watch();
  const logoPreview = watchAll.logoUrl;
  const completeness = computeCompleteness(watchAll);

  const handleCancel = useCallback(() => {
    reset();
    setEditing(false);
  }, [reset]);

  if (profileQuery.isLoading) return <PageSkeleton />;

  if (profileQuery.isError) {
    return (
      <section className="space-y-4">
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">{t("companyProfile.title")}</h1>
        <p className="text-sm text-status-danger" role="alert">
          {getApiErrorMessage(profileQuery.error, t("common.errorGeneric"))}
        </p>
        <Button variant="secondary" size="sm" onClick={() => profileQuery.refetch()}>
          {t("common.retry")}
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-5 w-full">
      {/* ──── Prominent, Balanced Header Bar ──── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[var(--color-border-default)] bg-surface-card p-5 sm:p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
          <div className="grid size-16 sm:size-20 shrink-0 place-items-center rounded-2xl border border-[var(--color-border-default)] bg-surface-muted overflow-hidden shadow-sm">
            {profile?.logoUrl && HTTP_URL.test(profile.logoUrl) ? (
              <img
                src={profile.logoUrl}
                alt={t("companyProfile.logoAlt")}
                className="size-full object-contain p-2"
              />
            ) : (
              <Building2 className="size-8 text-brand-primary" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate font-display text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
                {profile?.companyName || t("companyProfile.title")}
              </h1>
              {profile?.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <BadgeCheck className="size-3.5" aria-hidden="true" />
                  {t("companyProfile.verified")}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)] max-w-2xl leading-relaxed">
              {profile?.subdomain ? <span className="font-semibold text-[var(--color-text-primary)]">{profile.subdomain} · </span> : ""}
              {t("companyProfile.subtitle")}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
          {!editing ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => setEditing(true)}
              className="gap-2 h-10 px-5 text-sm font-semibold shadow-sm"
            >
              <Pencil className="size-4" aria-hidden="true" />
              {t("common.edit")}
            </Button>
          ) : (
            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={handleCancel}
                className="h-10 text-sm px-4"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                disabled={mutation.isPending || !isDirty}
                onClick={() => reset()}
                className="h-10 text-sm gap-1.5 px-4"
              >
                <RotateCcw className="size-3.5" />
                {t("common.undo")}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={mutation.isPending || !isDirty}
                onClick={handleSubmit((values) => mutation.mutate(values))}
                className="h-10 text-sm font-semibold gap-2 px-5 shadow-sm"
              >
                <Save className="size-4" />
                {mutation.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ──── Content Area ──── */}
      {!editing ? (
        /* ──── READ MODE (RÕ RÀNG, VỪA KHUNG HÌNH) ──── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Main Info Card */}
          <Card className="p-6 sm:p-7 lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--color-border-default)] pb-4">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-primary">
                <Building2 className="size-4 sm:size-5" />
                {t("companyProfile.companySection")}
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[var(--color-text-secondary)]">
                <span className="inline-block size-2.5 rounded-full bg-emerald-500" />
                Hoàn tất {completeness.filled}/{completeness.total}
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              <ReadItem label={t("companyProfile.companyName")} value={profile?.companyName} />
              <ReadItem label={t("companyProfile.industry")} value={profile?.industry} />
              <ReadItem label={t("companyProfile.companySize")} value={profile?.companySize} icon={Users} />
              <ReadItem label={t("companyProfile.website")} value={profile?.website} isLink icon={Globe} />
              <ReadItem label={t("companyProfile.address")} value={profile?.address} className="sm:col-span-2" icon={MapPin} />
            </dl>

            <div className="border-t border-[var(--color-border-default)] pt-5">
              <dt className="flex items-center gap-2 text-xs sm:text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                <Sparkles className="size-4 text-brand-primary" />
                {t("companyProfile.description")}
              </dt>
              <dd className="mt-2 text-sm sm:text-base leading-relaxed text-[var(--color-text-primary)]">
                {profile?.description?.trim() ? (
                  <p className="whitespace-pre-line">{profile.description}</p>
                ) : (
                  <span className="italic text-[var(--color-text-secondary)]">Chưa có thông tin mô tả công ty</span>
                )}
              </dd>
            </div>
          </Card>

          {/* Side Column: Logo & System Info */}
          <div className="lg:col-span-4 space-y-5">
            {/* Logo Card - (ĐÃ XÓA HIỆN ĐƯỜNG DẪN ẢNH) */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--color-border-default)] pb-3">
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-primary">
                  <ImageIcon className="size-4 sm:size-5" />
                  {t("companyProfile.logoSection")}
                </div>
              </div>
              <div className="grid place-items-center h-44 sm:h-48 rounded-xl border border-dashed border-[var(--color-border-default)] bg-surface-muted/50 p-4">
                {profile?.logoUrl && HTTP_URL.test(profile.logoUrl) ? (
                  <img
                    src={profile.logoUrl}
                    alt={t("companyProfile.logoAlt")}
                    className="max-h-36 sm:max-h-40 max-w-full object-contain drop-shadow-sm"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[var(--color-text-secondary)]">
                    <ImageIcon className="size-8 opacity-30" />
                    <span className="text-xs">{t("companyProfile.noLogo")}</span>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6 space-y-3.5 text-sm">
              <div className="flex items-center gap-2 font-semibold text-[var(--color-text-primary)] border-b border-[var(--color-border-default)] pb-3">
                <ShieldCheck className="size-4 text-brand-primary" />
                Thông tin hệ thống
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--color-border-default)]/60">
                <span className="text-[var(--color-text-secondary)]">{t("companyProfile.workspace")}</span>
                <span className="font-mono font-medium text-[var(--color-text-primary)]">{profile?.subdomain || "—"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--color-border-default)]/60">
                <span className="text-[var(--color-text-secondary)]">{t("companyProfile.tenantCode")}</span>
                <span className="font-mono font-medium text-[var(--color-text-primary)]">{profile?.tenantId || "—"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[var(--color-text-secondary)]">Trạng thái</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {profile?.verified ? "Đã duyệt" : "Chờ xác minh"}
                </span>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* ──── EDIT MODE (THOẢI MÁI, RÕ RÀNG) ──── */
        <form
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          noValidate
          className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
        >
          {/* Main Column: Core Company Info (8 cols) */}
          <Card className="p-6 sm:p-7 lg:col-span-8 space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--color-border-default)] pb-3">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-primary">
                <Building2 className="size-4 sm:size-5" />
                {t("companyProfile.companySection")}
              </div>
              <span className="text-xs text-[var(--color-text-secondary)]">
                * Các mục bắt buộc
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <FieldItem
                label={t("companyProfile.companyName")}
                htmlFor="companyName"
                required
                error={errors.companyName?.message}
                className="sm:col-span-2"
              >
                <input
                  id="companyName"
                  aria-invalid={!!errors.companyName}
                  {...register("companyName")}
                  className={inputClass}
                  placeholder="Nhập tên doanh nghiệp..."
                />
              </FieldItem>

              <FieldItem
                label={t("companyProfile.industry")}
                htmlFor="industry"
                error={errors.industry?.message}
              >
                <input
                  id="industry"
                  placeholder={t("companyProfile.industryPlaceholder")}
                  aria-invalid={!!errors.industry}
                  {...register("industry")}
                  className={inputClass}
                />
              </FieldItem>

              <FieldItem
                label={t("companyProfile.companySize")}
                htmlFor="companySize"
                error={errors.companySize?.message}
              >
                <input
                  id="companySize"
                  placeholder={t("companyProfile.companySizePlaceholder")}
                  aria-invalid={!!errors.companySize}
                  {...register("companySize")}
                  className={inputClass}
                />
              </FieldItem>

              <FieldItem
                label={t("companyProfile.website")}
                htmlFor="website"
                error={errors.website?.message}
              >
                <div className="relative">
                  <Globe className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
                  <input
                    id="website"
                    placeholder={t("companyProfile.websitePlaceholder")}
                    aria-invalid={!!errors.website}
                    {...register("website")}
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </FieldItem>

              <FieldItem
                label={t("companyProfile.address")}
                htmlFor="address"
                error={errors.address?.message}
              >
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
                  <input
                    id="address"
                    placeholder={t("companyProfile.addressPlaceholder")}
                    aria-invalid={!!errors.address}
                    {...register("address")}
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </FieldItem>

              <FieldItem
                label={t("companyProfile.description")}
                htmlFor="description"
                error={errors.description?.message}
                className="sm:col-span-2"
              >
                <textarea
                  id="description"
                  rows={4}
                  placeholder={t("companyProfile.descriptionPlaceholder")}
                  aria-invalid={!!errors.description}
                  {...register("description")}
                  className={`${textareaClass} min-h-[105px] leading-relaxed`}
                />
              </FieldItem>
            </div>
          </Card>

          {/* Right Column: Logo & Branding Preview (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--color-border-default)] pb-3">
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-primary">
                  <ImageIcon className="size-4 sm:size-5" />
                  {t("companyProfile.logoSection")}
                </div>
                <span className="text-xs text-[var(--color-text-secondary)]">Xem trước</span>
              </div>

              {/* Logo Preview box */}
              <div className="grid place-items-center h-40 rounded-xl border border-dashed border-[var(--color-border-default)] bg-surface-muted/50 p-3">
                {logoPreview && HTTP_URL.test(logoPreview) ? (
                  <img
                    src={logoPreview}
                    alt={t("companyProfile.logoAlt")}
                    className="max-h-32 max-w-full object-contain drop-shadow-sm"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-[var(--color-text-secondary)]">
                    <ImageIcon className="size-7 opacity-30" />
                    <span className="text-xs">{t("companyProfile.noLogo")}</span>
                  </div>
                )}
              </div>

              <FieldItem
                label={t("companyProfile.logoUrl")}
                htmlFor="logoUrl"
                error={errors.logoUrl?.message}
              >
                <input
                  id="logoUrl"
                  placeholder={t("companyProfile.logoUrlPlaceholder")}
                  aria-invalid={!!errors.logoUrl}
                  {...register("logoUrl")}
                  className={inputClass}
                />
              </FieldItem>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                {t("companyProfile.logoHint")}
              </p>
            </Card>

            {/* Quick Completion Helper */}
            <Card className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Độ hoàn thiện hồ sơ
                </span>
                <span className="text-sm font-bold text-brand-primary">{completeness.pct}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted border border-[var(--color-border-default)]">
                <div
                  className="h-full bg-brand-primary transition-all duration-300"
                  style={{ width: `${completeness.pct}%` }}
                />
              </div>
              {completeness.missing.length > 0 ? (
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Còn thiếu: <span className="text-amber-500 font-medium">{completeness.missing.join(", ")}</span>
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <Check className="size-4" /> Tất cả thông tin đã được điền đầy đủ
                </p>
              )}
            </Card>
          </div>
        </form>
      )}
    </section>
  );
}

/* ──── Read item component ──── */
function ReadItem({
  label,
  value,
  isLink,
  icon: Icon,
  className,
}: {
  label: string;
  value?: string | null;
  isLink?: boolean;
  icon?: typeof Building2;
  className?: string;
}) {
  const display = value?.trim() || "—";
  return (
    <div className={className}>
      <dt className="flex items-center gap-1.5 text-xs sm:text-sm font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
        {Icon && <Icon className="size-3.5 text-brand-primary/80" aria-hidden="true" />}
        {label}
      </dt>
      <dd className="mt-1 text-base sm:text-lg font-semibold text-[var(--color-text-primary)] break-words">
        {isLink && value?.trim() ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-brand-primary hover:underline"
          >
            {display}
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        ) : (
          display
        )}
      </dd>
    </div>
  );
}
