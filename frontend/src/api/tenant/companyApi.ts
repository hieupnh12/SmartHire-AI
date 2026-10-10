import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { CompanyDirectory, CompanyProfile, UpdateCompanyProfileRequest } from "@/features/tenant/admin/company/types";

export interface TenantInvoiceItem {
  id: number;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  dueDate?: string | null;
  paidAt?: string | null;
  billingPeriodStart?: string | null;
  billingPeriodEnd?: string | null;
  planName?: string | null;
}

export interface TenantSubscriptionQuota {
  tenantCode: string;
  planCode: string;
  planName: string;
  planVersion?: number;
  description: string;
  priceYearly: number;
  subscriptionStatus: string;
  autoRenew: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  daysRemaining: number;
  gracePeriodEndsAt?: string | null;
  nextPlanCode?: string | null;
  nextPlanName?: string | null;
  proratedCreditAmount?: number;

  // 1. Active Jobs (max_jobs)
  usedJobs: number;
  maxJobs: number;
  jobsUsagePercent: number;
  jobsEnabled: boolean;
  jobsAllowed: boolean;

  // 2. CV Parses (max_cv_parses)
  usedCvParses: number;
  maxCvParses: number;
  cvParsesUsagePercent: number;
  cvParseEnabled: boolean;
  cvParseAllowed: boolean;

  // 3. AI Voice Interview (max_ai_interview_hours)
  usedAiInterviewSeconds: number;
  maxAiInterviewHours: number;
  maxAiInterviewSeconds: number;
  aiInterviewUsagePercent: number;
  aiInterviewEnabled: boolean;
  aiInterviewAllowed: boolean;

  // 4. Proctoring (max_proctoring_hours)
  usedProctoringSeconds: number;
  maxProctoringHours: number;
  maxProctoringSeconds: number;
  proctoringUsagePercent: number;
  proctoringEnabled: boolean;
  proctoringAllowed: boolean;

  // 5. Storage (max_storage_gb)
  usedStorageBytes: number;
  maxStorageGb: number;
  maxStorageBytes: number;
  storageUsagePercent: number;
  storageEnabled: boolean;
  storageAllowed: boolean;

  // 6. Video/Audio Retention (video_retention_days)
  videoRetentionDays: number;
  videoRetentionEnabled: boolean;

  features: string[];
  invoices: TenantInvoiceItem[];
}

export interface SubscriptionChangePreview {
  changeType: "UPGRADE" | "DOWNGRADE" | "SAME_PLAN";
  currentPlanCode: string;
  currentPlanName: string;
  currentContractedPriceYearly: number;
  targetPlanCode: string;
  targetPlanName: string;
  targetPriceYearly: number;
  totalCycleDays: number;
  remainingDays: number;
  proratedCreditAmount: number;
  netAmountDue: number;
  effectiveTiming: "IMMEDIATE" | "END_OF_CYCLE" | "NONE";
  effectiveDate: string;
  allowed: boolean;
  warnings: string[];
}

export const companyApi = {
  getProfile: () =>
    api.get<ApiResponse<CompanyProfile>>("/tenant/company/profile").then((r) => r.data),
  updateProfile: (body: UpdateCompanyProfileRequest) =>
    api.put<ApiResponse<CompanyProfile>>("/tenant/company/profile", body).then((r) => r.data),
  getDirectory: () =>
    api.get<ApiResponse<CompanyDirectory>>("/tenant/company/directory").then((r) => r.data),
  updateDirectory: (body: CompanyDirectory) =>
    api.put<ApiResponse<CompanyDirectory>>("/tenant/company/directory", body).then((r) => r.data),
  getSubscription: () =>
    api.get<ApiResponse<TenantSubscriptionQuota>>("/tenant/company/subscription").then((r) => r.data),
  previewSubscriptionChange: (targetPlanCode: string) =>
    api
      .get<ApiResponse<SubscriptionChangePreview>>(
        `/tenant/company/subscription/change-preview?targetPlanCode=${encodeURIComponent(targetPlanCode)}`
      )
      .then((r) => r.data),
  changeSubscriptionPlan: (targetPlanCode: string, notes?: string) =>
    api
      .post<ApiResponse<TenantSubscriptionQuota>>("/tenant/company/subscription/change-plan", {
        targetPlanCode,
        notes,
      })
      .then((r) => r.data),
  cancelScheduledDowngrade: () =>
    api
      .delete<ApiResponse<TenantSubscriptionQuota>>("/tenant/company/subscription/scheduled-downgrade")
      .then((r) => r.data),
};
