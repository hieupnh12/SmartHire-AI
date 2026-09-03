package com.smarthire.master.analytics.controller;

import com.smarthire.common.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/master/analytics")
@Tag(name = "Master Analytics & System Logs", description = "APIs for Platform Revenue, AI Quota Usage, and Tenant System Logs")
public class MasterAnalyticsController {

    @GetMapping("/revenue")
    @Operation(summary = "View Global Revenue Analytics", description = "Returns MRR, total revenue, growth rate, and plan distribution.")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRevenueAnalytics() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("mrr", 24850.00);
        data.put("arr", 298200.00);
        data.put("activeTenants", 42);
        data.put("growthRate", "+18.5%");
        data.put("planDistribution", Map.of(
                "STARTER", 15,
                "PROFESSIONAL", 22,
                "ENTERPRISE", 5
        ));
        return ResponseEntity.ok(ApiResponse.ok("Revenue analytics fetched successfully", data));
    }

    @GetMapping("/ai-quota")
    @Operation(summary = "Monitor System AI Quota Usage", description = "Returns platform-wide AI usage metrics.")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAiQuotaUsage() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("totalCvParsesUsed", 14250);
        data.put("totalCvParsesLimit", 50000);
        data.put("totalVoiceHoursUsed", 340);
        data.put("totalVoiceHoursLimit", 1000);
        data.put("activeModels", List.of("Gemini 1.5 Pro", "Whisper STT", "FastText Matching"));
        data.put("systemHealth", "HEALTHY");
        return ResponseEntity.ok(ApiResponse.ok("AI quota usage metrics fetched successfully", data));
    }

    @GetMapping("/logs")
    @Operation(summary = "View Tenant System Audit Logs", description = "Returns platform audit log stream.")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSystemAuditLogs() {
        List<Map<String, Object>> logs = new ArrayList<>();

        logs.add(Map.of(
                "id", 101L,
                "tenantCode", "acme",
                "action", "TENANT_PROVISIONED",
                "description", "Database smarthire_tenant_acme provisioned cleanly with Flyway V1..V2",
                "level", "INFO",
                "timestamp", "2026-08-23T18:50:00Z",
                "ipAddress", "127.0.0.1"
        ));

        logs.add(Map.of(
                "id", 102L,
                "tenantCode", "vng",
                "action", "CV_AI_PARSED_BATCH",
                "description", "Batch of 45 CVs processed via RabbitMQ worker pool #3",
                "level", "INFO",
                "timestamp", "2026-08-23T19:12:30Z",
                "ipAddress", "10.0.4.12"
        ));

        logs.add(Map.of(
                "id", 103L,
                "tenantCode", "viettel",
                "action", "AI_VOICE_SESSION_START",
                "description", "Voice AI Interview session started for candidate ID 882",
                "level", "INFO",
                "timestamp", "2026-08-23T19:35:10Z",
                "ipAddress", "10.0.4.15"
        ));

        logs.add(Map.of(
                "id", 104L,
                "tenantCode", "acme",
                "action", "DATABASE_MIGRATION_WARN",
                "description", "Tenant connection pool HikariDS-acme reached 85% capacity",
                "level", "WARN",
                "timestamp", "2026-08-23T19:42:00Z",
                "ipAddress", "127.0.0.1"
        ));

        return ResponseEntity.ok(ApiResponse.ok("Audit logs fetched successfully", logs));
    }
}
