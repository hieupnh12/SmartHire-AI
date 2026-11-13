import { useMemo, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Globe,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UserRoundCog,
  Users,
  Users2,
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
import { cn } from "@/lib/utils";
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

function getCompanyInitials(name?: string): string {
  if (!name) return "SH";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function MetricCard({
  label,
  value,
  subLabel,
  icon: Icon,
  iconTheme,
  loading,
}: {
  label: string;
  value: string | null;
  subLabel?: string;
  icon: ComponentType<{ className?: string }>;
  iconTheme: { bg: string; text: string; ring: string };
  loading: boolean;
}) {
  return (
    <Card className="group relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white p-3.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-primary/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="truncate text-xs font-semibold text-[var(--color-text-secondary)]">{label}</span>
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-105",
            iconTheme.bg,
            iconTheme.text,
            iconTheme.ring,
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-2">
        {loading ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {value}
            </span>
            {subLabel && (
              <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                {subLabel}
              </span>
            )}
          </div>
        )}
      </div>
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
      ? "bg-gradient-to-r from-red-500 to-rose-600"
      : !unlimited && pct >= 85
        ? "bg-gradient-to-r from-amber-500 to-amber-600"
        : "bg-gradient-to-r from-brand-primary to-indigo-600";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium text-[var(--color-text-secondary)]">{label}</span>
        <span className="font-semibold text-[var(--color-text-primary)]">
          {usedText} <span className="font-normal text-slate-400">/</span> {maxText}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 p-0.5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${unlimited ? 20 : Math.min(100, Math.max(pct, 4))}%` }}
        />
      </div>
    </div>
  );
}

function profileGaps(profile: CompanyProfile, t: TranslateFn): Array<{ title: string; to: string; type: "alert" | "setup" }> {
  const gaps: Array<{ title: string; to: string; type: "alert" | "setup" }> = [];
  if (!profile.verified) {
    gaps.push({ title: t("tenantAdmin.overview.gapsCard.unverifiedTitle"), to: "/internal/admin/company", type: "alert" });
  }
  if (!profile.description?.trim()) {
    gaps.push({ title: t("tenantAdmin.overview.gapsCard.noDescriptionTitle"), to: "/internal/admin/company", type: "setup" });
  }
  if (!profile.logoUrl?.trim()) {
    gaps.push({ title: t("tenantAdmin.overview.gapsCard.noLogoTitle"), to: "/internal/admin/company", type: "setup" });
  }
  if (!profile.website?.trim()) {
    gaps.push({ title: t("tenantAdmin.overview.gapsCard.noWebsiteTitle"), to: "/internal/admin/company", type: "setup" });
  }
  return gaps;
}

export function HomePage() {
  const t = useT();
  const locale = useLocale();

  const shortcuts = useMemo(
    () => [
      {
        to: "/recruiter",
        label: t("tenantAdmin.overview.shortcuts.recruitmentWorkspace"),
        sub: "Đăng tin & tuyển dụng",
        icon: BriefcaseBusiness,
        color: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100" },
      },
      {
        to: "/internal/admin/users",
        label: t("tenantAdmin.overview.shortcuts.users"),
        sub: "Nhân viên & phân quyền",
        icon: Users,
        color: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
      },
      {
        to: "/internal/admin/roles",
        label: t("tenantAdmin.overview.shortcuts.roles"),
        sub: "Phân quyền chi tiết RBAC",
        icon: ShieldCheck,
        color: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
      },
      {
        to: "/internal/admin/recruiter-assignments",
        label: t("tenantAdmin.overview.shortcuts.assignments"),
        sub: "Phân công phụ trách job",
        icon: UserRoundCog,
        color: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100" },
      },
      {
        to: "/internal/admin/billing",
        label: t("tenantAdmin.overview.shortcuts.billing"),
        sub: "Gói dịch vụ & hóa đơn",
        icon: CreditCard,
        color: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
      },
      {
        to: "/internal/admin/system",
        label: t("tenantAdmin.overview.shortcuts.system"),
        sub: "Cấu hình Gmail & hạ tầng",
        icon: Settings,
        color: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" },
      },
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
      type: "alert",
    });
  }

  const summaryError = summary.isError ? getApiErrorMessage(summary.error) : null;
  const membersError = members.isError ? getApiErrorMessage(members.error) : null;

  return (
    <section className="flex h-full min-h-0 flex-col gap-2.5">
      {/* Header Bar */}
      <header className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-primary">
              <Sparkles className="size-2.5" />
              {profile?.subdomain ? `${profile.subdomain}.smarthire.top` : "Enterprise"}
            </span>
            {profile?.verified && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                <BadgeCheck className="size-2.5" />
                {t("tenantAdmin.overview.companyCard.verified")}
              </span>
            )}
          </div>
          <h1 className="font-display text-xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-2xl">
            {profile?.companyName || t("tenantAdmin.overview.title")}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/internal/admin/billing"
            className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border-default)] bg-white px-3 text-xs font-semibold text-[var(--color-text-primary)] shadow-xs transition-all hover:bg-[var(--color-surface-alt)] hover:border-slate-300"
          >
            <CreditCard className="size-3.5 text-slate-500" />
            <span>{t("tenantAdmin.overview.shortcuts.billing")}</span>
          </Link>
          <Link
            to="/internal/admin/analytics"
            className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-3 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-primary-hover hover:shadow-md active:scale-[0.98]"
          >
            <span>{t("tenantAdmin.overview.viewAnalytics")}</span>
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </header>

      {/* 4 Primary KPI Metric Cards */}
      <div className="grid shrink-0 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t("tenantAdmin.overview.metrics.membersLabel")}
          loading={members.isLoading}
          value={countText(members.isLoading, members.isError, members.isSuccess ? memberCount : undefined, locale)}
          subLabel="Tài khoản hoạt động"
          icon={Users}
          iconTheme={{ bg: "bg-blue-50", text: "text-blue-600", ring: "ring-1 ring-blue-100" }}
        />
        <MetricCard
          label={t("tenantAdmin.overview.metrics.openJobsLabel")}
          loading={summary.isLoading}
          value={countText(summary.isLoading, summary.isError, summaryData?.openJobs, locale)}
          subLabel="Đang mở tuyển"
          icon={BriefcaseBusiness}
          iconTheme={{ bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-1 ring-emerald-100" }}
        />
        <MetricCard
          label={t("tenantAdmin.overview.metrics.newApplicantsLabel")}
          loading={summary.isLoading}
          value={countText(summary.isLoading, summary.isError, summaryData?.newApplicants, locale)}
          subLabel="Chờ xem xét"
          icon={UserPlus}
          iconTheme={{ bg: "bg-amber-50", text: "text-amber-600", ring: "ring-1 ring-amber-100" }}
        />
        <MetricCard
          label={t("tenantAdmin.overview.metrics.interviewsLabel")}
          loading={summary.isLoading}
          value={countText(summary.isLoading, summary.isError, summaryData?.interviewsScheduled, locale)}
          subLabel="Đã xếp lịch"
          icon={CalendarClock}
          iconTheme={{ bg: "bg-purple-50", text: "text-purple-600", ring: "ring-1 ring-purple-100" }}
        />
      </div>

      {(summaryError || membersError) && (
        <p className="shrink-0 text-xs text-status-danger">{summaryError ?? membersError}</p>
      )}

      {/* ROW 1: Equalized Height — Company Profile (Col 7) + Action Center (Col 5) */}
      <div className="grid shrink-0 items-stretch gap-2.5 lg:grid-cols-12">
        {/* Company Identity Card */}
        <Card className="flex flex-col justify-between rounded-2xl border border-[var(--color-border-default)] bg-white p-3.5 shadow-xs transition-all hover:shadow-md lg:col-span-7">
          <div>
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border-default)] pb-2">
              <div className="flex items-center gap-1.5">
                <Building2 className="size-4 text-brand-primary" />
                <h2 className="font-display text-sm font-bold text-[var(--color-text-primary)]">
                  {t("tenantAdmin.overview.companyCard.title")}
                </h2>
              </div>
              <Link
                to="/internal/admin/company"
                className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold text-brand-primary hover:bg-[var(--color-primary-soft)] transition-colors"
              >
                {t("tenantAdmin.overview.companyCard.updateShort")}
                <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            </div>

            <div className="pt-2.5">
              {company.isLoading && <Skeleton className="h-16 w-full rounded-xl" />}
              {company.isError && (
                <p className="text-xs text-status-danger">{getApiErrorMessage(company.error)}</p>
              )}
              {profile && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    {profile.logoUrl?.trim() ? (
                      <img
                        src={profile.logoUrl}
                        alt={profile.companyName}
                        className="size-11 shrink-0 rounded-xl border border-slate-200 object-contain p-1 shadow-xs"
                      />
                    ) : (
                      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-primary to-indigo-700 text-sm font-bold text-white shadow-xs">
                        {getCompanyInitials(profile.companyName)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-bold text-[var(--color-text-primary)] truncate">
                          {profile.companyName}
                        </h3>
                        {profile.verified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                            <BadgeCheck className="size-3" />
                            {t("tenantAdmin.overview.companyCard.verified")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                            <ShieldAlert className="size-3" />
                            {t("tenantAdmin.overview.companyCard.unverified")}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--color-text-secondary)]">
                        <span className="font-medium text-slate-700">{profile.subdomain}</span>
                        <span>·</span>
                        <a
                          href={`https://${profile.subdomain}.smarthire.top`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline flex items-center gap-0.5 text-brand-primary"
                        >
                          https://{profile.subdomain}.smarthire.top
                          <ExternalLink className="size-2.5" />
                        </a>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50/80 p-2 text-xs border border-slate-100">
                    <div className="min-w-0">
                      <span className="text-[10px] font-medium text-[var(--color-text-secondary)] flex items-center gap-1">
                        <Building2 className="size-2.5 text-slate-400" />
                        {t("tenantAdmin.overview.companyCard.industry")}
                      </span>
                      <span className="mt-0.5 truncate font-semibold text-[var(--color-text-primary)] block text-xs">
                        {profile.industry?.trim() || "—"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-medium text-[var(--color-text-secondary)] flex items-center gap-1">
                        <Users2 className="size-2.5 text-slate-400" />
                        {t("tenantAdmin.overview.companyCard.companySize")}
                      </span>
                      <span className="mt-0.5 truncate font-semibold text-[var(--color-text-primary)] block text-xs">
                        {profile.companySize?.trim() || "—"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-medium text-[var(--color-text-secondary)] flex items-center gap-1">
                        <Globe className="size-2.5 text-slate-400" />
                        {t("tenantAdmin.overview.companyCard.website")}
                      </span>
                      <span className="mt-0.5 truncate font-semibold text-[var(--color-text-primary)] block text-xs">
                        {profile.website?.trim() || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Action Center ("Cần xử lý") */}
        <Card className="flex flex-col justify-between rounded-2xl border border-[var(--color-border-default)] bg-white p-3.5 shadow-xs transition-all hover:shadow-md lg:col-span-5">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border-default)] pb-2">
              <h2 className="font-display text-sm font-bold text-[var(--color-text-primary)]">
                {t("tenantAdmin.overview.gapsCard.title")}
              </h2>
              {profile && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold",
                    gaps.length > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800",
                  )}
                >
                  {gaps.length > 0
                    ? t("tenantAdmin.overview.gapsCard.countBadge", { count: gaps.length })
                    : t("tenantAdmin.overview.gapsCard.doneBadge")}
                </span>
              )}
            </div>

            <div className="pt-2">
              {company.isLoading && <Skeleton className="h-16 w-full rounded-xl" />}
              {profile && gaps.length === 0 && (
                <div className="flex flex-col items-center justify-center py-4 text-center text-xs text-[var(--color-text-secondary)]">
                  <div className="grid size-8 place-items-center rounded-full bg-emerald-50 text-emerald-600 mb-1">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <p className="font-semibold text-slate-800 text-xs">
                    {t("tenantAdmin.overview.gapsCard.emptyProfileDone")}
                  </p>
                  <p className="text-slate-500 mt-0.5 text-[10px]">Hồ sơ và hóa đơn đều đang ở trạng thái tốt nhất.</p>
                </div>
              )}
              {profile && gaps.length > 0 && (
                <ul className="max-h-[118px] overflow-y-auto pr-1 space-y-1.5 [scrollbar-width:thin]">
                  {gaps.map((item) => (
                    <li key={item.title}>
                      <Link
                        to={item.to}
                        className={cn(
                          "group flex items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-all hover:-translate-y-0.5 hover:shadow-xs",
                          item.type === "alert"
                            ? "border-amber-200 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-300 text-amber-900"
                            : "border-[var(--color-border-default)] bg-white hover:border-brand-primary/30 hover:bg-[var(--color-primary-soft)] text-slate-800",
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {item.type === "alert" ? (
                            <ShieldAlert className="size-3.5 shrink-0 text-amber-600" />
                          ) : (
                            <Sparkles className="size-3.5 shrink-0 text-slate-400 group-hover:text-brand-primary" />
                          )}
                          <span className="truncate font-semibold text-[11px]">{item.title}</span>
                        </div>
                        <ArrowRight
                          className="size-3 shrink-0 text-slate-400 group-hover:text-brand-primary transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* ROW 2: Equalized Height — Quick Shortcuts (Col 7, 3x2 grid) + Subscription & Quotas (Col 5) */}
      <div className="grid flex-1 min-h-0 items-stretch gap-2.5 lg:grid-cols-12 overflow-hidden">
        {/* Quick Shortcuts Grid (Col 7: 3 columns x 2 rows) */}
        <Card className="flex flex-col justify-between rounded-2xl border border-[var(--color-border-default)] bg-white p-3.5 shadow-xs transition-all hover:shadow-md lg:col-span-7 overflow-hidden">
          <div className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--color-border-default)] pb-2 mb-2">
                <h2 className="font-display text-sm font-bold text-[var(--color-text-primary)]">
                  {t("tenantAdmin.overview.shortcuts.sectionTitle")}
                </h2>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {shortcuts.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="group flex flex-col justify-between rounded-xl border border-[var(--color-border-default)] bg-white p-2 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-primary/40 hover:bg-slate-50/80 hover:shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          className={cn(
                            "grid size-7 shrink-0 place-items-center rounded-lg border transition-transform duration-200 group-hover:scale-105",
                            item.color.bg,
                            item.color.text,
                            item.color.border,
                          )}
                        >
                          <Icon className="size-3.5" aria-hidden="true" />
                        </span>
                        <ArrowRight className="size-2.5 text-slate-300 group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <div className="mt-1.5 min-w-0">
                        <p className="truncate text-[11px] font-bold text-[var(--color-text-primary)] group-hover:text-brand-primary transition-colors">
                          {item.label}
                        </p>
                        <p className="truncate text-[10px] text-[var(--color-text-secondary)]">
                          {item.sub}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Subscription & Resource Quota Card (Col 5) */}
        <Card className="flex flex-col justify-between rounded-2xl border border-[var(--color-border-default)] bg-white p-3.5 shadow-xs transition-all hover:shadow-md lg:col-span-5 overflow-hidden">
          <div className="flex flex-col justify-between h-full">
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2 border-b border-[var(--color-border-default)] pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xs">
                    <Zap className="size-4" aria-hidden="true" />
                  </span>
                  {subscription.isLoading ? (
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  ) : sub ? (
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h2 className="font-display text-sm font-bold text-[var(--color-text-primary)] truncate">
                          {formatPlanDisplayName(sub.planName, t)}
                        </h2>
                        <StatusPill
                          status={sub.subscriptionStatus}
                          label={formatSubscriptionStatusLabel(sub.subscriptionStatus, t)}
                        />
                      </div>
                      <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)] truncate">
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
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {t("tenantAdmin.overview.subscriptionCard.fallbackTitle")}
                    </p>
                  )}
                </div>

                <Link
                  to="/internal/admin/billing"
                  className="inline-flex min-h-7 shrink-0 items-center gap-1 rounded-lg border border-[var(--color-border-default)] bg-white px-2 text-[11px] font-semibold text-brand-primary shadow-xs transition-colors hover:bg-[var(--color-primary-soft)] hover:border-brand-primary/30"
                >
                  {t("tenantAdmin.overview.subscriptionCard.manageShort")}
                  <ArrowRight className="size-3" aria-hidden="true" />
                </Link>
              </div>

              {/* Pending Invoice Warning Banner */}
              {pendingInvoiceCount > 0 && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/90 px-2.5 py-1 text-xs text-amber-900">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CreditCard className="size-3 shrink-0 text-amber-600" />
                    <span className="font-medium text-[10px] truncate">
                      {t("tenantAdmin.overview.subscriptionCard.pendingInvoicesBadge", {
                        count: pendingInvoiceCount,
                      })}
                    </span>
                  </div>
                  <Link
                    to="/internal/admin/billing"
                    className="shrink-0 rounded-md bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs hover:bg-amber-700 transition-colors"
                  >
                    Thanh toán
                  </Link>
                </div>
              )}
            </div>

            {/* 3 Quota Bars with Rich Visuals */}
            {sub && (
              <div className="mt-2 space-y-1.5 rounded-xl bg-slate-50/80 p-2 border border-slate-100">
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
          </div>
        </Card>
      </div>
    </section>
  );
}
