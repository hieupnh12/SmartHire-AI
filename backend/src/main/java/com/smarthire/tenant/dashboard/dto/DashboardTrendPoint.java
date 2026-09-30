package com.smarthire.tenant.dashboard.dto;

import java.math.BigDecimal;

public record DashboardTrendPoint(String period, long applications, long hires, BigDecimal avgScore) {
}
