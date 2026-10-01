import { useState, useMemo, useEffect } from "react";
import { Plus, Search, Filter, CheckCircle2, Clock, XCircle, Eye, Check, Inbox, Loader2 } from "lucide-react";
import { InvoiceItem, billingApi } from "@/api/master/billingApi";
import { useTenants, useSubscriptions, useRevenueAnalytics, useAiQuotaUsage, useAuditLogs, useLeads, useInvoices, useContracts, masterQueryKeys } from "@/api/master/queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";
import { HeaderActions } from "@/features/master/shell/HeaderActions";

interface InvoicesTabProps {
  setInvoiceTenantId: (val: number | "") => void;
  setInvoicePlanId: (val: number | "") => void;
  setInvoiceAmount: (val: number) => void;
  setInvoiceNotes: (val: string) => void;
  setShowCreateInvoiceModal: (val: boolean) => void;
  setSelectedInvoice: (val: InvoiceItem | null) => void;
}

function InvoicesContent({
  setInvoiceTenantId,
  setInvoicePlanId,
  setInvoiceAmount,
  setInvoiceNotes,
  setShowCreateInvoiceModal,
  setSelectedInvoice,
}: InvoicesTabProps) {
  const queryClient = useQueryClient();
  const { data: tenants = [] } = useTenants();
  const { data: plans = [] } = useSubscriptions();
  const { data: invoices = [] } = useInvoices();
  const setInvoices = (updater: any) => queryClient.setQueryData(masterQueryKeys.invoices(), updater);
  const triggerNotification = (msg: string) => toast.success(msg);

  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("ALL");
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredInvoices = useMemo(() => {
    return invoices.filter((i) => {
      const q = invoiceSearch.toLowerCase();
      const matchSearch =
        i.invoiceNumber.toLowerCase().includes(q) ||
        (i.tenantName && i.tenantName.toLowerCase().includes(q)) ||
        (i.tenantCode && i.tenantCode.toLowerCase().includes(q)) ||
        (i.planName && i.planName.toLowerCase().includes(q));
      const matchStatus = invoiceStatusFilter === "ALL" || i.status === invoiceStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, invoiceSearch, invoiceStatusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [invoiceSearch, invoiceStatusFilter]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalPaidAmount = useMemo(() => {
    return invoices.filter((i) => i.status === "PAID").reduce((sum, i) => sum + i.amount, 0);
  }, [invoices]);

  const pendingInvoiceAmount = useMemo(() => {
    return invoices.filter((i) => i.status === "PENDING").reduce((sum, i) => sum + i.amount, 0);
  }, [invoices]);

  const overdueInvoiceCount = useMemo(() => {
    return invoices.filter((i) => i.status === "OVERDUE").length;
  }, [invoices]);

  const handleMarkInvoicePaid = async (inv: InvoiceItem) => {
    if (!window.confirm(`Xác nhận duyệt thanh toán cho Hóa đơn ${inv.invoiceNumber}?\n\nNếu đây là đơn đăng ký mới, hệ thống sẽ tự động cấp phát Database MySQL riêng và gửi email kích hoạt.`)) {
      return;
    }
    setApprovingId(inv.id);
    try {
      const updated = await billingApi.approve(inv.id);
      setInvoices((prev) => prev.map((i) => (i.id === inv.id ? updated : i)));
      triggerNotification(`Đã duyệt thanh toán và kích hoạt Workspace cho Hóa đơn ${inv.invoiceNumber}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Đã xảy ra lỗi khi duyệt hóa đơn và kích hoạt Workspace.";
      alert(msg);
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <HeaderActions>
        <button
          onClick={() => {
            setInvoiceTenantId(tenants[0]?.id || "");
            const defaultPlan = plans[0];
            if (defaultPlan) {
              setInvoicePlanId(defaultPlan.id || "");
              setInvoiceAmount(defaultPlan.priceYearly || 36000000);
            }
            setInvoiceNotes("");
            setShowCreateInvoiceModal(true);
          }}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700"
        >
          <Plus className="size-3.5" />
          <span>Lập Hóa Đơn Mới</span>
        </button>
      </HeaderActions>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">Tổng Doanh Thu Đã Thu</span>
          <span className="text-lg font-extrabold text-emerald-600">
            ${totalPaidAmount.toLocaleString()} <span className="text-[10px] font-medium text-slate-500">USD</span>
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Từ các hóa đơn đã thanh toán</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">Công Nợ Chờ Thu (Pending)</span>
          <span className="text-lg font-extrabold text-amber-600">
            ${pendingInvoiceAmount.toLocaleString()} <span className="text-[10px] font-medium text-slate-500">USD</span>
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Chờ đối soát chuyển khoản ngân hàng</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">Hóa Đơn Chờ Thanh Toán</span>
          <span className="text-lg font-extrabold text-blue-600">
            {invoices.filter((i) => i.status === "PENDING").length} <span className="text-[10px] font-medium text-slate-500">Hóa đơn</span>
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Đang trong hạn thanh toán</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">Hóa Đơn Quá Hạn (Overdue)</span>
          <span className="text-lg font-extrabold text-rose-600">
            {overdueInvoiceCount} <span className="text-[10px] font-medium text-slate-500">Hóa đơn</span>
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Cần nhắc thanh toán hoặc tạm khóa</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo Mã hóa đơn (INV-...), Tên doanh nghiệp, Gói cước, Mã giao dịch..."
            value={invoiceSearch}
            onChange={(e) => setInvoiceSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={invoiceStatusFilter}
            onChange={(e) => setInvoiceStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-semibold text-slate-700 shadow-2xs"
          >
            <option value="ALL">Tất cả trạng thái ({invoices.length})</option>
            <option value="PAID">Đã thanh toán ({invoices.filter((i) => i.status === "PAID").length})</option>
            <option value="PENDING">Chờ thanh toán ({invoices.filter((i) => i.status === "PENDING").length})</option>
            <option value="OVERDUE">Quá hạn ({invoices.filter((i) => i.status === "OVERDUE").length})</option>
            <option value="CANCELLED">Đã hủy ({invoices.filter((i) => i.status === "CANCELLED").length})</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto pb-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-slate-50">
          <table className="w-full min-w-[1000px] border-collapse text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-4 whitespace-nowrap">Số Hóa Đơn</th>
                <th className="p-4 min-w-[200px]">Khách Hàng Doanh Nghiệp</th>
                <th className="p-4 min-w-[150px]">Gói Dịch Vụ</th>
                <th className="p-4 whitespace-nowrap">Số Tiền (USD)</th>
                <th className="p-4 whitespace-nowrap">Phương Thức</th>
                <th className="p-4 whitespace-nowrap">Hạn Thanh Toán</th>
                <th className="p-4 whitespace-nowrap">Trạng Thái</th>
                <th className="p-4 text-right whitespace-nowrap">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length > 0 ? (
                paginatedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-blue-600">{inv.invoiceNumber}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(inv.createdAt).toLocaleDateString("vi-VN")}
                      </div>
                    </td>

                    <td className="p-4 min-w-[200px]">
                      <div className="font-bold text-slate-900 leading-relaxed break-words">{inv.tenantName || `Tenant #${inv.tenantId}`}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono mt-0.5 flex-wrap">
                        <span>{inv.tenantCode || "code"}</span>
                        {inv.tenantSubdomain && <span>· {inv.tenantSubdomain}.smarthire.top</span>}
                      </div>
                    </td>

                    <td className="p-4 min-w-[150px]">
                      <div className="font-semibold text-slate-800 leading-relaxed break-words">{inv.planName || "Gói Tùy Biến"}</div>
                      {inv.billingPeriodStart && inv.billingPeriodEnd && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {inv.billingPeriodStart.slice(0, 7)} → {inv.billingPeriodEnd.slice(0, 7)}
                        </div>
                      )}
                    </td>

                    <td className="p-4 whitespace-nowrap font-mono">
                      <div className="font-bold text-slate-900 text-sm">
                        ${inv.amount.toLocaleString()} {inv.currency}
                      </div>
                      {inv.taxRate !== undefined && inv.taxRate > 0 && (
                        <div className="text-[10px] text-slate-400">VAT {inv.taxRate}%</div>
                      )}
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {inv.paymentGateway === "BANK_TRANSFER"
                          ? "Chuyển khoản B2B"
                          : inv.paymentGateway === "STRIPE"
                          ? "Thẻ tín dụng Stripe"
                          : inv.paymentGateway === "VN_PAY"
                          ? "Cổng VNPAY QR"
                          : inv.paymentGateway || "Trực tiếp"}
                      </span>
                    </td>

                    <td className="p-4 text-[11px] text-slate-600 whitespace-nowrap">
                      {inv.dueDate ? (
                        <span className="font-mono">{inv.dueDate}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          inv.status === "PAID"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : inv.status === "PENDING"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : inv.status === "OVERDUE"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-slate-100 text-slate-600 border border-slate-300"
                        }`}
                      >
                        {inv.status === "PAID" ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : inv.status === "PENDING" ? (
                          <Clock className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        {inv.status === "PAID"
                          ? "Đã TT"
                          : inv.status === "PENDING"
                          ? "Chờ TT"
                          : inv.status === "OVERDUE"
                          ? "Quá Hạn"
                          : "Đã Hủy"}
                      </span>
                    </td>

                    <td className="p-4 text-right whitespace-nowrap space-x-1.5">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Chi tiết</span>
                      </button>

                      {inv.status !== "PAID" && (
                        <button
                          disabled={approvingId === inv.id}
                          onClick={() => handleMarkInvoicePaid(inv)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-xs transition-colors inline-flex items-center gap-1 shadow-2xs"
                          title="Duyệt thanh toán và tự động cấp phát Workspace"
                        >
                          {approvingId === inv.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang cấp phát DB...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Duyệt Thanh Toán</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <span>Không tìm thấy hóa đơn nào.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Footer */}
        {filteredInvoices.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <span className="text-[11px] text-slate-500">
              Hiển thị <span className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-semibold text-slate-700">{Math.min(currentPage * itemsPerPage, filteredInvoices.length)}</span> trong số <span className="font-semibold text-slate-700">{filteredInvoices.length}</span> hóa đơn
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-[11px] font-semibold transition-colors"
              >
                Trước
              </button>
              <span className="px-3 py-1.5 text-[11px] font-semibold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-[11px] font-semibold transition-colors"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function InvoicesPage() {
  const [, setTenantId] = useState<number | "">("");
  const [, setPlanId] = useState<number | "">("");
  const [, setAmount] = useState(0);
  const [, setNotes] = useState("");
  const [, setCreating] = useState(false);
  const [, setSelected] = useState<InvoiceItem | null>(null);

  return <InvoicesContent
    setInvoiceTenantId={setTenantId}
    setInvoicePlanId={setPlanId}
    setInvoiceAmount={setAmount}
    setInvoiceNotes={setNotes}
    setShowCreateInvoiceModal={setCreating}
    setSelectedInvoice={setSelected}
  />;
}
