import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { authApi } from "@/api/tenant/authApi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { getTenantTheme } from "@/features/tenant/career/pages/TenantCareerPage";
import { getTenantIdFromWindow } from "@/lib/tenant";

export function CandidateLoginPage() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const rawTenantCode = getTenantIdFromWindow() || "acme";
  const theme = getTenantTheme(rawTenantCode);

  const [loggingIn, setLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processGoogleCredential = async (idToken: string) => {
    setLoggingIn(true);
    setErrorMessage(null);

    try {
      const response = await authApi.google(idToken);

      if (response.success && response.data) {
        const { accessToken, refreshToken, candidate } = response.data;
        setTokens(accessToken, refreshToken);
        setUser({
          id: candidate.id,
          email: candidate.email,
          fullName: candidate.fullName,
          role: candidate.role,
          avatarUrl: candidate.avatarUrl,
          headline: candidate.headline,
        });

        window.setTimeout(() => {
          navigate("/candidate", { replace: true });
        }, 500);
      } else {
        setErrorMessage(response.message || "Đăng nhập bằng Google không thành công. Vui lòng thử lại.");
        setLoggingIn(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra khi xác thực Google. Vui lòng thử lại.";
      setErrorMessage(msg);
      setLoggingIn(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-surface)] text-[var(--color-on-surface)] selection:bg-teal-600 selection:text-white">
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
              ACME Enterprise IT
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

            {/* Google Real OAuth Sign In Button */}
            <div className="mt-8 flex w-full justify-center">
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  if (credentialResponse.credential) {
                    processGoogleCredential(credentialResponse.credential);
                  } else {
                    setErrorMessage("Không nhận được Google Credential Token.");
                  }
                }}
                onError={() => {
                  setErrorMessage("Đăng nhập Google thất bại hoặc cửa sổ bị đóng.");
                }}
                useOneTap
                theme="outline"
                size="large"
                text="continue_with"
                shape="rectangular"
                width="320"
              />
            </div>

            {errorMessage && (
              <div className="mt-4 flex items-center gap-2 rounded-[8px] border border-red-200 bg-red-50 p-3 text-left text-xs font-medium text-red-700" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            )}

            {loggingIn && !errorMessage && (
              <div className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-[#16a34a]" role="status">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                <span>Đang xác thực với máy chủ Google & khởi tạo hồ sơ...</span>
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
