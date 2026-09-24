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
    
    @NotNull(message = "Monthly price is required")
    @Min(0)
    BigDecimal priceMonthly;
    
    @NotNull(message = "Yearly price is required")
    @Min(0)
    BigDecimal priceYearly;
    
    @NotNull(message = "Max jobs is required")
    @Min(0)
    Integer maxJobs;
    
    @NotNull(message = "Max CV parses is required")
    @Min(0)
    Integer maxCvParses;
    
    @Min(0)
    Integer maxAiInterviewHours;
    
    @Min(0)
    Integer maxStorageGb;
    
    @Min(0)
    Integer maxProctoringHours;
    
    @Min(0)
    Integer videoRetentionDays;
    
    String featuresJson;
}
