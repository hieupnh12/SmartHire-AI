import { masterClient } from "./client";
import type { ApiResponse } from "@/types/api";

export interface CreateConsultationRequest {
  companyName: string;
  contactName: string;
  jobTitle?: string;
  workEmail: string;
  phoneNumber?: string;
  companySize?: string;
  requestType: "DEMO" | "CONTRACT_QUOTE";
  planTier?: string;
  primaryNeed?: string;
  notes?: string;
}

export interface ConsultationResponse {
  id: number;
  companyName: string;
  contactName: string;
  jobTitle?: string;
  workEmail: string;
  phoneNumber?: string;
  companySize?: string;
  requestType: "DEMO" | "CONTRACT_QUOTE";
  planTier?: string;
  primaryNeed?: string;
  notes?: string;
  status: "PENDING" | "CONTACTED" | "PROVISIONED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
}

export interface UpdateConsultationStatusRequest {
  status: "PENDING" | "CONTACTED" | "PROVISIONED" | "REJECTED";
  notes?: string;
}

export const consultationApi = {
  // Public endpoint for submitting demo/contract consultation request
  submit: async (data: CreateConsultationRequest): Promise<ConsultationResponse> => {
    const res = await masterClient.post<ApiResponse<ConsultationResponse>>("/master/consultations", data);
    return res.data.data;
  },

  // Admin endpoints (require Workspace Admin auth)
  getAll: async (status?: string): Promise<ConsultationResponse[]> => {
    const params = status && status !== "ALL" ? { status } : {};
    const res = await masterClient.get<ApiResponse<ConsultationResponse[]>>("/master/consultations", { params });
    return res.data.data;
  },

  getById: async (id: number): Promise<ConsultationResponse> => {
    const res = await masterClient.get<ApiResponse<ConsultationResponse>>(`/master/consultations/${id}`);
    return res.data.data;
  },

  updateStatus: async (id: number, data: UpdateConsultationStatusRequest): Promise<ConsultationResponse> => {
    const res = await masterClient.patch<ApiResponse<ConsultationResponse>>(`/master/consultations/${id}/status`, data);
    return res.data.data;
  },
};
