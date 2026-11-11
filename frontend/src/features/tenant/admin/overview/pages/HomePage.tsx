import { useMemo, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, CalendarClock, CreditCard, Settings, ShieldCheck, UserPlus, UserRoundCog, Users, Zap } from "lucide-react";
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

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string | null;
  helper: string;
  icon: ComponentType<{ className?: string }>;
  loading: boolean;
}) {
  return (
    <Card className="min-w-0 p-4 lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</p>
          {loading ? (
            <Skeleton className="mt-3 h-8 w-16" />
          ) : (
            <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">{value}</p>
          )}
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-xs text-[var(--color-text-secondary)]">{helper}</p>
    </Card>
  );
}

function profileGaps(profile: CompanyProfile, t: TranslateFn) {
  const gaps: Array<{ title: string; detail: string }> = [];
  if (!profile.verified) {
    gaps.push({
      title: t("tenantAdmin.overview.gapsCard.unverifiedTitle"),
      detail: t("tenantAdmin.overview.gapsCard.unverifiedDetail"),
    });
  }
  if (!profile.description?.trim()) {
    gaps.push({
      title: t("tenantAdmin.overview.gapsCard.noDescriptionTitle"),
      detail: t("tenantAdmin.overview.gapsCard.noDescriptionDetail"),
    });
  }
  if (!profile.logoUrl?.trim()) {
    gaps.push({
      title: t("tenantAdmin.overview.gapsCard.noLogoTitle"),
      detail: t("tenantAdmin.overview.gapsCard.noLogoDetail"),
    });
  }
  if (!profile.website?.trim()) {
    gaps.push({
      title: t("tenantAdmin.overview.gapsCard.noWebsiteTitle"),
      detail: t("tenantAdmin.overview.gapsCard.noWebsiteDetail"),
    });
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
  const summaryError = summary.isError ? getApiErrorMessage(summary.error) : null;
  const membersError = members.isError ? getApiErrorMessage(members.error) : null;

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-primary">{t("tenantAdmin.overview.eyebrow")}</p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
            {t("tenantAdmin.overview.title")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-secondary)]">
            {t("tenantAdmin.overview.subtitle")}
          </p>
        </div>
        <Link
          to="/internal/admin/analytics"
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-[var(--radius-md)] bg-brand-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-primary-hover"
        >
          {t("tenantAdmin.overview.viewAnalytics")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t("tenantAdmin.overview.metrics.membersLabel")}
          loading={members.isLoading}
          value={countText(members.isLoading, members.isError, members.isSuccess ? memberCount : undefined, locale)}
          helper={t("tenantAdmin.overview.metrics.membersHelper")}
          icon={Users}
        />
        <MetricCard
          label={t("tenantAdmin.overview.metrics.openJobsLabel")}
          loading={summary.isLoading}
          value={countText(summary.isLoading, summary.isError, summaryData?.openJobs, locale)}
          helper={t("tenantAdmin.overview.metrics.openJobsHelper")}
          icon={BriefcaseBusiness}
        />
        <MetricCard
          label={t("tenantAdmin.overview.metrics.newApplicantsLabel")}
          loading={summary.isLoading}
          value={countText(summary.isLoading, summary.isError, summaryData?.newApplicants, locale)}
          helper={t("tenantAdmin.overview.metrics.newApplicantsHelper")}
          icon={UserPlus}
        />
        <MetricCard
          label={t("tenantAdmin.overview.metrics.interviewsLabel")}
          loading={summary.isLoading}
          value={countText(summary.isLoading, summary.isError, summaryData?.interviewsScheduled, locale)}
          helper={t("tenantAdmin.overview.metrics.interviewsHelper")}
          icon={CalendarClock}
        />
      </div>
      {(summaryError || membersError) && (
        <p className="text-sm text-status-danger">{summaryError ?? membersError}</p>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-0">
          <div className="border-b border-[var(--color-border-default)] px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">{t("tenantAdmin.overview.companyCard.title")}</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t("tenantAdmin.overview.companyCard.subtitle")}</p>
          </div>
          <div className="space-y-4 p-5">
            {company.isLoading && <Skeleton className="h-16 w-full" />}
            {company.isError && <p className="text-sm text-status-danger">{getApiErrorMessage(company.error)}</p>}
            {profile && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl font-semibold text-[var(--color-text-primary)]">{profile.companyName}</p>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{profile.subdomain}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-semibold text-brand-primary">
                    <BadgeCheck className="size-3.5" aria-hidden="true" />
                    {profile.verified ? t("tenantAdmin.overview.companyCard.verified") : t("tenantAdmin.overview.companyCard.unverified")}
                  </span>
                </div>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-[var(--color-text-secondary)]">{t("tenantAdmin.overview.companyCard.industry")}</dt>
                    <dd className="mt-1 font-medium text-[var(--color-text-primary)]">{profile.industry?.trim() || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-text-secondary)]">{t("tenantAdmin.overview.companyCard.companySize")}</dt>
                    <dd className="mt-1 font-medium text-[var(--color-text-primary)]">{profile.companySize?.trim() || "—"}</dd>
                  </div>
                </dl>
                <Link to="/internal/admin/company" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-primary">
                  {t("tenantAdmin.overview.companyCard.updateProfile")}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </>
            )}
          </div>
        </Card>

        <Card className="p-0">
          <div className="border-b border-[var(--color-border-default)] px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">{t("tenantAdmin.overview.gapsCard.title")}</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{t("tenantAdmin.overview.gapsCard.subtitle")}</p>
          </div>
          <div className="p-5">
            {company.isLoading && <Skeleton className="h-16 w-full" />}
            {profile && gaps.length === 0 && (
              <p className="text-sm text-[var(--color-text-secondary)]">{t("tenantAdmin.overview.gapsCard.empty")}</p>
            )}
            {profile && gaps.length > 0 && (
              <ul className="space-y-2">
                {gaps.map((item) => (
                  <li key={item.title}>
                    <Link
                      to="/internal/admin/company"
                      className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-3 py-3 transition-colors hover:bg-[var(--color-primary-subtle)]"
                    >
                      <span>
                        <span className="block text-sm font-semibold text-[var(--color-text-primary)]">{item.title}</span>
                        <span className="mt-0.5 block text-xs text-[var(--color-text-secondary)]">{item.detail}</span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-[var(--color-text-secondary)]" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* Subscription & Billing Snapshot Card */}
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary">
            <Zap className="size-5" aria-hidden="true" />
          </span>
          {subscription.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
          ) : sub ? (
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-base font-semibold text-[var(--color-text-primary)]">
                  {t("tenantAdmin.overview.subscriptionCard.planTitle", {
                    plan: formatPlanDisplayName(sub.planName, t),
                  })}
                </h2>
                <StatusPill
                  status={sub.subscriptionStatus}
                  label={formatSubscriptionStatusLabel(sub.subscriptionStatus, t)}
                />
                {pendingInvoiceCount > 0 && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    {t("tenantAdmin.overview.subscriptionCard.pendingInvoicesBadge", {
                      count: pendingInvoiceCount,
                    })}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
                {sub.hasExplicitSubscription && sub.endsAt
                  ? t("tenantAdmin.overview.subscriptionCard.explicitSummary", {
                      days: sub.daysRemaining,
                      date: formatDate(sub.endsAt, undefined, locale),
                      price: formatNumber(Number(sub.priceYearly || 0), undefined, locale),
                    })
                  : t("tenantAdmin.overview.subscriptionCard.defaultSummary", {
                      price: formatNumber(Number(sub.priceYearly || 0), undefined, locale),
                    })}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-secondary)]">
              {t("tenantAdmin.overview.subscriptionCard.fallbackText")}
            </p>
          )}
        </div>
        <Link
          to="/internal/admin/billing"
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-surface-card px-4 text-sm font-semibold text-brand-primary transition-colors hover:bg-[var(--color-primary-subtle)]"
        >
          <span>{t("tenantAdmin.overview.subscriptionCard.manageButton")}</span>
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} className="block">
              <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-[var(--color-primary-subtle)]">
                <span className="grid size-10 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">{item.label}</span>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
