import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { contractApi, ContractItem } from "@/api/master/contractApi";
import {
  FileSignature,
  ShieldCheck,
  Building2,
  Printer,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Download,
  Hash,
} from "lucide-react";

export function PublicContractSigningPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [contract, setContract] = useState<ContractItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Liên kết ký hợp đồng không hợp lệ.");
      setLoading(false);
      return;
    }

    const fetchContract = async () => {
      setLoading(true);
      try {
        const data = await contractApi.getBySigningToken(token);
        setContract(data);
      } catch (err: any) {
        const msg =
          err.response?.data?.message ||
          "Không thể tải thông tin hợp đồng. Liên kết có thể đã hết hạn hoặc không tồn tại.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [token]);

  const handleSyncDropboxSign = async () => {
    if (!token) return;
    setSyncing(true);
    setSyncNotice(null);
    try {
      const updated = await contractApi.syncEsignByToken(token);
      setContract(updated);
      if (updated.status === "SIGNED") {
        setSyncNotice("Hợp đồng đã được ký số thành công trên Dropbox Sign! Chứng thư Audit Trail và mã băm SHA-256 đã được cập nhật.");
      } else {
        setSyncNotice("Đã kiểm tra từ Dropbox Sign: Hợp đồng đang chờ đại diện Bên B hoàn tất ký kết qua email.");
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        "Không thể đồng bộ trạng thái từ Dropbox Sign. Vui lòng thử lại sau.";
      setSyncNotice(msg);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center max-w-sm w-full">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
          <h2 className="text-base font-bold text-slate-800">Đang Xác Thực Hợp Đồng Điện Tử...</h2>
          <p className="text-xs text-slate-500 mt-1">Đang tải toàn văn văn bản pháp lý và chứng thư số Dropbox Sign.</p>
        </div>
      </div>
    );
  }

  if (error && !contract) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-rose-200 text-center max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900">Liên Kết Không Hợp Lệ</h2>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            Quay Lại Trang Chủ
          </button>
        </div>
      </div>
    );
  }

  if (!contract) return null;

  const isSigned = contract.status === "SIGNED";
  const pdfDownloadUrl = token ? contractApi.getPublicPdfUrl(token) : "#";

  return (
    <div className="min-h-screen bg-slate-200/70 py-8 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-900">
      {/* Top Floating Action Bar */}
      <div className="max-w-4xl mx-auto mb-4 bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-slate-300/80 shadow-md flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold">
            <FileSignature className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-900">Cổng Ký Hợp Đồng Điện Tử B2B (Dropbox Sign)</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isSigned
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-amber-100 text-amber-800 border border-amber-300"
                }`}
              >
                {isSigned ? "ĐÃ KÝ SỐ HỢP LỆ (AUDIT TRAIL)" : "CHỜ ĐỐI TÁC KÝ QUA DROPBOX SIGN"}
              </span>
              {contract.esignTestMode && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-100 text-sky-800 border border-sky-300">
                  SANDBOX TEST MODE
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500 font-mono">Mã HĐ: {contract.contractNumber}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={pdfDownloadUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>{isSigned ? "Tải PDF Đã Ký & Audit Trail" : "Tải Bản Thảo PDF"}</span>
          </a>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>In Văn Bản</span>
          </button>

          {!isSigned && (
            <button
              onClick={handleSyncDropboxSign}
              disabled={syncing}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span>Đồng Bộ Trạng Thái Ký</span>
            </button>
          )}
        </div>
      </div>

      {/* Dropbox Sign Legal E-Signature & Cryptographic Verification Banner */}
      <div className="max-w-4xl mx-auto mb-6 bg-white rounded-2xl p-4 sm:p-5 border border-indigo-200/90 shadow-sm print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2 font-bold text-indigo-950 text-sm">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                {isSigned
                  ? "Văn bản đã được ký số hợp pháp trên nền tảng Dropbox Sign (HelloSign)"
                  : "Hướng dẫn ký số hợp pháp qua Dropbox Sign (Remote Email Signing)"}
              </span>
            </div>
            {!isSigned ? (
              <p className="text-slate-600 leading-relaxed">
                Để đảm bảo giá trị pháp lý và toàn vẹn dữ liệu theo Luật Giao dịch điện tử 20/2023/QH15, yêu cầu ký số kèm văn bản PDF đã được{" "}
                <strong>Dropbox Sign</strong> gửi trực tiếp tới hộp thư đại diện Bên B:{" "}
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                  {contract.partyBEmail || "email đại diện Bên B"}
                </span>
                . Vui lòng mở email từ <strong>Dropbox Sign (noreply@mail.hellosign.com)</strong> và nhấn <strong>"Review &amp; Sign"</strong> để ký kết.
              </p>
            ) : (
              <p className="text-emerald-800 leading-relaxed">
                Hợp đồng này đã được ký điện tử thành công và niêm phong mật mã học kèm trang <strong>Dropbox Sign Audit Trail</strong>. Mọi hành vi chỉnh sửa nội dung sau khi ký đều làm thay đổi mã băm SHA-256.
              </p>
            )}

            <div className="pt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-slate-600 font-mono">
              {contract.externalSignatureRequestId && (
                <div>
                  <span className="font-sans font-semibold text-slate-500">Request ID: </span>
                  <span className="text-slate-900 font-bold">{contract.externalSignatureRequestId}</span>
                </div>
              )}
              {contract.documentChecksum && (
                <div className="flex items-center gap-1 break-all">
                  <Hash className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="font-sans font-semibold text-slate-500">SHA-256: </span>
                  <span className="text-slate-800">{contract.documentChecksum}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {syncNotice && (
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs font-medium text-indigo-800 flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{syncNotice}</span>
          </div>
        )}
      </div>

      {/* Contract Paper Document */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-300 p-8 sm:p-14 print:p-0 print:border-none print:shadow-none">
        {/* National Header (Quốc Hiệu & Tiêu Ngữ) */}
        <div className="text-center pb-6 border-b border-slate-200">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900">
            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
          </h4>
          <h5 className="text-xs font-semibold text-slate-800 mt-1">Độc lập - Tự do - Hạnh phúc</h5>
          <div className="w-36 h-0.5 bg-slate-900 mx-auto my-3" />
          <p className="text-[11px] text-slate-500 italic">
            Hà Nội, ngày {new Date(contract.createdAt).getDate()} tháng {new Date(contract.createdAt).getMonth() + 1} năm{" "}
            {new Date(contract.createdAt).getFullYear()}
          </p>
        </div>

        {/* Contract Title */}
        <div className="text-center my-6">
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 leading-tight">
            HỢP ĐỒNG CUNG CẤP DỊCH VỤ PHẦN MỀM TUYỂN DỤNG AI
            <br />
            <span className="text-indigo-600 text-lg sm:text-xl">&amp; HẠ TẦNG CƠ SỞ DỮ LIỆU ĐỘC LẬP</span>
          </h1>
          <p className="text-xs font-mono font-bold text-slate-600 mt-2">
            Số: <span className="text-indigo-700">{contract.contractNumber}</span>/HĐDV-SMARTHIRE
          </p>
        </div>

        {/* Legal Basis */}
        <div className="text-[11px] text-slate-600 italic space-y-1 mb-8 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
          <p>• Căn cứ Bộ luật Dân sự số 91/2015/QH13;</p>
          <p>• Căn cứ Luật Thương mại số 36/2005/QH11;</p>
          <p>• Căn cứ Luật Giao dịch điện tử số 20/2023/QH15;</p>
          <p>• Căn cứ Nghị định số 13/2023/NĐ-CP của Chính phủ về Bảo vệ dữ liệu cá nhân;</p>
          <p>• Căn cứ vào nhu cầu và năng lực thực tế của hai bên.</p>
        </div>

        {/* Parties Information */}
        <div className="space-y-6 text-xs text-slate-800 leading-relaxed mb-8">
          <p className="font-semibold">Hôm nay, ngày {new Date(contract.createdAt).toLocaleDateString("vi-VN")}, chúng tôi gồm có:</p>

          {/* BÊN A */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
            <h3 className="font-bold text-sm text-indigo-900 uppercase mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>BÊN A: {contract.partyAName || "CÔNG TY CỔ PHẦN CÔNG NGHỆ SMARTHIRE VIỆT NAM"}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
              <div>
                <span className="font-semibold">Mã số thuế: </span>
                <span className="font-mono font-bold text-slate-900">{contract.partyATaxCode || "0110889988"}</span>
              </div>
              <div>
                <span className="font-semibold">Người đại diện: </span>
                <span>{contract.partyARepresentative || "Phan Nhật Hưng"} — Chức vụ: {contract.partyAPosition || "Tổng Giám Đốc"}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="font-semibold">Trụ sở: </span>
                <span>{contract.partyAAddress || "Tòa nhà Keangnam Landmark 72, Đường Phạm Hùng, Nam Từ Liêm, Hà Nội"}</span>
              </div>
              <div>
                <span className="font-semibold">Email pháp chế: </span>
                <span>{contract.partyAEmail || "legal@smarthire.top"}</span>
              </div>
              <div>
                <span className="font-semibold">Hotline: </span>
                <span>{contract.partyAPhone || "1900 6868"}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="font-semibold">Tài khoản: </span>
                <span className="font-mono font-bold">{contract.partyABankAccount || "190388889999"}</span> tại{" "}
                <span>{contract.partyABankName || "Ngân hàng Techcombank"} – {contract.partyABankBranch || "CN Hà Nội"}</span>
              </div>
            </div>
          </div>

          {/* BÊN B */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
            <h3 className="font-bold text-sm text-slate-900 uppercase mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-600" />
              <span>BÊN B: BÊN SỬ DỤNG DỊCH VỤ</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
              <div>
                <span className="font-semibold">Tên doanh nghiệp: </span>
                <span className="font-bold text-slate-900">{contract.partyBName || contract.tenantName || "Doanh nghiệp khách hàng"}</span>
              </div>
              <div>
                <span className="font-semibold">Mã số thuế: </span>
                <span className="font-mono font-bold text-slate-900">{contract.partyBTaxCode || "Đang cập nhật"}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="font-semibold">Địa chỉ: </span>
                <span>{contract.partyBAddress || "Đăng ký theo Giấy phép ĐKKD"}</span>
              </div>
              <div>
                <span className="font-semibold">Đại diện: </span>
                <span>{contract.partyBRepresentative || "Đại diện theo pháp luật"} — Chức vụ: {contract.partyBPosition || "Giám Đốc"}</span>
              </div>
              <div>
                <span className="font-semibold">Số điện thoại: </span>
                <span>{contract.partyBPhone || "Theo hồ sơ đăng ký"}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="font-semibold">Email ký số &amp; nhận hóa đơn: </span>
                <span className="font-mono text-indigo-700">{contract.partyBEmail || "email@company.com"}</span>
              </div>
              {contract.partyBBankAccount && (
                <div className="sm:col-span-2">
                  <span className="font-semibold">Tài khoản ngân hàng: </span>
                  <span className="font-mono">{contract.partyBBankAccount}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contract Articles */}
        <div className="space-y-6 text-xs text-slate-800 leading-relaxed">
          {/* Article 1 */}
          <div>
            <h4 className="font-bold text-sm text-slate-900 uppercase mb-2">
              ĐIỀU 1: ĐỐI TƯỢNG, PHẠM VI DỊCH VỤ VÀ HẠN NGẠCH TÀI NGUYÊN
            </h4>
            <div className="space-y-2 pl-3 border-l-2 border-slate-200">
              <p>
                1.1. Bên A cung cấp và Bên B đồng ý thuê quyền sử dụng nền tảng tuyển dụng thông minh <strong>SmartHire-AI</strong> theo mô hình SaaS như sau:
              </p>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 my-2 space-y-1.5">
                <div>
                  • <strong>Gói dịch vụ:</strong>{" "}
                  <span className="font-bold text-indigo-700">{contract.planName || "Enterprise (Tùy chỉnh)"}</span>
                </div>
                <div>
                  • <strong>Không gian làm việc (Subdomain):</strong>{" "}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-indigo-700">
                    https://{contract.tenantCode || "doanhnghiep"}.smarthire.top
                  </code>
                </div>
                <div>
                  • <strong>Hạn mức tài nguyên định kỳ:</strong> Tối đa{" "}
                  <strong>{contract.maxJobs && contract.maxJobs >= 9999 ? "Không giới hạn" : (contract.maxJobs ?? "Không giới hạn")}</strong> vị trí tuyển dụng (Jobs);{" "}
                  <strong>{(contract.maxCvParses ?? 5000).toLocaleString("vi-VN")}</strong> lượt phân tích CV AI/tháng;{" "}
                  <strong>{(contract.maxAiInterviewHours ?? 200).toLocaleString("vi-VN")}</strong> giờ phỏng vấn AI/tháng;{" "}
                  <strong>{contract.maxStorageGb ?? 100} GB</strong> lưu trữ.
                </div>
              </div>
              <p>
                1.2. <strong>Cam kết Hạ tầng Cơ sở dữ liệu Độc lập (Separate Database per Tenant):</strong> Bên A khởi tạo và vận hành một cơ sở dữ liệu vật lý riêng biệt (
                <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-indigo-700">
                  smarthire_tenant_{contract.tenantCode || "doanhnghiep"}
                </code>
                ) kèm bộ kết nối độc lập dành riêng cho Bên B, đảm bảo cô lập hoàn toàn và không lưu chung dữ liệu với bất kỳ bên thứ ba nào khác.
              </p>
              <p>
                1.3. <strong>Thời hạn hợp đồng:</strong> Từ ngày <span className="font-semibold font-mono">{contract.startDate}</span> đến hết ngày{" "}
                <span className="font-semibold font-mono">{contract.endDate}</span>.
              </p>
            </div>
          </div>

          {/* Article 2 */}
          <div>
            <h4 className="font-bold text-sm text-slate-900 uppercase mb-2">
              ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG VÀ ĐIỀU KIỆN THANH TOÁN
            </h4>
            <div className="space-y-2 pl-3 border-l-2 border-slate-200">
              <p>2.1. Tổng giá trị hợp đồng:</p>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 my-2 space-y-1.5">
                <div className="flex justify-between">
                  <span>• Phí bản quyền phần mềm và hạ tầng:</span>
                  <span className="font-mono font-bold">{contract.contractValue.toLocaleString("vi-VN")} VND</span>
                </div>
                <div className="flex justify-between text-slate-600 gap-4">
                  <span>• Thuế giá trị gia tăng (GTGT):</span>
                  {(contract.taxRate ?? 0) === 0 ? (
                    <span className="text-right font-medium text-slate-700">
                      Không chịu thuế GTGT (Theo Khoản 21 Điều 4 Thông tư 219/2013/TT-BTC đối với phần mềm và dịch vụ phần mềm)
                    </span>
                  ) : (
                    <span className="font-mono">
                      VAT {contract.taxRate}%: {(contract.taxAmount || 0).toLocaleString("vi-VN")} VND
                    </span>
                  )}
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                  <span>• Tổng giá trị thanh toán:</span>
                  <span className="font-mono text-emerald-600">{(contract.totalAmount || contract.contractValue).toLocaleString("vi-VN")} VND</span>
                </div>
                <div className="text-[11px] text-slate-500 italic pt-1">
                  (Bằng chữ: {contract.amountInWords || "Không chịu thuế giá trị gia tăng"})
                </div>
              </div>
              <p>2.2. <strong>Phương thức và Thời hạn thanh toán:</strong></p>
              <p>
                • Bên B thanh toán 100% giá trị hợp đồng bằng hình thức chuyển khoản vào tài khoản ngân hàng của Bên A trong vòng{" "}
                <strong>05 (năm) ngày làm việc</strong> kể từ ngày hai bên hoàn tất ký số hợp đồng này.
              </p>
              <p>
                • Bên A tiến hành bàn giao tài khoản Quản trị viên (Master Admin), kích hoạt cơ sở dữ liệu riêng và xuất Hóa đơn điện tử hợp pháp gửi qua email cho Bên B ngay sau khi nhận được báo có từ ngân hàng.
              </p>
            </div>
          </div>

          {/* Article 3 */}
          <div>
            <h4 className="font-bold text-sm text-slate-900 uppercase mb-2">
              ĐIỀU 3: CAM KẾT CHẤT LƯỢNG (SLA), BẢO VỆ DỮ LIỆU &amp; MIỄN TRỪ TRÁCH NHIỆM AI
            </h4>
            <div className="space-y-2 pl-3 border-l-2 border-slate-200">
              <p>
                3.1. <strong>Cam kết Mức dịch vụ (SLA):</strong> Bên A cam kết độ sẵn sàng của hệ thống đạt tối thiểu <strong>99.5%/tháng</strong>, hỗ trợ kỹ thuật trong suốt thời hạn hợp đồng và thực hiện sao lưu dữ liệu tự động hàng ngày (Daily Backup).
              </p>
              <p>
                3.2. <strong>Bảo vệ Dữ liệu Cá nhân (Nghị định 13/2023/NĐ-CP):</strong> Bên B đóng vai trò là <strong>Bên Kiểm soát Dữ liệu</strong> và chịu trách nhiệm thu thập sự đồng ý hợp pháp của ứng viên. Bên A đóng vai trò là <strong>Bên Xử lý Dữ liệu</strong>, cam kết chỉ xử lý dữ liệu theo yêu cầu của Bên B, không chia sẻ cho bên thứ ba và không sử dụng dữ liệu của Bên B vào mục đích thương mại khác.
              </p>
              <p>
                3.3. <strong>Giới hạn Trách nhiệm đối với Trí tuệ Nhân tạo (AI Disclaimer):</strong> Các kết quả phân tích CV, chấm điểm phỏng vấn và cảnh báo gian lận do AI tạo ra đóng vai trò là công cụ tham khảo hỗ trợ ra quyết định. Bên B có toàn quyền và chịu hoàn toàn trách nhiệm pháp lý đối với quyết định tuyển dụng cuối cùng đối với ứng viên.
              </p>
            </div>
          </div>

          {/* Article 4 */}
          <div>
            <h4 className="font-bold text-sm text-slate-900 uppercase mb-2">
              ĐIỀU 4: HIỆU LỰC HỢP ĐỒNG ĐIỆN TỬ VÀ GIẢI QUYẾT TRANH CHẤP
            </h4>
            <div className="space-y-2 pl-3 border-l-2 border-slate-200">
              <p>
                4.1. Hợp đồng này được giao kết dưới dạng <strong>Thông điệp dữ liệu điện tử</strong> theo quy định của Luật Giao dịch điện tử số 20/2023/QH15.
              </p>
              <p>
                4.2. Chữ ký điện tử xác thực qua nền tảng <strong>Dropbox Sign</strong> của đại diện hai bên kèm theo Biên bản kiểm toán (Audit Trail) và mã băm mật mã <strong>SHA-256</strong> có giá trị pháp lý nguyên vẹn và tương đương với hợp đồng văn bản giấy được ký tay, đóng dấu pháp nhân.
              </p>
              <p>
                4.3. Mọi tranh chấp phát sinh từ Hợp đồng này trước hết được giải quyết thông qua thương lượng thiện chí. Trường hợp không đạt được thỏa thuận trong vòng 30 ngày, vụ việc sẽ được đưa ra giải quyết tại <strong>Tòa án nhân dân có thẩm quyền tại Thành phố Hà Nội</strong>. Phán quyết của Tòa án là quyết định cuối cùng buộc hai bên phải thi hành.
              </p>
            </div>
          </div>
        </div>

        {/* Signature Blocks */}
        <div className="mt-12 pt-8 border-t-2 border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs">
          {/* Bên A Signature */}
          <div className="space-y-2 flex flex-col items-center">
            <span className="font-bold uppercase text-slate-900">ĐẠI DIỆN BÊN A</span>
            <span className="text-[11px] text-slate-500 italic">(Đã ký số điện tử)</span>
            <div className="h-32 flex flex-col items-center justify-center">
              <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 text-center w-full max-w-[250px]">
                <ShieldCheck className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                <div className="text-[10px] font-bold text-indigo-900">SMARTHIRE VIỆT NAM CA</div>
                <div className="text-[9px] text-indigo-700 font-mono">Timestamp: {new Date(contract.createdAt).toLocaleDateString("vi-VN")}</div>
                <div className="text-[9px] text-emerald-700 font-semibold">Chữ ký số hợp lệ</div>
              </div>
            </div>
            <span className="font-bold text-slate-900 mt-2">{contract.partyARepresentative || "Phan Nhật Hưng"}</span>
            <span className="text-[11px] text-slate-500">{contract.partyAPosition || "Tổng Giám Đốc"}</span>
          </div>

          {/* Bên B Signature */}
          <div className="space-y-2 flex flex-col items-center">
            <span className="font-bold uppercase text-slate-900">ĐẠI DIỆN BÊN B</span>
            <span className="text-[11px] text-slate-500 italic">
              {isSigned ? "(Đã hoàn tất ký số qua Dropbox Sign)" : "(Chờ ký qua email Dropbox Sign)"}
            </span>
            <div className="h-32 flex flex-col items-center justify-center">
              {isSigned ? (
                <div className="p-3 bg-emerald-50/90 rounded-xl border border-emerald-300 text-center w-full max-w-[260px] shadow-2xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                  <div className="text-[10px] font-bold text-emerald-900">
                    DROPBOX SIGN VERIFIED E-SIGNATURE
                  </div>
                  <div className="text-[9px] text-emerald-800 font-mono">
                    Ký lúc: {contract.signedAt ? new Date(contract.signedAt).toLocaleString("vi-VN") : "Đã ký"}
                  </div>
                  {contract.externalSignatureRequestId && (
                    <div className="text-[8px] text-slate-500 font-mono truncate">
                      ReqID: {contract.externalSignatureRequestId}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-300 text-center w-full max-w-[260px] space-y-2 print:hidden">
                  <div className="text-[11px] font-semibold text-amber-900">
                    Kiểm tra hộp thư <span className="font-mono underline">{contract.partyBEmail}</span> để ký trên Dropbox Sign
                  </div>
                  <button
                    onClick={handleSyncDropboxSign}
                    disabled={syncing}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] shadow-xs transition-all inline-flex items-center gap-1.5"
                  >
                    {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>Kiểm Tra Trạng Thái Ký</span>
                  </button>
                </div>
              )}
            </div>
            <span className="font-bold text-slate-900 mt-2">
              {contract.partyBRepresentative || "Đại diện có thẩm quyền"}
            </span>
            <span className="text-[11px] text-slate-500">
              {contract.partyBPosition || "Giám Đốc / Đại diện Bên B"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

