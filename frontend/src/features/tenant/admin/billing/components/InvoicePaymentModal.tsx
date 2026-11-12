import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Globe,
  Loader2,
  QrCode,
  Receipt,
} from "lucide-react";
import { checkoutApi } from "@/api/master/checkoutApi";
import { companyApi } from "@/api/tenant/companyApi";
import { Button } from "@/components/ux/Button";
import { DetailDialog } from "@/components/ux/DetailDialog";
import { Skeleton } from "@/components/ux/Skeleton";
import { StatusPill } from "@/components/ux/StatusPill";
import { formatNumber, useLocale, useT } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";
import {
  formatInvoiceStatusLabel,
  formatInvoiceTypeLabel,
  formatPlanDisplayName,
} from "@/features/tenant/admin/billing/utils/billingLabels";

type PaymentTab = "TRANSFER" | "DOMESTIC_CARD" | "INTL_CARD";

interface InvoicePaymentModalProps {
  invoiceId: number | null;
  invoiceType?: string | null;
  onClose: () => void;
  onPaid: () => void;
}

export function InvoicePaymentModal({
  invoiceId,
  invoiceType,
  onClose,
  onPaid,
}: InvoicePaymentModalProps) {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<PaymentTab>("TRANSFER");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [vnpayLoading, setVnpayLoading] = useState(false);
  const [paypalVerifying, setPaypalVerifying] = useState(false);
  const handledPaidRef = useRef<number | null>(null);

  useEffect(() => {
    setActiveTab("TRANSFER");
    setCopiedField(null);
    handledPaidRef.current = null;
  }, [invoiceId]);

  const checkoutQuery = useQuery({
    queryKey: ["tenant-invoice-checkout", invoiceId],
    queryFn: () => companyApi.getSubscriptionInvoiceCheckout(invoiceId!),
    enabled: Boolean(invoiceId),
  });

  const order = checkoutQuery.data?.data;

  const notifyPaidSuccess = async (invId: number, invoiceNumber: string) => {
    if (handledPaidRef.current === invId) return;
    handledPaidRef.current = invId;
    await queryClient.invalidateQueries({ queryKey: ["tenant-subscription-quota"] });
    toast.success(
      t("tenantAdmin.billing.paymentModal.toasts.paidTitle"),
      t("tenantAdmin.billing.paymentModal.toasts.paidDesc", { invoiceNumber }),
    );
    onPaid();
  };

  useEffect(() => {
    if (!invoiceId || !order) return;
    if (order.status === "PAID") {
      void notifyPaidSuccess(order.invoiceId, order.invoiceNumber);
      return;
    }
    if (order.status !== "PENDING") return;

    const interval = window.setInterval(async () => {
      try {
        const statusRes = await checkoutApi.checkInvoiceStatus(order.invoiceId);
        if (statusRes.status === "PAID") {
          window.clearInterval(interval);
          await notifyPaidSuccess(order.invoiceId, statusRes.invoiceNumber || order.invoiceNumber);
        } else if (statusRes.status === "CANCELLED") {
          window.clearInterval(interval);
          await queryClient.invalidateQueries({ queryKey: ["tenant-subscription-quota"] });
          toast.warning(
            t("tenantAdmin.billing.paymentModal.toasts.canceledTitle"),
            t("tenantAdmin.billing.paymentModal.toasts.canceledDesc", {
              invoiceNumber: order.invoiceNumber,
            }),
          );
          onClose();
        }
      } catch {
        // Silent background poll retry
      }
    }, 2500);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId, order?.invoiceId, order?.status]);

  const handleCopy = async (value: string, fieldKey: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(fieldKey);
      toast.success(t("tenantAdmin.billing.paymentModal.toasts.copiedLabel", { label }));
      window.setTimeout(() => {
        setCopiedField((cur) => (cur === fieldKey ? null : cur));
      }, 1800);
    } catch {
      toast.error(t("tenantAdmin.billing.paymentModal.toasts.copyFailed"));
    }
  };

  const handleDownloadQr = async () => {
    if (!order) return;
    const qrSource = order.qrUrl;
    if (!qrSource) {
      toast.error(t("tenantAdmin.billing.paymentModal.toasts.noQrManualTransfer"));
      return;
    }
    try {
      const res = await fetch(qrSource);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `VietQR-${order.invoiceNumber}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success(t("tenantAdmin.billing.paymentModal.toasts.qrDownloaded"));
    } catch {
      window.open(qrSource, "_blank", "noopener,noreferrer");
    }
  };

  const handlePayWithVnPay = async () => {
    if (!order) return;
    setVnpayLoading(true);
    try {
      const res = await checkoutApi.createVnPayUrl({
        invoiceId: order.invoiceId,
        bankCode: "VNBANK",
        returnUrl: `${window.location.origin}/checkout/vnpay-return`,
      });
      if (res?.paymentUrl) {
        window.location.href = res.paymentUrl;
      } else {
        toast.error(t("tenantAdmin.billing.paymentModal.toasts.vnpayNoUrl"));
      }
    } catch (err) {
      toast.error(t("tenantAdmin.billing.paymentModal.toasts.vnpayError"), getApiErrorMessage(err));
    } finally {
      setVnpayLoading(false);
    }
  };

  const usdAmount = order ? Number((Number(order.amountVnd || 0) / 25000).toFixed(2)) : 0;

  return (
    <DetailDialog
      open={Boolean(invoiceId)}
      size="wide"
      title={
        order
          ? t("tenantAdmin.billing.paymentModal.titleWithOrder", {
              invoiceNumber: order.invoiceNumber,
            })
          : t("tenantAdmin.billing.paymentModal.titleDefault")
      }
      onClose={onClose}
    >
      {checkoutQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : checkoutQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
          <p className="text-sm font-semibold text-red-800">
            {getApiErrorMessage(checkoutQuery.error)}
          </p>
          <Button variant="secondary" size="sm" onClick={() => void checkoutQuery.refetch()}>
            {t("tenantAdmin.billing.paymentModal.retry")}
          </Button>
        </div>
      ) : order ? (
        <div className="space-y-6">
          {/* Order summary bar */}
          <div className="rounded-2xl border border-[var(--color-border-default)] bg-surface-muted p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-primary)]">
                    <Receipt className="size-4 text-brand-primary" />
                    #{order.invoiceNumber}
                  </span>
                  <span className="rounded-full bg-[var(--color-primary-subtle)] px-2.5 py-0.5 text-xs font-semibold text-brand-primary">
                    {formatInvoiceTypeLabel(invoiceType, t)}
                  </span>
                  <StatusPill status={order.status} label={formatInvoiceStatusLabel(order.status, t)} />
                </div>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {t("tenantAdmin.billing.paymentModal.appliedPlanLabel")}{" "}
                  <strong className="text-[var(--color-text-primary)]">
                    {formatPlanDisplayName(order.planName, t)}
                  </strong>
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {t("tenantAdmin.billing.paymentModal.amountDueLabel")}
                </p>
                <p className="font-display text-2xl font-bold text-brand-primary">
                  {t("tenantAdmin.billing.paymentModal.amountVndValue", {
                    amount: formatNumber(Number(order.amountVnd || 0), undefined, locale),
                  })}
                </p>
              </div>
            </div>
          </div>

          {order.status === "PAID" ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center space-y-3">
              <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
              <h3 className="text-lg font-bold text-emerald-950">
                {t("tenantAdmin.billing.paymentModal.paidTitle")}
              </h3>
              <p className="text-sm text-emerald-800">
                {t("tenantAdmin.billing.paymentModal.paidDesc")}
              </p>
              <div className="pt-2">
                <Button onClick={onClose}>{t("tenantAdmin.billing.paymentModal.close")}</Button>
              </div>
            </div>
          ) : (
            <>
              {/* Payment Gateway Tabs */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("TRANSFER")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all cursor-pointer",
                    activeTab === "TRANSFER"
                      ? "border-brand-primary bg-[var(--color-primary-soft)] text-brand-primary shadow-2xs"
                      : "border-[var(--color-border-default)] bg-surface-card text-[var(--color-text-secondary)] hover:bg-surface-muted",
                  )}
                >
                  <QrCode className="size-4" />
                  <span>{t("tenantAdmin.billing.paymentModal.tabs.transfer")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("DOMESTIC_CARD")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all cursor-pointer",
                    activeTab === "DOMESTIC_CARD"
                      ? "border-brand-primary bg-[var(--color-primary-soft)] text-brand-primary shadow-2xs"
                      : "border-[var(--color-border-default)] bg-surface-card text-[var(--color-text-secondary)] hover:bg-surface-muted",
                  )}
                >
                  <CreditCard className="size-4" />
                  <span>{t("tenantAdmin.billing.paymentModal.tabs.domesticCard")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("INTL_CARD")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all cursor-pointer",
                    activeTab === "INTL_CARD"
                      ? "border-brand-primary bg-[var(--color-primary-soft)] text-brand-primary shadow-2xs"
                      : "border-[var(--color-border-default)] bg-surface-card text-[var(--color-text-secondary)] hover:bg-surface-muted",
                  )}
                >
                  <Globe className="size-4" />
                  <span>{t("tenantAdmin.billing.paymentModal.tabs.intlCard")}</span>
                </button>
              </div>

              {/* Tab 1: VietQR SePay */}
              {activeTab === "TRANSFER" && (
                <div className="grid gap-6 rounded-2xl border border-[var(--color-border-default)] bg-surface-card p-5 lg:grid-cols-[240px_1fr]">
                  <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-surface-muted p-4">
                    {order.qrUrl ? (
                      <>
                        <img
                          src={order.qrUrl}
                          alt={t("tenantAdmin.billing.paymentModal.transfer.qrAlt", {
                            invoiceNumber: order.invoiceNumber,
                          })}
                          className="size-48 rounded-lg border border-[var(--color-border-default)] bg-white object-contain p-2"
                        />
                        <button
                          type="button"
                          onClick={handleDownloadQr}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
                        >
                          <Download className="size-3.5" />
                          <span>{t("tenantAdmin.billing.paymentModal.transfer.downloadQr")}</span>
                        </button>
                      </>
                    ) : (
                      <div className="flex size-48 flex-col items-center justify-center rounded-lg border border-dashed border-amber-300 bg-amber-50/70 p-4 text-center text-xs text-amber-900">
                        <span className="font-semibold">
                          {t("tenantAdmin.billing.paymentModal.transfer.noQrTitle")}
                        </span>
                        <span className="mt-1 text-[11px] text-amber-700">
                          {t("tenantAdmin.billing.paymentModal.transfer.noQrDesc")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-center space-y-3 text-sm">
                    <p className="font-semibold text-[var(--color-text-primary)]">
                      {t("tenantAdmin.billing.paymentModal.transfer.heading")}
                    </p>

                    <div className="divide-y divide-[var(--color-border-default)] rounded-xl border border-[var(--color-border-default)] bg-surface-muted/60 px-4">
                      <div className="flex items-center justify-between gap-3 py-2.5">
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {t("tenantAdmin.billing.paymentModal.transfer.bankName")}
                        </span>
                        <span className="font-semibold text-[var(--color-text-primary)]">{order.bankName}</span>
                      </div>
                      {order.bankBranch && (
                        <div className="flex items-center justify-between gap-3 py-2.5">
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            {t("tenantAdmin.billing.paymentModal.transfer.bankBranch")}
                          </span>
                          <span className="font-semibold text-[var(--color-text-primary)]">{order.bankBranch}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-3 py-2.5">
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {t("tenantAdmin.billing.paymentModal.transfer.accountNumber")}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[var(--color-text-primary)]">
                            {order.accountNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              void handleCopy(
                                order.accountNumber,
                                "account",
                                t("tenantAdmin.billing.paymentModal.transfer.copyAccountLabel"),
                              )
                            }
                            className="rounded p-1 text-brand-primary hover:bg-[var(--color-primary-soft)] cursor-pointer"
                            title={t("tenantAdmin.billing.paymentModal.transfer.copyAccountTitle")}
                          >
                            {copiedField === "account" ? (
                              <Check className="size-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 py-2.5">
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {t("tenantAdmin.billing.paymentModal.transfer.accountHolder")}
                        </span>
                        <span className="font-semibold text-[var(--color-text-primary)]">{order.accountName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 py-2.5">
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {t("tenantAdmin.billing.paymentModal.transfer.exactAmount")}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-brand-primary">
                            {t("tenantAdmin.billing.paymentModal.amountVndValue", {
                              amount: formatNumber(Number(order.amountVnd || 0), undefined, locale),
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              void handleCopy(
                                String(Math.round(Number(order.amountVnd || 0))),
                                "amount",
                                t("tenantAdmin.billing.paymentModal.transfer.copyAmountLabel"),
                              )
                            }
                            className="rounded p-1 text-brand-primary hover:bg-[var(--color-primary-soft)] cursor-pointer"
                            title={t("tenantAdmin.billing.paymentModal.transfer.copyAmountTitle")}
                          >
                            {copiedField === "amount" ? (
                              <Check className="size-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 py-2.5">
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {t("tenantAdmin.billing.paymentModal.transfer.transferContent")}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[var(--color-text-primary)]">
                            {order.transferSyntax}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              void handleCopy(
                                order.transferSyntax,
                                "syntax",
                                t("tenantAdmin.billing.paymentModal.transfer.copySyntaxLabel"),
                              )
                            }
                            className="rounded p-1 text-brand-primary hover:bg-[var(--color-primary-soft)] cursor-pointer"
                            title={t("tenantAdmin.billing.paymentModal.transfer.copySyntaxTitle")}
                          >
                            {copiedField === "syntax" ? (
                              <Check className="size-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: VNPay Domestic ATM */}
              {activeTab === "DOMESTIC_CARD" && (
                <div className="rounded-2xl border border-[var(--color-border-default)] bg-surface-muted p-6 text-center space-y-4">
                  <div className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--color-primary-soft)] text-brand-primary">
                    <CreditCard className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-display text-base font-semibold text-[var(--color-text-primary)]">
                      {t("tenantAdmin.billing.paymentModal.vnpay.heading")}
                    </h4>
                    <p className="mx-auto max-w-lg text-xs text-[var(--color-text-secondary)]">
                      {t("tenantAdmin.billing.paymentModal.vnpay.description")}
                    </p>
                  </div>
                  <Button disabled={vnpayLoading} onClick={() => void handlePayWithVnPay()}>
                    {vnpayLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>{t("tenantAdmin.billing.paymentModal.vnpay.loading")}</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="size-4" />
                        <span>{t("tenantAdmin.billing.paymentModal.vnpay.button")}</span>
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Tab 3: PayPal International */}
              {activeTab === "INTL_CARD" && (
                <div className="rounded-2xl border border-[var(--color-border-default)] bg-surface-muted p-6 space-y-4">
                  <div className="text-center space-y-1">
                    <h4 className="font-display text-base font-semibold text-[var(--color-text-primary)]">
                      {t("tenantAdmin.billing.paymentModal.paypal.heading")}
                    </h4>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {t("tenantAdmin.billing.paymentModal.paypal.exchangeRatePrefix")}
                      <strong className="text-[var(--color-text-primary)]">
                        {t("tenantAdmin.billing.paymentModal.paypal.exchangeRateValue", {
                          amount: usdAmount.toFixed(2),
                        })}
                      </strong>
                    </p>
                  </div>

                  {usdAmount < 0.01 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-xs text-amber-900">
                      {t("tenantAdmin.billing.paymentModal.paypal.minAmountWarning")}
                    </div>
                  ) : (
                    <div className="mx-auto max-w-md pt-1">
                      {paypalVerifying && (
                        <div className="mb-3 flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary-soft)] px-3 py-2 text-xs font-semibold text-brand-primary">
                          <Loader2 className="size-4 animate-spin" />
                          <span>{t("tenantAdmin.billing.paymentModal.paypal.verifying")}</span>
                        </div>
                      )}
                      <PayPalScriptProvider
                        options={{
                          clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || "test",
                          currency: "USD",
                        }}
                      >
                        <PayPalButtons
                          style={{ layout: "vertical", color: "blue", shape: "rect", label: "pay" }}
                          createOrder={(_, actions) => {
                            const value = usdAmount.toFixed(2);
                            return actions.order.create({
                              intent: "CAPTURE",
                              purchase_units: [
                                {
                                  custom_id: String(order.invoiceId),
                                  invoice_id: order.invoiceNumber,
                                  amount: {
                                    currency_code: "USD",
                                    value,
                                  },
                                  description: `Order ${order.invoiceNumber}`,
                                },
                              ],
                            });
                          }}
                          onApprove={async (data, actions) => {
                            if (!actions.order) return;
                            try {
                              setPaypalVerifying(true);
                              const details = await actions.order.capture();
                              if (details.status === "COMPLETED") {
                                const res = await checkoutApi.verifyPayPalReturn(
                                  order.invoiceId,
                                  data.orderID,
                                );
                                if (res.success) {
                                  await notifyPaidSuccess(order.invoiceId, order.invoiceNumber);
                                } else {
                                  toast.error(
                                    t("tenantAdmin.billing.paymentModal.toasts.paypalFailedTitle"),
                                    res.message || t("tenantAdmin.billing.paymentModal.toasts.paypalFailedFallback"),
                                  );
                                }
                              } else {
                                toast.warning(
                                  t("tenantAdmin.billing.paymentModal.toasts.paypalIncompleteTitle"),
                                  details.status,
                                );
                              }
                            } catch (err) {
                              toast.error(
                                t("tenantAdmin.billing.paymentModal.toasts.paypalErrorTitle"),
                                getApiErrorMessage(err),
                              );
                            } finally {
                              setPaypalVerifying(false);
                            }
                          }}
                          onError={() => {
                            toast.error(
                              t("tenantAdmin.billing.paymentModal.toasts.paypalCannotPayTitle"),
                              t("tenantAdmin.billing.paymentModal.toasts.paypalCannotPayDesc"),
                            );
                          }}
                        />
                      </PayPalScriptProvider>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ) : null}
    </DetailDialog>
  );
}
