package com.smarthire.master.ai.dto;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantAiQuotaDto {
    private Long tenantId;
    private String tenantCode;
    private String tenantName;
    private String planCode;
    private String planName;
    private String subscriptionStatus;
    private long cvUsed;
    private int cvLimit; // -1 = Unlimited, 0 = Disabled, > 0 = Cap
    private int basePlanCvLimit;
    private double interviewHoursUsed;
    private int interviewHoursLimit; // -1 = Unlimited, 0 = Disabled, > 0 = Cap in hours
    private int basePlanInterviewHoursLimit;
    private boolean aiKillSwitch;
    private BigDecimal estimatedCostUsdMonth;
    private int effectiveRpmLimit;
    private Integer customRpmOverride;
    private long currentMinuteRpm;
    private long currentMinuteTpm;
}
