package com.smarthire.master.ai.dto;

import java.math.BigDecimal;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiUsageReportDto {
    private long totalCvParses;
    private double totalInterviewHours;
    private long totalAiRequests;
    private long totalTokensConsumed;
    private BigDecimal totalEstimatedCostUsd;
    private long avgLatencyMs;
    private double successRatePercent;
    private List<MonthlyUsagePoint> monthlyTrend;
    private List<TaskCostShare> costByTask;
    private List<TenantUsageItem> tenantUsages;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyUsagePoint {
        private String month;
        private long cvCount;
        private double interviewHours;
        private long aiRequests;
        private long totalTokens;
        private BigDecimal estimatedCostUsd;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaskCostShare {
        private String taskType;
        private String label;
        private long requests;
        private long totalTokens;
        private BigDecimal costUsd;
        private int sharePercent;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TenantUsageItem {
        private Long tenantId;
        private String tenantCode;
        private String tenantName;
        private String planName;
        private long cvParses;
        private double interviewHours;
        private long totalRequests;
        private long totalTokens;
        private BigDecimal estimatedCostUsd;
        private double changePercent;
    }
}
