import { useMemo, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Settings,
  ShieldCheck,
  UserPlus,
  UserRoundCog,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { companyApi } from "@/api/tenant/companyApi";
import { dashboardApi } from "@/api/tenant/dashboardApi";
import { usersApi } from "@/api/tenant/usersApi";
import type { CompanyProfile } from "@/features/tenant/admin/company/types";
import { Card } from "@/components/ux/Card";
import { Skeleton } from "@/components/ux/Skeleton";
import { StatusPill } from "@/components/ux/StatusPill";
import { formatDate, formatNumber, useLocale, useT, type Locale, type TranslateFn } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import {
  formatPlanDisplayName,
  formatSubscriptionStatusLabel,
} from "@/features/tenant/admin/billing/utils/billingLabels";

function countText(loading: boolean, failed: boolean, value: number | undefined, locale: Locale) {
  if (loading) return null;
  if (failed || value == null) return "—";
  return formatNumber(value, undefined, locale);
}

function formatStorageCompact(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(0)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

function MetricCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string | null;
  icon: ComponentType<{ className?: string }>;
  loading: boolean;
}) {
  return (
    <Card className="flex min-w-0 items-center justify-between gap-3 p-3.5">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-[var(--color-text-secondary)]">{label}</p>
        {loading ? (
          <Skeleton className="mt-1.5 h-7 w-14" />
        ) : (
          <p className="mt-0.5 font-display text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {value}
          </p>
        )}
      </div>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary">
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
    </Card>
  );
}

