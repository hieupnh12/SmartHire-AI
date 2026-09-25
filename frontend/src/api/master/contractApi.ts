import { masterClient } from "./client";
import axios from "axios";
import type { ApiResponse } from "@/types/api";

export interface ContractSignature {
  id?: number;
  signerName?: string;
  signerEmail?: string;
  signerTitle?: string;
  status: string;
  signedAt?: string;
  clientIp?: string;
}

export interface ContractItem {
  id: number;
  contractNumber: string;
  tenantId?: number;
  tenantName?: string;
  tenantCode?: string;
  tenantSubdomain?: string;
  planId?: number;
  planName?: string;
  planCode?: string;
  consultationRequestId?: number;
  title: string;
  contractValue: number;
  currency: string;
  startDate: string;
  endDate: string;
  
  // Bên A
  partyAName?: string;
  partyATaxCode?: string;
  partyAAddress?: string;
  partyARepresentative?: string;
  partyAPosition?: string;
  partyAPhone?: string;
  partyAEmail?: string;
  partyABankName?: string;
  partyABankAccount?: string;
  partyABankBranch?: string;

  // Bên B
  partyBName?: string;
  partyBTaxCode?: string;
  partyBAddress?: string;
  partyBRepresentative?: string;
  partyBPosition?: string;
  partyBPhone?: string;
  partyBEmail?: string;
  partyBBankAccount?: string;

  // Thuế & Tổng tiền
  taxRate?: number;
  taxAmount?: number;
  totalAmount?: number;
  amountInWords?: string;

  // Public Signing & Security
  signingToken?: string;
  tokenExpiresAt?: string;
  sentAt?: string;
  clientIp?: string;
  signerName?: string;
  signerEmail?: string;
  signerTitle?: string;

  status: "DRAFT" | "PENDING_SIGNATURE" | "SIGNED" | "EXPIRED" | "TERMINATED";
  signMethod?: "DIGITAL_TOKEN_CA" | "E_SIGN_ONLINE" | "UPLOAD_SIGNED_PDF" | "MANUAL";
  signedAt?: string;
  signedDocumentUrl?: string;
  documentChecksum?: string;
  termsAndConditions?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  signatures?: ContractSignature[];
}

export interface CreateContractPayload {
  tenantId?: number;
  planId?: number;
  consultationRequestId?: number;
  title: string;
  contractValue: number;
  currency?: string;
  startDate: string;
  endDate: string;
  
  // Bên A
  partyAName?: string;
  partyATaxCode?: string;
  partyAAddress?: string;
  partyARepresentative?: string;
  partyAPosition?: string;
  partyAPhone?: string;
  partyAEmail?: string;
  partyABankName?: string;
  partyABankAccount?: string;
  partyABankBranch?: string;

  // Bên B
  partyBName?: string;
  partyBTaxCode?: string;
  partyBAddress?: string;
  partyBRepresentative?: string;
  partyBPosition?: string;
  partyBPhone?: string;
  partyBEmail?: string;
  partyBBankAccount?: string;

  taxRate?: number;
  termsAndConditions?: string;
  notes?: string;
}

export interface SignContractPayload {
  signMethod: "DIGITAL_TOKEN_CA" | "E_SIGN_ONLINE" | "UPLOAD_SIGNED_PDF" | "MANUAL";
  signatureData?: string;
  signedDocumentUrl?: string;
  documentChecksum?: string;
  notes?: string;
  autoCreateInvoice?: boolean;
}

export interface UpdateContractStatusPayload {
  status: "DRAFT" | "PENDING_SIGNATURE" | "SIGNED" | "EXPIRED" | "TERMINATED";
  notes?: string;
}

const PUBLIC_API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export const contractApi = {
  getAll: async (status?: string, tenantId?: number): Promise<ContractItem[]> => {
    const params: Record<string, any> = {};
    if (status && status !== "ALL") params.status = status;
    if (tenantId) params.tenantId = tenantId;
    const res = await masterClient.get<ApiResponse<ContractItem[]>>("/master/contracts", { params });
    return res.data.data;
  },

  getById: async (id: number): Promise<ContractItem> => {
    const res = await masterClient.get<ApiResponse<ContractItem>>(`/master/contracts/${id}`);
    return res.data.data;
  },

  create: async (data: CreateContractPayload): Promise<ContractItem> => {
    const res = await masterClient.post<ApiResponse<ContractItem>>("/master/contracts", data);
    return res.data.data;
  },

  send: async (id: number): Promise<ContractItem> => {
    const res = await masterClient.post<ApiResponse<ContractItem>>(`/master/contracts/${id}/send`);
    return res.data.data;
  },

  sign: async (id: number, data: SignContractPayload): Promise<ContractItem> => {
    const res = await masterClient.post<ApiResponse<ContractItem>>(`/master/contracts/${id}/sign`, data);
    return res.data.data;
  },

  updateStatus: async (id: number, data: UpdateContractStatusPayload): Promise<ContractItem> => {
    const res = await masterClient.patch<ApiResponse<ContractItem>>(`/master/contracts/${id}/status`, data);
    return res.data.data;
  },

  delete: async (id: number): Promise<void> => {
    await masterClient.delete<ApiResponse<void>>(`/master/contracts/${id}`);
  },

  // --- PUBLIC CLIENT SIGNING API ---
  getBySigningToken: async (token: string): Promise<ContractItem> => {
    const res = await axios.get<ApiResponse<ContractItem>>(`${PUBLIC_API_BASE}/public/contracts/${token}`);
    return res.data.data;
  },

  requestSigningOtp: async (token: string): Promise<{ success: boolean; message: string; email: string }> => {
    const res = await axios.post<ApiResponse<{ success: boolean; message: string; email: string }>>(
      `${PUBLIC_API_BASE}/public/contracts/${token}/request-otp`
    );
    return res.data.data;
  },

  signWithOtp: async (token: string, data: { otpCode: string; signerName?: string; signerTitle?: string; signatureData?: string; notes?: string }): Promise<ContractItem> => {
    const res = await axios.post<ApiResponse<ContractItem>>(`${PUBLIC_API_BASE}/public/contracts/${token}/sign-otp`, data);
    return res.data.data;
  },

  signWithTokenCa: async (token: string, data: { tokenSerial: string; caProvider?: string; signerName?: string; signerTitle?: string; notes?: string }): Promise<ContractItem> => {
    const res = await axios.post<ApiResponse<ContractItem>>(`${PUBLIC_API_BASE}/public/contracts/${token}/sign-token-ca`, data);
    return res.data.data;
  },
};

