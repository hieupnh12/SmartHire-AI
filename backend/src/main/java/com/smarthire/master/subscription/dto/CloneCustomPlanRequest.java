package com.smarthire.master.subscription.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CloneCustomPlanRequest {

    @NotNull(message = "Target tenant ID is required")
    Long targetTenantId;

    String customCode;
    String name;
    String description;

    @Min(0)
    BigDecimal priceYearly;

    @Min(-1)
    Integer maxJobs;

    @Min(-1)
    Integer maxCvParses;

    @Min(-1)
    Integer maxAiInterviewHours;

    @Min(-1)
    Integer maxStorageGb;

    @Min(-1)
    Integer maxProctoringHours;

    @Min(-1)
    Integer videoRetentionDays;

    String featuresJson;

    @Builder.Default
    Boolean activateImmediately = true;
}
