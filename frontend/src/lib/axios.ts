import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiResponse } from "@/types/api";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { t } from "@/i18n";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export const api = axios.create({
  baseURL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

function requestUrl(config: InternalAxiosRequestConfig) {
  return `${config.baseURL ?? ""}${config.url ?? ""}`;
}

function isPublicTenantAuth(url: string) {
  return /\/tenant\/auth\/(login|google|register|refresh|forgot-password|reset-password)(?:\?|$)/.test(url);
}

function isLogoutRequest(url: string) {
  return /\/tenant\/auth\/logout(?:\?|$)/.test(url);
}

function isPublicCareerBrowsePath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/career") ||
    pathname.startsWith("/jobs") ||
    pathname.startsWith("/cv-templates") ||
    pathname.startsWith("/cv/share/") ||
    pathname.startsWith("/cv-guide") ||
    pathname.startsWith("/assessments/sample")
  );
}

function shouldSkipLoginRedirect(pathname: string, url = "") {
  if (isPublicTenantAuth(url) || isLogoutRequest(url)) return true;
  if (!localStorage.getItem("accessToken") && isPublicCareerBrowsePath(pathname)) return true;
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/internal/login") ||
    pathname.startsWith("/oauth/callback") ||
    pathname.startsWith("/invite/accept") ||
    pathname.startsWith("/admin/login")
  );
}

function loginPathFor(pathname: string) {
  if (
    pathname.startsWith("/recruiter") ||
    pathname.startsWith("/internal") ||
    pathname.startsWith("/tenant/admin")
  ) {
    return "/internal/login";
  }
  return "/login";
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("accessToken");
  if (token && !isPublicTenantAuth(requestUrl(config))) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Inject X-Tenant-ID dynamically from the validated tenant subdomain.
  const tenantId = getTenantIdFromWindow();
  if (tenantId) {
    config.headers["X-Tenant-ID"] = tenantId;
  }
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;
  const tenantId = getTenantIdFromWindow() || localStorage.getItem("tenantId");
  try {
    const { data } = await axios.post<ApiResponse<{ accessToken: string; refreshToken?: string }>>(
      `${baseURL}/tenant/auth/refresh`,
      { refreshToken },
      tenantId ? { headers: { "X-Tenant-ID": tenantId } } : undefined,
    );
    if (!data.success || !data.data?.accessToken) return null;
    localStorage.setItem("accessToken", data.data.accessToken);
    if (data.data.refreshToken) {
      localStorage.setItem("refreshToken", data.data.refreshToken);
    }
    return data.data.accessToken;
  } catch {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const errorCode = error.response?.data?.code;
    if (error.response?.status === 403 && errorCode === "TENANT_MISMATCH" && original) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      const pathname = window.location.pathname;
      if (!shouldSkipLoginRedirect(pathname, requestUrl(original))) {
        window.location.href = loginPathFor(pathname);
      }
      return Promise.reject(error);
    }
    if (error.response?.status === 401 && original && !original._retry) {
      const url = requestUrl(original);
      if (isPublicTenantAuth(url) || isLogoutRequest(url)) {
        return Promise.reject(error);
      }
      original._retry = true;
      refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null;
      });
      const token = await refreshing;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
      const pathname = window.location.pathname;
      if (!shouldSkipLoginRedirect(pathname, requestUrl(original))) {
        window.location.href = loginPathFor(pathname);
      }
    }
    return Promise.reject(error);
  },
);

const FRIENDLY_ERROR_CODES = new Set([
  "AI_INTERVIEW_PROVIDER_OVERLOADED",
  "AI_INTERVIEW_PROVIDER_TIMEOUT",
  "AI_INTERVIEW_PROVIDER_UNAVAILABLE",
  "AI_INTERVIEW_PROVIDER_RATE_LIMITED",
  "AI_INTERVIEW_PROVIDER_AUTH_FAILED",
  "AI_INTERVIEW_PROVIDER_MODEL_NOT_FOUND",
  "AI_INTERVIEW_LOCKED",
  "INTERNAL_ERROR",
  "VALIDATION_ERROR",
  "BAD_REQUEST",
]);

export function getApiErrorMessage(error: unknown, fallback?: string): string {
  const defaultFallback = fallback ?? t("errors.requestFailed");
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiResponse<unknown> | undefined;
    if (data?.errors) {
      return Object.values(data.errors).join(", ");
    }
    if (data?.code && FRIENDLY_ERROR_CODES.has(data.code)) {
      return t(`errors.codes.${data.code}`);
    }
    if (error.code === "ECONNABORTED") return t("errors.timeout");
    if (!error.response) return t("errors.network");
    if (error.response.status === 403) return t("errors.forbidden");
    if (error.response.status === 404) return t("errors.notFound");
    if (error.response.status >= 500) return t("errors.codes.INTERNAL_ERROR");
    if (data?.message) return data.message;
  }
  if (error instanceof Error && import.meta.env.DEV) console.error(error);
  return defaultFallback;
}
