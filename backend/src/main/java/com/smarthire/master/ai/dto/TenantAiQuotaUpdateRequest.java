package com.smarthire.master.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantAiQuotaUpdateRequest {
    private Integer cvLimit;
    private Integer interviewHoursLimit;
    private Integer rpmLimit;
    private Boolean killSwitch;
    private Boolean resetToPlanDefault;
}
