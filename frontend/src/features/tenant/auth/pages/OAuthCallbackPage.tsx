import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { authApi } from "@/api/tenant/authApi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { getTenantIdFromSubdomain, getBaseDomain, buildTenantUrl } from "@/lib/tenant";

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [statusMessage, setStatusMessage] = useState("Đang xử lý phản hồi từ Google...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const handleCallback = async () => {
      try {
        // 1. Extract Hash or Query Parameters from Google Redirect
        // Google implicit flow returns: #id_token=...&access_token=...&state=...
        const hash = window.location.hash.startsWith("#") ? window.location.hash.substring(1) : window.location.hash;
        const search = window.location.search.startsWith("?") ? window.location.search.substring(1) : window.location.search;
        const params = new URLSearchParams(hash || search);

        const error = params.get("error");
        if (error) {
          const errorDesc = params.get("error_description") || error;
          if (!isCancelled) {
            setStatus("error");
            setErrorMessage(`Lỗi từ Google: ${errorDesc}`);
          }
          return;
        }

        const idToken = params.get("id_token");
        const rawState = params.get("state");

        let targetTenant = "acme";
        let redirectUrl = "/candidate";

        if (rawState) {
          try {
            const decoded = JSON.parse(atob(rawState));
            if (decoded.tenant) targetTenant = decoded.tenant;
            if (decoded.redirectUrl) redirectUrl = decoded.redirectUrl;
          } catch {
            // Fallback if rawState is a plain tenant string
            targetTenant = rawState;
          }
        }

        const hostname = window.location.hostname;
        const port = window.location.port ? `:${window.location.port}` : "";
        const baseDomain = getBaseDomain();
        const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost");
        const onTenantHost = Boolean(getTenantIdFromSubdomain());

        // Google returns to the central callback; hop onto the tenant host before calling the API.
        if (!onTenantHost && targetTenant && targetTenant !== "smarthire") {
          if (!isCancelled) {
            setStatusMessage(`Đang chuyển hướng về không gian ${targetTenant}...`);
          }
          const host = isLocal ? `${targetTenant}.localhost` : `${targetTenant}.${baseDomain}`;
          window.location.href = `${window.location.protocol}//${host}${port}/oauth/callback${window.location.search}${window.location.hash}`;
          return;
        }

        // 3. We are on the target tenant (or local environment)
        if (!idToken) {
          if (!isCancelled) {
            setStatus("error");
            setErrorMessage("Không nhận được Google ID Token hợp lệ từ máy chủ Google.");
          }
          return;
        }

        if (targetTenant) {
          localStorage.setItem("tenantId", targetTenant);
        }

        if (!isCancelled) {
          setStatusMessage("Đang xác thực thông tin tài khoản với SmartHire...");
        }

        // 4. Authenticate with Backend
        const response = await authApi.google(idToken);

        if (isCancelled) return;

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

          setStatus("success");
          setStatusMessage("Đăng nhập thành công! Đang chuyển hướng...");

          window.setTimeout(() => {
            const targetUrl = buildTenantUrl(targetTenant, redirectUrl);
            if (window.location.href !== targetUrl) {
              window.location.href = targetUrl;
            } else {
              navigate(redirectUrl, { replace: true });
            }
          }, 600);
        } else {
          setStatus("error");
          setErrorMessage(response.message || "Đăng nhập bằng Google không thành công. Vui lòng thử lại.");
        }
      } catch (err: unknown) {
        if (isCancelled) return;
        setStatus("error");
        const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra khi xác thực với máy chủ SmartHire.";
        setErrorMessage(msg);
      }
    };

    handleCallback();

    return () => {
      isCancelled = true;
    };
  }, [navigate, setTokens, setUser]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-surface)] px-4 text-[var(--color-on-surface)]">
      <div className="w-full max-w-md rounded-[16px] border border-[#e2e8f0] bg-white p-8 text-center shadow-lg">
        {status === "processing" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#3b82f6]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <h2 className="font-display text-xl font-bold text-[#1e293b]">Đang xác thực Google</h2>
            <p className="text-sm text-[#64748b]">{statusMessage}</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="font-display text-xl font-bold text-[#1e293b]">Đăng nhập thành công</h2>
            <p className="text-sm text-[#64748b]">{statusMessage}</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-xl font-bold text-[#1e293b]">Xác thực thất bại</h2>
              <p className="text-sm text-red-600">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/candidate/login", { replace: true })}
              className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#1e293b] px-4 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-[#0f172a]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại trang đăng nhập</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
