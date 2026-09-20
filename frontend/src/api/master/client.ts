import axios, { type InternalAxiosRequestConfig } from "axios";
import type { ApiResponse } from "@/types/api";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export const masterClient = axios.create({
  baseURL,
  timeout: 120_000,
});

masterClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("master_access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing: Promise<string | null> | null = null;

async function refreshMasterAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("master_refresh_token");
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post<ApiResponse<{ accessToken: string; refreshToken?: string }>>(
      `${baseURL}/master/auth/refresh`,
      { refreshToken }
    );
    if (!data.success || !data.data?.accessToken) return null;
    localStorage.setItem("master_access_token", data.data.accessToken);
    if (data.data.refreshToken) {
      localStorage.setItem("master_refresh_token", data.data.refreshToken);
    }
    return data.data.accessToken;
  } catch {
    localStorage.removeItem("master_access_token");
    localStorage.removeItem("master_refresh_token");
    return null;
  }
}

masterClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
      
      // Do not attempt refresh on the login or refresh endpoints
      const url = original?.url || "";
      if (url.includes("/master/auth/login") || url.includes("/master/auth/refresh")) {
        return Promise.reject(error);
      }

      if (original && !original._retry) {
        original._retry = true;
        isRefreshing ??= refreshMasterAccessToken().finally(() => {
          isRefreshing = null;
        });

        const newToken = await isRefreshing;
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return masterClient(original);
        }
      }

      localStorage.removeItem("master_access_token");
      localStorage.removeItem("master_refresh_token");
      if (window.location.pathname !== "/admin/login") {
        window.location.assign("/admin/login");
      }
    }
    return Promise.reject(error);
  },
);

