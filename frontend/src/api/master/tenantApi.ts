import { masterClient } from "./client";
import type { ApiResponse } from "@/types/api";

export interface TenantAdminRequest {
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface OnboardTenantRequest extends TenantAdminRequest {
  code: string;
  name: string;
  subdomain: string;
  environmentType?: "PRODUCTION" | "POC_SANDBOX";
}

export interface OnboardTenantResponse {
  id: number;
  code: string;
  name: string;
  subdomain: string;
  dbName: string;
  status: string;
  environmentType?: string;
  createdAt: string;
}

export const masterTenantApi = {
  onboardTenant: async (data: OnboardTenantRequest) =>
    (await masterClient.post<ApiResponse<OnboardTenantResponse>>("/master/tenants/onboard", data)).data.data,
  retry: async (id: number, data: TenantAdminRequest) =>
    (await masterClient.post<ApiResponse<OnboardTenantResponse>>(`/master/tenants/${id}/retry`, data)).data.data,
};
