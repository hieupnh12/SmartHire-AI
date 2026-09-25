package com.smarthire.tenant.landing.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.landing.dto.LandingPageResponse;
import com.smarthire.tenant.landing.dto.UpdateLandingPageRequest;
import com.smarthire.tenant.landing.dto.UploadImageResponse;
import com.smarthire.tenant.landing.service.LandingImageStorageService;
import com.smarthire.tenant.landing.service.LandingPageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/tenant/landing-page")
@RequiredArgsConstructor
@Tag(name = "Tenant Landing Page", description = "Endpoints for managing and customizing tenant landing page")
public class TenantLandingPageController {

    private final LandingPageService landingPageService;
    private final LandingImageStorageService imageStorageService;

    @GetMapping
    @Operation(summary = "Get current landing page configuration for tenant admin")
    public ApiResponse<LandingPageResponse> getLandingPage() {
        return ApiResponse.ok(landingPageService.getAdminLandingPage());
    }

    @PutMapping
    @Operation(summary = "Update and optionally publish landing page configuration")
    public ApiResponse<LandingPageResponse> updateLandingPage(
            @Valid @RequestBody UpdateLandingPageRequest request) {
        return ApiResponse.ok(landingPageService.updateLandingPage(request));
    }

    @PostMapping("/reset")
    @Operation(summary = "Reset landing page to default template")
    public ApiResponse<LandingPageResponse> resetToDefault() {
        return ApiResponse.ok(landingPageService.resetToDefault());
    }

    @PostMapping(value = "/upload-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload image for landing page banner, culture, or avatars")
    public ApiResponse<UploadImageResponse> uploadImage(@RequestParam("file") MultipartFile file) {
        String tenantCode = TenantContext.getCurrentTenant();
        return ApiResponse.ok(imageStorageService.upload(tenantCode, file));
    }
}
