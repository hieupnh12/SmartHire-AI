import { useState } from "react";
import { useLocation, Link, Navigate } from "react-router-dom";
import {
  CheckCircle2,
  Copy,
  Check,
  Building2,
  BrainCircuit,
  ArrowRight,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { CheckoutResponseData } from "@/api/master/checkoutApi";

export function CheckoutSuccessPage() {
  const location = useLocation();
  const order = location.state?.order as CheckoutResponseData | undefined;

  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!order) {
    return <Navigate to="/" replace />;
  }

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 shadow-2xs py-4">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              SmartHire<span className="text-blue-600">.AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <ShieldCheck className="w-4 h-4" />
            <span className="font-semibold">Đơn Hàng Đã Ghi Nhận</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-10">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 shadow-sm text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Đăng Ký Thành Công & Đang Chờ Kích Hoạt!
          </h1>
          <p className="text-sm text-slate-600 mt-2 max-w-xl mx-auto">
            Cảm ơn quý doanh nghiệp đã lựa chọn SmartHire-AI. Không gian tuyển dụng độc lập của bạn đã được giữ chỗ và đang chờ xác nhận thanh toán.
          </p>

          {/* Details Card */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs text-slate-500 block mb-1">Mã hóa đơn / Đơn hàng</span>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {order.invoiceNumber}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(order.invoiceNumber, "inv")}
                  className="text-slate-400 hover:text-slate-600"
                  title="Copy mã đơn"
                >
                  {copiedField === "inv" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs text-slate-500 block mb-1">Subdomain Đã Đăng Ký</span>
              <div className="flex items-center gap-1.5 text-blue-600 font-bold text-sm">
                <Building2 className="w-4 h-4 shrink-0" />
                <span className="font-mono truncate">{order.subdomain}.smarthire.top</span>
              </div>
            </div>
          </div>

          {/* Bank Transfer Guide Box with VietQR */}
          <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-blue-50/70 via-indigo-50/50 to-white border border-blue-200/80 text-left max-w-2xl mx-auto shadow-2xs">
            <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
              <span>Thông Tin Chuyển Khoản Ngân Hàng (Nếu Quý Khách Chưa Quét Mã)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
              <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-blue-200 shadow-2xs">
                <img
                  src={order.qrUrl}
                  alt="Mã QR Chuyển Khoản"
                  className="w-44 h-44 object-contain"
                />
                <span className="text-[11px] font-semibold text-slate-500 mt-2">
                  Quét mã qua app ngân hàng
                </span>
              </div>

              <div className="sm:col-span-7 space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Ngân hàng thụ hưởng</span>
                  <span className="font-bold text-slate-800">{order.bankName}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Số tài khoản</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-slate-900 text-sm">
                      {order.accountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(order.accountNumber, "acc")}
                      className="text-blue-600 hover:text-blue-800"
                      title="Copy số tài khoản"
                    >
                      {copiedField === "acc" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Chủ tài khoản</span>
                  <span className="font-semibold text-slate-800">{order.accountName}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Số tiền cần chuyển</span>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-blue-600 text-base">
                      {order.amountVnd.toLocaleString("vi-VN")} VNĐ
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(order.amountVnd.toString(), "amount")}
                      className="text-blue-600 hover:text-blue-800"
                      title="Copy số tiền"
                    >
                      {copiedField === "amount" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="text-amber-800 font-bold block text-[11px] mb-0.5">
                    Nội dung chuyển khoản (bắt buộc đúng mã):
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-extrabold text-amber-900 text-sm">
                      {order.transferSyntax}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(order.transferSyntax, "syntax")}
                      className="text-amber-700 hover:text-amber-900 font-bold text-xs inline-flex items-center gap-1"
                    >
                      {copiedField === "syntax" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline & Next Steps */}
          <div className="mt-8 max-w-2xl mx-auto p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-2.5">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Quy trình xử lý tiếp theo:</span>
            </h4>
            <ul className="text-xs text-slate-600 space-y-2 pl-6 list-disc">
              <li>
                <strong>Đối soát giao dịch:</strong> Quản trị viên hệ thống sẽ kiểm tra ủy nhiệm chi trong vòng 1-2 giờ làm việc.
              </li>
              <li>
                <strong>Cấp phát Database MySQL:</strong> Hệ thống tự động tạo cơ sở dữ liệu riêng và cấu hình phân quyền cho Workspace của bạn.
              </li>
              <li>
                <strong>Kích hoạt & Đặt mật khẩu:</strong> Một email chứa liên kết kích hoạt và thiết lập mật khẩu sẽ được gửi đến hòm thư người đại diện của bạn.
              </li>
            </ul>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <span>Về Trang Chủ</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
export default CheckoutSuccessPage;
