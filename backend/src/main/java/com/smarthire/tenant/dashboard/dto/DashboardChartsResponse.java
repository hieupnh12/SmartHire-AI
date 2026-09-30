package com.smarthire.tenant.dashboard.dto;

import java.math.BigDecimal;
import java.util.List;

public record DashboardChartsResponse(
        List<Metric> funnel,
        List<Metric> sources,
        List<ScoreBucket> scoreDistribution) {

    public record Metric(String label, long value) {}
    public record ScoreBucket(String label, long value, BigDecimal minInclusive, BigDecimal maxExclusive) {}
}
