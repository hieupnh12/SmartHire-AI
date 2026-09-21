package com.smarthire.master.analytics.dto;

import lombok.AccessLevel;
import lombok.Builder;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RevenueAnalyticsResponse {
    BigDecimal totalRevenue;
    BigDecimal mrr;
    BigDecimal arr;
    long activeTenants;
    long totalTenants;
    String growthRate;
    Map<String, Long> planDistribution;
    List<ChartDataPoint> revenueTrend;
}
