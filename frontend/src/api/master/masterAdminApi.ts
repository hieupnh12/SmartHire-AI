import axios from "axios";

const API_BASE = "http://localhost:8080/api/v1";

// Types
export interface TenantInfo {
  id: number;
  code: string;
  name: string;
  subdomain: string;
  dbName: string;
  status: string;
  createdAt: string;
}

export interface SubscriptionPlan {
  id?: number;
  code: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  maxJobs: number;
  maxCvParses: number;
  maxAiInterviewHours: number;
  status?: string;
}

export interface RevenueAnalytics {
  mrr: number;
  arr: number;
  activeTenants: number;
  growthRate: string;
  planDistribution: Record<string, number>;
}

export interface AiQuotaUsage {
  totalCvParsesUsed: number;
  totalCvParsesLimit: number;
  totalVoiceHoursUsed: number;
  totalVoiceHoursLimit: number;
  activeModels: string[];
  systemHealth: string;
}

export interface AuditLog {
  id: number;
  tenantCode: string;
  action: string;
  description: string;
  level: "INFO" | "WARN" | "ERROR";
  timestamp: string;
  ipAddress: string;
}

export const masterAdminApi = {
  // 1. Tenants
  getTenants: async (): Promise<TenantInfo[]> => {
    const res = await axios.get(`${API_BASE}/master/tenants`);
    return res.data.data;
  },
  getTenantById: async (id: number): Promise<TenantInfo> => {
    const res = await axios.get(`${API_BASE}/master/tenants/${id}`);
    return res.data.data;
  },
  updateTenantStatus: async (id: number, status: "ACTIVE" | "SUSPENDED"): Promise<TenantInfo> => {
    const res = await axios.patch(`${API_BASE}/master/tenants/${id}/status?status=${status}`);
    return res.data.data;
  },
  checkTenantExists: async (codeOrSubdomain: string): Promise<boolean> => {
    try {
      const res = await axios.get(`${API_BASE}/master/tenants/check/${codeOrSubdomain}`);
      return res.data.data;
    } catch {
      return false;
    }
  },
  provisionTenant: async (data: { code: string; name: string; subdomain: string }): Promise<TenantInfo> => {
    const res = await axios.post(`${API_BASE}/master/tenants/onboard`, data);
    return res.data.data;
  },

  // 2. Subscriptions
  getSubscriptions: async (): Promise<SubscriptionPlan[]> => {
    const res = await axios.get(`${API_BASE}/master/subscriptions`);
    return res.data.data;
  },
  createSubscription: async (plan: SubscriptionPlan): Promise<SubscriptionPlan> => {
    const res = await axios.post(`${API_BASE}/master/subscriptions`, plan);
    return res.data.data;
  },
  updateSubscription: async (id: number, plan: SubscriptionPlan): Promise<SubscriptionPlan> => {
    const res = await axios.put(`${API_BASE}/master/subscriptions/${id}`, plan);
    return res.data.data;
  },
  updateSubscriptionStatus: async (id: number, status: "ACTIVE" | "INACTIVE"): Promise<SubscriptionPlan> => {
    const res = await axios.patch(`${API_BASE}/master/subscriptions/${id}/status?status=${status}`);
    return res.data.data;
  },

  // 3. Analytics & Logs
  getRevenueAnalytics: async (): Promise<RevenueAnalytics> => {
    const res = await axios.get(`${API_BASE}/master/analytics/revenue`);
    return res.data.data;
  },
  getAiQuotaUsage: async (): Promise<AiQuotaUsage> => {
    const res = await axios.get(`${API_BASE}/master/analytics/ai-quota`);
    return res.data.data;
  },
  getAuditLogs: async (): Promise<AuditLog[]> => {
    const res = await axios.get(`${API_BASE}/master/analytics/logs`);
    return res.data.data;
  }
};
