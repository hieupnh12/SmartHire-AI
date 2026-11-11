import { X, ReceiptText, Check } from "lucide-react";
import { InvoiceItem } from "@/api/master/billingApi";
import { formatDateTime, formatNumber, useLocale, useT } from "@/i18n";

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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setSelectedInvoice(null)}
          aria-label={t("master.commerce.common.close")}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-200">
            <ReceiptText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{t("master.commerce.invoiceDetailModal.title")}</h3>
            <span className="text-xs text-blue-600 font-mono font-bold">{selectedInvoice.invoiceNumber}</span>
          </div>
        </div>

        <div className="bg-slate-50 p-5 rounded-xl space-y-3 border border-slate-200 text-xs mb-5">
          <div className="flex justify-between pb-2 border-b border-slate-200/70">
            <span className="text-slate-500">{t("master.commerce.invoiceDetailModal.customerLabel")}</span>
            <span className="font-bold text-slate-900 text-right">
              {selectedInvoice.tenantName || t("master.commerce.invoiceDetailModal.tenantFallback", { id: selectedInvoice.tenantId })}
            </span>
          </div>

          <div className="flex justify-between pb-2 border-b border-slate-200/70">
            <span className="text-slate-500">{t("master.commerce.invoiceDetailModal.tenantCodeSubLabel")}</span>
            <span className="font-mono text-slate-700">{selectedInvoice.tenantCode || "code"} ({selectedInvoice.tenantSubdomain || "sub"}.smarthire.top)</span>
          </div>

          {selectedInvoice.billingLegalName && (
            <div className="flex justify-between pb-2 border-b border-slate-200/70">
              <span className="text-slate-500">{t("master.commerce.invoiceDetailModal.legalNameLabel")}</span>
              <span className="font-semibold text-slate-800 text-right">{selectedInvoice.billingLegalName}</span>
            </div>
          )}

          {selectedInvoice.billingTaxCode && (
            <div className="flex justify-between pb-2 border-b border-slate-200/70">
              <span className="text-slate-500">{t("master.commerce.invoiceDetailModal.taxCodeLabel")}</span>
              <span className="font-mono text-slate-800">{selectedInvoice.billingTaxCode}</span>
            </div>
          )}

          {selectedInvoice.billingAddress && (
            <div className="flex justify-between pb-2 border-b border-slate-200/70">
              <span className="text-slate-500">{t("master.commerce.invoiceDetailModal.billingAddressLabel")}</span>
              <span className="text-slate-800 text-right max-w-xs">{selectedInvoice.billingAddress}</span>
            </div>
          )}

          <div className="flex justify-between pb-2 border-b border-slate-200/70">
            <span className="text-slate-500">{t("master.commerce.invoiceDetailModal.planLabel")}</span>
            <span className="font-semibold text-blue-700">{selectedInvoice.planName || t("master.commerce.invoiceDetailModal.customPlanFallback")}</span>
          </div>

          <div className="flex justify-between pb-2 border-b border-slate-200/70">
            <span className="text-slate-500">{t("master.commerce.invoiceDetailModal.periodLabel")}</span>
            <span className="text-slate-700">
              {selectedInvoice.billingPeriodStart && selectedInvoice.billingPeriodEnd
                ? `${selectedInvoice.billingPeriodStart} → ${selectedInvoice.billingPeriodEnd}`
                : t("master.commerce.invoiceDetailModal.periodFallback")}
            </span>
          </div>

          <div className="flex justify-between pb-2 border-b border-slate-200/70">
            <span className="text-slate-500">{t("master.commerce.invoiceDetailModal.paymentMethodLabel")}</span>
            <span className="font-semibold text-slate-800">
              {selectedInvoice.paymentGateway === "BANK_TRANSFER"
                ? t("master.commerce.invoiceDetailModal.gatewayBank")
                : selectedInvoice.paymentGateway === "STRIPE"
                ? t("master.commerce.invoiceDetailModal.gatewayStripe")
                : selectedInvoice.paymentGateway === "VN_PAY"
                ? t("master.commerce.invoiceDetailModal.gatewayVnPay")
                : selectedInvoice.paymentGateway || t("master.commerce.invoiceDetailModal.gatewayDirect")}
            </span>
          </div>

          {selectedInvoice.transactionId && (
            <div className="flex justify-between pb-2 border-b border-slate-200/70">
              <span className="text-slate-500">{t("master.commerce.invoiceDetailModal.transactionIdLabel")}</span>
              <span className="font-mono text-blue-600 font-bold">{selectedInvoice.transactionId}</span>
            </div>
          )}

          <div className="flex justify-between pb-2 border-b border-slate-200/70">
            <span className="text-slate-500">{t("master.commerce.invoiceDetailModal.statusLabel")}</span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                selectedInvoice.status === "PAID"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : selectedInvoice.status === "PENDING"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {statusLabels[selectedInvoice.status] ?? selectedInvoice.status}
            </span>
          </div>

          {selectedInvoice.termsAccepted && (
            <div className="flex justify-between pb-2 border-b border-slate-200/70">
              <span className="text-slate-500">{t("master.commerce.invoiceDetailModal.termsLabel")}</span>
              <span className="font-semibold text-emerald-700 text-right">
                {t("master.commerce.invoiceDetailModal.termsAcceptedValue", { version: selectedInvoice.termsVersion || "v2026.10" })}
                {selectedInvoice.termsAcceptedAt ? ` · ${formatDateTime(selectedInvoice.termsAcceptedAt, undefined, locale)}` : ""}
              </span>
            </div>
          )}

          {selectedInvoice.lineItems && selectedInvoice.lineItems.length > 0 && (
            <div className="pt-3 border-b border-slate-200/70 pb-3">
              <span className="text-slate-500 font-bold mb-2 block uppercase text-[10px]">{t("master.commerce.invoiceDetailModal.lineItemsTitle")}</span>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="py-1.5 px-2.5 font-semibold border-b border-slate-200">{t("master.commerce.invoiceDetailModal.colItem")}</th>
                      <th className="py-1.5 px-2.5 font-semibold border-b border-slate-200 text-right">{t("master.commerce.invoiceDetailModal.colQty")}</th>
                      <th className="py-1.5 px-2.5 font-semibold border-b border-slate-200 text-right">{t("master.commerce.invoiceDetailModal.colUnitPrice")}</th>
                      <th className="py-1.5 px-2.5 font-semibold border-b border-slate-200 text-right">{t("master.commerce.invoiceDetailModal.colTotal")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {selectedInvoice.lineItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-1.5 px-2.5 text-slate-800 font-medium">{item.description}</td>
                        <td className="py-1.5 px-2.5 text-right font-mono text-slate-600">{item.quantity}</td>
                        <td className="py-1.5 px-2.5 text-right font-mono text-slate-600">{formatNumber(item.unitPrice, undefined, locale)} ₫</td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-slate-800">{formatNumber(item.totalPrice ?? (item.quantity * item.unitPrice), undefined, locale)} ₫</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-1 text-sm font-bold text-slate-900">
            <span>{t("master.commerce.invoiceDetailModal.totalAmountLabel")}</span>
            <span className="font-mono text-emerald-600 text-base">{formatNumber(selectedInvoice.amount, undefined, locale)} ₫</span>
          </div>

          {selectedInvoice.notes && (
            <div className="pt-2 border-t border-slate-200/70">
              <span className="text-slate-500 block mb-1">{t("master.commerce.invoiceDetailModal.notesLabel")}</span>
              <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">{selectedInvoice.notes}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={() => setSelectedInvoice(null)}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
          >
            {t("master.commerce.common.close")}
          </button>

          {selectedInvoice.status !== "PAID" && (
            <button
              onClick={() => handleMarkInvoicePaid(selectedInvoice)}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>{t("master.commerce.invoiceDetailModal.confirmPaidBtn")}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
