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
    BigDecimal arpa;
    long activeTenants;
    long totalTenants;
    long newTenantsThisMonth;
    String growthRate;
    long paidInvoicesCount;
    BigDecimal paidInvoicesAmount;
    long pendingInvoicesCount;
    BigDecimal pendingInvoicesAmount;
    long overdueInvoicesCount;
    BigDecimal overdueInvoicesAmount;
    long openLeadsCount;
    long conversionRatePercent;
    long pendingContractsCount;
    Map<String, Long> planDistribution;
    List<ChartDataPoint> revenueTrend;
}
