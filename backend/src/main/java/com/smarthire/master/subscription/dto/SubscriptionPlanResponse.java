package com.smarthire.master.subscription.dto;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SubscriptionPlanResponse {
    Long id;
    String code;
    String name;
    String description;
    BigDecimal priceMonthly;
    BigDecimal priceYearly;
    Integer maxJobs;
    Integer maxCvParses;
    Integer maxAiInterviewHours;
    Integer maxStorageGb;
    Integer maxProctoringHours;
    Integer videoRetentionDays;
    String featuresJson;
    String status;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
