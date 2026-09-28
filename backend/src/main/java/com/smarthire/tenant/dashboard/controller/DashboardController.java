package com.smarthire.tenant.dashboard.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.dashboard.dto.DashboardSummaryResponse;
import com.smarthire.tenant.dashboard.dto.DashboardActionItemsResponse;
import com.smarthire.tenant.dashboard.dto.DashboardChartsResponse;
import com.smarthire.tenant.dashboard.dto.DashboardTrendPoint;
import com.smarthire.tenant.dashboard.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import java.util.List;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@Tag(name = "Analytics Dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    @Operation(summary = "Get tenant recruitment dashboard summary")
    public ResponseEntity<ApiResponse<DashboardSummaryResponse>> summary() {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.summary()));
    }

    @GetMapping("/action-items")
    @Operation(summary = "Get recruiter action item counters")
    public ResponseEntity<ApiResponse<DashboardActionItemsResponse>> actionItems() {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.actionItems()));
    }

    @GetMapping("/charts")
    @Operation(summary = "Get recruitment funnel, source and score chart data")
    public ResponseEntity<ApiResponse<DashboardChartsResponse>> charts(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.charts(from, to)));
    }

    @GetMapping("/trends")
    @Operation(summary = "Get recruitment trends by day, week or month")
    public ResponseEntity<ApiResponse<List<DashboardTrendPoint>>> trends(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "DAY") String granularity) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.trends(from, to, granularity)));
    }

    @GetMapping("/health")
    @Operation(summary = "Analytics Dashboard module scaffold health")
    public ResponseEntity<ApiResponse<Map<String, String>>> health() {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.health()));
    }
}

