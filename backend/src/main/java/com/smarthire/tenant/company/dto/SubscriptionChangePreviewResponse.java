package com.smarthire.tenant.company.dto;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SubscriptionChangePreviewResponse {

    /**
     * UPGRADE, DOWNGRADE, or SAME_PLAN
     */
    String changeType;

    String currentPlanCode;
    String currentPlanName;
    BigDecimal currentContractedPriceYearly;

    String targetPlanCode;
    String targetPlanName;
    BigDecimal targetPriceYearly;

    long totalCycleDays;
    long remainingDays;

    /**
     * Unused amount credited from the current active subscription (for UPGRADE).
     */
    BigDecimal proratedCreditAmount;

    /**
     * Net amount to pay for the new plan after deducting proratedCreditAmount (for UPGRADE).
     */
    BigDecimal netAmountDue;

    /**
     * IMMEDIATE (for Upgrade) or END_OF_CYCLE (for Downgrade)
     */
    String effectiveTiming;

    LocalDateTime effectiveDate;

    /**
     * Whether the change can proceed based on current usage vs target plan quotas.
     */
    boolean allowed;

    /**
     * Any warnings or blocking conflicts (e.g., open jobs exceed target plan's maxJobs).
     */
    List<String> warnings;
}
