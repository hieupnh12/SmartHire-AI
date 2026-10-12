import { X, ShieldCheck, FileText, Scale, Lock } from "lucide-react";

export type LegalPolicyTab = "TOS" | "PRIVACY_ND13";

interface LegalPolicyModalProps {
  openTab: LegalPolicyTab | null;
  policyVersion: string;
  onClose: () => void;
  onSwitchTab: (tab: LegalPolicyTab) => void;
}

export function LegalPolicyModal({
  openTab,
  policyVersion,
  onClose,
  onSwitchTab,
}: LegalPolicyModalProps) {
  if (!openTab) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Văn Bản Pháp Lý & Thỏa Thuận Sử Dụng Dịch Vụ (Click-wrap Agreement)
              </h3>
              <p className="text-xs text-slate-500">
                Phiên bản hiệu lực: <span className="font-mono font-semibold text-blue-700">{policyVersion}</span> · Áp dụng cho khách hàng Doanh nghiệp (B2B SaaS)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Policy Switcher Tabs */}
        <div className="px-6 pt-3 bg-white border-b border-slate-200 flex gap-2">
          <button
            type="button"
            onClick={() => onSwitchTab("TOS")}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              openTab === "TOS"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>1. Điều Khoản Dịch Vụ (ToS)</span>
          </button>
          <button
            type="button"
            onClick={() => onSwitchTab("PRIVACY_ND13")}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              openTab === "PRIVACY_ND13"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>2. Bảo Vệ Dữ Liệu Cá Nhân (NĐ 13/2023/NĐ-CP)</span>
          </button>
        </div>

        {/* Scrollable Legal Document Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm text-slate-700 leading-relaxed">
          {openTab === "TOS" ? (
            <>
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-slate-700">
                <p className="font-bold text-slate-900 mb-1">
                  THỎA THUẬN CẤP PHÉP SỬ DỤNG PHẦN MỀM SMARTHIRE-AI (TERMS OF SERVICE)
                </p>
                <p>
                  Bản Điều khoản Dịch vụ này cấu thành hợp đồng điện tử có giá trị pháp lý theo Luật Giao dịch điện tử 2023 và Luật Thương mại Việt Nam giữa <strong>Công ty Cổ phần Công nghệ SmartHire Việt Nam (Bên A)</strong> và <strong>Đơn vị đăng ký sử dụng (Bên B)</strong>.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">Điều 1. Phạm vi cấp phép và Khởi tạo Không gian làm việc (Workspace)</h4>
                <p>
                  1.1. Bên A cấp cho Bên B quyền truy cập và sử dụng nền tảng tuyển dụng thông minh SmartHire-AI theo mô hình thuê bao năm (Annual SaaS Subscription) tương ứng với gói dịch vụ và hạn mức (số vị trí tuyển dụng, lượt phân tích CV AI, giờ phỏng vấn AI) được ghi nhận trên đơn đặt hàng.
                </p>
                <p>
                  1.2. Ngay sau khi hệ thống xác nhận thanh toán thành công, Bên A tự động khởi tạo cơ sở dữ liệu độc lập (Separate Database per Tenant) tại địa chỉ Subdomain riêng của Bên B và gửi liên kết kích hoạt một lần tới email Quản trị viên đã đăng ký.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">Điều 2. Nghĩa vụ Thanh toán và Hóa đơn Tài chính (VAT)</h4>
                <p>
                  2.1. Phí bản quyền được thanh toán trả trước theo chu kỳ hàng năm bằng Đồng Việt Nam (VNĐ) thông qua chuyển khoản VietQR doanh nghiệp, thẻ nội địa VNPay hoặc thẻ quốc tế.
                </p>
                <p>
                  2.2. Hóa đơn GTGT điện tử được xuất theo đúng thông tin pháp nhân và Mã số thuế do Bên B kê khai tại bước Đặt hàng.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">Điều 3. Cam kết Chất lượng Dịch vụ (SLA) và Quyền Sở hữu Trí tuệ</h4>
                <p>
                  3.1. Bên A cam kết độ sẵn sàng của hạ tầng đạt tối thiểu 99.9% thời gian vận hành và thực hiện sao lưu dữ liệu định kỳ hàng ngày.
                </p>
                <p>
                  3.2. Toàn bộ mã nguồn, thuật toán chấm điểm khớp CV, mô hình đánh giá phỏng vấn AI thuộc quyền sở hữu trí tuệ của Bên A. Toàn bộ dữ liệu tuyển dụng, hồ sơ ứng viên và kết quả đánh giá phát sinh trong Workspace thuộc quyền sở hữu độc quyền của Bên B.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">Điều 4. Giá trị Pháp lý của Giao dịch Click-wrap</h4>
                <p>
                  4.1. Việc người đại diện của Bên B chủ động đánh dấu vào ô xác nhận đồng ý trên trang Thanh toán và gửi yêu cầu khởi tạo đơn hàng là bằng chứng xác thực ý chí giao kết hợp đồng điện tử, được hệ thống lưu vết kiểm toán (Audit Trail gồm phiên bản văn bản, thời gian UTC/Server, địa chỉ IP và thông tin trình duyệt).
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-slate-700 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900 mb-1">
                    CHÍNH SÁCH BẢO VỆ & XỬ LÝ DỮ LIỆU CÁ NHÂN (TUÂN THỦ NGHỊ ĐỊNH 13/2023/NĐ-CP & GDPR)
                  </p>
                  <p>
                    Chính sách này quy định rõ trách nhiệm bảo vệ dữ liệu cá nhân của Quản trị viên doanh nghiệp, Nhân sự tuyển dụng và Ứng viên theo Nghị định số 13/2023/NĐ-CP của Chính phủ Việt Nam.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">1. Vai trò Kiểm soát và Xử lý Dữ liệu Cá nhân</h4>
                <p>
                  1.1. <strong>Đối với dữ liệu người đại diện đặt hàng & quản trị viên Workspace:</strong> SmartHire-AI đóng vai trò là Bên Kiểm soát và Xử lý dữ liệu nhằm mục đích khởi tạo tài khoản, xuất hóa đơn thuế, gửi thông báo vận hành và lưu bằng chứng giao kết hợp đồng.
                </p>
                <p>
                  1.2. <strong>Đối với dữ liệu Ứng viên trong từng Workspace:</strong> Doanh nghiệp (Tenant) là <em>Bên Kiểm soát Dữ liệu Cá nhân</em>; SmartHire-AI đóng vai trò là <em>Bên Xử lý Dữ liệu Cá nhân</em> theo ủy quyền kỹ thuật của Doanh nghiệp.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">2. Cơ chế Cô lập Vật lý và Bảo mật Kỹ thuật</h4>
                <p>
                  2.1. Mỗi doanh nghiệp được cấp phát một cơ sở dữ liệu riêng biệt (Separate Database per Tenant). Dữ liệu CV, bản ghi âm phỏng vấn AI và điểm đánh giá không dùng chung bảng với bất kỳ doanh nghiệp nào khác.
                </p>
                <p>
                  2.2. Mật khẩu kết nối cơ sở dữ liệu được mã hóa AES-256-GCM; tài liệu CV được tự động áp dụng chính sách thời hạn lưu trữ (Retention Policy) và kiểm soát truy cập theo phân quyền RBAC.
                </p>
                <p>
                  2.3. SmartHire-AI <strong>cam kết tuyệt đối không sử dụng</strong> dữ liệu hồ sơ ứng viên hoặc dữ liệu nội bộ của Doanh nghiệp để huấn luyện các mô hình AI công cộng.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">3. Quyền của Chủ thể Dữ liệu (Điều 9 Nghị định 13/2023/NĐ-CP)</h4>
                <p>
                  Chủ thể dữ liệu có đầy đủ các quyền: Quyền được biết, Quyền đồng ý, Quyền truy cập, Quyền rút lại sự đồng ý, Quyền yêu cầu xóa dữ liệu (Right to be forgotten) và Quyền hạn chế xử lý dữ liệu thông qua cổng quản trị Workspace hoặc liên hệ trực tiếp bộ phận Pháp chế & Bảo mật tại <strong>legal@smarthire.top</strong>.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer — Read-only acknowledgement (does NOT auto-check consent) */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500">
            Lưu ý: Việc mở xem văn bản này không tự động kích hoạt trạng thái đồng ý. Quý khách vui lòng tự tay tích vào ô xác nhận ngoài màn hình đặt hàng.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shrink-0 transition-colors"
          >
            Đã hiểu & Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
}
