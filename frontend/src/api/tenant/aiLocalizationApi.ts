import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export type AiLocalizeRequest = {
  entityType: string;
  entityId: number;
  targetLocale: string;
  sourceLocale?: string;
  content: Record<string, unknown>;
};

export type AiLocalizeResponse = {
  entityType: string;
  entityId: number;
  locale: string;
  sourceLocale: string;
  contentHash: string;
  localizedContent: Record<string, unknown>;
  cached: boolean;
};

export type AiLocalizationStatus = {
  entityType: string;
  entityId: number;
  locale: string;
  contentHash: string;
  available: boolean;
  localizedContent: Record<string, unknown> | null;
};

export const aiLocalizationApi = {
  localize: (data: AiLocalizeRequest) =>
    api.post<ApiResponse<AiLocalizeResponse>>("/ai/localize", data).then((r) => r.data.data),

  checkStatus: (params: { entityType: string; entityId: number; contentHash: string; targetLocale: string }) =>
    api
      .get<ApiResponse<AiLocalizationStatus>>("/ai/localize/status", { params })
      .then((r) => r.data.data),
};

