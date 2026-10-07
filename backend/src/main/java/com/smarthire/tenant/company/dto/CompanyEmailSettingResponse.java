package com.smarthire.tenant.company.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyEmailSettingResponse {
    private boolean configured;
    private String provider;
    private String mailUsername;
    private String fromName;
    private Boolean isActive;
    private Instant updatedAt;
}
