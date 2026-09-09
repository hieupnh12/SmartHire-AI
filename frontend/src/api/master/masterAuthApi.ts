import { masterClient } from "./client";

const API_BASE = "";

export interface MasterLoginRequest {
  email: string;
  password: string;
}

export interface PlatformUserResponse {
  id: number;
  email: string;
  fullName: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface MasterLoginResponse {
  accessToken: string;
  tokenType: string;
  user: PlatformUserResponse;
  tenantId: string;
}

export const masterAuthApi = {
  login: async (credentials: MasterLoginRequest) => {
    const response = await masterClient.post(`${API_BASE}/master/auth/login`, credentials);
    return response.data;
  },
  me: async (accessToken: string) => {
    const response = await masterClient.get(`${API_BASE}/master/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    return response.data;
  }
};
