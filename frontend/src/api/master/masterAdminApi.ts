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
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  billingEmail?: string;
  companyLegalName?: string;
  taxCode?: string;
  address?: string;
  website?: string;
  industry?: string;
  companySize?: string;
  managedDatabase?: boolean;
  deleted?: boolean;
  deletedAt?: string;
}

export interface SubscriptionPlan {
  id?: number;
  code: string;
  name: string;
  description: string;
  priceYearly: number;
  maxJobs: number;
  maxCvParses: number;
  maxAiInterviewHours: number | null;
  maxStorageGb?: number | null;
  maxProctoringHours?: number | null;
  videoRetentionDays?: number | null;
  featuresJson?: string | null;
  status?: string;
  version?: number;
  parentPlanId?: number | null;
  custom?: boolean;
  targetTenantId?: number | null;
  archived?: boolean;
  subscriberCount?: number;
}

export interface TenantSubscriptionInstance {
  id: number;
  tenantId: number;
  tenantCode?: string;
  tenantName?: string;
  planId: number;
  status: string;
  startsAt: string;
  endsAt?: string | null;
  autoRenew: boolean;
  planCodeSnapshot?: string | null;
  planNameSnapshot?: string | null;
  planVersionSnapshot?: number;
  contractedPriceYearly?: number | null;
  snapshotMaxJobs?: number | null;
  snapshotMaxCvParses?: number | null;
  snapshotMaxAiInterviewHours?: number | null;
  snapshotMaxStorageGb?: number | null;
  snapshotMaxProctoringHours?: number | null;
  snapshotVideoRetentionDays?: number | null;
  gracePeriodEndsAt?: string | null;
  nextPlanId?: number | null;
  nextPlanCode?: string | null;
  nextPlanName?: string | null;
  proratedCreditAmount?: number;
}

export interface AssignTenantSubscriptionPayload {
  planId?: number;
  planCode?: string;
  customPriceYearly?: number;
  customMaxJobs?: number;
  customMaxCvParses?: number;
  customMaxAiInterviewHours?: number | null;
  customMaxStorageGb?: number | null;
  customMaxProctoringHours?: number | null;
  customVideoRetentionDays?: number | null;
  status?: string;
  gracePeriodDays?: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  mrr: number;
  arr: number;
  arpa?: number;
  activeTenants: number;
  totalTenants: number;
  newTenantsThisMonth?: number;
  growthRate: string;
  paidInvoicesCount?: number;
  paidInvoicesAmount?: number;
  pendingInvoicesCount?: number;
  pendingInvoicesAmount?: number;
  overdueInvoicesCount?: number;
  overdueInvoicesAmount?: number;
  openLeadsCount?: number;
  conversionRatePercent?: number;
  pendingContractsCount?: number;
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
  nearQuotaTenantsCount?: number;
  estimatedAiCostVnd?: number;
  apiSuccessRate?: number;
  averageLatencyMs?: number;
}

export interface TenantSystemLog {
  id: number;
  tenantCode: string;
  category?: string;
  action: string;
  message?: string;
  description: string;
  level: "INFO" | "WARN" | "ERROR";
  endpoint?: string;
  method?: string;
  statusCode?: number;
  ipAddress?: string;
  traceId?: string;
  stackTrace?: string;
  metadataJson?: string;
  timestamp: string;
}

export type AuditLog = TenantSystemLog;

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
  softDeleteTenant: async (id: number): Promise<TenantInfo> => {
    const res = await masterClient.patch(`${API_BASE}/master/tenants/${id}/soft-delete`);
    return res.data.data;
  },
  restoreTenant: async (id: number): Promise<TenantInfo> => {
    const res = await masterClient.post(`${API_BASE}/master/tenants/${id}/restore`);
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

  // 2. Subscriptions (Tier 1 Catalog & Tier 2 Tenant Subscription Instance)
  getSubscriptions: async (): Promise<SubscriptionPlan[]> => {
    const res = await masterClient.get(`${API_BASE}/master/subscriptions`);
    return res.data.data;
  },
  createSubscription: async (plan: SubscriptionPlan): Promise<SubscriptionPlan> => {
    const res = await masterClient.post(`${API_BASE}/master/subscriptions`, plan);
    return res.data.data;
  },
  updateSubscription: async (id: number, plan: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> => {
    const res = await masterClient.put(`${API_BASE}/master/subscriptions/${id}`, plan);
    return res.data.data;
  },
  updateSubscriptionStatus: async (id: number, status: "ACTIVE" | "INACTIVE" | "ARCHIVED"): Promise<SubscriptionPlan> => {
    const res = await masterClient.patch(`${API_BASE}/master/subscriptions/${id}/status?status=${status}`);
    return res.data.data;
  },
  cloneCustomPlan: async (
    templatePlanId: number,
    payload: {
      targetTenantId: number;
      name?: string;
      priceYearly?: number;
      maxJobs?: number;
      maxCvParses?: number;
      maxAiInterviewHours?: number | null;
      maxStorageGb?: number | null;
      maxProctoringHours?: number | null;
      videoRetentionDays?: number | null;
      activateImmediately?: boolean;
    }
  ): Promise<SubscriptionPlan> => {
    const res = await masterClient.post(`${API_BASE}/master/subscriptions/${templatePlanId}/clone-custom`, payload);
    return res.data.data;
  },
  getAllTenantSubscriptionInstances: async (): Promise<TenantSubscriptionInstance[]> => {
    const res = await masterClient.get(`${API_BASE}/master/subscriptions/tenants`);
    return res.data.data;
  },
  getTenantSubscriptionInstance: async (tenantId: number): Promise<TenantSubscriptionInstance | null> => {
    const res = await masterClient.get(`${API_BASE}/master/subscriptions/tenants/${tenantId}`);
    return res.data.data;
  },
  assignTenantSubscription: async (
    tenantId: number,
    payload: AssignTenantSubscriptionPayload
  ): Promise<TenantSubscriptionInstance> => {
    const res = await masterClient.put(`${API_BASE}/master/subscriptions/tenants/${tenantId}`, payload);
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
  getAuditLogs: async (tenantCode?: string, level?: string): Promise<TenantSystemLog[]> => {
    const params = new URLSearchParams();
    if (tenantCode && tenantCode !== "ALL") params.append("tenantCode", tenantCode);
    if (level && level !== "ALL") params.append("level", level);
    const qs = params.toString();
    const url = qs ? `${API_BASE}/master/analytics/logs?${qs}` : `${API_BASE}/master/analytics/logs`;
    const res = await masterClient.get(url);
    return res.data.data;
  }
};
