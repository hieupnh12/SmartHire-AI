import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { authApi } from "@/api/tenant/authApi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { t as globalT, useT } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { getTenantIdFromSubdomain, getBaseDomain, buildTenantUrl } from "@/lib/tenant";

const inFlightGoogleAuth = new Map<string, ReturnType<typeof authApi.google>>();

function authenticateGoogleOnce(idToken: string) {
  let pending = inFlightGoogleAuth.get(idToken);
  if (!pending) {
    pending = authApi.google(idToken).finally(() => {
      window.setTimeout(() => inFlightGoogleAuth.delete(idToken), 5_000);
    });
    inFlightGoogleAuth.set(idToken, pending);
  }
  return pending;
}

export function OAuthCallbackPage() {
  const t = useT();
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [statusMessage, setStatusMessage] = useState(() => globalT("auth.oauth.processingGoogle"));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const handleCallback = async () => {
      try {
        const hash = window.location.hash.startsWith("#") ? window.location.hash.substring(1) : window.location.hash;
        const search = window.location.search.startsWith("?") ? window.location.search.substring(1) : window.location.search;
        const params = new URLSearchParams(hash || search);

        const error = params.get("error");
        if (error) {
          const errorDesc = params.get("error_description") || error;
          if (!isCancelled) {
            setStatus("error");
            setErrorMessage(globalT("auth.oauth.googleError", { error: errorDesc }));
          }
          return;
        }

        const idToken = params.get("id_token");
        const rawState = params.get("state");

        let targetTenant = "acme";
        let redirectUrl = "/";

        if (rawState) {
          try {
            const decoded = JSON.parse(atob(rawState));
            if (decoded.tenant) targetTenant = decoded.tenant;
            if (decoded.redirectUrl) redirectUrl = decoded.redirectUrl;
          } catch {
            targetTenant = rawState;
          }
        }

        const hostname = window.location.hostname;
        const port = window.location.port ? `:${window.location.port}` : "";
        const baseDomain = getBaseDomain();
        const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost");
        const onTenantHost = Boolean(getTenantIdFromSubdomain());

        if (!onTenantHost && targetTenant && targetTenant !== "smarthire") {
          if (!isCancelled) {
            setStatusMessage(globalT("auth.oauth.redirectingWorkspace", { tenant: targetTenant }));
          }
          const host = isLocal ? `${targetTenant}.localhost` : `${targetTenant}.${baseDomain}`;
          window.location.href = `${window.location.protocol}//${host}${port}/oauth/callback${window.location.search}${window.location.hash}`;
          return;
        }

        if (!idToken) {
          if (!isCancelled) {
            setStatus("error");
            setErrorMessage(globalT("auth.oauth.missingIdToken"));
          }
          return;
        }

        if (targetTenant) {
          localStorage.setItem("tenantId", targetTenant);
        }

        if (!isCancelled) {
          setStatusMessage(globalT("auth.oauth.verifyingSmartHire"));
        }

        const response = await authenticateGoogleOnce(idToken);

        if (isCancelled) return;

        if (response.success && response.data) {
          const { accessToken, refreshToken, subdomain, candidate } = response.data;
          setTokens(accessToken, refreshToken);
          setUser({
            id: candidate.id,
            email: candidate.email,
            fullName: candidate.fullName,
            role: candidate.role,
            workspace: "CANDIDATE",
            avatarUrl: candidate.avatarUrl,
            headline: candidate.headline,
          });

          setStatus("success");
          setStatusMessage(globalT("auth.oauth.loginSuccessRedirect"));

          window.setTimeout(() => {
            const targetUrl = buildTenantUrl(subdomain, redirectUrl);
            if (window.location.href !== targetUrl) {
              window.location.href = targetUrl;
            } else {
              navigate(redirectUrl, { replace: true });
            }
          }, 600);
        } else {
          setStatus("error");
          setErrorMessage(response.message || globalT("auth.oauth.googleLoginFailed"));
        }
      } catch (err: unknown) {
        if (isCancelled) return;
        setStatus("error");
        setErrorMessage(getApiErrorMessage(err, globalT("auth.oauth.authServerError")));
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
            <h2 className="font-display text-xl font-bold text-[#1e293b]">{t("auth.oauth.verifyingTitle")}</h2>
            <p className="text-sm text-[#64748b]">{statusMessage}</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="font-display text-xl font-bold text-[#1e293b]">{t("auth.oauth.successTitle")}</h2>
            <p className="text-sm text-[#64748b]">{statusMessage}</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-xl font-bold text-[#1e293b]">{t("auth.oauth.failedTitle")}</h2>
              <p className="text-sm text-red-600">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[#1e293b] px-4 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-[#0f172a]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t("auth.oauth.backToLogin")}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
