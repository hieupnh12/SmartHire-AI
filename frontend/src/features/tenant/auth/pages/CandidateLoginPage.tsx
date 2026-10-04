import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { landingApi } from "@/api/tenant/landingApi";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { getTenantTheme, getTenantThemeStyle } from "@/lib/tenantTheme";
import { getCentralOAuthRedirectUri, getTenantIdFromWindow } from "@/lib/tenant";
import "./candidate-login.css";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function GoogleIcon() {
  return (
    <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
    </svg>
  );
}

export function CandidateLoginPage() {
  const navigate = useNavigate();
  const theme = getTenantTheme(getTenantIdFromWindow() || "acme");
  const [redirecting, setRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const publicLanding = useQuery({
    queryKey: ["public-landing", theme.code],
    queryFn: landingApi.getPublicLanding,
    staleTime: 60_000,
  });
  const logoUrl = publicLanding.data?.data.header.logoImageUrl?.trim() || null;
  const showLogo = !!logoUrl && failedLogoUrl !== logoUrl;

  const handleGoogleLogin = () => {
    if (!googleClientId) {
      setErrorMessage("Chưa cấu hình VITE_GOOGLE_CLIENT_ID trong biến môi trường.");
      return;
    }

    setRedirecting(true);
    setErrorMessage(null);
    const currentTenant = getTenantIdFromWindow() || "acme";
    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", googleClientId);
    googleAuthUrl.searchParams.set("redirect_uri", getCentralOAuthRedirectUri());
    googleAuthUrl.searchParams.set("response_type", "id_token");
    googleAuthUrl.searchParams.set("scope", "openid email profile");
    googleAuthUrl.searchParams.set("state", btoa(JSON.stringify({ tenant: currentTenant, redirectUrl: "/", timestamp: Date.now() })));
    googleAuthUrl.searchParams.set("nonce", Math.random().toString(36).substring(2) + Date.now().toString(36));
    googleAuthUrl.searchParams.set("prompt", "select_account");
    localStorage.setItem("tenantId", currentTenant);
    window.location.href = googleAuthUrl.toString();
  };

  return (
    <div className="candidate-login-page tenant-workspace-theme bg-[var(--color-surface-alt)] text-[var(--color-on-surface)]" style={getTenantThemeStyle(theme)}>
      <header className="candidate-login-header z-10 border-b border-[var(--color-border-default)] bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <button type="button" onClick={() => navigate("/")} className="flex min-w-0 items-center gap-3 text-left" aria-label={`Về trang tuyển dụng ${theme.name}`}>
            <span className={`grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl font-semibold ${showLogo ? "border border-[var(--color-border-default)] bg-white p-1" : "bg-[var(--color-primary)] text-white"}`}>
              {showLogo ? <img src={logoUrl} alt="" className="size-full object-contain" onError={() => setFailedLogoUrl(logoUrl)} /> : theme.code.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0"><span className="block truncate text-base font-semibold text-slate-900">{theme.name}</span><span className="hidden text-xs text-slate-500 sm:block">Cổng tuyển dụng nhân tài</span></span>
          </button>
          <div className="flex items-center gap-1"><LanguageSwitcher variant="icon" /><button type="button" onClick={() => navigate("/")} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"><ArrowLeft className="size-4" aria-hidden="true" /><span className="hidden sm:inline">Quay lại</span></button></div>
        </div>
      </header>

      <main className="candidate-login-main">
        <div className="candidate-login-shell border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-ambient)]">
          <section className="candidate-login-intro text-white" style={{ background: `linear-gradient(145deg, ${theme.primary}, ${theme.primaryHover})` }}>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold"><Sparkles className="size-4" aria-hidden="true" />Không gian ứng viên</span>
            <h1 className="mt-5 max-w-xl text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">Theo dõi hành trình ứng tuyển của bạn tại {theme.name}.</h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/75">Quản lý hồ sơ, lịch phỏng vấn và bài đánh giá trong một không gian bảo mật, thuận tiện.</p>
            <ul className="mt-6 space-y-3 text-sm">
              {["Theo dõi trạng thái hồ sơ", "Nhận lịch phỏng vấn và bài đánh giá", "Bảo vệ thông tin ứng viên"].map((item) => <li key={item} className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-white/15"><CheckCircle2 className="size-4" aria-hidden="true" /></span>{item}</li>)}
            </ul>
          </section>

          <section className="candidate-login-auth bg-white">
            <div className="w-full max-w-md">
              <div className="p-1 sm:p-2">
                <div className="candidate-login-brand" aria-hidden="true">
                  {showLogo ? <img src={logoUrl} alt="" onError={() => setFailedLogoUrl(logoUrl)} /> : <span>{theme.code.charAt(0).toUpperCase()}</span>}
                </div>
                <div className="candidate-login-reveal text-center">
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Đăng nhập vào {theme.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Dùng tài khoản Google để tiếp tục.</p>
                </div>
                <button type="button" onClick={handleGoogleLogin} disabled={redirecting} className="candidate-login-reveal candidate-login-reveal-delay mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition-[border-color,background-color,box-shadow] duration-200 hover:border-[var(--color-primary)]/50 hover:bg-slate-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 disabled:cursor-wait disabled:opacity-60">
                  {redirecting ? <><Loader2 className="size-5 animate-spin text-[var(--color-primary)]" aria-hidden="true" />Đang kết nối...</> : <><GoogleIcon />Tiếp tục với Google<ArrowRight className="size-4 text-slate-400" aria-hidden="true" /></>}
                </button>
                {errorMessage && <div className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--color-error-container)] bg-[var(--color-error-container)] p-3 text-sm text-[var(--color-on-error-container)]" role="alert"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>{errorMessage}</span></div>}
                <p className="mt-5 flex items-start gap-2 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />Hệ thống không lưu hoặc chia sẻ mật khẩu Google của bạn.</p>
              </div>
              <p className="mt-4 text-center text-xs text-slate-400">© 2026 {theme.name}. Cổng thông tin ứng viên.</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
