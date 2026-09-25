import { masterClient } from "./client";
import type { ApiResponse } from "@/types/api";

export interface InvoiceLineItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  itemType: string;
}

export interface InvoiceItem {
  id: number;
  invoiceNumber: string;
  tenantId: number;
  tenantName?: string;
  tenantCode?: string;
  tenantSubdomain?: string;
  subscriptionId?: number;
  planName?: string;
  planCode?: string;
  amount: number;
  subtotal?: number;
  taxRate?: number;
  currency: string;
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
  dueDate?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  paymentGateway?: string;
  paymentProofUrl?: string;
  billingTaxCode?: string;
  billingLegalName?: string;
  billingAddress?: string;
  transactionId?: string;
  paidAt?: string;
  notes?: string;
  createdAt: string;
  lineItems?: InvoiceLineItem[];
}

export interface CreateInvoicePayload {
  tenantId: number;
  planId?: number;
  amount: number;
  subtotal?: number;
  taxRate?: number;
  currency?: string;
  dueDate?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  paymentGateway?: string;
  notes?: string;
  lineItems?: InvoiceLineItem[];
}

export interface UpdateInvoiceStatusPayload {
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
  paymentGateway?: string;
  transactionId?: string;
  paidAt?: string;
  notes?: string;
}

export const billingApi = {
  getAll: async (status?: string, tenantId?: number): Promise<InvoiceItem[]> => {
    const params: Record<string, any> = {};
    if (status && status !== "ALL") params.status = status;
    if (tenantId) params.tenantId = tenantId;
    const res = await masterClient.get<ApiResponse<InvoiceItem[]>>("/master/invoices", { params });
    return res.data.data;
  },

  getById: async (id: number): Promise<InvoiceItem> => {
    const res = await masterClient.get<ApiResponse<InvoiceItem>>(`/master/invoices/${id}`);
    return res.data.data;
  },

  create: async (data: CreateInvoicePayload): Promise<InvoiceItem> => {
    const res = await masterClient.post<ApiResponse<InvoiceItem>>("/master/invoices", data);
    return res.data.data;
  },

  updateStatus: async (id: number, data: UpdateInvoiceStatusPayload): Promise<InvoiceItem> => {
    const res = await masterClient.patch<ApiResponse<InvoiceItem>>(`/master/invoices/${id}/status`, data);
    return res.data.data;
  },

  approve: async (id: number): Promise<InvoiceItem> => {
    const res = await masterClient.post<ApiResponse<InvoiceItem>>(`/master/invoices/${id}/approve`);
    return res.data.data;
  },
};
