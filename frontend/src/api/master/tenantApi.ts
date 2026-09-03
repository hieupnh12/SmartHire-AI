import axios from "axios";

const API_BASE = "http://localhost:8080/api/v1";

export interface OnboardTenantRequest {
  code: string;
  name: string;
  subdomain: string;
}

export interface OnboardTenantResponse {
  id: number;
  code: string;
  name: string;
  subdomain: string;
  dbName: string;
  status: string;
  createdAt: string;
}

export const masterTenantApi = {
  onboardTenant: async (data: OnboardTenantRequest) => {
    const response = await axios.post(`${API_BASE}/master/tenants/onboard`, data);
    return response.data;
  }
};
