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

export const aiConfigApi = {
  getProviderKeys: async (): Promise<AiProviderKey[]> => {
    const res = await masterClient.get("/ai/keys");
    return res.data?.data || [];
  },

  saveProviderKey: async (data: Partial<AiProviderKey>): Promise<AiProviderKey> => {
    const res = await masterClient.post("/ai/keys", data);
    return res.data?.data;
  },

  deleteProviderKey: async (id: number): Promise<void> => {
    await masterClient.delete(`/ai/keys/${id}`);
  },

  getTaskConfigs: async (): Promise<AiModelConfig[]> => {
    const res = await masterClient.get("/ai/tasks");
    return res.data?.data || [];
  },

  updateTaskConfig: async (taskType: string, data: Partial<AiModelConfig>): Promise<AiModelConfig> => {
    const res = await masterClient.put(`/ai/tasks/${taskType}`, data);
    return res.data?.data;
  },

  testConnection: async (req: AiTestConnectionRequest): Promise<AiTestConnectionResponse> => {
    const res = await masterClient.post("/ai/test-connection", req);
    return res.data?.data;
  },

  getSystemSettings: async (category?: string): Promise<SystemSettingItem[]> => {
    const res = await masterClient.get("/system/settings", { params: { category } });
    return res.data?.data || [];
  },

  saveSystemSetting: async (data: { key: string; value: string; category?: string; description?: string; isEncrypted?: boolean }): Promise<SystemSettingItem> => {
    const res = await masterClient.post("/system/settings", data);
    return res.data?.data;
  },
};
