package com.smarthire.master.analytics.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.master.analytics.dto.AiQuotaUsageResponse;
import com.smarthire.master.analytics.dto.RevenueAnalyticsResponse;
import com.smarthire.master.analytics.service.MasterAnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/master/analytics")
@RequiredArgsConstructor
@Tag(name = "Master Analytics & System Logs", description = "APIs for Platform Revenue, AI Quota Usage, and Tenant System Logs")
public class MasterAnalyticsController {

    private final MasterAnalyticsService analyticsService;

    @GetMapping("/revenue")
    @Operation(summary = "View Global Revenue Analytics", description = "Returns MRR, total revenue, growth rate, and plan distribution.")
    public ResponseEntity<ApiResponse<RevenueAnalyticsResponse>> getRevenueAnalytics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false, defaultValue = "MONTH") String groupBy) {
        
        RevenueAnalyticsResponse response = analyticsService.getRevenueAnalytics(startDate, endDate, groupBy);
        return ResponseEntity.ok(ApiResponse.ok("Revenue analytics fetched successfully", response));
    }

    @GetMapping("/ai-quota")
    @Operation(summary = "Monitor System AI Quota Usage", description = "Returns platform-wide AI usage metrics.")
    public ResponseEntity<ApiResponse<AiQuotaUsageResponse>> getAiQuotaUsage(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        AiQuotaUsageResponse response = analyticsService.getAiQuotaUsage(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.ok("AI quota usage metrics fetched successfully", response));
    }

    @GetMapping("/logs")
    @Operation(summary = "View Tenant System Audit Logs", description = "Returns platform audit log stream.")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSystemAuditLogs() {
        // Keeping dummy data for logs as requested focus was on Revenue and AI charts
        List<Map<String, Object>> logs = new ArrayList<>();
        logs.add(Map.of("id", 101L, "tenantCode", "acme", "action", "TENANT_PROVISIONED", "level", "INFO", "timestamp", "2026-08-23T18:50:00Z"));
        return ResponseEntity.ok(ApiResponse.ok("Audit logs fetched successfully", logs));
    }
}
