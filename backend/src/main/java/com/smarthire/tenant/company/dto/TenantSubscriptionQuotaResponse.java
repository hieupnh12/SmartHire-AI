package com.smarthire.tenant.company.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantSubscriptionQuotaResponse {

    private String tenantCode;
    private String planCode;
    private String planName;
    private Integer planVersion;
    private String description;
    private BigDecimal priceYearly;
    private String subscriptionStatus;
    private boolean autoRenew;
    private LocalDateTime startsAt;
    private LocalDateTime endsAt;
    private long daysRemaining;
    private LocalDateTime gracePeriodEndsAt;
    private String nextPlanCode;
    private String nextPlanName;
    private BigDecimal proratedCreditAmount;

    // 1. Active Jobs (max_jobs)
    private long usedJobs;
    private long maxJobs;
    private int jobsUsagePercent;
    private boolean jobsEnabled;
    private boolean jobsAllowed;

    // 2. CV Parses (max_cv_parses)
    private long usedCvParses;
    private long maxCvParses;
    private int cvParsesUsagePercent;
    private boolean cvParseEnabled;
    private boolean cvParseAllowed;

    // 3. AI Voice Interview (max_ai_interview_hours)
    private long usedAiInterviewSeconds;
    private long maxAiInterviewHours;
    private long maxAiInterviewSeconds;
    private int aiInterviewUsagePercent;
    private boolean aiInterviewEnabled;
    private boolean aiInterviewAllowed;

    // 4. Proctoring (max_proctoring_hours)
    private long usedProctoringSeconds;
    private long maxProctoringHours;
    private long maxProctoringSeconds;
    private int proctoringUsagePercent;
    private boolean proctoringEnabled;
    private boolean proctoringAllowed;

    // 5. Storage (max_storage_gb)
    private long usedStorageBytes;
    private long maxStorageGb;
    private long maxStorageBytes;
    private int storageUsagePercent;
    private boolean storageEnabled;
    private boolean storageAllowed;

    // 6. Video/Audio Retention (video_retention_days)
    private long videoRetentionDays;
    private boolean videoRetentionEnabled;

    // Plan marketing features list & Tenant billing invoices
    private List<String> features;
    private List<TenantInvoiceItem> invoices;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TenantInvoiceItem {
        private Long id;
        private String invoiceNumber;
        private BigDecimal amount;
        private String currency;
        private String status;
        private LocalDateTime dueDate;
        private LocalDateTime paidAt;
        private LocalDateTime billingPeriodStart;
        private LocalDateTime billingPeriodEnd;
        private String planName;
    }
}
