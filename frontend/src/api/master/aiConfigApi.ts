import { masterClient } from "./client";

export interface AiProviderKey {
  id?: number;
  provider: "GEMINI" | "OPENAI" | "ANTHROPIC" | "DEEPSEEK" | string;
  keyAlias: string;
  maskedKey?: string;
  apiKey?: string;
  endpointUrl?: string;
  status: "ACTIVE" | "EXPIRED" | "RATE_LIMITED" | "INACTIVE" | string;
  isDefault: boolean;
  lastTestedAt?: string;
  createdAt?: string;
}

export interface AiModelConfig {
  id?: number;
  taskType: "CV_PARSING" | "INTERVIEW_GEN" | "INTERVIEW_NLP" | "CODE_GRADING" | "MATCHING" | string;
  taskName: string;
  provider: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  timeoutSeconds: number;
  failoverProvider?: string;
  failoverModel?: string;
  isActive: boolean;
}

export interface AiTestConnectionRequest {
  provider: string;
  apiKey?: string;
  keyId?: number;
  modelName?: string;
  endpointUrl?: string;
}

export interface AiTestConnectionResponse {
  success: boolean;
  message: string;
  latencyMs?: number;
  modelVersion?: string;
}

export interface SystemSettingItem {
  settingKey: string;
  settingValue: string;
  category: string;
  description?: string;
  isEncrypted: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

export interface AiMonthlyUsagePoint {
  month: string;
  cvCount: number;
  interviewHours: number;
  aiRequests: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface AiTaskCostShare {
  taskType: string;
  label: string;
  requests: number;
  totalTokens: number;
  costUsd: number;
  sharePercent: number;
}

export interface AiTenantUsageItem {
  tenantId: number;
  tenantCode: string;
  tenantName: string;
  planName: string;
  cvParses: number;
  interviewHours: number;
  totalRequests: number;
  totalTokens: number;
  estimatedCostUsd: number;
  changePercent: number;
}

export interface AiUsageReport {
  totalCvParses: number;
  totalInterviewHours: number;
  totalAiRequests: number;
  totalTokensConsumed: number;
  totalEstimatedCostUsd: number;
  avgLatencyMs: number;
  successRatePercent: number;
  monthlyTrend: AiMonthlyUsagePoint[];
  costByTask: AiTaskCostShare[];
  tenantUsages: AiTenantUsageItem[];
}

export interface TenantAiQuota {
  tenantId: number;
  tenantCode: string;
  tenantName: string;
  planCode: string;
  planName: string;
  subscriptionStatus: string;
  cvUsed: number;
  cvLimit: number;
  basePlanCvLimit: number;
  interviewHoursUsed: number;
  interviewHoursLimit: number;
  basePlanInterviewHoursLimit: number;
  aiKillSwitch: boolean;
  estimatedCostUsdMonth: number;
  effectiveRpmLimit?: number;
  customRpmOverride?: number | null;
  currentMinuteRpm?: number;
  currentMinuteTpm?: number;
}

export interface TenantAiQuotaUpdateRequest {
  cvLimit?: number;
  interviewHoursLimit?: number;
  rpmLimit?: number;
  killSwitch?: boolean;
  resetToPlanDefault?: boolean;
}

export interface AiRateLimitConfig {
  enabled: boolean;
  defaultRpmPerTenant: number;
  defaultTpmPerTenant: number;
  tenantRpmOverrides?: Record<string, number>;
}

export interface AiModelPricing {
  id?: number;
  provider: string;
  modelName: string;
  inputPricePer1mTokens: number;
  outputPricePer1mTokens: number;
  isActive: boolean;
  updatedAt?: string;
}

export const aiConfigApi = {
  getUsageReport: async (months = 6): Promise<AiUsageReport> => {
    const res = await masterClient.get("/master/ai/usage-report", { params: { months } });
    return res.data?.data;
  },

  getTenantAiQuotas: async (): Promise<TenantAiQuota[]> => {
    const res = await masterClient.get("/master/ai/quotas");
    return res.data?.data || [];
  },

  updateTenantAiQuota: async (tenantId: number, data: TenantAiQuotaUpdateRequest): Promise<TenantAiQuota> => {
    const res = await masterClient.put(`/master/ai/quotas/${tenantId}`, data);
    return res.data?.data;
  },

  getRateLimitConfig: async (): Promise<AiRateLimitConfig> => {
    const res = await masterClient.get("/master/ai/rate-limit");
    return res.data?.data;
  },

  updateRateLimitConfig: async (data: Partial<AiRateLimitConfig>): Promise<AiRateLimitConfig> => {
    const res = await masterClient.put("/master/ai/rate-limit", data);
    return res.data?.data;
  },

  getModelPricings: async (): Promise<AiModelPricing[]> => {
    const res = await masterClient.get("/master/ai/pricings");
    return res.data?.data || [];
  },

  saveModelPricing: async (data: Partial<AiModelPricing>): Promise<AiModelPricing> => {
    const res = await masterClient.post("/master/ai/pricings", data);
    return res.data?.data;
  },

  deleteModelPricing: async (id: number): Promise<void> => {
    await masterClient.delete(`/master/ai/pricings/${id}`);
  },

  getProviderKeys: async (): Promise<AiProviderKey[]> => {
    const res = await masterClient.get("/master/ai/keys");
    return res.data?.data || [];
  },

  saveProviderKey: async (data: Partial<AiProviderKey>): Promise<AiProviderKey> => {
    const res = await masterClient.post("/master/ai/keys", data);
    return res.data?.data;
  },

  deleteProviderKey: async (id: number): Promise<void> => {
    await masterClient.delete(`/master/ai/keys/${id}`);
  },

  getTaskConfigs: async (): Promise<AiModelConfig[]> => {
    const res = await masterClient.get("/master/ai/tasks");
    return res.data?.data || [];
  },

  updateTaskConfig: async (taskType: string, data: Partial<AiModelConfig>): Promise<AiModelConfig> => {
    const res = await masterClient.put(`/master/ai/tasks/${taskType}`, data);
    return res.data?.data;
  },

  testConnection: async (req: AiTestConnectionRequest): Promise<AiTestConnectionResponse> => {
    const res = await masterClient.post("/master/ai/test-connection", req);
    return res.data?.data;
  },

  getSystemSettings: async (category?: string): Promise<SystemSettingItem[]> => {
    const res = await masterClient.get("/master/system/settings", { params: { category } });
    return res.data?.data || [];
  },

  saveSystemSetting: async (data: { key: string; value: string; category?: string; description?: string; isEncrypted?: boolean }): Promise<SystemSettingItem> => {
    const res = await masterClient.post("/master/system/settings", data);
    return res.data?.data;
  },
};
