import { X, ReceiptText, Check } from "lucide-react";
import { InvoiceItem } from "@/api/master/billingApi";

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
  if (!selectedInvoice) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setSelectedInvoice(null)}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-200">
            <ReceiptText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Chi Tiết Hóa Đơn B2B</h3>
            <span className="text-xs text-blue-600 font-mono font-bold">{selectedInvoice.invoiceNumber}</span>
          </div>
        </div>

        <div className="bg-slate-50 p-5 rounded-xl space-y-3 border border-slate-200 text-xs mb-5">
          <div className="flex justify-between pb-2 border-b border-slate-200/70">
            <span className="text-slate-500">Khách Hàng:</span>
            <span className="font-bold text-slate-900 text-right">{selectedInvoice.tenantName || `Tenant #${selectedInvoice.tenantId}`}</span>
          </div>

          <div className="flex justify-between pb-2 border-b border-slate-200/70">
            <span className="text-slate-500">Mã Tenant & Subdomain:</span>
            <span className="font-mono text-slate-700">{selectedInvoice.tenantCode || "code"} ({selectedInvoice.tenantSubdomain || "sub"}.smarthire.top)</span>
          </div>

          {selectedInvoice.billingLegalName && (
            <div className="flex justify-between pb-2 border-b border-slate-200/70">
              <span className="text-slate-500">Tên Pháp Nhân:</span>
              <span className="font-semibold text-slate-800 text-right">{selectedInvoice.billingLegalName}</span>
            </div>
          )}

          {selectedInvoice.billingTaxCode && (
            <div className="flex justify-between pb-2 border-b border-slate-200/70">
              <span className="text-slate-500">Mã Số Thuế (MST):</span>
              <span className="font-mono text-slate-800">{selectedInvoice.billingTaxCode}</span>
            </div>
          )}

          {selectedInvoice.billingAddress && (
            <div className="flex justify-between pb-2 border-b border-slate-200/70">
              <span className="text-slate-500">Địa Chỉ Thuế:</span>
              <span className="text-slate-800 text-right max-w-xs">{selectedInvoice.billingAddress}</span>
            </div>
          )}

          <div className="flex justify-between pb-2 border-b border-slate-200/70">
            <span className="text-slate-500">Gói Dịch Vụ:</span>
            <span className="font-semibold text-blue-700">{selectedInvoice.planName || "Gói Tùy Biến"}</span>
          </div>

          <div className="flex justify-between pb-2 border-b border-slate-200/70">
            <span className="text-slate-500">Kỳ Hạn Thuê Bao:</span>
            <span className="text-slate-700">
              {selectedInvoice.billingPeriodStart && selectedInvoice.billingPeriodEnd
                ? `${selectedInvoice.billingPeriodStart} → ${selectedInvoice.billingPeriodEnd}`
                : "12 tháng kể từ ngày kích hoạt"}
            </span>
          </div>

          <div className="flex justify-between pb-2 border-b border-slate-200/70">
            <span className="text-slate-500">Phương Thức Thanh Toán:</span>
            <span className="font-semibold text-slate-800">
              {selectedInvoice.paymentGateway === "BANK_TRANSFER"
                ? "Chuyển khoản Ngân hàng Doanh nghiệp"
                : selectedInvoice.paymentGateway === "STRIPE"
                ? "Thẻ Tín Dụng Quốc Tế (Stripe)"
                : selectedInvoice.paymentGateway || "Trực tiếp"}
            </span>
          </div>

          {selectedInvoice.transactionId && (
            <div className="flex justify-between pb-2 border-b border-slate-200/70">
              <span className="text-slate-500">Mã Giao Dịch:</span>
              <span className="font-mono text-blue-600 font-bold">{selectedInvoice.transactionId}</span>
            </div>
          )}

          <div className="flex justify-between pb-2 border-b border-slate-200/70">
            <span className="text-slate-500">Trạng Thái Thanh Toán:</span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                selectedInvoice.status === "PAID"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : selectedInvoice.status === "PENDING"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {selectedInvoice.status}
            </span>
          </div>

          {selectedInvoice.lineItems && selectedInvoice.lineItems.length > 0 && (
            <div className="pt-3 border-b border-slate-200/70 pb-3">
              <span className="text-slate-500 font-bold mb-2 block uppercase text-[10px]">Chi tiết hạng mục:</span>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="py-1.5 px-2.5 font-semibold border-b border-slate-200">Hạng mục</th>
                      <th className="py-1.5 px-2.5 font-semibold border-b border-slate-200 text-right">SL</th>
                      <th className="py-1.5 px-2.5 font-semibold border-b border-slate-200 text-right">Đơn giá</th>
                      <th className="py-1.5 px-2.5 font-semibold border-b border-slate-200 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {selectedInvoice.lineItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-1.5 px-2.5 text-slate-800 font-medium">{item.description}</td>
                        <td className="py-1.5 px-2.5 text-right font-mono text-slate-600">{item.quantity}</td>
                        <td className="py-1.5 px-2.5 text-right font-mono text-slate-600">${item.unitPrice.toLocaleString()}</td>
                        <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-slate-800">${item.totalPrice?.toLocaleString() || (item.quantity * item.unitPrice).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-1 text-sm font-bold text-slate-900">
            <span>Tổng Tiền Thanh Toán:</span>
            <span className="font-mono text-emerald-600 text-base">${selectedInvoice.amount.toLocaleString()} {selectedInvoice.currency}</span>
          </div>

          {selectedInvoice.notes && (
            <div className="pt-2 border-t border-slate-200/70">
              <span className="text-slate-500 block mb-1">Ghi chú hóa đơn:</span>
              <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">{selectedInvoice.notes}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={() => setSelectedInvoice(null)}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
          >
            Đóng
          </button>

          {selectedInvoice.status !== "PAID" && (
            <button
              onClick={() => handleMarkInvoicePaid(selectedInvoice)}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>Xác Nhận Đã Thanh Toán & Kích Hoạt</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
