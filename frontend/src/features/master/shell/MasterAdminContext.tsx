import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  masterAdminApi,
  TenantInfo,
  SubscriptionPlan,
  RevenueAnalytics,
  AiQuotaUsage,
  AuditLog,
} from "@/api/master/masterAdminApi";
import { consultationApi, ConsultationResponse } from "@/api/master/consultationApi";
import { billingApi, InvoiceItem } from "@/api/master/billingApi";
import { contractApi, ContractItem } from "@/api/master/contractApi";

interface MasterDashboardContextType {
  tenants: TenantInfo[];
  setTenants: React.Dispatch<React.SetStateAction<TenantInfo[]>>;
  plans: SubscriptionPlan[];
  setPlans: React.Dispatch<React.SetStateAction<SubscriptionPlan[]>>;
  revenue: RevenueAnalytics | null;
  setRevenue: React.Dispatch<React.SetStateAction<RevenueAnalytics | null>>;
  aiQuota: AiQuotaUsage | null;
  setAiQuota: React.Dispatch<React.SetStateAction<AiQuotaUsage | null>>;
  logs: AuditLog[];
  setLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>;
  leads: ConsultationResponse[];
  setLeads: React.Dispatch<React.SetStateAction<ConsultationResponse[]>>;
  invoices: InvoiceItem[];
  setInvoices: React.Dispatch<React.SetStateAction<InvoiceItem[]>>;
  contracts: ContractItem[];
  setContracts: React.Dispatch<React.SetStateAction<ContractItem[]>>;
  
  loading: boolean;
  fetchData: () => Promise<void>;
  
  actionSuccessMsg: string | null;
  triggerNotification: (msg: string) => void;
}

const MasterDashboardContext = createContext<MasterDashboardContextType | undefined>(undefined);

export const MasterDashboardProvider = ({ children }: { children: ReactNode }) => {
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null);
  const [aiQuota, setAiQuota] = useState<AiQuotaUsage | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [leads, setLeads] = useState<ConsultationResponse[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [contracts, setContracts] = useState<ContractItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tenantsData, plansData, revenueData, quotaData, logsData, leadsData, invoicesData, contractsData] = await Promise.all([
        masterAdminApi.getTenants(),
        masterAdminApi.getSubscriptions(),
        masterAdminApi.getRevenueAnalytics(),
        masterAdminApi.getAiQuotaUsage(),
        masterAdminApi.getAuditLogs(),
        consultationApi.getAll(),
        billingApi.getAll(),
        contractApi.getAll(),
      ]);

      setTenants(tenantsData);
      setPlans(plansData);
      setRevenue(revenueData);
      setAiQuota(quotaData);
      setLogs(logsData);
      setLeads(leadsData);
      setInvoices(invoicesData);
      setContracts(contractsData);
    } catch (err) {
      console.error("Error fetching workspace admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const triggerNotification = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  return (
    <MasterDashboardContext.Provider
      value={{
        tenants, setTenants,
        plans, setPlans,
        revenue, setRevenue,
        aiQuota, setAiQuota,
        logs, setLogs,
        leads, setLeads,
        invoices, setInvoices,
        contracts, setContracts,
        loading,
        fetchData,
        actionSuccessMsg,
        triggerNotification
      }}
    >
      {children}
    </MasterDashboardContext.Provider>
  );
};

export const useMasterDashboard = () => {
  const context = useContext(MasterDashboardContext);
  if (context === undefined) {
    throw new Error("useMasterDashboard must be used within a MasterDashboardProvider");
  }
  return context;
};
