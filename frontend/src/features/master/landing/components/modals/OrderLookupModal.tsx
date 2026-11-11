import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  PackageSearch,
  Search,
  Mail,
  Copy,
  CheckCircle2,
  XCircle,
  CreditCard,
  QrCode,
  ArrowRight,
  ExternalLink,
  Loader2,
  AlertCircle,
  Building2,
  Clock,
} from "lucide-react";
import { useLandingModal } from "../../context/LandingModalContext";
import { checkoutApi, PublicOrderLookupItem } from "@/api/master/checkoutApi";
import { toast } from "@/stores/toastStore";

export function OrderLookupModal() {
  const navigate = useNavigate();
  const { showOrderLookupModal, closeOrderLookupModal } = useLandingModal();

  const [queryInput, setQueryInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [orders, setOrders] = useState<PublicOrderLookupItem[]>([]);
  const [expandedQrInvoiceId, setExpandedQrInvoiceId] = useState<number | null>(null);

  if (!showOrderLookupModal) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = queryInput.trim();
    if (!clean) {
      toast.warning("Vui lòng nhập email hoặc mã đơn hàng để tra cứu.");
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setExpandedQrInvoiceId(null);

    try {
      const results = await checkoutApi.lookupOrders(clean);
      setOrders(results || []);
      if (!results || results.length === 0) {
        toast.info("Không tìm thấy đơn hàng nào liên kết với thông tin đã nhập.");
      } else {
        toast.success(`Tìm thấy ${results.length} đơn hàng.`);
      }
    } catch (err: any) {
      console.error("Lookup orders failed", err);
      const msg = err.response?.data?.message || "Đã xảy ra lỗi khi tra cứu đơn hàng. Vui lòng thử lại.";
      toast.error(msg);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}!`);
  };

  const handleProceedToPayment = (order: PublicOrderLookupItem) => {
    closeOrderLookupModal();
    navigate(`/checkout?invoiceId=${order.invoiceId}`);
  };

  const handleVisitWorkspace = (subdomain: string) => {
    const host = window.location.host;
    if (host.includes("localhost")) {
      window.location.href = `http://${subdomain}.localhost:${window.location.port || 5173}/`;
    } else {
      window.location.href = `https://${subdomain}.smarthire.top/`;
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "N/A";
    try {
      const d = new Date(isoString);
      return d.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 max-w-2xl w-full text-left shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={closeOrderLookupModal}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
          aria-label="Đóng cửa sổ"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/80 shadow-2xs">
            <PackageSearch className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Tra Cứu Đơn Hàng Gói Dịch Vụ
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Tìm các đơn hàng đã đặt để kiểm tra trạng thái và tiếp tục thanh toán
            </p>
          </div>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSearch} className="mt-4 mb-4">
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-slate-400 pointer-events-none">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Nhập email của bạn hoặc mã INV-..."
              className="w-full pl-10 pr-28 py-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-2xs"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !queryInput.trim()}
              className="absolute right-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tìm...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Tra cứu</span>
                </>
              )}
            </button>
          </div>

        </form>

        {/* Results Scrollable Container */}
        <div className="flex-1 overflow-y-auto pr-1 -mr-1 space-y-3 pt-1">
          {/* Initial State */}
          {!hasSearched && !loading && (
            <div className="py-10 px-4 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
              <div className="w-12 h-12 mx-auto rounded-full bg-blue-100/60 text-blue-600 flex items-center justify-center mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">
                Nhập Email hoặc Mã Đơn Hàng
              </h4>

            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm text-slate-500 font-medium">Đang tìm kiếm đơn hàng trong hệ thống...</p>
            </div>
          )}

          {/* No Results Found */}
          {hasSearched && !loading && orders.length === 0 && (
            <div className="py-10 px-4 text-center rounded-2xl border border-slate-200 bg-white">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">
                Không tìm thấy đơn hàng nào
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mb-4">
                Không có đơn hàng nào khớp với thông tin <span className="font-semibold text-slate-700">"{queryInput}"</span>. Vui lòng kiểm tra lại địa chỉ email hoặc mã đơn hàng của bạn.
              </p>
              <button
                type="button"
                onClick={() => {
                  closeOrderLookupModal();
                  navigate("/pricing");
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
              >
                <span>Xem lại các gói cước</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Orders List */}
          {hasSearched && !loading && orders.length > 0 && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 px-1">
                <span>Kết quả ({orders.length} đơn hàng)</span>
                <span>Sắp xếp: Mới nhất</span>
              </div>

              {orders.map((order) => {
                const isPending = order.status === "PENDING";
                const isPaid = order.status === "PAID";
                const isCancelled = order.status === "CANCELLED";
                const isQrExpanded = expandedQrInvoiceId === order.invoiceId;

                return (
                  <div
                    key={order.invoiceId}
                    className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${isPending
                      ? "border-amber-200 bg-amber-50/20 hover:border-amber-300"
                      : isPaid
                        ? "border-emerald-200 bg-emerald-50/20"
                        : "border-slate-200 bg-white opacity-85"
                      }`}
                  >
                    {/* Top Row: Invoice Number & Status Badge */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-slate-900 text-sm sm:text-base">
                          #{order.invoiceNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(order.invoiceNumber, "mã đơn hàng")}
                          className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
                          title="Sao chép mã đơn"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Status Badges */}
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300/80 shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span>Chờ thanh toán</span>
                        </span>
                      )}
                      {isPaid && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/80 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Đã thanh toán</span>
                        </span>
                      )}
                      {isCancelled && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                          <XCircle className="w-3.5 h-3.5 text-slate-500" />
                          <span>Đã hủy / Quá hạn</span>
                        </span>
                      )}
                    </div>

                    {/* Main Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs mb-3.5">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Gói dịch vụ</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {order.planName}
                        </span>
                        <span className="text-slate-500 block text-[11px]">
                          Bản quyền {order.billingCycle === "YEARLY" ? "1 Năm" : "Hàng Tháng"}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-0.5">Không gian làm việc</span>
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{order.workspaceName || "Chưa đặt tên"}</span>
                        </div>
                        <span className="text-blue-600 font-mono text-[11px] truncate block">
                          {order.subdomain}.smarthire.top
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-0.5">Số tiền thanh toán</span>
                        <span className="font-extrabold text-[#059669] text-base sm:text-lg">
                          {Number(order.amountVnd || 0).toLocaleString("vi-VN")} {order.currency || "VND"}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-0.5">Thời gian tạo đơn</span>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatDate(order.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="pt-3 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2.5">
                      {isPending && (
                        <>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setExpandedQrInvoiceId(isQrExpanded ? null : order.invoiceId)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors shadow-2xs active:scale-95"
                            >
                              <QrCode className="w-3.5 h-3.5 text-blue-600" />
                              <span>{isQrExpanded ? "Ẩn mã VietQR" : "Xem mã VietQR"}</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleProceedToPayment(order)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-sm hover:shadow-md ml-auto"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>Thanh toán ngay</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {isPaid && (
                        <button
                          type="button"
                          onClick={() => handleVisitWorkspace(order.subdomain)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors shadow-2xs ml-auto"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Đến Không gian tuyển dụng</span>
                        </button>
                      )}

                      {isCancelled && (
                        <span className="text-[11px] text-slate-400 italic">
                          Đơn hàng đã hết hạn thanh toán 7 ngày và subdomain đã được giải phóng.
                        </span>
                      )}
                    </div>

                    {/* Inline Quick VietQR Preview Box */}
                    {isPending && isQrExpanded && (
                      <div className="mt-4 pt-4 border-t border-dashed border-amber-200/90 bg-white rounded-xl p-4 shadow-2xs">
                        <div className="text-center font-semibold text-slate-800 text-xs sm:text-sm mb-3">
                          Quét mã VietQR chuyển khoản nhanh từ ứng dụng ngân hàng
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                          <div className="sm:col-span-5 flex flex-col items-center justify-center">
                            {order.qrUrl ? (
                              <>
                                <div className="border border-slate-200 p-2 rounded-xl bg-white shadow-2xs">
                                  <img
                                    src={order.qrUrl}
                                    alt="VietQR SePay"
                                    className="w-40 h-40 object-contain"
                                  />
                                </div>
                                <span className="text-[10px] text-slate-400 mt-1">Hỗ trợ 40+ App ngân hàng & Ví điện tử</span>
                              </>
                            ) : (
                              <div className="w-44 h-44 rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-3 flex flex-col items-center justify-center text-center text-xs text-amber-900">
                                <AlertCircle className="w-5 h-5 text-amber-600 mb-1.5" />
                                <span className="font-semibold">Chưa có mã VietQR</span>
                                <span className="text-[11px] text-amber-700 mt-1">
                                  Vui lòng chuyển khoản thủ công theo thông tin bên cạnh.
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="sm:col-span-7 space-y-2 text-xs">
                            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="text-slate-500">Ngân hàng:</span>
                              <span className="font-bold text-slate-800">{order.bankName || "—"}</span>
                            </div>
                            {order.bankBranch && (
                              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                                <span className="text-slate-500">Chi nhánh:</span>
                                <span className="font-semibold text-slate-800">{order.bankBranch}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="text-slate-500">Số tài khoản:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-blue-700">{order.accountNumber || "—"}</span>
                                {order.accountNumber && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(order.accountNumber, "số tài khoản")}
                                    className="text-slate-400 hover:text-slate-700 p-0.5"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                              <span className="text-slate-500">Chủ tài khoản:</span>
                              <span className="font-bold text-slate-800">{order.accountName || "—"}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/80 border border-amber-200">
                              <span className="text-amber-800 font-medium">Nội dung CK:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-amber-900">{order.transferSyntax || "—"}</span>
                                {order.transferSyntax && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(order.transferSyntax, "nội dung chuyển khoản")}
                                    className="text-amber-700 hover:text-amber-900 p-0.5"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleProceedToPayment(order)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            <span>Hoặc mở trang thanh toán chính thức (VNPay, Thẻ ATM, Thẻ Quốc tế)</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
          <span>Hệ thống tuyển dụng SmartHire.AI</span>
          <button
            type="button"
            onClick={closeOrderLookupModal}
            className="text-slate-500 hover:text-slate-800 font-medium transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
