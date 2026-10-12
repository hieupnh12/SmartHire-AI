package com.smarthire.master.subscription.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateSubscriptionPlanRequest {
    @NotBlank(message = "Code is required")
    String code;
    
    @NotBlank(message = "Name is required")
    String name;
    
    String description;
    
    @NotNull(message = "Yearly price is required")
    @Min(0)
    BigDecimal priceYearly;
    
    @NotNull(message = "Max jobs is required")
    @Min(-1)
    Integer maxJobs;
    
    @NotNull(message = "Max CV parses is required")
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

    Boolean custom;

    Long targetTenantId;
}
