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
                Văn Bản Pháp Lý & Thỏa Thuận Sử Dụng Dịch Vụ
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
                  PHẦN I: THỎA THUẬN CẤP PHÉP SỬ DỤNG PHẦN MỀM SMARTHIRE-AI (TERMS OF SERVICE)
                </p>
                <p>
                  Bản Điều khoản Dịch vụ này (&ldquo;Thỏa thuận&rdquo;) là hợp đồng điện tử có giá trị pháp lý theo quy định của Luật Giao dịch điện tử 2023 và Luật Thương mại Việt Nam giữa <strong>Bên cung cấp giải pháp (&ldquo;Bên A&rdquo;)</strong> và <strong>Đơn vị đăng ký sử dụng (&ldquo;Bên B&rdquo;)</strong>.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">Điều 1. Phạm vi Cấp phép và Khởi tạo Không gian làm việc (Workspace)</h4>
                <p>
                  1.1. Bên A cấp cho Bên B quyền sử dụng có thời hạn, không độc quyền nền tảng SmartHire-AI theo mô hình thuê bao (SaaS Subscription) tương ứng với Gói dịch vụ và các hạn mức định lượng (Vị trí tuyển dụng, Lượt phân tích CV AI, Giờ phỏng vấn AI, Dung lượng lưu trữ) ghi nhận tại Đơn đặt hàng/Hóa đơn.
                </p>
                <p>
                  1.2. Sau khi hệ thống xác nhận giao dịch thanh toán thành công, Bên A tiến hành cấp phát cơ sở dữ liệu độc lập (Database-per-Tenant) tại địa chỉ Subdomain định danh của Bên B và gửi thông báo kích hoạt tới email Quản trị viên được chỉ định.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">Điều 2. Quản lý Hạn mức và Chính sách Sử dụng Hợp lý (Fair Usage &amp; Quotas)</h4>
                <p>
                  2.1. Khi Bên B sử dụng chạm 100% bất kỳ hạn mức định lượng nào của gói thuê bao (hoặc hạn mức = 0 đối với các tính năng không thuộc phạm vi gói), hệ thống sẽ tự động tạm dừng tính năng tương ứng cho đến khi Bên B gia hạn, nâng cấp gói hoặc mua thêm gói tài nguyên bổ sung (Add-on).
                </p>
                <p>
                  2.2. Bên B có trách nhiệm tự bảo mật thông tin đăng nhập của các tài khoản con thuộc Workspace của mình và chịu hoàn toàn trách nhiệm đối với mọi thao tác khởi tạo từ các tài khoản này.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">Điều 3. Giới hạn Trách nhiệm đối với Tính năng Trí tuệ Nhân tạo (AI Disclaimer)</h4>
                <p>
                  3.1. Các tính năng AI (Phân tích CV, Đánh giá phỏng vấn tự động, Phát hiện gian lận) hoạt động như công cụ hỗ trợ ra quyết định dựa trên mô hình xác suất. Bên A không cam kết tính chính xác tuyệt đối 100% của mọi kết quả đầu ra do AI tạo ra.
                </p>
                <p>
                  3.2. Quyết định tuyển dụng, phỏng vấn, từ chối hoặc tiếp nhận ứng viên thuộc toàn quyền và trách nhiệm của Bên B. Bên A được miễn trừ toàn bộ trách nhiệm pháp lý đối với bất kỳ khiếu nại, tranh chấp lao động hoặc thiệt hại phát sinh từ quyết định nhân sự của Bên B dựa trên kết quả đề xuất của hệ thống.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">Điều 4. Thanh toán, Hóa đơn và Chính sách Hoàn tiền</h4>
                <p>
                  4.1. Phí bản quyền được thanh toán trả trước theo chu kỳ thỏa thuận bằng Đồng Việt Nam (VNĐ).
                </p>
                <p>
                  4.2. Hóa đơn GTGT điện tử được xuất và gửi tự động qua email theo thông tin pháp nhân và Mã số thuế do Bên B cung cấp tại thời điểm giao dịch.
                </p>
                <p>
                  4.3. Dịch vụ SaaS được kích hoạt và cấp phát tài nguyên hạ tầng điện toán ngay sau khi thanh toán; do đó Bên A không áp dụng chính sách hoàn trả phí dịch vụ cho khoảng thời gian chưa sử dụng, trừ trường hợp hai bên có văn bản thỏa thuận riêng.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">Điều 5. Cam kết Mức Dịch vụ (SLA) và Bảo trì</h4>
                <p>
                  5.1. Bên A nỗ lực duy trì độ sẵn sàng của hệ thống đạt tối thiểu 99.5% thời gian trong mỗi chu kỳ thanh toán hàng tháng, không bao gồm các khung giờ bảo trì định kỳ có thông báo trước tối thiểu 24 giờ.
                </p>
                <p>
                  5.2. Trong trường hợp hệ thống gián đoạn dịch vụ ngoài kế hoạch vượt quá thời gian cam kết, Bên A sẽ bồi hoàn cho Bên B dưới hình thức gia hạn thêm thời gian sử dụng tương ứng (Service Credits), không quy đổi thành tiền mặt.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">Điều 6. Chấm dứt Dịch vụ và Xử lý Dữ liệu Hậu Hợp đồng</h4>
                <p>
                  6.1. Khi gói thuê bao hết hạn mà không được gia hạn, hệ thống sẽ chuyển Workspace sang trạng thái Tạm khóa (Suspended) trong vòng 15 ngày.
                </p>
                <p>
                  6.2. Sau thời hạn 30 ngày kể từ ngày hết hạn hợp đồng mà Bên B không thực hiện gia hạn, Bên A có quyền thu hồi Subdomain và xóa vĩnh viễn cơ sở dữ liệu riêng của Bên B khỏi hạ tầng máy chủ nhằm giải phóng tài nguyên. Bên B có trách nhiệm chủ động trích xuất toàn bộ dữ liệu trước thời điểm này.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">Điều 7. Giá trị Pháp lý của Giao dịch Điện tử</h4>
                <p>
                  Việc người đại diện của Bên B nhấp chọn &ldquo;Tôi đồng ý với Điều khoản Dịch vụ&rdquo; và hoàn tất bước đặt hàng/thanh toán cấu thành hành vi giao kết hợp đồng điện tử hợp pháp theo Luật Giao dịch điện tử 2023. Hệ thống của Bên A lưu vết kiểm toán (Audit Trail) bao gồm mã định danh giao dịch, nhãn thời gian (timestamp), địa chỉ IP và thông tin trình duyệt làm bằng chứng pháp lý ràng buộc giữa hai bên.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-slate-700 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900 mb-1">
                    PHẦN II: CHÍNH SÁCH BẢO VỆ &amp; XỬ LÝ DỮ LIỆU CÁ NHÂN (DPA - TUÂN THỦ NGHỊ ĐỊNH 13/2023/NĐ-CP)
                  </p>
                  <p>
                    Chính sách này quy định rõ vai trò pháp lý, nghĩa vụ thu thập sự đồng ý và các biện pháp bảo vệ dữ liệu cá nhân theo Nghị định số 13/2023/NĐ-CP của Chính phủ Việt Nam.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">1. Phân định Vai trò Pháp lý</h4>
                <p>
                  <strong>Bên Kiểm soát Dữ liệu Cá nhân (Data Controller):</strong> Bên B (Doanh nghiệp tuyển dụng) là Bên Kiểm soát Dữ liệu đối với toàn bộ thông tin cá nhân của Ứng viên (Hồ sơ ứng viên, CCCD, số điện thoại, giọng nói/hình ảnh trong phỏng vấn AI) đưa vào hệ thống.
                </p>
                <p>
                  <strong>Bên Xử lý Dữ liệu Cá nhân (Data Processor):</strong> Bên A (SmartHire-AI) chỉ đóng vai trò là Bên Xử lý Dữ liệu theo ủy quyền và chỉ thị kỹ thuật của Bên B để cung cấp dịch vụ phần mềm.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">2. Nghĩa vụ Thu thập Sự đồng ý (Consent) của Ứng viên</h4>
                <p>
                  Bên B cam kết và bảo đảm rằng đã thực hiện đầy đủ nghĩa vụ thông báo và đã thu thập được sự đồng ý hợp pháp của Ứng viên trước khi tải dữ liệu, hồ sơ hoặc tiến hành phỏng vấn AI/thu âm ghi hình ứng viên trên hệ thống SmartHire-AI theo đúng quy định tại Nghị định 13/2023/NĐ-CP. Bên B chịu hoàn toàn trách nhiệm giải trình trước cơ quan nhà nước có thẩm quyền và chịu trách nhiệm pháp lý nếu xảy ra khiếu nại từ ứng viên về nguồn gốc dữ liệu.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">3. Biện pháp Bảo vệ Dữ liệu và An toàn Kỹ thuật</h4>
                <p>
                  <strong>Cô lập cơ sở dữ liệu:</strong> Dữ liệu tuyển dụng của Bên B được lưu trữ tại cơ sở dữ liệu độc lập (Database-per-Tenant), bảo đảm không bị truy cập trái phép hoặc lẫn lộn dữ liệu giữa các doanh nghiệp.
                </p>
                <p>
                  <strong>Mã hóa:</strong> Toàn bộ thông tin xác thực kết nối được mã hóa bằng thuật toán AES-256-GCM; dữ liệu truyền tải trên môi trường mạng bắt buộc qua giao thức bảo mật TLS/HTTPS.
                </p>
                <p>
                  <strong>Cam kết không khai thác dữ liệu:</strong> Bên A cam kết tuyệt đối không sử dụng dữ liệu CV, hồ sơ ứng viên hoặc nội dung phỏng vấn riêng tư của Bên B để huấn luyện (train) các mô hình AI dùng chung hoặc thương mại hóa cho bên thứ ba.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">4. Thực thi Quyền của Chủ thể Dữ liệu</h4>
                <p>
                  Khi ứng viên của Bên B thực hiện các quyền theo Điều 9 Nghị định 13/2023/NĐ-CP (như yêu cầu xóa dữ liệu, cung cấp dữ liệu, rút lại sự đồng ý), Bên B sẽ chủ động thực hiện các thao tác này trực tiếp trên giao diện quản trị Workspace. Trường hợp phát sinh yêu cầu kỹ thuật can thiệp sâu, Bên B gửi văn bản yêu cầu hỗ trợ tới địa chỉ <strong>legal@smarthire.top</strong>.
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
