import axios from "axios";
import type { ApiResponse } from "@/types/api";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export interface CheckoutRequestData {
  planCode: string;
  billingCycle: "MONTHLY" | "YEARLY";
  workspaceName: string;
  subdomain: string;
  adminFullName: string;
  adminEmail: string;
  adminPhone: string;
  taxCode?: string;
  companyLegalName?: string;
  billingAddress?: string;
  notes?: string;
  quantity?: number;
  termsAccepted: boolean;
  termsVersion?: string;
}

export interface CheckoutResponseData {
  invoiceId: number;
  invoiceNumber: string;
  tenantId: number;
  tenantCode: string;
  subdomain: string;
  planName: string;
  planCode: string;
  billingCycle: "MONTHLY" | "YEARLY";
  amountVnd: number;
  currency: string;
  status: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  transferSyntax: string;
  qrUrl: string;
  termsAccepted?: boolean;
  termsVersion?: string;
  termsAcceptedAt?: string;
  createdAt: string;
}

export interface PublicSubscriptionPlan {
  id: number;
  code: string;
  name: string;
  description?: string;
  priceYearly: number;
  maxJobs: number;
  maxCvParses: number;
  maxAiInterviewHours?: number;
  maxStorageGb?: number;
  featuresJson?: string;
  status: string;
}

export interface VnPayCreatePaymentPayload {
  invoiceId: number;
  bankCode?: string;
  returnUrl?: string;
}

export interface VnPayPaymentData {
  paymentUrl: string;
  invoiceNumber: string;
  amountVnd: number;
}

export interface VnPayVerifyReturnData {
  success: boolean;
  responseCode: string;
  message: string;
  invoiceNumber: string;
  tenantId?: number;
  subdomain?: string;
  workspaceName?: string;
  contactEmail?: string;
  amountVnd: number;
  transactionNo?: string;
  bankCode?: string;
  payDate?: string;
}

export interface PayPalVerifyReturnData {
  success: boolean;
  responseCode: string;
  message: string;
  invoiceNumber: string;
  tenantId?: number;
  subdomain?: string;
  workspaceName?: string;
  contactEmail?: string;
  amountVnd: number;
  transactionNo?: string;
}

export interface InvoiceStatusResponse {
  invoiceId: number;
  invoiceNumber: string;
  status: string;
  amount: number;
  tenantId?: number;
  subdomain?: string;
  paidAt?: string;
  isPaid: boolean;
}

export const checkoutApi = {
  submitCheckout: async (payload: CheckoutRequestData): Promise<CheckoutResponseData> => {
    const res = await axios.post<ApiResponse<CheckoutResponseData>>(`${baseURL}/public/checkout`, payload);
    return res.data.data;
  },

  getPublicPlans: async (): Promise<PublicSubscriptionPlan[]> => {
    const res = await axios.get<ApiResponse<PublicSubscriptionPlan[]>>(`${baseURL}/public/checkout/plans`);
    return res.data.data;
  },

  checkSubdomain: async (subdomain: string): Promise<boolean> => {
    const res = await axios.get<ApiResponse<boolean>>(`${baseURL}/master/tenants/check-subdomain/${subdomain}`);
    return res.data.data;
  },

  checkInvoiceStatus: async (invoiceId: number): Promise<InvoiceStatusResponse> => {
    const res = await axios.get<ApiResponse<InvoiceStatusResponse>>(`${baseURL}/public/checkout/status/${invoiceId}`);
    return res.data.data;
  },

  createVnPayUrl: async (payload: VnPayCreatePaymentPayload): Promise<VnPayPaymentData> => {
    const res = await axios.post<ApiResponse<VnPayPaymentData>>(`${baseURL}/public/checkout/vnpay/create-url`, payload);
    return res.data.data;
  },

  verifyVnPayReturn: async (params: Record<string, string>): Promise<VnPayVerifyReturnData> => {
    const res = await axios.get<ApiResponse<VnPayVerifyReturnData>>(`${baseURL}/public/checkout/vnpay/verify-return`, { params });
    return res.data.data;
  },

  verifyPayPalReturn: async (invoiceId: number, orderId: string): Promise<PayPalVerifyReturnData> => {
    const res = await axios.post<ApiResponse<PayPalVerifyReturnData>>(`${baseURL}/public/checkout/paypal/verify-return`, { invoiceId, orderId });
    return res.data.data;
  },
};

