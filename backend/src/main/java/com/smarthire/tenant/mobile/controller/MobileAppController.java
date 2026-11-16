package com.smarthire.tenant.mobile.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.mobile.dto.DeviceTokenRequest;
import com.smarthire.tenant.mobile.dto.MobileConfigResponse;
import com.smarthire.tenant.mobile.dto.MobileDashboardResponse;
import com.smarthire.tenant.mobile.service.MobileAppService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Mobile App API")
public class MobileAppController {

    private final MobileAppService mobileAppService;

    public MobileAppController(MobileAppService mobileAppService) {
        this.mobileAppService = mobileAppService;
    }

    @GetMapping("/public/mobile/config")
    @Operation(summary = "Get mobile application configuration and feature flags")
    public ApiResponse<MobileConfigResponse> getConfig() {
        return ApiResponse.ok(mobileAppService.getConfig());
    }

    @GetMapping("/mobile/dashboard")
    @Operation(summary = "Get candidate mobile dashboard overview")
    public ApiResponse<MobileDashboardResponse> getDashboard() {
        return ApiResponse.ok(mobileAppService.getDashboard());
    }

    @PostMapping("/mobile/device-token")
    @Operation(summary = "Register FCM device token for mobile push notifications")
    public ApiResponse<Map<String, Object>> registerDeviceToken(@Valid @RequestBody DeviceTokenRequest request) {
        return ApiResponse.ok(mobileAppService.registerDeviceToken(request));
    }
}
