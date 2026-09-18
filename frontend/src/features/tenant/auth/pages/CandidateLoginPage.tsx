import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { getTenantTheme, getTenantThemeStyle } from "@/lib/tenantTheme";
import { getTenantIdFromWindow, getCentralOAuthRedirectUri } from "@/lib/tenant";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function CandidateLoginPage() {
  const navigate = useNavigate();
  const rawTenantCode = getTenantIdFromWindow() || "acme";
  const theme = getTenantTheme(rawTenantCode);

  const [redirecting, setRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleLogin = () => {
    if (!googleClientId) {
      setErrorMessage("Chưa cấu hình VITE_GOOGLE_CLIENT_ID trong biến môi trường.");
      return;
    }

    setRedirecting(true);
    setErrorMessage(null);

    const currentTenant = getTenantIdFromWindow() || "acme";
    const redirectUri = getCentralOAuthRedirectUri();

    // Store state with target tenant & return path
    const stateObj = {
      tenant: currentTenant,
      redirectUrl: "/candidate",
      timestamp: Date.now(),
    };
    const state = btoa(JSON.stringify(stateObj));
    const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);

    // Save tenant context to local storage as safety fallback
    localStorage.setItem("tenantId", currentTenant);

    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", googleClientId);
    googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
    googleAuthUrl.searchParams.set("response_type", "id_token");
    googleAuthUrl.searchParams.set("scope", "openid email profile");
    googleAuthUrl.searchParams.set("state", state);
    googleAuthUrl.searchParams.set("nonce", nonce);
    googleAuthUrl.searchParams.set("prompt", "select_account");

    window.location.href = googleAuthUrl.toString();
  };

  return (
    <div className="tenant-workspace-theme flex min-h-screen flex-col bg-[var(--color-surface)] text-[var(--color-on-surface)]" style={getTenantThemeStyle(theme)}>
      <header className="relative z-10 border-b border-[var(--color-border-default)] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex min-w-0 items-center gap-3 text-left"
            aria-label="Về trang tuyển dụng"
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${theme.primaryColorBtn} text-lg font-bold text-white shadow-md`}>
              {theme.code.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-lg font-bold tracking-tight text-[#1e293b] sm:text-xl">
                {theme.name}
              </span>
              <span className={`mt-1 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${theme.badgeBg}`}>
                Candidate Portal
              </span>
            </span>
          </button>

          <div className="flex items-center gap-3 text-xs">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-[8px] px-3 font-medium text-[#64748b] transition-colors hover:bg-[#f1f5f9] hover:text-[#1e293b]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Quay lại</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-10 sm:px-6 lg:py-16">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${theme.badgeBg}`}>
              Enterprise AI Recruiting
            </div>
            <div className="max-w-2xl space-y-4">
              <h1 className="font-display text-4xl font-extrabold leading-tight tracking-normal text-[#0f172a] sm:text-5xl">
                Theo dõi ứng tuyển và phỏng vấn AI trong một không gian riêng.
              </h1>
              <p className="text-sm leading-7 text-[#475569] sm:text-base">
                Cổng ứng viên giúp bạn xem trạng thái hồ sơ, lịch phỏng vấn, bài đánh giá kỹ thuật và phiên luyện phỏng vấn AI tại <strong>{theme.name}</strong>.
              </p>
            </div>
            <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
              {[
                ["03", "hồ sơ đang theo dõi"],
                ["01", "bài AI interview sẵn sàng"],
                ["24h", "cập nhật phản hồi"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-[8px] border border-[#e2e8f0] bg-white p-4 shadow-sm">
                  <div className="font-display text-2xl font-bold text-[#0f172a]">{value}</div>
                  <div className="mt-1 text-xs text-[#64748b]">{label}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[8px] border border-[#e2e8f0] bg-white p-6 text-center shadow-[0_20px_25px_-5px_rgba(59,130,246,0.05)] sm:p-8">
            <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[8px] ${theme.primaryColorBtn} text-2xl font-bold text-white shadow-lg`}>
              {theme.code.charAt(0).toUpperCase()}
            </div>

            <h2 className="font-display text-2xl font-bold text-[#1e293b]">
              Đăng Nhập Ứng Viên
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#64748b]">
              Đăng nhập 1-click bằng tài khoản Google để theo dõi trạng thái ứng tuyển & làm bài phỏng vấn AI tại <strong>{theme.name}</strong>
            </p>

            {/* Google OAuth Centralized Redirect Sign-in Button */}
            <div className="mt-8 flex w-full justify-center">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={redirecting}
                className="flex w-full max-w-xs items-center justify-center gap-3 rounded-[8px] border border-[#dadce0] bg-white px-5 py-3 text-sm font-medium text-[#3c4043] shadow-sm transition-all hover:bg-[#f8fafd] hover:shadow focus:outline-none focus:ring-2 focus:ring-[#4285F4]/30 disabled:opacity-60"
              >
                {redirecting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-[#4285F4]" />
                    <span>Đang chuyển hướng sang Google...</span>
                  </>
                ) : (
                  <>
                    <GoogleIcon />
                    <span>Tiếp tục với Google</span>
                  </>
                )}
              </button>
            </div>

            {errorMessage && (
              <div className="mt-4 flex items-center gap-2 rounded-[8px] border border-red-200 bg-red-50 p-3 text-left text-xs font-medium text-red-700" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="border-t border-[#e2e8f0] bg-white py-6 text-center text-xs text-[#64748b]">
        {theme.name} Candidate Authentication Portal © 2026.
      </footer>
    </div>
  );
}

