import axios from "axios";

export const masterClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
  timeout: 120_000,
});

masterClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("master_access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

masterClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem("master_access_token");
      if (window.location.pathname !== "/admin/login") window.location.assign("/admin/login");
    }
    return Promise.reject(error);
  },
);
