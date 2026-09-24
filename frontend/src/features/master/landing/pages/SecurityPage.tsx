import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  Database,
  KeyRound,
  FileText,
  Award,
  Server,
  CheckCircle2,
  ArrowRight,
  Check
} from "lucide-react";
import { useLandingModal } from "../context/LandingModalContext";

export function SecurityPage() {
  const { openDemoModal } = useLandingModal();

  const pillars = [
    {
      icon: Database,
      title: "Kiến Trúc Cô Lập Dữ Liệu (Separate DB Per Tenant)",
      badge: "Enterprise Standard",
      description:
        "Mỗi doanh nghiệp được cấp phát một cơ sở dữ liệu vật lý riêng biệt hoàn toàn. Dữ liệu ứng viên, lịch sử phỏng vấn và mức lương đề xuất không nằm chung bảng với bất kỳ doanh nghiệp nào khác, triệt tiêu rủi ro rò rỉ chéo.",
    },
    {
      icon: FileText,
      title: "Tuân Thủ Nghị Định 13/2023/NĐ-CP",
      badge: "Pháp Lý Việt Nam",
      description:
        "Đáp ứng toàn diện các tiêu chuẩn về Bảo vệ Dữ liệu Cá nhân của Chính phủ Việt Nam. Cung cấp cơ chế xin chấp thuận thu thập thông tin, quyền kiểm tra và quyền yêu cầu hủy bỏ dữ liệu (Right to be forgotten) của ứng viên.",
    },
    {
      icon: KeyRound,
      title: "Đăng Nhập Một Lần Doanh Nghiệp (SSO)",
      badge: "Identity Security",
      description:
        "Tích hợp liền mạch với hệ thống danh tính hiện hữu của doanh nghiệp qua Google Workspace, Microsoft 365 (Azure AD), và Okta SAML 2.0 / OpenID Connect. Quản trị viên dễ dàng thu hồi quyền truy cập khi nhân sự nghỉ việc.",
    },
    {
      icon: Lock,
      title: "Mã Hóa Toàn Diện At-Rest & In-Transit",
      badge: "AES-256 & TLS 1.3",
      description:
        "Mọi kết nối mạng được mã hóa bằng chuẩn TLS 1.3 cao nhất. Toàn bộ tài liệu CV lưu trữ, bản ghi âm phỏng vấn và ghi chú của hội đồng tuyển dụng đều được mã hóa theo chuẩn AES-256 cấp quân sự.",
    },
    {
      icon: Server,
      title: "Độ Sẵn Sàng 99.9% & Sao Lưu Tự Động",
      badge: "SLA Cam Kết",
      description:
        "Hạ tầng vận hành trên các máy chủ đám mây chuẩn Enterprise với hệ thống chuyển đổi dự phòng tức thì. Cơ chế sao lưu tự động hàng ngày (Daily Automated Backups) đảm bảo không bao giờ mất mát hồ sơ quan trọng.",
    },
    {
      icon: Award,
      title: "Thỏa Thuận Bảo Mật Thông Tin (NDA)",
      badge: "Ràng Buộc Pháp Lý",
      description:
        "SmartHire-AI ký kết thỏa thuận bảo mật dữ liệu song phương có giá trị pháp lý trước khi bàn giao hệ thống. Cam kết bằng văn bản không sử dụng dữ liệu độc quyền của quý công ty để huấn luyện bất kỳ mô hình AI công cộng nào.",
    },
  ];

  const securityChecklist = [
    { label: "Phân quyền vai trò RBAC chặt chẽ (Admin, Recruiter, Interviewer)", checked: true },
    { label: "Audit Log ghi nhận vết toàn bộ thao tác xem, sửa, tải CV của nhân viên", checked: true },
    { label: "Chống giả mạo IP & Giới hạn tần suất truy cập (Rate Limiting)", checked: true },
    { label: "Kiểm tra lỗ hổng bảo mật định kỳ theo chuẩn OWASP Top 10", checked: true },
    { label: "Chính sách quản lý khóa mã hóa (KMS) độc lập cho từng khách hàng", checked: true },
    { label: "Hỗ trợ triển khai Private Cloud hoặc On-Premise cho các tập đoàn tài chính", checked: true },
  ];

  return (
    <div className="py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* HERO INTRO */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Tiêu Chuẩn Bảo Mật Cấp Doanh Nghiệp & An Toàn Dữ Liệu</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-[1.15] mb-6">
            Bảo Vệ Dữ Liệu Nhân Sự &{" "}
            <span className="text-blue-600 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 bg-clip-text text-transparent">
              Uy Tín Doanh Nghiệp
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-8 leading-relaxed">
            Hồ sơ ứng viên và thông tin lương thưởng là tài sản bảo mật tối cao của doanh nghiệp. Nền tảng SmartHire-AI được thiết kế với kiến trúc bảo mật đa tầng, đáp ứng các tiêu chuẩn an ninh nghiêm ngặt nhất.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => openDemoModal("Tư Vấn Thẩm Định An Ninh Dữ Liệu & Hợp Đồng")}
              className="px-8 py-3.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
            >
              <span>Yêu Cầu Tài Liệu Thẩm Định Bảo Mật</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/pricing"
              className="px-8 py-3.5 text-sm font-semibold rounded-xl bg-white hover:bg-slate-50 active:scale-98 text-slate-700 border border-slate-300 shadow-2xs transition-all inline-flex items-center gap-2"
            >
              <span>Xem Các Gói Giải Pháp</span>
            </Link>
          </div>
        </div>

        {/* ARCHITECTURE HIGHLIGHT: SEPARATE DATABASE PER TENANT */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-14 shadow-sm mb-24">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-5">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
                Kiến Trúc Multi-Tenant Enterprise
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Mỗi Doanh Nghiệp Sở Hữu Một Cơ Sở Dữ Liệu Độc Lập
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Hầu hết các nền tảng SaaS phổ thông gom chung dữ liệu của hàng ngàn công ty vào một database duy nhất với cột <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">tenant_id</code>, tiềm ẩn rủi ro lộ lọt dữ liệu khi có lỗi phần mềm.
              </p>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                SmartHire-AI áp dụng kiến trúc <strong>Separate Database per Tenant</strong>: Mỗi công ty có Database riêng, bộ Connection Pool (HikariCP) riêng và khóa mã hóa độc lập. Dữ liệu công ty bạn hoàn toàn cô lập về mặt vật lý.
              </p>
              <div className="pt-2 space-y-2.5">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Không bao giờ bị lỗi truy vấn dữ liệu chéo giữa các tổ chức</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Dễ dàng xuất và xóa sạch toàn bộ dữ liệu khi kết thúc hợp đồng</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Tương thích hoàn hảo với yêu cầu kiểm toán an ninh thông tin ngân hàng & tập đoàn</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-slate-900 rounded-2xl p-8 text-white font-mono text-xs shadow-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <span className="text-slate-400">Database Topology</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Isolated Physical Schemas
                </span>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-slate-200 font-bold">tenant_viettel_db</div>
                      <div className="text-[10px] text-slate-400">Schema riêng · AES-256 Encrypted</div>
                    </div>
                  </div>
                  <span className="text-emerald-400 text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800">
                    Active (Tenant 01)
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-indigo-400" />
                    <div>
                      <div className="text-slate-200 font-bold">tenant_techcombank_db</div>
                      <div className="text-[10px] text-slate-400">Schema riêng · Dedicated Pool</div>
                    </div>
                  </div>
                  <span className="text-emerald-400 text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800">
                    Active (Tenant 02)
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-sky-400" />
                    <div>
                      <div className="text-slate-200 font-bold">tenant_fpt_db</div>
                      <div className="text-[10px] text-slate-400">Schema riêng · On-Demand Replica</div>
                    </div>
                  </div>
                  <span className="text-emerald-400 text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800">
                    Active (Tenant 03)
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-700 text-[11px] text-slate-400 text-center">
                Hibernate Dynamic Multi-Tenancy · Connection Routing per Request
              </div>
            </div>
          </div>
        </div>

        {/* 6 PILLARS */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="rounded-3xl bg-white border border-slate-200/90 p-8 shadow-sm hover:shadow-xl hover:border-blue-400/50 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                    {pillar.badge}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{pillar.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{pillar.description}</p>
              </div>
            );
          })}
        </div>

        {/* ENTERPRISE SECURITY CHECKLIST */}
        <div className="rounded-3xl bg-slate-50 border border-slate-200 p-8 sm:p-12 mb-24">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 border border-blue-200">
              Checklist Thẩm Định
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-3 mb-2">
              Danh Mục Tiêu Chuẩn Cho Đội Ngũ An Ninh Thông Tin (SecOps)
            </h2>
            <p className="text-slate-600 text-sm">
              Sẵn sàng hỗ trợ quý doanh nghiệp vượt qua các bài kiểm toán bảo mật khắt khe nhất.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {securityChecklist.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-slate-800">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM CTA */}
        <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-14 text-center shadow-xl">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4">
            Cần Ký Kết Thỏa Thuận Bảo Mật (NDA) Trước Khi Thử Nghiệm?
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
            Chúng tôi sẵn sàng gửi bản dự thảo Thỏa thuận Bảo mật Thông tin (NDA) và Báo cáo Kiểm thử Xâm nhập (Pentest Report) cho ban pháp chế công ty bạn.
          </p>
          <button
            onClick={() => openDemoModal("Yêu Cầu Tài Liệu Bảo Mật & Ký NDA")}
            className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 transition-all inline-flex items-center gap-2"
          >
            <span>Liên Hệ Đội Ngũ Pháp Chế & An Ninh</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
