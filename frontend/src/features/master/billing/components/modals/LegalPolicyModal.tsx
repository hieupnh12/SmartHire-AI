import { useState } from "react";
import { X, Check } from "lucide-react";

export type LegalPolicyTab = "TOS" | "PRIVACY_ND13";

interface LegalPolicyModalProps {
  openTab: LegalPolicyTab | null;
  policyVersion?: string;
  onClose: () => void;
  onSwitchTab: (tab: LegalPolicyTab) => void;
  isAccepted?: boolean;
  onAcceptChange?: (accepted: boolean) => void;
  inline?: boolean;
}

export function LegalPolicyModal({
  openTab,
  policyVersion = "15/06/2026",
  onClose,
  onSwitchTab,
  isAccepted = false,
  onAcceptChange,
  inline = false,
}: LegalPolicyModalProps) {
  const [internalAccepted, setInternalAccepted] = useState<boolean>(isAccepted);

  if (!openTab) return null;

  const currentAccepted = onAcceptChange ? isAccepted : internalAccepted;

  const handleToggleConsent = (checked: boolean) => {
    setInternalAccepted(checked);
    if (onAcceptChange) {
      onAcceptChange(checked);
    }
  };

  const handleConfirm = () => {
    if (!currentAccepted && onAcceptChange) {
      onAcceptChange(true);
    }
    onClose();
  };

  const modalContent = (
    <div
      className={`bg-white rounded-2xl shadow-2xl border border-slate-200/90 max-w-4xl w-full flex flex-col overflow-hidden ${
        inline ? "h-[calc(100vh-85px)] shadow-md" : "h-[88vh] max-h-[850px] animate-fade-in"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Header Tab Navigation (Style exactly as requested: clean white tab bar with active blue underline) */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 pt-2 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-1 sm:gap-6 overflow-x-auto">
          {/* Tab 1: Chính sách bảo vệ dữ liệu cá nhân (Left) */}
          <button
            type="button"
            onClick={() => onSwitchTab("PRIVACY_ND13")}
            className={`pb-3.5 pt-3 text-sm sm:text-base font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              openTab === "PRIVACY_ND13"
                ? "text-blue-600 border-blue-600"
                : "text-slate-600 hover:text-slate-900 border-transparent"
            }`}
          >
            Chính sách bảo vệ dữ liệu cá nhân
          </button>

          {/* Tab 2: Thỏa thuận mua hàng (Right) */}
          <button
            type="button"
            onClick={() => onSwitchTab("TOS")}
            className={`pb-3.5 pt-3 text-sm sm:text-base font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              openTab === "TOS"
                ? "text-blue-600 border-blue-600"
                : "text-slate-600 hover:text-slate-900 border-transparent"
            }`}
          >
            Thỏa thuận mua hàng
          </button>
        </div>

        {/* Close Button X */}
        {!inline && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Đóng văn bản"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. Modal Body: Document Container Box with Times New Roman font */}
      <div className="p-3 sm:p-6 bg-slate-50/60 flex-1 overflow-hidden flex flex-col">
        <div
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
          className="bg-white border border-slate-200/90 rounded-xl p-5 sm:p-8 overflow-y-auto flex-1 shadow-2xs select-text text-black text-[14.5px] sm:text-[15px] leading-[1.7] custom-scrollbar"
        >
          {openTab === "PRIVACY_ND13" ? (
            /* ======================================================== */
            /* TAB 1: CHÍNH SÁCH BẢO VỆ DỮ LIỆU CÁ NHÂN (LUẬT 2025 & NĐ 356) */
            /* ======================================================== */
            <div className="space-y-4">
              {/* Phiên bản cập nhật */}
              <div className="text-right text-xs text-slate-700 italic pb-1">
                Phiên bản cập nhật ngày {policyVersion}
              </div>

              {/* Document Header Title */}
              <div className="text-center space-y-1 mb-6">
                <h1 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-black">
                  CHÍNH SÁCH BẢO VỆ DỮ LIỆU CÁ NHÂN
                </h1>
                <p className="text-[14px] font-bold text-slate-900">
                  (Dành cho Khách hàng)
                </p>
                <p className="text-[12.5px] italic text-slate-600">
                  (Ban hành theo Luật Bảo vệ dữ liệu cá nhân 2025 và Nghị định số 356/2025/NĐ-CP của Chính phủ)
                </p>
              </div>

              {/* Lời mở đầu */}
              <p className="text-justify indent-6">
                Chính sách bảo vệ Dữ liệu cá nhân này (&ldquo;<strong>Chính sách bảo vệ DLCN</strong>&rdquo;) do <strong>Công ty Cổ phần Công nghệ SmartHire Việt Nam</strong> (&ldquo;<strong>SmartHire</strong>&rdquo;) ban hành để giải thích cách SmartHire thu thập, phân tích, tổng hợp, sử dụng, cung cấp, chuyển giao hoặc các hoạt động xử lý Dữ liệu cá nhân khác của Quý Khách thông qua các sản phẩm, dịch vụ mà SmartHire cung cấp.
              </p>

              <p className="text-justify indent-6">
                Chính sách bảo vệ DLCN này mô tả mục đích và phương tiện mà SmartHire xử lý Dữ liệu cá nhân với tư cách là Bên Kiểm soát Dữ liệu cá nhân, Bên Xử lý Dữ liệu cá nhân, Bên Kiểm soát và xử lý Dữ liệu cá nhân và/hoặc Bên Thứ ba có liên quan đến xử lý Dữ liệu cá nhân, tùy từng ngữ cảnh, tùy từng trường hợp khi SmartHire xử lý Dữ liệu cá nhân. Tùy thuộc vào Sản phẩm, dịch vụ cụ thể mà Quý Khách lựa chọn, cũng như nội dung các văn bản thỏa thuận, hợp đồng đã giao kết và bản chất của hoạt động xử lý dữ liệu trên thực tế, SmartHire sẽ xác định vai trò cụ thể để thực hiện xử lý DLCN. SmartHire cam kết thực hiện đầy đủ các nghĩa vụ và trách nhiệm pháp lý tương ứng với vai trò của mình trong từng trường hợp cụ thể.
              </p>

              {/* 1. ĐỊNH NGHĨA */}
              <div className="space-y-2 pt-2">
                <h2 className="font-bold text-[15px] uppercase text-black">
                  1. ĐỊNH NGHĨA
                </h2>
                <p className="text-justify indent-6">
                  <strong>1.1. Quý Khách/Khách hàng:</strong> là tổ chức, doanh nghiệp hoặc cá nhân tiếp cận, tìm hiểu, đăng ký, ký kết hợp đồng, sử dụng hoặc có liên quan trong quá trình hoạt động, cung cấp các sản phẩm, dịch vụ của SmartHire. Tại Chính sách bảo vệ DLCN này, Quý Khách có thể là Chủ thể dữ liệu hoặc là Bên Kiểm soát Dữ liệu cá nhân đối với toàn bộ hồ sơ ứng viên do Quý Khách quản lý.
                </p>
                <p className="text-justify indent-6">
                  <strong>1.2. Dữ liệu cá nhân (DLCN):</strong> là thông tin dưới dạng ký hiệu, chữ viết, chữ số, hình ảnh, âm thanh hoặc dạng tương tự trên môi trường điện tử gắn liền với một con người cụ thể hoặc giúp xác định một con người cụ thể theo định nghĩa tại Luật Bảo vệ dữ liệu cá nhân năm 2025.
                </p>
                <p className="text-justify indent-6">
                  <strong>1.3. Xử lý Dữ liệu cá nhân:</strong> là một hoặc nhiều hoạt động tác động tới Dữ liệu cá nhân như: thu thập, ghi, phân tích, xác nhận, lưu trữ, chỉnh sửa, công khai, kết hợp, truy cập, truy xuất, thu hồi, mã hóa, giải mã, sao chép, chia sẻ, truyền đưa, cung cấp, chuyển giao, xóa, hủy dữ liệu cá nhân hoặc các hành động khác có liên quan.
                </p>
              </div>

              {/* 2. NGUYÊN TẮC VÀ VAI TRÒ XỬ LÝ DỮ LIỆU */}
              <div className="space-y-2 pt-2">
                <h2 className="font-bold text-[15px] uppercase text-black">
                  2. PHÂN ĐỊNH VAI TRÒ GIỮA SMARTHIRE VÀ QUÝ KHÁCH
                </h2>
                <p className="text-justify indent-6">
                  <strong>2.1. Quý Khách là Bên Kiểm soát Dữ liệu cá nhân:</strong> Quý Khách là chủ thể quyết định mục đích và phương tiện xử lý đối với toàn bộ hồ sơ ứng viên (CV, điểm đánh giá, câu trả lời phỏng vấn video/audio) được đưa vào hệ thống. Quý Khách cam đoan và bảo đảm đã có sự đồng ý tự nguyện, rõ ràng của ứng viên trước khi tải lên hoặc cho phép bóc tách dữ liệu theo quy định của Luật Bảo vệ dữ liệu cá nhân 2025 và Nghị định số 356/2025/NĐ-CP.
                </p>
                <p className="text-justify indent-6">
                  <strong>2.2. SmartHire là Bên Xử lý Dữ liệu cá nhân:</strong> SmartHire chỉ tiến hành thu thập, lưu trữ, bóc tách hồ sơ CV bằng AI và điều phối phòng phỏng vấn trợ lý AI hoàn toàn nhân danh Quý Khách, tuân thủ đúng phạm vi Thỏa thuận mua hàng đã ký kết và không sử dụng dữ liệu này cho bất kỳ mục đích nào ngoài phạm vi dịch vụ.
                </p>
              </div>

              {/* 3. BIỆN PHÁP AN TOÀN VÀ BẢO MẬT */}
              <div className="space-y-2 pt-2">
                <h2 className="font-bold text-[15px] uppercase text-black">
                  3. BIỆN PHÁP BẢO VỆ VÀ CÁCH LY DỮ LIỆU
                </h2>
                <p className="text-justify indent-6">
                  <strong>3.1. Cách ly vật lý từng Doanh nghiệp (Separate Database):</strong> SmartHire áp dụng kiến trúc mỗi doanh nghiệp một Database độc lập, bảo đảm tuyệt đối không chia sẻ chung bảng dữ liệu với bất kỳ khách hàng nào khác.
                </p>
                <p className="text-justify indent-6">
                  <strong>3.2. Tiêu chuẩn mã hóa:</strong> Toàn bộ dữ liệu truyền tải trên môi trường mạng được bảo vệ thông qua giao thức TLS 1.3 mã hóa 256-bit. Mọi dữ liệu nhạy cảm được mã hóa cấp trường theo chuẩn AES-256-GCM.
                </p>
                <p className="text-justify indent-6">
                  <strong>3.3. Cam kết AI minh bạch:</strong> SmartHire cam kết không sử dụng dữ liệu nội bộ hoặc thông tin cá nhân trong CV của Quý Khách để huấn luyện (train) các mô hình AI dùng chung khi chưa có văn bản đồng ý riêng từ Quý Khách.
                </p>
              </div>

              {/* 4. QUYỀN CỦA CHỦ THỂ DỮ LIỆU */}
              <div className="space-y-2 pt-2">
                <h2 className="font-bold text-[15px] uppercase text-black">
                  4. HỖ TRỢ THỰC THI QUYỀN CỦA ỨNG VIÊN
                </h2>
                <p className="text-justify indent-6">
                  Khi ứng viên gửi yêu cầu thực hiện các quyền theo Luật Bảo vệ dữ liệu cá nhân 2025 và Nghị định số 356/2025/NĐ-CP (quyền biết, truy cập, chỉnh sửa, phản đối xử lý, xóa dữ liệu), Quý Khách có toàn quyền chủ động thực hiện trên trang quản trị Workspace của mình hoặc gửi yêu cầu tới <strong>privacy@smarthire.top</strong> để SmartHire hỗ trợ kỹ thuật trong vòng 72 giờ.
                </p>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* TAB 2: THỎA THUẬN MUA HÀNG (TERMS OF SERVICE)              */
            /* ======================================================== */
            <div className="space-y-4">
              {/* Phiên bản cập nhật */}
              <div className="text-right text-xs text-slate-700 italic pb-1">
                Phiên bản cập nhật ngày {policyVersion}
              </div>

              {/* Document Header Title */}
              <div className="text-center space-y-1 mb-6">
                <h1 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-black">
                  THỎA THUẬN MUA HÀNG VÀ CẤP PHÉP DỊCH VỤ SMARTHIRE-AI
                </h1>
                <p className="text-[14px] font-bold text-slate-900">
                  (Dành cho Khách hàng Doanh nghiệp)
                </p>
                <p className="text-[12.5px] italic text-slate-600">
                  (Căn cứ Bộ luật Dân sự 2015, Luật Giao dịch điện tử 2023 và Luật Công nghệ thông tin 2006)
                </p>
              </div>

              {/* Lời mở đầu */}
              <p className="text-justify indent-6">
                Thỏa thuận mua hàng này (&ldquo;<strong>Thỏa thuận</strong>&rdquo;) xác lập các điều khoản và điều kiện pháp lý ràng buộc giữa <strong>Công ty Cổ phần Công nghệ SmartHire Việt Nam</strong> (&ldquo;<strong>SmartHire</strong>&rdquo;) và <strong>Cơ quan, Tổ chức, Doanh nghiệp</strong> đăng ký khởi tạo tài khoản và mua bản quyền dịch vụ trực tuyến trên hệ thống (&ldquo;<strong>Quý Khách</strong>&rdquo;).
              </p>

              {/* 1. PHẠM VI DỊCH VỤ */}
              <div className="space-y-2 pt-2">
                <h2 className="font-bold text-[15px] uppercase text-black">
                  1. PHẠM VI DỊCH VỤ VÀ CẤP PHÉP BẢN QUYỀN
                </h2>
                <p className="text-justify indent-6">
                  <strong>1.1. Cấp phép sử dụng:</strong> SmartHire cấp cho Quý Khách quyền sử dụng có thời hạn, không độc quyền nền tảng phần mềm SaaS quản lý tuyển dụng tích hợp AI (SmartHire-AI) theo đúng gói dịch vụ và thời hạn bản quyền Quý Khách đã thanh toán.
                </p>
                <p className="text-justify indent-6">
                  <strong>1.2. Khởi tạo Workspace tự động:</strong> Ngay sau khi ghi nhận thanh toán thành công, hệ thống SmartHire tự động kích hoạt hạ tầng cơ sở dữ liệu độc lập và tên miền phụ (subdomain) dành riêng cho Quý Khách, đồng thời gửi email thông báo kích hoạt tới hòm thư Quý Khách đã đăng ký.
                </p>
              </div>

              {/* 2. QUẢN LÝ HẠN MỨC */}
              <div className="space-y-2 pt-2">
                <h2 className="font-bold text-[15px] uppercase text-black">
                  2. QUẢN LÝ HẠN MỨC VÀ SỬ DỤNG HỢP LÝ
                </h2>
                <p className="text-justify indent-6">
                  <strong>2.1. Hạn mức tính năng:</strong> Việc sử dụng các chức năng như đăng tin tuyển dụng, bóc tách hồ sơ CV bằng AI và phỏng vấn trợ lý AI được áp dụng theo hạn mức quy định của từng gói cước (Starter, Professional, Enterprise).
                </p>
                <p className="text-justify indent-6">
                  <strong>2.2. Nâng cấp gói:</strong> Quý Khách có thể chủ động nâng cấp hạn mức hoặc gia hạn thời gian sử dụng bất kỳ lúc nào trên giao diện thanh toán mà không làm gián đoạn dữ liệu hiện có.
                </p>
              </div>

              {/* 3. THANH TOÁN VÀ HÓA ĐƠN */}
              <div className="space-y-2 pt-2">
                <h2 className="font-bold text-[15px] uppercase text-black">
                  3. GIÁ CẢ, PHƯƠNG THỨC THANH TOÁN VÀ HÓA ĐƠN VAT
                </h2>
                <p className="text-justify indent-6">
                  <strong>3.1. Phí dịch vụ:</strong> Phí dịch vụ được niêm yết bằng Việt Nam Đồng (VNĐ) và có thể bao gồm thuế Giá trị gia tăng (VAT) theo quy định hiện hành.
                </p>
                <p className="text-justify indent-6">
                  <strong>3.2. Phương thức thanh toán:</strong> Quý Khách có thể thanh toán trực tuyến qua Chuyển khoản VietQR tức thì, Thẻ thanh toán quốc tế (Visa/MasterCard) hoặc Cổng thanh toán trực tuyến được tích hợp.
                </p>
                <p className="text-justify indent-6">
                  <strong>3.3. Hóa đơn điện tử:</strong> SmartHire phát hành hóa đơn giá trị gia tăng điện tử hợp lệ theo đúng thông tin doanh nghiệp, mã số thuế và địa chỉ do Quý Khách cung cấp trong vòng 03 ngày làm việc kể từ khi giao dịch hoàn tất.
                </p>
              </div>

              {/* 4. HIỆU LỰC RÀNG BUỘC */}
              <div className="space-y-2 pt-2">
                <h2 className="font-bold text-[15px] uppercase text-black">
                  4. HIỆU LỰC PHÁP LÝ VÀ ĐIỀU KHOẢN CHUNG
                </h2>
                <p className="text-justify indent-6">
                  <strong>4.1. Giá trị điện tử:</strong> Hành vi tích chọn xác nhận <em>&ldquo;Tôi đã đọc, hiểu và đồng ý với Thỏa thuận mua hàng và Chính sách bảo vệ dữ liệu cá nhân&rdquo;</em> và thực hiện thanh toán trực tuyến có giá trị pháp lý ràng buộc tương đương văn bản hợp đồng truyền thống căn cứ theo quy định của Luật Giao dịch điện tử năm 2023.
                </p>
                <p className="text-justify indent-6">
                  <strong>4.2. Nhật ký kiểm toán:</strong> Thời gian chấp thuận, địa chỉ IP và mã định danh giao dịch của Quý Khách được ghi nhận và lưu trữ bất biến làm bằng chứng xác lập thỏa thuận giữa hai bên.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Modal Footer: Consent Checkbox & Action Button (Matching Image 1) */}
      <div className="px-4 sm:px-6 py-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={currentAccepted}
            onChange={(e) => handleToggleConsent(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 accent-blue-600 cursor-pointer"
          />
          <span className="text-xs sm:text-sm text-slate-800 font-medium leading-snug">
            Tôi đã đọc, hiểu và đồng ý với Thỏa thuận mua hàng và Chính sách bảo vệ dữ liệu cá nhân
          </span>
        </label>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Đồng ý & Đóng</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (inline) {
    return modalContent;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      {modalContent}
    </div>
  );
}

export default LegalPolicyModal;
