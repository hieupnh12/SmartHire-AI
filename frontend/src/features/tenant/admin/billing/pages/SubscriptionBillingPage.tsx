import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  CreditCard,
  HelpCircle,
  Layers,
  Receipt,
  RefreshCw,
  Sparkles,
  XCircle,
  Zap,
} from "lucide-react";
import { checkoutApi, type PublicSubscriptionPlan } from "@/api/master/checkoutApi";
import { companyApi, type TenantInvoiceItem } from "@/api/tenant/companyApi";
import { Button } from "@/components/ux/Button";
import { Card } from "@/components/ux/Card";
import { Skeleton } from "@/components/ux/Skeleton";
import { StatusPill } from "@/components/ux/StatusPill";
import { Tooltip } from "@/components/ux/Tooltip";
import { InvoicePaymentModal } from "@/features/tenant/admin/billing/components/InvoicePaymentModal";
import {
  formatInvoiceStatusLabel,
  formatInvoiceTypeLabel,
  formatPaymentGatewayLabel,
  formatPlanDisplayName,
  formatSubscriptionStatusLabel,
  translatePlanFeatureLabel,
} from "@/features/tenant/admin/billing/utils/billingLabels";
import { formatDate, formatNumber, useLocale, useT, type Locale, type TranslateFn } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";

function formatDateSafe(value: string | null | undefined, locale: Locale) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return formatDate(d, undefined, locale);
}

function formatQuotaBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatSecondsToHoursLabel(seconds: number, t: TranslateFn): string {
  const hours = seconds / 3600;
  if (hours > 0 && hours < 0.1) {
    return t("tenantAdmin.billing.page.minutesShort", { minutes: Math.ceil(seconds / 60) });
  }
  return t("tenantAdmin.billing.page.hoursShort", { hours: hours.toFixed(1) });
}

function formatLimitLabel(
  value: number | undefined,
  unit: string,
  t: TranslateFn,
  locale: Locale,
): string {
  if (value == null) return "—";
  if (value < 0) return t("tenantAdmin.billing.page.unlimited");
  if (value === 0) return t("tenantAdmin.billing.page.unsupportedLimit", { unit });
  return t("tenantAdmin.billing.page.limitValue", {
    value: formatNumber(value, undefined, locale),
    unit,
  });
}

