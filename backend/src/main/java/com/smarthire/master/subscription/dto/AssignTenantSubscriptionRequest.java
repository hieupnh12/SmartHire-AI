package com.smarthire.master.subscription.dto;

import jakarta.validation.constraints.Min;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AssignTenantSubscriptionRequest {

    Long planId;
    String planCode;

    /**
     * Optional custom override for contracted yearly price (Grandfathering / B2B negotiated rate).
     */
    @Min(0)
    BigDecimal customPriceYearly;

    /**
     * Optional custom quota overrides for this specific tenant subscription instance.
     */
    @Min(-1)
    Integer customMaxJobs;

    @Min(-1)
    Integer customMaxCvParses;

    @Min(-1)
    Integer customMaxAiInterviewHours;

    @Min(-1)
    Integer customMaxStorageGb;

    @Min(-1)
    Integer customMaxProctoringHours;

    @Min(-1)
    Integer customVideoRetentionDays;

    String customFeaturesJson;

    /**
     * Desired lifecycle status: TRIAL, ACTIVE, PAST_DUE, SUSPENDED, CANCELED
     */
    String status;

    LocalDateTime startsAt;
    LocalDateTime endsAt;
    Boolean autoRenew;

    /**
     * Grace period days if status is PAST_DUE (default 5 days, range 3-7 days).
     */
    Integer gracePeriodDays;
}
