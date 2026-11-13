import { createPortal } from "react-dom";
import { X, Check, Building2, CreditCard, Receipt } from "lucide-react";
import { InvoiceItem } from "@/api/master/billingApi";
import { formatDate, formatDateTime, formatSimpleDateTime, formatNumber, useLocale, useT } from "@/i18n";

interface InvoiceDetailModalProps {
  selectedInvoice: InvoiceItem | null;
  setSelectedInvoice: (val: InvoiceItem | null) => void;
  handleMarkInvoicePaid: (invoice: InvoiceItem) => void;
}

export function InvoiceDetailModal({
  selectedInvoice,
  setSelectedInvoice,
  handleMarkInvoicePaid,
}: InvoiceDetailModalProps) {
  const t = useT();
  const locale = useLocale();

  if (!selectedInvoice) return null;

  const statusLabels: Record<string, string> = {
    PAID: t("master.commerce.billingWorkspace.invoiceStatus.PAID"),
    PENDING: t("master.commerce.billingWorkspace.invoiceStatus.PENDING"),
    OVERDUE: t("master.commerce.billingWorkspace.invoiceStatus.OVERDUE"),
    CANCELLED: t("master.commerce.billingWorkspace.invoiceStatus.CANCELLED"),
  };

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        onClick={() => setSelectedInvoice(null)}
        aria-label={t("master.commerce.common.close")}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t("master.commerce.invoiceDetailModal.title")}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-xl sm:max-w-2xl overflow-y-auto bg-slate-50 p-6 shadow-2xl flex flex-col justify-between"
      >
        <div>
          <div className="flex items-start justify-between border-b border-slate-200 bg-white -mx-6 -mt-6 px-6 pt-3 pb-3 mb-4 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                {t("master.commerce.invoiceDetailModal.title")}
              </h2>
              {selectedInvoice.tenantName && (
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  {selectedInvoice.tenantName}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {selectedInvoice.invoiceNumber}
              </span>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="grid size-8 place-items-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                aria-label={t("master.commerce.common.close")}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Section 1: Customer Profile */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="flex items-center gap-2.5 font-bold text-slate-800 mb-4 text-xs uppercase tracking-wider">
                <span className="grid size-7 place-items-center rounded-lg bg-slate-100 text-slate-700">
                  <Building2 className="size-4" />
                </span>
                <span>{t("master.commerce.invoicesPage.colCustomer")}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-1">{t("master.commerce.invoiceDetailModal.customerLabel")}</span>
                  <strong className="font-semibold text-slate-800 text-sm">
                    {selectedInvoice.tenantName || t("master.commerce.invoiceDetailModal.tenantFallback", { id: selectedInvoice.tenantId })}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">{t("master.commerce.invoiceDetailModal.tenantCodeSubLabel")}</span>
                  <strong className="font-medium text-slate-700 text-sm">
                    {selectedInvoice.tenantCode || "code"} ({selectedInvoice.tenantSubdomain || "sub"}.smarthire.top)
                  </strong>
                </div>
                {selectedInvoice.billingLegalName && (
                  <div>
                    <span className="text-slate-500 block mb-1">{t("master.commerce.invoiceDetailModal.legalNameLabel")}</span>
                    <strong className="font-medium text-slate-800">{selectedInvoice.billingLegalName}</strong>
                  </div>
                )}
                {selectedInvoice.billingTaxCode && (
                  <div>
                    <span className="text-slate-500 block mb-1">{t("master.commerce.invoiceDetailModal.taxCodeLabel")}</span>
                    <strong className="font-medium text-slate-800">{selectedInvoice.billingTaxCode}</strong>
                  </div>
                )}
                {selectedInvoice.billingAddress && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block mb-1">{t("master.commerce.invoiceDetailModal.billingAddressLabel")}</span>
                    <strong className="font-medium text-slate-800">{selectedInvoice.billingAddress}</strong>
                  </div>
                )}
              </div>
            </section>

            {/* Section 2: Subscription & Payment Details */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <h3 className="flex items-center gap-2.5 font-bold text-slate-800 text-xs uppercase tracking-wider">
                <span className="grid size-7 place-items-center rounded-lg bg-slate-100 text-slate-700">
                  <CreditCard className="size-4" />
                </span>
                <span>{t("master.commerce.invoiceDetailModal.title")}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-1">{t("master.commerce.invoiceDetailModal.planLabel")}</span>
                  <strong className="font-semibold text-slate-700 text-sm">
                    {selectedInvoice.planName || t("master.commerce.invoiceDetailModal.customPlanFallback")}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">{t("master.commerce.invoiceDetailModal.periodLabel")}</span>
                  <strong className="font-medium text-slate-700 text-sm">
                    {selectedInvoice.billingPeriodStart && selectedInvoice.billingPeriodEnd
                      ? `${formatSimpleDateTime(selectedInvoice.billingPeriodStart)} → ${formatSimpleDateTime(selectedInvoice.billingPeriodEnd)}`
                      : t("master.commerce.invoiceDetailModal.periodFallback")}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">{t("master.commerce.invoiceDetailModal.paymentMethodLabel")}</span>
                  <strong className="font-semibold text-slate-800 text-sm">
                    {selectedInvoice.paymentGateway === "BANK_TRANSFER"
                      ? t("master.commerce.invoiceDetailModal.gatewayBank")
                      : selectedInvoice.paymentGateway === "STRIPE"
                      ? t("master.commerce.invoiceDetailModal.gatewayStripe")
                      : selectedInvoice.paymentGateway === "VN_PAY"
                      ? t("master.commerce.invoiceDetailModal.gatewayVnPay")
                      : selectedInvoice.paymentGateway || t("master.commerce.invoiceDetailModal.gatewayDirect")}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">{t("master.commerce.invoicesPage.colDueDate")}</span>
                  <strong className="font-medium text-slate-700 text-sm">
                    {selectedInvoice.dueDate ? formatDate(selectedInvoice.dueDate, undefined, locale) : "—"}
                  </strong>
                </div>
                {selectedInvoice.transactionId && (
                  <div>
                    <span className="text-slate-500 block mb-1">{t("master.commerce.invoiceDetailModal.transactionIdLabel")}</span>
                    <strong className="font-bold text-slate-600 text-sm">{selectedInvoice.transactionId}</strong>
                  </div>
                )}
                {selectedInvoice.paidAt && (
                  <div>
                    <span className="text-slate-500 block mb-1">{t("master.commerce.invoicesPage.kpiPaidTitle")}</span>
                    <strong className="font-semibold text-emerald-700 text-sm">{formatDateTime(selectedInvoice.paidAt, undefined, locale)}</strong>
                  </div>
                )}
                {selectedInvoice.termsAccepted && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block mb-1">{t("master.commerce.invoiceDetailModal.termsLabel")}</span>
                    <strong className="font-medium text-emerald-700">
                      {t("master.commerce.invoiceDetailModal.termsAcceptedValue", { version: selectedInvoice.termsVersion || "v2026.10" })}
                      {selectedInvoice.termsAcceptedAt ? ` · ${formatDateTime(selectedInvoice.termsAcceptedAt, undefined, locale)}` : ""}
                    </strong>
                  </div>
                )}
              </div>
            </section>

            {/* Section 3: Line Items */}
            {selectedInvoice.lineItems && selectedInvoice.lineItems.length > 0 && (
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="flex items-center gap-2.5 text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">
                  <span className="grid size-6 place-items-center rounded-md bg-slate-100 text-slate-700">
                    <Receipt className="size-3.5" />
                  </span>
                  <span>{t("master.commerce.invoiceDetailModal.lineItemsTitle")}</span>
                </h3>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">{t("master.commerce.invoiceDetailModal.colItem")}</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">{t("master.commerce.invoiceDetailModal.colQty")}</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">{t("master.commerce.invoiceDetailModal.colUnitPrice")}</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">{t("master.commerce.invoiceDetailModal.colTotal")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {selectedInvoice.lineItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-slate-800 font-medium">{item.description}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600 font-medium whitespace-nowrap">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600 font-medium whitespace-nowrap">{formatNumber(item.unitPrice, undefined, locale)}&nbsp;₫</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-800 whitespace-nowrap">{formatNumber(item.totalPrice ?? (item.quantity * item.unitPrice), undefined, locale)}&nbsp;₫</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Section 4: Total & Notes */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200/80 p-4">
                <span className="font-bold text-slate-800 text-xs sm:text-sm uppercase tracking-wider">{t("master.commerce.invoiceDetailModal.totalAmountLabel")}</span>
                <div className="text-right">
                  <span className="font-bold text-emerald-600 text-lg sm:text-xl block whitespace-nowrap">
                    {formatNumber(selectedInvoice.amount, undefined, locale)}&nbsp;₫
                  </span>
                  <div className="mt-1 flex justify-end">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        selectedInvoice.status === "PAID"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : selectedInvoice.status === "PENDING"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : selectedInvoice.status === "OVERDUE"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-slate-100 text-slate-600 border border-slate-300"
                      }`}
                    >
                      {statusLabels[selectedInvoice.status] ?? selectedInvoice.status}
                    </span>
                  </div>
                </div>
              </div>
              {selectedInvoice.notes && (
                <div className="pt-2 border-t border-slate-200/80">
                  <span className="text-slate-500 block mb-1 text-xs">{t("master.commerce.invoiceDetailModal.notesLabel")}</span>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs leading-relaxed">{selectedInvoice.notes}</p>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setSelectedInvoice(null)}
            className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors shadow-2xs"
          >
            {t("master.commerce.common.close")}
          </button>

          {selectedInvoice.status === "PENDING" && (
            <button
              type="button"
              onClick={() => handleMarkInvoicePaid(selectedInvoice)}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Check className="size-4" />
              <span>{t("master.commerce.invoiceDetailModal.confirmPaidBtn")}</span>
            </button>
          )}
        </div>
      </aside>
    </>,
    document.body
  );
}
