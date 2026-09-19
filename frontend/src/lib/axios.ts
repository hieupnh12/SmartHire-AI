import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiResponse } from "@/types/api";
import { getTenantIdFromWindow } from "@/lib/tenant";

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
  return /\/tenant\/auth\/(login|google|register|refresh)(?:\?|$)/.test(url);
}

function shouldSkipLoginRedirect(pathname: string, url = "") {
  if (isPublicTenantAuth(url)) return true;
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/internal/login") ||
    pathname.startsWith("/candidate/login") ||
    pathname.startsWith("/oauth/callback") ||
    pathname.startsWith("/invite/accept") ||
    pathname.startsWith("/admin/login")
  );
}

function loginPathFor(pathname: string) {
  if (
    pathname.startsWith("/candidate") ||
    pathname.startsWith("/oauth") ||
    pathname.startsWith("/career") ||
    pathname.startsWith("/jobs")
  ) {
    return "/candidate/login";
  }
  return "/internal/login";
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
  try {
    const { data } = await axios.post<ApiResponse<{ accessToken: string; refreshToken?: string }>>(
      `${baseURL}/tenant/auth/refresh`,
      { refreshToken },
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
    if (error.response?.status === 401 && original && !original._retry) {
      if (isPublicTenantAuth(requestUrl(original))) {
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

export function getApiErrorMessage(error: unknown, fallback = "Request failed"): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiResponse<unknown> | undefined;
    if (data?.message) return data.message;
    if (data?.errors) {
      return Object.values(data.errors).join(", ");
    }
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
