import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { AuthTokens, LoginRequest, RegisterRequest, UserProfile } from "@/features/auth/types";

export const authApi = {
  login: (body: LoginRequest) =>
    api.post<ApiResponse<AuthTokens>>("/auth/login", body).then((r) => r.data),
  register: (body: RegisterRequest) =>
    api.post<ApiResponse<AuthTokens>>("/auth/register", body).then((r) => r.data),
  google: (idToken: string) =>
    api.post<ApiResponse<AuthTokens>>("/auth/google", { idToken }).then((r) => r.data),
  refresh: (refreshToken: string) =>
    api.post<ApiResponse<AuthTokens>>("/auth/refresh", { refreshToken }).then((r) => r.data),
  logout: () => api.post<ApiResponse<null>>("/auth/logout").then((r) => r.data),
  me: () => api.get<ApiResponse<UserProfile>>("/users/me").then((r) => r.data),
  updateMe: (body: Partial<UserProfile>) =>
    api.put<ApiResponse<UserProfile>>("/users/me", body).then((r) => r.data),
  health: () => api.get<ApiResponse<Record<string, string>>>("/auth/health").then((r) => r.data),
};
