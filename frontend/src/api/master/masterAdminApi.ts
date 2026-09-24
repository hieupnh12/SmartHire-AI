import { masterClient } from "./client";

const API_BASE = "";

// Types
export interface TenantInfo {
  id: number;
  code: string;
  name: string;
  subdomain: string;
  dbName: string;
  status: string;
  environmentType?: "PRODUCTION" | "POC_SANDBOX";
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
  maxAiInterviewHours: number | null;
  maxStorageGb?: number | null;
  maxProctoringHours?: number | null;
  videoRetentionDays?: number | null;
  priceMonthlyVnd?: number;
  priceYearlyVnd?: number;
  status?: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  mrr: number;
  arr: number;
  activeTenants: number;
  totalTenants: number;
  growthRate: string;
  planDistribution: Record<string, number>;
  revenueTrend: ChartDataPoint[];
}

export interface AiQuotaUsage {
  totalCvParsesUsed: number;
  totalVoiceSecondsUsed: number;
  totalTokensConsumed: number;
  systemHealth: string;
  activeModels: string[];
  usageTrend: ChartDataPoint[];
  totalVoiceHoursUsed?: number;
  totalCvParsesLimit?: number;
  totalVoiceHoursLimit?: number;
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
    const res = await masterClient.get(`${API_BASE}/master/tenants`);
    return res.data.data;
  },
  getTenantById: async (id: number): Promise<TenantInfo> => {
    const res = await masterClient.get(`${API_BASE}/master/tenants/${id}`);
    return res.data.data;
  },
  updateTenantStatus: async (id: number, status: "ACTIVE" | "SUSPENDED"): Promise<TenantInfo> => {
    const res = await masterClient.patch(`${API_BASE}/master/tenants/${id}/status?status=${status}`);
    return res.data.data;
  },
  checkSubdomainExists: async (subdomain: string): Promise<boolean> => {
    const res = await masterClient.get(`${API_BASE}/master/tenants/check-subdomain/${subdomain}`);
    return res.data.data;
  },
  provisionTenant: async (data: import("./tenantApi").OnboardTenantRequest): Promise<TenantInfo> => {
    const res = await masterClient.post(`${API_BASE}/master/tenants/onboard`, data);
    return res.data.data;
  },

  // 2. Subscriptions
  getSubscriptions: async (): Promise<SubscriptionPlan[]> => {
    const res = await masterClient.get(`${API_BASE}/master/subscriptions`);
    return res.data.data;
  },
  createSubscription: async (plan: SubscriptionPlan): Promise<SubscriptionPlan> => {
    const res = await masterClient.post(`${API_BASE}/master/subscriptions`, plan);
    return res.data.data;
  },
  updateSubscription: async (id: number, plan: SubscriptionPlan): Promise<SubscriptionPlan> => {
    const res = await masterClient.put(`${API_BASE}/master/subscriptions/${id}`, plan);
    return res.data.data;
  },
  updateSubscriptionStatus: async (id: number, status: "ACTIVE" | "INACTIVE"): Promise<SubscriptionPlan> => {
    const res = await masterClient.patch(`${API_BASE}/master/subscriptions/${id}/status?status=${status}`);
    return res.data.data;
  },

  // 3. Analytics & Logs
  getRevenueAnalytics: async (startDate?: string, endDate?: string, groupBy?: string): Promise<RevenueAnalytics> => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (groupBy) params.append("groupBy", groupBy);
    const res = await masterClient.get(`${API_BASE}/master/analytics/revenue?${params.toString()}`);
    return res.data.data;
  },
  getAiQuotaUsage: async (startDate?: string, endDate?: string): Promise<AiQuotaUsage> => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    const res = await masterClient.get(`${API_BASE}/master/analytics/ai-quota?${params.toString()}`);
    return res.data.data;
  },
  getAuditLogs: async (): Promise<AuditLog[]> => {
    const res = await masterClient.get(`${API_BASE}/master/analytics/logs`);
    return res.data.data;
  }
};