function parseFeaturesJson(raw?: string): string[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "string") {
      return parseFeaturesJson(parsed);
    }
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((s) => s.trim());
    }
    if (parsed && typeof parsed === "object") {
      const features = (parsed as { features?: unknown }).features;
      if (Array.isArray(features)) {
        return features
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .map((s) => s.trim());
      }
      return [];
    }
  } catch {
    // Fallback for plain text list
  }
  return raw
    .split(/\r?\n|;/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function SectionHelpTip({ content, label }: { content: string; label: string }) {
  return (
    <Tooltip content={content} side="top">
      <button
        type="button"
        aria-label={label}
        className="inline-flex size-5 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition-colors hover:bg-slate-200/80 hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] cursor-help"
      >
        <HelpCircle className="size-4" aria-hidden="true" />
      </button>
    </Tooltip>
  );
}

export function SubscriptionBillingPage() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const askConfirm = useUiStore((s) => s.askConfirm);

  const [renewYears, setRenewYears] = useState<number>(1);
  const [renewing, setRenewing] = useState(false);
  const [togglingAutoRenew, setTogglingAutoRenew] = useState(false);

  const [selectedPlanCode, setSelectedPlanCode] = useState<string>("");
  const [changeNotes, setChangeNotes] = useState("");
  const [changingPlan, setChangingPlan] = useState(false);
  const [cancelingDowngrade, setCancelingDowngrade] = useState(false);
  const [cancelingInvoiceId, setCancelingInvoiceId] = useState<number | null>(null);

  const [payingInvoice, setPayingInvoice] = useState<{
    id: number;
    type?: string | null;
  } | null>(null);
  const [searchParams] = useSearchParams();
  const highlightedInvoice = searchParams.get("invoice")?.trim() ?? "";
  const highlightedRowRef = useRef<HTMLTableRowElement | null>(null);

  const subQuery = useQuery({
    queryKey: ["tenant-subscription-quota"],
    queryFn: companyApi.getSubscription,
  });

  const plansQuery = useQuery({
    queryKey: ["public-checkout-plans"],
    queryFn: checkoutApi.getPublicPlans,
  });

  const sub = subQuery.data?.data;
  const publicPlans = plansQuery.data ?? [];

  useEffect(() => {
    if (highlightedInvoice && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightedInvoice, sub?.invoices]);

  const previewQuery = useQuery({
    queryKey: ["tenant-subscription-change-preview", selectedPlanCode],
    queryFn: () => companyApi.previewSubscriptionChange(selectedPlanCode),
    enabled: Boolean(selectedPlanCode && selectedPlanCode !== sub?.planCode),
  });

  const preview = previewQuery.data?.data;

  const pendingInvoices = useMemo(
    () => (sub?.invoices ?? []).filter((inv) => inv.status === "PENDING"),
    [sub?.invoices],
  );

  const projectedRenewEndDate = useMemo(() => {
    const now = new Date();
    const currentEnd =
      sub?.hasExplicitSubscription && sub.endsAt ? new Date(sub.endsAt) : null;
    const base =
      currentEnd && !Number.isNaN(currentEnd.getTime()) && currentEnd.getTime() > now.getTime()
        ? new Date(currentEnd.getTime())
        : now;
    const next = new Date(base.getTime());
    next.setFullYear(next.getFullYear() + renewYears);
    return formatDate(next, undefined, locale);
  }, [renewYears, sub?.endsAt, sub?.hasExplicitSubscription, locale]);

  const openNewestPendingInvoice = (invoices: TenantInvoiceItem[], preferredType?: string) => {
    const pending = invoices.filter((inv) => inv.status === "PENDING");
    if (pending.length === 0) return false;
    const target =
      (preferredType
        ? pending.find((inv) => (inv.invoiceType || "").toUpperCase() === preferredType)
        : undefined) ?? pending[0];
    setPayingInvoice({ id: target.id, type: target.invoiceType });
    return true;
  };

  const handleRenewSubmit = async () => {
    setRenewing(true);
    try {
      const res = await companyApi.renewSubscription(renewYears);
      queryClient.setQueryData(["tenant-subscription-quota"], res);
      await queryClient.invalidateQueries({ queryKey: ["tenant-subscription-quota"] });
      const opened = openNewestPendingInvoice(res.data?.invoices ?? [], "RENEWAL");
      toast.success(
        t("tenantAdmin.billing.page.toasts.renewSuccessTitle"),
        opened
          ? t("tenantAdmin.billing.page.toasts.renewSuccessOpened", { years: renewYears })
          : t("tenantAdmin.billing.page.toasts.renewSuccessRecorded", { years: renewYears }),
      );
    } catch (err) {
      toast.error(t("tenantAdmin.billing.page.toasts.renewErrorTitle"), getApiErrorMessage(err));
    } finally {
      setRenewing(false);
    }
  };

  const handleToggleAutoRenew = async () => {
    if (!sub) return;
    if (!sub.hasExplicitSubscription) {
      toast.info(
        t("tenantAdmin.billing.page.toasts.noPaidSubTitle"),
        t("tenantAdmin.billing.page.toasts.noPaidSubDesc"),
      );
      return;
    }
    const nextValue = !sub.autoRenew;
    setTogglingAutoRenew(true);
    try {
      const res = await companyApi.updateAutoRenew(nextValue);
      queryClient.setQueryData(["tenant-subscription-quota"], res);
      toast.success(
        nextValue
          ? t("tenantAdmin.billing.page.toasts.autoRenewEnabledTitle")
          : t("tenantAdmin.billing.page.toasts.autoRenewDisabledTitle"),
        nextValue
          ? t("tenantAdmin.billing.page.toasts.autoRenewEnabledDesc")
          : t("tenantAdmin.billing.page.toasts.autoRenewDisabledDesc"),
      );
    } catch (err) {
      toast.error(t("tenantAdmin.billing.page.toasts.autoRenewErrorTitle"), getApiErrorMessage(err));
    } finally {
      setTogglingAutoRenew(false);
    }
  };

  const handleConfirmPlanChange = async () => {
    if (!selectedPlanCode || !preview) return;
    setChangingPlan(true);
    try {
      const res = await companyApi.changeSubscriptionPlan(
        selectedPlanCode,
        changeNotes.trim() || undefined,
      );
      queryClient.setQueryData(["tenant-subscription-quota"], res);
      await queryClient.invalidateQueries({ queryKey: ["tenant-subscription-quota"] });

      setSelectedPlanCode("");
      setChangeNotes("");

      if (preview.changeType === "UPGRADE" && preview.netAmountDue > 0) {
        openNewestPendingInvoice(res.data?.invoices ?? [], "UPGRADE");
        toast.info(
          t("tenantAdmin.billing.page.toasts.upgradeInvoiceTitle"),
          t("tenantAdmin.billing.page.toasts.upgradeInvoiceDesc", {
            amount: formatNumber(preview.netAmountDue, undefined, locale),
            plan: formatPlanDisplayName(preview.targetPlanName, t),
          }),
        );
      } else if (preview.changeType === "UPGRADE") {
        toast.success(
          t("tenantAdmin.billing.page.toasts.upgradeImmediateTitle"),
          t("tenantAdmin.billing.page.toasts.upgradeImmediateDesc", {
            plan: formatPlanDisplayName(preview.targetPlanName, t),
          }),
        );
      } else {
        toast.success(
          t("tenantAdmin.billing.page.toasts.downgradeScheduledTitle"),
          t("tenantAdmin.billing.page.toasts.downgradeScheduledDesc", {
            date: formatDateSafe(preview.effectiveDate, locale),
          }),
        );
      }
    } catch (err) {
      toast.error(t("tenantAdmin.billing.page.toasts.changePlanErrorTitle"), getApiErrorMessage(err));
    } finally {
      setChangingPlan(false);
    }
  };

  const handleCancelDowngrade = async () => {
    setCancelingDowngrade(true);
    try {
      const res = await companyApi.cancelScheduledDowngrade();
      queryClient.setQueryData(["tenant-subscription-quota"], res);
      toast.success(t("tenantAdmin.billing.page.toasts.cancelDowngradeSuccess"));
    } catch (err) {
      toast.error(t("tenantAdmin.billing.page.toasts.cancelDowngradeError"), getApiErrorMessage(err));
    } finally {
      setCancelingDowngrade(false);
    }
  };

  const handleCancelPendingInvoice = (invoice: TenantInvoiceItem) => {
    askConfirm({
      title: t("tenantAdmin.billing.page.cancelInvoiceConfirm.title", {
        invoiceNumber: invoice.invoiceNumber,
      }),
      description: t("tenantAdmin.billing.page.cancelInvoiceConfirm.description"),
      confirmLabel: t("tenantAdmin.billing.page.cancelInvoiceConfirm.confirmLabel"),
      danger: true,
      onConfirm: async () => {
        setCancelingInvoiceId(invoice.id);
        try {
          const res = await companyApi.cancelPendingInvoice(invoice.id);
          queryClient.setQueryData(["tenant-subscription-quota"], res);
          toast.success(
            t("tenantAdmin.billing.page.toasts.cancelInvoiceSuccess", {
              invoiceNumber: invoice.invoiceNumber,
            }),
          );
        } catch (err) {
          toast.error(
            t("tenantAdmin.billing.page.toasts.cancelInvoiceError"),
            getApiErrorMessage(err),
          );
        } finally {
          setCancelingInvoiceId(null);
        }
      },
    });
  };

  const quotaRows = sub
    ? [
        {
          id: "jobs",
          label: t("tenantAdmin.billing.page.quotaLabels.jobs"),
          usedLabel: formatNumber(sub.usedJobs, undefined, locale),
          maxLabel: formatLimitLabel(sub.maxJobs, t("tenantAdmin.billing.page.units.jobs"), t, locale),
          pct: sub.jobsUsagePercent,
          enabled: sub.jobsEnabled,
          allowed: sub.jobsAllowed,
          unlimited: sub.maxJobs < 0,
        },
        {
          id: "cv",
          label: t("tenantAdmin.billing.page.quotaLabels.cv"),
          usedLabel: formatNumber(sub.usedCvParses, undefined, locale),
          maxLabel: formatLimitLabel(
            sub.maxCvParses,
            t("tenantAdmin.billing.page.units.cvPerMonth"),
            t,
            locale,
          ),
          pct: sub.cvParsesUsagePercent,
          enabled: sub.cvParseEnabled,
          allowed: sub.cvParseAllowed,
          unlimited: sub.maxCvParses < 0,
        },
        {
          id: "ai_voice",
          label: t("tenantAdmin.billing.page.quotaLabels.aiVoice"),
          usedLabel: formatSecondsToHoursLabel(sub.usedAiInterviewSeconds, t),
          maxLabel: formatLimitLabel(
            sub.maxAiInterviewHours,
            t("tenantAdmin.billing.page.units.hoursPerMonth"),
            t,
            locale,
          ),
          pct: sub.aiInterviewUsagePercent,
          enabled: sub.aiInterviewEnabled,
          allowed: sub.aiInterviewAllowed,
          unlimited: sub.maxAiInterviewHours < 0,
        },
        {
          id: "proctoring",
          label: t("tenantAdmin.billing.page.quotaLabels.proctoring"),
          usedLabel: formatSecondsToHoursLabel(sub.usedProctoringSeconds, t),
          maxLabel: formatLimitLabel(
            sub.maxProctoringHours,
            t("tenantAdmin.billing.page.units.hoursPerMonth"),
            t,
            locale,
          ),
          pct: sub.proctoringUsagePercent,
          enabled: sub.proctoringEnabled,
          allowed: sub.proctoringAllowed,
          unlimited: sub.maxProctoringHours < 0,
        },
        {
          id: "storage",
          label: t("tenantAdmin.billing.page.quotaLabels.storage"),
          usedLabel: formatQuotaBytes(sub.usedStorageBytes),
          maxLabel: formatLimitLabel(sub.maxStorageGb, t("tenantAdmin.billing.page.units.gb"), t, locale),
          pct: sub.storageUsagePercent,
          enabled: sub.storageEnabled,
          allowed: sub.storageAllowed,
          unlimited: sub.maxStorageGb < 0,
        },
      ]
    : [];

  if (subQuery.isLoading) {
    return (
      <section className="space-y-6">
        <Skeleton className="h-10 w-72 rounded-xl" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </section>
    );
  }

  if (subQuery.isError || !sub) {
    return (
      <Card className="p-8 text-center space-y-3 border-slate-300 dark:border-slate-700">
        <AlertTriangle className="mx-auto size-10 text-red-600" />
        <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
          {t("tenantAdmin.billing.page.loadErrorTitle")}
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {subQuery.isError ? getApiErrorMessage(subQuery.error) : t("tenantAdmin.billing.page.noSubscriptionData")}
        </p>
        <Button size="sm" onClick={() => void subQuery.refetch()}>
          {t("tenantAdmin.billing.page.retry")}
        </Button>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      {/* Page Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
            {t("tenantAdmin.billing.page.title")}
          </h1>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            void subQuery.refetch();
            void plansQuery.refetch();
          }}
        >
          <RefreshCw
            className={cn("size-4", (subQuery.isFetching || plansQuery.isFetching) && "animate-spin")}
          />
          <span>{t("tenantAdmin.billing.page.refresh")}</span>
        </Button>
      </header>

      {/* Lifecycle & Pending Payment Banners */}
      {pendingInvoices.length > 0 && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Receipt className="mt-0.5 size-5 shrink-0 text-amber-700" />
            <div className="space-y-0.5 text-xs sm:text-sm text-amber-950">
              <p className="font-semibold">
                {t("tenantAdmin.billing.page.pendingBanner.title", {
                  count: pendingInvoices.length,
                  invoiceNumber: pendingInvoices[0].invoiceNumber,
                  amount: formatNumber(Number(pendingInvoices[0].amount || 0), undefined, locale),
                })}
              </p>
              <p className="text-amber-800">
                {pendingInvoices[0].invoiceType === "UPGRADE"
                  ? t("tenantAdmin.billing.page.pendingBanner.upgradeHint")
                  : t("tenantAdmin.billing.page.pendingBanner.defaultHint")}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              onClick={() =>
                setPayingInvoice({
                  id: pendingInvoices[0].id,
                  type: pendingInvoices[0].invoiceType,
                })
              }
            >
              {t("tenantAdmin.billing.page.pendingBanner.payNow")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={cancelingInvoiceId === pendingInvoices[0].id}
              onClick={() => handleCancelPendingInvoice(pendingInvoices[0])}
            >
              {t("tenantAdmin.billing.page.pendingBanner.cancel")}
            </Button>
          </div>
        </div>
      )}

      {sub.hasExplicitSubscription &&
        (sub.subscriptionStatus === "ACTIVE" || sub.subscriptionStatus === "TRIAL") &&
        sub.daysRemaining <= 7 && (
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border p-4 text-xs sm:text-sm",
              sub.daysRemaining <= 3
                ? "border-red-300 bg-red-50 text-red-950"
                : "border-amber-300 bg-amber-50 text-amber-950",
            )}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className={cn(
                  "mt-0.5 size-5 shrink-0",
                  sub.daysRemaining <= 3 ? "text-red-600" : "text-amber-700",
                )}
              />
              <div>
                <strong>
                  {sub.daysRemaining <= 0
                    ? t("tenantAdmin.billing.page.expiringBanner.todayTitle")
                    : t("tenantAdmin.billing.page.expiringBanner.soonTitle", {
                        days: sub.daysRemaining,
                      })}
                </strong>{" "}
                {t("tenantAdmin.billing.page.expiringBanner.cycleEndsPrefix")}
                <strong>{formatDateSafe(sub.endsAt, locale)}</strong>
                {t("tenantAdmin.billing.page.expiringBanner.cycleEndsSuffix")}
                {sub.nextPlanName
                  ? t("tenantAdmin.billing.page.expiringBanner.scheduledNextPlan", {
                      plan: formatPlanDisplayName(sub.nextPlanName, t),
                    })
                  : t("tenantAdmin.billing.page.expiringBanner.earlyRenewHint")}
              </div>
            </div>
            <Button
              size="sm"
              variant={sub.daysRemaining <= 3 ? "danger" : "primary"}
              onClick={() =>
                document
                  .getElementById("renewal-card")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
            >
              {t("tenantAdmin.billing.page.expiringBanner.renewNow")}
            </Button>
          </div>
        )}

      {sub.subscriptionStatus === "PAST_DUE" && (
        <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-amber-300 bg-amber-50 p-4 text-xs sm:text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />
          <div>
            <strong>{t("tenantAdmin.billing.page.pastDueTitle")}</strong>{" "}
            {t("tenantAdmin.billing.page.pastDueBody", {
              until: sub.gracePeriodEndsAt
                ? t("tenantAdmin.billing.page.pastDueUntil", {
                    date: formatDateSafe(sub.gracePeriodEndsAt, locale),
                  })
                : "",
            })}
          </div>
        </div>
      )}

      {sub.subscriptionStatus === "SUSPENDED" && (
        <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-red-300 bg-red-50 p-4 text-xs sm:text-sm text-red-950">
          <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div>
            <strong>{t("tenantAdmin.billing.page.suspendedTitle")}</strong>{" "}
            {t("tenantAdmin.billing.page.suspendedBody")}
          </div>
        </div>
      )}

      {sub.subscriptionStatus === "EXPIRED" && (
        <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-red-300 bg-red-50 p-4 text-xs sm:text-sm text-red-950">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div>
            <strong>{t("tenantAdmin.billing.page.expiredTitle")}</strong>{" "}
            {t("tenantAdmin.billing.page.expiredBody")}
          </div>
        </div>
      )}

      {sub.nextPlanName && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-blue-300 bg-blue-50 p-4 text-xs sm:text-sm text-blue-950">
          <span>
            <strong>{t("tenantAdmin.billing.page.downgradeTitle")}</strong>{" "}
            {t("tenantAdmin.billing.page.downgradePrefix")}
            <strong>{formatPlanDisplayName(sub.nextPlanName, t)}</strong>
            {t("tenantAdmin.billing.page.downgradeSuffix", {
              date: formatDateSafe(sub.endsAt, locale),
            })}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={cancelingDowngrade}
            onClick={() => void handleCancelDowngrade()}
          >
            {cancelingDowngrade
              ? t("tenantAdmin.billing.page.cancelingDowngrade")
              : t("tenantAdmin.billing.page.cancelDowngrade")}
          </Button>
        </div>
      )}

      {/* Top Grid: Current Subscription Snapshot + Renewal & Auto-Renew */}
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Current Subscription Card */}
        <Card className="space-y-5 p-6 border-slate-300 dark:border-slate-700">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary">
                <Zap className="size-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-xl font-semibold text-[var(--color-text-primary)]">
                    {formatPlanDisplayName(sub.planName, t)}
                  </h2>
                  <span className="rounded-full border border-slate-300 bg-surface-muted px-2.5 py-0.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                    {t("tenantAdmin.billing.page.currentPlan.version", {
                      version: sub.planVersion ?? 1,
                    })}
                  </span>
                  <StatusPill
                    status={sub.subscriptionStatus}
                    label={formatSubscriptionStatusLabel(sub.subscriptionStatus, t)}
                  />
                </div>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {sub.description || t("tenantAdmin.billing.page.currentPlan.defaultDescription")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 rounded-xl border border-slate-300/90 bg-surface-muted p-4 sm:grid-cols-3 dark:border-slate-700">
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {t("tenantAdmin.billing.page.currentPlan.reservedPrice")}
              </p>
              <p className="mt-1 font-display text-lg font-bold text-[var(--color-text-primary)]">
                {t("tenantAdmin.billing.page.currentPlan.priceValue", {
                  amount: formatNumber(Number(sub.priceYearly || 0), undefined, locale),
                })}
                <span className="text-xs font-normal text-[var(--color-text-secondary)]">
                  {t("tenantAdmin.billing.page.currentPlan.perYear")}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {t("tenantAdmin.billing.page.currentPlan.currentCycle")}
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
                {sub.hasExplicitSubscription
                  ? `${formatDateSafe(sub.startsAt, locale)} – ${formatDateSafe(sub.endsAt, locale)}`
                  : t("tenantAdmin.billing.page.currentPlan.notActivatedCycle")}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {t("tenantAdmin.billing.page.currentPlan.remainingTime")}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-brand-primary">
                <CalendarClock className="size-4" />
                <span>
                  {sub.hasExplicitSubscription
                    ? t("tenantAdmin.billing.page.currentPlan.daysRemaining", {
                        days: sub.daysRemaining,
                      })
                    : t("tenantAdmin.billing.page.currentPlan.defaultPlanBadge")}
                </span>
              </p>
            </div>
          </div>

          {sub.proratedCreditAmount != null && sub.proratedCreditAmount > 0 && (
            <p className="text-xs font-semibold text-emerald-700">
              {t("tenantAdmin.billing.page.currentPlan.prorationCredit", {
                amount: formatNumber(Number(sub.proratedCreditAmount), undefined, locale),
              })}
            </p>
          )}

          {sub.features && sub.features.length > 0 && (
            <div className="space-y-2 border-t border-[var(--color-border-default)] pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                {t("tenantAdmin.billing.page.currentPlan.includedBenefits")}
              </p>
              <ul className="grid gap-2 text-xs text-[var(--color-text-primary)] sm:grid-cols-2">
                {sub.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-brand-primary" />
                    <span>{translatePlanFeatureLabel(feat, t)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Renewal & Auto-Renew Card */}
        <Card id="renewal-card" className="flex flex-col justify-between space-y-5 p-6 border-slate-300 dark:border-slate-700">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="grid size-10 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary">
                <CreditCard className="size-5" />
              </span>
              <div className="flex items-center gap-1.5">
                <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
                  {t("tenantAdmin.billing.page.renewCard.title")}
                </h2>
                <SectionHelpTip
                  label={t("tenantAdmin.billing.page.renewCard.helpLabel")}
                  content={t("tenantAdmin.billing.page.renewCard.helpContent")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
                {t("tenantAdmin.billing.page.renewCard.selectDuration", {
                  plan: formatPlanDisplayName(sub.planName, t),
                })}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setRenewYears(yr)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-center text-xs font-semibold transition-all cursor-pointer",
                      renewYears === yr
                        ? "border-brand-primary bg-[var(--color-primary-soft)] text-brand-primary"
                        : "border-slate-300 bg-surface-card text-[var(--color-text-secondary)] hover:bg-surface-muted dark:border-slate-700",
                    )}
                  >
                    {t("tenantAdmin.billing.page.renewCard.yearsOption", { years: yr })}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 rounded-xl border border-slate-300/90 bg-surface-muted p-4 text-xs dark:border-slate-700">
              <div className="flex justify-between text-[var(--color-text-secondary)]">
                <span>{t("tenantAdmin.billing.page.renewCard.unitPriceLabel")}</span>
                <span className="font-medium text-[var(--color-text-primary)]">
                  {t("tenantAdmin.billing.page.renewCard.unitPriceValue", {
                    amount: formatNumber(Number(sub.priceYearly || 0), undefined, locale),
                  })}
                </span>
              </div>
              <div className="flex justify-between text-[var(--color-text-secondary)]">
                <span>{t("tenantAdmin.billing.page.renewCard.projectedEndLabel")}</span>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {projectedRenewEndDate}
                </span>
              </div>
              <div className="flex justify-between border-t border-[var(--color-border-default)] pt-2 text-sm font-bold text-[var(--color-text-primary)]">
                <span>
                  {t("tenantAdmin.billing.page.renewCard.totalLabel", { years: renewYears })}
                </span>
                <span className="text-brand-primary">
                  {t("tenantAdmin.billing.page.renewCard.totalValue", {
                    amount: formatNumber(Number(sub.priceYearly || 0) * renewYears, undefined, locale),
                  })}
                </span>
              </div>
            </div>

            <Button className="w-full" disabled={renewing} onClick={() => void handleRenewSubmit()}>
              {renewing
                ? t("tenantAdmin.billing.page.renewCard.creatingInvoice")
                : t("tenantAdmin.billing.page.renewCard.createInvoiceButton", { years: renewYears })}
              <ArrowRight className="size-4" />
            </Button>
          </div>

          {/* Auto Renew Switch */}
          <div className="flex items-center justify-between gap-4 border-t border-[var(--color-border-default)] pt-4">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {t("tenantAdmin.billing.page.renewCard.autoRenewTitle")}
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                {sub.hasExplicitSubscription
                  ? sub.autoRenew
                    ? t("tenantAdmin.billing.page.renewCard.autoRenewOnDesc")
                    : t("tenantAdmin.billing.page.renewCard.autoRenewOffDesc")
                  : t("tenantAdmin.billing.page.renewCard.autoRenewDisabledDesc")}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(sub.autoRenew)}
              aria-label={t("tenantAdmin.billing.page.renewCard.autoRenewAria")}
              disabled={!sub.hasExplicitSubscription || togglingAutoRenew}
              onClick={() => void handleToggleAutoRenew()}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-border-focus)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
                sub.autoRenew ? "bg-brand-primary" : "bg-slate-300",
              )}
            >
              <span
                className={cn(
                  "inline-block size-4 transform rounded-full bg-white shadow transition-transform",
                  sub.autoRenew ? "translate-x-6" : "translate-x-1",
                )}
              />
            </button>
          </div>
        </Card>
      </div>

      {/* Dynamic Plans Comparison & Change Plan Section */}
      <Card className="space-y-5 p-6 border-slate-300 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary">
              <Layers className="size-5" />
            </span>
            <div className="flex items-center gap-1.5">
              <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
                {t("tenantAdmin.billing.page.plansSection.title")}
              </h2>
              <SectionHelpTip
                label={t("tenantAdmin.billing.page.plansSection.helpLabel")}
                content={t("tenantAdmin.billing.page.plansSection.helpContent")}
              />
            </div>
          </div>
        </div>

        {plansQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        ) : plansQuery.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {t("tenantAdmin.billing.page.plansSection.loadError", {
              error: getApiErrorMessage(plansQuery.error),
            })}
          </div>
        ) : publicPlans.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-border-default)] bg-surface-muted p-6 text-center text-sm text-[var(--color-text-secondary)]">
            {t("tenantAdmin.billing.page.plansSection.empty")}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {publicPlans.map((plan: PublicSubscriptionPlan) => {
              const isCurrent = plan.code.toUpperCase() === sub.planCode.toUpperCase();
              const isScheduledNext =
                Boolean(sub.nextPlanCode) &&
                plan.code.toUpperCase() === (sub.nextPlanCode || "").toUpperCase();
              const isSelected = selectedPlanCode === plan.code;
              const isHigher = Number(plan.priceYearly || 0) > Number(sub.priceYearly || 0);
              const parsedFeatures = parseFeaturesJson(plan.featuresJson);

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "flex flex-col justify-between rounded-2xl border p-5 transition-all",
                    isSelected
                      ? "border-brand-primary bg-[var(--color-primary-subtle)] shadow-sm"
                      : isCurrent
                        ? "border-emerald-400 bg-emerald-50/40"
                        : "border-slate-300 bg-surface-card hover:border-brand-primary dark:border-slate-700",
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
                          {t("tenantAdmin.billing.page.plansSection.version", {
                            version: plan.version ?? 1,
                          })}
                        </p>
                        <h3 className="mt-0.5 font-display text-lg font-semibold text-[var(--color-text-primary)]">
                          {formatPlanDisplayName(plan.name, t)}
                        </h3>
                      </div>
                      {isCurrent ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                          {t("tenantAdmin.billing.page.plansSection.currentBadge")}
                        </span>
                      ) : isScheduledNext ? (
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
                          {t("tenantAdmin.billing.page.plansSection.scheduledBadge")}
                        </span>
                      ) : null}
                    </div>

                    <p className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
                      {t("tenantAdmin.billing.page.plansSection.priceValue", {
                        amount: formatNumber(Number(plan.priceYearly || 0), undefined, locale),
                      })}
                      <span className="text-xs font-normal text-[var(--color-text-secondary)]">
                        {t("tenantAdmin.billing.page.plansSection.pricePerYear")}
                      </span>
                    </p>

                    {plan.description && (
                      <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
                        {plan.description}
                      </p>
                    )}

                    <dl className="space-y-1.5 border-t border-[var(--color-border-default)] pt-3 text-xs">
                      <div className="flex justify-between gap-2">
                        <dt className="text-[var(--color-text-secondary)]">
                          {t("tenantAdmin.billing.page.plansSection.openJobsLabel")}
                        </dt>
                        <dd className="font-semibold text-[var(--color-text-primary)]">
                          {formatLimitLabel(
                            plan.maxJobs,
                            t("tenantAdmin.billing.page.units.jobs"),
                            t,
                            locale,
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[var(--color-text-secondary)]">
                          {t("tenantAdmin.billing.page.plansSection.aiCvLabel")}
                        </dt>
                        <dd className="font-semibold text-[var(--color-text-primary)]">
                          {formatLimitLabel(
                            plan.maxCvParses,
                            t("tenantAdmin.billing.page.units.cvPerMonth"),
                            t,
                            locale,
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[var(--color-text-secondary)]">
                          {t("tenantAdmin.billing.page.plansSection.aiVoiceLabel")}
                        </dt>
                        <dd className="font-semibold text-[var(--color-text-primary)]">
                          {formatLimitLabel(
                            plan.maxAiInterviewHours,
                            t("tenantAdmin.billing.page.units.hoursPerMonth"),
                            t,
                            locale,
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[var(--color-text-secondary)]">
                          {t("tenantAdmin.billing.page.plansSection.proctoringLabel")}
                        </dt>
                        <dd className="font-semibold text-[var(--color-text-primary)]">
                          {formatLimitLabel(
                            plan.maxProctoringHours,
                            t("tenantAdmin.billing.page.units.hoursPerMonth"),
                            t,
                            locale,
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[var(--color-text-secondary)]">
                          {t("tenantAdmin.billing.page.plansSection.storageLabel")}
                        </dt>
                        <dd className="font-semibold text-[var(--color-text-primary)]">
                          {formatLimitLabel(
                            plan.maxStorageGb,
                            t("tenantAdmin.billing.page.units.gb"),
                            t,
                            locale,
                          )}
                        </dd>
                      </div>
                    </dl>

                    {parsedFeatures.length > 0 && (
                      <ul className="space-y-1 border-t border-[var(--color-border-default)] pt-3 text-xs text-[var(--color-text-secondary)]">
                        {parsedFeatures.slice(0, 4).map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <Check className="mt-0.5 size-3.5 shrink-0 text-brand-primary" />
                            <span>{translatePlanFeatureLabel(feat, t)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-5 pt-2">
                    {isCurrent ? (
                      <Button variant="secondary" size="sm" className="w-full" disabled>
                        {t("tenantAdmin.billing.page.plansSection.inUseButton")}
                      </Button>
                    ) : (
                      <Button
                        variant={isSelected ? "primary" : "secondary"}
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          setSelectedPlanCode((cur) => (cur === plan.code ? "" : plan.code))
                        }
                      >
                        {isSelected
                          ? t("tenantAdmin.billing.page.plansSection.previewingButton")
                          : isHigher
                            ? t("tenantAdmin.billing.page.plansSection.upgradeButton")
                            : t("tenantAdmin.billing.page.plansSection.downgradeButton")}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Proration / Downgrade Preview Box */}
        {selectedPlanCode && selectedPlanCode !== sub.planCode && (
          <div className="rounded-2xl border border-brand-primary/60 bg-surface-muted p-5 space-y-4">
            {previewQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-60" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : previewQuery.isError ? (
              <p className="text-sm text-red-700">{getApiErrorMessage(previewQuery.error)}</p>
            ) : preview ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-brand-primary" />
                    <h3 className="font-display text-base font-semibold text-[var(--color-text-primary)]">
                      {preview.changeType === "UPGRADE"
                        ? t("tenantAdmin.billing.page.previewBox.upgradeTitle", {
                            from: formatPlanDisplayName(preview.currentPlanName, t),
                            to: formatPlanDisplayName(preview.targetPlanName, t),
                          })
                        : t("tenantAdmin.billing.page.previewBox.downgradeTitle", {
                            from: formatPlanDisplayName(preview.currentPlanName, t),
                            to: formatPlanDisplayName(preview.targetPlanName, t),
                          })}
                    </h3>
                  </div>
                  <StatusPill
                    status={preview.changeType === "UPGRADE" ? "ACTIVE" : "IN_REVIEW"}
                    label={
                      preview.effectiveTiming === "IMMEDIATE"
                        ? t("tenantAdmin.billing.page.previewBox.immediateStatus")
                        : t("tenantAdmin.billing.page.previewBox.effectiveStatus", {
                            date: formatDateSafe(preview.effectiveDate, locale),
                          })
                    }
                  />
                </div>

                <div className="grid gap-3 rounded-xl border border-slate-300/90 bg-surface-card p-4 text-sm sm:grid-cols-3 dark:border-slate-700">
                  <div>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {t("tenantAdmin.billing.page.previewBox.targetPriceLabel", {
                        plan: formatPlanDisplayName(preview.targetPlanName, t),
                      })}
                    </p>
                    <p className="mt-1 font-semibold text-[var(--color-text-primary)]">
                      {t("tenantAdmin.billing.page.previewBox.targetPriceValue", {
                        amount: formatNumber(Number(preview.targetPriceYearly || 0), undefined, locale),
                      })}
                    </p>
                  </div>
                  {preview.changeType === "UPGRADE" ? (
                    <>
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {t("tenantAdmin.billing.page.previewBox.prorationLabel", {
                            remaining: preview.remainingDays,
                            total: preview.totalCycleDays,
                          })}
                        </p>
                        <p className="mt-1 font-semibold text-emerald-700">
                          {t("tenantAdmin.billing.page.previewBox.prorationValue", {
                            amount: formatNumber(
                              Number(preview.proratedCreditAmount || 0),
                              undefined,
                              locale,
                            ),
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {t("tenantAdmin.billing.page.previewBox.netAmountLabel")}
                        </p>
                        <p className="mt-1 font-display text-lg font-bold text-brand-primary">
                          {t("tenantAdmin.billing.page.previewBox.netAmountValue", {
                            amount: formatNumber(Number(preview.netAmountDue || 0), undefined, locale),
                          })}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {t("tenantAdmin.billing.page.previewBox.effectiveDateLabel")}
                        </p>
                        <p className="mt-1 font-semibold text-[var(--color-text-primary)]">
                          {formatDateSafe(preview.effectiveDate, locale)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {t("tenantAdmin.billing.page.previewBox.dueTodayLabel")}
                        </p>
                        <p className="mt-1 font-display text-lg font-bold text-emerald-700">
                          {t("tenantAdmin.billing.page.previewBox.dueTodayZero")}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {preview.warnings && preview.warnings.length > 0 && (
                  <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    {preview.warnings.map((w, idx) => (
                      <p key={idx}>{w}</p>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <input
                    type="text"
                    value={changeNotes}
                    onChange={(e) => setChangeNotes(e.target.value)}
                    maxLength={250}
                    placeholder={t("tenantAdmin.billing.page.previewBox.notesPlaceholder")}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-surface-card px-3 py-2 text-sm text-[var(--color-text-primary)] sm:max-w-md"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedPlanCode("");
                        setChangeNotes("");
                      }}
                    >
                      {t("tenantAdmin.billing.page.previewBox.close")}
                    </Button>
                    {preview.allowed && (
                      <Button
                        size="sm"
                        disabled={changingPlan}
                        onClick={() => void handleConfirmPlanChange()}
                      >
                        {changingPlan
                          ? t("tenantAdmin.billing.page.previewBox.processing")
                          : preview.changeType === "UPGRADE" && preview.netAmountDue > 0
                            ? t("tenantAdmin.billing.page.previewBox.createAndPay")
                            : preview.changeType === "UPGRADE"
                              ? t("tenantAdmin.billing.page.previewBox.confirmUpgradeNow")
                              : t("tenantAdmin.billing.page.previewBox.scheduleDowngrade")}
                      </Button>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </Card>

      {/* Quota Usage Telemetry Card */}
      <Card className="space-y-5 p-6 border-slate-300 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
              {t("tenantAdmin.billing.page.quotaCard.title")}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              {t("tenantAdmin.billing.page.quotaCard.retentionLabel")}
              <strong className="text-[var(--color-text-primary)]">
                {sub.videoRetentionDays < 0
                  ? t("tenantAdmin.billing.page.quotaCard.retentionUnlimited")
                  : sub.videoRetentionDays === 0
                    ? t("tenantAdmin.billing.page.quotaCard.retentionNone")
                    : t("tenantAdmin.billing.page.quotaCard.retentionDays", {
                        days: sub.videoRetentionDays,
                      })}
              </strong>
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {quotaRows.map((item) => {
            const barColor = !item.enabled
              ? "bg-slate-400"
              : !item.allowed || item.pct >= 100
                ? "bg-red-600"
                : item.pct >= 85
                  ? "bg-amber-500"
                  : "bg-brand-primary";

            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-300/90 bg-surface-muted p-4 dark:border-slate-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                  <span className="font-medium text-[var(--color-text-primary)]">{item.label}</span>
                  <div className="flex items-center gap-2">
                    {!item.enabled ? (
                      <span className="rounded bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {t("tenantAdmin.billing.page.quotaCard.unsupported")}
                      </span>
                    ) : !item.allowed ? (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                        {t("tenantAdmin.billing.page.quotaCard.hardCap")}
                      </span>
                    ) : item.unlimited ? (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        {t("tenantAdmin.billing.page.quotaCard.unlimited")}
                      </span>
                    ) : null}
                    <strong className="text-brand-primary">
                      {item.usedLabel} / {item.maxLabel}
                    </strong>
                  </div>
                </div>
                <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={cn("h-full rounded-full transition-all duration-300", barColor)}
                    style={{ width: `${item.unlimited ? 18 : Math.min(100, item.pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Invoices History Table */}
      <Card className="p-0 overflow-hidden border-slate-300 dark:border-slate-700">
        <div className="flex items-center gap-1.5 border-b border-slate-300/90 px-6 py-4 dark:border-slate-700">
          <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
            {t("tenantAdmin.billing.page.invoicesCard.title")}
          </h2>
          <SectionHelpTip
            label={t("tenantAdmin.billing.page.invoicesCard.helpLabel")}
            content={t("tenantAdmin.billing.page.invoicesCard.helpContent")}
          />
        </div>

        {sub.invoices.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--color-text-secondary)]">
            {t("tenantAdmin.billing.page.invoicesCard.empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-300/90 bg-surface-muted text-xs uppercase tracking-wider text-[var(--color-text-secondary)] dark:border-slate-700">
                <tr>
                  <th className="px-5 py-3">{t("tenantAdmin.billing.page.invoicesCard.columns.invoiceNumber")}</th>
                  <th className="px-5 py-3">{t("tenantAdmin.billing.page.invoicesCard.columns.type")}</th>
                  <th className="px-5 py-3">{t("tenantAdmin.billing.page.invoicesCard.columns.plan")}</th>
                  <th className="px-5 py-3">{t("tenantAdmin.billing.page.invoicesCard.columns.cycle")}</th>
                  <th className="px-5 py-3 text-right">{t("tenantAdmin.billing.page.invoicesCard.columns.amount")}</th>
                  <th className="px-5 py-3">{t("tenantAdmin.billing.page.invoicesCard.columns.gateway")}</th>
                  <th className="px-5 py-3">{t("tenantAdmin.billing.page.invoicesCard.columns.status")}</th>
                  <th className="px-5 py-3">{t("tenantAdmin.billing.page.invoicesCard.columns.dateDue")}</th>
                  <th className="px-5 py-3 text-right">{t("tenantAdmin.billing.page.invoicesCard.columns.action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-default)]">
                {sub.invoices.map((inv) => {
                  const isHighlighted =
                    Boolean(highlightedInvoice) &&
                    inv.invoiceNumber.toLowerCase() === highlightedInvoice.toLowerCase();
                  return (
                  <tr
                    key={inv.id}
                    ref={isHighlighted ? highlightedRowRef : undefined}
                    className={cn(
                      "hover:bg-surface-muted/40",
                      isHighlighted && "bg-[var(--color-primary-soft)]/55 ring-1 ring-inset ring-brand-primary/35",
                    )}
                  >
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-[var(--color-text-primary)]">
                      #{inv.invoiceNumber}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-[var(--color-text-primary)]">
                      {formatInvoiceTypeLabel(inv.invoiceType, t)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)]">
                      {inv.planName ? (
                        <span className="font-medium text-[var(--color-text-primary)]">
                          {formatPlanDisplayName(inv.planName, t)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
                      {inv.billingPeriodStart && inv.billingPeriodEnd
                        ? `${formatDateSafe(inv.billingPeriodStart, locale)} – ${formatDateSafe(inv.billingPeriodEnd, locale)}`
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-[var(--color-text-primary)] whitespace-nowrap">
                      {t("tenantAdmin.billing.page.invoicesCard.amountValue", {
                        amount: formatNumber(Number(inv.amount || 0), undefined, locale),
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)]">
                      {formatPaymentGatewayLabel(inv.paymentGateway, t)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <StatusPill
                        status={inv.status}
                        label={formatInvoiceStatusLabel(inv.status, t)}
                      />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
                      {inv.paidAt
                        ? t("tenantAdmin.billing.page.invoicesCard.paidAtPrefix", {
                            date: formatDateSafe(inv.paidAt, locale),
                          })
                        : inv.dueDate
                          ? t("tenantAdmin.billing.page.invoicesCard.dueAtPrefix", {
                              date: formatDateSafe(inv.dueDate, locale),
                            })
                          : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {inv.status === "PENDING" ? (
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            size="sm"
                            onClick={() =>
                              setPayingInvoice({ id: inv.id, type: inv.invoiceType })
                            }
                          >
                            {t("tenantAdmin.billing.page.invoicesCard.payButton")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={cancelingInvoiceId === inv.id}
                            onClick={() => handleCancelPendingInvoice(inv)}
                          >
                            {t("tenantAdmin.billing.page.invoicesCard.cancelButton")}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--color-text-secondary)]">—</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <InvoicePaymentModal
        invoiceId={payingInvoice?.id ?? null}
        invoiceType={payingInvoice?.type}
        onClose={() => setPayingInvoice(null)}
        onPaid={() => {
          setPayingInvoice(null);
          void subQuery.refetch();
        }}
      />
    </section>
  );
}
