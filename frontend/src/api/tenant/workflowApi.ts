import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { ApplicationDetail } from "../types/applicant";

export type HiringDecisionType = "HIRE" | "REJECT" | "HOLD";

export type HiringDecisionView = {
  id: number;
  applicationId: number;
  decision: HiringDecisionType;
  reason: string | null;
  decidedBy: number | null;
  decidedByName: string | null;
  createdAt: string;
};

export const workflowApi = {
  pipeline: (jobId: number | string) =>
    api.get<ApiResponse<unknown>>(`/jobs/${jobId}/pipeline`).then((r) => r.data),
  move: (applicationId: number | string, body: { stageId: number }) =>
    api.post<ApiResponse<unknown>>(`/applications/${applicationId}/move`, body).then((r) => r.data),
  updateStatus: (applicationId: number | string, body: { status: string; note?: string }) =>
    api.patch<ApiResponse<unknown>>(`/applications/${applicationId}/status`, body).then((r) => r.data),
  statusHistory: (applicationId: number | string) =>
    api.get<ApiResponse<unknown>>(`/applications/${applicationId}/status-history`).then((r) => r.data),
  decide: (applicationId: number | string, body: { decision: HiringDecisionType; reason?: string }) =>
    api.post<ApiResponse<HiringDecisionView>>(`/applications/${applicationId}/decisions`, body).then((r) => r.data),
  decisions: (applicationId: number | string) =>
    api.get<ApiResponse<HiringDecisionView[]>>(`/applications/${applicationId}/decisions`).then((r) => r.data),
  respondToOffer: (applicationId: number | string, body: { accept: boolean; reason?: string }) =>
    api.post<ApiResponse<ApplicationDetail>>(`/applications/${applicationId}/offer-response`, body).then((r) => r.data),
  health: () =>
    api.get<ApiResponse<Record<string, string>>>("/workflow/health").then((r) => r.data),
};