function QuotaMiniBar({
  label,
  usedText,
  maxText,
  pct,
  unlimited,
}: {
  label: string;
  usedText: string;
  maxText: string;
  pct: number;
  unlimited: boolean;
}) {
  const barColor =
    !unlimited && pct >= 100
      ? "bg-red-500"
      : !unlimited && pct >= 85
        ? "bg-amber-500"
        : "bg-brand-primary";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--color-text-secondary)]">{label}</span>
        <span className="font-semibold text-[var(--color-text-primary)]">
          {usedText} / {maxText}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${unlimited ? 20 : Math.min(100, Math.max(pct, 4))}%` }}
        />
      </div>
    </div>
  );
}

function profileGaps(profile: CompanyProfile, t: TranslateFn): Array<{ title: string; to: string }> {
  const gaps: Array<{ title: string; to: string }> = [];
  if (!profile.verified) {
    gaps.push({ title: t("tenantAdmin.overview.gapsCard.unverifiedTitle"), to: "/internal/admin/company" });
  }
  if (!profile.description?.trim()) {
    gaps.push({ title: t("tenantAdmin.overview.gapsCard.noDescriptionTitle"), to: "/internal/admin/company" });
  }
  if (!profile.logoUrl?.trim()) {
    gaps.push({ title: t("tenantAdmin.overview.gapsCard.noLogoTitle"), to: "/internal/admin/company" });
  }
  if (!profile.website?.trim()) {
    gaps.push({ title: t("tenantAdmin.overview.gapsCard.noWebsiteTitle"), to: "/internal/admin/company" });
  }
  return gaps;
}

export function HomePage() {
  const t = useT();
  const locale = useLocale();

  const shortcuts = useMemo(
    () => [
      { to: "/recruiter", label: t("tenantAdmin.overview.shortcuts.recruitmentWorkspace"), icon: BriefcaseBusiness },
      { to: "/internal/admin/users", label: t("tenantAdmin.overview.shortcuts.users"), icon: Users },
      { to: "/internal/admin/roles", label: t("tenantAdmin.overview.shortcuts.roles"), icon: ShieldCheck },
      { to: "/internal/admin/recruiter-assignments", label: t("tenantAdmin.overview.shortcuts.assignments"), icon: UserRoundCog },
      { to: "/internal/admin/billing", label: t("tenantAdmin.overview.shortcuts.billing"), icon: CreditCard },
      { to: "/internal/admin/system", label: t("tenantAdmin.overview.shortcuts.system"), icon: Settings },
    ],
    [t],
  );

  const summary = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => dashboardApi.summary(),
  });
  const members = useQuery({
    queryKey: ["tenant-users"],
    queryFn: () => usersApi.list(),
  });
  const company = useQuery({
    queryKey: ["tenant", "company", "profile"],
    queryFn: () => companyApi.getProfile(),
  });
  const subscription = useQuery({
    queryKey: ["tenant-subscription-quota"],
    queryFn: () => companyApi.getSubscription(),
  });

  const summaryData = summary.data?.data;
  const memberCount = (members.data?.data ?? []).filter(
    (row) => row.role !== "CANDIDATE" && row.workspace !== "CANDIDATE",
  ).length;
  const profile = company.data?.data;
  const sub = subscription.data?.data;
  const pendingInvoiceCount = (sub?.invoices ?? []).filter((inv) => inv.status === "PENDING").length;
  const gaps = profile ? profileGaps(profile, t) : [];
  if (pendingInvoiceCount > 0) {
    gaps.unshift({
      title: t("tenantAdmin.overview.gapsCard.pendingInvoicesTitle", { count: pendingInvoiceCount }),
      to: "/internal/admin/billing",
    });
  }
  const summaryError = summary.isError ? getApiErrorMessage(summary.error) : null;
  const membersError = members.isError ? getApiErrorMessage(members.error) : null;

  return (
    <section className="flex flex-col gap-3.5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl">
          {t("tenantAdmin.overview.title")}
        </h1>
        <Link
          to="/internal/admin/analytics"
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-3.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-primary-hover sm:text-sm"
        >
          {t("tenantAdmin.overview.viewAnalytics")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t("tenantAdmin.overview.metrics.membersLabel")}
          loading={members.isLoading}
          value={countText(members.isLoading, members.isError, members.isSuccess ? memberCount : undefined, locale)}
          icon={Users}
        />
        <MetricCard
          label={t("tenantAdmin.overview.metrics.openJobsLabel")}
          loading={summary.isLoading}
          value={countText(summary.isLoading, summary.isError, summaryData?.openJobs, locale)}
          icon={BriefcaseBusiness}
        />
        <MetricCard
          label={t("tenantAdmin.overview.metrics.newApplicantsLabel")}
          loading={summary.isLoading}
          value={countText(summary.isLoading, summary.isError, summaryData?.newApplicants, locale)}
          icon={UserPlus}
        />
        <MetricCard
          label={t("tenantAdmin.overview.metrics.interviewsLabel")}
          loading={summary.isLoading}
          value={countText(summary.isLoading, summary.isError, summaryData?.interviewsScheduled, locale)}
          icon={CalendarClock}
        />
      </div>

      {(summaryError || membersError) && (
        <p className="text-xs text-status-danger">{summaryError ?? membersError}</p>
      )}

      <div className="grid items-stretch gap-3.5 lg:grid-cols-12">
        {/* Left Column: Company + Subscription & Quota */}
        <div className="flex flex-col gap-3.5 lg:col-span-7">
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border-default)] pb-2.5">
              <h2 className="font-display text-base font-semibold text-[var(--color-text-primary)]">
                {t("tenantAdmin.overview.companyCard.title")}
              </h2>
              <Link
                to="/internal/admin/company"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:underline"
              >
                {t("tenantAdmin.overview.companyCard.updateShort")}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="pt-3">
              {company.isLoading && <Skeleton className="h-14 w-full" />}
              {company.isError && (
                <p className="text-xs text-status-danger">{getApiErrorMessage(company.error)}</p>
              )}
              {profile && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg font-semibold text-[var(--color-text-primary)]">
                        {profile.companyName}
                      </p>
                      <p className="truncate text-xs text-[var(--color-text-secondary)]">
                        {profile.subdomain}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-semibold text-brand-primary">
                      <BadgeCheck className="size-3.5" aria-hidden="true" />
                      {profile.verified ? t("tenantAdmin.overview.companyCard.verified") : t("tenantAdmin.overview.companyCard.unverified")}
                    </span>
                  </div>
                  <dl className="grid grid-cols-3 gap-3 text-xs">
                    <div className="min-w-0">
                      <dt className="text-[var(--color-text-secondary)]">{t("tenantAdmin.overview.companyCard.industry")}</dt>
                      <dd className="mt-0.5 truncate font-medium text-[var(--color-text-primary)]">
                        {profile.industry?.trim() || "—"}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[var(--color-text-secondary)]">{t("tenantAdmin.overview.companyCard.companySize")}</dt>
                      <dd className="mt-0.5 truncate font-medium text-[var(--color-text-primary)]">
                        {profile.companySize?.trim() || "—"}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[var(--color-text-secondary)]">{t("tenantAdmin.overview.companyCard.website")}</dt>
                      <dd className="mt-0.5 truncate font-medium text-[var(--color-text-primary)]">
                        {profile.website?.trim() || "—"}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </Card>

          <Card className="flex flex-1 flex-col justify-between gap-3.5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary">
                  <Zap className="size-4.5" aria-hidden="true" />
                </span>
                {subscription.isLoading ? (
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-52" />
                  </div>
                ) : sub ? (
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-sm font-semibold text-[var(--color-text-primary)] sm:text-base">
                        {formatPlanDisplayName(sub.planName, t)}
                      </h2>
                      <StatusPill
                        status={sub.subscriptionStatus}
                        label={formatSubscriptionStatusLabel(sub.subscriptionStatus, t)}
                      />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[var(--color-text-secondary)]">
                      {sub.hasExplicitSubscription && sub.endsAt
                        ? t("tenantAdmin.overview.subscriptionCard.explicitShortSummary", {
                            days: sub.daysRemaining,
                            date: formatDate(sub.endsAt, undefined, locale),
                          })
                        : t("tenantAdmin.overview.subscriptionCard.defaultShortSummary", {
                            price: formatNumber(Number(sub.priceYearly || 0), undefined, locale),
                          })}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-text-secondary)]">{t("tenantAdmin.overview.subscriptionCard.fallbackTitle")}</p>
                )}
              </div>
              <Link
                to="/internal/admin/billing"
                className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border border-[var(--color-border-default)] bg-surface-card px-3 text-xs font-semibold text-brand-primary transition-colors hover:bg-[var(--color-primary-subtle)]"
              >
                {t("tenantAdmin.overview.subscriptionCard.manageShort")}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>

            {sub && (
              <div className="grid gap-3 border-t border-[var(--color-border-default)] pt-3 sm:grid-cols-3">
                <QuotaMiniBar
                  label={t("tenantAdmin.overview.subscriptionCard.quotaJobsLabel")}
                  usedText={formatNumber(sub.usedJobs, undefined, locale)}
                  maxText={sub.maxJobs < 0 ? "∞" : formatNumber(sub.maxJobs, undefined, locale)}
                  pct={sub.jobsUsagePercent}
                  unlimited={sub.maxJobs < 0}
                />
                <QuotaMiniBar
                  label={t("tenantAdmin.overview.subscriptionCard.quotaCvParseLabel")}
                  usedText={formatNumber(sub.usedCvParses, undefined, locale)}
                  maxText={sub.maxCvParses < 0 ? "∞" : formatNumber(sub.maxCvParses, undefined, locale)}
                  pct={sub.cvParsesUsagePercent}
                  unlimited={sub.maxCvParses < 0}
                />
                <QuotaMiniBar
                  label={t("tenantAdmin.overview.subscriptionCard.quotaStorageLabel")}
                  usedText={formatStorageCompact(sub.usedStorageBytes)}
                  maxText={sub.maxStorageGb < 0 ? "∞" : `${sub.maxStorageGb} GB`}
                  pct={sub.storageUsagePercent}
                  unlimited={sub.maxStorageGb < 0}
                />
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Actionable Gaps (compact) + Quick Shortcuts */}
        <div className="flex flex-col gap-3.5 lg:col-span-5">
          <Card className="p-4">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border-default)] pb-2.5">
              <h2 className="font-display text-base font-semibold text-[var(--color-text-primary)]">
                {t("tenantAdmin.overview.gapsCard.title")}
              </h2>
              {profile && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    gaps.length > 0
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {gaps.length > 0 ? t("tenantAdmin.overview.gapsCard.countBadge", { count: gaps.length }) : t("tenantAdmin.overview.gapsCard.doneBadge")}
                </span>
              )}
            </div>

            <div className="pt-2.5">
              {company.isLoading && <Skeleton className="h-16 w-full" />}
              {profile && gaps.length === 0 && (
                <div className="flex items-center gap-2 py-2 text-sm text-[var(--color-text-secondary)]">
                  <CheckCircle2 className="size-4.5 shrink-0 text-emerald-500" aria-hidden="true" />
                  <span>{t("tenantAdmin.overview.gapsCard.emptyProfileDone")}</span>
                </div>
              )}
              {profile && gaps.length > 0 && (
                <ul className="space-y-1.5">
                  {gaps.map((item) => (
                    <li key={item.title}>
                      <Link
                        to={item.to}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border-default)] px-3 py-2 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:border-brand-primary/30 hover:bg-[var(--color-primary-subtle)] sm:text-sm"
                      >
                        <span className="truncate">{item.title}</span>
                        <ArrowRight
                          className="size-3.5 shrink-0 text-[var(--color-text-secondary)]"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card className="flex flex-1 flex-col justify-between gap-2.5 p-4">
            <h2 className="font-display text-sm font-semibold text-[var(--color-text-primary)]">
              {t("tenantAdmin.overview.shortcuts.sectionTitle")}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {shortcuts.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-white px-2.5 py-2 transition-colors hover:border-brand-primary/30 hover:bg-[var(--color-primary-subtle)]"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-brand-primary">
                      <Icon className="size-3.5" aria-hidden="true" />
                    </span>
                    <span className="truncate text-xs font-semibold text-[var(--color-text-primary)]">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
