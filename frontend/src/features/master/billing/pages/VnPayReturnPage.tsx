import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  BrainCircuit,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { checkoutApi, VnPayVerifyReturnData } from "@/api/master/checkoutApi";

export function VnPayReturnPage() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VnPayVerifyReturnData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    if (Object.keys(params).length === 0) {
      setErrorMsg("Không tìm thấy thông tin phản hồi từ cổng thanh toán VNPay.");
      setLoading(false);
      return;
    }

    checkoutApi
      .verifyVnPayReturn(params)
      .then((data) => {
        setResult(data);
      })
      .catch((err) => {
        const msg = err.response?.data?.message || "Đã xảy ra lỗi khi xác thực kết quả giao dịch VNPay.";
        setErrorMsg(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [searchParams]);

  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const baseDomain = isLocalhost ? "localhost:5173" : "smarthire.ai";
  const protocol = isLocalhost ? "http" : "https";
  
  const workspaceUrl = result?.subdomain
    ? `${protocol}://${result.subdomain}.${baseDomain}/internal/login`
    : "#";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-blue-600/20 group-hover:scale-105 transition-transform">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              SmartHire<span className="text-blue-600">.AI</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Đối Soát Giao Dịch VNPay</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-12">
        {loading && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">Đang đối soát giao dịch với VNPay...</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Hệ thống đang kiểm tra chữ ký số bảo mật HMAC-SHA512 và xác nhận thanh toán với cổng VNPay. Vui lòng không đóng trình duyệt.
            </p>
          </div>
        )}

        {!loading && errorMsg && (
          <div className="bg-white rounded-3xl border border-rose-200 p-8 sm:p-10 shadow-sm text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Xác Thực Thất Bại</h2>
              <p className="text-sm text-rose-600 mt-2 font-medium">{errorMsg}</p>
            </div>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Link
                to="/pricing"
                className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Quay lại Bảng giá
              </Link>
            </div>
          </div>
        )}

        {!loading && result && result.success && (
          <div className="bg-white rounded-3xl border border-emerald-200/80 p-8 sm:p-10 shadow-sm space-y-8 animate-fade-in">
            {/* Top Badge & Header */}
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>
              <span className="inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Thanh Toán VNPay Thành Công
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Không Gian Làm Việc Đã Được Kích Hoạt!
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
                Cảm ơn quý doanh nghiệp đã lựa chọn SmartHire-AI. Hệ thống đã tự động cấp phát cơ sở dữ liệu riêng biệt và kích hoạt dịch vụ thành công.
              </p>
            </div>

            {/* Receipt Summary Box */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 font-bold text-slate-900">
                <span className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-600" />
                  <span>Chi Tiết Giao Dịch</span>
                </span>
                <span className="text-blue-600 font-mono">#{result.invoiceNumber}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
                <div>
                  <span className="text-[11px] text-slate-400 block">Mã giao dịch VNPay</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">{result.transactionNo || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Ngân hàng thanh toán</span>
                  <span className="font-bold text-slate-900">{result.bankCode || "NCB (ATM)"}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Số tiền đã thanh toán</span>
                  <span className="font-black text-emerald-600 text-sm">
                    {result.amountVnd?.toLocaleString("vi-VN")} VNĐ
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Thời gian thanh toán</span>
                  <span className="font-medium text-slate-800">{result.payDate || "Ngay lập tức"}</span>
                </div>
              </div>
            </div>

            {/* Workspace Activation Info */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50/70 to-indigo-50/60 border border-blue-200 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-950">
                <Building2 className="w-4 h-4 text-blue-700" />
                <span>Không Gian Làm Việc Doanh Nghiệp</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Doanh nghiệp:</span>
                  <span className="font-bold text-slate-900">{result.workspaceName || "Acme Corp"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Địa chỉ truy cập độc lập:</span>
                  <a
                    href={workspaceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <span>{protocol}://{result.subdomain}.{baseDomain}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Email quản trị viên:</span>
                  <span className="font-semibold text-slate-900">{result.contactEmail}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/80 border border-blue-200/70 text-[11px] text-blue-900 leading-relaxed">
                💡 <strong>Lưu ý:</strong> Mật khẩu quản trị tạm thời đã được gửi tới email <strong>{result.contactEmail}</strong>. Quý khách vui lòng kiểm tra hộp thư (kể cả hòm thư Spam) để đăng nhập và thiết lập mật khẩu mới.
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <a
                href={workspaceUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Đăng Nhập Không Gian Làm Việc</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <Link
                to="/"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors text-center"
              >
                Về Trang Chủ
              </Link>
            </div>
          </div>
        )}

        {!loading && result && !result.success && (
          <div className="bg-white rounded-3xl border border-amber-200 p-8 sm:p-10 shadow-sm text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                Mã Lỗi: {result.responseCode}
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">Giao Dịch Chưa Hoàn Tất</h2>
              <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">{result.message}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 max-w-md mx-auto space-y-1 text-left">
              <div className="flex justify-between">
                <span>Mã đơn hàng:</span>
                <span className="font-mono font-bold text-slate-800">#{result.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Số tiền:</span>
                <span className="font-bold text-slate-800">{result.amountVnd?.toLocaleString("vi-VN")} đ</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                to="/pricing"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Thử Thanh Toán Lại</span>
              </Link>
              <Link
                to="/"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Về Trang Chủ
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
