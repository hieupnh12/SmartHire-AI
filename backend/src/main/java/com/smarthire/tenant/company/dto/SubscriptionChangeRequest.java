package com.smarthire.tenant.company.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SubscriptionChangeRequest {

    @NotBlank(message = "Target plan code is required")
    String targetPlanCode;

    /**
     * Optional note from tenant admin when requesting upgrade or scheduled downgrade.
     */
    String notes;
}
