import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { getTenantTheme } from "@/features/tenant/career/pages/TenantCareerPage";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { CheckCircle2, ArrowLeft } from "lucide-react";

export function CandidateLoginPage() {
  const navigate = useNavigate();
  const rawTenantCode = getTenantIdFromWindow() || "acme";
  const theme = getTenantTheme(rawTenantCode);

  const [loggedIn, setLoggedIn] = useState(false);

  const handleGoogleLogin = () => {
    setLoggedIn(true);
    setTimeout(() => {
      navigate("/candidate", { replace: true });
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#191b23] font-sans antialiased flex flex-col justify-between selection:bg-teal-600 selection:text-white">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-[#e2e8f0] bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className={`w-10 h-10 rounded-[12px] ${theme.primaryColorBtn} text-white flex items-center justify-center shadow-md font-bold text-lg`}>
              {theme.code.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="text-xl font-bold font-display text-[#1e293b] tracking-tight">
                {theme.name}
              </span>
              <span className={`ml-2.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${theme.badgeBg}`}>
                Candidate Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <LanguageSwitcher />
            <button
              onClick={() => navigate("/")}
              className="text-[#64748b] hover:text-[#1e293b] font-medium flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay Lại Trang Chủ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-md mx-auto px-6 py-16 w-full flex-grow flex items-center justify-center">
        <div className="w-full bg-white border border-[#e2e8f0] rounded-[28px] p-8 sm:p-10 shadow-[0_20px_25px_-5px_rgba(59,130,246,0.05)] text-center animate-fade-in">
          <div className={`w-14 h-14 rounded-[16px] ${theme.primaryColorBtn} text-white flex items-center justify-center mx-auto mb-5 shadow-lg font-bold text-2xl`}>
            {theme.code.charAt(0).toUpperCase()}
          </div>

          <h1 className="text-2xl font-bold font-display text-[#1e293b] mb-2">Đăng Nhập Ứng Viên</h1>
          <p className="text-xs text-[#64748b] mb-8 leading-relaxed">
            Đăng nhập 1-click bằng tài khoản Google để theo dõi trạng thái ứng tuyển & làm bài phỏng vấn AI tại <strong>{theme.name}</strong>
          </p>

          {loggedIn ? (
            <div className="py-8 space-y-3">
              <CheckCircle2 className="w-14 h-14 text-[#16a34a] mx-auto animate-bounce" />
              <h2 className="text-xl font-bold text-[#1e293b]">Xác Thực Google Thành Công 🎉</h2>
              <p className="text-xs text-[#64748b]">Đang chuyển hướng tới trang Quản Lý Hồ Sơ Candidate...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* PURE GOOGLE SSO LOGIN BUTTON */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-4 px-5 rounded-[14px] bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-3 cursor-pointer group"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Tiếp Tục Đăng Nhập Bằng Google</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#e2e8f0] py-6 text-center text-xs text-[#64748b] bg-white">
        {theme.name} Candidate Authentication Portal © 2026.
      </footer>
    </div>
  );
}
