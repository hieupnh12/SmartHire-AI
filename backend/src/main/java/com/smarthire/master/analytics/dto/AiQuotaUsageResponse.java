package com.smarthire.master.analytics.dto;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AiQuotaUsageResponse {
    long totalCvParsesUsed;
    long totalVoiceSecondsUsed;
    long totalTokensConsumed;
    String systemHealth;
    List<String> activeModels;
    List<ChartDataPoint> usageTrend;
}
