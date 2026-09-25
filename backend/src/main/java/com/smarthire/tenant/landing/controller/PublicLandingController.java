package com.smarthire.tenant.landing.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.landing.dto.LandingPageConfigDto;
import com.smarthire.tenant.landing.service.LandingImageStorageService;
import com.smarthire.tenant.landing.service.LandingPageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/v1/public/landing")
@RequiredArgsConstructor
@Tag(name = "Public Landing", description = "Public endpoints for candidate career and landing page")
public class PublicLandingController {

    private final LandingPageService landingPageService;
    private final LandingImageStorageService imageStorageService;

    @GetMapping
    @Operation(summary = "Get published landing page configuration for the tenant")
    public ApiResponse<LandingPageConfigDto> getPublicLanding() {
        return ApiResponse.ok(landingPageService.getPublicLandingConfig());
    }

    @GetMapping("/images/{tenantCode}/{fileName:.+}")
    @Operation(summary = "Serve uploaded landing page image")
    public ResponseEntity<Resource> serveImage(
            @PathVariable String tenantCode,
            @PathVariable String fileName) {
        Resource resource = imageStorageService.loadImage(tenantCode, fileName);
        MediaType mediaType = imageStorageService.probeContentType(fileName);

        return ResponseEntity.ok()
                .contentType(mediaType)
                .cacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic())
                .body(resource);
    }
}
