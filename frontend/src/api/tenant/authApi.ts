import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { AuthTokens, LoginRequest, RegisterRequest, UserProfile } from "@/features/tenant/auth/types";

export const authApi = {
  login: (body: LoginRequest) =>
    api.post<ApiResponse<AuthTokens>>("/tenant/auth/login", body).then((r) => r.data),
  register: (body: RegisterRequest) =>
    api.post<ApiResponse<AuthTokens>>("/tenant/auth/register", body).then((r) => r.data),
  google: (idToken: string) =>
    api.post<ApiResponse<AuthTokens>>("/tenant/auth/google", { idToken }).then((r) => r.data),
  refresh: (refreshToken: string) =>
    api.post<ApiResponse<AuthTokens>>("/tenant/auth/refresh", { refreshToken }).then((r) => r.data),
  logout: () => api.post<ApiResponse<null>>("/tenant/auth/logout").then((r) => r.data),
  me: () => api.get<ApiResponse<UserProfile>>("/tenant/users/me").then((r) => r.data),
  updateMe: (body: Partial<UserProfile>) =>
    api.put<ApiResponse<UserProfile>>("/tenant/users/me", body).then((r) => r.data),
  health: () => api.get<ApiResponse<Record<string, string>>>("/tenant/auth/health").then((r) => r.data),
};
