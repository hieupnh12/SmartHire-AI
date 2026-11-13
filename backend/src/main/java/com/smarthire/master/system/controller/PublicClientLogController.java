package com.smarthire.master.system.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.master.system.dto.ClientCrashLogRequest;
import com.smarthire.master.system.service.TenantSystemLogService;
import com.smarthire.multitenancy.context.TenantContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/public/logs")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Public Client Diagnostics", description = "Public endpoint for frontend crash and unhandled exception logging")
public class PublicClientLogController {

    private final TenantSystemLogService systemLogService;

    @PostMapping("/client-crash")
    @Operation(summary = "Report Frontend Client Crash", description = "Receives client-side React/JS crash errors for diagnostic monitoring")
    public ResponseEntity<ApiResponse<String>> reportClientCrash(
            @RequestBody ClientCrashLogRequest req,
            HttpServletRequest request) {

        String tenantCode = req.getTenantCode();
        if (tenantCode == null || tenantCode.isBlank()) {
            tenantCode = TenantContext.getCurrentTenant();
        }
        if (tenantCode == null || tenantCode.isBlank()) {
            tenantCode = request.getHeader("X-Tenant-ID");
        }
        if (tenantCode == null || tenantCode.isBlank()) {
            tenantCode = "SYSTEM";
        }

        String ipAddress = request.getHeader("X-Forwarded-For");
        if (ipAddress == null || ipAddress.isBlank()) {
            ipAddress = request.getRemoteAddr();
        }

        String traceId = request.getHeader("X-Trace-ID");
        if (traceId == null || traceId.isBlank()) {
            traceId = "fe-" + System.currentTimeMillis();
        }

        String userAgent = req.getUserAgent();
        if (userAgent == null || userAgent.isBlank()) {
            userAgent = request.getHeader("User-Agent");
        }

        Map<String, Object> meta = req.getMetadata();

        systemLogService.logClientError(
                tenantCode,
                req.getAction() != null ? req.getAction() : "REACT_CRASH",
                req.getMessage(),
                req.getPageUrl(),
                userAgent,
                ipAddress,
                traceId,
                req.getStackTrace(),
                meta
        );

        return ResponseEntity.ok(ApiResponse.ok("Client log accepted", "SUCCESS"));
    }
}
