import React from "react";
import { X, ReceiptText, Loader2, Plus } from "lucide-react";
import { TenantInfo, SubscriptionPlan } from "@/api/master/masterAdminApi";

interface CreateInvoiceModalProps {
  showCreateInvoiceModal: boolean;
  setShowCreateInvoiceModal: (val: boolean) => void;
  tenants: TenantInfo[];
  plans: SubscriptionPlan[];
  invoiceTenantId: string | number;
  setInvoiceTenantId: (val: number) => void;
  invoicePlanId: string | number;
  setInvoicePlanId: (val: number | "") => void;
  invoiceAmount: number;
  setInvoiceAmount: (val: number) => void;
  invoiceCurrency: string;
  setInvoiceCurrency: (val: string) => void;
  invoicePaymentGateway: string;
  setInvoicePaymentGateway: (val: string) => void;
  invoiceNotes: string;
  setInvoiceNotes: (val: string) => void;
  creatingInvoice: boolean;
  handleCreateInvoiceSubmit: (e: React.FormEvent) => void;
}

export function CreateInvoiceModal({
  showCreateInvoiceModal,
  setShowCreateInvoiceModal,
  tenants,
  plans,
  invoiceTenantId,
  setInvoiceTenantId,
  invoicePlanId,
  setInvoicePlanId,
  invoiceAmount,
  setInvoiceAmount,
  invoiceCurrency,
  setInvoiceCurrency,
  invoicePaymentGateway,
  setInvoicePaymentGateway,
  invoiceNotes,
  setInvoiceNotes,
  creatingInvoice,
  handleCreateInvoiceSubmit,
}: CreateInvoiceModalProps) {
  if (!showCreateInvoiceModal) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setShowCreateInvoiceModal(false)}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-200">
            <ReceiptText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Lập Hóa Đơn B2B Cho Doanh Nghiệp</h3>
            <span className="text-xs text-slate-500">Phát hành hóa đơn định kỳ & ghi nhận thanh toán</span>
          </div>
        </div>

        <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Khách Hàng Doanh Nghiệp (Tenant) *</label>
            <select
              required
              value={invoiceTenantId}
              onChange={(e) => setInvoiceTenantId(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-semibold text-slate-800 focus:outline-none focus:border-blue-600 bg-white"
            >
              <option value="">-- Chọn doanh nghiệp nhận hóa đơn --</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code} - {t.subdomain}.smarthire.top)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Gói Dịch Vụ Cần Thu Phí / Gia Hạn</label>
            <select
              value={invoicePlanId}
              onChange={(e) => {
                const planIdVal = e.target.value ? Number(e.target.value) : "";
                setInvoicePlanId(planIdVal);
                const selectedP = plans.find((p) => String(p.id) === String(planIdVal));
                if (selectedP) {
                  setInvoiceAmount(selectedP.priceYearly || 3990);
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-blue-600 bg-white"
            >
              <option value="">-- Chọn gói cước (hoặc Tùy biến) --</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - ${p.priceMonthly}/tháng (${p.priceYearly}/năm)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Số Tiền Thanh Toán *</label>
              <input
                type="number"
                required
                min={1}
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Loại Tiền Tệ</label>
              <select
                value={invoiceCurrency}
                onChange={(e) => setInvoiceCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-bold text-slate-800 focus:outline-none focus:border-blue-600 bg-white"
              >
                <option value="USD">USD ($)</option>
                <option value="VND">VND (₫)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Hình Thức Thanh Toán</label>
            <select
              value={invoicePaymentGateway}
              onChange={(e) => setInvoicePaymentGateway(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-blue-600 bg-white"
            >
              <option value="BANK_TRANSFER">Chuyển khoản Ngân hàng Doanh nghiệp (Ủy nhiệm chi / Invoice B2B)</option>
              <option value="STRIPE">Thẻ Tín Dụng Quốc Tế (Stripe Corporate Card)</option>
              <option value="VN_PAY">Cổng VNPAY / VietQR Doanh Nghiệp</option>
              <option value="MANUAL">Thanh toán Trực tiếp / Ký Hợp Đồng</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ghi Chú Hóa Đơn / Điều Khoản Hợp Đồng</label>
            <textarea
              rows={3}
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
              placeholder="VD: Hợp đồng B2B gói Enterprise 12 tháng, triển khai Dedicated DB và hỗ trợ 24/7..."
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 resize-none"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setShowCreateInvoiceModal(false)}
              className="w-1/2 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={creatingInvoice}
              className="w-1/2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
            >
              {creatingInvoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Phát Hành Hóa Đơn</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
