package com.smarthire.master.analytics.dto;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AiQuotaUsageResponse {
    long totalCvParsesUsed;
    long totalVoiceSecondsUsed;
    double totalVoiceHoursUsed;
    long totalCvParsesLimit;
    long totalVoiceHoursLimit;
    long totalTokensConsumed;
    long nearQuotaTenantsCount;
    BigDecimal estimatedAiCostVnd;
    double apiSuccessRate;
    long averageLatencyMs;
    String systemHealth;
    List<String> activeModels;
    List<ChartDataPoint> usageTrend;
}
