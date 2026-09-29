import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { masterAdminApi, SubscriptionPlan } from "./masterAdminApi";
import { consultationApi } from "./consultationApi";
import { billingApi } from "./billingApi";
import { contractApi } from "./contractApi";
import { toast } from "@/stores/toastStore";

export const masterQueryKeys = {
  all: ["master"] as const,
  tenants: () => [...masterQueryKeys.all, "tenants"] as const,
  subscriptions: () => [...masterQueryKeys.all, "subscriptions"] as const,
  revenue: (params: any) => [...masterQueryKeys.all, "revenue", params] as const,
  aiQuota: (params: any) => [...masterQueryKeys.all, "aiQuota", params] as const,
  logs: () => [...masterQueryKeys.all, "logs"] as const,
  leads: () => [...masterQueryKeys.all, "leads"] as const,
  invoices: () => [...masterQueryKeys.all, "invoices"] as const,
  contracts: () => [...masterQueryKeys.all, "contracts"] as const,
};

// --- Tenants ---
export const useTenants = () => {
  return useQuery({
    queryKey: masterQueryKeys.tenants(),
    queryFn: masterAdminApi.getTenants,
    staleTime: 5 * 60 * 1000,
  });
};

// --- Subscriptions ---
export const useSubscriptions = () => {
  return useQuery({
    queryKey: masterQueryKeys.subscriptions(),
    queryFn: masterAdminApi.getSubscriptions,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: masterAdminApi.createSubscription,
    onSuccess: (newPlan) => {
      queryClient.setQueryData<SubscriptionPlan[]>(masterQueryKeys.subscriptions(), (old) => {
        return old ? [...old, newPlan] : [newPlan];
      });
      toast.success("Tạo gói dịch vụ thành công!");
    },
  });
};

export const useUpdateSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, plan }: { id: number; plan: SubscriptionPlan }) => masterAdminApi.updateSubscription(id, plan),
    onSuccess: (updated) => {
      queryClient.setQueryData<SubscriptionPlan[]>(masterQueryKeys.subscriptions(), (old) => {
        return old ? old.map((p) => (p.id === updated.id ? updated : p)) : [];
      });
      toast.success("Cập nhật gói dịch vụ thành công!");
    },
  });
};

export const useUpdateSubscriptionStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: "ACTIVE" | "INACTIVE" }) => masterAdminApi.updateSubscriptionStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData<SubscriptionPlan[]>(masterQueryKeys.subscriptions(), (old) => {
        return old ? old.map((p) => (p.id === updated.id ? updated : p)) : [];
      });
      toast.success("Cập nhật trạng thái gói dịch vụ thành công!");
    },
  });
};

// --- Analytics ---
export const useRevenueAnalytics = (params?: { startDate?: string; endDate?: string; groupBy?: string }) => {
  return useQuery({
    queryKey: masterQueryKeys.revenue(params),
    queryFn: () => masterAdminApi.getRevenueAnalytics(params?.startDate, params?.endDate, params?.groupBy),
    staleTime: 5 * 60 * 1000,
  });
};

export const useAiQuotaUsage = (params?: { startDate?: string; endDate?: string }) => {
  return useQuery({
    queryKey: masterQueryKeys.aiQuota(params),
    queryFn: () => masterAdminApi.getAiQuotaUsage(params?.startDate, params?.endDate),
    staleTime: 5 * 60 * 1000,
  });
};

export const useAuditLogs = () => {
  return useQuery({
    queryKey: masterQueryKeys.logs(),
    queryFn: masterAdminApi.getAuditLogs,
    staleTime: 5 * 60 * 1000,
  });
};

// --- Leads ---
export const useLeads = () => {
  return useQuery({
    queryKey: masterQueryKeys.leads(),
    queryFn: consultationApi.getAll,
    staleTime: 5 * 60 * 1000,
  });
};

// --- Invoices ---
export const useInvoices = () => {
  return useQuery({
    queryKey: masterQueryKeys.invoices(),
    queryFn: billingApi.getAll,
    staleTime: 5 * 60 * 1000,
  });
};

// --- Contracts ---
export const useContracts = () => {
  return useQuery({
    queryKey: masterQueryKeys.contracts(),
    queryFn: contractApi.getAll,
    staleTime: 5 * 60 * 1000,
  });
};
