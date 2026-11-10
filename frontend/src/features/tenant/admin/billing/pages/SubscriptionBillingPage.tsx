import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { getApiErrorMessage } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";

function formatDateVi(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
}

function formatQuotaBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatSecondsToHoursLabel(seconds: number): string {
  const hours = seconds / 3600;
  if (hours > 0 && hours < 0.1) return `${Math.ceil(seconds / 60)} phút`;
  return `${hours.toFixed(1)} giờ`;
}

function formatLimitLabel(value: number | undefined, unit: string): string {
  if (value == null) return "—";
  if (value < 0) return "Không giới hạn";
  if (value === 0) return `Không hỗ trợ (0 ${unit})`;
  return `${value.toLocaleString("vi-VN")} ${unit}`;
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
    return next.toLocaleDateString("vi-VN");
  }, [renewYears, sub?.endsAt, sub?.hasExplicitSubscription]);

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
        "Đã tạo hóa đơn gia hạn",
        opened
          ? `Hóa đơn gia hạn ${renewYears} năm đã sẵn sàng. Vui lòng hoàn tất thanh toán.`
          : `Đã ghi nhận yêu cầu gia hạn ${renewYears} năm.`,
      );
    } catch (err) {
      toast.error("Không thể tạo hóa đơn gia hạn", getApiErrorMessage(err));
    } finally {
      setRenewing(false);
    }
  };

  const handleToggleAutoRenew = async () => {
    if (!sub) return;
    if (!sub.hasExplicitSubscription) {
      toast.info(
        "Chưa có gói thuê bao trả phí",
        "Doanh nghiệp đang sử dụng gói mặc định. Vui lòng gia hạn hoặc nâng cấp để bật tự động gia hạn.",
      );
      return;
    }
    const nextValue = !sub.autoRenew;
    setTogglingAutoRenew(true);
    try {
      const res = await companyApi.updateAutoRenew(nextValue);
      queryClient.setQueryData(["tenant-subscription-quota"], res);
      toast.success(
        nextValue ? "Đã bật tự động gia hạn" : "Đã tắt tự động gia hạn",
        nextValue
          ? "Hệ thống sẽ tự động chuẩn bị gia hạn khi gần hết chu kỳ."
          : "Gói sẽ không tự động gia hạn khi kết thúc chu kỳ hiện tại.",
      );
    } catch (err) {
      toast.error("Không thể cập nhật tự động gia hạn", getApiErrorMessage(err));
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
          "Đã tạo hóa đơn nâng cấp gói",
          `Vui lòng thanh toán ${preview.netAmountDue.toLocaleString("vi-VN")} ₫ để kích hoạt gói ${formatPlanDisplayName(preview.targetPlanName)}. Gói hiện tại vẫn được giữ nguyên trong lúc chờ thanh toán.`,
        );
      } else if (preview.changeType === "UPGRADE") {
        toast.success(
          "Nâng cấp gói thành công",
          `Gói ${formatPlanDisplayName(preview.targetPlanName)} đã được kích hoạt ngay bằng số dư bù trừ từ gói trước.`,
        );
      } else {
        toast.success(
          "Đã lên lịch hạ cấp gói cuối chu kỳ",
          `Hạn mức hiện tại vẫn được giữ nguyên đến ${formatDateVi(preview.effectiveDate)}.`,
        );
      }
    } catch (err) {
      toast.error("Không thể chuyển đổi gói dịch vụ", getApiErrorMessage(err));
    } finally {
      setChangingPlan(false);
    }
  };

  const handleCancelDowngrade = async () => {
    setCancelingDowngrade(true);
    try {
      const res = await companyApi.cancelScheduledDowngrade();
      queryClient.setQueryData(["tenant-subscription-quota"], res);
      toast.success("Đã hủy lịch hạ cấp gói cuối chu kỳ");
    } catch (err) {
      toast.error("Không thể hủy lịch hạ cấp", getApiErrorMessage(err));
    } finally {
      setCancelingDowngrade(false);
    }
  };

  const handleCancelPendingInvoice = (invoice: TenantInvoiceItem) => {
    askConfirm({
      title: `Hủy hóa đơn #${invoice.invoiceNumber}?`,
      description:
        "Hóa đơn và yêu cầu nâng cấp/gia hạn chưa thanh toán gắn với hóa đơn này sẽ bị hủy. Gói hiện tại đang chạy của bạn không bị ảnh hưởng.",
      confirmLabel: "Xác nhận hủy",
      danger: true,
      onConfirm: async () => {
        setCancelingInvoiceId(invoice.id);
        try {
          const res = await companyApi.cancelPendingInvoice(invoice.id);
          queryClient.setQueryData(["tenant-subscription-quota"], res);
          toast.success(`Đã hủy hóa đơn #${invoice.invoiceNumber}`);
        } catch (err) {
          toast.error("Không thể hủy hóa đơn", getApiErrorMessage(err));
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
          label: "Vị trí tuyển dụng đang mở",
          usedLabel: sub.usedJobs.toLocaleString("vi-VN"),
          maxLabel: formatLimitLabel(sub.maxJobs, "vị trí"),
          pct: sub.jobsUsagePercent,
          enabled: sub.jobsEnabled,
          allowed: sub.jobsAllowed,
          unlimited: sub.maxJobs < 0,
        },
        {
          id: "cv",
          label: "Lọc & phân tích CV bằng AI (theo tháng)",
          usedLabel: sub.usedCvParses.toLocaleString("vi-VN"),
          maxLabel: formatLimitLabel(sub.maxCvParses, "CV/tháng"),
          pct: sub.cvParsesUsagePercent,
          enabled: sub.cvParseEnabled,
          allowed: sub.cvParseAllowed,
          unlimited: sub.maxCvParses < 0,
        },
        {
          id: "ai_voice",
          label: "Phỏng vấn AI bằng giọng nói (theo tháng)",
          usedLabel: formatSecondsToHoursLabel(sub.usedAiInterviewSeconds),
          maxLabel: formatLimitLabel(sub.maxAiInterviewHours, "giờ/tháng"),
          pct: sub.aiInterviewUsagePercent,
          enabled: sub.aiInterviewEnabled,
          allowed: sub.aiInterviewAllowed,
          unlimited: sub.maxAiInterviewHours < 0,
        },
        {
          id: "proctoring",
          label: "Giám sát thi tự động (theo tháng)",
          usedLabel: formatSecondsToHoursLabel(sub.usedProctoringSeconds),
          maxLabel: formatLimitLabel(sub.maxProctoringHours, "giờ/tháng"),
          pct: sub.proctoringUsagePercent,
          enabled: sub.proctoringEnabled,
          allowed: sub.proctoringAllowed,
          unlimited: sub.maxProctoringHours < 0,
        },
        {
          id: "storage",
          label: "Dung lượng lưu trữ hồ sơ & video",
          usedLabel: formatQuotaBytes(sub.usedStorageBytes),
          maxLabel: formatLimitLabel(sub.maxStorageGb, "GB"),
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
          Không thể tải thông tin gói &amp; hóa đơn
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {subQuery.isError ? getApiErrorMessage(subQuery.error) : "Không có dữ liệu thuê bao."}
        </p>
        <Button size="sm" onClick={() => void subQuery.refetch()}>
          Thử lại
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
            Quản trị gói dịch vụ &amp; thanh toán
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
          <span>Làm mới dữ liệu</span>
        </Button>
      </header>

      {/* Lifecycle & Pending Payment Banners */}
      {pendingInvoices.length > 0 && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Receipt className="mt-0.5 size-5 shrink-0 text-amber-700" />
            <div className="space-y-0.5 text-xs sm:text-sm text-amber-950">
              <p className="font-semibold">
                Bạn có {pendingInvoices.length} hóa đơn đang chờ thanh toán (#
                {pendingInvoices[0].invoiceNumber} ·{" "}
                {Number(pendingInvoices[0].amount || 0).toLocaleString("vi-VN")} ₫)
              </p>
              <p className="text-amber-800">
                {pendingInvoices[0].invoiceType === "UPGRADE"
                  ? "Gói nâng cấp mới sẽ được kích hoạt ngay sau khi hóa đơn này thanh toán thành công."
                  : "Hoàn tất thanh toán trước hạn để duy trì bản quyền liên tục."}
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
              Thanh toán ngay
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={cancelingInvoiceId === pendingInvoices[0].id}
              onClick={() => handleCancelPendingInvoice(pendingInvoices[0])}
            >
              Hủy
            </Button>
          </div>
        </div>
      )}

      {sub.subscriptionStatus === "PAST_DUE" && (
        <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-amber-300 bg-amber-50 p-4 text-xs sm:text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />
          <div>
            <strong>Thuê bao quá hạn thanh toán (Đang trong thời gian ân hạn):</strong> Quyền lợi
            tuyển dụng vẫn được duy trì tạm thời
            {sub.gracePeriodEndsAt ? ` đến ${formatDateVi(sub.gracePeriodEndsAt)}` : ""}. Vui lòng gia
            hạn để tránh chuyển sang trạng thái tạm khóa.
          </div>
        </div>
      )}

      {sub.subscriptionStatus === "SUSPENDED" && (
        <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-red-300 bg-red-50 p-4 text-xs sm:text-sm text-red-950">
          <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div>
            <strong>Thuê bao đang bị tạm khóa:</strong> Thời gian ân hạn đã kết thúc.
            Các tính năng đăng tin tuyển dụng mới, lọc CV bằng AI và phỏng vấn AI tạm thời bị khóa cho đến khi
            thanh toán gia hạn thành công.
          </div>
        </div>
      )}

      {sub.subscriptionStatus === "EXPIRED" && (
        <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-red-300 bg-red-50 p-4 text-xs sm:text-sm text-red-950">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div>
            <strong>Thuê bao đã hết hạn:</strong> Hãy gia hạn hoặc chọn một gói phù hợp bên dưới để
            tiếp tục vận hành toàn bộ tính năng tuyển dụng.
          </div>
        </div>
      )}

      {sub.nextPlanName && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-blue-300 bg-blue-50 p-4 text-xs sm:text-sm text-blue-950">
          <span>
            <strong>Đã lên lịch hạ cấp cuối kỳ:</strong> Gói sẽ tự động chuyển sang{" "}
            <strong>{formatPlanDisplayName(sub.nextPlanName)}</strong>{" "}
            sau khi kết thúc chu kỳ hiện tại ({formatDateVi(sub.endsAt)}).
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={cancelingDowngrade}
            onClick={() => void handleCancelDowngrade()}
          >
            {cancelingDowngrade ? "Đang hủy..." : "Hủy lịch hạ cấp"}
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
                    {formatPlanDisplayName(sub.planName)}
                  </h2>
                  <span className="rounded-full border border-slate-300 bg-surface-muted px-2.5 py-0.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                    Phiên bản {sub.planVersion ?? 1}
                  </span>
                  <StatusPill
                    status={sub.subscriptionStatus}
                    label={formatSubscriptionStatusLabel(sub.subscriptionStatus)}
                  />
                </div>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {sub.description || "Gói dịch vụ đang áp dụng cho toàn bộ doanh nghiệp."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 rounded-xl border border-slate-300/90 bg-surface-muted p-4 sm:grid-cols-3 dark:border-slate-700">
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">Giá hợp đồng bảo lưu</p>
              <p className="mt-1 font-display text-lg font-bold text-[var(--color-text-primary)]">
                {Number(sub.priceYearly || 0).toLocaleString("vi-VN")} ₫
                <span className="text-xs font-normal text-[var(--color-text-secondary)]"> / năm</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">Chu kỳ hiện tại</p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
                {sub.hasExplicitSubscription
                  ? `${formatDateVi(sub.startsAt)} – ${formatDateVi(sub.endsAt)}`
                  : "Chưa kích hoạt chu kỳ trả phí"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">Thời hạn còn lại</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-brand-primary">
                <CalendarClock className="size-4" />
                <span>
                  {sub.hasExplicitSubscription ? `${sub.daysRemaining} ngày` : "Gói mặc định"}
                </span>
              </p>
            </div>
          </div>

          {sub.proratedCreditAmount != null && sub.proratedCreditAmount > 0 && (
            <p className="text-xs font-semibold text-emerald-700">
              Đã khấu trừ số dư từ gói trước: -{Number(sub.proratedCreditAmount).toLocaleString("vi-VN")} ₫
            </p>
          )}

          {sub.features && sub.features.length > 0 && (
            <div className="space-y-2 border-t border-[var(--color-border-default)] pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Quyền lợi đang được bảo lưu
              </p>
              <ul className="grid gap-2 text-xs text-[var(--color-text-primary)] sm:grid-cols-2">
                {sub.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-brand-primary" />
                    <span>{translatePlanFeatureLabel(feat)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Renewal & Auto-Renew Card */}
        <Card className="flex flex-col justify-between space-y-5 p-6 border-slate-300 dark:border-slate-700">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="grid size-10 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary">
                <CreditCard className="size-5" />
              </span>
              <div className="flex items-center gap-1.5">
                <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
                  Gia hạn bản quyền
                </h2>
                <SectionHelpTip
                  label="Thông tin gia hạn bản quyền"
                  content="Gia hạn sớm được cộng dồn trọn vẹn số ngày còn lại hiện tại."
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
                Chọn thời hạn gia hạn gói {formatPlanDisplayName(sub.planName)}
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
                    {yr} năm
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 rounded-xl border border-slate-300/90 bg-surface-muted p-4 text-xs dark:border-slate-700">
              <div className="flex justify-between text-[var(--color-text-secondary)]">
                <span>Đơn giá gói hiện tại:</span>
                <span className="font-medium text-[var(--color-text-primary)]">
                  {Number(sub.priceYearly || 0).toLocaleString("vi-VN")} ₫ / năm
                </span>
              </div>
              <div className="flex justify-between text-[var(--color-text-secondary)]">
                <span>Hạn mới dự kiến sau thanh toán:</span>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {projectedRenewEndDate}
                </span>
              </div>
              <div className="flex justify-between border-t border-[var(--color-border-default)] pt-2 text-sm font-bold text-[var(--color-text-primary)]">
                <span>Tổng tiền gia hạn ({renewYears} năm):</span>
                <span className="text-brand-primary">
                  {(Number(sub.priceYearly || 0) * renewYears).toLocaleString("vi-VN")} ₫
                </span>
              </div>
            </div>

            <Button className="w-full" disabled={renewing} onClick={() => void handleRenewSubmit()}>
              {renewing ? "Đang tạo hóa đơn..." : `Tạo hóa đơn gia hạn ${renewYears} năm`}
              <ArrowRight className="size-4" />
            </Button>
          </div>

          {/* Auto Renew Switch */}
          <div className="flex items-center justify-between gap-4 border-t border-[var(--color-border-default)] pt-4">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">Tự động gia hạn</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                {sub.hasExplicitSubscription
                  ? sub.autoRenew
                    ? "Đang bật — nhắc nhở & chuẩn bị gia hạn khi gần hết hạn."
                    : "Đang tắt — cần chủ động gia hạn thủ công trước ngày hết hạn."
                  : "Cần kích hoạt gói trả phí để bật/tắt tự động gia hạn."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(sub.autoRenew)}
              aria-label="Tự động gia hạn"
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
                Nâng cấp &amp; Điều chỉnh gói dịch vụ
              </h2>
              <SectionHelpTip
                label="Quy tắc nâng cấp và hạ cấp gói"
                content="Khi nâng cấp, tiền của số ngày chưa sử dụng ở gói cũ sẽ được khấu trừ tự động và gói mới được kích hoạt ngay sau khi thanh toán. Khi hạ cấp, thay đổi áp dụng vào cuối chu kỳ để bảo toàn dữ liệu."
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
            Không tải được danh sách gói dịch vụ công khai: {getApiErrorMessage(plansQuery.error)}
          </div>
        ) : publicPlans.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-border-default)] bg-surface-muted p-6 text-center text-sm text-[var(--color-text-secondary)]">
            Hiện chưa có gói tiêu chuẩn nào được mở bán công khai.
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
                          Phiên bản {plan.version ?? 1}
                        </p>
                        <h3 className="mt-0.5 font-display text-lg font-semibold text-[var(--color-text-primary)]">
                          {formatPlanDisplayName(plan.name)}
                        </h3>
                      </div>
                      {isCurrent ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                          Gói hiện tại
                        </span>
                      ) : isScheduledNext ? (
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
                          Chuyển cuối kỳ
                        </span>
                      ) : null}
                    </div>

                    <p className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
                      {Number(plan.priceYearly || 0).toLocaleString("vi-VN")} ₫
                      <span className="text-xs font-normal text-[var(--color-text-secondary)]"> / năm</span>
                    </p>

                    {plan.description && (
                      <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
                        {plan.description}
                      </p>
                    )}

                    <dl className="space-y-1.5 border-t border-[var(--color-border-default)] pt-3 text-xs">
                      <div className="flex justify-between gap-2">
                        <dt className="text-[var(--color-text-secondary)]">Tin đang mở:</dt>
                        <dd className="font-semibold text-[var(--color-text-primary)]">
                          {formatLimitLabel(plan.maxJobs, "vị trí")}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[var(--color-text-secondary)]">Lọc CV bằng AI:</dt>
                        <dd className="font-semibold text-[var(--color-text-primary)]">
                          {formatLimitLabel(plan.maxCvParses, "CV/tháng")}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[var(--color-text-secondary)]">Phỏng vấn AI giọng nói:</dt>
                        <dd className="font-semibold text-[var(--color-text-primary)]">
                          {formatLimitLabel(plan.maxAiInterviewHours, "giờ/tháng")}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[var(--color-text-secondary)]">Giám sát thi tự động:</dt>
                        <dd className="font-semibold text-[var(--color-text-primary)]">
                          {formatLimitLabel(plan.maxProctoringHours, "giờ/tháng")}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[var(--color-text-secondary)]">Lưu trữ:</dt>
                        <dd className="font-semibold text-[var(--color-text-primary)]">
                          {formatLimitLabel(plan.maxStorageGb, "GB")}
                        </dd>
                      </div>
                    </dl>

                    {parsedFeatures.length > 0 && (
                      <ul className="space-y-1 border-t border-[var(--color-border-default)] pt-3 text-xs text-[var(--color-text-secondary)]">
                        {parsedFeatures.slice(0, 4).map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <Check className="mt-0.5 size-3.5 shrink-0 text-brand-primary" />
                            <span>{translatePlanFeatureLabel(feat)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-5 pt-2">
                    {isCurrent ? (
                      <Button variant="secondary" size="sm" className="w-full" disabled>
                        Đang sử dụng
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
                          ? "Đang xem dự toán"
                          : isHigher
                            ? "Xem dự toán nâng cấp"
                            : "Xem lịch hạ cấp cuối kỳ"}
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
                        ? `Dự toán nâng cấp: ${formatPlanDisplayName(preview.currentPlanName)} → ${formatPlanDisplayName(preview.targetPlanName)}`
                        : `Lên lịch hạ cấp cuối chu kỳ: ${formatPlanDisplayName(preview.currentPlanName)} → ${formatPlanDisplayName(preview.targetPlanName)}`}
                    </h3>
                  </div>
                  <StatusPill
                    status={preview.changeType === "UPGRADE" ? "ACTIVE" : "IN_REVIEW"}
                    label={
                      preview.effectiveTiming === "IMMEDIATE"
                        ? "Kích hoạt ngay sau thanh toán"
                        : `Hiệu lực từ ${formatDateVi(preview.effectiveDate)}`
                    }
                  />
                </div>

                <div className="grid gap-3 rounded-xl border border-slate-300/90 bg-surface-card p-4 text-sm sm:grid-cols-3 dark:border-slate-700">
                  <div>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Giá gói {formatPlanDisplayName(preview.targetPlanName)}
                    </p>
                    <p className="mt-1 font-semibold text-[var(--color-text-primary)]">
                      {Number(preview.targetPriceYearly || 0).toLocaleString("vi-VN")} ₫ / năm
                    </p>
                  </div>
                  {preview.changeType === "UPGRADE" ? (
                    <>
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          Khấu trừ số ngày chưa dùng ({preview.remainingDays}/{preview.totalCycleDays} ngày còn lại)
                        </p>
                        <p className="mt-1 font-semibold text-emerald-700">
                          -{Number(preview.proratedCreditAmount || 0).toLocaleString("vi-VN")} ₫
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Số tiền cần thanh toán</p>
                        <p className="mt-1 font-display text-lg font-bold text-brand-primary">
                          {Number(preview.netAmountDue || 0).toLocaleString("vi-VN")} ₫
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Ngày áp dụng gói mới</p>
                        <p className="mt-1 font-semibold text-[var(--color-text-primary)]">
                          {formatDateVi(preview.effectiveDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Phí thu ngay hôm nay</p>
                        <p className="mt-1 font-display text-lg font-bold text-emerald-700">0 ₫</p>
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
                    placeholder="Ghi chú chuyển gói (không bắt buộc)..."
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
                      Đóng
                    </Button>
                    {preview.allowed && (
                      <Button
                        size="sm"
                        disabled={changingPlan}
                        onClick={() => void handleConfirmPlanChange()}
                      >
                        {changingPlan
                          ? "Đang xử lý..."
                          : preview.changeType === "UPGRADE" && preview.netAmountDue > 0
                            ? "Tạo hóa đơn & Thanh toán"
                            : preview.changeType === "UPGRADE"
                              ? "Xác nhận nâng cấp ngay"
                              : "Lên lịch hạ cấp cuối chu kỳ"}
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
              Mức sử dụng hạn mức
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Lưu trữ bản ghi phỏng vấn:{" "}
              <strong className="text-[var(--color-text-primary)]">
                {sub.videoRetentionDays < 0
                  ? "Vĩnh viễn"
                  : sub.videoRetentionDays === 0
                    ? "Không lưu trữ (0 ngày)"
                    : `${sub.videoRetentionDays} ngày`}
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
                        Không hỗ trợ
                      </span>
                    ) : !item.allowed ? (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                        Đạt trần 100%
                      </span>
                    ) : item.unlimited ? (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        Không giới hạn
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
            Lịch sử hóa đơn &amp; thanh toán
          </h2>
          <SectionHelpTip
            label="Thông tin lịch sử hóa đơn"
            content="Toàn bộ hóa đơn khởi tạo, nâng cấp gói và gia hạn bản quyền của doanh nghiệp."
          />
        </div>

        {sub.invoices.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--color-text-secondary)]">
            Chưa có hóa đơn nào được phát hành cho doanh nghiệp này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-300/90 bg-surface-muted text-xs uppercase tracking-wider text-[var(--color-text-secondary)] dark:border-slate-700">
                <tr>
                  <th className="px-5 py-3">Mã hóa đơn</th>
                  <th className="px-5 py-3">Loại</th>
                  <th className="px-5 py-3">Gói dịch vụ</th>
                  <th className="px-5 py-3">Chu kỳ</th>
                  <th className="px-5 py-3 text-right">Số tiền</th>
                  <th className="px-5 py-3">Cổng TT</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3">Ngày TT / Hạn</th>
                  <th className="px-5 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-default)]">
                {sub.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-surface-muted/40">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-[var(--color-text-primary)]">
                      #{inv.invoiceNumber}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-[var(--color-text-primary)]">
                      {formatInvoiceTypeLabel(inv.invoiceType)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)]">
                      {inv.planName ? (
                        <span className="font-medium text-[var(--color-text-primary)]">
                          {formatPlanDisplayName(inv.planName)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
                      {inv.billingPeriodStart && inv.billingPeriodEnd
                        ? `${formatDateVi(inv.billingPeriodStart)} – ${formatDateVi(inv.billingPeriodEnd)}`
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-[var(--color-text-primary)] whitespace-nowrap">
                      {Number(inv.amount || 0).toLocaleString("vi-VN")} ₫
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)]">
                      {formatPaymentGatewayLabel(inv.paymentGateway)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <StatusPill
                        status={inv.status}
                        label={formatInvoiceStatusLabel(inv.status)}
                      />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
                      {inv.paidAt
                        ? `TT: ${formatDateVi(inv.paidAt)}`
                        : inv.dueDate
                          ? `Hạn: ${formatDateVi(inv.dueDate)}`
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
                            Thanh toán
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={cancelingInvoiceId === inv.id}
                            onClick={() => handleCancelPendingInvoice(inv)}
                          >
                            Hủy
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--color-text-secondary)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
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
