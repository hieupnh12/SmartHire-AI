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
      "Thanh toán thành công",
      `Hóa đơn #${invoiceNumber} đã được xác nhận. Gói dịch vụ và hạn mức đã được cập nhật.`,
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
          toast.warning("Hóa đơn đã bị hủy", `Hóa đơn #${order.invoiceNumber} không còn hiệu lực thanh toán.`);
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
      toast.success(`Đã sao chép ${label}`);
      window.setTimeout(() => {
        setCopiedField((cur) => (cur === fieldKey ? null : cur));
      }, 1800);
    } catch {
      toast.error("Không thể sao chép vào clipboard");
    }
  };

  const handleDownloadQr = async () => {
    if (!order) return;
    const qrSource = order.qrUrl || "/sepay_qr.png";
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
      toast.success("Đã tải mã QR thanh toán");
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
        toast.error("Không nhận được đường dẫn thanh toán từ cổng VNPay");
      }
    } catch (err) {
      toast.error("Không thể kết nối cổng VNPay", getApiErrorMessage(err));
    } finally {
      setVnpayLoading(false);
    }
  };

  const usdAmount = order ? Number((Number(order.amountVnd || 0) / 25000).toFixed(2)) : 0;

  return (
    <DetailDialog
      open={Boolean(invoiceId)}
      size="wide"
      title={order ? `Thanh toán hóa đơn #${order.invoiceNumber}` : "Thanh toán hóa đơn dịch vụ"}
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
            Thử lại
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
                    {formatInvoiceTypeLabel(invoiceType)}
                  </span>
                  <StatusPill status={order.status} label={formatInvoiceStatusLabel(order.status)} />
                </div>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Gói áp dụng: <strong className="text-[var(--color-text-primary)]">{formatPlanDisplayName(order.planName)}</strong>
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-[var(--color-text-secondary)]">Số tiền cần thanh toán</p>
                <p className="font-display text-2xl font-bold text-brand-primary">
                  {Number(order.amountVnd || 0).toLocaleString("vi-VN")} ₫
                </p>
              </div>
            </div>
          </div>

          {order.status === "PAID" ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center space-y-3">
              <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
              <h3 className="text-lg font-bold text-emerald-950">Hóa đơn đã được thanh toán hoàn tất</h3>
              <p className="text-sm text-emerald-800">
                Gói dịch vụ và hạn mức mới đã có hiệu lực cho doanh nghiệp của bạn.
              </p>
              <div className="pt-2">
                <Button onClick={onClose}>Đóng</Button>
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
                  <span>VietQR / Chuyển khoản</span>
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
                  <span>Thẻ ATM (VNPay)</span>
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
                  <span>Thẻ quốc tế / PayPal</span>
                </button>
              </div>

              {/* Tab 1: VietQR SePay */}
              {activeTab === "TRANSFER" && (
                <div className="grid gap-6 rounded-2xl border border-[var(--color-border-default)] bg-surface-card p-5 lg:grid-cols-[240px_1fr]">
                  <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-surface-muted p-4">
                    <img
                      src={order.qrUrl || "/sepay_qr.png"}
                      alt={`VietQR ${order.invoiceNumber}`}
                      className="size-48 rounded-lg border border-[var(--color-border-default)] bg-white object-contain p-2"
                    />
                    <button
                      type="button"
                      onClick={handleDownloadQr}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
                    >
                      <Download className="size-3.5" />
                      <span>Tải mã VietQR</span>
                    </button>
                  </div>

                  <div className="flex flex-col justify-center space-y-3 text-sm">
                    <p className="font-semibold text-[var(--color-text-primary)]">
                      Thông tin chuyển khoản ngân hàng
                    </p>

                    <div className="divide-y divide-[var(--color-border-default)] rounded-xl border border-[var(--color-border-default)] bg-surface-muted/60 px-4">
                      <div className="flex items-center justify-between gap-3 py-2.5">
                        <span className="text-xs text-[var(--color-text-secondary)]">Ngân hàng</span>
                        <span className="font-semibold text-[var(--color-text-primary)]">{order.bankName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 py-2.5">
                        <span className="text-xs text-[var(--color-text-secondary)]">Số tài khoản</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[var(--color-text-primary)]">
                            {order.accountNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleCopy(order.accountNumber, "account", "số tài khoản")}
                            className="rounded p-1 text-brand-primary hover:bg-[var(--color-primary-soft)] cursor-pointer"
                            title="Sao chép số tài khoản"
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
                        <span className="text-xs text-[var(--color-text-secondary)]">Chủ tài khoản</span>
                        <span className="font-semibold text-[var(--color-text-primary)]">{order.accountName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 py-2.5">
                        <span className="text-xs text-[var(--color-text-secondary)]">Số tiền chính xác</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-brand-primary">
                            {Number(order.amountVnd || 0).toLocaleString("vi-VN")} ₫
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              void handleCopy(String(Math.round(Number(order.amountVnd || 0))), "amount", "số tiền")
                            }
                            className="rounded p-1 text-brand-primary hover:bg-[var(--color-primary-soft)] cursor-pointer"
                            title="Sao chép số tiền"
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
                        <span className="text-xs text-[var(--color-text-secondary)]">Nội dung chuyển khoản</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[var(--color-text-primary)]">
                            {order.transferSyntax}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              void handleCopy(order.transferSyntax, "syntax", "nội dung chuyển khoản")
                            }
                            className="rounded p-1 text-brand-primary hover:bg-[var(--color-primary-soft)] cursor-pointer"
                            title="Sao chép nội dung"
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
                      Thanh toán qua cổng VNPay (Thẻ ATM nội địa / Napas / QR Bank)
                    </h4>
                    <p className="mx-auto max-w-lg text-xs text-[var(--color-text-secondary)]">
                      Hệ thống sẽ chuyển hướng an toàn sang cổng thanh toán VNPay và quay lại trang quản lý Gói &amp; Hóa đơn ngay khi giao dịch hoàn tất.
                    </p>
                  </div>
                  <Button disabled={vnpayLoading} onClick={() => void handlePayWithVnPay()}>
                    {vnpayLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Đang tạo liên kết VNPay...</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="size-4" />
                        <span>Tiến hành thanh toán VNPay</span>
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
                      Thanh toán thẻ quốc tế / PayPal (Visa, Mastercard, JCB)
                    </h4>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Quy đổi tham chiếu theo tỷ giá 25.000 VNĐ/USD:{" "}
                      <strong className="text-[var(--color-text-primary)]">
                        ${usdAmount.toFixed(2)} USD
                      </strong>
                    </p>
                  </div>

                  {usdAmount < 0.01 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-xs text-amber-900">
                      Giá trị quy đổi nhỏ hơn mức tối thiểu $0.01 USD của PayPal. Vui lòng sử dụng VietQR hoặc VNPay.
                    </div>
                  ) : (
                    <div className="mx-auto max-w-md pt-1">
                      {paypalVerifying && (
                        <div className="mb-3 flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary-soft)] px-3 py-2 text-xs font-semibold text-brand-primary">
                          <Loader2 className="size-4 animate-spin" />
                          <span>Đang xác thực giao dịch PayPal với hệ thống...</span>
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
                                    "Xác thực PayPal thất bại",
                                    res.message || "Vui lòng liên hệ hỗ trợ.",
                                  );
                                }
                              } else {
                                toast.warning("Giao dịch PayPal chưa hoàn tất", details.status);
                              }
                            } catch (err) {
                              toast.error("Lỗi xác thực PayPal", getApiErrorMessage(err));
                            } finally {
                              setPaypalVerifying(false);
                            }
                          }}
                          onError={() => {
                            toast.error(
                              "Không thể thực hiện thanh toán PayPal",
                              "Vui lòng thử lại hoặc chuyển sang VietQR / VNPay.",
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
