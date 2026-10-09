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
            <span className="text-indigo-600 text-lg sm:text-xl">& HẠ TẦNG DEDICATED DATABASE DOANH NGHIỆP</span>
          </h1>
          <p className="text-xs font-mono font-bold text-slate-600 mt-2">
            Số: <span className="text-indigo-700">{contract.contractNumber}</span>/HĐDV-SMARTHIRE
          </p>
        </div>

        {/* Legal Basis */}
        <div className="text-[11px] text-slate-600 italic space-y-1 mb-8 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
          <p>• Căn cứ Bộ luật Dân sự số 91/2015/QH13 ban hành ngày 24/11/2015;</p>
          <p>• Căn cứ Luật Giao dịch điện tử số 20/2023/QH15 ban hành ngày 22/06/2023;</p>
          <p>• Căn cứ Nghị định số 130/2018/NĐ-CP quy định chi tiết thi hành Luật Giao dịch điện tử về chữ ký số và dịch vụ chứng thực chữ ký số;</p>
          <p>• Căn cứ Nghị định số 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân (Personal Data Protection Decree - PDPD);</p>
          <p>• Căn cứ vào nhu cầu và năng lực thực tế của hai bên.</p>
        </div>

        {/* Parties Information */}
        <div className="space-y-6 text-xs text-slate-800 leading-relaxed mb-8">
          <p className="font-semibold">Hôm nay, ngày {new Date(contract.createdAt).toLocaleDateString("vi-VN")}, chúng tôi gồm có:</p>

          {/* BÊN A */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
            <h3 className="font-bold text-sm text-indigo-900 uppercase mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>BÊN A: BÊN CUNG CẤP DỊCH VỤ (NHÀ PHÁT TRIỂN NỀN TẢNG)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
              <div>
                <span className="font-semibold">Tên doanh nghiệp: </span>
                <span>{contract.partyAName || "CÔNG TY CỔ PHẦN CÔNG NGHỆ SMARTHIRE VIỆT NAM"}</span>
              </div>
              <div>
                <span className="font-semibold">Mã số thuế: </span>
                <span className="font-mono font-bold text-slate-900">{contract.partyATaxCode || "0110889988"}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="font-semibold">Địa chỉ trụ sở: </span>
                <span>{contract.partyAAddress || "Tòa nhà Keangnam Landmark 72, Đường Phạm Hùng, Phường Mễ Trì, Quận Nam Từ Liêm, TP. Hà Nội"}</span>
              </div>
              <div>
                <span className="font-semibold">Người đại diện: </span>
                <span>{contract.partyARepresentative || "Phan Nhật Hưng"}</span>
              </div>
              <div>
                <span className="font-semibold">Chức vụ: </span>
                <span>{contract.partyAPosition || "Tổng Giám Đốc"}</span>
              </div>
              <div>
                <span className="font-semibold">Số điện thoại: </span>
                <span>{contract.partyAPhone || "1900 6868"}</span>
              </div>
              <div>
                <span className="font-semibold">Email: </span>
                <span>{contract.partyAEmail || "legal@smarthire.top"}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="font-semibold">Tài khoản ngân hàng: </span>
                <span className="font-mono font-bold">{contract.partyABankAccount || "190388889999"}</span> tại{" "}
                <span>{contract.partyABankName || "Ngân hàng TMCP Kỹ Thương Việt Nam (Techcombank)"} - {contract.partyABankBranch || "CN Hà Nội"}</span>
              </div>
            </div>
          </div>

          {/* BÊN B */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
            <h3 className="font-bold text-sm text-slate-900 uppercase mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-600" />
              <span>BÊN B: BÊN SỬ DỤNG DỊCH VỤ (KHÁCH HÀNG DOANH NGHIỆP)</span>
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
                <span className="font-semibold">Địa chỉ trụ sở: </span>
                <span>{contract.partyBAddress || "Đăng ký theo Giấy phép ĐKKD"}</span>
              </div>
              <div>
                <span className="font-semibold">Người đại diện: </span>
                <span>{contract.partyBRepresentative || "Đại diện theo pháp luật"}</span>
              </div>
              <div>
                <span className="font-semibold">Chức vụ: </span>
                <span>{contract.partyBPosition || "Giám Đốc / Đại diện có thẩm quyền"}</span>
              </div>
              <div>
                <span className="font-semibold">Số điện thoại: </span>
                <span>{contract.partyBPhone || "Theo hồ sơ đăng ký"}</span>
              </div>
              <div>
                <span className="font-semibold">Email nhận HĐ & Ký số: </span>
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
              ĐIỀU 1: ĐỐI TƯỢNG VÀ NỘI DUNG DỊCH VỤ
            </h4>
            <div className="space-y-2 pl-3 border-l-2 border-slate-200">
              <p>
                1.1. Bên A đồng ý cung cấp và Bên B đồng ý thuê sử dụng phần mềm tuyển dụng thông minh <strong>SmartHire-AI</strong> gói{" "}
                <span className="font-bold text-indigo-700">{contract.planName || "Enterprise Dedicated"}</span>.
              </p>
              <p>
                1.2. <strong>Cam kết kiến trúc Separate Database:</strong> Bên A khởi tạo một cơ sở dữ liệu vật lý riêng biệt (Dedicated DB{" "}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-indigo-700">smarthire_tenant_{contract.tenantCode}</code>) và kết nối Connection Pool độc lập cho Bên B, đảm bảo tính bảo mật và không lưu chung dữ liệu với bất kỳ doanh nghiệp nào khác.
              </p>
              <p>
                1.3. <strong>Thời hạn dịch vụ:</strong> Từ ngày <span className="font-semibold font-mono">{contract.startDate}</span> đến ngày{" "}
                <span className="font-semibold font-mono">{contract.endDate}</span>.
              </p>
            </div>
          </div>

          {/* Article 2 */}
          <div>
            <h4 className="font-bold text-sm text-slate-900 uppercase mb-2">
              ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG VÀ PHƯƠNG THỨC THANH TOÁN
            </h4>
            <div className="space-y-2 pl-3 border-l-2 border-slate-200">
              <p>2.1. Chi tiết biểu phí dịch vụ:</p>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 my-2 space-y-1.5">
                <div className="flex justify-between">
                  <span>• Giá trị dịch vụ trước thuế:</span>
                  <span className="font-mono font-bold">${contract.contractValue.toLocaleString()} {contract.currency}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>• Thuế giá trị gia tăng (VAT {contract.taxRate || 10}%):</span>
                  <span className="font-mono">${(contract.taxAmount || 0).toLocaleString()} {contract.currency}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                  <span>• Tổng giá trị thanh toán:</span>
                  <span className="font-mono text-emerald-600">${(contract.totalAmount || contract.contractValue).toLocaleString()} {contract.currency}</span>
                </div>
                <div className="text-[11px] text-slate-500 italic pt-1">
                  (Bằng chữ: {contract.amountInWords || "Đã bao gồm thuế giá trị gia tăng"})
                </div>
              </div>
              <p>
                2.2. <strong>Phương thức thanh toán:</strong> Chuyển khoản Internet Banking vào tài khoản ngân hàng của Bên A nêu tại phần đầu hợp đồng. Bên A xuất Hóa đơn điện tử VAT hợp pháp theo quy định của Tổng cục Thuế Việt Nam gửi qua email Bên B ngay sau khi ký kết.
              </p>
            </div>
          </div>

          {/* Article 3 */}
          <div>
            <h4 className="font-bold text-sm text-slate-900 uppercase mb-2">
              ĐIỀU 3: CAM KẾT MỨC ĐỘ DỊCH VỤ (SLA) VÀ HỖ TRỢ KỸ THUẬT
            </h4>
            <div className="space-y-2 pl-3 border-l-2 border-slate-200">
              <p>3.1. Bên A cam kết tỷ lệ sẵn sàng hạ tầng (Uptime SLA) tối thiểu <strong>99.99%</strong> trong suốt thời gian hiệu lực.</p>
              <p>3.2. Đội ngũ kỹ sư hỗ trợ kỹ thuật 24/7, định kỳ sao lưu dữ liệu tự động (Daily Automated Backup) và khôi phục khi có sự cố.</p>
            </div>
          </div>

          {/* Article 4 */}
          <div>
            <h4 className="font-bold text-sm text-slate-900 uppercase mb-2">
              ĐIỀU 4: BẢO VỆ DỮ LIỆU CÁ NHÂN THEO NGHỊ ĐỊNH 13/2023/NĐ-CP
            </h4>
            <div className="space-y-2 pl-3 border-l-2 border-slate-200">
              <p>
                4.1. Bên A đóng vai trò là Bên Xử Lý Dữ Liệu và Bên B là Bên Kiểm Soát Dữ Liệu đối với toàn bộ hồ sơ ứng viên (CV), thông tin nhân sự và đánh giá phỏng vấn AI.
              </p>
              <p>
                4.2. Bên A cam kết không sử dụng dữ liệu tuyển dụng của Bên B vào bất kỳ mục đích thương mại nào khác và không chia sẻ cho bên thứ ba.
              </p>
            </div>
          </div>

          {/* Article 5 */}
          <div>
            <h4 className="font-bold text-sm text-slate-900 uppercase mb-2">
              ĐIỀU 5: HIỆU LỰC HỢP ĐỒNG ĐIỆN TỬ VÀ KÝ KẾT
            </h4>
            <div className="space-y-2 pl-3 border-l-2 border-slate-200">
              <p>
                5.1. Hợp đồng này được lập dưới dạng <strong>Thông điệp dữ liệu điện tử</strong> theo Luật Giao dịch điện tử số 20/2023/QH15.
              </p>
              <p>
                5.2. Chữ ký số và xác thực điện tử qua nền tảng <strong>Dropbox Sign</strong> của hai bên kèm biên bản kiểm toán (Audit Trail) và mã băm SHA-256 có đầy đủ giá trị pháp lý tương đương văn bản giấy đóng dấu đỏ.
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

