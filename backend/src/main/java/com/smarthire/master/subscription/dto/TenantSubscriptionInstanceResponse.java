package com.smarthire.master.subscription.dto;

import com.smarthire.domain.master.entity.TenantSubscription;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TenantSubscriptionInstanceResponse {

    Long id;
    Long tenantId;
    String tenantCode;
    String tenantName;
    Long planId;
    String status;
    LocalDateTime startsAt;
    LocalDateTime endsAt;
    boolean autoRenew;

    // Snapshot fields
    String planCodeSnapshot;
    String planNameSnapshot;
    Integer planVersionSnapshot;
    BigDecimal contractedPriceYearly;
    Integer snapshotMaxJobs;
    Integer snapshotMaxCvParses;
    Integer snapshotMaxAiInterviewHours;
    Integer snapshotMaxStorageGb;
    Integer snapshotMaxProctoringHours;
    Integer snapshotVideoRetentionDays;
    String snapshotFeaturesJson;

    // Lifecycle & Proration fields
    LocalDateTime gracePeriodEndsAt;
    Long nextPlanId;
    String nextPlanCode;
    String nextPlanName;
    BigDecimal proratedCreditAmount;
    Long upgradedFromSubscriptionId;
    LocalDateTime canceledAt;
    String cancelReason;

    LocalDateTime createdAt;
    LocalDateTime updatedAt;

    public static TenantSubscriptionInstanceResponse from(TenantSubscription sub, String tenantCode, String tenantName, String nextPlanCode, String nextPlanName) {
        if (sub == null) {
            return null;
        }
        return TenantSubscriptionInstanceResponse.builder()
                .id(sub.getId())
                .tenantId(sub.getTenantId())
                .tenantCode(tenantCode)
                .tenantName(tenantName)
                .planId(sub.getPlanId())
                .status(sub.getStatus())
                .startsAt(sub.getStartsAt())
                .endsAt(sub.getEndsAt())
                .autoRenew(sub.isAutoRenew())
                .planCodeSnapshot(sub.getPlanCodeSnapshot())
                .planNameSnapshot(sub.getPlanNameSnapshot())
                .planVersionSnapshot(sub.getPlanVersionSnapshot())
                .contractedPriceYearly(sub.getContractedPriceYearly())
                .snapshotMaxJobs(sub.getSnapshotMaxJobs())
                .snapshotMaxCvParses(sub.getSnapshotMaxCvParses())
                .snapshotMaxAiInterviewHours(sub.getSnapshotMaxAiInterviewHours())
                .snapshotMaxStorageGb(sub.getSnapshotMaxStorageGb())
                .snapshotMaxProctoringHours(sub.getSnapshotMaxProctoringHours())
                .snapshotVideoRetentionDays(sub.getSnapshotVideoRetentionDays())
                .snapshotFeaturesJson(sub.getSnapshotFeaturesJson())
                .gracePeriodEndsAt(sub.getGracePeriodEndsAt())
                .nextPlanId(sub.getNextPlanId())
                .nextPlanCode(nextPlanCode)
                .nextPlanName(nextPlanName)
                .proratedCreditAmount(sub.getProratedCreditAmount())
                .upgradedFromSubscriptionId(sub.getUpgradedFromSubscriptionId())
                .canceledAt(sub.getCanceledAt())
                .cancelReason(sub.getCancelReason())
                .createdAt(sub.getCreatedAt())
                .updatedAt(sub.getUpdatedAt())
                .build();
    }
}
