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
public class UpdateSubscriptionPlanRequest {
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
    
    @NotNull(message = "Max AI interview hours is required")
    @Min(0)
    Integer maxAiInterviewHours;
    
    @NotNull(message = "Max storage GB is required")
    @Min(0)
    Integer maxStorageGb;
    
    @NotNull(message = "Max proctoring hours is required")
    @Min(0)
    Integer maxProctoringHours;
    
    @NotNull(message = "Video retention days is required")
    @Min(0)
    Integer videoRetentionDays;
    
    String featuresJson;
}
